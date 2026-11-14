import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Tree table (createTable builder with `treeTable`) ─────────────────────
// Control keys are member paths of `FieldConfig` (the options `createTable()` takes).
export interface TreeTablePgState {
  [k: string]: string | number | boolean;
  'treeTable.expandAll': boolean;
  'treeTable.indentSize': number;
  'treeTable.showIndentGuides': boolean;
  hasSelection: boolean;
  'treeTable.checkboxCascade': string;
  'globalSearch.enabled': boolean;
  'treeTable.filterHierarchyMode': string;
}

/** Library defaults (normalizeTreeTableConfig / createTable's normalizer). */
const TREE_TABLE_DEFAULTS: TreeTablePgState = {
  'treeTable.expandAll': false,
  'treeTable.indentSize': 24,
  'treeTable.showIndentGuides': true,
  hasSelection: false,
  'treeTable.checkboxCascade': 'none',
  'globalSearch.enabled': false,
  'treeTable.filterHierarchyMode': 'ancestors',
};

// ── Sample data (the generated code embeds the same literal) ──────────────
export interface PgDepartment {
  id: string;
  name: string;
  head: string;
  employees: number;
  children?: PgDepartment[];
}

/** Fresh tree per call (the table keeps its own expansion state, never mutates rows). */
export function pgDepartments(): PgDepartment[] {
  return [
    {
      id: 'eng',
      name: 'Engineering',
      head: 'Ana Rivera',
      employees: 42,
      children: [
        {
          id: 'eng-web',
          name: 'Web',
          head: 'Luis Ortiz',
          employees: 18,
          children: [
            { id: 'eng-web-ui', name: 'Design system', head: 'Elena Vega', employees: 6 },
            { id: 'eng-web-app', name: 'Customer app', head: 'Pablo Rosa', employees: 12 },
          ],
        },
        { id: 'eng-data', name: 'Data', head: 'Marta Colón', employees: 9 },
        { id: 'eng-api', name: 'API', head: 'Diego Medina', employees: 15 },
      ],
    },
    {
      id: 'sales',
      name: 'Sales',
      head: 'José Torres',
      employees: 25,
      children: [
        { id: 'sales-na', name: 'North America', head: 'Carmen Ortiz', employees: 11 },
        { id: 'sales-eu', name: 'Europe', head: 'Raúl Vega', employees: 9 },
        { id: 'sales-apac', name: 'Asia Pacific', head: 'Sofía Rivera', employees: 5 },
      ],
    },
    {
      id: 'ops',
      name: 'Operations',
      head: 'Marta Rosa',
      employees: 14,
      children: [
        { id: 'ops-support', name: 'Support', head: 'Luis Medina', employees: 10 },
        { id: 'ops-it', name: 'IT', head: 'Ana Colón', employees: 4 },
      ],
    },
    { id: 'finance', name: 'Finance', head: 'Diego Torres', employees: 7 },
  ];
}

function departmentsLiteral(nodes: readonly PgDepartment[], depth: number): string {
  const pad = '  '.repeat(depth);
  return nodes
    .map((n) => {
      const props = [`id: '${n.id}'`, `name: '${n.name}'`, `head: '${n.head}'`, `employees: ${n.employees}`];
      if (!n.children?.length) return `${pad}{ ${props.join(', ')} },`;
      return `${pad}{\n${props.map((p) => `${pad}  ${p},\n`).join('')}${pad}  children: [\n${departmentsLiteral(n.children, depth + 2)}\n${pad}  ],\n${pad}},`;
    })
    .join('\n');
}

