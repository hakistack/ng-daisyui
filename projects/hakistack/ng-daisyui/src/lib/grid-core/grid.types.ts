import { IFuseOptions } from 'fuse.js';
import { Observable } from 'rxjs';
import { AggregateFunction } from './grid-aggregates';

// Common type aliases with better constraints
export type StringKey<T> = Extract<keyof T, string>;

// Global search mode
export type GlobalSearchMode = 'contains' | 'startsWith' | 'exact' | 'fuzzy';

// Global search configuration
export interface GlobalSearchConfig<T> {
  // Enable global search feature
  enabled: boolean;

  // Search mode: contains, startsWith, exact, fuzzy
  mode?: GlobalSearchMode;

  // Placeholder text for search input
  placeholder?: string;

  // Debounce time in milliseconds (default: 300ms)
  debounceTime?: number;

  // Case sensitive search (default: false)
  // Note: Only applies to non-fuzzy modes
  caseSensitive?: boolean;

  // Show search icon
  showIcon?: boolean;

  // Show clear button
  showClearButton?: boolean;

  // Fields to exclude from search
  excludeFields?: StringKey<T>[];

  // Custom search function (optional)
  customSearch?: (row: T, searchTerm: string) => boolean;

  // Fuse.js options for fuzzy search mode
  fuseOptions?: IFuseOptions<T>;

  // Text overrides for the global-search input
  labels?: GlobalSearchLabels;
}

// Customizable text for the global-search input. Any field undefined falls back to the English default.
export interface GlobalSearchLabels {
  /** aria-label for the clear-search button. Default: "Clear search" */
  clearAriaLabel?: string;
}

// Global search change event
export interface GlobalSearchChange {
  searchTerm: string;
  mode: GlobalSearchMode;
}

// Column visibility configuration
export interface ColumnVisibilityConfig {
  // Enable column visibility toggle feature
  enabled?: boolean;

  // LocalStorage key for persisting visibility preferences
  storageKey?: string;

  // Default visible columns (if not specified, all columns are visible by default)
  defaultVisible?: string[];

  // Columns that cannot be hidden (always visible)
  alwaysVisible?: string[];

  // Text overrides for the column-visibility dropdown UI
  labels?: ColumnVisibilityLabels;
}

// Customizable text for the column-visibility dropdown. Any field left undefined
// falls back to the English default.
export interface ColumnVisibilityLabels {
  /** Trigger button label. Default: "Columns" */
  trigger?: string;
  /** "Show all" button label. Default: "Show All" */
  showAll?: string;
  /** "Hide all" button label. Default: "Hide All" */
  hideAll?: string;
  /** "Reset" button label. Default: "Reset" */
  reset?: string;
  /** aria-label for the "Show all" button. Default: "Show all columns" */
  showAllAriaLabel?: string;
  /** aria-label for the "Hide all" button. Default: "Hide optional columns" */
  hideAllAriaLabel?: string;
  /** aria-label for the "Reset" button. Default: "Reset to default columns" */
  resetAriaLabel?: string;
}

// Enhanced column definition with better type safety
/**
 * Per-column configuration for `<hk-table>`. Pass an array of these to the
 * table's `columns` input (or via `createTable({ columns: [...] })`).
 *
 * Type parameter `T` is the row type — `field` is constrained to keys of `T`,
 * giving you autocomplete and type-safe `format`/`editValidator` callbacks.
 *
 * @example Basic columns + custom formatter
 * const columns: ColumnDefinition<User>[] = [
 *   { field: 'name', header: 'Name' },
 *   { field: 'email', header: 'Email', fallback: '—' },
 *   {
 *     field: 'createdAt',
 *     header: 'Joined',
 *     format: (value) => new Date(value as string).toLocaleDateString(),
 *   },
 * ];
 *
 * @example Inline editing + footer aggregate
 * {
 *   field: 'price',
 *   header: 'Price',
 *   editable: true,
 *   editType: 'number',
 *   editValidator: (v) => Number(v) >= 0 || 'Must be ≥ 0',
 *   footer: (rows) => `Total: ${rows.reduce((s, r) => s + r.price, 0)}`,
 * }
 *
 * @example Pinned + resizable column
 * { field: 'id', header: 'ID', sticky: 'start', minWidth: 80, maxWidth: 200 }
 */
