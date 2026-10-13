import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideColumns2,
  LucideDownload,
  LucideEllipsis,
  LucideMaximize,
  LucideMinus,
  LucidePanelLeft,
  LucidePenLine,
  LucideClipboardList,
  LucideRotateCcw,
  LucideSignature,
  LucideFileSignature,
  LucidePlus,
  LucidePrinter,
  LucideRotateCw,
  LucideScrollText,
  LucideSearch,
  LucideSquare,
} from '@lucide/angular';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfFindService } from '../services/pdf-find.service';
import { PdfFormsService } from '../services/pdf-forms.service';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { PdfDisplayMode } from '../pdf-viewer.types';

/**
 * The viewer's default toolbar: sidebar toggle, page navigation, zoom,
 * display mode, find, annotation tools, rotate, and file actions. Container
 * queries progressively move actions into the overflow menu as it narrows.
 */
@Component({
  selector: 'hk-pdf-toolbar',
  imports: [
    LucidePanelLeft,
    LucidePenLine,
    LucideClipboardList,
    LucideRotateCcw,
    LucideSignature,
    LucideFileSignature,
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
    LucideRotateCw,
    LucideColumns2,
  ],
  templateUrl: './pdf-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfToolbarComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly find = inject(PdfFindService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly tools = inject(PdfAnnotationToolsService);
  protected readonly forms = inject(PdfFormsService);
  protected readonly designer = inject(PdfFormDesignerService);
  protected readonly signatures = inject(PdfSignaturesService);
  protected readonly annotations = inject(PdfAnnotationsService);

  /** Enter "Prepare form": the annotation tools close (the two edit modes are exclusive). */
  protected startDesign(menu: HTMLDetailsElement): void {
    menu.open = false;
    this.tools.closeBar();
    this.designer.start();
  }
  protected readonly formFormats = ['json', 'xfdf', 'fdf'] as const;

  protected async importFormData(input: HTMLInputElement, menu: HTMLDetailsElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    menu.open = false;
    if (file) await this.document.importFormDataFile(file);
  }

  protected toggleAnnotationBar(): void {
    if (this.store.annotationBarOpen()) this.tools.closeBar();
    else this.store.annotationBarOpen.set(true);
  }

  protected toggleSidebar(): void {
    this.store.patchState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  }

  /** Display modes offered in the toolbar, with their label keys. */
  protected readonly modes = [
    { mode: 'continuous', label: 'continuousMode' },
    { mode: 'single', label: 'singlePageMode' },
    { mode: 'spread', label: 'twoPageMode' },
  ] as const satisfies readonly { mode: PdfDisplayMode; label: keyof ResolvedPdfViewerLabels }[];

  /** `'spread'` covers both spread variants (with and without a cover page). */
  protected isMode(mode: PdfDisplayMode): boolean {
    const current = this.store.state()?.mode;
    return mode === 'spread' ? current === 'spread' || current === 'spread-cover' : current === mode;
  }

  /**
   * Page field: jump to the typed page label or number (clamped by
   * `goToPage`). Anything unrecognised snaps back to the current page.
   */
  protected onPageInput(input: HTMLInputElement): void {
    const page = this.store.pageFromInput(input.value);
    if (page !== null) this.viewport.goToPage(page);
    input.value = this.store.labelFor(this.store.state()?.page ?? 0);
  }

  protected onZoomSelect(value: string): void {
    if (value === 'fit-width' || value === 'fit-page' || value === 'auto') {
      this.viewport.setZoom(value);
      return;
    }
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) this.viewport.setZoom(n);
  }
}
