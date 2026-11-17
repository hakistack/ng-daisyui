# Changelog

## Unreleased (next: 0.4.0)

Releases 0.2.0–0.3.0 were tagged without changelog entries; their changes are summarised in
`git log v0.1.92..v0.3.0`. This section covers everything on `main` after `v0.3.0`.

### ⚠ Breaking changes

- **Peer dependencies are pinned to the supported major.** `@angular/*` peers are now `^21.0.0` (were `>=21.0.0`) and
  `rxjs` is `^7.8.0` (was `>=7.8.0`). With the open ranges npm auto-installed `@angular/router@22` into Angular 21 apps
  and failed with ERESOLVE.
- **`@angular/router` is a required peer** (was optional). Menu, Breadcrumbs and `DialogService` import it statically,
  so apps without it could not build. Every app that already uses the router is unaffected.
- **PDF viewer:** `HkPdfService`, `HK_PDF_DEFAULTS`, `provideHkPdfDefaults` and the `workerSrc` / `renderPoolSize`
  config keys were removed with the move to the PDFium engine (pdf.js is gone).
- **Workspaces take lists only** (`hk-pdf-workspace`, `hk-document-workspace`); a single document uses the plain viewer.
- **`hk-select` listbox/option ids** are now unique per instance (`hk-select-<id>-listbox`, `…-option-<n>`) instead of the
  fixed `options-list` / `option-<n>`. Only code that queried those ids directly is affected.
- **Dynamic-form auto-save no longer persists `password` or `file` fields.** Restored drafts leave those fields empty.
- **`@tiptap/*` moved from `dependencies` to optional `peerDependencies`.** Apps that use `hk-editor` or
  `field.editor()` must install them: `npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
  @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-file-handler @tiptap/suggestion`. Without
  them the editor shows an inline error and logs the install command.
- **`AlertService` sanitizes `html` / `htmlUrl` content** with Angular's sanitizer (scripts, event handlers and
  `style` attributes are removed). Pass `trustedHtml: true` for markup you fully control.
- **Hidden dynamic-form fields are disabled.** A field hidden by `showWhen` / `hideWhen` is excluded from
  `form.valid` and `form.value` (still in `getRawValue()`) and re-enabled when shown, so hidden required fields no
  longer block submit.
- **Required checkbox / toggle fields must be checked** (`Validators.requiredTrue`); `false` used to pass.
- **Kaizen themes:** `primary-content`, `info-content`, `error-content` (dark) and `neutral-content` changed to meet
  WCAG AA contrast (4.5:1); primary/info/error buttons now use dark text.
- **Toast:** after hovering, a toast resumes with its remaining time (at least `extendedTimeOut`) instead of always
  closing `extendedTimeOut` ms later.
- **`hk-tree`:** `role="tree"` (and `ariaLabel` / `ariaLabelledBy`) moved from the host element to the node
  container, so the filter input is no longer inside the tree.

See [docs/maintenance/migration-guide.md](../../../docs/maintenance/migration-guide.md) for upgrade steps.

### Added

- `hk-datagrid` + `grid-core`: enterprise grid (row/column virtualization, multi-sort, serializable state, server
  data source, AI `ask()`).
- `hk-pdf-workspace`, `hk-document-workspace` (Mesa workspaces), `hk-breadcrumbs`.
- PDF viewer: PDFium engine in a worker pool, own incremental PDF writer, annotations with undo/redo, AcroForm filling
  and form designer, visible and digital signatures, encrypted documents, page organizer, spreads, page labels.
- `HkTableApi` type export (was documented but not exported).
- Package `exports` for every shipped theme: `@hakistack/ng-daisyui/themes/<name>` and `/themes/<name>.css`
  (`kaizen`, `kaizen-light`, `daisyui-v4`, `daisyui-v5`).

