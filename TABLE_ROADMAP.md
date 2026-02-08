# Table Component Roadmap

> `@hakistack/ng-daisyui` — TableComponent enhancement plan

---

## Phase 0 — Performance Fixes

Existing code issues that should be addressed before adding new features.

### 0.1 Make `DOMParser` static

**Impact:** Low | **Location:** `table.component.ts:101`

Currently each `TableComponent` instance creates its own `DOMParser`. Since `DOMParser` is stateless and thread-safe, it should be a static singleton shared across all instances.

```ts
// Before
private readonly htmlParser = new DOMParser();

// After
private static readonly htmlParser = new DOMParser();
```

---

### 0.2 Cache Fuse.js instance — only rebuild on data change

**Impact:** Medium | **Location:** `table.component.ts:1423`

`performFuzzySearch()` creates a new `Fuse` instance on every search keystroke (after debounce). The Fuse index rebuild is O(n) where n = row count. The instance should be cached and only rebuilt when the underlying data changes, not when the search term changes.

```ts
// Before (line 1423)
this._fuseInstance = new Fuse([...data], fuseOptions);

// After — cache by data reference
private _fuseDataRef: readonly T[] | null = null;

private performFuzzySearch(data: readonly T[], searchTerm: string, config: ...): readonly T[] {
  // Only rebuild index when data actually changes
  if (this._fuseDataRef !== data || !this._fuseInstance) {
    this._fuseInstance = new Fuse([...data], fuseOptions);
    this._fuseDataRef = data;
  }
  return this._fuseInstance.search(searchTerm).map(r => r.item);
}
```

---

### 0.3 Replace per-cell `Observable` with synchronous path

**Impact:** Medium | **Location:** `table.component.ts:1281`

`getCellDisplay()` returns an `Observable<CellDisplay>` used with the `async` pipe in the template. For every cell in every row, this creates a subscription. The vast majority of formatters return synchronous values (`of(value)`) — only custom async formatters need Observables.

**Fix:** Add a fast synchronous path that returns the value directly when the formatter is not async. Use a computed signal or a pure function that checks `isObservable(result)` and only falls back to `async` pipe when truly needed.

```ts
// Option A: Separate sync/async template paths
getCellDisplaySync(row: T, column: ColumnDefinition<T>): CellDisplay | null {
  if (!column.format) {
    const value = row[column.field];
    const displayValue = value || value === 0 ? String(value) : (column.fallback ?? '—');
    return { value: displayValue, isHtml: this.isHtml(displayValue), safeHtml: ... };
  }
  const result = column.format(value, row);
  if (isObservable(result)) return null; // Fall back to async path
  // ... sync path
}
```

---

### 0.4 Avoid synchronous `localStorage` on the main thread

**Impact:** Low | **Location:** `table.component.ts:1124-1167`

`saveColumnVisibilityToStorage()` and `loadColumnVisibilityFromStorage()` call `localStorage.setItem` / `getItem` synchronously. For small payloads this is negligible, but it can block the main thread on slow storage or large state.

**Fix:** Wrap in `queueMicrotask()` or `requestIdleCallback()` for writes. Reads can stay synchronous since they happen once on init.

```ts
private saveColumnVisibilityToStorage(): void {
  // ...build visibilityObj...
  queueMicrotask(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibilityObj));
    } catch (e) {
      console.error('Failed to save column visibility:', e);
    }
  });
}
```

---

### 0.5 Prevent extra signal writes in column visibility effect

**Impact:** Low | **Location:** `table.component.ts:1172-1191`

The column visibility initialization effect reads `columnVisibilityState()` (a signal it also writes to), which can cause it to re-run unnecessarily. The load-from-storage + set-defaults logic should use `untracked()` for the read to avoid re-triggering.

```ts
import { untracked } from '@angular/core';

effect(() => {
  const config = this.columnVisibilityConfig();
  if (config?.enabled) {
    this.loadColumnVisibilityFromStorage();

    const visibilityState = untracked(() => this.columnVisibilityState());
    if (visibilityState.size === 0 && config.defaultVisible?.length) {
      // ...set defaults...
    }
  }
});
```

---

### 0.6 Virtual scrolling (see Phase 1.3)

**Impact:** High for 10k+ rows | **Location:** Template

All rows are rendered into the DOM regardless of viewport visibility. This is the single biggest performance bottleneck for large datasets. Covered in detail in Phase 1.3 below.

---

## Phase 1 — High Value

These features have the highest impact on developer experience and close the gap with full data grid libraries.

### 1.1 Inline Cell Editing

**Priority:** High
**Complexity:** Large

Click a cell to switch it into edit mode. Supports text, number, select, date, and boolean (toggle) editors.

**Requirements:**
- `editable: boolean` flag on `ColumnDefinition<T>`
- `editType: 'text' | 'number' | 'select' | 'date' | 'toggle'` per column
- `cellEditStart` / `cellEditComplete` / `cellEditCancel` outputs
- Enter to confirm, Escape to cancel, Tab to move to next editable cell
- Validation callback: `editValidator?: (value: unknown, row: T) => boolean | string`
- Optimistic update with rollback on validation failure

