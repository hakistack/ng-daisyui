# `hk-navbar` / `hk-sidebar` (+ `hk-app-shell`) — Component Plan

> Config-driven DaisyUI **navbar** + **drawer-based sidebar** for `@hakistack/ng-daisyui`.
> References: https://daisyui.com/components/navbar/ · https://daisyui.com/components/drawer/
>
> Both components host the recursive **`hk-menu`** component for their navigation —
> see `../menu/MENU_PLAN.md`. This plan covers the layout *chrome*; menu rendering
> lives entirely in `hk-menu`.

> **Status: implemented.** Deviations from the original plan (all to keep the API
> simple and the separation clean):
> - **No `create*` builders.** Config is plain object literals (`NavbarConfig` /
>   `SidebarConfig` / `ShellConfig`) + two-way `model()` signals — no
>   `createNavbar`/`createSidebar`/`createAppShell`. (Matches the plain-objects
>   preference established for `hk-menu`.)
> - **Drawer `open` / `mode` live on `hk-app-shell`, not `hk-sidebar`.**
>   `hk-sidebar` is just the panel; the shell owns the drawer scaffold.
> - **Built-in icons** (hamburger, collapse chevron) are imported as Lucide data
>   and bound directly, so consuming apps don't have to register them.
> - Sidebar `width` is a CSS length applied via inline style (not a `w-*` class),
>   so any value works without Tailwind safelisting.

---

## 1. Goals & Scope

Deliver three composable pieces that together reproduce the starter template's
`main-layout` (top navbar + horizontal menu) and `administration-layout`
(drawer sidebar + navbar), but as generic, reusable library components:

- **`hk-navbar`** — top bar with `start` / `center` / `end` slots, brand, responsive collapse, optional embedded horizontal `hk-menu`, optional mobile hamburger.
- **`hk-sidebar`** — DaisyUI **drawer** side panel that hosts a vertical `hk-menu`, with header/footer slots, responsive (`drawer-open` on `lg`), collapsible icon-rail, and mobile overlay.
- **`hk-app-shell`** *(optional convenience)* — wires navbar + sidebar + `<router-outlet>`/content into the drawer structure so apps don't reassemble the markup each time.

Apps supply their own brand, avatar, theme toggle, session timer, etc. via **content projection** — the library ships no auth/i18n dependencies.

---

## 2. Reference Analysis

From `StarterTemplates/.../layouts/`:

| Starter pattern | Library decision |
|---|---|
| `main-layout`: `nav.navbar` with `navbar-start/center/end`, mobile `dropdown` hamburger, avatar dropdown, theme toggle, ADMIN/logout buttons | → `hk-navbar` with named slots; everything app-specific is projected, not built-in. |
| `administration-layout`: `div.drawer lg:drawer-open`, `drawer-toggle` checkbox, `drawer-content`, `drawer-side > aside.w-80`, user card, `<app-menu-item layoutType="admin">` | → `hk-sidebar` (drawer-side) + `hk-app-shell` (drawer + drawer-content) + `hk-menu` for the nav. |
| Hardcoded hamburger SVG + `label[for=drawer]` toggle | → built into `hk-app-shell`/`hk-navbar`, driven by a shared `open` signal (no manual checkbox wiring). |
| Avatar/user card markup inline in `aside` | → `[hk-sidebar-header]` projection slot. |
| `app-session-timer`, `app-theme-toggle`, `app-language-switcher` in navbar | → projected into `[hk-navbar-end]`; library provides none of them. |
| Footer in layout | → `[hk-app-shell-footer]` slot. |

**Key difference from starter:** the starter hand-codes two separate layout
components. We extract the *reusable chrome* so one `hk-app-shell` config drives
both "navbar + horizontal menu" and "sidebar drawer" presentations.

---

## 3. Public API

### 3.1 `hk-navbar` (selector `hk-navbar`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `sticky` | `boolean` | `false` | `sticky top-0 z-30`. |
| `shadow` | `boolean` | `true` | `shadow-sm`. |
| `background` | `string` | `'bg-base-100'` | Wrapper bg class. |
| `menu` | `MenuConfig` | — | Optional embedded horizontal menu (rendered in center on `lg`). |
| `showMenuToggle` | `boolean` | `true` | Show hamburger on small screens (binds to shell drawer / mobile dropdown). |

