# Architecture inventory — @hakistack/ng-daisyui

Audit date: 2026-11-13 · Package version: 0.3.0 (51 unreleased commits on `main`) · Angular 21.2 · daisyUI 5.5 · Tailwind 4.2

All paths are relative to `projects/hakistack/ng-daisyui/src/lib/` unless stated otherwise. Every finding was produced
from the source, from the built artifact in `dist/`, or from a real consumer build (`scripts/consumer-smoke.mjs`).
Findings marked **Fixed** were corrected in this pass; the rest are tracked in [Remaining work](#remaining-work).

## 1. Current structure

| Area | TS lines (excl. specs) | Spec files | Notes |
|---|---:|---:|---|
| `components/pdf-viewer` | 24 989 (+3 636 HTML) | 25 | PDFium worker + own PDF writer; 12 MB on disk because of the generated `pdfium_worker_inline.ts` (6 MB) |
| `components/table` | 4 855 (+1 601 HTML) | 2 | three parallel render layouts in one template |
| `grid-core` | 4 727 | 1 | controllers + WASM table engine bridge |
| `components/dynamic-form` | 3 698 | 3 | builder API + declarative adapter + WASM/JS condition engines |
| `components/document-viewer` | 2 864 | 5 | renderer registry, 11 built-in renderers |
| `components/datagrid` | 2 843 | 7 | enterprise grid, AI `ask()` |
| `components/tree` | 2 267 | 1 | |
| `directives` | 1 803 | 1 | motion-*, input-mask, auto-focus |
| `services` | 1 698 | 2 | dialog, form-state, pipe-registry, WASM engine services |
| `components/editor` | 1 512 | 0 | Tiptap, fully lazy |
| other components (17) | ~9 000 | 13 | |
| `wasm/` (generated) | 3 808 | — | wasm-bindgen glue + base64 inline modules |

Rust: `hakistack-engine/` — 10 crates compiled to 4 WASM bundles (`engine_wasm`, `document_wasm`, `image_wasm`,
`pdf_engine` inside the PDFium worker) plus an emscripten `libheif-bridge` excluded from the workspace.

Single entry point: `src/public-api.ts` (738 lines, ~615 exported names) → one FESM
`fesm2022/hakistack-ng-daisyui.mjs` (3.2 MB unminified) + 8 lazy chunks (WASM glue, base64 WASM, PDFium worker).

## 2. Findings

Severity: **Critical** = consumers break or data is at risk · **High** = wrong behaviour / a11y blocker / large cost ·
**Medium** = correctness or maintainability debt with workaround · **Low** = hygiene.

### Packaging & public API

| # | Sev | Finding | Evidence | Impact | Fix | Verify | Status |
|---|---|---|---|---|---|---|---|
| P1 | Critical | `@angular/router` declared an *optional* peer but statically imported by the root FESM | `menu.component.ts:15`, `breadcrumbs.component.ts:3`, `services/dialog/dialog.service.ts:5`; consumer build: `Could not resolve "@angular/router"` | Any consumer without the router cannot build, even if they never use Menu/Breadcrumbs | Make it a required peer | `node scripts/consumer-smoke.mjs` | **Fixed** |
| P2 | High | Tree-shaking defeated by side-effectful static initializers | `TableComponent.ACTION_ORDER_INDEX = new Map(X.map(...))` (`table.component.ts:1235`), `FormUtils.EMPTY_* = Object.freeze([])` (`dynamic-form.utils.ts:10-11`) | A consumer importing only Input/Select/Toast shipped `hk-table`, its 4 sub-components, `hk-datepicker`, `FormUtils` | Literal/PURE initializers | consumer smoke main.js size before/after ([performance-baseline](performance-baseline.md)) | **Fixed** |
| P3 | High | `provideDynamicFormLabels` (a function) exported inside an `export type {}` block | `public-api.ts:85` | TS1361 for anyone calling it — the documented i18n path | Value export | consumer smoke imports and calls it | **Fixed** |
| P4 | Medium | `exports["."]` conditions `esm2022`/`esm` point at `./esm2022/...`, which Angular 21 ng-packagr does not emit | `scripts/fix-exports.mjs`, no `dist/.../esm2022` | Bundlers honouring those conditions resolve nothing | Removed from `fix-exports.mjs` | inspect `dist/.../package.json` | **Fixed** |
| P5 | Medium | Source `package.json` declares `exports["."].types/default` which ng-packagr overrides (2 build warnings) | build log baseline | Noise; masks real warnings | Removed `.` from source; ng-packagr + `fix-exports.mjs` own it | build log has no "conflicting export condition" | **Fixed** |
| P6 | Medium | Shipped theme files `themes/kaizen.css`, `themes/kaizen-light.css` not reachable through `exports` | `package.json` exports, `shared-demos/demos/installation.component.ts:214` documents `@import ".../themes/kaizen"` | Documented import fails for published consumers | `./themes/*.css` + `./themes/*` patterns | consumer smoke / `node -e "import.meta.resolve(...)"` | **Fixed** |
| P7 | Medium | `HkTableApi` documented (`table.types.ts:444`) but not exported | `public-api.ts` | Consumers cannot type the `onSearch` callback argument | Additive type export | consumer smoke type import | **Fixed** |
| P8 | Medium | 13 MB of `.map` files and a 6 MB PDFium worker in the 8.7 MB tarball / 25 MB unpacked | `dist/.../fesm2022` | Install size | Decide whether to keep maps for WASM/worker chunks (see dependency-analysis §4) | `npm pack --dry-run` | Open |
| P9 | Medium | Second barrel `components/index.ts` drifted from `public-api.ts` (no Alert/Notification) and is imported internally | `services/dialog/dialog.service.ts:7`, `helpers/pagination.helper.ts:414` | Circular-import risk; two "sources of truth" | Import the concrete file; delete barrel | `npm run build`, `npm test` | **Fixed** |
| P10 | Low | `public-api.ts` header named the package `@hakistack/ui` | `public-api.ts:2` | Confusion | Updated header | — | **Fixed** |

### Dependencies

| # | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| D1 | High | 7 `@tiptap/*` packages are hard `dependencies` although only `hk-editor` uses them, and only via `import()` | `editor.component.ts:182-189`; consumer smoke installs them | Optional peers — breaking for `hk-editor` users, needs a minor + changelog (see migration guide) | Proposed |
| D2 | High | `hk-select` (`enableSearch`) and `hk-dynamic-form` fetch the 672 KB engine WASM chunk on mount, even for 3 options / no conditions | `select.component.ts:342-376`, `dynamic-form.component.ts:1146-1160` | Instantiate lazily (first keystroke / only when conditions exist) | Open |
| D3 | Medium | `InputComponent` statically pulls `libphonenumber-js` + mobile examples (154 KB minified in the consumer smoke) through a module-level `VARIANT_STRATEGY_MAP` | `input/input-variant-strategies.ts:1-2,246` | Lazy-load the phone strategy | Open |
| D4 | Medium | Four copies of WASM loader logic (`decodeBase64` ×4, inline-vs-URL ×3); rejected load promises cached forever | `utils/engine-loader.ts:50,98`, `image-engine-loader.ts`, `document-engine-loader.ts`, `libheif-loader.ts` | Shared `utils/wasm-loader.ts` (`decodeBase64`, `onceAsync` retry-on-reject) | **Partly fixed** (decode + retry shared; inline-vs-URL branches still per loader) |
| D5 | Medium | `hk-document-viewer` statically references all 11 renderers, incl. the full PDF viewer and `hk-table` | `document-viewer.builtins.ts:24-36` | `loadComponent` registration form | Open |
| D6 | Low | libheif WASM path is dead in published builds (relative `import()` to a folder that isn't shipped) | `libheif-loader.ts:108` | Ship artifacts or remove the path | Open |

### Duplication & mixed responsibilities

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| X1 | High | `hk-table` template renders three parallel layouts (virtual / grouped / CDK) with ~550-600 duplicated lines that have drifted: `hkCell` templates ignored in virtual & grouped mode, `aria-sort` and filters only in CDK mode | `table.component.html:228-565, 566-942, 943-1565` | Open (extract shared `ng-template`s) |
| X2 | Medium | grid-core is effectively hk-table-only: hk-datagrid uses `compareValues`/`matchesFilter` but none of the 9 controllers; sort-cycle, last-page and "never hide last column" logic exist twice | `datagrid.pipeline.ts:1`, `sort.controller.ts:85` vs `datagrid.helpers.ts:282` | Open |
| X3 | Medium | Toast / Notification / Alert each implement their own body-mount, pausable timer and exit delay; only Toast honours reduced motion | `toast.service.ts:318-363`, `alert.service.ts:434-454`, `notification-item.component.ts:149-216` | Open |
| X4 | Medium | Two `SelectOption` types (public generic one vs component's `string`-only one) — the consumer smoke caught `number` values being rejected | `select.types.ts` vs `select.component.ts:23-29` | Open |
| X5 | Medium | Two diverging tree drop-event types (`api/treenode.ts:138` public vs `tree.types.ts:198` actually emitted) | | Open |
| X6 | Low | Three id-generation strategies (`uuid`, `Math.random`, module counters) | | Open |

### Dead code (verified by repo-wide grep incl. demos, shared-demos, demo-v4, e2e)

| Item | Evidence | Status |
|---|---|---|
| `lib/helpers/` (pagination helper 477 lines, base-list-params) | not in `public-api.ts`, no importers; looks like an unfinished consumer feature | Decision: export or delete (backlog #3) |
| `lib/utils/list.ts` (`List<T>`, 188 lines) | no importers | **Deleted** |
| `dialog-wrapper/dialog-wrapper.component.spec.ts.bak` | backup file | **Deleted** |
| ~18 unused `TableComponent` members (`openFilterPos`, `columnWidthsSignal`, `trackByPage`, `getCellDisplay`, …) and `rowHasChildren` | grid audit §4 | Open |
| `createWizard` (`dynamic-form.helpers.ts:840`) | not exported, no callers | Open |
| Rust `save_document` + worker `'save'` path | real save path is the TS writer | Open |
| pdf.js remnants (`angular.json` `prebundle.exclude: ["pdfjs-dist"]`, demo copy) | no `pdfjs-dist` dependency | Open |

### Correctness bugs found during the audit

| # | Sev | Bug | Evidence | Status |
|---|---|---|---|---|
| B1 | High | A replaced alert's promise never settles (`confirm()` then `show()` → first await hangs forever) | `alert.service.ts:401-403` | **Fixed** (`alert.service.spec.ts`) |
| B2 | High | `field.multiSelect()` renders `<input type="multiselect">` — no `@case ('multiselect')` | `dynamic-form.component.html:120-316` | **Fixed** (spec) |
| B3 | High | Select & Datepicker read `setDisabledState` from a plain field inside a `computed()` → stale disabled state after render | `select.component.ts:155,232,432` | **Fixed** (select + datepicker specs) |
| B4 | High | Auto-save persists password fields in plaintext | `dynamic-form.component.ts:1276-1289` | **Fixed** (spec) — listed as breaking in CHANGELOG |
| B5 | High | Alert `html`/`htmlUrl` bypasses Angular's sanitizer without documentation | `alert-overlay.component.ts:138-141` | Needs decision (behaviour change) |
| B6 | High | Hidden (`showWhen`) required fields still block submit, invisibly | `dynamic-form.component.ts:1225-1229` | Needs decision |
| B7 | Medium | Function/signal conditions silently disable the WASM form engine (schema builder throws on `__predicate__`, error swallowed) | `schema-builder.ts:143`, `dynamic-form.component.ts:1159` | Open |
| B8 | Medium | `input-${size}`/`input-${color}` built with template literals → invisible to Tailwind scanning | `input.component.ts:177-179`, `select.component.ts:267-275` | **Fixed** (`.input-primary` was absent from consumer CSS) |


### Documentation

| # | Sev | Finding | Status |
|---|---|---|---|
| Doc1 | High | Library README (= npm page) says "Private package / UNLICENSED" and points at a private registry; package is public MIT | Fixed |
| Doc2 | High | Library README uses removed `field.select(key, choices, label)` / `field.password({validation})` signatures and an import path `themes/daisyui-v4-preset` that does not exist | Fixed |
| Doc3 | High | CHANGELOG stops at 0.1.92; 0.2.x–0.3.0 and 51 unreleased commits (with breaking removals) unrecorded | Unreleased section added |
| Doc4 | Medium | Root README is Angular CLI boilerplate ("Karma", `ng e2e`) | Fixed |
| Doc5 | Medium | CLAUDE.md/AGENTS.md list non-existent `AccessibilityService`, and `CUSTOM_PIPES`/`FORM_STATE_OPTIONS` as public extension points (they are internal tokens) and the wrong required-peer list; CONSUMER-USAGE references removed `provideHkPdfDefaults`, private `ALERT_CONFIG`, non-existent `obsidian` theme and an action shape that does not type-check | Fixed |
| Doc6 | Medium | Plans/roadmaps/feasibility studies at repo root and inside `src/lib/components/**` | Open (proposed layout in maintainer guide) |

## 3. Circular dependencies

No module cycles were reported by the Angular compiler or ng-packagr. The one structural risk is the internal barrel
`components/index.ts` being imported from `services/dialog/dialog.service.ts` while components import services (P9).
grid-core → components imports are already blocked by ESLint (`eslint.config.mjs`).

## 4. Breaking-change risk register

| Change | Risk | Mitigation |
|---|---|---|
| `@angular/router` optional → required peer | Low: every app with Menu/Breadcrumbs/DialogService already needs it; npm auto-installs required peers | Changelog note |
| Tiptap → optional peers (proposed) | Medium for `hk-editor` users | Minor bump, install hint in error, migration guide |
| Secondary entry points (deferred) | High: every document-component import path changes | Not done; see public-api-review §4 |
| Sanitizing alert HTML (proposed) | Medium: markup relying on `style` attributes changes | Needs maintainer decision |

## Remaining work

See the table in the final report and [maintainer-guide.md](../maintenance/maintainer-guide.md#backlog).
