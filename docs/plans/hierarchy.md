# Hierarchy — Implementation Plan

Reference UX targets:
- [PrimeNG OrganizationChart](https://primeng.org/organizationchart) — primary API + rendering reference. Pragmatic table-based hierarchy, TreeNode data model, per-node-type template projection. This is the closest fit for our "daisyUI-native, no heavy deps" ethos.
- [Syncfusion EJ2 org-chart auto-layout](https://ej2.syncfusion.com/angular/documentation/diagram/automatic-layout/org-chart) — feature taxonomy reference. Used as a checklist for deferred features (orientation modes, sub-tree alignment, assistant nodes).
- [Syncfusion Angular Diagram Org Chart](https://www.syncfusion.com/angular-components/angular-diagram/organizational-chart) — marketing summary, useful for capability scope.

Goal: ship `<hk-hierarchy>` + `createHierarchy()` builder inside `@hakistack/ng-daisyui`. A signal-driven, OnPush, daisyUI-native hierarchy visualizer that renders a tree of arbitrary nodes with consumer-supplied templates, supports expand/collapse, single/multi selection, keyboard nav, and zero new runtime deps. The org-chart use case (people, titles, reporting lines) is the canonical example, but the API is intentionally generic — same component renders product taxonomies, file-system trees, decision trees, anything tree-shaped. The previous Org Chart demo (removed in commit `390b6ef`) tried a different shape and was abandoned — this is a clean restart with a focused, minimal scope, and a generic name so it doesn't collide with the upcoming `<hk-chart>` data-viz module.

## Why "hierarchy" not "org chart"

The component is structurally a hierarchy renderer, not specifically an org chart. Naming it `<hk-org-chart>` would (a) collide semantically with the planned `<hk-chart>` data-viz module and (b) constrain consumer mental model to "this is for people". `<hk-hierarchy>` reads cleanly for any tree-shaped data — org structures, taxonomies, file systems, decision trees — and leaves "chart" exclusively for the data-viz primitive. The default node template stays org-flavored (avatar + name + title) since that's the most common case, but the API has no notion of "employee" or "report".

## Why PrimeNG's table-based rendering (not tidy-tree + SVG)

Three rendering approaches were considered:

| Approach | Code cost | Trade-off |
|---|---|---|
| **HTML `<table>` recursion** (PrimeNG) | ~0 layout code — browser table layout handles centering and column widths | Vertical-only. No pan/zoom out of the box. Connectors are CSS borders on dummy `<td>` cells. |
| **Tidy-tree (Buchheim) + SVG connectors + HTML nodes** | ~150 lines of algorithm + bounding-box math + pan/zoom layer | Supports any orientation, easy bounding-box for fit-to-screen, pan/zoom natural. Heavier. |
| **`@swimlane/ngx-graph` / `mermaid` / d3-hierarchy** | external dep | ~140 KB+ gzipped, RxJS-heavy or string-DSL, fights Tailwind v4 + signals. |

**Verdict: HTML table.** PrimeNG proves it works, and "the browser handles layout for free" is the right kind of cheap for a hierarchy that's overwhelmingly viewed top-down. We give up pan/zoom and orientation modes in Phase 1, and we get a phase-1 surface that's ~half the code of a tidy-tree alternative. Pan/zoom + orientations are clearly deferred to Phase 2 — when we tackle them we may pivot to the SVG-coords approach, but only after Phase 1 ships and we have a real consumer using it.

## Why a custom build vs adopting PrimeNG / Syncfusion directly

- **Bring PrimeNG into the lib** → pulls PrimeFlex CSS conventions and PrimeNG-styled themes; fights daisyUI tokens. Their org-chart is also the only PrimeNG component we'd need, so adopting one to get one component is bad surface-area economics.
- **Bring Syncfusion EJ2** → commercial license, ~MB-scale diagram engine, way overkill for "render a tree of nodes".
- **Hand-roll** → ~1 day of layout-shape work + ~2 days of signal/builder/template/keyboard wiring. Total cost is small because we own the abstraction and it composes cleanly with the rest of the lib.

## Realistic scope

| Phase | Scope | Status |
|---|---|---|
| 1 | Table-based render, `HierarchyNode<T>` data, default template + per-type template projection, expand/collapse, single + multi selection, keyboard a11y, builder + controller, demo | Not started |
| 2 | Pan/zoom + horizontal orientation (likely a render-mode switch to SVG-coords path), search highlight, assistant nodes | Deferred |
| 3 | PNG/PDF export, minimap, virtualization, drag-to-reparent | Deferred / partly out-of-scope |

Phase 1 is ~3 days focused work. Most of the surface mirrors `<hk-table>` patterns (builder, controller forwarding, label tokens) and `<hk-notification>` patterns (theme-bridge, default card class).

## Architecture (locked)

### Stack
- **No new runtime deps.** Pure Angular + HTML + Tailwind utilities + daisyUI primitives.
- **Recursive HTML `<table>`** for the hierarchy, exactly like PrimeNG. Each node renders a 3-row table: node row, connector row (drawn with CSS borders on inner `<td>` cells), and a children row whose cells each contain a recursive `<hk-hierarchy-subtree>`. Browser layout centers parents over their children automatically — no math, no algorithm.
- **Signal-driven, OnPush, standalone.** Same conventions as the rest of the lib (CLAUDE.md). No NgModules. Host bindings in `@Component({ host: { ... } })`. No `@HostBinding`.
- **daisyUI primitives** for the default node visual (`card`, `card-border`, `avatar`, `badge`, `btn-ghost`, `btn-circle`, `btn-xs`). Theme-bridged via `HK_THEME` for v4↔v5 compatibility, mirroring `notification-item.component.ts` panelClass pattern.
- **Builder + controller** (`createHierarchy`) returning `config()` signal + imperative methods, mirroring `createTable`'s `FieldConfiguration` shape with the same WeakMap-based instance registry pattern.

### Data model
Recursive `HierarchyNode<T>` with a generic payload — same shape PrimeNG ships, mapped to our naming:

```ts
export interface HierarchyNode<T = unknown> {
  /** Stable id. Required for tracking + selection + controller methods. */
  readonly id: string;
  /** Consumer payload. Anything the projected template wants — name, title, avatar URL, headcount, etc. */
  readonly data: T;
  /** Optional template-discriminator. Routes the node to a matching `nodeTemplates` entry. Falls back to default. */
  readonly type?: string;
  /** Subordinate nodes. Empty/undefined = leaf. */
  readonly children?: readonly HierarchyNode<T>[];
  /** Whether the subtree is expanded on initial render. Default: true (matches PrimeNG). */
  readonly expanded?: boolean;
  /** When false, the node is rendered but cannot be the selection target. */
  readonly selectable?: boolean;
  /** Per-node CSS class applied to the node card — composes with the default daisyUI classes. */
  readonly nodeClass?: string;
}
```

### State model
- Builder owns `config` (resolved + normalized) and the WeakMap registry of attached component instances (mirrors `createTable`).
- Component owns view state via signals: `expandedIds: Set<string>` (positive set so toggling at runtime doesn't mutate the input tree), `selectedIds: Set<string>` (size-1 in single mode, N in multi).
- `selectionMode`: `'none' | 'single' | 'multiple'`. Default: `'none'` — selection is opt-in.
- Two-way `selection` model — single returns `HierarchyNode<T> | null`, multi returns `HierarchyNode<T>[]`. Same shape as PrimeNG.

### Public API surface
- `HierarchyComponent` — standalone, OnPush.
- `createHierarchy<T>(config): HierarchyController<T>` — builder.
- `HierarchyNode<T>` — recursive data shape.
- `HierarchyController<T>` — imperative handle: `expand`, `collapse`, `toggle`, `expandAll`, `collapseAll`, `select`, `clearSelection`, plus the underlying `config` and `state` signals.
- `HierarchySelectionMode = 'none' | 'single' | 'multiple'`.
- `HK_HIERARCHY_LABELS` token + `provideHkHierarchyLabels` helper (i18n hook, same pattern as `HK_COMMAND_PALETTE_LABELS` and `HK_NOTIFICATION_LABELS`).

### Per-type template projection
PrimeNG's `pTemplate="person"` / `pTemplate="default"` discrimination is a great pattern — different visual templates per node `type`. We map it to Angular template references via a typed config slot:

```ts
nodeTemplates?: {
  default?: TemplateRef<{ $implicit: T; node: HierarchyNode<T> }>;
  [type: string]: TemplateRef<{ $implicit: T; node: HierarchyNode<T> }> | undefined;
};
```

When a node has `type: 'person'` and `nodeTemplates.person` is defined, that template renders; otherwise `nodeTemplates.default`; otherwise the built-in default card. This keeps the API tiny while supporting heterogeneous trees (e.g. mixing department headers with people, or folders with files).

### Default node template (built-in)
When no consumer template matches, the component renders a daisyUI card:

```html
<div class="card card-border bg-base-100 hover:bg-base-200 transition-colors">
  <div class="card-body p-3 text-center">
    <div class="font-semibold truncate">{{ node.data?.name ?? node.data }}</div>
    @if (node.data?.title) {
      <div class="text-xs opacity-70 truncate">{{ node.data.title }}</div>
    }
  </div>
</div>
```

Selection styling: `ring-2 ring-primary ring-offset-2`. Hover: `bg-base-200`. Both inherit theme.

### Connector rendering (PrimeNG-style, CSS-only)
Connectors are drawn with CSS borders on dummy table cells — no SVG. Three line classes:

- **`.hk-hier-line-down`** — vertical drop from a parent to the spine row below it. A `<td>` that's `border-r border-base-content/20` on its left half (visualized via a sub-`<div>` that's positioned with `border-r`). Half-width.
- **`.hk-hier-line-left`** / **`.hk-hier-line-right`** — connector spine spanning the children row. The leftmost child cell gets `.line-right` (top-border drawn from center to right edge), the rightmost gets `.line-left` (top-border center to left edge), and intermediate cells get a full top-border. Each child also has a vertical drop into its node from the spine.

This matches PrimeNG's `connectorDown` / `connectorLeft` / `connectorRight` taxonomy. We expose the colors via daisyUI tokens (`base-content/20` by default, configurable via `connectorClass` on the config).

### Expand/collapse
- Each non-leaf node renders a toggle button in its bottom edge — `btn btn-ghost btn-circle btn-xs` with an inline chevron SVG (rotates via `transition-transform` based on `aria-expanded`).
- `toggle(id)` flips the id in the `expandedIds` set. Children row is conditionally rendered via `@if (isExpanded(node))`.
- Animated via `@starting-style` on the children row — opacity + small `translateY` slide, matching the notification entrance pattern. Reduced-motion override forces opacity-only.

### Selection
- `selectionMode="none"` (default) — node clicks do nothing visually beyond hover.
- `selectionMode="single"` — clicking a node sets `selectedIds = new Set([id])` and emits `selectionChange`.
- `selectionMode="multiple"` — clicking toggles the id in `selectedIds`. Cmd/Ctrl-click on macOS / Windows is the same as a plain click in this mode (multi by default; modifier doesn't change behavior — keeps the API simple). Shift-click for range selection is **deferred** — range selection in a tree is ambiguous (DFS order? sibling order?) and not worth the complexity in Phase 1.
- Two-way binding: `[(selection)]` — input is `HierarchyNode<T> | HierarchyNode<T>[] | null` depending on mode; output emits the same shape.
- Selection is independent of expansion. A collapsed node can still be selected.

### Keyboard accessibility
PrimeNG's current org-chart has acknowledged a11y gaps (table-based rendering, weak SR support). We do better:

- Root `<div>` carries `role="tree"`. Each node `role="treeitem"` with `aria-level` (depth + 1), `aria-expanded` (only on non-leaves), `aria-selected` (only when `selectionMode !== 'none'`).
- Roving `tabindex`: one node at a time has `tabindex="0"` (the focused one), all others `-1`. `Tab` enters and exits the chart; arrow keys move within.
- Keys, following the W3C tree pattern:
  - **Down / Up** → next / previous sibling (same parent).
  - **Right / Left** → first child / parent. On a leaf, `Right` is a no-op. On a collapsed branch, `Right` expands.
  - **Enter / Space** → toggles selection (if `selectionMode !== 'none'`) and toggles expand on a non-leaf.
  - **Home / End** → focus first / last sibling.
  - **\*** → expand all siblings (W3C convention).
- Connectors get `aria-hidden="true"` (they're decorative).
- The `<table>` rendering uses `role="presentation"` on the table elements so screen readers see the tree role hierarchy, not table semantics. This is the missing piece in PrimeNG that we fix.

### Theming
- `HK_THEME` injected. Default card uses `card ${theme.classes.cardBorder} bg-base-100`.
- Connectors use `border-base-content/20` so they read in both light and dark themes.
- Selection ring `ring-primary` flips with daisyUI primary.
- All sizing via Tailwind utilities — no CSS variables needed in Phase 1 (PrimeNG's design-token list is overkill for our scope; consumers override via `nodeClass` on the data or by passing their own template).

### Performance
- **Tracked-by** on every `@for` (node id) → Angular reuses DOM across re-renders.
- Layout cost is the browser's table layout — well-optimized natively.
- Selection / expansion changes touch only the affected nodes (signal granularity).
- Phase 1 budget: 500 nodes responsive on M-series Mac. Past 1k nodes the table layout starts to feel sluggish — at that point we revisit (likely with the SVG-coords approach in Phase 2 or virtualization in Phase 3).

---

## Public API sketch

```ts
// types
export type HierarchySelectionMode = 'none' | 'single' | 'multiple';

export interface HierarchyNode<T = unknown> {
  readonly id: string;
  readonly data: T;
  readonly type?: string;
  readonly children?: readonly HierarchyNode<T>[];
  readonly expanded?: boolean;
  readonly selectable?: boolean;
  readonly nodeClass?: string;
}

export interface HierarchyConfig<T> {
  readonly root: HierarchyNode<T> | readonly HierarchyNode<T>[]; // PrimeNG accepts an array of roots — we do too.
  readonly selectionMode?: HierarchySelectionMode;   // default 'none'
  readonly collapsible?: boolean;                    // default true
  readonly nodeTemplates?: {
    default?: TemplateRef<HierarchyNodeTemplateContext<T>>;
    [type: string]: TemplateRef<HierarchyNodeTemplateContext<T>> | undefined;
  };
  /** Tailwind classes added to the connector borders. Default: `border-base-content/20`. */
  readonly connectorClass?: string;
  readonly onSelect?: (selection: HierarchyNode<T> | readonly HierarchyNode<T>[] | null) => void;
  readonly onToggle?: (node: HierarchyNode<T>, expanded: boolean) => void;
}

export interface HierarchyNodeTemplateContext<T> {
  $implicit: T;
  node: HierarchyNode<T>;
}

export interface HierarchyState {
  readonly selectedIds: ReadonlySet<string>;
  readonly expandedIds: ReadonlySet<string>;
  readonly focusedId: string | null;
}

export interface HierarchyController<T> {
  readonly config: Signal<HierarchyConfig<T>>;
  readonly state: Signal<HierarchyState>;

  expand(id: string): void;
  collapse(id: string): void;
  toggle(id: string): void;
  expandAll(): void;
  collapseAll(): void;

  select(idOrIds: string | readonly string[] | null): void;
  clearSelection(): void;
}
```

```ts
// usage — org-chart use case
chart = createHierarchy<Employee>({
  root: this.companyTree(),
  selectionMode: 'single',
  collapsible: true,
  onSelect: (n) => this.openEmployeeDetail((n as HierarchyNode<Employee> | null)?.data.id),
});
```

```html
<hk-hierarchy [config]="chart.config()" [(selection)]="selected">
  <ng-template hkHierarchyNode="person" let-employee let-node="node">
    <div class="card card-border bg-base-100">
      <div class="card-body p-3 flex-row items-center gap-3">
        <div class="avatar"><div class="w-10 mask mask-circle"><img [src]="employee.avatar" alt=""></div></div>
        <div class="min-w-0">
          <div class="font-semibold truncate">{{ employee.name }}</div>
          <div class="text-xs opacity-70 truncate">{{ employee.title }}</div>
        </div>
      </div>
    </div>
  </ng-template>

  <ng-template hkHierarchyNode="department" let-dept>
    <div class="badge badge-primary badge-lg">{{ dept.name }}</div>
  </ng-template>
</hk-hierarchy>
```

The `hkHierarchyNode="<type>"` directive is a tiny content-projection helper — it's just a `Directive` that wraps the `TemplateRef` and registers it with the parent `HierarchyComponent` via `inject()`. The component then routes each node to the matching template by `node.type`. Same pattern we use elsewhere; nothing exotic.

---

## Phase 1 — Tasks

Each bullet is one focused commit.

### 1. Module scaffolding
- Create `src/lib/components/hierarchy/` with: `hierarchy.component.ts`, `.html`, `.css`, `hierarchy-subtree.component.ts` (recursive child), `hierarchy-node.directive.ts` (template-projection helper), `hierarchy.types.ts`, `hierarchy.helpers.ts`, `hierarchy.labels.ts`.
- Wire `public-api.ts` exports.
- Add nav entry under "Data Display" in demo apps.

### 2. Types + builder
- Define types in `hierarchy.types.ts`.
- Implement `createHierarchy` in `hierarchy.helpers.ts` with WeakMap registry — copy the shape from `createTable`. Forwarded methods are no-ops until a component attaches.
- JSDoc every public symbol (this is the consumer-facing contract).

### 3. Recursive render — base case
- `HierarchyComponent` standalone, OnPush. Inputs: `config`, `selection` (two-way model). Imports: `CommonModule`.
- Internal `HierarchySubtreeComponent` — also standalone, recursive. Renders one node + its children table.
- Default node template inline in the subtree.
- Render works end-to-end for a static expanded tree. No interaction yet.

### 4. Connectors
- CSS for `.hk-hier-line-down` / `.line-left` / `.line-right` using Tailwind utilities + `:host` borders.
- Validate visual parity with PrimeNG's screenshots on a 4-level test tree.

### 5. Expand/collapse
- `expandedIds` signal in the root component.
- `HierarchySubtreeComponent` reads expansion state from a parent injection token.
- Toggle button on non-leaves with rotating chevron.
- `@if` on the children row + `@starting-style` slide animation.
- Forward `expand` / `collapse` / `toggle` / `expandAll` / `collapseAll` from controller.

### 6. Per-type template projection
- `HierarchyNodeDirective` (`[hkHierarchyNode]`) registers its `TemplateRef` with the parent component.
- Component computes a template-by-type map.
- Subtree picks the right template via `*ngTemplateOutlet`. Falls back to default → built-in.

### 7. Selection
- `selectedIds` signal + two-way `selection` model on the component input.
- `selectionMode` switches single / multiple / none.
- Click handler on each node respects `selectable !== false`.
- Visual ring on selected nodes.
- `onSelect` callback fires.

### 8. Keyboard navigation
- Roving `tabindex`, focused node tracked in a signal.
- W3C tree pattern — Down/Up siblings, Right/Left child/parent, Enter/Space toggle, Home/End, `*` expand-siblings.
- Visual focus ring (`focus-visible:ring-2 ring-accent`).
- Verify with axe-core on demo.

### 9. ARIA + screen-reader hardening
- `role="tree"` on root, `role="treeitem"` on nodes, `role="presentation"` on tables.
- `aria-level`, `aria-expanded`, `aria-selected`.
- `aria-hidden="true"` on connector rows.
- Run axe — must pass.

### 10. i18n labels token
- `HK_HIERARCHY_LABELS` + `provideHkHierarchyLabels` with defaults: `expandNode`, `collapseNode`, `selectedNode`, `emptyHierarchy`.

### 11. Demo + tests
- `projects/shared-demos/demos/hierarchy-demo.component.ts` with three tabs:
  - **Org chart** — default template, single root, three levels of employees. Canonical use case.
  - **Mixed types** — `type: 'person'` + `type: 'department'` showing per-type template projection.
  - **Non-org tree** — a product taxonomy or file-system fragment, demonstrating the API isn't org-specific.
- 8–10 unit tests: `createHierarchy` shape, expand/collapse mutation, selection (single + multi), keyboard nav (parent/child/sibling), selectable=false suppression, per-type template routing.
- AXE pass on the demo route.

### 12. Public-api wiring + version
- Confirm every public symbol re-exported from `public-api.ts`.
- Add CHANGELOG entry. Bump patch.

---

## Decisions locked in

1. **Generic name `<hk-hierarchy>`** — not `<hk-org-chart>`. Avoids collision with the planned `<hk-chart>` data-viz module and reflects the actual scope (any tree, not just org structures).
2. **HTML `<table>` recursion (PrimeNG approach)** over tidy-tree + SVG. Browser handles layout; we ship in half the code.
3. **Vertical top-down only in Phase 1.** Horizontal / BTT / RTL deferred. (When we add them, expect a render-mode switch — we'll likely build the SVG-coords path then.)
4. **Per-type template projection via `[hkHierarchyNode]` directive.** Mirrors PrimeNG's `pTemplate="<type>"` ergonomics, idiomatic Angular under the hood.
5. **Selection modes: none / single / multiple.** PrimeNG-compatible. No range/shift-select in Phase 1.
6. **No pan/zoom in Phase 1.** Consumers wrap the component in their own scrollable container if needed (`overflow-x-auto`, just like PrimeNG's docs show).
7. **No new runtime deps.** Layout, connectors, selection, keyboard handling all hand-rolled.
8. **Theme-bridged default card** — uses `card ${theme.classes.cardBorder} bg-base-100`, consistent with notification + command-palette card surfaces.
9. **Roots-as-array** allowed in input (PrimeNG accepts `TreeNode[]`). Phase 1 renders multiple roots side-by-side at the top level.

## Deferred to Phase 2

- **Pan / zoom** — likely requires switching the inner render to absolute-positioned nodes + SVG connectors (Buchheim tidy-tree). Worth its own design pass.
- **Horizontal orientation** (`LeftToRight`) — easiest after the pan/zoom pivot.
- **Search + highlight** — fuzzy match via Fuse.js (already a runtime dep). `searchKeys: (keyof T)[]` on the config. Matched nodes get `ring-warning`. Ancestors auto-expand to reveal matches.
- **Assistant nodes** — Syncfusion's distinct child relationship rendered to the side. Encoded via `HierarchyNode.role: 'child' | 'assistant'`.
- **Per-subtree alignment overrides** — Syncfusion's `Left` / `Right` / `Center` / `Balanced` / `VerticalLeft` etc. Phase 1 default is centered.
- **Fit-to-screen / center-on-node controls** — natural once we have absolute coords.

## Deferred to Phase 3

- **PNG / PDF export** — render-to-canvas + `toBlob()`.
- **Minimap** — second mini view of the chart with a viewport rectangle.
- **Virtualization for >1k nodes** — layout-aware culling.

## Out of scope (permanent)

- **Drag-to-reparent / inline rename / DAG editing** — that's a diagram editor product. Different scope.
- **Multiple-parent / DAG** — hierarchies are trees by definition. Type signature enforces this (`children?: readonly HierarchyNode<T>[]`, single parent inferred from position in the tree).
- **Animated re-layout transitions** — when data changes, nodes snap. FLIP-style animation across re-layouts is a rabbit hole and not asked for.
- **Built-in color-coding rules** — consumers do this inside their projected template via `nodeClass` or template logic.

## Open questions worth resolving during build

1. **Toggle button placement** — PrimeNG positions it on the bottom edge of the node, half-overlapping the connector. Looks tidy. We do the same. Verify it doesn't clash with daisyUI card padding.
2. **Empty state** — render a centered "No data" message via `labels.emptyHierarchy` when `root` is empty/null. (Mirrors `<hk-table>` empty state.)
3. **`onSelect` semantics in single mode** — emit on every click (even if the same node), or only on changes? Recommend: only on changes — saves consumer guard logic. Validate during demo build.
4. **Connector color contrast** — `border-base-content/20` may be too faint in some daisyUI themes. Run AXE color-contrast check; if failing, bump to `/30`.
5. **Should the toggle button click bubble to selection?** Recommend: no — `event.stopPropagation()` on the toggle so clicking it only expands/collapses, doesn't select.

## References

- PrimeNG OrganizationChart docs (the reference we're tracking) — https://primeng.org/organizationchart
- W3C ARIA Tree pattern — https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- Syncfusion Angular Org Chart (feature taxonomy) — https://www.syncfusion.com/angular-components/angular-diagram/organizational-chart
- Syncfusion EJ2 org-chart auto-layout API — https://ej2.syncfusion.com/angular/documentation/diagram/automatic-layout/org-chart
- Existing builder pattern — `projects/hakistack/ng-daisyui/src/lib/components/table/table.helpers.ts`
- Existing theme-bridge pattern — `projects/hakistack/ng-daisyui/src/lib/components/notification/notification-item.component.ts`
- Existing label-token pattern — `projects/hakistack/ng-daisyui/src/lib/components/command-palette/command-palette.labels.ts`
- daisyUI `card` — https://daisyui.com/components/card/
- CSS `@starting-style` — https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
