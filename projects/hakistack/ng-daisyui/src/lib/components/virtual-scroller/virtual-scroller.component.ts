import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  TemplateRef,
  TrackByFunction,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { debounceTime, identity } from 'rxjs';

import {
  VirtualScrollBehavior,
  VirtualScrollerItemContext,
  VirtualScrollerLazyLoadEvent,
  VirtualScrollerLoaderContext,
  VirtualScrollerOrientation,
  VirtualScrollerScrollEvent,
} from './virtual-scroller.types';

/**
 * Virtualized list/grid renderer backed by `@angular/cdk/scrolling`.
 *
 * Renders only the rows in (or near) the viewport — use it for lists of
 * thousands of items where rendering everything would tank performance.
 *
 * **Slots** — provide content via named templates:
 * - `<ng-template #item let-item let-i="index">` — required, renders each row.
 * - `<ng-template #loader>` — optional, shown for `null` placeholder items in `lazy` mode.
 * - `<ng-template #header>` / `<ng-template #footer>` — optional, rendered above/below the list.
 *
 * **Lazy loading** — set `[lazy]="true"` and seed `items` with `null` placeholders
 * for the un-loaded rows. As the user scrolls, `(lazyLoad)` fires with the index
 * range that needs data — fetch and patch those slots in your `items` array.
 * Each `{first, rows}` range is emitted **at most once** (dedup via internal cache).
 *
 * **Grid mode** — set `numColumns > 1` to lay items out in N-column rows.
 * `itemSize` is the row height in this mode.
 *
 * @example Simple list of 10,000 items
 * <hk-virtual-scroller [items]="rows()" [itemSize]="48" viewportHeight="600px">
 *   <ng-template #item let-row>
 *     <div class="p-2">{{ row.name }}</div>
 *   </ng-template>
 * </hk-virtual-scroller>
 *
 * @example Lazy-loaded grid
 * // items() = [null, null, ...total nulls...]
 * <hk-virtual-scroller [items]="items()" [itemSize]="120" [numColumns]="4"
 *                      [lazy]="true" (lazyLoad)="loadPage($event)">
 *   <ng-template #item let-item>
 *     <img [src]="item.thumb" />
 *   </ng-template>
 *   <ng-template #loader>
 *     <div class="skeleton h-full w-full"></div>
 *   </ng-template>
 * </hk-virtual-scroller>
 */
