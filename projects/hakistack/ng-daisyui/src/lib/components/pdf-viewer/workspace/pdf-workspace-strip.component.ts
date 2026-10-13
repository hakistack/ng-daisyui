import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { LucideChevronRight } from '@lucide/angular';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfThumbnailContent, PdfThumbnailsService } from '../services/pdf-thumbnails.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { PdfOrganizerThumbDirective } from '../ui/pdf-page-organizer.component';
import { PdfWorkspaceState } from './pdf-workspace.state';

/** The thumbnails' square (px): pages fit in it. */
const THUMB = 96;

/**
 * The open document's pages as a horizontal strip under the pages (Mesa,
 * like a contact strip): a header that folds it (the document's name and the
 * position), then one thumbnail per page — painted while in view, from the
 * shared raster cache. One tab stop on the current page; ← → Home End move.
 */
@Component({
  selector: 'hk-pdf-workspace-strip',
  imports: [LucideChevronRight, PdfOrganizerThumbDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'border-base-300 bg-base-100 block shrink-0 border-t' },
  template: `
    <div
      class="text-base-content/70 flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-sm"
      [class.border-b]="ws.stripOpen()"
      [class.border-base-300]="ws.stripOpen()"
    >
      <button
        type="button"
        class="btn btn-ghost btn-sm min-w-0 gap-1.5 font-normal"
        [attr.aria-expanded]="ws.stripOpen()"
        [attr.aria-controls]="uid"
        [attr.aria-label]="(ws.stripOpen() ? store.labels().hidePageStrip : store.labels().showPageStrip) + ' — ' + document.fileName()"
        (click)="ws.stripOpen.set(!ws.stripOpen())"
      >
        <svg
          lucideChevronRight
          [size]="14"
          class="shrink-0 transition-transform motion-reduce:transition-none"
          [class.rotate-90]="ws.stripOpen()"
          aria-hidden="true"
        ></svg>
        <span class="truncate">{{ document.fileName() }}</span>
      </button>
      @if (count() > 0) {
        <span class="font-mono text-xs tabular-nums">{{ position() }}</span>
      }
    </div>

    @if (ws.stripOpen()) {
      <ul
        #strip
        [id]="uid"
        class="flex gap-1 overflow-x-auto overflow-y-hidden px-2 pt-2 pb-1.5"
        [attr.aria-label]="store.labels().railPages"
      >
        @for (item of items(); track item.n) {
          <li class="shrink-0">
            <button
              type="button"
              class="rounded-field hover:bg-base-200 flex flex-col items-center gap-1 p-1.5 focus-visible:outline-2 focus-visible:outline-base-content"
              [class.bg-base-200]="current() === item.n"
              [attr.data-strip-page]="item.n"
              [attr.tabindex]="current() === item.n ? 0 : -1"
              [attr.aria-current]="current() === item.n ? 'page' : null"
              [attr.aria-label]="thumbLabel(item.n)"
              (click)="viewport.goToPage(item.n)"
              (keydown)="onKey($event)"
            >
              <span class="flex items-end justify-center" [style.width.px]="thumb" [style.height.px]="thumb">
                <span
                  class="relative block overflow-hidden rounded-sm bg-white"
                  [class.ring-1]="current() !== item.n"
                  [class.ring-base-content/45]="current() !== item.n"
                  [class.ring-4]="current() === item.n"
                  [class.ring-neutral]="current() === item.n"
                >
                  @if (item.content) {
                    <canvas class="block" [hkPdfOrganizerThumb]="item.content" [size]="thumb"></canvas>
                  }
                </span>
              </span>
              @if (current() === item.n) {
                <span class="badge badge-primary badge-sm font-mono tabular-nums">{{ store.labelFor(item.n) }}</span>
              } @else {
                <span class="text-base-content/70 font-mono text-xs tabular-nums">{{ store.labelFor(item.n) }}</span>
              }
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class PdfWorkspaceStripComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  private readonly thumbnails = inject(PdfThumbnailsService);
  protected readonly ws = inject(PdfWorkspaceState);

  private static nextId = 0;
  protected readonly uid = `hk-pdf-ws-strip-${++PdfWorkspaceStripComponent.nextId}`;
  protected readonly thumb = THUMB;
  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');

  protected readonly current = computed(() => this.store.state()?.page ?? 0);
  protected readonly count = computed(() => this.store.pageNumbers().length);
  protected readonly position = computed(() =>
    this.store.labels().pageIndicator.replace('{current}', this.store.labelFor(this.current())).replace('{total}', String(this.count())),
  );

  /** One entry per page with what its thumbnail shows (recomputed as pages, annotations or fields change). */
  protected readonly items = computed<{ n: number; content: PdfThumbnailContent | null }[]>(() => {
    this.store.pageRotations();
    return this.store.pageNumbers().map((n) => ({ n, content: this.thumbnails.contentFor(n) }));
  });

  constructor() {
    // Keep the current page in view as it changes.
    effect(() => {
      const page = this.current();
      const strip = this.strip();
      if (!strip || page <= 0) return;
      untracked(() => requestAnimationFrame(() => this.reveal(page)));
    });
  }

  protected thumbLabel(pageNumber: number): string {
    return this.store.labels().thumbnailAriaLabel.replace('{page}', this.store.labelFor(pageNumber));
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.count();
    const from = this.current();
    const to: Record<string, number> = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 1, End: count };
    const target = to[event.key];
    if (target === undefined || count === 0) return;
    event.preventDefault();
    event.stopPropagation(); // not the viewer's own page keys as well
    const page = Math.max(1, Math.min(count, target));
    this.viewport.goToPage(page);
    requestAnimationFrame(() => this.button(page)?.focus({ preventScroll: true }));
  }

  /** Scroll the strip just enough to show a page's thumbnail. */
  private reveal(page: number): void {
    const strip = this.strip()?.nativeElement;
    const button = this.button(page);
    if (!strip || !button) return;
    const left = button.offsetLeft - strip.offsetLeft;
    const right = left + button.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left - 8;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth + 8;
  }

  private button(page: number): HTMLElement | null {
    return this.strip()?.nativeElement.querySelector<HTMLElement>(`[data-strip-page="${page}"]`) ?? null;
  }
}
