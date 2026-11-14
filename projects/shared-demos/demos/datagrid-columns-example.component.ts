import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { createDataGrid, DataGridColumn, DataGridComponent, HkDataGridCellDirective } from '@hakistack/ng-daisyui';

import { DocSectionComponent } from '../shared/doc-section.component';
import { generateInvoices, Invoice, INVOICE_COLUMNS, statusBadgeClass } from './datagrid-demo.data';

/** Customer gets a 120 px floor; Paid starts hidden. Everything else comes from the shared columns. */
const COLUMNS: DataGridColumn<Invoice>[] = INVOICE_COLUMNS.map((c) =>
  c.field === 'customer' ? { ...c, minWidth: 120 } : c.field === 'paid' ? { ...c, hidden: true } : c,
);

/** DataGrid › Columns: visibility, width (drag, double-click, keyboard, code), order and the fixed-layout options. */
@Component({
  selector: 'app-datagrid-columns-example',
  imports: [DataGridComponent, HkDataGridCellDirective, DocSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-section
      title="Visibility, width and order"
      description="Resize by dragging a header's right edge, double-click the edge to fit the column to its content, or use Alt+←/→ on a focused header. Hide and show columns from any column menu (⋮) or from code. Order is part of the state: setState({ columns }) moves the listed columns first, in that order. There is no drag-to-reorder and no column pinning yet — only the selection checkbox column is pinned."
      [codeExample]="code"
    >
      <div class="mb-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <fieldset class="min-w-0">
          <legend class="mb-1 text-sm font-medium">Visible columns</legend>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            @for (c of columnsState(); track c.field) {
              <label class="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  [checked]="c.visible"
                  [disabled]="c.visible && visibleCount() <= 1"
                  (change)="setVisible(c.field, $event)"
                />
                {{ headerOf(c.field) }}
              </label>
            }
          </div>
        </fieldset>

        <div class="flex min-w-0 flex-col gap-2">
          <div class="flex flex-wrap items-end gap-2">
            <label class="flex flex-col gap-1 text-sm" for="dg-col-pick">
              <span class="font-medium">Column</span>
              <select id="dg-col-pick" class="select select-bordered select-sm" [value]="picked()" (change)="pick($event)">
                @for (c of columnsState(); track c.field) {
                  <option [value]="c.field" [selected]="c.field === picked()">{{ headerOf(c.field) }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm" for="dg-col-width">
              <span class="font-medium">Width (px)</span>
              <input
                id="dg-col-width"
                type="number"
                class="input input-bordered input-sm w-28"
                min="0"
                step="10"
                [value]="pickedWidth()"
                (change)="setWidth($event)"
              />
            </label>
            <div class="join" role="group" aria-label="Move the selected column">
              <button type="button" class="btn btn-sm join-item" [disabled]="pickedIndex() <= 0" (click)="move(-1)">← Move left</button>
              <button type="button" class="btn btn-sm join-item" [disabled]="pickedIndex() >= columnsState().length - 1" (click)="move(1)">
                Move right →
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-ghost" (click)="grid.resetState()">Reset layout</button>
          </div>
          <p class="text-xs text-base-content/70">
            Customer has <code>minWidth: 120</code>: smaller widths from code, drag or <code>setState</code> are raised to it.
          </p>
        </div>
      </div>

      <hk-datagrid [controller]="grid" height="380px">
        <ng-template hkDataGridCell="status" let-value>
          <span class="badge badge-sm border" [class]="statusClass(value)">{{ value }}</span>
        </ng-template>
      </hk-datagrid>

      <details class="mt-3 text-xs">
        <summary class="cursor-pointer text-sm font-medium">state().columns</summary>
        <pre class="mt-2 max-h-64 overflow-auto rounded-box bg-base-200 p-3">{{ columnsJson() }}</pre>
      </details>
    </app-doc-section>

    <app-doc-section
      title="Fixed layout"
      description="resizable: false removes the resize handles (and Alt+←/→); columnMenu: false removes the header menus. Sorting by clicking a header still works; widths, visibility and order can still be set from code."
      [codeExample]="fixedCode"
    >
      <hk-datagrid [controller]="fixedGrid" height="260px" />
    </app-doc-section>
  `,
})
export class DataGridColumnsExampleComponent {
  private readonly invoices = generateInvoices(1_000);

  readonly grid = createDataGrid<Invoice>({
    columns: COLUMNS,
    data: this.invoices,
    rowKey: (r) => r.id,
    ariaLabel: 'Invoices (columns)',
  });

  readonly fixedGrid = createDataGrid<Invoice>({
    columns: INVOICE_COLUMNS.slice(0, 5),
    data: this.invoices,
    resizable: false,
    columnMenu: false,
    ariaLabel: 'Invoices (fixed layout)',
  });

  readonly columnsState = computed(() => this.grid.state().columns);
  readonly visibleCount = computed(() => this.columnsState().filter((c) => c.visible).length);
  readonly columnsJson = computed(() => JSON.stringify(this.columnsState(), null, 2));

  readonly picked = signal('customer');
  readonly pickedIndex = computed(() => this.columnsState().findIndex((c) => c.field === this.picked()));
  readonly pickedWidth = computed(() => this.columnsState()[this.pickedIndex()]?.width ?? 0);

  private readonly headers = new Map(COLUMNS.map((c) => [c.field, c.header]));

  headerOf(field: string): string {
    return this.headers.get(field) ?? field;
  }

  statusClass(status: unknown): string {
    return statusBadgeClass(status);
  }

  pick(event: Event): void {
    this.picked.set((event.target as HTMLSelectElement).value);
  }

  setVisible(field: string, event: Event): void {
    this.grid.setColumnVisible(field, (event.target as HTMLInputElement).checked);
  }

  setWidth(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.grid.setColumnWidth(this.picked(), input.valueAsNumber);
    // Show the clamped value when the input was below minWidth.
    input.value = String(this.pickedWidth());
  }

  /** Reorder through the state: list every column in the new order. */
  move(delta: -1 | 1): void {
    const order = this.columnsState().map((c) => c.field);
    const from = this.pickedIndex();
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    this.grid.setState({ columns: order.map((field) => ({ field })) });
  }

  readonly code = `grid = createDataGrid<Invoice>({
  columns: [
    { field: 'number', header: 'Invoice', width: 130 },
    { field: 'customer', header: 'Customer', width: 180, minWidth: 120 },
    { field: 'amount', header: 'Amount', type: 'number', width: 130 },
    { field: 'paid', header: 'Paid', type: 'boolean', hidden: true },  // starts hidden
  ],
  data: invoices,
});

// Visibility and width (the last visible column can't be hidden; widths respect minWidth)
this.grid.setColumnVisible('paid', true);
this.grid.setColumnWidth('customer', 240);

// Order: listed columns go first, in this order; the rest keep theirs
this.grid.setState({ columns: [{ field: 'amount' }, { field: 'customer' }] });

this.grid.state().columns;  // [{ field, visible, width }, …] in display order
this.grid.resetState();     // back to the column definitions

<hk-datagrid [controller]="grid" height="380px" />`;

  readonly fixedCode = `grid = createDataGrid<Invoice>({
  columns,
  data: invoices,
  resizable: false,   // no resize handles, no Alt+←/→
  columnMenu: false,  // no ⋮ menus (sort by header click still works)
});`;
}
