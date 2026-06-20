import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { BreadcrumbService } from './breadcrumbs.service';
import { BreadcrumbItem, BreadcrumbSize } from './breadcrumbs.types';

const SIZE_CLASS: Record<BreadcrumbSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * `<hk-breadcrumbs>` — a DaisyUI breadcrumb trail.
 *
 * Two modes:
 * - **Manual:** pass `[items]` (plain {@link BreadcrumbItem} objects).
 * - **Automatic:** set `auto` to derive the trail from the Angular Router,
 *   reading each route's `data[routeDataKey]` (default `'breadcrumb'`).
 *
 * The last crumb is the current page (non-interactive, `aria-current="page"`)
 * unless one is flagged `current`.
 *
 * @example Manual
 * <hk-breadcrumbs [items]="[
 *   { label: 'Home', routerLink: '/', icon: 'house' },
 *   { label: 'Documents', routerLink: '/documents' },
 *   { label: 'Add Document' },
 * ]" />
 *
 * @example Automatic (route data: `{ breadcrumb: 'Documents' }`)
 * <hk-breadcrumbs auto [home]="{ label: 'Home', routerLink: '/', icon: 'house' }" />
 */
@Component({
  selector: 'hk-breadcrumbs',
  imports: [NgTemplateOutlet, RouterLink, LucideDynamicIcon],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class BreadcrumbsComponent<T = unknown> {
  private readonly breadcrumbs = inject(BreadcrumbService);

  /** Manual trail (ignored when `auto`). */
  readonly items = input<BreadcrumbItem<T>[]>([]);
  /** Derive the trail from the Angular Router. Usable as a bare flag (`auto`). */
  readonly auto = input(false, { transform: booleanAttribute });
  /** Crumb prepended in `auto` mode (e.g. a Home link). */
  readonly home = input<BreadcrumbItem<T> | null>(null);
  /** Which `route.data` key to read in `auto` mode. */
  readonly routeDataKey = input('breadcrumb');
  /** Text size. */
  readonly size = input<BreadcrumbSize>('sm');
  /** Max width as a CSS length; enables horizontal scroll when exceeded. */
  readonly maxWidth = input<string | undefined>(undefined);
  /** Accessible label for the `<nav>` landmark. */
  readonly ariaLabel = input('Breadcrumb');

  /** Emitted when a link/action crumb is activated. */
  readonly itemSelect = output<BreadcrumbItem<T>>();

  readonly sizeClass = computed(() => SIZE_CLASS[this.size()]);

  private readonly autoTrail = computed<BreadcrumbItem<T>[]>(() => {
    if (!this.auto()) return [];
    this.breadcrumbs.navTick(); // reactive dependency: rebuild on navigation
    return this.breadcrumbs.build(this.routeDataKey()) as BreadcrumbItem<T>[];
  });

  /** Final list the template iterates: source + optional home, last → current. */
  readonly resolvedItems = computed<BreadcrumbItem<T>[]>(() => {
    const base = this.auto() ? this.autoTrail() : this.items();
    const home = this.home();
    const list = home ? [home, ...base] : [...base];
    if (list.length && !list.some((c) => c.current)) {
      list[list.length - 1] = { ...list[list.length - 1], current: true };
    }
    return list;
  });

  select(item: BreadcrumbItem<T>, event?: Event): void {
    if (item.disabled) {
      event?.preventDefault();
      return;
    }
    item.action?.(item);
    this.itemSelect.emit(item);
  }
}
