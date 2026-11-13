import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { HkAnnotation } from '../core/annotations/annotation.types';
import { annotationOps, paintOps } from '../core/annotations/shapes';
import { BitmapCache } from '../core/bitmap-cache';
import { widgetOps } from '../core/forms/form-appearance';
import type { FormField, FormWidget } from '../core/forms/form-model';
import { isQuarterTurn } from '../core/geometry';
import { PageLayout } from '../core/page-layout';
import { PdfPageEntry } from '../core/types';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFormsService } from './pdf-forms.service';
import { PdfViewerStore } from './pdf-viewer.store';

/** CSS width of a sidebar thumbnail. */
export const THUMBNAIL_WIDTH = 180;
/** Thumbnails within this many px of the panel's view are rendered. */
const RENDER_MARGIN_PX = 500;
/** Thumbnails within this many px stay mounted; the rest are spacers. */
const MOUNT_MARGIN_PX = 1500;
/** Memory for cached thumbnail rasters (a 180px-wide letter page at DPR 2 is ~0.5 MB). */
const RASTER_CACHE_BYTES = 48 * 1024 * 1024;

/** What a thumbnail shows: a source page, and what the viewer draws over it. */
export interface PdfThumbnailContent {
  readonly page: Pick<PdfPageEntry, 'doc' | 'index' | 'key' | 'baseWidth' | 'baseHeight'>;
  /** Rotation added to the page (degrees). */
  readonly rotation: number;
  readonly annotations: readonly HkAnnotation[];
  readonly widgets: readonly { readonly field: FormField; readonly widget: FormWidget }[];
}

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
  /** Rasters by source page and device width: a moved or duplicated page repaints without rendering. */
  private readonly rasters = new BitmapCache<ImageBitmap>(RASTER_CACHE_BYTES);
  private readonly pending = new Map<string, Promise<ImageBitmap | null>>();
  private listenedPanel: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollRaf: number | null = null;

  /** Whether the thumbnail panel is on screen (the sidebar's tab, or the workspace's rail). */
  readonly tabActive = computed(() => this.store.visiblePanels().has('thumbnails'));

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

    inject(DestroyRef).onDestroy(() => {
      this.listen(null);
      this.rasters.clear();
    });
  }

  /** CSS height of a page's thumbnail canvas (180px wide; rotation swaps the aspect). */
  canvasHeight(pageNumber: number): number {
    const p = this.store.findPage(pageNumber);
    if (!p || p.baseWidth <= 0 || p.baseHeight <= 0) return THUMBNAIL_WIDTH;
    const swap = isQuarterTurn(this.store.pageRotation(pageNumber));
    return Math.round(THUMBNAIL_WIDTH * (swap ? p.baseWidth / p.baseHeight : p.baseHeight / p.baseWidth));
  }

  /** Forget painted thumbnails (the page structure changed; the cached rasters stay valid). */
  reset(): void {
    this.painted = new WeakSet();
  }

  /** Forget everything for a new document (source ids restart, so cached rasters no longer apply). */
  resetForDocument(): void {
    this.reset();
    this.pending.clear();
    this.rasters.clear();
  }

  /** A page's raster at `cssWidth` (cached; low priority, so it never delays the pages being read). */
  raster(page: PdfThumbnailContent['page'], cssWidth: number, dpr: number): Promise<ImageBitmap | null> {
    const session = this.store.session();
    if (!session) return Promise.resolve(null);
    const key = BitmapCache.key(page.key, Math.round(cssWidth * dpr));
    const hit = this.rasters.get(key);
    if (hit) return Promise.resolve(hit);
    let job = this.pending.get(key);
    if (!job) {
      job = session.engine
        .renderPage(page.doc, page.index, cssWidth, dpr, 'low')
        .promise.then(({ bitmap }) => {
          if (this.pending.get(key) !== job || this.store.session()?.engine !== session.engine) {
            bitmap.close();
            return null;
          }
          this.rasters.set(key, bitmap);
          return bitmap;
        })
        .catch(() => null)
        .finally(() => {
          if (this.pending.get(key) === job) this.pending.delete(key);
        });
      this.pending.set(key, job);
    }
    return job;
  }

  /**
   * Paint a thumbnail onto `canvas` at `cssWidth`: the raster turned by the
   * added rotation, with the form widgets and annotations the viewer draws.
   * Resolves `false` when the page couldn't be rendered.
   */
  async paintThumbnail(canvas: HTMLCanvasElement, content: PdfThumbnailContent, cssWidth: number): Promise<boolean> {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const bitmap = await this.raster(content.page, cssWidth, dpr);
    const ctx = canvas.getContext('2d');
    if (!bitmap || !ctx) return false;
    const { width, height } = bitmap;
    const swap = isQuarterTurn(content.rotation);
    canvas.width = swap ? height : width;
    canvas.height = swap ? width : height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    try {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((content.rotation * Math.PI) / 180);
      ctx.drawImage(bitmap, -width / 2, -height / 2);
      const { page, annotations, widgets } = content;
      if ((annotations.length || widgets.length) && typeof Path2D !== 'undefined') {
        ctx.translate(-width / 2, -height / 2);
        ctx.scale(width / page.baseWidth, height / page.baseHeight);
        for (const { field, widget } of widgets) paintOps(ctx, widgetOps(field, widget, this.forms.value(field.name)));
        for (const a of annotations) paintOps(ctx, annotationOps(a));
      }
    } finally {
      ctx.restore();
    }
    return true;
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

  /** What page `pageNumber`'s thumbnail shows. */
  contentFor(pageNumber: number): PdfThumbnailContent | null {
    const page = this.store.findPage(pageNumber);
    if (!page) return null;
    return {
      page,
      rotation: this.store.pageRotation(pageNumber),
      annotations: this.annotations.forPage(pageNumber),
      widgets: this.forms.widgetsForPage(pageNumber),
    };
  }

  /** Paint one sidebar thumbnail. Failures leave it blank (it still navigates). */
  private async renderOne(pageNumber: number): Promise<void> {
    const canvas = this.canvasFor(pageNumber);
    const content = this.contentFor(pageNumber);
    if (!canvas || !content) return;
    this.painted.add(canvas);
    try {
      if (!(await this.paintThumbnail(canvas, content, THUMBNAIL_WIDTH))) this.painted.delete(canvas); // retry when it comes into view again
    } catch {
      this.painted.delete(canvas);
    }
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
