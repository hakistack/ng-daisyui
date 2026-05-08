# Changelog

## 0.1.90

### Fixes

- **fix(daisyui-v4-plugin)**: the v4 plugin's safelist is now
  **auto-generated** at lib build time. A new `extract-fesm-classes`
  script (run as part of `npm run build`) walks the compiled FESM and
  emits every Tailwind-class-like token to a generated module
  (`themes/fesm-classes.cjs`) which the plugin spreads into its
  safelist. This replaces the previous narrow, hand-curated regex
  patterns and gives consumers scan-equivalent coverage without
  needing to touch their `content` array. Currently extracts ~3,900
  candidate tokens; Tailwind silently drops entries that don't match
  any utility, so over-matching is harmless.
- The hand-curated regex patterns (grid-cols, col-span, base shades
  with opacity, focus rings) remain as a backstop for classes built
  dynamically via string concatenation in component TS — anything the
  static-string extractor would miss.

## 0.1.89

### Fixes

- **fix(daisyui-v4-plugin)**: the v4 Tailwind plugin now contributes a
  defensive `safelist` (layout + elevation classes) via the plugin's
  second-argument config. Per the [Tailwind v3 presets docs](https://v3.tailwindcss.com/docs/presets),
  a consumer's top-level `content: [array]` REPLACES (not concatenates
  with) the preset's content — by design — so a preset can never
  reliably contribute scan paths when the consumer also sets `content`.
  The Content Configuration docs confirm: "no built-in mechanism for
  libraries to automatically contribute content paths." Plugin-
  contributed `safelist` IS reliably merged in every Tailwind v3 minor
  version, making it the canonical lib-side workaround.
  **Datepicker `grid-cols-7`, dynamic-form `col-span-N`, and the
  editor / table / dropdown elevation classes (`bg-base-300`, `bg-base-300/70`,
  `shadow-sm`, focus / hover variants) are now guaranteed to land in
  compiled CSS regardless of the consumer's `content` shape.** No
  consumer-side config changes required.

## 0.1.88

### Docs

- **docs(daisyui-v4-preset)**: documented the Tailwind v3 `content`-merge
  quirk where a top-level `content: [array]` in the consumer's config
  overrides (rather than concatenates with) the preset's content. The
  preset's JSDoc now explicitly recommends consumers include the FESM
  path in their own `content` array:
  ```js
  content: [
    './src/**/*.{html,ts}',
    './node_modules/@hakistack/ng-daisyui/fesm2022/*.mjs',
  ],
  ```
  This is the actual root-cause workaround for the recurring "lib classes
  missing from compiled CSS" reports.

## 0.1.87

### Fixes

- **fix(daisyui-v4-preset)**: renamed `daisyui-v4-preset.js` →
  `daisyui-v4-preset.cjs` and updated the `exports` map. The `.js`
  extension combined with the package's `"type": "module"` was making
  Node 22+ load the preset as ESM, which crashed at the inner
  `require('./daisyui-v4-plugin.cjs')`. Tailwind v3 silently caught the
  error and fell back to scanning ONLY the consumer's own source paths —
  so any class only used in the lib's templates (datepicker
  `grid-cols-7`, dynamic-form `col-span-N`, editor surface tokens, etc.)
  never made it into the compiled CSS. **This is the root cause of the
  recurring "lib looks unstyled in my v4 consumer app" reports.**
  Renaming forces CommonJS load semantics regardless of the package
  type field. No consumer-side change required — the import path
  `@hakistack/ng-daisyui/themes/daisyui-v4-preset` resolves to the
  renamed file via the updated `exports`.

## 0.1.86

### Reverts

- Reverted the `@source inline(...)` block in `styles.css` (added in 0.1.84)
  and the `safelist:` array in `daisyui-v4-preset.js` (added in 0.1.85).
  The existing FESM `@source` scanning was already picking up every class
  the lib uses; the safelists were redundant maintenance overhead. Keeping
  the lib's Tailwind footprint to a single `@source` line + the daisyUI
  plugin.

## 0.1.85

### Fixes

- **fix(daisyui-v4-preset)**: extended the v4 Tailwind preset with an
  explicit `safelist` covering the same critical container / elevation
  classes that the v5 `styles.css` safelists via `@source inline()`.
  v4 consumers (Tailwind v3 + daisyUI v4) now get the same defensive
  guarantee — `border-base-300`, `bg-base-300/70`, `shadow-sm`, focus
  ring tokens, hover variants, etc. are always in the compiled output.
  This fixes the original "editor looks ugly on daisyUI v4" report
  which was caused by v3's content scanner missing classes embedded
  in the FESM strings.

