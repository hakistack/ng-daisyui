import { DestroyRef, Injectable, InjectionToken, ModelSignal, Signal, computed, inject, signal, untracked } from '@angular/core';
import { BitmapCache } from '../core/bitmap-cache';
import { PdfPageEntry } from '../core/types';
import { PdfEnginePool } from '../engine/pdf-engine-pool';
import { PdfDocHandle, PdfEngine } from '../engine/pdf-engine.types';
import { isPdfiumEngineAvailable } from '../engine/pdfium-worker.loader';
import { DEFAULT_PDF_VIEWER_LABELS, HK_PDF_LABELS, ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import {
  PdfAnnotationEntry,
  PdfAnnotationTool,
  PdfAttachmentEntry,
  PdfDocumentSource,
  PdfLoadedInfo,
  PdfViewerConfig,
  PdfViewerError,
  PdfViewerInternalApi,
  PdfViewerState,
} from '../pdf-viewer.types';

/** Max page bitmaps kept for scroll-back / zoom-revisit / progressive paint. */
const MAX_CACHED_BITMAPS = 16;

/**
 * Rendered-page bitmap cache, shared by every service that paints or
 * invalidates pages. Provided per viewer instance.
 */
export const PDF_BITMAP_CACHE = new InjectionToken<BitmapCache<ImageBitmap>>('PDF_BITMAP_CACHE');

export function providePdfBitmapCache() {
  return { provide: PDF_BITMAP_CACHE, useFactory: () => new BitmapCache<ImageBitmap>(MAX_CACHED_BITMAPS) };
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
  readonly src: Signal<PdfDocumentSource>;
  readonly config: Signal<PdfViewerConfig>;
  readonly formValues: ModelSignal<Record<string, unknown>>;
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

  // ── UI signals ──────────────────────────────────────────────────────────

  /** Page numbers the page stack and thumbnails iterate. */
  readonly pageNumbers = signal<number[]>([]);
  /** True once the first page of the current document has painted (until then the stack stays invisible). */
  readonly firstRenderComplete = signal(false);
  /** Last non-fatal operation failure; the document stays visible with a dismissible alert. */
  readonly operationError = signal<PdfViewerError | null>(null);
  readonly findBarOpen = signal(false);
  /** Sidebar data, fetched lazily when its tab opens. `null` until fetched. */
  readonly outline = signal<unknown[] | null>(null);
  readonly attachments = signal<PdfAttachmentEntry[] | null>(null);
  readonly annotations = signal<PdfAnnotationEntry[] | null>(null);
  /** Active annotation tool (`'none'` = select/scroll) and colour for new annotations. */
  readonly annotationTool = signal<PdfAnnotationTool>('none');
  readonly annotationColor = signal<string>('#ffeb3b');
  /** Per-page display rotation (degrees); CSS-only until `save()` bakes it in. */
  readonly pageRotations = signal<ReadonlyMap<number, number>>(new Map());
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
  /** Pages of the open document (sizes in points). */
  pages: PdfPageEntry[] = [];
  /** Original bytes, kept for an unedited `download()`. */
  sourceBytes: Uint8Array | null = null;
  /** Bumped per load / structural change; async continuations bail when it moves. */
  loadToken = 0;
  /** Bumped on each full re-render; stale layer work compares against it. */
  renderEpoch = 0;
  private edited = false;

  findPage(pageNumber: number): PdfPageEntry | undefined {
    return this.pages.find((p) => p.pageNumber === pageNumber);
  }

  /** Engine + open document, or `null` when either is missing. */
  session(): { engine: PdfEngine; doc: PdfDocHandle } | null {
    return this.engine && this.doc !== null ? { engine: this.engine, doc: this.doc } : null;
  }

  /** Whether the open document differs from `sourceBytes`. */
  get documentEdited(): boolean {
    return this.edited;
  }

  markDocumentEdited(): void {
    this.setEdited(true);
  }

  resetDocumentEdited(): void {
    this.setEdited(false);
  }

  private setEdited(value: boolean): void {
    if (this.edited === value) return;
    this.edited = value;
    this.host?.events.dirtyChange(value);
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

  /** Release the open document but keep the engine for the next load. */
  closeDocument(): void {
    this.sourceBytes = null;
    this.pages = [];
    this.pageNumbers.set([]);
    if (this.engine && this.doc !== null) this.engine.dispose(this.doc);
    this.doc = null;
  }

  private destroyEngine(): void {
    this.closeDocument();
    this.engine?.destroy();
    this.engine = null;
  }

  // ── Events & errors ─────────────────────────────────────────────────────

  notifyLoaded(info: PdfLoadedInfo): void {
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

  /**
   * An operation failed but the document is still usable: keep it on screen
   * and show a dismissible alert. If the render pool couldn't heal a
   * half-applied mutation, the message says to reload.
   */
  reportOperationError(error: PdfViewerError): void {
    const desynced = this.engine instanceof PdfEnginePool && this.engine.isDesynced;
    const reported: PdfViewerError = desynced
      ? { ...error, message: `${error.message} The viewer lost sync with the document; reload it to continue.` }
      : error;
    this.operationError.set(reported);
    this.config().onError?.(reported);
    this.host?.events.error(reported);
  }

  dismissOperationError(): void {
    this.operationError.set(null);
  }
}