**API sketch:**
```ts
const table = createTable<User>({
  columns: [
    { field: 'name', header: 'Name', editable: true, editType: 'text' },
    { field: 'role', header: 'Role', editable: true, editType: 'select', editOptions: roles },
    { field: 'active', header: 'Active', editable: true, editType: 'toggle' },
  ],
});
```

```html
<app-table
  [data]="users()"
  [config]="table"
  (cellEditComplete)="onCellEdit($event)"
/>
```

---

### 1.2 Column Resizing

**Priority:** High
**Complexity:** Medium

Drag column header borders to resize. Columns store widths and respect min/max constraints.

**Requirements:**
- Resize handle element on right edge of each `<th>`
- `resizable: boolean` on `ColumnDefinition<T>` (default: true when feature enabled)
- `minWidth` / `maxWidth` per column (px)
- `resizeMode: 'fit' | 'expand'` — fit adjusts neighbor, expand adjusts table width
- Pointer events for smooth cross-browser drag
- `columnResize` output emitting `{ field, width }`
- Optional localStorage persistence (extends existing `storageKey` pattern)

---

### 1.3 Virtual Scrolling

**Priority:** High
**Complexity:** Medium

Render only visible rows using Angular CDK `ScrollingModule` for datasets of 10,000+ rows.

**Requirements:**
- `virtualScroll: boolean` on `TableConfig`
- `virtualScrollItemHeight: number` (row height in px, required for CDK)
- `scrollViewportHeight: string` (CSS value, e.g. `'400px'`)
- Replace `@for` with `*cdkVirtualFor` when enabled
- Maintain sort, filter, selection compatibility
- Buffer size configuration for smoother scrolling

---

### 1.4 Sticky Columns

**Priority:** High
**Complexity:** Small

Pin first/last columns so they stay visible during horizontal scroll.

**Requirements:**
- `sticky: 'start' | 'end'` on `ColumnDefinition<T>`
- CSS `position: sticky` with `left: 0` / `right: 0` and `z-index`
- Selection checkbox column auto-sticky when enabled
- Actions column auto-sticky when enabled
- Box shadow on sticky edge for visual separation

---

## Phase 2 — Medium Value

Features that add significant capability for specific use cases.

### 2.1 Column Reordering (Drag)

**Priority:** Medium
**Complexity:** Medium

Drag column headers to reorder. Uses CDK DragDrop on `<th>` elements.

**Requirements:**
- `reorderable: boolean` on `TableConfig` (global toggle)
- `reorderable: boolean` on `ColumnDefinition<T>` (per-column opt-out)
- CDK `cdkDropList` horizontal on header row
- `columnReorder` output emitting new column order
- Visual drag preview with column highlight
- Optional localStorage persistence

---

### 2.2 Row Grouping

**Priority:** Medium
**Complexity:** Large

Group rows by a field value with collapsible group headers and optional subtotals.

**Requirements:**
- `groupBy: StringKey<T>` on `TableConfig`
- `groupHeader` template for custom group row rendering
- `groupFooter` template for subtotals
- Built-in aggregates: `sum`, `avg`, `count`, `min`, `max`
- Expand/collapse per group and expand/collapse all
- Sorting within groups
- Works alongside pagination (groups paginate, not individual rows)

**API sketch:**
```ts
const table = createTable<Sale>({
  columns: [...],
  groupBy: 'region',
  groupAggregates: {
    amount: 'sum',
    quantity: 'avg',
  },
});
```

---

### 2.3 Summary / Footer Row

**Priority:** Medium
**Complexity:** Small

Aggregate row at the bottom showing computed values per column.

**Requirements:**
- `footer: (data: T[]) => string | number` on `ColumnDefinition<T>`
- `showFooter: boolean` on `TableConfig`
- Built-in aggregate helpers: `sum(field)`, `avg(field)`, `count()`, `min(field)`, `max(field)`
- Footer row uses `<tfoot>` for proper semantics
- Recomputes when data/filters change (uses same computed pipeline)

**API sketch:**
```ts
{
  field: 'amount',
  header: 'Amount',
  footer: (data) => `Total: ${data.reduce((s, r) => s + r.amount, 0)}`,
}
```

---

### 2.4 Expandable Row Detail

**Priority:** Medium
**Complexity:** Medium

Click a row to expand an inline detail panel below it. Content is template-based.

**Requirements:**
- `expandable: boolean` on `TableConfig`
- `rowDetailTemplate` input accepting `TemplateRef<{ $implicit: T }>`
- Expand icon in first column (or dedicated expand column)
- `rowExpand` / `rowCollapse` outputs
- Single-expand or multi-expand mode
- Animation on expand/collapse (Motion.dev)

