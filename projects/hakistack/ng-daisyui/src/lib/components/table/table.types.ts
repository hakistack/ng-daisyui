import { Signal } from '@angular/core';
import { IFuseOptions } from 'fuse.js';
import type { LucideIconData } from '@lucide/angular';
import { SafeHtml } from '@angular/platform-browser';
import { Observable } from 'rxjs';

import { PipeFormatter } from '../../types/base-pipes.type';
import { AggregateFunction } from './table-aggregates';

// Common type aliases with better constraints
export type StringKey<T> = Extract<keyof T, string>;
export type CSSProperties = Partial<CSSStyleDeclaration>;

// Table action types with better type safety
export type ActionType = 'view' | 'edit' | 'delete' | 'upload' | 'download' | 'print' | (string & {});

// Formatter type - uses unknown for value to avoid contravariance issues with generics
export type Formatter<T> = ((value: unknown, row: T) => string | Observable<string>) | PipeFormatter;

/**
 * Per-instance imperative surface for a single live <hk-table> component.
 *
 * Returned by `TableController<T>.instances()` / `.primary()`. `TableComponent<T>`
 * satisfies this interface structurally — you rarely construct it directly.
 *
 * Use this type when writing helpers that operate on a single live table:
 * ```ts
 * function resetTable<T extends object>(t: TableInstance<T>) {
 *   t.clearAllFilters();
 *   t.firstPage();
 * }
 * ```
 */
export interface TableInstance<T extends object> {
  // Filters
  applyColumnFilter(field: string, value: unknown, operator: FilterOperator): void;
  removeFilter(field: string): void;
  clearAllFilters(): void;
  hasFilterForColumn(field: string): boolean;
  getActiveFilterForColumn(field: string): FilterConfig<T> | undefined;

  // Pagination
  firstPage(): void;
  previousPage(): void;
  nextPage(): void;
  lastPage(): void;
  gotoPage(pageNumber: number): void;

  // Sorting
  sort(field: string): void;

  // Selection
  clearSelection(): void;
  isSelected(row: T): boolean;

  // Global search
  clearGlobalSearch(): void;

  // Column visibility
  isColumnVisible(field: string): boolean;
  toggleColumnVisibility(field: string): void;
  showAllColumns(): void;
  hideAllColumns(): void;
  resetColumnVisibility(): void;

  // Tree / master-detail expansion
  expandAllRows(): void;
  collapseAllRows(): void;
  expandToLevel(level: number): void;
  collapseToLevel(level: number): void;
  expandAllDetails(): void;
  collapseAllDetails(): void;
}

/**
 * Controller returned by `createTable()`.
 *
 * Carries the resolved configuration (for `[config]` binding) and an imperative API
 * for driving the bound `<hk-table>` from outside — no `viewChild` needed.
 *
 * ```ts
 * table = createTable<User>({ visible: ['id', 'name'], filters: [...] });
 *
 * applyFilter(value: string) {
 *   this.table.applyColumnFilter('name', value, 'contains');
 * }
 * ```
 *
 * `TableController<T>` is a semantic alias for `FieldConfiguration<T>` — both names
 * refer to the same shape.
 */
export interface FieldConfiguration<T extends object> {
  // --- Data (resolved config) ---
  readonly config: FieldConfig<T>;
  readonly columns: ColumnDefinition<T>[];
  readonly resolvedFooterRows?: ResolvedFooterRow<T>[];
  readonly resolvedGroupAggregates?: ResolvedGroupAggregates<T>;
  readonly childGrid?: ChildGridConfig<T>;
  readonly masterDetail?: MasterDetailConfig<T>;

  // --- Named instance access (optional) ---
  /** Get a table instance by its config `id`. Returns `undefined` if not found. */
  readonly get: (id: string) => TableInstance<T> | undefined;

