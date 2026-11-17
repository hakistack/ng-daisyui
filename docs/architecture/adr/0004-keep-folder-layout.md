# ADR-0004 — Keep `projects/hakistack/*` and `hakistack-engine/`

**Status:** Accepted (2026-11-17)

## Context
A conventional layout (`apps/`, `packages/`, `engines/rust/`) was proposed as a starting point. Current layout:
`projects/hakistack/{ng-daisyui,i18n}`, `projects/{demo,demo-v4,shared-demos}`, `hakistack-engine/`.

## Decision
Keep it. Products are already namespaced (`projects/hakistack/<product>`), Angular CLI's `newProjectRoot` is
`projects`, and the engine folder is already ecosystem-named. Separation comes from rules (ADR-0005), not folders.

## Alternatives
`packages/` + `apps/` + `engines/rust`: touches `angular.json`, `tsconfig.json` paths, every `ng-package.json` `dest`,
~20 scripts with hard-coded paths, CSS `@source`/`@import` paths in the docs apps, the API manifest, CI cache keys,
`.gitignore`, `CLAUDE.md`/`AGENTS.md` and the docs articles — with no functional gain, and breaking every open branch.

## Consequences / revisit when
Revisit when a third product kind arrives that does not fit `projects/` (e.g. a standalone Node service), and do it
as one mechanical commit on a quiet tree, driven by `scripts/workspace/products.mjs`.
