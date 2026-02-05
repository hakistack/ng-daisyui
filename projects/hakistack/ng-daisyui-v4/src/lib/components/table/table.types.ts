import { IFuseOptions } from 'fuse.js';
import { SafeHtml } from '@angular/platform-browser';
import { Observable } from 'rxjs';

import { PipeFormatter } from '../../types/base-pipes.type';
import { IconName } from '../lucide-icon/lucide-icon.component'; // Common type aliases with better constraints

// Common type aliases with better constraints
export type StringKey<T> = Extract<keyof T, string>;
export type CSSProperties = Partial<CSSStyleDeclaration>;

// Table action types with better type safety
export type ActionType = 'view' | 'edit' | 'delete' | 'upload' | 'download' | 'export' | 'print' | (string & {});

// Formatter type - uses unknown for value to avoid contravariance issues with generics
export type Formatter<T> = ((value: unknown, row: T) => string | Observable<string>) | PipeFormatter;

export interface FieldConfiguration<T> {
  readonly config: FieldConfig<T>;
  readonly columns: ColumnDefinition<T>[];
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
  clearSelectionText?: string;
  selectionHintText?: string;
  actions?: TableAction<T>[];
  bulkActions?: TableBulkAction<T>[];
  filters?: ColumnFilter<T>[]; // Column-specific filters
  enableFiltering?: boolean; // Global filter enable/disable
  globalSearch?: GlobalSearchConfig<T>; // Global search configuration
  columnVisibility?: ColumnVisibilityConfig; // Column visibility toggle configuration
}

// Enhanced column definition with better type safety
export interface ColumnDefinition<T> {
  field: StringKey<T>;
  header: string;
  format?: (value: unknown, row: T) => string | Observable<string>;
  fallback?: string;
  filter?: ColumnFilter<T>; // Filter configuration for this column
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

// Table configuration that combines all options
export interface TableConfig<T> {
  fields: FieldConfig<T>;
  pagination?: PaginationOptions;
  sorting?: SortConfig<T>[];
  filtering?: FilterConfig<T>[];
  loading?: boolean;
  selectable?: boolean;
  expandable?: boolean;
}

export interface CellDisplay {
  value: string;
  isHtml: boolean;
  safeHtml: SafeHtml | null;
}
