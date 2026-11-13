import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-document-viewer` is one component for many file types. You give it a file (URL, `Uint8Array`, `Blob` or `File`) and it figures out the format from the name or MIME type, then hands the file to the right renderer: a table for spreadsheets, a page view for Word, a header card for e-mails, a reader for e-books, an image, or the PDF viewer.',
      es: '`hk-document-viewer` es un solo componente para muchos tipos de archivo. Le das un archivo (URL, `Uint8Array`, `Blob` o `File`) y averigua el formato por el nombre o el tipo MIME; luego le pasa el archivo al renderizador correcto: una tabla para hojas de cálculo, una vista de páginas para Word, una tarjeta de encabezados para correos, un lector para e-books, una imagen o el visor de PDF.',
    },
    {
      en: 'Heavy formats load their code only when such a file is opened: spreadsheets are parsed by a Rust/WASM bundle (calamine), TIFF by another WASM bundle, and Word, e-mail and e-book files by optional npm packages you install only if you need them. Formats with no renderer show a clear "unsupported" card instead of failing.',
      es: 'Los formatos pesados cargan su código solo cuando se abre un archivo de ese tipo: las hojas de cálculo las parsea un bundle Rust/WASM (calamine), los TIFF otro bundle WASM, y los archivos de Word, correo y e-book paquetes npm opcionales que instalas solo si los necesitas. Los formatos sin renderizador muestran una tarjeta clara de "no soportado" en vez de fallar.',
    },
  ],
  whenToUse: [
    {
      en: 'Users upload or receive files of mixed types and you want one preview area for all of them.',
      es: 'Los usuarios suben o reciben archivos de tipos mezclados y quieres un solo espacio de vista previa para todos.',
    },
    {
      en: 'You need to show spreadsheets (`.xlsx`, `.xls`, `.xlsb`, `.xlsm`, `.ods`) without a server-side conversion.',
      es: 'Necesitas mostrar hojas de cálculo (`.xlsx`, `.xls`, `.xlsb`, `.xlsm`, `.ods`) sin conversión en el servidor.',
    },
    {
      en: 'A case file or inbox holds many documents: `hk-document-workspace` lists them, shows sections and properties, and opens PDFs in the PDF workspace.',
      es: 'Un expediente o bandeja contiene muchos documentos: `hk-document-workspace` los lista, muestra secciones y propiedades, y abre los PDFs en el workspace de PDF.',
    },
    {
      en: 'You want to replace one format renderer with your own without forking: register it in `config.renderers`.',
      es: 'Quieres reemplazar el renderizador de un formato por uno propio sin hacer fork: regístralo en `config.renderers`.',
    },
  ],
  whenNotToUse: [
    {
      en: 'You only show PDFs and need the controller API (search, annotations, save): use [hk-pdf-viewer](/pdf-viewer) directly. The PDF renderer here creates its own default controller you cannot reach.',
      es: 'Solo muestras PDFs y necesitas la API del controlador (búsqueda, anotaciones, guardar): usa [hk-pdf-viewer](/pdf-viewer) directamente. El renderizador PDF de aquí crea su propio controlador por defecto, que no puedes alcanzar.',
    },
    {
      en: 'You need `.doc`, `.odt`, `.pptx`, `.ppt` or `.odp`: they are detected but have no renderer yet and show the unsupported card.',
      es: 'Necesitas `.doc`, `.odt`, `.pptx`, `.ppt` u `.odp`: se detectan pero aún no tienen renderizador y muestran la tarjeta de no soportado.',
    },
    {
      en: 'You need pixel-perfect Word or RTF output: DOCX goes through `docx-preview` and RTF through a small text extractor (bold, italic, underline, paragraphs; no tables, images or fonts).',
      es: 'Necesitas Word o RTF idéntico al original: DOCX pasa por `docx-preview` y RTF por un extractor de texto pequeño (negrita, cursiva, subrayado, párrafos; sin tablas, imágenes ni fuentes).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DocumentViewerComponent, getSupportedExtensions, type DocumentSource, type DocumentViewerConfig } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-file-preview',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <label class="label" for="file-preview-input">Choose a file</label>
    <input id="file-preview-input" type="file" class="file-input" [attr.accept]="accept" (change)="onPick($event)" />

    <div class="mt-4 h-[70vh] overflow-auto">
      <hk-document-viewer [src]="source()" [config]="config()" />
    </div>
  \`,
})
export class FilePreviewComponent {
  /** Every extension the format detector knows, ready for the accept attribute. */
  readonly accept = getSupportedExtensions().join(',');

  /** Start with a small text file built in code; replace it with whatever the user picks. */
  readonly source = signal<DocumentSource>(new Blob(['Hello from hk-document-viewer.'], { type: 'text/plain' }));
  readonly config = signal<DocumentViewerConfig>({ filename: 'hello.txt' });

  onPick(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.source.set(file);
    this.config.set({ filename: file.name, mimeType: file.type || undefined });
  }
}
`,
    note: {
      en: 'Passing `filename` matters for `Blob` and `Uint8Array` sources: bytes are not sniffed, so without a name or MIME type the format is `unknown`. A `File` already carries its name.',
      es: 'Pasar `filename` importa con fuentes `Blob` y `Uint8Array`: los bytes no se inspeccionan, así que sin nombre ni tipo MIME el formato es `unknown`. Un `File` ya trae su nombre.',
    },
  },
  technical: [
    {
      id: 'dispatch',
      heading: { en: 'Format detection and dispatch', es: 'Detección de formato y despacho' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Source + hints', es: 'Fuente + pistas' },
              detail: {
                en: '`[src]` plus optional `config.mimeType` and `config.filename`.',
                es: '`[src]` más `config.mimeType` y `config.filename` opcionales.',
              },
            },
            {
              label: { en: 'resolveFormat()', es: 'resolveFormat()' },
              detail: {
                en: 'Order: MIME hint, filename extension, URL extension (query and hash stripped), then `Blob.type`.',
                es: 'Orden: pista MIME, extensión del filename, extensión de la URL (sin query ni hash) y luego `Blob.type`.',
              },
            },
            {
              label: { en: 'Renderer registry', es: 'Registro de renderizadores' },
              detail: {
                en: 'Your `config.renderers` first, then the built-ins; first entry claiming the format wins.',
                es: 'Primero tus `config.renderers`, luego los integrados; gana la primera entrada que reclame el formato.',
              },
            },
            {
              label: { en: 'Renderer loads bytes', es: 'El renderizador carga los bytes' },
              detail: {
                en: '`loadSourceAsBytes()` fetches URLs or unwraps Blobs, then parses with its engine.',
                es: '`loadSourceAsBytes()` descarga URLs o lee Blobs, y luego parsea con su motor.',
              },
            },
          ],
        },
        {
          kind: 'table',
          head: [
            { en: 'Format key', es: 'Clave de formato' },
            { en: 'Extensions', es: 'Extensiones' },
            { en: 'Rendered by', es: 'Lo renderiza' },
          ],
          rows: [
            [
              { en: '`pdf`', es: '`pdf`' },
              { en: '.pdf', es: '.pdf' },
              { en: '`hk-pdf-viewer` (PDFium WASM in workers)', es: '`hk-pdf-viewer` (PDFium WASM en workers)' },
            ],
            [
              { en: '`spreadsheet`', es: '`spreadsheet`' },
              { en: '.xlsx .xls .xlsb .xlsm .ods', es: '.xlsx .xls .xlsb .xlsm .ods' },
              {
                en: 'calamine (`document_wasm`) into `hk-table`, one tab per sheet',
                es: 'calamine (`document_wasm`) hacia `hk-table`, una pestaña por hoja',
              },
            ],
            [
              { en: '`docx`', es: '`docx`' },
              { en: '.docx', es: '.docx' },
              { en: '`docx-preview` (optional peer)', es: '`docx-preview` (peer opcional)' },
            ],
            [
              { en: '`rtf`', es: '`rtf`' },
              { en: '.rtf', es: '.rtf' },
              { en: 'Built-in text extractor, no dependency', es: 'Extractor de texto integrado, sin dependencias' },
            ],
            [
              { en: '`text`', es: '`text`' },
              { en: '.txt .md .csv .log .json', es: '.txt .md .csv .log .json' },
              { en: 'Preformatted text; UTF-8 with a Latin-1 fallback', es: 'Texto preformateado; UTF-8 con alternativa Latin-1' },
            ],
            [
              { en: '`html`', es: '`html`' },
              { en: '.html .htm', es: '.html .htm' },
              {
                en: 'Iframe with `sandbox=""`, plus DOMPurify when installed',
                es: 'Iframe con `sandbox=""`, más DOMPurify si está instalado',
              },
            ],
            [
              { en: '`eml` / `msg`', es: '`eml` / `msg`' },
              { en: '.eml / .msg', es: '.eml / .msg' },
              {
                en: '`postal-mime` / `@kenjiuno/msgreader` (optional peers)',
                es: '`postal-mime` / `@kenjiuno/msgreader` (peers opcionales)',
              },
            ],
            [
              { en: '`epub`', es: '`epub`' },
              { en: '.epub', es: '.epub' },
              { en: '`foliate-js` (optional peer)', es: '`foliate-js` (peer opcional)' },
            ],
            [
              { en: '`image`', es: '`image`' },
              { en: '.png .jpg .jpeg .gif .webp .bmp .svg .ico .avif', es: '.png .jpg .jpeg .gif .webp .bmp .svg .ico .avif' },
              { en: 'Native `<img>`', es: '`<img>` nativo' },
            ],
            [
              { en: '`image-special`', es: '`image-special`' },
              { en: '.tiff .tif .heic .heif', es: '.tiff .tif .heic .heif' },
              {
                en: 'TIFF: Rust `image` crate (`image_wasm`). HEIC: in-tree libheif build if present, else `heic2any` (optional peer)',
                es: 'TIFF: crate `image` de Rust (`image_wasm`). HEIC: build de libheif propio si existe, si no `heic2any` (peer opcional)',
              },
            ],
            [
              { en: '`doc-legacy` / `presentation` / `unknown`', es: '`doc-legacy` / `presentation` / `unknown`' },
              { en: '.doc .odt / .pptx .ppt .odp / anything else', es: '.doc .odt / .pptx .ppt .odp / cualquier otro' },
              { en: 'Unsupported card (name, extension, MIME)', es: 'Tarjeta de no soportado (nombre, extensión, MIME)' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'For a file picker, `getSupportedExtensions()` lists every known extension (including ones that end in the unsupported card); `getRenderableExtensions(registrations)` keeps only formats with a renderer.',
            es: 'Para un selector de archivos, `getSupportedExtensions()` lista todas las extensiones conocidas (incluidas las que terminan en la tarjeta de no soportado); `getRenderableExtensions(registrations)` deja solo los formatos con renderizador.',
          },
        },
      ],
    },
    {
      id: 'custom-renderers',
      heading: { en: 'Custom renderers', es: 'Renderizadores propios' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A renderer is a standalone component with three required inputs: `source`, `format` and `filename` (see [DocumentRendererInputs](/api/DocumentRendererInputs)). Register it for one or more format keys; it wins over the built-in for those keys. Renderers that inject [DocumentViewerHost](/api/DocumentViewerHost) optionally can publish sections and metadata for the workspace.',
            es: 'Un renderizador es un componente standalone con tres inputs requeridos: `source`, `format` y `filename` (ver [DocumentRendererInputs](/api/DocumentRendererInputs)). Regístralo para una o más claves de formato; le gana al integrado en esas claves. Los renderizadores que inyectan [DocumentViewerHost](/api/DocumentViewerHost) de forma opcional pueden publicar secciones y metadatos para el workspace.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `readonly config: DocumentViewerConfig = {
  filename: 'proposal.docx',
  renderers: [{ formats: ['docx'], component: MyDocxRenderer }],
};
// <hk-document-viewer [src]="file()" [config]="config" />`,
        },
      ],
    },
    {
      id: 'states',
      heading: { en: 'Loading, errors and missing packages', es: 'Carga, errores y paquetes faltantes' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each renderer keeps its own loading and error signals and shows a DaisyUI alert with the message. When an optional peer is not installed, the dynamic `import()` fails and the alert says which package to install (for example `npm install @kenjiuno/msgreader`). A URL that answers with a non-2xx status becomes an error such as "Failed to fetch document (HTTP 404)". The viewer has no error output; validate files before passing them if you need to react in code.',
            es: 'Cada renderizador tiene sus propios signals de carga y error y muestra una alerta de DaisyUI con el mensaje. Si un peer opcional no está instalado, el `import()` dinámico falla y la alerta dice qué paquete instalar (por ejemplo `npm install @kenjiuno/msgreader`). Una URL que responde con un estado distinto de 2xx se convierte en un error como "Failed to fetch document (HTTP 404)". El visor no tiene output de error; valida los archivos antes de pasarlos si necesitas reaccionar en código.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Cross-origin URLs are fetched with plain `fetch()`, so the server must send CORS headers. If it cannot, download the file yourself and pass the `Blob` with a `filename`.',
            es: 'Las URLs de otro origen se descargan con `fetch()` simple, así que el servidor debe enviar cabeceras CORS. Si no puede, descarga el archivo tú y pasa el `Blob` con un `filename`.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab',
        action: {
          en: 'Move between sheet tabs, the Edit button and the renderer content',
          es: 'Moverse entre las pestañas de hojas, el botón Editar y el contenido del renderizador',
        },
      },
      { keys: 'Enter / Space', action: { en: 'Activate the focused sheet tab', es: 'Activar la pestaña de hoja enfocada' } },
      {
        keys: 'ArrowLeft / ArrowRight (workspace strip)',
        action: { en: 'Previous / next section in `hk-document-workspace`', es: 'Sección anterior / siguiente en `hk-document-workspace`' },
      },
      { keys: 'Home / End (workspace strip)', action: { en: 'First / last section', es: 'Primera / última sección' } },
    ],
    notes: [
      {
        en: 'Spreadsheet sheets are `role="tab"` buttons with `aria-selected`; the cells inherit the keyboard support of `hk-table`. PDFs get the full keyboard model of the [PDF Viewer](/pdf-viewer).',
        es: 'Las hojas del libro son botones `role="tab"` con `aria-selected`; las celdas heredan el soporte de teclado de `hk-table`. Los PDFs tienen el modelo de teclado completo del [Visor de PDF](/pdf-viewer).',
      },
      {
        en: 'Images use the file name as `alt` text (or "image"). If the image carries meaning, describe it next to the viewer as well.',
        es: 'Las imágenes usan el nombre del archivo como texto `alt` (o "image"). Si la imagen transmite información, descríbela también junto al visor.',
      },
      {
        en: 'HTML and e-mail bodies render inside sandboxed iframes; their internal accessibility depends on the document itself.',
        es: 'El HTML y el cuerpo de los correos se muestran en iframes con sandbox; su accesibilidad interna depende del propio documento.',
      },
    ],
  },
  performance: [
    {
      en: 'Every WASM bundle and optional package is loaded with a dynamic `import()` on first use of its format; a page that only shows images never downloads calamine or PDFium.',
      es: 'Cada bundle WASM y paquete opcional se carga con un `import()` dinámico la primera vez que se usa su formato; una página que solo muestra imágenes nunca descarga calamine ni PDFium.',
    },
    {
      en: 'Spreadsheet parsing and TIFF decoding run on the main thread inside WASM; very large workbooks can block the page while they parse.',
      es: 'El parseo de hojas de cálculo y la decodificación de TIFF corren en el hilo principal dentro de WASM; libros muy grandes pueden bloquear la página mientras se parsean.',
    },
    {
      en: 'Object URLs created for decoded images are revoked when the renderer is destroyed or the source changes.',
      es: 'Las object URLs creadas para imágenes decodificadas se revocan cuando el renderizador se destruye o cambia la fuente.',
    },
  ],
  related: [
    {
      id: 'pdf-viewer',
      note: { en: 'The renderer used for PDFs, with its full API.', es: 'El renderizador que se usa para PDFs, con toda su API.' },
    },
    {
      id: 'document-editor',
      note: { en: 'Turn the viewer editable for text, Markdown and CSV.', es: 'Hace editable el visor para texto, Markdown y CSV.' },
    },
    {
      id: 'architecture-documents',
      note: { en: 'Registry, detection and engine loading in depth.', es: 'Registro, detección y carga de motores en detalle.' },
    },
    {
      id: 'guide-document-viewer-integration',
      note: { en: 'Step by step: uploads, errors and bundle size.', es: 'Paso a paso: subidas, errores y tamaño del bundle.' },
    },
  ],
};

export default content;