  // --- Imperative API (forwards to the bound <hk-table>) ---
  readonly applyColumnFilter: (field: string, value: unknown, operator: FilterOperator) => void;
  readonly removeFilter: (field: string) => void;
  readonly clearAllFilters: () => void;
  readonly firstPage: () => void;
  readonly previousPage: () => void;
  readonly nextPage: () => void;
  readonly lastPage: () => void;
  readonly gotoPage: (page: number) => void;
  readonly sort: (field: string) => void;
  readonly clearSelection: () => void;
  readonly clearGlobalSearch: () => void;
  readonly toggleColumnVisibility: (field: string) => void;
  readonly showAllColumns: () => void;
  readonly hideAllColumns: () => void;
  readonly resetColumnVisibility: () => void;
  readonly expandAllRows: () => void;
  readonly collapseAllRows: () => void;
  readonly expandToLevel: (level: number) => void;
  readonly collapseToLevel: (level: number) => void;
  readonly expandAllDetails: () => void;
  readonly collapseAllDetails: () => void;
}

/** Semantic alias for `FieldConfiguration<T>` — use whichever name reads better in context. */
export type TableController<T extends object> = FieldConfiguration<T>;

// Hierarchy Grid (Child Grid) configuration
export interface ChildGridConfig<TParent = unknown> {
  /** Column configuration for the child table (from createTable) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: FieldConfiguration<any>;
  /** Property name on the parent row that holds the child array */
  childDataProperty?: string;
  /** Function to resolve child data from the parent row */
  childDataFn?: (parentRow: TParent) => readonly unknown[];
  /** Pagination options for the child table */
  pagination?: PaginationOptions;
  /** Whether only one child grid can be expanded at a time (default: 'multi') */
  expandMode?: 'single' | 'multi';
  /** Show a left border to indicate hierarchy (default: true) */
  bordered?: boolean;
  /** Additional CSS class for the child grid container */
  containerClass?: string;
}

// Master-Detail Grid configuration
export interface MasterDetailConfig<TParent = unknown> {
  /** Column configuration for the detail table (from createTable) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: FieldConfiguration<any>;
  /** Property name on the master row that holds the detail array */
  detailDataProperty?: string;
  /** Function to resolve detail data from the master row */
  detailDataFn?: (masterRow: TParent) => readonly unknown[];
  /** Pagination options for the detail table */
  pagination?: PaginationOptions;
  /** Header text for the detail section (static string or function of selected row) */
  headerText?: string | ((masterRow: TParent) => string);
  /** Auto-select the first row when data changes. Default: true */
  autoSelectFirst?: boolean;
  /** Additional CSS class for the detail container */
  containerClass?: string;
}

// Enhanced table action interface with better type safety
export interface TableAction<T> {
  type: ActionType;
  label: string;
  action: (row: T) => void;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  icon?: string | LucideIconData;
  tooltip?: string | ((row: T) => string);
  buttonClass?: string;
  buttonClasses?: string[];
  buttonStyle?: CSSProperties;
  /** Per-action column placement. Falls back to FieldConfig.actionsPosition (default: 'end'). */
  position?: 'start' | 'end';
}

// Dropdown option for bulk actions
export interface BulkActionDropdownOption {
  label: string;
  value: string;
  icon?: string | LucideIconData;
  disabled?: boolean;
}

// Common export formats
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface TableBulkAction<T> {
  type: ActionType;
  label: string;
  /** Action handler - called when button is clicked (for non-dropdown) or when dropdown option is selected */
  action: (rows: T[], option?: BulkActionDropdownOption) => void;
  hidden?: (rows: T[]) => boolean;
  disabled?: (rows: T[]) => boolean;
  icon?: string | LucideIconData;
  tooltip?: string | ((rows: T[]) => string);
  buttonClass?: string;
  buttonClasses?: string[];
  buttonStyle?: CSSProperties;
  /** Dropdown options - if provided, renders as dropdown instead of button */
  dropdownOptions?: BulkActionDropdownOption[];
  /** For 'export' type: use default export options (CSV, Excel, PDF, JSON). Set to false to disable. */
  useDefaultExportOptions?: boolean;
}

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

