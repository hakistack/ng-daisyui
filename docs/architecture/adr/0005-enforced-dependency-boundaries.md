# ADR-0005 — Boundaries enforced on sources, artifact and consumer install

**Status:** Accepted (2026-11-17)

## Context
tsconfig path aliases make every package importable from everywhere and the root `node_modules` hides undeclared
dependencies. The audit found two undeclared runtime dependencies in ng-daisyui and a schematics packaging bug that
only shows up in the built artifact.

## Decision
Three layers, each automated and in CI:
1. **Sources** — `scripts/workspace/check-boundaries.mjs` (`npm run lint:boundaries`, part of `npm run lint`): relative
   imports stay in the package; bare imports are declared in that package's `package.json`; no `dist/`, apps or
   `projects/` paths; Node built-ins only in `cli/`/`schematics/`; apps import packages only via their public entry.
   Uses TypeScript's import pre-processor (comments and strings ignored). Host-provided imports (Angular devkit in
   schematics) are listed per area in `products.mjs`.
2. **Artifact** — `scripts/workspace/validate-package.mjs` (`npm run validate:<id>`): exports/typings/bin targets exist,
   schematics load through `require()` like the Angular CLI, version and metadata, pack contents.
3. **Consumer** — `scripts/consumer-smoke.mjs --package=<id>`: pack, install into a clean app outside the repo with only
   required peers, build (ui: initial-JS budget + CSS check; i18n: runs the CLI and asserts ng-daisyui is absent).

ESLint keeps the intra-package rule (grid-core ↛ components); cross-package rules live in the script because ESLint
cannot compare imports with each package's manifest.

## Consequences
Adding a dependency to a package means declaring it in that package's `package.json`; the root `package.json` only
supplies the development toolchain.
