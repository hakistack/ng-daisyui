import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { VirtualScrollerComponent, VirtualScrollerLazyLoadEvent } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { PG_ITEM_COUNT, PgItem, pgItem, VIRTUAL_SCROLLER_PLAYGROUND, VirtualScrollerPgState } from '../specs/virtual-scroller';
import type { PlaygroundState } from '../playground.types';

interface ScrollerPreview {
  readonly s: VirtualScrollerPgState;
  readonly items: WritableSignal<readonly (PgItem | null)[]>;
}

@Component({
  selector: 'app-virtual-scroller-playground',
  imports: [PlaygroundComponent, VirtualScrollerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let p = previewFor(raw);
        <hk-virtual-scroller
          class="rounded-box border border-base-content/10"
          [items]="p.items()"
          [itemSize]="p.s.itemSize"
          [numColumns]="p.s.numColumns"
          [viewportHeight]="p.s.viewportHeight"
          [scrollDelay]="p.s.scrollDelay"
          [lazy]="p.s.lazy"
          [loading]="p.s.loading"
          (scrollIndexChange)="log('scrollIndexChange', $event)"
          (scrolled)="log('scrolled', $event)"
          (lazyLoad)="log('lazyLoad', $event); load(p, $event)"
        >
          <ng-template #item let-item>
            <div class="flex items-center justify-between gap-2 px-3 border-b border-base-content/10" [style.height.px]="p.s.itemSize">
              <span class="truncate">{{ item.name }}</span>
              <span class="badge badge-ghost badge-sm">{{ item.category }}</span>
            </div>
          </ng-template>
          <ng-template #loader>
            <div class="flex items-center px-3" [style.height.px]="p.s.itemSize">
              <div class="skeleton h-4 w-32"></div>
            </div>
          </ng-template>
        </hk-virtual-scroller>
      </ng-template>
    </app-playground>
  `,
})
export class VirtualScrollerPlaygroundComponent {
  protected readonly spec = VIRTUAL_SCROLLER_PLAYGROUND;
  private readonly allItems: readonly PgItem[] = Array.from({ length: PG_ITEM_COUNT }, (_, i) => pgItem(i));

  // The playground re-creates the preview on every state change; each state gets its own items
  // signal so lazy mode starts from empty slots again.
  private last: { raw: PlaygroundState; preview: ScrollerPreview } | null = null;

  protected previewFor(raw: PlaygroundState): ScrollerPreview {
    if (this.last?.raw !== raw) {
      const s = raw as VirtualScrollerPgState;
      const items = signal<readonly (PgItem | null)[]>(s.lazy ? new Array<PgItem | null>(PG_ITEM_COUNT).fill(null) : this.allItems);
      this.last = { raw, preview: { s, items } };
    }
    return this.last.preview;
  }

  /** Same as the generated code: a stand-in request that patches the requested slots. */
  protected load(preview: ScrollerPreview, event: VirtualScrollerLazyLoadEvent): void {
    setTimeout(() => {
      preview.items.update((items) => {
        const next = [...items];
        for (let i = event.first; i < event.first + event.rows; i++) next[i] = pgItem(i);
        return next;
      });
    }, 400);
  }
}
