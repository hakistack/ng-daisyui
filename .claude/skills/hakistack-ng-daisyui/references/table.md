# Data Table (`hk-table`)

`createTable<T>(config)` returns a `FieldConfiguration<T>` that is BOTH the config (bind to `[config]`) and an imperative controller. Built on Angular CDK + DaisyUI.

```typescript
function createTable<T extends object>(config: FieldConfig<T>): FieldConfiguration<T>
```

> Note (project memory): the table renders **three parallel layouts** (virtual-scroll, grouped/tree, CDK column-def) — markup changes must be applied to all three. New `FieldConfig` props must also be whitelisted in `createFieldConfig` in `table.helpers.ts`. `createTable()` calls `inject()` — wrap with `runInInjectionContext` if calling from a `computed()`/`effect()`.

## FieldConfig<T> — main options

```typescript
interface FieldConfig<T> {
  visible: StringKey<T>[];                 // columns to show (required)
  hidden?: StringKey<T>[];
  headers?: Partial<Record<StringKey<T>, string>>;
  formatters?: Partial<Record<StringKey<T>, Formatter<T>>>;

  // selection
  hasSelection?: boolean;
  selectionLimit?: number;                 // 1 = radio
  isRowSelectable?: (row: T) => boolean;
  selectableRows?: boolean | 'single' | 'multi';   // click-to-highlight
  selectedRowClass?: string;               // default 'bg-primary/10'
  rowClass?: (row: T) => Record<string, boolean>;

  // row actions
  hasActions?: boolean;
  actions?: TableAction<T>[];
  actionsPosition?: 'start' | 'end';       // default 'end'
  startActionsLabel?: string; endActionsLabel?: string; actionsLabel?: string;

  bulkActions?: TableBulkAction<T>[];

  // filtering / search / visibility
  enableFiltering?: boolean;
  filters?: ColumnFilter<T>[];
  globalSearch?: GlobalSearchConfig<T>;
  columnVisibility?: ColumnVisibilityConfig;

  pagination?: PaginationOptions;

  // footer
  showFooter?: boolean;
  footers?: Partial<Record<StringKey<T>, AggregateFunction | FooterConfig<T>>>;
  footerRows?: FooterRowDef<T>[];

  // columns UI
  stickyColumns?: { stickySelection?: boolean; stickyActions?: boolean };  // both default true
  enableColumnResizing?: boolean; columnWidths?: Partial<Record<StringKey<T>, number>>; resizeMode?: 'fit' | 'expand';
  virtualScroll?: VirtualScrollConfig;
  enableInlineEditing?: boolean; cellEditors?: Partial<Record<StringKey<T>, CellEditorConfig>>;
  expandableDetail?: boolean; expandMode?: 'single' | 'multi';
  treeTable?: TreeTableConfig<T>;
  grouping?: GroupConfig<T>;
  childGrid?: ChildGridConfig<T>;
  masterDetail?: MasterDetailConfig<T>;
  enableKeyboardNavigation?: boolean; enableColumnReorder?: boolean; enableRowReorder?: boolean; showDragHandle?: boolean;
  labels?: TableLabels;
  id?: string;
}
```

## Controller (FieldConfiguration<T>) methods

Filtering: `applyColumnFilter(field, value, operator)`, `removeFilter(field)`, `clearAllFilters()`.
Pagination: `firstPage()`, `previousPage()`, `nextPage()`, `lastPage()`, `gotoPage(n)`, `setPagination(opts)`.
Sorting: `sort(field)` (cycles asc→desc→none).
Selection/search: `clearSelection()`, `clearGlobalSearch()`.
Visibility: `toggleColumnVisibility(field)`, `showAllColumns()`, `hideAllColumns()`, `resetColumnVisibility()`.
Expansion/tree: `expandAllRows()`, `collapseAllRows()`, `expandToLevel(n)`, `collapseToLevel(n)`, `expandAllDetails()`, `collapseAllDetails()`.
Plus `.config`, `.columns`, `.get(id)`.

## TableComponent inputs / outputs

Inputs: `data` (`readonly T[] | null`), `config`, `loading`, `disabled`, `error`, `emptyMessage`, `showFirstLastButtons`, `hidePageSize`, `showPageSizeOptions`.

Outputs: `selectionChange(readonly T[])`, `activeRowChange`, `activeRowsChange`, `sortChange({field, direction})`, `filterChange`, `globalSearchChange`, `pageChange({pageIndex, pageSize})`, `cursorChange({cursor, direction})`, `cellEdit`, `cellEditError`, `cellEditCancel`, `expansionChange`, `detailExpansionChange`, `masterDetailRowChange`, `columnReorder`, `rowReorder`, `rowClick(T)`, `groupExpandChange`.

## Formatters

```typescript
formatters: {
  joinDate: ['date', 'short'],                       // [pipeName, ...args] PipeFormatter
  salary:   ['currency', 'USD', 'symbol', '1.0-0'],
  status:   (value, row) => value === 'active' ? '✓ Active' : '✗',  // function (may return Observable)
}
```

## ColumnFilter / operators

