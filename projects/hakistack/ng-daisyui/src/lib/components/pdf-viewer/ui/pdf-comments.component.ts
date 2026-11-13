import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { LucidePen, LucideTrash2 } from '@lucide/angular';
import { HkAnnotation, HkAnnotationType, PdfReviewStatus } from '../core/annotations/annotation.types';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { REVIEW_STATUSES, annotationTypeLabel, statusLabel } from './pdf-annotation-labels';

const TYPES: readonly HkAnnotationType[] = [
  'highlight',
  'underline',
  'strikeout',
  'squiggly',
  'rect',
  'ellipse',
  'line',
  'polygon',
  'polyline',
  'ink',
  'freetext',
  'note',
];

/** Soft (tinted) badge classes per review status. */
const STATUS_CLASS: Record<PdfReviewStatus, string> = {
  None: 'bg-base-200 border-base-300 text-base-content/70',
  Accepted: 'bg-success/10 border-success/20 text-success',
  Rejected: 'bg-error/10 border-error/20 text-error',
  Cancelled: 'bg-warning/10 border-warning/20 text-warning',
  Completed: 'bg-info/10 border-info/20 text-info',
};

/**
 * The comments panel (sidebar Annotations tab): every editable annotation,
 * grouped by page, filterable by type, author and status. Each card shows
 * the comment, its review status and replies; comments can be edited,
 * replied to, given a status, and deleted. Selecting a card selects the
 * annotation on the page, and the reverse.
 */
@Component({
  selector: 'hk-pdf-comments',
  imports: [LucidePen, LucideTrash2],
  templateUrl: './pdf-comments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PdfCommentsComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly annotations = inject(PdfAnnotationsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly statuses = REVIEW_STATUSES;
  protected readonly types = TYPES;

  protected readonly typeFilter = signal<HkAnnotationType | ''>('');
  protected readonly authorFilter = signal('');
  protected readonly statusFilter = signal<PdfReviewStatus | ''>('');
  /** The annotation whose comment is being edited. */
  protected readonly editingId = signal<string | null>(null);

  private readonly dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  protected readonly groups = computed(() => {
    const type = this.typeFilter();
    const author = this.authorFilter();
    const status = this.statusFilter();
    const pages = new Map<number, HkAnnotation[]>();
    for (const a of this.annotations.list()) {
      if (type && a.type !== type) continue;
      if (author && a.author !== author && !a.replies?.some((r) => r.author === author)) continue;
      if (status && (a.status ?? 'None') !== status) continue;
      pages.set(a.page, [...(pages.get(a.page) ?? []), a]);
    }
    return [...pages.entries()]
      .sort(([x], [y]) => x - y)
      .map(([page, items]) => ({ page, items: items.sort((p, q) => p.rect.y - q.rect.y || p.rect.x - q.rect.x) }));
  });

  constructor() {
    // Reveal a thread asked for (from the page or the properties panel) and focus its reply box.
    effect(() => {
      const focus = this.annotations.commentsFocus();
      if (focus) queueMicrotask(() => this.reveal(focus.id, true));
    });
    // Keep the selected annotation's card in view.
    effect(() => {
      const id = this.annotations.selectedId();
      if (id) queueMicrotask(() => this.reveal(id, false));
    });
  }

  protected typeLabel(a: HkAnnotation): string {
    return annotationTypeLabel(a, this.store.labels());
  }

  protected typeName(type: HkAnnotationType): string {
    return annotationTypeLabel({ type }, this.store.labels());
  }

  protected statusLabel(status: PdfReviewStatus | undefined): string {
    return statusLabel(status, this.store.labels());
  }

  protected statusClass(status: PdfReviewStatus | undefined): string {
    return STATUS_CLASS[status ?? 'None'];
  }

  protected pageLabel(page: number): string {
    return this.store.labels().pageGroup.replace('{page}', this.store.labelFor(page + 1));
  }

  protected date(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : this.dateFormat.format(d);
  }

  protected select(a: HkAnnotation): void {
    if (this.annotations.selectedId() !== a.id) this.annotations.select(a.id, true);
  }

  protected saveComment(a: HkAnnotation, value: string): void {
    this.editingId.set(null);
    void this.annotations.setContents(a.id, value.trim());
  }

  protected reply(a: HkAnnotation, box: HTMLTextAreaElement): void {
    const text = box.value.trim();
    if (!text) return;
    box.value = '';
    void this.annotations.addReply(a.id, text);
  }

  protected onReplyKeydown(ev: KeyboardEvent, a: HkAnnotation, box: HTMLTextAreaElement): void {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      this.reply(a, box);
    }
  }

  protected setStatus(a: HkAnnotation, ev: Event): void {
    void this.annotations.setStatus(a.id, (ev.target as HTMLSelectElement).value as PdfReviewStatus);
  }

  protected onFilter(which: 'type' | 'author' | 'status', ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value;
    if (which === 'type') this.typeFilter.set(value as HkAnnotationType | '');
    else if (which === 'author') this.authorFilter.set(value);
    else this.statusFilter.set(value as PdfReviewStatus | '');
  }

  /** Scroll a card into view (within the sidebar only), optionally focusing its reply box. */
  private reveal(id: string, focusReply: boolean): void {
    const card = this.host.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.scrollIntoView?.({ block: 'nearest' });
    if (focusReply) card.querySelector<HTMLTextAreaElement>('textarea[data-reply]')?.focus({ preventScroll: true });
  }
}
