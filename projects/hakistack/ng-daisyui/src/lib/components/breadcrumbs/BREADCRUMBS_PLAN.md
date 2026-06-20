# `hk-breadcrumbs` — Component Plan

> Config-driven DaisyUI **breadcrumbs** for `@hakistack/ng-daisyui`.
> Reference: https://daisyui.com/components/breadcrumbs/ ·
> CSS source: `packages/daisyui/src/components/breadcrumbs.css`

A small, declarative navigation-trail component. Items are **plain object
literals** (consistent with `hk-menu`); no builder factory.

---

## 1. Goals & Scope

Two ways to drive it, both first-class:

1. **Manual** — render a trail from a `BreadcrumbItem[]` config.
2. **Automatic** — derive the trail from the **Angular Router** (set `auto`),
   reading a `breadcrumb` key off each route's `data` and updating on navigation.

Plus:
- Router links (`routerLink`), external links (`href`), and plain/current items.
- Optional leading icons (Lucide), reusing the `hk-menu` icon plumbing.
- Correct semantics + a11y out of the box (`<nav>` + `<ol>` + `aria-current`).
- Horizontal scroll when constrained (DaisyUI already provides this).
- **Optional** overflow collapsing (`maxItems` → ellipsis) as a phase-3 add-on.

---

## 2. DaisyUI mapping (from the CSS source)

```css
.breadcrumbs { max-w-full overflow-x-auto py-2; }
.breadcrumbs > :is(menu, ul, ol) { flex items-center whitespace-nowrap; }
.breadcrumbs > * > li { flex items-center; }
.breadcrumbs > * > li > * { flex items-center gap-2 cursor-pointer hover:underline; }
.breadcrumbs > * > li + *::before { /* rotated chevron separator, RTL-aware */ }
```

Takeaways that shape the API:
- **Use `<ol>`** (the CSS accepts `ul`/`ol`/`menu`) — `<ol>` is the correct
  semantics for an ordered trail. Wrap in `<nav aria-label="Breadcrumb">`.
- **Separators are decorative** (`li + * ::before`) and RTL-aware — nothing to
  render or expose; they're absent from the a11y tree (good).
- **`> li > *` gets `cursor-pointer hover:underline`** — so the **current**
  (non-link) item must either be bare text directly in the `<li>` or a wrapper
  with `cursor-default` + `hover:no-underline` to avoid looking clickable.
- Scroll-on-overflow is free via `max-w-full overflow-x-auto`; a `maxWidth`
  input just sets the bound.

---

## 3. Public API

### 3.1 `BreadcrumbItem` (`breadcrumbs.types.ts`)

```typescript
import type { MenuIcon } from '../menu/menu.types';   // reuse: LucideIconData | string

export interface BreadcrumbItem<T = unknown> {
  /** Visible text. */
  label: string;
  /** Leading icon (Lucide component or dynamic name). */
  icon?: MenuIcon;
  /** Internal navigation (routerLink + routerLinkActive). */
  routerLink?: string | unknown[];
  /** External URL. Mutually exclusive with routerLink. */
  href?: string;
  target?: '_blank' | '_self';
  /**
   * Marks the current page — rendered as non-interactive text with
   * `aria-current="page"`. Defaults to the LAST item when unset.
   */
  current?: boolean;
  /** Visible but non-interactive. */
  disabled?: boolean;
  /** Per-item handler (for action-style crumbs); also fires `(itemSelect)`. */
  action?: (item: BreadcrumbItem<T>) => void;
  /** Extra classes on the item's anchor/text. */
  class?: string;
  /** Accessible label override (e.g. an icon-only home crumb). */
  ariaLabel?: string;
  /** Arbitrary payload echoed back in `(itemSelect)`. */
  data?: T;
}

export type BreadcrumbSize = 'xs' | 'sm' | 'md' | 'lg';
```

