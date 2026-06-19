# Rich content: Editor, Document Viewer, Document Editor, PDF Viewer

| Component | Selector | Factory | Main inputs |
|---|---|---|---|
| Editor (TipTap) | `hk-editor` | — (CVA) | `[formControl]`, `toolbar`, `slashCommands` |
| Document Viewer | `hk-document-viewer` | — | `[src]`, `[config]` |
| Document Editor | `hk-document-viewer mode="edit"` | `createDocumentEditor()` | `[src]`, `mode`, `[editor]` |
| PDF Viewer | `hk-pdf-viewer` | `createPdfViewer()` | `[src]`, `[config]` |

## `hk-editor` (rich text, TipTap; CVA + Validator)

Lazy-loads TipTap. Value is an HTML string via `[formControl]`.
Inputs: `placeholder` (def `'Write something…'`), `disabled`, `readonly`, `toolbar` (preset `'basic'|'full'|'minimal'|'none'|'document'` or `EditorToolbarItem[]`; def `'basic'`), `minLength`, `maxLength`, `editorHeight` (def `'200px'`), `ariaLabel`, `contentClass` (e.g. `'prose prose-sm'`), `onImageUpload?: (file: File) => Promise<string>`, `slashCommands`.
Outputs: `(textChange)` → `{ html, text }`, `(editorFocus)`, `(editorBlur)`, `(editorReady)`.

Toolbar items: `bold, italic, underline, strike, code, link, image, heading1-3, bulletList, orderedList, blockquote, codeBlock, horizontalRule, undo, redo, divider, save, export, print`. `TOOLBAR_PRESETS` exports `none/document/minimal/basic/full`.

```html
<hk-editor [formControl]="content" toolbar="basic" [maxLength]="500" editorHeight="250px"
           (textChange)="onChange($event)" />
```

Slash commands (`/` at line start). `slashCommands`: `false` (default) | `true` (built-ins) | `EditorSlashCommand[]` | `{ items, append? }`.
```typescript
import { slash, createSlashCommands } from '@hakistack/ng-daisyui';
slashCommands = createSlashCommands({
  append: true,
  items: [
    slash.snippet({ id: 'sig', label: 'Signature', html: '<p>—<br/><strong>Jose</strong></p>' }),
    slash.snippetFromUrl({ id: 'mtg', label: 'Meeting notes', url: '/snippets/meeting.html' }),
    slash.command({ id: 'todo', label: 'To-do list', run: (chain) => chain.toggleTaskList() }),
    slash.custom({ id: 'x', label: 'Custom', action: ({ editor, range }) => {} }),
  ],
});
```

## `hk-document-viewer`

Detects format from `src` + hints, dispatches to a renderer.
Inputs: `src: DocumentSource` (`string | Uint8Array | Blob`, required), `config: DocumentViewerConfig` (`{ mimeType?, filename?, renderers? }`), `mode: 'view'|'edit'` (def view), `editor: DocumentEditorController | null` (required for edit).

Built-in formats: pdf, spreadsheet (xlsx/xls/ods — calamine WASM), docx, rtf, html (sandboxed + DOMPurify), text (txt/md/csv/log/json), image (png/jpg/webp/svg/avif…), image-special (tiff — WASM), eml, msg, epub.

```html
<hk-document-viewer [src]="file" [config]="{ filename: file.name }" />
```
WASM-backed renderers need their engine URL provided: `provideDocumentEngineWasmUrl(url)` (spreadsheet), `provideImageEngineWasmUrl(url)` (tiff). Helpers: `resolveFormat`, `getSupportedExtensions`, `getRenderableExtensions`, `loadSourceAsBytes`.

## Document Editor — `createDocumentEditor(config?)`

Turns the viewer editable (`mode="edit"`). Controller pattern.
```typescript
editor = createDocumentEditor({
  filename: 'notes.md',
  onSave: (bytes) => upload(bytes),
  onDirtyChange: (dirty) => {},
  onContentChange: (content) => {},
});
// template: <hk-document-viewer [src]="'/notes.md'" mode="edit" [editor]="editor" />
await editor.save();               // Promise<Uint8Array> (serialize to original format)
await editor.exportAs('pdf');      // Promise<Blob> ('original' | 'pdf')
editor.undo(); editor.redo(); editor.reset();
// signals: editor.content() / format() / isDirty() / canUndo() / canRedo()
```
Built-in editors: plain text, markdown, CSV. (Roadmap in `document-editor.roadmap.md`; AGPL deps blocked — see project memory.)

## PDF Viewer — `createPdfViewer(config?)`

```typescript
viewer = createPdfViewer({
  page: 1, zoom: 'fit-width', mode: 'continuous', layout: 'default',
  password?, workerSrc?, showToolbar?, showSidebar?, defaultSidebarTab?,
  onLoaded: (info) => {}, onPageChange: (p) => {}, onError: (e) => {}, onPasswordRequired: (cb) => {},
});
```
Component inputs: `src: PdfDocumentSource` (req), `config` (pass `viewer.config()`, req), `title`, `subtitle` (preview layout), `[(formValues)]` (PDF form fields).
`PdfZoom = number | 'fit-page' | 'fit-width' | 'auto'`; `mode: 'single'|'continuous'`; `layout: 'default'|'preview'`.

Controller methods: `goToPage/nextPage/previousPage/firstPage/lastPage`, `setZoom/zoomIn/zoomOut/resetZoom`, `setMode`, `toggleSidebar`, `toggleFullscreen`, `search(q): Promise<PdfSearchResult>`, `nextMatch/previousMatch/clearSearch`, `print`, `download(filename?)`, `reload`, `save(): Promise<Uint8Array>` (form-filled), `saveAndDownload`.
State signal `viewer.state()`: `page, numPages, zoom, zoomMode, mode, loaded, error, searchMatches, currentMatchIndex, sidebarOpen, sidebarTab, …`.

```html
<hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" [(formValues)]="formValues">
  <ng-template hkPdfToolbar let-state="state">
    <div class="flex items-center gap-3 px-3 py-2">
      <button (click)="viewer.previousPage()">‹</button>
      <span>{{ state.page }} / {{ state.numPages }}</span>
      <button (click)="viewer.nextPage()">›</button>
    </div>
  </ng-template>
</hk-pdf-viewer>
```
Customize labels/defaults via `provideHkPdfLabels(...)` / `provideHkPdfDefaults(...)`. The `[hkPdfToolbar]` directive (`HkPdfToolbarDirective`) replaces the default toolbar.
