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
  LucideMessageSquare,
  LucideMinus,
  LucidePanelLeft,
  LucidePen,
  LucidePlus,
  LucidePrinter,
  LucideRotateCw,
  LucideScrollText,
  LucideSearch,
  LucideSquare,
  LucideType,
} from '@lucide/angular';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfFindService } from '../services/pdf-find.service';
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
    LucideMessageSquare,
    LucideType,
    LucidePen,
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
