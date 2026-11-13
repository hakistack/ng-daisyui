import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: one viewer that opens many formats, where each format pays only for its own code, and where an unsupported or broken file ends in a clear message instead of a blank box. This page explains how a file travels from `[src]` to pixels, how PDFs get their own workers, and how memory is released.',
      es: 'Objetivo: un visor que abre muchos formatos, donde cada formato paga solo por su propio código, y donde un archivo no soportado o dañado termina en un mensaje claro y no en una caja vacía. Esta página explica cómo viaja un archivo desde `[src]` hasta los píxeles, cómo los PDFs tienen sus propios workers y cómo se libera la memoria.',
    },
  ],
  sections: [
    {
      id: 'layers',
      heading: { en: 'Layers', es: 'Capas' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Facade: hk-document-viewer', es: 'Fachada: hk-document-viewer' },
              detail: {
                en: 'Inputs `src`, `config`, `mode`, `editor`. Holds no format logic.',
                es: 'Inputs `src`, `config`, `mode`, `editor`. No tiene lógica de formatos.',
              },
            },
            {
              label: { en: 'resolveFormat()', es: 'resolveFormat()' },
              detail: {
                en: 'Pure function: source + hints → `{ format, mimeType, extension }`.',
                es: 'Función pura: fuente + pistas → `{ format, mimeType, extension }`.',
              },
            },
            {
              label: { en: 'Renderer registry', es: 'Registro de renderizadores' },
              detail: {
                en: '`config.renderers` then the built-in list; first match wins; no match → unsupported card.',
                es: '`config.renderers` y luego la lista integrada; gana la primera coincidencia; sin coincidencia → tarjeta de no soportado.',
              },
            },
            {
              label: { en: 'Renderer component', es: 'Componente renderizador' },
              detail: {
                en: 'Mounted with `ngComponentOutlet`; loads bytes and its engine on demand.',
                es: 'Se monta con `ngComponentOutlet`; carga los bytes y su motor a demanda.',
              },
            },
            {
              label: { en: 'Engine', es: 'Motor' },
              detail: {
                en: 'WASM bundle (calamine, image), optional npm package (docx-preview, postal-mime, msgreader, foliate-js), native `<img>`, or PDFium workers.',
                es: 'Bundle WASM (calamine, image), paquete npm opcional (docx-preview, postal-mime, msgreader, foliate-js), `<img>` nativo o workers de PDFium.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The same registry pattern is reused by the [Document Editor](/document-editor) (`resolveEditor`, `resolveSerializer`) and by `hk-document-workspace`, which provides a [DocumentViewerHost](/api/DocumentViewerHost). Renderers that inject the host optionally publish their sections (sheets, pages, chapters) and metadata (headers, dimensions); renderers that do not still work.',
            es: 'El mismo patrón de registro lo reutilizan el [Editor de documentos](/document-editor) (`resolveEditor`, `resolveSerializer`) y `hk-document-workspace`, que provee un [DocumentViewerHost](/api/DocumentViewerHost). Los renderizadores que inyectan el host de forma opcional publican sus secciones (hojas, páginas, capítulos) y metadatos (encabezados, dimensiones); los que no lo hacen siguen funcionando.',
          },
        },
      ],
    },
    {
      id: 'detection',
      heading: { en: 'Format detection', es: 'Detección de formato' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: '`config.mimeType`, when it maps to a known format (parameters after `;` are ignored).',
              es: '`config.mimeType`, si corresponde a un formato conocido (se ignoran los parámetros después de `;`).',
            },
            { en: 'The extension of `config.filename`.', es: 'La extensión de `config.filename`.' },
            {
              en: 'The extension of a string URL, after removing the query string and hash. A dot followed by a slash is not an extension (`/v1.2/page`).',
              es: 'La extensión de una URL de texto, quitando la query y el hash. Un punto seguido de una barra no es extensión (`/v1.2/page`).',
            },
            {
              en: '`Blob.type` (a `File` from an input usually has one).',
              es: '`Blob.type` (un `File` de un input normalmente lo tiene).',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'The viewer does not sniff bytes: a `Uint8Array` with no hints resolves to `unknown`. The only magic-byte check is inside the special-image renderer, which recognizes HEIC containers already routed to it.',
            es: 'El visor no inspecciona los bytes: un `Uint8Array` sin pistas resuelve a `unknown`. La única comprobación de bytes mágicos está dentro del renderizador de imágenes especiales, que reconoce contenedores HEIC que ya le llegaron.',
          },
        },
      ],
    },
    {
      id: 'loading',
      heading: { en: 'Loading and states', es: 'Carga y estados' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Renderers that need bytes call `loadSourceAsBytes()`: `Uint8Array` passes through, a `Blob` is read with `arrayBuffer()`, a URL is fetched and a non-2xx answer throws "Failed to fetch document (HTTP n)". Images with a URL skip this and go straight to `<img>`.',
            es: 'Los renderizadores que necesitan bytes llaman `loadSourceAsBytes()`: un `Uint8Array` pasa tal cual, un `Blob` se lee con `arrayBuffer()`, una URL se descarga y una respuesta que no es 2xx lanza "Failed to fetch document (HTTP n)". Las imágenes con URL se saltan esto y van directo a `<img>`.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Each renderer owns `loading` and `error` signals and an effect keyed on its inputs, so a new `src` restarts the cycle. Errors render as a DaisyUI alert inside the renderer; optional peers that are missing produce an error naming the package to install. Renderers that mount third-party DOM (DOCX, EPUB) keep their container hidden until rendering finishes.',
            es: 'Cada renderizador tiene signals `loading` y `error` y un effect que depende de sus inputs, así que un `src` nuevo reinicia el ciclo. Los errores se muestran como una alerta de DaisyUI dentro del renderizador; los peers opcionales que faltan producen un error que nombra el paquete a instalar. Los renderizadores que montan DOM de terceros (DOCX, EPUB) ocultan su contenedor hasta que termina el render.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Untrusted markup is contained: HTML and e-mail bodies render in `<iframe sandbox="">` (no scripts, no navigation, no storage), with DOMPurify as an extra pass when installed. PDF links are limited to `http`, `https`, `mailto` and `tel`.',
            es: 'El marcado no confiable queda contenido: el HTML y el cuerpo de los correos se muestran en `<iframe sandbox="">` (sin scripts, sin navegación, sin almacenamiento), con DOMPurify como pasada extra si está instalado. Los enlaces de PDF se limitan a `http`, `https`, `mailto` y `tel`.',
          },
        },
      ],
    },
    {
      id: 'pdfium',
      heading: { en: 'PDFium workers', es: 'Workers de PDFium' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Library build', es: 'Build de la librería' },
              detail: {
                en: '`scripts/build-pdfium-worker.mjs` bundles `pdfium.worker.ts`, the `pdf_engine` glue and both `.wasm` files with esbuild into one string, written to `pdfium_worker_inline.ts`, before `ng build`.',
                es: '`scripts/build-pdfium-worker.mjs` empaqueta con esbuild `pdfium.worker.ts`, el enlace de `pdf_engine` y los dos `.wasm` en un string, escrito en `pdfium_worker_inline.ts`, antes de `ng build`.',
              },
            },
            {
              label: { en: 'First viewer', es: 'Primer visor' },
              detail: {
                en: "The inline module is dynamic-imported (its own lazy chunk), turned into a Blob and started as `new Worker(url, { type: 'module' })`.",
                es: "El módulo incrustado se importa dinámicamente (su propio chunk diferido), se convierte en Blob y arranca como `new Worker(url, { type: 'module' })`.",
              },
            },
            {
              label: { en: 'Inside the worker', es: 'Dentro del worker' },
              detail: {
                en: 'Loads the emscripten PDFium module, initializes the Rust bindings, then serves a priority queue (one task at a time, cancellable).',
                es: 'Carga el módulo PDFium de emscripten, inicializa los bindings de Rust y atiende una cola con prioridad (una tarea a la vez, cancelable).',
              },
            },
            {
              label: { en: 'Pool', es: 'Pool' },
              detail: {
                en: '`PdfEnginePool` runs N workers; each opens its own transferred copy of the bytes. Renders go to the least busy one, reads to the first.',
                es: '`PdfEnginePool` corre N workers; cada uno abre su propia copia transferida de los bytes. Los renders van al menos ocupado y las lecturas al primero.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Worker documents are read-only. Annotations, form values and page changes stay in viewer models and are saved by the library PDF writer as an incremental update, so the workers never diverge from each other. This setup needs `worker-src blob:` in your CSP; where `Worker`, `createImageBitmap` or Blob URLs are missing, no engine is created and the viewer emits an `unsupported` error.',
            es: 'Los documentos de los workers son de solo lectura. Las anotaciones, valores de formulario y cambios de páginas se quedan en los modelos del visor y los guarda el escritor PDF de la librería como actualización incremental, así que los workers nunca se desincronizan entre sí. Esto requiere `worker-src blob:` en tu CSP; donde faltan `Worker`, `createImageBitmap` o las Blob URLs, no se crea motor y el visor emite un error `unsupported`.',
          },
        },
      ],
    },
    {
      id: 'memory',
      heading: { en: 'Memory and disposal', es: 'Memoria y liberación' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**PDF**: changing `src` closes the document in every worker but keeps the pool; destroying the viewer terminates the workers and revokes the worker Blob URL. Page bitmaps live in a byte-bounded LRU cache.',
              es: '**PDF**: cambiar `src` cierra el documento en cada worker pero conserva el pool; destruir el visor termina los workers y revoca la Blob URL del worker. Los bitmaps de página viven en un caché LRU limitado por bytes.',
            },
            {
              en: '**Spreadsheets**: calamine returns plain JS objects (serde), so nothing stays on the WASM heap to free. The module itself stays loaded for the page session.',
              es: '**Hojas de cálculo**: calamine devuelve objetos JS simples (serde), así que no queda nada en el heap de WASM por liberar. El módulo se queda cargado durante la sesión de la página.',
            },
            {
              en: '**Images**: object URLs for decoded or in-memory images are revoked on source change and on destroy.',
              es: '**Imágenes**: las object URLs de imágenes decodificadas o en memoria se revocan al cambiar la fuente y al destruir.',
            },
            {
              en: '**Engine handles** (search index, table, tree, fuzzy): extend `DisposableHandle`; `dispose()` frees the WASM object once and later calls return a fallback value. See [Rust/WASM architecture](/architecture/wasm).',
              es: '**Handles de motor** (índice de búsqueda, tabla, árbol, difuso): extienden `DisposableHandle`; `dispose()` libera el objeto WASM una vez y las llamadas posteriores devuelven un valor alternativo. Ver [Arquitectura Rust/WASM](/architecture/wasm).',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'document-viewer', note: { en: 'The component and its supported formats.', es: 'El componente y sus formatos soportados.' } },
    { id: 'pdf-viewer', note: { en: 'The PDF renderer and its API.', es: 'El renderizador PDF y su API.' } },
    {
      id: 'architecture-wasm',
      note: { en: 'How the WASM bundles are built and loaded.', es: 'Cómo se construyen y cargan los bundles WASM.' },
    },
    { id: 'guide-document-viewer-integration', note: { en: 'Putting it into an app.', es: 'Llevarlo a una app.' } },
  ],
};

export default content;