Projection slots: `[hk-navbar-start]` (brand/logo), `[hk-navbar-center]`, `[hk-navbar-end]` (actions). Default-projected content with no slot lands in `start`.

| Output | Payload |
|---|---|
| `menuToggle` | `void` — hamburger clicked (shell listens, or app handles). |

DaisyUI markup: `<nav class="navbar"><div class="navbar-start">…</div><div class="navbar-center">…</div><div class="navbar-end">…</div></nav>`.

### 3.2 `hk-sidebar` (selector `hk-sidebar`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `menu` | `MenuConfig` | — | Vertical menu config passed straight to `hk-menu`. |
| `open` | `boolean` (`model`) | `false` | Drawer open state on mobile (two-way). |
| `mode` | `'overlay' \| 'push'` | `'push'` | `push` = `lg:drawer-open`; `overlay` = always overlay. |
| `collapsible` | `boolean` | `false` | Enables icon-rail collapse toggle. |
| `collapsed` | `boolean` (`model`) | `false` | Icon-rail state → forwarded to `hk-menu`. |
| `width` | `string` | `'w-80'` | Expanded width class. |
| `side` | `'start' \| 'end'` | `'start'` | `drawer-end` when `'end'`. |
| `background` | `string` | `'bg-base-100'` | |

Projection slots: `[hk-sidebar-header]` (user card / logo), `[hk-sidebar-footer]` (sign-out / version).

| Output | Payload |
|---|---|
| `itemSelect` | `MenuItem` — re-emitted from inner `hk-menu` (e.g. close drawer on mobile nav). |
| `collapsedChange` | `boolean` |

DaisyUI markup: `<aside class="...w-80 min-h-full flex flex-col">` containing header slot → `<hk-menu orientation="vertical" [config]="menu" [collapsed]="collapsed">` → footer slot. Used inside `drawer-side`.

### 3.3 `hk-app-shell` (selector `hk-app-shell`) — optional

Wires the DaisyUI **drawer** scaffold so apps don't repeat it:

```html
<hk-app-shell [sidebar]="sidebarConfig" [navbar]="navbarConfig" [(drawerOpen)]="open">
  <ng-container hk-shell-brand>…</ng-container>
  <ng-container hk-shell-navbar-end>…theme toggle, avatar…</ng-container>
  <ng-container hk-sidebar-header>…user card…</ng-container>
  <router-outlet />                      <!-- default content slot -->
  <ng-container hk-shell-footer>…</ng-container>
</hk-app-shell>
```

| Input | Type | Notes |
|---|---|---|
| `sidebar` | `SidebarConfig` | Forwarded to `hk-sidebar`. |
| `navbar` | `NavbarConfig` | Forwarded to `hk-navbar`. |
| `drawerOpen` | `boolean` (`model`) | Drawer toggle state. |
| `responsiveBreakpoint` | `'sm'\|'md'\|'lg'\|'xl'` | When sidebar becomes permanent (`drawer-open`). Default `'lg'`. |

Internally renders: `div.drawer[.lg:drawer-open]` → checkbox `drawer-toggle` (bound to `drawerOpen` signal, **not** a manual `<label>`) → `drawer-content` (`<hk-navbar>` + projected content + footer) → `drawer-side` (`drawer-overlay` + `<hk-sidebar>`). Auto-closes the drawer on mobile when an `itemSelect` fires.

### 3.4 No builders — plain config + signals

No `create*` helpers. Drive everything with plain config objects and two-way
`model()` signals (`drawerOpen`, `collapsed`):

```typescript
// component fields
shellSidebar: SidebarConfig = { collapsible: true, menu: { items: [/* plain MenuItem objects */] } };
drawerOpen = signal(false);

// template
// <hk-app-shell [sidebar]="shellSidebar" [(drawerOpen)]="drawerOpen"> … </hk-app-shell>
// <button (click)="drawerOpen.set(true)">Open</button>
```

`navbar.helpers.ts` holds only the breakpoint→class maps (`hideAtBreakpoint`,
`showFlexAtBreakpoint`, `drawerOpenAtBreakpoint`) used internally — literal keys
so Tailwind/FESM scanning picks them up.

