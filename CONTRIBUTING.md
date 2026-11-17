# Contributing to Hakistack

This repository holds several products (see the [README](README.md)). Most changes touch one of them; the commands
below let you build, test and check just that one. Architecture and rules:
[docs/architecture/monorepo.md](docs/architecture/monorepo.md).

## Setup

```bash
git clone git@github.com:hakistack/ng-daisyui.git hakistack && cd hakistack
npm ci                 # one install: toolchain, both libraries, and the demo-v4 workspace (Tailwind 3 / daisyUI 4)
```

Node ≥ 22 and npm 11. For the Rust engines: stable Rust (pinned by `hakistack-engine/rust-toolchain.toml`) and
`cargo install wasm-pack`. You do not need Rust to work on the Angular packages — the generated WASM modules are
committed.

## Commands

Scripts are named `<verb>:<product>`; products are `ui` (@hakistack/ng-daisyui), `i18n` (@hakistack/i18n), `engine`
(Rust/WASM) and `docs`. A verb without a product runs all of them.

| I want to… | ng-daisyui | i18n | engine | docs |
|---|---|---|---|---|
| run it | `npm start` (docs site, :58790) | — | — | `npm start`, `npm run start:v4` (:58791) |
| build | `npm run build:ui` (`build:watch`) | `npm run build:i18n` | `npm run build:engine` (`:dev`) | `npm run build:docs` |
| unit-test | `npm run test:ui` | `npm run test:i18n` | `npm run test:engine` | `npm run test:docs` |
| lint | `npm run lint:ui` | `npm run lint:i18n` | `npm run lint:engine` | `npm run docs:check`, `docs:snippets` |
| typecheck | `npm run typecheck:ui` | `npm run typecheck:i18n` | `npm run check:engine` | — |
| check the built package | `npm run validate:ui` | `npm run validate:i18n` | — | — |
| install it like a consumer | `npm run test:consumer:ui` | `npm run test:consumer:i18n` | — | — |
| end-to-end + a11y | — | — | — | `npm run e2e` |

Before opening a PR: `npm run lint` (ESLint + dependency boundaries) and the test/build commands of the products you
touched. CI runs only the jobs of the products your PR changes (plus everything when shared config changes).

Single test file: `npx ng test @hakistack/ng-daisyui --watch=false --include='**/select/*.spec.ts'`.

## Rules that CI enforces

- A published package imports only what **its own** `package.json` declares — never another package's sources,
  `dist/`, an app, or a repo path. Need a library? Add it to that package's `dependencies` or `peerDependencies`.
- Apps (docs, demo-v4) import packages only through `@hakistack/<pkg>`.
- Inside ng-daisyui, `grid-core` never imports `components/`.
- Public API changes go through each package's `public-api.ts`; for ng-daisyui also run `npm run extract-api-docs`
  and make sure a docs page owns the new symbol (`npm run docs:check`).
- Changes to Rust that ship must include the regenerated WASM modules from `npm run build:engine`.

Code style: Prettier (140 columns, single quotes; runs on commit via lint-staged), strict TypeScript, standalone
OnPush components with signals — see [CLAUDE.md](CLAUDE.md) and the
[component guidelines](docs/architecture/component-guidelines.md).

## Changelogs and releases

Add user-visible changes to the package's `CHANGELOG.md` under "Unreleased". Releases are per package and done by
maintainers: [docs/maintenance/releasing.md](docs/maintenance/releasing.md).

## Adding a package, tool or engine

Follow [monorepo architecture §5](docs/architecture/monorepo.md#5-adding-a-product): register it in
`scripts/workspace/products.mjs`, add its `<verb>:<id>` scripts, a consumer-smoke template and a CI job.

## Working alongside others

Several people and agent sessions work in this tree at once. Stage by path (`git add <paths>`), never `git add -A`;
don't stash or reset changes you did not make.
