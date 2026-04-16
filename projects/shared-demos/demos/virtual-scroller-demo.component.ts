import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { VirtualScrollerComponent, VirtualScrollerLazyLoadEvent, VirtualScrollerScrollEvent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

type ExampleTab = 'basic' | 'horizontal' | 'grid' | 'lazy';
type ApiTab = 'component' | 'events' | 'templates' | 'types';

function generateProducts(count: number): Product[] {
  const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Product ${i + 1}`,
    price: Math.round(Math.random() * 500 * 100) / 100,
    category: categories[i % categories.length],
  }));
}

@Component({
  selector: 'app-virtual-scroller-demo',
  imports: [VirtualScrollerComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Virtual Scroller"
      description="Performance-optimized scrolling for large datasets using virtual rendering"
      icon="ScrollText"
      category="Data Display"
      importName="VirtualScrollerComponent"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section
              title="Vertical Scrolling"
              description="Renders 10,000 items efficiently with fixed item height"
              [codeExample]="basicCode"
            >
              <hk-virtual-scroller
                #basicScroller
                [items]="largeList()"
                [itemSize]="60"
                viewportHeight="350px"
                (scrolled)="lastScrollEvent.set($event)"
              >
                <ng-template #item let-product let-i="index" let-isOdd="odd">
                  <div
                    class="flex items-center justify-between px-4 border-b border-base-200"
                    [class.bg-base-200]="isOdd"
                    [style.height.px]="60"
                  >
                    <div>
                      <div class="font-medium">{{ product.name }}</div>
                      <div class="text-sm text-base-content/60">{{ product.category }}</div>
                    </div>
                    <div class="badge badge-ghost">{{ '$' + product.price.toFixed(2) }}</div>
                  </div>
                </ng-template>
              </hk-virtual-scroller>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button class="btn btn-sm btn-primary" (click)="basicScroller.scrollToIndex(0, 'smooth')">Scroll to Top</button>
                <button class="btn btn-sm btn-secondary" (click)="basicScroller.scrollToIndex(5000, 'smooth')">Scroll to #5000</button>
                <button class="btn btn-sm btn-accent" (click)="basicScroller.scrollToIndex(9999, 'smooth')">Scroll to Bottom</button>
              </div>
              @if (lastScrollEvent(); as evt) {
                <div class="mt-2 text-xs text-base-content/60">Visible: items {{ evt.first }} - {{ evt.last }}</div>
              }
            </app-doc-section>

            <app-doc-section
              title="With Header & Footer"
              description="Optional header and footer templates outside the scroll viewport"
              [codeExample]="headerFooterCode"
            >
              <hk-virtual-scroller [items]="largeList()" [itemSize]="48" viewportHeight="280px">
                <ng-template #header>
                  <div class="p-3 bg-primary text-primary-content font-semibold rounded-t-lg">
                    Product List ({{ largeList().length }} items)
                  </div>
                </ng-template>
                <ng-template #item let-product let-i="index">
                  <div class="flex items-center gap-3 px-4" [style.height.px]="48">
                    <span class="text-base-content/40 text-xs w-8">{{ i + 1 }}</span>
                    <span>{{ product.name }}</span>
                  </div>
                </ng-template>
                <ng-template #footer>
                  <div class="p-3 bg-base-200 text-sm text-base-content/60 rounded-b-lg">End of list</div>
                </ng-template>
              </hk-virtual-scroller>
            </app-doc-section>
          </div>
        }

        <!-- Horizontal -->
        @if (activeTab() === 'horizontal') {
          <div class="space-y-6">
            <app-doc-section
              title="Horizontal Scrolling"
              description="Scroll items horizontally with fixed width per item"
              [codeExample]="horizontalCode"
            >
              <hk-virtual-scroller
                [items]="largeList()"
                [itemSize]="200"
                orientation="horizontal"
                viewportHeight="180px"
                viewportWidth="100%"
              >
                <ng-template #item let-product let-i="index">
                  <div class="card bg-base-200 m-2" [style.width.px]="184" [style.height.px]="160">
                    <div class="card-body p-4">
                      <h3 class="card-title text-sm">{{ product.name }}</h3>
                      <p class="text-xs text-base-content/60">{{ product.category }}</p>
                      <div class="badge badge-primary mt-2">{{ '$' + product.price.toFixed(2) }}</div>
                    </div>
                  </div>
                </ng-template>
              </hk-virtual-scroller>
            </app-doc-section>
          </div>
        }

        <!-- Grid -->
        @if (activeTab() === 'grid') {
          <div class="space-y-6">
            <app-doc-section
              title="Grid Layout"
              description="Virtual grid with configurable columns. Each row is virtualized."
              [codeExample]="gridCode"
            >
              <div class="flex gap-2 mb-4">
                <button class="btn btn-sm" [class.btn-primary]="gridCols() === 2" (click)="gridCols.set(2)">2 Columns</button>
                <button class="btn btn-sm" [class.btn-primary]="gridCols() === 3" (click)="gridCols.set(3)">3 Columns</button>
                <button class="btn btn-sm" [class.btn-primary]="gridCols() === 4" (click)="gridCols.set(4)">4 Columns</button>
              </div>
              <hk-virtual-scroller [items]="gridList()" [itemSize]="140" [numColumns]="gridCols()" viewportHeight="420px">
                <ng-template #item let-product let-i="index">
                  <div class="card bg-base-200 m-1 h-[130px]">
                    <div class="card-body p-3">
                      <div class="text-xs text-base-content/40">#{{ i + 1 }}</div>
                      <h3 class="font-medium text-sm">{{ product.name }}</h3>
                      <p class="text-xs text-base-content/60">{{ product.category }}</p>
                      <div class="text-sm font-semibold text-primary">{{ '$' + product.price.toFixed(2) }}</div>
                    </div>
                  </div>
                </ng-template>
              </hk-virtual-scroller>
            </app-doc-section>
          </div>
        }

        <!-- Lazy Loading -->
        @if (activeTab() === 'lazy') {
          <div class="space-y-6">
            <app-doc-section
              title="Lazy Loading"
              description="Load data on demand as the user scrolls. Pass a sparse array with null for unloaded items."
              [codeExample]="lazyCode"
            >
              <div class="mb-3 flex items-center gap-3">
                <span class="text-sm text-base-content/60"> Loaded: {{ loadedCount() }} / {{ totalLazyItems }} items </span>
                <button class="btn btn-sm btn-ghost" (click)="resetLazy()">Reset</button>
              </div>
              <hk-virtual-scroller
                [items]="lazyItems()"
                [itemSize]="60"
                [lazy]="true"
                viewportHeight="360px"
                (lazyLoad)="onLazyLoad($event)"
              >
                <ng-template #item let-product>
                  <div class="flex items-center justify-between px-4 border-b border-base-200" [style.height.px]="60">
                    <div>
                      <div class="font-medium">{{ product.name }}</div>
                      <div class="text-sm text-base-content/60">{{ product.category }}</div>
                    </div>
                    <div class="badge badge-ghost">{{ '$' + product.price.toFixed(2) }}</div>
                  </div>
                </ng-template>
                <ng-template #loader>
                  <div class="flex items-center gap-3 px-4" [style.height.px]="60">
                    <div class="skeleton h-4 w-40"></div>
                    <div class="skeleton h-4 w-16 ml-auto"></div>
                  </div>
                </ng-template>
              </hk-virtual-scroller>
            </app-doc-section>
          </div>
        }
      </div>

      <!-- API Section -->
      <div api class="space-y-6">
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'events'" (click)="apiTab.set('events')">Events</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'templates'" (click)="apiTab.set('templates')">Templates</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Inputs" [entries]="inputDocs" />
            <app-api-table title="Methods" [entries]="methodDocs" />
          </div>
        }

        @if (apiTab() === 'events') {
          <app-api-table title="Outputs" [entries]="outputDocs" />
        }

        @if (apiTab() === 'templates') {
          <div class="space-y-6">
            <app-api-table title="Template Slots" [entries]="templateDocs" />
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Template Context</h3>
                <app-code-block [code]="templateContextCode" />
              </div>
            </div>
          </div>
        }

        @if (apiTab() === 'types') {
          <div class="card card-border card-bordered bg-base-100">
            <div class="card-body gap-3">
              <h3 class="card-title text-lg">Type Definitions</h3>
              <app-code-block [code]="typesCode" />
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class VirtualScrollerDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as ExampleTab);

  apiTab = signal<ApiTab>('component');
  gridCols = signal(3);
  lastScrollEvent = signal<VirtualScrollerScrollEvent | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────

  readonly largeList = signal(generateProducts(10_000));
  readonly gridList = signal(generateProducts(600));

  // Lazy loading
  readonly totalLazyItems = 5000;
  readonly lazyItems = signal<(Product | null)[]>(new Array(this.totalLazyItems).fill(null));
  readonly loadedCount = signal(0);

  onLazyLoad(event: VirtualScrollerLazyLoadEvent): void {
    // Simulate async loading
    setTimeout(() => {
      const items = [...this.lazyItems()];
      const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
      let loaded = 0;
      for (let i = event.first; i < event.first + event.rows && i < items.length; i++) {
        if (items[i] == null) {
          items[i] = {
            id: i,
            name: `Product ${i + 1}`,
            price: Math.round(Math.random() * 500 * 100) / 100,
            category: categories[i % categories.length],
          };
          loaded++;
        }
      }
      this.lazyItems.set(items);
      this.loadedCount.update((c) => c + loaded);
    }, 300);
  }

  resetLazy(): void {
    this.lazyItems.set(new Array(this.totalLazyItems).fill(null));
    this.loadedCount.set(0);
  }

  // ── Code Examples ──────────────────────────────────────────────────────

  basicCode = `<hk-virtual-scroller
  [items]="products()"
  [itemSize]="60"
  viewportHeight="350px"
  (scrolled)="onScroll($event)"
>
  <ng-template #item let-product let-i="index" let-isOdd="odd">
    <div class="flex items-center px-4" [style.height.px]="60">
      {{ product.name }} - {{ product.price }}
    </div>
  </ng-template>
</hk-virtual-scroller>

<!-- Programmatic scroll -->
<button (click)="scroller.scrollToIndex(500, 'smooth')">
  Go to #500
</button>`;

  headerFooterCode = `<hk-virtual-scroller [items]="items()" [itemSize]="48" viewportHeight="280px">
  <ng-template #header>
    <div class="p-3 bg-primary text-primary-content">Header</div>
  </ng-template>
  <ng-template #item let-product let-i="index">
    <div [style.height.px]="48">{{ product.name }}</div>
  </ng-template>
  <ng-template #footer>
    <div class="p-3 bg-base-200">Footer</div>
  </ng-template>
</hk-virtual-scroller>`;

  horizontalCode = `<hk-virtual-scroller
  [items]="products()"
  [itemSize]="200"
  orientation="horizontal"
  viewportHeight="180px"
>
  <ng-template #item let-product>
    <div class="card m-2" [style.width.px]="184">
      {{ product.name }}
    </div>
  </ng-template>
</hk-virtual-scroller>`;

  gridCode = `<hk-virtual-scroller
  [items]="products()"
  [itemSize]="140"
  [numColumns]="3"
  viewportHeight="420px"
>
  <ng-template #item let-product let-i="index">
    <div class="card m-1 h-[130px]">
      <div class="card-body p-3">
        {{ product.name }} - {{ product.price }}
      </div>
    </div>
  </ng-template>
</hk-virtual-scroller>`;

  lazyCode = `// Component
totalItems = 5000;
lazyItems = signal<(Product | null)[]>(new Array(5000).fill(null));

onLazyLoad(event: VirtualScrollerLazyLoadEvent) {
  fetchProducts(event.first, event.rows).then(products => {
    const items = [...this.lazyItems()];
    products.forEach((p, i) => items[event.first + i] = p);
    this.lazyItems.set(items);
  });
}

// Template
<hk-virtual-scroller
  [items]="lazyItems()"
  [itemSize]="60"
  [lazy]="true"
  viewportHeight="360px"
  (lazyLoad)="onLazyLoad($event)"
>
  <ng-template #item let-product>
    <div>{{ product.name }}</div>
  </ng-template>
  <ng-template #loader>
    <div class="skeleton h-4 w-40"></div>
  </ng-template>
</hk-virtual-scroller>`;

  templateContextCode = `// Item template context (VirtualScrollerItemContext<T>)
interface VirtualScrollerItemContext<T> {
  $implicit: T;    // The item (use let-data)
  index: number;   // Item index
  count: number;   // Total items
  first: boolean;  // Is first item
  last: boolean;   // Is last item
  even: boolean;   // Even index
  odd: boolean;    // Odd index
}

// Usage:
<ng-template #item let-product let-i="index" let-isFirst="first" let-isOdd="odd">
  <div [class.bg-base-200]="isOdd">
    #{{ i }} - {{ product.name }}
  </div>
</ng-template>`;

  typesCode = `type VirtualScrollerOrientation = 'vertical' | 'horizontal' | 'both';
type VirtualScrollBehavior = 'auto' | 'smooth';

interface VirtualScrollerLazyLoadEvent {
  first: number;  // First index of requested range
  rows: number;   // Number of items to load
}

interface VirtualScrollerScrollEvent {
  first: number;  // First visible index
  last: number;   // Last visible index
}

interface VirtualScrollerItemContext<T> {
  $implicit: T;
  index: number;
  count: number;
  first: boolean;
  last: boolean;
  even: boolean;
  odd: boolean;
}

interface VirtualScrollerLoaderContext {
  index: number;
}`;

  // ── API Documentation ──────────────────────────────────────────────────

  inputDocs: ApiDocEntry[] = [
    {
      name: 'items',
      type: 'readonly (T | null)[]',
      default: '[]',
      description: 'Array of items to display. Use null entries for unloaded items in lazy mode.',
    },
    { name: 'itemSize', type: 'number', description: 'Height (vertical) or width (horizontal) of each item in pixels. Required.' },
    {
      name: 'orientation',
      type: 'VirtualScrollerOrientation',
      default: "'vertical'",
      description: "Scroll direction: 'vertical', 'horizontal', or 'both' (grid).",
    },
    { name: 'numColumns', type: 'number', default: '1', description: 'Number of columns in grid mode. Values > 1 activate grid layout.' },
    { name: 'viewportHeight', type: 'string', default: "'400px'", description: 'CSS height of the scroll viewport.' },
    { name: 'viewportWidth', type: 'string', default: "'100%'", description: 'CSS width of the scroll viewport.' },
    { name: 'scrollDelay', type: 'number', default: '0', description: 'Debounce delay in milliseconds for scroll events.' },
    { name: 'minBufferPx', type: 'number', default: '100', description: 'Minimum pixels of content to render beyond the viewport.' },
    { name: 'maxBufferPx', type: 'number', default: '200', description: 'Maximum pixels of content to render beyond the viewport.' },
    {
      name: 'trackByFn',
      type: 'TrackByFunction<T>',
      default: '-',
      description: 'Custom trackBy function for cdkVirtualFor rendering optimization.',
    },
    {
      name: 'lazy',
      type: 'boolean',
      default: 'false',
      description: 'Enable lazy loading mode. Emits lazyLoad events for null items in view.',
    },
    { name: 'loading', type: 'boolean', default: 'false', description: 'Show a loading spinner below the viewport.' },
    { name: 'containerClass', type: 'string', default: "''", description: 'Additional CSS class applied to the viewport element.' },
    { name: 'itemClass', type: 'string', default: "''", description: 'Additional CSS class applied to each item wrapper.' },
  ];

  outputDocs: ApiDocEntry[] = [
    {
      name: 'scrolled',
      type: 'VirtualScrollerScrollEvent',
      description: 'Emits first and last visible indices on scroll (respects scrollDelay).',
    },
    {
      name: 'lazyLoad',
      type: 'VirtualScrollerLazyLoadEvent',
      description: 'Emits when unloaded items (null) enter the viewport. Contains first index and rows count.',
    },
    { name: 'scrollIndexChange', type: 'number', description: 'Emits the first visible item index on each scroll event.' },
  ];

  methodDocs: ApiDocEntry[] = [
    {
      name: 'scrollToIndex(index, behavior?)',
      type: 'void',
      description: "Programmatically scroll to a specific item index. Behavior: 'auto' (default) or 'smooth'.",
    },
  ];

  templateDocs: ApiDocEntry[] = [
    {
      name: '#item',
      type: 'TemplateRef<VirtualScrollerItemContext<T>>',
      description: 'Required. Template for rendering each item. Context provides $implicit (item), index, count, first, last, even, odd.',
    },
    {
      name: '#loader',
      type: 'TemplateRef<VirtualScrollerLoaderContext>',
      description: 'Optional. Template for unloaded items (null entries) in lazy mode. Falls back to a DaisyUI skeleton.',
    },
    { name: '#header', type: 'TemplateRef<unknown>', description: 'Optional. Content rendered above the scroll viewport.' },
    { name: '#footer', type: 'TemplateRef<unknown>', description: 'Optional. Content rendered below the scroll viewport.' },
  ];
}