### 3.2 Component (`hk-breadcrumbs`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `BreadcrumbItem<T>[]` | `[]` | Manual trail (ignored when `auto`). |
| `auto` | `boolean` | `false` | Build the trail from the Angular Router (see §3.3). |
| `home` | `BreadcrumbItem \| null` | `null` | Crumb prepended in `auto` mode (e.g. `{ label: 'Home', routerLink: '/', icon: 'house' }`). |
| `routeDataKey` | `string` | `'breadcrumb'` | Which `route.data` key to read in `auto` mode. |
| `size` | `BreadcrumbSize` | `'sm'` | → `text-xs/sm/base/lg`. |
| `maxWidth` | `string` | — | CSS length (inline style); enables the built-in scroll. |
| `ariaLabel` | `string` | `'Breadcrumb'` | `<nav aria-label>`. |
| `maxItems` | `number` | — | *(phase 3)* collapse the middle into an ellipsis when exceeded. |
| `itemTemplate` | `TemplateRef` | — | *(optional)* custom crumb rendering; context `{ $implicit: item, current }`. |

| Output | Payload | When |
|---|---|---|
| `itemSelect` | `BreadcrumbItem<T>` | A link/action crumb is activated. |

**No builder.** Plain object literals are the documented manual style:

```typescript
items = [
  { label: 'Home', routerLink: '/', icon: 'house' },
  { label: 'Documents', routerLink: '/documents', icon: 'folder' },
  { label: 'Add Document' },            // last → current automatically
];
// <hk-breadcrumbs [items]="items" />
```

### 3.3 Automatic (Router) mode

```html
<hk-breadcrumbs auto [home]="{ label: 'Home', routerLink: '/', icon: 'house' }" />
```

Annotate routes with a `breadcrumb` entry in `data`:

```typescript
export const routes: Routes = [
  { path: 'documents', data: { breadcrumb: 'Documents' },
    children: [
      { path: '', component: DocsListComponent },
      { path: ':id', component: DocComponent,
        // dynamic label from params / resolved data:
        data: { breadcrumb: (ctx) => ctx.params['id'] } },
      { path: 'new', component: NewDocComponent,
        // object form adds an icon:
        data: { breadcrumb: { label: 'Add Document', icon: 'file-plus' } } },
    ] },
];
```

**Route-data shape** (`breadcrumbs.types.ts`):

```typescript
export type BreadcrumbRouteData<T = unknown> =
  | string
  | Omit<BreadcrumbItem<T>, 'routerLink' | 'current'>
  | ((ctx: BreadcrumbRouteContext) => string | Omit<BreadcrumbItem<T>, 'routerLink' | 'current'>);

export interface BreadcrumbRouteContext {
  data: Data;          // route.data (incl. resolved values)
  params: Params;      // route.params
  url: string;         // accumulated absolute URL to this route
}
```

**How the trail is built** (`BreadcrumbService`, `providedIn: 'root'`):
- Subscribe to `Router` `NavigationEnd`; walk the activated-route snapshot from
  the root down the `firstChild` chain.
- Accumulate URL segments per matched route to form each crumb's `routerLink`.
- For every route whose `data[routeDataKey]` is set, resolve it (string /
  object / function) into a `BreadcrumbItem` with that `routerLink`. Routes
  without the key are skipped (pure grouping paths add no crumb).
- Mark the **last** crumb `current` (no link). `home` is prepended if provided.
- Exposed as a `trail: Signal<BreadcrumbItem[]>` (via `toSignal` over the
  navigation stream) so it's zero-subscription for consumers.

The component in `auto` mode injects `BreadcrumbService` and renders
`[home, ...service.trail()]`; otherwise it renders `items`. The service is also
**usable standalone** for apps that want the trail signal without the component:

```typescript
private crumbs = inject(BreadcrumbService);
trail = this.crumbs.trail;   // Signal<BreadcrumbItem[]>
```

`resolvedItems()` (the computed the template iterates) picks `auto ? trail : items`,
applies `home`, and defaults the last item to `current`.

---

## 4. Rendering

```html
<nav class="breadcrumbs" [class]="sizeClass()" [style.max-width]="maxWidth()" [attr.aria-label]="ariaLabel()">
  <ol>
    @for (item of resolvedItems(); track $index) {
      <li [class]="item.class">
        @if (item.current) {
          <span class="inline-flex items-center gap-2 cursor-default hover:no-underline" aria-current="page" [attr.aria-label]="item.ariaLabel ?? null">
            <ng-container *ngTemplateOutlet="crumbInner; context: { $implicit: item }" />
          </span>
        } @else if (item.href && !item.disabled) {
          <a [href]="item.href" [attr.target]="item.target ?? null" [attr.rel]="item.target === '_blank' ? 'noopener noreferrer' : null"
             [attr.aria-label]="item.ariaLabel ?? null" (click)="select(item, $event)"> … </a>
        } @else if (item.routerLink != null && !item.disabled) {
          <a [routerLink]="item.routerLink" [attr.aria-label]="item.ariaLabel ?? null" (click)="select(item, $event)"> … </a>
        } @else {
          <span class="cursor-default hover:no-underline" [attr.aria-disabled]="item.disabled ? true : null"> … </span>
        }
      </li>
    }
  </ol>
</nav>
```

