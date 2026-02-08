// table.component.ts
import { CdkTableModule, DataSource } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, inject, input, OnDestroy, output, Signal, signal, TrackByFunction, untracked } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isObservable, map, Observable, of } from 'rxjs';
import Fuse, { IFuseOptions } from 'fuse.js';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { TableColumnVisibilityComponent } from './table-column-visibility.component';
import { TableFilterComponent } from './table-filter.component';
import { TableGlobalSearchComponent } from './table-global-search.component';
import { TablePaginationComponent } from './table-pagination.component';
import {
  ActionType,
  BulkActionDropdownOption,
  CellDisplay,
  ColumnDefinition,
  ColumnFilter,
  CursorPageChange,
  FieldConfiguration,
  FilterChange,
  FilterConfig,
  FilterOperator,
  FlattenedRow,
  GlobalSearchChange,
  GlobalSearchConfig,
  PageSizeChange,
  PaginationOptions,
  SortChange,
  TableAction,
  TableBulkAction,
  TreeTableConfig,
} from './table.types';
import { flattenTreeData, generateRowKey, getRowChildren, rowHasChildren } from './table.helpers';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Optimized DataSource with proper typing
class SignalDataSource<T> extends DataSource<T> {
  constructor(private readonly dataSignal: Signal<readonly T[]>) {
    super();
  }

  connect(): Observable<readonly T[]> {
    return toObservable(this.dataSignal);
  }

  disconnect(): void {
    // Cleanup if needed
  }
}

// Enhanced pagination state interface
interface PaginationState {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
  readonly totalItems: number;
  readonly showFirstLastButtons: boolean;
  readonly disabled: boolean;
}

// Types for better type safety
interface ActionItem<T> {
  readonly key: ActionType;
  readonly config: TableAction<T>;
}

interface BulkActionItem<T> {
  readonly key: ActionType;
  readonly config: TableBulkAction<T>;
}

interface SortState {
  readonly field: string;
  readonly direction: '' | 'Ascending' | 'Descending';
}