## 0.1.84

### Fixes

- **fix(styles)**: added a defensive `@source inline(...)` safelist in the
  shipped `styles.css`. The lib's container / elevation classes
  (`border-base-300`, `bg-base-300/70`, `shadow-sm`, focus-ring tokens,
  hover variants, etc.) are now guaranteed to be in the compiled CSS
  regardless of whether the consumer's Tailwind pipeline successfully
  scans the FESM bundle. Mitigates "lib looks unstyled in my app" issues
  caused by stale Tailwind cache, minified bundle scanning quirks, or
  consumer apps that override `@source` directives.

## 0.1.83

### Fixes

- **fix(table)**: outer wrapper switched from `border-base-content/5`
  (~invisible) to `border-base-300` plus `shadow-sm`. Tables nested inside
  cards or modals now have a visible boundary on every theme.
- **fix(editor slash menu)**: popup border bumped from
  `border-base-content/15` to `border-base-300` for parity with the rest
  of the lib's overlay surfaces (datepicker / timepicker / select
  dropdowns already use this token).
- Audit pass on every component: all overlay surfaces (editor, table,
  datepicker / timepicker / select dropdowns, slash menu) now use the
  canonical `border-base-300 bg-base-100 shadow-*` pattern from daisyUI's
  elevation contract — consistent visibility across every theme and
  container.

## 0.1.81

### Fixes

- **fix(editor)**: `shadow-sm` on the editor wrapper so the editor visibly
  lifts off any container. Previously the wrapper relied solely on the
  border for separation — readable on plain page backgrounds but the
  editor blurred into the surface when dropped inside a `card` or modal
  with the same `bg-base-100`. The shadow provides a subtle elevation cue
  that works on every theme.

## 0.1.80

### Fixes

- **fix(editor)**: toolbar and content area blurred into a single block on
  lavender / muted-base themes (visible regression on daisyUI v4) because
  the dividers used `border-base-content/25` — too faint at low opacity
  against tinted bases. Swapped to daisyUI's canonical `border-base-300`
  for the outer border and toolbar separator. Toolbar now uses
  `bg-base-300/70` so it reads as a distinct "command bar" against the
  `bg-base-100` content "canvas" across every theme — clearer visual
  hierarchy between chrome and content.

## 0.1.79

### Fixes

- **fix(dynamic-form)**: `field.checkbox` / `field.toggle` rendered the
  field label twice — once stacked on top via the wrapper, and once
  inline next to the control. The outer top-label wrapper now skips both
  field types (radio still keeps it since that label belongs to the option
  group). The required-asterisk and the `[for]` association moved into
  the inline label so a11y and visual emphasis are preserved.

## 0.1.78

### Features

- **feat(editor)**: Notion-style slash-command popup. Type `/` on a new
  paragraph or heading to open a filterable command list. Built-in commands
  cover headings 1–3, bullet / ordered lists, blockquote, code block, and
  divider. New `slashCommands` input on `<hk-editor>` accepts `true` for
  built-ins, an array of `EditorSlashCommand` to replace them, or
  `{ items, append: true }` to extend.
- **feat(editor)**: typed builder helpers — `createSlashCommands(...)`,
  `slash.snippet(...)`, `slash.command(...)`, `slash.snippetFromUrl(...)`,
  `slash.custom(...)`. Snippets accept a literal HTML string, a sync
  function, or an async function that resolves to HTML — useful for
  loading templates from remote `.html` files.
- **feat(editor)**: `aria-live="polite"` formatting announcer. Toolbar
  toggles emit short SR messages ("Bold on", "Heading 2 applied", etc.).

### Fixes

- **fix(public-api)**: `EditorComponent`, `EditorToolbarComponent`,
  `EditorSlashMenuComponent`, `slash`, `createSlashCommands`,
  `BUILT_IN_SLASH_COMMANDS`, `filterSlashCommands`, `TOOLBAR_*` constants,
  and all editor types are now re-exported from the package entry. They
  previously only existed in `lib/components/index.ts` and weren't
  reachable via `@hakistack/ng-daisyui` — published consumers couldn't
  import the editor.

## 0.1.77

### Bug fixes

- **fix(table)**: emit `globalSearchChange` only on genuine user-driven changes —
  initial mount no longer triggers a phantom event. Fixes duplicate first-load
  calls in server-side cursor-paginated consumers that load data both in
  `ngOnInit` and in `(globalSearchChange)`. `clearGlobalSearch()` is now also a
  no-op when called from an already-empty state.
