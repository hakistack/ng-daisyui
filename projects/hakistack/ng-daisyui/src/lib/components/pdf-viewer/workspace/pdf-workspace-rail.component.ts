import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { LucidePaperclip } from '@lucide/angular';
import { MesaStateComponent } from '../../mesa/mesa-state.component';
import { PdfDocumentService } from '../services/pdf-document.service';
import { THUMBNAIL_WIDTH, PdfThumbnailsService } from '../services/pdf-thumbnails.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { PdfWorkspaceRailMode, PdfWorkspaceState } from './pdf-workspace.state';

/**
 * The workspace rail, split in two: the document list on top (the host's
 * {@link PdfWorkspaceRailExtra}, with its own scroll), and below it the open
 * document — headed by its name — with its page thumbnails (virtualized by
 * {@link PdfThumbnailsService}, one tab stop on the current page, arrows to
 * move), outline or attachments. Only modes the document has show.
 */
@Component({
  selector: 'hk-pdf-workspace-rail',
  imports: [NgTemplateOutlet, LucidePaperclip, MesaStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <!-- The documents (the host's list), with their own scroll; the open one's contents below. -->
    @if (ws.extraRail(); as extra) {
      <section class="border-base-300 flex max-h-[40%] min-h-0 shrink-0 flex-col border-b" [attr.aria-labelledby]="uid + '-docs'">
        <h2 [id]="uid + '-docs'" class="border-base-300 truncate border-b px-3 py-2 text-sm font-semibold">
          {{ extra.title ?? extra.label }}
        </h2>
        <ng-container [ngTemplateOutlet]="extra.template" />
      </section>
    }

    <div class="border-base-300 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b px-3 py-2">
      <h2 class="min-w-24 flex-1 truncate text-sm font-semibold" [title]="title()">{{ title() }}</h2>
      @if (modes().length > 1) {
        <div class="join" role="group" [attr.aria-label]="store.labels().railModeAria">
          @for (m of modes(); track m.mode) {
            <button
              type="button"
              class="btn btn-xs join-item"
              [class.btn-primary]="ws.railMode() === m.mode"
              [attr.aria-pressed]="ws.railMode() === m.mode"
              (click)="ws.railMode.set(m.mode)"
            >
              {{ m.label }}
            </button>
          }
        </div>
      }
    </div>

    <!-- Thumbnails stay mounted (hidden) across modes, so their canvases survive a switch. -->
    <div
      #panel
      class="min-h-0 flex-1 overflow-auto"
      [hidden]="ws.railMode() !== 'thumbnails'"
      [attr.tabindex]="currentMounted() ? null : 0"
      [attr.aria-label]="currentMounted() ? null : store.labels().railPages"
      [attr.role]="currentMounted() ? null : 'region'"
    >
      @if (store.pageNumbers().length > 0) {
        <ul #list class="flex flex-col items-center gap-2 p-3" [attr.aria-label]="store.labels().railPages">
          @if (thumbnails.spacerBefore() > 0) {
            <li class="w-px shrink-0" aria-hidden="true" [style.height.px]="thumbnails.spacerBefore()"></li>
          }
          @for (n of thumbnails.mountedPages(); track n) {
            <li data-thumb-item>
              <button
                type="button"
                class="rounded-field hover:bg-base-200 flex flex-col items-center gap-1 p-1.5 focus-visible:outline-2 focus-visible:outline-base-content"
                [class.bg-base-200]="current() === n"
                [attr.data-thumb-button]="n"
                [attr.tabindex]="current() === n ? 0 : -1"
                [attr.aria-current]="current() === n ? 'page' : null"
                [attr.aria-label]="thumbLabel(n)"
                (click)="viewport.goToPage(n)"
                (keydown)="onListKey($event)"
              >
                <span
                  class="relative block overflow-hidden rounded-sm bg-white"
                  [class.ring-1]="current() !== n"
                  [class.ring-base-content/45]="current() !== n"
                  [class.ring-4]="current() === n"
                  [class.ring-neutral]="current() === n"
                >
                  <span class="bg-base-200 absolute inset-0 motion-safe:animate-pulse" aria-hidden="true"></span>
                  <canvas
                    class="relative block"
                    [attr.data-thumb-page]="n"
                    [style.width.px]="thumbWidth"
                    [style.height.px]="thumbnails.canvasHeight(n)"
                  ></canvas>
                </span>
                @if (current() === n) {
                  <span class="badge badge-primary badge-sm font-mono tabular-nums">{{ store.labelFor(n) }}</span>
                } @else {
                  <span class="text-base-content/70 font-mono text-xs tabular-nums">{{ store.labelFor(n) }}</span>
                }
              </button>
            </li>
          }
          @if (thumbnails.spacerAfter() > 0) {
            <li class="w-px shrink-0" aria-hidden="true" [style.height.px]="thumbnails.spacerAfter()"></li>
          }
        </ul>
      } @else if (!store.state()?.error) {
        <hk-mesa-state kind="loading" [message]="store.labels().loading" />
      }
    </div>

    @switch (ws.railMode()) {
      @case ('bookmarks') {
        <div class="min-h-0 flex-1 overflow-auto">
          @if (store.outline() === null) {
            <hk-mesa-state kind="loading" [message]="store.labels().loading" />
          } @else if (store.outline()!.length === 0) {
            <hk-mesa-state kind="empty" [message]="store.labels().noBookmarks" />
          } @else {
            <ul class="menu menu-sm w-full p-2">
              @for (node of store.outline()!; track $index) {
                <ng-container [ngTemplateOutlet]="outlineNode" [ngTemplateOutletContext]="{ $implicit: node }" />
              }
            </ul>
          }
        </div>
      }
      @case ('attachments') {
        <div class="min-h-0 flex-1 overflow-auto">
          @if (store.attachments() === null) {
            <hk-mesa-state kind="loading" [message]="store.labels().loading" />
          } @else if (store.attachments()!.length === 0) {
            <hk-mesa-state kind="empty" [message]="store.labels().noAttachments" />
          } @else {
            <ul class="flex flex-col gap-0.5 p-2">
              @for (att of store.attachments(); track $index) {
                <li>
                  <button
                    type="button"
                    class="rounded-field hover:bg-base-200 flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left text-sm"
                    [title]="att.description || att.filename"
                    (click)="document.downloadAttachment(att)"
                  >
                    <svg lucidePaperclip [size]="14" class="shrink-0" aria-hidden="true"></svg>
                    <span class="min-w-0 truncate">{{ att.filename }}</span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }
    }

    <ng-template #outlineNode let-node>
      <li>
        <button type="button" (click)="outlineGoto(node)">{{ node.title || store.labels().untitledBookmark }}</button>
        @if (node.items?.length) {
          <ul>
            @for (child of node.items; track $index) {
              <ng-container [ngTemplateOutlet]="outlineNode" [ngTemplateOutletContext]="{ $implicit: child }" />
            }
          </ul>
        }
      </li>
    </ng-template>
  `,
})
export class PdfWorkspaceRailComponent {
  private static nextId = 0;
  protected readonly uid = `hk-pdf-ws-rail-${++PdfWorkspaceRailComponent.nextId}`;
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly thumbnails = inject(PdfThumbnailsService);
  protected readonly ws = inject(PdfWorkspaceState);

  protected readonly thumbWidth = THUMBNAIL_WIDTH;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly current = computed(() => this.store.state()?.page ?? 0);
  /** Whether the current page's thumbnail is mounted (it holds the list's tab stop). */
  protected readonly currentMounted = computed(() => this.thumbnails.mountedPages().includes(this.current()));

  /** Rail modes: pages always; the outline and attachments when the document has them (the workspace loads both with the rail). */
  /** What the open document's section shows: its pages, and its outline and attachments when it has them. */
  protected readonly modes = computed(() => {
    const l = this.store.labels();
    const out: { mode: PdfWorkspaceRailMode; label: string }[] = [{ mode: 'thumbnails', label: l.railPages }];
    const mode = this.ws.railMode();
    if (this.store.outline()?.length || mode === 'bookmarks') out.push({ mode: 'bookmarks', label: l.bookmarksTab });
    if (this.store.attachments()?.length || mode === 'attachments') out.push({ mode: 'attachments', label: l.attachmentsTab });
    return out;
  });

  /** The open document's section heading: "Form W-9.pdf · 6 pages". */
  protected readonly title = computed(() => {
    const l = this.store.labels();
    const count = this.store.pageNumbers().length;
    const name = this.document.fileName();
    if (!count) return name;
    return `${name} · ${(count === 1 ? l.pageCountBadgeOne : l.pageCountBadge).replace('{count}', String(count))}`;
  });

  constructor() {
    effect(() => this.thumbnails.panel.set(this.panel().nativeElement));
    effect(() => this.thumbnails.list.set(this.list()?.nativeElement ?? null));
    inject(DestroyRef).onDestroy(() => {
      this.thumbnails.panel.set(null);
      this.thumbnails.list.set(null);
    });
  }

  protected thumbLabel(pageNumber: number): string {
    return this.store.labels().thumbnailAriaLabel.replace('{page}', this.store.labelFor(pageNumber));
  }

  /** Outline entries carry a 0-based page index. */
  protected outlineGoto(node: { pageIndex?: number }): void {
    if (typeof node?.pageIndex === 'number' && node.pageIndex >= 0) this.viewport.goToPage(node.pageIndex + 1);
  }

  /** Arrows / Home / End move to a page and keep focus on its thumbnail (mounted once the list scrolls to it). */
  protected onListKey(event: KeyboardEvent): void {
    const count = this.store.pageNumbers().length;
    const from = this.current();
    const to: Record<string, number> = { ArrowUp: from - 1, ArrowDown: from + 1, Home: 1, End: count };
    const target = to[event.key];
    if (target === undefined || count === 0) return;
    event.preventDefault();
    event.stopPropagation(); // not the viewer's own page keys as well
    const page = Math.max(1, Math.min(count, target));
    this.viewport.goToPage(page);
    this.focusThumb(page, 6);
  }

  private focusThumb(page: number, tries: number): void {
    requestAnimationFrame(() => {
      const button = this.list()?.nativeElement.querySelector<HTMLElement>(`[data-thumb-button="${page}"]`);
      if (button) button.focus();
      else if (tries > 0) this.focusThumb(page, tries - 1);
    });
  }
}
