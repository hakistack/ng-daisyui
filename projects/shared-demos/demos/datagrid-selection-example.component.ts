import { ChangeDetectionStrategy, Component, computed, signal, untracked } from '@angular/core';
import { createDataGrid, DataGridComponent, HkDataGridCellDirective } from '@hakistack/ng-daisyui';

import { DocSectionComponent } from '../shared/doc-section.component';
import { currency, generateInvoices, Invoice, INVOICE_COLUMNS, statusBadgeClass } from './datagrid-demo.data';

type SelectionMode = 'single' | 'multi';

/** DataGrid › Selection: single/multi, Shift ranges, select-all-matching and reading the selected rows. */
@Component({
  selector: 'app-datagrid-selection-example',
  imports: [DataGridComponent, HkDataGridCellDirective, DocSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-section
      title="Row selection"
      description="selection: 'single' or 'multi' adds a pinned checkbox column. Click a checkbox, or press Space on a focused row; in multi mode Shift+click selects the run from the last toggled row, and the header checkbox selects every row matching the current filters and search (not just the visible ones). Selection is keyed by rowKey, so it survives sorting, filtering and paging. Read it from selectedRows() / selectedCount() or the onSelectionChange callback."
      [codeExample]="code"
    >
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <div class="join" role="radiogroup" aria-label="Selection mode">
          @for (m of modes; track m) {
            <button
              type="button"
              role="radio"
              class="btn btn-sm join-item"
              [class.btn-active]="mode() === m"
              [attr.aria-checked]="mode() === m"
              (click)="setMode(m)"
            >
              {{ m }}
            </button>
          }
        </div>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Selection actions">
          <button type="button" class="btn btn-sm" [disabled]="mode() === 'single'" (click)="grid().selectAll()">
            Select all matching
          </button>
          <button type="button" class="btn btn-sm" (click)="selectOverdue()">Select overdue</button>
          <button type="button" class="btn btn-sm" (click)="toggleFirst()">Toggle first row</button>
          <button type="button" class="btn btn-sm btn-ghost" [disabled]="!grid().selectedCount()" (click)="grid().clearSelection()">
            Clear selection
          </button>
        </div>
      </div>

      <hk-datagrid [controller]="grid()" height="400px">
        <ng-template hkDataGridCell="status" let-value>
          <span class="badge badge-sm border" [class]="statusClass(value)">{{ value }}</span>
        </ng-template>
      </hk-datagrid>

      <div class="mt-3 grid gap-3 sm:grid-cols-3" aria-live="polite">
        <div class="rounded-box border border-base-300 p-3">
          <div class="text-xs text-base-content/70">selectedCount()</div>
          <div class="text-lg font-semibold tabular-nums">{{ grid().selectedCount() }}</div>
        </div>
        <div class="rounded-box border border-base-300 p-3">
          <div class="text-xs text-base-content/70">Sum of selected amounts</div>
          <div class="text-lg font-semibold tabular-nums">{{ selectedTotal() }}</div>
        </div>
        <div class="rounded-box border border-base-300 p-3">
          <div class="text-xs text-base-content/70">onSelectionChange calls</div>
          <div class="text-lg font-semibold tabular-nums">{{ changeCount() }}</div>
        </div>
      </div>
      @if (selectedPreview(); as preview) {
        <p class="mt-2 text-xs text-base-content/70">First selected: {{ preview }}</p>
      }
    </app-doc-section>
  `,
})
export class DataGridSelectionExampleComponent {
  private readonly invoices = generateInvoices(5_000);
  readonly modes: SelectionMode[] = ['multi', 'single'];
  readonly mode = signal<SelectionMode>('multi');
  readonly changeCount = signal(0);

  /** The mode is creation-time config, so switching it builds a fresh controller (and a fresh selection). */
  readonly grid = computed(() => {
    const selection = this.mode();
    return untracked(() =>
      createDataGrid<Invoice>({
        columns: INVOICE_COLUMNS.slice(0, 7),
        data: this.invoices,
        search: true,
        selection,
        rowKey: (r) => r.id,
        onSelectionChange: () => this.changeCount.update((n) => n + 1),
        ariaLabel: `Invoices (${selection} selection)`,
      }),
    );
  });

  readonly selectedTotal = computed(() =>
    currency.format(
      this.grid()
        .selectedRows()
        .reduce((sum, r) => sum + r.amount, 0),
    ),
  );
  readonly selectedPreview = computed(() =>
    this.grid()
      .selectedRows()
      .slice(0, 5)
      .map((r) => r.number)
      .join(', '),
  );

  setMode(mode: SelectionMode): void {
    if (mode === this.mode()) return;
    this.changeCount.set(0);
    this.mode.set(mode);
  }

  statusClass(status: unknown): string {
    return statusBadgeClass(status);
  }

  /** In single mode selectRows keeps only the last row. */
  selectOverdue(): void {
    const grid = this.grid();
    grid.selectRows(grid.rows().filter((r) => r.status === 'overdue'));
  }

  toggleFirst(): void {
    const first = this.grid().rows()[0];
    if (first) this.grid().toggleRow(first);
  }

  readonly code = `grid = createDataGrid<Invoice>({
  columns,
  data: invoices,
  selection: 'multi',            // or 'single'
  rowKey: (row) => row.id,       // keeps the selection across sort/filter/data refresh
  onSelectionChange: (rows) => console.log(rows.length, 'selected'),
});

total = computed(() => this.grid.selectedRows().reduce((sum, r) => sum + r.amount, 0));

this.grid.selectAll();           // every row matching filters + search (multi only)
this.grid.selectRows(this.grid.rows().filter((r) => r.status === 'overdue'));
this.grid.toggleRow(row);        // or toggleRow(row, true) to force
this.grid.isSelected(row);
this.grid.clearSelection();

<hk-datagrid [controller]="grid" height="400px" />
<p>{{ grid.selectedCount() }} selected · {{ total() }}</p>`;
}
