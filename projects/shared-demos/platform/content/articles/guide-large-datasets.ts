import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: pick the component and data strategy that stay responsive for the amount of data you actually have. The deciding questions are how many rows reach the browser, whether the data is tabular, and which table features you need.',
      es: 'Objetivo: escoger el componente y la estrategia de datos que se mantengan fluidos con la cantidad de datos que realmente tienes. Las preguntas que deciden son cuántas filas llegan al navegador, si los datos son tabulares y qué funcionalidades de tabla necesitas.',
    },
  ],
  sections: [
    {
      id: 'decision',
      heading: { en: 'Quick decision', es: 'Decisión rápida' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Situation', es: 'Situación' },
            { en: 'Use', es: 'Usa' },
          ],
          rows: [
            [
              {
                en: 'A few thousand rows, and you need grouping, tree rows, inline editing, child grids or master-detail',
                es: 'Unos miles de filas y necesitas agrupación, filas en árbol, edición en línea, grids hijos o maestro-detalle',
              },
              { en: '[Table](/table) with pagination or `virtualScroll`', es: '[Table](/table) con paginación o `virtualScroll`' },
            ],
            [
              {
                en: 'Tens of thousands of rows in memory, wide tables, multi-column sort, saved views',
                es: 'Decenas de miles de filas en memoria, tablas anchas, orden por varias columnas, vistas guardadas',
              },
              { en: '[DataGrid](/datagrid) in client mode', es: '[DataGrid](/datagrid) en modo cliente' },
            ],
            [
              {
                en: 'More rows than you want to download, or data that changes on the server',
                es: 'Más filas de las que quieres descargar, o datos que cambian en el servidor',
              },
              { en: 'DataGrid with a server `dataSource`', es: 'DataGrid con un `dataSource` del servidor' },
            ],
            [
              {
                en: 'Long lists that are not tables: cards, messages, tiles',
                es: 'Listas largas que no son tablas: tarjetas, mensajes, mosaicos',
              },
              { en: '[Virtual scroller](/virtual-scroller)', es: '[Virtual scroller](/virtual-scroller)' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'The DataGrid demo renders 100,000 generated rows client-side. That is a reference point, not a guarantee: cost depends on columns, formatters and the device.',
            es: 'La demo del DataGrid renderiza 100,000 filas generadas en el cliente. Es un punto de referencia, no una garantía: el costo depende de las columnas, los formateadores y el dispositivo.',
          },
        },
      ],
    },
    {
      id: 'datagrid-client',
      heading: { en: 'DataGrid: virtualization in both directions', es: 'DataGrid: virtualización en ambas direcciones' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The DataGrid only creates DOM for the rows and columns intersecting the viewport, plus a small overscan. Rows have a fixed height (`rowHeight`, default 36 px), which is what makes this cheap. Omit `pageSize` to virtualize every row, or set it to paginate.',
            es: 'El DataGrid solo crea DOM para las filas y columnas que intersecan el viewport, más un pequeño margen. Las filas tienen altura fija (`rowHeight`, 36 px por defecto), y eso es lo que lo hace económico. Omite `pageSize` para virtualizar todas las filas, o ponlo para paginar.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `readonly grid = createDataGrid<Invoice>({
  columns,
  data: this.invoices,       // an array or a Signal<readonly Invoice[]>
  rowKey: (row) => row.id,   // keeps selection when you replace the data
  search: true,
  ariaLabel: 'Invoices',
});`,
        },
        {
          kind: 'p',
          text: {
            en: 'Filtering, search and sort run in TypeScript inside a memoized `computed()`: they re-run when the data or the state changes, not on scroll. Sorting decorates each row once, so a column accessor runs n times rather than n·log(n).',
            es: 'El filtrado, la búsqueda y el orden se ejecutan en TypeScript dentro de un `computed()` memoizado: se recalculan cuando cambian los datos o el estado, no al desplazarse. El orden decora cada fila una sola vez, así que el accessor de una columna se ejecuta n veces y no n·log(n).',
          },
        },
      ],
    },
    {
      id: 'table-engine',
      heading: { en: 'Table: the WASM engine', es: 'Table: el motor WASM' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'hk-table hands client-side filtering and sorting to a Rust/WebAssembly engine when it can. The engine module is lazy-loaded the first time a table receives data, and the table keeps working on its TypeScript path until it is ready, or if it fails to load.',
            es: 'hk-table delega el filtrado y el orden del lado del cliente en un motor en Rust/WebAssembly cuando puede. El módulo del motor se carga de forma diferida la primera vez que una tabla recibe datos, y la tabla usa su implementación en TypeScript mientras el motor no esté listo o si falla al cargar.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The engine is skipped for cursor pagination and tree tables.',
              es: 'El motor no se usa con paginación por cursor ni con tablas en árbol.',
            },
            {
              en: 'Every column’s type must be known: declared through its filter `type`, or inferred from a sample of the data. Otherwise the table stays on TypeScript.',
              es: 'El tipo de cada columna debe conocerse: declarado con el `type` de su filtro o inferido de una muestra de los datos. Si no, la tabla se queda en TypeScript.',
            },
            {
              en: 'If any active filter cannot be translated exactly, the whole filter step runs in TypeScript, so results never differ between the two paths.',
              es: 'Si algún filtro activo no se puede traducir con exactitud, todo el paso de filtrado se ejecuta en TypeScript, así que los resultados nunca difieren entre ambas rutas.',
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'For long tables without pagination, turn on row virtualization (CDK virtual scroll, fixed row height):',
            es: 'Para tablas largas sin paginación, activa la virtualización de filas (desplazamiento virtual del CDK, altura de fila fija):',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `readonly table = createTable<Employee>({
  columns: { name: { header: 'Name' }, department: { header: 'Department' } },
  virtualScroll: { enabled: true, itemHeight: 48, viewportHeight: '600px' },
});`,
        },
        {
          kind: 'p',
          text: {
            en: 'More on the engine, its memory model and how to self-host the binary: [WASM engines](/systems/wasm-engines).',
            es: 'Más sobre el motor, su modelo de memoria y cómo servir el binario tú mismo: [Motores WASM](/systems/wasm-engines).',
          },
        },
      ],
    },
    {
      id: 'server',
      heading: { en: 'When the answer is “don’t download it”', es: 'Cuando la respuesta es “no lo descargues”' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'For millions of records, the fastest client-side pipeline still loses to not transferring the data. Let the database do the work and stream one page at a time with a DataGrid `dataSource`: see [Server-side pagination](/guides/server-side-data).',
            es: 'Con millones de registros, el pipeline más rápido del cliente sigue perdiendo contra no transferir los datos. Deja que la base de datos haga el trabajo y trae una página a la vez con un `dataSource` del DataGrid: consulta [Paginación en el servidor](/guides/server-side-data).',
          },
        },
      ],
    },
    {
      id: 'lists',
      heading: { en: 'Non-tabular lists', es: 'Listas que no son tablas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '[VirtualScrollerComponent](/api/VirtualScrollerComponent) wraps CDK virtual scrolling with a template-first API: fixed `itemSize`, vertical or horizontal `orientation`, `numColumns` for grids, and a `lazy` mode that emits `(lazyLoad)` for `null` placeholder slots as they scroll into view.',
            es: '[VirtualScrollerComponent](/api/VirtualScrollerComponent) envuelve el desplazamiento virtual del CDK con una API basada en plantillas: `itemSize` fijo, `orientation` vertical u horizontal, `numColumns` para cuadrículas y un modo `lazy` que emite `(lazyLoad)` para los espacios `null` a medida que entran en pantalla.',
          },
        },
      ],
    },
    {
      id: 'habits',
      heading: { en: 'Habits that keep big data fast', es: 'Hábitos que mantienen rápidos los datos grandes' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Keep the data reference stable.** A new array triggers a full re-run (and, in hk-table, a new engine ingest). Build large arrays once, for example in a `computed()`, instead of in a template method.',
              es: '**Mantén estable la referencia de los datos.** Un arreglo nuevo provoca un recálculo completo (y, en hk-table, una nueva carga en el motor). Construye los arreglos grandes una vez, por ejemplo en un `computed()`, y no en un método de la plantilla.',
            },
            {
              en: '**Create the controller once.** Call `createTable` / `createDataGrid` in a field initializer, not inside a `computed()` that re-runs.',
              es: '**Crea el controlador una vez.** Llama a `createTable` / `createDataGrid` en un inicializador de campo, no dentro de un `computed()` que se recalcula.',
            },
            {
              en: '**Keep `format` cheap.** DataGrid search matches the formatted text, so a column formatter runs for every row on each search.',
              es: '**Mantén barato el `format`.** La búsqueda del DataGrid compara el texto formateado, así que el formateador de una columna se ejecuta para cada fila en cada búsqueda.',
            },
            {
              en: '**Use `searchable: false`** on DataGrid columns users never search, to shrink that work.',
              es: '**Usa `searchable: false`** en las columnas del DataGrid que nadie busca, para reducir ese trabajo.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'datagrid', note: { en: 'The 100k-row client example.', es: 'El ejemplo de 100k filas en el cliente.' } },
    { id: 'wasm-engines', note: { en: 'What runs in Rust and how it loads.', es: 'Qué se ejecuta en Rust y cómo se carga.' } },
    { id: 'virtual-scroller', note: { en: 'Virtualized lists and grids of items.', es: 'Listas y cuadrículas virtualizadas.' } },
  ],
};

export default content;
