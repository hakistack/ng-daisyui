import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { isQuarterTurn } from '../core/geometry';
import { PdfViewerStore } from './pdf-viewer.store';

/** CSS width of a sidebar thumbnail. */
const THUMBNAIL_WIDTH = 180;

/**
 * Sidebar thumbnails: lazy rendering as they scroll into the panel, keeping
 * the active page's thumbnail in view, and refreshing one after a rotation.
 */
@Injectable()
export class PdfThumbnailsService {
  private readonly store = inject(PdfViewerStore);

  /** Thumbnail panel scroll container, registered by the sidebar (`null` while closed). */
  readonly panel = signal<HTMLElement | null>(null);

  /** Pages painted into the current panel's canvases. */
  private readonly rendered = new Set<number>();
  private observer: IntersectionObserver | null = null;
  /** Panel element `observer` and `rendered` belong to. */
  private observedPanel: HTMLElement | null = null;

  readonly tabActive = computed(() => {
    const s = this.store.state();
    return !!s?.sidebarOpen && (s.sidebarTab ?? 'thumbnails') === 'thumbnails';
  });

  constructor() {
    // The thumbnail grid stays mounted (hidden) across sidebar tab switches,
    // so its canvases persist and re-entry is instant. A hidden panel has no
    // layout, so the observer fires nothing until the user views it. Closing
    // the sidebar destroys the panel and its canvases, so a new panel element
    // starts over.
    effect(() => {
      const panel = this.panel();
      if (panel !== this.observedPanel) {
        this.observedPanel = panel;
        this.rendered.clear();
        this.disconnect();
      }
      if (this.store.pageNumbers().length === 0) {
        this.disconnect();
        return;
      }
      if (!panel) return;
      untracked(() => this.install(panel));
    });

    // Keep the active page's thumbnail visible as the page changes.
    effect(() => {
      const page = this.store.state()?.page ?? 0;
      if (page <= 0 || !this.tabActive()) return;
      untracked(() => this.scrollActiveIntoView(page));
    });

    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /** Forget rendered thumbnails for a new document or page structure. */
  reset(): void {
    this.rendered.clear();
    this.disconnect();
  }

  /** Re-render one thumbnail (e.g. after its page was rotated). */
  refresh(pageNumber: number): void {
    this.rendered.delete(pageNumber);
    if (this.tabActive()) {
      this.rendered.add(pageNumber);
      void this.renderOne(pageNumber);
    }
  }

  /**
   * Observe the panel's thumbnails and render each as it nears view. Buttons
   * may not exist yet when this first runs (the `@for` renders a cycle
   * later), so retry on the next frame until they do.
   */
  private install(panel: HTMLElement): void {
    const buttons = panel.querySelectorAll<HTMLElement>('.hk-pdf-thumbnail');
    if (buttons.length === 0) {
      requestAnimationFrame(() => {
        if (this.panel() === panel) this.install(panel);
      });
      return;
    }
    this.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const canvas = (e.target as HTMLElement).querySelector<HTMLCanvasElement>('canvas[data-thumb-page]');
          const num = canvas ? Number(canvas.dataset['thumbPage']) : 0;
          if (!num || this.rendered.has(num)) continue;
          this.rendered.add(num);
          void this.renderOne(num);
        }
      },
      // Queue thumbnails 500px ahead of the panel's view.
      { root: panel, rootMargin: '500px 0px', threshold: 0 },
    );
    for (const btn of Array.from(buttons)) this.observer.observe(btn);
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Paint one thumbnail off-thread, with the display rotation baked in. A
   * missing page or canvas un-marks it so a later pass retries; failures are
   * non-critical (a blank thumbnail still navigates).
   */
  private async renderOne(pageNumber: number): Promise<void> {
    if (!this.store.findPage(pageNumber)) {
      this.rendered.delete(pageNumber);
      return;
    }
    const canvas = this.store.element.querySelector<HTMLCanvasElement>(`canvas[data-thumb-page="${pageNumber}"]`);
    if (!canvas) {
      this.rendered.delete(pageNumber);
      requestAnimationFrame(() => {
        if (this.tabActive() && !this.rendered.has(pageNumber)) {
          this.rendered.add(pageNumber);
          void this.renderOne(pageNumber);
        }
      });
      return;
    }
    const session = this.store.session();
    const ctx = canvas.getContext('2d');
    if (!session || !ctx) return;
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
      ctx.restore();
      bitmap.close();
      canvas.style.width = `${THUMBNAIL_WIDTH}px`;
      canvas.style.height = `${Math.round((canvas.height / canvas.width) * THUMBNAIL_WIDTH)}px`;
    } catch {
      this.rendered.delete(pageNumber);
    }
  }

  /** Scroll the panel just enough to show the active thumbnail (never the outer page). */
  private scrollActiveIntoView(page: number): void {
    const panel = this.panel();
    const item = panel?.querySelector<HTMLCanvasElement>(`canvas[data-thumb-page="${page}"]`)?.closest('li');
    if (!panel || !item) return;
    const pRect = panel.getBoundingClientRect();
    const iRect = item.getBoundingClientRect();
    const MARGIN = 8;
    if (iRect.top < pRect.top) panel.scrollTop += iRect.top - pRect.top - MARGIN;
    else if (iRect.bottom > pRect.bottom) panel.scrollTop += iRect.bottom - pRect.bottom + MARGIN;
  }
}
