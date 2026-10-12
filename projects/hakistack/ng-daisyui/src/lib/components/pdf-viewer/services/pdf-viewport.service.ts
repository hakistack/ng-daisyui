import { DestroyRef, Injectable, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { BitmapCache } from '../core/bitmap-cache';
import { MAX_CANVAS_DIM, VIEWPORT_PAD_X, VIEWPORT_PAD_Y, fitDevicePixelRatio, isQuarterTurn, resolveZoomScale } from '../core/geometry';
import { PageLayout } from '../core/page-layout';
import { accumulateZoomRatio, anchoredScrollLeft, touchDistance, wheelZoomFactor } from '../core/zoom-gesture';
import { PdfPageEntry } from '../core/types';
import { PdfDisplayMode, PdfZoom } from '../pdf-viewer.types';
import { PdfFindService } from './pdf-find.service';
import { PdfLayersService } from './pdf-layers.service';
import { PDF_BITMAP_CACHE, PdfViewerStore } from './pdf-viewer.store';

/**
 * Pages within this many px of the viewport stay rendered (canvas, text layer,
 * overlay); the rest are evicted so the browser doesn't hold bitmaps and spans
 * nobody can see. At 800px the user reaches a freshly rendered page before
 * scrolling into a blank one.
 */
const LIVE_BUFFER_MARGIN_PX = 800;
/**
 * Pages within this many px stay mounted in the DOM. Larger than the live
 * buffer, so a page is mounted (and sized) before it needs rendering, and DOM
 * churn trails the scroll. Everything else is a spacer: a 5,000-page document
 * keeps a few dozen page nodes, not 5,000.
 */
const MOUNT_MARGIN_PX = 2400;
/** Hysteresis before cancelling an out-of-buffer render (ms), so brief scroll-pasts keep their work. */
const RENDER_CANCEL_HYSTERESIS_MS = 200;

interface RenderHandle {
  cancel: () => void;
  promise: Promise<unknown>;
}

/**
 * Reading position to restore after a zoom change: a page, how far down it
 * the anchored point was, and where in the viewport that point sat. Gesture
 * zoom also keeps the point under the pointer horizontally.
 */
interface ScrollAnchor {
  readonly index: number;
  readonly fraction: number;
  /** Distance of the anchored point from the viewport's top edge (px). */
  readonly viewportY: number;
  readonly horizontal?: { readonly scrollLeft: number; readonly viewportX: number };
}

/** An in-progress pinch / ctrl+wheel zoom, previewed with a CSS transform until it settles. */
interface ZoomGesture {
  readonly baseScale: number;
  ratio: number;
  clientX: number;
  clientY: number;
}

/** Quiet time after the last gesture event before the zoom is committed and re-rendered (ms). */
const GESTURE_COMMIT_MS = 150;
/** Quiet time after scrolling before the sharp detail tiles are updated (ms). */
const DETAIL_DEBOUNCE_MS = 120;
/** Extra area rendered around the visible part of a page, as a fraction of the visible size per side. */
const DETAIL_MARGIN = 0.25;

/** A region of a page in its CSS px. */
interface PageRegion {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The sharp tile shown over a page whose full raster had to be downscaled. */
interface DetailTile {
  readonly scale: number;
  readonly region: PageRegion;
  task: RenderHandle | null;
}

/**
 * The scrolling page area: page virtualization, rasterizing pages onto their
 * canvases, zoom resolution, and navigation.
 *
 * Virtualization is arithmetic, not observation: a {@link PageLayout} built
 * from page sizes and the zoom gives every page's position, so the visible
 * range, the live (rendered) buffer, the mounted window and the current page
 * all come from the scroll offset by binary search. Only the mounted window
 * exists in the DOM; spacers stand in for the rest and keep the scroll height
 * exact.
 */
@Injectable()
export class PdfViewportService {
  private readonly store = inject(PdfViewerStore);
  private readonly bitmaps = inject<BitmapCache<ImageBitmap>>(PDF_BITMAP_CACHE);
  private readonly layers = inject(PdfLayersService);
  // Back-edge (find → viewport for navigation): resolved lazily to avoid a DI cycle.
  private readonly injector = inject(Injector);
  private get find(): PdfFindService {
    return this.injector.get(PdfFindService);
  }

  /** Scroll container, registered by the page stack. */
  readonly viewportEl = signal<HTMLElement | null>(null);
  /** The page stack (flex column) inside the viewport, registered by the page stack. */
  readonly stackEl = signal<HTMLElement | null>(null);
  /** Mounted page wrappers by page number, registered by the page stack. */
  readonly pageWrappers = signal<ReadonlyMap<number, HTMLElement>>(new Map());

  /** Viewport scroll offset and height, updated at most once per frame. */
  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);
  /** Gap between pages, read from the stack's CSS. */
  private readonly gap = signal(16);

  private listenedViewport: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollRaf: number | null = null;
  private resizeRafHandle: number | null = null;
  /** Last fit-* scale rendered at; resize only re-renders when the resolved scale changes. */
  private lastRenderScale = 0;
  /** `pageNumbers` array the initial render ran for (one initial render per document / structure). */
  private initializedFor: readonly number[] | null = null;
  private lastMounted: ReadonlyMap<number, HTMLElement> = new Map();

  private readonly renderTasksByPage = new Map<number, RenderHandle>();
  /** Detail tiles by page (see {@link updateDetailTiles}). */
  private readonly detailTiles = new Map<number, DetailTile>();
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingCancellations = new Map<number, ReturnType<typeof setTimeout>>();
  /** Pages whose canvas + layers are currently populated. */
  readonly renderedPages = new Set<number>();
  /**
   * Pages mid-render. Concurrent buffer diffs share an epoch, so without this
   * they could both rasterize the same page. Claimed before awaiting, released
   * after; a parallel diff skips a claimed page.
   */
  private readonly inFlightPages = new Set<number>();
  /** Bumped per page when its content changes, so a raster that predates the edit isn't kept. */
  private readonly pageContentVersion = new Map<number, number>();

  /** Resolved CSS scale (px per point), published by `renderAll`. */
  readonly scale = computed(() => this.store.state()?.zoom ?? 1);

  private readonly isSingleMode = computed(() => this.store.state()?.mode === 'single');
  private readonly isSpreadMode = computed(() => {
    const mode = this.store.state()?.mode;
    return mode === 'spread' || mode === 'spread-cover';
  });

  /** Pages grouped into rows: one per row, or two side by side in the spread modes. */
  readonly rows = computed<readonly (readonly number[])[]>(() => {
    const numbers = this.store.pageNumbers();
    const mode = this.store.state()?.mode;
    if (mode !== 'spread' && mode !== 'spread-cover') return numbers.map((n) => [n]);
    const rows: number[][] = [];
    let i = 0;
    if (mode === 'spread-cover' && numbers.length > 0) rows.push([numbers[i++]]);
    for (; i < numbers.length; i += 2) rows.push(numbers.slice(i, i + 2));
    return rows;
  });

  /** Row index of each page (`[pageNumber - 1]`). */
  private readonly rowOfPage = computed(() => {
    const rows = this.rows();
    const index = new Int32Array(this.store.pageNumbers().length);
    rows.forEach((row, r) => row.forEach((n) => (index[n - 1] = r)));
    return index;
  });

  /** Row positions at the current scale and rotations (a row is as tall as its tallest page). */
  readonly layout = computed(() => {
    const scale = this.scale();
    const rotations = this.store.pageRotations();
    const pageHeight = (n: number) => {
      const p = this.store.pages[n - 1];
      return p ? (isQuarterTurn(rotations.get(n) ?? 0) ? p.baseWidth : p.baseHeight) * scale : 0;
    };
    return new PageLayout(
      this.rows().map((row) => Math.max(...row.map(pageHeight))),
      this.gap(),
    );
  });

  /** Pages to keep rendered. In single mode: the current page ± 1 (pre-rendered for instant Prev/Next). */
  private readonly liveBuffer = computed<ReadonlySet<number>>(() => this.pagesNearViewport(LIVE_BUFFER_MARGIN_PX));

  /** Rows mounted in the DOM, in order (their pages are a superset of the live buffer). */
  readonly mountedRows = computed<readonly { readonly key: number; readonly pages: readonly number[] }[]>(() => {
    const rows = this.rows();
    const [first, last] = this.rowRangeNearViewport(MOUNT_MARGIN_PX) ?? [0, -1];
    const out: { key: number; pages: readonly number[] }[] = [];
    for (let r = first; r <= last; r++) out.push({ key: rows[r][0], pages: rows[r] });
    return out;
  });

  /** Pages mounted in the DOM, in order. */
  readonly mountedPages = computed<number[]>(() => this.mountedRows().flatMap((row) => [...row.pages]));

  /** Spacer heights standing in for unmounted pages above and below the window (continuous mode). */
  readonly spacerBefore = computed(() => this.spacer('before'));
  readonly spacerAfter = computed(() => this.spacer('after'));

  constructor() {
    // Once the page stack exists for a document (or a new page structure),
    // wire scroll/resize tracking, render, and scroll to the current page.
    effect(() => {
      const numbers = this.store.pageNumbers();
      const vp = this.viewportEl();
      const stack = this.stackEl();
      if (numbers.length === 0 || !vp || !stack) return;
      untracked(() => {
        this.listen(vp, stack);
        if (this.initializedFor === numbers) return;
        this.initializedFor = numbers;
        void this.renderAll().then(() => this.scrollToPage(this.store.snapshot()?.page ?? 1));
      });
    });

    // Keep the live buffer rendered as it changes.
    effect(() => {
      this.liveBuffer();
      untracked(() => void this.applyBufferDiff(this.store.renderEpoch));
    });

    // Pages entering the DOM need rendering; pages leaving it took their
    // canvas and layers with them, so forget them.
    effect(() => {
      const mounted = this.pageWrappers();
      untracked(() => {
        for (const [n, wrapper] of this.lastMounted) {
          if (mounted.get(n) === wrapper) continue;
          this.renderedPages.delete(n);
          this.cancelPageWork(n);
          this.dropDetail(n);
          const textLayer = wrapper.querySelector<HTMLElement>('.hk-pdf-text-layer');
          if (textLayer) this.find.forgetTextLayer(textLayer);
        }
        this.lastMounted = mounted;
        void this.applyBufferDiff(this.store.renderEpoch);
      });
    });

    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /** Wrapper element for a page, or `null` if it isn't mounted. */
  wrapperFor(pageNumber: number): HTMLElement | null {
    return this.pageWrappers().get(pageNumber) ?? null;
  }

  /** Forget per-document render state (new document or structural change). */
  resetForDocument(): void {
    this.cancelInflightRenders();
    this.bitmaps.clear();
    this.renderedPages.clear();
    this.inFlightPages.clear();
    this.pageContentVersion.clear();
  }

  // ── Windowing ───────────────────────────────────────────────────────────

  /** Distance from the viewport's scroll origin to the top of the page stack. */
  private stackOffset(): number {
    return this.stackEl()?.offsetTop ?? 0;
  }

  /**
   * Rows intersecting the viewport extended by `margin` px above and below.
   * Single mode: the current page's row ± 1 (non-current pages are hidden;
   * pre-rendering the neighbours makes Prev/Next instant).
   */
  private rowRangeNearViewport(margin: number): [first: number, last: number] | null {
    const s = this.store.state();
    const count = this.rows().length;
    if (!s || count === 0) return null;
    if (this.isSingleMode()) {
      if (s.page <= 0) return null;
      const r = this.rowOfPage()[s.page - 1];
      return [Math.max(0, r - 1), Math.min(count - 1, r + 1)];
    }
    const top = this.scrollTop() - this.stackOffset();
    return this.layout().range(top - margin, top + this.viewportHeight() + margin);
  }

  /** Pages of the rows within `margin` px of the viewport. */
  private pagesNearViewport(margin: number): Set<number> {
    const range = this.rowRangeNearViewport(margin);
    const set = new Set<number>();
    if (!range) return set;
    const rows = this.rows();
    for (let r = range[0]; r <= range[1]; r++) for (const n of rows[r]) set.add(n);
    return set;
  }

  private spacer(side: 'before' | 'after'): number {
    if (this.isSingleMode()) return 0;
    const range = this.rowRangeNearViewport(MOUNT_MARGIN_PX);
    if (!range) return 0;
    const layout = this.layout();
    return side === 'before' ? layout.spacerBefore(range[0]) : layout.spacerAfter(range[1]);
  }

  /** Single mode hides every row but the current page's. */
  rowHidden(pages: readonly number[]): boolean {
    const s = this.store.state();
    return !!s && s.mode === 'single' && !pages.includes(s.page);
  }

  /** Page sizes in CSS px at the current scale (unrotated; the rotor turns them). */
  pageCssWidth(pageNumber: number): number {
    return (this.store.findPage(pageNumber)?.baseWidth ?? 0) * this.scale();
  }

  pageCssHeight(pageNumber: number): number {
    return (this.store.findPage(pageNumber)?.baseHeight ?? 0) * this.scale();
  }

  // ── Zoom & navigation ───────────────────────────────────────────────────

  /** Resolve the active zoom to a CSS scale (0 when nothing is loaded). */
  computeScale(): number {
    const zoom = this.store.snapshot()?.zoomMode ?? this.store.config().zoom ?? 'fit-width';
    const first = this.store.pages[0];
    if (!first) return 0;
    const vp = this.viewportEl();
    if (!vp) return typeof zoom === 'number' ? zoom : 1;
    // Cap the measured size by the window. If an ancestor lays the viewer out
    // content-driven (a flex/grid item defaults to `min-width: auto`), a wide
    // rotated page grows `vp.clientWidth`, which feeds back into the scale that
    // sizes that page and runs away. The viewer is never legitimately larger
    // than the window, so this only ever clamps the runaway.
    const doc = vp.ownerDocument?.documentElement;
    const winW = doc?.clientWidth || vp.clientWidth;
    const winH = doc?.clientHeight || vp.clientHeight;
    const available = {
      width: Math.max(0, Math.min(vp.clientWidth, winW) - VIEWPORT_PAD_X),
      height: Math.max(0, Math.min(vp.clientHeight, winH) - VIEWPORT_PAD_Y),
    };
    if (this.isSpreadMode()) {
      // Fit a full two-page row: both widths side by side, less the gap between them.
      const row = this.rows().find((r) => r.length > 1) ?? this.rows()[0];
      const pages = row.map((n) => this.store.pages[n - 1]).filter((p): p is PdfPageEntry => !!p);
      const spread: PdfPageEntry = {
        pageNumber: row[0],
        baseWidth: pages.reduce((w, p) => w + p.baseWidth, 0),
        baseHeight: Math.max(...pages.map((p) => p.baseHeight)),
      };
      return resolveZoomScale(zoom, { ...available, width: Math.max(0, available.width - this.gap() * (pages.length - 1)) }, spread);
    }
    return resolveZoomScale(zoom, available, first);
  }

  goToPage(page: number): void {
    const numPages = this.store.snapshot()?.numPages ?? 0;
    if (numPages === 0) return;
    const target = Math.max(1, Math.min(numPages, Math.floor(page)));
    this.store.patchState((s) => ({ ...s, page: target }));
    this.store.notifyPageChange(target);
    this.scrollToPage(target);
  }

  /**
   * Scroll only our viewport (never `scrollIntoView`, which also scrolls every
   * ancestor) so the page's top meets the viewport's content start. Works for
   * unmounted pages too: the position comes from the layout. Continuous mode
   * only; single mode shows the page by hiding the others.
   */
  scrollToPage(page: number): void {
    if (page < 1 || page > this.store.pages.length || this.isSingleMode()) return;
    const vp = this.viewportEl();
    if (!vp) return;
    this.scrollViewportTo(vp, this.stackOffset() + this.layout().top(this.rowOfPage()[page - 1]) - paddingTop(vp));
  }

  /** Next page; in the spread modes, the first page of the next row. */
  nextPage(): void {
    this.goToPage(this.pageInRowOffset(1));
  }

  previousPage(): void {
    this.goToPage(this.pageInRowOffset(-1));
  }

  /** The page `delta` steps away; in the spread modes, the first page of the row `delta` rows away. */
  private pageInRowOffset(delta: number): number {
    const page = this.store.snapshot()?.page ?? 0;
    if (!this.isSpreadMode() || page < 1) return page + delta;
    const rows = this.rows();
    const target = this.rowOfPage()[page - 1] + delta;
    return target < 0 || target >= rows.length ? page + delta : rows[target][0];
  }

  firstPage(): void {
    this.goToPage(1);
  }

  lastPage(): void {
    this.goToPage(this.store.snapshot()?.numPages ?? 1);
  }

  /** Step zoom by 25%, within 25%–500%. */
  zoomIn(): void {
    this.setZoom(Math.min(5, (this.store.snapshot()?.zoom ?? 1) + 0.25));
  }

  zoomOut(): void {
    this.setZoom(Math.max(0.25, (this.store.snapshot()?.zoom ?? 1) - 0.25));
  }

  /** Back to the consumer's configured zoom. */
  resetZoom(): void {
    this.setZoom(this.store.config().zoom ?? 'fit-width');
  }

  /** Change zoom, keeping the same point of the same page at the top of the viewport. */
  setZoom(zoom: PdfZoom): void {
    this.applyZoom(zoom, this.captureAnchor());
  }

  private applyZoom(zoom: PdfZoom, anchor: ScrollAnchor | null): void {
    this.store.patchState((s) => ({ ...s, zoomMode: zoom }));
    void this.renderAll();
    this.restoreAnchorAfterRender(anchor);
  }

  /** Switching between one- and two-page rows changes the fit scale, so re-render. */
  setMode(mode: PdfDisplayMode): void {
    const wasSpread = this.isSpreadMode();
    this.store.patchState((s) => ({ ...s, mode }));
    if (wasSpread !== this.isSpreadMode()) void this.renderAll();
    requestAnimationFrame(() => this.scrollToPage(this.store.snapshot()?.page ?? 1));
  }

  /** Outer-box size for a 90°/270°-rotated page (dimensions swap); `null` otherwise. */
  pageBoxWidth(pageNumber: number): number | null {
    return this.rotatedBoxSide(pageNumber, (p) => p.baseHeight);
  }

  pageBoxHeight(pageNumber: number): number | null {
    return this.rotatedBoxSide(pageNumber, (p) => p.baseWidth);
  }

  private rotatedBoxSide(pageNumber: number, side: (p: PdfPageEntry) => number): number | null {
    if (!isQuarterTurn(this.store.pageRotation(pageNumber))) return null;
    const page = this.store.findPage(pageNumber);
    return page ? side(page) * this.scale() : null;
  }

  /** CSS transform for a page's rotor (`null` when unrotated). */
  pageRotorTransform(pageNumber: number): string | null {
    const r = this.store.pageRotation(pageNumber);
    return r ? `rotate(${r}deg)` : null;
  }

  /**
   * Anchor the point at `viewportY` px from the viewport's top (default: the
   * content start below the padding): which page it's on and how far down it.
   */
  private captureAnchor(viewportY?: number, viewportX?: number): ScrollAnchor | null {
    const vp = this.viewportEl();
    const layout = this.layout();
    if (!vp || this.isSingleMode() || layout.count === 0) return null;
    const anchorY = viewportY ?? paddingTop(vp);
    const y = vp.scrollTop - this.stackOffset() + anchorY;
    const index = layout.indexAt(y);
    const height = layout.height(index);
    return {
      index,
      fraction: height > 0 ? Math.max(0, Math.min(1, (y - layout.top(index)) / height)) : 0,
      viewportY: anchorY,
      horizontal: viewportX === undefined ? undefined : { scrollLeft: vp.scrollLeft, viewportX },
    };
  }

  /** After the new zoom has laid out (spacers resized), scroll so the anchored point is back in place. */
  private restoreAnchorAfterRender(anchor: ScrollAnchor | null, factor = 1): void {
    if (!anchor) return;
    afterNextRender(
      () => {
        const vp = this.viewportEl();
        const layout = this.layout();
        if (!vp || anchor.index >= layout.count) return;
        const y = layout.top(anchor.index) + anchor.fraction * layout.height(anchor.index);
        if (anchor.horizontal) vp.scrollLeft = anchoredScrollLeft(anchor.horizontal.scrollLeft, anchor.horizontal.viewportX, factor);
        this.scrollViewportTo(vp, this.stackOffset() + y - anchor.viewportY);
      },
      { injector: this.injector },
    );
  }

  // ── Gesture zoom (pinch, ctrl/⌘ + wheel) ────────────────────────────────

  private gesture: ZoomGesture | null = null;
  private gestureTimer: ReturnType<typeof setTimeout> | null = null;
  /** Touch pinch: distance between the fingers and the gesture ratio when it started. */
  private pinchStart: { distance: number; ratio: number } | null = null;
  /** Safari gesture events: the ratio when the gesture started (`event.scale` is cumulative). */
  private safariGestureStartRatio = 1;

  /**
   * Scale the in-progress gesture by `factor` around the client point. The
   * stack is previewed with a CSS transform (instant, no re-raster); the zoom
   * commits once the gesture has been quiet for {@link GESTURE_COMMIT_MS}.
   */
  private zoomGesture(factor: number, clientX: number, clientY: number): void {
    const stack = this.stackEl();
    if (!stack || this.store.pages.length === 0) return;
    const baseScale = this.gesture?.baseScale ?? this.scale();
    const g = (this.gesture ??= { baseScale, ratio: 1, clientX, clientY });
    g.ratio = accumulateZoomRatio(g.ratio, factor, baseScale);
    g.clientX = clientX;
    g.clientY = clientY;
    const rect = stack.getBoundingClientRect();
    stack.style.transformOrigin = `${clientX - rect.left}px ${clientY - rect.top}px`;
    stack.style.transform = `scale(${g.ratio})`;
    if (this.gestureTimer !== null) clearTimeout(this.gestureTimer);
    this.gestureTimer = setTimeout(() => this.commitGesture(), GESTURE_COMMIT_MS);
  }

  /** Drop the preview transform and zoom for real, keeping the gesture point under the pointer. */
  private commitGesture(): void {
    if (this.gestureTimer !== null) clearTimeout(this.gestureTimer);
    this.gestureTimer = null;
    const g = this.gesture;
    this.gesture = null;
    const stack = this.stackEl();
    if (stack) {
      stack.style.transform = '';
      stack.style.transformOrigin = '';
    }
    const vp = this.viewportEl();
    if (!g || !vp || Math.abs(g.ratio - 1) < 0.01) return;
    const rect = vp.getBoundingClientRect();
    const anchor = this.captureAnchor(g.clientY - rect.top, g.clientX - rect.left);
    this.store.patchState((s) => ({ ...s, zoomMode: g.baseScale * g.ratio }));
    void this.renderAll();
    this.restoreAnchorAfterRender(anchor, g.ratio);
  }

  private readonly onWheel = (e: WheelEvent): void => {
    if (!(e.ctrlKey || e.metaKey)) return; // plain wheel scrolls
    e.preventDefault(); // keep the browser from zooming the whole page
    this.zoomGesture(wheelZoomFactor(e.deltaY, e.deltaMode), e.clientX, e.clientY);
  };

  private readonly onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 2) return;
    this.pinchStart = { distance: touchDistance(e.touches[0], e.touches[1]), ratio: this.gesture?.ratio ?? 1 };
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    const start = this.pinchStart;
    if (!start || e.touches.length !== 2 || start.distance === 0) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const target = start.ratio * (touchDistance(a, b) / start.distance);
    this.zoomGesture(target / (this.gesture?.ratio ?? 1), (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
  };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) this.pinchStart = null;
  };

  // Safari (macOS trackpad, iOS) reports pinches as proprietary gesture events with a cumulative `scale`.
  private readonly onGestureStart = (e: Event): void => {
    e.preventDefault();
    this.safariGestureStartRatio = this.gesture?.ratio ?? 1;
  };

  private readonly onGestureChange = (e: Event): void => {
    e.preventDefault();
    const { scale, clientX, clientY } = e as Event & { scale: number; clientX: number; clientY: number };
    const target = this.safariGestureStartRatio * scale;
    this.zoomGesture(target / (this.gesture?.ratio ?? 1), clientX, clientY);
  };

  private scrollViewportTo(vp: HTMLElement, top: number): void {
    vp.scrollTo({ top, behavior: 'auto' });
    this.scrollTop.set(vp.scrollTop); // update the window now, not a frame later
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  /**
   * Re-baseline at the current zoom: cancel in-flight work, publish the
   * resolved scale (the template sizes every mounted page from it, so layout
   * is stable before any pixel paints), evict rendered pages (wrong scale
   * now), then render the live buffer.
   */
  async renderAll(): Promise<void> {
    this.cancelInflightRenders();
    const epoch = ++this.store.renderEpoch;

    const scale = this.computeScale();
    if (scale <= 0) return;
    this.lastRenderScale = scale;
    this.store.patchState((s) => ({ ...s, zoom: scale }));

    for (const num of Array.from(this.renderedPages)) this.evictPage(num);
    this.renderedPages.clear();
    for (const n of Array.from(this.detailTiles.keys())) this.dropDetail(n);

    await this.applyBufferDiff(epoch);
  }

  /**
   * Reconcile rendered pages with the live buffer: evict pages that left it,
   * cancel (after hysteresis) renders that scrolled out, and render pages that
   * entered it, one at a time.
   */
  async applyBufferDiff(epoch: number): Promise<void> {
    if (epoch !== this.store.renderEpoch) return;
    if (this.store.pages.length === 0) return;

    const buffer = this.liveBuffer();
    const wrappers = this.pageWrappers();
    const scale = this.store.snapshot()?.zoom ?? this.computeScale();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    for (const num of Array.from(this.renderedPages)) {
      if (!buffer.has(num) && !this.inFlightPages.has(num)) {
        this.evictPage(num);
        this.renderedPages.delete(num);
      }
    }

    // A page mid-render that scrolled out keeps a worker busy with a bitmap
    // nobody will see. Cancel it after a short hysteresis.
    for (const num of this.inFlightPages) {
      if (buffer.has(num) || this.pendingCancellations.has(num)) continue;
      const handle = setTimeout(() => {
        this.pendingCancellations.delete(num);
        if (!this.liveBuffer().has(num)) this.cancelPageWork(num);
      }, RENDER_CANCEL_HYSTERESIS_MS);
      this.pendingCancellations.set(num, handle);
    }
    for (const num of Array.from(this.pendingCancellations.keys())) {
      if (buffer.has(num)) {
        clearTimeout(this.pendingCancellations.get(num)!);
        this.pendingCancellations.delete(num);
      }
    }

    const todo = this.store.pages.filter(
      (p) => buffer.has(p.pageNumber) && !this.renderedPages.has(p.pageNumber) && !this.inFlightPages.has(p.pageNumber),
    );
    let staleAfterRender = false;
    for (const page of todo) {
      if (epoch !== this.store.renderEpoch) return;
      if (this.renderedPages.has(page.pageNumber) || this.inFlightPages.has(page.pageNumber)) continue;
      const canvas = wrappers.get(page.pageNumber)?.querySelector<HTMLCanvasElement>('canvas');
      if (!canvas) continue; // not mounted (yet); the wrappers effect re-runs the diff on mount

      this.inFlightPages.add(page.pageNumber);
      const version = this.pageContentVersion.get(page.pageNumber) ?? 0;
      try {
        await this.renderPageOnto(page, canvas, scale, dpr, epoch);
        // An edit that landed mid-render bumps the version: that raster may
        // predate the edit, so leave the page unrendered for another pass.
        if (epoch === this.store.renderEpoch && version === (this.pageContentVersion.get(page.pageNumber) ?? 0)) {
          this.renderedPages.add(page.pageNumber);
        } else if (epoch === this.store.renderEpoch) {
          staleAfterRender = true;
        }
      } finally {
        this.inFlightPages.delete(page.pageNumber);
      }

      // Reveal the stack once any page has painted.
      if (epoch === this.store.renderEpoch && !this.store.firstRenderComplete()) {
        this.store.firstRenderComplete.set(true);
      }
    }
    if (staleAfterRender) await this.applyBufferDiff(epoch);
    if (this.mayNeedDetailTiles()) this.scheduleDetailTiles();
  }

  // ── Detail tiles (zoom beyond the canvas limit) ─────────────────────────

  /**
   * At zooms where a page's full raster would exceed {@link MAX_CANVAS_DIM},
   * `renderPageOnto` downscales it (soft). To keep what's on screen sharp, the
   * visible part of each such page (plus a margin) is rendered at full
   * resolution as one tile, drawn into the page's detail canvas on top of the
   * base raster. Scrolling within the tile's margin reuses it; scrolling past
   * re-renders it. Rotated pages keep the downscaled raster.
   */
  /** Longest page side in points, for a cheap "could any page exceed the canvas limit?" check. */
  private readonly largestPageSide = computed(() => {
    this.store.pageNumbers();
    return this.store.pages.reduce((max, p) => Math.max(max, p.baseWidth, p.baseHeight), 0);
  });

  private mayNeedDetailTiles(): boolean {
    return this.largestPageSide() * this.scale() * Math.max(1, window.devicePixelRatio || 1) > MAX_CANVAS_DIM;
  }

  private scheduleDetailTiles(): void {
    if (this.detailTimer !== null) clearTimeout(this.detailTimer);
    this.detailTimer = setTimeout(() => {
      this.detailTimer = null;
      this.updateDetailTiles();
    }, DETAIL_DEBOUNCE_MS);
  }

  private updateDetailTiles(): void {
    const vp = this.viewportEl();
    const session = this.store.session();
    if (!vp || !session) return;
    const scale = this.scale();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const vpRect = vp.getBoundingClientRect();

    for (const [n, wrapper] of this.pageWrappers()) {
      const page = this.store.findPage(n);
      const base = wrapper.querySelector<HTMLCanvasElement>('canvas:not(.hk-pdf-detail)');
      const detail = wrapper.querySelector<HTMLCanvasElement>('canvas.hk-pdf-detail');
      if (!page || !base || !detail) continue;
      const cssW = page.baseWidth * scale;
      const cssH = page.baseHeight * scale;
      const needsDetail = Math.max(cssW, cssH) * dpr > MAX_CANVAS_DIM && this.store.pageRotation(n) === 0 && this.renderedPages.has(n);
      if (!needsDetail) {
        this.dropDetail(n);
        continue;
      }

      // The visible part of the page, in page CSS px.
      const r = base.getBoundingClientRect();
      const visible: PageRegion = {
        left: Math.max(vpRect.left, r.left) - r.left,
        top: Math.max(vpRect.top, r.top) - r.top,
        right: Math.min(vpRect.right, r.right) - r.left,
        bottom: Math.min(vpRect.bottom, r.bottom) - r.top,
      };
      if (visible.right <= visible.left || visible.bottom <= visible.top) {
        this.dropDetail(n);
        continue;
      }
      const current = this.detailTiles.get(n);
      if (current && current.scale === scale && covers(current.region, visible)) continue;

      // Visible part plus a margin, clamped to the page and to the canvas limit.
      const mx = (visible.right - visible.left) * DETAIL_MARGIN;
      const my = (visible.bottom - visible.top) * DETAIL_MARGIN;
      const maxCss = MAX_CANVAS_DIM / dpr;
      const left = Math.max(0, visible.left - mx);
      const top = Math.max(0, visible.top - my);
      const region: PageRegion = {
        left,
        top,
        right: Math.min(cssW, visible.right + mx, left + maxCss),
        bottom: Math.min(cssH, visible.bottom + my, top + maxCss),
      };
      const tile = {
        pageWidth: Math.round(cssW * dpr),
        pageHeight: Math.round(cssH * dpr),
        x: Math.floor(region.left * dpr),
        y: Math.floor(region.top * dpr),
        width: Math.max(1, Math.ceil((region.right - region.left) * dpr)),
        height: Math.max(1, Math.ceil((region.bottom - region.top) * dpr)),
      };

      current?.task?.cancel();
      const task = session.engine.renderTile(session.doc, n - 1, tile, 'high');
      const entry: DetailTile = { scale, region, task: { cancel: task.cancel, promise: task.promise } };
      this.detailTiles.set(n, entry);
      task.promise.then(
        ({ bitmap, width, height }) => {
          if (this.detailTiles.get(n) !== entry || this.scale() !== scale) {
            bitmap.close(); // superseded
            return;
          }
          entry.task = null;
          detail.width = width;
          detail.height = height;
          detail.style.left = `${tile.x / dpr}px`;
          detail.style.top = `${tile.y / dpr}px`;
          detail.style.width = `${width / dpr}px`;
          detail.style.height = `${height / dpr}px`;
          detail.getContext('2d')?.drawImage(bitmap, 0, 0);
          bitmap.close();
          detail.hidden = false;
        },
        () => undefined, // cancelled or failed: the downscaled base raster stays visible
      );
    }
  }

  /** Cancel and hide a page's detail tile. */
  private dropDetail(pageNumber: number): void {
    const entry = this.detailTiles.get(pageNumber);
    if (!entry) return;
    entry.task?.cancel();
    this.detailTiles.delete(pageNumber);
    const detail = this.wrapperFor(pageNumber)?.querySelector<HTMLCanvasElement>('canvas.hk-pdf-detail');
    if (detail) {
      detail.hidden = true;
      detail.width = 1; // free the backing store
      detail.height = 1;
    }
  }

  /**
   * Re-rasterize one page after its content changed. Only that page is
   * redrawn; pages outside the buffer just drop their bitmaps and render fresh
   * when they scroll back in.
   */
  rerenderPage(pageNumber: number): void {
    this.pageContentVersion.set(pageNumber, (this.pageContentVersion.get(pageNumber) ?? 0) + 1);
    this.bitmaps.invalidatePage(pageNumber);
    this.renderedPages.delete(pageNumber);
    if (this.liveBuffer().has(pageNumber)) void this.applyBufferDiff(this.store.renderEpoch);
  }

  /** Drop a page's cached bitmaps (its baked appearance changed) without re-rendering now. */
  invalidatePageBitmaps(pageNumber: number): void {
    this.bitmaps.invalidatePage(pageNumber);
  }

  /**
   * Release a page's bitmap and layer DOM while keeping its CSS size, so
   * layout doesn't shift. `canvas.width = 1` frees the backing store.
   */
  private evictPage(pageNumber: number): void {
    this.dropDetail(pageNumber);
    const wrapper = this.wrapperFor(pageNumber);
    if (!wrapper) return;
    const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) {
      const w = canvas.style.width;
      const h = canvas.style.height;
      canvas.width = 1;
      canvas.height = 1;
      canvas.style.width = w;
      canvas.style.height = h;
    }
    const textLayer = wrapper.querySelector<HTMLElement>('.hk-pdf-text-layer');
    if (textLayer) {
      textLayer.replaceChildren();
      this.find.forgetTextLayer(textLayer);
    }
    wrapper.querySelector<HTMLElement>('.hk-pdf-annotation-layer')?.replaceChildren();
  }

  /**
   * Rasterize one page onto its canvas. Exact bitmap-cache hits blit
   * immediately; otherwise a cached bitmap at another scale is stretched in as
   * a placeholder while the worker renders. Text and overlay layers are built
   * in idle time (the text layer promptly while a search is active).
   */
  private async renderPageOnto(page: PdfPageEntry, canvas: HTMLCanvasElement, scale: number, dpr: number, epoch: number): Promise<void> {
    const session = this.store.session();
    if (!session) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewport = { width: page.baseWidth * scale, height: page.baseHeight * scale };
    const renderDpr = fitDevicePixelRatio(viewport.width, viewport.height, dpr);
    // Assigning `width` clears the canvas, so only resize when the backing
    // store changes size; a same-scale re-render after an edit then keeps the
    // current pixels until the fresh raster replaces them (no blank flash).
    const deviceW = Math.floor(viewport.width * renderDpr);
    const deviceH = Math.floor(viewport.height * renderDpr);
    if (canvas.width !== deviceW || canvas.height !== deviceH) {
      canvas.width = deviceW;
      canvas.height = deviceH;
    }
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const wrapper = canvas.parentElement;
    const textLayer = wrapper?.querySelector<HTMLElement>('.hk-pdf-text-layer') ?? null;
    const overlay = wrapper?.querySelector<HTMLElement>('.hk-pdf-annotation-layer') ?? null;
    const renderText = () => {
      if (textLayer) void this.layers.renderTextLayer(textLayer, viewport.width, epoch, page.pageNumber);
    };
    if (this.store.snapshot()?.searchQuery) renderText();
    else this.scheduleIdle(renderText, epoch);
    if (overlay) this.scheduleIdle(() => void this.layers.renderOverlay(overlay, viewport.width, epoch, page.pageNumber), epoch);

    const cacheKey = BitmapCache.key(page.pageNumber, Math.max(1, Math.floor(viewport.width * renderDpr)));
    const hit = this.bitmaps.get(cacheKey);
    if (hit) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(hit, 0, 0);
      return;
    }
    const placeholder = this.bitmaps.findForPage(page.pageNumber);
    if (placeholder) ctx.drawImage(placeholder, 0, 0, canvas.width, canvas.height);

    // Clear by page number, not by handle: a peer pass on the same page would
    // have overwritten the entry (peers are serialized by `inFlightPages`).
    const cleanup = (handle: RenderHandle) => {
      if (this.renderTasksByPage.get(page.pageNumber) === handle) this.renderTasksByPage.delete(page.pageNumber);
      const pending = this.pendingCancellations.get(page.pageNumber);
      if (pending !== undefined) {
        clearTimeout(pending);
        this.pendingCancellations.delete(page.pageNumber);
      }
    };

    // PDFium rasterizes off the main thread and hands back an ImageBitmap.
    const task = session.engine.renderPage(session.doc, page.pageNumber - 1, viewport.width, renderDpr);
    const handle: RenderHandle = { cancel: task.cancel, promise: task.promise };
    this.renderTasksByPage.set(page.pageNumber, handle);
    try {
      const { bitmap } = await task.promise;
      if (epoch === this.store.renderEpoch) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        this.bitmaps.set(cacheKey, bitmap); // owned by the cache now
      } else {
        bitmap.close(); // superseded
      }
    } catch (err) {
      if (epoch === this.store.renderEpoch && (err as { name?: string })?.name !== 'AbortError') {
        this.store.reportOperationError({ code: 'render_failed', message: 'Failed to render page.', recoverable: true, cause: err });
      }
    } finally {
      cleanup(handle);
    }
  }

  /**
   * Run non-critical work (text / overlay layers) in idle time so it doesn't
   * compete with rasterization during scroll. Epoch-guarded; falls back to a
   * macrotask where `requestIdleCallback` is missing (Safari).
   */
  private scheduleIdle(fn: () => void, epoch: number): void {
    const run = () => {
      if (epoch === this.store.renderEpoch) fn();
    };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(run, { timeout: 500 });
    else setTimeout(run, 0);
  }

  private cancelPageWork(pageNumber: number): void {
    const task = this.renderTasksByPage.get(pageNumber);
    if (!task) return;
    try {
      task.cancel();
    } catch {
      /* ignore */
    }
    this.renderTasksByPage.delete(pageNumber);
  }

  cancelInflightRenders(): void {
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
  }

  // ── Scroll & resize tracking ────────────────────────────────────────────

  /**
   * Track scrolling (passive, once per frame) and size changes of the
   * viewport. Scrolling moves the window and, in continuous mode, the current
   * page. A resize re-renders fit-* zoom only when the resolved scale changes.
   */
  private listen(vp: HTMLElement, stack: HTMLElement): void {
    const gap = parseFloat(getComputedStyle(stack).rowGap);
    if (Number.isFinite(gap)) this.gap.set(gap);
    this.viewportHeight.set(vp.clientHeight);
    this.scrollTop.set(vp.scrollTop);
    if (this.listenedViewport === vp) return;

    this.unlisten();
    this.listenedViewport = vp;
    vp.addEventListener('scroll', this.onScroll, { passive: true });
    // Gesture zoom: these call preventDefault, so they can't be passive.
    vp.addEventListener('wheel', this.onWheel, { passive: false });
    vp.addEventListener('touchstart', this.onTouchStart, { passive: true });
    vp.addEventListener('touchmove', this.onTouchMove, { passive: false });
    vp.addEventListener('touchend', this.onTouchEnd, { passive: true });
    vp.addEventListener('gesturestart', this.onGestureStart, { passive: false });
    vp.addEventListener('gesturechange', this.onGestureChange, { passive: false });

    // Seed the baseline before observing: ResizeObserver delivers the initial
    // measurement right away, which would otherwise cancel the first render.
    this.lastRenderScale = this.computeScale();
    if (typeof ResizeObserver === 'undefined') return; // e.g. SSR shims, test DOMs
    this.resizeObserver = new ResizeObserver(() => {
      this.viewportHeight.set(vp.clientHeight);
      const zoomMode = this.store.snapshot()?.zoomMode;
      if (zoomMode !== 'fit-width' && zoomMode !== 'fit-page' && zoomMode !== 'auto') return;
      // Gate on the resolved scale, not raw size: a scrollbar appearing under
      // fit-width changes clientHeight but not the scale, and re-rendering on
      // it churned the engine (and could fragment the wasm heap).
      const nextScale = this.computeScale();
      if (nextScale <= 0 || Math.abs(nextScale - this.lastRenderScale) < 1e-3) return;
      this.lastRenderScale = nextScale;
      if (this.resizeRafHandle !== null) cancelAnimationFrame(this.resizeRafHandle);
      this.resizeRafHandle = requestAnimationFrame(() => {
        this.resizeRafHandle = null;
        const anchor = this.captureAnchor();
        void this.renderAll();
        this.restoreAnchorAfterRender(anchor);
      });
    });
    this.resizeObserver.observe(vp);
  }

  private readonly onScroll = (): void => {
    if (this.scrollRaf !== null) return;
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = null;
      const vp = this.listenedViewport;
      if (!vp) return;
      this.scrollTop.set(vp.scrollTop);
      this.trackCurrentPage(vp);
      if (this.detailTiles.size > 0 || this.mayNeedDetailTiles()) this.scheduleDetailTiles();
    });
  };

  /**
   * Continuous mode: the current page is the one under the viewport's
   * vertical centre (the nearest one if the centre is in a gap). It changes
   * exactly once per boundary, regardless of scroll speed or zoom.
   */
  private trackCurrentPage(vp: HTMLElement): void {
    if (this.isSingleMode()) return;
    const layout = this.layout();
    if (layout.count === 0) return;
    const center = vp.scrollTop + vp.clientHeight / 2 - this.stackOffset();
    const row = this.rows()[layout.nearestIndex(center)];
    const page = this.store.snapshot()?.page ?? 0;
    // Within a spread, keep the page the user picked; otherwise the row's first page.
    const current = row.includes(page) ? page : row[0];
    if (current !== page) {
      this.store.patchState((s) => ({ ...s, page: current }));
      this.store.notifyPageChange(current);
    }
  }

  private unlisten(): void {
    const vp = this.listenedViewport;
    vp?.removeEventListener('scroll', this.onScroll);
    vp?.removeEventListener('wheel', this.onWheel);
    vp?.removeEventListener('touchstart', this.onTouchStart);
    vp?.removeEventListener('touchmove', this.onTouchMove);
    vp?.removeEventListener('touchend', this.onTouchEnd);
    vp?.removeEventListener('gesturestart', this.onGestureStart);
    vp?.removeEventListener('gesturechange', this.onGestureChange);
    this.listenedViewport = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private teardown(): void {
    this.cancelInflightRenders();
    this.bitmaps.clear();
    this.unlisten();
    if (this.resizeRafHandle !== null) cancelAnimationFrame(this.resizeRafHandle);
    this.resizeRafHandle = null;
    if (this.scrollRaf !== null) cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = null;
    if (this.gestureTimer !== null) clearTimeout(this.gestureTimer);
    this.gestureTimer = null;
    if (this.detailTimer !== null) clearTimeout(this.detailTimer);
    this.detailTimer = null;
    for (const entry of this.detailTiles.values()) entry.task?.cancel();
    this.detailTiles.clear();
    this.renderedPages.clear();
    this.inFlightPages.clear();
  }
}

/** Whether region `a` fully contains region `b`. */
function covers(a: PageRegion, b: PageRegion): boolean {
  return a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom;
}

/** A viewport's top padding in px (page positions are measured from its content box). */
function paddingTop(el: HTMLElement): number {
  return parseFloat(getComputedStyle(el).paddingTop) || 0;
}
