import { Signal, WritableSignal } from '@angular/core';

/**
 * A single selectable entry in the command palette. `id` is required for
 * tracking + keyboard navigation; everything else is presentation/behavior.
 */
export interface CommandPaletteItem<TContext = any> {
  /** Stable identifier — used as the trackBy key. */
  readonly id: string;
  /** Visible label (the primary searchable text). */
  readonly label: string;
  /** Optional secondary text rendered under the label. Searchable. */
  readonly description?: string;
  /** Optional icon name (passed to `<svg lucideIcon>` if you wire it; or use as a CSS hook). */
  readonly icon?: string;
  /** Optional avatar URL — typically used for user-type items. Mutually exclusive with `icon` in the default template. */
  readonly avatar?: string;
  /** Group id (must match a `CommandPaletteGroup.id`). Items without a group land in an implicit "default" group. */
  readonly group?: string;
  /** Extra search keywords (e.g. abbreviations, synonyms). Searchable but not rendered. */
  readonly keywords?: readonly string[];
  /** Disabled items are visible but unselectable (greyed out, skipped by keyboard nav). */
  readonly disabled?: boolean;
  /**
   * Per-item action. Called when the user presses Enter or clicks the row.
   * Receives the consumer's optional `TContext` value (passed via the
   * config). If unset, the config-level `onSelect` fires as a fallback.
   */
  readonly onSelect?: (context?: TContext) => void;
}

/** Static group definition. Items reference groups by `id`. Empty groups are hidden. */
export interface CommandPaletteGroup {
  readonly id: string;
  readonly label: string;
}

/**
 * A mode prefix that scopes the search. Triggered when the query starts
 * with `prefix` — the prefix character itself is stripped before filtering.
 *
 * @example
 * { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Searching projects' }
 * { prefix: '?', layout: 'help', helpText: 'Use # for projects, > for users.' }
 */
export interface CommandPaletteMode {
  /** Single-character prefix that activates this mode (e.g. `'#'`, `'>'`, `'?'`). */
  readonly prefix: string;
  /**
   * Restrict matches to items in these groups. Omit to allow all groups.
   * Ignored when `layout: 'help'`.
   */
  readonly filterGroups?: readonly string[];
  /** Optional chip label shown next to the input while this mode is active. */
  readonly indicatorLabel?: string;
  /**
   * Layout variant for this mode. `'results'` (default) renders the normal
   * filtered item list. `'help'` renders the `helpText` block instead.
   */
  readonly layout?: 'results' | 'help';
  /** Required when `layout: 'help'`. Plain string rendered in the help panel. */
  readonly helpText?: string;
}

/**
 * Filter strategy. `'fuzzy'` uses the lib's shared FuseCache (Fuse.js,
 * already a dep). `'substring'` is a simple case-insensitive `includes()`.
 * A function gives full custom control.
 */
export type CommandPaletteFilter<TContext = any> =
  | 'fuzzy'
  | 'substring'
  | ((
      query: string,
      items: readonly CommandPaletteItem<TContext>[],
      mode: CommandPaletteMode | null,
    ) => readonly CommandPaletteItem<TContext>[]);

/** Hotkey shorthand. `'Mod+K'` is Cmd on macOS / Ctrl elsewhere. `false` disables. */
export type CommandPaletteHotkey = string | false;

/**
 * Configuration passed to `createCommandPalette({...})`. Stable per-instance —
 * the imperative actions live on the returned controller.
 */
export interface CommandPaletteConfig<TContext = any> {
  /** All items rendered in the palette. Group via the `group` field. */
  readonly items: readonly CommandPaletteItem<TContext>[];
  /** Group definitions. Items reference groups by `id`. Empty groups are hidden in the rendered list. */
  readonly groups?: readonly CommandPaletteGroup[];
  /** Mode prefixes (e.g. `#` projects, `>` users, `?` help). Order matters — first match wins. */
  readonly modes?: readonly CommandPaletteMode[];
  /**
   * Filter strategy. Default: `'fuzzy'`. Set to `'substring'` for a simpler
   * case-insensitive contains check, or pass a function for full control.
   */
  readonly filter?: CommandPaletteFilter<TContext>;
  /**
   * Global keyboard shortcut to open the palette. Default: `'Mod+K'`
   * (Cmd on macOS, Ctrl elsewhere). Pass `false` to disable.
   */
  readonly hotkey?: CommandPaletteHotkey;
  /** Optional context object passed to per-item `onSelect` callbacks. */
  readonly context?: TContext;
  /**
   * Auto-close the palette after an item is selected. Default: `true`.
   * Set to `false` for multi-select-style flows (the consumer drives close).
   */
  readonly closeOnSelect?: boolean;
  /**
   * Empty-state message rendered when the filtered list is empty
   * (and not in help mode). Defaults to the `noResults` label.
   */
  readonly emptyMessage?: string;

  // ── Lifecycle callbacks ──────────────────────────────────────────────────

  /** Fallback select handler — fires when an item without `onSelect` is invoked. */
  readonly onSelect?: (item: CommandPaletteItem<TContext>, context?: TContext) => void;
  /** Fires whenever the palette opens. */
  readonly onOpen?: () => void;
  /** Fires whenever the palette closes (any reason: Esc, backdrop click, selection). */
  readonly onClose?: () => void;
  /** Fires on every query change. Useful for analytics / async fetching (deferred to Phase 2). */
  readonly onQueryChange?: (query: string, mode: CommandPaletteMode | null) => void;

  /** @internal Hidden bridge between the controller and the component instance. */
  readonly _internal?: CommandPaletteInternalApi;
}

/**
 * @internal — Component-side handlers the controller dispatches to. The
 * component fills these in on init; before that, controller methods are
 * no-ops (so calls before view-mount are safe).
 */
export interface CommandPaletteInternalHandlers {
  open?: () => void;
  close?: () => void;
  toggle?: () => void;
  setQuery?: (query: string) => void;
  clear?: () => void;
}

/** @internal — Hidden channel attached to the config so the component and controller share state. */
export interface CommandPaletteInternalApi {
  readonly state: WritableSignal<CommandPaletteState>;
  bind(handlers: CommandPaletteInternalHandlers): () => void;
}

/** Reactive runtime state exposed by the controller. */
export interface CommandPaletteState {
  /** Whether the palette modal is currently open. */
  readonly open: boolean;
  /** Current search query (raw — includes the mode prefix if present). */
  readonly query: string;
  /** Active mode (matched on query prefix), or `null` when no mode is active. */
  readonly mode: CommandPaletteMode | null;
  /** Index of the currently-highlighted item in `filtered`. -1 when empty. */
  readonly selectedIndex: number;
  /** Filtered + mode-scoped items, ready to render. */
  readonly filtered: readonly CommandPaletteItem[];
}

/**
 * Imperative controller returned by `createCommandPalette()`. Pass
 * `controller.config()` to `<hk-command-palette [config]="..." />` and call
 * methods directly from your component class — no `@ViewChild` needed.
 */
export interface CommandPaletteController<TContext = any> {
  /** Reactive view of the merged config (defaults applied). */
  readonly config: Signal<CommandPaletteConfig<TContext>>;
  /** Reactive runtime state — open/closed, query, mode, selection, filtered list. */
  readonly state: Signal<CommandPaletteState>;

  /** Open the palette. No-op if already open. */
  open(): void;
  /** Close the palette. No-op if already closed. */
  close(): void;
  /** Toggle open/closed state. */
  toggle(): void;
  /** Set the search query programmatically (re-runs filter). */
  setQuery(query: string): void;
  /** Clear the search query and reset mode. */
  clear(): void;
}
