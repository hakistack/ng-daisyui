# Monorepo migration — validation report (2026-11-17)

Covers migration steps M0–M6 ([plan](../maintenance/monorepo-migration-plan.md)). Nothing was committed, version-bumped
or published.

## Method

The shared working tree also holds another session's uncommitted work (alert, datagrid, select, table, editor…), and
during the run another process rebuilt `dist/`. To measure **only this migration**, every gate was run on a clean
export of `HEAD` (`git archive HEAD`) with exactly this migration's edits replayed on top, `node_modules` linked from
the workspace and `projects/demo-v4/node_modules` linked for `styles-v4.css`. The same gates were also run on the shared
tree; differences are explained below.

## Results — clean `HEAD` + migration

| Gate | Command | Result |
|---|---|---|
| Build ng-daisyui | `npm run build:ui` | ✓ 19 s (from a clean export — failed before the migration, audit C1) |
| Build i18n | `npm run build:i18n` | ✓ 2 s |
| Validate artifacts | `npm run validate` | ✓ ng-daisyui 43 files / 8.75 MB; i18n 16 files / 0.05 MB; all schematics load |
| Lint + boundaries | `npm run lint` | ✓ 0 errors (12 pre-existing `any` warnings); boundaries hold for both packages and the docs apps |
| Typecheck | `npm run typecheck` | ✓ ng-daisyui, i18n, i18n CLI |
| ng-daisyui unit tests | `npm run test:ui` | ✓ 1 899 tests / 74 files + 14 schematics tests |
| i18n unit tests | `npm run test:i18n` | ✓ 10 tests + 13 CLI/engine/schematics tests |
| All schematics/CLI tests | `npm run test:schematics` | ✓ 27 tests |
| Docs snippets | `npm run docs:snippets` | ✓ |
| Docs platform tests | `npm run test:docs` | ✓ 30 tests |
| Docs coverage | `npm run docs:check` | ✗ **pre-existing**: `api-manifest.generated.ts` committed in `HEAD` is stale (line numbers of `InputComponent` and `TabGroupComponent`, files this migration does not touch). Regenerating belongs with the session currently editing those files |
| ng-daisyui consumer install | `npm run test:consumer:ui` | ✓ initial JS 196.8 kB gzip (budget 205), CSS classes present |
| i18n consumer install | `npm run test:consumer:i18n` | ✓ no ng-daisyui installed; `hakistack-i18n scan/generate/validate` from the tarball; 51.0 kB gzip |
| Rust | `npm run check:engine`, `npm run test:engine` | ✓ 203 tests (shared tree; the engine is untouched) |
| Release dry run | `npm run release -- ui minor --dry-run`, `-- i18n patch --dry-run` | ✓ independent bumps, scoped tags |
| Publish guard | `node scripts/workspace/publish.mjs i18n --dry-run` | ✓ refused: `@hakistack/i18n@0.1.0` already on npm (intended) |
| Schematics in the artifact | `require('dist/…/schematics/ng-add/index.js').ngAdd` | ✓ `function` (was `undefined`, audit C2) |

## Shared working tree

Same results except `ng test @hakistack/ng-daisyui`: 1 failure at baseline (untracked `table.layouts.spec.ts`), 5 later
(`navbar.component.spec.ts`, `select.component.spec.ts`) — all in files another session is editing, and all green on
clean `HEAD` + migration. One run of `test:consumer:ui` found `dist/` missing because another process was rebuilding it.

## Changes made

**Imports corrected:** 3 type-only imports `motion-dom` → `motion` (ng-daisyui directives).
**Dependencies:** declared `@angular/platform-browser` peer of ng-daisyui (was used, undeclared). None added or removed
elsewhere; no new npm dependency (CI uses the `dorny/paths-filter` action).
**Packaging fixes:** schematics CJS marker (ng-daisyui); document/image WASM modules tracked; i18n/ng-daisyui
`repository.directory`, homepage, bugs.
**Breaking changes for consumers:** none. For maintainers: renamed scripts (plan §3); `npm run build` now builds both
packages; release tags are `<name>@<version>`.

## Pending risks

- ~~`docs:check` red until the API manifest is regenerated (pre-existing).~~ Resolved: the docs session regenerated the
  manifest; `docs:check` is green with M8a (64 pages, 61 content modules, 219 icons).
- Published `@hakistack/ng-daisyui@0.3.0` keeps the broken `ng add` and `@hakistack/i18n@0.1.0` the 404 repository link
  until their next releases (M10, needs authorisation).
- The first PR through the new `ci.yml` is the real test of the path filters and `ci-ok`; branch protection must be
  switched to require `ci-ok`.