@Component({
  selector: 'app-table',
  imports: [CommonModule, CdkTableModule, LucideIconComponent, TableFilterComponent, TablePaginationComponent, TableGlobalSearchComponent, TableColumnVisibilityComponent],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent<T extends object> implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly elementRef = inject(ElementRef);

  // Handle click outside to close dropdowns
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Check if click is outside any bulk action dropdown
    const dropdownContainer = target.closest('.bulk-action-dropdown');
    if (!dropdownContainer) {
      this.openBulkActionDropdown.set(null);
    }
  }

  private static readonly htmlParser = new DOMParser();

  // Inputs as signals
  readonly data = input<readonly T[] | null>(null);
  readonly config = input<FieldConfiguration<T> | null>(null);
  readonly paginationOptions = input<PaginationOptions | null>(null);
  readonly showFirstLastButtons = input<boolean>(true);
  readonly hidePageSize = input<boolean>(false);
  readonly showPageSizeOptions = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  private readonly columns = computed(() => this.config()?.columns);
  readonly fieldConfig = computed(() => this.config()?.config);

  // Outputs
  readonly selectionChange = output<readonly T[]>();
  readonly pageChange = output<PageSizeChange>();
  readonly cursorChange = output<CursorPageChange>();
  readonly sortChange = output<SortChange>();
  readonly sortFieldChange = output<string>();
  readonly sortDirectionChange = output<'Ascending' | 'Descending' | ''>();
  readonly filterChange = output<FilterChange<T>>();
  readonly globalSearchChange = output<GlobalSearchChange>();
  readonly expansionChange = output<{ row: T; expanded: boolean }>();

  // Internal signals
  private readonly sortState = signal<SortState>({ field: '', direction: '' });
  private readonly filterState = signal<FilterConfig<T>[]>([]);
  readonly selectedSignal = signal(new Set<T>());
  readonly showAlertSignal = signal(false);
  readonly openFilterField = signal<string | null>(null); // Track which filter dropdown is open
  readonly columnVisibilityState = signal<Map<string, boolean>>(new Map()); // Track column visibility
  readonly openBulkActionDropdown = signal<string | null>(null); // Track which bulk action dropdown is open

  // Tree table signals
  readonly expandedRowKeys = signal<Set<string>>(new Set());
  private treeRowLevelMap = new Map<T, number>(); // Cache row levels for template access
  private treeRowKeyMap = new Map<T, string>(); // Cache row keys for template access
  private treeRowHasChildrenMap = new Map<T, boolean>(); // Cache hasChildren for template access

  // Global search signals
  readonly globalSearchTerm = signal<string>('');
  private readonly debouncedSearchTerm = signal<string>('');
  private searchDebounceTimeout?: ReturnType<typeof setTimeout>;

  // Fuse.js instance for fuzzy search (cached — only rebuilt when data changes)
  private _fuseInstance?: Fuse<T>;
  private _fuseDataRef: readonly T[] | null = null;
  private readonly defaultFuseConfig: IFuseOptions<T> = {
    threshold: 0.3,
    ignoreLocation: true,
    isCaseSensitive: false,
    includeScore: true,
    minMatchCharLength: 1,
    keys: [], // Will be populated dynamically with searchable fields
  };

  // Computed signal for animation class
  readonly alertAnimationClass = computed(() => (this.showAlertSignal() ? 'animate__animated animate__fadeIn' : 'animate__animated animate__fadeOut'));

  // Global search computed signals
  readonly hasGlobalSearchSignal = computed(() => this.fieldConfig()?.globalSearch?.enabled ?? false);
  readonly globalSearchModeSignal = computed(() => this.fieldConfig()?.globalSearch?.mode ?? 'contains');
  readonly globalSearchPlaceholderSignal = computed(() => this.fieldConfig()?.globalSearch?.placeholder ?? 'Search all columns...');
  readonly hasGlobalSearchTermSignal = computed(() => this.debouncedSearchTerm().length > 0);

  // Enhanced pagination state
  private readonly paginationState = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100],
    totalItems: 0,
    showFirstLastButtons: true,
    disabled: false,
  });

  // Computed signals for better performance
  readonly sortFieldSignal = computed(() => this.sortState().field);
  readonly sortDirectionSignal = computed(() => this.sortState().direction);

  // Enhanced pagination computed signals
  readonly pageIndexSignal = computed(() => this.paginationState().pageIndex);
  readonly pageSizeSignal = computed(() => this.paginationState().pageSize);
  // Note: totalItemsSignal is defined later after displayDataSignal to avoid circular dependency
  readonly pageSizeOptionsSignal = computed(() => this.paginationOptions()?.pageSizeOptions ?? [5, 10, 25, 50, 100]);
  readonly modeSignal = computed(() => this.paginationOptions()?.mode ?? 'offset');
  readonly nextCursorSignal = computed(() => this.paginationOptions()?.nextCursor ?? null);
  readonly prevCursorSignal = computed(() => this.paginationOptions()?.prevCursor ?? null);

  // Pagination calculations
  readonly totalPagesSignal = computed(() => Math.max(1, Math.ceil(this.totalItemsSignal() / this.pageSizeSignal())));
  readonly currentPageSignal = computed(() => this.pageIndexSignal() + 1); // 1-based for display
  readonly startIndexSignal = computed(() => this.pageIndexSignal() * this.pageSizeSignal() + 1);
  readonly endIndexSignal = computed(() => Math.min((this.pageIndexSignal() + 1) * this.pageSizeSignal(), this.totalItemsSignal()));

  // Navigation state for cursor pagination
  readonly hasPreviousPageSignal = computed(() => {
    if (this.modeSignal() === 'cursor') {
      return !!this.prevCursorSignal() && !this.disabled();
    }
    return this.pageIndexSignal() > 0 && !this.disabled();
  });

  readonly hasNextPageSignal = computed(() => {
    if (this.modeSignal() === 'cursor') {
      return !!this.nextCursorSignal() && !this.disabled();
    }
    return this.pageIndexSignal() < this.totalPagesSignal() - 1 && !this.disabled();
  });
  readonly isFirstPageSignal = computed(() => this.pageIndexSignal() === 0);
  readonly isLastPageSignal = computed(() => this.pageIndexSignal() === this.totalPagesSignal() - 1);

  // Visible page range for pagination buttons
  readonly visiblePagesSignal = computed(() => {
    const currentPage = this.currentPageSignal();
    const totalPages = this.totalPagesSignal();
    const maxVisiblePages = 7; // Show max 7 page buttons

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly hasSelectionSignal = computed(() => this.fieldConfig()?.hasSelection ?? false);
  readonly hasActionsSignal = computed(() => {
    const actions = this.fieldConfig()?.actions ?? [];
    return actions.length > 0;
  });

  // Tree table computed signals
  readonly treeTableConfigSignal = computed(() => this.fieldConfig()?.treeTable);
  readonly isTreeTableSignal = computed(() => this.treeTableConfigSignal()?.enabled ?? false);
  readonly treeIndentSizeSignal = computed(() => this.treeTableConfigSignal()?.indentSize ?? 24);
  private readonly childrenPropertySignal = computed(() => this.treeTableConfigSignal()?.childrenProperty ?? 'children');

  // Filter computed signals
  readonly enableFilteringSignal = computed(() => this.fieldConfig()?.enableFiltering ?? false);
  readonly activeFiltersSignal = computed(() => this.filterState());
  readonly hasActiveFiltersSignal = computed(() => this.filterState().length > 0);
  readonly activeFiltersCountSignal = computed(() => this.filterState().length);

  // Column visibility computed signals
  readonly columnVisibilityConfig = computed(() => this.fieldConfig()?.columnVisibility);
  readonly isColumnVisibilityEnabled = computed(() => this.columnVisibilityConfig()?.enabled ?? false);
  readonly alwaysVisibleColumns = computed(() => new Set(this.columnVisibilityConfig()?.alwaysVisible ?? []));

  // Get filter configuration for a specific column
  readonly columnFiltersMapSignal = computed(() => {
    const filters = this.fieldConfig()?.filters ?? [];
    const map = new Map<string, ColumnFilter<T>>();
    filters.forEach(filter => map.set(filter.field, filter));

    // Also check column definitions for inline filters
    const cols = this.columns();
    if (cols) {
      cols.forEach(col => {
        if (col.filter && !map.has(col.field)) {
          map.set(col.field, col.filter);
        }
      });
    }

    return map;
  });

  // Data processing signals
  private readonly originalDataSignal = computed(() => this.data() ?? []);

  // Filtered data signal
  // For tree tables: filters only apply to root-level items
  private readonly filteredDataSignal = computed(() => {
    const data = this.originalDataSignal();
    const filters = this.filterState();
    const mode = this.modeSignal();

    // Skip client-side filtering for cursor pagination (server handles it)
    if (mode === 'cursor' || filters.length === 0) return data;

    return data.filter(row => {
      // All filters must pass (AND logic)
      return filters.every(filter => this.applyFilter(row, filter));
    });
  });

  // Apply global search to filtered data (CLIENT-SIDE ONLY)
  // For tree tables: search only applies to root-level items
  private readonly globalSearchedDataSignal = computed(() => {
    const data = this.filteredDataSignal(); // Works after column filters
    const searchTerm = this.debouncedSearchTerm();
    const config = this.fieldConfig()?.globalSearch;
    const mode = this.modeSignal();

    // Skip client-side search for cursor/server-side pagination
    if (mode === 'cursor' || !config?.enabled || !searchTerm) return data;

    const searchMode = config.mode ?? 'contains';

    // If custom search function provided, use it
    if (config.customSearch) {
      return data.filter(row => config.customSearch!(row, searchTerm));
    }

    // FUZZY SEARCH MODE - Use Fuse.js
    if (searchMode === 'fuzzy') {
      return this.performFuzzySearch(data, searchTerm, config);
    }

    // STANDARD SEARCH MODES - Native string matching
    const caseSensitive = config.caseSensitive ?? false;
    const excludeFields = new Set(config.excludeFields ?? []);
    const searchableFields =
      this.columns()
        ?.map(col => col.field)
        .filter(f => !excludeFields.has(f)) ?? [];
    const normalizedSearch = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    return data.filter(row => {
      return searchableFields.some(field => {
        const value = row[field];
        if (value == null) return false;

        const stringValue = String(value);
        const normalizedValue = caseSensitive ? stringValue : stringValue.toLowerCase();

        switch (searchMode) {
          case 'contains':
            return normalizedValue.includes(normalizedSearch);
          case 'startsWith':
            return normalizedValue.startsWith(normalizedSearch);
          case 'exact':
            return normalizedValue === normalizedSearch;
          default:
            return false;
        }
      });
    });
  });

  // Sort root-level items
  private readonly sortedDataSignal = computed(() => {
    const data = this.globalSearchedDataSignal(); // Use global searched data
    const { field, direction } = this.sortState();

    // Skip sorting if no sort field or direction
    if (!field || !direction) return data;

    // Use spread to avoid mutating original array
    return [...data].sort((a, b) => this.compareValues((a as Record<string, unknown>)[field], (b as Record<string, unknown>)[field], direction));
  });

  // Flatten tree data after sorting (for tree tables only)
  // This creates a flat array with level/hierarchy info for display
  private readonly flattenedTreeDataSignal = computed(() => {
    const data = this.sortedDataSignal();
    const isTreeTable = this.isTreeTableSignal();

    if (!isTreeTable) {
      return null; // Not tree mode, will use sortedDataSignal directly
    }

    const treeConfig = this.treeTableConfigSignal();
    const expandedKeys = this.expandedRowKeys();
    const childrenProp = treeConfig?.childrenProperty ?? 'children';
    const customGetKey = treeConfig?.getRowKey;

    // Clear and rebuild caches
    this.treeRowLevelMap.clear();
    this.treeRowKeyMap.clear();
    this.treeRowHasChildrenMap.clear();

    const flattened = flattenTreeData(
      data,
      expandedKeys,
      (row, index) => generateRowKey(row, customGetKey, index),
      childrenProp,
    );

    // Populate caches for template access
    for (const item of flattened) {
      this.treeRowLevelMap.set(item.data, item.level);
      this.treeRowKeyMap.set(item.data, item.key);
      this.treeRowHasChildrenMap.set(item.data, item.hasChildren);
    }

    return flattened;
  });

  // Get the data for display - either flattened tree data or regular sorted data
  private readonly displayDataSignal = computed(() => {
    const flattened = this.flattenedTreeDataSignal();
    if (flattened) {
      return flattened.map(f => f.data);
    }
    return this.sortedDataSignal();
  });

  // Total items for pagination - must be defined after displayDataSignal
  readonly totalItemsSignal = computed(() => {
    const mode = this.modeSignal();
    // For server-side pagination, use totalItems from options
    if (mode === 'cursor') {
      return this.paginationOptions()?.totalItems ?? this.originalDataSignal().length;
    }
    // For client-side pagination, use display data length (includes flattened tree rows)
    return this.paginationOptions()?.totalItems ?? this.displayDataSignal().length;
  });

  private readonly currentDataSignal = computed(() => {
    const mode = this.modeSignal();
    const data = this.displayDataSignal(); // Use display data (handles tree flattening)

    if (mode === 'offset') {
      const start = this.pageIndexSignal() * this.pageSizeSignal();
      const end = start + this.pageSizeSignal();
      return data.slice(start, end);
    }

    // Cursor mode: use display data (client-side sorting on current page)
    return data;
  });

  readonly columnDefsSignal = computed(() => {
    const cols = this.columns();
    if (cols?.length) return cols;

    const data = this.originalDataSignal();
    if (data.length === 0) return [];

    return Object.keys(data[0]).map(key => ({
      field: key as Extract<keyof T, string>,
      header: this.formatHeader(key),
    }));
  });

  readonly actionListSignal = computed(() => {
    const actions = this.fieldConfig()?.actions ?? [];

    // Sort actions based on ACTION_ORDER, putting known types first
    const actionOrder: readonly string[] = TableComponent.ACTION_ORDER;
    return actions
      .map(config => ({
        key: config.type,
        config,
      }))
      .sort((a, b) => {
        const indexA = actionOrder.indexOf(a.key);
        const indexB = actionOrder.indexOf(b.key);

        // If both are in the order list, sort by their position
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is in the order list, it comes first
        if (indexA !== -1) return -1;
        // If only B is in the order list, it comes first
        if (indexB !== -1) return 1;
        // If neither are in the order list, maintain original order
        return 0;
      });
  });

  readonly bulkActionListSignal = computed<BulkActionItem<T>[]>(() => {
    const bulkActions = this.fieldConfig()?.bulkActions ?? [];

    // Sort bulk actions based on ACTION_ORDER, putting known types first
    const actionOrder: readonly string[] = TableComponent.ACTION_ORDER;
    return bulkActions
      .map(config => ({
        key: config.type,
        config,
      }))
      .sort((a, b) => {
        const indexA = actionOrder.indexOf(a.key);
        const indexB = actionOrder.indexOf(b.key);

        // If both are in the order list, sort by their position
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is in the order list, it comes first
        if (indexA !== -1) return -1;
        // If only B is in the order list, it comes first
        if (indexB !== -1) return 1;
        // If neither are in the order list, maintain original order
        return 0;
      });
  });

  readonly selectedArraySignal = computed(() => [...this.selectedSignal()]);

  readonly displayedColumnsSignal = computed(() => {
    const allColumns = this.columnDefsSignal().map(c => c.field);
    const visibilityState = this.columnVisibilityState();

    // Filter columns based on visibility
    const visibleColumns: string[] = allColumns.filter(field => {
      // If column visibility is not enabled, show all columns
      if (!this.isColumnVisibilityEnabled()) return true;

      // Check visibility state
      const isVisible = visibilityState.get(field);
      return isVisible !== false; // Show by default if not set
    });

    // Add special columns in order: select, tree_expand, data columns, actions
    // Note: unshift adds to the beginning, so we add in reverse order
    if (this.isTreeTableSignal()) visibleColumns.unshift('__tree_expand');
    if (this.hasSelectionSignal()) visibleColumns.unshift('select');
    if (this.hasActionsSignal()) visibleColumns.push('actions');

    return visibleColumns;
  });

  readonly isAllSelected = computed(() => {
    const data = this.currentDataSignal(); // Use current page data for "select all"
    const selected = this.selectedSignal();
    return data.length > 0 && data.every(row => selected.has(row));
  });

  // DataSource
  readonly dataSource: DataSource<T>;

  // Track by functions for better performance
  readonly trackByField: TrackByFunction<ColumnDefinition<T>> = (_, item) => item.field;
  readonly trackByAction: TrackByFunction<ActionItem<T>> = (_, item) => item.key;
  readonly trackByBulkAction: TrackByFunction<BulkActionItem<T>> = (_, item) => item.key;
  readonly trackByPage: TrackByFunction<number> = (_, page) => page;
  readonly trackByPageSize: TrackByFunction<number> = (_, size) => size;

  // Static properties
  private static readonly ACTION_ORDER: readonly ActionType[] = ['view', 'edit', 'delete', 'upload', 'download', 'print'] as const;

  private static readonly ACTION_CLASSES: Readonly<Record<string, string>> = {
    view: 'btn btn-sm btn-secondary',
    edit: 'btn btn-sm btn-accent',
    delete: 'btn btn-sm btn-error text-white',
    upload: 'btn btn-sm btn-info',
    download: 'btn btn-sm btn-success',
    print: 'btn btn-sm btn-secondary',
    export: 'btn btn-sm btn-info',
  } as const;

  private static readonly DEFAULT_ACTION_CLASS = 'btn btn-sm btn-ghost';

  /** Default export options for bulk export actions */
  private static readonly DEFAULT_EXPORT_OPTIONS: readonly BulkActionDropdownOption[] = [
    { label: 'CSV', value: 'csv', icon: 'Sheet' },
    { label: 'Excel', value: 'excel', icon: 'FileSpreadsheet' },
    { label: 'PDF', value: 'pdf', icon: 'FileText' },
    { label: 'JSON', value: 'json', icon: 'Braces' },
  ] as const;

  constructor() {
    this.dataSource = new SignalDataSource(this.currentDataSignal);
    this.setupEffects();
  }

  ngOnDestroy(): void {
    // Clean up debounce timeout to prevent memory leaks
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }
  }

  // Enhanced pagination methods
  firstPage(): void {
    if (!this.isFirstPageSignal() && !this.disabled()) {
      this.updatePagination({ pageIndex: 0, pageSize: this.pageSizeSignal() });
    }
  }

  previousPage(): void {
    if (this.hasPreviousPageSignal()) {
      this.updatePagination({ pageIndex: this.pageIndexSignal() - 1, pageSize: this.pageSizeSignal() });
    }
  }

  nextPage(): void {
    if (this.hasNextPageSignal()) {
      this.updatePagination({ pageIndex: this.pageIndexSignal() + 1, pageSize: this.pageSizeSignal() });
    }
  }

  lastPage(): void {
    if (!this.isLastPageSignal() && !this.disabled()) {
      this.updatePagination({ pageIndex: this.totalPagesSignal() - 1, pageSize: this.pageSizeSignal() });
    }
  }

  gotoPage(pageNumber: number): void {
    const pageIndex = pageNumber - 1; // Convert to 0-based
    if (pageIndex >= 0 && pageIndex < this.totalPagesSignal() && !this.disabled()) {
      this.updatePagination({ pageIndex, pageSize: this.pageSizeSignal() });
    }
  }

  clearSelection(): void {
    this.selectedSignal.set(new Set());
    this.selectionChange.emit([]);
  }

  changePageSize(pageSize: number): void {
    if (pageSize > 0 && !this.disabled()) {
      const mode = this.modeSignal();

      if (mode === 'offset') {
        // For offset pagination, calculate new page index to maintain position
        const currentIndex = this.pageIndexSignal();
        const currentStart = currentIndex * this.pageSizeSignal();
        const newPageIndex = Math.floor(currentStart / pageSize);

        this.updatePagination({ pageIndex: newPageIndex, pageSize });
      } else {
        // For cursor pagination, just update page size - parent will handle server call
        this.paginationState.update(state => ({
          ...state,
          pageSize,
        }));

        // Emit a special page change event for cursor mode page size changes
        this.pageChange.emit({ pageIndex: 0, pageSize });
      }
    }
  }

  private updatePagination(options: { pageIndex: number; pageSize: number }): void {
    this.paginationState.update(state => ({
      ...state,
      pageIndex: options.pageIndex,
      pageSize: options.pageSize,
    }));

    this.pageChange.emit(options);
  }

  // Enhanced sort method with server-side support
  sort(field: string): void {
    const currentSort = this.sortState();
    const newDirection = this.calculateNewSortDirection(field, currentSort);
    const newSortState: SortState = {
      field: newDirection ? field : '',
      direction: newDirection,
    };

    // Update sort state
    this.sortState.set(newSortState);

    // Emit all sort events
    this.emitSortEvents(newSortState);

    // Reset to first page for offset mode (client-side sorting)
    if (this.modeSignal() === 'offset') {
      this.firstPage();
    }
  }

  classesFor({ key, config }: ActionItem<T> | BulkActionItem<T>): string {
    const baseClass = TableComponent.ACTION_CLASSES[key] || TableComponent.DEFAULT_ACTION_CLASS;
    const configClass = config.buttonClass || '';
    const transitionClasses = 'transition-all duration-200 hover:scale-105 focus:scale-105';
    const classes = [baseClass, configClass, transitionClasses, ...(config.buttonClasses || [])].filter(Boolean);

    return classes.join(' ');
  }

  /** Check if a bulk action should render as a dropdown */
  isDropdownBulkAction(bulkAction: BulkActionItem<T>): boolean {
    // Has explicit dropdown options
    if (bulkAction.config.dropdownOptions && bulkAction.config.dropdownOptions.length > 0) {
      return true;
    }
    // Is export type and default options not explicitly disabled
    if (bulkAction.key === 'export' && bulkAction.config.useDefaultExportOptions !== false) {
      return true;
    }
    return false;
  }

  /** Get dropdown options for a bulk action */
  getDropdownOptions(bulkAction: BulkActionItem<T>): readonly BulkActionDropdownOption[] {
    // Use explicit options if provided
    if (bulkAction.config.dropdownOptions && bulkAction.config.dropdownOptions.length > 0) {
      return bulkAction.config.dropdownOptions;
    }
    // Use default export options for export type
    if (bulkAction.key === 'export' && bulkAction.config.useDefaultExportOptions !== false) {
      return TableComponent.DEFAULT_EXPORT_OPTIONS;
    }
    return [];
  }

  /** Toggle bulk action dropdown open/close */
  toggleBulkActionDropdown(actionKey: string, event: MouseEvent): void {
    event.stopPropagation();
    const current = this.openBulkActionDropdown();
    this.openBulkActionDropdown.set(current === actionKey ? null : actionKey);
  }

  /** Check if a bulk action dropdown is open */
  isBulkActionDropdownOpen(actionKey: string): boolean {
    return this.openBulkActionDropdown() === actionKey;
  }

  /** Handle dropdown option selection */
  onBulkActionOptionSelect(bulkAction: BulkActionItem<T>, option: BulkActionDropdownOption): void {
    this.openBulkActionDropdown.set(null); // Close the dropdown
    bulkAction.config.action(this.selectedArraySignal(), option);
  }

  formatCell(row: T, column: ColumnDefinition<T>): Observable<string> {
    const value = row[column.field];

    if (column.format) {
      const result = column.format(value, row);
      const formatted = isObservable(result) ? result : of(result || (column.fallback ?? '—'));
      return formatted;
    }

    const displayValue = value || value === 0 ? String(value) : (column.fallback ?? '—');
    return of(displayValue);
  }

  toggleRow(row: T, checked: boolean): void {
    this.selectedSignal.update(selectedSet => {
      const newSet = new Set(selectedSet);
      if (checked) {
        newSet.add(row);
      } else {
        newSet.delete(row);
      }
      return newSet;
    });

    this.selectionChange.emit([...this.selectedSignal()]);
  }

  toggleSelectAll(checked: boolean): void {
    const data = this.currentDataSignal(); // Only select/deselect current page

    this.selectedSignal.update(selectedSet => {
      const newSet = new Set(selectedSet);

      for (const row of data) {
        if (checked) {
          newSet.add(row);
        } else {
          newSet.delete(row);
        }
      }

      return newSet;
    });

    this.selectionChange.emit([...this.selectedSignal()]);
  }

  isSelected(row: T): boolean {
    return this.selectedSignal().has(row);
  }

  isSelectedBgClass(row: T): Record<string, boolean> {
    return {
      'bg-base-200': this.isSelected(row),
    };
  }

  // Cursor pagination methods (for server-side)
  nextCursorPage(): void {
    const nextCursor = this.nextCursorSignal();
    if (nextCursor && !this.disabled()) {
      this.cursorChange.emit({ cursor: nextCursor, direction: 'next' });
    }
  }

  prevCursorPage(): void {
    const prevCursor = this.prevCursorSignal();
    if (prevCursor && !this.disabled()) {
      this.cursorChange.emit({ cursor: prevCursor, direction: 'prev' });
    }
  }

  // Handler methods for pagination component
  handlePaginationPageChange(event: PageSizeChange): void {
    this.paginationState.update(state => ({
      ...state,
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    }));
    this.pageChange.emit(event);
  }

  handleCursorChange(event: CursorPageChange): void {
    this.cursorChange.emit(event);
  }

  isTooltipVisible(row: T, action: ActionItem<T>): boolean {
    const tooltip = action.config.tooltip;
    if (typeof tooltip === 'function') {
      return !!tooltip(row);
    }
    return !!tooltip;
  }

  getTooltip(row: T, action: ActionItem<T>): string {
    const tooltip = action.config.tooltip;
    if (typeof tooltip === 'function') {
      return tooltip(row) || '';
    }
    return tooltip || '';
  }

  // Filter methods
  toggleFilterDropdown(field: string): void {
    const current = this.openFilterField();
    this.openFilterField.set(current === field ? null : field);
  }

  closeAllFilterDropdowns(): void {
    this.openFilterField.set(null);
  }

  isFilterOpen(field: string): boolean {
    return this.openFilterField() === field;
  }

  getFilterForColumn(field: string): ColumnFilter<T> | undefined {
    return this.columnFiltersMapSignal().get(field);
  }

  getActiveFilterForColumn(field: string): FilterConfig<T> | undefined {
    return this.filterState().find(f => f.field === field);
  }

  hasFilterForColumn(field: string): boolean {
    return this.columnFiltersMapSignal().has(field);
  }

  applyColumnFilter(field: string, value: unknown, operator: FilterOperator): void {
    const filterConfig = this.columnFiltersMapSignal().get(field);
    if (!filterConfig) return;

    // Remove existing filter for this field
    const filters = this.filterState().filter(f => f.field !== field);

    // Add new filter if value is not empty
    if (value != null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      filters.push({
        field: field as Extract<keyof T, string>,
        value,
        operator,
        type: filterConfig.type,
      });
    }

    this.filterState.set(filters);
    this.closeAllFilterDropdowns();

    // Reset to first page when filter changes
    this.firstPage();

    // Emit filter change event
    this.filterChange.emit({
      field,
      value,
      operator,
      filters: this.filterState(),
    });
  }

  removeFilter(field: string): void {
    const filters = this.filterState().filter(f => f.field !== field);
    this.filterState.set(filters);

    // Reset to first page
    this.firstPage();

    // Emit filter change event
    this.filterChange.emit({
      field,
      value: null,
      operator: 'equals',
      filters: this.filterState(),
    });
  }

  clearAllFilters(): void {
    this.filterState.set([]);
    this.closeAllFilterDropdowns();
    this.firstPage();

    // Emit filter change event
    this.filterChange.emit({
      field: '',
      value: null,
      operator: 'equals',
      filters: [],
    });
  }

  // Global search methods
  onGlobalSearchChange(searchTerm: string): void {
    this.globalSearchTerm.set(searchTerm);
  }

  clearGlobalSearch(): void {
    this.globalSearchTerm.set('');
    this.debouncedSearchTerm.set('');

    // Clear any pending timeout
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }

    // For cursor/server-side pagination, emit event with empty search
    const mode = this.modeSignal();
    const config = this.fieldConfig()?.globalSearch;
    if (mode === 'cursor' && config?.enabled) {
      const searchMode = config.mode ?? 'contains';
      this.globalSearchChange.emit({
        searchTerm: '',
        mode: searchMode,
      });
    }

    // Reset to first page
    this.firstPage();
  }

  // Column visibility methods
  isColumnVisible(field: string): boolean {
    const visibilityState = this.columnVisibilityState();
    const isVisible = visibilityState.get(field);
    return isVisible !== false; // Show by default if not set
  }

  toggleColumnVisibility(field: string): void {
    const currentState = this.isColumnVisible(field);
    const alwaysVisible = this.alwaysVisibleColumns();

    // Don't allow hiding if it's marked as always visible
    if (alwaysVisible.has(field) && currentState) {
      return;
    }

    // Don't allow hiding if it's the last visible column
    const allColumns = this.columnDefsSignal().map(c => c.field);
    const visibleCount = allColumns.filter(f => this.isColumnVisible(f)).length;
    if (visibleCount === 1 && currentState) {
      return; // Keep at least one column visible
    }

    this.columnVisibilityState.update(state => {
      const newState = new Map(state);
      newState.set(field, !currentState);
      return newState;
    });

    // Save to localStorage if enabled
    this.saveColumnVisibilityToStorage();
  }

  showAllColumns(): void {
    const allColumns = this.columnDefsSignal().map(c => c.field);
    this.columnVisibilityState.update(state => {
      const newState = new Map(state);
      allColumns.forEach(field => newState.set(field, true));
      return newState;
    });
    this.saveColumnVisibilityToStorage();
  }

  hideAllColumns(): void {
    const allColumns = this.columnDefsSignal().map(c => c.field);
    const alwaysVisible = this.alwaysVisibleColumns();

    // Keep at least one column visible (first non-always-visible column or first column)
    const firstColumn = allColumns.find(f => !alwaysVisible.has(f)) || allColumns[0];

    this.columnVisibilityState.update(state => {
      const newState = new Map(state);
      allColumns.forEach(field => {
        if (alwaysVisible.has(field) || field === firstColumn) {
          newState.set(field, true);
        } else {
          newState.set(field, false);
        }
      });
      return newState;
    });
    this.saveColumnVisibilityToStorage();
  }

  resetColumnVisibility(): void {
    const config = this.columnVisibilityConfig();
    const defaultVisible = config?.defaultVisible;

    if (defaultVisible && defaultVisible.length > 0) {
      // Reset to default visible columns
      const allColumns = this.columnDefsSignal().map(c => c.field);
      this.columnVisibilityState.update(state => {
        const newState = new Map(state);
        allColumns.forEach(field => {
          newState.set(field, defaultVisible.includes(field));
        });
        return newState;
      });
    } else {
      // Show all columns
      this.showAllColumns();
    }

    this.saveColumnVisibilityToStorage();
  }

  getVisibleColumnsCount(): number {
    const allColumns = this.columnDefsSignal().map(c => c.field);
    return allColumns.filter(f => this.isColumnVisible(f)).length;
  }

  // ============================================================================
  // Tree Table Methods
  // ============================================================================

  /**
   * Checks if the current row has children.
   */
  hasChildren(row: T): boolean {
    return this.treeRowHasChildrenMap.get(row) ?? false;
  }

  /**
   * Checks if a row is currently expanded.
   */
  isRowExpanded(row: T): boolean {
    const key = this.treeRowKeyMap.get(row);
    if (!key) return false;
    return this.expandedRowKeys().has(key);
  }

  /**
   * Gets the indentation level for a row (0 = root).
   */
  getRowLevel(row: T): number {
    return this.treeRowLevelMap.get(row) ?? 0;
  }

  /**
   * Calculates the indentation padding for the first cell.
   */
  getRowIndentPadding(row: T): number {
    const level = this.getRowLevel(row);
    const indentSize = this.treeIndentSizeSignal();
    // Add base padding (8px) + level-based indent
    return 8 + (level * indentSize);
  }

  /**
   * Toggles the expansion state of a row.
   */
  toggleRowExpand(row: T, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    const key = this.treeRowKeyMap.get(row);
    if (!key) return;

    const currentExpanded = this.expandedRowKeys();
    const isCurrentlyExpanded = currentExpanded.has(key);

    this.expandedRowKeys.update(keys => {
      const newKeys = new Set(keys);
      if (isCurrentlyExpanded) {
        newKeys.delete(key);
      } else {
        newKeys.add(key);
      }
      return newKeys;
    });

    this.expansionChange.emit({ row, expanded: !isCurrentlyExpanded });
  }

  /**
   * Expands all rows in the tree.
   */
  expandAllRows(): void {
    const allKeys = new Set<string>();
    this.collectAllRowKeys(this.originalDataSignal(), allKeys);
    this.expandedRowKeys.set(allKeys);
  }

  /**
   * Collapses all rows in the tree.
   */
  collapseAllRows(): void {
    this.expandedRowKeys.set(new Set());
  }

  /**
   * Recursively collects all row keys from the tree.
   */
  private collectAllRowKeys(data: readonly T[], keys: Set<string>, startIndex = 0): void {
    const treeConfig = this.treeTableConfigSignal();
    const childrenProp = treeConfig?.childrenProperty ?? 'children';
    const customGetKey = treeConfig?.getRowKey;

    data.forEach((row, index) => {
      const key = generateRowKey(row, customGetKey, startIndex + index);
      const children = getRowChildren(row, childrenProp);

      if (children && children.length > 0) {
        keys.add(key);
        this.collectAllRowKeys(children, keys, 0);
      }
    });
  }

  private saveColumnVisibilityToStorage(): void {
    const config = this.columnVisibilityConfig();
    const storageKey = config?.storageKey;

    if (!storageKey) return;

    const visibilityState = this.columnVisibilityState();
    const visibilityObj: Record<string, boolean> = {};

    visibilityState.forEach((visible, field) => {
      visibilityObj[field] = visible;
    });

    // Defer write to avoid blocking the main thread
    queueMicrotask(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(visibilityObj));
      } catch (e) {
        console.error('Failed to save column visibility to storage:', e);
      }
    });
  }

  private loadColumnVisibilityFromStorage(): void {
    const config = this.columnVisibilityConfig();
    const storageKey = config?.storageKey;

    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const visibilityObj: Record<string, boolean> = JSON.parse(stored);
        this.columnVisibilityState.update(state => {
          const newState = new Map(state);
          Object.entries(visibilityObj).forEach(([field, visible]) => {
            newState.set(field, visible);
          });
          return newState;
        });
      }
    } catch (e) {
      // Silent fail if localStorage is not available or parse error
      console.error('Failed to load column visibility from storage:', e);
    }
  }

  // Private methods
  private setupEffects(): void {
    // Initialize column visibility (use untracked for reads that would cause re-trigger)
    effect(() => {
      const config = this.columnVisibilityConfig();
      if (config?.enabled) {
        // Try to load from localStorage first
        this.loadColumnVisibilityFromStorage();

        // If nothing was loaded and there are default visible columns, set them
        const visibilityState = untracked(() => this.columnVisibilityState());
        if (visibilityState.size === 0 && config.defaultVisible && config.defaultVisible.length > 0) {
          const allColumns = untracked(() => this.columnDefsSignal()).map(c => c.field);
          this.columnVisibilityState.update(state => {
            const newState = new Map(state);
            allColumns.forEach(field => {
              newState.set(field, config.defaultVisible!.includes(field));
            });
            return newState;
          });
        }
      }
    });

    // Initialize tree table expanded state
    effect(() => {
      const treeConfig = this.treeTableConfigSignal();
      if (treeConfig?.enabled) {
        // Set initial expanded keys
        if (treeConfig.expandAll) {
          // Expand all on next tick to allow data to be loaded first
          setTimeout(() => this.expandAllRows(), 0);
        } else if (treeConfig.initialExpandedKeys && treeConfig.initialExpandedKeys.length > 0) {
          this.expandedRowKeys.set(new Set(treeConfig.initialExpandedKeys));
        }
      }
    });

    // Initialize pagination state from options
    effect(() => {
      const options = this.paginationOptions();
      if (options) {
        this.paginationState.update(state => ({
          ...state,
          pageSize: options.pageSize ?? 10, // Use explicit default of 10
          showFirstLastButtons: this.showFirstLastButtons(),
          disabled: this.disabled(),
        }));
      }
    });

    // Reset pagination when data changes
    effect(() => {
      this.data(); // Subscribe to data changes
      this.paginationState.update(state => ({
        ...state,
        pageIndex: 0,
        totalItems: this.totalItemsSignal(),
      }));
      this.selectedSignal.set(new Set());
    });

    // Update total items when it changes
    effect(() => {
      const totalItems = this.totalItemsSignal();
      this.paginationState.update(state => ({
        ...state,
        totalItems,
      }));
    });

    // Note: Sorting now works for both offset and cursor modes
    // Cursor mode emits events for server-side sorting

    // Debounce global search term
    effect(() => {
      const searchTerm = this.globalSearchTerm();
      const config = this.fieldConfig()?.globalSearch;
      const debounceTime = config?.debounceTime ?? 300;
      const previousSearchTerm = this.debouncedSearchTerm();

      // Clear any existing timeout
      if (this.searchDebounceTimeout) {
        clearTimeout(this.searchDebounceTimeout);
      }

      // Set new timeout to update debounced term
      this.searchDebounceTimeout = setTimeout(() => {
        this.debouncedSearchTerm.set(searchTerm);

        // For cursor/server-side pagination, emit event
        const mode = this.modeSignal();
        if (mode === 'cursor' && config?.enabled) {
          const searchMode = config.mode ?? 'contains';
          this.globalSearchChange.emit({
            searchTerm,
            mode: searchMode,
          });
        }

        // Reset to first page when search changes
        if (searchTerm !== previousSearchTerm) {
          this.firstPage();
        }
      }, debounceTime);
    });
  }

  /**
   * Synchronous fast path for cell display. Returns a `CellDisplay` directly
   * when the column has no async formatter, or `null` if the formatter returns
   * an Observable (caller should fall back to `getCellDisplayAsync`).
   */
  getCellDisplaySync(row: T, column: ColumnDefinition<T>): CellDisplay | null {
    const value = row[column.field];

    if (column.format) {
      const result = column.format(value, row);
      if (isObservable(result)) return null; // Needs async path
      const formatted = result || (column.fallback ?? '—');
      const html = this.isHtml(formatted);
      return { value: formatted, isHtml: html, safeHtml: html ? this.sanitizeHtml(formatted) : null };
    }

    const displayValue = value || value === 0 ? String(value) : (column.fallback ?? '—');
    const html = this.isHtml(displayValue);
    return { value: displayValue, isHtml: html, safeHtml: html ? this.sanitizeHtml(displayValue) : null };
  }

  /**
   * Async path for cell display. Only used when the column formatter returns an Observable.
   */
  getCellDisplayAsync(row: T, column: ColumnDefinition<T>): Observable<CellDisplay> {
    return this.formatCell(row, column).pipe(
      map(value => {
        const html = this.isHtml(value);
        return { value, isHtml: html, safeHtml: html ? this.sanitizeHtml(value) : null };
      }),
    );
  }

  /**
   * @deprecated Use `getCellDisplaySync` with `getCellDisplayAsync` fallback instead.
   */
  getCellDisplay(row: T, column: ColumnDefinition<T>): Observable<CellDisplay> {
    return this.getCellDisplayAsync(row, column);
  }

  private isHtml(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    if (!value.includes('<') || !value.includes('>')) return false;

    const doc = TableComponent.htmlParser.parseFromString(value, 'text/html');

    return doc.body.children.length > 0 && doc.querySelector('parsererror') === null;
  }

  private sanitizeHtml(value: string): SafeHtml {
    return this.sanitizer.sanitize(1, value) || '';
  }

  private formatHeader(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, char => char.toUpperCase())
      .trim();
  }

  private calculateNewSortDirection(field: string, currentSort: SortState): '' | 'Ascending' | 'Descending' {
    // If sorting a different field, start with ascending
    if (currentSort.field !== field) {
      return 'Ascending';
    }

    // Cycle through: Ascending → Descending → No Sort (empty)
    switch (currentSort.direction) {
      case 'Ascending':
        return 'Descending';
      case 'Descending':
        return '';
      default:
        return 'Ascending';
    }
  }

  /**
   * Emits all sort-related events
   */
  private emitSortEvents(sortState: SortState): void {
    this.sortFieldChange.emit(sortState.field);
    this.sortDirectionChange.emit(sortState.direction);
    this.sortChange.emit({
      field: sortState.field,
      direction: sortState.direction,
    });
  }

  /**
   * Type-aware comparison function for sorting
   * Handles: strings (locale-aware), numbers, dates, booleans, null/undefined
   */
  private compareValues(valueA: unknown, valueB: unknown, direction: 'Ascending' | 'Descending'): number {
    const multiplier = direction === 'Ascending' ? 1 : -1;

    // Handle null/undefined - always push to end regardless of direction
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    // Type-specific comparisons
    const typeA = typeof valueA;
    const typeB = typeof valueB;

    // If types differ, convert both to strings for comparison
    if (typeA !== typeB) {
      return String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
    }

    // String comparison (locale-aware, case-insensitive)
    if (typeA === 'string') {
      return (
        (valueA as string).localeCompare(valueB as string, undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * multiplier
      );
    }

    // Number comparison
    if (typeA === 'number') {
      const diff = (valueA as number) - (valueB as number);
      // Handle NaN
      if (isNaN(diff)) return 0;
      return diff * multiplier;
    }

    // Boolean comparison (false < true)
    if (typeA === 'boolean') {
      return ((valueA as boolean) === (valueB as boolean) ? 0 : (valueA as boolean) ? 1 : -1) * multiplier;
    }

    // Date comparison
    if (valueA instanceof Date && valueB instanceof Date) {
      return (valueA.getTime() - valueB.getTime()) * multiplier;
    }

    // Fallback: convert to string and compare
    return String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  }

  /**
   * Performs fuzzy search using Fuse.js
   * Handles instance creation/update and search execution
   */
  private performFuzzySearch(data: readonly T[], searchTerm: string, config: NonNullable<GlobalSearchConfig<T>>): readonly T[] {
    const excludeFields = new Set(config.excludeFields ?? []);
    const searchableFields =
      this.columns()
        ?.map(col => col.field)
        .filter(f => !excludeFields.has(f)) ?? [];

    // If no searchable fields, return empty
    if (searchableFields.length === 0) return [];

    // Build Fuse.js configuration
    const fuseOptions: IFuseOptions<T> = {
      ...this.defaultFuseConfig,
      keys: searchableFields.map(field => String(field)),
      threshold: config.fuseOptions?.threshold ?? this.defaultFuseConfig.threshold,
      ignoreLocation: config.fuseOptions?.ignoreLocation ?? this.defaultFuseConfig.ignoreLocation,
      minMatchCharLength: config.fuseOptions?.minMatchCharLength ?? this.defaultFuseConfig.minMatchCharLength,
      includeScore: config.fuseOptions?.includeScore ?? this.defaultFuseConfig.includeScore,
    };

    // Only rebuild Fuse index when data reference changes (avoids O(n) rebuild per keystroke)
    if (this._fuseDataRef !== data || !this._fuseInstance) {
      this._fuseInstance = new Fuse([...data], fuseOptions);
      this._fuseDataRef = data;
    }

    // Perform search and return matched items
    const results = this._fuseInstance.search(searchTerm);
    return results.map(result => result.item);
  }

  // Apply a single filter to a row
  private applyFilter(row: T, filter: FilterConfig<T>): boolean {
    const value = row[filter.field];
    const filterValue = filter.value;

    // Handle empty/null checks first
    if (filter.operator === 'isEmpty') {
      return value == null || value === '';
    }

    if (filter.operator === 'isNotEmpty') {
      return value != null && value !== '';
    }

    // If row value is null/undefined and we're not checking for empty, filter out
    if (value == null) {
      return false;
    }

    switch (filter.operator) {
      case 'equals':
        return value === filterValue;

      case 'notEquals':
        return value !== filterValue;

      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());

      case 'notContains':
        return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());

      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());

      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());

      case 'gt':
        return Number(value) > Number(filterValue);

      case 'lt':
        return Number(value) < Number(filterValue);

      case 'gte':
        return Number(value) >= Number(filterValue);

      case 'lte':
        return Number(value) <= Number(filterValue);

      case 'in':
        if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        }
        return false;

      case 'notIn':
        if (Array.isArray(filterValue)) {
          return !filterValue.includes(value);
        }
        return true;

      case 'between':
        if (Array.isArray(filterValue) && filterValue.length === 2) {
          const numValue = Number(value);
          return numValue >= Number(filterValue[0]) && numValue <= Number(filterValue[1]);
        }
        return false;

      default:
        return true;
    }
  }
}
