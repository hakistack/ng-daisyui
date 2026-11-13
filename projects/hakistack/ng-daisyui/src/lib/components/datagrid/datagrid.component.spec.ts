import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HkDataGridCellDirective } from './datagrid-cell.directive';
import { DataGridComponent } from './datagrid.component';
import { createDataGrid } from './datagrid.helpers';
import type { DataGridColumn, DataGridController, DataGridRequest } from './datagrid.types';

interface Item {
  id: number;
  name: string;
  qty: number;
  status: string;
}

const items: Item[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `Item ${String(i + 1).padStart(3, '0')}`,
  qty: (i * 7) % 50,
  status: i % 3 === 0 ? 'open' : 'closed',
}));

const columns: DataGridColumn<Item>[] = [
  { field: 'name', header: 'Name' },
  { field: 'qty', header: 'Qty', type: 'number' },
  { field: 'status', header: 'Status' },
];

@Component({
  selector: 'hk-test-datagrid-host',
  imports: [DataGridComponent, HkDataGridCellDirective],
  template: `
    <hk-datagrid [controller]="grid" height="300px">
      <ng-template hkDataGridCell="status" let-value>
        <span class="test-badge">{{ value }}</span>
      </ng-template>
    </hk-datagrid>
  `,
})
class HostComponent {
  grid: DataGridController<Item> = createDataGrid({ columns, data: items, ariaLabel: 'Inventory' });
}

function setup(grid?: DataGridController<Item>): { fixture: ComponentFixture<HostComponent>; el: HTMLElement; viewport: HTMLElement } {
  const fixture = TestBed.createComponent(HostComponent);
  if (grid) fixture.componentInstance.grid = grid;
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  return { fixture, el, viewport: el.querySelector('[role="grid"]') as HTMLElement };
}

function key(viewport: HTMLElement, k: string, init: KeyboardEventInit = {}): void {
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
}

const headerTexts = (el: HTMLElement) => [...el.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent?.trim());
const firstColumn = (el: HTMLElement) => [...el.querySelectorAll('[role="gridcell"][aria-colindex="1"]')].map((c) => c.textContent?.trim());

