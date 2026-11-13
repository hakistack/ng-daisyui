# Docs platform — discovery findings

Written during the documentation overhaul (2026-11-13). The generated matrices are in
[documentation-inventory.md](./documentation-inventory.md) and
[documentation-coverage.md](./documentation-coverage.md) (`npm run docs:report`).
The architecture/dependency audit from a parallel pass is in
[architecture-inventory.md](./architecture-inventory.md).

## 1. What existed before

| Piece | State | Decision |
|---|---|---|
| `projects/demo` (v5 app) | Shell with a hand-written 330-line nav array, glass header, theme radio dropdown | Rebuilt the shell; nav is now derived from the catalog |
| `projects/shared-demos/demos/*` | 30 working demo pages, shared with the v4 app | **Kept as-is.** They now render inside the new doc template without edits |
| `projects/demo-v4` | daisyUI 4 / Tailwind 3 compatibility demo | Untouched. The new doc tabs are opt-in (`provideDocsPlatform()`), so v4 keeps the classic layout |
| `scripts/extract-api-docs.mjs` | Regex-based; only component `input()`/`output()`; 30 components | Replaced by a type-checker walk of every `public-api.ts` export (617 symbols, 12 kinds) |
| `SHOW_OVERVIEW = false` | Getting Started / Installation hidden ("showcase only") | Turned on: the package is published publicly on npm since `85dc567` |
| Getting started, Installation, Key patterns | Written, hidden | Kept, now reachable |
| `icons-demo.component.ts` | Existed, never routed | Routed under Foundations → Icons |
| Document editor | Exported (`createDocumentEditor`, editors, serializers), no demo | New demo page `/document-editor` |
| Demo blurbs | PDF Viewer said "PDF.js, scaffolding"; Document Viewer said "Phase 1" | Wrong today (PDFium; 12 renderers). Page summaries now come from the catalog |
| Search, i18n, API reference pages, playgrounds | Did not exist | Built (see below) |

## 2. Decisions

- **One app, not two.** The demo app is the docs site. Live examples are the existing demo components; the
  page template wraps them with Overview / Playground / API / Accessibility / Technical tabs (`?tab=`).
- **Code is the source of truth for API facts.** Inputs, outputs, types, signatures and JSDoc come from
  the generated manifest. The catalog/content only holds what a compiler cannot know.
- **i18n:** docs prose is authored as typed `{ en, es }` records next to its page. `@hakistack/i18n`
  (Transloco + key codegen) is built for app UI strings; for long-form, page-local prose a key indirection per
  paragraph added cost without benefit. `docs:check` enforces that both languages exist.
- **Search** reuses `<hk-command-palette>` with a custom `filter` (task-style scoring, EN/ES stopwords,
  stemming). The API manifest is a lazy chunk fetched on first open.
- **No new frameworks.** Shiki (already used) for code, ts-morph (already a devDependency) for extraction,
  jiti (already present) to load the TS catalog from Node scripts.

## 3. Library issues found while documenting

Found by reading the source to write the docs. The docs describe current behavior honestly; none of these
were fixed in the docs pass (library code was out of scope and was being edited by a parallel session).

### Forms & inputs
- Dynamic form: `multiselect` field type has no template case — renders `<input type="multiselect">` (a text box). The wizard demo uses `field.multiSelect`.
- Dynamic form: no `aria-invalid`; errors/help not linked with `aria-describedby`; error messages are English-only (`FormUtils.getErrorMessage`), not covered by `provideDynamicFormLabels`.
- Wizard: `validateStepOnNext` only affects `nextStep()`, which the stepper template never calls; gating comes from `[completed]`.
- `EditorFieldOptions.outputFormat: 'delta'` and `formats` are never passed to `hk-editor`.
- Select: open-panel document keydown cancels Space (likely blocks spaces in the search box); `aria-label` from `placeholder` overrides `<label for>`; virtual-scroll mode drops group headings.
- Datepicker: `showWeekNumbers` input unused; exported `DatepickerConfig` not consumed although its JSDoc shows `[config]`; `closeOnSelect` defaults `true` for ranges despite the type comment.
- Timepicker: `minTime`/`maxTime` validate but do not disable values (the `is*Disabled` helpers are never called); panel is `aria-modal` without a focus trap.
- Stepper: tabpanel `aria-labelledby="step-N"` points at non-existent ids; "Step X of Y" hard-coded English.
- Input: `libphonenumber-js` imported statically — every app using `hk-input` pays for it (also in architecture audit, D3).

### Data display
- Tree: `virtualScroll` / `virtualScrollItemHeight` and `selectionAllowParents` are never read; `config.nodeTemplate` ignored (only the projected template works).
- Tree: no default tab stop (all treeitems `tabindex=-1` until one is focused); rows lack `aria-level`. Tree Table rows lack `aria-level` / `treegrid` role.
- Table (CDK layout): `aria-sort` is on an inner element, not the `th`.
- `createFieldConfig` does not copy `config.id` → named `controller.get(id)` lookups may not resolve (not verified at runtime).
- Tree-table sort clones parent rows while selection is identity-based (not verified at runtime).
- Virtual Scroller grid mode passes the column position as `index`, not the global index.

