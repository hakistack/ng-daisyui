import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { annotationOps, paintOps } from '../core/annotations/shapes';
import { widgetOps } from '../core/forms/form-appearance';
import { isQuarterTurn } from '../core/geometry';
import { PageLayout } from '../core/page-layout';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFormsService } from './pdf-forms.service';
import { PdfViewerStore } from './pdf-viewer.store';

/** CSS width of a sidebar thumbnail. */
export const THUMBNAIL_WIDTH = 180;
/** Thumbnails within this many px of the panel's view are rendered. */
const RENDER_MARGIN_PX = 500;
/** Thumbnails within this many px stay mounted; the rest are spacers. */
const MOUNT_MARGIN_PX = 1500;

/**
 * Sidebar thumbnails, virtualized like the page stack: a {@link PageLayout} of
 * item heights (from each page's aspect ratio) gives every item's position,
 * so only items near the panel's view are mounted and rendered, and the
 * active page's thumbnail can be scrolled to even when it isn't mounted.
 */
@Injectable()
export class PdfThumbnailsService {
  private readonly store = inject(PdfViewerStore);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly forms = inject(PdfFormsService);

  /** The panel's scroll container, registered by the sidebar (`null` while closed). */
  readonly panel = signal<HTMLElement | null>(null);
  /** The thumbnail list (flex column), registered by the sidebar. */
  readonly list = signal<HTMLElement | null>(null);

  private readonly scrollTop = signal(0);
  private readonly viewHeight = signal(0);
  private readonly gap = signal(8);
  /** Item height beyond its canvas: button padding and border, the label line. Measured once mounted. */
  private readonly chrome = signal(32);

  /** Canvases already painted (a remounted item gets a fresh canvas, so this tracks elements, not pages). */
  private painted = new WeakSet<HTMLCanvasElement>();
  private listenedPanel: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollRaf: number | null = null;

  readonly tabActive = computed(() => {
    const s = this.store.state();
    return !!s?.sidebarOpen && (s.sidebarTab ?? 'thumbnails') === 'thumbnails';
  });

  /** Item positions in the list. */
  private readonly layout = computed(() => {
    this.store.pageNumbers();
    this.store.pageRotations();
    const chrome = this.chrome();
    return new PageLayout(
      this.store.pages.map((p) => this.canvasHeight(p.pageNumber) + chrome),
      this.gap(),
    );
  });

  /** Thumbnails mounted in the list, in order. */
  readonly mountedPages = computed<number[]>(() => this.pagesNear(MOUNT_MARGIN_PX));

  readonly spacerBefore = computed(() => {
    const mounted = this.mountedPages();
    return mounted.length ? this.layout().spacerBefore(mounted[0] - 1) : 0;
  });

  readonly spacerAfter = computed(() => {
    const mounted = this.mountedPages();
    return mounted.length ? this.layout().spacerAfter(mounted[mounted.length - 1] - 1) : 0;
  });

  constructor() {
    // Track the panel's scroll and size while it exists.
    effect(() => {
      const panel = this.panel();
      const list = this.list();
      untracked(() => {
        if (panel !== this.listenedPanel) this.listen(panel);
        if (list) {
          const gap = parseFloat(getComputedStyle(list).rowGap);
          if (Number.isFinite(gap)) this.gap.set(gap);
        }
      });
    });

    // Paint the thumbnails near the view (low priority, never ahead of the pages).
    effect(() => {
      const pages = this.pagesNear(RENDER_MARGIN_PX);
      if (!this.tabActive()) return;
      this.mountedPages(); // re-run when items mount
      untracked(() => queueMicrotask(() => void this.paint(pages)));
    });

    // Repaint the thumbnails of pages whose annotations changed (the raster leaves them out; they're drawn on top).
    let signatures = new Map<number, string>();
    effect(() => {
      const next = new Map<number, string>();
      for (const a of this.annotations.list()) next.set(a.page, `${next.get(a.page) ?? ''}${a.id}@${a.modified ?? ''};`);
      untracked(() => {
        for (const page of new Set([...next.keys(), ...signatures.keys()])) {
          if (next.get(page) !== signatures.get(page)) this.refresh(page + 1);
        }
        signatures = next;
      });
    });

    // Keep the active page's thumbnail visible as the page changes.
    effect(() => {
      const page = this.store.state()?.page ?? 0;
      if (page <= 0 || !this.tabActive() || !this.panel()) return;
      untracked(() => this.scrollActiveIntoView(page));
    });

    inject(DestroyRef).onDestroy(() => this.listen(null));
  }

  /** CSS height of a page's thumbnail canvas (180px wide; rotation swaps the aspect). */
  canvasHeight(pageNumber: number): number {
    const p = this.store.findPage(pageNumber);
    if (!p || p.baseWidth <= 0 || p.baseHeight <= 0) return THUMBNAIL_WIDTH;
    const swap = isQuarterTurn(this.store.pageRotation(pageNumber));
    return Math.round(THUMBNAIL_WIDTH * (swap ? p.baseWidth / p.baseHeight : p.baseHeight / p.baseWidth));
  }

  /** Forget painted thumbnails (new document or page structure). */
  reset(): void {
    this.painted = new WeakSet();
  }

