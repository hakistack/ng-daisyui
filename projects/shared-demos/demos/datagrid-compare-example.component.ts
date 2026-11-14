import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createDataGrid, createTable, DataGridComponent, TableComponent } from '@hakistack/ng-daisyui';

import { DocSectionComponent } from '../shared/doc-section.component';
import { currency, generateInvoices, Invoice, INVOICE_COLUMNS } from './datagrid-demo.data';

interface Difference {
  capability: string;
  table: string;
  grid: string;
}

/** What each component supports today. Kept honest: "No" means not built yet, not "use a workaround". */
const DIFFERENCES: Difference[] = [
  {
    capability: 'Best for',
    table: 'Small and medium data sets with rich row features',
    grid: 'Large data sets (100k+ rows, many columns), saved views, AI',
  },
  { capability: 'Rendering', table: 'Pagination, or row virtual scroll', grid: 'Row + column virtualization in one pipeline' },
  { capability: 'Sorting', table: 'One column at a time', grid: 'Multi-column (Shift+click adds a level)' },
  {
    capability: 'Column filters',
    table: 'Header filter menus: text, number, date, select, multiselect, boolean, ranges',
    grid: 'Column-menu filters with typed operators (DATAGRID_OPERATORS), removable chips',
  },
  { capability: 'Quick search', table: 'Global search (contains, startsWith, exact, fuzzy)', grid: 'Quick search over searchable columns' },
  {
    capability: 'Server data',
    table: 'Offset or cursor pagination; you wire (pageChange) to your fetch',
    grid: 'dataSource(request, { signal }) with automatic abort of stale requests',
  },
  {
    capability: 'Row selection',
    table: 'Checkboxes, selection limit, bulk actions',
    grid: 'Single / multi, Shift ranges, select all matching rows',
  },
  { capability: 'Cell range + copy', table: 'No', grid: 'Drag or Shift+arrows; Ctrl+C copies TSV for Excel' },
  { capability: 'Column resize', table: 'Yes (enableColumnResizing)', grid: 'Yes, plus double-click to fit and Alt+←/→' },
  { capability: 'Column reorder', table: 'Drag and drop (enableColumnReorder)', grid: 'From code only (setState columns order)' },
  { capability: 'Pinned columns', table: 'Sticky start / end columns', grid: 'No (only the selection column is pinned)' },
  { capability: 'Column visibility', table: 'Column chooser (columnVisibility)', grid: 'Column menu, setColumnVisible()' },
  { capability: 'Inline editing', table: 'Yes (enableInlineEditing)', grid: 'No' },
  { capability: 'Row actions, bulk actions', table: 'Yes', grid: 'No' },
  { capability: 'Grouping, tree, detail rows, master-detail', table: 'Yes', grid: 'No' },
  { capability: 'Footer aggregates', table: 'Yes', grid: 'No' },
  { capability: 'Row drag reorder', table: 'Yes', grid: 'No' },
  { capability: 'Serializable view state', table: 'No', grid: 'getState() / setState() with validation, stateSchema()' },
  { capability: 'Natural-language views', table: 'No', grid: 'ask() with Claude (your API key)' },
  {
    capability: 'Export',
    table: 'exportToCsv / exportToJson helpers',
    grid: 'Copy to clipboard (TSV); no file export helper',
  },
];

