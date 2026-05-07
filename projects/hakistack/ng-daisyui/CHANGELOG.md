# Changelog

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
