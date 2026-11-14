import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Table (createTable builder) ───────────────────────────────────────────
// Control keys are member paths of `FieldConfig` (the options `createTable()` takes).
export interface TablePgState {
  [k: string]: string | number | boolean;
  'pagination.pageSize': number;
  'pagination.navStyle': string;
  'pagination.showSizeChanger': boolean;
  'globalSearch.enabled': boolean;
  hasSelection: boolean;
  enableFiltering: boolean;
  enableColumnResizing: boolean;
  enableColumnReorder: boolean;
  'columnVisibility.enabled': boolean;
}

/** Library defaults (pagination: PaginationController / table-pagination; the rest: createTable's normalizer). */
const TABLE_DEFAULTS: TablePgState = {
  'pagination.pageSize': 10,
  'pagination.navStyle': 'compact',
  'pagination.showSizeChanger': true,
  'globalSearch.enabled': false,
  hasSelection: false,
  enableFiltering: false,
  enableColumnResizing: false,
  enableColumnReorder: false,
  'columnVisibility.enabled': false,
};

// ── Sample data (deterministic; the generated code builds the same rows) ──
export interface PgEmployee {
  id: number;
  name: string;
  department: string;
  status: string;
  salary: number;
}
export const PG_FIRST_NAMES = ['Ana', 'Luis', 'Marta', 'José', 'Sofía', 'Diego', 'Elena', 'Pablo', 'Carmen', 'Raúl'];
export const PG_LAST_NAMES = ['Rivera', 'Ortiz', 'Colón', 'Torres', 'Vega', 'Rosa', 'Medina'];
export const PG_DEPARTMENTS = ['Engineering', 'Sales', 'Support', 'Finance'];

export function pgEmployees(): PgEmployee[] {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i + 1,
    name: `${PG_FIRST_NAMES[i % 10]} ${PG_LAST_NAMES[(i * 3) % 7]}`,
    department: PG_DEPARTMENTS[(i * 7) % 4],
    status: i % 5 === 0 ? 'On leave' : 'Active',
    salary: 42000 + ((i * 7919) % 61) * 1000,
  }));
}

const list = (items: readonly string[]): string => `[${items.map((s) => `'${s}'`).join(', ')}]`;

/** Event → is it wired in the generated code for this state? */
function tableEvents(s: TablePgState): string[] {
  return [
    'sortChange',
    'pageChange',
    ...(s.hasSelection ? ['selectionChange'] : []),
    ...(s['globalSearch.enabled'] ? ['globalSearchChange'] : []),
    ...(s.enableFiltering ? ['filterChange'] : []),
    ...(s.enableColumnResizing ? ['columnResize'] : []),
    ...(s.enableColumnReorder ? ['columnReorder'] : []),
  ];
}

function tableCode(s: TablePgState): string {
  const d = TABLE_DEFAULTS;
  const pagination = [`mode: 'offset'`, `pageSize: ${s['pagination.pageSize']}`];
  if (s['pagination.navStyle'] !== d['pagination.navStyle']) pagination.push(`navStyle: '${s['pagination.navStyle']}'`);
  if (s['pagination.showSizeChanger'] !== d['pagination.showSizeChanger'])
    pagination.push(`showSizeChanger: ${s['pagination.showSizeChanger']}`);

  const options = [`    pagination: { ${pagination.join(', ')} },`];
  if (s['globalSearch.enabled']) options.push(`    globalSearch: { enabled: true, placeholder: 'Search employees...' },`);
  if (s.hasSelection) options.push(`    hasSelection: true,`);
  if (s.enableFiltering) {
    options.push(
      `    enableFiltering: true,`,
      `    filters: [`,
      `      { field: 'department', type: 'select', options: DEPARTMENTS.map((d) => ({ label: d, value: d })) },`,
      `      { field: 'salary', type: 'number' },`,
      `    ],`,
    );
  }
  if (s.enableColumnResizing) options.push(`    enableColumnResizing: true,`);
  if (s.enableColumnReorder) options.push(`    enableColumnReorder: true,`);
  if (s['columnVisibility.enabled']) options.push(`    columnVisibility: { enabled: true },`);

  const events = tableEvents(s);
  const handler = (e: string) => `on${e[0].toUpperCase()}${e.slice(1)}`;
  const attrs = ['[data]="employees"', '[config]="table"', ...events.map((e) => `(${e})="${handler(e)}($event)"`)];
  const handlers = events.map((e) => `  ${handler(e)}(value: unknown): void {\n    console.log('${e}', value);\n  }`);

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTable, TableComponent } from '@hakistack/ng-daisyui';

interface Employee {
  id: number;
  name: string;
  department: string;
  status: string;
  salary: number;
}

const FIRST_NAMES = ${list(PG_FIRST_NAMES)};
const LAST_NAMES = ${list(PG_LAST_NAMES)};
const DEPARTMENTS = ${list(PG_DEPARTMENTS)};
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

@Component({
  selector: 'app-example',
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-table
      ${attrs.join('\n      ')}
    />
  \`,
})
export class ExampleComponent {
  readonly employees: Employee[] = Array.from({ length: 60 }, (_, i) => ({
    id: i + 1,
    name: \`\${FIRST_NAMES[i % 10]} \${LAST_NAMES[(i * 3) % 7]}\`,
    department: DEPARTMENTS[(i * 7) % 4],
    status: i % 5 === 0 ? 'On leave' : 'Active',
    salary: 42000 + ((i * 7919) % 61) * 1000,
  }));

  // Field initializer: createTable() calls inject() internally.
  readonly table = createTable<Employee>({
    columns: {
      name: { header: 'Name' },
      department: { header: 'Department' },
      status: { header: 'Status' },
      salary: { header: 'Salary', format: (value) => usd.format(value) },
    },
${options.join('\n')}
  });

${handlers.join('\n\n')}
}
`;
}

export const TABLE_PLAYGROUND = definePlayground<TablePgState>({
  layout: 'wide',
  symbol: 'TableComponent',
  optionsSymbol: 'FieldConfig',
  defaults: TABLE_DEFAULTS,
  events: ['sortChange', 'pageChange', 'selectionChange', 'globalSearchChange', 'filterChange', 'columnResize', 'columnReorder'],
  controls: [
    { key: 'pagination.pageSize', kind: 'number', label: l('Rows per page', 'Filas por página'), min: 5, max: 50, step: 5 },
    {
      key: 'pagination.navStyle',
      kind: 'select',
      label: l('Page buttons', 'Botones de página'),
      options: ['compact', 'numbered'],
    },
    { key: 'pagination.showSizeChanger', kind: 'boolean', label: l('Page-size picker', 'Selector de tamaño de página') },
    { key: 'globalSearch.enabled', kind: 'boolean', label: l('Search box', 'Caja de búsqueda') },
    { key: 'hasSelection', kind: 'boolean', label: l('Checkbox selection', 'Selección con casillas') },
    {
      key: 'enableFiltering',
      kind: 'boolean',
      label: l('Column filters (Department, Salary)', 'Filtros por columna (Departamento, Salario)'),
    },
    { key: 'enableColumnResizing', kind: 'boolean', label: l('Resize columns', 'Redimensionar columnas') },
    { key: 'enableColumnReorder', kind: 'boolean', label: l('Drag to reorder columns', 'Arrastrar para reordenar columnas') },
    { key: 'columnVisibility.enabled', kind: 'boolean', label: l('Column chooser', 'Selector de columnas') },
  ],
  code: (s) => tableCode(s),
});
