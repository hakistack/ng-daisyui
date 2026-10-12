import { Injectable, PLATFORM_ID, effect, inject, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { annotationOps, paintOps } from '../core/annotations/shapes';
import { BitmapCache, defaultBitmapBudgetBytes } from '../core/bitmap-cache';
import { isQuarterTurn, normalizeRotation } from '../core/geometry';
import { PdfPageEntry } from '../core/types';
import { PdfDocHandle, PdfEngine } from '../engine/pdf-engine.types';
import { PdfAttachmentEntry, PdfDocumentSource, PdfImageExportOptions, PdfViewerError } from '../pdf-viewer.types';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFindService } from './pdf-find.service';
import { PdfFormsService } from './pdf-forms.service';
import { PdfPageDataService } from './pdf-page-data.service';
import { PdfThumbnailsService } from './pdf-thumbnails.service';
import { PDF_BITMAP_CACHE, PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

/** Engine rejection message for a missing or wrong password. */
const PASSWORD_REQUIRED = 'PDFIUM_PASSWORD_REQUIRED';
/** How many passwords `onPasswordRequired` may supply before giving up. */
const MAX_PASSWORD_ATTEMPTS = 4;

/**
 * The open document's lifecycle and file operations: loading (with password
 * prompts), structural page edits, save / download / print / export, and the
 * sidebar's annotation and attachment actions.
 */
@Injectable()
export class PdfDocumentService {
  private readonly store = inject(PdfViewerStore);
  private readonly pageData = inject(PdfPageDataService);
  private readonly viewport = inject(PdfViewportService);
  private readonly find = inject(PdfFindService);
  private readonly thumbnails = inject(PdfThumbnailsService);
  private readonly forms = inject(PdfFormsService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly bitmaps = inject<BitmapCache<ImageBitmap>>(PDF_BITMAP_CACHE);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    // Reload whenever [src] (or the configured password) changes.
    effect(() => {
      const src = this.store.src();
      const password = this.store.config().password;
      if (!this.isBrowser) return;
      untracked(() => void this.load(src, password ?? ''));
    });

    // Sidebar data loads lazily when its tab is open and the data is missing
    // (first view, or invalidated by an edit while the tab is showing).
    effect(() => {
      const s = this.store.state();
      const tab = s?.sidebarOpen ? s.sidebarTab : null;
      const fetch =
        tab === 'bookmarks' && this.store.outline() === null
          ? () => this.pageData.fetchOutline()
          : tab === 'attachments' && this.store.attachments() === null
            ? () => this.pageData.fetchAttachments()
            : null;
      if (!fetch) return;
      untracked(() => {
        if (this.store.doc !== null) void fetch();
      });
    });
  }

  /** Re-open the current `src` (also the error panel's Retry). */
  reload(): void {
    void this.load(this.store.src(), this.store.config().password ?? '');
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  async load(src: PdfDocumentSource, password: string): Promise<void> {
    const store = this.store;
    this.viewport.resetForDocument();
    store.firstRenderComplete.set(false);
    store.operationError.set(null);
    store.outline.set(null);
    store.attachments.set(null);
    this.annotations.reset();
    store.pageRotations.set(new Map());
    store.pageLabels.set([]);
    store.resetDocumentEdited();
    this.thumbnails.reset();
    this.find.reset();
    this.pageData.reset();
    store.closeDocument();
    const budgetMb = store.config().bitmapCacheMB;
    this.bitmaps.setBudget(budgetMb && budgetMb > 0 ? budgetMb * 1024 * 1024 : defaultBitmapBudgetBytes());

    if (!src || (typeof src === 'string' && src.length === 0)) {
      store.patchState((s) => ({ ...s, page: 0, numPages: 0, loaded: false, error: null }));
      return;
    }
    store.patchState((s) => ({ ...s, page: 0, numPages: 0, loaded: false, error: null }));
    const token = ++store.loadToken;

    try {
      // PDFium parses from bytes; keep an untransferred copy for `download()`.
      let buffer: ArrayBuffer;
      if (typeof src === 'string') {
        const res = await fetch(src);
        if (!res.ok) throw Object.assign(new Error(`Failed to fetch PDF (HTTP ${res.status})`), { hkCode: 'load_failed' });
        buffer = await res.arrayBuffer();
      } else if (src instanceof Blob) {
        buffer = await src.arrayBuffer();
      } else {
        buffer = src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength) as ArrayBuffer;
      }
      if (store.loadToken !== token) return;
      const fileSize = buffer.byteLength;
      store.sourceBytes = new Uint8Array(buffer);

      const engine = store.ensureEngine();
      if (!engine) {
        store.emitError({ code: 'unsupported', message: 'PDF rendering is not supported in this environment.', recoverable: false });
        return;
      }

      // Each attempt transfers a fresh copy so `sourceBytes` survives.
      const handle = await this.openWithPassword(engine, () => buffer.slice(0), password || store.config().password || '', token);
      if (handle === null) return;
      if (store.loadToken !== token) {
        engine.dispose(handle);
        return;
      }
      store.doc = handle;

      const pages = await this.readPages(engine, handle);
      if (store.loadToken !== token) return;
      store.pages = pages;
      const numPages = pages.length;
      // Editable annotations are read (with hk-pdf-writer) alongside the first renders.
      void this.annotations.load(store.sourceBytes, numPages);

      // Resolve the initial page before mounting wrappers: the viewport scrolls
      // to `state.page` once every wrapper exists.
      const initialPage = Math.max(1, Math.min(numPages, store.config().page ?? 1));
      store.patchState((s) => ({ ...s, page: initialPage, numPages }));
      store.pageNumbers.set(pages.map((p) => p.pageNumber));
      this.pageData.createSearchIndex(numPages, token);
      this.loadPageLabels(engine, handle, token);

      store.patchState((s) => ({ ...s, loaded: true, error: null }));
      const title = await engine.documentTitle(handle).catch(() => '');
      if (store.loadToken !== token) return;
      store.notifyLoaded({ numPages, title, fingerprint: '', fileSize });

      // Pre-fill consumer form values before the widgets paint.
      await this.forms.applyToEngine(store.formValues());
    } catch (err: unknown) {
      if (store.loadToken !== token) return;
      store.emitError(toViewerError(err));
    }
  }

  /**
   * Open, prompting and retrying on a password-protected PDF. Without
   * `onPasswordRequired` a missing password is a recoverable error. Returns
   * `null` if cancelled, failed, or superseded by a newer load.
   */
  private async openWithPassword(
    engine: PdfEngine,
    makeCopy: () => ArrayBuffer,
    initialPassword: string,
    token: number,
  ): Promise<PdfDocHandle | null> {
    let password = initialPassword;
    for (let attempt = 0; attempt < MAX_PASSWORD_ATTEMPTS; attempt++) {
      try {
        return await engine.open(makeCopy(), { password: password || undefined });
      } catch (err) {
        if (this.store.loadToken !== token) return null;
        if (!String((err as Error)?.message ?? '').includes(PASSWORD_REQUIRED)) throw err;
        const onPwd = this.store.config().onPasswordRequired;
        if (!onPwd) {
          this.store.emitError({ code: 'password_cancelled', message: 'Password required to open this PDF.', recoverable: true });
          return null;
        }
        password = await new Promise<string>((resolve) => onPwd((p) => resolve(p)));
        if (this.store.loadToken !== token) return null;
      }
    }
    this.store.emitError({ code: 'password_cancelled', message: 'Incorrect password.', recoverable: true });
    return null;
  }

  /** Read `/PageLabels` in the background; the toolbar and thumbnails switch to labels when they arrive. */
  private loadPageLabels(engine: PdfEngine, handle: PdfDocHandle, token: number): void {
    engine
      .pageLabels(handle)
      .then((labels) => {
        if (this.store.loadToken === token) this.store.pageLabels.set(labels);
      })
      .catch(() => undefined);
  }

  /** Every page's size in one worker round-trip (was one per page). */
  private async readPages(engine: PdfEngine, handle: PdfDocHandle): Promise<PdfPageEntry[]> {
    const sizes = await engine.pageSizes(handle);
    return sizes.map((size, i) => ({ pageNumber: i + 1, baseWidth: size.width, baseHeight: size.height }));
  }

  // ── Page operations ─────────────────────────────────────────────────────

  /** Rotate a page by `delta` degrees (default +90). Display-only until `save()` bakes it in. */
  rotatePage(pageNumber: number, delta = 90): void {
    this.store.pageRotations.update((m) => {
      const next = new Map(m);
      const r = normalizeRotation((next.get(pageNumber) ?? 0) + delta);
      if (r === 0) next.delete(pageNumber);
      else next.set(pageNumber, r);
      return next;
    });
    this.thumbnails.refresh(pageNumber);
  }

  rotateCurrentPage(): void {
    const p = this.store.state()?.page;
    if (p) this.rotatePage(p, 90);
  }

  /** Delete a page (1-based). No-op on the last remaining page. */
  async deletePage(pageNumber: number): Promise<void> {
    const session = this.store.session();
    if (!session || this.store.pages.length <= 1) return;
    try {
      await session.engine.deletePage(session.doc, pageNumber - 1);
      this.annotations.onPageRemoved(pageNumber - 1);
      await this.refreshPageStructure();
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to delete page.', recoverable: true, cause: err });
    }
  }

  /** Insert a blank page that becomes page `atPageNumber` (clamped), sized like its neighbour (or US Letter). */
  async insertBlankPage(atPageNumber: number): Promise<void> {
    const session = this.store.session();
    if (!session) return;
    const pages = this.store.pages;
    const idx = Math.max(0, Math.min(pages.length, atPageNumber - 1));
    const ref = pages[Math.min(idx, pages.length - 1)];
    try {
      await session.engine.insertBlankPage(session.doc, idx, ref?.baseWidth ?? 612, ref?.baseHeight ?? 792);
      this.annotations.onPageInserted(idx);
      await this.refreshPageStructure();
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to insert page.', recoverable: true, cause: err });
    }
  }

  /**
   * Rebuild the page model after a structural change: re-read sizes, reset
   * caches and the search index, re-render. Reuses the open document.
   */
  private async refreshPageStructure(): Promise<void> {
    const store = this.store;
    const session = store.session();
    if (!session) return;
    store.markDocumentEdited();
    const token = ++store.loadToken; // invalidates in-flight work on the old structure
    this.viewport.cancelInflightRenders();
    this.bitmaps.clear();
    this.pageData.reset();
    this.thumbnails.reset();
    store.pageRotations.set(new Map()); // indices shifted
    store.outline.set(null); // bookmark targets may have shifted

    const pages = await this.readPages(session.engine, session.doc);
    if (store.loadToken !== token) return;
    store.pages = pages;
    const numPages = pages.length;
    const cur = Math.max(1, Math.min(numPages, store.state()?.page ?? 1));
    store.patchState((s) => ({ ...s, page: cur, numPages }));
    store.pageNumbers.set(pages.map((p) => p.pageNumber));
    store.notifyPagesChange(numPages);
    this.pageData.createSearchIndex(numPages, token);
    store.pageLabels.set([]);
    this.loadPageLabels(session.engine, session.doc, token);
    // The new `pageNumbers` makes the viewport re-render and re-scroll.
  }

  // ── Save / download / print / export ────────────────────────────────────

  /**
   * Serialize the document with every edit. Engine-side edits (forms, page
   * structure, display rotations, baked in for the save and then reverted)
   * come from a PDFium save; an unedited document starts from its original
   * bytes. The annotation changes are then appended by hk-pdf-writer as an
   * incremental update, so an annotation-only save leaves the original
   * bytes (and any signatures over them) intact.
   */
  async save(): Promise<Uint8Array> {
    const session = this.store.session();
    if (!session) throw new Error('No PDF document loaded');
    const rotations = [...this.store.pageRotations()].filter(([, r]) => r !== 0);
    const source = this.store.sourceBytes;
    const base = this.store.engineEdited || rotations.length > 0 || !source ? await this.saveFromEngine(rotations) : source.slice();
    return this.annotations.writeTo(base);
  }

  /** A PDFium save with the display rotations baked in (and reverted afterwards). */
  private async saveFromEngine(rotations: readonly [number, number][]): Promise<Uint8Array> {
    const { engine, doc } = this.store.session()!;
    let result: Uint8Array;
    try {
      // Inside the try so the finally always reverts, even if a mutation throws partway.
      for (const [n, r] of rotations) await engine.setPageRotation(doc, n - 1, r);
      result = await engine.save(doc);
    } finally {
      for (const [n] of rotations) {
        try {
          await engine.setPageRotation(doc, n - 1, 0);
        } catch (err) {
          this.store.reportOperationError({
            code: 'render_failed',
            message: 'Failed to restore page rotation after save.',
            recoverable: true,
            cause: err,
          });
        }
        this.bitmaps.invalidatePage(n); // drop any raster captured while rotated
      }
    }
    return result;
  }

  async saveAndDownload(filename?: string): Promise<void> {
    const data = await this.save();
    downloadBlob(new Blob([data.slice().buffer], { type: 'application/pdf' }), filename || this.deriveFilename());
  }

  /**
   * Download the document: the original bytes when untouched, otherwise the
   * edited document, so Download never silently drops the user's work.
   */
  async download(filename?: string): Promise<void> {
    const bytes = this.store.sourceBytes;
    if (!bytes) return;
    const edited =
      this.store.documentEdited || this.annotations.hasChanges() || [...this.store.pageRotations().values()].some((r) => r !== 0);
    if (!edited) {
      downloadBlob(new Blob([bytes.slice().buffer], { type: 'application/pdf' }), filename || this.deriveFilename());
      return;
    }
    try {
      await this.saveAndDownload(filename);
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to save the edited PDF.', recoverable: true, cause: err });
    }
  }

  /** Print the current (edited) document through the browser's PDF viewer in a hidden iframe. */
  async print(): Promise<void> {
    let data: Uint8Array;
    try {
      data = await this.save();
    } catch {
      return;
    }
    const url = URL.createObjectURL(new Blob([data.slice().buffer], { type: 'application/pdf' }));
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(url, '_blank'); // some browsers block iframe printing
      }
    };
    document.body.appendChild(iframe);
    // Give the print dialog ample time to read the data before cleaning up.
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60_000);
  }

  /** Rasterize a page (display rotation included) to PNG/JPEG and download it. */
  async exportPageAsImage(options?: PdfImageExportOptions): Promise<void> {
    const pageNumber = options?.page ?? this.store.state()?.page ?? 1;
    const page = this.store.findPage(pageNumber);
    const session = this.store.session();
    if (!page || !session) return;
    const scale = options?.scale ?? 2;
    const type = options?.type ?? 'image/png';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // dpr 1: the requested device pixels are exactly baseWidth × scale.
    const { bitmap, width, height } = await session.engine.renderPage(session.doc, pageNumber - 1, page.baseWidth * scale, 1).promise;
    const deg = this.store.pageRotation(pageNumber);
    const swap = isQuarterTurn(deg);
    canvas.width = swap ? height : width;
    canvas.height = swap ? width : height;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(bitmap, -width / 2, -height / 2);
    bitmap.close();
    // The raster leaves out the annotations the viewer draws itself; paint them in.
    const annotations = this.annotations.list().filter((a) => a.page === pageNumber - 1);
    if (annotations.length && typeof Path2D !== 'undefined') {
      ctx.translate(-width / 2, -height / 2);
      ctx.scale(width / page.baseWidth, height / page.baseHeight);
      for (const a of annotations) paintOps(ctx, annotationOps(a));
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, options?.quality));
    if (!blob) return;
    const ext = type === 'image/jpeg' ? 'jpg' : 'png';
    downloadBlob(blob, options?.filename || this.deriveFilename().replace(/\.pdf$/i, `-p${pageNumber}.${ext}`));
  }

  /** Download the whole document's text as `.txt` (pages separated by a blank line). */
  async exportText(filename?: string): Promise<void> {
    if (this.store.pages.length === 0) return;
    const pages = this.store.pages.map((p) => p.pageNumber);
    for (let i = 0; i < pages.length; i += 50) await this.pageData.ensureTextIndexes(pages.slice(i, i + 50));
    const parts = pages.map((n) => this.pageData.textIndexes.get(n)?.text ?? '');
    downloadBlob(
      new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' }),
      filename || this.deriveFilename().replace(/\.pdf$/i, '.txt'),
    );
  }

  private deriveFilename(): string {
    const src = this.store.src();
    if (typeof src === 'string') {
      try {
        const last = new URL(src, window.location.href).pathname.split('/').pop();
        if (last) return last.endsWith('.pdf') ? last : `${last}.pdf`;
      } catch {
        /* fall through */
      }
    }
    return 'document.pdf';
  }

  // ── Sidebar actions ─────────────────────────────────────────────────────

  downloadAttachment(att: PdfAttachmentEntry): void {
    if (!this.isBrowser) return;
    downloadBlob(new Blob([att.content as BlobPart], { type: 'application/octet-stream' }), att.filename);
  }

  async toggleFullscreen(): Promise<void> {
    const host = this.store.element;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else if (host.requestFullscreen) await host.requestFullscreen().catch(() => undefined);
  }
}