`type: 'text'|'number'|'date'|'select'|'multiselect'|'boolean'|'dateRange'|'numberRange'`. Operators: `equals,notEquals,contains,notContains,startsWith,endsWith,gt,lt,gte,lte,between,in,notIn,isEmpty,isNotEmpty`. `select`/`multiselect` need `options: { label, value }[]`.

## Global search

```typescript
globalSearch: { enabled: true, mode: 'fuzzy' /* contains|startsWith|exact|fuzzy */,
  placeholder, debounceTime: 300, caseSensitive, excludeFields, customSearch, fuseOptions }
```

## Actions

```typescript
interface TableAction<T> {
  type: 'view'|'edit'|'delete'|'upload'|'download'|'print'|string;
  label: string; action: (row: T) => void;
  hidden?: (row: T) => boolean; disabled?: (row: T) => boolean;
  icon?: string | LucideIconData; tooltip?: string | ((row: T) => string);
  buttonClass?: string; position?: 'start' | 'end';
}
interface TableBulkAction<T> {
  type; label; action: (rows: T[], option?: BulkActionDropdownOption) => void;
  dropdownOptions?: BulkActionDropdownOption[]; useDefaultExportOptions?: boolean; /* CSV/Excel/PDF/JSON */
  hidden?; disabled?; icon?; tooltip?;
}
```

## Custom cell / footer templates

```html
<hk-table [data]="users()" [config]="config">
  <ng-template hkCellTemplate="email" let-row>
    <a [href]="'mailto:' + row.email" class="link link-primary">{{ row.email }}</a>
  </ng-template>
  <ng-template hkCellTemplate="status" let-row let-column="column">
    <span class="badge" [class.badge-success]="row.status === 'active'">{{ row.status }}</span>
  </ng-template>

  <ng-template hkFooter let-data let-columns="columns">
    <div class="p-4">Total Rows: {{ data.length }}</div>
  </ng-template>
</hk-table>
```
`hkCellTemplate="<field>"` context: `let-row`, `let-column="column"`. `hkFooter` context: `let-data` (page rows), `let-columns="columns"`. Import `HkCellTemplateDirective` / `HkFooterDirective`.

## Pagination

```typescript
interface PaginationOptions {
  mode: 'cursor' | 'offset';
  serverSide?: boolean;          // true = data is just the current page
  pageSize: number; pageSizeOptions?: number[];
  totalItems?: number;           // offset mode (set via setPagination server-side)
  nextCursor?: string | null; prevCursor?: string | null;  // cursor mode
  showQuickJumper?: boolean; showSizeChanger?: boolean; showTotal?: boolean | ((t,[a,b]) => string);
  navStyle?: 'compact' | 'numbered';
}
// cursor: listen (cursorChange), fetch, then config.setPagination({ nextCursor, prevCursor })
// offset server-side: listen (pageChange), fetch, then config.setPagination({ totalItems })
```

## Tree table

```typescript
treeTable: {
  enabled: true,
  childrenProperty?: 'children',          // default 'children'
  getRowKey?: (row) => row.id,            // falls back to row.id/row.key
  initialExpandedKeys?, expandAll?, initialExpandLevel?,
  indentSize?: 24, showIndentGuides?: true, treeColumnIndex?: 0,
  filterHierarchyMode?: 'ancestors'|'descendants'|'both'|'none',
  checkboxCascade?: 'none'|'downward'|'upward'|'both',
}
```

## Master-detail & child grid (build detail with its own createTable)

```typescript
const detail = createTable<OrderItem>({ visible: ['productName', 'qty', 'price'] });

createTable<Order>({
  visible: ['customerName', 'orderDate'],
  masterDetail: { config: detail, detailDataProperty: 'items',
    headerText: (o) => `Order #${o.id}`, autoSelectFirst: true },
});

createTable<Customer>({
  visible: ['name'],
  childGrid: { config: detail, childDataProperty: 'orders', expandMode: 'multi', bordered: true },
});
```

## Inline editing

```typescript
enableInlineEditing: true,
cellEditors: {
  price: { type: 'number', validator: (v) => Number(v) >= 0 ? true : 'Must be ≥ 0' },
  active: { type: 'toggle' },              // type: 'text'|'number'|'select'|'date'|'toggle'; options for select
}
// listen (cellEdit) / (cellEditError) / (cellEditCancel)
```

## Footer rows & aggregates

```typescript
showFooter: true,
footers: { salary: { fn: 'sum', label: 'Total', format: (v) => `$${v.toLocaleString()}` } },
footerRows: [{ columns: { qty: 'sum', total: { fn: 'sum', label: 'Grand Total' } } }],
// AggregateFunction: 'sum'|'avg'|'count'|'min'|'max'|'custom'
```

## Export

```typescript
exportToCsv(rows, config.columns, 'users.csv');
exportToJson(rows, config.columns, 'users.json');
```

## High-volume engine (optional, WASM)

For very large datasets there is a lazy-loaded Rust engine: `TableEngineService` / `TableHandle` and `provideTableEngineWasmUrl(...)`. See `public-api.ts` (`Engine*` types) and `RUST_ENGINE_OVERVIEW.md`.
