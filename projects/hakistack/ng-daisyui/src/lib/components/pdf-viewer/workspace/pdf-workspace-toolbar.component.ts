import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideClipboardList,
  LucideColumns2,
  LucideDownload,
  LucideEllipsis,
  LucideFile,
  LucideFileSignature,
  LucideLayoutGrid,
  LucideMaximize,
  LucideMinus,
  LucidePenLine,
  LucidePlus,
  LucidePrinter,
  LucideRotateCcw,
  LucideRotateCw,
  LucideScrollText,
  LucideSearch,
  LucideSignature,
  LucideSquare,
  LucideX,
} from '@lucide/angular';
import { MesaSaveStatusComponent } from '../../mesa/mesa-save-status.component';
import { MesaToolbarComponent } from '../../mesa/mesa-toolbar.component';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { PdfDisplayMode } from '../pdf-viewer.types';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfFindService } from '../services/pdf-find.service';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfFormsService } from '../services/pdf-forms.service';
import { PdfPagesService } from '../services/pdf-pages.service';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { PdfWorkspaceState, PdfWorkspaceView } from './pdf-workspace.state';

/** Zoom presets of the zoom select (numbers are scale factors). */
const ZOOM_PRESETS = ['0.5', '0.75', '1', '1.25', '1.5', '2', '3'] as const;

/**
 * The workspace's main toolbar (Mesa §3): a badge naming the document (or the
 * edit mode), the save state, then joins for paging, zoom, the view and the
 * tools, and a menu for the rest. Download is the one primary action, and
 * only while there are unsaved changes.
 */
@Component({
  selector: 'hk-pdf-workspace-toolbar',
  imports: [
    MesaToolbarComponent,
    MesaSaveStatusComponent,
    LucideChevronLeft,
    LucideChevronRight,
    LucideMinus,
    LucidePlus,
    LucideFile,
    LucideLayoutGrid,
    LucideSearch,
    LucidePenLine,
    LucideSignature,
    LucideFileSignature,
    LucideClipboardList,
    LucideEllipsis,
    LucideScrollText,
    LucideSquare,
    LucideColumns2,
    LucideRotateCw,
    LucideRotateCcw,
    LucidePrinter,
    LucideDownload,
    LucideMaximize,
    LucideX,
  ],
  templateUrl: './pdf-workspace-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfWorkspaceToolbarComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly find = inject(PdfFindService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly tools = inject(PdfAnnotationToolsService);
  protected readonly annotations = inject(PdfAnnotationsService);
  protected readonly forms = inject(PdfFormsService);
  protected readonly designer = inject(PdfFormDesignerService);
  protected readonly signatures = inject(PdfSignaturesService);
  protected readonly pages = inject(PdfPagesService);
  protected readonly ws = inject(PdfWorkspaceState);

  protected readonly zoomPresets = ZOOM_PRESETS;
  protected readonly formFormats = ['json', 'xfdf', 'fdf'] as const;

  protected readonly page = computed(() => this.store.state()?.page ?? 0);
  protected readonly numPages = computed(() => this.store.state()?.numPages ?? 0);

  /** The badge: the edit mode while one is on, else the file and its page count. */
  protected readonly badge = computed(() => {
    const l = this.store.labels();
    if (this.designer.active()) return { text: l.designingBadge, mode: true };
    if (this.store.annotationBarOpen()) return { text: l.annotatingBadge, mode: true };
    const count = this.store.pageNumbers().length;
    const name = this.document.fileName();
    const pages = (count === 1 ? l.pageCountBadgeOne : l.pageCountBadge).replace('{count}', String(count));
    return { text: count ? `${name} · ${pages}` : name, mode: false };
  });

  protected readonly exitLabel = computed(() => this.store.labels().exitMode.replace('{mode}', this.badge().text));

  /** The zoom select's value; a zoom no preset matches shows as its own (current) option. */
  protected readonly zoomValue = computed(() => {
    const mode = this.store.state()?.zoomMode ?? 'fit-width';
    if (typeof mode === 'string') return mode;
    const value = String(mode);
    return (ZOOM_PRESETS as readonly string[]).includes(value) ? value : 'custom';
  });

  protected readonly rotateCurrentLabel = computed(() =>
    this.store.labels().rotatePageAria.replace('{page}', this.store.labelFor(this.store.state()?.page ?? 1)),
  );

  /** Display modes, with their label keys. */
  protected readonly modes = [
    { mode: 'continuous', label: 'continuousMode' },
    { mode: 'single', label: 'singlePageMode' },
    { mode: 'spread', label: 'twoPageMode' },
  ] as const satisfies readonly { mode: PdfDisplayMode; label: keyof ResolvedPdfViewerLabels }[];

  protected isMode(mode: PdfDisplayMode): boolean {
    const current = this.store.state()?.mode;
    return mode === 'spread' ? current === 'spread' || current === 'spread-cover' : current === mode;
  }

  protected zoomPresetLabel(value: string): string {
    return `${Math.round(Number(value) * 100)}%`;
  }

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

  protected setView(view: PdfWorkspaceView): void {
    if (view === 'grid' && !this.pages.canOrganize()) return;
    this.ws.view.set(view);
  }

  protected toggleAnnotationBar(): void {
    if (this.store.annotationBarOpen()) this.tools.closeBar();
    else this.store.annotationBarOpen.set(true);
  }

  /** Close a `<details>` menu after choosing an item. */
  protected close(menu: HTMLDetailsElement): void {
    menu.open = false;
  }

  protected startDesign(menu: HTMLDetailsElement): void {
    menu.open = false;
    this.tools.closeBar();
    this.ws.view.set('sheet');
    this.designer.start();
  }

  protected async importFormData(input: HTMLInputElement, menu: HTMLDetailsElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    menu.open = false;
    if (file) await this.document.importFormDataFile(file);
  }
}