---

## 4. State & Responsiveness

- Drawer open state is a `model<boolean>()` signal shared shell↔sidebar (replaces the starter's `#drawerToggle` checkbox ref + `lg:hidden` label juggling). The checkbox `[checked]`/`(change)` binds to it.
- Mobile detection: reuse the library's existing breakpoint approach (the starter used an `isMobile` flag on a `BaseComponent`; here prefer a small `BreakpointObserver`/CDK-based signal util in `lib/utils/`, or a CSS-only `lg:drawer-open` approach to avoid JS). **CSS-first** is preferred — `lg:drawer-open` handles permanent-vs-overlay without JS.
- On navigation (`itemSelect`) while in overlay mode, auto-close the drawer.
- Collapse (icon-rail) is independent of open/close and only meaningful in `push` mode.

---

## 5. Accessibility (must pass AXE / WCAG AA)

- `hk-navbar` → `<nav aria-label="Main">`. Hamburger is a real `<button aria-label="Open navigation" aria-expanded aria-controls="…">`.
- `hk-app-shell` drawer: the `drawer-overlay` label gets `aria-label="Close sidebar"`; focus is **trapped** in the drawer when open in overlay mode (CDK `FocusTrap`), and returned to the trigger on close.
- `Esc` closes an overlay drawer.
- Sidebar nav wrapped in `<nav aria-label="Sidebar">`; menu a11y handled by `hk-menu`.
- Sticky navbar must not obscure focus targets; ensure visible focus rings.
- Respect `prefers-reduced-motion` for drawer slide.

---

## 6. File Structure

```
components/navbar/
├── navbar.component.ts          # hk-navbar
├── navbar.component.html
├── sidebar.component.ts         # hk-sidebar (hosts hk-menu)
├── sidebar.component.html
├── app-shell.component.ts       # hk-app-shell (drawer scaffold)
├── app-shell.component.html
├── navbar.types.ts              # NavbarConfig, SidebarConfig, ShellConfig, controllers
├── navbar.helpers.ts            # createNavbar / createSidebar / createAppShell
├── navbar.component.css         # minimal; mostly DaisyUI utilities
└── *.spec.ts                    # Vitest: slots, drawer toggle, responsive, a11y/focus-trap
```

(Co-located in one `navbar/` folder since the three components are tightly related and share types/helpers; mirrors how `tree/` keeps engine + component together.)

---

## 7. Barrel Exports (`public-api.ts`)

```typescript
// Navbar / Sidebar / App shell
export { NavbarComponent }  from './lib/components/navbar/navbar.component';
export { SidebarComponent } from './lib/components/navbar/sidebar.component';
export { AppShellComponent } from './lib/components/navbar/app-shell.component';
export type {
  NavbarConfig, SidebarConfig, ShellConfig,
  ShellBreakpoint, ShellMode, SidebarSide,
} from './lib/components/navbar/navbar.types';
```

---

## 8. Dependencies & Sequencing

- **Depends on `hk-menu`** — build `hk-menu` first (see `../menu/MENU_PLAN.md`), then these components consume it.
- Peer deps already present: `@angular/cdk` (FocusTrap, BreakpointObserver), `@lucide/angular`, Tailwind v4 + DaisyUI v5.

### Phases

1. **`hk-navbar`** — slots, brand, responsive, embedded horizontal menu, hamburger output.
2. **`hk-sidebar`** — aside + header/footer slots + embedded vertical `hk-menu`, collapse rail.
3. **`hk-app-shell`** — drawer scaffold, shared open-signal, auto-close on nav, breakpoint config.
4. **A11y** — focus trap, Esc, ARIA, reduced-motion; full AXE pass.
5. **Builders + polish** — `createNavbar/Sidebar/AppShell`, JSDoc, specs.

---

## 9. Demo

Add `projects/shared-demos/demos/app-shell-demo.component.ts` reproducing both starter layouts:
- "Admin" preset → `hk-app-shell` with permanent sidebar (`lg:drawer-open`), collapsible rail, user-card header, vertical menu.
- "Main" preset → `hk-navbar` with horizontal menu + mobile dropdown, no sidebar.
Toggle between presets to demonstrate one config model driving both.
