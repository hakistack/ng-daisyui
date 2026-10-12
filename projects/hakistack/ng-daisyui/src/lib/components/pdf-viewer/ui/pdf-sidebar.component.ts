import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, viewChild } from '@angular/core';
import {
  LucideBookOpen,
  LucideFileText,
  LucideMessageSquare,
  LucidePaperclip,
  LucidePlus,
  LucideRotateCw,
  LucideTrash2,
} from '@lucide/angular';
import { PdfSidebarTab } from '../pdf-viewer.types';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfThumbnailsService } from '../services/pdf-thumbnails.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { PdfCommentsComponent } from './pdf-comments.component';

/**
 * The viewer sidebar: thumbnails (with rotate / insert / delete page actions),
 * bookmarks, annotations and attachments. Registers its thumbnail panel with
 * {@link PdfThumbnailsService}, which renders thumbnails lazily into it.
 */
@Component({
  selector: 'hk-pdf-sidebar',
  imports: [
    NgTemplateOutlet,
    PdfCommentsComponent,
    LucideFileText,
    LucideBookOpen,
    LucideMessageSquare,
    LucidePaperclip,
    LucideRotateCw,
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