// Improved field configuration with better type constraints
export interface FieldConfig<T> {
  /** Optional controller ID for named instance access via `controller.get(id)` */
  id?: string;
  visible: StringKey<T>[];
  hidden?: StringKey<T>[];
  headers?: Partial<Record<StringKey<T>, string>>;
  formatters?: Partial<Record<StringKey<T>, Formatter<T>>>;
  fallbacks?: Partial<Record<StringKey<T>, string>>;
  hasSelection?: boolean;
  hasActions?: boolean;
  /** Enable click-to-select row highlighting. 'single' (or true) = one row at a time, 'multi' = toggle multiple rows */
  selectableRows?: boolean | 'single' | 'multi';
  /** CSS class applied to the active/selected row. Default: 'bg-primary/10' */
  selectedRowClass?: string;
  /** Callback to apply conditional CSS classes per row */
  rowClass?: (row: T) => Record<string, boolean>;
  clearSelectionText?: string;
  selectionHintText?: string;
  actions?: TableAction<T>[];
  /** Placement of the actions column. Default: 'end' */
  actionsPosition?: 'start' | 'end';
  /** Header label for the actions column(s). Default: 'Actions'. Overridden by startActionsLabel / endActionsLabel. */
  actionsLabel?: string;
  /** Header label for the start-side actions column (when any action has position: 'start'). */
  startActionsLabel?: string;
  /** Header label for the end-side actions column (default actions column). */
  endActionsLabel?: string;
  bulkActions?: TableBulkAction<T>[];
  filters?: ColumnFilter<T>[]; // Column-specific filters
  enableFiltering?: boolean; // Global filter enable/disable
  globalSearch?: GlobalSearchConfig<T>; // Global search configuration
  columnVisibility?: ColumnVisibilityConfig; // Column visibility toggle configuration
  treeTable?: TreeTableConfig<T>; // Tree table configuration

  // Sticky columns
  /** Sticky columns configuration */
  stickyColumns?: {
    /** Auto-stick selection checkbox column. Default: true when hasSelection */
    stickySelection?: boolean;
    /** Auto-stick actions column. Default: true when hasActions */
    stickyActions?: boolean;
  };

  // Column resizing
  /** Enable column resizing */
  enableColumnResizing?: boolean;
  /** Column widths (can be set programmatically or via resize) */
  columnWidths?: Partial<Record<StringKey<T>, number>>;
  /** Resize mode: 'fit' adjusts neighbor, 'expand' changes table width */
  resizeMode?: 'fit' | 'expand';

  // Virtual scrolling
  /** Virtual scrolling configuration for large datasets */
  virtualScroll?: VirtualScrollConfig;

  // Inline editing
  /** Enable inline cell editing */
  enableInlineEditing?: boolean;
  /** Cell editors config per field (alternative to ColumnDefinition) */
  cellEditors?: Partial<Record<StringKey<T>, CellEditorConfig>>;

  // Summary footer row
  /** Show footer row with aggregate values */
  showFooter?: boolean;
  /** Footer aggregate per column. Shorthand: `'sum'` or full: `{ fn: 'sum', label: 'Total' }` */
  footers?: Partial<Record<StringKey<T>, AggregateFunction | FooterConfig<T>>>;
  /** Multi-row footer configuration — each entry defines one footer row with per-column aggregates */
  footerRows?: FooterRowDef<T>[];

  // Expandable row detail
  /** Enable expandable detail rows (requires #rowDetail template) */
  expandableDetail?: boolean;
  /** Expand mode: 'single' allows one expanded row, 'multi' allows many. Default: 'multi' */
  expandMode?: 'single' | 'multi';

  // Keyboard navigation
  /** Enable keyboard navigation (arrow keys, Enter, Space, Escape) */
  enableKeyboardNavigation?: boolean;

  // Column reordering
  /** Enable column reordering via drag and drop */
  enableColumnReorder?: boolean;

  // Row reordering
  /** Enable row reordering via drag and drop */
  enableRowReorder?: boolean;
  /** Show a drag handle column for row reordering */
  showDragHandle?: boolean;

  // Row grouping
  /** Row grouping configuration */
  grouping?: GroupConfig<T>;

  // Hierarchy Grid (Child Grid)
  /** Child grid configuration for nested table rendering */
  childGrid?: ChildGridConfig<T>;

  // Master-Detail Grid
  /** Master-detail grid configuration for stacked master/detail tables */
  masterDetail?: MasterDetailConfig<T>;