/**
 * Map a load failure to a viewer error. Sources: our HTTP fetch (`hkCode`),
 * the network layer (`TypeError` from `fetch`), and PDFium, whose errors
 * arrive as the Rust `Debug` string of `PdfiumLibraryInternalError(<FPDF_ERR_*>)`.
 */
export function toViewerError(err: unknown): PdfViewerError {
  const e = err as { name?: string; message?: string; hkCode?: string };
  const message = e?.message ?? String(err);
  if (e?.hkCode === 'load_failed' || e?.name === 'TypeError') {
    return { code: 'load_failed', message: message || 'Failed to load PDF.', recoverable: true, cause: err };
  }
  if (/FormatError/.test(message)) return { code: 'invalid_pdf', message: "This file isn't a valid PDF.", recoverable: false, cause: err };
  if (/FileError/.test(message)) return { code: 'load_failed', message: 'The PDF could not be read.', recoverable: true, cause: err };
  if (/SecurityError/.test(message)) {
    return { code: 'unsupported', message: 'This PDF uses an unsupported security handler.', recoverable: false, cause: err };
  }
  if (/pdfium worker crashed|PDFium worker not built/.test(message))
    return { code: 'unsupported', message, recoverable: false, cause: err };
  return { code: 'unknown', message: message || 'PDF viewer error.', recoverable: true, cause: err };
}

/** Trigger a browser download of `blob` as `filename`. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
