import { Injectable, computed, inject, signal } from '@angular/core';
import { pageSpace } from '../core/annotations/annotation-io';
import { PageSpace } from '../core/annotations/page-space';
import {
  PdfVirtualPage,
  deletePages,
  duplicatePages,
  insertPages,
  isIdentityRemap,
  isSourceOrder,
  movePages,
  pageRemap,
  rotatePages,
  sameLayout,
} from '../core/pages/page-model';
import { PdfPageLayoutChanges, PdfPageSourceData, blankPdf } from '../core/pages/page-writer';
import { PdfDoc } from '../core/pdf-writer/document';
import { PDF_PERMISSION, PdfPasswordError } from '../core/pdf-writer/security';
import { PdfDocHandle, PdfPageSize } from '../engine/pdf-engine.types';
import { PdfDocumentSource, PdfImportPagesOptions } from '../pdf-viewer.types';
import { AnnotationPages, PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFindService } from './pdf-find.service';
import { PdfFormDesignerService } from './pdf-form-designer.service';
import { FormPages, PdfFormsService } from './pdf-forms.service';
import { PdfPageDataService } from './pdf-page-data.service';
import { PdfThumbnailsService } from './pdf-thumbnails.service';
import { PdfViewerStore } from './pdf-viewer.store';

/** How many passwords `onPasswordRequired` may supply for an imported PDF. */
const MAX_PASSWORD_ATTEMPTS = 4;

/**
 * Page organization: the page layout (see `core/pages/page-model.ts`) and
 * its edits — rotate, delete, insert blank pages, duplicate, move, import
 * from other PDFs. Every edit is one step in the document's undo history
 * (shared with the annotations) and moves the annotations and form widgets
 * with their pages. Nothing is re-parsed or re-rendered: rasters are cached
 * by source page. `save()` writes the layout with hk-pdf-writer as part of
 * its incremental update ({@link writerChanges}), so existing signatures
 * stay valid.
 */