  /** Re-render one thumbnail (e.g. after its page was rotated). */
  refresh(pageNumber: number): void {
    const canvas = this.canvasFor(pageNumber);
    if (canvas) this.painted.delete(canvas);
    if (this.tabActive()) void this.renderOne(pageNumber);
  }

  /** Distance from the panel's scroll origin to the top of the first item. */
  private listOffset(): number {
    const list = this.list();
    if (!list) return 0;
    return list.offsetTop + (parseFloat(getComputedStyle(list).paddingTop) || 0);
  }

  private pagesNear(margin: number): number[] {
    const layout = this.layout();
    if (layout.count === 0) return [];
    const top = this.scrollTop() - this.listOffset();
    const range = layout.range(top - margin, top + this.viewHeight() + margin);
    if (!range) return [];
    const out: number[] = [];
    for (let i = range[0]; i <= range[1]; i++) out.push(i + 1);
    return out;
  }

  private listen(panel: HTMLElement | null): void {
    this.listenedPanel?.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.scrollRaf !== null) cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = null;
    this.listenedPanel = panel;
    if (!panel) return;
    panel.addEventListener('scroll', this.onScroll, { passive: true });
    this.scrollTop.set(panel.scrollTop);
    this.viewHeight.set(panel.clientHeight);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.viewHeight.set(panel.clientHeight));
      this.resizeObserver.observe(panel);
    }
  }

  private readonly onScroll = (): void => {
    if (this.scrollRaf !== null) return;
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = null;
      if (this.listenedPanel) this.scrollTop.set(this.listenedPanel.scrollTop);
    });
  };

  private canvasFor(pageNumber: number): HTMLCanvasElement | null {
    return this.list()?.querySelector<HTMLCanvasElement>(`canvas[data-thumb-page="${pageNumber}"]`) ?? null;
  }

  /** Paint `pages` that are mounted and not painted yet, one at a time. */
  private async paint(pages: readonly number[]): Promise<void> {
    this.measureChrome();
    for (const n of pages) {
      if (!this.tabActive()) return;
      const canvas = this.canvasFor(n);
      if (canvas && !this.painted.has(canvas)) await this.renderOne(n);
    }
  }

  /** Measure the item chrome (everything but the canvas) from a mounted item, once it has layout. */
  private measureChrome(): void {
    const item = this.list()?.querySelector<HTMLElement>('li[data-thumb-item]');
    const canvas = item?.querySelector<HTMLCanvasElement>('canvas');
    if (!item || !canvas || item.offsetHeight === 0) return;
    const chrome = item.offsetHeight - canvas.offsetHeight;
    if (chrome > 0 && Math.abs(chrome - this.chrome()) > 0.5) this.chrome.set(chrome);
  }

  /** Paint one thumbnail off-thread, with the display rotation baked in. Failures leave it blank (it still navigates). */
  private async renderOne(pageNumber: number): Promise<void> {
    const canvas = this.canvasFor(pageNumber);
    const session = this.store.session();
    const ctx = canvas?.getContext('2d');
    if (!canvas || !session || !ctx || !this.store.findPage(pageNumber)) return;
    this.painted.add(canvas);
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    try {
      // Low priority: thumbnails never delay the pages the user is reading.
      const { bitmap, width, height } = await session.engine.renderPage(session.doc, pageNumber - 1, THUMBNAIL_WIDTH, dpr, 'low').promise;
      const deg = this.store.pageRotation(pageNumber);
      const swap = isQuarterTurn(deg);
      canvas.width = swap ? height : width;
      canvas.height = swap ? width : height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.drawImage(bitmap, -width / 2, -height / 2);
      this.paintAnnotations(ctx, pageNumber, width, height);
      ctx.restore();
      bitmap.close();
    } catch {
      this.painted.delete(canvas); // retry when it comes into view again
    }
  }

  /** Draw the page's annotations over its raster (the context is centred on the unrotated bitmap). */
  private paintAnnotations(ctx: CanvasRenderingContext2D, pageNumber: number, width: number, height: number): void {
    const page = this.store.findPage(pageNumber);
    const list = this.annotations.list().filter((a) => a.page === pageNumber - 1);
    const widgets = this.forms.widgetsForPage(pageNumber);
    if (!page || (list.length === 0 && widgets.length === 0) || typeof Path2D === 'undefined') return;
    ctx.translate(-width / 2, -height / 2);
    ctx.scale(width / page.baseWidth, height / page.baseHeight);
    for (const { field, widget } of widgets) paintOps(ctx, widgetOps(field, widget, this.forms.value(field.name)));
    for (const a of list) paintOps(ctx, annotationOps(a));
  }

  /** Scroll the panel just enough to show the active thumbnail (never the outer page). Works for unmounted items. */
  private scrollActiveIntoView(page: number): void {
    const panel = this.panel();
    const layout = this.layout();
    if (!panel || page > layout.count) return;
    const MARGIN = 8;
    const top = this.listOffset() + layout.top(page - 1);
    const bottom = this.listOffset() + layout.bottom(page - 1);
    if (top < panel.scrollTop) panel.scrollTop = top - MARGIN;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight + MARGIN;
  }
}
