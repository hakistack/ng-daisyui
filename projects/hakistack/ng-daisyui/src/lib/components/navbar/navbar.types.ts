import type { MenuConfig } from '../menu/menu.types';

/** Tailwind breakpoint at which the shell sidebar becomes permanent. */
export type ShellBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

/** Which edge the sidebar sits on. `'end'` maps to DaisyUI `drawer-end`. */
export type SidebarSide = 'start' | 'end';

/**
 * Shell drawer behaviour:
 * - `'push'` — sidebar is permanent from `responsiveBreakpoint` up, overlay below it.
 * - `'overlay'` — sidebar always overlays the content (never permanent).
 */
export type ShellMode = 'push' | 'overlay';

/**
 * Configuration for `<hk-navbar>`. Every field is optional — pass the whole
 * object to `[config]`, or set the matching individual inputs.
 *
 * @example
 * navbar = { sticky: true, menu: { orientation: 'horizontal', items: [...] } };
 */
export interface NavbarConfig {
  /** `sticky top-0 z-30`. Default `false` standalone, `true` inside `hk-app-shell`. */
  sticky?: boolean;
  /** `shadow-sm`. Default `true`. */
  shadow?: boolean;
  /** Optional embedded menu, rendered in the navbar centre (forced horizontal). */
  menu?: MenuConfig;
  /** Show a hamburger button on small screens that emits `(menuToggle)`. Default `false`. */
  showMenuToggle?: boolean;
  /**
   * Hide the hamburger (and reveal the centre menu) at/above this breakpoint.
   * `'never'` keeps the hamburger visible at all sizes. Default `'lg'`.
   */
  menuToggleBreakpoint?: ShellBreakpoint | 'never';
  /** Accessible label for the `<nav>` landmark. Default `'Main'`. */
  ariaLabel?: string;
}

/**
 * Configuration for `<hk-sidebar>` (the panel only — drawer open/overlay
 * behaviour lives on `hk-app-shell`).
 *
 * @example
 * sidebar = { collapsible: true, menu: { items: [...] } };
 */
export interface SidebarConfig {
  /** Vertical menu rendered in the panel. */
  menu?: MenuConfig;
  /** Show a button that toggles the icon-only rail. Default `false`. */
  collapsible?: boolean;
  /** Edge/border side. Default `'start'`. */
  side?: SidebarSide;
  /** Expanded width as a CSS length (applied via inline style). Default `'18rem'`. */
  width?: string;
  /** Accessible label for the sidebar `<nav>`. Default `'Sidebar'`. */
  ariaLabel?: string;
}

/**
 * Configuration for `<hk-app-shell>` — composes a navbar, a drawer sidebar, and
 * the page content.
 *
 * @example
 * shell = {
 *   navbar: { sticky: true },
 *   sidebar: { collapsible: true, menu: { items: [...] } },
 *   responsiveBreakpoint: 'lg',
 * };
 */
export interface ShellConfig {
  navbar?: NavbarConfig;
  sidebar?: SidebarConfig;
  /** Breakpoint at which the sidebar becomes permanent (push mode). Default `'lg'`. */
  responsiveBreakpoint?: ShellBreakpoint;
  /** Drawer behaviour. Default `'push'`. */
  mode?: ShellMode;
}
