# Maintainer guide

## Daily commands

| Task | Command |
|---|---|
| Build the package | `npm run build` |
| Unit tests | `npm test` (Vitest through `@angular/build:unit-test`; filter with `npx ng test @hakistack/ng-daisyui --watch=false --include='**/select/*.spec.ts'`) |
| Schematics tests | `npm run test:schematics` |
| Lint | `npm run lint` |
| E2E (+axe) | `npm run e2e` (starts or reuses the demo server on :58790) |
| Packed-artifact test | `npm run build && npm run test:consumer` |
| Rust engines | `npm run engine:check`, `npm run engine:test`, `npm run engine:build` |
| Docs checks | `npm run docs:check`, `npm run docs:snippets`, `npm run test:docs` |

## Quality gates (CI)

`lint` · `test` (+ schematics) · `docs` · `build` (+ size-limit growth guard + consumer smoke) · `rust` · `libheif`
(non-blocking). A PR is mergeable when all blocking jobs are green.

What each guard prevents:

| Regression | Caught by |
|---|---|
| Optional/required peer mistakes, open-ended peer ranges, broken `exports`, type-only value exports | `test:consumer` |
| Basic components dragging in table/datepicker/etc. (tree-shaking) | `test:consumer` initial-JS budget |
| Whole-library growth | `size-limit` (700 KB gzip) |
| grid-core importing components | ESLint `no-restricted-imports` |
| Public API without docs, stale API manifest | `docs:check` |
| Rust formatting / clippy / tests | `rust` job |

## API stability

Pre-1.0 SemVer as practised here: **minor = may break, patch = never breaks**.

1. Every public change goes through `src/public-api.ts`; nothing else is public.
2. Removing or renaming a public name: mark it `@deprecated` (JSDoc with the replacement) in a minor, list it in the
   CHANGELOG "Deprecated" section, remove it in a later minor (or the next major after 1.0).
3. Behaviour changes that can affect existing apps go under "⚠ Breaking changes" in the CHANGELOG with an entry in
   [migration-guide.md](migration-guide.md), even when the old behaviour was a bug.
4. Peer ranges name the majors that are built and tested (`^21.0.0`). Supporting a new Angular major is a deliberate
   change: update the workspace, run all gates, then widen to `^21 || ^22`.

## Releasing

1. Move the CHANGELOG "Unreleased" section under the new version heading (the release script does not write it).
2. `npm run release:<patch|minor|major>` (bumps the version and builds).
3. `npm run test:consumer`.
4. `npm run publish:npm`, then tag `vX.Y.Z` and push the tag.

## Adding a component

Follow [component-guidelines.md](../architecture/component-guidelines.md). In short: justify it against plain
daisyUI; put it under `components/<name>/`; export it (and its types/labels/provider) from `public-api.ts`; add specs
(including ARIA relationships and CVA disable/enable); add a demo page and the docs-catalog entry; run
`npm run docs:check && npm test && npm run build && npm run test:consumer`.

## Parallel work in this repo

Several sessions/contributors edit the working tree at the same time. Stage by pathspec (`git add <paths>`), never
`git add -A`, and don't stash or reset other people's changes.

## Backlog

Prioritised remaining work from the 2026-11 audit ([architecture-inventory](../audit/architecture-inventory.md)).
"Decision" items need a maintainer call before implementation because they change behaviour.

