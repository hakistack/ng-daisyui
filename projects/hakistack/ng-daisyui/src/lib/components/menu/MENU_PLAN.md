# `hk-menu` — Component Plan

> A config-driven, recursive DaisyUI **menu** component for `@hakistack/ng-daisyui`.
> Reference: https://daisyui.com/components/menu/

This is the **shared building block** consumed by `hk-sidebar` and `hk-navbar`
(see `../navbar/NAVBAR_SIDEBAR_PLAN.md`). It owns all menu rendering, nesting,
active-state, and visibility logic so the layout components stay thin.

---

## 1. Goals & Scope

- Render an arbitrary tree of menu items from a **single declarative config** (`MenuItem[]`).
- Support **vertical** (sidebar) and **horizontal** (navbar) orientations from the same model.
- Recursive **collapsible submenus** (DaisyUI `<details>`/`<summary>` pattern) with optional accordion (single-open) behaviour.
- Router integration (`routerLink` + `routerLinkActive`), external links, and pure action items.
- Icons (`@lucide/angular`), badges, keyboard shortcuts, disabled state, section titles, dividers.
- A **generic visibility predicate** (`visible`) so apps can layer RBAC/feature-flags on top — the library stays auth-agnostic (unlike the starter template's `requiredCapabilities`).
- Full keyboard + ARIA accessibility (WCAG AA).
- A `createMenu()` builder returning a controller, consistent with `createTree()` / `createForm()`.

**Out of scope:** the drawer/navbar chrome, user avatar header, theme toggle — those live in the layout components and are passed in via content projection.

---

## 2. Reference Analysis

From `StarterTemplates/.../layouts/shared/menu-item/`:

| Starter behaviour | Decision for the library |
|---|---|
| Recursive `<ng-template>` outlet over `RouteInfo[]` | Keep — same recursive pattern, generically typed. |
| `<details>`/`<summary>` for nested groups | Keep — native, accessible, no JS needed for basic toggle. |
| `layoutType: 'admin' \| 'main'` switches whole template | Replace with `orientation: 'vertical' \| 'horizontal'` input. |
| Accordion close-others on `main` via DOM `querySelectorAll` | Re-implement with **signal state** (`openKeys`), not DOM queries. |
| `(document:click)` host listener to close | Keep for horizontal mode only, behind an input. |
| `requiredRoles` / `requiredCapabilities` + injected `AuthenticationService` | Replace with generic `visible?: boolean \| () => boolean` predicate. App wires its own auth. |
| `transloco` pipe on titles | Library stays i18n-agnostic — `label` is a plain string; apps pre-translate. |
| `generateUniqueId()` per node | Reuse pattern; derive stable keys (see §5). |

---

## 3. Public API

### 3.1 `MenuItem` model (`menu.types.ts`)

```typescript
export type MenuItemKind = 'link' | 'action' | 'group' | 'title' | 'divider';

export interface MenuItem<T = unknown> {
  /** Stable identity. Auto-generated if omitted (used for open/active tracking). */
  id?: string;
  /** Display text. (Apps pre-translate; the library does not depend on an i18n lib.) */
  label?: string;
  /** Lucide icon component reference, e.g. `LucideHouse`. */
  icon?: LucideIconData;
  /** Router path for internal navigation (uses routerLink + routerLinkActive). */
  routerLink?: string | unknown[];
  /** External URL (renders <a href>, opens per `target`). Mutually exclusive with routerLink. */
  href?: string;
  target?: '_blank' | '_self';
  /** Child items → renders a collapsible submenu (<details>). */
  children?: MenuItem<T>[];
  /** Forces item kind. Inferred when omitted: children→group, no label→divider, else link/action. */
  kind?: MenuItemKind;
  /** Trailing badge text (e.g. counts). Rendered as a DaisyUI badge. */
  badge?: string | number;
  badgeClass?: string;          // e.g. 'badge-primary badge-sm'
  /** Keyboard hint shown right-aligned (rendered in a <kbd>). */
  shortcut?: string;
  /** Initial expanded state for a group. */
  expanded?: boolean;
  disabled?: boolean;
  /** Generic visibility gate. `false` / falsy → item (and its subtree) is hidden. */
  visible?: boolean | (() => boolean);
  /** Fired (in addition to global output) when this specific item is selected. */
  action?: (item: MenuItem<T>) => void;
  /** Extra classes on the <li>/<a>. */
  class?: string;
  /** Arbitrary payload echoed back in (itemSelect). */
  data?: T;
}
```

### 3.2 `MenuConfig` (`menu.types.ts`)

```typescript
export interface MenuConfig<T = unknown> {
  items: MenuItem<T>[];
  orientation?: 'vertical' | 'horizontal';   // default 'vertical'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';    // → menu-xs … menu-xl
  /** Single-open groups. Default true for horizontal, false for vertical. */
  accordion?: boolean;
  /** Close open submenus when clicking outside (horizontal/dropdown use). Default = horizontal. */
  closeOnOutsideClick?: boolean;
  /** Collapse to icon-only rail (vertical only). Labels hidden, shown via tooltip. */
  collapsed?: boolean;
  /** Render submenus as floating dropdowns instead of inline expand (DaisyUI menu-dropdown). */
  submenuMode?: 'inline' | 'dropdown';        // default 'inline'
  ariaLabel?: string;
  rounded?: boolean;                          // rounded-box wrapper. default true
  background?: boolean;                       // bg-base-100/200 wrapper. default true
}
```

### 3.3 Component (`menu.component.ts`) — selector `hk-menu`

| Input | Type | Notes |
|---|---|---|
| `config` | `MenuConfig<T>` | Full config object (preferred). |
| `items` | `MenuItem<T>[]` | Convenience — shorthand for `config.items`. |
| `orientation` | `'vertical' \| 'horizontal'` | Overrides `config.orientation`. |
| `size` | size token | Overrides `config.size`. |
| `collapsed` | `boolean` | Two-way friendly (`model()`), drives icon-rail. |

| Output | Payload | When |
|---|---|---|
| `itemSelect` | `MenuItem<T>` | A leaf link/action item is activated (click or Enter). |
| `expandedChange` | `{ id: string; expanded: boolean }` | A group is toggled. |

Content projection slots: `[hk-menu-header]`, `[hk-menu-footer]` (e.g. sidebar user card / sign-out).

### 3.4 Builder (`menu.helpers.ts`)

Items are **plain object literals** — `kind` is inferred from the fields
(`children` → group, `routerLink`/`href`/`action` → link/action, bare `{}` →
divider). Only the non-interactive `title`/`divider` need an explicit `kind`.

```typescript
const menu = createMenu({
  orientation: 'vertical',
  items: [
    { kind: 'title', label: 'Workspace' },
    { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
    {
      label: 'Administration',
      icon: 'shield',
      children: [
        { label: 'Users', routerLink: '/users', badge: 12 },
        { label: 'Roles', routerLink: '/roles' },
      ],
    },
    { kind: 'divider' },
    { label: 'Sign out', icon: 'log-out', action: () => auth.logout() },
  ],
});
```

`createMenu()` returns a `MenuController`:
- `config: Signal<MenuConfig>`
- `expand(id) / collapse(id) / toggle(id)`
- `expandAll() / collapseAll()`
- `setCollapsed(boolean)` (icon rail)
- `find(id): MenuItem | undefined`

> **Optional sugar:** an `item.*` factory (`item.link`/`action`/`group`/`title`/`divider`,
> mirroring `field.*` in `createForm`) is also exported for those who prefer a builder
> API — but plain objects are the recommended default.

---

## 4. Rendering (DaisyUI mapping)

```html
<!-- wrapper -->
<ul class="menu" [class]="{ 'menu-horizontal': horizontal, 'menu-xs': ..., 'rounded-box': rounded, 'bg-base-200': background }">
  <!-- recursive template per item -->
</ul>
```

Per `MenuItem` kind:
- **title** → `<li class="menu-title">{{ label }}</li>`
- **divider** → `<li></li>` with `<div class="divider my-0">` (or `hr`)
- **group** (`children`) → `<li><details [open]="isOpen(id)" (toggle)="...">`
  `<summary>` icon + label + badge `</summary>` `<ul>` recurse `</ul>` `</details>`
  - `submenuMode: 'dropdown'` → use `class="menu-dropdown-toggle"` + `menu-dropdown` instead of `<details>`.
- **link** → `<li><a [routerLink] routerLinkActive="menu-active" [class.menu-disabled]>` icon + label + badge + `<kbd>` `</a>`
- **action** → same as link but `<button (click)="select(item)">`.

Collapsed icon-rail (vertical): hide `<span>` labels, keep icons, wrap each in a DaisyUI `tooltip tooltip-right` carrying the label; groups become hover dropdowns.

---

## 5. State & Logic

- `openKeys = signal<Set<string>>()` — source of truth for expanded groups (no DOM querying).
- `processedItems = computed(...)` — assigns stable ids (prefer explicit `id`, else hash of `label+routerLink+path`, fallback generated), resolves `visible` predicates, and **prunes groups whose every child is hidden** (port of starter's `canShow` recursion).
- Accordion: on open, if `accordion`, clear sibling keys at the same depth.
- `closeOnOutsideClick`: host `(document:click)` → clear `openKeys` (guarded to horizontal/dropdown; uses `inject(ElementRef).contains`).
- `routerLinkActive` handles active highlighting; for `href`/action items, optional `activeWhen?: () => boolean`.

---

## 6. Accessibility (must pass AXE / WCAG AA)

- `<ul role="menu">` / `role="menubar"` (horizontal), items `role="none"` → anchors `role="menuitem"`.
- Submenu triggers: `aria-haspopup="menu"`, `aria-expanded` bound to open state, `aria-controls`.
- Keyboard: `↑/↓` move within a list, `→/Enter` open submenu, `←/Esc` close, `Home/End` jump, typeahead optional. Implemented with a roving `tabindex` + CDK `FocusKeyManager` (already a peer dep via `@angular/cdk`).
- Collapsed rail tooltips must also expose the label to AT (`aria-label` on the link, not tooltip-only).
- Disabled items: `aria-disabled="true"`, removed from tab order.
- Honour `prefers-reduced-motion` for expand animation.

---

## 7. File Structure

```
components/menu/
├── menu.component.ts        # hk-menu, signal inputs, OnPush, recursive render
├── menu.component.html      # recursive <ng-template> outlet (vertical + horizontal)
├── menu.component.css       # collapsed-rail + minor tweaks (mostly DaisyUI utility classes)
├── menu.types.ts            # MenuItem, MenuConfig, MenuController, kinds
├── menu.helpers.ts          # createMenu(), item.* factory, id/visibility utils
└── menu.component.spec.ts   # Vitest: rendering, nesting, accordion, visibility pruning, a11y keys
```

---

## 8. Barrel Exports (`public-api.ts`)

```typescript
// Menu
export { MenuComponent } from './lib/components/menu/menu.component';
export { createMenu, item } from './lib/components/menu/menu.helpers';
export type { MenuConfig, MenuItem, MenuItemKind, MenuController } from './lib/components/menu/menu.types';
```

---

## 9. Implementation Phases

1. **Types + builder** — `menu.types.ts`, `createMenu()`, `item.*`, id/visibility helpers + unit tests.
2. **Vertical render** — recursive template, `<details>` groups, router/active, icons/badges. Demo in sidebar context.
3. **Horizontal + dropdown** — `menu-horizontal`, accordion, outside-click, `submenuMode: 'dropdown'`.
4. **Keyboard + ARIA** — `FocusKeyManager`, roving tabindex, full AXE pass.
5. **Collapsed icon-rail** — tooltips, hover dropdowns for groups.
6. **Polish** — reduced-motion, spec coverage, demo page, JSDoc on types (match `tree.types.ts` density).

---

## 10. Demo

Add to `projects/shared-demos/demos/` a `menu-demo.component.ts` showing: vertical sidebar menu, horizontal navbar menu, nested/accordion, badges + shortcuts, collapsed rail, and a `visible`-gated (fake-RBAC) example.
