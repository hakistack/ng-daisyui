import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: keep big tables, trees, searches and files fast without making every app download heavy code. The library compiles its hot loops from Rust to WebAssembly and loads each WASM bundle **only when a feature needs it**. You do not configure anything: the binaries ship inside the package and are decoded from inline base64 the first time they are used.',
      es: 'Objetivo: mantener rápidas las tablas grandes, los árboles, las búsquedas y los archivos sin obligar a cada app a descargar código pesado. La librería compila sus ciclos críticos de Rust a WebAssembly y carga cada bundle WASM **solo cuando una función lo necesita**. No tienes que configurar nada: los binarios vienen dentro del paquete y se decodifican desde base64 incrustado la primera vez que se usan.',
    },
    {
      en: 'Most engines are accelerators: when they cannot load, the component keeps working with its JavaScript path. A few are the only implementation of a format (spreadsheets, TIFF, PDF rendering); those show an error instead. This page tells you which is which.',
      es: 'La mayoría de los motores son aceleradores: si no cargan, el componente sigue funcionando con su camino en JavaScript. Algunos son la única implementación de un formato (hojas de cálculo, TIFF, render de PDF); esos muestran un error. Esta página te dice cuál es cuál.',
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
            { en: 'Used by', es: 'Lo usa' },
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
                en: '`hk-table`, `hk-tree`, select, command palette, dynamic form, PDF search',
                es: '`hk-table`, `hk-tree`, select, command palette, formulario dinámico, búsqueda en PDF',
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
                en: 'TIFF (and BMP, GIF, ICO, PNM, QOI) in the special-image renderer',
                es: 'TIFF (y BMP, GIF, ICO, PNM, QOI) en el renderizador de imágenes especiales',
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
              { en: 'PDF rendering', es: 'Render de PDF' },
              { en: '`viewerError` with code `unsupported`', es: '`viewerError` con código `unsupported`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The five `engine_wasm` services share one module loader, so the first one to load initializes the module and the others reuse it. libheif is not part of the regular build: it exists only if the package was built with `npm run libheif:build`.',
            es: 'Los cinco servicios de `engine_wasm` comparten un solo cargador de módulo, así que el primero que carga inicializa el módulo y los demás lo reutilizan. libheif no es parte del build normal: existe solo si el paquete se construyó con `npm run libheif:build`.',
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
              es: '**hk-table**: ingiere las filas cuando cambia `data`, solo en modo offset (no en modo cursor ni en tablas árbol), y solo si se puede inferir el tipo de cada columna (por `filter.type` o mirando hasta 64 filas). Si no, el pipeline JS sigue siendo la fuente de verdad.',
            },
            {
              en: '**hk-tree**, **select**, **command palette**: build an index when their items change and use it once ready; until then, and on failure, the JS path answers.',
              es: '**hk-tree**, **select**, **command palette**: construyen un índice cuando cambian sus ítems y lo usan cuando está listo; mientras tanto, y si falla, responde el camino JS.',
            },
            {
              en: '**Dynamic form**: compiles the conditions (`showWhen`, `requiredWhen`…) into a dependency graph; if the engine cannot load, conditions are evaluated in JavaScript.',
              es: '**Formulario dinámico**: compila las condiciones (`showWhen`, `requiredWhen`…) en un grafo de dependencias; si el motor no carga, las condiciones se evalúan en JavaScript.',
            },
            {
              en: '**PDF viewer**: page text is mirrored into a WASM search index; search falls back to JavaScript if the index is unavailable.',
              es: '**Visor de PDF**: el texto de las páginas se copia a un índice de búsqueda WASM; la búsqueda recurre a JavaScript si el índice no está disponible.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'The engine stress demo renders `hk-table` with 1k to 100k generated rows and shows the engine status (loading, active, fallback) next to a micro-benchmark against plain JavaScript on your machine.',
            es: 'El demo de estrés del motor muestra `hk-table` con 1k a 100k filas generadas y el estado del motor (cargando, activo, alternativa) junto a una micro-prueba contra JavaScript simple en tu equipo.',
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
            en: "The services are `providedIn: 'root'`. Each `create*` method loads the module on first call and returns a **handle** that owns memory on the WASM heap. Results come back as `Uint32Array` row indices, so rows never cross the boundary again after ingest. Call `dispose()` when you are done; it is idempotent, and a disposed handle returns empty results instead of crashing.",
            es: "Los servicios son `providedIn: 'root'`. Cada método `create*` carga el módulo en la primera llamada y devuelve un **handle** que posee memoria en el heap de WASM. Los resultados vuelven como índices de fila `Uint32Array`, así que las filas no vuelven a cruzar la frontera después de ingerirlas. Llama `dispose()` al terminar; es idempotente, y un handle liberado devuelve resultados vacíos en vez de fallar.",
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
            es: 'El handle guarda una referencia a tu arreglo y copia sus columnas al ingerir. Si cambias las filas, libera el handle y crea uno nuevo.',
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
            es: 'Por defecto no se descarga nada aparte. Si prefieres el binario como un archivo con caché propio (por ejemplo detrás de un CDN), sirve la salida de wasm-pack del bundle (para `engine_wasm`: `engine_wasm.js` y `engine_wasm_bg.wasm`, uno al lado del otro) y apunta el token al código `.js` de enlace. El build del paquete solo incluye las copias incrustadas (`ng-package.json` no lista una carpeta `wasm/` como asset), así que genera esos archivos desde el repositorio con `npm run engine:build`.',
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
            en: 'A failed load is cached for the page session: once a bundle fails (for example a 404 on an override URL), later calls get the same error until the page reloads. The error message names the URL and the files expected there.',
            es: 'Una carga fallida queda en caché durante la sesión de la página: si un bundle falla (por ejemplo un 404 en una URL de override), las llamadas siguientes reciben el mismo error hasta recargar la página. El mensaje de error indica la URL y los archivos que se esperaban allí.',
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
    { id: 'guide-large-datasets', note: { en: 'Which component to pick for big data.', es: 'Qué componente elegir para muchos datos.' } },
    { id: 'guide-bundle-size', note: { en: 'What is lazy-loaded and what is not.', es: 'Qué se carga de forma diferida y qué no.' } },
    { id: 'guide-troubleshooting', note: { en: 'WASM 404s and CSP errors.', es: 'WASM con 404 y errores de CSP.' } },
  ],
};

export default content;