| # | Area | Item | Size |
|---|---|---|---|
| 1 | Decision | Alert `html`/`htmlUrl` bypasses Angular's sanitizer: sanitize by default (drops `style` attributes) or keep + add an explicit `trustedHtml` opt-in and document the XSS risk | S **[Done — sanitized by default, `trustedHtml` opt-in]** |
| 2 | Decision | Hidden (`showWhen`) fields still validate and submit: disable hidden controls (excluded from `form.value`) or only exclude from validation | M **[Done — hidden fields disabled]** |
| 3 | Decision | `lib/helpers/` pagination helpers (`createCursorPagination`, …) were never exported: export them as public API or delete them | S **[Done — deleted]** |
| 4 | Decision | Tiptap → optional peers (breaking for `hk-editor` users; needs try/catch install hint and structural types) | M **[Done — optional peers]** |
| 5 | Deps | Lazy-load the phone strategy in `hk-input` (−154 KB min from every app using `hk-input`) | S **[Done]** |
| 6 | Deps | Create the WASM fuzzy/form engines on first use (first keystroke / only when conditions exist) instead of on mount | S **[Done for select (form engine still on mount when conditions exist)]** |
| 7 | Deps | Lazy document renderers (`loadComponent` registration) + magic-byte MIME sniffing + `File.name` | M |
| 8 | Deps | Share one Blob URL / compiled module across PDFium pool workers; ship or remove the libheif path | M |
| 9 | Deps | Decide on source maps in the tarball (at least drop maps of base64 WASM chunks) | S |
| 10 | a11y | Dynamic-form error association + label association for pickers/radios/editor | M **[Done]** |
| 11 | a11y | `hk-table`: move `aria-activedescendant` to the focused host, per-instance cell ids, `aria-sort` on `th` in all layouts | M **[aria-sort done; activedescendant + cell ids open]** |
| 12 | a11y | Tree level/setsize/posinset/checked; notification single live region; toast focus-pause + persistent live region; command palette combobox; menubar keys | M **[Mostly done (tree, notification, palette); toast focus-pause + menubar keys open]** |
| 13 | Structure | `hk-table` three layouts → shared `ng-template`s for header cell, row checkbox, select-all, actions (also fixes `hkCell` ignored in virtual/grouped mode) | L |
| 14 | Structure | Toast/Notification/Alert: shared `body-host` + `pausable-timer` utils, reduced-motion-aware exit delay | M |
| 15 | Structure | grid-core: pure `nextSort()` and paging helpers used by both grids; one row-key rule | S |
| 16 | Structure | Two `SelectOption` types → one generic type; two tree drop-event types → alias | S |
| 17 | Dead code | ~18 unused `TableComponent` members, `rowHasChildren`, `createWizard`, Rust `save_document` path, pdf.js remnants in `angular.json` | S **[Partly: `rowHasChildren`, `createWizard` deleted; table members deprecated]** |
| 18 | Tests | grid-core controller specs, `table-engine-routing`, `FormHandle`/`FormEngineService` parity with `ConditionEngine`, Editor/CommandPalette/Notification specs | M |
| 19 | Tests | axe over every demo route; make `e2e/app.spec.ts` assertions unconditional; Playwright in CI | M |
| 20 | Tests | consumer-smoke variants for DataGrid, Dynamic Form, PDF viewer with their own budgets | S |
| 21 | Peers | v4-legacy path vs `daisyui ^5` / `tailwindcss ^4` peers (ERESOLVE with strict peers): widen to `^4.12 \|\| ^5` / `^3.4 \|\| ^4` after testing, or drop the legacy path | S |
| 22 | Angular | Angular 22 is available (22.2.x): bump the workspace, run all gates, widen peers | M |
| 23 | Lint | 20 ESLint warnings (unused imports/vars) | S **[Done for unused vars (8); 12 `any` generic defaults remain on purpose]** |
| 25 | a11y | Text using `text-base-content/50`–`/60` (≈60 places) is below AA on many themes; raise to `/70` or use semantic tokens | M |
| 26 | Layout | Dynamic-form grid: numeric `colSpan` classes stay while the grid collapses responsively; horizontal layout never stacks labels on small screens | M |
| 27 | Motion | `hkAnimate` under reduced motion only sets opacity (transforms, staggered children untouched); `MotionDirectiveOptions.offset` / `axis` ignored | S |
| 28 | Theming | Hard-coded font stacks bypass `--font-mono` (timepicker, editor code); `input-xl` / `input-neutral` don't exist in daisyUI 4 (`styles-v4.css`) | S |
| 29 | Notification | Per-item `position` is not implemented; positions are per host | S |
| 30 | Docs | 26 public symbols without JSDoc (`npm run docs:report`); table action `buttonClass` is appended to, not replacing, the default classes | S |
| 24 | Docs | Move plan/roadmap markdown out of `src/lib/components/**` and the repo root into `docs/` (archive stale ones); make AGENTS.md a symlink of CLAUDE.md | S |
