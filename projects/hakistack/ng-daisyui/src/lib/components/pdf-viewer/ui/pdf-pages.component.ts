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
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { PdfAnnotationLayerComponent } from './pdf-annotation-layer.component';
import { PdfFormDesignLayerComponent } from './pdf-form-design-layer.component';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';

const VIEWPORT_CLASSES = {
  default: 'hk-pdf-viewport relative flex-1 min-h-0 min-w-0 overflow-auto bg-base-200 p-4',
  preview: 'hk-pdf-viewport hk-pdf-preview-viewport relative overflow-auto bg-base-200/30 rounded-box border border-base-300 p-4',
} as const;

/**
 * The scrollable page area: the error panel, the non-fatal operation alert,
 * the mounted window of pages (canvas + text layer + overlay + edit layer)
 * between two spacers, the page-change live region, and the loading state.
 * Registers its viewport, stack and page wrappers with
 * {@link PdfViewportService}, which windows and renders into them.
 */
@Component({
  selector: 'hk-pdf-pages',
  imports: [PdfAnnotationLayerComponent, PdfFormDesignLayerComponent],
  templateUrl: './pdf-pages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfPagesComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly tools = inject(PdfAnnotationToolsService);
  private readonly annotations = inject(PdfAnnotationsService);
  protected readonly designer = inject(PdfFormDesignerService);

  /** `default`: fills the layout's flex row. `preview`: a bordered, rounded box. */
  readonly variant = input<keyof typeof VIEWPORT_CLASSES>('default');
  protected readonly viewportClass = computed(() => VIEWPORT_CLASSES[this.variant()]);

  private readonly viewportRef = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly stackRef = viewChild<ElementRef<HTMLElement>>('stack');
  private readonly wrapperRefs = viewChildren<ElementRef<HTMLElement>>('pageWrapper');

  /** A press that no annotation, handle or editor took clears the selection. */
  protected onBackgroundPointerDown(): void {
    if (this.annotations.selectedId()) this.annotations.select(null);
  }

  constructor() {
    effect(() => this.viewport.viewportEl.set(this.viewportRef().nativeElement));
    effect(() => this.viewport.stackEl.set(this.stackRef()?.nativeElement ?? null));
    effect(() => {
      const byPage = new Map<number, HTMLElement>();
      for (const ref of this.wrapperRefs()) byPage.set(Number(ref.nativeElement.dataset['pageNumber']), ref.nativeElement);
      this.viewport.pageWrappers.set(byPage);
    });
    inject(DestroyRef).onDestroy(() => {
      this.viewport.viewportEl.set(null);
      this.viewport.stackEl.set(null);
      this.viewport.pageWrappers.set(new Map());
    });
  }
}
