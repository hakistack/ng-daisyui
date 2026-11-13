# Library architecture

How `@hakistack/ng-daisyui` is organised, which way dependencies point, and where new code goes.

## 1. Positioning

daisyUI already provides the visual layer as CSS. This library is the **Angular behaviour layer** on top of it:
forms integration (ControlValueAccessor), accessibility and keyboard models, overlay behaviour, typed builder APIs,
data handling, and document viewing/editing. If HTML + daisyUI classes solve a problem accessibly, the library does
not wrap it — the docs show the HTML instead ([component-matrix §2](../audit/component-matrix.md#2-daisyui-v5-catalogue-vs-this-library)).

## 2. Layers (current folders)

```
src/public-api.ts            ← the ONLY entry point and the only list of public names
src/lib/
  components/<name>/          public components; their helpers/types/sub-components live next to them
  grid-core/                  render-agnostic grid logic (controllers, predicates, aggregates, WASM table bridge)
  services/                   cross-component services (dialog, form-state, pipe registry, WASM engine services)
  directives/                 behaviour directives (motion-*, input-mask, auto-focus)
  utils/                      pure functions + WASM loaders (no Angular components)
  theme/                      daisyUI v4/v5 class-name mapping (HK_THEME); never sets a global theme
  types/, api/                shared public types
  wasm/                       GENERATED wasm-bindgen glue + base64 modules (never edit)
hakistack-engine/             Rust crates → wasm (see §5)
```

Allowed dependency directions (→ = "may import"):

```
components ──→ grid-core ──→ utils
     │  └────→ services ───→ utils
     └───────→ directives, theme, types
grid-core ─✗→ components      (ESLint-enforced: no-restricted-imports)
utils     ─✗→ components, services
```

The proposed `core/ · data/ · forms/ · documents/ · engines/` regrouping was evaluated and **not** applied as a mass
move: the current folders already separate these concerns (`grid-core` = data core, `components/pdf-viewer` +
`document-*` = documents, `utils/*-loader.ts` + `services/*engine*` = engines). Moving ~70 k lines would bury
regressions in rename noise without reducing coupling. Re-evaluate when a secondary entry point is introduced
(public-api-review §5); at that point the documents folders move together.

## 3. Public API

- `src/public-api.ts` is the single source of truth. Internal barrels must not be re-exported; the drifted
  `components/index.ts` barrel was deleted in this pass.
- Values and types are exported separately (`export { … }` vs `export type { … }`). Never put a function or token in an
  `export type` block (it compiles but is unusable by consumers — this happened to `provideDynamicFormLabels`).
- One entry point today; `@hakistack/ng-daisyui/documents` is planned (see migration guide) once the prerequisites in
  public-api-review §5 are done.

## 4. Loading strategy (why one entry point is acceptable today)

| Heavy thing | How it stays out of the initial bundle |
|---|---|
| WASM engines (table/tree/search/form, spreadsheet, image) | `import()` of generated glue + base64 module in `utils/*-loader.ts` |
| PDFium + pdf_engine | worker source inlined into a lazy chunk, started by `pdfium-worker.loader.ts` |
| Tiptap | `import()` inside `hk-editor` |
| docx-preview, msgreader, postal-mime, heic2any, dompurify, foliate-js | `import()` inside renderers, optional peers, try/catch with install hint |
| Anthropic SDK | `import()` inside the datagrid AI layer, optional peer |

Tree-shaking of *components* depends on the FESM having no module-level side effects. Rules in
[component-guidelines §Tree-shaking](component-guidelines.md#tree-shaking); verified by `npm run test:consumer`.

## 5. Engines (Rust/WASM)

| Bundle | Crates | Consumers | JS fallback |
|---|---|---|---|
| `engine_wasm` | engine-core, table-engine, tree-engine, search-engine, form-engine | table, tree, select search, form conditions, PDF search | yes (JS pipeline, Fuse, `ConditionEngine`) |
| `document_wasm` | document-engine (calamine) | spreadsheet renderer | no |
| `image_wasm` | image-engine | image renderer | browser decode |
| `pdf_engine` + PDFium | pdf-engine (vendored pdfium-render) | PDF viewer worker pool | no |
| libheif (emscripten) | libheif-bridge | HEIC images | `heic2any` |

Loader contract (`utils/wasm-loader.ts`): decode once, share one module per app, **retry after a failed load**
(`onceAsync`), allow a URL override token for CSP/offline setups. Use WASM only where a benchmark shows a win; small
inputs stay on the JS path.

## 6. Styling

- Components use daisyUI semantic classes and tokens only; no hardcoded colours.
- Tailwind v4 consumers `@import "@hakistack/ng-daisyui"`; `styles.css` points Tailwind's scanner at the FESM
  (`@source "./fesm2022/hakistack-ng-daisyui.mjs"`). Therefore **every class must appear as a literal string** in the
  source (no `` `input-${size}` ``).
- daisyUI 4 / Tailwind 3 consumers import the precompiled `styles-v4.css` (generated by `scripts/build-lib-css.mjs`).
- Components never set `data-theme` or persist a theme; that is the application's job.

## 7. Build & package pipeline

`npm run build` = `build-pdfium-worker.mjs` → `ng build` (ng-packagr, partial compilation) → `build-lib-css.mjs`
(styles-v4.css) → `fix-exports.mjs` (adds `style`/`browser` conditions + stylesheet exports) → `build-schematics.mjs`.
Then `npm run test:consumer` validates the packed artifact in a clean app.
