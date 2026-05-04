import { computed, signal } from '@angular/core';
import {
  CommandPaletteConfig,
  CommandPaletteController,
  CommandPaletteInternalApi,
  CommandPaletteInternalHandlers,
  CommandPaletteState,
} from './command-palette.types';

/**
 * Create a `CommandPaletteController` for `<hk-command-palette>`.
 *
 * Returns a controller with a `config` signal (pass to `[config]` on the
 * component) plus imperative methods (`open`, `close`, `toggle`, `setQuery`,
 * `clear`) that work from any component-class context — no `@ViewChild`.
 *
 * Stable per-instance configuration (items, groups, modes, hotkey,
 * callbacks) lives here. The component's `[config]` input wires the
 * config + an internal bridge so the controller's imperative calls
 * dispatch to the live component instance once it mounts.
 *
 * @example Basic usage
 * palette = createCommandPalette({
 *   items: [
 *     { id: 'p1', label: 'Workflow / Website', icon: 'folder', group: 'projects', onSelect: () => router.navigate(['/p/1']) },
 *     { id: 'u1', label: 'Leslie Alexander', avatar: '/leslie.jpg', group: 'users', onSelect: () => router.navigate(['/u/1']) },
 *   ],
 *   groups: [
 *     { id: 'projects', label: 'Projects' },
 *     { id: 'users', label: 'Users' },
 *   ],
 *   modes: [
 *     { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Searching projects' },
 *     { prefix: '>', filterGroups: ['users'], indicatorLabel: 'Searching users' },
 *     { prefix: '?', layout: 'help', helpText: 'Use # for projects, > for users.' },
 *   ],
 * });
 *
 * // template:
 * // <hk-command-palette [config]="palette.config()" />
 * // <button (click)="palette.open()">Open</button>
 *
 * // anywhere:
 * // this.palette.open();
 * // this.palette.setQuery('#design');
 *
 * @example With typed context
 * interface UserCtx { userId: string }
 * palette = createCommandPalette<UserCtx>({
 *   context: { userId: '42' },
 *   items: [
 *     { id: '1', label: 'Profile', onSelect: (ctx) => goto(`/users/${ctx?.userId}`) },
 *   ],
 *   onSelect: (item, ctx) => analytics.track('palette.select', { itemId: item.id, userId: ctx?.userId }),
 * });
 */
export function createCommandPalette<TContext = unknown>(input: CommandPaletteConfig<TContext>): CommandPaletteController<TContext> {
  // Live state. Component writes to this through the internal bridge once
  // it mounts; the controller exposes a read-only view publicly.
  const state = signal<CommandPaletteState>({
    open: false,
    query: '',
    mode: null,
    selectedIndex: -1,
    filtered: [],
  });

  // Component-side handlers — empty until the component mounts and binds.
  let handlers: CommandPaletteInternalHandlers = {};

  const internalApi: CommandPaletteInternalApi = {
    state,
    bind(newHandlers) {
      handlers = newHandlers;
      // Returns an unbind callback the component runs on destroy so we
      // don't leak a reference to a torn-down component.
      return () => {
        if (handlers === newHandlers) {
          handlers = {};
        }
      };
    },
  };

  // Merged config — defaults applied for the public-facing config signal,
  // plus the internal bridge attached for the component to pick up.
  const config = computed<CommandPaletteConfig<TContext>>(() => ({
    ...input,
    filter: input.filter ?? 'fuzzy',
    hotkey: input.hotkey ?? 'Mod+K',
    closeOnSelect: input.closeOnSelect ?? true,
    _internal: internalApi,
  }));

  // Imperative methods — dispatch to the component if mounted, else no-op.
  // No-ops are intentional: calling `palette.open()` before the view mounts
  // is harmless and will simply not fire — the consumer can trigger again
  // post-mount and it will work.
  const controller: CommandPaletteController<TContext> = {
    config,
    state: state.asReadonly(),

    open: () => handlers.open?.(),
    close: () => handlers.close?.(),
    toggle: () => handlers.toggle?.(),
    setQuery: (query: string) => handlers.setQuery?.(query),
    clear: () => handlers.clear?.(),
  };

  return controller;
}
