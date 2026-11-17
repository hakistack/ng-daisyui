# Monorepo migration plan

From "ng-daisyui workspace" to the Hakistack monorepo, incrementally and reversibly. Target:
[architecture/monorepo.md](../architecture/monorepo.md). Why: [ADRs](../architecture/adr/README.md). Evidence:
[audit](../audit/monorepo-audit-2026-11.md), [validation](../audit/monorepo-validation-2026-11.md).

Ground rules (all steps): no npm API, selector, translation-behaviour or WASM-output change; no version bump or
publish; no feature work mixed in; references updated in the same step as a rename; pre-existing failures reported,
not hidden. Several sessions edit this tree at once: stage by pathspec.

## 1. Steps

| Step | What | Status | Risk | Rollback |
|---|---|---|---|---|
| M0 | Baseline + audit (builds, tests, clean-`HEAD` build, registry metadata, packed artifacts) | **Done** | — | — |
| M1 | Identity & metadata: root package `hakistack`; ecosystem README, CONTRIBUTING; `repository.directory`/homepage/bugs on both packages (i18n pointed at a 404 repo); declared `@angular/platform-browser` peer; `motion-dom` types via `motion` | **Done** | Low — metadata; the peer every Angular app already has | revert the commit |
| M2 | Dependency boundaries: `scripts/workspace/products.mjs`, `check-boundaries.mjs` (in `npm run lint`), `validate-package.mjs` | **Done** | Low — checks only | revert |
| M3 | Scripts normalised to `<verb>:<product>`; broken `watch` removed; `clean:engine` no longer deletes ui-tracked files; product-aware `release.mjs` (scoped tags) and guarded `publish.mjs`; references updated repo-wide (CHANGELOGs and dated audits left as history) | **Done** | Medium — muscle memory / other branches calling `engine:*` | old→new table in §3; re-add aliases if needed |
| M4 | Reproducible builds: track document/image WASM glue + inline modules (clean clone failed with TS2307), stop copying wasm-pack's `.gitignore`; schematics CJS marker (`ng add` broken in 0.3.0); clear error when the demo-v4 install is missing | **Done** | Low — generated files identical to what ships; schematics fix verified by `require()` | untrack files / revert script |
| M5 | Packaging tests: i18n consumer app (no ng-daisyui, runs CLI from tarball); `consumer-smoke.mjs --package` | **Done** | Low | revert |
| M6 | Selective CI (`changes` → product jobs → `ci-ok`) + manual `release.yml` (one package, dry-run default, provenance) | **Done** | Medium — first PR run validates the filters | revert `ci.yml`; branch protection: require `ci-ok` |
| M7 | npm workspace for `projects/demo-v4` (ADR-0003): `"workspaces": ["projects/demo-v4"]`, delete its lockfile, `npm install`, drop `install:v4` + CI/release steps + Vercel second install, remove the duplicate root `angular.json` project; declare `esbuild` as root devDependency (audit C10) | **Done** — 60 packages added (7 nested under demo-v4), none removed; 7 browserslist-data packages bumped by autoprefixer 10.6; `styles-v4.css` byte-identical | Medium — lockfile regeneration | `git checkout package-lock.json projects/demo-v4/package-lock.json package.json`, `npm ci` |
| M8 | Docs: product sections in the docs app (Overview · ng-daisyui · i18n · Contributing), i18n pages + API manifest for `@hakistack/i18n` (ADR-0009) | **Done** — M8a: `DocProduct` + `SECTION_PRODUCT`, `buildSidebar()` (one labelled group per package), Hakistack overview (`/overview`, root redirect), product-aware tab titles, `api-extractor.mjs` takes `pkg`. M8b (after the i18n commit `de198a2`): `i18n` section with Getting started (`/i18n`), Writing translations, Runtime/loading/SSR, CLI & codegen (EN/ES) and its API reference (`/api/i18n`); `api-manifest.i18n.generated.ts` (57 symbols; ng-daisyui manifest byte-identical); package-aware lookup (`/api/i18n/<name>`, `ownerPage` per package, search, import lines incl. `/engine`); `docs:check` requires every i18n symbol to be owned by an i18n page; article pages show the API they own | Low–medium — docs platform + `docs:check` changes | revert |
| M9 | Peer ranges bound to tested majors (ADR-0010): i18n `@angular/*` `^21.0.0`, `rxjs` `^7.8.0`; ng-daisyui optional `@anthropic-ai/sdk` `>=0.133.0 <2.0.0` (0.133 and 1.9 verified), `ts-morph` `>=20.0.0 <29.0.0` (20–28 verified); `validate` now rejects open-ended `>=` peers | **Done** — both artifacts valid, both consumer installs green; ships with M10 | Medium — changes what consumers may install | revert the two `package.json` lines + the validator line before release |
| M10 | First independent releases: ng-daisyui (schematics fix, metadata, peer) and i18n (metadata) via `npm run release` → `release.yml` | Needs owner authorisation | Medium — public | `npm deprecate` + patch release |
| M11 | Repository rename (§4) | Needs owner action | Low with redirects | rename back (redirects follow) |

