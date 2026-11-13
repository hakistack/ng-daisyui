# Migration guide

Older migrations (dynamic-form field signatures, `field.*` option flattening) are in [MIGRATION.md](../../MIGRATION.md).
The `migrate-table-columns` schematic rewrites the legacy `createTable({ visible, formatters })` shape to the
`columns` map: `ng generate @hakistack/ng-daisyui:migrate-table-columns` (needs `ts-morph`, an optional peer:
`npm i -D ts-morph`).

## 0.3.x → 0.4.0 (unreleased)

### Peer dependencies

| Before | After | Action |
|---|---|---|
| `@angular/*` `>=21.0.0` | `^21.0.0` | none on Angular 21. On Angular 22, stay on 0.3.x until a release declares `^22` support |
| `@angular/router` optional | required | `npm i @angular/router@^21` if your app does not use the router (npm 7+ installs it automatically) |
| `rxjs` `>=7.8.0` | `^7.8.0` | none for RxJS 7 |

### PDF viewer (PDFium engine)

| Removed | Replacement |
|---|---|
| `HkPdfService` | `createPdfViewer()` controller |
| `HK_PDF_DEFAULTS`, `provideHkPdfDefaults()` | pass options through `createPdfViewer({ … })` / component inputs |
| `PdfViewerConfig.workerSrc` | not needed — the PDFium worker ships inside the package |
| `PdfViewerConfig.renderPoolSize` | the pool size is managed internally (default 2) |

### Workspaces

`hk-pdf-workspace` and `hk-document-workspace` take a **list** of documents. For a single document use
`hk-pdf-viewer` / `hk-document-viewer`.

### `hk-select` ids

The listbox and option ids are now unique per instance. If you queried `#options-list` or `#option-0` (tests,
styles), select by role instead:

```ts
// before
document.querySelector('#options-list');
// after
document.querySelector('hk-select [role="listbox"]') /* or */ selectComponent.listboxId;
```

### Dynamic-form auto-save

Password and file fields are no longer written to storage. Restored drafts leave them empty; no code change is needed.

### Theme imports

New, previously unreachable paths now resolve:

```css
@import "@hakistack/ng-daisyui/themes/kaizen";       /* or kaizen.css */
@import "@hakistack/ng-daisyui/themes/kaizen-light";
```

## Planned (not released) — keep an eye on these

| Change | Why | Migration |
|---|---|---|
| `@tiptap/*` from `dependencies` to optional peers | stop installing 7 packages for apps that never use `hk-editor` | apps using `hk-editor` (or `field.editor()`) add `npm i @tiptap/core @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-file-handler @tiptap/suggestion` |
| `@hakistack/ng-daisyui/documents` secondary entry point | keep PDF/document code and its multi-MB lazy chunks out of apps that don't use them | change imports of `PdfViewerComponent`, `DocumentViewerComponent`, `createPdfViewer`, `Document*Renderer`, workspaces… to the new path; root re-exports stay (deprecated) for one minor |
| `[appAutoFocus]` → `[hkAutoFocus]` | consistent `hk` prefix | both selectors work during the deprecation window |
