import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToast, provideAlert, provideHkTheme } from '@hakistack/ng-daisyui';
import * as Lucide from '@lucide/angular';

import { routes } from './app.routes';
import { providePipes } from '../../../hakistack/ng-daisyui/src/lib/services/pipe-registry.service';

/**
 * Every Lucide icon, auto-registered — so any `lucideIcon="..."` name resolves
 * without hand-maintaining an import list (which previously threw "Unable to
 * resolve icon" at runtime for any name not in the curated set).
 *
 * We filter the package's exports down to the icon component classes — each
 * carries a static `icon` holding its `LucideIconData` — and drop the framework
 * exports (providers, tokens, base classes). `provideLucideIcons` derives the
 * kebab-case name from each component's icon data.
 *
 * Trade-off: this bundles the full Lucide set (~1500 icons). Fine for a demo;
 * a user-facing app should register only the icons it actually uses.
 */
const ALL_LUCIDE_ICONS = (Object.values(Lucide) as unknown[]).filter(
  (v) => typeof v === 'function' && 'icon' in (v as object) && !!(v as { icon?: { node?: unknown } }).icon?.node,
) as Lucide.LucideIcon[];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHkTheme('daisyui-v4'),
    providePipes(),
    provideRouter(routes),
    provideToast(),
    provideAlert(),
    Lucide.provideLucideConfig({ size: 20, strokeWidth: 1.75 }),
    Lucide.provideLucideIcons(...ALL_LUCIDE_ICONS),
  ],
};
