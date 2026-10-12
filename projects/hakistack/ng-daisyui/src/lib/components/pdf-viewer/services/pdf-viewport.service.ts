import { DestroyRef, Injectable, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { BitmapCache } from '../core/bitmap-cache';
import { VIEWPORT_PAD_X, VIEWPORT_PAD_Y, fitDevicePixelRatio, isQuarterTurn, resolveZoomScale } from '../core/geometry';
import { PageLayout } from '../core/page-layout';
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

/** Reading position to restore after a zoom change: a page and how far down it the viewport top was. */
interface ScrollAnchor {
  readonly index: number;
  readonly fraction: number;
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

  /** Page positions at the current scale and rotations. */
  readonly layout = computed(() => {
    this.store.pageNumbers(); // document or page structure changed
    const scale = this.scale();
    const rotations = this.store.pageRotations();
    const heights = this.store.pages.map((p) => (isQuarterTurn(rotations.get(p.pageNumber) ?? 0) ? p.baseWidth : p.baseHeight) * scale);
    return new PageLayout(heights, this.gap());
  });

  /** Pages to keep rendered. In single mode: the current page ± 1 (pre-rendered for instant Prev/Next). */
  private readonly liveBuffer = computed<ReadonlySet<number>>(() => this.pagesNearViewport(LIVE_BUFFER_MARGIN_PX));

  /** Pages mounted in the DOM, in order (a superset of the live buffer). */
  readonly mountedPages = computed<number[]>(() => [...this.pagesNearViewport(MOUNT_MARGIN_PX)].sort((a, b) => a - b));

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

  /** Pages intersecting the viewport extended by `margin` px above and below. */
  private pagesNearViewport(margin: number): Set<number> {
    const s = this.store.state();
    if (!s || s.numPages === 0) return new Set();
    if (this.isSingleMode()) {
      const set = new Set<number>();
      if (s.page > 0) {
        set.add(s.page);
        if (s.page > 1) set.add(s.page - 1);
        if (s.page < s.numPages) set.add(s.page + 1);
      }
      return set;
    }
    const top = this.scrollTop() - this.stackOffset();
    const range = this.layout().range(top - margin, top + this.viewportHeight() + margin);
    const set = new Set<number>();
    if (range) for (let i = range[0]; i <= range[1]; i++) set.add(i + 1);
    return set;
  }

  private spacer(side: 'before' | 'after'): number {
    if (this.isSingleMode()) return 0;
    const mounted = this.mountedPages();
    if (mounted.length === 0) return 0;
    const layout = this.layout();
    return side === 'before' ? layout.spacerBefore(mounted[0] - 1) : layout.spacerAfter(mounted[mounted.length - 1] - 1);
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
    if (page < 1 || page > this.layout().count) return;
    if ((this.store.snapshot()?.mode ?? 'continuous') !== 'continuous') return;
    const vp = this.viewportEl();
    if (!vp) return;
    this.scrollViewportTo(vp, this.stackOffset() + this.layout().top(page - 1) - paddingTop(vp));
  }

  nextPage(): void {
    this.goToPage((this.store.snapshot()?.page ?? 0) + 1);
  }

  previousPage(): void {
    this.goToPage((this.store.snapshot()?.page ?? 0) - 1);
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
    const anchor = this.captureAnchor();
    this.store.patchState((s) => ({ ...s, zoomMode: zoom }));
    void this.renderAll();
    this.restoreAnchorAfterRender(anchor);
  }

  setMode(mode: PdfDisplayMode): void {
    this.store.patchState((s) => ({ ...s, mode }));
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

  /** The page at the top of the viewport and how far down it the top is (0–1). */
  private captureAnchor(): ScrollAnchor | null {
    const vp = this.viewportEl();
    const layout = this.layout();
    if (!vp || this.isSingleMode() || layout.count === 0) return null;
    const y = vp.scrollTop - this.stackOffset() + paddingTop(vp);
    const index = layout.indexAt(y);
    const height = layout.height(index);
    return { index, fraction: height > 0 ? Math.max(0, Math.min(1, (y - layout.top(index)) / height)) : 0 };
  }

  /** After the new zoom has laid out (spacers resized), scroll back to `anchor`. */
  private restoreAnchorAfterRender(anchor: ScrollAnchor | null): void {
    if (!anchor) return;
    afterNextRender(
      () => {
        const vp = this.viewportEl();
        const layout = this.layout();
        if (!vp || anchor.index >= layout.count) return;
        const y = layout.top(anchor.index) + anchor.fraction * layout.height(anchor.index);
        this.scrollViewportTo(vp, this.stackOffset() + y - paddingTop(vp));
      },
      { injector: this.injector },
    );
  }

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
    const current = layout.nearestIndex(center) + 1;
    if (current !== (this.store.snapshot()?.page ?? 0)) {
      this.store.patchState((s) => ({ ...s, page: current }));
      this.store.notifyPageChange(current);
    }
  }

  private unlisten(): void {
    this.listenedViewport?.removeEventListener('scroll', this.onScroll);
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
    this.renderedPages.clear();
    this.inFlightPages.clear();
  }
}

/** A viewport's top padding in px (page positions are measured from its content box). */
function paddingTop(el: HTMLElement): number {
  return parseFloat(getComputedStyle(el).paddingTop) || 0;
}