export interface ColumnDefinition<T> {
  /** Property name on the row to render. Constrained to `keyof T`. */
  field: StringKey<T>;
  /** Column heading text. */
  header: string;
  /**
   * Custom cell formatter. Receives the raw value and the full row.
   * May return a string synchronously or an `Observable<string>` for async values.
   * If omitted, the raw value is rendered via `String(value)`.
   */
  format?: (value: unknown, row: T) => string | Observable<string>;
  /** Text to show when the cell value is `null` / `undefined` / `''`. */
  fallback?: string;
  /** Per-column filter (operator + UI). See `ColumnFilter`. */
  filter?: ColumnFilter<T>;

  // Sticky columns
  /** Pin this column to the start or end of the table during horizontal scroll. */
  sticky?: 'start' | 'end';

  // Column resizing
  /** Whether this column can be resized by dragging. Default: `true` when table-level resizing is enabled. */
  resizable?: boolean;
  /** Minimum column width in px. Enforced during resize. */
  minWidth?: number;
  /** Maximum column width in px. Enforced during resize. */
  maxWidth?: number;

  // Inline editing
  /** Enable inline editing for this column. Double-click a cell to edit. */
  editable?: boolean;
  /** Editor input type. Default: `'text'`. */
  editType?: 'text' | 'number' | 'select' | 'date' | 'toggle';
  /** Options for `editType: 'select'`. Ignored for other editor types. */
  editOptions?: { label: string; value: unknown }[];
  /**
   * Validates the proposed value. Return `true` to accept, or a string error message to reject.
   * Called on edit commit (Enter / blur). The cell stays in edit mode if rejected.
   */
  editValidator?: (value: unknown, row: T) => boolean | string;

  // Summary footer
  /**
   * Aggregate function for the column footer (sum, avg, count, etc).
   * Receives all rows currently visible after filters/search are applied.
   *
   * @example footer: (rows) => rows.reduce((s, r) => s + r.amount, 0)
   */
  footer?: (data: readonly T[]) => string | number;

  // Column reordering
  /** Whether this column can be reordered by drag-drop. Default: `true` when table-level reorder is enabled. */
  reorderable?: boolean;
}

// Enhanced pagination configuration
export interface PaginationOptions {
  /**
   * Navigation style.
   *
   * - `'offset'` — numbered pages with a known `totalItems`. Renders page
   *   buttons, "page X of Y", optional quick-jumper.
   * - `'cursor'` — prev/next only, driven by opaque `nextCursor` /
   *   `prevCursor` tokens. No numbered pages.
   */
  mode: 'cursor' | 'offset';
  /**
   * Whether the consumer is paginating data server-side. Controls how the
   * table treats the `data` input:
   *
   * - `false` (default) — table holds the full dataset and slices it
   *   client-side: `data.slice(pageIndex * pageSize, ...)`.
   * - `true` — `data` is *just the current page*. Table renders it
   *   verbatim. The consumer wires `(pageChange)` to a fetch and pushes
   *   server metadata via `controller.setPagination({ totalItems, ... })`.
   *
   * `mode: 'cursor'` ignores this flag (cursor mode is inherently
   * server-side — there's no full dataset to slice in the first place).
   *
   * **Known limitations in server-side mode:**
   * - Selection is page-local. Rows selected on page 1 are pruned when
   *   the consumer swaps `data` for page 2 (the page-1 rows are no longer
   *   in `data`). Cross-page persistence needs a different selection
   *   strategy and is not implemented yet.
   * - Footer aggregates (`column.footer` / `footerRows`) compute against
   *   the *current page* only. For grand totals, compute server-side and
   *   render via a custom footer template.
   *
   * **Required wiring for offset + server-side:**
   * - Pass only the current page as `[data]`.
   * - Listen to `(pageChange)` and fetch the next page.
   * - Call `controller.setPagination({ totalItems })` so numbered pages
   *   render correctly (without `totalItems`, totals fall back to
   *   `data.length`, which only knows about the current page).
   */
  serverSide?: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems?: number;
  showQuickJumper?: boolean;
  showSizeChanger?: boolean;
  showTotal?: boolean | ((total: number, range: [number, number]) => string);
  /**
   * Navigation control style for offset mode. Default: `'compact'`.
   *
   * - `'compact'` — one `Page X of Y` indicator between prev/next. Constant
   *   width regardless of total pages. Best default for most tables.
   * - `'numbered'` — numbered page buttons (`1 2 3 ... 22 23 24 ...`). Useful
   *   only when total page count is small (~10) and the consumer wants
   *   direct multi-page jumps.
   *
   * No effect in cursor mode (which only has prev/next).
   */
  navStyle?: 'compact' | 'numbered';
  /** Text overrides for the pagination footer */
  labels?: PaginationLabels;
}

