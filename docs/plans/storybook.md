# Storybook — Implementation Plan

Goal: cut demo-maintenance overhead by adopting Storybook for component-level showcases, while keeping `projects/demo` for realistic multi-component flows.

## What problem this solves

The library currently maintains:
- `projects/demo/` — Angular app with v5 demos.
- `projects/demo-v4/` — parallel app for v4 theme.
- `projects/shared-demos/` — demo components factored out across both apps.

For simple component variants (button sizes, badge colors, input states, alert types) this is wasted effort: every new component requires manual route registration, page scaffolding, and duplicated work for the v4 demo. A schematic + Storybook collapses all of that to "drop a `.stories.ts` next to the component."

What stays in `projects/demo`: realistic flows (DynamicForm wizard with auto-save, full Table with filters/pagination/grouping, Tree with drag-drop) — those don't fit the "isolated story" mental model and are clearer in app context.

## Hybrid model — what lives where

| Surface | Use Storybook | Use `projects/demo` |
|---|---|---|
| Single-component variant exploration | ✅ | ❌ |
| Auto-extracted controls / arg playground | ✅ | ❌ |
| Auto-generated docs from JSDoc | ✅ | ❌ |
| A11y / viewport / theme addons | ✅ | ❌ |
| Wizard flow (multi-step DynamicForm) | ❌ | ✅ |
| Table with filters + pagination + tree mode | ❌ | ✅ |
| Tree drag-drop interaction | ❌ | ✅ |
| Toast service interactions | ❌ | ✅ |
| Realistic form with FormController + auto-save | ❌ | ✅ |

## Architecture decisions (locked)

### Storybook version
- **Storybook 8.4+** (Angular 20/21 compatible).
- **Builder**: `@storybook/angular` (Webpack — Storybook's Angular framework currently still uses Webpack 5; Vite-Angular builder exists but is less stable as of writing).
- **Renderer**: `@storybook/angular`.

### Tailwind v4 + DaisyUI integration
- Storybook needs Tailwind v4 wired through PostCSS in its build pipeline.
- Add `@tailwindcss/postcss` to Storybook's PostCSS config (separate from the Angular CLI's pipeline).
- Add a single `preview.css` that imports the lib's compiled `styles.css` (or imports Tailwind directives directly with `@source` pointing at `src/lib/components/**/*.{ts,html}` so JIT picks up classes).
- Theme switcher (v4 vs v5): Storybook addon `@storybook/addon-themes` toggles a `data-theme` attribute on the preview iframe `<html>`. Wire to call `provideHkTheme('daisyui-v4' | 'daisyui-v5')` via a `decorator` factory.

### Story discovery
- `main.ts` glob: `'../projects/hakistack/ng-daisyui/src/lib/**/*.stories.@(ts|mdx)'`.
- Drop a `.stories.ts` file alongside any component → it appears in the sidebar on next reload. No registration.

### Auto-docs
- Every component story has `tags: ['autodocs']` in the `meta` object.
- Storybook's docgen plugin auto-extracts `input()` types and JSDoc comments → renders the Docs tab automatically.
- Per-input description comes from the JSDoc Batch 1+2 work — that documentation effort pays dividends here.

### Story file pattern
- One `.stories.ts` per component, not per variant. Variants are exported `const`s within the file.
- Convention: `<component-name>.stories.ts` colocated with `<component-name>.component.ts`.

### Scaffolding (the missing piece)
- `npm run new-component <name>` generates:
  - `<name>.component.ts` (standalone, OnPush, signal inputs)
  - `<name>.component.html`
  - `<name>.component.css`
  - `<name>.component.spec.ts`
  - `<name>.stories.ts` ← the key addition (9-line stub with `autodocs`)
- Implementation: extend the existing `schematics/` folder (already has `ng-add`).
- Optionally run automatically via husky pre-commit hook if a `*.component.ts` lands without a sibling `*.stories.ts`.

### Build & deploy
- `npm run storybook` — local dev server (port 6006).
- `npm run build-storybook` — static build to `storybook-static/`.
- Deploy alongside the existing Vercel demo (subdirectory `/storybook` in the assembled site, similar to how `/v4/` works today via `scripts/assemble-vercel.mjs`).

