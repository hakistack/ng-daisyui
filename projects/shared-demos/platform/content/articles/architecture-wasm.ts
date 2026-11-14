import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: run compute-heavy work in Rust without asking consumers to copy files, configure servers or pay for code they do not use. The Rust code lives in a Cargo workspace (`hakistack-engine/`), is compiled with wasm-pack into a few independent bundles, and is embedded in the Angular package so it loads with a dynamic `import()` the first time a feature needs it.',
      es: 'Objetivo: ejecutar el trabajo de cómputo pesado en Rust sin pedirle a quien usa la librería que copie archivos, configure servidores o cargue código que no usa. El código Rust vive en un workspace de Cargo (`hakistack-engine/`), se compila con wasm-pack en unos pocos bundles independientes y se incrusta en el paquete de Angular para cargarse con un `import()` dinámico la primera vez que una funcionalidad lo necesita.',
    },
  ],
  sections: [
    {
      id: 'crates',
      heading: { en: 'Crate structure', es: 'Estructura de crates' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Kernels are plain Rust libraries with no `wasm-bindgen`, testable natively with `npm run engine:test` (`cargo test --workspace`). Only thin umbrella crates talk to JavaScript.',
            es: 'Los kernels son librerías de Rust simples, sin `wasm-bindgen`, que se prueban de forma nativa con `npm run engine:test` (`cargo test --workspace`). Solo unos pocos crates paraguas, muy delgados, se comunican con JavaScript.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Crate', es: 'Crate' },
            { en: 'Role', es: 'Rol' },
          ],
          rows: [
            [
              { en: '`engine-core`', es: '`engine-core`' },
              {
                en: 'Shared primitives: tree arena, bitset, string folding',
                es: 'Primitivas compartidas: arena de árbol, bitset, normalización de texto',
              },
            ],
            [
              {
                en: '`table-engine`, `tree-engine`, `search-engine`, `form-engine`',
                es: '`table-engine`, `tree-engine`, `search-engine`, `form-engine`',
              },
              {
                en: 'Filter/sort/search/group/aggregate, tree flatten and selection cascade, fuzzy (nucleo-matcher) and PDF text search, form condition graph',
                es: 'Filtrar/ordenar/buscar/agrupar/agregar, aplanado de árbol y cascada de selección, búsqueda difusa (nucleo-matcher) y en texto PDF, grafo de condiciones de formularios',
              },
            ],
            [
              { en: '`engine-wasm`', es: '`engine-wasm`' },
              { en: 'Umbrella → `engine_wasm` bundle', es: 'Paraguas → bundle `engine_wasm`' },
            ],
            [
              { en: '`document-engine` + `document-wasm`', es: '`document-engine` + `document-wasm`' },
              { en: 'Spreadsheets via calamine → `document_wasm`', es: 'Hojas de cálculo con calamine → `document_wasm`' },
            ],
            [
              { en: '`image-engine` + `image-wasm`', es: '`image-engine` + `image-wasm`' },
              {
                en: 'Rust `image` crate (TIFF and minor formats) → `image_wasm`',
                es: 'Crate `image` de Rust (TIFF y formatos menores) → `image_wasm`',
              },
            ],
            [
              { en: '`pdf-engine`', es: '`pdf-engine`' },
              {
                en: 'Bindings over PDFium (vendored `pdfium-render` 0.9.2 with a small patch) → `pdf_engine`, used only inside the PDFium worker',
                es: 'Bindings sobre PDFium (copia local de `pdfium-render` 0.9.2 con un pequeño parche) → `pdf_engine`, que solo se usa dentro del worker de PDFium',
              },
            ],
            [
              { en: '`libheif-bridge`', es: '`libheif-bridge`' },
              {
                en: 'HEIC decoder for `wasm32-unknown-emscripten`; excluded from the workspace and built only with `npm run libheif:build`',
                es: 'Decodificador HEIC para `wasm32-unknown-emscripten`; está excluido del workspace y solo se compila con `npm run libheif:build`',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Separate bundles exist so that an app using only `hk-table` never downloads calamine or the image decoder, and vice versa.',
            es: 'Los bundles están separados para que una app que solo usa `hk-table` nunca descargue calamine ni el decodificador de imágenes, y viceversa.',
          },
        },
      ],
    },
    {
      id: 'build',
      heading: { en: 'Build and inlining', es: 'Compilación e incrustación' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'npm run engine:build', es: 'npm run engine:build' },
              detail: {
                en: '`scripts/build-wasm.mjs` runs `wasm-pack build --target web` for `engine-wasm`, `document-wasm`, `image-wasm` and `pdf-engine`.',
                es: '`scripts/build-wasm.mjs` ejecuta `wasm-pack build --target web` para `engine-wasm`, `document-wasm`, `image-wasm` y `pdf-engine`.',
              },
            },
            {
              label: { en: 'Glue + inline pair', es: 'Par glue + inline' },
              detail: {
                en: 'For each bundle it writes `<name>_glue.ts` (the wasm-pack JS with `// @ts-nocheck`) and `<name>_inline.ts` (the `.wasm` as a base64 constant) under `src/lib/wasm/`.',
                es: 'Para cada bundle escribe en `src/lib/wasm/` un `<name>_glue.ts` (el JS de enlace de wasm-pack con `// @ts-nocheck`) y un `<name>_inline.ts` (el `.wasm` como constante base64).',
              },
            },
            {
              label: { en: 'npm run build', es: 'npm run build' },
              detail: {
                en: 'First bundles the PDFium worker into a string, then ng-packagr emits the glue and inline files as separate lazy FESM chunks.',
                es: 'Primero empaqueta el worker de PDFium en una cadena y luego ng-packagr emite los archivos glue e inline como chunks FESM diferidos.',
              },
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Release builds use `opt-level = 3`, fat LTO, one codegen unit, `strip` and `panic = "abort"`. Size per bundle is listed in `hakistack-engine/README.md`; measure your own build before quoting numbers, since they change with every engine update.',
            es: 'Las compilaciones de release usan `opt-level = 3`, LTO completo (`fat`), una sola unidad de codegen, `strip` y `panic = "abort"`. El tamaño de cada bundle está en `hakistack-engine/README.md`; mide tu propia compilación antes de citar cifras, porque cambian con cada actualización del motor.',
          },
        },
      ],
    },
    {
      id: 'loading',
      heading: { en: 'Lazy initialization and URL override', es: 'Inicialización diferida y URL personalizada' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each bundle has one loader in `lib/utils/` (`engine-loader.ts`, `document-engine-loader.ts`, `image-engine-loader.ts`, `libheif-loader.ts`). A loader keeps a module-scope promise (`onceAsync` in `wasm-loader.ts`): the first caller starts the load, concurrent callers await the same promise, and the resolved module is reused. Two paths:',
            es: 'Cada bundle tiene un cargador en `lib/utils/` (`engine-loader.ts`, `document-engine-loader.ts`, `image-engine-loader.ts`, `libheif-loader.ts`). Un cargador guarda una promesa a nivel de módulo (`onceAsync` en `wasm-loader.ts`): quien llama primero inicia la carga, las llamadas simultáneas esperan la misma promesa y el módulo resuelto se reutiliza. Hay dos caminos:',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '**Inline (default, token is `null`)**: dynamic-import the glue and the base64 chunk, decode with `atob` into a `Uint8Array`, and pass it to the glue initializer as `{ module_or_path: bytes }`. No HTTP request for the `.wasm`.',
              es: '**Incrustado (por defecto, token en `null`)**: importa dinámicamente el glue y el chunk base64, decodifica este último con `atob` a un `Uint8Array` y lo pasa al inicializador del glue como `{ module_or_path: bytes }`. No hay ninguna petición HTTP para el `.wasm`.',
            },
            {
              en: '**URL override** (`provideTableEngineWasmUrl`, `provideDocumentEngineWasmUrl`, `provideImageEngineWasmUrl`): `import(url)` with bundler-ignore pragmas, then the glue fetches `<name>_bg.wasm` from the same folder.',
              es: '**URL personalizada** (`provideTableEngineWasmUrl`, `provideDocumentEngineWasmUrl`, `provideImageEngineWasmUrl`): `import(url)` con pragmas para que el bundler lo ignore, y luego el glue descarga `<name>_bg.wasm` de la misma carpeta.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'A rejected load is forgotten, so the next call retries (one flaky chunk fetch no longer disables an engine until reload). Two caveats: `DocumentEngineService` and `ImageEngineService` cache the promise they get, so a failed spreadsheet or TIFF engine load stays failed for the page session; and the libheif loader never rejects by design: a missing build resolves to `null` (cached) so the caller can use the `heic2any` fallback.',
            es: 'Si una carga se rechaza, la promesa se descarta y la siguiente llamada lo vuelve a intentar (un fallo puntual al descargar un chunk ya no desactiva un motor hasta recargar la página). Dos salvedades: `DocumentEngineService` e `ImageEngineService` guardan la promesa que reciben, así que si falla la carga del motor de hojas de cálculo o de TIFF, sigue fallando durante toda la sesión de la página; y el cargador de libheif nunca se rechaza por diseño: si el build no existe, se resuelve como `null` (y queda en caché) para que se pueda usar la alternativa `heic2any`.',
          },
        },
      ],
    },
    {
      id: 'boundary',
      heading: { en: 'Crossing the boundary', es: 'Cruzar la frontera' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Columnar ingest**: `TableHandle` sends numbers and dates as `Float64Array` plus a `Uint8Array` validity mask per column, and text as string arrays, instead of one serialized object per row.',
              es: '**Ingesta por columnas**: `TableHandle` envía los números y las fechas como `Float64Array` más una máscara de validez `Uint8Array` por columna, y el texto como arreglos de cadenas, en lugar de un objeto serializado por fila.',
            },
            {
              en: '**Index results**: filter, search and sort return `Uint32Array` row indices; the handle maps them back to your original objects, which never re-enter WASM.',
              es: '**Resultados por índice**: filtrar, buscar y ordenar devuelven índices de fila en un `Uint32Array`; el handle los traduce a tus objetos originales, que nunca vuelven a entrar en WASM.',
            },
            {
              en: '**Plain values**: spreadsheet parsing returns a structured JS object through `serde-wasm-bindgen`, and image decoding returns PNG bytes.',
              es: '**Valores simples**: el análisis de hojas de cálculo devuelve un objeto JS estructurado mediante `serde-wasm-bindgen`, y la decodificación de imágenes devuelve bytes PNG.',
            },
            {
              en: '**Workers**: each PDFium worker receives its own copy of the file as a transferred `ArrayBuffer` and sends pages back as transferred `ImageBitmap`s, so messages are moved, not cloned.',
              es: '**Workers**: cada worker de PDFium recibe su propia copia del archivo como un `ArrayBuffer` transferido y devuelve las páginas como `ImageBitmap` transferidos, así que los mensajes se mueven en lugar de clonarse.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'A `#[wasm_bindgen] pub fn new` without the `constructor` attribute is a static factory: call `WasmPdfIndex.new(n)`, never `new WasmPdfIndex(n)`. The second form creates a JS object with no Rust pointer that writes through address 0 and corrupts the shared engine heap.',
            es: 'Un `#[wasm_bindgen] pub fn new` sin el atributo `constructor` es una función de fábrica estática: llama a `WasmPdfIndex.new(n)`, nunca a `new WasmPdfIndex(n)`. La segunda forma crea un objeto JS sin puntero de Rust que escribe en la dirección 0 y corrompe el heap compartido del motor.',
          },
        },
      ],
    },
    {
      id: 'memory',
      heading: { en: 'Memory lifecycle and fallbacks', es: 'Ciclo de memoria y alternativas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'WASM objects are not garbage collected like JS objects, so every handle (`TableHandle`, `TreeHandle`, `FuzzyHandle`, `PdfSearchHandle`, `FormHandle`) extends `DisposableHandle`. `dispose()` calls the wasm-bindgen `free()` exactly once; afterwards `guard()` returns a fallback value. It also catches the "null pointer passed to rust" and "recursive use of an object" errors that appear when a stale reference survives a data swap, marks the handle disposed and returns the fallback. Components dispose the previous handle on every re-ingest, discard handles that finish loading after the data changed, and dispose on destroy.',
            es: 'El recolector de basura no libera los objetos WASM como libera los objetos JS, así que cada handle (`TableHandle`, `TreeHandle`, `FuzzyHandle`, `PdfSearchHandle`, `FormHandle`) extiende `DisposableHandle`. `dispose()` llama al `free()` de wasm-bindgen exactamente una vez; después, `guard()` devuelve un valor por defecto. También captura los errores "null pointer passed to rust" y "recursive use of an object" que aparecen cuando una referencia obsoleta sobrevive a un cambio de datos, marca el handle como liberado y devuelve el valor por defecto. Los componentes liberan el handle anterior en cada nueva ingesta, descartan los handles que terminan de cargar cuando los datos ya cambiaron y los liberan al destruirse.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Feature', es: 'Funcionalidad' },
            { en: 'JavaScript fallback?', es: '¿Alternativa en JavaScript?' },
          ],
          rows: [
            [
              {
                en: 'Table filter/sort/search/group, tree filter/flatten',
                es: 'Filtrar/ordenar/buscar/agrupar en tabla, filtrar/aplanar árbol',
              },
              { en: 'Yes, the original JS pipeline', es: 'Sí, el pipeline original en JS' },
            ],
            [
              { en: 'Select and command palette search', es: 'Búsqueda en select y command palette' },
              {
                en: 'Yes, Fuse.js (`hk-select` only builds the WASM index after the user types in a list of 200+ options)',
                es: 'Sí, Fuse.js (`hk-select` solo crea el índice WASM cuando el usuario escribe en una lista de 200 opciones o más)',
              },
            ],
            [
              { en: 'Dynamic form conditions', es: 'Condiciones del formulario dinámico' },
              { en: 'Yes, `ConditionEngine`', es: 'Sí, `ConditionEngine`' },
            ],
            [
              { en: 'PDF text search', es: 'Búsqueda de texto en PDF' },
              { en: 'Yes', es: 'Sí' },
            ],
            [
              { en: 'Spreadsheets, TIFF, PDF rendering', es: 'Hojas de cálculo, TIFF, renderizado de PDF' },
              { en: 'No: an error is shown', es: 'No: se muestra un error' },
            ],
            [
              { en: 'HEIC', es: 'HEIC' },
              {
                en: 'Optional `heic2any` peer, else an install hint',
                es: 'Peer opcional `heic2any`; si no está, un mensaje de instalación',
              },
            ],
          ],
        },
      ],
    },
  ],
  related: [
    {
      id: 'wasm-engines',
      note: {
        en: 'The consumer view: services, tokens and when engines run.',
        es: 'La vista de quien usa la librería: servicios, tokens y cuándo se ejecutan los motores.',
      },
    },
    {
      id: 'architecture-documents',
      note: { en: 'The PDFium worker and document renderers.', es: 'El worker de PDFium y los renderizadores de documentos.' },
    },
    { id: 'contributing', note: { en: 'Setting up Rust and wasm-pack locally.', es: 'Preparar Rust y wasm-pack en tu equipo.' } },
  ],
};

export default content;