function treeTableCode(s: TreeTablePgState): string {
  const d = TREE_TABLE_DEFAULTS;
  const tree = [`      enabled: true,`, `      getRowKey: (row) => row.id,`];
  if (s['treeTable.expandAll'] !== d['treeTable.expandAll']) tree.push(`      expandAll: ${s['treeTable.expandAll']},`);
  if (s['treeTable.indentSize'] !== d['treeTable.indentSize']) tree.push(`      indentSize: ${s['treeTable.indentSize']},`);
  if (s['treeTable.showIndentGuides'] !== d['treeTable.showIndentGuides'])
    tree.push(`      showIndentGuides: ${s['treeTable.showIndentGuides']},`);
  if (s['treeTable.checkboxCascade'] !== d['treeTable.checkboxCascade'])
    tree.push(`      checkboxCascade: '${s['treeTable.checkboxCascade']}',`);
  if (s['treeTable.filterHierarchyMode'] !== d['treeTable.filterHierarchyMode'])
    tree.push(`      filterHierarchyMode: '${s['treeTable.filterHierarchyMode']}',`);

  const options: string[] = [];
  if (s['globalSearch.enabled']) options.push(`    globalSearch: { enabled: true, placeholder: 'Search departments...' },`);
  if (s.hasSelection) options.push(`    hasSelection: true,`);

  const events = [
    'expansionChange',
    ...(s.hasSelection ? ['selectionChange'] : []),
    ...(s['globalSearch.enabled'] ? ['globalSearchChange'] : []),
  ];
  const handler = (e: string) => `on${e[0].toUpperCase()}${e.slice(1)}`;
  const attrs = ['[data]="departments"', '[config]="table"', ...events.map((e) => `(${e})="${handler(e)}($event)"`)];
  const handlers = events.map((e) => `  ${handler(e)}(value: unknown): void {\n    console.log('${e}', value);\n  }`);

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTable, TableComponent } from '@hakistack/ng-daisyui';

interface Department {
  id: string;
  name: string;
  head: string;
  employees: number;
  children?: Department[];
}

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
  readonly departments: Department[] = [
${departmentsLiteral(pgDepartments(), 2)}
  ];

  // Field initializer: createTable() calls inject() internally.
  readonly table = createTable<Department>({
    columns: {
      name: { header: 'Department' },
      head: { header: 'Head' },
      employees: { header: 'Employees' },
    },
    pagination: { mode: 'offset', pageSize: 25 },
${options.length ? options.join('\n') + '\n' : ''}    treeTable: {
${tree.join('\n')}
    },
  });

${handlers.join('\n\n')}
}
`;
}

export const TREE_TABLE_PLAYGROUND = definePlayground<TreeTablePgState>({
  layout: 'wide',
  symbol: 'TableComponent',
  optionsSymbol: 'FieldConfig',
  defaults: TREE_TABLE_DEFAULTS,
  events: ['expansionChange', 'selectionChange', 'globalSearchChange'],
  controls: [
    { key: 'treeTable.expandAll', kind: 'boolean', label: l('Start fully expanded', 'Empezar todo expandido') },
    {
      key: 'treeTable.indentSize',
      kind: 'number',
      label: l('Indent per level (px)', 'Sangría por nivel (px)'),
      min: 8,
      max: 48,
      step: 4,
    },
    { key: 'treeTable.showIndentGuides', kind: 'boolean', label: l('Indent guide lines', 'Líneas guía de sangría') },
    { key: 'hasSelection', kind: 'boolean', label: l('Checkbox selection', 'Selección con casillas') },
    {
      key: 'treeTable.checkboxCascade',
      kind: 'select',
      label: l('Checkbox cascade (with selection)', 'Cascada de casillas (con selección)'),
      options: ['none', 'downward', 'upward', 'both'],
    },
    { key: 'globalSearch.enabled', kind: 'boolean', label: l('Search box', 'Caja de búsqueda') },
    {
      key: 'treeTable.filterHierarchyMode',
      kind: 'select',
      label: l('Search keeps (with search)', 'La búsqueda conserva (con búsqueda)'),
      options: ['ancestors', 'descendants', 'both', 'none'],
    },
  ],
  code: (s) => treeTableCode(s),
});
