import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: keep big tables, trees, searches and files fast without making every app download heavy code. The library compiles its hot loops from Rust to WebAssembly and loads each WASM bundle **only when a feature needs it**. You do not configure anything: the binaries ship inside the package and are decoded from inline base64 the first time they are used.',
      es: 'Objetivo: mantener rápidas las tablas grandes, los árboles, las búsquedas y los archivos sin obligar a cada app a descargar código pesado. La librería compila sus bucles críticos de Rust a WebAssembly y carga cada bundle WASM **solo cuando una funcionalidad lo necesita**. No tienes que configurar nada: los binarios vienen dentro del paquete y se decodifican desde base64 incrustado la primera vez que se usan.',
    },
    {
      en: 'Most engines are accelerators: when they cannot load, the component keeps working with its JavaScript path. A few are the only implementation of a format (spreadsheets, TIFF, PDF rendering); those show an error instead. This page tells you which is which.',
      es: 'La mayoría de los motores son aceleradores: si no cargan, el componente sigue funcionando con su implementación en JavaScript. Algunos son la única implementación de un formato (hojas de cálculo, TIFF, renderizado de PDF); esos muestran un error. Esta página te dice cuál es cuál.',
    },
  ],
  sections: [
    {
      id: 'bundles',
      heading: { en: 'Bundles and who loads them', es: 'Bundles y quién los carga' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Bundle', es: 'Bundle' },
            { en: 'Services', es: 'Servicios' },
            { en: 'Used by', es: 'Lo usan' },
            { en: 'If it fails', es: 'Si falla' },
          ],
          rows: [
            [
              { en: '`engine_wasm`', es: '`engine_wasm`' },
              {
                en: '[TableEngineService](/api/TableEngineService), [TreeEngineService](/api/TreeEngineService), [FuzzyEngineService](/api/FuzzyEngineService), [FormEngineService](/api/FormEngineService), [PdfSearchService](/api/PdfSearchService)',
                es: '[TableEngineService](/api/TableEngineService), [TreeEngineService](/api/TreeEngineService), [FuzzyEngineService](/api/FuzzyEngineService), [FormEngineService](/api/FormEngineService), [PdfSearchService](/api/PdfSearchService)',
              },
              {
                en: '`hk-table`, `hk-tree`, `hk-select`, command palette, dynamic form, PDF search',
                es: '`hk-table`, `hk-tree`, `hk-select`, command palette, formulario dinámico, búsqueda en PDF',
              },
              {
                en: 'JavaScript fallback (Fuse.js for fuzzy search, `ConditionEngine` for forms)',
                es: 'Alternativa en JavaScript (Fuse.js para búsqueda difusa, `ConditionEngine` para formularios)',
              },
            ],
            [
              { en: '`document_wasm`', es: '`document_wasm`' },
              { en: '[DocumentEngineService](/api/DocumentEngineService)', es: '[DocumentEngineService](/api/DocumentEngineService)' },
              { en: 'Spreadsheet renderer (calamine)', es: 'Renderizador de hojas de cálculo (calamine)' },
              { en: 'Error alert in the viewer', es: 'Alerta de error en el visor' },
            ],
            [
              { en: '`image_wasm`', es: '`image_wasm`' },
              { en: '[ImageEngineService](/api/ImageEngineService)', es: '[ImageEngineService](/api/ImageEngineService)' },
              {
                en: 'TIFF in the special-image renderer (the decoder also supports BMP, GIF, ICO, PNM and QOI, but the viewer shows BMP, GIF and ICO with a native `<img>`)',
                es: 'TIFF en el renderizador de imágenes especiales (el decodificador también admite BMP, GIF, ICO, PNM y QOI, pero el visor muestra BMP, GIF e ICO con un `<img>` nativo)',
              },
              { en: 'Error alert in the viewer', es: 'Alerta de error en el visor' },
            ],
            [
              { en: 'libheif (optional build)', es: 'libheif (build opcional)' },
              { en: '[LibheifService](/api/LibheifService)', es: '[LibheifService](/api/LibheifService)' },
              { en: 'HEIC / HEIF images', es: 'Imágenes HEIC / HEIF' },
              {
                en: 'Falls back to the `heic2any` peer, then to an install hint',
                es: 'Recurre al peer `heic2any` y luego a un mensaje de instalación',
              },
            ],
            [
              { en: 'PDFium worker', es: 'Worker de PDFium' },
              { en: 'Internal to `hk-pdf-viewer`', es: 'Interno de `hk-pdf-viewer`' },
              { en: 'PDF rendering', es: 'Renderizado de PDF' },
              { en: '`viewerError` with code `unsupported`', es: '`viewerError` con código `unsupported`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The five `engine_wasm` services share one module loader, so the first one to load initializes the module and the others reuse it. libheif is not part of the regular build: it exists only if the package was built with `npm run libheif:build`.',
            es: 'Los cinco servicios de `engine_wasm` comparten un solo cargador de módulo, así que el primero que lo carga inicializa el módulo y los demás lo reutilizan. libheif no forma parte de la compilación normal: solo existe si el paquete se compiló con `npm run libheif:build`.',
          },
        },
      ],
    },
    {
      id: 'when',
      heading: { en: 'When the engines take over', es: 'Cuándo entran los motores' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**hk-table**: ingests the rows when `data` changes, in offset mode only (not cursor mode, not tree tables), and only if every column type can be inferred (from `filter.type` or by sampling up to 64 rows). Otherwise the JS pipeline stays the source of truth.',
              es: '**hk-table**: ingiere las filas cuando cambia `data`, solo en modo offset (no en modo cursor ni en tablas de árbol) y solo si se puede inferir el tipo de cada columna (por `filter.type` o revisando hasta 64 filas). Si no, el pipeline de JS sigue siendo la fuente de verdad.',
            },
            {
              en: '**hk-tree** and **command palette**: build an index when their items change and use it once ready; until then, and on failure, the JS path answers.',
              es: '**hk-tree** y **command palette**: construyen un índice cuando cambian sus elementos y lo usan cuando está listo; mientras tanto, y si falla, responde la implementación en JS.',
            },
            {
              en: '**hk-select**: builds the fuzzy index only once the user has typed a search query and the list has at least 200 options; smaller lists, and the time before the index is ready, use Fuse.js. A list that never gets searched never downloads the engine.',
              es: '**hk-select**: solo crea el índice de búsqueda difusa cuando el usuario ya escribió una consulta y la lista tiene al menos 200 opciones; las listas más pequeñas, y el tiempo hasta que el índice está listo, usan Fuse.js. Una lista en la que nunca se busca nunca descarga el motor.',
            },
            {
              en: '**Dynamic form**: compiles the conditions (`showWhen`, `requiredWhen`…) into a dependency graph; if the engine cannot load, conditions are evaluated in JavaScript.',
              es: '**Formulario dinámico**: compila las condiciones (`showWhen`, `requiredWhen`…) en un grafo de dependencias; si el motor no carga, las condiciones se evalúan en JavaScript.',
            },
            {
              en: '**PDF viewer**: page text is mirrored into a WASM search index; search falls back to JavaScript if the index is unavailable.',
              es: '**Visor de PDF**: el texto de las páginas se replica en un índice de búsqueda WASM; la búsqueda recurre a JavaScript si el índice no está disponible.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'The engine stress demo renders `hk-table` with 1k to 100k generated rows and shows the engine status (loading, active, fallback) next to a micro-benchmark against plain JavaScript on your machine.',
            es: 'La demo de estrés del motor muestra `hk-table` con entre 1k y 100k filas generadas y el estado del motor (cargando, activo, alternativa) junto a una microprueba de rendimiento frente a JavaScript simple en tu equipo.',
          },
        },
      ],
    },
    {
      id: 'direct',
      heading: { en: 'Using an engine directly', es: 'Usar un motor directamente' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "The services are `providedIn: 'root'`. Each `create*` method loads the module on first call and returns a **handle** that owns memory on the WASM heap. Internally, results come back as `Uint32Array` row indices, so rows never cross the boundary again after ingest. Call `dispose()` when you are done; it is idempotent, and a disposed handle returns empty results instead of crashing.",
            es: "Los servicios son `providedIn: 'root'`. Cada método `create*` carga el módulo en la primera llamada y devuelve un **handle** que es dueño de memoria en el heap de WASM. Internamente, los resultados vuelven como índices de fila en un `Uint32Array`, así que las filas no vuelven a cruzar la frontera después de ingerirlas. Llama a `dispose()` al terminar; es idempotente, y un handle liberado devuelve resultados vacíos en lugar de fallar.",
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `private readonly engine = inject(TableEngineService);
private handle: TableHandle<Order> | null = null;

async index(orders: readonly Order[]): Promise<void> {
  this.handle?.dispose();
  this.handle = await this.engine.createDataset(orders, [
    { field: 'customer', kind: 'text' },
    { field: 'total', kind: 'number' },
    { field: 'paid', kind: 'bool' },
    { field: 'createdAt', kind: 'date' },
  ]);
}

bigUnpaid(): readonly Order[] {
  if (!this.handle) return [];
  return this.handle.query({
    filters: [{ kind: 'bool', field: 'paid', op: { kind: 'eq', value: false } }],
    sort: [{ field: 'total', direction: 'desc' }],
    page: { index: 0, size: 20 },
  });
}

ngOnDestroy(): void {
  this.handle?.dispose();
}`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'The handle keeps a reference to your array and copies its columns at ingest. If you mutate the rows, dispose the handle and create a new one.',
            es: 'El handle guarda una referencia a tu arreglo y copia sus columnas al ingerirlo. Si modificas las filas, libera el handle y crea uno nuevo.',
          },
        },
      ],
    },
    {
      id: 'hosting',
      heading: { en: 'Serving the WASM yourself (optional)', es: 'Servir el WASM tú mismo (opcional)' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'By default nothing is fetched. If you prefer the binary as a separately cached file (for example behind a CDN), serve the wasm-pack output of the bundle (for `engine_wasm`: `engine_wasm.js` and `engine_wasm_bg.wasm`, side by side) and point the token at the `.js` glue. The package build only ships the inlined copies (`ng-package.json` lists no `wasm/` asset), so produce those files from the repository with `npm run engine:build`.',
            es: 'Por defecto no se descarga nada aparte. Si prefieres el binario como un archivo que se guarde en caché por separado (por ejemplo, detrás de un CDN), sirve la salida de wasm-pack del bundle (para `engine_wasm`: `engine_wasm.js` y `engine_wasm_bg.wasm`, en la misma carpeta) y apunta el token al archivo `.js` de enlace (glue). El paquete publicado solo incluye las copias incrustadas (`ng-package.json` no declara ninguna carpeta `wasm/` como asset), así que genera esos archivos desde el repositorio con `npm run engine:build`.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `providers: [
  provideTableEngineWasmUrl('/wasm/engine_wasm.js'),            // all engine_wasm services
  provideDocumentEngineWasmUrl('/wasm/document/document_wasm.js'), // spreadsheets
  provideImageEngineWasmUrl('/wasm/image/image_wasm.js'),          // TIFF and friends
]`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'A failed `engine_wasm` load (for example a 404 on an override URL) is not cached: the next call tries again. The spreadsheet and image services keep their first result, so a failed `document_wasm` or `image_wasm` load stays failed until the page reloads. The error message names the URL and the files expected there.',
            es: 'Una carga fallida de `engine_wasm` (por ejemplo, un 404 en una URL personalizada) no queda en caché: la siguiente llamada lo vuelve a intentar. Los servicios de hojas de cálculo y de imágenes conservan su primer resultado, así que si falla la carga de `document_wasm` o `image_wasm`, sigue fallando hasta recargar la página. El mensaje de error indica la URL y los archivos que se esperaban allí.',
          },
        },
      ],
    },
  ],
  related: [
    {
      id: 'architecture-wasm',
      note: { en: 'Crates, bindings, memory and workers in depth.', es: 'Crates, bindings, memoria y workers en detalle.' },
    },
    {
      id: 'guide-large-datasets',
      note: { en: 'Which component to pick for big data.', es: 'Qué componente elegir para grandes volúmenes de datos.' },
    },
    { id: 'guide-bundle-size', note: { en: 'What is lazy-loaded and what is not.', es: 'Qué se carga de forma diferida y qué no.' } },
    { id: 'guide-troubleshooting', note: { en: 'WASM 404s and CSP errors.', es: 'Errores 404 del WASM y errores de CSP.' } },
  ],
};

export default content;
