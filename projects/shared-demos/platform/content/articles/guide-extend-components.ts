import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: change what a component draws or how it behaves without forking the library or reaching into its internals. Every extension point below is public API, covered by the same compatibility rules as the components themselves. Each section shows one complete example; pick the one that matches what you want to change.',
      es: 'Objetivo: cambiar lo que dibuja un componente o cómo se comporta sin hacer un fork de la librería ni meterte en su código interno. Cada punto de extensión de esta guía es API pública, con las mismas reglas de compatibilidad que los componentes. Cada sección muestra un ejemplo completo; elige el que corresponda a lo que quieres cambiar.',
    },
  ],
  sections: [
    {
      id: 'map',
      heading: { en: 'Which extension point to use', es: 'Qué punto de extensión usar' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'You want to…', es: 'Quieres…' },
            { en: 'Use', es: 'Usa' },
          ],
          rows: [
            [
              { en: 'Draw a table or grid cell yourself', es: 'Dibujar tú una celda de tabla o grid' },
              {
                en: '[HkCellTemplateDirective](/api/HkCellTemplateDirective) (Table), [HkDataGridCellDirective](/api/HkDataGridCellDirective) (DataGrid)',
                es: '[HkCellTemplateDirective](/api/HkCellTemplateDirective) (Table), [HkDataGridCellDirective](/api/HkDataGridCellDirective) (DataGrid)',
              },
            ],
            [
              { en: 'Add a footer row to a table', es: 'Añadir una fila de pie a una tabla' },
              { en: '[HkFooterDirective](/api/HkFooterDirective)', es: '[HkFooterDirective](/api/HkFooterDirective)' },
            ],
            [
              { en: 'Replace the PDF viewer toolbar', es: 'Reemplazar la barra del visor PDF' },
              { en: '[HkPdfToolbarDirective](/api/HkPdfToolbarDirective)', es: '[HkPdfToolbarDirective](/api/HkPdfToolbarDirective)' },
            ],
            [
              { en: 'Draw tree nodes yourself', es: 'Dibujar tú los nodos de un árbol' },
              { en: '`<ng-template #nodeTemplate>` inside `<hk-tree>`', es: '`<ng-template #nodeTemplate>` dentro de `<hk-tree>`' },
            ],
            [
              { en: 'Show a file format your way', es: 'Mostrar un formato de archivo a tu manera' },
              {
                en: '`renderers` in [DocumentViewerConfig](/api/DocumentViewerConfig)',
                es: '`renderers` en [DocumentViewerConfig](/api/DocumentViewerConfig)',
              },
            ],
            [
              { en: 'Make a format editable', es: 'Hacer editable un formato' },
              {
                en: '`editors` and `serializers` in [createDocumentEditor](/api/createDocumentEditor)',
                es: '`editors` y `serializers` en [createDocumentEditor](/api/createDocumentEditor)',
              },
            ],
            [
              { en: 'Change the text a component writes', es: 'Cambiar el texto que escribe un componente' },
              { en: '`provide*Labels()` or a `labels` input', es: '`provide*Labels()` o un input `labels`' },
            ],
            [
              { en: 'Add a value formatter', es: 'Añadir un formateador de valores' },
              { en: '[providePipes](/api/providePipes)', es: '[providePipes](/api/providePipes)' },
            ],
            [
              { en: 'Keep saved PDF signatures somewhere else', es: 'Guardar las firmas PDF en otro lugar' },
              {
                en: '[providePdfSignatureStore](/api/providePdfSignatureStore)',
                es: '[providePdfSignatureStore](/api/providePdfSignatureStore)',
              },
            ],
            [
              { en: 'Write non-Latin text into PDFs', es: 'Escribir texto no latino en PDFs' },
              {
                en: '`fonts` in the PDF viewer config or [registerPdfFont](/api/registerPdfFont)',
                es: '`fonts` en la configuración del visor PDF o [registerPdfFont](/api/registerPdfFont)',
              },
            ],
            [
              { en: 'Serve the WASM binaries as separate files', es: 'Servir los binarios WASM como archivos aparte' },
              {
                en: '`provide*WasmUrl()` (see [WASM engines](/systems/wasm-engines))',
                es: '`provide*WasmUrl()` (mira [Motores WASM](/systems/wasm-engines))',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'table-templates',
      heading: { en: 'Table cells and footers', es: 'Celdas y pies de tabla' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`hkCellTemplate="field"` replaces the content of one column; the context has the row as `$implicit` and the column definition as `column`. `hkFooter` adds a full-width row inside `<tfoot>` with the rows on screen as `$implicit` and the column definitions as `columns`. Both contexts are untyped in templates.',
            es: '`hkCellTemplate="campo"` reemplaza el contenido de una columna; el contexto trae la fila como `$implicit` y la definición de la columna como `column`. `hkFooter` añade una fila de ancho completo dentro de `<tfoot>` con las filas en pantalla como `$implicit` y las definiciones de columnas como `columns`. Ninguno de los dos contextos tiene tipos en la plantilla.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'orders.component.ts',
          code: `import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { createTable, HkCellTemplateDirective, HkFooterDirective, TableComponent } from '@hakistack/ng-daisyui';

interface Order {
  id: number;
  customer: string;
  total: number;
  status: 'open' | 'shipped';
}

@Component({
  selector: 'app-orders',
  imports: [TableComponent, HkCellTemplateDirective, HkFooterDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-table [data]="orders()" [config]="table">
      <ng-template hkCellTemplate="status" let-row>
        <span class="badge badge-sm" [class.badge-success]="row.status === 'shipped'">{{ row.status }}</span>
      </ng-template>

      <ng-template hkFooter let-rows>
        <div class="text-right text-sm">{{ rows.length }} orders on this page</div>
      </ng-template>
    </hk-table>
  \`,
})
export class OrdersComponent {
  readonly orders = input.required<Order[]>();
  readonly table = createTable<Order>({
    columns: {
      customer: { header: 'Customer' },
      total: { header: 'Total' },
      status: { header: 'Status' },
    },
  });
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'The DataGrid equivalent is `hkDataGridCell`, with the raw value as `$implicit`; it is covered with its typing caveats in [Customize DataGrid columns](/guides/datagrid-columns).',
            es: 'El equivalente en el DataGrid es `hkDataGridCell`, con el valor crudo como `$implicit`; se explica con sus detalles de tipos en [Personaliza las columnas del DataGrid](/guides/datagrid-columns).',
          },
        },
      ],
    },
    {
      id: 'pdf-toolbar',
      heading: { en: 'PDF viewer toolbar', es: 'Barra del visor PDF' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'An `<ng-template hkPdfToolbar>` inside `<hk-pdf-viewer>` replaces the built-in toolbar. The context ([HkPdfToolbarContext](/api/HkPdfToolbarContext)) is typed: `state` is the viewer state (or `null` while it starts) and `labels` the resolved texts, so your toolbar can reuse the translations. Actions go through the controller you already hold.',
            es: 'Un `<ng-template hkPdfToolbar>` dentro de `<hk-pdf-viewer>` reemplaza la barra integrada. El contexto ([HkPdfToolbarContext](/api/HkPdfToolbarContext)) tiene tipos: `state` es el estado del visor (o `null` mientras arranca) y `labels` los textos ya resueltos, así tu barra puede reutilizar las traducciones. Las acciones pasan por el controlador que ya tienes.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'contract.component.ts',
          code: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createPdfViewer, HkPdfToolbarDirective, PdfViewerComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-contract',
  imports: [PdfViewerComponent, HkPdfToolbarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-pdf-viewer [src]="url()" [config]="viewer.config()">
      <ng-template hkPdfToolbar let-state="state" let-labels="labels">
        <div class="flex items-center gap-2 border-b border-base-300 p-2">
          <button type="button" class="btn btn-ghost btn-sm" (click)="viewer.previousPage()">{{ labels.previousPage }}</button>
          <span class="text-sm tabular-nums">{{ state?.page ?? 0 }} / {{ state?.numPages ?? 0 }}</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="viewer.nextPage()">{{ labels.nextPage }}</button>
          <button type="button" class="btn btn-primary btn-sm ml-auto" (click)="viewer.download()">{{ labels.download }}</button>
        </div>
      </ng-template>
    </hk-pdf-viewer>
  \`,
})
export class ContractComponent {
  readonly url = signal('/assets/contract.pdf');
  readonly viewer = createPdfViewer({ zoom: 'fit-width' });
}`,
        },
      ],
    },
    {
      id: 'tree-nodes',
      heading: { en: 'Tree nodes', es: 'Nodos del árbol' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A template referenced as `#nodeTemplate` inside `<hk-tree>` draws each node’s content. The tree keeps the expand toggle, selection, keyboard and ARIA; you only provide what goes in the row. The context ([TreeNodeTemplateContext](/api/TreeNodeTemplateContext)) has the node as `$implicit` and `node`, plus `level`, `expanded`, `selected`, `partialSelected`, `first`, `last` and `index`.',
            es: 'Una plantilla con la referencia `#nodeTemplate` dentro de `<hk-tree>` dibuja el contenido de cada nodo. El árbol conserva el botón de expandir, la selección, el teclado y el ARIA; tú solo das lo que va en la fila. El contexto ([TreeNodeTemplateContext](/api/TreeNodeTemplateContext)) trae el nodo como `$implicit` y `node`, además de `level`, `expanded`, `selected`, `partialSelected`, `first`, `last` e `index`.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'files.component.ts',
          code: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTree, TreeComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-files',
  imports: [TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-tree [tree]="tree">
      <ng-template #nodeTemplate let-node let-level="level">
        <span [class.font-semibold]="level === 0">{{ node.label }}</span>
        @if (node.children?.length) {
          <span class="badge badge-ghost badge-xs ml-2">{{ node.children.length }}</span>
        }
      </ng-template>
    </hk-tree>
  \`,
})
export class FilesComponent {
  readonly tree = createTree({
    nodes: [{ label: 'src', children: [{ label: 'main.ts' }, { label: 'app.config.ts' }] }],
  });
}`,
        },
      ],
    },
    {
      id: 'document-renderers',
      heading: { en: 'Document viewer renderers', es: 'Renderizadores del visor de documentos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A renderer is a standalone component with three required inputs, `source`, `format` and `filename` ([DocumentRendererInputs](/api/DocumentRendererInputs)), registered for one or more format keys in `config.renderers`. Your registrations are searched before the built-ins, so registering a key replaces the built-in renderer for that whole format. The example below replaces the `text` renderer to pretty-print JSON; [loadSourceAsBytes](/api/loadSourceAsBytes) reads any source (URL, bytes or `Blob`). How formats are detected is explained on the [Document Viewer](/document-viewer) page.',
            es: 'Un renderizador es un componente standalone con tres inputs requeridos, `source`, `format` y `filename` ([DocumentRendererInputs](/api/DocumentRendererInputs)), registrado para una o más claves de formato en `config.renderers`. Tus registros se buscan antes que los integrados, así que registrar una clave reemplaza al renderizador integrado para todo ese formato. El ejemplo reemplaza el renderizador de `text` para mostrar JSON con sangría; [loadSourceAsBytes](/api/loadSourceAsBytes) lee cualquier origen (URL, bytes o `Blob`). Cómo se detectan los formatos se explica en la página de [Document Viewer](/document-viewer).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'json-aware-text.renderer.ts',
          code: `import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { DocumentViewerComponent, loadSourceAsBytes, type DocumentRendererInputs, type DocumentViewerConfig } from '@hakistack/ng-daisyui';

/** Replaces the built-in text renderer: pretty-prints .json, shows other text as-is. */
@Component({
  selector: 'app-json-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @if (error(); as message) {
      <div role="alert" class="alert alert-error">{{ message }}</div>
    } @else {
      <pre class="overflow-auto rounded bg-base-200 p-4 font-mono text-sm" [attr.aria-label]="filename() ?? 'Document'">{{ text() }}</pre>
    }
  \`,
})
export class JsonAwareTextRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly text = signal('');
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => void this.load(this.source(), this.format().extension));
  }

  private async load(source: DocumentRendererInputs['source'], extension: string | null): Promise<void> {
    this.error.set(null);
    try {
      const raw = new TextDecoder().decode(await loadSourceAsBytes(source));
      this.text.set(extension === '.json' ? JSON.stringify(JSON.parse(raw), null, 2) : raw);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not read the file.');
    }
  }
}

@Component({
  selector: 'app-file-preview',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<hk-document-viewer [src]="file()" [config]="config" />\`,
})
export class FilePreviewComponent {
  readonly file = input.required<File>();
  readonly config: DocumentViewerConfig = {
    renderers: [{ formats: ['text'], component: JsonAwareTextRenderer }],
  };
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Declare all three inputs even if you ignore one: the viewer sets them by name.',
              es: 'Declara los tres inputs aunque ignores alguno: el visor los asigna por nombre.',
            },
            {
              en: 'Loading and error states are the renderer’s job; the viewer has no error output. A renderer that needs an extra package should load it with a dynamic `import()` so other pages do not pay for it.',
              es: 'Los estados de carga y de error son responsabilidad del renderizador; el visor no tiene output de error. Un renderizador que necesite un paquete adicional debería cargarlo con un `import()` dinámico para que otras páginas no paguen por él.',
            },
            {
              en: 'Format keys are fixed ([DocumentFormat](/api/DocumentFormat)); you cannot add new ones. `doc-legacy` and `presentation` have no built-in renderer, so registering one fills a real gap.',
              es: 'Las claves de formato son fijas ([DocumentFormat](/api/DocumentFormat)); no puedes añadir nuevas. `doc-legacy` y `presentation` no tienen renderizador integrado, así que registrar uno llena un hueco real.',
            },
          ],
        },
      ],
    },
    {
      id: 'document-editors',
      heading: { en: 'Document editors and serializers', es: 'Editores y serializadores de documentos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Edit mode uses the same idea with two registries. An editor is a renderer with a fourth input, `bridge` ([DocumentEditorBridge](/api/DocumentEditorBridge)): call `setInitial` once with the loaded model, report edits with `setContent` (wrapped in a command on `bridge.stack` so the shell’s Undo and Redo work), and re-seed your view from `onReset`. A serializer turns the model back into bytes of the original format. Below, `.html` files become editable as source text, reusing the library’s [loadTextSource](/api/loadTextSource) and [serializeText](/api/serializeText).',
            es: 'El modo de edición usa la misma idea con dos registros. Un editor es un renderizador con un cuarto input, `bridge` ([DocumentEditorBridge](/api/DocumentEditorBridge)): llama `setInitial` una vez con el modelo cargado, reporta los cambios con `setContent` (dentro de un comando en `bridge.stack` para que funcionen el Deshacer y Rehacer del shell) y vuelve a cargar tu vista desde `onReset`. Un serializador convierte el modelo otra vez en bytes del formato original. Aquí, los archivos `.html` se vuelven editables como texto fuente, reutilizando [loadTextSource](/api/loadTextSource) y [serializeText](/api/serializeText) de la librería.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'html-source.editor.ts',
          code: `import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import {
  createDocumentEditor,
  DocumentViewerComponent,
  loadTextSource,
  serializeText,
  type DocumentEditorInputs,
} from '@hakistack/ng-daisyui';

/** Edits an .html file as source text. */
@Component({
  selector: 'app-html-source-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <textarea
      class="textarea h-96 w-full font-mono text-sm"
      [attr.aria-label]="filename() ?? 'HTML source'"
      [value]="text()"
      (input)="onInput($event)"
    ></textarea>
  \`,
})
export class HtmlSourceEditor {
  readonly source = input.required<DocumentEditorInputs['source']>();
  readonly format = input.required<DocumentEditorInputs['format']>();
  readonly filename = input.required<DocumentEditorInputs['filename']>();
  readonly bridge = input.required<DocumentEditorInputs['bridge']>();

  readonly text = signal('');

  constructor() {
    // Load once per source and hand the clean baseline to the controller.
    effect(() => {
      const source = this.source();
      void loadTextSource(source).then((html) => {
        this.text.set(html);
        this.bridge().setInitial(html);
      });
    });
    // Re-seed the textarea when the controller resets.
    effect((onCleanup) => {
      const unbind = this.bridge().onReset((content) => this.text.set(String(content ?? '')));
      onCleanup(unbind);
    });
  }

  onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    const previous = this.text();
    const bridge = this.bridge();
    // Going through the shared stack gives you the shell's Undo / Redo for free.
    bridge.stack.execute({
      label: 'Edit HTML',
      do: () => {
        this.text.set(next);
        bridge.setContent(next);
      },
      undo: () => {
        this.text.set(previous);
        bridge.setContent(previous);
      },
    });
  }
}

@Component({
  selector: 'app-page-editor',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<hk-document-viewer [src]="file()" mode="edit" [editor]="editor" />\`,
})
export class PageEditorComponent {
  readonly file = input.required<File>();
  readonly editor = createDocumentEditor({
    editors: [{ formats: ['html'], component: HtmlSourceEditor }],
    serializers: [{ formats: ['html'], serialize: serializeText }],
    onSave: (bytes) => console.log(\`saved \${bytes.byteLength} bytes\`),
  });
}`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'The built-in registries cover the `text` format only today. Without a serializer for the format, `save()` rejects with “no serializer registered for format …”, so register both pieces together.',
            es: 'Hoy los registros integrados solo cubren el formato `text`. Sin un serializador para el formato, `save()` falla con “no serializer registered for format …”, así que registra las dos piezas juntas.',
          },
        },
      ],
    },
    {
      id: 'providers',
      heading: { en: 'Labels, formatters and the signature store', es: 'Textos, formateadores y el almacén de firmas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'App-wide behavior is configured with provider functions in `app.config.ts`. Labels are partial (missing keys fall back to English) and are listed per component in [Internationalization](/foundations/i18n); custom pipes are explained in [Formatters](/systems/formatters). A signature store decides where the PDF viewer keeps the signatures and initials people choose to save; the default is this browser’s `localStorage`. Implement [PdfSignatureStore](/api/PdfSignatureStore) (`list`, `save`, `remove`, all async) to keep them on your server.',
            es: 'El comportamiento global se configura con funciones proveedoras en `app.config.ts`. Los textos son parciales (las claves que faltan usan el inglés) y están listados por componente en [Internacionalización](/foundations/i18n); los pipes propios se explican en [Formateadores](/systems/formatters). Un almacén de firmas decide dónde guarda el visor PDF las firmas e iniciales que la gente decide conservar; por defecto es el `localStorage` de este navegador. Implementa [PdfSignatureStore](/api/PdfSignatureStore) (`list`, `save`, `remove`, todos asíncronos) para guardarlas en tu servidor.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig, Pipe, PipeTransform } from '@angular/core';
import {
  provideDynamicFormLabels,
  provideHkDataGridLabels,
  providePdfSignatureStore,
  providePipes,
  type PdfSignatureStore,
  type SavedPdfSignature,
} from '@hakistack/ng-daisyui';

@Pipe({ name: 'invoiceStatus' })
export class InvoiceStatusPipe implements PipeTransform {
  transform(value: unknown): string {
    return value === 'paid' ? 'Paid' : value === 'overdue' ? 'Overdue' : 'Open';
  }
}

/** Keeps saved signatures on your server instead of in this browser. */
export class ServerSignatureStore implements PdfSignatureStore {
  async list(): Promise<readonly SavedPdfSignature[]> {
    const response = await fetch('/api/me/signatures');
    return response.ok ? ((await response.json()) as SavedPdfSignature[]) : [];
  }
  async save(signature: SavedPdfSignature): Promise<void> {
    await fetch('/api/me/signatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signature),
    });
  }
  async remove(id: string): Promise<void> {
    await fetch(\`/api/me/signatures/\${encodeURIComponent(id)}\`, { method: 'DELETE' });
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    providePipes({ invoiceStatus: InvoiceStatusPipe }),
    provideHkDataGridLabels({ empty: 'Sin resultados', searchPlaceholder: 'Buscar…', rowCount: (n) => \`\${n} filas\` }),
    provideDynamicFormLabels({ previousButton: 'Anterior', nextButton: 'Siguiente', completeButton: 'Enviar' }),
    providePdfSignatureStore(new ServerSignatureStore()),
  ],
};`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The store is passed as an instance, so it cannot use `inject()`. Use `fetch` (as above) or build the instance from values you already have.',
              es: 'El almacén se pasa como instancia, así que no puede usar `inject()`. Usa `fetch` (como arriba) o crea la instancia con valores que ya tienes.',
            },
            {
              en: 'To keep the browser storage with other settings, provide `new LocalStoragePdfSignatureStore(key, limit)` ([LocalStoragePdfSignatureStore](/api/LocalStoragePdfSignatureStore); defaults `hk-pdf-signatures` and 6 per kind).',
              es: 'Para seguir usando el almacenamiento del navegador con otros ajustes, provee `new LocalStoragePdfSignatureStore(key, limit)` ([LocalStoragePdfSignatureStore](/api/LocalStoragePdfSignatureStore); por defecto `hk-pdf-signatures` y 6 por tipo).',
            },
          ],
        },
      ],
    },
    {
      id: 'pdf-fonts',
      heading: { en: 'PDF fonts', es: 'Fuentes para PDF' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The standard PDF fonts only cover Western European characters. For Greek, Cyrillic, CJK and similar text in free-text annotations, stamps and form fields, give the viewer a TrueType font: a subset is embedded when the file is saved. Without one, form fields fall back to `/NeedAppearances` and annotations show `?` for those characters. Only `.ttf` with glyph outlines works (not CFF `.otf` or `.ttc`).',
            es: 'Las fuentes PDF estándar solo cubren caracteres de Europa occidental. Para texto en griego, cirílico, CJK y similares en anotaciones de texto libre, sellos y campos de formulario, dale al visor una fuente TrueType: al guardar el archivo se incrusta un subconjunto. Sin ella, los campos de formulario recurren a `/NeedAppearances` y las anotaciones muestran `?` para esos caracteres. Solo funciona `.ttf` con contornos de glifos (no `.otf` CFF ni `.ttc`).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `// Per viewer: loaded with that viewer's document.
readonly viewer = createPdfViewer({
  fonts: [{ name: 'Noto Sans', url: '/assets/fonts/NotoSans-Regular.ttf' }],
});

// Global: every viewer in the app can use it. Registering the same name again replaces it.
async registerFonts(): Promise<void> {
  const bytes = await fetch('/assets/fonts/NotoSans-Regular.ttf').then((r) => r.arrayBuffer());
  registerPdfFont('Noto Sans', bytes);
}`,
        },
      ],
    },
    {
      id: 'wasm-urls',
      heading: { en: 'WASM URLs', es: 'URLs de WASM' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The Rust/WASM engines ship inlined in the JavaScript bundle, so nothing has to be copied or served. If you prefer the binaries as separately cached files, [provideTableEngineWasmUrl](/api/provideTableEngineWasmUrl), [provideDocumentEngineWasmUrl](/api/provideDocumentEngineWasmUrl) and [provideImageEngineWasmUrl](/api/provideImageEngineWasmUrl) point each engine at a URL you serve. Which files to serve and where they come from is in [WASM engines](/systems/wasm-engines).',
            es: 'Los motores Rust/WASM vienen incrustados en el bundle de JavaScript, así que no hay que copiar ni servir nada. Si prefieres los binarios como archivos con caché propio, [provideTableEngineWasmUrl](/api/provideTableEngineWasmUrl), [provideDocumentEngineWasmUrl](/api/provideDocumentEngineWasmUrl) y [provideImageEngineWasmUrl](/api/provideImageEngineWasmUrl) apuntan cada motor a una URL que tú sirves. Qué archivos servir y de dónde salen está en [Motores WASM](/systems/wasm-engines).',
          },
        },
      ],
    },
    {
      id: 'not-extension-points',
      heading: { en: 'What is not an extension point', es: 'Lo que no es un punto de extensión' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Injection tokens and classes that are not exported from the package, and anything marked `@internal` (such as `_internal` on configs). They can change in any release.',
              es: 'Los tokens de inyección y clases que no se exportan del paquete, y todo lo marcado `@internal` (como `_internal` en las configuraciones). Pueden cambiar en cualquier versión.',
            },
            {
              en: 'Styling through internal class names or the DOM structure. Restyle with daisyUI themes and the documented `--hk-*` variables instead (see [Theming](/foundations/theming)).',
              es: 'Cambiar estilos con nombres de clases internas o la estructura del DOM. Usa los temas de daisyUI y las variables `--hk-*` documentadas (mira [Temas](/foundations/theming)).',
            },
          ],
        },
      ],
    },
    {
      id: 'next',
      heading: { en: 'What to read next', es: 'Qué leer después' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '[Document rendering](/architecture/documents): how the renderer registry and format detection work inside.',
              es: '[Renderizado de documentos](/architecture/documents): cómo funcionan por dentro el registro de renderizadores y la detección de formato.',
            },
            {
              en: '[Integrate a document viewer](/guides/document-viewer-integration): errors, file pickers and keeping WASM off pages that do not need it.',
              es: '[Integra un visor de documentos](/guides/document-viewer-integration): errores, selectores de archivos y cómo dejar el WASM fuera de páginas que no lo necesitan.',
            },
            {
              en: '[Builders](/systems/builders): the controller pattern every extension point plugs into.',
              es: '[Builders](/systems/builders): el patrón de controlador al que se conecta cada punto de extensión.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'document-viewer', note: { en: 'Formats and built-in renderers.', es: 'Formatos y renderizadores integrados.' } },
    { id: 'i18n', note: { en: 'Every labels provider.', es: 'Todos los proveedores de textos.' } },
    { id: 'formatters', note: { en: 'Pipe-based formatters.', es: 'Formateadores basados en pipes.' } },
  ],
};

export default content;
