import { Injectable, PLATFORM_ID, effect, inject, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { annotationOps, decodeImages, paintOps } from '../core/annotations/shapes';
import { writeDocumentChanges } from '../core/forms/document-writer';
import { widgetOps } from '../core/forms/form-appearance';
import { extractPages } from '../core/pages/page-writer';
import { PdfDoc } from '../core/pdf-writer/document';
import { loadPdfFonts } from '../core/pdf-writer/fonts';
import { PdfSigner } from '../core/signatures/cms';
import { signPdf } from '../core/signatures/pdf-signature';
import { BitmapCache, defaultBitmapBudgetBytes } from '../core/bitmap-cache';
import { isQuarterTurn } from '../core/geometry';
import { PdfDocHandle, PdfEngine } from '../engine/pdf-engine.types';
import {
  PdfAttachmentEntry,
  PdfDigitalSignOptions,
  PdfSignerSource,
  PdfDocumentSource,
  PdfImageExportOptions,
  PdfViewerError,
} from '../pdf-viewer.types';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFindService } from './pdf-find.service';
import { PdfFormsService } from './pdf-forms.service';
import { PdfRasterHiddenService } from './pdf-raster-hidden.service';
import { PdfSignaturesService } from './pdf-signatures.service';
import { PdfFormDesignerService } from './pdf-form-designer.service';
import { PdfPageDataService } from './pdf-page-data.service';
import { PdfPagesService } from './pdf-pages.service';
import { PdfThumbnailsService } from './pdf-thumbnails.service';
import { PDF_BITMAP_CACHE, PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

/** Engine rejection message for a missing or wrong password. */
const PASSWORD_REQUIRED = 'PDFIUM_PASSWORD_REQUIRED';
/** How many passwords `onPasswordRequired` may supply before giving up. */
const MAX_PASSWORD_ATTEMPTS = 4;

/**
 * The open document's lifecycle and file operations: loading (with password
 * prompts), save / download / print / export (and page extraction), and the
 * sidebar's annotation and attachment actions. Page edits live in
 * `PdfPagesService`.
 */
@Injectable()
export class PdfDocumentService {
  private readonly store = inject(PdfViewerStore);
  private readonly pageData = inject(PdfPageDataService);
  private readonly viewport = inject(PdfViewportService);
  private readonly find = inject(PdfFindService);
  private readonly thumbnails = inject(PdfThumbnailsService);
  private readonly forms = inject(PdfFormsService);
  private readonly hidden = inject(PdfRasterHiddenService);
  private readonly designer = inject(PdfFormDesignerService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly signatures = inject(PdfSignaturesService);
  private readonly pages = inject(PdfPagesService);
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

    // Register the configured fonts (once each; shared by every viewer).
    effect(() => {
      const fonts = this.store.config().fonts;
      if (!fonts?.length || !this.isBrowser) return;
      untracked(
        () =>
          void loadPdfFonts(fonts, (source, err) =>
            this.store.reportOperationError({
              code: 'unknown',
              message: `Failed to load the font "${source.name}".`,
              recoverable: true,
              cause: err,
            }),
          ),
      );
    });

    // Panel data loads lazily when its panel is on screen and the data is missing
    // (first view, or invalidated by an edit while the panel is showing).
    effect(() => {
      const panels = this.store.visiblePanels();
      const fetch =
        panels.has('bookmarks') && this.store.outline() === null
          ? () => this.pageData.fetchOutline()
          : panels.has('attachments') && this.store.attachments() === null
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

  /** Open `src`; `initialPage` overrides the configured first page (a reload keeps the reader's place). */
  async load(src: PdfDocumentSource, password: string, initialPage?: number): Promise<void> {
    const store = this.store;
    this.viewport.resetForDocument();
    store.firstRenderComplete.set(false);
    store.operationError.set(null);
    store.outline.set(null);
    store.attachments.set(null);
    this.annotations.reset();
    this.forms.reset();
    this.designer.reset();
    this.hidden.reset();
    this.pages.reset();
    store.pageLabels.set([]);
    store.resetDocumentEdited();
    this.thumbnails.resetForDocument();
    this.find.reset();
    this.pageData.reset();
    void this.signatures.validate(null);
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

      const sizes = await engine.pageSizes(handle);
      if (store.loadToken !== token) return;
      const numPages = sizes.length;
      // Resolve the initial page before mounting wrappers: the viewport scrolls
      // to `state.page` once every wrapper exists.
      const firstPage = Math.max(1, Math.min(numPages, initialPage ?? store.config().page ?? 1));
      store.patchState((s) => ({ ...s, page: firstPage, numPages }));
      this.pages.open(handle, store.sourceBytes, store.documentPassword, sizes);
      // Editable annotations and the form are read (with hk-pdf-writer) alongside the first renders.
      void this.loadEditables(store.sourceBytes, numPages, token);
      this.pageData.createSearchIndex(numPages, token);
      this.loadPageLabels(engine, handle, token);

      store.patchState((s) => ({ ...s, loaded: true, error: null }));
      const title = await engine.documentTitle(handle).catch(() => '');
      if (store.loadToken !== token) return;
      store.notifyLoaded({ numPages, title, fingerprint: '', fileSize });
    } catch (err: unknown) {
      if (store.loadToken !== token) return;
      store.emitError(toViewerError(err));
    }
  }

  /** Parse the bytes once with hk-pdf-writer for the annotation and form models (null when it can't read them). */
  private async loadEditables(bytes: Uint8Array, numPages: number, token: number): Promise<void> {
    let doc: PdfDoc | null = null;
    try {
      doc = await PdfDoc.load(bytes, this.store.documentPassword);
    } catch {
      doc = null;
    }
    const readPages = doc
      ? await doc.pages().then(
          (p) => p.length,
          () => -1,
        )
      : -1;
    if (this.store.loadToken !== token) return;
    this.pages.load(doc, numPages, readPages);
    await Promise.all([this.annotations.load(doc, numPages), this.forms.load(doc), this.signatures.validate(doc ? bytes : null)]);
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
        const handle = await engine.open(makeCopy(), { password: password || undefined });
        this.store.documentPassword = password;
        return handle;
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
        if (this.store.loadToken === token) this.pages.setDocumentLabels(labels);
      })
      .catch(() => undefined);
  }

  // ── Page operations (the controller's; see PdfPagesService) ───────────

  /** Rotate a page by `delta` degrees (default +90). */
  rotatePage(pageNumber: number, delta = 90): void {
    void this.pages.rotate([pageNumber], delta).catch((err) => this.reportPageError(err));
  }

  rotateCurrentPage(): void {
    const p = this.store.state()?.page;
    if (p) this.rotatePage(p, 90);
  }

  /** Delete a page (1-based). No-op on the last remaining page. */
  async deletePage(pageNumber: number): Promise<void> {
    await this.pages.delete([pageNumber]).catch((err) => this.reportPageError(err));
  }

  /** Insert a blank page that becomes page `atPageNumber` (clamped), sized like its neighbour. */
  async insertBlankPage(atPageNumber: number): Promise<void> {
    await this.pages.insertBlank(atPageNumber).catch((err) => this.reportPageError(err));
  }

  private reportPageError(err: unknown): void {
    this.store.reportOperationError({
      code: 'unknown',
      message: (err as Error)?.message || 'The page change failed.',
      recoverable: true,
      cause: err,
    });
  }

  // ── Save / download / print / export ────────────────────────────────────

  /**
   * Serialize the document with every edit: the original bytes with one
   * incremental update (pages, annotations, form) written by hk-pdf-writer,
   * so existing signatures stay valid. Unedited, the original bytes.
   */
  async save(): Promise<Uint8Array> {
    const source = this.store.sourceBytes;
    if (!this.store.session() || !source) throw new Error('No PDF document loaded');
    const pages = this.pages.writerChanges();
    const annotations = this.annotations.changes();
    const formValues = this.forms.changedValues();
    const formDesign = this.forms.designed() ?? undefined;
    if (!pages && !annotations && formValues.size === 0 && !formDesign) return source.slice();
    return writeDocumentChanges(source.slice(), {
      pages: pages ?? undefined,
      formValues,
      formDesign,
      annotations: annotations ?? undefined,
      password: this.store.documentPassword,
    });
  }

  /** A new PDF with the given pages (1-based, in that order) of the edited document. */
  async extractPages(pageNumbers: readonly number[]): Promise<Uint8Array> {
    if (!this.pages.canExtract()) throw new Error(this.store.labels().extractUnavailable);
    const count = this.store.pages.length;
    const indices = pageNumbers.filter((n) => n >= 1 && n <= count).map((n) => n - 1);
    if (indices.length === 0) throw new Error('No pages to extract');
    return extractPages(await this.save(), indices);
  }

  /** Extract pages and download them as a new PDF. */
  async downloadExtracted(pageNumbers: readonly number[]): Promise<void> {
    const bytes = await this.extractPages(pageNumbers);
    downloadBlob(new Blob([bytes.slice().buffer], { type: 'application/pdf' }), this.deriveFilename().replace(/\.pdf$/i, '-pages.pdf'));
  }

  /**
   * Sign digitally: the document with every pending edit, signed as a last
   * incremental update, then reopened (on the same page) from the signed
   * bytes, which are returned.
   */
  async signDigitally(options: PdfDigitalSignOptions = {}): Promise<Uint8Array> {
    const signer = options.signer ?? (await resolveSigner(this.store.config().signer));
    if (!signer) throw new Error('No signer: set `signer` in the viewer config.');
    const base = await this.save();
    const signed = await signPdf(base, signer, {
      field: options.field,
      page: options.page,
      rect: options.rect,
      reason: options.reason,
      location: options.location,
      contactInfo: options.contactInfo,
      certify: options.certify,
      subFilter: options.subFilter,
      password: this.store.documentPassword,
    });
    await this.load(signed.slice(), this.store.documentPassword, this.store.state()?.page);
    return signed;
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
      this.store.documentEdited ||
      this.annotations.hasChanges() ||
      this.forms.changedValues().size > 0 ||
      !!this.forms.designed() ||
      this.pages.edited();
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
    const { bitmap, width, height } = await session.engine.renderPage(page.doc, page.index, page.baseWidth * scale, 1).promise;
    const deg = this.store.pageRotation(pageNumber);
    const swap = isQuarterTurn(deg);
    canvas.width = swap ? height : width;
    canvas.height = swap ? width : height;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(bitmap, -width / 2, -height / 2);
    bitmap.close();
    // The raster leaves out what the viewer draws itself (annotations, form widgets); paint them in.
    if (typeof Path2D !== 'undefined') {
      ctx.translate(-width / 2, -height / 2);
      ctx.scale(width / page.baseWidth, height / page.baseHeight);
      for (const { field, widget } of this.forms.widgetsForPage(pageNumber))
        paintOps(ctx, widgetOps(field, widget, this.forms.value(field.name)));
      const ops = this.annotations
        .list()
        .filter((a) => a.page === pageNumber - 1)
        .map(annotationOps);
      const images = await decodeImages(ops.flat());
      for (const list of ops) paintOps(ctx, list, images);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, options?.quality));
    if (!blob) return;
    const ext = type === 'image/jpeg' ? 'jpg' : 'png';
    downloadBlob(blob, options?.filename || this.deriveFilename().replace(/\.pdf$/i, `-p${pageNumber}.${ext}`));
  }

  /** Download the revision a signature covers: the document exactly as it was signed. */
  downloadSignedRevision(length: number): void {
    const bytes = this.store.sourceBytes;
    if (!bytes || length <= 0 || length > bytes.length) return;
    downloadBlob(
      new Blob([bytes.slice(0, length).buffer], { type: 'application/pdf' }),
      this.deriveFilename().replace(/\.pdf$/i, '-signed.pdf'),
    );
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

  /** Download the form data as JSON, XFDF or FDF. */
  exportFormData(format: 'json' | 'xfdf' | 'fdf'): void {
    const base = this.deriveFilename().replace(/\.pdf$/i, '');
    const type = format === 'json' ? 'application/json' : format === 'xfdf' ? 'application/vnd.adobe.xfdf' : 'application/vnd.fdf';
    downloadBlob(new Blob([this.forms.exportData(format)], { type }), `${base}-data.${format}`);
  }

  /** Import form data from a JSON, XFDF or FDF file; a bad file is reported, not thrown. */
  async importFormDataFile(file: File): Promise<number> {
    try {
      return this.forms.importData(await file.text());
    } catch (err) {
      this.store.reportOperationError({ code: 'unknown', message: this.store.labels().importFailed, recoverable: true, cause: err });
      return 0;
    }
  }

  /** Download the annotations as XFDF or JSON. */
  exportAnnotations(format: 'xfdf' | 'json'): void {
    const base = this.deriveFilename().replace(/\.pdf$/i, '');
    if (format === 'xfdf') {
      const xml = this.annotations.exportXfdf(`${base}.pdf`);
      downloadBlob(new Blob([xml], { type: 'application/vnd.adobe.xfdf' }), `${base}.xfdf`);
    } else {
      downloadBlob(new Blob([this.annotations.exportJson()], { type: 'application/json' }), `${base}-annotations.json`);
    }
  }

  /** Import annotations from an XFDF or JSON file; a bad file is reported, not thrown. */
  async importAnnotationsFile(file: File): Promise<number> {
    try {
      return await this.annotations.importAnnotations(await file.text());
    } catch (err) {
      this.store.reportOperationError({ code: 'unknown', message: this.store.labels().importFailed, recoverable: true, cause: err });
      return 0;
    }
  }

  /** The document's file name: from the URL, the `File`'s name, or `document.pdf`. */
  fileName(): string {
    return this.deriveFilename();
  }

  private deriveFilename(): string {
    const src = this.store.src();
    if (typeof File !== 'undefined' && src instanceof File && src.name) return src.name;
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

async function resolveSigner(source: PdfSignerSource | undefined): Promise<PdfSigner | null> {
  return typeof source === 'function' ? await source() : (source ?? null);
}
