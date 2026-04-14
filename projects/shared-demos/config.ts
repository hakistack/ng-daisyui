/**
 * Demo-wide feature flags.
 * Flip these and rebuild — both v5 and v4 demos consume this file.
 */

/**
 * When `false`, the Overview section (Getting Started / Installation / Key Patterns)
 * is hidden from the sidebar AND the default route redirects to `/forms` instead
 * of `/getting-started`. The onboarding routes themselves stay wired, so someone
 * with the direct URL can still reach them.
 *
 * Use case: showcase-only mode — we don't want visitors to install yet.
 */
export const SHOW_OVERVIEW = false;

/** When `false`, the import snippet (`import { X } from '@hakistack/ng-daisyui'`) is hidden on every demo page. */
export const SHOW_IMPORT = false;