### What we're NOT going to do
- **Replace `projects/demo`**: covered above.
- **Drop `projects/demo-v4` immediately**: defer to Phase 2 once the Storybook theme switcher proves out for v4 visual coverage.
- **Chromatic visual regression**: defer to Phase 3 — useful but adds CI cost and a 3rd-party dependency.
- **MDX-based long-form docs**: defer until we see a need. Autodocs from JSDoc covers ~90% of doc needs.

---

## Phase 1 — Setup + scaffolding + first 3 stories

**Effort**: ~1 day focused. **Goal**: prove the pipeline end-to-end.

### Steps

1. `npx storybook@latest init --type angular` — bootstraps Storybook with Angular framework.
2. **Configure for Tailwind v4 + DaisyUI**:
   - Add `@tailwindcss/postcss` to `.storybook/postcss.config.js` (or wherever Storybook's PostCSS is wired).
   - Add `.storybook/preview.css` importing the lib's compiled CSS or Tailwind directives.
   - Confirm `@source` JIT scanning picks up class names from component templates.
3. **Theme switcher**:
   - Install `@storybook/addon-themes`.
   - In `.storybook/preview.ts`, register decorator that wraps each story in `provideHkTheme(theme)` based on the active addon value.
   - Set `data-theme` attribute on the preview iframe HTML element so daisyUI palette switches simultaneously.
4. **Story discovery glob**:
   - Edit `.storybook/main.ts` `stories` field: `['../projects/hakistack/ng-daisyui/src/lib/**/*.stories.@(ts|mdx)']`.
5. **Create the first 3 stories** (proof of concept):
   - `alert.stories.ts` — variant exploration (info, success, warning, error).
   - `tab-group.stories.ts` — orientation + variant matrix (3 variants × 2 orientations = 6 stories).
   - `kpi-card`... wait, removed. Pick `select.stories.ts` instead — single-select, multi-select, with-search, with-virtualization.
6. **Scaffolding script**:
   - Add `scripts/new-component.mjs` (or extend the schematic).
   - Generates component files + 9-line `stories.ts` stub.
   - Wire via `npm run new-component`.
7. **Run `npm run storybook`** — verify all three stories load, controls work, theme switcher works, Docs tab populates from JSDoc.

### Phase 1 deliverables

- Storybook running locally on port 6006.
- Theme switcher toggles v4 ↔ v5 across all stories.
- Three reference stories (alert, tab-group, select) demonstrating the patterns.
- `npm run new-component <name>` scaffolds component + story stub.
- Brief `docs/storybook-conventions.md` explaining the story pattern (one paragraph, plus the stub template).

### Acceptance criteria

- Adding a `.stories.ts` requires ≤ 10 lines of code per component (with `autodocs`).
- Running `npm run new-component foo` creates a working component + auto-discovered story in <5 seconds.
- Theme switcher swaps daisyUI v4 ↔ v5 on all rendered stories instantly.
- Inputs auto-appear in the Controls panel with proper types.
- JSDoc on inputs renders in the Docs tab.

---

## Phase 2 — Backfill stories for existing components

**Effort**: ~4 hours focused. **Goal**: every public component has at least one story.

### Components to add stories for (in priority order)

Tier 1 (high-variant, big payoff):
- `input` (variants × sizes × colors × disabled × prefix/suffix × password toggle)
- `alert` (4 types × outline/dash/soft × with/without buttons)
- `datepicker` (single, range, with time, with min/max, with i18n)
- `timepicker` (12h, 24h, with seconds)

Tier 2 (medium variants):
- `editor` (toolbar variants, output format, height options)
- `stepper` (linear, non-linear, with summary, custom button text)
- `tab-group` already covered in Phase 1
- `select` already covered in Phase 1
- `tree` (selection modes, drag-drop, filterable, virtual scroll — small variants only; full demo stays in demo app)
- `virtual-scroller` (vertical, horizontal, grid, lazy-load)

Tier 3 (single-story is enough):
- `dialog-wrapper` — service-driven; one demo story showing how to invoke
- `toast` — service-driven; one story showing positions + types
- `kpi-card` — REMOVED in 0.1.75, skip
- Any motion directive — one story per directive showing the trigger types

### Out of Phase 2 (stays in `projects/demo`)
- `dynamic-form` — wizard flow, auto-save, conditional logic (too rich for stories).
- `table` — filters + pagination + grouping + master-detail (same).

### Phase 2 deliverables

- ~17 `.stories.ts` files added to the lib.
- Storybook sidebar covers every public component.
- Each story has `autodocs` tag for auto-generated docs.

---

## Phase 3 — Deployment + polish

**Effort**: ~half a day.

### Steps

1. **Vercel integration**:
   - Add a `npm run build-storybook` step to the existing `npm run vercel:build` script.
   - Update `scripts/assemble-vercel.mjs` to copy `storybook-static/` to `/storybook` in the deploy output.
   - Update Vercel config / `vercel.json` if needed for the new path.
2. **Cross-link**:
   - `projects/demo` index page links to `/storybook` for "browse component catalog."
   - Storybook's "Welcome" page links back to `/` for "see realistic flows."
3. **GitHub Actions** (optional): build Storybook on PRs and post a preview URL as a comment.
4. **Public metadata**:
   - Storybook's `manager.ts` — set page title, favicon, brand color (daisyUI primary).
   - `welcome.stories.mdx` — one-paragraph "what this lib is" with a link to the npm registry.

### Phase 3 deliverables

- Public Storybook URL deployed alongside `projects/demo` on the same Vercel project.
- Cross-links between the two surfaces.

---

## Phase 4 (optional, only if there's demand) — Visual regression

- Add **Chromatic** for visual regression snapshots on every PR.
- Free for open-source; subscription for private libraries — confirm with budget.
- Catches accidental CSS regressions across all stories without manual review.
- ~half a day to wire CI integration.

---

## Decisions to lock in before Phase 1 starts

1. **Greenlight Storybook + scaffolding script approach?**
2. **Drop `projects/demo-v4`?** Replace with Storybook's theme switcher + a single demo app. (My pick: yes, but defer the actual delete to Phase 2.)
3. **Storybook builder choice**: Webpack (default, stable) or Vite (newer, faster, less stable for Angular)? My pick: Webpack — match the rest of the Angular ecosystem.
4. **Scaffold via npm script or schematic?** Script is simpler; schematic integrates with `ng generate`. My pick: script first; promote to schematic in Phase 2 if it earns its keep.
5. **Vercel deployment subdirectory**: `/storybook` (cleanest) or `storybook.yourdomain.com` subdomain? My pick: `/storybook` — fewer DNS / Vercel config concerns.

## Decisions deferred to later phases

- **Chromatic vs DIY visual regression**: punt to Phase 4.
- **MDX docs** for richer per-component pages: punt unless autodocs proves insufficient.
- **i18n in stories** (showing translated UI): probably never — out of scope for component variants.

## Out of scope

- **Replacing `projects/demo`** with Storybook entirely — addressed above; the integration flows aren't well-served by isolated stories.
- **Story-driven testing** (Storybook Test Runner) — Vitest already covers component tests; adding a parallel test runner is duplicative.
- **Custom Storybook addons** — the existing addon ecosystem covers everything we need.

## Open questions

1. **DaisyUI theme variants beyond v4/v5**: do we want to expose all 30+ daisyUI built-in themes (light, dark, cupcake, corporate, etc.) in the theme switcher, or just `v4` vs `v5`? My pick: just v4/v5 — those are the ones that drive class-name choices; daisyUI themes are pure CSS and the consumer can apply them in their own app.
2. **Story for service-driven components** (toast, dialog): what does the "control" panel show? Likely just a "Show toast" button that invokes the service. Confirm at Phase 2 kickoff.
3. **Story granularity for motion directives**: one story per directive, or one mega-story showing all motion primitives? My pick: one per directive — easier to find and link.

## Sequencing with the PDF viewer plan

- **Storybook Phase 1 first** (~1 day) — sets up the pipeline.
- **PDF viewer Phase 1 second** (~1–2 weeks) — ships with stories from day one (a few `pdf-viewer.stories.ts` covering basic load, page nav, zoom variants).
- **Storybook Phase 2 backfill** (~4 hours) — happens in parallel or shortly after.
- **PDF viewer Phases 2–4** — each phase adds incremental stories alongside its features.

This way, the PDF viewer doesn't accumulate a "we still need to add stories" debt; it ships with proper stories from the start.

## References

- Storybook Angular framework: https://storybook.js.org/docs/angular/get-started/install
- Tailwind v4 + Storybook: https://storybook.js.org/recipes/tailwindcss
- `@storybook/addon-themes`: https://storybook.js.org/addons/@storybook/addon-themes
- Storybook autodocs: https://storybook.js.org/docs/writing-docs/autodocs
- Chromatic: https://www.chromatic.com/
