# ADR-0003 — npm workspaces only where a package needs its own dependency set

**Status:** Accepted, applied 2026-11-17 (migration step M7)

## Context
npm workspaces were the preferred starting point. What they would give here:
1. **demo-v4** has its own `package.json`, lockfile and `node_modules` (daisyUI 4, Tailwind 3), installed separately
   (`npm run install:v4`). `build:ui` needs that install for `styles-v4.css`, Vercel runs two installs, CI forgot it
   (audit C3). A workspace folds it into one `npm ci` and one lockfile; npm nests the conflicting Tailwind/daisyUI
   versions under `projects/demo-v4/node_modules`, which is exactly where `build-lib-css.mjs` resolves them.
2. **Publishable libraries** would gain little: ng-packagr publishes from `dist/`, not from the source folder, so a
   workspace symlink `node_modules/@hakistack/ng-daisyui → projects/hakistack/ng-daisyui` points at an unbuilt
   package with no `"."` export, and tsconfig path aliases already resolve sources for development. Their per-package
   commands are root scripts (ADR-0002).
3. Changesets requires workspaces to discover packages — deferred anyway (ADR-0006).

## Decision
Use npm workspaces for packages that need their own dependency set — starting with `projects/demo-v4` — and not for
the ng-packagr libraries. Applying it regenerates `package-lock.json` and changes the Vercel install command, so it is a
separate, reviewable step (M7), done when no other work has the lockfile open.

## Consequences
- Applied: root `"workspaces": ["projects/demo-v4"]`; `projects/demo-v4/package-lock.json` deleted; `npm ci` installs
  everything (Tailwind 3.4.19 / daisyUI 4.12.24 nested in `projects/demo-v4/node_modules`); `install:v4`, the CI and
  release steps and Vercel's second install are gone; CI caches `projects/demo-v4/node_modules` with the root one; the
  duplicate `demo-v4` project in the root `angular.json` is removed. `styles-v4.css` is byte-identical to the
  pre-migration build.
- A future non-Angular TypeScript tool with its own dependencies becomes a workspace too.
- Libraries become workspaces only if Changesets is adopted (then with `"private": false` and publish from `dist`).
