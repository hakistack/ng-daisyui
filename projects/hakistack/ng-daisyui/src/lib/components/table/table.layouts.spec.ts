import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HkCellTemplateDirective } from './table-cell-template.directive';
import { TableComponent } from './table.component';
import { createTable } from './table.helpers';
import { FieldConfiguration } from './table.types';

/**
 * hk-table renders three layouts (CDK, grouped, virtual scroll). Their cell contents come from
 * shared templates, so the same behaviour must show up in each — these specs run per layout.
 */

interface Row {
  id: number;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Alice', team: 'A' },
  { id: 2, name: 'Bob', team: 'B' },
  { id: 3, name: 'Carol', team: 'A' },
];

@Component({
  imports: [TableComponent, HkCellTemplateDirective],
  template: `
    <hk-table [config]="config()" [data]="rows">
      <ng-template hkCellTemplate="name" let-row>
        <strong class="custom-name">{{ row.name }}!</strong>
      </ng-template>
    </hk-table>
  `,
})
class HostComponent {
  readonly config = input.required<FieldConfiguration<Row>>();
  readonly rows = ROWS;
}

type Layout = 'cdk' | 'grouped' | 'virtual';

function build(layout: Layout, extra: Partial<Parameters<typeof createTable<Row>>[0]> = {}): FieldConfiguration<Row> {
  return TestBed.runInInjectionContext(() =>
    createTable<Row>({
      visible: ['name', 'team'],
      hasSelection: true,
      enableFiltering: true,
      filters: [{ type: 'text', field: 'name', operators: ['contains'] }],
      actions: [{ type: 'view', label: 'View', action: () => undefined, tooltip: 'Open details' }],
      ...(layout === 'grouped' ? { grouping: { groupBy: 'team', initiallyExpanded: true } } : {}),
      ...(layout === 'virtual' ? { virtualScroll: { enabled: true, itemHeight: 40, viewportHeight: '400px' } } : {}),
      ...extra,
    }),
  );
}

function render(config: FieldConfiguration<Row>): { fixture: ComponentFixture<HostComponent>; el: HTMLElement } {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentRef.setInput('config', config);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('TableComponent layouts', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  describe.each<Layout>(['cdk', 'grouped', 'virtual'])('%s layout', (layout) => {
    it('renders the shared header: sort trigger, aria-sort and the column filter button', () => {
      const { el } = render(build(layout));
      const nameHeader = [...el.querySelectorAll('th[aria-sort]')].find((th) => th.textContent?.includes('Name'))!;
      expect(nameHeader).toBeTruthy();
      expect(nameHeader.querySelector('[role="button"]')).toBeTruthy();
      expect(nameHeader.querySelector('[aria-label="Filter Name"]')).toBeTruthy();
    });

    it('names the select-all checkbox', () => {
      const { el } = render(build(layout));
      expect(el.querySelector('thead input[type="checkbox"]')?.getAttribute('aria-label')).toBe('Select all rows on this page');
    });

    // The virtual viewport measures its size, which jsdom cannot do, so it renders no body rows there.
    if (layout !== 'virtual') {
      it('applies hkCellTemplate to the column', () => {
        const { el } = render(build(layout));
        const custom = [...el.querySelectorAll('.custom-name')].map((n) => n.textContent?.trim());
        expect(custom).toEqual(expect.arrayContaining(['Alice!', 'Bob!', 'Carol!']));
      });

      it('names every row checkbox', () => {
        const { el } = render(build(layout));
        const boxes = [...el.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')];
        expect(boxes.length).toBe(3);
        expect(boxes.every((b) => b.getAttribute('aria-label') === 'Select row')).toBe(true);
      });

      it('wraps actions with a tooltip when one is configured', () => {
        const { el } = render(build(layout));
        const tips = [...el.querySelectorAll('tbody .tooltip')].map((t) => t.getAttribute('data-tip'));
        expect(tips.length).toBe(3);
        expect(tips.every((t) => t === 'Open details')).toBe(true);
      });

      it('gives the inline editor and its buttons accessible names', () => {
        const { fixture, el } = render(build(layout, { enableInlineEditing: true, cellEditors: { name: { type: 'text' } } }));
        const table = fixture.debugElement.children[0].componentInstance as TableComponent<Row>;
        table.startEdit(ROWS[0], 'name');
        fixture.detectChanges();
        const editor = el.querySelector('.edit-cell')!;
        expect(editor).toBeTruthy();
        expect(editor.querySelector('input')?.getAttribute('aria-label')).toBe('Name');
        const labels = [...editor.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
        expect(labels).toEqual(['Save', 'Cancel edit']);
      });
    }
  });

  describe('grouped layout', () => {
    it('lets keyboard users expand and collapse a group', () => {
      const { fixture, el } = render(build('grouped'));
      const toggle = el.querySelector<HTMLButtonElement>('.group-header-row button')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(toggle.getAttribute('aria-label')).toBeTruthy();
      toggle.click();
      fixture.detectChanges();
      expect(el.querySelector('.group-header-row button')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('is a plain table (no grid keyboard model in this layout)', () => {
      const { el } = render(build('grouped', { enableKeyboardNavigation: true }));
      expect(el.querySelector('table')?.getAttribute('role')).toBeNull();
    });
  });

  describe('keyboard grid (CDK layout)', () => {
    function grid(el: HTMLElement): HTMLTableElement {
      return el.querySelector('table[role="grid"]')!;
    }

    it('focuses the <table>, not the host, and points aria-activedescendant at a cell inside it', () => {
      const { fixture, el } = render(build('cdk', { enableKeyboardNavigation: true }));
      const host = el.querySelector('hk-table')!;
      const table = grid(el);
      expect(host.hasAttribute('tabindex')).toBe(false);
      expect(table.getAttribute('tabindex')).toBe('0');
      expect(table.hasAttribute('aria-activedescendant')).toBe(false);

      table.focus();
      table.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      const id = table.getAttribute('aria-activedescendant')!;
      const cell = document.getElementById(id);
      expect(cell).toBeTruthy();
      expect(table.contains(cell)).toBe(true);
      expect(cell?.classList.contains('active-cell')).toBe(true);
      // Cells are not focus targets of their own: focus stays on the grid.
      expect(cell?.hasAttribute('tabindex')).toBe(false);
    });

    it('moves focus to the grid when a cell is clicked', () => {
      const { fixture, el } = render(build('cdk', { enableKeyboardNavigation: true }));
      const cell = el.querySelector<HTMLElement>('tbody td.cdk-column-name')!;
      cell.click();
      fixture.detectChanges();
      expect(document.activeElement).toBe(grid(el));
      expect(grid(el).getAttribute('aria-activedescendant')).toBe(cell.id);
    });

    it('ignores arrow keys pressed on controls inside the grid', () => {
      const { fixture, el } = render(build('cdk', { enableKeyboardNavigation: true }));
      const checkbox = el.querySelector<HTMLInputElement>('tbody input[type="checkbox"]')!;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      checkbox.dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented).toBe(false);
      expect(grid(el).hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('gives two tables on one page different cell ids', () => {
      const a = render(build('cdk', { enableKeyboardNavigation: true }));
      const b = render(build('cdk', { enableKeyboardNavigation: true }));
      for (const { fixture, el } of [a, b]) {
        grid(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        fixture.detectChanges();
      }
      expect(grid(a.el).getAttribute('aria-activedescendant')).not.toBe(grid(b.el).getAttribute('aria-activedescendant'));
    });
  });
});