describe('DataGridComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('renders an ARIA grid with only a window of the rows', () => {
    const { el, viewport } = setup();
    expect(viewport.getAttribute('aria-label')).toBe('Inventory');
    expect(viewport.getAttribute('aria-rowcount')).toBe('201');
    expect(viewport.getAttribute('aria-colcount')).toBe('3');
    expect(headerTexts(el)).toEqual(['Name', 'Qty', 'Status']);

    const rendered = el.querySelectorAll('[role="rowgroup"] [role="row"][aria-rowindex]');
    expect(rendered.length).toBeGreaterThan(5);
    expect(rendered.length).toBeLessThan(60);
    expect(firstColumn(el)[0]).toBe('Item 001');
  });

  it('uses cell templates and aligns number columns to the end', () => {
    const { el } = setup();
    expect(el.querySelector('.test-badge')?.textContent).toBe('open');
    expect(el.querySelector('[role="gridcell"][aria-colindex="2"]')?.className).toContain('justify-end');
  });

  it('sorts on header click, adds levels with Shift and sets aria-sort on the primary key', () => {
    const { fixture, el } = setup();
    const [name, qty] = [...el.querySelectorAll<HTMLElement>('[role="columnheader"]')];

    name.click();
    name.click();
    fixture.detectChanges();
    expect(name.getAttribute('aria-sort')).toBe('descending');
    expect(firstColumn(el)[0]).toBe('Item 200');

    qty.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.grid.getState().sort).toEqual([
      { field: 'name', direction: 'desc' },
      { field: 'qty', direction: 'asc' },
    ]);
    expect(qty.getAttribute('aria-sort')).toBeNull();
    expect(qty.textContent).toContain('sorted ascending, priority 2');
  });

  it('moves the active cell with the keyboard via aria-activedescendant', () => {
    const { fixture, el, viewport } = setup();
    const active = () => el.querySelector(`#${viewport.getAttribute('aria-activedescendant')}`);

    expect(active()?.textContent?.trim()).toBe('Item 001');
    key(viewport, 'ArrowRight');
    key(viewport, 'ArrowDown');
    fixture.detectChanges();
    expect(active()?.getAttribute('aria-colindex')).toBe('2');
    expect(active()?.parentElement?.getAttribute('aria-rowindex')).toBe('3');

    key(viewport, 'Home');
    key(viewport, 'ArrowUp');
    key(viewport, 'ArrowUp');
    fixture.detectChanges();
    expect(active()?.getAttribute('role')).toBe('columnheader');
    expect(active()?.textContent?.trim()).toBe('Name');

    key(viewport, 'Enter');
    fixture.detectChanges();
    expect(fixture.componentInstance.grid.getState().sort).toEqual([{ field: 'name', direction: 'asc' }]);
  });

  it('reveals far rows on Ctrl+End', () => {
    const { fixture, el, viewport } = setup();
    key(viewport, 'End', { ctrlKey: true });
    fixture.detectChanges();
    const id = viewport.getAttribute('aria-activedescendant');
    expect(id).toBeTruthy();
    const cell = el.querySelector(`#${id}`);
    expect(cell?.parentElement?.getAttribute('aria-rowindex')).toBe('201');
    expect(cell?.getAttribute('aria-colindex')).toBe('3');
  });

  it('paginates with the footer controls', () => {
    const { fixture, el } = setup(createDataGrid({ columns, data: items, pageSize: 25 }));
    expect(el.querySelector('nav')?.textContent).toContain('1–25 of 200');
    el.querySelector<HTMLButtonElement>('button[aria-label="Next page"]')!.click();
    fixture.detectChanges();
    expect(firstColumn(el)[0]).toBe('Item 026');
    expect(el.querySelector('nav')?.textContent).toContain('Page 2 of 8');
    expect(el.querySelector<HTMLButtonElement>('button[aria-label="Previous page"]')!.disabled).toBe(false);
  });

  it('shows an empty state as a spanning grid cell', () => {
    const grid = createDataGrid({ columns, data: items });
    grid.setState({ filters: [{ field: 'name', operator: 'equals', value: 'nope' }] });
    const { el } = setup(grid);
    const empty = el.querySelector('[role="gridcell"][aria-colspan="3"]');
    expect(empty?.textContent).toContain('No rows to display');
  });

  it('loads pages from a server data source', async () => {
    const requests: DataGridRequest[] = [];
    const grid = createDataGrid<Item>({
      columns,
      pageSize: 10,
      dataSource: (request) => {
        requests.push(request);
        const start = request.page!.index * request.page!.size;
        return of({ rows: items.slice(start, start + request.page!.size), total: items.length });
      },
    });
    const { fixture, el } = setup(grid);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(requests).toHaveLength(1);
    expect(firstColumn(el)[0]).toBe('Item 001');
    expect(grid.total()).toBe(200);

    grid.setPage(3);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(requests[1].page).toEqual({ index: 3, size: 10 });
    expect(firstColumn(el)[0]).toBe('Item 031');
  });

  it('surfaces data source errors with a retry', async () => {
    let fail = true;
    const grid = createDataGrid<Item>({
      columns,
      pageSize: 10,
      dataSource: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve({ rows: items.slice(0, 10), total: 200 })),
    });
    const { fixture, el } = setup(grid);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Could not load data.');

    fail = false;
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Retry'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(firstColumn(el)[0]).toBe('Item 001');
    expect(grid.error()).toBeNull();
  });

  describe('phase 2', () => {
    function copyText(viewport: HTMLElement): string {
      let copied = '';
      const event = new Event('copy', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { setData: (_type: string, text: string) => (copied = text) } });
      viewport.dispatchEvent(event);
      return copied;
    }

    it('pins a checkbox column, shifts aria-colindex and toggles rows with the mouse and Space', () => {
      const grid = createDataGrid({ columns, data: items, selection: 'multi' });
      const { fixture, el, viewport } = setup(grid);
      expect(viewport.getAttribute('aria-colcount')).toBe('4');
      expect(el.querySelector('[role="columnheader"][aria-colindex="2"]')?.textContent).toContain('Name');

      const boxes = () => [...el.querySelectorAll<HTMLInputElement>('[role="gridcell"] input[type="checkbox"]')];
      boxes()[1].click();
      fixture.detectChanges();
      expect(grid.selectedRows()).toEqual([items[1]]);
      expect(boxes()[1].closest('[role="row"]')?.getAttribute('aria-selected')).toBe('true');

      // The clicked row became the active one; Space acts on the active row.
      key(viewport, 'ArrowUp');
      key(viewport, ' ');
      fixture.detectChanges();
      expect(grid.selectedRows()).toEqual([items[0], items[1]]);
      expect(el.textContent).toContain('2 selected');

      const all = el.querySelector<HTMLInputElement>('[role="columnheader"] input[type="checkbox"]')!;
      expect(all.indeterminate).toBe(true);
      all.click();
      fixture.detectChanges();
      expect(grid.selectedCount()).toBe(200);
      all.click();
      fixture.detectChanges();
      expect(grid.selectedCount()).toBe(0);
    });

    it('extends a range with Shift+arrows, copies it as TSV and shows a summary', () => {
      const { fixture, el, viewport } = setup();
      key(viewport, 'ArrowRight');
      key(viewport, 'ArrowDown', { shiftKey: true });
      key(viewport, 'ArrowRight', { shiftKey: true });
      fixture.detectChanges();

      expect(el.querySelectorAll('[role="gridcell"][aria-selected="true"]')).toHaveLength(4);
      expect(copyText(viewport)).toBe(`${items[0].qty}\topen\n${items[1].qty}\tclosed`);
      expect(el.textContent).toContain(`Count: 4 · Sum: ${items[0].qty + items[1].qty}`);

      key(viewport, 'Escape');
      fixture.detectChanges();
      expect(el.querySelectorAll('[role="gridcell"][aria-selected]')).toHaveLength(0);
      expect(copyText(viewport)).toBe('closed');
    });

    it('selects every cell with Ctrl+A', () => {
      const { fixture, el, viewport } = setup();
      key(viewport, 'a', { ctrlKey: true });
      fixture.detectChanges();
      expect(el.textContent).toContain('Count: 600');
      expect(copyText(viewport).split('\n')).toHaveLength(200);
    });

    it('resizes the active column with Alt+arrows', () => {
      const { fixture, viewport } = setup();
      key(viewport, 'ArrowRight');
      key(viewport, 'ArrowRight', { altKey: true });
      key(viewport, 'ArrowRight', { altKey: true });
      fixture.detectChanges();
      expect(fixture.componentInstance.grid.getState().columns[1].width).toBe(152);
    });

    it('filters from the column menu and removes the filter from its chip', async () => {
      const { fixture, el, viewport } = setup();
      key(viewport, 'ArrowRight');
      key(viewport, 'ArrowUp');
      key(viewport, 'ArrowDown', { altKey: true });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const menu = document.querySelector('hk-datagrid-column-menu') as HTMLElement;
      expect(menu?.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Column options: Qty');
      const operator = menu.querySelector<HTMLSelectElement>('select')!;
      operator.value = 'gte';
      operator.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const input = menu.querySelector<HTMLInputElement>('input[type="number"]')!;
      input.value = '40';
      input.dispatchEvent(new Event('input'));
      menu.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();

      const grid = fixture.componentInstance.grid;
      expect(grid.getState().filters).toEqual([{ field: 'qty', operator: 'gte', value: 40 }]);
      expect(grid.total()).toBe(items.filter((i) => i.qty >= 40).length);
      expect(document.querySelector('hk-datagrid-column-menu')).toBeNull();
      expect(el.querySelector('[role="columnheader"][aria-colindex="2"]')?.textContent).toContain('filtered');

      const remove = el.querySelector<HTMLButtonElement>('button[aria-label="Remove filter: Qty ≥ 40"]')!;
      remove.click();
      fixture.detectChanges();
      expect(grid.getState().filters).toEqual([]);
    });

    it('reports invalid menu input inline instead of closing', async () => {
      const { fixture, viewport } = setup();
      key(viewport, 'ArrowUp');
      key(viewport, 'ArrowDown', { altKey: true });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const menu = document.querySelector('hk-datagrid-column-menu') as HTMLElement;
      menu.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();
      expect(menu.querySelector('[role="alert"]')?.textContent).toContain('Enter a value.');

      menu.querySelector<HTMLElement>('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(document.querySelector('hk-datagrid-column-menu')).toBeNull();
    });
  });

  describe('AI box', () => {
    const reply = {
      sort: [{ field: 'qty', direction: 'desc' }],
      filters: [{ field: 'status', operator: 'equals', values: ['open'] }],
      search: '',
      columns: [],
      explanation: 'Open items, highest quantity first.',
    };

    it('asks from a suggestion, shows the explanation and undoes it', async () => {
      let resolve!: (value: unknown) => void;
      const complete = vi.fn(() => new Promise((r) => (resolve = r)));
      const grid = createDataGrid({ columns, data: items, ai: { complete, suggestions: ['open ones by qty'] } });
      const { fixture, el } = setup(grid);

      const suggestion = el.querySelector<HTMLButtonElement>('[role="group"][aria-label="Suggestions"] button')!;
      expect(suggestion.textContent?.trim()).toBe('open ones by qty');
      suggestion.click();
      fixture.detectChanges();
      expect(el.querySelector<HTMLInputElement>('input[aria-label="Describe the view you want"]')!.value).toBe('open ones by qty');
      expect(el.querySelector('[role="status"]')?.textContent).toContain('Thinking…');

      resolve(reply);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector('[role="status"]')?.textContent).toContain('Open items, highest quantity first.');
      expect(grid.total()).toBe(items.filter((i) => i.status === 'open').length);
      expect(el.querySelector('[role="group"][aria-label="Suggestions"]')).toBeNull();

      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Undo')!.click();
      fixture.detectChanges();
      expect(grid.getState().filters).toEqual([]);
      expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
    });

    it('submits the typed request and shows errors', async () => {
      const grid = createDataGrid({ columns, data: items, ai: { complete: () => Promise.reject(new Error('Server down.')) } });
      const { fixture, el } = setup(grid);
      const input = el.querySelector<HTMLInputElement>('input[aria-label="Describe the view you want"]')!;
      input.value = 'anything';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      el.querySelector('form[role="search"]')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector('[role="status"]')?.textContent).toContain('The AI request failed. Server down.');
    });
  });
});
