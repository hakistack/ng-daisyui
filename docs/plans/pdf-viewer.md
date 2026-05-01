# PDF Viewer — Implementation Plan

Reference target: [Syncfusion Angular PDF Viewer key features](https://help.syncfusion.com/document-processing/pdf/pdf-viewer/angular/overview#key-features).

Goal: ship an open-source equivalent (`<hk-pdf-viewer>`) inside `@hakistack/ng-daisyui`, phased so we deliver a usable viewer in weeks and add enterprise features incrementally.

## Realistic scope

Syncfusion's product is years of dedicated team effort. We will not match it in one session. The plan is **four phases over months**, with each phase shipping standalone value.

| Phase | Scope | Rough effort | Status |
|---|---|---|---|
| 1 | Core read-only viewer | 1–2 weeks focused | Not started |
| 2 | Form fields (read + fill) | ~1 week | Not started |
| 3 | Annotation editing (markup, ink, free text, stamps) | 2–3 weeks | Not started |
| 4 | Signatures + page management | 2–4 weeks | Not started |

## Architecture (locked across all phases)

### Stack
- **`pdfjs-dist`** — Mozilla's PDF.js. Handles all reading: render, text layer, search, links, outline, form-field rendering, annotation rendering. Runtime dep, lazy-loaded.
- **`pdf-lib`** (Phase 2+) — for writing back to PDFs: form values, annotation persistence, page mutations, signature embedding. Runtime dep, lazy-loaded only when phase 2+ features are touched.
- Both are MIT/Apache-2.0 licensed. No commercial licensing concerns.

### Loading
- Lazy-load both libs via dynamic `import()` (mirrors `EditorComponent`'s TipTap pattern).
- Non-PDF consumers pay zero JS in their initial bundle.
- PDF consumers fetch `pdfjs-dist` (~500 KB) and `pdf-lib` (~150 KB) on first viewer mount.

### Worker
- PDF.js requires a web worker (`pdf.worker.min.mjs`).
- **Strategy**: bundled asset. A build script (`scripts/copy-pdf-worker.mjs`) copies it from `node_modules/pdfjs-dist/build/` into `dist/hakistack/ng-daisyui/assets/pdfjs/`.
- Consumer's Angular `angular.json` `assets` config picks it up automatically.
- Component sets `GlobalWorkerOptions.workerSrc` at runtime to the asset path.
- Rejected alternatives: CDN URL (network dependency, privacy concern), inline data URL (~1 MB bundle bloat).

### State model
- Single `viewerState = signal<ViewerState>(...)` holding `{ doc, page, zoom, mode, search, sidebar, annotations, ... }`.
- Computed signals for derived state (visible page count, current scroll offset, search match index).
- Same architecture pattern as `DynamicFormComponent`.

### Component shape
- `<hk-pdf-viewer [src]="..." [page]="..." [(zoom)]="..." />` — container component, OnPush, signal-based.
- Slot directives for customization: `<ng-template hkPdfToolbar>`, `<ng-template hkPdfSidebar>`.
- Public methods on a `PdfViewerController` returned by an optional `createPdfViewer(...)` builder, mirroring `createForm`.

### Layout
- Outer `card card-border` (theme-bridged via `HK_THEME`).
- Collapsible left sidebar (tabs: thumbnails | bookmarks | annotations).
- Main canvas viewport (scrollable).
- Top toolbar with overflow menu on small screens.
- Bottom-right floating zoom controls (mobile-friendly).
- Theme styling fully consistent with the audit findings (no raw `bg-base-100 border` mimics).

### i18n
- Injection token `HK_PDF_LABELS` with default English strings; consumer overrides via `provideHkPdfLabels({...})`.
- Mirrors `provideDynamicFormLabels` pattern.

### Persistence model (annotations + form values)
- Component never auto-saves to the original PDF source.
- Two output signals: `(modified)` (`Uint8Array` of mutated PDF on demand) and `(annotationsChanged)` (typed event with operation + payload).
- Consumer decides: client-side `pdf-lib` save → upload, or send annotations as JSON → server-side stitching.
- For enterprise / audit-heavy use cases, server-side annotation merge is the recommended path.

### Public-API additions
- `PdfViewerComponent`
- `PdfViewerController`, `createPdfViewer`
- Types: `PdfDocumentSource`, `PdfZoom`, `PdfViewerLabels`, `PdfAnnotation`, `PdfFormValues`, `PdfPageInfo`
- Tokens: `HK_PDF_LABELS`, `provideHkPdfLabels`

---

## Phase 1 — Core read-only viewer

**Effort**: 1–2 weeks focused. **Bundle add**: `pdfjs-dist` only.

A complete, usable PDF viewer on its own. Covers ~70% of consumer needs (most internal apps never need annotation editing).

### Features

- **Render** PDFs from URL, `Uint8Array`, or `Blob`.
- **Password-protected PDFs**: prompt UI when PDF.js raises a password-required error.
- **Zoom**: numeric (`0.5`–`5.0`), `'fit-page'`, `'fit-width'`, `'auto'`. Toolbar controls + keyboard shortcuts (`Ctrl/⌘ +` / `-` / `0`).
- **Navigation**: page forward/back, jump to page (`page` 2-way binding), keyboard shortcuts (`PageUp`/`PageDown`, `Home`/`End`).
- **Display modes**: `'single'` (one page at a time), `'continuous'` (vertical scroll). Default: `'continuous'`.
- **Text selection**: PDF.js text layer overlay enables native selection + copy.
- **Search**: find-in-doc (`Ctrl/⌘ F`), highlight matches in text layer, prev/next match nav, match counter (`3 / 17`).
- **Bookmarks/outline**: parse PDF outline, render as collapsible tree in sidebar, click to jump to page.
- **Thumbnails**: re-render each page at 1/8 scale into sidebar; click to jump; current page highlighted.
- **Hyperlinks**: annotation layer renders internal (page jumps) and external (URL) links.
- **Print**: render-to-print using PDF.js print path or browser native (configurable).
- **Download**: button to download original `Uint8Array` as a file.
- **Full-screen**: toggle via toolbar button (uses Fullscreen API).
- **Customizable toolbar**: `<ng-template hkPdfToolbar>` slot lets consumer replace the default toolbar; default toolbar is a separate `PdfDefaultToolbarComponent` exported alongside.
- **Loading + error states**: skeleton during load; error card on failure (corrupt PDF, network error, password cancelled).
- **i18n**: all toolbar labels and aria-labels via `HK_PDF_LABELS`.

### Public API surface (Phase 1)

**Builder-driven config + `[src]` input split.** Mirrors `createForm` / `createTable`
patterns for the config + controller; keeps `src` reactive on the template
because it's the most volatile thing (route params, uploads, list selection).
All other behavior (callbacks, layout flags, defaults) goes through the builder
since it's stable per-instance.

```ts
// In your component class:
viewer = createPdfViewer({
  page: 1,
  zoom: 'fit-width',                   // number | 'fit-page' | 'fit-width' | 'auto'
  mode: 'continuous',                  // 'single' | 'continuous'
  password: '',
  showToolbar: true,
  showSidebar: true,
  defaultSidebarTab: 'thumbnails',     // 'thumbnails' | 'bookmarks'
  onLoaded: (info) => { /* { numPages, title, fingerprint, fileSize } */ },
  onPageChange: (p) => { /* number */ },
  onError: (e) => { /* { code, message, recoverable } */ },
  onPasswordRequired: (cb) => { /* prompt user, call cb(password) */ },
});

pdfUrl = signal<string | Uint8Array | Blob>('document.pdf');

// Template:
<hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />

// Anywhere in your component class:
viewer.goToPage(5);
viewer.nextPage();
viewer.setZoom('fit-page');
viewer.search('quarterly results');
viewer.print();
viewer.download('report.pdf');
```

#### Controller (Phase 1)

```ts
interface PdfViewerController {
  // Reactive state
  readonly config: Signal<PdfViewerConfig>;
  readonly state: Signal<PdfViewerState>;
  // PdfViewerState = { page, numPages, zoom, mode, loaded, error, searchMatches, currentMatchIndex, ... }

  // Navigation
  goToPage(page: number): void;
  nextPage(): void;
  previousPage(): void;
  firstPage(): void;
  lastPage(): void;

  // Zoom
  setZoom(zoom: PdfZoom): void;
  zoomIn(): void;
  zoomOut(): void;
  resetZoom(): void;

  // Display
  setMode(mode: 'single' | 'continuous'): void;
  toggleSidebar(): void;
  toggleFullscreen(): void;

  // Search
  search(query: string): Promise<{ totalMatches: number }>;
  nextMatch(): void;
  previousMatch(): void;
  clearSearch(): void;

  // Document ops
  print(): void;
  download(filename?: string): void;
  reload(): void;
}
```

#### Why `[src]` stays as input (not in builder config)

| Pattern | Lives on... | Reason |
|---|---|---|
| `[src]` | template input | Volatile — changes per route, upload, selection. Reactive via signal inputs. |
| `[config]` | builder | Stable per-instance config + lifecycle callbacks. |
| Controller methods | imperative API | Don't fit inputs OR template; called from event handlers, services, route guards. |

### File structure (Phase 1)

```
src/lib/components/pdf-viewer/
├── pdf-viewer.component.ts            # main container
├── pdf-viewer.component.html          # layout template
├── pdf-viewer.component.css           # minimal custom styles (text layer, scrollbar tweaks)
├── pdf-viewer.types.ts                # PdfDocumentSource, PdfZoom, etc.
├── pdf-viewer.helpers.ts              # createPdfViewer, controller
├── pdf-viewer.labels.ts               # HK_PDF_LABELS, provideHkPdfLabels
├── pdf-default-toolbar.component.ts   # default toolbar (extractable, replaceable)
├── pdf-sidebar.component.ts           # tabs container for thumbnails/bookmarks
├── pdf-thumbnails.component.ts        # thumbnail list
├── pdf-bookmarks.component.ts         # outline tree
├── pdf-search.component.ts            # find-in-doc UI
├── pdf-page.component.ts              # single-page renderer (used by both modes)
└── workers/
    └── (the bundled pdf.worker.min.mjs is injected via the build script — not in src/)

scripts/
└── copy-pdf-worker.mjs                # build-time worker copy
```

### Phase 1 deliverables

- All public exports added to `public-api.ts`.
- Worker copy step added to `npm run build`.
- 5–10 unit tests covering: load happy path, page nav, zoom, search match counter, password flow.
- One demo page in `projects/shared-demos/demos/pdf-viewer-demo.component.ts` exercising every Phase 1 feature.
- JSDoc on every public symbol following Batch-1 conventions.

---

## Phase 2 — Form fields (read + fill)

**Effort**: ~1 week. **Bundle add**: `pdf-lib`.

### Features

- **Render existing form fields** (PDF.js handles): text inputs, checkboxes, radio buttons, dropdowns, list boxes, signature placeholders.
- **Fill values**: native HTML controls overlaid on the form-field positions (PDF.js's annotation layer pattern).
- **Two-way binding**: `[(formValues)]` — get current values, set initial values.
- **Reset**: clear all form values to PDF defaults.
- **Save**: export filled PDF via `pdf-lib`. Returns `Uint8Array`.
- **Validation hooks**: consumer-supplied per-field validator callback; viewer marks invalid fields with `input-error` styling.
- **Read-only mode**: `[formReadonly]="true"` disables editing while keeping fields visible.

### Public API additions (Phase 2)

```ts
<hk-pdf-viewer
  ... Phase 1 inputs ...
  [(formValues)]="formData"            <!-- Record<fieldName, any> -->
  [formReadonly]="false"
  (formFieldChange)="onFieldChange($event)"   <!-- { name, value, type } -->
/>

// On the controller:
form.save() // returns Promise<Uint8Array>
form.resetForm()
```

### Decisions deferred to Phase 2 kickoff

- Field validation API surface (per-field vs schema-driven).
- Whether the viewer renders form inputs or PDF.js does (we lean: PDF.js renders, we just listen for change events).

---

## Phase 3 — Annotation editing

**Effort**: 2–3 weeks. **Bundle add**: none (already have `pdf-lib`); leverage PDF.js v4+ `AnnotationEditorLayer`.

### Features

- **Text markup**: highlight, underline, strikethrough — drag selection, pick color.
- **Free text**: click to place, type inline, font/size/color picker.
- **Ink (freehand drawing)**: brush tool with size + color + opacity.
- **Sticky notes**: comment annotations with author + reply threading.
- **Stamps**: built-in set (Approved, Draft, Confidential, Reviewed) + consumer-supplied custom stamps via image input.
- **Shapes (Tier 3.5)**: rectangle, ellipse, line, arrow. Not in PDF.js editor — build on top of canvas overlay + `pdf-lib`.
- **Edit / delete** existing annotations.
- **Undo / redo** annotation operations.
- **Export annotations as JSON / FDF / XFDF**.
- **Save** mutated PDF via `pdf-lib` (returns `Uint8Array`).
- **Server-side mode**: emit annotation deltas instead of rewriting the PDF; useful for audit trails.

### Public API additions (Phase 3)

```ts
<hk-pdf-viewer
  ... Phase 1+2 inputs ...
  [annotationMode]="'highlight'"       <!-- 'select' | 'highlight' | 'underline' | 'strike' | 'freetext' | 'ink' | 'note' | 'stamp' -->
  [annotationConfig]="{ color, ink, ... }"
  [annotations]="loadedAnnotations()"  <!-- pre-supply (e.g. from server) -->
  (annotationCreated)="onCreated($event)"
  (annotationUpdated)="onUpdated($event)"
  (annotationDeleted)="onDeleted($event)"
/>

// Controller:
viewer.save()                           // Promise<Uint8Array> — full PDF
viewer.exportAnnotations('xfdf')        // Promise<string>
viewer.importAnnotations(xfdf)
viewer.undo() / viewer.redo()
```

### Phase 3 design decisions

- **PDF.js AnnotationEditorLayer vs custom canvas**: prefer AnnotationEditorLayer for primitives it supports (highlight, ink, free text, stamp). Custom canvas for shapes only.
- **Persistence**: client-side via `pdf-lib` save by default; server-side delta mode opt-in via input flag.
- **Author attribution**: `[annotationAuthor]="currentUser"` input; default to anonymous.

---

## Phase 4 — Signatures + page management + advanced

**Effort**: 2–4 weeks. **Bundle add**: maybe `pdf-lib` extensions or external service for crypto.

### Features

- **Handwritten signature**: canvas drawing pad → embed as image annotation at click location.
- **Digital signature (PKI)**:
  - Client-side via `pdf-lib`'s signing API (limited; works for self-signed test certs).
  - Server-side via consumer-supplied service (recommended for compliance — emit "ready to sign" payload, server signs, viewer reloads).
  - Verify existing signatures (PDF.js extracts; we surface validity in UI).
- **Page management**:
  - Rotate page (90° increments).
  - Delete page.
  - Reorder pages (drag in thumbnail sidebar).
  - Insert blank page.
  - Insert pages from another PDF.
  - All via `pdf-lib` mutations.
- **Document review threads**: comments + replies + resolve, built atop sticky-note annotations.
- **Navigation history**: back/forward buttons (like a browser) for jumps via internal links.
- **Right-click context menu**: copy text, add highlight, navigate to page.
- **Touch / mobile**:
  - Pinch-zoom on canvas.
  - Swipe between pages in single-page mode.
  - Long-press to start text selection.

### Public API additions (Phase 4)

```ts
<hk-pdf-viewer ...>
  ...
</hk-pdf-viewer>

// Controller methods:
viewer.rotatePage(pageNumber, degrees)
viewer.deletePage(pageNumber)
viewer.movePage(from, to)
viewer.insertBlankPage(after)
viewer.insertPagesFromPdf(pdfSource, pageRange?, after?)
viewer.signWithCertificate(cert)        // Promise<Uint8Array>
viewer.requestServerSignature()         // emits event, awaits server response
```

---

## Decisions to lock in before Phase 1 starts

1. **Greenlight scope**: Phase 1 only? Or commit to multi-phase roadmap?
2. **Worker hosting**: bundled asset (recommended). Confirm.
3. **Input source types**: `string | Uint8Array | Blob` — confirm all three.
4. **Default display mode**: `'continuous'` (Adobe-like) or `'single'` (Kindle-like). My pick: `continuous`.
5. **i18n**: `HK_PDF_LABELS` injection token. Confirm pattern.
6. **Toolbar customization**: template slot via `<ng-template hkPdfToolbar>`. Confirm.

## Decisions deferred to later phases

- **Annotation persistence**: client-side `pdf-lib` save vs server-side delta. Pick at Phase 3 kickoff.
- **Form validation API**: per-field callback vs Zod-style schema. Pick at Phase 2 kickoff.
- **Digital signature model**: Web Crypto + `pdf-lib` vs server-signing endpoint. Pick at Phase 4 kickoff (likely server-signing for compliance).

## Out of scope

- **PDF/A conversion**: niche, requires server-side tooling.
- **OCR on scanned PDFs**: needs a separate engine (Tesseract); deferred unless a real ask.
- **3D PDFs / multimedia**: Syncfusion doesn't support either; not pursuing.
- **PDF generation from scratch**: this is a viewer, not an authoring tool. Use `pdf-lib` directly if needed.

## References

- PDF.js: https://github.com/mozilla/pdf.js
- `pdfjs-dist`: https://www.npmjs.com/package/pdfjs-dist
- `pdf-lib`: https://pdf-lib.js.org/
- PDF.js v4 AnnotationEditorLayer: https://github.com/mozilla/pdf.js/wiki/Editor
- Syncfusion reference: https://help.syncfusion.com/document-processing/pdf/pdf-viewer/angular/overview

## Open architectural questions worth resolving early

1. **Memory model for large PDFs**: a 500-page PDF rendered into thumbnails + main viewport eats memory. Options: virtual-scroll the main viewport (already have `<hk-virtual-scroller>` we could reuse), aggressive page cache eviction. Plan to virtualize from day one.
2. **High-DPI rendering**: detect `devicePixelRatio` and render at 2× / 3× on retina screens. Default behavior; not configurable.
3. **Cancellation**: PDF.js operations return `RenderTask` with `cancel()`. Wire cancellation through `DestroyRef` to prevent leaks on rapid page changes.
4. **Web Worker fallback**: if worker fails to load (CORS, asset misconfigured), PDF.js falls back to main-thread parsing — slower but functional. Component should detect and warn.