Each "Done" step is a self-contained change that can be committed and reverted on its own; suggested commit split
in §5.

## 2. Risks

| Risk | Mitigation |
|---|---|
| Path filters miss a dependency and a broken change merges | shared config triggers everything; `main` pushes run everything; filters mirror `products.mjs` (reviewed together) |
| Other branches/sessions still call `npm run engine:build` etc. | npm prints "Missing script"; §3 maps old → new names |
| Tracked base64 WASM grows the repo | only modules the lib imports; reviewed per Rust change (ADR-0007) |
| `release.yml` used without the tag / on the wrong ref | `publish.mjs` refuses without `<name>@<version>` on HEAD and if the version exists on npm; dry run is the default |
| Lockfile regeneration in M7 pulls newer transitive versions | run on a quiet tree, full gate run, review the lockfile diff |

## 3. Renamed scripts

| Before | After |
|---|---|
| `npm run build` (ng-daisyui only) | `npm run build:ui` (`build` now builds ui + i18n) |
| `npm run watch` (broken) | `npm run build:watch` |
| `npm run install:v4` | gone — `npm ci` installs demo-v4 (workspace) |
| `engine:build`, `engine:build:dev`, `engine:check`, `engine:test`, `engine:clean` | `build:engine`, `build:engine:dev`, `check:engine`, `test:engine`, `clean:engine` |
| `libheif:build`, `libheif:build:dev`, `libheif:clean` | `build:libheif`, `build:libheif:dev`, `clean:libheif` |
| `pdfium:fetch` | `fetch:pdfium` |
| `release:patch` / `:minor` / `:major` | `release -- ui patch` (or `minor`/`major`, or `i18n`) |
| `publish:npm`, `publish:i18n:npm` | `publish:ui`, `publish:i18n` (guarded) |
| `publish:local` | `link:ui` (+ `link:i18n`) |
| `test:consumer` (ui only) | `test:consumer` (both) · `test:consumer:ui` · `test:consumer:i18n` |
| — | `test:ui`, `test:i18n`, `lint:ui`, `lint:i18n`, `lint:engine`, `lint:boundaries`, `typecheck[:ui\|:i18n]`, `validate[:ui\|:i18n]`, `build:docs` |
| `start` / `demo` (both opened a browser) | `start` serves, `demo` serves and opens |

## 4. Repository rename (prepared, not executed)

**Recommendation: `hakistack/hakistack`.** Shortest, matches the npm scope and the root package, conventional for an
org's main monorepo (`vercel/vercel`, `nrwl/nx`). `hakistack-monorepo` describes the tooling, not the ecosystem;
`hakistack-workspace` reads like an IDE folder.

| Area | Impact | Action |
|---|---|---|
| GitHub | Settings → Rename; issues, PRs, stars, Actions history move with it; old URLs and `git` remotes redirect as long as no new repo takes the old name | rename; never recreate `hakistack/ng-daisyui` |
| Local clones | keep working via redirect | `git remote set-url origin git@github.com:hakistack/hakistack.git` |
| npm metadata | published versions keep the old URL (redirects) | update `repository`/`homepage`/`bugs` in both package.json files, Cargo `workspace.package.repository`, root package.json; ships with each package's next release |
| Docs & READMEs | links to `github.com/hakistack/ng-daisyui` | search/replace in README files, docs site content, CONSUMER-USAGE, MIGRATION |
| Badges | none today | add CI badge with the new path |
| CI/CD | workflows are path-relative — no change; `release.yml` `NPM_TOKEN` secret moves with the repo | none |
| Vercel | project is linked by repository ID; usually survives a rename | verify the Git integration after renaming; re-link if deployments stop |
| Renovate | follows the repo | none |
| Provenance | new releases attest the new repo URL; must match package.json `repository` | update metadata before the first release after the rename |
| Local folder | `ui-library-workspace` is a local name only | optional |

## 5. Suggested commits (by pathspec — the tree also holds other sessions' work)

1. `chore(repo): Hakistack monorepo identity and package metadata` — root `package.json` name/description/engines,
   `package-lock.json` (2 name fields), both package `package.json` files, `README.md`, `CONTRIBUTING.md`.
2. `fix(ng-daisyui): declare platform-browser peer, take motion types from motion` — ui `package.json` peer, 3 directive files.
3. `build: per-product scripts and dependency-boundary check` — root `package.json` scripts, `scripts/workspace/*`, renamed references.
4. `fix(build): build ng-daisyui from a clean clone` — `lib/wasm/.gitignore`, the 4 generated modules, `.gitignore`, `scripts/build-wasm.mjs`, `scripts/build-lib-css.mjs`.
5. `fix(ng-daisyui): load schematics as CommonJS` — `scripts/build-schematics.mjs`.
6. `test(i18n): packed-artifact consumer test` — `tests/consumer-smoke-i18n/`, `scripts/consumer-smoke.mjs`.
7. `ci: selective jobs per product, manual release workflow` — `.github/workflows/*`.
8. `docs: monorepo architecture, ADRs, audit, migration plan, releasing` — `docs/**`, `CLAUDE.md`, `AGENTS.md`, docs article.
