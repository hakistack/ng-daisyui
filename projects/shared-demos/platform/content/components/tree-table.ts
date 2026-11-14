import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'A Tree Table is a regular table where some rows contain other rows: a department with its teams, a folder with its files, a product with its parts. Each parent row has a small arrow to show or hide its children, and the children are indented under it.',
      es: 'Una tabla en árbol es una tabla normal donde algunas filas contienen otras filas: un departamento con sus equipos, una carpeta con sus archivos, un producto con sus piezas. Cada fila padre tiene una flecha para mostrar u ocultar sus hijos, y los hijos aparecen con sangría debajo.',
    },
    {
      en: 'It is not a separate component. It is [Table](/table) (`<hk-table>`) with `treeTable: { enabled: true }` in `createTable()`. Your data stays nested — each row keeps its children in a property, `children` by default — and you keep columns, formatting, search, filters, selection and paging from the normal table.',
      es: 'No es un componente aparte. Es [Table](/table) (`<hk-table>`) con `treeTable: { enabled: true }` en `createTable()`. Tus datos siguen anidados (cada fila guarda sus hijos en una propiedad, `children` por defecto) y conservas las columnas, el formato, la búsqueda, los filtros, la selección y la paginación de la tabla normal.',
    },
  ],
  whenToUse: [
    {
      en: 'Hierarchical records that also need columns: org charts with budgets, bills of materials with quantities, file listings with size and date.',
      es: 'Registros jerárquicos que además necesitan columnas: organigramas con presupuestos, listas de materiales con cantidades, listados de archivos con tamaño y fecha.',
    },
    {
      en: 'Searching inside the hierarchy while keeping context: matches stay visible together with their parents.',
      es: 'Buscar dentro de la jerarquía sin perder el contexto: las coincidencias se ven junto con sus padres.',
    },
    {
      en: 'Checkbox selection where picking a parent should pick its children, or the parent should follow its children (`checkboxCascade`).',
      es: 'Selección con casillas donde marcar un padre debe marcar sus hijos, o el padre debe seguir a sus hijos (`checkboxCascade`).',
    },
  ],
  whenNotToUse: [
    {
      en: 'Each node is just a label with an icon (file browser, category picker), or you need drag-and-drop between levels or lazy-loaded children: use the [Tree](/tree).',
      es: 'Cada nodo es solo una etiqueta con icono (explorador de archivos, selector de categorías), o necesitas arrastrar y soltar entre niveles o cargar hijos bajo demanda: usa el [Árbol](/tree).',
    },
    {
      en: 'Flat rows that you only want to cluster by a field (country, status): use `grouping` in the regular [Table](/table).',
      es: 'Filas planas que solo quieres agrupar por un campo (país, estado): usa `grouping` en la [Tabla](/table) normal.',
    },
    {
      en: 'Very large flat datasets: the [DataGrid](/datagrid) is faster, but it has no hierarchy.',
      es: 'Conjuntos planos muy grandes: el [DataGrid](/datagrid) es más rápido, pero no tiene jerarquía.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createTable, TableComponent } from '@hakistack/ng-daisyui';

interface Department {
  id: string;
  name: string;
  head: string;
  employees: number;
  children?: Department[];
}

@Component({
  selector: 'app-departments',
  imports: [TableComponent],
  template: \`<hk-table [data]="departments()" [config]="table" />\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentsComponent {
  readonly departments = signal<Department[]>([
    {
      id: 'eng',
      name: 'Engineering',
      head: 'Ana Rivera',
      employees: 42,
      children: [
        { id: 'eng-web', name: 'Web', head: 'Luis Ortiz', employees: 18 },
        { id: 'eng-data', name: 'Data', head: 'Marta Colón', employees: 9 },
      ],
    },
    { id: 'sales', name: 'Sales', head: 'José Torres', employees: 25 },
  ]);

  // Field initializer: createTable() calls inject() internally.
  readonly table = createTable<Department>({
    columns: {
      name: { header: 'Department' },
      head: { header: 'Head' },
      employees: { header: 'Employees' },
    },
    globalSearch: { enabled: true, placeholder: 'Search departments...' },
    treeTable: {
      enabled: true,
      getRowKey: (row) => row.id,
      initialExpandLevel: 1,
    },
  });
}
`,
    note: {
      en: 'The toggle appears in the first column by default (`treeColumnIndex: 0`). Rows without a `children` array are leaves.',
      es: 'La flecha aparece en la primera columna por defecto (`treeColumnIndex: 0`). Las filas sin arreglo `children` son hojas.',
    },
  },
  technical: [
    {
      id: 'pipeline',
      heading: { en: 'How the hierarchy is processed', es: 'Cómo se procesa la jerarquía' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Tree mode uses the same pipeline as the table, but each step understands nesting. At the end, the visible tree is flattened into a list of [FlattenedRow](/api/FlattenedRow) items (row, level, key, parent key, last-child flags) and that list is what gets paged or virtual-scrolled.',
            es: 'El modo árbol usa el mismo pipeline de la tabla, pero cada paso entiende el anidamiento. Al final, el árbol visible se aplana en una lista de [FlattenedRow](/api/FlattenedRow) (fila, nivel, clave, clave del padre, marcas de último hijo) y esa lista es la que se pagina o se muestra con desplazamiento virtual.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Hierarchy-aware filter', es: 'Filtro con jerarquía' },
              detail: { en: 'Column filters, applied per `filterHierarchyMode`.', es: 'Filtros de columna, según `filterHierarchyMode`.' },
            },
            {
              label: { en: 'Hierarchy-aware search', es: 'Búsqueda con jerarquía' },
              detail: { en: 'Same rules as the filter.', es: 'Las mismas reglas que el filtro.' },
            },
            {
              label: { en: 'Sort siblings', es: 'Ordenar hermanos' },
              detail: {
                en: 'Each level is sorted on its own; children never leave their parent.',
                es: 'Cada nivel se ordena por separado; los hijos nunca se separan de su padre.',
              },
            },
            {
              label: { en: 'Flatten expanded rows', es: 'Aplanar filas expandidas' },
              detail: { en: 'Only children of expanded rows are included.', es: 'Solo se incluyen los hijos de las filas expandidas.' },
            },
            {
              label: { en: 'Page or virtual scroll', es: 'Paginación o desplazamiento virtual' },
              detail: { en: 'Pages count visible rows, not root rows.', es: 'Las páginas cuentan filas visibles, no filas raíz.' },
            },
          ],
        },
        {
          kind: 'table',
          head: [
            { en: '`filterHierarchyMode`', es: '`filterHierarchyMode`' },
            { en: 'What stays visible', es: 'Qué queda visible' },
          ],
          rows: [
            [
              { en: '`ancestors` (default)', es: '`ancestors` (por defecto)' },
              {
                en: 'Matching rows plus the path of parents above them.',
                es: 'Las filas que coinciden más la cadena de padres sobre ellas.',
              },
            ],
            [
              { en: '`descendants`', es: '`descendants`' },
              {
                en: 'A matching row is kept with all its children; parents of deeper matches are kept too.',
                es: 'Una fila que coincide se conserva con todos sus hijos; también se conservan los padres de coincidencias más profundas.',
              },
            ],
            [
              { en: '`both`', es: '`both`' },
              { en: 'Same result as `descendants` in the current code.', es: 'El mismo resultado que `descendants` en el código actual.' },
            ],
            [
              { en: '`none`', es: '`none`' },
              {
                en: 'Only top-level rows are tested; children are not searched.',
                es: 'Solo se evalúan las filas de primer nivel; no se busca en los hijos.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'While a filter or search is active (and the mode is not `none`), the table expands the ancestors of every match so results are not hidden inside collapsed rows. The WASM table engine is not used in tree mode; the hierarchy steps run in TypeScript.',
            es: 'Mientras hay un filtro o una búsqueda activa (y el modo no es `none`), la tabla expande los ancestros de cada coincidencia para que los resultados no queden escondidos en filas cerradas. El motor WASM de tablas no se usa en modo árbol; los pasos de jerarquía se ejecutan en TypeScript.',
          },
        },
      ],
    },
    {
      id: 'state',
      heading: { en: 'Keys, expansion and selection', es: 'Claves, expansión y selección' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Expansion is a set of row keys. A key comes from `getRowKey(row)`, else `row.key` (a [TreeNode](/api/TreeNode) key), else `row.id`, else the row position among its siblings. Position-based keys change when sorting or filtering reorders rows, so give your rows a stable `id` or pass `getRowKey`.',
            es: 'La expansión es un conjunto de claves de fila. La clave sale de `getRowKey(row)`, si no de `row.key` (la clave de un [TreeNode](/api/TreeNode)), si no de `row.id`, y si no de la posición de la fila entre sus hermanos. Las claves por posición cambian cuando ordenar o filtrar reordena las filas, así que dale a tus filas un `id` estable o pasa `getRowKey`.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `treeTable: {
  enabled: true,
  childrenProperty: 'items',      // default: 'children'
  initialExpandedKeys: ['eng'],   // or expandAll: true, or initialExpandLevel: 1
  indentSize: 20,                 // px per level, default 24
  showIndentGuides: false,        // vertical guide lines, default true
  checkboxCascade: 'both',        // 'none' | 'downward' | 'upward' | 'both'
},

// From code, through the same controller:
table.expandAllRows();
table.collapseAllRows();
table.expandToLevel(2);`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '`checkboxCascade` (with `hasSelection: true`): `downward` ticks all descendants; `upward` ticks the parent once all its children are ticked; `both` does both. Parents with some ticked children show an indeterminate checkbox.',
              es: '`checkboxCascade` (con `hasSelection: true`): `downward` marca todos los descendientes; `upward` marca al padre cuando todos sus hijos están marcados; `both` hace ambas cosas. Los padres con algunos hijos marcados muestran una casilla indeterminada.',
            },
            {
              en: '`(expansionChange)` emits `{ row, expanded }` each time a row is opened or closed.',
              es: '`(expansionChange)` emite `{ row, expanded }` cada vez que se abre o se cierra una fila.',
            },
            {
              en: 'The full [TreeTableConfig](/api/TreeTableConfig) is normalized by `createTable()`, so omitted options get their defaults.',
              es: 'El [TreeTableConfig](/api/TreeTableConfig) completo lo normaliza `createTable()`, así que las opciones que omites reciben su valor por defecto.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab',
        action: { en: 'Reach each expand/collapse button and header', es: 'Recorre los botones de expandir/contraer y los encabezados' },
      },
      { keys: 'Enter / Space (toggle)', action: { en: 'Expand or collapse the row', es: 'Expande o contrae la fila' } },
      { keys: 'Enter / Space (header)', action: { en: 'Sort siblings by that column', es: 'Ordena los hermanos por esa columna' } },
      {
        keys: 'Arrow keys, Home, End',
        action: {
          en: 'Move the active cell when `enableKeyboardNavigation` is on (same as Table)',
          es: 'Mueven la celda activa cuando `enableKeyboardNavigation` está activo (igual que en Table)',
        },
      },
    ],
    notes: [
      {
        en: 'Each toggle is a real `<button>` with `aria-expanded` and an `aria-label` from `labels.expandRowAriaLabel` / `labels.collapseRowAriaLabel` — translate those for your locale.',
        es: 'Cada flecha es un `<button>` real con `aria-expanded` y un `aria-label` que sale de `labels.expandRowAriaLabel` / `labels.collapseRowAriaLabel`; tradúcelos a tu idioma.',
      },
      {
        en: 'Rows do not expose `aria-level` or a `treegrid` role; depth is shown visually with indentation. If the level matters to the reader, include it in the cell content (for example "Web, team of Engineering").',
        es: 'Las filas no exponen `aria-level` ni el rol `treegrid`; la profundidad se muestra con sangría. Si el nivel le importa a quien lee, inclúyelo en el contenido de la celda (por ejemplo "Web, equipo de Ingeniería").',
      },
      {
        en: 'The rest of the table semantics (sort headers, selection checkboxes, live regions) are the same as [Table](/table).',
        es: 'El resto de la semántica (encabezados ordenables, casillas de selección, regiones vivas) es igual que en [Table](/table).',
      },
    ],
  },
  performance: [
    {
      en: 'Topology (level, parent, has-children, last-child) is computed in one pass whenever data or expansion changes, so per-row lookups in the template are constant time.',
      es: 'La topología (nivel, padre, si tiene hijos, último hijo) se calcula en una sola pasada cada vez que cambian los datos o la expansión, así que las consultas por fila en la plantilla son de tiempo constante.',
    },
    {
      en: 'Collapsed subtrees are not rendered. For big trees, combine `pagination` or `virtualScroll` with `initialExpandLevel` instead of `expandAll`. The "Large dataset" example renders 6,600 rows this way.',
      es: 'Los subárboles cerrados no se renderizan. Para árboles grandes, combina `pagination` o `virtualScroll` con `initialExpandLevel` en lugar de `expandAll`. El ejemplo "Conjunto grande" muestra 6,600 filas así.',
    },
    {
      en: 'Sorting copies parent rows to attach their sorted children; your source objects are not modified.',
      es: 'Al ordenar se copian las filas padre para asignarles sus hijos ordenados; tus objetos originales no se modifican.',
    },
  ],
  related: [
    {
      id: 'table',
      note: {
        en: 'The component behind the Tree Table, with every other option.',
        es: 'El componente detrás de la tabla en árbol, con todas las demás opciones.',
      },
    },
    {
      id: 'tree',
      note: {
        en: 'Label-only hierarchy with drag-and-drop, lazy loading and a WASM-backed filter.',
        es: 'Jerarquía de solo etiquetas con arrastrar y soltar, carga diferida y filtrado con WASM.',
      },
    },
    { id: 'datagrid', note: { en: 'Flat data at large scale; no child rows.', es: 'Datos planos a gran escala; sin filas hijas.' } },
  ],
};

export default content;
