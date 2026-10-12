import { Injectable, Injector, inject } from '@angular/core';
import { isSafeLinkUri } from '../pdf-viewer.helpers';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFindService } from './pdf-find.service';
import { PdfFormsService } from './pdf-forms.service';
import { PdfPageDataService } from './pdf-page-data.service';
import { PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

/**
 * Builds the DOM layers stacked over each page canvas: the selectable text
 * layer and the interactive overlay (links + form widgets). Called by the
 * viewport when it renders a page.
 */
@Injectable()
export class PdfLayersService {
  private readonly store = inject(PdfViewerStore);
  private readonly pageData = inject(PdfPageDataService);
  private readonly forms = inject(PdfFormsService);
  // Back-edges (find and viewport both call into layers): resolved lazily to avoid DI cycles.
  private readonly injector = inject(Injector);
  private get find(): PdfFindService {
    return this.injector.get(PdfFindService);
  }
  private get viewport(): PdfViewportService {
    return this.injector.get(PdfViewportService);
  }
  private get annotations(): PdfAnnotationsService {
    return this.injector.get(PdfAnnotationsService);
  }

  /**
   * Text layer: one transparent, absolutely positioned `<span>` per PDFium
   * text segment, sized in CSS px (points × scale) over the canvas so text is
   * selectable and search highlights land on the right runs. Each span is
   * stretched with `scaleX` to its segment's width so selection tracks the
   * glyphs; width reads are batched before writes (one layout pass).
   * Span order ≡ segment order ≡ search-index order.
   */
  async renderTextLayer(container: HTMLElement, viewportWidth: number, epoch: number, pageNumber: number): Promise<void> {
    const segs = await this.pageData.segments(pageNumber);
    if (epoch !== this.store.renderEpoch || !segs) return;

    this.pageData.indexPageText(
      pageNumber,
      segs.map((s) => s.text),
    );

    const page = this.store.findPage(pageNumber);
    if (!page) return;
    const scale = page.baseWidth > 0 ? viewportWidth / page.baseWidth : 1;

    container.replaceChildren();
    this.find.forgetTextLayer(container);

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

    const naturals = spans.map((sp) => sp.offsetWidth);
    for (let i = 0; i < spans.length; i++) {
      const target = segs[i].w * scale;
      if (naturals[i] > 0 && target > 0) spans[i].style.transform = `scaleX(${target / naturals[i]})`;
    }

    this.find.registerTextLayer(pageNumber, container, spans);
  }

  /**
   * Interactive overlay: clickable link targets and fillable form widgets,
   * positioned in CSS px over the canvas. Their appearances are baked into the
   * raster; this layer only adds the live controls.
   */
  async renderOverlay(container: HTMLElement, viewportWidth: number, epoch: number, pageNumber: number): Promise<void> {
    if (!this.store.session()) return;
    const [links, fields] = await Promise.all([this.pageData.links(pageNumber), this.pageData.fields(pageNumber)]);
    if (epoch !== this.store.renderEpoch) return;

    container.replaceChildren();
    if (links.length === 0 && fields.length === 0) return;

    const page = this.store.findPage(pageNumber);
    if (!page) return;
    const scale = page.baseWidth > 0 ? viewportWidth / page.baseWidth : 1;
    const labels = this.store.labels();
    const frag = document.createDocumentFragment();

    // Links the annotation layer manages (and may have moved or deleted) aren't PDFium's to show.
    const managed = this.annotations.managedLinkRects(pageNumber);
    for (const link of links) {
      if (managed.some((r) => sameRect(r, link))) continue;
      const isUri = link.uri.length > 0;
      // A hostile PDF can carry `javascript:`/`data:` URIs; only open safe schemes.
      if (isUri && !isSafeLinkUri(link.uri)) continue;
      const el = document.createElement(isUri ? 'a' : 'button');
      el.className = 'hk-pdf-link';
      positionOverlayEl(el, link, scale);
      if (isUri) {
        const a = el as HTMLAnchorElement;
        a.href = link.uri;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', link.uri);
      } else {
        const target = link.pageIndex;
        el.setAttribute('type', 'button');
        el.setAttribute('aria-label', labels.linkToPage.replace('{page}', String(target + 1)));
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.viewport.goToPage(target + 1);
        });
      }
      frag.appendChild(el);
    }

    for (const field of fields) {
      const el = this.forms.buildWidget(field, pageNumber - 1);
      if (!el) continue;
      positionOverlayEl(el, field, scale);
      el.style.pointerEvents = 'auto';
      frag.appendChild(el);
    }

    container.appendChild(frag);
  }
}

/** Whether two rects (points) are the same within half a point. */
function sameRect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;
}

/** Absolutely position an overlay element from a points rect × render scale. */
function positionOverlayEl(el: HTMLElement, rect: { x: number; y: number; w: number; h: number }, scale: number): void {
  const s = el.style;
  s.position = 'absolute';
  s.left = `${rect.x * scale}px`;
  s.top = `${rect.y * scale}px`;
  s.width = `${rect.w * scale}px`;
  s.height = `${rect.h * scale}px`;
}
