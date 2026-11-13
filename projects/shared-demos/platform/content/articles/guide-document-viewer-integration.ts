import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: let users preview the files they pick or the files your API serves, in whatever format they come, without paying for the heavy decoders on pages that never show a document. One component, [DocumentViewerComponent](/api/DocumentViewerComponent), detects the format and hands the file to the matching renderer.',
      es: 'Meta: que los usuarios puedan previsualizar los archivos que escogen o los que sirve tu API, en el formato que vengan, sin pagar por los decodificadores pesados en páginas que nunca muestran un documento. Un solo componente, [DocumentViewerComponent](/api/DocumentViewerComponent), detecta el formato y le pasa el archivo al renderizador correspondiente.',
    },
  ],
  sections: [
    {
      id: 'step-1-basic',
      heading: { en: '1. Show a file', es: '1. Muestra un archivo' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`src` accepts a URL string, a `Uint8Array`, or a `Blob` (a `File` from an input is a `Blob`). URLs are fetched with `fetch()`, so cross-origin files need CORS.',
            es: '`src` acepta un string con URL, un `Uint8Array` o un `Blob` (un `File` de un input es un `Blob`). Las URLs se descargan con `fetch()`, así que los archivos de otro origen necesitan CORS.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'file-preview.component.ts',
          code: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DocumentViewerComponent, getSupportedExtensions } from '@hakistack/ng-daisyui';

// Recognized but not rendered yet: legacy Word/OpenDocument text and presentations.
const NOT_RENDERED = ['.doc', '.odt', '.ppt', '.pptx', '.odp'];

@Component({
  selector: 'app-file-preview',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './file-preview.component.html',
})
export class FilePreviewComponent {
  readonly accept = getSupportedExtensions()
    .filter((ext) => !NOT_RENDERED.includes(ext))
    .join(',');
  readonly file = signal<File | null>(null);

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }
}`,
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'file-preview.component.html',
          code: `<label class="label" for="preview-file">Choose a file</label>
<input id="preview-file" type="file" class="file-input" [accept]="accept" (change)="onPick($event)" />

@if (file(); as f) {
  <hk-document-viewer [src]="f" [config]="{ filename: f.name }" />
}`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: '[getSupportedExtensions](/api/getSupportedExtensions) lists every extension the viewer recognizes, including `.doc`, `.odt` and presentation formats that currently fall through to the “unsupported” view. Filter them out for a file picker, as above.',
            es: '[getSupportedExtensions](/api/getSupportedExtensions) lista todas las extensiones que el visor reconoce, incluyendo `.doc`, `.odt` y formatos de presentación que hoy terminan en la vista de “no soportado”. Fíltralas para un selector de archivos, como arriba.',
          },
        },
      ],
    },
    {
      id: 'step-2-detection',
      heading: { en: '2. Help the format detection', es: '2. Ayuda a la detección del formato' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The format comes from, in order: `config.mimeType`, `config.filename`, the URL extension, and the `Blob` type. When your API serves files from URLs without an extension (for example `/files/123`), pass a hint:',
            es: 'El formato sale de, en orden: `config.mimeType`, `config.filename`, la extensión de la URL y el tipo del `Blob`. Cuando tu API sirve archivos desde URLs sin extensión (por ejemplo `/files/123`), pasa una pista:',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<hk-document-viewer [src]="'/api/files/123'" [config]="{ filename: 'q3-report.xlsx' }" />`,
        },
      ],
    },
    {
      id: 'step-3-formats',
      heading: { en: '3. Formats and what they need', es: '3. Formatos y lo que necesitan' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Format', es: 'Formato' },
            { en: 'Extensions', es: 'Extensiones' },
            { en: 'Rendered with', es: 'Se dibuja con' },
          ],
          rows: [
            [
              { en: 'PDF', es: 'PDF' },
              { en: '`.pdf`', es: '`.pdf`' },
              { en: 'The [PDF viewer](/pdf-viewer) (PDFium in a worker)', es: 'El [visor PDF](/pdf-viewer) (PDFium en un worker)' },
            ],
            [
              { en: 'Spreadsheet', es: 'Hoja de cálculo' },
              { en: '`.xlsx` `.xls` `.xlsb` `.xlsm` `.ods`', es: '`.xlsx` `.xls` `.xlsb` `.xlsm` `.ods`' },
              { en: 'Built-in WASM parser', es: 'Parser WASM integrado' },
            ],
            [
              { en: 'Word', es: 'Word' },
              { en: '`.docx`', es: '`.docx`' },
              { en: 'Optional peer `docx-preview`', es: 'Peer opcional `docx-preview`' },
            ],
            [
              { en: 'Rich text', es: 'Texto enriquecido' },
              { en: '`.rtf`', es: '`.rtf`' },
              { en: 'Built-in parser', es: 'Parser integrado' },
            ],
            [
              { en: 'Text', es: 'Texto' },
              { en: '`.txt` `.md` `.csv` `.json` `.log`', es: '`.txt` `.md` `.csv` `.json` `.log`' },
              { en: 'Built-in', es: 'Integrado' },
            ],
            [
              { en: 'HTML', es: 'HTML' },
              { en: '`.html` `.htm`', es: '`.html` `.htm`' },
              {
                en: 'Sandboxed iframe, sanitized with the optional peer `dompurify`',
                es: 'Iframe con sandbox, sanitizado con el peer opcional `dompurify`',
              },
            ],
            [
              { en: 'Images', es: 'Imágenes' },
              {
                en: '`.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` `.svg` `.ico` `.avif`',
                es: '`.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` `.svg` `.ico` `.avif`',
              },
              { en: 'Native `<img>`', es: '`<img>` nativo' },
            ],
            [
              { en: 'Special images', es: 'Imágenes especiales' },
              { en: '`.tiff` `.tif` `.heic` `.heif`', es: '`.tiff` `.tif` `.heic` `.heif`' },
              {
                en: 'TIFF: built-in WASM. HEIC: a bundled libheif build when present, otherwise the optional peer `heic2any`',
                es: 'TIFF: WASM integrado. HEIC: un build de libheif incluido cuando existe, si no el peer opcional `heic2any`',
              },
            ],
            [
              { en: 'Email', es: 'Correo' },
              { en: '`.eml` `.msg`', es: '`.eml` `.msg`' },
              { en: 'Optional peers `postal-mime` / `@kenjiuno/msgreader`', es: 'Peers opcionales `postal-mime` / `@kenjiuno/msgreader`' },
            ],
            [
              { en: 'E-book', es: 'Libro electrónico' },
              { en: '`.epub`', es: '`.epub`' },
              { en: 'Optional peer `foliate-js`', es: 'Peer opcional `foliate-js`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Install only the peers for formats you accept. If one is missing, that renderer shows an error naming the package to install; the rest of the app is unaffected. Without `dompurify`, HTML still renders in the sandboxed iframe and a console warning is logged.',
            es: 'Instala solo los peers de los formatos que aceptas. Si falta uno, ese renderizador muestra un error con el nombre del paquete a instalar; el resto de la app no se afecta. Sin `dompurify`, el HTML igual se dibuja en el iframe con sandbox y se registra una advertencia en la consola.',
          },
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `npm install docx-preview dompurify postal-mime @kenjiuno/msgreader foliate-js heic2any`,
        },
      ],
    },
    {
      id: 'step-4-errors',
      heading: { en: '4. Loading and errors', es: '4. Carga y errores' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The viewer has no loading or error outputs: each renderer shows its own progress and error message inside the viewer, and unknown formats get a neutral “unsupported” panel with the file name and type. If you need to control the failure path yourself (retry, custom message, auth headers), download the bytes first and pass them in.',
            es: 'El visor no tiene outputs de carga ni de error: cada renderizador muestra su propio progreso y su mensaje de error dentro del visor, y los formatos desconocidos reciben un panel neutral de “no soportado” con el nombre y el tipo del archivo. Si necesitas controlar tú el camino de error (reintentar, mensaje propio, headers de autenticación), descarga los bytes primero y pásalos.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { DocumentViewerComponent } from '@hakistack/ng-daisyui';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-attachment',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @if (loadError(); as message) {
      <div role="alert" class="alert alert-error">{{ message }}</div>
    } @else if (blob(); as b) {
      <hk-document-viewer [src]="b" [config]="{ filename: filename() }" />
    }
  \`,
})
export class AttachmentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly fileId = input.required<string>();
  readonly filename = input.required<string>();
  readonly blob = signal<Blob | null>(null);
  readonly loadError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      // HttpClient applies your interceptors (auth headers, etc.)
      const url = \`/api/files/\${this.fileId()}\`;
      this.blob.set(await firstValueFrom(this.http.get(url, { responseType: 'blob' })));
    } catch {
      this.loadError.set('The file could not be downloaded.');
    }
  }
}`,
        },
      ],
    },
    {
      id: 'step-5-lazy',
      heading: { en: '5. Keep it off pages that do not need it', es: '5. Déjalo fuera de páginas que no lo necesitan' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Decoders already load on demand: the WASM modules, the PDFium worker and the optional peers are dynamic imports that run only when a file of that format opens. The renderer components themselves, including the PDF viewer, are imported by `DocumentViewerComponent`, so put the viewer behind a lazy route or a `@defer` block.',
            es: 'Los decodificadores ya se cargan bajo demanda: los módulos WASM, el worker de PDFium y los peers opcionales son imports dinámicos que solo corren cuando se abre un archivo de ese formato. Los componentes renderizadores, incluido el visor PDF, los importa `DocumentViewerComponent`, así que pon el visor detrás de una ruta lazy o de un bloque `@defer`.',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          code: `@defer (on interaction) {
  <hk-document-viewer [src]="file" />
} @placeholder {
  <button type="button" class="btn">Preview</button>
}`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'WASM binaries are embedded in lazy chunks by default, so no asset copying is needed. To serve them as separate cacheable files instead, use [provideDocumentEngineWasmUrl](/api/provideDocumentEngineWasmUrl) and [provideImageEngineWasmUrl](/api/provideImageEngineWasmUrl). The PDF worker is created from a `blob:` URL; a strict Content Security Policy must allow `worker-src blob:`.',
            es: 'Por defecto los binarios WASM van incrustados en chunks lazy, así que no hace falta copiar assets. Para servirlos como archivos separados y cacheables, usa [provideDocumentEngineWasmUrl](/api/provideDocumentEngineWasmUrl) y [provideImageEngineWasmUrl](/api/provideImageEngineWasmUrl). El worker de PDF se crea desde una URL `blob:`; una Content Security Policy estricta debe permitir `worker-src blob:`.',
          },
        },
      ],
    },
    {
      id: 'step-6-custom',
      heading: { en: '6. Replace or add a renderer', es: '6. Reemplaza o añade un renderizador' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Pass your own standalone component in `config.renderers` ([DocumentViewerConfig](/api/DocumentViewerConfig)). Your registrations are checked before the built-ins, so you can override one format without forking. Your component receives `source`, `format` and `filename` inputs ([DocumentRendererInputs](/api/DocumentRendererInputs)); [loadSourceAsBytes](/api/loadSourceAsBytes) turns any source into bytes.',
            es: 'Pasa tu propio componente standalone en `config.renderers` ([DocumentViewerConfig](/api/DocumentViewerConfig)). Tus registros se revisan antes que los integrados, así que puedes reemplazar un formato sin hacer fork. Tu componente recibe los inputs `source`, `format` y `filename` ([DocumentRendererInputs](/api/DocumentRendererInputs)); [loadSourceAsBytes](/api/loadSourceAsBytes) convierte cualquier fuente en bytes.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'document-viewer', note: { en: 'Live examples for every format.', es: 'Ejemplos en vivo de cada formato.' } },
    {
      id: 'architecture-documents',
      note: {
        en: 'Renderer registry and format detection in depth.',
        es: 'El registro de renderizadores y la detección de formato a fondo.',
      },
    },
    { id: 'guide-bundle-size', note: { en: 'What else is lazy-loaded.', es: 'Qué más se carga de forma diferida.' } },
  ],
};

export default content;
