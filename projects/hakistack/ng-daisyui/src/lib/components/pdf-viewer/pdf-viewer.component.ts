import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { HK_THEME } from '../../theme/theme.config';
import { HkPdfToolbarContext, HkPdfToolbarDirective } from './pdf-viewer.directives';
import { DEFAULT_PDF_VIEWER_LABELS, HK_PDF_LABELS, ResolvedPdfViewerLabels } from './pdf-viewer.labels';
import { HkPdfService } from './pdf.service';
import {
  PdfDisplayMode,
  PdfDocumentSource,
  PdfSearchResult,
  PdfViewerConfig,
  PdfViewerError,
  PdfViewerInternalApi,
  PdfZoom,
} from './pdf-viewer.types';

const VIEWPORT_PAD_X = 32; // px reserved when computing fit-width / fit-page
const VIEWPORT_PAD_Y = 32;
const AUTO_ZOOM_CAP = 1.5;

/**
 * IntersectionObserver `rootMargin` used to define the "live" page buffer.
 * Pages within this many pixels of the viewport edge are kept fully rendered
 * (canvas bitmap + text layer + annotation layer); pages outside this range
 * are evicted so the browser doesn't sit on tens of MB of bitmap memory and
 * thousands of absolutely-positioned spans for content nobody can see. Tuned
 * for a balance between memory headroom and "just-in-time" feel — at 800px
 * the user reaches a freshly-rendered page before they scroll into a fully
 * blank one. Bump it up if you have abundant RAM and want zero render delay
 * on scroll; bump it down for memory-constrained devices.
 */
const LIVE_BUFFER_MARGIN_PX = 800;

interface PageEntry {
  readonly pageNumber: number;
  readonly proxy: unknown; // PDFPageProxy
  /** viewport at scale=1 — used to compute fitted scales without re-fetching */
  readonly baseWidth: number;
  readonly baseHeight: number;
}

/**
 * Per-page search index. We build this lazily on first search (or when the
 * text layer renders, whichever comes first) and reuse it across queries —
 * `getTextContent()` is comparatively expensive but its results are stable
 * for the lifetime of the document.
 *
 * `itemOffsets[i]` is the character index in `text` where `items[i]` starts.
 * That lets us go from a match's char position back to the span that
 * contains it (PDF.js's TextLayer emits one `<span>` per text item, so item
 * index ≡ span index).
 */
interface PdfPageTextIndex {
  readonly text: string;
  readonly itemOffsets: number[];
}

/** A single search match — used internally to drive navigation + highlights. */
interface PdfSearchHit {
  readonly pageNumber: number;
  /** Char index of the match start in the page's joined text. */
  readonly charStart: number;
  /** Match length (== query length, since we do plain substring matching). */
  readonly length: number;
}

/**
 * Lazy-loading PDF viewer built on Mozilla's PDF.js (`pdfjs-dist`). Renders
 * any PDF source (URL, `Uint8Array`, or `Blob`) with a customizable toolbar,
 * sidebar (thumbnails + bookmarks), text selection, search, print, and
 * download.
 *
 * Configuration is split between two surfaces:
 * - **`[src]`** (this component's input) — the document source. Volatile,
 *   often signal-driven (route params, file uploads, list selection).
 * - **`[config]`** — stable per-instance config + lifecycle callbacks.
 *   Build with `createPdfViewer({...})` and pass `controller.config()` here.
 *
 * Imperative actions (navigation, zoom, search, print, download) are
 * methods on the `PdfViewerController` returned by `createPdfViewer()` —
 * call them directly from your component class without `@ViewChild`.
 *
 * @example
 * // class:
 * viewer = createPdfViewer({
 *   page: 1,
 *   zoom: 'fit-width',
 *   onLoaded: (info) => console.log(`${info.numPages} pages`),
 * });
 * pdfUrl = signal<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
 *
 * // template:
 * // <hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />
 *
 * // anywhere:
 * // this.viewer.goToPage(5);
 * // this.viewer.search('quarterly');
 */
