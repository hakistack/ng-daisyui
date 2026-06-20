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
import {
  LucideBookOpen,
  LucideCaseSensitive,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideDownload,
  LucideEllipsis,
  LucideFileText,
  LucideMaximize,
  LucideMessageSquare,
  LucideMinus,
  LucidePanelLeft,
  LucidePaperclip,
  LucidePlus,
  LucidePrinter,
  LucideScrollText,
  LucideSearch,
  LucidePen,
  LucideRotateCw,
  LucideSquare,
  LucideTrash2,
  LucideType,
  LucideWholeWord,
  LucideX,
} from '@lucide/angular';
import { HK_THEME } from '../../theme/theme.config';
import { HkPdfToolbarContext, HkPdfToolbarDirective } from './pdf-viewer.directives';
import { inverseRotateDelta } from './pdf-viewer.helpers';
import { DEFAULT_PDF_VIEWER_LABELS, HK_PDF_LABELS, ResolvedPdfViewerLabels } from './pdf-viewer.labels';
import { PdfDocHandle, PdfEngine, PdfFormField, PdfLinkRect, PdfOutlineNode, PdfTextSegment } from './engine/pdf-engine.types';
import { PdfEnginePool } from './engine/pdf-engine-pool';
import { isPdfiumEngineAvailable } from './engine/pdfium-worker.loader';
import { PdfSearchHandle, PdfSearchService } from '../../services';
import {
  PdfAnnotationEntry,
  PdfAnnotationTool,
  PdfAttachmentEntry,
  PdfDisplayMode,
  PdfDocumentSource,
  PdfSearchResult,
  PdfSidebarTab,
  PdfViewerConfig,
  PdfViewerError,
  PdfViewerInternalApi,
  PdfZoom,
} from './pdf-viewer.types';

const VIEWPORT_PAD_X = 32; // px reserved when computing fit-width / fit-page
const VIEWPORT_PAD_Y = 32;
const AUTO_ZOOM_CAP = 1.5;
/**
 * Ceiling for the auto-fit (`fit-width`) scale. On a very wide viewport
 * (fullscreen, ultra-wide monitors) an un-capped fit-width blows a portrait page
 * up to several hundred percent — it overflows vertically *and* the device-pixel
 * canvas can exceed the browser's max canvas size, leaving the lower part of the
 * page blank. Capping keeps a comfortable reading width; the page-stack centres
 * the page with margins past this point. `fit-page` is intentionally uncapped
 * (it's already bounded by height).
 */
const FIT_ZOOM_MAX = 2;
/**
 * Max device-pixel dimension for a page canvas. Browsers cap canvas size (Safari
 * is the tightest, ~4096 px/side on some versions) and silently drop the
 * overflow — the cause of a blank lower page region at very high zoom. We reduce
 * the effective DPR so neither side exceeds this; the CSS box stays full-size.
 */