  /** Table-wide text overrides (loading/empty/selection/filter-bar/ARIA). */
  labels?: TableLabels;
  /** Default filter dropdown text used for every column that doesn't override in its own `ColumnFilter.labels`. */
  filterLabels?: FilterLabels;
}

/**
 * Customizable text for the main table UI surfaces (excluding the dedicated
 * sub-component configs like pagination/column-visibility/global-search). Any
 * field undefined falls back to the English default.
 */
export interface TableLabels {
  /** Loading state message. Default: "Loading data..." */
  loading?: string;

  // Selection bar
  /** Selection count suffix for 1 item. Default: "item selected" */
  itemSelected?: string;
  /** Selection count suffix for N items. Default: "items selected" */
  itemsSelected?: string;

  // Active-filters bar
  /** Label shown with the active-filters count. Default: "Active Filters" */
  activeFilters?: string;
  /** "Clear all filters" button text. Default: "Clear All" */
  clearAllFilters?: string;
  /** aria-label for the "Clear all filters" button. Default: "Clear all filters" */
  clearAllFiltersAriaLabel?: string;
  /** aria-label for the per-filter remove button. Default: row => `Remove filter for ${row}` */
  removeFilterAriaLabel?: (field: string) => string;
  /** aria-label for the filter-open button in column headers. Default: col => `Filter ${col}` */
  filterButtonAriaLabel?: (columnHeader: string) => string;

  // Row-level a11y
  /** aria-label for "select row" checkboxes. Default: "Select row" */
  selectRowAriaLabel?: string;
  /** aria-label for "deselect row" checkboxes. Default: "Deselect row" */
  deselectRowAriaLabel?: string;
  /** aria-label for "select all" header checkbox. Default: "Select all rows on this page" */
  selectAllAriaLabel?: string;
  /** aria-label for "deselect all" header checkbox. Default: "Deselect all rows on this page" */
  deselectAllAriaLabel?: string;
  /** aria-label for the "clear selection" button. Default: "Clear selection" */
  clearSelectionAriaLabel?: string;

  // Expand/collapse
  /** aria-label for "expand row" tree toggle. Default: "Expand row" */
  expandRowAriaLabel?: string;
  /** aria-label for "collapse row" tree toggle. Default: "Collapse row" */
  collapseRowAriaLabel?: string;
  /** aria-label for "expand details" button. Default: "Expand details" */
  expandDetailsAriaLabel?: string;
  /** aria-label for "collapse details" button. Default: "Collapse details" */
  collapseDetailsAriaLabel?: string;
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
  mode: 'cursor' | 'offset';
  nextCursor?: string | null;
  prevCursor?: string | null;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems?: number;
  showQuickJumper?: boolean;
  showSizeChanger?: boolean;
  showTotal?: boolean | ((total: number, range: [number, number]) => string);
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

/**
 * Public imperative API exposed by TableComponent<T>.
 *
 * Consumers who need to drive the table programmatically (e.g. from a custom
 * filter bar above the table) can type their template ref against this
 * interface instead of importing the full TableComponent class:
 *
 * ```ts
 * onSearch(value: string, table: HkTableApi<User>) {
 *   value
 *     ? table.applyColumnFilter('name', value, 'contains')
 *     : table.removeFilter('name');
 * }
 * ```
 */
export interface HkTableApi<T extends object> {
  // Filters
  applyColumnFilter(field: string, value: unknown, operator: FilterOperator): void;
  removeFilter(field: string): void;
  clearAllFilters(): void;
  hasFilterForColumn(field: string): boolean;
  getActiveFilterForColumn(field: string): FilterConfig<T> | undefined;

  // Pagination
  firstPage(): void;
  previousPage(): void;
  nextPage(): void;
  lastPage(): void;
  gotoPage(pageNumber: number): void;

  // Sorting
  sort(field: string): void;

  // Selection
  clearSelection(): void;
  isSelected(row: T): boolean;

  // Global search
  clearGlobalSearch(): void;

  // Column visibility
  isColumnVisible(field: string): boolean;
  toggleColumnVisibility(field: string): void;
  showAllColumns(): void;
  hideAllColumns(): void;
  resetColumnVisibility(): void;

