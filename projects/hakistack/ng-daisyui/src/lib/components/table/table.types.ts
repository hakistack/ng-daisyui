import { IFuseOptions } from 'fuse.js';
import { SafeHtml } from '@angular/platform-browser';
import { Observable } from 'rxjs';

import { PipeFormatter } from '../../types/base-pipes.type';
import { IconName } from '../lucide-icon/lucide-icon.component';
import { AggregateFunction } from './table-aggregates';

// Common type aliases with better constraints
export type StringKey<T> = Extract<keyof T, string>;
export type CSSProperties = Partial<CSSStyleDeclaration>;

// Table action types with better type safety
export type ActionType = 'view' | 'edit' | 'delete' | 'upload' | 'download' | 'print' | (string & {});

// Formatter type - uses unknown for value to avoid contravariance issues with generics
export type Formatter<T> = ((value: unknown, row: T) => string | Observable<string>) | PipeFormatter;

export interface FieldConfiguration<T> {
  readonly config: FieldConfig<T>;
  readonly columns: ColumnDefinition<T>[];
  readonly resolvedFooterRows?: ResolvedFooterRow<T>[];
  readonly resolvedGroupAggregates?: ResolvedGroupAggregates<T>;
  readonly childGrid?: ChildGridConfig<T>;
  readonly masterDetail?: MasterDetailConfig<T>;
}

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
  icon?: IconName;
  tooltip?: string | ((row: T) => string);
  buttonClass?: string;
  buttonClasses?: string[];
  buttonStyle?: CSSProperties;
}

// Dropdown option for bulk actions
export interface BulkActionDropdownOption {
  label: string;
  value: string;
  icon?: IconName;
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
  icon?: IconName;
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
}

// Improved field configuration with better type constraints
export interface FieldConfig<T> {
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
}

// Enhanced column definition with better type safety
export interface ColumnDefinition<T> {
  field: StringKey<T>;
  header: string;
  format?: (value: unknown, row: T) => string | Observable<string>;
  fallback?: string;
  filter?: ColumnFilter<T>; // Filter configuration for this column

  // Sticky columns
  /** Pin column to start or end of table during horizontal scroll */
  sticky?: 'start' | 'end';

  // Column resizing
  /** Whether this column can be resized. Default: true when resizing enabled */
  resizable?: boolean;
  /** Minimum column width in px */
  minWidth?: number;
  /** Maximum column width in px */
  maxWidth?: number;

  // Inline editing
  /** Whether this column supports inline editing */
  editable?: boolean;
  /** Editor type for this column */
  editType?: 'text' | 'number' | 'select' | 'date' | 'toggle';
  /** Options for select editor */
  editOptions?: { label: string; value: unknown }[];
  /** Validation function — return true for valid, string for error message */
  editValidator?: (value: unknown, row: T) => boolean | string;

  // Summary footer
  /** Footer aggregate function for this column */
  footer?: (data: readonly T[]) => string | number;

  // Column reordering
  /** Whether this column can be reordered. Default: true when reorder enabled */
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
}

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
