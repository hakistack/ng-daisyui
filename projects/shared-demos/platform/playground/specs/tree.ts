import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Tree (createTree builder) ─────────────────────────────────────────────
// Control keys are members of `TreeConfig` (createTree's input extends it with `nodes`).
export interface TreePgState {
  [k: string]: string | number | boolean;
  selectionMode: string;
  propagateSelectionDown: boolean;
  propagateSelectionUp: boolean;
  filterable: boolean;
  filterMode: string;
  showLines: boolean;
  indentSize: number;
  dragDrop: boolean;
  expandAll: boolean;
}

/** createTree() defaults. `''` = selectionMode not set (null, no selection). */
const TREE_DEFAULTS: TreePgState = {
  selectionMode: '',
  propagateSelectionDown: true,
  propagateSelectionUp: true,
  filterable: false,
  filterMode: 'lenient',
  showLines: false,
  indentSize: 24,
  dragDrop: false,
  expandAll: false,
};

// ── Sample data (the generated code embeds the same literal) ──────────────
export interface PgTreeNode {
  key: string;
  label: string;
  expanded?: boolean;
  children?: PgTreeNode[];
}

/** Fresh nodes per call: the tree keeps expansion/drag-drop changes on the node objects. */
export function pgProjectNodes(): PgTreeNode[] {
  return [
    {
      key: 'src',
      label: 'src',
      expanded: true,
      children: [
        {
          key: 'src-app',
          label: 'app',
          children: [
            { key: 'app-component', label: 'app.component.ts' },
            { key: 'app-routes', label: 'app.routes.ts' },
            { key: 'app-config', label: 'app.config.ts' },
          ],
        },
        {
          key: 'src-assets',
          label: 'assets',
          children: [
            { key: 'assets-logo', label: 'logo.svg' },
            { key: 'assets-fonts', label: 'fonts.css' },
          ],
        },
        { key: 'src-main', label: 'main.ts' },
        { key: 'src-styles', label: 'styles.css' },
      ],
    },
    {
      key: 'docs',
      label: 'docs',
      children: [
        { key: 'docs-guide', label: 'guide.md' },
        { key: 'docs-api', label: 'api.md' },
      ],
    },
    { key: 'package', label: 'package.json' },
    { key: 'readme', label: 'README.md' },
  ];
}

function nodesLiteral(nodes: readonly PgTreeNode[], depth: number): string {
  const pad = '  '.repeat(depth);
  return nodes
    .map((n) => {
      const props = [`key: '${n.key}'`, `label: '${n.label}'`, ...(n.expanded ? ['expanded: true'] : [])];
      if (!n.children?.length) return `${pad}{ ${props.join(', ')} },`;
      return `${pad}{\n${props.map((p) => `${pad}  ${p},\n`).join('')}${pad}  children: [\n${nodesLiteral(n.children, depth + 2)}\n${pad}  ],\n${pad}},`;
    })
    .join('\n');
}

/** Outputs wired in the generated code for this state. */
function treeEvents(s: TreePgState): string[] {
  return [
    'nodeExpand',
    'nodeCollapse',
    ...(s.selectionMode ? ['selectionChange'] : []),
    ...(s.filterable ? ['filterChange'] : []),
    ...(s.dragDrop ? ['nodeDrop'] : []),
  ];
}

function treeCode(s: TreePgState): string {
  const d = TREE_DEFAULTS;
  const options: string[] = [];
  if (s.selectionMode) options.push(`    selectionMode: '${s.selectionMode}',`);
  for (const key of ['propagateSelectionDown', 'propagateSelectionUp', 'filterable', 'showLines', 'dragDrop', 'expandAll'] as const) {
    if (s[key] !== d[key]) options.push(`    ${key}: ${s[key]},`);
  }
  if (s.filterMode !== d.filterMode) options.push(`    filterMode: '${s.filterMode}',`);
  if (s.indentSize !== d.indentSize) options.push(`    indentSize: ${s.indentSize},`);
  options.push(`    ariaLabel: 'Project files',`);

  const events = treeEvents(s);
  const handler = (e: string) => `on${e[0].toUpperCase()}${e.slice(1)}`;
  const attrs = ['[tree]="tree"', ...events.map((e) => `(${e})="${handler(e)}($event)"`)];
  const handlers = events.map((e) => `  ${handler(e)}(value: unknown): void {\n    console.log('${e}', value);\n  }`);

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTree, TreeComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-tree
      ${attrs.join('\n      ')}
    />
  \`,
})
export class ExampleComponent {
  readonly tree = createTree({
    nodes: [
${nodesLiteral(pgProjectNodes(), 3)}
    ],
${options.join('\n')}
  });

${handlers.join('\n\n')}
}
`;
}

export const TREE_PLAYGROUND = definePlayground<TreePgState>({
  symbol: 'TreeComponent',
  optionsSymbol: 'TreeConfig',
  defaults: TREE_DEFAULTS,
  events: ['selectionChange', 'nodeSelect', 'nodeUnselect', 'nodeExpand', 'nodeCollapse', 'filterChange', 'nodeDrop'],
  controls: [
    {
      key: 'selectionMode',
      kind: 'select',
      label: l('Selection (empty = none)', 'Selección (vacío = ninguna)'),
      options: ['', 'single', 'multiple', 'checkbox'],
    },
    { key: 'propagateSelectionDown', kind: 'boolean', label: l('Checkbox: children follow parent', 'Casillas: los hijos siguen al padre') },
    {
      key: 'propagateSelectionUp',
      kind: 'boolean',
      label: l('Checkbox: parent reflects children', 'Casillas: el padre refleja a los hijos'),
    },
    { key: 'filterable', kind: 'boolean', label: l('Filter box', 'Caja de filtro') },
    {
      key: 'filterMode',
      kind: 'select',
      label: l('Filter keeps ancestors (lenient) or not (strict)', 'El filtro conserva ancestros (lenient) o no (strict)'),
      options: ['lenient', 'strict'],
    },
    { key: 'showLines', kind: 'boolean', label: l('Connector lines', 'Líneas de conexión') },
    { key: 'indentSize', kind: 'number', label: l('Indent per level (px)', 'Sangría por nivel (px)'), min: 8, max: 48, step: 4 },
    { key: 'dragDrop', kind: 'boolean', label: l('Drag & drop to reorder', 'Arrastrar y soltar para reordenar') },
    { key: 'expandAll', kind: 'boolean', label: l('Start fully expanded', 'Empezar todo expandido') },
  ],
  code: (s) => treeCode(s),
});
