import { DestroyRef, Injectable, InjectionToken, ModelSignal, Signal, computed, inject, signal, untracked } from '@angular/core';
import { BitmapCache, defaultBitmapBudgetBytes } from '../core/bitmap-cache';
import { PdfVirtualPage } from '../core/pages/page-model';
import { PdfPageEntry } from '../core/types';
import { PdfEnginePool } from '../engine/pdf-engine-pool';
import { PdfDocHandle, PdfEngine } from '../engine/pdf-engine.types';
import { isPdfiumEngineAvailable } from '../engine/pdfium-worker.loader';
import { DEFAULT_PDF_VIEWER_LABELS, HK_PDF_LABELS, ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import {
  PdfAnnotationTool,
  PdfAttachmentEntry,
  PdfDocumentSource,
  PdfLoadedInfo,
  PdfSidebarTab,
  PdfViewerConfig,
  PdfViewerError,
  PdfViewerInternalApi,
  PdfViewerState,
} from '../pdf-viewer.types';

/**
 * Rendered-page bitmap cache, shared by every service that paints or
 * invalidates pages. Provided per viewer instance.
 */
export const PDF_BITMAP_CACHE = new InjectionToken<BitmapCache<ImageBitmap>>('PDF_BITMAP_CACHE');

/** Budget starts at the device default; `config.bitmapCacheMB` overrides it on load. */
export function providePdfBitmapCache() {
  return { provide: PDF_BITMAP_CACHE, useFactory: () => new BitmapCache<ImageBitmap>(defaultBitmapBudgetBytes()) };
}

/**
 * A document pages render from: the open document (id 0), an imported PDF,
 * or the template blank pages of one size render from. Each is open in the
 * engine for as long as the document is.
 */
export interface PdfPageSource {
  readonly id: number;
  readonly kind: 'document' | 'pdf' | 'blank';
  readonly handle: PdfDocHandle;
  readonly bytes: Uint8Array;
  readonly password: string;
  /** File name (imports). */
  readonly name: string;
  readonly pageCount: number;
}

/** Outputs the viewer component exposes; the store fires them alongside the config callbacks. */
export interface PdfViewerEvents {
  loaded(info: PdfLoadedInfo): void;
  pageChange(page: number): void;
  error(error: PdfViewerError): void;
  dirtyChange(dirty: boolean): void;
  pagesChange(numPages: number): void;
}

/** What the viewer component hands the store: its inputs, host element and outputs. */
export interface PdfViewerHost {
  readonly src: Signal<PdfDocumentSource | null>;
  readonly config: Signal<PdfViewerConfig>;
  readonly formValues: ModelSignal<Record<string, unknown>>;
  /** The host's explicit file name, if any. */
  readonly fileName?: Signal<string | null>;
  readonly element: HTMLElement;
  readonly events: PdfViewerEvents;
}

/**
 * Per-viewer shared state: the component's inputs, the controller's runtime
 * state, UI signals, and the open document session (engine, handle, pages).
 * Every other viewer service builds on this one; it depends on nothing but the
 * labels token. Provided at the viewer component, one instance per viewer.
 */
@Injectable()
export class PdfViewerStore {
  private readonly userLabels = inject(HK_PDF_LABELS, { optional: true });
  private host: PdfViewerHost | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.destroyEngine());
  }

  /** Called once by the viewer component's constructor, before any effect runs. */
  connect(host: PdfViewerHost): void {
    this.host = host;
  }

  private get h(): PdfViewerHost {
    if (!this.host) throw new Error('PdfViewerStore used before the viewer component connected it');
    return this.host;
  }

  // ── Inputs ──────────────────────────────────────────────────────────────

  readonly config = computed(() => this.h.config());
  readonly src = computed(() => this.h.src());
  readonly fileName = computed(() => this.h.fileName?.() ?? null);
  get formValues(): ModelSignal<Record<string, unknown>> {
    return this.h.formValues;
  }
  get element(): HTMLElement {
    return this.h.element;
  }

  readonly labels = computed<ResolvedPdfViewerLabels>(() => ({ ...DEFAULT_PDF_VIEWER_LABELS, ...this.userLabels }));
  readonly layout = computed(() => this.config().layout ?? 'default');

  // ── Controller runtime state ────────────────────────────────────────────

  /** Controller whose handlers the component has bound (used to detect a controller swap). */
  internal: PdfViewerInternalApi | null = null;

  /**
   * The controller's state bridge, read straight from `config` so state writes
   * work regardless of effect order (the document service may start loading
   * before the component's controller-binding effect has run).
   */
  private api(): PdfViewerInternalApi | null {
    return untracked(() => this.config()._internal) ?? null;
  }

  /** Current runtime state for bindings (`null` until a controller is attached). */
  readonly state = computed(() => this.config()._internal?.state() ?? null);

  /** Current state; tracked when read inside a reactive context. */
  snapshot(): PdfViewerState | null {
    return this.api()?.state() ?? null;
  }

  patchState(update: (s: PdfViewerState) => PdfViewerState): void {
    this.api()?.state.update(update);
  }

  // ── Panels ──────────────────────────────────────────────────────────────

  /**
   * Panels an alternative chrome (the workspace) shows right now. `null`: the
   * sidebar decides, from the controller's `sidebarOpen` / `sidebarTab`.
   */
  readonly shownPanels = signal<ReadonlySet<PdfSidebarTab> | null>(null);

  /** Panels on screen: thumbnails paint and outline / attachments load only while theirs is. */
  readonly visiblePanels = computed<ReadonlySet<PdfSidebarTab>>(() => {
    const shown = this.shownPanels();
    if (shown) return shown;
    const s = this.state();
    return new Set(s?.sidebarOpen ? [s.sidebarTab ?? 'thumbnails'] : []);
  });

  /** How an alternative chrome brings a panel into view; without one, the sidebar opens on its tab. */
  revealHandler: ((panel: PdfSidebarTab) => void) | null = null;

  /** Bring a panel into view (comments after "open thread", signatures after signing). */
  revealPanel(panel: PdfSidebarTab): void {
    if (this.revealHandler) this.revealHandler(panel);
    else this.patchState((s) => ({ ...s, sidebarOpen: true, sidebarTab: panel }));
  }

  // ── UI signals ──────────────────────────────────────────────────────────

  /** Page numbers the page stack and thumbnails iterate. */
  readonly pageNumbers = signal<number[]>([]);
  /** True once the first page of the current document has painted (until then the stack stays invisible). */
  readonly firstRenderComplete = signal(false);
  /** Last non-fatal operation failure; the document stays visible with a dismissible alert. */
  readonly operationError = signal<PdfViewerError | null>(null);
  readonly findBarOpen = signal(false);
  /** A streamed search is still scanning pages (the counter may grow). */
  readonly searchInProgress = signal(false);
  /** Sidebar data, fetched lazily when its tab opens. `null` until fetched. */
  readonly outline = signal<unknown[] | null>(null);
  readonly attachments = signal<PdfAttachmentEntry[] | null>(null);
  /** Active annotation tool (`'none'` = select / move / edit). */
  readonly annotationTool = signal<PdfAnnotationTool>('none');
  /** The annotation toolbar row is open. */
  readonly annotationBarOpen = signal(false);
  /** Page labels from the document's `/PageLabels` (`''` where none applies); empty until read. */
  readonly pageLabels = signal<readonly string[]>([]);
  /** Whether any page has a label that differs from its number (e.g. "iv", "A-1"). */
  readonly hasPageLabels = computed(() => this.pageLabels().some((label, i) => label !== '' && label !== String(i + 1)));
  /** The pages shown, in order (see `core/pages/page-model.ts`). Set through {@link setLayout}. */
  readonly pageLayout = signal<readonly PdfVirtualPage[]>([]);
  /** Rotation the user added per page number (degrees); the page shows turned, `save()` writes it. */
  readonly pageRotations = computed<ReadonlyMap<number, number>>(() => {
    const out = new Map<number, number>();
    this.pageLayout().forEach((p, i) => {
      if (p.rotation) out.set(i + 1, p.rotation);
    });
    return out;
  });
  /** Page number showing each page of the open document (by 0-based index), for links and bookmarks into it. */
  readonly documentPageNumbers = computed<ReadonlyMap<number, number>>(() => {
    const out = new Map<number, number>();
    const layout = this.pageLayout();
    // Originals first: a duplicate only stands in for a page that was deleted.
    for (const pass of [false, true])
      layout.forEach((p, i) => {
        if (p.source === 0 && (p.copyOf !== undefined) === pass && !out.has(p.index)) out.set(p.index, i + 1);
      });
    return out;
  });
  /** Inline text-editor popover (replaces `prompt()` for annotation text). */
  readonly textEditor = signal<{ label: string } | null>(null);
  readonly textEditorDraft = signal('');

  // ── Derived view state ──────────────────────────────────────────────────

  readonly showPages = computed(() => !!this.state()?.loaded && !this.state()?.error);
  readonly zoomPercent = computed(() => `${Math.round((this.state()?.zoom ?? 1) * 100)}%`);
  /** Live-region text ("Page 5 of 14"), announced politely as the page changes. */
  readonly ariaPageAnnouncement = computed(() => {
    const s = this.state();
    if (!s || !s.loaded || s.numPages === 0) return '';
    return this.labels().pageIndicator.replace('{current}', String(s.page)).replace('{total}', String(s.numPages));
  });
  readonly matchCounterText = computed(() => {
    const s = this.state();
    if (!s) return '';
    const cur = s.currentMatchIndex >= 0 ? s.currentMatchIndex + 1 : 0;
    return this.labels().matchCounter.replace('{current}', String(cur)).replace('{total}', String(s.searchMatches));
  });
  /** Localized headline for the document-error panel. */
  readonly errorTitle = computed(() => {
    const labels = this.labels();
    switch (this.state()?.error?.code) {
      case 'invalid_pdf':
        return labels.errorInvalidPdf;
      case 'password_cancelled':
        return labels.errorPasswordRequired;
      default:
        return labels.errorGeneric;
    }
  });
  /** Centre the stack vertically only when a single page is shown. */
  readonly centerPages = computed(() => {
    const s = this.state();
    return !!s && (s.mode === 'single' || s.numPages <= 1);
  });

  /** The label to show for a page: its `/PageLabels` label, else its number. */
  labelFor(pageNumber: number): string {
    return this.pageLabels()[pageNumber - 1] || String(pageNumber);
  }

  /** Page number for what the user typed: an exact page label first, then a number. */
  pageFromInput(value: string): number | null {
    const text = value.trim();
    const byLabel = this.pageLabels().indexOf(text);
    if (text && byLabel >= 0) return byLabel + 1;
    const n = Number(text);
    return Number.isFinite(n) && text !== '' ? n : null;
  }

  pageRotation(pageNumber: number): number {
    return this.pageRotations().get(pageNumber) ?? 0;
  }

  /** Single-page mode hides every page but the current one. */
  pageHidden(pageNumber: number): boolean {
    const s = this.state();
    return !!s && s.mode === 'single' && s.page !== pageNumber;
  }

  // ── Document session ────────────────────────────────────────────────────

  /** Engine (pool of PDFium workers); created lazily, reused across loads. */
  engine: PdfEngine | null = null;
  /** Handle of the open document, or `null`. */
  doc: PdfDocHandle | null = null;
  /** The pages shown, as the renderers address them (sizes in points); follows {@link pageLayout}. */
  pages: PdfPageEntry[] = [];
  /** Page sources by id (0 = the open document). */
  readonly sources = new Map<number, PdfPageSource>();
  private nextSourceId = 1;
  private nextUid = 1;
  /** Original bytes, kept for an unedited `download()`. */
  sourceBytes: Uint8Array | null = null;
  /** The password the open document was opened with (`''` when none was needed). */
  documentPassword = '';
  /** Bumped per load / structural change; async continuations bail when it moves. */
  loadToken = 0;
  /** Bumped on each full re-render; stale layer work compares against it. */
  renderEpoch = 0;
  /** Unsaved edits by source (`annotations` (the undo history), `forms`). */
  private readonly dirtySources = new Set<string>();

  findPage(pageNumber: number): PdfPageEntry | undefined {
    return this.pages[pageNumber - 1];
  }

  /** A new page id. */
  newPageUid(): number {
    return this.nextUid++;
  }

  /** Register a page source; returns its id (the open document is always 0). */
  addSource(source: Omit<PdfPageSource, 'id'>): number {
    const id = source.kind === 'document' ? 0 : this.nextSourceId++;
    this.sources.set(id, { ...source, id });
    return id;
  }

  /**
   * Show `layout`. The renderers' page list (and `pageNumbers`, which makes
   * the page stack re-render from the bitmap cache) changes only when the
   * pages themselves do; a rotation alone just turns them.
   */
  setLayout(layout: readonly PdfVirtualPage[]): boolean {
    const pages: PdfPageEntry[] = layout.map((p, i) => ({
      pageNumber: i + 1,
      baseWidth: p.width,
      baseHeight: p.height,
      doc: this.sources.get(p.source)?.handle ?? -1,
      index: p.index,
      key: `${p.source}:${p.index}`,
    }));
    const prev = this.pages;
    const changed = prev.length !== pages.length || pages.some((p, i) => p.key !== prev[i].key);
    this.pageLayout.set(layout);
    if (changed) {
      this.pages = pages;
      this.pageNumbers.set(pages.map((p) => p.pageNumber));
    }
    return changed;
  }

  /** Engine + open document, or `null` when either is missing. */
  session(): { engine: PdfEngine; doc: PdfDocHandle } | null {
    return this.engine && this.doc !== null ? { engine: this.engine, doc: this.doc } : null;
  }

  /** Whether there are unsaved edits (pages, annotations, the form). */
  get documentEdited(): boolean {
    return this.dirtySources.size > 0;
  }

  /** {@link documentEdited} as a signal, for chrome that shows the save state. */
  readonly dirty = signal(false);

  setAnnotationsDirty(dirty: boolean): void {
    this.setDirty('annotations', dirty);
  }

  /** Record whether a source (`annotations`, `forms`) has unsaved edits. */
  setDirty(source: string, dirty: boolean): void {
    this.updateDirty(() => (dirty ? this.dirtySources.add(source) : this.dirtySources.delete(source)));
  }

  resetDocumentEdited(): void {
    this.updateDirty(() => this.dirtySources.clear());
  }

  private updateDirty(change: () => void): void {
    const before = this.documentEdited;
    change();
    if (this.documentEdited === before) return;
    this.dirty.set(this.documentEdited);
    this.host?.events.dirtyChange(this.documentEdited);
  }

  /**
   * Lazily create the engine pool. `null` when PDFium can't run here (server,
   * missing browser primitives, or the worker isn't built); construction
   * failures are swallowed for the same reason.
   */
  ensureEngine(): PdfEngine | null {
    if (this.engine) return this.engine;
    if (!isPdfiumEngineAvailable()) return null;
    try {
      this.engine = new PdfEnginePool(this.renderPoolSize());
    } catch {
      this.engine = null;
    }
    return this.engine;
  }

  /** Render-worker count: `renderPoolSize` (default 2), clamped 1–4 and to the core count. */
  private renderPoolSize(): number {
    const want = this.config().renderPoolSize ?? 2;
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    return Math.max(1, Math.min(want, 4, cores));
  }

  /** Release the open document (and every page source) but keep the engine for the next load. */
  closeDocument(): void {
    this.sourceBytes = null;
    this.pages = [];
    this.pageNumbers.set([]);
    this.pageLayout.set([]);
    if (this.engine) for (const s of this.sources.values()) this.engine.dispose(s.handle);
    if (this.engine && this.doc !== null && !this.sources.has(0)) this.engine.dispose(this.doc);
    this.sources.clear();
    this.nextSourceId = 1;
    this.doc = null;
  }

  private destroyEngine(): void {
    this.closeDocument();
    this.engine?.destroy();
    this.engine = null;
  }

  // ── Events & errors ─────────────────────────────────────────────────────

  /** What the last load reported (title, page count, size); `null` before a document loads. */
  readonly loadedInfo = signal<PdfLoadedInfo | null>(null);

  notifyLoaded(info: PdfLoadedInfo): void {
    this.loadedInfo.set(info);
    this.config().onLoaded?.(info);
    this.host?.events.loaded(info);
  }

  notifyPageChange(page: number): void {
    this.config().onPageChange?.(page);
    this.host?.events.pageChange(page);
  }

  notifyPagesChange(numPages: number): void {
    this.host?.events.pagesChange(numPages);
  }

  /** Document-level failure: nothing to show. Replaces the page stack with the error panel. */
  emitError(error: PdfViewerError): void {
    this.patchState((s) => ({ ...s, error, loaded: false }));
    this.config().onError?.(error);
    this.host?.events.error(error);
  }

  /** An operation failed but the document is still usable: keep it on screen and show a dismissible alert. */
  reportOperationError(error: PdfViewerError): void {
    this.operationError.set(error);
    this.config().onError?.(error);
    this.host?.events.error(error);
  }

  dismissOperationError(): void {
    this.operationError.set(null);
  }
}