- Not verified here: Vercel deployment (no access; its install command is now a single `npm install`) and the
  `libheif` emscripten job (needs emsdk).

## M7 — demo-v4 as npm workspace (same day)

Changes: root `"workspaces": ["projects/demo-v4"]`, `projects/demo-v4/package-lock.json` deleted, `install:v4` removed
(scripts, CI, release workflow, Vercel), CI caches `projects/demo-v4/node_modules`, duplicate `demo-v4` project removed
from the root `angular.json` (pure 90-line deletion), `esbuild` 0.27.3 declared (the version `@angular/build` uses;
single deduped copy).

Lockfile: 60 packages added (the Tailwind 3 stack; 7 conflicting ones nested under `projects/demo-v4/node_modules`),
none removed, 7 browser-data packages bumped (`browserslist` 4.28→4.29, `caniuse-lite`, `baseline-browser-mapping`,
`electron-to-chromium`, `node-releases`, `update-browserslist-db`, `hasown`) because `autoprefixer` resolved to 10.6.2.

| Check | Result |
|---|---|
| `styles-v4.css` from the same FESM, before vs after | byte-identical (`c535409b…`) |
| Fresh `git archive HEAD` + migration → `npm ci` (no other install) | ✓ 828 packages, 26 s; Tailwind 3.4.19 / daisyUI 4.12.24 nested |
| `build:ui`, `build:i18n`, `validate`, `lint` (+ boundaries) | ✓ |
| demo-v4 app (`npm --prefix projects/demo-v4 run build`) | ✓ 494 kB transfer initial |
| `test:ui` / `test:i18n` | ✓ 1 899 + 14 / 10 + 13 |
| `test:consumer:ui` / `test:consumer:i18n` | ✓ 196.8 kB / 51.0 kB gzip |

Rollback: `git checkout package.json package-lock.json angular.json vercel.json projects/demo-v4/package-lock.json`
and `npm ci`.

## M9 — peer ranges (same day)

Changes ([ADR-0010](../architecture/adr/0010-peer-ranges-tested-majors.md)): i18n `@angular/common`/`core`
`>=21.0.0` → `^21.0.0`, `rxjs` `>=7.8.0` → `^7.8.0`; ng-daisyui `@anthropic-ai/sdk` → `>=0.133.0 <2.0.0`, `ts-morph`
→ `>=20.0.0 <29.0.0`; `validate-package.mjs` turns the open-ended-peer warning into an error.

| Check | Result |
|---|---|
| `migrate-table-columns` spec against ts-morph 20.0.0 / 24.0.0 / 26.0.0 / 27.0.2 / 28.0.0 (isolated installs) | ✓ 12/12 each |
| `claude-json.ts` vs `@anthropic-ai/sdk` 0.133.0 / 1.9.0: `tsc --strict`, stubbed-fetch call (structured reply, 401) | ✓ identical results |
| `build:ui`, `build:i18n`, `validate` (no warnings left) | ✓ |
| `test:consumer:ui` / `test:consumer:i18n` | ✓ 198.5 kB / 52.2 kB gzip |

## M8b — @hakistack/i18n docs (same day, after the i18n commit `de198a2`)

Changes: `i18n` docs section (5 pages, EN/ES), `api-manifest.i18n.generated.ts`, package-aware API lookup/routes/search/
ownership, `docs:check` covering both manifests, article pages list the API they own (also the 6 ng-daisyui article
pages that own areas: theming, motion, form-state, formatters, wasm-engines, directives).

| Check | Result |
|---|---|
| `extract-api-docs` | ✓ ng-daisyui manifest byte-identical; i18n 57 symbols, no name collisions with ng-daisyui |
| `docs:check` | ✓ 621 + 57 symbols owned, 69 pages, 65 content modules; icons 223 (+4: `square-terminal`, and `scan`/`watch`/`cookie` from inline code in the CLI/runtime articles) |
| `test:docs` / `docs:snippets` | ✓ 35 tests (sidebar blocks, `/api/i18n` page match, per-package ownership and routes) / 70 snippets |
| `tsc -p projects/demo/tsconfig.app.json`, ESLint, Prettier (changed files) | ✓ |
| Playwright chromium `docs-platform` + `app` (own server on :58795) | ✓ 61/61 — axe on `/i18n`, `/i18n/runtime`, `/api/i18n`, `/api/i18n/LanguageService`; `/api` visual baseline regenerated (it predated M8a's sidebar and 4 new ng-daisyui symbols) |
| Browser | `/api/i18n` lists 57 symbols, `/api` 621 and no i18n; engine symbols show both import paths; tab titles `… · Hakistack i18n`; no console errors |
