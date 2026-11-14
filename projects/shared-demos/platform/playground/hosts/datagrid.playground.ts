import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createDataGrid, DataGridComponent, DataGridController, DataGridState } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { DATAGRID_PLAYGROUND, DataGridPgState, PgInvoice, pgInvoices } from '../specs/datagrid';
import type { PlaygroundState } from '../playground.types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * hk-datagrid has no outputs (everything goes through the controller), so the
 * preview shows the controller's live state under the grid instead of an event log.
 */
@Component({
  selector: 'app-datagrid-playground',
  imports: [PlaygroundComponent, DataGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw>
        @let grid = gridFor(raw);
        <hk-datagrid [controller]="grid" [height]="height(raw)" />
        <p class="mt-2 text-xs text-base-content/70 font-mono break-words" aria-live="polite">
          {{ summary(grid.state(), grid.total(), grid.selectedCount()) }}
        </p>
      </ng-template>
    </app-playground>
  `,
})
export class DataGridPlaygroundComponent {
  protected readonly spec = DATAGRID_PLAYGROUND;
  private readonly rows: readonly PgInvoice[] = pgInvoices();

  // The playground re-creates the preview on every state change, so one controller per state is
  // enough. createDataGrid() needs no injection context.
  private last: { raw: PlaygroundState; grid: DataGridController<PgInvoice> } | null = null;

  protected gridFor(raw: PlaygroundState): DataGridController<PgInvoice> {
    if (this.last?.raw !== raw) {
      const s = raw as DataGridPgState;
      const grid = createDataGrid<PgInvoice>({
        columns: [
          { field: 'id', header: '#', type: 'number', width: 72 },
          { field: 'customer', header: 'Customer', width: 170 },
          { field: 'amount', header: 'Amount', type: 'number', width: 130, format: (value) => usd.format(Number(value)) },
          { field: 'dueDate', header: 'Due', type: 'date', width: 120, format: (value) => (value as Date).toLocaleDateString('en-US') },
          { field: 'paid', header: 'Paid', type: 'boolean', width: 90, format: (value) => (value ? 'Yes' : 'No') },
        ],
        data: this.rows,
        selection: s.selection as 'single' | 'multi',
        pageSize: s.pageSize > 0 ? s.pageSize : undefined,
        rowHeight: s.rowHeight,
        search: s.search,
        columnMenu: s.columnMenu,
        resizable: s.resizable,
        ariaLabel: 'Invoices',
      });
      this.last = { raw, grid };
    }
    return this.last.grid;
  }

  protected height(raw: PlaygroundState): string {
    return (raw as DataGridPgState).height;
  }

  protected summary(state: DataGridState, total: number, selected: number): string {
    const sort = state.sort.map((k) => `${k.field} ${k.direction}`).join(', ') || '—';
    const page = state.page ? `${state.page.index + 1} (${state.page.size}/page)` : 'virtualized';
    const parts = [`${total} rows`, `sort: ${sort}`, `filters: ${state.filters.length}`, `page: ${page}`, `selected: ${selected}`];
    if (state.search) parts.push(`search: "${state.search}"`);
    return parts.join(' · ');
  }
}
