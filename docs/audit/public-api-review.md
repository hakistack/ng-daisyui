# Public API review

## 1. Single source of truth

`projects/hakistack/ng-daisyui/src/public-api.ts` is the **only** file ng-packagr uses as an entry point
(`ng-package.json → lib.entryFile`). Everything it does not re-export is internal, whatever its `export` keyword says.

| Item | Finding | Action |
|---|---|---|
| `lib/components/index.ts` | A second, drifted barrel (missing Alert, Notification, DataGrid…). Not part of the package entry, but imported internally by `services/dialog/dialog.service.ts:7` and `helpers/pagination.helper.ts:414` | Replace those imports with concrete paths, then delete the barrel (backlog) |
| `export type { … provideDynamicFormLabels }` | A function exported as a type → unusable (TS1361) | **Fixed** — now a value export |
| `HkTableApi` | Documented in JSDoc for `onSearch`, not exported | **Fixed** — additive type export |
| Header comment | Named the package `@hakistack/ui` | **Fixed** |
| ~615 exported names | Many are implementation-level (e.g. `EngineTable*`, `ConditionEngine`, `FormUtils`, PDF writer fonts, CMS/X.509 helpers) | Kept: removing any is breaking. Candidates for `@deprecated` + removal in 1.0 are listed below |

### Exports worth deprecating before 1.0 (not changed now)

These are exported but are engine/implementation details that pin internal structure:

- `ConditionEngine`, `FormUtils` (dynamic-form internals; `FormUtils.evaluateCondition(s)` already deprecated in code).
- `projectFields`, `clearHeaderFormatCache` (no use in the repo).
- `EngineTable*` / `EngineTree*` bridge types, `FuzzyEngineService`, `FormEngineService`, `PdfSearchService` — useful for power users but
  their shape follows the Rust crates.
- PDF signing primitives (`core/signatures/cms`, `x509`) and PDF-writer font helpers.

Policy (see [maintainer-guide](../maintenance/maintainer-guide.md#api-stability)): mark with `@deprecated` + changelog entry in a minor,
remove in the next major.

## 2. Snapshot of the public surface

The exact surface is captured by the built declaration bundle `dist/hakistack/ng-daisyui/types/hakistack-ng-daisyui.d.ts`.
The consumer smoke app (`tests/consumer-smoke/src/main.ts`) compiles against that file with `strictTemplates`, imports
representative value and type exports from the package root, and therefore fails if any of them disappear or become
type-only by accident.

## 3. Package `exports` map

Before (published 0.3.0 / built from `main`):

```jsonc
".": { "types", "browser", "esm2022": "./esm2022/…", "esm": "./esm2022/…", "style", "default" },  // esm2022/ is never emitted
"./themes/daisyui-v4.css", "./themes/daisyui-v5.css"                                              // kaizen*.css shipped but unreachable
```

After:

```jsonc
".": { "types", "browser", "style": "./styles.css", "default": "./fesm2022/hakistack-ng-daisyui.mjs" },
"./styles", "./styles.css", "./styles-v4", "./styles-v4.css",
"./plugin", "./plugin.mjs",
"./themes/*.css": "./themes/*.css",
"./themes/*":     "./themes/*.css",     // `@import "@hakistack/ng-daisyui/themes/kaizen"` works
"./package.json"
```

`"."` is no longer declared in the source `package.json` (ng-packagr generates it and warned about the conflict);
`scripts/fix-exports.mjs` adds the `browser`/`style` conditions after the build.

## 4. Peer dependency ranges

| Peer | Before | After | Why |
|---|---|---|---|
| `@angular/*` | `>=21.0.0` | `^21.0.0` | npm auto-installs required peers at the **newest** version matching the range. With `>=21` a fresh Angular 21 app got `@angular/router@22` → ERESOLVE (reproduced by the consumer smoke test). The library is only built and tested on 21. |
| `@angular/router` | optional | required | Statically imported by the root FESM (Menu, Breadcrumbs, DialogService) |
| `rxjs` | `>=7.8.0` | `^7.8.0` | Same open-range problem |

Angular 22 support is a separate, deliberate bump (update the workspace, re-run the suite, widen to `^21 || ^22`).

## 5. Secondary entry points — evaluated, deferred

Candidates: `@hakistack/ng-daisyui/documents` (pdf-viewer, document-viewer, document-editor, workspaces),
`/data` (table, datagrid, tree, grid-core), `/forms`, `/engines`.

Evidence gathered:

- **Initial-bundle isolation already works** for the heavy parts: every WASM module, the PDFium worker, Tiptap and the
  document libraries are behind `import()` and become lazy chunks. The consumer smoke build shows no WASM/Tiptap bytes
  in `main.js`.
- **What did leak** into a basic consumer was caused by side-effectful static initializers (`TableComponent`,
  `FormUtils`), not by the single entry point. Fixed at the source; see [performance-baseline](performance-baseline.md).
- **Lazy chunks are still emitted** into every consumer's `dist/` (6.25 MB PDFium worker etc.) because esbuild code-splits
  every `import()` it finds in the FESM. They are never downloaded unless used, but they cost build time and deploy size.
  This is the strongest argument *for* a `/documents` entry point.
- **Cost of splitting now:**
  - Every root import of `PdfViewerComponent`, `DocumentViewerComponent`, `createPdfViewer`, `Document*Renderer`… changes
    (deprecated root re-exports would keep the chunks in the root FESM until removed).
  - Secondary entry points cannot import the root by relative path: `pdf-viewer/` reaches into `table/*`, `mesa/*`,
    `utils/format-bytes`, `utils/command-stack`, `theme/theme.config`, `services/*`, which would all have to become
    public root exports first.
  - `styles.css` tells Tailwind to `@source "./fesm2022/hakistack-ng-daisyui.mjs"` (one file). A second FESM needs an
    explicit second `@source` line (a glob would also scan the multi-MB base64 chunks), and `scripts/lib-css.config.mjs`
    must be updated likewise.
  - `hk-dynamic-form` statically imports `hk-editor`, so the editor must stay in the root entry anyway.

**Decision:** keep one entry point for 0.4.x. Do the prerequisites first (barrel removal, lazy document renderers,
lazy phone strategy, Tiptap optional peers), then introduce `/documents` in a minor with deprecated root re-exports and
remove them in the next major. Recorded in the migration guide as a planned change.

## 6. Naming consistency (observed)

| Convention | State |
|---|---|
| Selectors | `hk-*` everywhere except `[appAutoFocus]` (directive). Rename needs an alias `[hkAutoFocus]` + deprecation |
| Builders | `createForm`, `createTable`, `createTree`, `createDataGrid`, `createPdfViewer`, `createCommandPalette`, `createDocumentEditor` — consistent `create*` |
| Providers | `provideToast`, `provideHkTheme`, `provideDynamicFormLabels`, `providePipes`… — mix of `provideX` and `provideHkX` |
| Label tokens | `HK_*_LABELS` for newer components; dynamic-form uses `DYNAMIC_FORM_LABELS` (internal) + `provideDynamicFormLabels` |
| Two-way binding | No component uses `model()`; value flows through CVA (`formControl`) or `selectionChange`-style outputs |

Recommendations are in [component-guidelines](../architecture/component-guidelines.md).
