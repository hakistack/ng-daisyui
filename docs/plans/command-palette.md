# Command Palette — Implementation Plan

Reference UX target: [Tailwind Plus command palette](https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/command-palettes) — modal launcher with search, mode prefixes, grouped results, keyboard navigation. We're building a **native Angular equivalent**, not wrapping `@tailwindplus/elements` (which is paid + a separate web-component runtime alongside Angular).

Goal: ship `<hk-command-palette>` + `createCommandPalette()` builder inside `@hakistack/ng-daisyui`. Consistent with the lib's existing builder + controller pattern (`createForm`, `createTable`, `createPdfViewer`).

## Realistic scope

Single phase, ~3–5 days focused work. Command palette is a smaller, more contained component than the PDF viewer.

| Phase | Scope | Status |
|---|---|---|
| 1 | Full v1 (modal, search, modes, groups, hotkey, fuzzy filter) | Not started |
| 2+ | Recent items, async items, virtual scroll, custom item templates | Deferred |

## Architecture (locked)

### Stack
- **Native `<dialog>` element** for the modal — modern HTML, no CDK Overlay dependency, accessible by default (focus trap, Esc to close, backdrop). Same approach the Tailwind Plus example uses, just hand-rolled instead of via `<el-dialog>`.
- **`fuse.js`** for fuzzy filtering — already a runtime dep (used by `<hk-select>`), no new bundle cost.
- **`@angular/cdk/a11y`** for keyboard navigation (`ListKeyManager`) — already a peer dep.

### State model
- Builder returns a `CommandPaletteController` with `config: Signal<...>`, `state: Signal<...>`, and imperative methods (`open`, `close`, `toggle`, `setQuery`).
- State signal: `{ open, query, mode, selectedIndex, filteredItems, filteredGroups }`.
- Same pattern as `createPdfViewer`.

### Component shape
- `<hk-command-palette [config]="palette.config()" />` — single input, all config + callbacks via the builder.
- Standalone, OnPush, signal-based.
- Theme-bridged via `HK_THEME` (`card`, `card-border`).

### Hotkey handling
- Component registers a global `keydown` listener on the document.
- Default trigger: **Cmd+K** (Mac) / **Ctrl+K** (Windows/Linux). Single shortcut handles both via `event.metaKey || event.ctrlKey`.
- Consumer can override via `config.hotkey` (string like `'Mod+K'` or `'?'`) or disable with `false`.
- Listener gates on `event.target` not being a text input — prevents intercepting the user's typing.
- SSR-safe via `isPlatformBrowser`.

### Modal mechanism
- Native `<dialog>` element with `showModal()` / `close()`.
- Backdrop: `<dialog>::backdrop` styled via the component's CSS.
- Animation: CSS transitions on `data-state="opening" | "open" | "closing"`.
- Focus management: `<dialog>` traps focus by default. Close on Esc.

### Filter strategy
Three options via `config.filter`:
1. **`'fuzzy'`** (default) — Fuse.js with `keys: ['label', 'description', 'keywords']`.
2. **`'substring'`** — case-insensitive `includes()` on `label + description + keywords.join(' ')`.
3. **`(query, items, mode) => Item[]`** — full custom override.

Mode prefixes filter the searchable item set BEFORE the filter runs:
- Query starts with mode's `prefix` → only items whose `group` is in `mode.filterGroups` are eligible.
- `mode.layout: 'help'` → renders the help-text panel instead of results.

### Public-API additions
- `CommandPaletteComponent`
- `createCommandPalette<TContext = unknown>(...)`, `CommandPaletteController<TContext>`
- Types: `CommandPaletteConfig`, `CommandPaletteItem`, `CommandPaletteGroup`, `CommandPaletteMode`, `CommandPaletteState`, `CommandPaletteFilter`
- Tokens: `HK_COMMAND_PALETTE_LABELS`, `provideHkCommandPaletteLabels`

---

## Phase 1 — Full v1

### Features

- **Modal launcher** — opens via `palette.open()` or hotkey. Closes on Esc, backdrop click, or item selection.
- **Search input** — autofocus on open, mode indicator (`#`/`>`/`?` shown as a chip when active), clear button.
- **Items** — flat config array. Each item: `{ id, label, description?, icon?, avatar?, group?, keywords?, onSelect?, disabled? }`.
- **Groups** — declarative `{ id, label }`. Items reference group by id. Empty groups are hidden.
- **Modes** — declarative `{ prefix, filterGroups?, indicatorLabel?, layout?, helpText? }`. Trigger when query starts with the prefix.
- **Filtering** — fuzzy by default (Fuse.js), substring or custom available via `config.filter`.
- **Keyboard nav** — Up/Down to move selection, Enter to invoke `onSelect`, Esc to close. CDK's `ListKeyManager`.
- **Hotkey** — Cmd/Ctrl+K by default; configurable; can disable.
- **Empty state** — shown when filtered list is empty and not in help mode.
- **Help mode** — when active mode has `layout: 'help'`, renders help text panel instead of results.
- **Footer** — list of mode prefixes with `<kbd>` styling, dimmed unless that mode is active.
- **i18n** — every UI string via `HK_COMMAND_PALETTE_LABELS` injection token.

