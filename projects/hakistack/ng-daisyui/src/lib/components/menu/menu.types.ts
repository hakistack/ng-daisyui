import { Signal } from '@angular/core';
import type { LucideIconData } from '@lucide/angular';

/**
 * Icon reference for a menu item. Either a static Lucide icon component
 * (e.g. `LucideHouse`) or a dynamic icon name string (e.g. `'house'`) —
 * both are rendered through `[lucideIcon]` + the `LucideDynamicIcon` directive.
 */
export type MenuIcon = LucideIconData | string;

/**
 * The rendered shape of a menu item. Inferred when omitted:
 * - has `children` → `'group'`
 * - no `label` and no `children` → `'divider'`
 * - has `routerLink`/`href` → `'link'`
 * - otherwise → `'action'`
 */
export type MenuItemKind = 'link' | 'action' | 'group' | 'title' | 'divider';

/** Orientation of the menu. `'vertical'` for sidebars, `'horizontal'` for navbars. */
export type MenuOrientation = 'vertical' | 'horizontal';

/** DaisyUI menu size tokens → `menu-xs` … `menu-xl`. */
export type MenuSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** How submenus (items with `children`) are presented. */
export type MenuSubmenuMode = 'inline' | 'dropdown';

/**
 * A single entry in an `hk-menu`. The tree is fully recursive via `children`.
 *
 * The library stays **auth- and i18n-agnostic**: `label` is a plain (already
 * translated) string, and access control is expressed through the generic
 * `visible` predicate rather than role/capability fields. Apps layer their own
 * RBAC on top by returning a boolean from `visible`.
 *
 * @example Link with icon and badge
 * { label: 'Users', routerLink: '/users', icon: LucideUsers, badge: 12 }
 *
 * @example Collapsible group
 * { label: 'Settings', icon: LucideSettings, children: [
 *   { label: 'Account', routerLink: '/settings/account' },
 *   { label: 'Security', routerLink: '/settings/security' },
 * ]}
 *
 * @example Action item gated by a permission
 * { label: 'Delete workspace', icon: LucideTrash, action: () => confirmDelete(),
 *   visible: () => auth.can('workspace:delete') }
 */
export interface MenuItem<T = unknown> {
  /** Stable identity used for open/active tracking. Auto-generated if omitted. */
  id?: string;
  /** Display text. Already-translated — the library does not depend on an i18n lib. */
  label?: string;
  /** Leading icon: a Lucide icon component or a dynamic icon name. */
  icon?: MenuIcon;
  /** Router path/commands for internal navigation (uses `routerLink` + `routerLinkActive`). */
  routerLink?: string | unknown[];
  /** External URL. Renders `<a href>`. Mutually exclusive with `routerLink`. */
  href?: string;
  /** Anchor target, only meaningful with `href`. */
  target?: '_blank' | '_self';
  /** Child items → renders a collapsible submenu. */
  children?: MenuItem<T>[];
  /** Force the rendered kind. Inferred from the other fields when omitted. */
  kind?: MenuItemKind;
  /** Trailing badge text/count rendered as a DaisyUI badge. */
  badge?: string | number;
  /** Extra classes for the badge, e.g. `'badge-primary badge-sm'`. */
  badgeClass?: string;
  /** Keyboard hint shown right-aligned inside a `<kbd>`. */
  shortcut?: string;
  /** Initial expanded state for a group. */
  expanded?: boolean;
  /** Disabled items are visible but unselectable (skipped by keyboard nav). */
  disabled?: boolean;
  /**
   * Generic visibility gate. A falsy value (or a predicate returning falsy)
   * hides the item and its subtree. Groups whose every child is hidden are
   * pruned automatically.
   */
  visible?: boolean | (() => boolean);
  /** Per-item handler, fired in addition to the component's `(itemSelect)` output. */
  action?: (item: MenuItem<T>) => void;
  /** Extra classes applied to the item's anchor/button. */
  class?: string;
  /** Arbitrary payload echoed back in `(itemSelect)`. */
  data?: T;
}

