import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
  viewChildren,
} from '@angular/core';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';

const VIEWPORT_CLASSES = {
  default: 'hk-pdf-viewport relative flex-1 min-h-0 min-w-0 overflow-auto bg-base-200 p-4',
  preview: 'hk-pdf-viewport hk-pdf-preview-viewport relative overflow-auto bg-base-200/30 rounded-box border border-base-300 p-4',
} as const;

/**
 * The scrollable page area: the error panel, the non-fatal operation alert,
 * one wrapper per page (canvas + text layer + overlay + edit layer), the
 * page-change live region, and the loading state. Registers its viewport and
 * page wrappers with {@link PdfViewportService}, which renders into them.
 */
@Component({
  selector: 'hk-pdf-pages',
  templateUrl: './pdf-pages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfPagesComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly tools = inject(PdfAnnotationToolsService);

  /** `default`: fills the layout's flex row. `preview`: a bordered, rounded box. */
  readonly variant = input<keyof typeof VIEWPORT_CLASSES>('default');
  protected readonly viewportClass = computed(() => VIEWPORT_CLASSES[this.variant()]);

  private readonly viewportRef = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly wrapperRefs = viewChildren<ElementRef<HTMLElement>>('pageWrapper');

  constructor() {
    effect(() => this.viewport.viewportEl.set(this.viewportRef().nativeElement));
    effect(() => this.viewport.pageWrappers.set(this.wrapperRefs().map((r) => r.nativeElement)));
    inject(DestroyRef).onDestroy(() => {
      this.viewport.viewportEl.set(null);
      this.viewport.pageWrappers.set([]);
    });
  }
}
