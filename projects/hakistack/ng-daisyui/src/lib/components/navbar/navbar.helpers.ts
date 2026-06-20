import { ShellBreakpoint } from './navbar.types';

/**
 * The breakpoint class maps below return objects with **literal** Tailwind class
 * keys (e.g. `'lg:hidden'`). Keeping the keys literal is deliberate: the FESM
 * `@source` scan and the demo's Tailwind scan only pick up classes that appear
 * verbatim in templates/source, so a computed string like `` `${bp}:hidden` ``
 * would get purged. Exactly one key is `true` at a time.
 */

/** `{bp}:hidden` — hide an element at/above the breakpoint. `'never'` hides nothing. */
export function hideAtBreakpoint(bp: ShellBreakpoint | 'never'): Record<string, boolean> {
  return {
    'sm:hidden': bp === 'sm',
    'md:hidden': bp === 'md',
    'lg:hidden': bp === 'lg',
    'xl:hidden': bp === 'xl',
  };
}

/** `{bp}:flex` — reveal an element (paired with a base `hidden`) at/above the breakpoint. */
export function showFlexAtBreakpoint(bp: ShellBreakpoint | 'never'): Record<string, boolean> {
  return {
    'sm:flex': bp === 'sm',
    'md:flex': bp === 'md',
    'lg:flex': bp === 'lg',
    'xl:flex': bp === 'xl',
  };
}

/** `{bp}:drawer-open` — make the DaisyUI drawer permanent at/above the breakpoint. */
export function drawerOpenAtBreakpoint(bp: ShellBreakpoint): Record<string, boolean> {
  return {
    'sm:drawer-open': bp === 'sm',
    'md:drawer-open': bp === 'md',
    'lg:drawer-open': bp === 'lg',
    'xl:drawer-open': bp === 'xl',
  };
}
