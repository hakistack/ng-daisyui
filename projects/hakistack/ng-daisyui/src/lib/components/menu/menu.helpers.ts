import { computed, signal } from '@angular/core';
import { MenuConfig, MenuController, MenuIcon, MenuInternalApi, MenuInternalHandlers, MenuItem, MenuItemKind } from './menu.types';
import { generateUniqueId } from '../../utils/generate-uuid';

/** Generate a stable-enough unique id for a menu item that lacks one. */
function nextMenuId(): string {
  return `hk-menu-${generateUniqueId()}`;
}

/**
 * Infer the rendered kind of an item from its fields. An explicit `kind`
 * always wins.
 */
export function inferMenuItemKind<T>(item: MenuItem<T>): MenuItemKind {
  if (item.kind) return item.kind;
  if (item.children?.length) return 'group';
  if (!item.label && !item.routerLink && !item.href && !item.action) return 'divider';
  if (item.routerLink != null || item.href != null) return 'link';
  return 'action';
}

/** Resolve a `visible` value (boolean or predicate). Defaults to visible. */
export function isMenuItemVisible<T>(item: MenuItem<T>): boolean {
  const v = item.visible;
  if (v == null) return true;
  return typeof v === 'function' ? !!v() : !!v;
}

/**
 * Recursively assign stable ids to a menu tree (preserving any explicit `id`),
 * resolve visibility, and prune groups whose every child is hidden. Returns a
 * new array — the input is not mutated.
 */
export function processMenuItems<T>(items: MenuItem<T>[]): MenuItem<T>[] {
  const walk = (list: MenuItem<T>[]): MenuItem<T>[] => {
    const out: MenuItem<T>[] = [];
    for (const item of list) {
      if (!isMenuItemVisible(item)) continue;
      const children = item.children ? walk(item.children) : undefined;
      // A group that has lost all of its visible children is dropped.
      if (item.children?.length && (!children || children.length === 0)) continue;
      out.push({ ...item, id: item.id || nextMenuId(), children });
    }
    return out;
  };
  return walk(items);
}

/** Find an item by id anywhere in a (raw or processed) tree. */
export function findMenuItem<T>(items: MenuItem<T>[], id: string): MenuItem<T> | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findMenuItem(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Collect the ids of every group (item with children) in a tree. */
export function collectGroupIds<T>(items: MenuItem<T>[], acc: string[] = []): string[] {
  for (const item of items) {
    if (item.children?.length) {
      if (item.id) acc.push(item.id);
      collectGroupIds(item.children, acc);
    }
  }
  return acc;
}

/** Options accepted by the `item.*` factory functions (everything except the positional args). */
type ItemOptions<T> = Omit<MenuItem<T>, 'label' | 'routerLink' | 'href' | 'children' | 'action' | 'kind'>;

/**
 * **Optional** factory sugar, mirroring `field.*` from `createForm`. Plain
 * `MenuItem` object literals are the primary, recommended style (see
 * {@link createMenu}) — reach for `item.*` only if you prefer a builder API.
 *
 * @example
 * item.link('Dashboard', '/dashboard', { icon: 'house' })
 * item.group('Admin', [item.link('Users', '/users')], { icon: 'shield' })
 * item.action('Sign out', () => auth.logout())
 * item.title('Workspace')
 * item.divider()
 */
export const item = {
  /** A navigation link (internal `routerLink` commands, or pass a string path). */
  link<T = unknown>(label: string, routerLink: string | unknown[], opts: ItemOptions<T> = {}): MenuItem<T> {
    return { ...opts, label, routerLink, kind: 'link' };
  },
  /** An external link that renders `<a href>`. */
  external<T = unknown>(label: string, href: string, opts: ItemOptions<T> = {}): MenuItem<T> {
    return { target: '_blank', ...opts, label, href, kind: 'link' };
  },
  /** A button-style action item. */
  action<T = unknown>(label: string, action: (item: MenuItem<T>) => void, opts: ItemOptions<T> = {}): MenuItem<T> {
    return { ...opts, label, action, kind: 'action' };
  },
  /** A collapsible group containing child items. */
  group<T = unknown>(label: string, children: MenuItem<T>[], opts: ItemOptions<T> = {}): MenuItem<T> {
    return { ...opts, label, children, kind: 'group' };
  },
  /** A non-interactive section heading (`menu-title`). */
  title<T = unknown>(label: string, opts: ItemOptions<T> = {}): MenuItem<T> {
    return { ...opts, label, kind: 'title' };
  },
  /** A separator line. */
  divider<T = unknown>(opts: ItemOptions<T> = {}): MenuItem<T> {
    return { ...opts, kind: 'divider' };
  },
};

/** Convenience re-export so `icon` typing is importable from one place. */
export type { MenuIcon };

/**
 * Create a `MenuController` for `<hk-menu>`.
 *
 * Returns a controller with a `config` signal (pass to `[config]`) plus
 * imperative methods (`expand`, `collapse`, `toggle`, `expandAll`,
 * `collapseAll`, `setCollapsed`, `find`) that work from any component-class
 * context — no `@ViewChild`. Calls made before the view mounts are safe no-ops.
 *
 * Items are plain `MenuItem` objects — `kind` is inferred from the fields
 * (`children` → group, `routerLink`/`href`/`action` → link/action, bare `{}` →
 * divider). Use `kind: 'title'` / `kind: 'divider'` for the non-interactive ones.
 *
 * @example
 * menu = createMenu({
 *   orientation: 'vertical',
 *   items: [
 *     { kind: 'title', label: 'Workspace' },
 *     { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
 *     {
 *       label: 'Settings',
 *       icon: 'settings',
 *       children: [
 *         { label: 'Account', routerLink: '/settings/account' },
 *         { label: 'Security', routerLink: '/settings/security' },
 *       ],
 *     },
 *     { kind: 'divider' },
 *     { label: 'Sign out', icon: 'log-out', action: () => auth.logout() },
 *   ],
 * });
 *
 * // template: <hk-menu [config]="menu.config()" (itemSelect)="onSelect($event)" />
 * // anywhere: this.menu.setCollapsed(true);
 */
export function createMenu<T = unknown>(input: MenuConfig<T>): MenuController<T> {
  const collapsed = signal<boolean>(input.collapsed ?? false);

  // Component-side handlers — empty until the component mounts and binds.
  let handlers: MenuInternalHandlers = {};
  const internal: MenuInternalApi = {
    bind(newHandlers) {
      handlers = newHandlers;
      return () => {
        if (handlers === newHandlers) handlers = {};
      };
    },
  };

  const horizontal = input.orientation === 'horizontal';
  const config = computed<MenuConfig<T>>(() => ({
    ...input,
    orientation: input.orientation ?? 'vertical',
    size: input.size ?? 'md',
    accordion: input.accordion ?? horizontal,
    closeOnOutsideClick: input.closeOnOutsideClick ?? horizontal,
    submenuMode: input.submenuMode ?? 'inline',
    rounded: input.rounded ?? true,
    background: input.background ?? true,
    collapsed: collapsed(),
    _internal: internal,
  }));

  return {
    config,
    collapsed: collapsed.asReadonly(),
    expand: (id: string) => handlers.expand?.(id),
    collapse: (id: string) => handlers.collapse?.(id),
    toggle: (id: string) => handlers.toggle?.(id),
    expandAll: () => handlers.expandAll?.(),
    collapseAll: () => handlers.collapseAll?.(),
    setCollapsed: (value: boolean) => collapsed.set(value),
    find: (id: string) => findMenuItem(input.items, id),
  };
}
