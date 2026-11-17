# ADR-0001 — One repository; Hakistack is its identity

**Status:** Accepted (2026-11-17)

## Context
The repository started as `ng-daisyui` and now holds two published Angular packages, a Rust/WASM workspace, two docs
apps and shared tooling. Root `package.json` was `ui-library-workspace` and the README described one library.
The audit found **no code dependency** between `@hakistack/ng-daisyui` and `@hakistack/i18n`.

## Decision
Keep a single repository. The repository (root package `hakistack`, README, docs) represents the Hakistack
ecosystem; each product keeps its npm name, README, CHANGELOG, version and release cycle. The repository name and the
product names are different things: renaming the GitHub repo never renames a package.

## Alternatives
- **Split into repositories now** — rejected for now: shared toolchain (Angular 21, TS 5.9, Vitest, ESLint), shared
  docs site and CI are cheaper together, and separation is achieved with enforced boundaries (ADR-0005). Splitting
  stays possible because every package already validates and installs on its own.
- **Keep the ng-daisyui identity** — rejected: misleads contributors and consumers of `@hakistack/i18n`.

## Consequences
- Root package renamed to `hakistack` (private; the lockfile's two root `name` fields follow).
- Repo rename to `hakistack/hakistack` is prepared but needs the owner's action (migration plan §4).
