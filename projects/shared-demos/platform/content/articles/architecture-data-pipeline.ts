import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Both data components turn a raw array into what you see by running the same kind of steps: filter, search, sort, then cut out what is visible. This page explains where those steps live (`grid-core`), how hk-table and hk-datagrid use them differently, and how the DataGrid’s serializable state works.',
      es: 'Los dos componentes de datos convierten un arreglo crudo en lo que ves con el mismo tipo de pasos: filtrar, buscar, ordenar y luego recortar lo visible. Esta página explica dónde viven esos pasos (`grid-core`), cómo los usan de forma distinta hk-table y hk-datagrid, y cómo funciona el estado serializable del DataGrid.',
    },
  ],
  sections: [
    {
      id: 'grid-core',
      heading: { en: 'What grid-core contains', es: 'Qué contiene grid-core' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`src/lib/grid-core/` is render-agnostic: no templates, no components, and an ESLint rule that forbids importing from `components/`. It holds:',
            es: '`src/lib/grid-core/` es independiente del renderizado: sin plantillas, sin componentes y con una regla de ESLint que prohíbe importar de `components/`. Contiene:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Module', es: 'Módulo' },
            { en: 'Role', es: 'Función' },
          ],
          rows: [
            [
              { en: '`grid.types.ts`', es: '`grid.types.ts`' },
              {
                en: 'Shared types: `FilterOperator`, `ColumnFilter`, `PaginationOptions`, `GlobalSearchConfig`, …',
                es: 'Tipos compartidos: `FilterOperator`, `ColumnFilter`, `PaginationOptions`, `GlobalSearchConfig`, …',
              },
            ],
            [
              { en: '`grid-predicates.ts`', es: '`grid-predicates.ts`' },
              {
                en: '`matchesFilter` and `compareValues`: the single definition of what each operator and sort direction mean. Both components use them.',
                es: '`matchesFilter` y `compareValues`: la única definición de lo que significa cada operador y dirección de orden. Ambos componentes los usan.',
              },
            ],
            [
              { en: '`grid-aggregates.ts`', es: '`grid-aggregates.ts`' },
              { en: 'Footer and group aggregates (`computeAggregate`).', es: 'Agregados de pie y de grupo (`computeAggregate`).' },
            ],
            [
              { en: '`grid.helpers.ts`', es: '`grid.helpers.ts`' },
              {
                en: 'CSV / JSON export (`exportToCsv`, `exportToJson`), footer and group resolution, grouping, and the tree helpers (row keys, hierarchy-aware filter, sort and flatten).',
                es: 'Exportación CSV / JSON (`exportToCsv`, `exportToJson`), resolución de pies y grupos, agrupación y los helpers de árbol (claves de fila, filtrado, orden y aplanado con jerarquía).',
              },
            ],
            [
              { en: '`controllers/`', es: '`controllers/`' },
              {
                en: 'Plain classes holding signal state for sort, filter, global search, pagination, selection, grouping, tree, footer and column UI. A host creates them with `new XController(deps)` and passes its own signals in.',
                es: 'Clases simples con estado en signals para orden, filtro, búsqueda global, paginación, selección, agrupación, árbol, pie y UI de columnas. Un host las crea con `new XController(deps)` y les pasa sus propios signals.',
              },
            ],
            [
              { en: '`engine/`', es: '`engine/`' },
              {
                en: 'The bridge to the Rust table engine: `TableEngineService`, `TableHandle`, and pure routing helpers that decide whether an operation can run in WASM.',
                es: 'El puente al motor de tablas en Rust: `TableEngineService`, `TableHandle` y helpers de enrutamiento puros que deciden si una operación puede ejecutarse en WASM.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'table-pipeline',
      heading: { en: 'hk-table: an index-based pipeline', es: 'hk-table: un pipeline basado en índices' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each step is a `computed()` that passes an `IndexedView` (the source array plus an optional list of row indices) to the next. Rows are only copied into a new array at the page-slice boundary, so at 100k rows a filter or sort moves numbers, not objects.',
            es: 'Cada paso es un `computed()` que le pasa al siguiente un `IndexedView` (el arreglo original más una lista opcional de índices de fila). Las filas solo se copian a un arreglo nuevo en el límite del recorte de página, así que con 100k filas un filtro u orden mueve números, no objetos.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'data input', es: 'Input data' },
              detail: {
                en: 'When it changes, the rows are also ingested into the WASM engine if every column type is known.',
                es: 'Cuando cambia, las filas también se cargan en el motor WASM si se conoce el tipo de cada columna.',
              },
            },
            {
              label: { en: 'Column filters', es: 'Filtros por columna' },
              detail: {
                en: 'Skipped in cursor mode; hierarchy-aware for tree tables; WASM when every active filter translates exactly; otherwise `matchesFilter` in TypeScript.',
                es: 'Se omite en modo cursor; respeta la jerarquía en tablas en árbol; WASM cuando todos los filtros activos se traducen exactamente; si no, `matchesFilter` en TypeScript.',
              },
            },
            {
              label: { en: 'Global search', es: 'Búsqueda global' },
              detail: {
                en: '`GlobalSearchController`: contains / startsWith / exact, or Fuse.js in fuzzy mode.',
                es: '`GlobalSearchController`: contains / startsWith / exact, o Fuse.js en modo fuzzy.',
              },
            },
            {
              label: { en: 'Sort (one column)', es: 'Orden (una columna)' },
              detail: {
                en: 'WASM sort kernel on indices, or `compareValues` in TypeScript; tree tables sort within each level.',
                es: 'Kernel de ordenación en WASM sobre índices, o `compareValues` en TypeScript; las tablas en árbol ordenan dentro de cada nivel.',
              },
            },
            {
              label: { en: 'Tree flatten / grouping', es: 'Aplanar árbol / agrupar' },
              detail: {
                en: '`TreeController` and `GroupController` shape the rows for display.',
                es: '`TreeController` y `GroupController` dan forma a las filas para mostrarlas.',
              },
            },
            {
              label: { en: 'Page slice', es: 'Recorte de página' },
              detail: {
                en: 'Client offset: slice `[pageIndex × pageSize, +pageSize)`. Server paging and virtual scroll: pass the view through.',
                es: 'Offset en cliente: recorta `[pageIndex × pageSize, +pageSize)`. Paginación en servidor y desplazamiento virtual: la vista pasa completa.',
              },
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'hk-table renders three parallel layouts (virtual scroll, grouped, and the standard CDK table, which also renders tree tables). A change to row markup has to be made in all three.',
            es: 'hk-table renderiza tres diseños paralelos (desplazamiento virtual, agrupado y la tabla estándar del CDK, que también renderiza las tablas en árbol). Un cambio en el markup de las filas tiene que hacerse en los tres.',
          },
        },
      ],
    },
    {
      id: 'datagrid-pipeline',
      heading: { en: 'hk-datagrid: one state, one pure function', es: 'hk-datagrid: un estado, una función pura' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '[createDataGrid](/api/createDataGrid) owns a single `state` signal. Every UI action, saved view or AI reply becomes a state change, and the view is derived from it.',
            es: '[createDataGrid](/api/createDataGrid) administra un solo signal `state`. Cada acción de la interfaz, vista guardada o respuesta de IA se convierte en un cambio de estado, y la vista se deriva de él.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Input', es: 'Entrada' },
              detail: {
                en: 'Click, keyboard, `setState(patch)`, `initialState`, or `ask()`.',
                es: 'Clic, teclado, `setState(patch)`, `initialState` o `ask()`.',
              },
            },
            {
              label: { en: 'normalizeStatePatch', es: 'normalizeStatePatch' },
              detail: {
                en: 'Accepts `unknown`, coerces values to column types, drops invalid parts and returns them as `issues`. Changing sort, filters or search resets the page to 0.',
                es: 'Acepta `unknown`, convierte valores al tipo de la columna, descarta las partes inválidas y las devuelve como `issues`. Cambiar orden, filtros o búsqueda vuelve a la página 0.',
              },
            },
            {
              label: { en: 'state signal', es: 'signal state' },
              detail: { en: '`onStateChange` fires after every commit.', es: '`onStateChange` se dispara después de cada cambio.' },
            },
            {
              label: { en: 'Client: applyClientView', es: 'Cliente: applyClientView' },
              detail: {
                en: 'Filters (AND, via `matchesFilter`) → quick search over visible searchable columns → multi-key stable sort (via `compareValues`) → page slice.',
                es: 'Filtros (AND, con `matchesFilter`) → búsqueda rápida en columnas visibles y buscables → orden estable por varias claves (con `compareValues`) → recorte de página.',
              },
            },
            {
              label: { en: 'Server: request', es: 'Servidor: petición' },
              detail: {
                en: '`{ sort, filters, search, page }` compared by value; the component’s effect calls `dataSource` and aborts the previous call.',
                es: '`{ sort, filters, search, page }` comparado por valor; un `effect` del componente llama a `dataSource` y cancela la llamada anterior.',
              },
            },
            {
              label: { en: 'Render', es: 'Renderizado' },
              detail: {
                en: 'Row and column ranges from scroll position, fixed row height and column offsets.',
                es: 'Rangos de filas y columnas según la posición de desplazamiento, la altura fija de fila y los offsets de columna.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Unlike hk-table, the DataGrid client pipeline is plain TypeScript; it does not use the WASM engine.',
            es: 'A diferencia de hk-table, el pipeline de cliente del DataGrid es TypeScript puro; no usa el motor WASM.',
          },
        },
      ],
    },
    {
      id: 'state-model',
      heading: { en: 'The DataGrid state model', es: 'El modelo de estado del DataGrid' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          code: `interface DataGridState {
  sort: { field: string; direction: 'asc' | 'desc' }[]; // priority order
  filters: { field: string; operator: FilterOperator; value?: unknown }[]; // AND
  search: string;
  page: { index: number; size: number } | null; // null = not paginated
  columns: { field: string; visible: boolean; width: number }[]; // order = array order
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '`getState()` returns plain JSON: store it as a saved view, put it in a URL, or send it to a server.',
              es: '`getState()` devuelve JSON simple: guárdalo como vista, ponlo en una URL o envíalo a un servidor.',
            },
            {
              en: '`setState(patch)` takes a [DataGridStatePatch](/api/DataGridStatePatch) and returns [DataGridStateIssue](/api/DataGridStateIssue)`[]`. It never throws; page size is capped at 1000.',
              es: '`setState(patch)` recibe un [DataGridStatePatch](/api/DataGridStatePatch) y devuelve [DataGridStateIssue](/api/DataGridStateIssue)`[]`. Nunca lanza errores; el tamaño de página tiene un tope de 1000.',
            },
            {
              en: '`stateSchema()` returns a JSON Schema (2020-12) of a valid state for this grid’s columns, including each column’s `description` and allowed operators.',
              es: '`stateSchema()` devuelve un JSON Schema (2020-12) de un estado válido para las columnas de este grid, incluyendo la `description` de cada columna y los operadores permitidos.',
            },
            {
              en: 'Selection is not part of the state: it is data, not view. It lives in its own signals keyed by `rowKey` (default `row.id`, else the row object).',
              es: 'La selección no es parte del estado: es dato, no vista. Vive en sus propios signals, con `rowKey` como clave (por defecto `row.id` o, si no hay, el propio objeto).',
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The AI layer reuses this contract. `ask(query)` sends Claude the column catalog, the valid operators, the current view and a flat reply schema for structured outputs (kept simpler than `stateSchema()` so it fits within structured-output limits), then applies the reply with `setState`. Invalid parts come back in the result’s `issues`, and `undoAsk()` restores the previous state while the answer is still on screen.',
            es: 'La capa de IA reutiliza este contrato. `ask(query)` le envía a Claude el catálogo de columnas, los operadores válidos, la vista actual y un esquema de respuesta plano para salidas estructuradas (más simple que `stateSchema()` para no exceder los límites de las salidas estructuradas), y aplica la respuesta con `setState`. Las partes inválidas vuelven en los `issues` del resultado, y `undoAsk()` restaura el estado anterior mientras la respuesta siga en pantalla.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'datagrid', note: { en: 'The component and its controller.', es: 'El componente y su controlador.' } },
    { id: 'guide-server-side-data', note: { en: 'The server request in practice.', es: 'La petición al servidor en la práctica.' } },
    { id: 'wasm-engines', note: { en: 'The table engine hk-table routes to.', es: 'El motor de tablas al que enruta hk-table.' } },
  ],
};

export default content;
