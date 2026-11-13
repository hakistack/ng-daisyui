import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-pdf-viewer` shows a PDF inside your page: you give it a URL, a `Uint8Array` or a `Blob`, and it draws the pages, lets people search, zoom, fill forms, annotate and sign, and gives you the edited file back as bytes. Everything happens in the browser; no server converts anything.',
      es: '`hk-pdf-viewer` muestra un PDF dentro de tu página: le pasas una URL, un `Uint8Array` o un `Blob`, y dibuja las páginas, permite buscar, ampliar, llenar formularios, anotar y firmar, y te devuelve el archivo editado como bytes. Todo ocurre en el navegador; ningún servidor convierte nada.',
    },
    {
      en: "Under the hood the pages are drawn by **PDFium** (the PDF engine used by Chrome) compiled to WebAssembly and running in Web Workers, so scrolling a long document does not freeze the page. You control it with a controller from `createPdfViewer()`: call `viewer.goToPage(5)` or `viewer.search('total')` from your class, no `@ViewChild` needed.",
      es: "Por dentro, las páginas las dibuja **PDFium** (el motor PDF que usa Chrome) compilado a WebAssembly y corriendo en Web Workers, así que desplazarse por un documento largo no congela la página. Lo controlas con un controlador de `createPdfViewer()`: llamas `viewer.goToPage(5)` o `viewer.search('total')` desde tu clase, sin `@ViewChild`.",
    },
  ],
  whenToUse: [
    {
      en: 'You need to show PDFs inside the app (contracts, invoices, reports) with search, zoom, thumbnails and print.',
      es: 'Necesitas mostrar PDFs dentro de la app (contratos, facturas, reportes) con búsqueda, zoom, miniaturas e impresión.',
    },
    {
      en: 'Users must fill a PDF form, annotate, reorder pages or sign, and you want the resulting bytes to upload with `save()`.',
      es: 'Los usuarios deben llenar un formulario PDF, anotar, reordenar páginas o firmar, y quieres los bytes resultantes para subirlos con `save()`.',
    },
    {
      en: "A flow (approval, signing, file preview) needs a compact single-page view: use `layout: 'preview'`.",
      es: "Un flujo (aprobación, firma, vista previa de archivos) necesita una vista compacta de una página: usa `layout: 'preview'`.",
    },
    {
      en: 'Several PDFs must be browsed side by side with a document list: use `hk-pdf-workspace`, which takes the same controller.',
      es: 'Hay que recorrer varios PDFs con una lista de documentos: usa `hk-pdf-workspace`, que recibe el mismo controlador.',
    },
  ],
  whenNotToUse: [
    {
      en: 'The files can be of many formats (Word, Excel, images, e-mail): use the [Document Viewer](/document-viewer), which routes PDFs to this component for you.',
      es: 'Los archivos pueden ser de muchos formatos (Word, Excel, imágenes, correo): usa el [Visor de documentos](/document-viewer), que envía los PDFs a este componente por ti.',
    },
    {
      en: 'The page is rendered on the server only (SSR without hydration in a browser): PDFium needs `Worker` and `createImageBitmap`, and the viewer reports an `unsupported` error without them.',
      es: 'La página se renderiza solo en el servidor (SSR sin hidratar en un navegador): PDFium necesita `Worker` y `createImageBitmap`, y sin ellos el visor reporta un error `unsupported`.',
    },
    {
      en: 'Your Content Security Policy cannot allow `worker-src blob:`: the PDFium worker is created from an inlined Blob URL and will not start.',
      es: 'Tu Content Security Policy no puede permitir `worker-src blob:`: el worker de PDFium se crea desde una Blob URL incrustada y no arrancará.',
    },
    {
      en: 'You only need a download link: a plain `<a download>` is lighter than loading a multi-megabyte engine.',
      es: 'Solo necesitas un enlace de descarga: un `<a download>` simple es más liviano que cargar un motor de varios megabytes.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PdfViewerComponent, createPdfViewer, type PdfLoadedInfo, type PdfViewerError } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-invoice-pdf',
  imports: [PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div class="flex gap-2 mb-2">
      <button type="button" class="btn btn-sm" (click)="viewer.previousPage()">Previous</button>
      <button type="button" class="btn btn-sm" (click)="viewer.nextPage()">Next</button>
      <span class="text-sm">Page {{ viewer.state().page }} of {{ viewer.state().numPages }}</span>
    </div>
    <!-- The viewer fills its parent, so give the parent a height. -->
    <div class="h-[70vh]">
      <hk-pdf-viewer [src]="src()" [config]="viewer.config()" (loaded)="onLoaded($event)" (viewerError)="onError($event)" />
    </div>
    @if (error(); as e) {
      <p class="text-error text-sm">{{ e }}</p>
    }
  \`,
})
export class InvoicePdfComponent {
  readonly src = signal<string>('/assets/invoice.pdf');
  readonly error = signal<string | null>(null);

  readonly viewer = createPdfViewer({
    zoom: 'fit-width',
    annotationAuthor: 'Reviewer',
  });

  onLoaded(info: PdfLoadedInfo): void {
    this.error.set(null);
    console.log(\`Loaded \${info.numPages} pages\`);
  }

  onError(e: PdfViewerError): void {
    this.error.set(e.message);
  }
}
`,
    note: {
      en: 'Swap `src` for a `Blob` from an `<input type="file">` or for bytes from your API; the viewer reloads when the value changes. The parent needs a bounded height because the viewer card is `h-full`.',
      es: 'Cambia `src` por un `Blob` de un `<input type="file">` o por bytes de tu API; el visor recarga cuando el valor cambia. El contenedor necesita una altura acotada porque la tarjeta del visor es `h-full`.',
    },
  },
  technical: [
    {
      id: 'engine',
      heading: { en: 'PDFium in workers', es: 'PDFium en workers' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The engine is PDFium compiled to WebAssembly, driven through a Rust crate (`pdf-engine`, built on `pdfium-render`). Both `.wasm` binaries and the worker code are bundled into one string at library build time (`scripts/build-pdfium-worker.mjs`) and loaded as a lazy chunk the first time a viewer starts, so consumers copy no assets.',
            es: 'El motor es PDFium compilado a WebAssembly, manejado mediante un crate de Rust (`pdf-engine`, sobre `pdfium-render`). Los dos binarios `.wasm` y el código del worker se empaquetan en un solo string al construir la librería (`scripts/build-pdfium-worker.mjs`) y se cargan como un chunk diferido la primera vez que arranca un visor, así que no tienes que copiar archivos.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: '[src] changes', es: 'Cambia [src]' },
              detail: {
                en: 'URL is fetched; `Uint8Array` / `Blob` are read as bytes.',
                es: 'La URL se descarga; `Uint8Array` / `Blob` se leen como bytes.',
              },
            },
            {
              label: { en: 'Worker pool opens the document', es: 'El pool de workers abre el documento' },
              detail: {
                en: '`renderPoolSize` workers (default 2, clamped 1–4 and to CPU cores); each parses its own copy.',
                es: '`renderPoolSize` workers (por defecto 2, entre 1 y 4 y sin pasar de los núcleos); cada uno parsea su propia copia.',
              },
            },
            {
              label: { en: 'Visible pages are rasterized', es: 'Se rasterizan las páginas visibles' },
              detail: {
                en: 'Renders go to the least busy worker; reads (text, outline, links) go to the first one.',
                es: 'Los renders van al worker menos ocupado; las lecturas (texto, índice, enlaces) van al primero.',
              },
            },
            {
              label: { en: 'ImageBitmap is transferred back', es: 'Se transfiere un ImageBitmap de vuelta' },
              detail: {
                en: 'Zero-copy transfer to the main thread, drawn on a canvas and kept in an LRU cache.',
                es: 'Transferencia sin copia al hilo principal, se dibuja en un canvas y se guarda en un caché LRU.',
              },
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'There is no fallback renderer. When `Worker`, `createImageBitmap` or Blob URLs are missing (for example on the server), the viewer emits `viewerError` with code `unsupported`. Text search is different: it uses the WASM search engine and falls back to JavaScript if that engine cannot load.',
            es: 'No hay renderizador alternativo. Si faltan `Worker`, `createImageBitmap` o las Blob URLs (por ejemplo en el servidor), el visor emite `viewerError` con el código `unsupported`. La búsqueda de texto es distinta: usa el motor de búsqueda WASM y recurre a JavaScript si ese motor no carga.',
          },
        },
      ],
    },
    {
      id: 'controller',
      heading: { en: 'Controller, state and events', es: 'Controlador, estado y eventos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Stable options go in `createPdfViewer({...})`; the document itself stays on `[src]` because it changes often. `viewer.state()` is a read-only signal with `page`, `numPages`, `zoom`, `loaded`, `error`, search progress and sidebar state. Navigation calls made before the view mounts are no-ops; calls that return a promise (`save()`, `addAnnotation()`, page operations) reject with "Viewer not mounted".',
            es: 'Las opciones estables van en `createPdfViewer({...})`; el documento se queda en `[src]` porque cambia a menudo. `viewer.state()` es un signal de solo lectura con `page`, `numPages`, `zoom`, `loaded`, `error`, el progreso de la búsqueda y el estado del panel lateral. Las llamadas de navegación antes de montar la vista no hacen nada; las que devuelven una promesa (`save()`, `addAnnotation()`, operaciones de páginas) se rechazan con "Viewer not mounted".',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Output', es: 'Output' },
            { en: 'When it fires', es: 'Cuándo se emite' },
          ],
          rows: [
            [
              { en: '`loaded`', es: '`loaded`' },
              {
                en: 'The document is parsed (`numPages`, `title`, `fileSize`).',
                es: 'El documento está parseado (`numPages`, `title`, `fileSize`).',
              },
            ],
            [
              { en: '`pageChange`', es: '`pageChange`' },
              { en: 'The visible page changed.', es: 'Cambió la página visible.' },
            ],
            [
              { en: '`viewerError`', es: '`viewerError`' },
              {
                en: 'Load failure or a failed operation; `code` is one of `load_failed`, `invalid_pdf`, `password_cancelled`, `render_failed`, `unsupported`, `unknown`.',
                es: 'Falla de carga o de una operación; `code` es `load_failed`, `invalid_pdf`, `password_cancelled`, `render_failed`, `unsupported` o `unknown`.',
              },
            ],
            [
              { en: '`dirtyChange`', es: '`dirtyChange`' },
              { en: 'The document gained or lost unsaved edits.', es: 'El documento ganó o perdió cambios sin guardar.' },
            ],
            [
              { en: '`pagesChange`', es: '`pagesChange`' },
              { en: 'The page count changed after an insert or delete.', es: 'Cambió el número de páginas tras insertar o borrar.' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Encrypted files: pass `password`, or handle `onPasswordRequired(callback)` to ask the user. `[(formValues)]` is a two-way binding of the AcroForm field values keyed by field name. The toolbar text comes from `HK_PDF_LABELS` (see [provideHkPdfLabels](/api/provideHkPdfLabels)), and `<ng-template hkPdfToolbar>` replaces the toolbar with your own.',
            es: 'Archivos cifrados: pasa `password`, o maneja `onPasswordRequired(callback)` para pedirla al usuario. `[(formValues)]` es un enlace bidireccional de los valores de los campos AcroForm, por nombre de campo. Los textos de la barra vienen de `HK_PDF_LABELS` (ver [provideHkPdfLabels](/api/provideHkPdfLabels)), y `<ng-template hkPdfToolbar>` reemplaza la barra por la tuya.',
          },
        },
      ],
    },
    {
      id: 'editing',
      heading: { en: 'Editing, saving and signing', es: 'Edición, guardado y firma' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'PDFium only reads and paints; the workers never modify their copy. Edits (annotations, form values, page moves, rotations, inserts, deletes) live in the viewer models and are written by a PDF writer built into the library as an **incremental update** appended to the original bytes, so the cost of `save()` follows the size of the change and existing digital signatures stay valid.',
            es: 'PDFium solo lee y pinta; los workers nunca modifican su copia. Las ediciones (anotaciones, valores de formulario, mover, rotar, insertar y borrar páginas) viven en los modelos del visor y las escribe el escritor PDF propio de la librería como una **actualización incremental** añadida a los bytes originales, así que el costo de `save()` depende del tamaño del cambio y las firmas digitales existentes siguen siendo válidas.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Annotation tools: text markup (`highlight`, `underline`, `strikeout`, `squiggly`), shapes, `ink`, `freetext`, `note`, `stamp`, `link` and measurements (`distance`, `perimeter`, `area`, `radius`, `volume`). `annotationMode` limits users to `review` or `view`.',
              es: 'Herramientas de anotación: marcado de texto (`highlight`, `underline`, `strikeout`, `squiggly`), figuras, `ink`, `freetext`, `note`, `stamp`, `link` y medidas (`distance`, `perimeter`, `area`, `radius`, `volume`). `annotationMode` limita a los usuarios a `review` o `view`.',
            },
            {
              en: "Import and export: `exportAnnotations('xfdf' | 'json')`, `importAnnotations()`, and form data as JSON, XFDF or FDF.",
              es: "Importar y exportar: `exportAnnotations('xfdf' | 'json')`, `importAnnotations()`, y los datos del formulario como JSON, XFDF o FDF.",
            },
            {
              en: 'Pages: `rotatePages`, `deletePages`, `duplicatePages`, `movePages`, `importPages` and `extractPages`; each is one undo step together with annotation edits.',
              es: 'Páginas: `rotatePages`, `deletePages`, `duplicatePages`, `movePages`, `importPages` y `extractPages`; cada una es un paso de deshacer junto con las anotaciones.',
            },
            {
              en: 'Digital signatures: set `signer` (a [PdfSigner](/api/PdfSigner), for example from [createWebCryptoSigner](/api/createWebCryptoSigner)) and call `signDigitally()`; the default sub-filter is `ETSI.CAdES.detached`. Existing signatures are validated and listed with `getSignatures()`.',
              es: 'Firmas digitales: define `signer` (un [PdfSigner](/api/PdfSigner), por ejemplo de [createWebCryptoSigner](/api/createWebCryptoSigner)) y llama `signDigitally()`; el sub-filtro por defecto es `ETSI.CAdES.detached`. Las firmas existentes se validan y se listan con `getSignatures()`.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Save and upload',
          code: `async upload(): Promise<void> {
  const bytes = await this.viewer.save(); // Uint8Array with every pending edit
  await fetch('/api/documents/42', { method: 'PUT', body: new Blob([bytes.slice()], { type: 'application/pdf' }) });
}`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Characters the standard PDF fonts cannot show (Greek, Cyrillic, CJK) need a TrueType font in `fonts`; a subset is embedded on save. Without it, annotations show `?` for those characters.',
            es: 'Los caracteres que las fuentes PDF estándar no pueden mostrar (griego, cirílico, CJK) necesitan una fuente TrueType en `fonts`; se incrusta un subconjunto al guardar. Sin ella, las anotaciones muestran `?` en esos caracteres.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'PageDown / ArrowRight / Space',
        action: {
          en: 'Next page (arrows and Space only when focus is not on a button, link or tab)',
          es: 'Página siguiente (flechas y Space solo si el foco no está en un botón, enlace o pestaña)',
        },
      },
      { keys: 'PageUp / ArrowLeft', action: { en: 'Previous page', es: 'Página anterior' } },
      { keys: 'Home / End', action: { en: 'First / last page', es: 'Primera / última página' } },
      { keys: 'Ctrl/Cmd + + (or =) / Ctrl/Cmd + -', action: { en: 'Zoom in / zoom out', es: 'Ampliar / reducir' } },
      { keys: 'Ctrl/Cmd + 0', action: { en: 'Reset zoom', es: 'Restablecer el zoom' } },
      { keys: 'Ctrl/Cmd + F', action: { en: 'Open the find bar', es: 'Abrir la barra de búsqueda' } },
      {
        keys: 'Escape',
        action: {
          en: 'Close the find bar, leave the active tool, then clear the selection',
          es: 'Cerrar la barra de búsqueda, salir de la herramienta activa y luego quitar la selección',
        },
      },
      { keys: 'Ctrl/Cmd + Z', action: { en: 'Undo the last edit', es: 'Deshacer la última edición' } },
      { keys: 'Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y', action: { en: 'Redo', es: 'Rehacer' } },
      { keys: 'Delete / Backspace', action: { en: 'Delete the selected annotation', es: 'Borrar la anotación seleccionada' } },
      {
        keys: 'Enter / Backspace (while drawing)',
        action: { en: 'Finish a polygon / drop its last vertex', es: 'Terminar un polígono / quitar su último vértice' },
      },
      {
        keys: 'Ctrl/Cmd + C / X / V',
        action: {
          en: 'Copy, cut or paste the selected annotation (when no text is selected)',
          es: 'Copiar, cortar o pegar la anotación seleccionada (si no hay texto seleccionado)',
        },
      },
    ],
    notes: [
      {
        en: 'The viewer host is focusable (`tabindex="0"`), so shortcuts work after one click on the chrome. Keys typed in inputs, selects and editable content are left alone.',
        es: 'El host del visor es enfocable (`tabindex="0"`), así que los atajos funcionan tras un clic en la interfaz. Las teclas escritas en inputs, selects y contenido editable no se interceptan.',
      },
      {
        en: 'Each page is a labelled `region` inside a `document`; the find bar announces its match count through a polite live region, and load errors use `role="alert"`.',
        es: 'Cada página es una `region` con etiqueta dentro de un `document`; la barra de búsqueda anuncia el número de coincidencias con una región viva educada, y los errores de carga usan `role="alert"`.',
      },
      {
        en: 'Pages are painted as images with a text layer on top for selection and search. For content that must be accessible to everyone, also offer the text (`exportText()`) or an accessible version of the document.',
        es: 'Las páginas se pintan como imágenes con una capa de texto encima para seleccionar y buscar. Para contenido que debe ser accesible para todos, ofrece también el texto (`exportText()`) o una versión accesible del documento.',
      },
      {
        en: 'Links inside the PDF only open `http:`, `https:`, `mailto:` and `tel:` URIs; `javascript:` and other schemes are dropped.',
        es: 'Los enlaces dentro del PDF solo abren URIs `http:`, `https:`, `mailto:` y `tel:`; `javascript:` y otros esquemas se descartan.',
      },
    ],
  },
  performance: [
    {
      en: 'The PDFium worker chunk is large and lazy: it downloads the first time a viewer starts (the component warms it in `ngOnInit`), never with your initial bundle.',
      es: 'El chunk del worker de PDFium es grande y diferido: se descarga la primera vez que arranca un visor (el componente lo precalienta en `ngOnInit`), nunca con tu bundle inicial.',
    },
    {
      en: '`renderPoolSize` trades memory for speed: every worker holds its own parsed copy of the document. Use `1` on memory-constrained devices.',
      es: '`renderPoolSize` cambia memoria por velocidad: cada worker guarda su propia copia parseada del documento. Usa `1` en dispositivos con poca memoria.',
    },
    {
      en: 'Rendered pages are kept in an LRU cache bounded by bytes (`bitmapCacheMB`; by default 96 MB on devices reporting 4 GB or less, 256 MB otherwise), so scrolling back does not re-render.',
      es: 'Las páginas renderizadas se guardan en un caché LRU limitado por bytes (`bitmapCacheMB`; por defecto 96 MB en equipos que reportan 4 GB o menos, 256 MB en los demás), así que volver atrás no vuelve a renderizar.',
    },
    {
      en: 'Each worker runs one task at a time by priority, and renders for pages that scrolled out of view are cancelled before they start.',
      es: 'Cada worker ejecuta una tarea a la vez por prioridad, y los renders de páginas que salieron de la vista se cancelan antes de empezar.',
    },
  ],
  related: [
    {
      id: 'document-viewer',
      note: { en: 'Many formats in one viewer; PDFs are delegated here.', es: 'Muchos formatos en un visor; los PDFs se delegan aquí.' },
    },
    {
      id: 'architecture-documents',
      note: {
        en: 'How the PDFium workers are built, inlined and released.',
        es: 'Cómo se construyen, incrustan y liberan los workers de PDFium.',
      },
    },
    {
      id: 'builders',
      note: {
        en: 'The create*() + controller pattern used by createPdfViewer.',
        es: 'El patrón create*() + controlador que usa createPdfViewer.',
      },
    },
    {
      id: 'guide-document-viewer-integration',
      note: {
        en: 'Uploads, errors and keeping WASM off pages that do not need it.',
        es: 'Subidas, errores y cómo mantener el WASM fuera de páginas que no lo necesitan.',
      },
    },
  ],
};

export default content;
