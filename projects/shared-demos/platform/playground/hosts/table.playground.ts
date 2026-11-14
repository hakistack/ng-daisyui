import { ChangeDetectionStrategy, Component, Injector, inject, runInInjectionContext } from '@angular/core';
import { createTable, DeclarativeTableConfig, FieldConfiguration, TableComponent } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { PG_DEPARTMENTS, PgEmployee, pgEmployees, TABLE_PLAYGROUND, TablePgState } from '../specs/table';
import type { PlaygroundState } from '../playground.types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

@Component({
  selector: 'app-table-playground',
  imports: [PlaygroundComponent, TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <hk-table
          [data]="rows"
          [config]="tableFor(raw)"
          (sortChange)="log('sortChange', $event)"
          (pageChange)="log('pageChange', $event)"
          (selectionChange)="log('selectionChange', $event)"
          (globalSearchChange)="log('globalSearchChange', $event)"
          (filterChange)="log('filterChange', $event)"
          (columnResize)="log('columnResize', $event)"
          (columnReorder)="log('columnReorder', $event)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class TablePlaygroundComponent {
  protected readonly spec = TABLE_PLAYGROUND;
  private readonly injector = inject(Injector);
  // Same rows as the generated code.
  protected readonly rows: readonly PgEmployee[] = pgEmployees();

  // The playground re-creates the preview on every state change, so one controller per state
  // is enough. createTable() calls inject(), hence runInInjectionContext().
  private last: { raw: PlaygroundState; table: FieldConfiguration<PgEmployee> } | null = null;

  protected tableFor(raw: PlaygroundState): FieldConfiguration<PgEmployee> {
    if (this.last?.raw !== raw) {
      const config = buildConfig(raw as TablePgState);
      this.last = { raw, table: runInInjectionContext(this.injector, () => createTable<PgEmployee>(config)) };
    }
    return this.last.table;
  }
}

function buildConfig(s: TablePgState): DeclarativeTableConfig<PgEmployee> {
  return {
    columns: {
      name: { header: 'Name' },
      department: { header: 'Department' },
      status: { header: 'Status' },
      salary: { header: 'Salary', format: (value) => usd.format(value) },
    },
    pagination: {
      mode: 'offset',
      pageSize: s['pagination.pageSize'],
      navStyle: s['pagination.navStyle'] as 'compact' | 'numbered',
      showSizeChanger: s['pagination.showSizeChanger'],
    },
    globalSearch: s['globalSearch.enabled'] ? { enabled: true, placeholder: 'Search employees...' } : undefined,
    hasSelection: s.hasSelection,
    enableFiltering: s.enableFiltering,
    filters: s.enableFiltering
      ? [
          { field: 'department', type: 'select', options: PG_DEPARTMENTS.map((d) => ({ label: d, value: d })) },
          { field: 'salary', type: 'number' },
        ]
      : [],
    enableColumnResizing: s.enableColumnResizing,
    enableColumnReorder: s.enableColumnReorder,
    columnVisibility: s['columnVisibility.enabled'] ? { enabled: true } : undefined,
  };
}