const MAX_CANVAS_DIM = 4096;

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
  /** page size in PDF points (scale=1) — used to compute fitted scales */
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
 * PDF viewer built on the PDFium (Rust→WASM) engine, which rasterizes pages
 * off the main thread with correct text. Renders any PDF source (URL,
 * `Uint8Array`, or `Blob`) with a customizable toolbar, sidebar (thumbnails +
 * bookmarks), text selection, search, forms, print, and download/export.
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
  imports: [
    CommonModule,
    LucidePanelLeft,
    LucideChevronsLeft,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsRight,
    LucidePlus,
    LucideMinus,
    LucideSearch,
    LucidePrinter,
    LucideDownload,
    LucideMaximize,
    LucideEllipsis,
    LucideScrollText,
    LucideSquare,
    LucideX,
    LucideCaseSensitive,
    LucideWholeWord,
    LucideFileText,
    LucideBookOpen,
    LucidePaperclip,
    LucideMessageSquare,
    LucideType,
    LucidePen,
    LucideTrash2,
    LucideRotateCw,
  ],
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
  private readonly engineService = inject(PdfSearchService);

  /**
   * WASM search handle for the currently loaded document. Built lazily after
   * `loadDocument` resolves the page count; replaces the per-page `indexOf`
   * loop in `runSearch`. Pages are mirrored into it as `populateTextIndex`
   * builds them. `null` when WASM isn't loaded — `runSearch` falls back to
   * the existing JS scan in that case.
   */
  private engineHandle: PdfSearchHandle | null = null;

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
    // `h-full` lets the card fill the host (which fills a sized parent), so the
    // viewport gets the full height instead of collapsing to a short box.
    return `card ${this.theme.classes.cardBorder} bg-base-100 overflow-hidden flex flex-col h-full`;
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
  private readonly attachmentsTabActive = computed(() => {
    const s = this.state();
    return !!s?.sidebarOpen && s.sidebarTab === 'attachments';
  });
  private readonly annotationsTabActive = computed(() => {
    const s = this.state();
    return !!s?.sidebarOpen && s.sidebarTab === 'annotations';
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

  /** Raw bytes of the current document — kept for `download()` (the engine
   *  parses a transferred copy). `null` until a document loads. */
  private sourceBytes: Uint8Array | null = null;
  /** Bumped per `loadDocument` call; async continuations bail when it changes
   *  (doc-swap guard — replaces the old `pdfDoc` identity check). */
  private loadToken = 0;
  private pages: PageEntry[] = [];
  /**
   * In-flight render tasks keyed by page number. Per-page lookup lets
   * `applyBufferDiff` cancel renders for pages that scrolled out before they
   * finish, freeing the PDF.js worker for what the user is now looking at.
   */
  private renderTasksByPage = new Map<number, { cancel: () => void; promise: Promise<unknown> }>();
  /** In-flight text-layer instances, keyed the same way for the same reason. */
  private textLayerTasksByPage = new Map<number, { cancel?: () => void }>();
  /**
   * Pending cancellations, keyed by page number. A page that scrolls out
   * isn't cancelled immediately — we wait `RENDER_CANCEL_HYSTERESIS_MS` so
   * brief scroll-pasts (page exits + re-enters within a few frames) keep
   * their work. If the page is still out-of-buffer when the timeout fires,
   * `cancelPageWork` runs.
   */
  private pendingCancellations = new Map<number, ReturnType<typeof setTimeout>>();
  /** Hysteresis before cancelling an out-of-buffer render (ms). */
  private static readonly RENDER_CANCEL_HYSTERESIS_MS = 200;
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
  /** PDF outline (bookmarks tree) — populated lazily when the bookmarks tab opens. `null` until fetched. */
  readonly outline = signal<unknown[] | null>(null);
  /** Embedded-files list — populated lazily when the Attachments tab opens. `null` until fetched. */
  readonly attachments = signal<PdfAttachmentEntry[] | null>(null);
  /** Annotation list — populated lazily when the Annotations tab opens. `null` until fetched. */
  readonly annotations = signal<PdfAnnotationEntry[] | null>(null);

  /** Active annotation-editing tool. `'none'` = normal (select/scroll). */
  readonly annotationTool = signal<PdfAnnotationTool>('none');
  /** Colour (hex) for new annotations. */
  readonly annotationColor = signal<string>('#ffeb3b');
  /** In-progress drag for rectangle tools (highlight / free-text). */
  private editDrag: { layer: HTMLElement; startX: number; startY: number; preview: HTMLElement; pageNumber: number } | null = null;
  /** Per-page display rotation in degrees (0/90/180/270). Applied as a CSS
   *  transform to the whole page group (canvas + overlays rotate together →
   *  stay aligned); baked into the PDF only at `save()` time. */
  readonly pageRotations = signal<ReadonlyMap<number, number>>(new Map());
  /** Inline text-editor popover state (replaces `prompt()` for notes / free-text / edit). */
  readonly textEditor = signal<{ label: string } | null>(null);
  readonly textEditorDraft = signal('');
  private textEditorResolve: ((value: string | null) => void) | null = null;
  /** In-progress freehand stroke (ink tool): CSS-px points + the live SVG preview. */
  private inkDraw: { layer: HTMLElement; pageNumber: number; points: number[]; svg: SVGSVGElement; poly: SVGPolylineElement } | null = null;

  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unbindController: (() => void) | null = null;
  /** Bumps when a re-render is requested so in-flight callers can detect they were superseded. */
  private renderEpoch = 0;

  /**
   * PDFium engine (Rust→WASM, in a worker) — the off-thread rasterizer that
   * replaces pd​f.js. Long-lived: created lazily on first document, reused
   * across loads (one document open at a time, tracked by {@link pdfiumDoc}).
   * `null` until the PDFium worker is built + the browser supports it; until
   * then pages render via pd​f.js (transitional — that path is removed at M3.5
   * once PDFium is verified). See PDFIUM_ENGINE.md.
   */
  private pdfiumEngine: PdfEngine | null = null;
  /** Handle to the document currently open in {@link pdfiumEngine}; `null` if none. */
  private pdfiumDoc: PdfDocHandle | null = null;
  /**
   * Per-page PDFium text segments (reading order), cached for the document's
   * lifetime. Drives both the text layer and the search index when the engine
   * is active. Cleared on document swap.
   */
  private pdfiumTextCache = new Map<number, PdfTextSegment[]>();
  /** Per-page link rects, cached for the document's lifetime (stable). */
  private pdfiumLinksCache = new Map<number, PdfLinkRect[]>();
  /** Per-page form fields, cached + invalidated for a page on `setFieldValue`. */
  private pdfiumFieldsCache = new Map<number, PdfFormField[]>();
  /**
   * LRU cache of rendered page bitmaps keyed `pageNumber:targetDeviceWidth`.
   * Lets scroll-back / zoom-revisit skip the worker, and supplies a scaled
   * placeholder for progressive paint on zoom. Bitmaps are `close()`d on
   * eviction + document swap to free memory. Capped by count.
   */
  private pageBitmapCache = new Map<string, ImageBitmap>();
  private static readonly MAX_CACHED_BITMAPS = 16;
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
  /**
   * Last fit-* scale we re-rendered at. The resize observer only re-renders when
   * the *resolved scale* changes — not on every clientWidth/Height tick — so a
   * scrollbar toggling (e.g. after rotating a page to landscape, which changes
   * clientHeight but not the fit-width scale) doesn't churn the render engine.
   */
  private lastRenderScale = 0;
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
    // opens, blocking the worker for the main canvas.
    //
    // Deps must be reactive signals: `pageNumbers()` (not the plain `pages`
    // array, which doesn't track) so the observer (re)installs as soon as the
    // doc's pages exist and the thumbnails tab is shown. Thumbnails still paint
    // lazily + sequentially, so they don't starve the main view.
    effect(() => {
      // The thumbnail grid stays mounted (just `[hidden]` when another sidebar
      // tab is active), so its rendered canvases persist — switching tabs is
      // instant, no re-raster. We install once pages + panel exist; while the
      // panel is hidden it has no layout, so the observer fires no intersections
      // and nothing renders until the user actually views the thumbnails. The
      // rendered set is reset only on document swap (see `loadDocument`).
      if (this.pageNumbers().length === 0) {
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
      if (this.outline() !== null || this.pdfiumDoc === null) return;
      untracked(() => void this.fetchOutline());
    });

    // Lazily fetch attachments + annotations when their tabs open.
    effect(() => {
      if (!this.attachmentsTabActive()) return;
      if (this.attachments() !== null || this.pdfiumDoc === null) return;
      untracked(() => void this.fetchAttachments());
    });
    effect(() => {
      if (!this.annotationsTabActive()) return;
      if (this.annotations() !== null || this.pdfiumDoc === null) return;
      untracked(() => void this.fetchAnnotations());
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
      // Re-runs each rAF-paced visibility flush (i.e. as the user scrolls).
      const visible = this.visibleEntries();
      const vp = this.viewport()?.nativeElement;
      if (!vp || visible.size === 0) return;
      untracked(() => {
        // Current page = the one whose box straddles the viewport's vertical
        // centre (nearest page if the centre lands in the inter-page gap). This
        // is position-based, not intersection-ratio based, so it's stable
        // (changes exactly once when the centre crosses a boundary — no flicker)
        // and unaffected by scroll speed or zoom, unlike the visible-fraction
        // ratio which barely moves for a page taller than the viewport.
        const vpRect = vp.getBoundingClientRect();
        const center = vpRect.top + vpRect.height / 2;
        let current = -1;
        let bestDist = Infinity;
        for (const num of visible.keys()) {
          const wrapper = this.pageWrappers()[num - 1]?.nativeElement;
          if (!wrapper) continue;
          const r = wrapper.getBoundingClientRect();
          if (r.top <= center && r.bottom >= center) {
            current = num;
            break;
          }
          const dist = center < r.top ? r.top - center : center - r.bottom;
          if (dist < bestDist) {
            bestDist = dist;
            current = num;
          }
        }
        if (current <= 0) return;
        const cur = this.internal?.state().page ?? 0;
        if (current !== cur) {
          this.internal?.state.update((s) => ({ ...s, page: current }));
          this.config().onPageChange?.(current);
        }
      });
    });

    // Keep the active page's thumbnail visible in the sidebar as the user moves
    // through the document (scroll, prev/next, goToPage). Confined to the
    // thumbnail panel — never scrolls the outer page.
    effect(() => {
      const page = this.state()?.page ?? 0;
      const active = this.thumbnailsTabActive();
      if (page <= 0 || !active) return;
      untracked(() => this.scrollActiveThumbnailIntoView(page));
    });

    // Push consumer-set form values into the engine's form fields. Skips the
    // write when the change originated from us (user editing a widget) to
    // avoid a write→read→write loop. Runs once on mount with the empty {}
    // default (no-op until a document is open).
    effect(() => {
      const values = this.formValues();
      if (this.formValuesEmittedByUs) {
        this.formValuesEmittedByUs = false;
        return;
      }
      void this.applyFormValuesToEngine(values);
    });

    this.destroyRef.onDestroy(() => this.teardown());
  }

  /**
   * Push consumer-supplied `formValues` into the engine's form fields, matched
   * by name across pages. No-op until a document is open. Best-effort: unknown
   * names and non-settable fields (combo/list) are skipped. Drives both the
   * initial pre-fill and reactive updates from the `formValues` binding.
   */
  private async applyFormValuesToEngine(values: Record<string, unknown>): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null || this.pages.length === 0) return;
    try {
      for (const [name, val] of Object.entries(values)) {
        const str = val == null ? '' : String(val);
        for (const page of this.pages) {
          if (await engine.setFieldValue(doc, page.pageNumber - 1, name, str)) break;
        }
      }
    } catch (err) {
      // A pool-desync (mutation half-applied across workers) lands here.
      this.emitError({ code: 'render_failed', message: 'Failed to apply form values.', recoverable: true, cause: err });
    }
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Warm the engine (lazy worker + wasm) so it's ready when [src] resolves.
    this.ensurePdfiumEngine();
  }

  ngOnDestroy(): void {
    // Defensive — destroyRef already runs teardown, but if the host gets
    // pulled out without DestroyRef firing (rare), this catches it.
    this.teardown();
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
      exportPageAsImage: (options) => this.exportPageAsImage(options),
      exportText: (filename) => this.exportText(filename),
      setAnnotationTool: (tool) => this.setAnnotationTool(tool),
      setAnnotationColor: (color) => this.setAnnotationColor(color),
      deletePage: (pageNumber) => this.deletePage(pageNumber),
      insertBlankPage: (atPageNumber) => this.insertBlankPage(atPageNumber),
      rotatePage: (pageNumber, delta) => this.rotatePage(pageNumber, delta),
    });
  }

  // ── Document load ───────────────────────────────────────────────────────

  /**
   * Open a document, prompting + retrying on a password-protected PDF. The
   * engine rejects with the `PDFIUM_PASSWORD_REQUIRED` sentinel; when
   * `onPasswordRequired` is configured we await the consumer's password and
   * retry (up to a few attempts) — otherwise we emit a recoverable error.
   * Returns the handle, or `null` if cancelled / failed / superseded.
   */
  private async openWithPassword(
    engine: PdfEngine,
    makeCopy: () => ArrayBuffer,
    initialPassword: string,
    token: number,
  ): Promise<PdfDocHandle | null> {
    let password = initialPassword;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await engine.open(makeCopy(), { password: password || undefined });
      } catch (err) {
        if (this.loadToken !== token) return null;
        if (!String((err as Error)?.message ?? '').includes('PDFIUM_PASSWORD_REQUIRED')) throw err;
        const onPwd = this.config().onPasswordRequired;
        if (!onPwd) {
          this.emitError({ code: 'password_cancelled', message: 'Password required to open this PDF.', recoverable: true });
          return null;
        }
        password = await new Promise<string>((resolve) => onPwd((p) => resolve(p)));
        if (this.loadToken !== token) return null;
      }
    }
    this.emitError({ code: 'password_cancelled', message: 'Incorrect password.', recoverable: true });
    return null;
  }

  private async loadDocument(src: PdfDocumentSource, password: string): Promise<void> {
    this.cancelInflightRenders();
    this.firstRenderComplete.set(false);
    this.renderedThumbs.clear();
    this.thumbnailObserver?.disconnect();
    this.thumbnailObserver = null;
    this.outline.set(null);
    this.attachments.set(null);
    this.annotations.set(null);
    // Drop search + virtualization state for the previous doc.
    this.pageTextIndex.clear();
    this.pdfiumTextCache.clear();
    this.pdfiumLinksCache.clear();
    this.pdfiumFieldsCache.clear();
    this.clearBitmapCache();
    this.pageRotations.set(new Map());
    this.searchHits = [];
    this.searchHitsByPage.clear();
    this.textLayerAllSpans.clear();
    this.textLayerMatchedSpans.clear();
    this.highlightedLayers.clear();
    this.rawVisible.clear();
    this.visibleEntries.set(new Map());
    this.renderedPages.clear();
    this.inFlightPages.clear();
    this.disposeEngineHandle();
    await this.destroyDocument();

    if (!src || (typeof src === 'string' && src.length === 0)) {
      this.internal?.state.update((s) => ({ ...s, page: 0, numPages: 0, loaded: false, error: null }));
      this.pageNumbers.set([]);
      return;
    }

    // Reset state to "loading"
    this.internal?.state.update((s) => ({ ...s, page: 0, numPages: 0, loaded: false, error: null }));

    const token = ++this.loadToken;

    try {
      // Resolve the source to bytes — PDFium parses from bytes (no URL fetch
      // inside the engine). We keep an untransferred copy for `download()`.
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
      if (this.loadToken !== token) return;
      const fileSize = buffer.byteLength;
      this.sourceBytes = new Uint8Array(buffer);

      const engine = this.ensurePdfiumEngine();
      if (!engine) {
        this.emitError({ code: 'unsupported', message: 'PDF rendering is not supported in this environment.', recoverable: false });
        return;
      }

      // Open in the engine (each attempt transfers a fresh copy so our
      // `sourceBytes` survives). Prompts + retries on a password-protected PDF.
      const handle = await this.openWithPassword(engine, () => buffer.slice(0), password || this.config().password || '', token);
      if (handle === null) return; // cancelled, password-failed, or doc swapped (error already emitted as needed)
      if (this.loadToken !== token) {
        engine.dispose(handle);
        return;
      }
      this.pdfiumDoc = handle;

      const numPages = await engine.pageCount(handle);
      const pages: PageEntry[] = [];
      for (let i = 1; i <= numPages; i++) {
        const size = await engine.pageSize(handle, i - 1);
        pages.push({ pageNumber: i, baseWidth: size.width, baseHeight: size.height });
      }
      if (this.loadToken !== token) return;
      this.pages = pages;

      // Resolve the initial page before mounting wrappers (the `pageNumbers`
      // signal triggers the @for; the wrapper effect scrolls to `state.page`).
      const initialPage = Math.max(1, Math.min(numPages, this.config().page ?? 1));
      this.internal?.state.update((s) => ({ ...s, page: initialPage, numPages }));
      this.pageNumbers.set(pages.map((p) => p.pageNumber));

      // WASM search index — text is mirrored in as `populateTextIndex` runs.
      // Token-guarded against doc-swap races (two loads racing their createIndex).
      this.engineService
        .createIndex(numPages)
        .then((idxHandle) => {
          if (this.loadToken !== token) {
            idxHandle.dispose();
            return;
          }
          this.engineHandle?.dispose();
          this.engineHandle = idxHandle;
          for (const [pageNum, idx] of this.pageTextIndex.entries()) {
            this.mirrorPageToEngine(pageNum, idx);
          }
        })
        .catch(() => {
          this.engineHandle = null;
        });

      this.internal?.state.update((s) => ({ ...s, loaded: true, error: null }));
      // Embedded Title from the metadata dictionary (best-effort). `fileSize` is
      // the byte length; fingerprint is unused by PDFium.
      const title = await engine.documentTitle(handle).catch(() => '');
      if (this.loadToken !== token) return;
      this.config().onLoaded?.({ numPages, title, fingerprint: '', fileSize });

      // Pre-fill consumer-supplied form values before widgets paint.
      await this.applyFormValuesToEngine(this.formValues());

      // Render + observer install + scroll to initial page is driven by the
      // pageWrappers effect in the constructor — fires once Angular has
      // mounted a wrapper for every page.
    } catch (err: unknown) {
      if (this.loadToken !== token) return;
      this.emitError(this.toViewerError(err));
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

  /**
   * Lazily create the PDFium engine (a {@link PdfEnginePool} of render
   * workers), reusing the existing instance. Returns `null` when the engine
   * isn't available here — server, missing browser primitives, or the PDFium
   * worker not yet built. Construction failure is swallowed for the same reason.
   */
  private ensurePdfiumEngine(): PdfEngine | null {
    if (this.pdfiumEngine) return this.pdfiumEngine;
    if (!isPdfiumEngineAvailable()) return null;
    try {
      this.pdfiumEngine = new PdfEnginePool(this.resolveRenderPoolSize());
    } catch {
      this.pdfiumEngine = null;
    }
    return this.pdfiumEngine;
  }

  /** Render-worker count: config `renderPoolSize` (default 2), clamped 1–4 and
   *  to the device core count so we never oversubscribe. */
  private resolveRenderPoolSize(): number {
    const want = this.config().renderPoolSize ?? 2;
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    return Math.max(1, Math.min(want, 4, cores));
  }

  /** Release the open PDFium document (if any) and tear down the engine/worker. */
  private destroyPdfiumEngine(): void {
    if (this.pdfiumEngine && this.pdfiumDoc !== null) {
      this.pdfiumEngine.dispose(this.pdfiumDoc);
    }
    this.pdfiumDoc = null;
    this.pdfiumEngine?.destroy();
    this.pdfiumEngine = null;
  }

  private async destroyDocument(): Promise<void> {
    this.sourceBytes = null;
    this.pages = [];
    this.pageNumbers.set([]);
    // Release the PDFium document but keep the engine/worker for the next load.
    if (this.pdfiumEngine && this.pdfiumDoc !== null) {
      this.pdfiumEngine.dispose(this.pdfiumDoc);
    }
    this.pdfiumDoc = null;
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
    // Keep the resize-observer's baseline in sync regardless of what triggered
    // this render (manual zoom, mode switch, resize) so it only fires again on a
    // genuine scale change.
    this.lastRenderScale = scale;

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
    // rendered by a peer diff — they're handled by the hysteresis-cancel
    // pass below, which can interrupt their in-flight render task instead
    // of waiting for it to complete and then evicting.
    for (const num of Array.from(this.renderedPages)) {
      if (!buffer.has(num) && !this.inFlightPages.has(num)) {
        this.evictPage(num);
        this.renderedPages.delete(num);
      }
    }

    // Cancel-aggressive virtualization (PERFORMANCE.md Phase 1):
    //
    // Pages mid-render that have scrolled out keep occupying the PDF.js
    // worker until they finish — wasting time on bitmaps the user will
    // never see, and blocking the page they're scrolling toward. Cancel
    // them after a short hysteresis so brief scroll-pasts (exit + re-enter
    // within ~12 frames) don't lose their work.
    for (const num of this.inFlightPages) {
      if (buffer.has(num) || this.pendingCancellations.has(num)) continue;
      const handle = setTimeout(() => {
        this.pendingCancellations.delete(num);
        // Re-check at fire time — the page may have scrolled back in.
        if (!this.liveBuffer().has(num)) this.cancelPageWork(num);
      }, PdfViewerComponent.RENDER_CANCEL_HYSTERESIS_MS);
      this.pendingCancellations.set(num, handle);
    }

    // Clear pending cancellations for pages that returned to the buffer
    // before the hysteresis fired.
    if (this.pendingCancellations.size > 0) {
      for (const num of Array.from(this.pendingCancellations.keys())) {
        if (buffer.has(num)) {
          clearTimeout(this.pendingCancellations.get(num)!);
          this.pendingCancellations.delete(num);
        }
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

  /** True while a search query is active (the highlighter needs text spans). */
  private isSearchActive(): boolean {
    return !!this.internal?.state().searchQuery;
  }

  /**
   * Run non-critical render work (text / annotation layers) in idle time so it
   * doesn't block canvas rasterization during scroll. Epoch-guarded: stale work
   * (doc swapped, zoom changed, page evicted) is dropped. Falls back to a
   * macrotask where `requestIdleCallback` isn't available (Safari).
   */
  private scheduleIdle(fn: () => void, epoch: number): void {
    const run = () => {
      if (epoch === this.renderEpoch) fn();
    };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(run, { timeout: 500 });
    else setTimeout(run, 0);
  }

  private async renderPageOnto(page: PageEntry, canvas: HTMLCanvasElement, scale: number, dpr: number, epoch: number): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport from the page's natural size (PDF points) × the fitted scale.
    const viewport = { width: page.baseWidth * scale, height: page.baseHeight * scale };
    // Clamp the *device* canvas so neither side exceeds the browser's max canvas
    // dimension. Past it the canvas silently fails to paint its lower/right
    // region (the blank-page-bottom at very high zoom). We reduce the effective
    // DPR to fit; the CSS box stays full-size so the browser upscales the raster
    // (slightly soft, but complete). Fit modes stay well under this (see
    // FIT_ZOOM_MAX); only extreme manual zoom triggers it.
    const ideal = Math.max(viewport.width, viewport.height) * dpr;
    const renderDpr = ideal > MAX_CANVAS_DIM ? (dpr * MAX_CANVAS_DIM) / ideal : dpr;
    canvas.width = Math.floor(viewport.width * renderDpr);
    canvas.height = Math.floor(viewport.height * renderDpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Text + annotation/link/form layers are deferred off the critical raster
    // path so they don't compete with canvas painting during scroll. Built in
    // idle time — except the text layer paints promptly under active search
    // (the highlighter reads its spans).
    const wrapper = canvas.parentElement;
    const textLayerDiv = wrapper?.querySelector<HTMLElement>('.hk-pdf-text-layer') ?? null;
    const annotLayerDiv = wrapper?.querySelector<HTMLElement>('.hk-pdf-annotation-layer') ?? null;
    const renderText = () => {
      if (textLayerDiv) void this.renderTextLayer(textLayerDiv, viewport, epoch, page.pageNumber);
    };
    if (this.isSearchActive()) {
      renderText();
    } else {
      this.scheduleIdle(renderText, epoch);
    }
    if (annotLayerDiv) this.scheduleIdle(() => void this.renderAnnotationLayer(annotLayerDiv, viewport, epoch, page.pageNumber), epoch);

    // Bitmap cache: exact hit → blit instantly, no worker round-trip (this is
    // the scroll-back / zoom-revisit fast path).
    const targetWidth = Math.max(1, Math.floor(viewport.width * renderDpr));
    const cacheKey = `${page.pageNumber}:${targetWidth}`;
    const hit = this.pageBitmapCache.get(cacheKey);
    if (hit) {
      this.touchBitmap(cacheKey, hit);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(hit, 0, 0);
      return;
    }

    // Progressive paint: while the sharp raster is in flight, blit any cached
    // bitmap for this page (a different zoom) stretched to fill — instant,
    // slightly soft content instead of a blank flash on zoom.
    const placeholder = this.findCachedBitmapForPage(page.pageNumber);
    if (placeholder) {
      ctx.drawImage(placeholder, 0, 0, canvas.width, canvas.height);
    }

    // Clear by page-number, not handle ref — a peer render-pass on the same
    // page would have overwritten the entry, so deleting by ref could strip a
    // newer pass's registration. Page-number scoping handles that because peer
    // passes are serialized by `inFlightPages`.
    const cleanup = (handle: { cancel: () => void; promise: Promise<unknown> }) => {
      if (this.renderTasksByPage.get(page.pageNumber) === handle) {
        this.renderTasksByPage.delete(page.pageNumber);
      }
      const pending = this.pendingCancellations.get(page.pageNumber);
      if (pending !== undefined) {
        clearTimeout(pending);
        this.pendingCancellations.delete(page.pageNumber);
      }
    };

    // PDFium rasterizes the page off the main thread (with correct text) and
    // returns an ImageBitmap we blit in a sub-millisecond `drawImage`. PDFium
    // pages are 0-based; our `pageNumber` is 1-based.
    const task = engine.renderPage(doc, page.pageNumber - 1, viewport.width, renderDpr);
    const handle = { cancel: task.cancel, promise: task.promise };
    this.renderTasksByPage.set(page.pageNumber, handle);
    try {
      const { bitmap } = await task.promise;
      if (epoch === this.renderEpoch) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        this.cacheBitmap(cacheKey, bitmap); // keep open — owned by the cache now
      } else {
        bitmap.close(); // superseded; don't cache a stale-epoch raster
      }
    } catch (err) {
      if (epoch === this.renderEpoch && (err as { name?: string })?.name !== 'AbortError') {
        this.emitError({ code: 'render_failed', message: 'Failed to render page.', recoverable: true, cause: err });
      }
    } finally {
      cleanup(handle);
    }
  }

  /**
   * Build the transparent text-layer overlay (selectable + searchable) from
   * PDFium text segments. Called per page alongside the canvas raster; the
   * implementation lives in {@link renderPdfiumTextLayer}.
   */
  private async renderTextLayer(container: HTMLElement, viewport: unknown, epoch: number, pageNumber: number): Promise<void> {
    await this.renderPdfiumTextLayer(container, viewport, epoch, pageNumber);
  }

  /**
   * Fetch (and cache) a page's PDFium text segments. Returns `null` when the
   * engine isn't active or extraction fails — callers then skip text work.
   */
  private async pdfiumSegments(pageNumber: number): Promise<PdfTextSegment[] | null> {
    if (!this.pdfiumEngine || this.pdfiumDoc === null) return null;
    const cached = this.pdfiumTextCache.get(pageNumber);
    if (cached) return cached;
    try {
      const segs = await this.pdfiumEngine.pageText(this.pdfiumDoc, pageNumber - 1);
      this.pdfiumTextCache.set(pageNumber, segs);
      return segs;
    } catch {
      return null;
    }
  }

  /** Fetch (and cache) a page's link rects. Stable for the doc's lifetime. */
  private async pdfiumLinks(pageNumber: number): Promise<PdfLinkRect[]> {
    if (!this.pdfiumEngine || this.pdfiumDoc === null) return [];
    const cached = this.pdfiumLinksCache.get(pageNumber);
    if (cached) return cached;
    try {
      const links = await this.pdfiumEngine.pageLinks(this.pdfiumDoc, pageNumber - 1);
      this.pdfiumLinksCache.set(pageNumber, links);
      return links;
    } catch {
      return [];
    }
  }

  /** Fetch (and cache) a page's form fields. Invalidated for a page on edit. */
  private async pdfiumFields(pageNumber: number): Promise<PdfFormField[]> {
    if (!this.pdfiumEngine || this.pdfiumDoc === null) return [];
    const cached = this.pdfiumFieldsCache.get(pageNumber);
    if (cached) return cached;
    try {
      const fields = await this.pdfiumEngine.formFields(this.pdfiumDoc, pageNumber - 1);
      this.pdfiumFieldsCache.set(pageNumber, fields);
      return fields;
    } catch {
      return [];
    }
  }

  // ── Rendered-bitmap LRU cache (scroll-back / zoom-revisit + progressive paint) ──

  /** Store a rendered bitmap, evicting (and closing) the least-recently-used. */
  private cacheBitmap(key: string, bitmap: ImageBitmap): void {
    this.pageBitmapCache.set(key, bitmap);
    while (this.pageBitmapCache.size > PdfViewerComponent.MAX_CACHED_BITMAPS) {
      const oldest = this.pageBitmapCache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.pageBitmapCache.get(oldest)?.close();
      this.pageBitmapCache.delete(oldest);
    }
  }

  /** Mark a cache entry most-recently-used (re-insert at the tail). */
  private touchBitmap(key: string, bitmap: ImageBitmap): void {
    this.pageBitmapCache.delete(key);
    this.pageBitmapCache.set(key, bitmap);
  }

  /** Any cached bitmap for this page (any scale) — a progressive-paint placeholder. */
  private findCachedBitmapForPage(pageNumber: number): ImageBitmap | null {
    const prefix = `${pageNumber}:`;
    for (const [k, v] of this.pageBitmapCache) {
      if (k.startsWith(prefix)) return v;
    }
    return null;
  }

  private clearBitmapCache(): void {
    for (const b of this.pageBitmapCache.values()) b.close();
    this.pageBitmapCache.clear();
  }

  /** Drop (and close) all cached bitmaps for one page — e.g. after a form edit
   *  changes its baked appearance, so a later re-render re-rasterizes fresh. */
  private invalidatePageBitmaps(pageNumber: number): void {
    const prefix = `${pageNumber}:`;
    for (const [k, v] of this.pageBitmapCache) {
      if (k.startsWith(prefix)) {
        v.close();
        this.pageBitmapCache.delete(k);
      }
    }
  }

  /**
   * Render the PDFium text layer: one absolutely-positioned, transparent
   * `<span>` per text segment, sized in CSS px (segment points × render
   * scale). The spans overlay the rasterized canvas so text is selectable and
   * search highlights land on the right runs. Span order matches the search
   * index (segment index ≡ span index), so {@link applyHighlightsForPage}
   * works unchanged.
   *
   * Each span is stretched horizontally (`scaleX`) to fill its segment box so
   * the selection rectangle tracks the glyphs — the same trick pd​f.js's
   * TextLayer uses. Width reads are batched before any writes to keep it to a
   * single layout pass.
   */
  private async renderPdfiumTextLayer(container: HTMLElement, viewport: unknown, epoch: number, pageNumber: number): Promise<void> {
    const segs = await this.pdfiumSegments(pageNumber);
    if (epoch !== this.renderEpoch || !segs) return;

    this.populateTextIndexFromStrings(
      pageNumber,
      segs.map((s) => s.text),
    );

    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return;
    const vw = (viewport as { width: number }).width;
    const scale = page.baseWidth > 0 ? vw / page.baseWidth : 1;

    container.replaceChildren();
    this.textLayerAllSpans.delete(container);
    this.textLayerMatchedSpans.delete(container);
    this.highlightedLayers.delete(container);

    const spans: HTMLElement[] = [];
    const frag = document.createDocumentFragment();
    for (const seg of segs) {
      const span = document.createElement('span');
      span.textContent = seg.text;
      const s = span.style;
      s.position = 'absolute';
      s.left = `${seg.x * scale}px`;
      s.top = `${seg.y * scale}px`;
      s.height = `${seg.h * scale}px`;
      s.fontSize = `${seg.h * scale}px`;
      s.lineHeight = '1';
      s.whiteSpace = 'pre';
      s.transformOrigin = '0 0';
      s.color = 'transparent';
      frag.appendChild(span);
      spans.push(span);
    }
    container.appendChild(frag);

    // Batch all width reads (one layout), then write transforms (no reads).
    const naturals = spans.map((sp) => sp.offsetWidth);
    for (let i = 0; i < spans.length; i++) {
      const target = segs[i].w * scale;
      if (naturals[i] > 0 && target > 0) spans[i].style.transform = `scaleX(${target / naturals[i]})`;
    }

    this.textLayerAllSpans.set(container, spans);
    if (this.searchHitsByPage.size > 0) {
      this.applyHighlightsForPage(pageNumber, container);
    }
  }

  /**
   * Build the page's substring-search index from per-segment strings — one
   * string per text-layer span, in span order (from {@link PdfTextSegment.text}).
   * Each is concatenated into a page-level string; the starting char index of
   * every segment is recorded so the highlighter can map a match's char
   * position back to its span (segment index ≡ span index).
   */
  private populateTextIndexFromStrings(pageNumber: number, strings: string[]): void {
    if (this.pageTextIndex.has(pageNumber)) return;
    const itemOffsets: number[] = [];
    let text = '';
    for (let i = 0; i < strings.length; i++) {
      itemOffsets.push(text.length);
      text += strings[i];
    }
    const idx: PdfPageTextIndex = { text, itemOffsets };
    this.pageTextIndex.set(pageNumber, idx);

    // Mirror to the engine. The handle may not be loaded yet — the
    // post-create catch-up loop in `loadDocument` flushes any pages we
    // populated before the handle arrived.
    this.mirrorPageToEngine(pageNumber, idx, strings);
  }

  /**
   * Push a page's text items into the engine handle. Re-entrant-safe: the
   * engine's `add_page` is an idempotent overwrite. When called from the
   * loadDocument catch-up loop we don't have the original `string[]`, so we
   * reconstruct from the cached `text` + `itemOffsets`.
   *
   * Stale-handle safe: `PdfSearchHandle.addPage` is a silent no-op after
   * `dispose()`, so a renderTextLayer that resolves after `disposeEngine-
   * Handle()` runs (doc-swap race) won't throw "null pointer passed to
   * rust" anymore — no try/catch needed here.
   */
  private mirrorPageToEngine(pageNumber: number, idx: PdfPageTextIndex, items?: readonly string[]): void {
    const handle = this.engineHandle;
    if (!handle) return;
    let strings: readonly string[];
    if (items) {
      strings = items;
    } else {
      // Reconstruct from offsets — the cache from a prior populate.
      const out = new Array<string>(idx.itemOffsets.length);
      for (let i = 0; i < idx.itemOffsets.length; i++) {
        const start = idx.itemOffsets[i];
        const end = i + 1 < idx.itemOffsets.length ? idx.itemOffsets[i + 1] : idx.text.length;
        out[i] = idx.text.slice(start, end);
      }
      strings = out;
    }
    handle.addPage(pageNumber - 1, strings); // engine uses 0-based page indices
  }

  private disposeEngineHandle(): void {
    if (this.engineHandle) {
      this.engineHandle.dispose();
      this.engineHandle = null;
    }
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
    // The page proxy or canvas may not be ready on this tick (the @for row
    // just rendered). Un-mark so the next intersection / install pass retries
    // instead of leaving the thumbnail permanently blank.
    if (!page) {
      this.renderedThumbs.delete(pageNumber);
      return;
    }
    const canvas = this.hostRef.nativeElement.querySelector<HTMLCanvasElement>(`canvas[data-thumb-page="${pageNumber}"]`);
    if (!canvas) {
      this.renderedThumbs.delete(pageNumber);
      requestAnimationFrame(() => {
        if (this.thumbnailsTabActive() && !this.renderedThumbs.has(pageNumber)) {
          this.renderedThumbs.add(pageNumber);
          void this.renderOneThumbnail(pageNumber);
        }
      });
      return;
    }

    const engine = this.pdfiumEngine;
    if (!engine || this.pdfiumDoc === null) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetWidth = 180;

    // Render the thumbnail off-thread, same as the main canvas (smaller width).
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const { bitmap, width, height } = await engine.renderPage(this.pdfiumDoc, pageNumber - 1, targetWidth, dpr).promise;
      // Bake the display rotation into the thumbnail raster so it matches the
      // main view. 90/270 swap the canvas dims; the CSS box then fits to a fixed
      // width preserving the (possibly landscape) aspect — no overflow.
      const deg = this.pageRotation(pageNumber);
      const swap = deg === 90 || deg === 270;
      canvas.width = swap ? height : width;
      canvas.height = swap ? width : height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.drawImage(bitmap, -width / 2, -height / 2);
      ctx.restore();
      bitmap.close();
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${Math.round((canvas.height / canvas.width) * targetWidth)}px`;
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
    // Build the template's node shape ({ title, items, pageIndex }) from the
    // engine's bookmark tree. `pageIndex` drives `outlineGoto`.
    if (!this.pdfiumEngine || this.pdfiumDoc === null) {
      this.outline.set([]);
      return;
    }
    try {
      const tree = await this.pdfiumEngine.outline(this.pdfiumDoc);
      const toNode = (n: PdfOutlineNode): unknown => ({ title: n.title, pageIndex: n.pageIndex, items: n.children.map(toNode) });
      this.outline.set(tree.map(toNode));
    } catch {
      this.outline.set([]);
    }
  }

  /**
   * Fetch embedded files. PDF.js returns an object keyed by filename or
   * `null`. We project to a flat list so the sidebar template stays simple.
   */
  private async fetchAttachments(): Promise<void> {
    if (!this.pdfiumEngine || this.pdfiumDoc === null) {
      this.attachments.set([]);
      return;
    }
    try {
      const files = await this.pdfiumEngine.attachments(this.pdfiumDoc);
      this.attachments.set(files.map((f) => ({ filename: f.name, description: '', content: f.bytes })));
    } catch {
      this.attachments.set([]);
    }
  }

  /**
   * Walk every page's annotation list and project user-facing entries.
   * Filters to subtypes the sidebar actually displays (highlights, free-text
   * notes, ink, stamps, comments). Form fields render via the
   * AnnotationLayer instead and aren't included here.
   */
  private async fetchAnnotations(): Promise<void> {
    if (this.pages.length === 0 || !this.pdfiumEngine || this.pdfiumDoc === null) {
      this.annotations.set([]);
      return;
    }
    // The engine already filters to displayable subtypes.
    try {
      const rows = await this.pdfiumEngine.documentAnnotations(this.pdfiumDoc);
      this.annotations.set(
        rows.map((r) => ({ pageNumber: r.pageIndex + 1, index: r.index, subtype: r.subtype, contents: r.contents.trim(), author: '' })),
      );
    } catch {
      this.annotations.set([]);
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
    // Extract text segments from the engine and index them.
    const segs = await this.pdfiumSegments(pageNumber);
    if (!segs) return null;
    this.populateTextIndexFromStrings(
      pageNumber,
      segs.map((s) => s.text),
    );
    return this.pageTextIndex.get(pageNumber) ?? null;
  }

  /**
   * Render the interactive overlay for one page — clickable links + fillable
   * form widgets. Annotation/form *appearances* are baked into the PDFium
   * raster; this layer only adds the live controls (see
   * {@link renderPdfiumOverlay}).
   */
  private async renderAnnotationLayer(container: HTMLElement, viewport: unknown, epoch: number, pageNumber: number): Promise<void> {
    await this.renderPdfiumOverlay(container, viewport, epoch, pageNumber);
  }

  /**
   * Render the PDFium interactive overlay for one page: clickable link hit
   * targets + fillable form widgets, positioned in CSS px (points × render
   * scale) over the rasterized canvas. Annotation/form *appearances* are baked
   * into the raster (`render_form_data`); this layer adds the live controls.
   */
  private async renderPdfiumOverlay(container: HTMLElement, viewport: unknown, epoch: number, pageNumber: number): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const pageIdx = pageNumber - 1;

    // Cached per page — a zoom re-render of the overlay doesn't re-hit the worker.
    const [links, fields] = await Promise.all([this.pdfiumLinks(pageNumber), this.pdfiumFields(pageNumber)]);
    if (epoch !== this.renderEpoch) return;

    container.replaceChildren();
    if (links.length === 0 && fields.length === 0) return;

    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return;
    const vw = (viewport as { width: number }).width;
    const scale = page.baseWidth > 0 ? vw / page.baseWidth : 1;
    const labels = this.labels();
    const frag = document.createDocumentFragment();

    // Links.
    for (const link of links) {
      const isUri = link.uri.length > 0;
      const el = document.createElement(isUri ? 'a' : 'button');
      el.className = 'hk-pdf-link';
      this.positionOverlayEl(el, link, scale);
      if (isUri) {
        const a = el as HTMLAnchorElement;
        a.href = link.uri;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', link.uri);
      } else {
        const target = link.pageIndex;
        el.setAttribute('type', 'button');
        el.setAttribute('aria-label', labels.thumbnailAriaLabel.replace('{page}', String(target + 1)));
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.goToPage(target + 1);
        });
      }
      frag.appendChild(el);
    }

    // Form widgets.
    for (const field of fields) {
      const el = this.buildFormWidget(field, doc, pageIdx, engine);
      if (!el) continue;
      this.positionOverlayEl(el, field, scale);
      el.style.pointerEvents = 'auto';
      frag.appendChild(el);
    }

    container.appendChild(frag);
  }

  /** Absolutely position an overlay element from a points rect × render scale. */
  private positionOverlayEl(el: HTMLElement, rect: { x: number; y: number; w: number; h: number }, scale: number): void {
    const s = el.style;
    // Form widgets style `input/select` don't set `position`; set it here so
    // the inline left/top take effect (links' `.hk-pdf-link` already does).
    s.position = 'absolute';
    s.left = `${rect.x * scale}px`;
    s.top = `${rect.y * scale}px`;
    s.width = `${rect.w * scale}px`;
    s.height = `${rect.h * scale}px`;
  }

  /**
   * Build the interactive HTML control for one PDFium form field. Text,
   * checkbox, radio, combo, and list all sync back to the engine on change
   * (`setFieldValue`, persisted by `save()`) and emit through the `formValues`
   * two-way binding. Returns `null` for types we don't render (push buttons,
   * signatures).
   */
  private buildFormWidget(field: PdfFormField, doc: PdfDocHandle, pageIdx: number, engine: PdfEngine): HTMLElement | null {
    const ariaLabel = field.name || 'form field';
    // Persist to the engine + mirror out through `formValues` (guarded so the
    // write-back effect doesn't echo it straight back into the field).
    const sync = (value: string) => {
      this.formValuesEmittedByUs = true;
      this.formValues.update((prev) => ({ ...prev, [field.name]: value }));
      // Fire-and-forget, but surface a pool-desync (mutation half-applied across
      // workers) instead of letting it become an unhandled rejection.
      void engine.setFieldValue(doc, pageIdx, field.name, value).catch((err: unknown) => {
        this.emitError({ code: 'render_failed', message: 'Failed to update form field.', recoverable: true, cause: err });
      });
      // Invalidate caches for this page: the field's stored value changed, and
      // the baked-in raster appearance is now stale (re-render re-rasterizes).
      this.pdfiumFieldsCache.delete(pageIdx + 1);
      this.invalidatePageBitmaps(pageIdx + 1);
    };

    switch (field.type) {
      case 'text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'hk-pdf-form-widget';
        input.value = field.value;
        input.disabled = field.readOnly;
        input.setAttribute('aria-label', ariaLabel);
        // 'change' (on blur) — one round-trip per edit, not per keystroke.
        input.addEventListener('change', () => sync(input.value));
        return input;
      }
      case 'checkbox': {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'hk-pdf-form-widget hk-pdf-form-check';
        input.checked = field.checked;
        input.disabled = field.readOnly;
        input.setAttribute('aria-label', ariaLabel);
        input.addEventListener('change', () => sync(input.checked ? 'true' : 'false'));
        return input;
      }
      case 'radio': {
        const input = document.createElement('input');
        input.type = 'radio';
        input.className = 'hk-pdf-form-widget hk-pdf-form-check';
        input.name = field.name;
        input.checked = field.checked;
        input.disabled = field.readOnly;
        input.setAttribute('aria-label', ariaLabel);
        input.addEventListener('change', () => sync('true'));
        return input;
      }
      case 'combo':
      case 'list': {
        const select = document.createElement('select');
        select.className = 'hk-pdf-form-widget';
        select.disabled = field.readOnly;
        select.setAttribute('aria-label', ariaLabel);
        for (const opt of field.options) {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (opt === field.value) o.selected = true;
          select.appendChild(o);
        }
        // Persists via the engine's choice-field setter (vendored pdfium-render patch).
        select.addEventListener('change', () => sync(select.value));
        return select;
      }
      default:
        return null; // button / signature
    }
  }

  /**
   * Cancel both the render task and the text-layer render for a single
   * page. Called by `applyBufferDiff`'s hysteresis pass when a page has
   * stayed out-of-buffer long enough that we should reclaim the worker.
   */
  private cancelPageWork(pageNumber: number): void {
    const task = this.renderTasksByPage.get(pageNumber);
    if (task) {
      try {
        task.cancel();
      } catch {
        /* ignore */
      }
      this.renderTasksByPage.delete(pageNumber);
    }
    const tl = this.textLayerTasksByPage.get(pageNumber);
    if (tl) {
      try {
        tl.cancel?.();
      } catch {
        /* ignore */
      }
      this.textLayerTasksByPage.delete(pageNumber);
    }
  }

  private cancelInflightRenders(): void {
    for (const handle of this.pendingCancellations.values()) clearTimeout(handle);
    this.pendingCancellations.clear();
    for (const t of this.renderTasksByPage.values()) {
      try {
        t.cancel();
      } catch {
        /* ignore */
      }
    }
    this.renderTasksByPage.clear();
    for (const tl of this.textLayerTasksByPage.values()) {
      try {
        tl.cancel?.();
      } catch {
        /* ignore */
      }
    }
    this.textLayerTasksByPage.clear();
  }

  // ── Zoom resolution ─────────────────────────────────────────────────────

  private computeScale(): number {
    const cfgZoom = this.internal?.state().zoomMode ?? this.config().zoom ?? 'fit-width';
    if (this.pages.length === 0) return 0;
    const first = this.pages[0];
    const vp = this.viewport()?.nativeElement;
    if (!vp) return typeof cfgZoom === 'number' ? cfgZoom : 1;

    // Cap the measured size by the window. If an ancestor lays the viewer out
    // content-driven (a flex/grid item defaults to `min-width: auto`, so the
    // track grows to fit a rotated, wider page), `vp.clientWidth` balloons —
    // and since we feed it back into the scale that sizes that very page, the
    // zoom runs away geometrically and crashes the renderer. The viewer is
    // never legitimately wider/taller than the window, so this only ever clamps
    // the runaway; normal layouts are unaffected.
    const doc = vp.ownerDocument?.documentElement;
    const winW = doc?.clientWidth || vp.clientWidth;
    const winH = doc?.clientHeight || vp.clientHeight;
    const availableWidth = Math.max(0, Math.min(vp.clientWidth, winW) - VIEWPORT_PAD_X);
    const availableHeight = Math.max(0, Math.min(vp.clientHeight, winH) - VIEWPORT_PAD_Y);

    if (typeof cfgZoom === 'number') return cfgZoom;
    if (cfgZoom === 'fit-width') return Math.min(FIT_ZOOM_MAX, availableWidth / first.baseWidth);
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
    // Out-of-range silently no-ops. The legitimate path (load completed,
    // page resolved to >= 1) always passes the lookup; an out-of-range
    // value here means we got called during a transient state (mid-load,
    // post-error) where there's nothing valid to scroll to anyway.
    if (page < 1) return;
    const wrapper = this.pageWrappers()[page - 1]?.nativeElement;
    if (!wrapper) return;
    const mode = this.internal?.state().mode ?? 'continuous';
    if (mode !== 'continuous') return;

    const vp = this.viewport()?.nativeElement;
    if (!vp) return;

    // Scroll ONLY our inner viewport — never `scrollIntoView`, which walks every
    // scrollable ancestor and yanks the whole document/page to surface the
    // viewer. Align the wrapper's top to the viewport's content-start (below its
    // top padding) by nudging scrollTop by the current rect delta.
    const padTop = parseFloat(getComputedStyle(vp).paddingTop) || 0;
    const delta = wrapper.getBoundingClientRect().top - vp.getBoundingClientRect().top - padTop;
    vp.scrollTo({ top: vp.scrollTop + delta, behavior: 'auto' });
  }

  /**
   * Scroll the sidebar thumbnail panel so the active page's thumbnail is in
   * view — but only when it's actually off-screen (block: 'nearest' semantics),
   * so it doesn't yank on every page tick. Confined to the panel; never scrolls
   * the outer document.
   */
  private scrollActiveThumbnailIntoView(page: number): void {
    const panel = this.thumbnailPanel()?.nativeElement;
    if (!panel) return;
    const item = panel.querySelector<HTMLCanvasElement>(`canvas[data-thumb-page="${page}"]`)?.closest('li');
    if (!item) return;
    const pRect = panel.getBoundingClientRect();
    const iRect = item.getBoundingClientRect();
    const MARGIN = 8;
    if (iRect.top < pRect.top) {
      panel.scrollTop += iRect.top - pRect.top - MARGIN;
    } else if (iRect.bottom > pRect.bottom) {
      panel.scrollTop += iRect.bottom - pRect.bottom + MARGIN;
    }
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
  setSidebarTab(tab: PdfSidebarTab): void {
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
  outlineGoto(node: { pageIndex?: number }): void {
    // Engine outline nodes carry a 0-based page index.
    if (typeof node?.pageIndex === 'number' && node.pageIndex >= 0) {
      this.goToPage(node.pageIndex + 1);
    }
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

    // Make sure every page's text is loaded. We always populate the JS
    // index here because the highlight painter still consults it for
    // text-layer span resolution. The engine, when present, has been
    // mirrored in lockstep via `populateTextIndex`.
    for (const page of this.pages) {
      await this.ensurePageTextIndex(page.pageNumber);
    }

    // Read find-bar toggles. Defaults match Acrobat: case-insensitive,
    // substring (not whole-word). Both threaded through to the WASM
    // engine and the JS fallback below.
    const s0 = this.state();
    const caseSensitive = s0?.searchCaseSensitive ?? false;
    const wholeWord = s0?.searchWholeWord ?? false;

    let hits: PdfSearchHit[];
    const handle = this.engineHandle;
    const engineHits = handle && !handle.isDisposed ? handle.search(q, { caseSensitive, wholeWord }) : null;
    if (engineHits) {
      hits = new Array(engineHits.length);
      for (let i = 0; i < engineHits.length; i++) {
        const h = engineHits[i];
        hits[i] = {
          pageNumber: h.page + 1, // engine uses 0-based; component uses 1-based
          charStart: h.charStart,
          length: h.charLen,
        };
      }
    } else {
      // JS fallback — per-page indexOf loop, with case + word-boundary
      // post-filter to match engine semantics when WASM isn't available.
      const needle = caseSensitive ? q : q.toLowerCase();
      const isWordChar = (ch: string) => /[\p{L}\p{N}_]/u.test(ch);
      hits = [];
      for (const page of this.pages) {
        const idx = this.pageTextIndex.get(page.pageNumber);
        if (!idx) continue;
        const haystack = caseSensitive ? idx.text : idx.text.toLowerCase();
        let from = 0;
        while (from <= haystack.length) {
          const found = haystack.indexOf(needle, from);
          if (found === -1) break;
          if (wholeWord) {
            const before = found > 0 ? idx.text[found - 1] : '';
            const after = found + q.length < idx.text.length ? idx.text[found + q.length] : '';
            const okLeft = !before || !isWordChar(before);
            const okRight = !after || !isWordChar(after);
            if (okLeft && okRight) {
              hits.push({ pageNumber: page.pageNumber, charStart: found, length: q.length });
            }
          } else {
            hits.push({ pageNumber: page.pageNumber, charStart: found, length: q.length });
          }
          from = found + Math.max(1, q.length);
        }
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

    // Centre the match in our viewport only — not via `scrollIntoView`, which
    // would also scroll the outer document.
    const vp = this.viewport()?.nativeElement;
    if (firstActive && vp) {
      const sRect = firstActive.getBoundingClientRect();
      const vpRect = vp.getBoundingClientRect();
      const delta = sRect.top - vpRect.top - (vp.clientHeight - sRect.height) / 2;
      vp.scrollTo({ top: vp.scrollTop + delta, behavior: 'auto' });
    }
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
    // Download the original bytes as-loaded. (`save`/`saveAndDownload` emit the
    // form-filled state via the engine.)
    if (!this.sourceBytes) return;
    const blob = new Blob([this.sourceBytes.slice().buffer], { type: 'application/pdf' });
    this.downloadBlob(blob, filename || this.deriveFilename());
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
   * Serialize the current document — including `setFieldValue` form edits —
   * into fresh PDF bytes via the engine's `save()`.
   */
  private async saveDocument(): Promise<Uint8Array> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) throw new Error('No PDF document loaded');
    // Bake display rotations into the saved bytes, then revert so the live
    // (CSS-rotated) view stays consistent.
    const rotations = [...this.pageRotations()].filter(([, r]) => r !== 0);
    let result: Uint8Array;
    try {
      // Apply rotations INSIDE the try so the finally always reverts them — even
      // if a mutation throws partway (e.g. a pool desync), we must not leave the
      // live doc rotated (it would double-rotate against the CSS display).
      for (const [n, r] of rotations) await engine.setPageRotation(doc, n - 1, r);
      result = await engine.save(doc);
    } finally {
      for (const [n] of rotations) {
        // Don't let a revert failure mask the save result/error above. A
        // desync here is surfaced but the already-produced bytes are returned.
        try {
          await engine.setPageRotation(doc, n - 1, 0);
        } catch (err) {
          this.emitError({ code: 'render_failed', message: 'Failed to restore page rotation after save.', recoverable: true, cause: err });
        }
        this.invalidatePageBitmaps(n); // drop any raster captured while rotated
      }
    }
    return result;
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

  /** Create an `<a download>` for a Blob, click it, and clean up. */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Rasterize a page to a PNG/JPEG and download it. Uses the off-thread PDFium
   * raster when active (at `scale`× natural size), else the pd​f.js proxy.
   */
  private async exportPageAsImage(options?: {
    page?: number;
    scale?: number;
    type?: 'image/png' | 'image/jpeg';
    quality?: number;
    filename?: string;
  }): Promise<void> {
    const pageNumber = options?.page ?? this.state()?.page ?? 1;
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return;
    const scale = options?.scale ?? 2;
    const type = options?.type ?? 'image/png';

    const engine = this.pdfiumEngine;
    if (!engine || this.pdfiumDoc === null) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // dpr=1: the requested device pixels are exactly baseWidth*scale.
    const { bitmap, width, height } = await engine.renderPage(this.pdfiumDoc, pageNumber - 1, page.baseWidth * scale, 1).promise;
    // Bake the display rotation into the exported image so it matches what the
    // user sees (rotation is CSS-only in the live view). 90/270 swap the canvas
    // dims; we rotate about the centre. deg=0 reduces to a plain drawImage(0,0).
    const deg = this.pageRotation(pageNumber);
    const swap = deg === 90 || deg === 270;
    canvas.width = swap ? height : width;
    canvas.height = swap ? width : height;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(bitmap, -width / 2, -height / 2);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, options?.quality));
    if (!blob) return;
    const ext = type === 'image/jpeg' ? 'jpg' : 'png';
    this.downloadBlob(blob, options?.filename || this.deriveFilename().replace(/\.pdf$/i, `-p${pageNumber}.${ext}`));
  }

  /** Extract the whole document's text and download it as `.txt`. */
  private async exportText(filename?: string): Promise<void> {
    if (this.pages.length === 0) return;
    const parts: string[] = [];
    for (const page of this.pages) {
      const idx = await this.ensurePageTextIndex(page.pageNumber);
      parts.push(idx?.text ?? '');
    }
    // Separate pages with a blank line; per-page text follows the PDF's runs.
    const blob = new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, filename || this.deriveFilename().replace(/\.pdf$/i, '.txt'));
  }

  private async print(): Promise<void> {
    // Print the current state (form-filled, via the engine when PDFium-active);
    // falls back to pd​f.js bytes. Engine-agnostic + works after pd​f.js removal.
    let data: Uint8Array;
    try {
      data = await this.saveDocument();
    } catch {
      return;
    }
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
    this.lastRenderScale = this.computeScale();
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      const zoomMode = this.internal?.state().zoomMode;
      if (zoomMode !== 'fit-width' && zoomMode !== 'fit-page' && zoomMode !== 'auto') return;
      // Gate on the *resolved scale*, not raw clientWidth/Height. Under
      // fit-width, a horizontal scrollbar appearing (e.g. after a page is
      // rotated to landscape) shrinks clientHeight but leaves the scale
      // unchanged — re-rendering on that churned the engine and could fragment
      // the wasm heap until a render OOM'd (PdfiumLibraryInternalError).
      const nextScale = this.computeScale();
      if (nextScale <= 0 || Math.abs(nextScale - this.lastRenderScale) < 1e-3) return;
      this.lastRenderScale = nextScale;
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
    this.clearBitmapCache();
    this.destroyPdfiumEngine();
    this.disposeEngineHandle();
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

  /**
   * Center the page stack vertically only when a single page is shown (single
   * mode, or a one-page document). In continuous multi-page mode we top-align so
   * a tall stack doesn't leave dead space below the first page while scrolling.
   */
  readonly centerPages = computed(() => {
    const s = this.state();
    if (!s) return false;
    return s.mode === 'single' || s.numPages <= 1;
  });

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
   * Toggle case-sensitive search. Re-runs the active query with the new
   * option so the match counter updates in place — matches Acrobat's
   * find-bar behavior.
   */
  toggleFindCaseSensitive(): void {
    this.internal?.state.update((s) => ({ ...s, searchCaseSensitive: !s.searchCaseSensitive }));
    const q = this.state()?.searchQuery ?? '';
    if (q) void this.runSearch(q);
  }

  /** Toggle whole-word-only search. Re-runs the active query if any. */
  toggleFindWholeWord(): void {
    this.internal?.state.update((s) => ({ ...s, searchWholeWord: !s.searchWholeWord }));
    const q = this.state()?.searchQuery ?? '';
    if (q) void this.runSearch(q);
  }

  /** True when the user has opted-in to case-sensitive find. Drives the toggle button's `btn-active` state. */
  isFindCaseSensitive(): boolean {
    return this.state()?.searchCaseSensitive ?? false;
  }

  /** True when the user has opted-in to whole-word-only find. */
  isFindWholeWord(): boolean {
    return this.state()?.searchWholeWord ?? false;
  }

  /** Click handler for an attachment row — triggers a browser download of the embedded file. */
  downloadAttachment(att: PdfAttachmentEntry): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const blob = new Blob([att.content as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Click handler for an annotation row — jumps to its page. */
  goToAnnotation(entry: PdfAnnotationEntry): void {
    this.goToPagePublic(entry.pageNumber);
  }

  /** Delete an existing annotation (from the sidebar list). */
  async deleteAnnotation(entry: PdfAnnotationEntry): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    try {
      await engine.deleteAnnotation(doc, entry.pageNumber - 1, entry.index);
      this.afterAnnotationChange(entry.pageNumber);
      await this.fetchAnnotations(); // indices shifted — refresh the list now
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to delete annotation.', recoverable: true, cause: err });
    }
  }

  // ── Page operations ──────────────────────────────────────────────────────

  /** Current display rotation (degrees) for a page. */
  pageRotation(pageNumber: number): number {
    return this.pageRotations().get(pageNumber) ?? 0;
  }

  /** Rotate a page by `delta` degrees (default +90). Display-only until `save()`
   *  bakes it in. The whole page group rotates together so overlays stay aligned. */
  rotatePage(pageNumber: number, delta = 90): void {
    this.pageRotations.update((m) => {
      const next = new Map(m);
      const r = ((((next.get(pageNumber) ?? 0) + delta) % 360) + 360) % 360;
      if (r === 0) next.delete(pageNumber);
      else next.set(pageNumber, r);
      return next;
    });
    // Re-rasterize this page's sidebar thumbnail so it reflects the new rotation.
    this.renderedThumbs.delete(pageNumber);
    if (this.thumbnailsTabActive()) {
      this.renderedThumbs.add(pageNumber);
      void this.renderOneThumbnail(pageNumber);
    }
  }

  /** Rotate the current page 90° clockwise (toolbar). */
  rotateCurrentPage(): void {
    const p = this.state()?.page;
    if (p) this.rotatePage(p, 90);
  }

  /** CSS transform for a page's rotor wrapper (`null` when unrotated). */
  pageRotorTransform(pageNumber: number): string | null {
    const r = this.pageRotation(pageNumber);
    return r ? `rotate(${r}deg)` : null;
  }

  /** Outer-box width for a 90/270-rotated page (swapped dims); `null` otherwise. */
  pageBoxWidth(pageNumber: number): number | null {
    const r = this.pageRotation(pageNumber);
    if (r !== 90 && r !== 270) return null;
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    return page ? page.baseHeight * this.computeScale() : null;
  }

  /** Outer-box height for a 90/270-rotated page (swapped dims); `null` otherwise. */
  pageBoxHeight(pageNumber: number): number | null {
    const r = this.pageRotation(pageNumber);
    if (r !== 90 && r !== 270) return null;
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    return page ? page.baseWidth * this.computeScale() : null;
  }

  /** Delete a page (1-based). No-op on the last remaining page. */
  async deletePage(pageNumber: number): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null || this.pages.length <= 1) return;
    try {
      await engine.deletePage(doc, pageNumber - 1);
      await this.refreshPageStructure();
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to delete page.', recoverable: true, cause: err });
    }
  }

  /** Insert a blank page so it becomes page `atPageNumber` (1-based; clamped).
   *  Size defaults to the neighbouring page (or US Letter). */
  async insertBlankPage(atPageNumber: number): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const idx = Math.max(0, Math.min(this.pages.length, atPageNumber - 1));
    const ref = this.pages[Math.min(idx, this.pages.length - 1)];
    const w = ref?.baseWidth ?? 612;
    const h = ref?.baseHeight ?? 792;
    try {
      await engine.insertBlankPage(doc, idx, w, h);
      await this.refreshPageStructure();
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to insert page.', recoverable: true, cause: err });
    }
  }

  /**
   * Rebuild the page model from the engine after a structural change (delete /
   * insert) — re-fetch count + sizes, reset caches + search index, re-render.
   * Reuses the open document (no re-parse).
   */
  private async refreshPageStructure(): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const token = ++this.loadToken; // invalidate in-flight renders of the old structure
    this.cancelInflightRenders();
    this.clearBitmapCache();
    this.pdfiumTextCache.clear();
    this.pdfiumLinksCache.clear();
    this.pdfiumFieldsCache.clear();
    this.pageTextIndex.clear();
    this.renderedThumbs.clear();
    this.pageRotations.set(new Map()); // page indices shifted — drop rotations
    this.disposeEngineHandle();
    this.annotations.set(null);
    this.outline.set(null); // bookmark page targets may have shifted

    const numPages = await engine.pageCount(doc);
    if (this.loadToken !== token) return;
    const pages: PageEntry[] = [];
    for (let i = 1; i <= numPages; i++) {
      const size = await engine.pageSize(doc, i - 1);
      pages.push({ pageNumber: i, baseWidth: size.width, baseHeight: size.height });
    }
    if (this.loadToken !== token) return;
    this.pages = pages;
    const cur = Math.max(1, Math.min(numPages, this.state()?.page ?? 1));
    this.internal?.state.update((s) => ({ ...s, page: cur, numPages }));
    this.pageNumbers.set(pages.map((p) => p.pageNumber));

    this.engineService
      .createIndex(numPages)
      .then((idx) => {
        if (this.loadToken !== token) {
          idx.dispose();
          return;
        }
        this.engineHandle?.dispose();
        this.engineHandle = idx;
      })
      .catch(() => {
        this.engineHandle = null;
      });

    void this.renderAll();
  }

  /** Edit an existing annotation's text/comment (prompts for new contents). */
  async editAnnotation(entry: PdfAnnotationEntry): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const raw = await this.promptText('Edit comment', entry.contents);
    if (raw == null) return; // cancelled
    try {
      await engine.setAnnotationContents(doc, entry.pageNumber - 1, entry.index, raw.trim());
      this.afterAnnotationChange(entry.pageNumber);
      await this.fetchAnnotations();
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to edit annotation.', recoverable: true, cause: err });
    }
  }

  // ── Annotation editing ────────────────────────────────────────────────────

  /** Select the active annotation tool (toolbar/controller). */
  setAnnotationTool(tool: PdfAnnotationTool): void {
    this.annotationTool.set(tool);
  }

  /** Toggle a tool: clicking the active tool turns editing off. */
  toggleAnnotationTool(tool: PdfAnnotationTool): void {
    this.annotationTool.update((cur) => (cur === tool ? 'none' : tool));
  }

  /** Set the colour (hex) used for new annotations. */
  setAnnotationColor(color: string): void {
    this.annotationColor.set(color);
  }

  /** Colour input handler (toolbar). */
  onAnnotationColorInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement | null)?.value;
    if (value) this.annotationColor.set(value);
  }

  /** Open the inline text editor; resolves with the entered text, or `null` if
   *  cancelled. Replaces `prompt()` for annotation text. */
  private promptText(label: string, value = ''): Promise<string | null> {
    this.textEditorResolve?.(null); // cancel any in-flight prompt
    this.textEditorDraft.set(value);
    this.textEditor.set({ label });
    return new Promise<string | null>((resolve) => {
      this.textEditorResolve = resolve;
    });
  }

  /** Commit the inline editor (Save). */
  saveTextEditor(): void {
    const resolve = this.textEditorResolve;
    const value = this.textEditorDraft();
    this.textEditorResolve = null;
    this.textEditor.set(null);
    resolve?.(value);
  }

  /** Dismiss the inline editor (Cancel / Escape / backdrop). */
  cancelTextEditor(): void {
    const resolve = this.textEditorResolve;
    this.textEditorResolve = null;
    this.textEditor.set(null);
    resolve?.(null);
  }

  /** Editor keyboard shortcuts: Esc cancels, Ctrl/⌘+Enter saves. */
  onTextEditorKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.cancelTextEditor();
    } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      this.saveTextEditor();
    }
  }

  /** Pointer-down on a page's edit layer — start a drag (rect tools) or drop a note. */
  onEditPointerDown(ev: PointerEvent, pageNumber: number): void {
    const tool = this.annotationTool();
    if (tool === 'none') return;
    ev.preventDefault();
    const layer = ev.currentTarget as HTMLElement;
    const { x, y } = this.pointerToLayer(layer, pageNumber, ev.clientX, ev.clientY);
    if (tool === 'note') {
      void this.commitNote(layer, pageNumber, x, y);
      return;
    }
    layer.setPointerCapture(ev.pointerId);
    if (tool === 'ink') {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'hk-pdf-edit-ink');
      const poly = document.createElementNS(NS, 'polyline');
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', this.annotationColor());
      poly.setAttribute('stroke-width', '2');
      poly.setAttribute('stroke-linecap', 'round');
      poly.setAttribute('stroke-linejoin', 'round');
      poly.setAttribute('points', `${x},${y}`);
      svg.appendChild(poly);
      layer.appendChild(svg);
      this.inkDraw = { layer, pageNumber, points: [x, y], svg, poly };
      return;
    }
    const preview = document.createElement('div');
    preview.className = 'hk-pdf-edit-preview';
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
    layer.appendChild(preview);
    this.editDrag = { layer, startX: x, startY: y, preview, pageNumber };
  }

  /** Pointer-move — grow the rectangle preview or extend the ink stroke. */
  onEditPointerMove(ev: PointerEvent): void {
    const ink = this.inkDraw;
    if (ink) {
      const p = this.pointerToLayer(ink.layer, ink.pageNumber, ev.clientX, ev.clientY);
      ink.points.push(p.x, p.y);
      let pts = '';
      for (let i = 0; i < ink.points.length; i += 2) pts += `${ink.points[i]},${ink.points[i + 1]} `;
      ink.poly.setAttribute('points', pts.trim());
      return;
    }
    const d = this.editDrag;
    if (!d) return;
    const { x, y } = this.pointerToLayer(d.layer, d.pageNumber, ev.clientX, ev.clientY);
    const s = d.preview.style;
    s.left = `${Math.min(d.startX, x)}px`;
    s.top = `${Math.min(d.startY, y)}px`;
    s.width = `${Math.abs(x - d.startX)}px`;
    s.height = `${Math.abs(y - d.startY)}px`;
  }

  /** Pointer-up — commit the rectangle (highlight / free-text) or ink stroke. */
  onEditPointerUp(ev: PointerEvent, pageNumber: number): void {
    const ink = this.inkDraw;
    if (ink) {
      this.inkDraw = null;
      ink.svg.remove();
      if (ink.points.length >= 4) void this.commitInk(ink.layer, pageNumber, ink.points);
      return;
    }
    const d = this.editDrag;
    if (!d) return;
    this.editDrag = null;
    const { x, y } = this.pointerToLayer(d.layer, d.pageNumber, ev.clientX, ev.clientY);
    const left = Math.min(d.startX, x);
    const top = Math.min(d.startY, y);
    const w = Math.abs(x - d.startX);
    const h = Math.abs(y - d.startY);
    d.preview.remove();
    if (w < 4 || h < 4) return; // ignore taps / tiny drags
    void this.commitRectAnnotation(this.annotationTool(), d.layer, pageNumber, left, top, w, h);
  }

  /**
   * Map a screen pointer position to the page's **unrotated** layer-local CSS
   * coordinates, inverting the rotor's CSS display rotation about the layer
   * centre. Annotations are stored in unrotated page space (rotation is
   * display-only until `save()` bakes `/Rotate`), so this places them where the
   * user drew on the rotated page — consistent in both the live view and the
   * saved file. For an unrotated page this reduces to `clientX - rect.left`.
   */
  private pointerToLayer(layer: HTMLElement, pageNumber: number, clientX: number, clientY: number): { x: number; y: number } {
    const r = layer.getBoundingClientRect();
    // Rotation about centre preserves the centre, so the bbox centre IS the
    // layer's true centre even when the layer is rotated.
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    // Inverse of the rotor's clockwise R(deg): local = R(-deg) · screenDelta.
    const local = inverseRotateDelta(dx, dy, this.pageRotation(pageNumber));
    // clientWidth/Height are the element's own (unrotated) box dims.
    return { x: layer.clientWidth / 2 + local.dx, y: layer.clientHeight / 2 + local.dy };
  }

  /** Points-per-CSS-pixel for a page's edit layer (engine wants PDF points). */
  private layerPointScale(layer: HTMLElement, pageNumber: number): number {
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page || layer.clientWidth <= 0) return 1;
    return page.baseWidth / layer.clientWidth;
  }

  /** Pack the active colour into `0xRRGGBBAA` (highlights are semi-transparent). */
  private annotationColorRgba(tool: PdfAnnotationTool): number {
    const hex = this.annotationColor().replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    const a = tool === 'highlight' ? 0x66 : 0xff;
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  }

  private async commitRectAnnotation(
    tool: PdfAnnotationTool,
    layer: HTMLElement,
    pageNumber: number,
    left: number,
    top: number,
    w: number,
    h: number,
  ): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const s = this.layerPointScale(layer, pageNumber);
    const color = this.annotationColorRgba(tool);
    try {
      if (tool === 'highlight') {
        await engine.addHighlight(doc, pageNumber - 1, left * s, top * s, w * s, h * s, color);
      } else if (tool === 'freetext') {
        const text = (await this.promptText('Text'))?.trim();
        if (!text) return;
        await engine.addFreeText(doc, pageNumber - 1, left * s, top * s, w * s, h * s, text, color);
      } else {
        return;
      }
      this.afterAnnotationChange(pageNumber);
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to add annotation.', recoverable: true, cause: err });
    }
  }

  private async commitNote(layer: HTMLElement, pageNumber: number, cssX: number, cssY: number): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const text = (await this.promptText('Note'))?.trim();
    if (!text) return;
    const s = this.layerPointScale(layer, pageNumber);
    try {
      await engine.addTextNote(doc, pageNumber - 1, cssX * s, cssY * s, text, this.annotationColorRgba('note'));
      this.afterAnnotationChange(pageNumber);
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to add note.', recoverable: true, cause: err });
    }
  }

  private async commitInk(layer: HTMLElement, pageNumber: number, cssPoints: number[]): Promise<void> {
    const engine = this.pdfiumEngine;
    const doc = this.pdfiumDoc;
    if (!engine || doc === null) return;
    const s = this.layerPointScale(layer, pageNumber);
    const points = cssPoints.map((v) => v * s); // CSS px → PDF points (top-left)
    const width = 2 * s; // ~2 CSS px stroke
    try {
      await engine.addInk(doc, pageNumber - 1, points, this.annotationColorRgba('ink'), width);
      this.afterAnnotationChange(pageNumber);
    } catch (err) {
      this.emitError({ code: 'render_failed', message: 'Failed to add ink.', recoverable: true, cause: err });
    }
  }

  /** After creating an annotation: drop the page's stale raster + re-render, and
   *  refresh the sidebar list. */
  private afterAnnotationChange(pageNumber: number): void {
    this.invalidatePageBitmaps(pageNumber);
    this.annotations.set(null); // re-fetch on next Annotations-tab view
    void this.renderAll();
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