@Component({
  selector: 'hk-virtual-scroller',
  imports: [ScrollingModule, CommonModule],
  templateUrl: './virtual-scroller.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class VirtualScrollerComponent<T = any> implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  // ── Template Refs ──────────────────────────────────────────────────────

  /** Row template — receives `{ $implicit: T, index, first, last, even, odd }`. Required. */
  readonly itemTemplate = contentChild<TemplateRef<VirtualScrollerItemContext<T>>>('item');
  /** Optional placeholder template shown for `null` slots in `lazy` mode (e.g. a skeleton). */
  readonly loaderTemplate = contentChild<TemplateRef<VirtualScrollerLoaderContext>>('loader');
  /** Optional sticky/static header rendered above the virtualized rows. */
  readonly headerTemplate = contentChild<TemplateRef<unknown>>('header');
  /** Optional footer rendered below the virtualized rows. */
  readonly footerTemplate = contentChild<TemplateRef<unknown>>('footer');

  // ── Inputs ─────────────────────────────────────────────────────────────

  /**
   * Data array. In `lazy` mode, use `null` for not-yet-loaded slots and the
   * scroller will emit `lazyLoad` for those index ranges as they become visible.
   */
  readonly items = input<readonly (T | null)[]>([]);
  /**
   * Item size in px — row height for vertical, column width for horizontal.
   * Must match the actual rendered size; mismatches break virtualization math.
   * Required.
   */
  readonly itemSize = input.required<number>();
  /** Scroll axis. Default: `'vertical'`. */
  readonly orientation = input<VirtualScrollerOrientation>('vertical');
  /** Number of columns (vertical orientation). `>1` enables grid mode. Default: `1`. */
  readonly numColumns = input<number>(1);
  /** Viewport height (CSS value). Default: `'400px'`. */
  readonly viewportHeight = input<string>('400px');
  /** Viewport width (CSS value). Default: `'100%'`. */
  readonly viewportWidth = input<string>('100%');
  /** Debounce (ms) before `scrolled` / `lazyLoad` fire. Default: `0`. */
  readonly scrollDelay = input<number>(0);
  /** Minimum off-screen buffer to render ahead, in px. Default: `100`. */
  readonly minBufferPx = input<number>(100);
  /** Maximum off-screen buffer, in px. CDK keeps rendered range between min/max. Default: `200`. */
  readonly maxBufferPx = input<number>(200);
  /**
   * `TrackByFunction<T>`. Strongly recommended when items are objects — without it,
   * Angular re-creates DOM nodes on every reference change. Default: identity (index-based).
   */
  readonly trackByFn = input<TrackByFunction<T>>();
  /** Enable lazy-load mode: `null` slots in `items` cause `lazyLoad` to fire. Default: `false`. */
  readonly lazy = input<boolean>(false);
  /** Show a loading state on the viewport (e.g. while fetching the first page). Default: `false`. */
  readonly loading = input<boolean>(false);
  /** Extra classes applied to the scroll viewport container. */
  readonly containerClass = input<string>('');
  /** Extra classes applied to each item wrapper. */
  readonly itemClass = input<string>('');

  // ── Outputs ────────────────────────────────────────────────────────────

  /** Fires on scroll. Emits the current scroll offset and rendered range. */
  readonly scrolled = output<VirtualScrollerScrollEvent>();
  /**
   * Fires when an un-loaded range becomes visible (lazy mode only).
   * Each range is emitted at most once per session — patch `items` with real
   * data and the same range will not re-fire.
   */
  readonly lazyLoad = output<VirtualScrollerLazyLoadEvent>();
  /** Fires when the topmost rendered index changes. */
  readonly scrollIndexChange = output<number>();

  // ── Internal State ─────────────────────────────────────────────────────

  private readonly loadedRanges = new Set<string>();
  private readonly visibleCount = signal(0);

  // ── Computed ───────────────────────────────────────────────────────────

  readonly isGridMode = computed(() => this.numColumns() > 1);

  readonly cdkOrientation = computed<'vertical' | 'horizontal'>(() => {
    const o = this.orientation();
    return o === 'both' || o === 'vertical' ? 'vertical' : 'horizontal';
  });

  readonly effectiveItemSize = computed(() => this.itemSize());

  readonly gridItemWidth = computed(() => `${100 / this.numColumns()}%`);

  readonly virtualRows = computed<(T | null)[][] | null>(() => {
    const cols = this.numColumns();
    if (cols <= 1) return null;
    const data = this.items();
    const rows: (T | null)[][] = [];
    for (let i = 0; i < data.length; i += cols) {
      rows.push(data.slice(i, i + cols) as (T | null)[]);
    }
    return rows;
  });

  readonly effectiveItems = computed(() => this.items());

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Defer scroll listener setup to after view init
    queueMicrotask(() => this.setupScrollListener());
  }

  // ── Public Methods ─────────────────────────────────────────────────────

  scrollToIndex(index: number, behavior: VirtualScrollBehavior = 'auto'): void {
    const vp = this.viewport();
    if (!vp) return;

    const effectiveIndex = this.isGridMode() ? Math.floor(index / this.numColumns()) : index;
    vp.scrollToIndex(effectiveIndex, behavior);
  }

  // ── Template Helpers ───────────────────────────────────────────────────

  getItemContext(item: T, index: number): VirtualScrollerItemContext<T> {
    const count = this.items().length;
    return {
      $implicit: item,
      index,
      count,
      first: index === 0,
      last: index === count - 1,
      even: index % 2 === 0,
      odd: index % 2 !== 0,
    };
  }

  getLoaderContext(index: number): VirtualScrollerLoaderContext {
    return { index };
  }

  trackByRow: TrackByFunction<(T | null)[]> = (index: number) => index;

  trackByItem: TrackByFunction<T | null> = (index: number, item: T | null) => {
    const fn = this.trackByFn();
    if (fn && item != null) return fn(index, item);
    return index;
  };

  // ── Private ────────────────────────────────────────────────────────────

  private setupScrollListener(): void {
    const vp = this.viewport();
    if (!vp) return;

    const delay = this.scrollDelay();
    const pipe$ = delay > 0 ? debounceTime<number>(delay) : identity;

    vp.scrolledIndexChange.pipe(pipe$, takeUntilDestroyed(this.destroyRef)).subscribe((firstIndex) => {
      const size = this.itemSize();
      const viewportSize = this.cdkOrientation() === 'vertical' ? vp.getViewportSize() : vp.getViewportSize();
      const count = Math.ceil(viewportSize / size);
      this.visibleCount.set(count);

      const effectiveFirst = this.isGridMode() ? firstIndex * this.numColumns() : firstIndex;
      const effectiveLast = Math.min(effectiveFirst + (this.isGridMode() ? count * this.numColumns() : count), this.items().length - 1);

      this.scrollIndexChange.emit(effectiveFirst);
      this.scrolled.emit({ first: effectiveFirst, last: effectiveLast });

      if (this.lazy()) {
        this.checkAndEmitLazyLoad(effectiveFirst, effectiveLast);
      }
    });
  }

  private checkAndEmitLazyLoad(first: number, last: number): void {
    const data = this.items();
    const bufferSize = Math.max(this.visibleCount(), 10);
    const start = Math.max(0, first - bufferSize);
    const end = Math.min(data.length, last + bufferSize);

    let needsLoad = false;
    for (let i = start; i < end; i++) {
      if (data[i] == null) {
        needsLoad = true;
        break;
      }
    }

    if (!needsLoad) return;

    // Avoid duplicate requests for the same range
    const rangeKey = `${start}-${end}`;
    if (this.loadedRanges.has(rangeKey)) return;
    this.loadedRanges.add(rangeKey);

    this.lazyLoad.emit({ first: start, rows: end - start });
  }
}