/**
 * Configuration for `<hk-menu>`. Pass via the `config` input, or build it with
 * the `createMenu({...})` helper which returns a `MenuController` with
 * imperative expand/collapse APIs.
 *
 * @example
 * config = {
 *   orientation: 'vertical',
 *   size: 'md',
 *   items: [
 *     { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
 *     {
 *       label: 'Administration',
 *       icon: 'shield',
 *       children: [
 *         { label: 'Users', routerLink: '/users', badge: 12 },
 *         { label: 'Roles', routerLink: '/roles' },
 *       ],
 *     },
 *     { kind: 'divider' },
 *     { label: 'Sign out', icon: 'log-out', action: () => auth.logout() },
 *   ],
 * };
 */
export interface MenuConfig<T = unknown> {
  /** The menu tree. */
  items: MenuItem<T>[];
  /** Layout direction. Default `'vertical'`. */
  orientation?: MenuOrientation;
  /** Size token → `menu-{size}`. Default `'md'`. */
  size?: MenuSize;
  /**
   * Single-open groups (opening one closes its siblings at the same depth).
   * Defaults to `true` for horizontal menus, `false` for vertical.
   */
  accordion?: boolean;
  /**
   * Close open submenus on outside click. Defaults to `true` for horizontal
   * menus (dropdown-like), `false` for vertical.
   */
  closeOnOutsideClick?: boolean;
  /**
   * Collapse to an icon-only rail (vertical only). Labels are hidden and shown
   * via tooltip; groups become hover dropdowns.
   */
  collapsed?: boolean;
  /** Render submenus inline (`<details>`) or as floating dropdowns. Default `'inline'`. */
  submenuMode?: MenuSubmenuMode;
  /** Accessible label for the menu landmark. */
  ariaLabel?: string;
  /** Wrap with `rounded-box`. Default `true`. */
  rounded?: boolean;
  /**
   * Surface background. `true` → `bg-base-200`, `false` → none, or a custom
   * class string (e.g. `'bg-base-100'`). Default `true`.
   */
  background?: boolean | string;

  /** @internal Hidden bridge between the controller and the component instance. */
  _internal?: MenuInternalApi;
}

/** Fired when a group is expanded/collapsed. */
export interface MenuExpandEvent {
  readonly id: string;
  readonly expanded: boolean;
}

/**
 * Imperative controller returned by `createMenu()`. Pass `controller.config()`
 * to `<hk-menu [config]="...">` and drive expansion from any component context.
 */
export interface MenuController<T = unknown> {
  /** Reactive view of the merged config (defaults applied). */
  readonly config: Signal<MenuConfig<T>>;
  /** Reactive icon-rail collapsed state. */
  readonly collapsed: Signal<boolean>;

  /** Expand a group by id. No-op if already open or not a group. */
  expand(id: string): void;
  /** Collapse a group by id. */
  collapse(id: string): void;
  /** Toggle a group's expanded state. */
  toggle(id: string): void;
  /** Expand every group. */
  expandAll(): void;
  /** Collapse every group. */
  collapseAll(): void;
  /** Set the icon-rail collapsed state (vertical only). */
  setCollapsed(collapsed: boolean): void;
  /** Find an item by id anywhere in the tree. */
  find(id: string): MenuItem<T> | undefined;
}

/** @internal Bridge between a `MenuController` and the live component instance. */
export interface MenuInternalApi {
  /** Component fills these in on mount; controller calls are no-ops before that. */
  bind(handlers: MenuInternalHandlers): () => void;
}

/** @internal Component-side handlers the controller dispatches to. */
export interface MenuInternalHandlers {
  expand?(id: string): void;
  collapse?(id: string): void;
  toggle?(id: string): void;
  expandAll?(): void;
  collapseAll?(): void;
}