@Component({
  selector: 'hk-pdf-viewer',
  imports: [CommonModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    // Tabindex makes the viewer focusable so keyboard shortcuts work after a
    // single click anywhere on the chrome — without forcing the page wrapper
    // to be tabbable too.
    tabindex: '0',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class PdfViewerComponent implements OnInit, OnDestroy {
  private readonly theme = inject(HK_THEME);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userLabels = inject(HK_PDF_LABELS, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly pdfService = inject(HkPdfService);

  /**
   * The PDF document source. Accepts a URL string, a `Uint8Array` of bytes,
   * or a `Blob` (e.g. from a `<input type="file">`). When this changes the
   * viewer reloads the document.
   */
  readonly src = input.required<PdfDocumentSource>();

  /**
   * Configuration object — pass `controller.config()` from a `createPdfViewer({...})`
   * call. See `PdfViewerConfig` for the full shape.
   */
  readonly config = input.required<PdfViewerConfig>();

  /**
   * Optional headline shown above the page card in `layout: 'preview'`.
   * Ignored in the default layout. Plain text — no markup.
   */
  readonly title = input<string>('');

  /**
   * Optional subtitle shown under the title in `layout: 'preview'` (e.g.
   * the document section or breadcrumb). Ignored in the default layout.
   */
  readonly subtitle = input<string>('');

  /**
   * Two-way binding for the document's form-field values. Use as
   * `[(formValues)]="myValues"` to keep an Angular signal / property in
   * sync with the PDF's interactive form fields. Keys are PDF field names;
   * values are the field's current value (string / boolean / number
   * depending on widget type).
   *
   * Flow:
   * - The bound value is pushed into PDF.js's `annotationStorage` after
   *   each document load, so re-mounting a viewer with pre-filled state
   *   immediately renders those values in the form widgets.
   * - When the user edits a widget, the new value flows back through the
   *   binding so consumer code can persist or display it.
   * - `controller.save()` returns the document with the current values
   *   baked in.
   *
   * Empty object by default — non-form PDFs ignore this binding entirely.
   */
  readonly formValues = model<Record<string, unknown>>({});

  /** Labels with consumer overrides applied; falls back to English defaults. */
  readonly labels = computed<ResolvedPdfViewerLabels>(() => ({
    ...DEFAULT_PDF_VIEWER_LABELS,
    ...this.userLabels,
  }));

  /** Outer container — theme-bridged card for default layout, plain stack for preview. */
  readonly containerClass = computed(() => {
    if (this.config().layout === 'preview') {
      return 'flex flex-col bg-base-100';
    }
    return `card ${this.theme.classes.cardBorder} bg-base-100 overflow-hidden flex flex-col`;
  });

  /** Active layout — short alias for the template. */
  readonly layout = computed(() => this.config().layout ?? 'default');

  /**
   * Consumer-supplied custom toolbar template (`<ng-template hkPdfToolbar>`).
   * When present, the default toolbar is suppressed in favor of this template.
   */
  readonly customToolbar = contentChild(HkPdfToolbarDirective);

  /**
   * Context object passed to a custom toolbar template. Mirrors what the
   * default toolbar already binds against — runtime state and resolved
   * labels. The controller itself isn't included; consumers close over the
   * one they created from `createPdfViewer()`.
   */
  readonly toolbarContext = computed<HkPdfToolbarContext>(() => ({
    state: this.state(),
    labels: this.labels(),
  }));

  // ── Local UI bookkeeping ────────────────────────────────────────────────

  /** Page numbers to render. We mirror this from numPages so the template can @for over it. */
  readonly pageNumbers = signal<number[]>([]);

  /**
   * Flips true the moment the first page finishes rendering for the current
   * document. Until then the page stack is rendered into the DOM but kept
   * `invisible` (so refs/canvases exist for `viewChildren`), and the loading
   * spinner stays up. This prevents the layout-reflow flash between mounting
   * default-sized blank canvases and painting them.
   */
  readonly firstRenderComplete = signal(false);

  /** UI-only — whether the find bar is open. Toggled by ⌘F / the close button. */
  readonly findBarOpen = signal(false);

  /** Viewport ref — used to read clientWidth/Height for fit-* zoom calculation. */
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  /** Page wrappers — used for IntersectionObserver page tracking and to look up canvases. */
  private readonly pageWrappers = viewChildren<ElementRef<HTMLElement>>('pageWrapper');

  /**
   * Sidebar's thumbnail-panel scroll container. Used as the IntersectionObserver
   * root so thumbnails only render as they scroll into view in the sidebar —
   * not all at once when the panel first opens.
   */
  private readonly thumbnailPanel = viewChild<ElementRef<HTMLElement>>('thumbnailPanel');

  /**
   * Narrow boolean derived signals for the sidebar effects. Effects that
   * read full `state()` re-fire on every field change (page, zoom, search,
   * etc.) — even when their guard immediately short-circuits. Watching a
   * boolean computed instead means the effect only re-runs when the
   * specific condition flips, not on every unrelated state update.
   */
  private readonly thumbnailsTabActive = computed(() => {
    const s = this.state();
    return !!s?.sidebarOpen && (s.sidebarTab ?? 'thumbnails') === 'thumbnails';
  });
  private readonly bookmarksTabActive = computed(() => {
    const s = this.state();
    return !!s?.sidebarOpen && s.sidebarTab === 'bookmarks';
  });

  /**
   * The set of pages that should currently be "live" — i.e. have their
   * canvas, text layer, and annotation layer rendered into the DOM. Built
   * from `visibleEntries` (rAF-paced viewport visibility) plus a small
   * forced expansion in single-page mode so prev/next feels instant.
   */
  private readonly liveBuffer = computed<ReadonlySet<number>>(() => {
    const visible = this.visibleEntries();
    const buffer = new Set<number>(visible.keys());

    // In single-page mode the non-current pages are display:none — IO never
    // sees them, so the buffer would only ever hold the visible page. We
    // force-add page ± 1 so navigating by Prev/Next lands on an
    // already-rendered canvas.
    const s = this.state();
    if (s && s.mode === 'single' && s.page > 0) {
      buffer.add(s.page);
      if (s.page > 1) buffer.add(s.page - 1);
      if (s.page < s.numPages) buffer.add(s.page + 1);
    }
    return buffer;
  });

  /** True iff the viewer is in continuous (Adobe-style) scroll mode. Narrowed for effect deps. */
  private readonly isContinuousMode = computed(() => (this.state()?.mode ?? 'continuous') === 'continuous');

  // ── Runtime ─────────────────────────────────────────────────────────────

  private pdfDoc: unknown = null;
  private loadingTask: {
    destroy?: () => Promise<void>;
    promise: Promise<unknown>;
    onPassword?: (cb: (pwd: string) => void, reason: number) => void;
  } | null = null;
  private pages: PageEntry[] = [];
  /** In-flight render tasks. Set instead of Array so removal on completion is O(1). */
  private renderTasks = new Set<{ cancel: () => void; promise: Promise<void> }>();
  /** In-flight text layer instances. Set for the same O(1)-removal reason. */
  private textLayerInstances = new Set<{ cancel?: () => void }>();
  /**
   * Per-page text indexes keyed by page number. Populated lazily on first
   * use (search or text-layer render, whichever comes first) and reused
   * for the document's lifetime.
   */
  private pageTextIndex = new Map<number, PdfPageTextIndex>();
  /** Active search hits, in document order. Empty when no search is running. */
  private searchHits: PdfSearchHit[] = [];
  /**
   * Search hits pre-grouped by page number — built once per search so the
   * inner highlight loops don't repeatedly filter the global hit list.
   * Cleared whenever the search clears.
   */
  private searchHitsByPage = new Map<number, PdfSearchHit[]>();
  /**
   * Cached `<span>` lists per text-layer element. Populated after a layer
   * paints (in `renderTextLayer`) so subsequent highlight walks don't have
   * to re-query the DOM. Invalidated when the layer re-renders or its page
   * gets evicted.
   */
  private textLayerAllSpans = new Map<HTMLElement, HTMLElement[]>();
  /**
   * The subset of cached spans that currently carry the `hk-pdf-text-match`
   * class. Cleared in O(matched.length) instead of `querySelectorAll`-ing
   * the host every time the search clears or rolls forward.
   */
  private textLayerMatchedSpans = new Map<HTMLElement, HTMLElement[]>();
  /** Text-layer elements with active highlight classes — iteration target for the clear path. */
  private highlightedLayers = new Set<HTMLElement>();
  /** Pending find-bar input debounce — coalesces typing into one search call. */
  private findInputDebounce: ReturnType<typeof setTimeout> | null = null;
  /** Pages whose sidebar thumbnail has been painted. Lazy-only — never evicted. */
  private renderedThumbs = new Set<number>();
  /** Sidebar thumbnails IO. Disconnects when the panel hides. */
  private thumbnailObserver: IntersectionObserver | null = null;
  /**
   * Skip-flag for the form-values write-through effect. When the user types
   * into a form widget and we propagate the new value out via the model,
   * setting the model re-fires the effect that watches `formValues()`. This
   * flag suppresses the round-trip so we don't write the value we just read
   * back into PDF.js's storage.
   */
  private formValuesEmittedByUs = false;
  /** Detach handle for the host-level form-input listener. Cleared on teardown. */
  private formInputUnlisten: (() => void) | null = null;
  /** PDF outline (bookmarks tree) — populated lazily when the bookmarks tab opens. `null` until fetched. */
  readonly outline = signal<unknown[] | null>(null);
  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unbindController: (() => void) | null = null;
  /** Bumps when a re-render is requested so in-flight callers can detect they were superseded. */
  private renderEpoch = 0;
  /** Internal API on the currently bound config — cached so we don't read the signal in callbacks. */
  private internal: PdfViewerInternalApi | null = null;
  /**
   * Last viewport size we rendered against. ResizeObserver fires synchronously
   * on `observe()` with the initial measurement — without this guard, that
   * spurious callback cancels the in-flight first render and restarts it,
   * causing a visible paint→blank→paint flash on load.
   */
  private lastViewportWidth = 0;
  private lastViewportHeight = 0;
  /** RAF handle for debouncing resize-driven re-renders. */
  private resizeRafHandle: number | null = null;
  /**
   * Synchronous accumulator of intersection ratios per page. The IO callback
   * writes here on every fire (cheap); a rAF pump flushes the snapshot into
   * the `visibleEntries` signal once per frame so downstream effects don't
   * re-run dozens of times during a fast scroll.
   */
  private rawVisible = new Map<number, number>();
  /** RAF handle for the visibility-flush pump. */
  private visibilityFlushRaf: number | null = null;
  /**
   * rAF-paced snapshot of `rawVisible`. Drives `liveBuffer` and the
   * continuous-mode page-tracking effect. Read by signals; only updates once
   * per animation frame.
   */
  private readonly visibleEntries = signal<ReadonlyMap<number, number>>(new Map());
  /**
   * Pages whose canvas bitmap + text layer + annotation layer are currently
   * "live" (i.e. populated). Mutated by `applyBufferDiff`.
   */
  private renderedPages = new Set<number>();
  /**
   * Pages currently mid-render. The buffer-change effect can fire while a
   * previous diff is still iterating; without this guard, two diffs sharing
   * the same epoch can both call `proxy.render()` on the same page and
   * PDF.js throws "Failed to render page" because a `PDFPageProxy` doesn't
   * support concurrent render tasks. We add to this set BEFORE awaiting the
   * render and only flip the page into `renderedPages` after success — so
   * a parallel diff sees the page as "claimed" and skips it.
   */
  private inFlightPages = new Set<number>();

  constructor() {
    // Bind controller handlers when config first arrives. The internal
    // reference is stable across config().# changes (created once per
    // controller), so we only need to bind once per controller instance.
    effect(() => {
      const cfg = this.config();
      const internal = cfg._internal;
      if (!internal || internal === this.internal) return;
      untracked(() => this.attachController(internal));
    });

    // Reload the document whenever [src] changes (or the config's password changes).
    effect(() => {
      const src = this.src();
      const password = this.config().password;
      if (!isPlatformBrowser(this.platformId)) return;
      untracked(() => void this.loadDocument(src, password ?? ''));
    });

    // Trigger render + observer install once Angular has mounted the page
    // wrappers for the current document. We can't do this inline in
    // loadDocument() because viewChildren() doesn't update until the next
    // change-detection cycle. This effect bridges that gap by watching for
    // wrappers.length === pageNumbers.length, which signals the @for has
    // produced a wrapper for every page in the loaded doc.
    effect(() => {
      const wrappers = this.pageWrappers();
      const numbers = this.pageNumbers();
      if (numbers.length === 0) {
        this.intersectionObserver?.disconnect();
        this.intersectionObserver = null;
        return;
      }
      if (wrappers.length !== numbers.length) return;
      untracked(() => {
        this.installObservers();
        void this.renderAll().then(() => {
          const initialPage = this.internal?.state().page ?? 1;
          this.scrollToPage(initialPage);
        });
      });
    });

    // Lazy thumbnails — install an IntersectionObserver scoped to the
    // sidebar's thumbnail panel so we only paint thumbnails for items that
    // actually scroll into view. Critical for big docs: a 100-page PDF
    // would otherwise queue 100 PDF.js render tasks the moment the sidebar
    // opens, blocking the worker for the main canvas. We wait for the main
    // stack's first paint (`firstRenderComplete`) so thumbnails never
    // compete with the user's primary view.
    effect(() => {
      if (!this.thumbnailsTabActive() || !this.firstRenderComplete() || this.pages.length === 0) {
        this.thumbnailObserver?.disconnect();
        this.thumbnailObserver = null;
        return;
      }
      const panel = this.thumbnailPanel()?.nativeElement;
      if (!panel) return;
      untracked(() => this.installThumbnailObserver(panel));
    });

    // Lazily fetch the PDF outline (bookmarks) when the user opens the
    // sidebar's bookmarks tab. Cached for the life of the document.
    effect(() => {
      if (!this.bookmarksTabActive()) return;
      if (this.outline() !== null || !this.pdfDoc) return;
      untracked(() => void this.fetchOutline());
    });

    // ── Page virtualization: react to buffer changes ────────────────────
    //
    // The `liveBuffer` recomputes whenever the rAF-paced visibility snapshot
    // changes (or when single-mode forces page ± 1 in). We pipe each new
    // buffer through `applyBufferDiff` which handles eviction + render.
    effect(() => {
      // Read both signals so this effect tracks them.
      const _buffer = this.liveBuffer();
      void _buffer; // silence "unused" — the read itself is the subscription
      untracked(() => void this.applyBufferDiff(this.renderEpoch));
    });

    // ── Continuous-mode page tracking: which page is "current" ──────────
    //
    // Instead of doing this inside the IO callback (which is hot during
    // scroll), we react to the rAF-paced `visibleEntries` snapshot. The
    // narrow `isContinuousMode` boolean guards the heavy work — single
    // mode tracks `state.page` via Prev/Next + the goToPage path.
    effect(() => {
      if (!this.isContinuousMode()) return;
      const visible = this.visibleEntries();
      let bestRatio = 0;
      let best = -1;
      for (const [num, ratio] of visible) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = num;
        }
      }
      if (best <= 0) return;
      untracked(() => {
        const cur = this.internal?.state().page ?? 0;
        if (best !== cur) {
          this.internal?.state.update((s) => ({ ...s, page: best }));
          this.config().onPageChange?.(best);
        }
      });
    });

    // Push consumer-set form values into PDF.js's annotationStorage. Skips
    // the write when the change originated from us (user editing a widget)
    // to avoid a write→read→write loop. This also runs once on initial
    // mount with the empty {} default — harmless: setValue isn't invoked
    // for any field the consumer didn't mention.
    effect(() => {
      const values = this.formValues();
      if (this.formValuesEmittedByUs) {
        this.formValuesEmittedByUs = false;
        return;
      }
      const doc = this.pdfDoc as null | { annotationStorage?: { setValue?: (key: string, value: unknown) => void } };
      if (!doc?.annotationStorage?.setValue) return;
      untracked(() => {
        for (const [key, val] of Object.entries(values)) {
          doc.annotationStorage!.setValue!(key, { value: val });
        }
      });
    });

    this.destroyRef.onDestroy(() => this.teardown());
  }

  /**
   * Install the host-level listener that catches any form-widget edit and
   * mirrors the new storage value out through `formValues`. We use a single
   * delegated listener on the host so we don't have to hook every widget
   * individually as pages render in/out.
   */
  private installFormInputListener(): void {
    if (this.formInputUnlisten) return;
    const host = this.hostRef.nativeElement;
    const handler = (ev: Event): void => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      // Only annotation-layer widgets matter; ignore toolbar inputs etc.
      if (!target.closest('.hk-pdf-annotation-layer')) return;
      // Read the storage AFTER PDF.js's own change-handler runs. queueMicrotask
      // lets that handler settle before we snapshot.
      queueMicrotask(() => this.syncFormValuesFromStorage());
    };
    host.addEventListener('input', handler, { capture: true });
    host.addEventListener('change', handler, { capture: true });
    this.formInputUnlisten = () => {
      host.removeEventListener('input', handler, { capture: true });
      host.removeEventListener('change', handler, { capture: true });
    };
  }

  /**
   * Push the current `formValues` into the freshly-loaded document's
   * annotationStorage so form widgets render pre-filled. Called once per
   * `loadDocument`, right after page proxies are fetched and state is
   * marked loaded — i.e. before annotation layers render.
   */
  private applyInitialFormValues(): void {
    const doc = this.pdfDoc as null | { annotationStorage?: { setValue?: (key: string, value: unknown) => void } };
    if (!doc?.annotationStorage?.setValue) return;
    const values = this.formValues();
    for (const [key, val] of Object.entries(values)) {
      doc.annotationStorage.setValue(key, { value: val });
    }
  }

  /**
   * Snapshot PDF.js's `annotationStorage` and emit a flat
   * `{ fieldName: value }` view through the `formValues` model. PDF.js
   * stores entries shaped as `{ value: ..., exportValue: ... }` for most
   * widgets; we unwrap `.value` for ergonomic consumer code.
   */
  private syncFormValuesFromStorage(): void {
    const doc = this.pdfDoc as null | {
      annotationStorage?: { getAll?: () => Record<string, unknown> | null };
    };
    const all = doc?.annotationStorage?.getAll?.() ?? null;
    if (!all) return;
    const flat: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(all)) {
      if (entry !== null && typeof entry === 'object' && 'value' in entry) {
        flat[key] = (entry as { value: unknown }).value;
      } else {
        flat[key] = entry;
      }
    }
    this.formValuesEmittedByUs = true;
    this.formValues.set(flat);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Kick off the lazy import + worker setup early so it's warm by the time
    // [src] resolves. Per-instance workerSrc still wins (the service skips
    // setting GlobalWorkerOptions if it's already set).
    const override = this.config().workerSrc;
    if (override) {
      // Honor the per-instance override before the service touches the global.
      void this.applyWorkerOverride(override);
    } else {
      void this.pdfService.load();
    }
    this.installFormInputListener();
  }

  ngOnDestroy(): void {
    // Defensive — destroyRef already runs teardown, but if the host gets
    // pulled out without DestroyRef firing (rare), this catches it.
    this.teardown();
  }

  /** Apply an instance-level workerSrc override before HkPdfService runs. */
  private async applyWorkerOverride(workerSrc: string): Promise<void> {
    const pdfjs = await this.pdfService.load();
    if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }
  }

  // ── Controller bridge ───────────────────────────────────────────────────

  private attachController(internal: PdfViewerInternalApi): void {
    this.unbindController?.();
    this.internal = internal;
    this.unbindController = internal.bind({
      goToPage: (page) => this.goToPage(page),
      setZoom: (zoom) => this.setZoom(zoom),
      setMode: (mode) => this.setMode(mode),
      toggleSidebar: () => this.toggleSidebar(),
      toggleFullscreen: () => this.toggleFullscreen(),
      search: (query) => this.runSearch(query),
      nextMatch: () => this.searchNextMatch(),
      previousMatch: () => this.searchPreviousMatch(),
      clearSearch: () => this.clearSearch(),
      print: () => void this.print(),
      download: (filename) => void this.download(filename),
      reload: () => void this.loadDocument(this.src(), this.config().password ?? ''),
      save: () => this.saveDocument(),
      saveAndDownload: (filename) => this.saveAndDownloadDocument(filename),
    });
  }

  // ── Document load ───────────────────────────────────────────────────────

  private async loadDocument(src: PdfDocumentSource, password: string): Promise<void> {
    this.cancelInflightRenders();
    this.firstRenderComplete.set(false);
    this.renderedThumbs.clear();
    this.thumbnailObserver?.disconnect();
    this.thumbnailObserver = null;
    this.outline.set(null);
    // Drop search + virtualization state for the previous doc.
    this.pageTextIndex.clear();
    this.searchHits = [];
    this.searchHitsByPage.clear();
    this.textLayerAllSpans.clear();
    this.textLayerMatchedSpans.clear();
    this.highlightedLayers.clear();
    this.rawVisible.clear();
    this.visibleEntries.set(new Map());
    this.renderedPages.clear();
    this.inFlightPages.clear();
    await this.destroyDocument();

    if (!src || (typeof src === 'string' && src.length === 0)) {
      this.internal?.state.update((s) => ({ ...s, page: 0, numPages: 0, loaded: false, error: null }));
      this.pageNumbers.set([]);
      return;
    }

    // Reset state to "loading"
    this.internal?.state.update((s) => ({ ...s, page: 0, numPages: 0, loaded: false, error: null }));

    try {
      const pdfjs = await this.pdfService.load();

      const sourceParams: { url?: string; data?: Uint8Array | ArrayBuffer; password?: string } = {
        password: password || undefined,
      };
      if (typeof src === 'string') {
        sourceParams.url = src;
      } else if (src instanceof Blob) {
        sourceParams.data = await src.arrayBuffer();
      } else {
        sourceParams.data = src;
      }

      // Merge per-call source with app-wide defaults (CMaps, fonts, hwa, etc.).
      const params = this.pdfService.buildDocumentParams(sourceParams);

      const task = pdfjs.getDocument(params as Parameters<typeof pdfjs.getDocument>[0]) as unknown as {
        destroy?: () => Promise<void>;
        promise: Promise<unknown>;
        onPassword?: (cb: (pwd: string) => void, reason: number) => void;
      };
      this.loadingTask = task;

      // Password handling — if config provides onPasswordRequired, defer to
      // the consumer; otherwise fail with a recoverable error so the demo /
      // host can react.
      task.onPassword = (cb: (pwd: string) => void) => {
        const cfg = this.config();
        if (cfg.onPasswordRequired) {
          cfg.onPasswordRequired(cb);
        } else if (cfg.password) {
          cb(cfg.password);
        } else {
          this.emitError({ code: 'password_cancelled', message: 'Password required to open this PDF.', recoverable: true });
        }
      };

      const doc = (await task.promise) as {
        numPages: number;
        fingerprints?: string[];
        getPage: (n: number) => Promise<unknown>;
        getMetadata: () => Promise<{ info?: { Title?: string }; contentLength?: number }>;
        getData: () => Promise<Uint8Array>;
        destroy: () => Promise<void>;
      };
      this.pdfDoc = doc;

      // Fetch every page proxy up front (small — just metadata, not rendered).
      // Doing this here means downstream code can compute fit-width / fit-page
      // synchronously from cached viewports.
      const pages: PageEntry[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = (await doc.getPage(i)) as { getViewport: (opts: { scale: number }) => { width: number; height: number } };
        const vp = p.getViewport({ scale: 1 });
        pages.push({ pageNumber: i, proxy: p, baseWidth: vp.width, baseHeight: vp.height });
      }
      this.pages = pages;
      this.pageNumbers.set(pages.map((p) => p.pageNumber));

      // Metadata for onLoaded
      let title = '';
      let fileSize: number | undefined;
      try {
        const meta = await doc.getMetadata();
        title = meta?.info?.Title ?? '';
        fileSize = meta?.contentLength;
      } catch {
        /* metadata is optional */
      }

      const fingerprint = (doc.fingerprints?.[0] ?? '') as string;
      const initialPage = Math.max(1, Math.min(doc.numPages, this.config().page ?? 1));

      this.internal?.state.update((s) => ({
        ...s,
        loaded: true,
        numPages: doc.numPages,
        page: initialPage,
        error: null,
      }));

      this.config().onLoaded?.({ numPages: doc.numPages, title, fingerprint, fileSize });

      // Push any consumer-supplied formValues into the doc's annotationStorage
      // before the annotation layers render — that way form widgets paint
      // pre-filled instead of empty-then-flicker.
      this.applyInitialFormValues();

      // Render + observer install + scroll to initial page is driven by the
      // pageWrappers effect in the constructor — fires once Angular has
      // mounted a wrapper for every page.
    } catch (err: unknown) {
      const error = this.toViewerError(err);
      this.emitError(error);
    }
  }

  private toViewerError(err: unknown): PdfViewerError {
    const e = err as { name?: string; message?: string };
    const name = e?.name ?? '';
    if (name === 'PasswordException') {
      return { code: 'password_cancelled', message: e?.message ?? 'Password required.', recoverable: true, cause: err };
    }
    if (name === 'InvalidPDFException') {
      return { code: 'invalid_pdf', message: e?.message ?? 'Invalid PDF.', recoverable: false, cause: err };
    }
    if (name === 'MissingPDFException' || name === 'UnexpectedResponseException') {
      return { code: 'load_failed', message: e?.message ?? 'Failed to load PDF.', recoverable: true, cause: err };
    }
    return { code: 'unknown', message: e?.message ?? 'PDF viewer error.', recoverable: false, cause: err };
  }

  private emitError(error: PdfViewerError): void {
    this.internal?.state.update((s) => ({ ...s, error, loaded: false }));
    this.config().onError?.(error);
  }

  private async destroyDocument(): Promise<void> {
    if (this.loadingTask?.destroy) {
      try {
        await this.loadingTask.destroy();
      } catch {
        /* ignore — task may have completed */
      }
    }
    this.loadingTask = null;
    const doc = this.pdfDoc as { destroy?: () => Promise<void> } | null;
    if (doc?.destroy) {
      try {
        await doc.destroy();
      } catch {
        /* ignore */
      }
    }
    this.pdfDoc = null;
    this.pages = [];
    this.pageNumbers.set([]);
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  /**
   * Re-baseline the entire page stack at the current zoom level. Called when
   * the document loads, the user changes zoom, or the viewport is resized.
   *
   * Steps:
   * 1. Cancel any in-flight render so we don't fight stale tasks.
   * 2. Pre-pass: set CSS dimensions on every page's canvas + text + annotation
   *    layer wrappers so the page-stack layout is correct even before any
   *    pixel is painted (avoids the chain of layout shifts that read as
   *    flashing on multi-page docs).
   * 3. Evict every previously-rendered page — their bitmaps are now at the
   *    wrong scale and need to be repainted before they can be shown again.
   * 4. Hand off to `applyBufferDiff` which renders the live buffer for the
   *    current viewport position. Pages outside the buffer stay evicted so
   *    we don't sit on tens of MB of stale bitmap memory.
   */
  private async renderAll(): Promise<void> {
    this.cancelInflightRenders();
    const epoch = ++this.renderEpoch;

    const scale = this.computeScale();
    if (scale <= 0) return;

    // Push the resolved scale into state so the toolbar can show a percentage.
    this.internal?.state.update((s) => ({ ...s, zoom: scale }));

    const wrappers = this.pageWrappers().map((w) => w.nativeElement);

    // Pre-pass: lock each canvas + layer's CSS dimensions to the final
    // scaled size synchronously, before any async render starts. The bitmap
    // dimensions are set inside `renderPageOnto` only for buffered pages —
    // unbuffered pages keep a 1x1 bitmap stretched to the CSS size, which
    // is invisible (since they're outside the viewport buffer anyway) but
    // keeps layout stable so scrollbars and IO calculations are correct.
    for (let i = 0; i < this.pages.length; i++) {
      const wrapper = wrappers[i];
      if (!wrapper) continue;
      const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
      if (!canvas) continue;
      const page = this.pages[i];
      const w = page.baseWidth * scale;
      const h = page.baseHeight * scale;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const textLayer = wrapper.querySelector<HTMLElement>('.hk-pdf-text-layer');
      if (textLayer) {
        textLayer.style.width = `${w}px`;
        textLayer.style.height = `${h}px`;
        textLayer.style.setProperty('--scale-factor', String(scale));
      }
      const annotLayer = wrapper.querySelector<HTMLElement>('.hk-pdf-annotation-layer');
      if (annotLayer) {
        annotLayer.style.width = `${w}px`;
        annotLayer.style.height = `${h}px`;
        annotLayer.style.setProperty('--scale-factor', String(scale));
      }
    }

    // Every previously-rendered page is now stale (wrong-scale bitmap).
    // Drop their content; `applyBufferDiff` will re-paint the buffer.
    for (const num of Array.from(this.renderedPages)) {
      this.evictPage(num);
    }
    this.renderedPages.clear();

    await this.applyBufferDiff(epoch);
  }

  /**
   * Bring the rendered set of pages in line with `liveBuffer`:
   * - Pages in `renderedPages` but not in `liveBuffer` → evict (clear bitmap
   *   + drop text/annotation DOM), freeing memory and removing the spans
   *   that contribute to text-selection / hit-testing cost.
   * - Pages in `liveBuffer` but not in `renderedPages` → render canvas +
   *   text + annotation layers, then add to `renderedPages`.
   *
   * Sequential rendering keeps PDF.js's worker from getting saturated;
   * one page at a time is still snappy because each page is small at the
   * resolved scale.
   *
   * Concurrency: this method can be re-entered while a previous call is
   * mid-loop (e.g. the user scrolls and the buffer-change effect fires
   * while a previous diff is still resolving). Both calls share the same
   * `renderEpoch`, so the epoch check alone won't separate them — they'd
   * both compute `todo` independently and could race to render the same
   * page, which PDF.js refuses on a single `PDFPageProxy`. The
   * `inFlightPages` set serializes per-page so two concurrent diffs don't
   * collide; pages already being rendered by a peer diff are simply
   * skipped (the peer will mark them `renderedPages` when it's done).
   */
  private async applyBufferDiff(epoch: number): Promise<void> {
    if (epoch !== this.renderEpoch) return;
    if (this.pages.length === 0) return;

    const buffer = this.liveBuffer();
    const wrappers = this.pageWrappers().map((w) => w.nativeElement);
    if (wrappers.length !== this.pages.length) return; // not yet mounted
    const scale = this.internal?.state().zoom ?? this.computeScale();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Evict pages that fell out of buffer. Skip pages currently being
    // rendered by a peer diff — they'll naturally drop from the buffer on
    // the next visibility flush if they're still out-of-view.
    for (const num of Array.from(this.renderedPages)) {
      if (!buffer.has(num) && !this.inFlightPages.has(num)) {
        this.evictPage(num);
        this.renderedPages.delete(num);
      }
    }

    const todo = this.pages.filter(
      (p) => buffer.has(p.pageNumber) && !this.renderedPages.has(p.pageNumber) && !this.inFlightPages.has(p.pageNumber),
    );
    for (const page of todo) {
      if (epoch !== this.renderEpoch) return;
      // Re-check at iteration time: a peer diff may have claimed the page
      // for itself in the time we were `await`ing the previous iteration.
      if (this.renderedPages.has(page.pageNumber) || this.inFlightPages.has(page.pageNumber)) continue;

      const wrapper = wrappers[page.pageNumber - 1];
      if (!wrapper) continue;
      const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
      if (!canvas) continue;

      this.inFlightPages.add(page.pageNumber);
      try {
        await this.renderPageOnto(page, canvas, scale, dpr, epoch);
        if (epoch === this.renderEpoch) {
          this.renderedPages.add(page.pageNumber);
        }
      } finally {
        this.inFlightPages.delete(page.pageNumber);
      }

      // Reveal the page stack once any one page has painted — usually the
      // first visible page. Avoids the user seeing default-sized blank
      // canvases in the brief window before paint completes.
      if (epoch === this.renderEpoch && !this.firstRenderComplete()) {
        this.firstRenderComplete.set(true);
      }
    }
  }

  /**
   * Drop a page's bitmap + text-layer + annotation-layer content while
   * preserving its wrapper sizing so layout doesn't shift. Setting
   * `canvas.width = 1` releases the GPU/CPU memory the bitmap was holding;
   * re-setting `style.width` after that keeps the canvas's CSS box at the
   * right size. The text and annotation layer divs lose their children,
   * which removes the spans / form widgets that contribute most to the
   * page's hit-testing and layout cost.
   */
  private evictPage(pageNumber: number): void {
    const wrapper = this.hostRef.nativeElement.querySelector<HTMLElement>(`.hk-pdf-page[data-page-number="${pageNumber}"]`);
    if (!wrapper) return;
    const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) {
      const w = canvas.style.width;
      const h = canvas.style.height;
      canvas.width = 1;
      canvas.height = 1;
      // Setting bitmap dimensions resets style; restore so layout sticks.
      canvas.style.width = w;
      canvas.style.height = h;
    }
    const textLayer = wrapper.querySelector<HTMLElement>('.hk-pdf-text-layer');
    if (textLayer) {
      textLayer.replaceChildren();
      // Drop cache entries for the now-detached spans.
      this.textLayerAllSpans.delete(textLayer);
      this.textLayerMatchedSpans.delete(textLayer);
      this.highlightedLayers.delete(textLayer);
    }
    const annotLayer = wrapper.querySelector<HTMLElement>('.hk-pdf-annotation-layer');
    if (annotLayer) annotLayer.replaceChildren();
  }

  private async renderPageOnto(page: PageEntry, canvas: HTMLCanvasElement, scale: number, dpr: number, epoch: number): Promise<void> {
    const proxy = page.proxy as {
      getViewport: (o: { scale: number }) => { width: number; height: number };
      render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; transform?: number[] }) => {
        cancel: () => void;
        promise: Promise<void>;
      };
      getTextContent?: () => Promise<unknown>;
      getAnnotations?: () => Promise<unknown[]>;
    };
    const viewport = proxy.getViewport({ scale });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
    const task = proxy.render({ canvasContext: ctx, viewport, transform });
    this.renderTasks.add(task);

    // Kick off the text + annotation layers in parallel with canvas paint —
    // they don't need to block, and become available the moment they resolve.
    const wrapper = canvas.parentElement;
    const textLayerDiv = wrapper?.querySelector<HTMLElement>('.hk-pdf-text-layer') ?? null;
    if (textLayerDiv) void this.renderTextLayer(proxy, textLayerDiv, viewport, epoch, page.pageNumber);
    const annotLayerDiv = wrapper?.querySelector<HTMLElement>('.hk-pdf-annotation-layer') ?? null;
    if (annotLayerDiv) void this.renderAnnotationLayer(proxy, annotLayerDiv, viewport, epoch);

    try {
      await task.promise;
    } catch (err) {
      // Cancellation is normal — only surface real failures.
      if (epoch === this.renderEpoch && (err as { name?: string })?.name !== 'RenderingCancelledException') {
        this.emitError({ code: 'render_failed', message: 'Failed to render page.', recoverable: true, cause: err });
      }
    } finally {
      this.renderTasks.delete(task);
    }
  }

  /**
   * Build PDF.js's transparent text-layer overlay so the user can select +
   * copy text. Called per page in parallel with canvas rendering. Failure
   * is non-critical — canvas paint still goes through.
   *
   * Side effect: populates `pageTextIndex` for `pageNumber` so search has a
   * cached index for that page after the layer renders.
   */
  private async renderTextLayer(
    proxy: { getTextContent?: () => Promise<unknown> },
    container: HTMLElement,
    viewport: unknown,
    epoch: number,
    pageNumber: number,
  ): Promise<void> {
    if (typeof proxy.getTextContent !== 'function') return;
    try {
      const pdfjs = await this.pdfService.load();
      if (epoch !== this.renderEpoch) return;
      const TextLayerCtor = (pdfjs as unknown as { TextLayer?: new (opts: unknown) => { render(): Promise<void>; cancel?: () => void } })
        .TextLayer;
      if (!TextLayerCtor) return; // older pdfjs-dist without the public API

      const textContent = (await proxy.getTextContent()) as { items?: Array<{ str?: string }> };
      if (epoch !== this.renderEpoch) return;

      // Cache the per-page text index for search lookups. Same data drives
      // both rendering and searching so we don't have to fetch text twice.
      this.populateTextIndex(pageNumber, textContent.items ?? []);

      // Clear prior content + invalidate span/highlight caches keyed on
      // this layer (their elements are about to be detached).
      container.replaceChildren();
      this.textLayerAllSpans.delete(container);
      this.textLayerMatchedSpans.delete(container);
      this.highlightedLayers.delete(container);

      const tl = new TextLayerCtor({ textContentSource: textContent, container, viewport });
      this.textLayerInstances.add(tl);
      await tl.render();
      this.textLayerInstances.delete(tl);

      // Cache the freshly-rendered span list so subsequent highlight walks
      // (search type-ahead, next/prev, re-render under search) skip a
      // querySelectorAll. Search highlights apply on top of this set.
      const fresh = Array.from(container.querySelectorAll<HTMLElement>('span:not(.endOfContent)'));
      this.textLayerAllSpans.set(container, fresh);

      // If a search is currently active, paint highlights onto the freshly
      // rendered spans for this page.
      if (this.searchHitsByPage.size > 0) {
        this.applyHighlightsForPage(pageNumber, container);
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortException') return;
      // Text layer is non-critical — log only, don't surface to onError.
      console.warn('[hk-pdf-viewer] text layer failed:', err);
    }
  }

  /**
   * Build the page's substring-search index from a `TextContent.items` list.
   * Each item's `str` is concatenated into a single page-level string; the
   * starting char index of every item is recorded so we can map a match's
   * char position back to the span it lives in (PDF.js's TextLayer emits
   * one `<span>` per text item, so item index ≡ span index).
   *
   * Idempotent: returns early if the index already exists for this page.
   * That keeps the per-render cost of `renderTextLayer` flat across zoom
   * changes — building a 1k-item string per page on every zoom adds up.
   */
  private populateTextIndex(pageNumber: number, items: Array<{ str?: string }>): void {
    if (this.pageTextIndex.has(pageNumber)) return;
    const itemOffsets: number[] = [];
    let text = '';
    for (const item of items) {
      itemOffsets.push(text.length);
      text += item.str ?? '';
    }
    this.pageTextIndex.set(pageNumber, { text, itemOffsets });
  }

  /**
   * Wire up an IntersectionObserver scoped to the sidebar's thumbnail panel
   * so we only render thumbnails as they scroll into the panel's view.
   * Idempotent — if the observer is already installed for the current panel
   * we leave it alone; otherwise we tear down any prior observer and install
   * fresh.
   *
   * Buttons may not be in the DOM when the effect first fires (the @for
   * runs on a later CD cycle). We retry on the next animation frame until
   * the buttons exist, then observe them.
   */
  private installThumbnailObserver(panel: HTMLElement): void {
    const buttons = panel.querySelectorAll<HTMLElement>('.hk-pdf-thumbnail');
    if (buttons.length === 0) {
      requestAnimationFrame(() => {
        if (this.thumbnailPanel()?.nativeElement === panel) this.installThumbnailObserver(panel);
      });
      return;
    }

    this.thumbnailObserver?.disconnect();
    this.thumbnailObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const target = e.target as HTMLElement;
          const canvas = target.querySelector<HTMLCanvasElement>('canvas[data-thumb-page]');
          const num = canvas ? Number(canvas.dataset['thumbPage']) : 0;
          if (!num || this.renderedThumbs.has(num)) continue;
          this.renderedThumbs.add(num);
          void this.renderOneThumbnail(num);
        }
      },
      // 500px buffer — by the time the user has scrolled to a thumbnail,
      // it's already been queued for rendering.
      { root: panel, rootMargin: '500px 0px', threshold: 0 },
    );
    for (const btn of Array.from(buttons)) {
      this.thumbnailObserver.observe(btn);
    }
  }

  /**
   * Paint a single thumbnail at 1/8-ish scale. Failures are non-critical —
   * a missing thumbnail just shows a blank wrapper, the user can still
   * navigate via main viewport / page input.
   */
  private async renderOneThumbnail(pageNumber: number): Promise<void> {
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return;
    const canvas = this.hostRef.nativeElement.querySelector<HTMLCanvasElement>(`canvas[data-thumb-page="${pageNumber}"]`);
    if (!canvas) return;

    const proxy = page.proxy as {
      getViewport: (o: { scale: number }) => { width: number; height: number };
      render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; transform?: number[]; intent?: string }) => {
        cancel: () => void;
        promise: Promise<void>;
      };
    };
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetWidth = 180;
    const scale = targetWidth / page.baseWidth;
    const viewport = proxy.getViewport({ scale });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
    // `intent: 'thumbnail'` was a misread — pdfjs only knows 'display',
    // 'print', and 'any'. The default ('display') is correct here; thumbnails
    // are just main-canvas renders at a smaller scale.
    const task = proxy.render({ canvasContext: ctx, viewport, transform });
    try {
      await task.promise;
    } catch {
      // Bring it back into the candidate set so a future intersection retries.
      this.renderedThumbs.delete(pageNumber);
    }
  }

  /**
   * Fetch the PDF's outline (bookmarks tree). PDF.js returns either an array
   * of nodes (each with `title`, `dest`, and optional `items[]` children) or
   * `null` for documents without an outline. We store the result as `[]` for
   * the no-outline case so the template's empty-state branch picks it up
   * instead of staying in the loading state.
   */
  private async fetchOutline(): Promise<void> {
    const doc = this.pdfDoc as null | { getOutline?: () => Promise<unknown[] | null> };
    if (!doc?.getOutline) {
      this.outline.set([]);
      return;
    }
    try {
      const result = await doc.getOutline();
      this.outline.set(result ?? []);
    } catch {
      this.outline.set([]);
    }
  }

  /**
   * Lazy accessor — fetch + cache a page's text index on first request,
   * re-using cached entries from previous calls (or from the text-layer
   * render that populates the cache as a side effect).
   */
  private async ensurePageTextIndex(pageNumber: number): Promise<PdfPageTextIndex | null> {
    const cached = this.pageTextIndex.get(pageNumber);
    if (cached) return cached;
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return null;
    const proxy = page.proxy as { getTextContent?: () => Promise<{ items?: Array<{ str?: string }> }> };
    if (typeof proxy.getTextContent !== 'function') return null;
    try {
      const tc = await proxy.getTextContent();
      this.populateTextIndex(pageNumber, tc.items ?? []);
      return this.pageTextIndex.get(pageNumber) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Render PDF.js's annotation overlay (links, popups, form widgets) for one
   * page. We supply a minimal `linkService` that routes internal page jumps
   * back through `goToPage` and lets external URI annotations render as
   * `<a target="_blank" rel="noopener noreferrer">`. Form widgets render but
   * are read-only until Phase 2 wires `formData` two-way binding.
   */
  private async renderAnnotationLayer(
    proxy: { getAnnotations?: () => Promise<unknown[]> },
    container: HTMLElement,
    viewport: unknown,
    epoch: number,
  ): Promise<void> {
    if (typeof proxy.getAnnotations !== 'function') return;
    try {
      const pdfjs = await this.pdfService.load();
      if (epoch !== this.renderEpoch) return;

      const AnnotCtor = (
        pdfjs as unknown as {
          AnnotationLayer?: new (opts: unknown) => { render(opts: unknown): Promise<void> };
        }
      ).AnnotationLayer;
      if (!AnnotCtor) return;

      const annotations = (await proxy.getAnnotations()) ?? [];
      if (epoch !== this.renderEpoch) return;
      if (annotations.length === 0) {
        container.replaceChildren();
        return;
      }

      container.replaceChildren();

      const vpClone = (viewport as { clone?: (o: unknown) => unknown }).clone?.({ dontFlip: true }) ?? viewport;

      const layer = new AnnotCtor({
        div: container,
        page: proxy,
        viewport: vpClone,
      });

      // Pull doc-level annotation context. `annotationStorage` is where
      // PDF.js holds form-field edits + AnnotationEditor edits — passing it
      // through lets users actually fill in the form widgets and have their
      // values flow back into the document for save() to pick up.
      // `fieldObjects` is the form metadata; `getFieldObjects` returns null
      // for documents without a form, which is fine.
      const doc = this.pdfDoc as null | {
        annotationStorage?: unknown;
        getFieldObjects?: () => Promise<unknown>;
      };
      const annotationStorage = doc?.annotationStorage ?? null;
      const fieldObjects = doc?.getFieldObjects ? await doc.getFieldObjects() : null;
      if (epoch !== this.renderEpoch) return;

      await layer.render({
        annotations,
        imageResourcesPath: '',
        renderForms: true,
        linkService: this.buildLinkService(),
        annotationStorage,
        fieldObjects,
        enableScripting: false,
        hasJSActions: false,
      });

      // Form widgets get rendered as <input>/<select>/<textarea>/<button>
      // inside annotation layer sections. Our outer .hk-pdf-annotation-layer
      // is pointer-events:none for click-through; sections re-enable it,
      // but interactive widgets still need explicit auto so cursor + focus
      // behaviors work consistently.
      this.unlockFormWidgets(container);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortException') return;
      console.warn('[hk-pdf-viewer] annotation layer failed:', err);
    }
  }

  /**
   * Make sure rendered form widgets are interactive. PDF.js positions them
   * inside annotation sections; we explicitly opt-in pointer-events on
   * widget elements so styling overrides higher up the cascade can't
   * accidentally render them inert.
   */
  private unlockFormWidgets(container: HTMLElement): void {
    const widgets = container.querySelectorAll<HTMLElement>('input, select, textarea, button');
    if (widgets.length === 0) return; // most pages have no form widgets — early-out skips the iteration cost
    for (const w of Array.from(widgets)) {
      w.style.pointerEvents = 'auto';
    }
  }

  /**
   * Build a minimal `IPDFLinkService` for the annotation layer. PDF.js calls
   * these methods when a user clicks a link annotation — internal jumps
   * route back through `goToPage`, external URIs render as `<a>` tags with
   * `target="_blank"`. Named destinations resolve via `doc.getDestination`
   * + `doc.getPageIndex` to land on the right page.
   */
  private buildLinkService(): Record<string, unknown> {
    const doc = this.pdfDoc as null | {
      numPages: number;
      getDestination?: (name: string) => Promise<unknown>;
      getPageIndex?: (ref: unknown) => Promise<number>;
    };
    const currentPage = () => this.internal?.state().page ?? 1;
    const totalPages = () => doc?.numPages ?? 0;
    const goToPage = (n: number) => this.goToPage(n);
    const goToDestination = async (dest: unknown): Promise<void> => {
      let arr: unknown = dest;
      if (typeof dest === 'string' && doc?.getDestination) {
        arr = await doc.getDestination(dest);
      }
      if (!Array.isArray(arr) || arr.length === 0) return;
      const ref = arr[0];
      if (!ref || !doc?.getPageIndex) return;
      try {
        const idx = await doc.getPageIndex(ref);
        goToPage(idx + 1);
      } catch {
        /* unresolvable destination — silently ignore */
      }
    };

    return {
      externalLinkTarget: 2, // pdfjs LinkTarget.BLANK
      externalLinkRel: 'noopener noreferrer',
      pagesCount: totalPages(),
      get page() {
        return currentPage();
      },
      set page(n: number) {
        goToPage(n);
      },
      rotation: 0,
      goToPage,
      goToDestination,
      // Older PDF.js variants call `navigateTo` instead of `goToDestination`.
      navigateTo(dest: unknown) {
        void goToDestination(dest);
      },
      getDestinationHash() {
        return '#';
      },
      getAnchorUrl(hash: string) {
        return hash;
      },
      setHash(hash: string) {
        const m = hash.match(/page=(\d+)/);
        if (m) goToPage(Number(m[1]));
      },
      cachePageRef() {
        /* no-op — destinations resolve on demand */
      },
      isPageVisible() {
        return true;
      },
      isPageCached() {
        return true;
      },
      executeNamedAction(action: string) {
        const cur = currentPage();
        const total = totalPages();
        if (action === 'NextPage') goToPage(cur + 1);
        else if (action === 'PrevPage') goToPage(cur - 1);
        else if (action === 'FirstPage') goToPage(1);
        else if (action === 'LastPage') goToPage(total);
      },
      executeSetOCGState() {
        /* optional content groups (layers) — not supported in Phase 2 */
      },
      addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow?: boolean) {
        link.href = url;
        if (newWindow) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      },
    };
  }

  private cancelInflightRenders(): void {
    for (const t of this.renderTasks) {
      try {
        t.cancel();
      } catch {
        /* ignore */
      }
    }
    this.renderTasks.clear();
    for (const tl of this.textLayerInstances) {
      try {
        tl.cancel?.();
      } catch {
        /* ignore */
      }
    }
    this.textLayerInstances.clear();
  }

  // ── Zoom resolution ─────────────────────────────────────────────────────

  private computeScale(): number {
    const cfgZoom = this.internal?.state().zoomMode ?? this.config().zoom ?? 'fit-width';
    if (this.pages.length === 0) return 0;
    const first = this.pages[0];
    const vp = this.viewport()?.nativeElement;
    if (!vp) return typeof cfgZoom === 'number' ? cfgZoom : 1;

    const availableWidth = Math.max(0, vp.clientWidth - VIEWPORT_PAD_X);
    const availableHeight = Math.max(0, vp.clientHeight - VIEWPORT_PAD_Y);

    if (typeof cfgZoom === 'number') return cfgZoom;
    if (cfgZoom === 'fit-width') return availableWidth / first.baseWidth;
    if (cfgZoom === 'fit-page') return Math.min(availableWidth / first.baseWidth, availableHeight / first.baseHeight);
    if (cfgZoom === 'auto') return Math.min(AUTO_ZOOM_CAP, availableWidth / first.baseWidth);
    return 1;
  }

  // ── Imperative ops (called via controller) ─────────────────────────────

  private goToPage(page: number): void {
    const numPages = this.internal?.state().numPages ?? 0;
    if (numPages === 0) return;
    const target = Math.max(1, Math.min(numPages, Math.floor(page)));
    this.internal?.state.update((s) => ({ ...s, page: target }));
    this.config().onPageChange?.(target);
    this.scrollToPage(target);
  }

  private scrollToPage(page: number): void {
    const wrapper = this.pageWrappers()[page - 1]?.nativeElement;
    if (!wrapper) {
      console.warn('[hk-pdf-viewer] scrollToPage: no wrapper for page', page, 'wrappers:', this.pageWrappers().length);
      return;
    }
    const mode = this.internal?.state().mode ?? 'continuous';
    if (mode !== 'continuous') return;

    // Native scrollIntoView on the wrapper. The browser handles all the
    // padding / border / nested-scroller arithmetic for us — no manual
    // offsetTop walks, no padding subtraction, no off-by-one. The nearest
    // scrollable ancestor (our viewport) scrolls to put the wrapper at its
    // start. If the viewer itself is not fully visible in the page, the
    // outer document scrolls too — usually desirable UX since it surfaces
    // the viewer when the user navigates.
    wrapper.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  private setZoom(zoom: PdfZoom): void {
    this.internal?.state.update((s) => ({ ...s, zoomMode: zoom }));
    void this.renderAll();
  }

  private setMode(mode: PdfDisplayMode): void {
    this.internal?.state.update((s) => ({ ...s, mode }));
    // In single mode, scroll to the active page so non-current pages
    // are out of view (CSS handles the actual hiding).
    requestAnimationFrame(() => {
      const page = this.internal?.state().page ?? 1;
      this.scrollToPage(page);
    });
  }

  toggleSidebar(): void {
    this.internal?.state.update((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  }

  /** Switch the sidebar's active tab (thumbnails ↔ bookmarks). */
  setSidebarTab(tab: 'thumbnails' | 'bookmarks'): void {
    this.internal?.state.update((s) => ({ ...s, sidebarTab: tab }));
  }

  /** Public dispatcher for thumbnail clicks. */
  goToPagePublic(pageNumber: number): void {
    this.goToPage(pageNumber);
  }

  /** Build the aria-label for one thumbnail using `labels.thumbnailAriaLabel`. */
  thumbnailAriaLabel(pageNumber: number): string {
    return this.labels().thumbnailAriaLabel.replace('{page}', String(pageNumber));
  }

  /**
   * Outline (bookmark) click handler. Routes through the same link-service
   * destination resolver the annotation layer uses, so `dest` arrays and
   * named destinations both work.
   */
  outlineGoto(node: { dest?: unknown }): void {
    const dest = node?.dest;
    if (!dest) return;
    const linkService = this.buildLinkService() as { goToDestination?: (d: unknown) => Promise<void> };
    void linkService.goToDestination?.(dest);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  /**
   * Run a substring search across every page. Case-insensitive. Builds a
   * `searchHits` array in document order, updates state (totalMatches +
   * currentMatchIndex), paints highlights into already-rendered text layers,
   * and navigates to the first match.
   */
  private async runSearch(query: string): Promise<PdfSearchResult> {
    this.clearSearchHighlights();
    this.searchHits = [];

    const q = query.trim();
    if (!q) {
      this.internal?.state.update((s) => ({ ...s, searchMatches: 0, currentMatchIndex: -1, searchQuery: '' }));
      return { totalMatches: 0, query: '' };
    }

    const normalized = q.toLowerCase();
    const hits: PdfSearchHit[] = [];

    // Iterate pages in document order so hits are naturally ordered.
    for (const page of this.pages) {
      const idx = await this.ensurePageTextIndex(page.pageNumber);
      if (!idx) continue;
      const haystack = idx.text.toLowerCase();
      let from = 0;
      while (from <= haystack.length) {
        const found = haystack.indexOf(normalized, from);
        if (found === -1) break;
        hits.push({ pageNumber: page.pageNumber, charStart: found, length: q.length });
        from = found + Math.max(1, q.length);
      }
    }

    this.searchHits = hits;
    // Pre-group hits by page so the inner highlight loops can skip the
    // global filter on every call. Built once per search → reused for every
    // page paint and every active-match refresh.
    this.searchHitsByPage.clear();
    for (const hit of hits) {
      const arr = this.searchHitsByPage.get(hit.pageNumber);
      if (arr) {
        arr.push(hit);
      } else {
        this.searchHitsByPage.set(hit.pageNumber, [hit]);
      }
    }

    const initialIndex = hits.length > 0 ? 0 : -1;
    this.internal?.state.update((s) => ({
      ...s,
      searchMatches: hits.length,
      currentMatchIndex: initialIndex,
      searchQuery: q,
    }));

    // Paint highlights onto every already-rendered text layer for hits in scope.
    this.applyAllHighlights();

    if (initialIndex >= 0) {
      this.gotoMatch(initialIndex);
    }

    return { totalMatches: hits.length, query: q };
  }

  /** Step to the next match (wraps from last → first). */
  private searchNextMatch(): void {
    if (this.searchHits.length === 0) return;
    const cur = this.internal?.state().currentMatchIndex ?? -1;
    const next = (cur + 1) % this.searchHits.length;
    this.gotoMatch(next);
  }

  /** Step to the previous match (wraps from first → last). */
  private searchPreviousMatch(): void {
    if (this.searchHits.length === 0) return;
    const cur = this.internal?.state().currentMatchIndex ?? -1;
    const prev = (cur - 1 + this.searchHits.length) % this.searchHits.length;
    this.gotoMatch(prev);
  }

  /** Clear active search results, remove highlights, reset state. */
  private clearSearch(): void {
    this.searchHits = [];
    this.clearSearchHighlights();
    this.internal?.state.update((s) => ({
      ...s,
      searchMatches: 0,
      currentMatchIndex: -1,
      searchQuery: '',
    }));
  }

  /** Navigate to the page holding the match at `index`, refresh active highlight. */
  private gotoMatch(index: number): void {
    const hit = this.searchHits[index];
    if (!hit) return;
    this.internal?.state.update((s) => ({ ...s, currentMatchIndex: index }));
    this.goToPage(hit.pageNumber);
    this.refreshActiveHighlight();
  }

  /**
   * Paint highlights into every already-rendered text layer for pages that
   * have at least one search hit. Iterates `renderedPages ∩ pages-with-hits`
   * — virtualization plus pre-grouped hits means this is O(buffered pages
   * with hits), not O(full host subtree) the way a `querySelectorAll` walk
   * would be. Pages whose text layer hasn't rendered yet are picked up by
   * `renderTextLayer` directly when they paint.
   */
  private applyAllHighlights(): void {
    if (this.searchHitsByPage.size === 0) return;
    const hostEl = this.hostRef.nativeElement;
    for (const pageNumber of this.renderedPages) {
      if (!this.searchHitsByPage.has(pageNumber)) continue;
      const wrapper = hostEl.querySelector<HTMLElement>(`.hk-pdf-page[data-page-number="${pageNumber}"]`);
      const tl = wrapper?.querySelector<HTMLElement>('.hk-pdf-text-layer');
      if (!tl) continue;
      this.applyHighlightsForPage(pageNumber, tl);
    }
    this.refreshActiveHighlight();
  }

  /**
   * Walk the text-layer's spans for one page and tag any whose character
   * range overlaps a search hit. Reads from `textLayerAllSpans` cache
   * populated when the layer paints, so we don't `querySelectorAll` per
   * call. Stale highlights from a previous search round on the same layer
   * are cleared via `textLayerMatchedSpans` (O(matched.length)) instead of
   * scanning the full subtree for the match classes.
   */
  private applyHighlightsForPage(pageNumber: number, textLayer: HTMLElement): void {
    // Clear any stale matches we placed on this layer during the previous
    // round so re-running a search doesn't accumulate classes.
    const stale = this.textLayerMatchedSpans.get(textLayer);
    if (stale) {
      for (const s of stale) s.classList.remove('hk-pdf-text-match', 'hk-pdf-text-match-active');
      this.textLayerMatchedSpans.delete(textLayer);
    }
    this.highlightedLayers.delete(textLayer);

    const hits = this.searchHitsByPage.get(pageNumber);
    if (!hits || hits.length === 0) return;

    let spans = this.textLayerAllSpans.get(textLayer);
    if (!spans) {
      spans = Array.from(textLayer.querySelectorAll<HTMLElement>('span:not(.endOfContent)'));
      this.textLayerAllSpans.set(textLayer, spans);
    }
    if (spans.length === 0) return;

    const matched: HTMLElement[] = [];
    let charOffset = 0;
    for (const span of spans) {
      const spanLen = (span.textContent ?? '').length;
      const spanStart = charOffset;
      const spanEnd = charOffset + spanLen;
      for (const hit of hits) {
        const matchEnd = hit.charStart + hit.length;
        if (hit.charStart < spanEnd && matchEnd > spanStart) {
          span.classList.add('hk-pdf-text-match');
          matched.push(span);
          break;
        }
      }
      charOffset = spanEnd;
    }
    if (matched.length > 0) {
      this.textLayerMatchedSpans.set(textLayer, matched);
      this.highlightedLayers.add(textLayer);
    }
  }

  /**
   * Pin the `*-match-active` class to the spans backing the currently
   * focused match. Clearing the previous active class iterates the small
   * `highlightedLayers` set (not the host subtree); painting the new one
   * reuses the cached span list for the active page.
   */
  private refreshActiveHighlight(): void {
    // Clear the active class from currently-highlighted layers — bounded
    // to the buffer size, not full document.
    for (const tl of this.highlightedLayers) {
      const matched = this.textLayerMatchedSpans.get(tl);
      if (!matched) continue;
      for (const s of matched) s.classList.remove('hk-pdf-text-match-active');
    }

    const cur = this.internal?.state().currentMatchIndex ?? -1;
    if (cur < 0) return;
    const hit = this.searchHits[cur];
    if (!hit) return;

    const pageWrapper = this.hostRef.nativeElement.querySelector<HTMLElement>(`.hk-pdf-page[data-page-number="${hit.pageNumber}"]`);
    const textLayer = pageWrapper?.querySelector<HTMLElement>('.hk-pdf-text-layer');
    if (!textLayer) return;

    let spans = this.textLayerAllSpans.get(textLayer);
    if (!spans) {
      spans = Array.from(textLayer.querySelectorAll<HTMLElement>('span:not(.endOfContent)'));
      this.textLayerAllSpans.set(textLayer, spans);
    }

    let charOffset = 0;
    const matchEnd = hit.charStart + hit.length;
    let firstActive: HTMLElement | null = null;
    for (const span of spans) {
      const spanLen = (span.textContent ?? '').length;
      if (hit.charStart < charOffset + spanLen && matchEnd > charOffset) {
        span.classList.add('hk-pdf-text-match-active');
        if (!firstActive) firstActive = span;
      }
      charOffset += spanLen;
    }

    firstActive?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }

  /**
   * Clear every active highlight class. Walks only `highlightedLayers`
   * (bounded to buffer size) and removes from the matched-span subset
   * cached per layer — no full-host `querySelectorAll`.
   */
  private clearSearchHighlights(): void {
    for (const tl of this.highlightedLayers) {
      const matched = this.textLayerMatchedSpans.get(tl);
      if (matched) {
        for (const s of matched) s.classList.remove('hk-pdf-text-match', 'hk-pdf-text-match-active');
      }
      this.textLayerMatchedSpans.delete(tl);
    }
    this.highlightedLayers.clear();
    this.searchHitsByPage.clear();
  }

  // ── Display ─────────────────────────────────────────────────────────────

  private async toggleFullscreen(): Promise<void> {
    const host = this.hostRef.nativeElement;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else if (host.requestFullscreen) {
      await host.requestFullscreen().catch(() => undefined);
    }
  }

  private async download(filename?: string): Promise<void> {
    const doc = this.pdfDoc as { getData?: () => Promise<Uint8Array> } | null;
    if (!doc?.getData) return;
    const data = await doc.getData();
    // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer-typed Uint8Array issues with Blob.
    const blob = new Blob([data.slice().buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || this.deriveFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private deriveFilename(): string {
    const src = this.src();
    if (typeof src === 'string') {
      try {
        const url = new URL(src, window.location.href);
        const last = url.pathname.split('/').pop();
        if (last) return last.endsWith('.pdf') ? last : `${last}.pdf`;
      } catch {
        /* fall through */
      }
    }
    return 'document.pdf';
  }

  /**
   * Serialize the current document — including form edits and annotation
   * editor changes carried in `pdfDoc.annotationStorage` — into fresh PDF
   * bytes via PDF.js's `saveDocument()`. Falls back to the unmodified
   * `getData()` bytes for older `pdfjs-dist` versions where `saveDocument`
   * isn't exposed; consumers can still call `controller.save()` safely
   * but mutated state won't be baked in on those versions.
   */
  private async saveDocument(): Promise<Uint8Array> {
    const doc = this.pdfDoc as null | {
      saveDocument?: () => Promise<Uint8Array>;
      getData?: () => Promise<Uint8Array>;
    };
    if (!doc) throw new Error('No PDF document loaded');
    if (typeof doc.saveDocument === 'function') {
      return doc.saveDocument();
    }
    if (typeof doc.getData === 'function') {
      // No saveDocument support in this pdfjs-dist build — return original
      // bytes so a `Save` button at least produces *something*. Annotation/
      // form edits won't be embedded, which is the price of the fallback.
      console.warn('[hk-pdf-viewer] pdfDoc.saveDocument unavailable — returning original bytes (form/annotation edits not preserved).');
      return doc.getData();
    }
    throw new Error('Document does not support saving');
  }

  /**
   * Save the current document and trigger a browser download in one step.
   * Mirrors the `download` flow but uses `saveDocument()` so form edits +
   * annotation edits are baked into the downloaded bytes.
   */
  private async saveAndDownloadDocument(filename?: string): Promise<void> {
    const data = await this.saveDocument();
    const blob = new Blob([data.slice().buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || this.deriveFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async print(): Promise<void> {
    const doc = this.pdfDoc as { getData?: () => Promise<Uint8Array> } | null;
    if (!doc?.getData) return;
    const data = await doc.getData();
    const blob = new Blob([data.slice().buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        /* some browsers block this — fall back to opening the URL */
        window.open(url, '_blank');
      }
    };
    document.body.appendChild(iframe);
    // Cleanup the iframe + URL after a generous delay so the print dialog has
    // time to read the data.
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60_000);
  }

  // ── Observers ───────────────────────────────────────────────────────────

  private installObservers(): void {
    const vp = this.viewport()?.nativeElement;
    if (!vp) return;

    // Track which page is currently most-visible for state.page updates in
    // continuous mode. The first page entering the viewport with > 50%
    // visibility wins.
    this.intersectionObserver?.disconnect();
    // ONE observer drives both page-virtualization (which pages are "live")
    // and continuous-mode page tracking (state.page). The `rootMargin`
    // expands the viewport by `LIVE_BUFFER_MARGIN_PX` so pages just outside
    // view are reported as intersecting — those go into the live buffer
    // proactively so the user doesn't see a blank page when they scroll.
    // Threshold 0 means "fire on entry/exit"; we'd prefer fewer firings, but
    // we also need to track ratios for "most-visible page" selection.
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const num = Number((e.target as HTMLElement).dataset['pageNumber']);
          if (!num) continue;
          if (e.isIntersecting) {
            this.rawVisible.set(num, e.intersectionRatio);
          } else {
            this.rawVisible.delete(num);
          }
        }
        // Coalesce IO bursts into one signal update per animation frame —
        // downstream effects (page-tracking + buffer diff) re-fire at most
        // 60Hz no matter how chatty the observer gets.
        if (this.visibilityFlushRaf === null) {
          this.visibilityFlushRaf = requestAnimationFrame(() => {
            this.visibilityFlushRaf = null;
            this.visibleEntries.set(new Map(this.rawVisible));
          });
        }
      },
      { root: vp, rootMargin: `${LIVE_BUFFER_MARGIN_PX}px 0px`, threshold: [0, 0.25, 0.5, 0.75] },
    );
    for (const w of this.pageWrappers()) {
      this.intersectionObserver.observe(w.nativeElement);
    }

    // Recompute fit-* zoom on container resize. Seed the last-known size
    // *before* observing — ResizeObserver delivers the initial measurement
    // synchronously the first time it fires, and without this guard the
    // initial callback would cancel the in-flight first render mid-paint.
    this.lastViewportWidth = vp.clientWidth;
    this.lastViewportHeight = vp.clientHeight;
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      const zoomMode = this.internal?.state().zoomMode;
      if (zoomMode !== 'fit-width' && zoomMode !== 'fit-page' && zoomMode !== 'auto') return;
      const w = vp.clientWidth;
      const h = vp.clientHeight;
      if (w === this.lastViewportWidth && h === this.lastViewportHeight) return;
      this.lastViewportWidth = w;
      this.lastViewportHeight = h;
      // Debounce to a single rAF so a continuous drag doesn't queue a render
      // per pixel — only the final size triggers the redraw.
      if (this.resizeRafHandle !== null) cancelAnimationFrame(this.resizeRafHandle);
      this.resizeRafHandle = requestAnimationFrame(() => {
        this.resizeRafHandle = null;
        void this.renderAll();
      });
    });
    this.resizeObserver.observe(vp);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  private teardown(): void {
    this.cancelInflightRenders();
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.thumbnailObserver?.disconnect();
    this.thumbnailObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeRafHandle !== null) {
      cancelAnimationFrame(this.resizeRafHandle);
      this.resizeRafHandle = null;
    }
    if (this.visibilityFlushRaf !== null) {
      cancelAnimationFrame(this.visibilityFlushRaf);
      this.visibilityFlushRaf = null;
    }
    this.rawVisible.clear();
    this.renderedPages.clear();
    this.inFlightPages.clear();
    if (this.findInputDebounce !== null) {
      clearTimeout(this.findInputDebounce);
      this.findInputDebounce = null;
    }
    this.formInputUnlisten?.();
    this.formInputUnlisten = null;
    this.unbindController?.();
    this.unbindController = null;
    void this.destroyDocument();
  }

  // ── Template helpers ────────────────────────────────────────────────────

  /** Read the current state for template bindings. */
  readonly state = computed(() => this.config()._internal?.state() ?? null);

  /** Resolved zoom percentage for the toolbar display ("123%"). */
  readonly zoomPercent = computed(() => {
    const z = this.state()?.zoom ?? 1;
    return `${Math.round(z * 100)}%`;
  });

  /**
   * Live-region announcement string ("Page 5 of 14"). Recomputes whenever the
   * current page or numPages changes — screen readers pick up the text change
   * and announce it politely. Empty while loading or when no doc is open.
   */
  readonly ariaPageAnnouncement = computed(() => {
    const s = this.state();
    if (!s || !s.loaded || s.numPages === 0) return '';
    return this.labels().pageIndicator.replace('{current}', String(s.page)).replace('{total}', String(s.numPages));
  });

  /** Formatted "{current} of {total}" string for the find bar's match counter. */
  readonly matchCounterText = computed(() => {
    const s = this.state();
    if (!s) return '';
    const cur = s.currentMatchIndex >= 0 ? s.currentMatchIndex + 1 : 0;
    return this.labels().matchCounter.replace('{current}', String(cur)).replace('{total}', String(s.searchMatches));
  });

  /** Whether to show the page list (loaded + no error). */
  readonly showPages = computed(() => !!this.state()?.loaded && !this.state()?.error);

  /** Page wrapper hidden? — true in single-mode for any non-current page. */
  pageHidden(pageNumber: number): boolean {
    const s = this.state();
    if (!s) return false;
    return s.mode === 'single' && s.page !== pageNumber;
  }

  // ── Toolbar event handlers ─────────────────────────────────────────────

  /**
   * Page input handler. Reads the input value, clamps to the doc range,
   * and updates state. Bound from the template's `(change)` event.
   */
  onPageInput(value: string): void {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    this.goToPage(n);
  }

  onZoomSelect(value: string): void {
    if (value === 'fit-width' || value === 'fit-page' || value === 'auto') {
      this.setZoom(value);
      return;
    }
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) this.setZoom(n);
  }

  // ── Public toolbar dispatch (from template) ────────────────────────────
  // Buttons in the default toolbar dispatch through these to keep template
  // bindings tidy. Each just calls the same primitive the controller does.

  toolbarPrev(): void {
    const cur = this.state()?.page ?? 0;
    this.goToPage(cur - 1);
  }
  toolbarNext(): void {
    const cur = this.state()?.page ?? 0;
    this.goToPage(cur + 1);
  }
  toolbarFirst(): void {
    this.goToPage(1);
  }
  toolbarLast(): void {
    this.goToPage(this.state()?.numPages ?? 1);
  }
  toolbarZoomIn(): void {
    const cur = this.state()?.zoom ?? 1;
    this.setZoom(Math.min(5, cur + 0.25));
  }
  toolbarZoomOut(): void {
    const cur = this.state()?.zoom ?? 1;
    this.setZoom(Math.max(0.25, cur - 0.25));
  }
  toolbarPrint(): void {
    void this.print();
  }
  toolbarDownload(): void {
    void this.download();
  }
  toolbarFullscreen(): void {
    void this.toggleFullscreen();
  }
  toolbarMode(mode: PdfDisplayMode): void {
    this.setMode(mode);
  }

  // ── Find bar dispatchers ───────────────────────────────────────────────

  /**
   * Open the find bar and focus its input on the next microtask. We schedule
   * focus rather than calling `.focus()` synchronously because the input
   * element doesn't exist in the DOM until Angular flushes the `@if`
   * controlling the find bar's visibility.
   */
  openFindBar(): void {
    this.findBarOpen.set(true);
    queueMicrotask(() => {
      const el = this.hostRef.nativeElement.querySelector<HTMLInputElement>('.hk-pdf-find-input');
      el?.focus();
      el?.select();
    });
  }

  /** Close the find bar and clear any active search results. */
  closeFindBar(): void {
    this.findBarOpen.set(false);
    if (this.findInputDebounce !== null) {
      clearTimeout(this.findInputDebounce);
      this.findInputDebounce = null;
    }
    this.clearSearch();
  }

  /**
   * Find-bar `(input)` handler. Debounces user typing into a single search
   * call (200ms) so each keystroke doesn't kick off page-by-page text-content
   * fetches when the user is mid-word.
   */
  onFindInput(value: string): void {
    if (this.findInputDebounce !== null) clearTimeout(this.findInputDebounce);
    this.findInputDebounce = setTimeout(() => {
      this.findInputDebounce = null;
      void this.runSearch(value);
    }, 200);
  }

  /**
   * Find-bar Enter-key handler. If a search is already settled, Enter steps
   * to the next match (matches browser-find behavior). If the user is still
   * typing, Enter forces an immediate search instead of waiting for the
   * debounce.
   */
  onFindEnter(value: string): void {
    if (this.findInputDebounce !== null) {
      clearTimeout(this.findInputDebounce);
      this.findInputDebounce = null;
      void this.runSearch(value);
      return;
    }
    const s = this.state();
    if (s && s.searchQuery && s.searchMatches > 0) {
      this.searchNextMatch();
    }
  }

  /** Toolbar / external Find button. */
  toolbarFind(): void {
    this.openFindBar();
  }

  /** Public dispatchers for the find-bar prev/next buttons. */
  searchNextMatchPublic(): void {
    this.searchNextMatch();
  }
  searchPreviousMatchPublic(): void {
    this.searchPreviousMatch();
  }

  /**
   * Reset zoom back to whatever the consumer configured initially. Mirrors
   * the controller's `resetZoom` so the keyboard shortcut and the controller
   * call land on the same logic.
   */
  keyResetZoom(): void {
    this.setZoom(this.config().zoom ?? 'fit-width');
  }

  /**
   * Keyboard shortcut router. Wired to the host's `(keydown)` event so the
   * viewer responds to the standard reader shortcuts whenever it (or any of
   * its chrome) holds focus. We skip handling when the target is an input /
   * select / textarea so the toolbar's page-number field and zoom dropdown
   * keep their native behavior.
   *
   * Bindings:
   * - PageUp / ArrowLeft → previous page
   * - PageDown / ArrowRight → next page
   * - Home → first page, End → last page
   * - ⌘/Ctrl + + / = → zoom in
   * - ⌘/Ctrl + − → zoom out
   * - ⌘/Ctrl + 0 → reset zoom
   * - ⌘/Ctrl + F → open the find bar
   * - Escape → close the find bar (when open)
   *
   * The find bar input handles its own Enter / Escape inline; this handler
   * only opens it via ⌘F and provides Escape-to-close as a fallback when
   * focus is somewhere else inside the viewer.
   */
  onKeyDown(event: KeyboardEvent): void {
    // Don't swallow keys typed into inputs / selects / contenteditable. (The
    // find bar input has its own Escape binding so it still closes there.)
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const inEditable = tag === 'input' || tag === 'select' || tag === 'textarea' || target?.isContentEditable;

    const meta = event.metaKey || event.ctrlKey;
    const key = event.key;

    // Escape closes the find bar from anywhere in the viewer subtree.
    if (key === 'Escape' && this.findBarOpen()) {
      event.preventDefault();
      this.closeFindBar();
      return;
    }

    if (inEditable) return;

    if (!meta) {
      switch (key) {
        case 'PageUp':
        case 'ArrowLeft':
          event.preventDefault();
          this.toolbarPrev();
          return;
        case 'PageDown':
        case 'ArrowRight':
        case ' ': // space-bar paging is a long-standing reader convention
          event.preventDefault();
          this.toolbarNext();
          return;
        case 'Home':
          event.preventDefault();
          this.toolbarFirst();
          return;
        case 'End':
          event.preventDefault();
          this.toolbarLast();
          return;
      }
      return;
    }

    // Meta/Ctrl shortcuts.
    if (key === '+' || key === '=') {
      event.preventDefault();
      this.toolbarZoomIn();
    } else if (key === '-' || key === '_') {
      event.preventDefault();
      this.toolbarZoomOut();
    } else if (key === '0') {
      event.preventDefault();
      this.keyResetZoom();
    } else if (key === 'f' || key === 'F') {
      event.preventDefault();
      this.openFindBar();
    }
  }
}
