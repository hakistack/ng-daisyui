import { Routes } from '@angular/router';
import * as Lucide from '@lucide/angular';

/**
 * The Icons page lets visitors render any Lucide icon by name, so it registers
 * the full set — on this lazy route only, keeping it out of the initial bundle.
 */
const ALL_LUCIDE_ICONS = (Object.values(Lucide) as unknown[]).filter(
  (v) => typeof v === 'function' && 'icon' in (v as object) && !!(v as { icon?: { node?: unknown } }).icon?.node,
) as Lucide.LucideIcon[];

const load = () => import('@shared-demos/demos/icons-demo.component').then((m) => m.IconsDemoComponent);

export const ICONS_ROUTES: Routes = [
  {
    path: '',
    providers: [Lucide.provideLucideIcons(...ALL_LUCIDE_ICONS)],
    children: [
      { path: '', loadComponent: load },
      { path: ':feature', loadComponent: load },
    ],
  },
];