/** DataGrid › Compare: the same rows in hk-table and hk-datagrid, plus a capability table. */
@Component({
  selector: 'app-datagrid-compare-example',
  imports: [TableComponent, DataGridComponent, DocSectionComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-section
      title="hk-table and hk-datagrid side by side"
      description="The same 500 invoices in both components. hk-table is configured once with createTable() — a field initializer, because it needs an injection context — and gets its rows through [data]. hk-datagrid keeps rows, view state and selection in the controller from createDataGrid(). Pick hk-table for row-level features (editing, grouping, detail rows, actions); pick hk-datagrid for large data, multi-sort, saved views and AI."
      [codeExample]="code"
    >
      <div class="grid gap-6 xl:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-2" aria-labelledby="cmp-table-title">
          <h3 id="cmp-table-title" class="text-base font-semibold">
            hk-table <span class="text-sm font-normal text-base-content/70">· createTable()</span>
          </h3>
          <hk-table [data]="invoices" [config]="table" (selectionChange)="tableSelected.set($event.length)" />
          <p class="text-xs text-base-content/70" aria-live="polite">{{ tableSelected() }} selected</p>
        </section>

        <section class="flex min-w-0 flex-col gap-2" aria-labelledby="cmp-grid-title">
          <h3 id="cmp-grid-title" class="text-base font-semibold">
            hk-datagrid <span class="text-sm font-normal text-base-content/70">· createDataGrid()</span>
          </h3>
          <hk-datagrid [controller]="grid" height="468px" />
          <p class="text-xs text-base-content/70" aria-live="polite">{{ grid.selectedCount() }} selected</p>
        </section>
      </div>

      <div class="mt-6 overflow-x-auto">
        <table class="table table-sm">
          <caption class="pb-2 text-left text-sm font-medium">
            What each component supports today
          </caption>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">hk-table</th>
              <th scope="col">hk-datagrid</th>
            </tr>
          </thead>
          <tbody>
            @for (d of differences; track d.capability) {
              <tr>
                <th scope="row" class="font-medium">{{ d.capability }}</th>
                <td [class]="d.table === 'No' ? 'text-base-content/70' : ''">{{ d.table }}</td>
                <td [class]="d.grid.startsWith('No') ? 'text-base-content/70' : ''">{{ d.grid }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-sm text-base-content/80">
        hk-datagrid has no inline editing yet. For editable cells use hk-table — see
        <a class="link link-primary" routerLink="/table/editable">Table › Editable cells</a>.
      </p>
    </app-doc-section>
  `,
})
export class DataGridCompareExampleComponent {
  readonly invoices = generateInvoices(500);
  readonly tableSelected = signal(0);

  // createTable() calls inject(): create it in a field initializer (or the constructor), not in a computed().
  readonly table = createTable<Invoice>({
    columns: {
      number: { header: 'Invoice' },
      customer: { header: 'Customer' },
      region: { header: 'Region' },
      amount: {
        header: 'Amount',
        format: (value) => currency.format(value),
        footer: (rows) => currency.format(rows.reduce((sum, r) => sum + r.amount, 0)),
      },
      due: { header: 'Due' },
      status: { header: 'Status' },
    },
    hasSelection: true,
    enableColumnResizing: true,
    enableFiltering: true,
    filters: [
      {
        field: 'status',
        type: 'select',
        options: [
          { label: 'Paid', value: 'paid' },
          { label: 'Open', value: 'open' },
          { label: 'Overdue', value: 'overdue' },
        ],
      },
      { field: 'amount', type: 'number' },
    ],
    globalSearch: { enabled: true, placeholder: 'Search invoices…' },
    pagination: { mode: 'offset', pageSize: 10, pageSizeOptions: [10, 25, 50] },
  });

  readonly grid = createDataGrid<Invoice>({
    columns: INVOICE_COLUMNS.slice(0, 7).filter((c) => c.field !== 'issued'),
    data: this.invoices,
    pageSize: 10,
    pageSizeOptions: [10, 25, 50],
    search: true,
    selection: 'multi',
    rowKey: (r) => r.id,
    ariaLabel: 'Invoices (hk-datagrid)',
  });

  readonly differences = DIFFERENCES;

  readonly code = `import { Component, signal } from '@angular/core';
import { createDataGrid, createTable, DataGridComponent, TableComponent } from '@hakistack/ng-daisyui';
import { Invoice, invoices } from './invoices';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

@Component({
  imports: [TableComponent, DataGridComponent],
  template: \`
    <hk-table [data]="rows" [config]="table" (selectionChange)="tableSelected.set($event.length)" />

    <hk-datagrid [controller]="grid" height="468px" />
    <p>{{ grid.selectedCount() }} selected</p>
  \`,
})
export class CompareComponent {
  rows = invoices;
  tableSelected = signal(0);

  // hk-table — createTable() uses inject(): call it in a field initializer or constructor
  // (from a computed()/effect() wrap it in runInInjectionContext). Rows come through [data].
  table = createTable<Invoice>({
    columns: {
      number: { header: 'Invoice' },
      customer: { header: 'Customer' },
      amount: { header: 'Amount', format: (value) => currency.format(value) },
      status: { header: 'Status' },
    },
    hasSelection: true,
    enableFiltering: true,
    filters: [{ field: 'amount', type: 'number' }],
    globalSearch: { enabled: true },
    pagination: { mode: 'offset', pageSize: 10 },
  });

  // hk-datagrid — the controller owns rows, view state and selection.
  grid = createDataGrid<Invoice>({
    columns: [
      { field: 'number', header: 'Invoice' },
      { field: 'customer', header: 'Customer' },
      { field: 'amount', header: 'Amount', type: 'number', format: (v) => currency.format(v as number) },
      { field: 'status', header: 'Status' },
    ],
    data: invoices,
    pageSize: 10,
    search: true,
    selection: 'multi',
  });
}`;
}
