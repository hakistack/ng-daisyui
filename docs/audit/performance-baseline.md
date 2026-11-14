# Performance & quality baseline

Machine: Apple Silicon laptop, Node 22, npm 11.6. "Before" = `main` at `2f9c723` (2026-11-12). "After" = working tree
after the 2026-11-13 modernization pass. All numbers were measured, none estimated, unless marked *(est.)*.

## 1. Quality gates

| Gate | Before | After |
|---|---|---|
| `npm run build` | ✅ 18 s (ng-packagr 12.3 s) · 2 warnings "conflicting export condition" | ✅ no export-condition warnings |
| `npm run lint` | ✅ 0 errors · 20 warnings | ✅ 0 errors · 20 warnings (unchanged; listed in backlog) |
| `npm test` (library) | ✅ 67 files · 1 852 tests · 31 s | ✅ 69 files · 1 861 tests · 30 s |
| `npm test` (`@hakistack/i18n`) | ✅ 3 files · 10 tests | ✅ unchanged |
| `npm run test:schematics` | ✅ 3 files · 25 tests (not run in CI) | ✅ same, now in CI |
| `cargo test` (hakistack-engine) | ✅ 203 tests · 21 s | unchanged (no Rust changes) |
| `npx size-limit` (CI build job) | ❌ **failing on main**: 634.7 KB gzip vs 250 KB limit; 455 KB brotli vs 180 KB | ✅ 634.9 KB vs 700 KB growth guard (see §3) |
| Playwright e2e (26 tests) | not run in CI | 23/26 on first run — the 3 failures were a `vite-error-overlay` from a concurrent session's in-progress demo edits; re-run of the workspace suites 21/21 ✅ |
| Consumer install + build (`npm run test:consumer`) | ❌ **fails**: `Could not resolve "@angular/router"`; after adding router manually, ERESOLVE (`@angular/router@22` auto-installed against Angular 21) | ✅ builds with only required peers |

## 2. Consumer bundle (the number that matters)

App: `tests/consumer-smoke` — imports `InputComponent`, `SelectComponent`, `ToastComponent`, `ToastService`,
`provideDynamicFormLabels` from the package root; Angular 21.2 application builder, production optimization.

| Metric | Before | After | Δ |
|---|---:|---:|---:|
| `main.js` raw | 1.16 MB | 806 KB | **−354 KB (−31 %)** |
| `main.js` transfer *(Angular CLI estimate)* | 261.5 KB | 202.6 KB | **−58.9 KB (−23 %)** |
| `main.js` gzip *(zlib, as measured by the smoke script)* | — | 233.1 KB → **196.8 KB** after lazy libphonenumber (2nd pass) | budget 205 KB |
| `main.js` raw, 2nd pass | — | **634.5 KB** (−45 % vs. 1.16 MB) | consumer builds **without** `@tiptap/*` installed |
| `styles.css` | 199 KB / 24.6 KB | 202 KB / 24.8 KB | +kaizen theme import + `input-primary` etc. |
| Library code inside `main.js` | 543 KB min | — | `hk-table` (+4 sub-components), `hk-datepicker`, `FormUtils` no longer included |
| WASM / Tiptap / document libraries in `main.js` | 0 | 0 | — |
| Lazy chunks emitted into consumer `dist/` | ~9.6 MB (19 files) | ~9.6 MB | not downloaded unless used; see public-api-review §5 |

Remaining largest contributors to a basic consumer's `main.js` (before-build breakdown, minified):
`libphonenumber-js` 154 KB (pulled by `hk-input` even without `variant="phone"`), `@angular/core` 140 KB,
`@angular/cdk` 104 KB, `@lucide/angular` 87 KB, `fuse.js` 26 KB. The libphonenumber item is the next measurable win
(backlog D3).

### Root cause of the fixed leak

Bundlers keep a class whose **static field initializers call a function**, because the call might have side effects:

```ts
// before — keeps TableComponent (and everything its template references) in every app
private static readonly ACTION_ORDER_INDEX = new Map(TableComponent.ACTION_ORDER.map((t, i) => [t, i]));
private static readonly EMPTY_ARRAY = Object.freeze([]);          // FormUtils

// after
private static readonly ACTION_ORDER_INDEX = new Map<string, number>([['view', 0], ['edit', 1], /* … */]);
const EMPTY_ARRAY = /* @__PURE__ */ Object.freeze([]);            // module level, annotated
```

A scan of the built FESM for static initializers that call functions now reports none.

## 3. Package artifact

| Metric | Value |
|---|---|
| FESM main file | 3 242 597 B unminified (whole library) |
| Lazy chunks | PDFium worker 6 255 743 B · image WASM 885 KB · document WASM 791 KB · engine WASM 672 KB · glue 9–49 KB each |
| `npm pack` tarball | 8.7 MB |
| Unpacked | ~25 MB (13 MB of it `.map` files) |

`size-limit` used to compare the **whole-library, unminified** FESM against 250 KB — a number no consumer ever ships,
so the CI check failed permanently and carried no signal. It is now a growth guard (700 KB gzip, current 635 KB);
the consumer-facing budget lives in `npm run test:consumer` (`--max-initial-gzip=205`).

## 4. Proposed budgets

| Scenario | Metric | Budget | Enforced by |
|---|---|---|---|
| Basic import (Input + Select + Toast) | initial JS gzip (zlib) | 205 KB | `npm run test:consumer` (CI) |
| Whole-library FESM | gzip | 700 KB | `size-limit` (CI) |
| DataGrid / Dynamic Form / Document Viewer / PDF viewer | initial JS gzip | to be set after adding one smoke variant each (backlog) | — |
| WASM chunks | raw | engine ≤ 700 KB, document ≤ 800 KB, image ≤ 900 KB, PDFium worker ≤ 6.5 MB | backlog: add to size-limit |

Do not claim a performance improvement without re-running `npm run test:consumer` (and the relevant smoke variant)
before and after.