- `AlertOptions.trustedHtml`, `NotificationLabels.regionAriaLabel`, `DatepickerLabels.weekNumberHeader`,
  `AlertLabels.close` / `AlertLabels.loading`, `TableLabels.confirmEditAriaLabel` / `TableLabels.cancelEditAriaLabel`,
  `ToastLabels.dismissAriaLabel` / `ToastLabels.severityLabels`.
- `MenuConfig.semantics` (`'auto' | 'navigation' | 'menu'`, type `MenuSemantics`).
- `hk-datepicker`: `config` input (format options merged over defaults), working `showWeekNumbers` column,
  `controlId` input (also on `hk-timepicker`) so a `<label for>` names the inner input.
- `field.date(..., { minDate, maxDate })`; the declarative `date` field's `min` / `max` are applied too.
- `hk-navbar`: `menuExpanded` / `menuControls` inputs (`aria-expanded` / `aria-controls` on the hamburger).
- `hk-tab-panel` `icon` is rendered again: a Lucide name registered with `provideLucideIcons` (kebab-case, or
  PascalCase normalised) or icon data such as `LucideHouse.icon`; unregistered names render nothing (dev-mode warning).

### Deprecated

- 16 unused public `TableComponent` members (e.g. `openFilterPos`, `columnWidthsSignal`, `getCellDisplay`,
  `trackByPage`); removal planned for 0.5.

### Changed

- `hk-menu` with only links (`routerLink` / `href`) now renders as site navigation — a plain list of links that Tab
  moves through, with `aria-current="page"` on the active route — instead of an ARIA `menu` / `menubar` (screen readers
  switch to application mode in a menu and expect arrow keys, which is wrong for a sidebar or navbar). Menus that
  contain an action keep menu semantics; set `semantics: 'menu'` to keep the old roles for a links-only menu.
- Toasts are announced through the CDK `LiveAnnouncer` (errors assertive, the rest polite) instead of making every
  toast a `role="alert"` / `aria-live="assertive"` element; a visually hidden severity word ("Error:") precedes the
  summary, and the `aria-label` that hid the detail is gone.
- `hk-table` and `hk-datagrid` share one set of grid rules (`grid-core/grid-rules.ts`): the header-click sort cycle,
  page count / clamping and row identity. Row identity is now the same in both grids — a key function, else the row's
  own `id`, else a `TreeNode` `key`; tree tables used to try `key` before `id`, which only matters for rows that carry
  both.
- `TreeNodeDropEvent` is a single type: the one `hk-tree`'s `nodeDrop` emits (with `dropPosition`, parents and
  indexes), also exported as `TreeDropEvent`. The older, smaller declaration with a different `dropIndex` meaning was
  never emitted and is gone.
- `SelectOption` is one type: `hk-select` works with `SelectOption<string>`, and the exported type gains the optional
  `id` the component already used.

### Fixed

- `hk-menu` (menu semantics): one Tab stop with roving tabindex; vertical menus use ↑ ↓ Home End and → / ← to enter
  and leave a group; menubars use ← → between top-level items, ↓ / ↑ to open a group on its first / last item, and
  ← → inside a submenu to move to the neighbouring top-level item (WAI-ARIA APG). Escape closes the current group.
- `hk-toast`: focus inside a toast (its action or close button) pauses auto-dismiss even with `pauseOnHover: false`,
  and it resumes only when both pointer and focus have left (WCAG 2.2.1); close-button label is localisable.
- Accessibility issues found by the new per-example axe audit: `hk-datepicker` / `hk-timepicker` fields are
  `role="combobox"`; `hk-editor` puts `role="textbox"`, `aria-multiline` and its label on the contenteditable;
  `hk-virtual-scroller` and the virtual `hk-table` viewport are keyboard-focusable (new `hk-virtual-scroller`
  `ariaLabel` input names it as a region); `hk-menu` titles and inactive `hk-tab-group` tabs meet AA contrast;
  the `hk-app-shell` overlay label no longer has a prohibited `aria-label`; `hk-pdf-viewer` display-mode buttons meet
  the 24 × 24 px target size.