/**
 * Customizable text for the pagination footer. Any field undefined falls back to
 * the English default. Function-valued labels receive context so the string can
 * interpolate page/size info naturally.
 */
export interface PaginationLabels {
  /** "Items per page" label. Default: "Items per page:" */
  itemsPerPage?: string;
  /** Text shown when pagination is in cursor mode. Default: "Cursor-based pagination" */
  cursorModeText?: string;
  /** Quick-jumper "Go to" prefix. Default: "Go to" */
  goTo?: string;
  /** Quick-jumper submit button. Default: "Go" */
  go?: string;
  /** Previous button text (cursor mode). Default: "Previous" */
  previous?: string;
  /** Next button text (cursor mode). Default: "Next" */
  next?: string;
  /** aria-label for the overall nav. Default: "Table pagination navigation" */
  navigationAriaLabel?: string;
  /** aria-label for the page-button group. Default: "Page navigation" */
  pageNavigationAriaLabel?: string;
  /** aria-label for the cursor-button group. Default: "Cursor navigation" */
  cursorNavigationAriaLabel?: string;
  /** First-page button aria + tooltip. */
  firstPageAriaLabel?: string;
  firstPageTitle?: string;
  /** Previous-page button aria + tooltip. */
  previousPageAriaLabel?: string;
  previousPageTitle?: string;
  /** Next-page button aria + tooltip. */
  nextPageAriaLabel?: string;
  nextPageTitle?: string;
  /** Last-page button aria + tooltip. */
  lastPageAriaLabel?: string;
  lastPageTitle?: string;
  /** Page-size select aria-label. Default: "Select number of items per page, currently {size}" */
  pageSizeSelectAriaLabel?: (currentSize: number) => string;
  /** Current-page button aria-label. Default: "Current page, page {page}" */
  currentPageAriaLabel?: (page: number) => string;
  /** Numbered-page button aria-label. Default: "Go to page {page}" */
  goToPageAriaLabel?: (page: number) => string;
  /** Quick-jumper input aria-label. Default: "Enter page number between 1 and {total}" */
  quickJumperInputAriaLabel?: (totalPages: number) => string;
  /** Quick-jumper submit aria-label. Default: "Go to entered page" */
  quickJumperSubmitAriaLabel?: string;
  /** Empty-results total. Default: "0 of 0" */
  emptyTotal?: string;
  /** "Page X of Y" text shown alongside the row-count display when more than 1 page exists. Default: (cur, total) => `Page ${cur} of ${total}` */
  pageOfTotal?: (current: number, total: number) => string;
}

export interface CursorPageChange {
  cursor: string;
  direction: 'next' | 'prev';
}

export interface PageSizeChange {
  pageIndex: number;
  pageSize: number;
}

export interface SortChange {
  field: string;
  direction: 'Ascending' | 'Descending' | '';
}

// Additional utility types that might be useful
export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  field: StringKey<T>;
  direction: SortDirection;
}

// Filter operator types
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

// Filter type for column configuration
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'dateRange' | 'numberRange';

// Active filter configuration
export interface FilterConfig<T> {
  field: StringKey<T>;
  value: unknown;
  operator: FilterOperator;
  type?: FilterType;
}

// Column filter definition for configuration
export interface ColumnFilter<T> {
  type: FilterType;
  field: StringKey<T>;
  operators?: FilterOperator[]; // Available operators for this filter
  options?: FilterOption[]; // For select/multiselect
  placeholder?: string;
  defaultOperator?: FilterOperator;
  /** Per-column text overrides for the filter dropdown (falls back to table-wide filter labels). */
  labels?: FilterLabels;
}

/**
 * Customizable text for the filter dropdown. Per-column overrides win over the
 * table-level filter labels (on `FieldConfig.filterLabels`). Any field undefined
 * falls back to the English default.
 */