**API sketch:**
```html
<app-table [data]="orders()" [config]="table">
  <ng-template #rowDetail let-order>
    <div class="p-4">
      <h3>Order #{{ order.id }}</h3>
      <app-table [data]="order.items" [config]="itemsTable" />
    </div>
  </ng-template>
</app-table>
```

---

### 2.5 Keyboard Navigation

**Priority:** Medium
**Complexity:** Medium

Full grid keyboard navigation for accessibility and power users.

**Requirements:**
- Arrow keys to move between cells
- Enter to activate (edit, expand, select)
- Space to toggle selection
- Home/End for first/last column
- Ctrl+Home/End for first/last row
- Tab to cycle through interactive elements
- Focus ring on active cell
- `aria-activedescendant` pattern for screen readers

---

### 2.6 Row Reordering (Drag)

**Priority:** Medium
**Complexity:** Medium

Drag rows to reorder. Uses CDK DragDrop on `<tr>` elements.

**Requirements:**
- `rowReorder: boolean` on `TableConfig`
- Drag handle column (optional, or entire row draggable)
- `rowReorder` output emitting `{ row, previousIndex, currentIndex }`
- Visual drag preview with row ghost
- Disable during sort/filter (manual order only makes sense on unsorted data)
- Works with tree table (reorder within same parent)

---

## Phase 3 — Nice to Have

Polish and advanced features that round out the component.

### 3.1 Column Header Groups

**Priority:** Low
**Complexity:** Medium

Multi-level headers for grouped columns (e.g., "Address" spanning "Street", "City", "State").

**Requirements:**
- `columnGroups` config with parent-child relationships
- Multiple `<tr>` in `<thead>` with `colspan`
- Works with column visibility, reordering, and resizing

---

### 3.2 Built-in Export

**Priority:** Low
**Complexity:** Medium

Client-side CSV/JSON export without requiring parent component logic.

**Requirements:**
- `exportData(format: 'csv' | 'json'): void` public method
- Respects column visibility and current filters
- Custom filename: `exportFilename` config
- CSV: `Blob` + `URL.createObjectURL` + `<a>` click
- JSON: Pretty-printed Blob download
- Excel/PDF would remain event-based (requires external libs)

---

### 3.3 Conditional Row Styling

**Priority:** Low
**Complexity:** Small

Dynamic CSS classes or styles per row based on data.

**Requirements:**
- `rowClass: (row: T) => string | Record<string, boolean>` on `TableConfig`
- `rowStyle: (row: T) => Record<string, string>` on `TableConfig`
- Applied to `<tr>` via `[ngClass]` / `[ngStyle]`

**API sketch:**
```ts
const table = createTable<Invoice>({
  columns: [...],
  rowClass: (row) => ({
    'bg-error/10': row.status === 'overdue',
    'bg-success/10': row.status === 'paid',
    'opacity-50': row.archived,
  }),
});
```

---

### 3.4 Full State Persistence

**Priority:** Low
**Complexity:** Small

Extend the existing column visibility localStorage pattern to all table state.

**Requirements:**
- `stateKey: string` on `TableConfig` (enables full persistence)
- Persisted state: sort field/direction, page size, column order, column widths, active filters
- Debounced save (avoid hammering localStorage on rapid changes)
- `resetState()` public method to clear persisted state
- SSR-safe (`isPlatformBrowser` check)

---

### 3.5 Row Animation

**Priority:** Low
**Complexity:** Small

Animate rows entering/leaving when data changes.

**Requirements:**
- `animateRows: boolean` on `TableConfig`
- Uses Motion.dev (already a project dependency)
- Fade in new rows, fade out removed rows
- Slide rows when reordering
- Respect `prefers-reduced-motion`

---

## Implementation Order

Suggested order based on value/effort ratio:

```
Phase 0 — Performance Fixes (do first)
  0.1  Static DOMParser             (5 min, trivial)
  0.2  Cache Fuse.js instance       (15 min, medium impact)
  0.3  Sync cell display path       (30 min, medium impact)
  0.4  Async localStorage writes    (10 min, low impact)
  0.5  untracked() in effect        (5 min, low impact)

Phase 1-3 — New Features
  1.   Sticky columns               (small effort, high daily-use value)
  2.   Conditional row styling       (small effort, frequently needed)
  3.   Summary footer row            (small effort, common requirement)
  4.   Column resizing               (medium effort, high perceived quality)
  5.   Virtual scrolling             (medium effort, unblocks large datasets)
  6.   Expandable row detail         (medium effort, enables master-detail pattern)
  7.   Inline cell editing           (large effort, highest feature value)
  8.   Keyboard navigation           (medium effort, accessibility requirement)
  9.   Column reordering             (medium effort, power user feature)
  10.  Built-in export               (medium effort, convenience)
  11.  Row reordering                (medium effort, niche use case)
  12.  Row grouping                  (large effort, analytics use case)
  13.  Full state persistence        (small effort, polish)
  14.  Row animation                 (small effort, polish)
  15.  Column header groups          (medium effort, niche use case)
```
