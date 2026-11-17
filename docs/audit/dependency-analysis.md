# Dependency analysis

Measured on 2026-11-13 against `dist/hakistack/ng-daisyui` and a real consumer app (`scripts/consumer-smoke.mjs`:
Input + Select + Toast imported from the package root, Angular 21.2 application builder, production optimization).

## 1. Classification

| Package | Declared as | Who uses it | How it is loaded | Verdict |
|---|---|---|---|---|
| `@angular/core/common/forms/cdk/aria` | required peer `^21` | everything | static | correct |
| `@angular/router` | required peer `^21` (was optional) | Menu, Breadcrumbs, DialogService | **static** | fixed: optional was wrong (consumer build failed without it) |
| `rxjs` | required peer `^7.8` | services | static | correct |
| `daisyui` `^5`, `tailwindcss` `^4` | required peer | styles | CSS | correct for v5; the documented v4-legacy path (`ng add --target v4-legacy`) installs daisyUI 4 / Tailwind 3 and therefore conflicts with these ranges — see backlog |
| `@lucide/angular` | dependency | icons in most components | static | correct (tree-shakeable per icon) |
| `fuse.js` | dependency | Select search, Table fuzzy search (fallback when WASM is unavailable) | static | correct, 26 KB min in a basic consumer |
| `motion` | dependency | motion-* directives | static | correct; only reached when a motion directive is used |
| `uuid` | dependency | `generateUniqueId()` | static | 0.8 KB; kept on purpose (works in insecure contexts where `crypto.randomUUID` does not) |
| `libphonenumber-js` | dependency | Input `variant="phone"` | dynamic `import('./phone-lib')` on first phone input (was static) | **changed** — no longer in the initial bundle of apps using `hk-input` |
| `@tiptap/*` (8 packages incl. `@tiptap/pm`) | optional peer (was **dependency**) | `hk-editor` only | dynamic `import()` with install-hint error | **changed in 0.4.0** — consumers without the editor no longer install Tiptap |
| `docx-preview`, `@kenjiuno/msgreader`, `postal-mime`, `heic2any`, `dompurify`, `foliate-js` | optional peer | document-viewer renderers, markdown editor | dynamic `import()` inside try/catch | correct — verified: consumer builds **without** them installed |
| `@anthropic-ai/sdk` | optional peer | `hk-datagrid` `ask()` | dynamic `import()` | correct |
| `ts-morph` | optional peer | `migrate-table-columns` schematic only | dynamic require in schematic | correct (schematic prints an install hint) |

## 2. Static vs lazy — what a basic consumer pays

| | Before this pass | After |
|---|---|---|
| `main.js` (Input + Select + Toast) | 1.16 MB raw / 261 KB transfer | see [performance-baseline](performance-baseline.md) |
| Library code inside `main.js` | 543 KB min (included `hk-table` + 4 sub-components, `hk-datepicker`, `FormUtils`) | see performance-baseline |
| WASM / Tiptap / document libs in `main.js` | 0 | 0 |
| Lazy chunks emitted into the consumer `dist/` | ~9 MB (PDFium worker 6.25 MB, image 885 KB, document 791 KB, engine 672 KB) | unchanged (see public-api-review §5) |

Root cause of the leak: classes whose **static field initializers call functions** (`new Map(arr.map(...))`,
`Object.freeze([])`) are side-effectful to the bundler, so the class and everything its template references is kept.
Angular's optimizer already handles static fields with literal initializers (`new Map([[k, v]])`), which is why
`DynamicFormComponent` was correctly dropped. The [component guidelines](../architecture/component-guidelines.md#tree-shaking)
now forbid computed static initializers, and the consumer smoke test catches regressions by size.

## 3. Runtime-loaded engines

| Engine | Crates | Loader | Fallback | Init guard | Notes |
|---|---|---|---|---|---|
| `engine_wasm` (table, tree, fuzzy, form, pdf-search) | engine-core, table-engine, tree-engine, search-engine, form-engine | `utils/engine-loader.ts` (shared) | JS paths (Fuse, `ConditionEngine`, JS table pipeline) | `onceAsync` (`utils/wasm-loader.ts`) — retries after a rejected load | Select loads it only for ≥ 200 options after the first search |
| `document_wasm` | document-engine (calamine) | `document-engine-loader.ts` | none (spreadsheet renderer shows error) | `onceAsync` | |
| `image_wasm` | image-engine | `image-engine-loader.ts` | browser decode | `onceAsync` | |
| PDFium worker | pdf-engine + PDFium | `pdfium-worker.loader.ts` | none | per-engine `destroyed` guard, `terminate()` + `revokeObjectURL` on destroy | each pool worker builds its own 6 MB Blob and compiles both modules (memory/startup cost) |
| libheif | libheif-bridge (emscripten) | `libheif-loader.ts` | `heic2any` | — | path is not shipped in the package → always falls back |

Done in 0.4.0: `utils/wasm-loader.ts` (`decodeBase64` + `onceAsync`, reset-on-reject) is shared by the three loaders and
libheif. Still open (backlog D4): share one Blob URL / compiled `WebAssembly.Module` across PDFium pool workers. Do not move further JS logic into Rust unless a benchmark shows a win: the JS fallbacks are the simpler path for
small inputs (Select with < 200 options, forms without conditions).

## 4. Package weight

`npm pack`: 8.7 MB tarball, ~25 MB unpacked. 13 MB of that is `.map` files, ~5 MB of which map base64 WASM strings
(no debugging value). Options, in order of safety:

1. Exclude only the maps of the WASM/worker chunks (`*_inline-*.mjs.map`, `*_glue-*.mjs.map`) from the tarball.
2. Exclude all maps (common for Angular libraries, but loses source-level debugging of library code).

Not changed in this pass (it is a publishing policy decision); listed in the backlog.

## 5. Controls added

- `scripts/consumer-smoke.mjs` — installs the packed tarball into an isolated app with **only required peers**, builds
  it, and reports initial JS/CSS size. Catches: wrong optional peers, open-ended peer ranges, broken `exports`,
  type-only exports of values, tree-shaking regressions.
- `size-limit` budgets were measuring the unminified FESM of the *whole* library (634 KB gzip vs a 250 KB limit —
  failing on `main` before this pass). Replaced by consumer-facing budgets; see performance-baseline.
