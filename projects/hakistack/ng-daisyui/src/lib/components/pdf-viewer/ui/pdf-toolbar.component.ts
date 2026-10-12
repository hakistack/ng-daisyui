import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
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

  /** Page field: jump to the typed page (clamped by `goToPage`). */
  protected onPageInput(value: string): void {
    const n = Number(value);
    if (Number.isFinite(n)) this.viewport.goToPage(n);
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