- `crumbInner` template: `@if (item.icon) { <svg [lucideIcon]="item.icon" [size]="16" /> } {{ item.label }}` — reuse `LucideDynamicIcon` (import `LucideDynamicIcon` only; icons bound as data/string like `hk-menu`).
- `resolvedItems()` = computed that marks the last item `current` when none is explicitly set.
- `sizeClass()` maps `size` → `text-xs | text-sm | text-base | text-lg`.

---

## 5. Accessibility (AXE / WCAG AA)

- `<nav aria-label="Breadcrumb">` landmark wrapping an `<ol>`.
- Current page: `aria-current="page"`, non-interactive (no link, no pointer cursor).
- Links are real `<a>` with `routerLink`/`href`; disabled crumbs get
  `aria-disabled` and are not focusable.
- Separators are decorative CSS pseudo-elements — correctly excluded from the
  a11y tree (no extra ARIA needed).
- Icon-only crumbs require `ariaLabel`.

---

## 6. File Structure

```
components/breadcrumbs/
├── breadcrumbs.component.ts      # hk-breadcrumbs (signal inputs, OnPush)
├── breadcrumbs.component.html
├── breadcrumbs.component.css     # :host + current-item cursor reset
├── breadcrumbs.types.ts          # BreadcrumbItem, BreadcrumbSize, BreadcrumbRouteData
├── breadcrumbs.service.ts        # BreadcrumbService — Router → trail signal
└── breadcrumbs.component.spec.ts # Vitest: rendering, current/last, links, a11y, icons, auto/router trail
```

No `breadcrumbs.helpers.ts` — plain objects, no builder.

---

## 7. Barrel Exports (`public-api.ts`)

```typescript
// Breadcrumbs
export { BreadcrumbsComponent } from './lib/components/breadcrumbs/breadcrumbs.component';
export { BreadcrumbService } from './lib/components/breadcrumbs/breadcrumbs.service';
export type {
  BreadcrumbItem,
  BreadcrumbSize,
  BreadcrumbRouteData,
  BreadcrumbRouteContext,
} from './lib/components/breadcrumbs/breadcrumbs.types';
```

---

## 8. Implementation Phases

1. **Core (manual)** — types, component (config `items`, current-defaulting,
   size, maxWidth), icons, router/href/current rendering, `(itemSelect)`.
   Spec + a11y pass.
2. **Router auto-trail** — `BreadcrumbService` (Router → `trail` signal),
   `auto`/`home`/`routeDataKey` inputs, `BreadcrumbRouteData` resolution
   (string / object / function). Specs with a mock router. **Core feature.**
3. **Demo** — `breadcrumbs-demo.component.ts` (tabs: basic, with icons,
   max-width scroll, **auto/router**) + route `/breadcrumbs/:feature` + a
   "Breadcrumbs" nav entry under the **Navigation** group. The auto tab wires a
   couple of child routes with `data.breadcrumb` to show the live trail.
4. **(Optional) Overflow collapse** — `maxItems`: keep first + last *n*, collapse
   the middle into a `…` trigger that reveals the hidden crumbs in a small CDK
   overlay panel (reuse the overlay pattern from `hk-menu`'s rail flyout).

---

## 9. Reuse Notes

- **Icons:** reuse `MenuIcon` type + `LucideDynamicIcon` (bind icon data/name; no
  app-side registration needed when passing the Lucide component).
- **Overflow collapse (phase 3):** reuse the CDK connected-overlay approach
  already used by `hk-menu` (rail flyout) and `hk-select`.
- Stays auth/i18n-agnostic — `label` is pre-translated, visibility is the app's
  concern (filter `items` before passing).