export interface FilterLabels {
  /** Title template receiving the column header. Default: row => `Filter ${row}` */
  title?: (columnHeader: string) => string;
  /** aria-label for the close button. Default: "Close filter" */
  closeAriaLabel?: string;
  /** Text input placeholder. Default: "Enter value..." */
  textPlaceholder?: string;
  /** Number input placeholder. Default: "Enter number..." */
  numberPlaceholder?: string;
  /** Select placeholder. Default: "-- Select --" */
  selectPlaceholder?: string;
  /** Multi-select placeholder. Default: "Select values..." */
  multiSelectPlaceholder?: string;
  /** Single date placeholder. Default: "Select date" */
  datePlaceholder?: string;
  /** Date range placeholder. Default: "Select date range" */
  dateRangePlaceholder?: string;
  /** Range-min placeholder. Default: "Min" */
  rangeMinPlaceholder?: string;
  /** Range-max placeholder. Default: "Max" */
  rangeMaxPlaceholder?: string;
  /** Range separator. Default: "to" */
  rangeSeparator?: string;
  /** Apply button. Default: "Apply" */
  apply?: string;
  /** Clear button. Default: "Clear" */
  clear?: string;
  /** Boolean "true" option label. Default: "Yes" */
  booleanTrue?: string;
  /** Boolean "false" option label. Default: "No" */
  booleanFalse?: string;
  /** Operator label overrides. Undefined keys keep the English default. */
  operators?: FilterOperatorLabels;
}

/** Map of operator → label. All keys optional. */
export type FilterOperatorLabels = Partial<Record<FilterOperator, string>>;

// Filter option for select/multiselect
export interface FilterOption {
  label: string;
  value: unknown;
}

// Filter change event
export interface FilterChange<T = unknown> {
  field: string;
  value: unknown;
  operator: FilterOperator;
  filters: FilterConfig<T>[]; // All active filters
}

// Tree table configuration
export interface TreeTableConfig<T> {
  /** Enable tree table mode */
  enabled: boolean;

  /** Property name containing child items. Default: 'children' */
  childrenProperty?: string;

  /** Row keys to expand on initial render */
  initialExpandedKeys?: string[];

  /** Expand all rows on initial render. Default: false */
  expandAll?: boolean;

  /** Custom function to get unique row key for tracking expanded state */
  getRowKey?: (row: T) => string;

  /** Indentation size in pixels per level. Default: 24 */
  indentSize?: number;

  /** Index into visible[] that renders the tree toggle. Default: 0 */
  treeColumnIndex?: number;

  /** Show visual indent guide lines. Default: true */
  showIndentGuides?: boolean;

  /** How filters interact with tree hierarchy. Default: 'ancestors' */
  filterHierarchyMode?: 'ancestors' | 'descendants' | 'both' | 'none';

  /** Expand all nodes up to this depth on init. 1 = roots expanded. */
  initialExpandLevel?: number;

  /** Checkbox cascade behavior. Default: 'none' */
  checkboxCascade?: 'none' | 'downward' | 'upward' | 'both';
}

// Internal type for flattened tree rows
export interface FlattenedRow<T> {
  /** Original row data */
  data: T;

  /** Nesting level (0 = root) */
  level: number;

  /** Whether this row has children */
  hasChildren: boolean;

  /** Unique key for this row */
  key: string;

  /** Parent row key (null for root items) */
  parentKey: string | null;

  /** Whether this is the last child of its parent */
  isLastChild: boolean;

  /** Per-ancestor-level: true if that ancestor is the last child (no continuing vertical line) */
  ancestorLastFlags: boolean[];
}

// Column resize event
export interface ColumnResizeEvent {
  field: string;
  width: number;
  previousWidth: number;
}

// Column reorder event
export interface ColumnReorderEvent {
  previousIndex: number;
  currentIndex: number;
  columns: string[];
}

// Row grouping configuration
export interface GroupConfig<T> {
  /** Field(s) to group rows by. Pass an array for nested multi-level grouping
   *  (e.g. `['country', 'state']` produces a country → state hierarchy). */
  groupBy: StringKey<T> | readonly StringKey<T>[];
  /** Aggregate functions per column to display in group footer */
  aggregates?: Partial<Record<StringKey<T>, AggregateFunction>>;
  /** Whether groups are initially expanded. Default: true */
  initiallyExpanded?: boolean;
  /** Show aggregate footer row per group */
  showGroupFooter?: boolean;
  /** Custom label for group header. Called per node in multi-level grouping. */
  groupHeaderLabel?: (groupValue: unknown, rows: T[]) => string;
  /** Custom sort function for group ordering. Applied at every level. */
  groupSortFn?: (a: unknown, b: unknown) => number;
  /** Caption aggregates shown inline in the group header row */
  captionAggregates?: FooterRowDef<T>;
  /** Multi-row footer per group. Column-aligned cells.
   *  Takes precedence over legacy `aggregates + showGroupFooter`. */
  groupFooterRows?: FooterRowDef<T>[];
}

