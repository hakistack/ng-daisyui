import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'The Table shows your data in rows and columns and gives you the usual tools out of the box: sort by clicking a header, filter columns, search everything at once, page through results, select rows and run actions on them.',
      es: 'La Tabla muestra tus datos en filas y columnas y trae las herramientas de siempre listas para usar: ordenar haciendo clic en un encabezado, filtrar columnas, buscar en todo a la vez, pasar de página, seleccionar filas y ejecutar acciones sobre ellas.',
    },
    {
      en: "You describe the table once with `createTable()` — which columns, how to format them, which features to turn on — and pass the rows separately with `[data]`. The same object is also a controller: call `table.clearAllFilters()`, `table.nextPage()` or `table.sort('name')` from anywhere, without a `viewChild`.",
      es: "Describes la tabla una sola vez con `createTable()` (qué columnas, cómo formatearlas, qué funcionalidades activar) y pasas las filas aparte con `[data]`. Ese mismo objeto es también un controlador: llama a `table.clearAllFilters()`, `table.nextPage()` o `table.sort('name')` desde cualquier parte, sin `viewChild`.",
    },
    {
      en: 'It is the right choice for most business screens. For very large data, multi-column sort or a serializable view state, use the [DataGrid](/datagrid), which is where new grid features are added.',
      es: 'Es la opción correcta para la mayoría de las pantallas de negocio. Para datos muy grandes, orden por varias columnas o un estado de vista serializable, usa el [DataGrid](/datagrid), que es donde se añaden las funcionalidades nuevas de grid.',
    },
  ],
  whenToUse: [
    {
      en: 'CRUD screens: row actions, bulk actions, selection with limits, inline cell editing with validation.',
      es: 'Pantallas CRUD: acciones por fila, acciones masivas, selección con límite, edición de celdas en línea con validación.',
    },
    {
      en: 'Reports that need footer totals, grouping with group subtotals, CSV/JSON export, or master-detail and nested child grids.',
      es: 'Reportes que necesitan totales en el pie, agrupación con subtotales, exportar a CSV/JSON, o maestro-detalle y grids hijos anidados.',
    },
    {
      en: 'Datasets that fit in the browser, or server-side pages driven by `(pageChange)` / `(cursorChange)`.',
      es: 'Datos que caben en el navegador, o páginas del servidor manejadas con `(pageChange)` / `(cursorChange)`.',
    },
    {
      en: 'Rows with children: turn on `treeTable` (see [Tree Table](/tree-table)).',
      es: 'Filas con hijos: activa `treeTable` (consulta [Tabla en árbol](/tree-table)).',
    },
  ],
  whenNotToUse: [
    {
      en: 'Hundreds of thousands of rows with many columns, sorting by several columns at once, saved views as JSON or natural-language queries: use the [DataGrid](/datagrid).',
      es: 'Cientos de miles de filas con muchas columnas, ordenar por varias columnas a la vez, vistas guardadas como JSON o consultas en lenguaje natural: usa el [DataGrid](/datagrid).',
    },
    {
      en: 'A long list of cards or items without columns: use the [Virtual Scroller](/virtual-scroller).',
      es: 'Una lista larga de tarjetas o elementos sin columnas: usa el [Virtual Scroller](/virtual-scroller).',
    },
    {
      en: 'Navigating a hierarchy where each node is just a label (file browser, categories): use the [Tree](/tree).',
      es: 'Navegar una jerarquía donde cada nodo es solo una etiqueta (explorador de archivos, categorías): usa el [Árbol](/tree).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createTable, TableComponent } from '@hakistack/ng-daisyui';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  salary: number;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

@Component({
  selector: 'app-users-table',
  imports: [TableComponent],
  template: \`<hk-table [data]="users()" [config]="table" />\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent {
  readonly users = signal<User[]>([
    { id: 1, name: 'Ana Rivera', email: 'ana@example.com', role: 'admin', salary: 98000 },
    { id: 2, name: 'Luis Ortiz', email: 'luis@example.com', role: 'editor', salary: 72000 },
    { id: 3, name: 'Marta Colón', email: 'marta@example.com', role: 'viewer', salary: 54000 },
  ]);

  // Field initializer: createTable() calls inject() internally.
  readonly table = createTable<User>({
    columns: {
      name: { header: 'Name' },
      email: { header: 'Email' },
      role: { header: 'Role' },
      salary: { header: 'Salary', format: (value) => usd.format(value) },
    },
    globalSearch: { enabled: true, placeholder: 'Search users...' },
    pagination: { mode: 'offset', pageSize: 10 },
  });
}
`,
    note: {
      en: '`createTable()` needs an injection context. Call it in a field initializer or the constructor, not inside `computed()` or `effect()` (that throws NG0203); if you must, wrap it in `runInInjectionContext()`.',
      es: '`createTable()` necesita un contexto de inyección. Llámalo en un inicializador de campo o en el constructor, no dentro de `computed()` ni `effect()` (eso lanza NG0203); si no tienes alternativa, envuélvelo en `runInInjectionContext()`.',
    },
  },
  technical: [
    {
      id: 'pipeline',
      heading: { en: 'Data pipeline', es: 'Pipeline de datos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The table turns `[data]` into what you see through a chain of signals. Between stages it passes index arrays instead of copied rows, and only the rows of the current page are materialized. Header sorting is single-column and cycles ascending → descending → off.',
            es: 'La tabla convierte `[data]` en lo que ves mediante una cadena de signals. Entre etapas pasa arreglos de índices en lugar de copiar filas, y solo se materializan las filas de la página actual. El orden por encabezado es de una sola columna y alterna entre ascendente → descendente → sin orden.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Column filters', es: 'Filtros de columna' },
              detail: { en: 'All active filters must match.', es: 'Deben cumplirse todos los filtros activos.' },
            },
            {
              label: { en: 'Global search', es: 'Búsqueda global' },
              detail: {
                en: '`contains`, `startsWith`, `exact` or `fuzzy` (Fuse.js); debounced 300 ms by default.',
                es: '`contains`, `startsWith`, `exact` o `fuzzy` (Fuse.js); debounce de 300 ms por defecto.',
              },
            },
            { label: { en: 'Sort', es: 'Orden' }, detail: { en: 'One field at a time.', es: 'Un campo a la vez.' } },
            {
              label: { en: 'Tree flatten or grouping', es: 'Aplanado de árbol o agrupación' },
              detail: { en: 'Only when `treeTable` or `grouping` is configured.', es: 'Solo si configuras `treeTable` o `grouping`.' },
            },
            {
              label: { en: 'Page slice', es: 'Corte de página' },
              detail: {
                en: 'Client offset pages are sliced here; virtual scroll and server pages render `data` as is.',
                es: 'Las páginas offset del cliente se cortan aquí; el desplazamiento virtual y las páginas del servidor muestran `data` tal cual.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: "With `pagination: { mode: 'cursor' }` the table skips client-side filtering and search: it emits `filterChange`, `globalSearchChange`, `sortChange` and `cursorChange`, and you fetch the page. With `mode: 'offset', serverSide: true`, pass only the current page and push `totalItems` with `table.setPagination({ totalItems })`. In server-side mode, selection and footer aggregates only cover the current page.",
            es: "Con `pagination: { mode: 'cursor' }` la tabla no filtra ni busca en el cliente: emite `filterChange`, `globalSearchChange`, `sortChange` y `cursorChange`, y tú traes la página. Con `mode: 'offset', serverSide: true`, pasa solo la página actual y envía `totalItems` con `table.setPagination({ totalItems })`. En modo servidor, la selección y los totales del pie solo cubren la página actual.",
          },
        },
      ],
    },
    {
      id: 'wasm-engine',
      heading: { en: 'WASM table engine', es: 'Motor WASM de tablas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When `[data]` gets a new array, the table tries to load it into the Rust/WASM engine through [TableEngineService](/api/TableEngineService). If that works, filters, `contains`/`startsWith`/`exact` search, sort, grouping and footer aggregates run in WASM and return indices. If anything is not supported, that step runs the TypeScript version instead — the results are the same.',
            es: 'Cuando `[data]` recibe un arreglo nuevo, la tabla intenta cargarlo en el motor Rust/WASM mediante [TableEngineService](/api/TableEngineService). Si funciona, los filtros, la búsqueda `contains`/`startsWith`/`exact`, el orden, la agrupación y los totales del pie se ejecutan en WASM y devuelven índices. Si algo no está soportado, ese paso usa la versión en TypeScript; el resultado es el mismo.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The engine sits out in cursor mode, in tree mode, for empty data, and when any column type cannot be determined. Types come from `filter.type` or from the first 64 rows (string, number, boolean or `Date`); objects or mixed types send the whole dataset to TypeScript.',
              es: 'El motor no participa en modo cursor, en modo árbol, con datos vacíos, ni cuando no se puede determinar el tipo de alguna columna. Los tipos salen de `filter.type` o de las primeras 64 filas (string, number, boolean o `Date`); si hay objetos o tipos mezclados, todo el conjunto de datos se procesa en TypeScript.',
            },
            {
              en: 'Fuzzy search and `customSearch` always run in TypeScript.',
              es: 'La búsqueda `fuzzy` y `customSearch` siempre se ejecutan en TypeScript.',
            },
            {
              en: 'The binary is inlined in a lazy chunk and only downloaded when a table first ingests data. To serve it as a separate cacheable file, use [provideTableEngineWasmUrl](/api/provideTableEngineWasmUrl). Details in [WASM engines](/systems/wasm-engines).',
              es: 'El binario va incrustado en un chunk diferido y solo se descarga cuando una tabla carga datos por primera vez. Para servirlo como archivo aparte y cacheable, usa [provideTableEngineWasmUrl](/api/provideTableEngineWasmUrl). Detalles en [Motores WASM](/systems/wasm-engines).',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Replace the array instead of mutating it (`users.set([...rows, newRow])`). The engine keeps the rows it ingested; an in-place change is not seen until a new array reference arrives.',
            es: 'Reemplaza el arreglo en lugar de mutarlo (`users.set([...rows, newRow])`). El motor guarda las filas que cargó; un cambio en el mismo arreglo no se ve hasta que llega una referencia nueva.',
          },
        },
      ],
    },
    {
      id: 'extensibility',
      heading: { en: 'Cells, formatters and text', es: 'Celdas, formateadores y textos' },
      blocks: [
        {
          kind: 'code',
          lang: 'html',
          code: `<hk-table [data]="users()" [config]="table">
  <ng-template hkCellTemplate="email" let-row>
    <a class="link link-primary" [href]="'mailto:' + row.email">{{ row.email }}</a>
  </ng-template>
</hk-table>`,
        },
        {
          kind: 'list',
          items: [
            {
              en: "`format` can be a function `(value, row) => string | Observable<string>` (the value is typed per column) or a pipe tuple such as `['currency', 'USD']` or `['date', 'short']`, resolved by the PipeRegistry. Pipe tuples need [providePipes](/api/providePipes) in your app config; see [Formatters](/systems/formatters).",
              es: "`format` puede ser una función `(value, row) => string | Observable<string>` (el valor tiene el tipo de la columna) o una tupla de pipe como `['currency', 'USD']` o `['date', 'short']`, resuelta por el PipeRegistry. Las tuplas de pipe necesitan [providePipes](/api/providePipes) en la configuración de tu app; consulta [Formateadores](/systems/formatters).",
            },
            {
              en: 'A formatter that returns HTML is rendered after Angular sanitization. For anything interactive, use a [HkCellTemplateDirective](/api/HkCellTemplateDirective) template instead.',
              es: 'Un formateador que devuelve HTML se muestra después de pasar por la sanitización de Angular. Para cualquier cosa interactiva, usa una plantilla [HkCellTemplateDirective](/api/HkCellTemplateDirective).',
            },
            {
              en: 'All built-in text is configurable: `labels` (table), `filterLabels`, `globalSearch.labels`, `columnVisibility.labels` and `pagination` labels.',
              es: 'Todos los textos integrados se pueden configurar: `labels` (tabla), `filterLabels`, `globalSearch.labels`, `columnVisibility.labels` y las etiquetas de `pagination`.',
            },
            {
              en: '`exportToCsv` and `exportToJson` are exported for your own export buttons; `columnVisibility.storageKey` persists hidden columns in `localStorage`.',
              es: '`exportToCsv` y `exportToJson` se exportan para tus propios botones de exportar; `columnVisibility.storageKey` guarda las columnas ocultas en `localStorage`.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      { keys: 'Tab', action: { en: 'Reach each sortable header', es: 'Llega a cada encabezado ordenable' } },
      {
        keys: 'Enter / Space (header)',
        action: { en: 'Sort: ascending, descending, off', es: 'Ordena: ascendente, descendente, sin orden' },
      },
      {
        keys: 'Arrow keys',
        action: {
          en: 'Move the active cell (needs `enableKeyboardNavigation`)',
          es: 'Mueven la celda activa (requiere `enableKeyboardNavigation`)',
        },
      },
      {
        keys: 'Home / End',
        action: {
          en: 'First or last cell of the row; with Ctrl, also first or last row',
          es: 'Primera o última celda de la fila; con Ctrl, también primera o última fila',
        },
      },
      {
        keys: 'Enter (cell)',
        action: {
          en: 'Start editing an editable cell, or toggle the detail row on the expand column',
          es: 'Empieza a editar una celda editable, o abre/cierra el detalle en la columna de expandir',
        },
      },
      {
        keys: 'Space (cell)',
        action: { en: 'Toggle row selection when selection is on', es: 'Marca o desmarca la fila cuando hay selección' },
      },
      { keys: 'Escape', action: { en: 'Clear the active cell', es: 'Quita la celda activa' } },
      { keys: 'Enter / Escape (editor)', action: { en: 'Save or cancel the inline edit', es: 'Guarda o cancela la edición en línea' } },
    ],
    notes: [
      {
        en: 'Cell navigation is opt-in and works in the standard layout: with `enableKeyboardNavigation: true` the `<table>` itself takes focus, gets `role="grid"` and points `aria-activedescendant` at the active cell, which is scrolled into view. Cell ids are unique per table instance. Without it the table keeps `role="table"` semantics and only headers, checkboxes and buttons are focusable.',
        es: 'La navegación por celdas es opcional y funciona en el diseño estándar: con `enableKeyboardNavigation: true` el propio `<table>` recibe el foco, toma `role="grid"` y apunta `aria-activedescendant` a la celda activa, que se desplaza hasta quedar visible. Los ids de celda son únicos por instancia de tabla. Sin esa opción, la tabla mantiene la semántica `role="table"` y solo los encabezados, casillas y botones reciben foco.',
      },
      {
        en: "The grouped layout is not a `grid`; each group header has a button that expands and collapses it (`aria-expanded`). Cell templates, filters, tooltips and inline editing work in all three layouts, and the inline editor's save and cancel buttons are labelled through `labels.confirmEditAriaLabel` and `labels.cancelEditAriaLabel`.",
        es: 'El diseño agrupado no es un `grid`; cada encabezado de grupo tiene un botón que lo expande y lo contrae (`aria-expanded`). Las plantillas de celda, los filtros, los tooltips y la edición en línea funcionan en los tres diseños, y los botones de guardar y cancelar del editor en línea se etiquetan con `labels.confirmEditAriaLabel` y `labels.cancelEditAriaLabel`.',
      },
      {
        en: 'In all three layouts (standard, virtual-scroll and grouped), each sortable column header cell carries `aria-sort` (`ascending`, `descending` or `none`), and the sort control inside it is a `role="button"` that Enter and Space activate. Selection checkboxes, expand toggles (`aria-expanded`), filter buttons and the clear-selection and clear-filters buttons all have `aria-label`s you can translate through `labels`.',
        es: 'En los tres diseños (estándar, con desplazamiento virtual y con agrupación), cada celda de encabezado ordenable lleva `aria-sort` (`ascending`, `descending` o `none`), y el control de orden dentro de ella es un `role="button"` que se activa con Enter y Espacio. Las casillas de selección, los botones de expandir (`aria-expanded`), los botones de filtro y los de limpiar selección y filtros tienen `aria-label` que puedes traducir con `labels`.',
      },
      {
        en: 'The selection and active-filter bars are `role="status"` regions (`aria-live="polite"`), so changes are announced without interrupting. They are only rendered while there is a selection or an active filter.',
        es: 'Las barras de selección y de filtros activos son regiones `role="status"` (`aria-live="polite"`), así que los cambios se anuncian sin interrumpir. Solo se muestran mientras haya una selección o un filtro activo.',
      },
      {
        en: 'Common mistake: putting buttons or links inside an HTML string returned by `format`. Use a cell template so the control is a real, focusable element with a proper label.',
        es: 'Error común: poner botones o enlaces dentro de un HTML devuelto por `format`. Usa una plantilla de celda para que el control sea un elemento real, enfocable y con su etiqueta.',
      },
    ],
  },
  performance: [
    {
      en: 'Stages pass index arrays, and only the visible page is materialized. Building the row lookup is cached per `[data]` reference, not redone on every sort click.',
      es: 'Las etapas se pasan arreglos de índices y solo se materializa la página visible. El mapa de filas se cachea por cada referencia de `[data]`; no se reconstruye en cada clic para ordenar.',
    },
    {
      en: 'With the WASM engine loaded, filter, search, sort, group and aggregate work on columnar data in WASM. The engine handle is disposed when data changes and when the table is destroyed.',
      es: 'Con el motor WASM cargado, el filtrado, la búsqueda, el orden, la agrupación y los totales operan sobre datos en columnas dentro de WASM. El handle del motor se libera cuando cambian los datos y cuando se destruye la tabla.',
    },
    {
      en: '`virtualScroll: { enabled, itemHeight, viewportHeight }` uses the CDK virtual scroll viewport for long lists; only rows are virtualized, not columns.',
      es: '`virtualScroll: { enabled, itemHeight, viewportHeight }` usa el viewport de desplazamiento virtual del CDK para listas largas; solo se virtualizan las filas, no las columnas.',
    },
    {
      en: 'OnPush and signals throughout: an input change recomputes only the stages that depend on it.',
      es: 'OnPush y signals en todo: un cambio de input solo recalcula las etapas que dependen de él.',
    },
  ],
  related: [
    {
      id: 'datagrid',
      note: {
        en: 'Enterprise grid: row and column virtualization, multi-sort, JSON state, server `dataSource`, AI queries. New grid features land there.',
        es: 'Grid empresarial: virtualización de filas y columnas, orden múltiple, estado JSON, `dataSource` en servidor, consultas con IA. Las funcionalidades nuevas de grid se añaden ahí.',
      },
    },
    {
      id: 'tree-table',
      note: { en: 'This same component with `treeTable` turned on.', es: 'Este mismo componente con `treeTable` activado.' },
    },
    {
      id: 'guide-searchable-table',
      note: {
        en: 'Build a table with search, filters and paging step by step.',
        es: 'Construye paso a paso una tabla con búsqueda, filtros y paginación.',
      },
    },
    { id: 'formatters', note: { en: 'Pipe tuples and custom pipes for `format`.', es: 'Tuplas de pipes y pipes propios para `format`.' } },
  ],
};

export default content;