### Navigation & feedback
- Command palette: results list has no listbox/option roles and no `aria-activedescendant`.
- App shell: focus trap only in overlay mode; hamburger has no `aria-expanded`; control labels English-only.
- Tabs: inactive panels are destroyed (state lost); `icon` input not rendered yet.
- `MenuConfig.submenuMode` declared but never read; menu items without `id` get a new id on every process (open state resets).
- Toast: after hover the toast closes after `extendedTimeOut`, not the remaining time; over-limit toasts silently dropped with `autoDismiss: false`.
- Notification: per-item `position` only changes slide direction; `*AriaPrefix` labels unused.
- **Alert: `html` / `htmlUrl` bypass sanitization (`bypassSecurityTrustHtml`) — XSS risk with untrusted content.** Opening a new alert drops the current one and its promise never resolves.
- Dialog: `openRaw()` dialogs do not close on navigation; `open()` returns `DialogRef<DialogWrapperComponent, unknown>`.

### Documents & engines
- Document editor JSDoc (`document-editor.helpers.ts`, `document-editor.types.ts`) says `[editor]="editor.config()"`; the input takes the controller: `[editor]="editor"`.
- `createDocumentEditor({ filename, mimeType })` options are never read; the format comes from the viewer's `[config]`.
- `DocumentViewerConfig` comments claim byte sniffing and reference a non-exported `createDocumentViewer()`; the code never inspects bytes (a hint-less `Uint8Array` resolves to `unknown`).
- WASM loader errors point to `node_modules/@hakistack/ng-daisyui/wasm/`, but `ng-package.json` ships no `wasm/` folder.
- `exportAs('pdf')` throws (documented as not implemented); no Ctrl+Z binding in the document editor; shell strings English-only.
- A WASM bundle that fails to load stays failed until reload (libheif excepted). No fallback for spreadsheet, TIFF or PDF rendering; JS fallbacks exist for table, tree, select, command palette, form conditions and PDF search.
- `autoSave: true` alone does nothing — it needs `provideFormState()` and an `autoSave` object with `formId`; failed saves are silent.

### Consumer docs & cross-cutting
- **`CONSUMER-USAGE.md` §10:** `const ok = await alert.confirm(...); if (!ok)` never fires — `AlertResult` is an object; use `result.isConfirmed`.
- `CONSUMER-USAGE.md` imports `themes/obsidian` (does not exist); Kaizen themes ship in `themes/` but the package `exports` map lists only `daisyui-v4.css` / `daisyui-v5.css`.
- `CONSUMER-USAGE.md` tells consumers to use `CUSTOM_PIPES`, which is not exported from `public-api.ts`.
- `DialogService` injects `Router` non-optionally (needs `provideRouter`).
- Dynamic form: `showWhen` hides but keeps validators — a hidden `required` field blocks submit (pair it with `requiredWhen`); per-field custom validators always show a generic message.
- `getSupportedExtensions()` lists formats with no renderer (doc, odt, ppt, pptx, odp); `BUILT_IN_RENDERERS` is not exported, so `getRenderableExtensions()` is hard to use. `DocumentViewerComponent` has no loading/error outputs and imports every renderer eagerly — lazy-route or `@defer` it.
- The shared `engine_wasm` chunk loads in most apps (any dynamic form, searchable select, table with data, tree, command palette).
- Table export bulk action uses string icon names (`sheet`, `file-spreadsheet`, `file-text`, `braces`) that consumers must register.
- PDFium worker uses a `blob:` URL → strict CSPs need `worker-src blob:`.
- Label providers are read once (no runtime language switch); `TableLabels`, `FilterLabels`, `PaginationLabels` not exported. `AccessibilityService` named in CLAUDE.md does not exist.

### Themes
- Kaizen theme: `neutral-content` (oklch 0.637) on `neutral` (oklch 0.289) is ~3.4:1, below WCAG AA for body text. Found by axe on the docs; the docs page avoids the pair, the theme itself is unchanged.

### Build
- `dompurify` type errors (TS2694 at `markdown.helpers.ts:150`, `html.renderer.ts:122`) reported in one agent's isolated `ngc` setup; the repo's own snippet check compiles cleanly, so this depends on type resolution — worth a look.

## 4. Baseline measurements

| Metric | Before | After |
|---|---|---|
| Dev-server initial bundle (`ng serve demo`) | 4.21 MB | 4.27 MB (+60 KB: catalog-driven nav, search scorer, locale strings) |
| Production initial (`ng build demo`) | just under the 4 MB error budget | 4.07 MB raw / 680 KB transfer — error budget raised to 4.2 MB |
| API manifest | — | 560 KB raw / 98 KB transfer, **lazy** (API pages, API tabs, search on first open) |
| Long-form content | — | one lazy chunk per page |

Why the initial bundle is large: in the demo, ~3.3 MB of the initial chunk is the library source itself — importing anything from the `@hakistack/ng-daisyui` barrel pulls in effectively the whole library (dev-build attribution: `lib` 3.37 MB, `@angular/cdk` 0.46 MB, `libphonenumber-js` 0.24 MB, `motion` 0.15 MB). The docs platform adds ~80 KB unminified. Fixing library tree-shaking is the real lever and is outside the docs work.
| Public symbols documented in a reference page | 30 components' inputs/outputs | 617 symbols, all kinds |
