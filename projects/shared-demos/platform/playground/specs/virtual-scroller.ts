import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Virtual scroller (component inputs + an item template) ────────────────
export interface VirtualScrollerPgState {
  [k: string]: string | number | boolean;
  itemSize: number;
  numColumns: number;
  viewportHeight: string;
  scrollDelay: number;
  lazy: boolean;
  loading: boolean;
}

/** Input defaults; `itemSize` is required (no default), 48 is the playground's sample value and always written. */
const VIRTUAL_SCROLLER_DEFAULTS: VirtualScrollerPgState = {
  itemSize: 48,
  numColumns: 1,
  viewportHeight: '400px',
  scrollDelay: 0,
  lazy: false,
  loading: false,
};

export const PG_ITEM_COUNT = 10_000;
export const PG_ITEM_CATEGORIES = ['Hardware', 'Software', 'Services', 'Training'];

export interface PgItem {
  id: number;
  name: string;
  category: string;
}

export function pgItem(i: number): PgItem {
  return { id: i + 1, name: `Item #${i + 1}`, category: PG_ITEM_CATEGORIES[i % PG_ITEM_CATEGORIES.length] };
}

function virtualScrollerCode(s: VirtualScrollerPgState): string {
  const d = VIRTUAL_SCROLLER_DEFAULTS;
  const attrs = ['[items]="items()"', `[itemSize]="${s.itemSize}"`];
  if (s.numColumns !== d.numColumns) attrs.push(`[numColumns]="${s.numColumns}"`);
  if (s.viewportHeight !== d.viewportHeight) attrs.push(`viewportHeight="${s.viewportHeight}"`);
  if (s.scrollDelay !== d.scrollDelay) attrs.push(`[scrollDelay]="${s.scrollDelay}"`);
  if (s.lazy) attrs.push(`[lazy]="true"`);
  if (s.loading) attrs.push(`[loading]="true"`);
  attrs.push(`(scrollIndexChange)="onScrollIndexChange($event)"`);
  if (s.lazy) attrs.push(`(lazyLoad)="onLazyLoad($event)"`);

  const loader = s.lazy
    ? `
        <ng-template #loader>
          <div class="flex items-center px-3" [style.height.px]="${s.itemSize}">
            <div class="skeleton h-4 w-32"></div>
          </div>
        </ng-template>`
    : '';
  const initial = s.lazy
    ? `// Lazy: start with empty slots; (lazyLoad) asks for the ranges that scroll into view.
  readonly items = signal<(Item | null)[]>(new Array<Item | null>(${PG_ITEM_COUNT}).fill(null));`
    : `readonly items = signal<(Item | null)[]>(Array.from({ length: ${PG_ITEM_COUNT} }, (_, i) => makeItem(i)));`;
  const lazyHandler = s.lazy
    ? `

  onLazyLoad(event: VirtualScrollerLazyLoadEvent): void {
    // Stand-in for a request: patch the requested slots a moment later.
    setTimeout(() => {
      this.items.update((items) => {
        const next = [...items];
        for (let i = event.first; i < event.first + event.rows; i++) next[i] = makeItem(i);
        return next;
      });
    }, 400);
  }`
    : '';

  return `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ${s.lazy ? 'VirtualScrollerComponent, VirtualScrollerLazyLoadEvent' : 'VirtualScrollerComponent'} } from '@hakistack/ng-daisyui';

interface Item {
  id: number;
  name: string;
  category: string;
}

const CATEGORIES = [${PG_ITEM_CATEGORIES.map((c) => `'${c}'`).join(', ')}];
const makeItem = (i: number): Item => ({ id: i + 1, name: \`Item #\${i + 1}\`, category: CATEGORIES[i % CATEGORIES.length] });

@Component({
  selector: 'app-example',
  imports: [VirtualScrollerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-virtual-scroller
      ${attrs.join('\n      ')}
    >
      <ng-template #item let-item>
        <div
          class="flex items-center justify-between gap-2 px-3 border-b border-base-content/10"
          [style.height.px]="${s.itemSize}"
        >
          <span class="truncate">{{ item.name }}</span>
          <span class="badge badge-ghost badge-sm">{{ item.category }}</span>
        </div>
      </ng-template>${loader}
    </hk-virtual-scroller>
  \`,
})
export class ExampleComponent {
  ${initial}

  onScrollIndexChange(value: unknown): void {
    console.log('scrollIndexChange', value);
  }${lazyHandler}
}
`;
}

export const VIRTUAL_SCROLLER_PLAYGROUND = definePlayground<VirtualScrollerPgState>({
  symbol: 'VirtualScrollerComponent',
  selector: 'hk-virtual-scroller',
  inputs: ['itemSize', 'numColumns', 'viewportHeight', 'scrollDelay', 'lazy', 'loading'],
  events: ['scrollIndexChange', 'scrolled', 'lazyLoad'],
  defaults: VIRTUAL_SCROLLER_DEFAULTS,
  controls: [
    { key: 'itemSize', kind: 'number', label: l('Row height (px)', 'Alto de fila (px)'), min: 32, max: 96, step: 4 },
    { key: 'numColumns', kind: 'number', label: l('Columns (grid when > 1)', 'Columnas (cuadrícula si > 1)'), min: 1, max: 4, step: 1 },
    {
      key: 'viewportHeight',
      kind: 'select',
      label: l('Viewport height', 'Alto del área visible'),
      options: ['300px', '400px', '500px'],
    },
    {
      key: 'scrollDelay',
      kind: 'number',
      label: l('Event debounce (ms)', 'Espera antes de emitir eventos (ms)'),
      min: 0,
      max: 500,
      step: 50,
    },
    { key: 'lazy', kind: 'boolean', label: l('Lazy loading (empty slots)', 'Carga diferida (espacios vacíos)') },
    { key: 'loading', kind: 'boolean', label: l('Loading spinner', 'Indicador de carga') },
  ],
  code: (s) => virtualScrollerCode(s),
});
