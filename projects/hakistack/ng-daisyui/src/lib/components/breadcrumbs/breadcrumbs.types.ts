import type { Data, Params } from '@angular/router';
import type { MenuIcon } from '../menu/menu.types';

/**
 * A single crumb in an `hk-breadcrumbs` trail. Plain object literal — no builder.
 *
 * The last item defaults to the current page (rendered as non-interactive text
 * with `aria-current="page"`) unless another item sets `current` explicitly.
 *
 * @example
 * { label: 'Documents', routerLink: '/documents', icon: 'folder' }
 */
export interface BreadcrumbItem<T = unknown> {
  /** Visible text. */
  label: string;
  /** Leading icon (Lucide component or dynamic name). */
  icon?: MenuIcon;
  /** Internal navigation (uses `routerLink`). Mutually exclusive with `href`. */
  routerLink?: string | unknown[];
  /** External URL. */
  href?: string;
  target?: '_blank' | '_self';
  /** Marks the current page — non-interactive, `aria-current="page"`. Defaults to the last item. */
  current?: boolean;
  /** Visible but non-interactive. */
  disabled?: boolean;
  /** Per-item handler (for action-style crumbs); also fires `(itemSelect)`. */
  action?: (item: BreadcrumbItem<T>) => void;
  /** Extra classes on the crumb's anchor/text. */
  class?: string;
  /** Accessible label override (e.g. an icon-only home crumb). */
  ariaLabel?: string;
  /** Arbitrary payload echoed back in `(itemSelect)`. */
  data?: T;
}

/** Text size token → `text-xs | text-sm | text-base | text-lg`. */
export type BreadcrumbSize = 'xs' | 'sm' | 'md' | 'lg';

/** Context passed to a function-form `breadcrumb` route data entry. */
export interface BreadcrumbRouteContext {
  /** The route's `data` (including resolved values). */
  data: Data;
  /** The route's params. */
  params: Params;
  /** Accumulated absolute URL to this route. */
  url: string;
}

/**
 * Value placed on a route's `data.breadcrumb` (key configurable via the
 * component's `routeDataKey`) for automatic trails. One of:
 * - a plain string label,
 * - a partial {@link BreadcrumbItem} (e.g. with an `icon`),
 * - a function deriving either from the route params / resolved data.
 *
 * `routerLink` and `current` are computed by the service, so they're omitted.
 *
 * @example
 * data: { breadcrumb: 'Documents' }
 * data: { breadcrumb: { label: 'Add Document', icon: 'file-plus' } }
 * data: { breadcrumb: (ctx) => ctx.params['id'] }
 */
export type BreadcrumbRouteData<T = unknown> =
  | string
  | Omit<BreadcrumbItem<T>, 'routerLink' | 'current'>
  | ((ctx: BreadcrumbRouteContext) => string | Omit<BreadcrumbItem<T>, 'routerLink' | 'current'>);