/**
 * One node in a (possibly nested) group tree.
 *
 * For single-level grouping: `path = [groupValue]`, `depth = 0`,
 * `children = []`. For multi-level: `path` is the chain of keys from the root
 * to this node, and `children` holds sub-groups one level deeper. `rows`
 * always represents the union of every descendant row, so per-level footer
 * aggregates work uniformly at any depth.
 */
export interface RowGroup<T> {
  /** This node's key value at its level. Equals the last element of `path`. */
  groupValue: unknown;
  /** Human-readable label rendered in the group-header row. */
  groupLabel: string;
  /** Chain of keys from root to this node. `[groupValue]` for top-level. */
  path: readonly unknown[];
  /** Depth in the tree. 0 = top-level. */
  depth: number;
  /** Union of every descendant row, in source order. */
  rows: T[];
  /** Sub-groups one level deeper. Empty for leaf nodes. */
  children: RowGroup<T>[];
  aggregates: Record<string, number>;
  expanded: boolean;
  resolvedCaptionCells?: Partial<Record<StringKey<T>, (data: readonly T[]) => string>>;
  resolvedGroupFooterRows?: ResolvedFooterRow<T>[];
}

// Group expand/collapse event
export interface GroupExpandEvent {
  /** The leaf-level value that was toggled (last element of `path`). */
  groupValue: unknown;
  /** Full path from root to this group. Distinguishes "US → CA" from "UK → CA". */
  path: readonly unknown[];
  expanded: boolean;
}

// ============================================================================
// Multi-Row Footer Types
// ============================================================================

/** A column-aligned footer row — maps columns to aggregates (1:1 with data columns) */
export interface ColumnAlignedFooterRowDef<T> {
  columns: Partial<Record<StringKey<T>, AggregateFunction | FooterCellDef<T>>>;
  class?: string;
}

/** A colspan-based footer row — cells span across multiple columns freely */
export interface ColspanFooterRowDef<T> {
  cells: FooterColspanCellDef<T>[];
  class?: string;
}

/** A single footer row definition — either column-aligned or colspan-based */
export type FooterRowDef<T> = ColumnAlignedFooterRowDef<T> | ColspanFooterRowDef<T>;

/** Full footer cell definition with formatting and custom overrides */
export interface FooterCellDef<T = unknown> {
  fn: AggregateFunction;
  /** Label prefix (e.g. "Total", "Average"). Defaults to AGGREGATE_LABELS[fn]. Set to '' to hide. */
  label?: string;
  /** Aggregate a different field than the column */
  field?: StringKey<T>;
  /** Format the computed value (e.g. currency formatting) */
  format?: (value: number) => string;
  /** Per-cell CSS class */
  class?: string;
  /** Full override — ignores fn, computes value from raw data */
  custom?: (data: readonly T[]) => string | number;
}

/** A cell in a colspan-based footer row */
export interface FooterColspanCellDef<T = unknown> {
  /** Number of data columns this cell spans. Defaults to 1. */
  colspan?: number;
  /** Aggregate function to apply. Omit for an empty spacer cell. */
  fn?: AggregateFunction;
  /** Label prefix (e.g. "Total"). Defaults to AGGREGATE_LABELS[fn]. Set to '' to hide. */
  label?: string;
  /** Which field to aggregate (defaults to first visible field if fn is set) */
  field?: StringKey<T>;
  /** Format the computed value (e.g. currency formatting) */
  format?: (value: number) => string;
  /** Per-cell CSS class */
  class?: string;
  /** Full override — ignores fn, computes value from raw data */
  custom?: (data: readonly T[]) => string | number;
}

/** Internal: a resolved colspan cell with a pre-built value function */
export interface ResolvedColspanCell {
  colspan: number;
  valueFn: (data: readonly unknown[]) => string;
  class?: string;
}

/** Internal: pre-built footer row with value functions per column */
export interface ResolvedFooterRow<T> {
  cells: Partial<Record<StringKey<T>, (data: readonly T[]) => string>>;
  class?: string;
  /** When present, this row uses colspan rendering instead of column-aligned */
  colspanCells?: ResolvedColspanCell[];
}

/** Pre-resolved group aggregate functions (caption + group footer rows) */
export interface ResolvedGroupAggregates<T> {
  resolvedCaptionCells?: Partial<Record<StringKey<T>, (data: readonly T[]) => string>>;
  resolvedGroupFooterRows?: ResolvedFooterRow<T>[];
}
