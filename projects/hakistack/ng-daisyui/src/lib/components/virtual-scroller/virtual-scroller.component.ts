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
import { NgTemplateOutlet } from '@angular/common';
import { debounceTime, identity } from 'rxjs';

import {
  VirtualScrollBehavior,
  VirtualScrollerItemContext,
  VirtualScrollerLazyLoadEvent,
  VirtualScrollerLoaderContext,
  VirtualScrollerOrientation,
  VirtualScrollerScrollEvent,
} from './virtual-scroller.types';

@Component({
  selector: 'hk-virtual-scroller',
  imports: [ScrollingModule, NgTemplateOutlet],
  templateUrl: './virtual-scroller.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class VirtualScrollerComponent<T = any> implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  // ── Template Refs ──────────────────────────────────────────────────────

  readonly itemTemplate = contentChild<TemplateRef<VirtualScrollerItemContext<T>>>('item');
  readonly loaderTemplate = contentChild<TemplateRef<VirtualScrollerLoaderContext>>('loader');
  readonly headerTemplate = contentChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = contentChild<TemplateRef<unknown>>('footer');

  // ── Inputs ─────────────────────────────────────────────────────────────

  readonly items = input<readonly (T | null)[]>([]);
  readonly itemSize = input.required<number>();
  readonly orientation = input<VirtualScrollerOrientation>('vertical');
  readonly numColumns = input<number>(1);
  readonly viewportHeight = input<string>('400px');
  readonly viewportWidth = input<string>('100%');
  readonly scrollDelay = input<number>(0);
  readonly minBufferPx = input<number>(100);
  readonly maxBufferPx = input<number>(200);
  readonly trackByFn = input<TrackByFunction<T>>();
  readonly lazy = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly containerClass = input<string>('');
  readonly itemClass = input<string>('');

  // ── Outputs ────────────────────────────────────────────────────────────

  readonly scrolled = output<VirtualScrollerScrollEvent>();
  readonly lazyLoad = output<VirtualScrollerLazyLoadEvent>();
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
