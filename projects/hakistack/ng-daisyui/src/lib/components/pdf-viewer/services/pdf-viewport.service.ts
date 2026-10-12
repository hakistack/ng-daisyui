import { DestroyRef, Injectable, Injector, computed, effect, inject, signal, untracked } from '@angular/core';
import { BitmapCache } from '../core/bitmap-cache';
import { VIEWPORT_PAD_X, VIEWPORT_PAD_Y, fitDevicePixelRatio, isQuarterTurn, resolveZoomScale } from '../core/geometry';
import { PdfPageEntry } from '../core/types';
import { PdfDisplayMode, PdfZoom } from '../pdf-viewer.types';
import { PdfFindService } from './pdf-find.service';
import { PdfLayersService } from './pdf-layers.service';
import { PDF_BITMAP_CACHE, PdfViewerStore } from './pdf-viewer.store';

/**
 * IntersectionObserver `rootMargin` defining the "live" page buffer. Pages
 * within this many px of the viewport keep their canvas, text layer and overlay;
 * pages outside are evicted so the browser doesn't hold tens of MB of bitmaps
 * and thousands of spans nobody can see. At 800px the user reaches a freshly
 * rendered page before scrolling into a blank one.
 */
const LIVE_BUFFER_MARGIN_PX = 800;
/** Hysteresis before cancelling an out-of-buffer render (ms), so brief scroll-pasts keep their work. */
const RENDER_CANCEL_HYSTERESIS_MS = 200;

interface RenderHandle {
  cancel: () => void;
  promise: Promise<unknown>;
}

