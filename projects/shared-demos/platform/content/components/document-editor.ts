import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'The document editor is not a separate viewer: it is an edit mode of `hk-document-viewer`. You create a controller with `createDocumentEditor()`, pass it to the viewer with `mode="edit"`, and the viewer swaps the read-only renderer for an editor with Undo, Redo, Save and Export buttons. Saving gives you the file back as bytes in its **original** format. When a controller is bound but the viewer is in view mode, an Edit button switches to edit mode, and Done switches back.',
      es: 'El editor de documentos no es otro visor: es un modo de edición de `hk-document-viewer`. Creas un controlador con `createDocumentEditor()`, se lo pasas al visor con `mode="edit"` y el visor cambia el renderizador de solo lectura por un editor con botones de deshacer, rehacer, guardar y exportar. Al guardar recibes el archivo como bytes en su formato **original**. Si hay un controlador enlazado pero el visor está en modo vista, un botón Edit pasa al modo edición y el botón Done vuelve a la vista.',
    },
    {
      en: 'Today it edits text-family files only: plain text (`.txt`, `.log`, `.json`), Markdown (`.md`, with a live preview) and CSV (`.csv`, as an editable table). It is **experimental**: the API may change, and Excel, PDF and DOCX editing are planned but not built.',
      es: 'Por ahora solo edita archivos de la familia de texto: texto plano (`.txt`, `.log`, `.json`), Markdown (`.md`, con vista previa en vivo) y CSV (`.csv`, como tabla editable). Es **experimental**: la API puede cambiar, y la edición de Excel, PDF y DOCX está planificada, pero todavía no existe.',
    },
  ],
  whenToUse: [
    {
      en: 'Users need quick fixes to notes, Markdown docs or small CSV files that you already show with the document viewer.',
      es: 'Los usuarios necesitan hacer correcciones rápidas en notas, documentos Markdown o archivos CSV pequeños que ya muestras con el visor de documentos.',
    },
    {
      en: 'You want dirty tracking, one undo/redo history and `save()` returning bytes you upload yourself.',
      es: 'Quieres saber si hay cambios sin guardar, tener un solo historial de deshacer/rehacer y un `save()` que te devuelva los bytes para que tú los subas.',
    },
    {
      en: 'You plan to plug in your own editor for a format: editors and serializers are registries, like the viewer renderers.',
      es: 'Piensas conectar tu propio editor para un formato: los editores y serializadores son registros, igual que los renderizadores del visor.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Rich text authoring (headings, lists, links, images): use the [Rich Editor](/editor).',
      es: 'Redacción de texto enriquecido (títulos, listas, enlaces, imágenes): usa el [editor de texto enriquecido](/editor).',
    },
    {
      en: 'Editing spreadsheets, Word files or PDFs: not supported by this editor. For PDF forms and annotations use the [PDF Viewer](/pdf-viewer), which edits and saves PDFs itself.',
      es: 'Editar hojas de cálculo, archivos de Word o PDF: este editor no lo admite. Para formularios y anotaciones en PDF usa el [visor de PDF](/pdf-viewer), que edita y guarda archivos PDF por su cuenta.',
    },
    {
      en: 'Production flows that cannot absorb API changes: the component is experimental.',
      es: 'Flujos en producción que no toleran cambios en la API: el componente es experimental.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DocumentViewerComponent, createDocumentEditor, type DocumentViewerConfig } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-notes-editor',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-document-viewer [src]="source" [config]="viewerConfig" mode="edit" [editor]="editor" />
    <p class="mt-2 text-sm">{{ editor.isDirty() ? 'Unsaved changes' : 'All changes saved' }} · {{ lastSaved() }}</p>
  \`,
})
export class NotesEditorComponent {
  /** A Markdown file built in code; the .md filename selects the Markdown editor. */
  readonly source = new Blob(['# Notes\\n\\n- First item\\n- Second item\\n'], { type: 'text/markdown' });
  readonly viewerConfig: DocumentViewerConfig = { filename: 'notes.md' };

  readonly lastSaved = signal('never saved');

  readonly editor = createDocumentEditor({
    filename: 'notes.md',
    onSave: (bytes) => this.lastSaved.set(\`saved \${bytes.byteLength} bytes\`),
  });
}
`,
    note: {
      en: 'Bind the controller itself to `[editor]` (not `editor.config()`). The format is resolved from the viewer `[config]` (and the export download name comes from it too), so give the viewer the `filename`; the extension picks the plain, Markdown or CSV sub-editor.',
      es: 'Enlaza el propio controlador a `[editor]` (no `editor.config()`). El formato se resuelve con el `[config]` del visor (y de ahí también sale el nombre del archivo exportado), así que pásale el `filename` al visor; la extensión elige el subeditor de texto plano, Markdown o CSV.',
    },
  },
  technical: [
    {
      id: 'pipeline',
      heading: { en: 'How edit mode is wired', es: 'Cómo se conecta el modo edición' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Viewer in edit mode', es: 'Visor en modo edición' },
              detail: {
                en: '`mode="edit"` plus an `[editor]` controller; without a controller the viewer stays read-only.',
                es: '`mode="edit"` más un controlador en `[editor]`; sin controlador, el visor sigue en solo lectura.',
              },
            },
            {
              label: { en: 'Editor shell', es: 'Contenedor del editor (shell)' },
              detail: {
                en: 'Toolbar (undo, redo, save, export), a Done button back to view, and a status line. Save is enabled only while there are unsaved changes; Export downloads the file; save and export errors appear in the status line.',
                es: 'Barra (deshacer, rehacer, guardar, exportar), un botón Done para volver a la vista y una línea de estado. Guardar solo está habilitado mientras hay cambios sin guardar; Exportar descarga el archivo; los errores al guardar o exportar aparecen en la línea de estado.',
              },
            },
            {
              label: { en: 'resolveEditor()', es: 'resolveEditor()' },
              detail: {
                en: 'Your `editors` first, then `BUILT_IN_EDITORS` (one `text` dispatcher).',
                es: 'Primero tus `editors` y luego `BUILT_IN_EDITORS` (un único despachador para el formato `text`).',
              },
            },
            {
              label: { en: 'Sub-editor by extension', es: 'Subeditor por extensión' },
              detail: {
                en: '`.md` / `.markdown` → Markdown split preview; `.csv` → editable `hk-table`; anything else → textarea with line numbers.',
                es: '`.md` / `.markdown` → Markdown con vista previa en paralelo; `.csv` → `hk-table` editable; lo demás → textarea con números de línea.',
              },
            },
            {
              label: { en: 'save() / exportAs()', es: 'save() / exportAs()' },
              detail: {
                en: '`resolveSerializer()` turns the model into bytes of the original format (`serializeText` for text).',
                es: '`resolveSerializer()` convierte el modelo en bytes del formato original (`serializeText` para texto).',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Editors never touch the controller directly. The shell hands them a [DocumentEditorBridge](/api/DocumentEditorBridge): `setInitial()` seeds the clean baseline, `setContent()` records an edit and marks the document dirty, and `stack` is the shared history.',
            es: 'Los editores nunca tocan el controlador directamente. El shell les entrega un [DocumentEditorBridge](/api/DocumentEditorBridge): `setInitial()` fija el contenido base (sin cambios), `setContent()` registra una edición y marca el documento como modificado, y `stack` es el historial compartido.',
          },
        },
      ],
    },
    {
      id: 'controller',
      heading: { en: 'Controller API', es: 'API del controlador' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Member', es: 'Miembro' },
            { en: 'What it does', es: 'Qué hace' },
          ],
          rows: [
            [
              { en: '`content`, `format`, `isDirty`, `canUndo`, `canRedo`', es: '`content`, `format`, `isDirty`, `canUndo`, `canRedo`' },
              { en: 'Read-only signals.', es: 'Signals de solo lectura.' },
            ],
            [
              { en: '`undo()` / `redo()`', es: '`undo()` / `redo()`' },
              { en: 'Step through the [CommandStack](/api/CommandStack).', es: 'Recorren el [CommandStack](/api/CommandStack).' },
            ],
            [
              { en: '`save()`', es: '`save()`' },
              {
                en: 'Serializes, clears the dirty flag, calls `onSave(bytes)` and resolves with the bytes. Rejects if no source loaded or no serializer exists.',
                es: 'Serializa, limpia el indicador de cambios, llama a `onSave(bytes)` y se resuelve con los bytes. Se rechaza si no hay ninguna fuente cargada o no existe un serializador.',
              },
            ],
            [
              { en: "`exportAs('original')`", es: "`exportAs('original')`" },
              {
                en: 'Returns a `Blob` with the detected MIME type. `\'pdf\'` exists in the type but throws "not supported yet".',
                es: 'Devuelve un `Blob` con el tipo MIME detectado. `\'pdf\'` existe en el tipo pero lanza "not supported yet".',
              },
            ],
            [
              { en: '`reset()`', es: '`reset()`' },
              { en: 'Restores the loaded content and clears history.', es: 'Restaura el contenido cargado y limpia el historial.' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Each `input` event in the textarea is one undo step; edits are not grouped by word or time. A CSV cell edit is one step that stores the whole CSV text before and after.',
            es: 'Cada evento `input` del textarea es un paso de deshacer; las ediciones no se agrupan por palabra ni por tiempo. Editar una celda del CSV es un paso que guarda el texto CSV completo de antes y de después.',
          },
        },
      ],
    },
    {
      id: 'safety',
      heading: { en: 'Markdown preview and CSV parsing', es: 'Vista previa de Markdown y análisis de CSV' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The Markdown renderer is in-house and covers a declared subset: headings, bold, italic, inline and fenced code, links, lists, blockquotes and rules. The source is HTML-escaped first, so raw HTML in the file shows as text; DOMPurify runs on top when the optional peer is installed. The CSV helpers (`parseCsv`, `serializeCsv`) follow RFC 4180–style quoting and treat the first record as the header.',
            es: 'El renderizador de Markdown es propio y cubre un subconjunto declarado: títulos, negrita, cursiva, código en línea y en bloque, enlaces, listas, citas y separadores. Primero se escapa el HTML de la fuente, así que el HTML crudo del archivo se ve como texto; además, DOMPurify se aplica si la dependencia peer opcional está instalada. Los helpers de CSV (`parseCsv`, `serializeCsv`) siguen las reglas de comillas de RFC 4180 y toman el primer registro como encabezado.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'The CSV editor keys every row by the header columns: short rows are padded with empty cells and extra trailing fields are dropped. After the first cell edit the whole file is re-serialized from that shape, so ragged rows and custom quoting are normalized on save.',
            es: 'El editor CSV indexa cada fila por las columnas del encabezado: las filas cortas se completan con celdas vacías y los campos sobrantes al final se descartan. Después de la primera edición de celda, todo el archivo se vuelve a serializar con esa forma, así que las filas irregulares y las comillas personalizadas se normalizan al guardar.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab / Shift + Tab',
        action: {
          en: 'Move between the toolbar, the Done button and the editor surface',
          es: 'Moverse entre la barra, el botón Done y el área del editor',
        },
      },
      {
        keys: 'Enter / Space',
        action: {
          en: 'Run the focused toolbar button (undo, redo, save, export)',
          es: 'Ejecutar el botón de la barra que tiene el foco (deshacer, rehacer, guardar, exportar)',
        },
      },
    ],
    notes: [
      {
        en: 'The editor does not bind Ctrl/Cmd + Z to its own history; use the toolbar buttons or call `undo()` / `redo()` from your own shortcuts.',
        es: 'El editor no asocia Ctrl/Cmd + Z a su propio historial; usa los botones de la barra o llama a `undo()` / `redo()` desde tus propios atajos de teclado.',
      },
      {
        en: 'The textareas are labelled with the file name, the line-number gutter is `aria-hidden`, the Markdown preview is a labelled region, and the status line ("Unsaved changes" / "Saved") is a `role="status"` polite live region.',
        es: 'Los textareas se etiquetan con el nombre del archivo, la columna de números de línea es `aria-hidden`, la vista previa de Markdown es una región con etiqueta y la línea de estado ("Unsaved changes" / "Saved") es una región viva `role="status"` con `aria-live="polite"`.',
      },
      {
        en: 'The shell strings ("Edit", "Done", "Unsaved changes", "Saved") are fixed in English for now; they are not part of a labels token yet.',
        es: 'Por ahora, los textos del shell ("Edit", "Done", "Unsaved changes", "Saved") están fijos en inglés; todavía no forman parte de un token de etiquetas.',
      },
    ],
  },
  performance: [
    {
      en: 'Text editors add no dependencies; the CSV editor reuses `hk-table` and the Markdown preview re-renders from the text on every change, discarding stale renders.',
      es: 'Los editores de texto no añaden dependencias; el editor CSV reutiliza `hk-table` y la vista previa de Markdown se vuelve a renderizar con cada cambio, descartando los renderizados obsoletos.',
    },
    {
      en: 'The CSV model is the CSV string: every cell edit re-serializes the whole file. It is meant for small and medium files.',
      es: 'El modelo del CSV es el propio texto CSV: cada edición de celda vuelve a serializar todo el archivo. Está pensado para archivos pequeños y medianos.',
    },
  ],
  related: [
    { id: 'document-viewer', note: { en: 'The viewer this editor plugs into.', es: 'El visor al que se conecta este editor.' } },
    {
      id: 'builders',
      note: {
        en: 'createDocumentEditor follows the same controller pattern as createPdfViewer.',
        es: 'createDocumentEditor sigue el mismo patrón de controlador que createPdfViewer.',
      },
    },
    { id: 'editor', note: { en: 'Rich text editing with TipTap.', es: 'Edición de texto enriquecido con TipTap.' } },
  ],
};

export default content;