@Injectable()
export class PdfPagesService {
  private readonly store = inject(PdfViewerStore);
  private readonly thumbnails = inject(PdfThumbnailsService);
  private readonly pageData = inject(PdfPageDataService);
  private readonly find = inject(PdfFindService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly forms = inject(PdfFormsService);
  private readonly designer = inject(PdfFormDesignerService);

  /** The Organize pages dialog is open. */
  readonly organizerOpen = signal(false);

  /** hk-pdf-writer reads the document and its permissions allow assembling it. */
  private readonly writable = signal(false);
  private readonly encrypted = signal(false);
  /** Every page created this session, by uid (to trace copies of copies). */
  private readonly registry = new Map<number, PdfVirtualPage>();
  /** Blank-page sources by size (`w×h`), and their sizes. */
  private readonly blankSources = new Map<string, Promise<number>>();
  private readonly blankSizes = new Map<number, PdfPageSize>();
  /** Spaces of the imported and blank pages (for annotations added to them). */
  private readonly sourceSpaces = new Map<number, readonly PageSpace[]>();
  private documentPageCount = 0;
  /** `/PageLabels` of the document: shown while its pages are in their own order. */
  private documentLabels: readonly string[] = [];

  /** Page editing is turned on (`pageOrganizer`, default true). */
  readonly enabled = computed(() => this.store.config().pageOrganizer !== false);
  /** Pages can be rotated. */
  readonly canRotate = computed(() => this.enabled() && this.store.showPages() && this.writable() && this.forms.docMdp() === null);
  /** Pages can be moved, deleted, duplicated, inserted and imported. */
  readonly canOrganize = computed(() => this.canRotate() && !this.designer.active() && this.forms.designed() === null);
  /** Why pages can't be organized (null when they can, or when page editing is off). */
  readonly unavailableReason = computed<string | null>(() => {
    if (!this.enabled() || !this.store.showPages() || this.canOrganize()) return null;
    const l = this.store.labels();
    if (!this.writable()) return l.pagesNotEditable;
    if (this.forms.docMdp() !== null) return l.pagesCertified;
    return l.pagesDesignPending;
  });
  /** Pages can be extracted to a new PDF (not from an encrypted one, which would leave its protection behind). */
  readonly canExtract = computed(() => this.store.showPages() && this.writable() && !this.encrypted());
  /** The layout differs from the document's own pages (order, pages or rotation). */
  readonly edited = computed(() => {
    const layout = this.store.pageLayout();
    return !isSourceOrder(layout, this.documentPageCount) || layout.some((p) => p.rotation !== 0);
  });

  constructor() {
    this.annotations.setUndoGuard((command) => {
      if (command.kind !== 'pages' || (this.forms.designed() === null && !this.designer.active())) return true;
      this.store.reportOperationError({ code: 'unknown', message: this.store.labels().pagesDesignPending, recoverable: true });
      return false;
    });
  }

  // ── Document lifecycle ──────────────────────────────────────────────────

  /** Forget everything (a new document is loading). */
  reset(): void {
    this.organizerOpen.set(false);
    this.writable.set(false);
    this.encrypted.set(false);
    this.registry.clear();
    this.blankSources.clear();
    this.blankSizes.clear();
    this.sourceSpaces.clear();
    this.documentPageCount = 0;
    this.documentLabels = [];
  }

  /** The document opened: register it as source 0 and show its pages. */
  open(handle: PdfDocHandle, bytes: Uint8Array, password: string, sizes: readonly PdfPageSize[]): void {
    this.store.addSource({ kind: 'document', handle, bytes, password, name: '', pageCount: sizes.length });
    this.documentPageCount = sizes.length;
    const layout = sizes.map((size, index) => this.newPage(0, index, size));
    this.store.setLayout(layout);
  }

  /** hk-pdf-writer parsed the document (or couldn't: `null`): page edits need it to save. */
  load(doc: PdfDoc | null, pageCount: number, readPages: number): void {
    this.encrypted.set(!!doc?.security);
    this.writable.set(!!doc && readPages === pageCount && (!doc.security || doc.security.allows(PDF_PERMISSION.assemble)));
  }

  /** The document's page labels arrived. */
  setDocumentLabels(labels: readonly string[]): void {
    this.documentLabels = labels;
    if (isSourceOrder(this.store.pageLayout(), this.documentPageCount)) this.store.pageLabels.set(labels);
  }

  // ── Edits ───────────────────────────────────────────────────────────────

  /** Rotate pages (1-based) by `delta` degrees clockwise. */
  rotate(pageNumbers: readonly number[], delta = 90): Promise<void> {
    if (!this.canRotate()) return Promise.resolve();
    const label = this.store.labels().rotatePagesCommand;
    return this.commit(rotatePages(this.store.pageLayout(), this.uids(pageNumbers), delta), label);
  }

  /** Delete pages (1-based). At least one page always stays. */
  delete(pageNumbers: readonly number[]): Promise<void> {
    const uids = this.uids(pageNumbers);
    if (!this.canOrganize() || uids.size === 0 || uids.size >= this.store.pageLayout().length) return Promise.resolve();
    return this.commit(deletePages(this.store.pageLayout(), uids), this.store.labels().deletePagesCommand);
  }

  /** Duplicate pages (1-based), each copy right after its page. */
  duplicate(pageNumbers: readonly number[]): Promise<void> {
    if (!this.canOrganize()) return Promise.resolve();
    const next = duplicatePages(this.store.pageLayout(), this.uids(pageNumbers), () => this.store.newPageUid());
    return this.commit(next, this.store.labels().duplicatePagesCommand);
  }

  /** Move pages (1-based, keeping their order) before page `to` (`numPages + 1` = the end). */
  move(pageNumbers: readonly number[], to: number): Promise<void> {
    if (!this.canOrganize()) return Promise.resolve();
    return this.commit(movePages(this.store.pageLayout(), this.uids(pageNumbers), to - 1), this.store.labels().movePagesCommand);
  }

  /** Insert a blank page that becomes page `at` (clamped), sized like its neighbour unless `size` is given. */
  async insertBlank(at: number, size?: PdfPageSize): Promise<void> {
    if (!this.canOrganize()) return;
    const layout = this.store.pageLayout();
    const i = Math.max(0, Math.min(layout.length, at - 1));
    const page = await this.blankPage(size ?? this.neighbourSize(layout, i));
    await this.commit(insertPages(this.store.pageLayout(), i, [page]), this.store.labels().insertPageCommand);
  }

  /** Import pages of another PDF; resolves with how many were added. */
  async import(source: PdfDocumentSource, options: PdfImportPagesOptions = {}): Promise<number> {
    if (!this.canOrganize()) return 0;
    const pages = await this.openPdf(source, options);
    const layout = this.store.pageLayout();
    const at = options.at === undefined ? layout.length : Math.max(0, Math.min(layout.length, options.at - 1));
    await this.commit(insertPages(layout, at, pages), this.store.labels().importPagesCommand);
    return pages.length;
  }

  /** Show `layout` as one undoable step (the organizer's Apply). */
  apply(layout: readonly PdfVirtualPage[], label = this.store.labels().organizePagesCommand): Promise<void> {
    if (!this.canOrganize() && !this.onlyRotated(layout)) return Promise.resolve();
    return this.commit(layout, label);
  }

  /** Remember pages made outside this service (the organizer's duplicates), so their copies trace back. */
  register(pages: readonly PdfVirtualPage[]): void {
    for (const p of pages) this.registry.set(p.uid, p);
  }

  // ── New pages ───────────────────────────────────────────────────────────

  /** A new blank page (not shown yet). Its size's template opens in the engine once. */
  async blankPage(size: PdfPageSize): Promise<PdfVirtualPage> {
    const width = Math.round(size.width * 1000) / 1000;
    const height = Math.round(size.height * 1000) / 1000;
    const key = `${width}x${height}`;
    let id = this.blankSources.get(key);
    if (!id) {
      id = (async () => {
        const engine = this.store.ensureEngine();
        if (!engine) throw new Error('PDF engine unavailable');
        const bytes = blankPdf(width, height);
        const handle = await engine.open(bytes.slice().buffer as ArrayBuffer);
        const sourceId = this.store.addSource({ kind: 'blank', handle, bytes, password: '', name: '', pageCount: 1 });
        this.blankSizes.set(sourceId, { width, height });
        this.sourceSpaces.set(sourceId, [new PageSpace([0, 0, width, height], 0)]);
        return sourceId;
      })();
      this.blankSources.set(key, id);
      id.catch(() => this.blankSources.delete(key));
    }
    return this.newPage(await id, 0, { width, height });
  }

  /**
   * New pages (not shown yet) from a PDF, opened as a page source. A
   * password-protected one uses `options.password`, then asks
   * `onPasswordRequired`; one that forbids copying its pages is refused.
   */
  async openPdf(source: PdfDocumentSource, options: Pick<PdfImportPagesOptions, 'pages' | 'password'> = {}): Promise<PdfVirtualPage[]> {
    const engine = this.store.ensureEngine();
    if (!engine) throw new Error('PDF engine unavailable');
    const labels = this.store.labels();
    const bytes = await readSource(source);
    const name = source instanceof File ? source.name : typeof source === 'string' ? (source.split('/').pop() ?? '') : '';
    let password = options.password ?? '';
    let doc: PdfDoc | null = null;
    for (let attempt = 0; !doc; attempt++) {
      try {
        doc = await PdfDoc.load(bytes, password);
      } catch (err) {
        const ask = this.store.config().onPasswordRequired;
        if (!(err instanceof PdfPasswordError) || !ask || attempt >= MAX_PASSWORD_ATTEMPTS) {
          throw new Error(err instanceof PdfPasswordError ? labels.importPasswordRequired : labels.importUnreadable, { cause: err });
        }
        password = await new Promise<string>((resolve) => ask(resolve));
      }
    }
    if (doc.security && !doc.security.allows(PDF_PERMISSION.copy)) throw new Error(labels.importNotAllowed);
    const pageRefs = await doc.pages();
    const handle = await engine.open(bytes.slice().buffer as ArrayBuffer, { password: password || undefined });
    let sizes: PdfPageSize[];
    try {
      sizes = await engine.pageSizes(handle);
      if (sizes.length !== pageRefs.length || sizes.length === 0) throw new Error(labels.importUnreadable);
    } catch (err) {
      engine.dispose(handle);
      throw err;
    }
    const id = this.store.addSource({ kind: 'pdf', handle, bytes, password, name, pageCount: sizes.length });
    this.sourceSpaces.set(id, await Promise.all(pageRefs.map((p) => pageSpace(doc, p.dict))));
    const wanted = options.pages?.length
      ? options.pages.map((n) => n - 1).filter((i) => i >= 0 && i < sizes.length)
      : sizes.map((_, i) => i);
    return wanted.map((index) => this.newPage(id, index, sizes[index]));
  }

  // ── Saving ──────────────────────────────────────────────────────────────

  /** What `save()` writes for the pages (null when they're the document's own, unrotated). */
  writerChanges(): PdfPageLayoutChanges | null {
    const layout = this.store.pageLayout();
    if (!this.edited()) return null;
    const sources = new Map<number, PdfPageSourceData>();
    for (const p of layout) {
      if (p.source === 0 || sources.has(p.source)) continue;
      const blank = this.blankSizes.get(p.source);
      const s = this.store.sources.get(p.source);
      if (blank) sources.set(p.source, { kind: 'blank', ...blank });
      else if (s) sources.set(p.source, { kind: 'pdf', load: () => PdfDoc.load(s.bytes, s.password) });
    }
    return {
      pages: layout.map((p) => ({ source: p.source, index: p.index, rotation: p.rotation, copy: p.copyOf !== undefined })),
      sources,
      managedAnnots: (index) => this.annotations.managedIndices(index),
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private newPage(source: number, index: number, size: PdfPageSize): PdfVirtualPage {
    const page: PdfVirtualPage = { uid: this.store.newPageUid(), source, index, width: size.width, height: size.height, rotation: 0 };
    this.registry.set(page.uid, page);
    return page;
  }

  private uids(pageNumbers: readonly number[]): Set<number> {
    const layout = this.store.pageLayout();
    return new Set(pageNumbers.flatMap((n) => (layout[n - 1] ? [layout[n - 1].uid] : [])));
  }

  private neighbourSize(layout: readonly PdfVirtualPage[], i: number): PdfPageSize {
    const ref = layout[Math.min(i, layout.length - 1)] ?? layout[i - 1];
    return ref ? { width: ref.width, height: ref.height } : { width: 612, height: 792 };
  }

  /** Whether `layout` differs from the current one only in rotations. */
  private onlyRotated(layout: readonly PdfVirtualPage[]): boolean {
    const now = this.store.pageLayout();
    return this.canRotate() && layout.length === now.length && layout.every((p, i) => p.uid === now[i].uid);
  }

  /**
   * Record the change to `after` as one undo step. Annotations and widgets
   * are remapped once, here; undo and redo swap the before and after states
   * (the history is linear, so the state being replaced is always the one
   * the step left).
   */
  private async commit(after: readonly PdfVirtualPage[], label: string): Promise<void> {
    const before = this.store.pageLayout();
    if (sameLayout(before, after)) return;
    for (const p of after) this.registry.set(p.uid, p);
    const remap = pageRemap(before, after, (uid) => this.registry.get(uid));
    const structural = !isIdentityRemap(remap);
    const states = structural
      ? {
          before: { annotations: this.annotations.pagesSnapshot(), forms: this.forms.pagesSnapshot() },
          after: {
            annotations: this.annotations.remapped(remap, (i) => this.spaceOf(after[i])),
            forms: this.forms.remapped(remap),
          },
        }
      : null;
    await this.annotations.execute({
      label,
      kind: 'pages',
      apply: () => this.show(after, states?.after ?? null),
      revert: () => this.show(before, states?.before ?? null),
    });
  }

  /** Show a layout (with the annotation and form state that goes with it, after a structural change). */
  private show(layout: readonly PdfVirtualPage[], state: { annotations: AnnotationPages; forms: FormPages } | null): void {
    const store = this.store;
    const previous = store.pageLayout();
    const currentUid = previous[(store.snapshot()?.page ?? 1) - 1]?.uid;
    if (state) {
      this.annotations.restorePages(state.annotations);
      this.forms.restorePages(state.forms);
    }
    const changed = store.setLayout(layout);
    if (!state) {
      // Rotation only: the pages just turn; their thumbnails repaint (from the raster cache).
      layout.forEach((p, i) => {
        if (p.rotation !== previous[i]?.rotation) this.thumbnails.refresh(i + 1);
      });
      return;
    }
    // In-flight work on the old structure bails; text, links and search follow the pages.
    const token = ++store.loadToken;
    this.pageData.reset();
    this.find.reset();
    this.thumbnails.reset();
    store.outline.set(null);
    store.pageLabels.set(isSourceOrder(layout, this.documentPageCount) ? this.documentLabels : []);
    const numPages = layout.length;
    const kept = layout.findIndex((p) => p.uid === currentUid);
    const page = kept >= 0 ? kept + 1 : Math.max(1, Math.min(numPages, store.snapshot()?.page ?? 1));
    store.patchState((s) => ({ ...s, page, numPages, searchMatches: 0, currentMatchIndex: -1 }));
    // The same rasters in a new arrangement (duplicates swapped) still re-render the stack (from the cache).
    if (!changed) store.pageNumbers.set(layout.map((_, i) => i + 1));
    store.notifyPagesChange(numPages);
    this.pageData.createSearchIndex(numPages, token);
    const query = store.snapshot()?.searchQuery;
    if (query) void this.find.run(query);
  }

  private spaceOf(page: PdfVirtualPage | undefined): PageSpace {
    if (!page) return new PageSpace([0, 0, 612, 792], 0);
    return this.sourceSpaces.get(page.source)?.[page.index] ?? new PageSpace([0, 0, page.width, page.height], 0);
  }
}

/** The bytes of a document source (fetched, read or copied). */
async function readSource(source: PdfDocumentSource): Promise<Uint8Array> {
  if (typeof source === 'string') {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch PDF (HTTP ${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());
  return source.slice();
}
