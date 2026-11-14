import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  createDataGrid,
  DATAGRID_OPERATORS,
  DataGridColumnType,
  DataGridComponent,
  DataGridStateIssue,
  HkDataGridCellDirective,
} from '@hakistack/ng-daisyui';

import { DocSectionComponent } from '../shared/doc-section.component';
import { generateInvoices, Invoice, INVOICE_COLUMNS, statusBadgeClass } from './datagrid-demo.data';

const COLUMN_TYPES: DataGridColumnType[] = ['text', 'number', 'date', 'boolean'];

/** DataGrid › Filtering: column filters from the UI and from code, validation and clearing. */
@Component({
  selector: 'app-datagrid-filtering-example',
  imports: [DataGridComponent, HkDataGridCellDirective, DocSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-section
      title="Column filters"
      description="From the UI: open a column menu (the ⋮ button, or Alt+↓ on a header) and pick an operator — the list depends on the column type. Active filters show as removable chips above the grid. From code: setFilter() replaces the filter of one column, setState({ filters }) sets them all, clearFilters() removes them. Filters are combined with AND; invalid ones are dropped and reported, never thrown."
      [codeExample]="code"
    >
      <div class="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter presets">
        <button type="button" class="btn btn-sm" (click)="overdueOver5k()">Overdue over $5,000</button>
        <button type="button" class="btn btn-sm" (click)="dueInQ1()">Due in Q1 2025</button>
        <button type="button" class="btn btn-sm" (click)="acmeOrGlobex()">Acme or Globex</button>
        <button type="button" class="btn btn-sm" (click)="notPaid()">Not paid</button>
        <button type="button" class="btn btn-sm btn-outline btn-warning" (click)="invalidFilter()">Invalid filter</button>
        <button type="button" class="btn btn-sm btn-ghost" [disabled]="!activeFilters().length" (click)="clear()">Clear filters</button>
      </div>

      <hk-datagrid [controller]="grid" height="420px">
        <ng-template hkDataGridCell="status" let-value>
          <span class="badge badge-sm border" [class]="statusClass(value)">{{ value }}</span>
        </ng-template>
      </hk-datagrid>

      <div class="mt-3 grid gap-4 lg:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-sm" aria-live="polite">
            <strong>{{ grid.total() }}</strong> of {{ rowCount }} invoices match {{ activeFilters().length }} filter(s).
          </p>
          @if (issues().length) {
            <ul class="space-y-1 rounded-box border border-warning/30 bg-warning/10 p-3 text-xs" aria-label="Dropped filters">
              @for (issue of issues(); track $index) {
                <li>
                  <code>{{ issue.path }}</code> — {{ issue.message }}
                </li>
              }
            </ul>
          }
          <div class="text-sm font-medium" id="dg-filter-state">state().filters</div>
          <pre class="max-h-56 overflow-auto rounded-box bg-base-200 p-3 text-xs" aria-labelledby="dg-filter-state">{{
            filtersJson()
          }}</pre>
        </div>

        <div class="min-w-0 overflow-x-auto">
          <table class="table table-sm" aria-label="DATAGRID_OPERATORS by column type">
            <caption class="pb-2 text-left text-sm font-medium">
              <code>DATAGRID_OPERATORS</code>
              — operators allowed per column type
            </caption>
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Operators</th>
              </tr>
            </thead>
            <tbody>
              @for (row of operatorRows; track row.type) {
                <tr>
                  <th scope="row">
                    <code>{{ row.type }}</code>
                  </th>
                  <td class="text-xs text-base-content/80">{{ row.operators }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-doc-section>
  `,
})
export class DataGridFilteringExampleComponent {
  private readonly invoices = generateInvoices(2_000);
  readonly rowCount = this.invoices.length;

  readonly grid = createDataGrid<Invoice>({
    columns: INVOICE_COLUMNS,
    data: this.invoices,
    search: true,
    rowKey: (r) => r.id,
    ariaLabel: 'Invoices (filtering)',
  });

  readonly issues = signal<DataGridStateIssue[]>([]);
  readonly activeFilters = computed(() => this.grid.state().filters);
  readonly filtersJson = computed(() => JSON.stringify(this.activeFilters(), null, 2));

  readonly operatorRows = COLUMN_TYPES.map((type) => ({ type, operators: DATAGRID_OPERATORS[type].join(', ') }));

  statusClass(status: unknown): string {
    return statusBadgeClass(status);
  }

  overdueOver5k(): void {
    this.issues.set(
      this.grid.setState({
        filters: [
          { field: 'status', operator: 'equals', value: 'overdue' },
          { field: 'amount', operator: 'gt', value: 5000 },
        ],
      }),
    );
  }

  dueInQ1(): void {
    this.issues.set(this.grid.setFilter('due', { operator: 'between', value: ['2025-01-01', '2025-03-31'] }));
  }

  acmeOrGlobex(): void {
    this.issues.set(this.grid.setFilter('customer', { operator: 'in', value: ['Acme Corp', 'Globex'] }));
  }

  notPaid(): void {
    this.issues.set(this.grid.setFilter('paid', { operator: 'equals', value: false }));
  }

  /** `gt` is not an operator for boolean columns: the filter is dropped and reported. */
  invalidFilter(): void {
    this.issues.set(this.grid.setFilter('paid', { operator: 'gt', value: 1 }));
  }

  clear(): void {
    this.grid.clearFilters();
    this.issues.set([]);
  }

  readonly code = `import { Component, signal } from '@angular/core';
import { createDataGrid, DATAGRID_OPERATORS, DataGridComponent, DataGridStateIssue } from '@hakistack/ng-daisyui';
import { Invoice, invoices } from './invoices';

@Component({
  imports: [DataGridComponent],
  template: \`
    <button type="button" (click)="overdue()">Overdue over $5,000</button>
    <button type="button" (click)="grid.clearFilters()">Clear filters</button>
    <hk-datagrid [controller]="grid" height="420px" />
    <p>{{ grid.total() }} matching rows</p>
  \`,
})
export class InvoicesComponent {
  issues = signal<DataGridStateIssue[]>([]);

  grid = createDataGrid<Invoice>({
    columns: [
      { field: 'customer', header: 'Customer' },
      { field: 'amount', header: 'Amount', type: 'number' },
      { field: 'due', header: 'Due', type: 'date' },
      { field: 'status', header: 'Status' },
      { field: 'paid', header: 'Paid', type: 'boolean' },
    ],
    data: invoices,
  });

  overdue(): void {
    // Replace every filter at once
    this.issues.set(
      this.grid.setState({
        filters: [
          { field: 'status', operator: 'equals', value: 'overdue' },
          { field: 'amount', operator: 'gt', value: 5000 },
        ],
      }),
    );
  }

  more(): void {
    // Or one column at a time (null removes it)
    this.grid.setFilter('due', { operator: 'between', value: ['2025-01-01', '2025-03-31'] });
    this.grid.setFilter('customer', { operator: 'in', value: ['Acme Corp', 'Globex'] });
    this.grid.setFilter('paid', { operator: 'gt', value: 1 });
    // → [{ path: 'filters[2].operator', message: 'Operator "gt" is not valid for boolean column "paid"…' }]
  }
}

DATAGRID_OPERATORS.number; // ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isEmpty', 'isNotEmpty']`;
}