  // Tree / master-detail expansion
  expandAllRows(): void;
  collapseAllRows(): void;
  expandToLevel(level: number): void;
  collapseToLevel(level: number): void;
  expandAllDetails(): void;
  collapseAllDetails(): void;
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

// Table configuration that combines all options
export interface TableConfig<T> {
  fields: FieldConfig<T>;
  pagination?: PaginationOptions;
  sorting?: SortConfig<T>[];
  filtering?: FilterConfig<T>[];
  loading?: boolean;
  selectable?: boolean;
  expandable?: boolean;
  treeTable?: TreeTableConfig<T>;
}

export interface CellDisplay {
  value: string;
  isHtml: boolean;
  safeHtml: SafeHtml | null;
}

// Virtual scrolling configuration
export interface VirtualScrollConfig {
  /** Enable virtual scrolling */
  enabled: boolean;
  /** Row height in px (required for CDK virtual scroll) */
  itemHeight: number;
  /** Viewport height as CSS value (e.g., '400px', '60vh') */
  viewportHeight: string;
  /** Buffer size — number of extra items rendered above/below viewport */
  bufferSize?: number;
}

// Footer aggregate configuration per column
export interface FooterConfig<T = unknown> {
  /** Aggregate function to apply */
  fn: AggregateFunction;
  /** Custom label prefix (e.g. "Total"). Defaults to "Sum", "Avg", etc. Set to '' to hide label. */
  label?: string;
  /** Aggregate a different field than the column (e.g. show salary sum in a 'name' column) */
  field?: StringKey<T>;
}

// Cell editor configuration (field-level)
export interface CellEditorConfig {
  type: 'text' | 'number' | 'select' | 'date' | 'toggle';
  options?: { label: string; value: unknown }[];
  validator?: (value: unknown, row: unknown) => boolean | string;
}

// Column resize event
export interface ColumnResizeEvent {
  field: string;
  width: number;
  previousWidth: number;
}

// Cell edit event
export interface CellEditEvent<T = unknown> {
  row: T;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Cell edit error event
export interface CellEditErrorEvent<T = unknown> {
  row: T;
  field: string;
  value: unknown;
  error: string;
}

// Expandable row detail event
export interface RowExpandEvent<T = unknown> {
  row: T;
  expanded: boolean;
}

// Column reorder event
export interface ColumnReorderEvent {
  previousIndex: number;
  currentIndex: number;
  columns: string[];
}

// Row reorder event
export interface RowReorderEvent<T = unknown> {
  row: T;
  previousIndex: number;
  currentIndex: number;
  data: readonly T[];
}

// Row grouping configuration
export interface GroupConfig<T> {
  /** Field to group rows by */
  groupBy: StringKey<T>;
  /** Aggregate functions per column to display in group footer */
  aggregates?: Partial<Record<StringKey<T>, AggregateFunction>>;
  /** Whether groups are initially expanded. Default: true */
  initiallyExpanded?: boolean;
  /** Show aggregate footer row per group */
  showGroupFooter?: boolean;
  /** Custom label for group header */
  groupHeaderLabel?: (groupValue: unknown, rows: T[]) => string;
  /** Custom sort function for group ordering */
  groupSortFn?: (a: unknown, b: unknown) => number;
  /** Caption aggregates shown inline in the group header row */
  captionAggregates?: FooterRowDef<T>;
  /** Multi-row footer per group. Column-aligned cells.
   *  Takes precedence over legacy `aggregates + showGroupFooter`. */
  groupFooterRows?: FooterRowDef<T>[];
}

// Internal: a single row group
export interface RowGroup<T> {
  groupValue: unknown;
  groupLabel: string;
  rows: T[];
  aggregates: Record<string, number>;
  expanded: boolean;
  resolvedCaptionCells?: Partial<Record<StringKey<T>, (data: readonly T[]) => string>>;
  resolvedGroupFooterRows?: ResolvedFooterRow<T>[];
}

// Group expand/collapse event
export interface GroupExpandEvent {
  groupValue: unknown;
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