- `hk-notification-host`: focus inside a notification pauses its auto-dismiss (it only paused on hover).
- Toast, notification and alert share one auto-dismiss timer (`lib/utils/pausable-timer.ts`) and one body-mounted
  container helper; notification and alert exit delays are now 0 under `prefers-reduced-motion` (only toasts honoured
  it). `ToastService.pauseAutoDismiss` / `resumeAutoDismiss` take an optional `reason` so pauses can overlap.
- `hk-select`: the document keydown listener is added on the next frame only if the panel is still open, so a select
  destroyed or closed within that frame no longer leaves a listener that swallowed arrow keys page-wide.
- `hk-select`: with search enabled the search input is the `combobox` with `aria-activedescendant` (screen readers
  announced nothing while arrowing through options); Escape clears the search term first and then closes; closing
  with Escape or by picking an option returns focus to the trigger instead of `<body>`.
- `hk-table`: the virtual-scroll, grouped and CDK layouts now render headers, checkboxes, actions, data cells,
  detail panels and `<tfoot>` rows from shared templates (template 1 603 → 1 199 lines). As a result
  `hkCellTemplate`, column filters, action tooltips and inline editing work in every layout (they were CDK-only),
  and the grouped row checkbox has its accessible name.
- `hk-table` keyboard navigation (`enableKeyboardNavigation`): the `<table>` is now the focusable ARIA grid and
  carries `aria-activedescendant` (the host was focused while the attribute sat on the table, so screen readers
  announced nothing). Cell ids are unique per instance and no longer `cell-undefined-N` when rows have no detail
  template; cells are no longer separate tab targets. The grouped layout no longer claims `role="grid"`
  (it has no grid keyboard model); its group headers get a real expand/collapse button.
- `hk-table` inline editor: inputs are labelled with the column header; ✓ / ✕ buttons have accessible names.
- Muted text meets WCAG AA contrast: `text-base-content/50`–`/60` (and the timepicker / editor-placeholder
  `color-mix` equivalents) raised to `/70` in 55 places — 4.5:1 on base-100/200/300 in `light`, `dark`, `kaizen` and
  `kaizen-light`. Icons and decorative separators keep their lower opacity (non-text contrast is 3:1).
  `npm run lint:contrast` (CI) keeps it that way.
- `AlertService`: `aria-describedby` only when a body exists; spinner text and close-button name localisable.
- `hk-table` filter/selection bars are `role="status"` (were `role="alert"` + `aria-live="polite"`); picker error
  messages drop the conflicting `aria-live`; `hk-datagrid` sets `aria-multiselectable` only for `selection: 'multi'`.

- `provideDynamicFormLabels` is exported as a value (it was inside an `export type` block, so calling it failed with TS1361).
- Tree-shaking: `TableComponent` and `FormUtils` no longer have side-effectful static initializers, so apps that never
  use the table no longer ship `hk-table` + `hk-datepicker` (basic consumer `main.js`: 1.16 MB → 806 KB raw,
  261 → 203 KB transfer).
- `hk-input` / `hk-select` `color` (and size) classes are literal strings, so Tailwind generates them
  (`color="primary"` had no effect in consumer builds).
- `field.multiSelect()` renders `hk-select` in multiple mode (it rendered `<input type="multiselect">`).
- `hk-select` and `hk-datepicker` reflect `control.disable()` / `enable()` after the first render.
- `AlertService`: an alert replaced by another one now resolves as dismissed instead of never settling.
- `hk-table`: keyboard navigation ignores keys typed into inputs inside the table (search, filters, inline editor).
- WASM engines retry after a failed load instead of caching the failure until reload.
- Accessibility: tree checkboxes have accessible names; stepper tabs/panel reference real ids; command-palette items no
  longer use `aria-selected` on `<button>`; notification focus ring renders on daisyUI 5.
- Package `exports` no longer reference the non-existent `esm2022/` build.
- Dynamic form: errors and help text are associated with their control (`aria-invalid`, `aria-describedby`,
  polite live region); date/time pickers and radio groups are labelled by the field label; linear wizard steps with
  hidden or disabled fields can be completed; fields with custom validators no longer share cached validators.
