import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, BreadcrumbRouteContext, BreadcrumbRouteData } from './breadcrumbs.types';

/** Default `route.data` key read when building automatic trails. */
export const DEFAULT_BREADCRUMB_DATA_KEY = 'breadcrumb';

/**
 * Builds breadcrumb trails from the Angular Router.
 *
 * Walks the activated-route snapshot from the root down the `firstChild` chain,
 * accumulating URL segments, and emits a crumb for every route whose
 * `data[dataKey]` is set (string / partial-item / function — see
 * {@link BreadcrumbRouteData}). The last crumb is flagged `current`.
 *
 * Use the reactive {@link trail} (default key) or call {@link build} for a
 * custom key, depending on {@link navTick} for reactivity. `<hk-breadcrumbs auto>`
 * consumes this; you can also inject it directly for the trail signal alone.
 *
 * Router is injected optionally so the service (and the component that injects
 * it) never throws in a router-less app — `build()` simply returns `[]`.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router, { optional: true });

  /** Emits after each successful navigation (and once initially). Use as a reactive dependency. */
  readonly navTick: Signal<unknown> = this.router
    ? toSignal(this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)), { initialValue: null })
    : signal(null);

  /** Reactive trail for the default `breadcrumb` data key. */
  readonly trail: Signal<BreadcrumbItem[]> = computed(() => {
    this.navTick();
    return this.build(DEFAULT_BREADCRUMB_DATA_KEY);
  });

  /** Build the trail synchronously for a given route-data key. */
  build(dataKey: string = DEFAULT_BREADCRUMB_DATA_KEY): BreadcrumbItem[] {
    if (!this.router) return [];

    const crumbs: BreadcrumbItem[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let url = '';

    while (route) {
      const segment = route.url.map((s) => s.path).join('/');
      if (segment) url += '/' + segment;

      const raw = route.data?.[dataKey] as BreadcrumbRouteData | undefined;
      if (raw != null) {
        const ctx: BreadcrumbRouteContext = { data: route.data, params: route.params, url: url || '/' };
        crumbs.push({ ...this.resolve(raw, ctx), routerLink: url || '/' });
      }
      route = route.firstChild;
    }

    if (crumbs.length) crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], current: true };
    return crumbs;
  }

  private resolve(raw: BreadcrumbRouteData, ctx: BreadcrumbRouteContext): BreadcrumbItem {
    const value = typeof raw === 'function' ? raw(ctx) : raw;
    return typeof value === 'string' ? { label: value } : { ...value };
  }
}
