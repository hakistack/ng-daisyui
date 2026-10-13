import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import {
  LucideBookOpen,
  LucideFileText,
  LucideMessageSquare,
  LucidePaperclip,
  LucidePlus,
  LucideRotateCw,
  LucideShieldCheck,
  LucideTrash2,
} from '@lucide/angular';
import { PdfSidebarTab } from '../pdf-viewer.types';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfThumbnailsService } from '../services/pdf-thumbnails.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { PdfCommentsComponent } from './pdf-comments.component';
import { PdfSignaturesPanelComponent } from './pdf-signatures-panel.component';

/**
 * The viewer sidebar: thumbnails (with rotate / insert / delete page actions),
 * bookmarks, annotations, attachments and digital signatures. Registers its thumbnail panel with
 * {@link PdfThumbnailsService}, which renders thumbnails lazily into it.
 */
@Component({
  selector: 'hk-pdf-sidebar',
  imports: [
    NgTemplateOutlet,
    PdfCommentsComponent,
    PdfSignaturesPanelComponent,
    LucideFileText,
    LucideBookOpen,
    LucideMessageSquare,
    LucidePaperclip,
    LucideRotateCw,
    LucideShieldCheck,
    LucidePlus,
    LucideTrash2,
  ],
  templateUrl: './pdf-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfSidebarComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly thumbnails = inject(PdfThumbnailsService);
  private readonly signatures = inject(PdfSignaturesService);

  /** The Signatures tab: when the document has signatures, or digital signing is configured. */
  protected readonly showSignaturesTab = computed(
    () =>
      (this.signatures.digital()?.length ?? 0) > 0 || this.signatures.canSignDigitally() || this.store.state()?.sidebarTab === 'signatures',
  );

  private readonly thumbnailPanel = viewChild.required<ElementRef<HTMLElement>>('thumbnailPanel');
  private readonly thumbnailList = viewChild<ElementRef<HTMLElement>>('thumbnailList');

  constructor() {
    effect(() => this.thumbnails.panel.set(this.thumbnailPanel().nativeElement));
    effect(() => this.thumbnails.list.set(this.thumbnailList()?.nativeElement ?? null));
    inject(DestroyRef).onDestroy(() => {
      this.thumbnails.panel.set(null);
      this.thumbnails.list.set(null);
    });
  }

  protected setTab(tab: PdfSidebarTab): void {
    this.store.patchState((s) => ({ ...s, sidebarTab: tab }));
  }

  protected thumbnailAriaLabel(pageNumber: number): string {
    return this.store.labels().thumbnailAriaLabel.replace('{page}', String(pageNumber));
  }

  /** Outline entries carry a 0-based page index. */
  protected outlineGoto(node: { pageIndex?: number }): void {
    if (typeof node?.pageIndex === 'number' && node.pageIndex >= 0) this.viewport.goToPage(node.pageIndex + 1);
  }
}