/**
 * The scrolling page area: page virtualization (which pages are live),
 * rasterizing pages onto their canvases, zoom resolution, and navigation.
 *
 * The page-stack component registers its viewport element and page wrappers;
 * this service observes them, keeps the live buffer rendered, and evicts the
 * rest.
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
  /** Page wrappers in page order, registered by the page stack. */
  readonly pageWrappers = signal<readonly HTMLElement[]>([]);

  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Synchronous accumulator of intersection ratios; flushed into `visibleEntries` once per frame. */
  private readonly rawVisible = new Map<number, number>();
  private visibilityFlushRaf: number | null = null;
  /** rAF-paced snapshot of `rawVisible`; drives the live buffer and page tracking. */
  private readonly visibleEntries = signal<ReadonlyMap<number, number>>(new Map());
  /** Last fit-* scale rendered at; resize only re-renders when the resolved scale changes. */
  private lastRenderScale = 0;
  private resizeRafHandle: number | null = null;

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

  /**
   * Pages that should be live: the rAF-paced visible set, plus page ± 1 in
   * single-page mode (non-current pages are `display:none`, so the observer
   * never sees them; pre-rendering neighbours makes Prev/Next instant).
   */
  private readonly liveBuffer = computed<ReadonlySet<number>>(() => {
    const buffer = new Set<number>(this.visibleEntries().keys());
    const s = this.store.state();
    if (s && s.mode === 'single' && s.page > 0) {
      buffer.add(s.page);
      if (s.page > 1) buffer.add(s.page - 1);
      if (s.page < s.numPages) buffer.add(s.page + 1);
    }
    return buffer;
  });

  private readonly isContinuousMode = computed(() => (this.store.state()?.mode ?? 'continuous') === 'continuous');

  constructor() {
    // Once the page stack has mounted a wrapper for every page, install the
    // observers, render, and scroll to the initial page. viewChildren only
    // updates on the next change detection, hence an effect rather than a call
    // at the end of loading.
    effect(() => {
      const wrappers = this.pageWrappers();
      const numbers = this.store.pageNumbers();
      if (numbers.length === 0) {
        this.intersectionObserver?.disconnect();
        this.intersectionObserver = null;
        return;
      }
      if (wrappers.length !== numbers.length) return;
      untracked(() => {
        this.installObservers();
        void this.renderAll().then(() => this.scrollToPage(this.store.snapshot()?.page ?? 1));
      });
    });

    // Keep the live buffer rendered as it changes.
    effect(() => {
      this.liveBuffer();
      untracked(() => void this.applyBufferDiff(this.store.renderEpoch));
    });

    // Continuous mode: the current page is the one straddling the viewport's
    // vertical centre (nearest page if the centre is in a gap). Position-based,
    // so it changes exactly once per boundary and ignores scroll speed and zoom.
    effect(() => {
      if (!this.isContinuousMode()) return;
      const visible = this.visibleEntries();
      const vp = this.viewportEl();
      if (!vp || visible.size === 0) return;
      untracked(() => {
        const vpRect = vp.getBoundingClientRect();
        const center = vpRect.top + vpRect.height / 2;
        let current = -1;
        let bestDist = Infinity;
        for (const num of visible.keys()) {
          const wrapper = this.pageWrappers()[num - 1];
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
        if (current !== (this.store.snapshot()?.page ?? 0)) {
          this.store.patchState((s) => ({ ...s, page: current }));
          this.store.notifyPageChange(current);
        }
      });
    });

    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /** Wrapper element for a page, or `null` if not mounted. */
  wrapperFor(pageNumber: number): HTMLElement | null {
    return this.pageWrappers()[pageNumber - 1] ?? null;
  }

  /** Forget per-document render state (new document or structural change). */
  resetForDocument(): void {
    this.cancelInflightRenders();
    this.bitmaps.clear();
    this.rawVisible.clear();
    this.visibleEntries.set(new Map());
    this.renderedPages.clear();
    this.inFlightPages.clear();
    this.pageContentVersion.clear();
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
   * ancestor) so the page's top meets the viewport's content start.
   * Continuous mode only; single mode shows the page by hiding the others.
   */
  scrollToPage(page: number): void {
    if (page < 1) return;
    const wrapper = this.wrapperFor(page);
    if (!wrapper) return;
    if ((this.store.snapshot()?.mode ?? 'continuous') !== 'continuous') return;
    const vp = this.viewportEl();
    if (!vp) return;
    const padTop = parseFloat(getComputedStyle(vp).paddingTop) || 0;
    const delta = wrapper.getBoundingClientRect().top - vp.getBoundingClientRect().top - padTop;
    vp.scrollTo({ top: vp.scrollTop + delta, behavior: 'auto' });
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

  setZoom(zoom: PdfZoom): void {
    this.store.patchState((s) => ({ ...s, zoomMode: zoom }));
    void this.renderAll();
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
    return page ? side(page) * this.computeScale() : null;
  }

  /** CSS transform for a page's rotor (`null` when unrotated). */
  pageRotorTransform(pageNumber: number): string | null {
    const r = this.store.pageRotation(pageNumber);
    return r ? `rotate(${r}deg)` : null;
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  /**
   * Re-baseline the whole stack at the current zoom: cancel in-flight work,
   * size every canvas and layer synchronously (stable layout before any pixel
   * paints), evict every rendered page (wrong scale now), then render the
   * live buffer.
   */
  async renderAll(): Promise<void> {
    this.cancelInflightRenders();
    const epoch = ++this.store.renderEpoch;

    const scale = this.computeScale();
    if (scale <= 0) return;
    this.lastRenderScale = scale;
    this.store.patchState((s) => ({ ...s, zoom: scale }));

    const wrappers = this.pageWrappers();
    for (let i = 0; i < this.store.pages.length; i++) {
      const wrapper = wrappers[i];
      const canvas = wrapper?.querySelector<HTMLCanvasElement>('canvas');
      if (!wrapper || !canvas) continue;
      const page = this.store.pages[i];
      const w = page.baseWidth * scale;
      const h = page.baseHeight * scale;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      for (const layer of [
        wrapper.querySelector<HTMLElement>('.hk-pdf-text-layer'),
        wrapper.querySelector<HTMLElement>('.hk-pdf-annotation-layer'),
      ]) {
        if (!layer) continue;
        layer.style.width = `${w}px`;
        layer.style.height = `${h}px`;
        layer.style.setProperty('--scale-factor', String(scale));
      }
    }

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
    if (wrappers.length !== this.store.pages.length) return; // not yet mounted
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
      const canvas = wrappers[page.pageNumber - 1]?.querySelector<HTMLCanvasElement>('canvas');
      if (!canvas) continue;

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

  // ── Observers ───────────────────────────────────────────────────────────

  /**
   * One IntersectionObserver drives both virtualization (the live buffer,
   * extended by `LIVE_BUFFER_MARGIN_PX`) and continuous-mode page tracking.
   * Bursts are coalesced into one signal update per animation frame. A
   * ResizeObserver re-renders fit-* zoom when the resolved scale changes.
   */
  private installObservers(): void {
    const vp = this.viewportEl();
    if (!vp) return;

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const num = Number((e.target as HTMLElement).dataset['pageNumber']);
          if (!num) continue;
          if (e.isIntersecting) this.rawVisible.set(num, e.intersectionRatio);
          else this.rawVisible.delete(num);
        }
        if (this.visibilityFlushRaf === null) {
          this.visibilityFlushRaf = requestAnimationFrame(() => {
            this.visibilityFlushRaf = null;
            this.visibleEntries.set(new Map(this.rawVisible));
          });
        }
      },
      { root: vp, rootMargin: `${LIVE_BUFFER_MARGIN_PX}px 0px`, threshold: [0, 0.25, 0.5, 0.75] },
    );
    for (const w of this.pageWrappers()) this.intersectionObserver.observe(w);

    // Seed the baseline before observing: ResizeObserver delivers the initial
    // measurement right away, which would otherwise cancel the first render.
    this.lastRenderScale = this.computeScale();
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
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
        void this.renderAll();
      });
    });
    this.resizeObserver.observe(vp);
  }

  private teardown(): void {
    this.cancelInflightRenders();
    this.bitmaps.clear();
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeRafHandle !== null) cancelAnimationFrame(this.resizeRafHandle);
    this.resizeRafHandle = null;
    if (this.visibilityFlushRaf !== null) cancelAnimationFrame(this.visibilityFlushRaf);
    this.visibilityFlushRaf = null;
    this.rawVisible.clear();
    this.renderedPages.clear();
    this.inFlightPages.clear();
  }
}