### Public API surface

```ts
// In your component class:
palette = createCommandPalette({
  items: [
    { id: 'p1', label: 'Workflow / Website', icon: 'folder', group: 'projects', onSelect: () => router.navigate(['/p/1']) },
    { id: 'u1', label: 'Leslie Alexander', avatar: '/leslie.jpg', group: 'users', onSelect: () => router.navigate(['/u/1']) },
  ],
  groups: [
    { id: 'projects', label: 'Projects' },
    { id: 'users', label: 'Users' },
  ],
  modes: [
    { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Searching projects' },
    { prefix: '>', filterGroups: ['users'], indicatorLabel: 'Searching users' },
    { prefix: '?', layout: 'help', helpText: 'Use # for projects, > for users.' },
  ],
  hotkey: 'Mod+K',
  filter: 'fuzzy',
  onSelect: (item) => console.log('fallback select', item),
});

// In template:
<hk-command-palette [config]="palette.config()" />
<button (click)="palette.open()">Open palette</button>

// Anywhere:
palette.open();
palette.close();
palette.toggle();
palette.setQuery('design');
palette.state();   // { open, query, mode, selectedIndex, filtered, ... }
```

### Controller (Phase 1)

```ts
interface CommandPaletteController {
  readonly config: Signal<CommandPaletteConfig>;
  readonly state: Signal<CommandPaletteState>;

  open(): void;
  close(): void;
  toggle(): void;
  setQuery(query: string): void;
  clear(): void;
}
```

### File structure

```
src/lib/components/command-palette/
├── command-palette.component.ts
├── command-palette.component.html
├── command-palette.component.css
├── command-palette.types.ts        # CommandPaletteItem, ...Group, ...Mode, ...Config, ...Controller
├── command-palette.helpers.ts      # createCommandPalette + filter strategies
├── command-palette.labels.ts       # HK_COMMAND_PALETTE_LABELS, provideHkCommandPaletteLabels
└── command-palette.utils.ts        # hotkey parsing, filter implementations
```

### Phase 1 deliverables

- All public exports added to `public-api.ts`.
- JSDoc on every public symbol per Batch-1 conventions.
- Demo page in `projects/shared-demos/demos/command-palette-demo.component.ts` with three tabs: basic / modes / hotkey.
- Nav entry under "Navigation" section in `app.ts`.
- 5–8 unit tests: open/close, query → filter, mode prefix → group filter, keyboard nav (up/down/enter), hotkey trigger, empty state.

---

## Decisions locked in

1. **Filter default: `'fuzzy'`** — Fuse.js, reusing the existing dep.
2. **Hotkey default: `'Mod+K'`** (Cmd on Mac, Ctrl on Windows/Linux) — universal expectation.
3. **Modal mechanism: native `<dialog>`** — modern, accessible, no CDK Overlay imports.
4. **Item action: per-item `onSelect` callback** + optional fallback `onSelect` on the config. Covers both styles.
5. **Help layout: string `helpText`** in the mode config for v1. Custom template slot deferred to Phase 2.

## Deferred to Phase 2+

- **Recent items / pinned / history** — persistence layer (localStorage? FormStateService?) needed; orthogonal to the search UX.
- **Async items** — `items: (query) => Promise<Item[]>` for server-driven results. Adds debounce + loading state surface.
- **Custom item templates** — `<ng-template hkCommandItem>` slot for rich item rendering (multiline, badges, etc.).
- **Virtual scrolling** — when `items.length > 200`, reuse `<hk-virtual-scroller>` inside the result list.
- **Multi-step palettes** — palette that drills into sub-palettes (e.g. "switch theme" → list of themes). Useful but bigger UX surface.

## Out of scope

- **Replacing `<hk-select>`** — different UX, different use case. Don't conflate.
- **Built-in command registry** — consumers manage their own item list; the lib doesn't track "registered commands."
- **Keyboard shortcut registration system** — `hotkey` config is for opening the palette, not for registering arbitrary shortcuts in the consumer's app.

## Open questions worth resolving early

1. **Hotkey conflict with browser shortcuts**: Cmd/Ctrl+K is taken by some browser address-bar features. We `preventDefault()` when handling — fine, but worth flagging in the JSDoc so consumers can override if they hit conflicts.
2. **Persistence of the open state across route changes**: should the palette stay open if the user clicks an item that navigates? Default: close on selection (consumer's `onSelect` triggers close + nav). Configurable via `closeOnSelect: boolean`?
3. **Mobile UX**: Cmd/Ctrl+K isn't reachable on mobile. The palette is still useful via programmatic `open()` from a nav button. Worth a mobile-specific demo to validate.

## References

- Tailwind Plus command palette pattern: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/command-palettes
- Fuse.js (filter engine): https://www.fusejs.io/
- CDK ListKeyManager (keyboard nav): https://material.angular.io/cdk/a11y/api#ListKeyManager
- Native `<dialog>` element: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
