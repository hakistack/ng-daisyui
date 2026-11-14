import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── DataGrid (createDataGrid builder + [height] input) ─────────────────────
// `height` is a real input of hk-datagrid; every other key is a member of `DataGridConfig`.
export interface DataGridPgState {
  [k: string]: string | number | boolean;
  pageSize: number;
  rowHeight: number;
  search: boolean;
  selection: string;
  columnMenu: boolean;
  resizable: boolean;
  height: string;
}

/**
 * Library defaults, except two playground choices that are always written:
 * `pageSize: 0` stands for "not set" (every row virtualized) and `selection`
 * has no "none" value in its type, so the playground always shows a selection mode.
 */
const DATAGRID_DEFAULTS: DataGridPgState = {
  pageSize: 0,
  rowHeight: 36,
  search: false,
  selection: 'multi',
  columnMenu: true,
  resizable: true,
  height: '480px',
};

// ── Sample data (deterministic; the generated code builds the same rows) ──
export interface PgInvoice {
  id: number;
  customer: string;
  amount: number;
  dueDate: Date;
  paid: boolean;
}
export const PG_CUSTOMERS = ['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Stark Industries', 'Wayne Enterprises', 'Hooli', 'Soylent'];

export function pgInvoices(): PgInvoice[] {
  return Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    customer: PG_CUSTOMERS[i % 8],
    amount: 250 + ((i * 7919) % 400) * 37.5,
    dueDate: new Date(2025, i % 12, 1 + ((i * 13) % 28)),
    paid: i % 3 === 0,
  }));
}

function datagridCode(s: DataGridPgState): string {
  const d = DATAGRID_DEFAULTS;
  const options = [`    selection: '${s.selection}',`];
  if (s.pageSize > 0) options.push(`    pageSize: ${s.pageSize},`);
  if (s.rowHeight !== d.rowHeight) options.push(`    rowHeight: ${s.rowHeight},`);
  if (s.search !== d.search) options.push(`    search: ${s.search},`);
  if (s.columnMenu !== d.columnMenu) options.push(`    columnMenu: ${s.columnMenu},`);
  if (s.resizable !== d.resizable) options.push(`    resizable: ${s.resizable},`);
  const height = s.height !== d.height ? ` height="${s.height}"` : '';

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createDataGrid, DataGridComponent } from '@hakistack/ng-daisyui';

interface Invoice {
  id: number;
  customer: string;
  amount: number;
  dueDate: Date;
  paid: boolean;
}

const CUSTOMERS = [${PG_CUSTOMERS.map((c) => `'${c}'`).join(', ')}];
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

@Component({
  selector: 'app-example',
  imports: [DataGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<hk-datagrid [controller]="grid"${height} />\`,
})
export class ExampleComponent {
  // createDataGrid() does not need an injection context.
  readonly grid = createDataGrid<Invoice>({
    columns: [
      { field: 'id', header: '#', type: 'number', width: 72 },
      { field: 'customer', header: 'Customer', width: 170 },
      { field: 'amount', header: 'Amount', type: 'number', width: 130, format: (value) => usd.format(Number(value)) },
      { field: 'dueDate', header: 'Due', type: 'date', width: 120, format: (value) => (value as Date).toLocaleDateString('en-US') },
      { field: 'paid', header: 'Paid', type: 'boolean', width: 90, format: (value) => (value ? 'Yes' : 'No') },
    ],
    data: Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      customer: CUSTOMERS[i % 8],
      amount: 250 + ((i * 7919) % 400) * 37.5,
      dueDate: new Date(2025, i % 12, 1 + ((i * 13) % 28)),
      paid: i % 3 === 0,
    })),
${options.join('\n')}
    ariaLabel: 'Invoices',
    onSelectionChange: (rows) => console.log('selected', rows.length),
    onStateChange: (state) => console.log('state', state),
  });
}
`;
}

export const DATAGRID_PLAYGROUND = definePlayground<DataGridPgState>({
  layout: 'wide',
  symbol: 'DataGridComponent',
  selector: 'hk-datagrid',
  optionsSymbol: 'DataGridConfig',
  inputs: ['height'],
  defaults: DATAGRID_DEFAULTS,
  controls: [
    {
      key: 'pageSize',
      kind: 'number',
      label: l('Rows per page (0 = no pages, all rows virtualized)', 'Filas por página (0 = sin páginas, todo virtualizado)'),
      min: 0,
      max: 100,
      step: 5,
    },
    { key: 'rowHeight', kind: 'number', label: l('Row height (px)', 'Alto de fila (px)'), min: 28, max: 64, step: 4 },
    { key: 'search', kind: 'boolean', label: l('Quick search box', 'Caja de búsqueda rápida') },
    { key: 'selection', kind: 'select', label: l('Row selection', 'Selección de filas'), options: ['multi', 'single'] },
    { key: 'columnMenu', kind: 'boolean', label: l('Column header menu', 'Menú en el encabezado de columna') },
    { key: 'resizable', kind: 'boolean', label: l('Resize columns', 'Redimensionar columnas') },
    { key: 'height', kind: 'select', label: l('Grid height', 'Alto de la tabla'), options: ['320px', '480px', '640px'] },
  ],
  code: (s) => datagridCode(s),
});
