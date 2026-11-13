import type { LucideIconData } from '@lucide/angular';
import { SafeHtml } from '@angular/platform-browser';
import { Observable } from 'rxjs';

import { PipeFormatter } from '../../types/base-pipes.type';
import { AggregateFunction } from '../../grid-core/grid-aggregates';
import type {
  ColumnDefinition,
  ColumnFilter,
  ColumnVisibilityConfig,
  FilterConfig,
  FilterLabels,
  FilterOperator,
  FooterRowDef,
  GlobalSearchConfig,
  GroupConfig,
  PaginationOptions,
  ResolvedFooterRow,
  ResolvedGroupAggregates,
  SortConfig,
  StringKey,
  TreeTableConfig,
} from '../../grid-core/grid.types';

// Common type aliases with better constraints
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
  /** Update pagination runtime state (totalItems, nextCursor, etc.). Merges on top of `config.pagination`. */
  setPagination(opts: Partial<PaginationOptions>): void;

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
  /**
   * Update pagination runtime state (totalItems, nextCursor, prevCursor, etc.).
   *
   * Use this from server-driven flows where the row count or cursor only
   * become known after a fetch resolves. The static config from `createTable
   * ({ pagination: {...} })` provides the initial values; `setPagination`
   * merges on top.
   *
   * ```ts
   * onPageLoaded(result) {
   *   this.users.set(result.rows);
   *   this.table.setPagination({ totalItems: result.total, nextCursor: result.next });
   * }
   * ```
   */
  readonly setPagination: (opts: Partial<PaginationOptions>) => void;
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
  /**
   * Maximum number of rows that can be checkbox-selected at once. When set,
   * unchecked rows become disabled once the limit is reached, and the
   * header "select all" caps additions at the remaining capacity (or is
   * disabled outright if no more rows can be added). `selectionLimit: 1`
   * gives a single-pick UX equivalent to a radio column.
   *
   * No effect when `hasSelection` is false or when undefined (default ⇒
   * unlimited).
   */
  selectionLimit?: number;
  /**
   * Per-row predicate that decides whether a row can be checkbox-selected.
   * Return `false` to disable that row's checkbox; rows are otherwise
   * selectable by default. Composes with `selectionLimit` — both must pass.
   * "Select all on page" only acts on rows where the predicate returns true.
   *
   * No effect when `hasSelection` is false.
   */
  isRowSelectable?: (row: T) => boolean;
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
  /**
   * Pagination configuration. Static fields (mode, pageSize, pageSizeOptions,
   * showQuickJumper, labels, …) live here. Server-driven runtime state
   * (totalItems, nextCursor, prevCursor) is pushed at runtime via the
   * controller's `setPagination(opts)` method.
   *
   * Omit to disable pagination entirely.
   */
  pagination?: PaginationOptions;
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
  /** Tooltip / title shown on disabled checkboxes when `selectionLimit` is reached. Default: count => `Maximum of ${count} selected` */
  selectionLimitReachedHint?: (limit: number) => string;

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
  /** Update pagination runtime state (totalItems, nextCursor, etc.). Merges on top of `config.pagination`. */
  setPagination(opts: Partial<PaginationOptions>): void;

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

// Row reorder event
export interface RowReorderEvent<T = unknown> {
  row: T;
  previousIndex: number;
  currentIndex: number;
  data: readonly T[];
}

// Shared grid types (filters, sort, pagination, grouping, tree, footers) live in grid-core;
// re-exported so `./table.types` stays the single import site for table consumers.
export * from '../../grid-core/grid.types';