- `hk-select`: Space types into the search box; a `<label for>` is no longer overridden by the placeholder; the WASM
  fuzzy index is built only after the user searches a list of 200+ options.
- `hk-input`: `libphonenumber-js` loads only when a phone variant renders (basic consumer `main.js` 806 → 634 KB raw).
- `hk-timepicker`: `minTime` / `maxTime` disable panel values; focus returns to the field on close; no false
  `aria-modal`.
- `hk-tree`: `aria-level` / `aria-setsize` / `aria-posinset`, `aria-checked` in checkbox mode, one default tab stop,
  `selectionAllowParents: false` works, `config.nodeTemplate` is used.
- `hk-command-palette`: APG combobox + listbox pattern (`aria-activedescendant`, options, named dialog).
- `hk-notification-host`: one polite, named live region (items were announced up to three times); severity prefix
  read before the title; literal severity classes.
- `hk-table`: `aria-sort` on the header cell in all three layouts; sort triggers are `role="button"` and Space no
  longer scrolls; `createTable({ id })` keeps the id.
- `hk-app-shell`: focus is trapped in the open drawer whenever it renders as an overlay (push mode below the
  breakpoint too).
- `DialogService`: `openRaw()` dialogs close on router navigation; `Router` is optional.
- `AlertService.showLoading({ allowClose: true })`: closing it removes the overlay.
- Motion: `hkHover` / `hkPress` / `hkScroll` outputs fire under `prefers-reduced-motion` (only the animation is
  skipped); `animateSequence` honours reduced motion; bare `<div hkAnimate>` / `hkResize` / `hkScroll` compile with
  strict templates; bare `hkScroll` enables progress tracking (`scrollProgress` / `scrollInfo`).
- `hk-menu` sizes `xs` / `lg` / `xl` render (literal classes); generated item ids are stable across re-processing.
- `ng add` (v5 path) creates `.postcssrc.json` when no PostCSS config exists.
- Toasts fit viewports narrower than 336 px.
- Documentation: `DatepickerConfig`, `DocumentEditorController`, `MenuItem.icon`, `node.file` icon names,
  `gridColumns` default (2), `DocumentViewerConfig.mimeType`, toolbar template null-safety, tree `virtualScroll`
  (not implemented), menu `submenuMode` (`'dropdown'` not implemented).

## 0.1.92

### Cleanup — native daisyUI v4 baseline

Stripped every piece of "lib chrome" from the daisyUI-v4 Tailwind plugin.
v4 consumers now get pure native daisyUI v4 component visuals — the lib
adds zero global aesthetic on top.

**Removed from the v4 plugin:**
- `.toast-container` / `.toast-item` / `.toast-content` / `.toast-progress`
  positioning + animation rules
- `.dropdown-container` open/close animation chrome (scale, opacity,
  max-height transitions, focus outline)
- `.step-content-wrapper` forward/backward slide animations
- All `hk-*` keyframes (slide-in/out, fade-in, etc.)
- `--dropdown-*` and `--hk-transition-*` CSS variables
- Reduced-motion overrides for the above

**Why this is safe:** the toast / select-dropdown / stepper Angular
components ALREADY own these styles in their component-scoped `.css`
files. The plugin's versions were 100% redundant — components keep
working visually because their own CSS travels with them.

**Kept (only):**
- v4-compat fix for disabled `.input` / `.select` / `.textarea` text
  color (daisyUI v4's default 40% opacity is unreadable over Material
  surfaces). This is a real v4 bug-patch, not chrome.
- The auto-generated FESM safelist + `content.files` plumbing.

### Earlier in 0.1.91 (rolled into 0.1.92)

- **fix(dropdowns)**: removed `backdrop-filter: blur(8px)` glassmorphism
  from `.dropdown-container` in both the v4 plugin and the select
  component CSS. The brief blur on open/close didn't match native
  daisyUI v4.

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
