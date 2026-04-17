// table.component.ts
import { CdkTableModule, DataSource } from '@angular/cdk/table';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  Signal,
  signal,
  TemplateRef,
  TrackByFunction,
  untracked,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isObservable, map, Observable, of } from 'rxjs';
import Fuse, { IFuseOptions } from 'fuse.js';

import { AutoFocusDirective } from '../../directives';
import { HkCellTemplateDirective } from './table-cell-template.directive';
import { HkFooterDirective } from './table-footer-template.directive';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { TableColumnVisibilityComponent } from './table-column-visibility.component';
import { TableFilterComponent } from './table-filter.component';
import { TableGlobalSearchComponent } from './table-global-search.component';
import { TablePaginationComponent } from './table-pagination.component';
import {
  ActionType,
  BulkActionDropdownOption,
  CellDisplay,
  CellEditErrorEvent,
  CellEditEvent,
  ColumnDefinition,
  ColumnFilter,
  ColumnReorderEvent,
  ColumnResizeEvent,
  CursorPageChange,
  FieldConfiguration,
  FilterChange,
  FilterConfig,
  FilterOperator,
  GlobalSearchChange,
  GlobalSearchConfig,
  GroupExpandEvent,
  PageSizeChange,
  PaginationOptions,
  ResolvedColspanCell,
  ResolvedFooterRow,
  RowExpandEvent,
  RowGroup,
  RowReorderEvent,
  SortChange,
  StringKey,
  TableAction,
  TableBulkAction,
} from './table.types';
import {
  _attachTableInstance,
  _detachTableInstance,
  collectAncestorKeys,
  exportToCsv,
  exportToJson,
  filterTreeData,
  flattenTreeData,
  generateRowKey,
  getRowChildren,
  groupData,
  sortTreeData,
} from './table.helpers';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Optimized DataSource with proper typing
class SignalDataSource<T> extends DataSource<T> {
  constructor(private readonly dataSignal: Signal<readonly T[]>) {
    super();
  }

  connect(): Observable<readonly T[]> {
    return toObservable(this.dataSignal);
  }

  disconnect(): void {}
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
  selector: 'hk-table',
  imports: [
    CommonModule,
    CdkTableModule,
    ScrollingModule,
    LucideIconComponent,
    TableFilterComponent,
    TablePaginationComponent,
    TableGlobalSearchComponent,
    TableColumnVisibilityComponent,
    AutoFocusDirective,
    forwardRef(() => TableComponent),
  ],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.resizing]': 'isResizingSignal()',
    '[attr.tabindex]': 'enableKeyboardNavSignal() ? 0 : null',
    '[style.outline]': "enableKeyboardNavSignal() ? 'none' : null",
    '(document:click)': 'onDocumentClick($event)',
    '(keydown)': 'onTableKeydown($event)',
  },
})
export class TableComponent<T extends object> implements OnDestroy, AfterViewInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly hasLocalStorage = this.isBrowser && typeof localStorage !== 'undefined';

  // Handle click outside to close dropdowns
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdownContainer = target.closest('.bulk-action-dropdown');
    if (!dropdownContainer) {
      this.openBulkActionDropdown.set(null);
    }
  }

  private readonly htmlParser = this.isBrowser && typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  private readonly htmlCache = new Map<string, boolean>();

  // Inputs as signals
  readonly data = input<readonly T[] | null>(null);
  readonly config = input<FieldConfiguration<T> | null>(null);
  readonly paginationOptions = input<PaginationOptions | null>(null);
  readonly showFirstLastButtons = input<boolean>(true);
  readonly hidePageSize = input<boolean>(false);
  readonly showPageSizeOptions = input<boolean>(true);
  readonly disabled = input<boolean>(false);
  /** Show loading skeleton overlay */
  readonly loading = input<boolean>(false);
  /** Error message to display instead of table data */
  readonly error = input<string | null>(null);
  /** Custom empty state message (default: 'No data available') */
  readonly emptyMessage = input<string>('No data available');

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
  readonly columnResize = output<ColumnResizeEvent>();
  readonly cellEdit = output<CellEditEvent<T>>();
  readonly cellEditCancel = output<{ row: T; field: string }>();
  readonly cellEditError = output<CellEditErrorEvent<T>>();
  readonly detailExpansionChange = output<RowExpandEvent<T>>();
  readonly columnReorder = output<ColumnReorderEvent>();
  readonly rowReorder = output<RowReorderEvent<T>>();
  readonly groupExpandChange = output<GroupExpandEvent>();
  readonly rowClick = output<T>();
  readonly masterDetailRowChange = output<T>();
  readonly activeRowChange = output<T | null>();
  readonly activeRowsChange = output<readonly T[]>();

  // Internal signals
  private readonly sortState = signal<SortState>({ field: '', direction: '' });
  private readonly filterState = signal<FilterConfig<T>[]>([]);
  readonly selectedSignal = signal(new Set<T>());
  readonly activeRow = signal<T | null>(null);
  readonly activeRows = signal<Set<T>>(new Set());
  readonly openFilterField = signal<string | null>(null); // Track which filter dropdown is open
  readonly columnVisibilityState = signal<Map<string, boolean>>(new Map()); // Track column visibility
  readonly openBulkActionDropdown = signal<string | null>(null); // Track which bulk action dropdown is open

  // Tree table signals
  readonly expandedRowKeys = signal<Set<string>>(new Set());
  private treeRowLevelMap = new Map<T, number>(); // Cache row levels for template access
  private treeRowKeyMap = new Map<T, string>(); // Cache row keys for template access
  private treeRowHasChildrenMap = new Map<T, boolean>(); // Cache hasChildren for template access
  private treeRowIsLastChildMap = new Map<T, boolean>(); // Cache isLastChild for indent guides
  private treeRowAncestorFlagsMap = new Map<T, boolean[]>(); // Cache ancestor flags for indent guides
  private treeRowParentKeyMap = new Map<string, string | null>(); // key → parentKey for cascade
  private treeKeyToDataMap = new Map<string, T>(); // key → row for cascade

  // Animation signal for tree row expand
  readonly treeAnimatingKeys = signal<Set<string>>(new Set());

  // ============================================================================
  // Sticky Columns
  // ============================================================================
  readonly stickyStartColumnsSignal = computed(() => {
    const cols = this.columnDefsSignal();
    const set = new Set<string>();
    for (const col of cols) {
      if (col.sticky === 'start') set.add(col.field);
    }
    return set;
  });

  readonly stickyEndColumnsSignal = computed(() => {
    const cols = this.columnDefsSignal();
    const set = new Set<string>();
    for (const col of cols) {
      if (col.sticky === 'end') set.add(col.field);
    }
    return set;
  });

  readonly hasStickyColumnsSignal = computed(() => {
    const config = this.fieldConfig()?.stickyColumns;
    // Only activate sticky behavior when stickyColumns is explicitly configured with at least one option
    return config != null && (config.stickySelection != null || config.stickyActions != null);
  });

  readonly stickySelectionSignal = computed(() => {
    const config = this.fieldConfig()?.stickyColumns;
    if (!this.hasStickyColumnsSignal()) return false;
    return this.hasSelectionSignal() && config?.stickySelection !== false;
  });

  readonly stickyActionsSignal = computed(() => {
    const config = this.fieldConfig()?.stickyColumns;
    if (!this.hasStickyColumnsSignal()) return false;
    return this.hasActionsSignal() && config?.stickyActions !== false;
  });

  // ============================================================================
  // Column Resizing
  // ============================================================================
  readonly columnWidthsSignal = signal<Map<string, number>>(new Map());
  readonly isResizingSignal = signal(false);
  readonly enableResizingSignal = computed(() => this.fieldConfig()?.enableColumnResizing ?? false);
  private resizeState: { field: string; startX: number; startWidth: number } | null = null;

  // ============================================================================
  // Virtual Scrolling
  // ============================================================================
  readonly virtualScrollConfigSignal = computed(() => this.fieldConfig()?.virtualScroll);
  readonly isVirtualScrollSignal = computed(() => this.virtualScrollConfigSignal()?.enabled ?? false);
  readonly virtualScrollItemHeightSignal = computed(() => this.virtualScrollConfigSignal()?.itemHeight ?? 48);
  readonly virtualScrollViewportHeightSignal = computed(() => this.virtualScrollConfigSignal()?.viewportHeight ?? '400px');

  // ============================================================================
  // Inline Cell Editing
  // ============================================================================
  readonly enableEditingSignal = computed(() => this.fieldConfig()?.enableInlineEditing ?? false);
  readonly editingCell = signal<{ row: T; field: string } | null>(null);
  readonly editingValue = signal<unknown>(null);
  readonly editError = signal<string | null>(null);

  // ============================================================================
  // Summary Footer Row
  // ============================================================================
  readonly showFooterSignal = computed(() => this.fieldConfig()?.showFooter ?? false);
  readonly hasAggregateFooterSignal = computed(() => this.showFooterSignal() && this.columnDefsSignal().some((col) => !!col.footer));
  /** Custom footer template — rendered between table and pagination for full flexibility. */
  readonly footerTemplate = contentChild<TemplateRef<{ $implicit: readonly T[]; columns: readonly ColumnDefinition<T>[] }>>('tableFooter');
  /** Custom empty state template — shown when no data and not loading. */
  readonly emptyTemplate = contentChild<TemplateRef<unknown>>('emptyState');
  /** Custom loading state template — overrides default skeleton. */
  readonly loadingTemplate = contentChild<TemplateRef<unknown>>('loadingState');
  /** Custom error state template. Context: { $implicit: errorMessage } */
  readonly errorTemplate = contentChild<TemplateRef<{ $implicit: string }>>('errorState');
  /** Custom cell templates per column via hkCellTemplate directive */
  private readonly cellTemplates = contentChildren(HkCellTemplateDirective);
  /** Lookup map: field name → TemplateRef */
  readonly cellTemplateMap = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const tpl of this.cellTemplates()) {
      map.set(tpl.hkCellTemplate(), tpl.templateRef);
    }
    return map;
  });

  /** Custom footer row templates via hkFooterTemplate directive — rendered inside <tfoot> */
  readonly footerTemplateDirectives = contentChildren(HkFooterDirective);
  readonly hasFooterTemplateDirectives = computed(() => this.footerTemplateDirectives().length > 0);

  // Multi-row footer signals
  readonly resolvedFooterRowsSignal = computed(() => this.config()?.resolvedFooterRows ?? []);
  readonly hasFooterRowsSignal = computed(() => this.resolvedFooterRowsSignal().length > 0);

  /** Total column count including utility columns (selection, actions, etc.) */
  readonly totalColumnsCountSignal = computed(() => this.displayedColumnsSignal().length);

  /** True when multi-row footerRows, legacy column.footer, or footer template directives exist. */
  readonly hasFooterSignal = computed(
    () => this.hasFooterRowsSignal() || this.hasAggregateFooterSignal() || this.hasFooterTemplateDirectives(),
  );

  // ============================================================================
  // Native Drag State (Column & Row Reordering)
  // ============================================================================
  readonly draggedColumnField = signal<string | null>(null);
  readonly dragOverColumnField = signal<string | null>(null);
  readonly draggedRow = signal<T | null>(null);
  readonly dragOverRowIndex = signal<number | null>(null);

  // ============================================================================
  // Expandable Row Detail
  // ============================================================================
  readonly rowDetailTemplate = contentChild<TemplateRef<{ $implicit: T }>>('rowDetail');
  readonly expandedDetailRows = signal<Set<T>>(new Set());
  readonly isExpandableDetailSignal = computed(() => this.fieldConfig()?.expandableDetail ?? false);
  readonly expandModeSignal = computed(() => this.fieldConfig()?.expandMode ?? 'multi');
  readonly showExpandColumnSignal = computed(
    () => this.isExpandableDetailSignal() && (!!this.rowDetailTemplate() || !!this.childGridConfigSignal()),
  );

  // ============================================================================
  // Hierarchy Grid (Child Grid)
  // ============================================================================
  readonly childGridConfigSignal = computed(() => this.config()?.childGrid);
  readonly hasChildGridSignal = computed(() => !!this.childGridConfigSignal());

  // ============================================================================
  // Master-Detail Grid
  // ============================================================================
  readonly masterDetailConfigSignal = computed(() => this.config()?.masterDetail);
  readonly hasMasterDetailSignal = computed(() => !!this.masterDetailConfigSignal());
  readonly masterDetailSelectedRow = signal<T | null>(null);

  readonly masterDetailDataSignal = computed<readonly unknown[]>(() => {
    const row = this.masterDetailSelectedRow();
    const cfg = this.masterDetailConfigSignal();
    if (!row || !cfg) return [];
    if (cfg.detailDataFn) return cfg.detailDataFn(row);
    if (cfg.detailDataProperty) return ((row as Record<string, unknown>)[cfg.detailDataProperty] as unknown[]) ?? [];
    return [];
  });

  readonly masterDetailHeaderTextSignal = computed<string | null>(() => {
    const row = this.masterDetailSelectedRow();
    const cfg = this.masterDetailConfigSignal();
    if (!row || !cfg?.headerText) return null;
    return typeof cfg.headerText === 'function' ? cfg.headerText(row) : cfg.headerText;
  });

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================
  readonly enableKeyboardNavSignal = computed(() => this.fieldConfig()?.enableKeyboardNavigation ?? false);
  readonly activeCellSignal = signal<[number, number] | null>(null);

  /** Number of special columns prepended before data columns (drag handle, select, expand). */
  readonly specialColumnOffsetSignal = computed(() => {
    let offset = 0;
    if (this.showDragHandleColumnSignal()) offset++;
    if (this.hasSelectionSignal()) offset++;
    if (this.showExpandColumnSignal()) offset++;
    return offset;
  });

  /** Column index of the select column within displayedColumnsSignal. */
  readonly selectColIndexSignal = computed(() => (this.showDragHandleColumnSignal() ? 1 : 0));

  /** Column index of the detail-expand column within displayedColumnsSignal. */
  readonly expandColIndexSignal = computed(() => this.specialColumnOffsetSignal() - 1);

  /** Column index of the actions column within displayedColumnsSignal. */
  readonly actionsColIndexSignal = computed(() => this.displayedColumnsSignal().length - 1);

  // ============================================================================
  // Column Reordering
  // ============================================================================
  readonly enableColumnReorderSignal = computed(() => this.fieldConfig()?.enableColumnReorder ?? false);
  readonly columnOrderOverride = signal<string[] | null>(null);

  // ============================================================================
  // Row Reordering
  // ============================================================================
  readonly enableRowReorderSignal = computed(() => {
    const config = this.fieldConfig();
    if (!config?.enableRowReorder) return false;
    // Disable when sort or filter is active
    if (this.sortState().field) return false;
    if (this.filterState().length > 0) return false;
    if (this.debouncedSearchTerm()) return false;
    return true;
  });
  readonly showDragHandleColumnSignal = computed(() => this.enableRowReorderSignal() && (this.fieldConfig()?.showDragHandle ?? true));

  /** True when the table has no data to display and is not loading */
  readonly isEmptySignal = computed(() => !this.loading() && !this.error() && this.displayDataSignal().length === 0);
  /** True when showing error state */
  readonly hasErrorSignal = computed(() => !!this.error());

  // ============================================================================
  // Row Grouping
  // ============================================================================
  readonly groupConfigSignal = computed(() => this.fieldConfig()?.grouping);
  readonly isGroupedSignal = computed(() => !!this.groupConfigSignal()?.groupBy);
  readonly expandedGroups = signal<Set<unknown> | null>(null);
  readonly resolvedGroupAggregatesSignal = computed(() => this.config()?.resolvedGroupAggregates);
  readonly hasGroupCaptionAggregatesSignal = computed(() => !!this.groupConfigSignal()?.captionAggregates);
  readonly hasGroupFooterRowsSignal = computed(() => (this.groupConfigSignal()?.groupFooterRows?.length ?? 0) > 0);

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

  private readonly totalPagesSignal = computed(() => Math.max(1, Math.ceil(this.totalItemsSignal() / this.pageSizeSignal())));

  readonly hasSelectionSignal = computed(() => this.fieldConfig()?.hasSelection ?? false);
  readonly selectableRowsSignal = computed(() => !!this.fieldConfig()?.selectableRows);
  readonly selectableRowsModeSignal = computed(() => {
    const val = this.fieldConfig()?.selectableRows;
    if (val === 'multi') return 'multi';
    return val ? 'single' : false;
  });
  readonly hasActionsSignal = computed(() => {
    const actions = this.fieldConfig()?.actions ?? [];
    return actions.length > 0;
  });

  // Tree table computed signals
  readonly treeTableConfigSignal = computed(() => this.fieldConfig()?.treeTable);
  readonly isTreeTableSignal = computed(() => this.treeTableConfigSignal()?.enabled ?? false);
  readonly treeIndentSizeSignal = computed(() => this.treeTableConfigSignal()?.indentSize ?? 24);
  private readonly childrenPropertySignal = computed(() => this.treeTableConfigSignal()?.childrenProperty ?? 'children');

  // Tree column integration: which data column renders the toggle
  readonly treeColumnFieldSignal = computed(() => {
    const config = this.treeTableConfigSignal();
    if (!config?.enabled) return null;
    const visible = this.fieldConfig()?.visible ?? [];
    const index = config.treeColumnIndex ?? 0;
    const safeIndex = index >= 0 && index < visible.length ? index : 0;
    return visible[safeIndex] ?? null;
  });

  readonly showIndentGuidesSignal = computed(() => this.treeTableConfigSignal()?.showIndentGuides ?? true);
  readonly checkboxCascadeSignal = computed(() => this.treeTableConfigSignal()?.checkboxCascade ?? 'none');
  readonly filterHierarchyModeSignal = computed(() => this.treeTableConfigSignal()?.filterHierarchyMode ?? 'ancestors');

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
    filters.forEach((filter) => map.set(filter.field, filter));

    // Also check column definitions for inline filters
    const cols = this.columns();
    if (cols) {
      cols.forEach((col) => {
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
  // For tree tables: hierarchy-aware filtering (child match keeps ancestors)
  private readonly filteredDataSignal = computed(() => {
    const data = this.originalDataSignal();
    const filters = this.filterState();
    const mode = this.modeSignal();

    // Skip client-side filtering for cursor pagination (server handles it)
    if (mode === 'cursor' || filters.length === 0) return data;

    const predicate = (row: T) => filters.every((filter) => this.applyFilter(row, filter));

    // Use hierarchy-aware filtering for tree tables
    if (this.isTreeTableSignal()) {
      const hierarchyMode = this.filterHierarchyModeSignal();
      const childrenProp = this.childrenPropertySignal();
      const filtered = filterTreeData(data as T[], predicate, childrenProp, hierarchyMode);

      // Auto-expand ancestors of matching nodes
      if (filtered.length > 0 && hierarchyMode !== 'none') {
        const treeConfig = this.treeTableConfigSignal();
        const customGetKey = treeConfig?.getRowKey;
        const ancestorKeys = collectAncestorKeys(filtered, (row, index) => generateRowKey(row, customGetKey, index), childrenProp);
        if (ancestorKeys.size > 0) {
          // Merge with existing expanded keys
          const current = this.expandedRowKeys();
          const merged = new Set([...current, ...ancestorKeys]);
          if (merged.size !== current.size) {
            this.expandedRowKeys.set(merged);
          }
        }
      }

      return filtered;
    }

    return data.filter(predicate);
  });

  // Apply global search to filtered data (CLIENT-SIDE ONLY)
  // For tree tables: hierarchy-aware search (child match keeps ancestors)
  private readonly globalSearchedDataSignal = computed(() => {
    const data = this.filteredDataSignal(); // Works after column filters
    const searchTerm = this.debouncedSearchTerm();
    const config = this.fieldConfig()?.globalSearch;
    const mode = this.modeSignal();

    // Skip client-side search for cursor/server-side pagination
    if (mode === 'cursor' || !config?.enabled || !searchTerm) return data;

    const searchMode = config.mode ?? 'contains';

    // Build the search predicate
    let searchPredicate: (row: T) => boolean;

    if (config.customSearch) {
      searchPredicate = (row: T) => config.customSearch!(row, searchTerm);
    } else if (searchMode === 'fuzzy') {
      // Fuzzy search doesn't work well with tree filtering, fall through to flat
      return this.performFuzzySearch(data, searchTerm, config);
    } else {
      const caseSensitive = config.caseSensitive ?? false;
      const excludeFields = new Set(config.excludeFields ?? []);
      const searchableFields =
        this.columns()
          ?.map((col) => col.field)
          .filter((f) => !excludeFields.has(f)) ?? [];
      const normalizedSearch = caseSensitive ? searchTerm : searchTerm.toLowerCase();

      searchPredicate = (row: T) => {
        return searchableFields.some((field) => {
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
      };
    }

    // Use hierarchy-aware search for tree tables
    if (this.isTreeTableSignal()) {
      const hierarchyMode = this.filterHierarchyModeSignal();
      const childrenProp = this.childrenPropertySignal();
      const filtered = filterTreeData(data as T[], searchPredicate, childrenProp, hierarchyMode);

      // Auto-expand ancestors of matching nodes
      if (filtered.length > 0 && hierarchyMode !== 'none') {
        const treeConfig = this.treeTableConfigSignal();
        const customGetKey = treeConfig?.getRowKey;
        const ancestorKeys = collectAncestorKeys(filtered, (row, index) => generateRowKey(row, customGetKey, index), childrenProp);
        if (ancestorKeys.size > 0) {
          const current = this.expandedRowKeys();
          const merged = new Set([...current, ...ancestorKeys]);
          if (merged.size !== current.size) {
            this.expandedRowKeys.set(merged);
          }
        }
      }

      return filtered;
    }

    return data.filter(searchPredicate);
  });

  // Sort data - hierarchy-aware for tree tables
  private readonly sortedDataSignal = computed(() => {
    const data = this.globalSearchedDataSignal(); // Use global searched data
    const { field, direction } = this.sortState();

    // Skip sorting if no sort field or direction
    if (!field || !direction) return data;

    const compareFn = (a: T, b: T) =>
      this.compareValues((a as Record<string, unknown>)[field], (b as Record<string, unknown>)[field], direction);

    // Use recursive sort for tree tables
    if (this.isTreeTableSignal()) {
      const childrenProp = this.childrenPropertySignal();
      return sortTreeData(data as T[], compareFn, childrenProp);
    }

    // Use spread to avoid mutating original array
    return [...data].sort(compareFn);
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
    this.treeRowIsLastChildMap.clear();
    this.treeRowAncestorFlagsMap.clear();
    this.treeRowParentKeyMap.clear();
    this.treeKeyToDataMap.clear();

    const flattened = flattenTreeData(data, expandedKeys, (row, index) => generateRowKey(row, customGetKey, index), childrenProp);

    // Populate caches for template access
    for (const item of flattened) {
      this.treeRowLevelMap.set(item.data, item.level);
      this.treeRowKeyMap.set(item.data, item.key);
      this.treeRowHasChildrenMap.set(item.data, item.hasChildren);
      this.treeRowIsLastChildMap.set(item.data, item.isLastChild);
      this.treeRowAncestorFlagsMap.set(item.data, item.ancestorLastFlags);
      this.treeRowParentKeyMap.set(item.key, item.parentKey);
      this.treeKeyToDataMap.set(item.key, item.data);
    }

    return flattened;
  });

  // Get the data for display - either flattened tree data or regular sorted data
  readonly displayDataSignal = computed(() => {
    const flattened = this.flattenedTreeDataSignal();
    if (flattened) {
      return flattened.map((f) => f.data);
    }
    return this.sortedDataSignal();
  });

  // ============================================================================
  // Row Grouping Pipeline
  // ============================================================================
  readonly groupedDataSignal = computed<RowGroup<T>[]>(() => {
    const config = this.groupConfigSignal();
    if (!config?.groupBy) return [];

    const data = this.displayDataSignal();
    const expandedGroups = this.expandedGroups();
    const resolvedGroupAggregates = this.resolvedGroupAggregatesSignal();

    const groups = groupData<T>(
      data,
      config.groupBy,
      config.aggregates as Partial<Record<StringKey<T>, import('./table-aggregates').AggregateFunction>>,
      config.groupSortFn,
      config.groupHeaderLabel,
      config.initiallyExpanded ?? true,
      resolvedGroupAggregates,
    );

    // Apply expansion state: null = not yet initialized (use defaults), Set = explicit user state
    for (const group of groups) {
      group.expanded = expandedGroups === null ? (config.initiallyExpanded ?? true) : expandedGroups.has(group.groupValue);
    }

    return groups;
  });

  /** Flattened display rows for grouped mode: group-header, data, group-footer sentinel rows */
  readonly groupedDisplaySignal = computed<
    Array<
      | { type: 'group-header'; group: RowGroup<T> }
      | { type: 'group-footer'; group: RowGroup<T>; footerRowIndex?: number }
      | { type: 'data'; row: T }
    >
  >(() => {
    const groups = this.groupedDataSignal();
    if (groups.length === 0) return [];

    const config = this.groupConfigSignal();
    const showGroupFooter = config?.showGroupFooter ?? false;
    const hasGroupFooterRows = this.hasGroupFooterRowsSignal();

    const result: Array<
      | { type: 'group-header'; group: RowGroup<T> }
      | { type: 'group-footer'; group: RowGroup<T>; footerRowIndex?: number }
      | { type: 'data'; row: T }
    > = [];
    for (const group of groups) {
      result.push({ type: 'group-header', group });
      if (group.expanded) {
        for (const row of group.rows) {
          result.push({ type: 'data', row });
        }
        if (hasGroupFooterRows && group.resolvedGroupFooterRows) {
          // Emit one display row per group footer row (column-aligned)
          for (let i = 0; i < group.resolvedGroupFooterRows.length; i++) {
            result.push({ type: 'group-footer', group, footerRowIndex: i });
          }
        } else if (showGroupFooter) {
          // Legacy single full-colspan footer
          result.push({ type: 'group-footer', group });
        }
      }
    }
    return result;
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

    // Virtual scroll: return all data (CDK handles viewport)
    if (this.isVirtualScrollSignal()) return data;

    if (mode === 'offset') {
      const start = this.pageIndexSignal() * this.pageSizeSignal();
      const end = start + this.pageSizeSignal();
      return data.slice(start, end);
    }

    // Cursor mode: use display data (client-side sorting on current page)
    return data;
  });

  readonly columnDefsSignal = computed((): ColumnDefinition<T>[] => {
    const cols = this.columns();
    if (cols?.length) return cols;

    const data = this.originalDataSignal();
    if (data.length === 0) return [];

    return Object.keys(data[0]).map((key) => ({
      field: key as Extract<keyof T, string>,
      header: this.formatHeader(key),
    }));
  });

  readonly actionListSignal = computed(() => {
    const actions = this.fieldConfig()?.actions ?? [];

    // Sort actions based on ACTION_ORDER, putting known types first
    const actionOrder: readonly string[] = TableComponent.ACTION_ORDER;
    return actions
      .map((config) => ({
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
      .map((config) => ({
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
    let dataColumns = this.columnDefsSignal().map((c) => c.field);
    const visibilityState = this.columnVisibilityState();

    // Filter columns based on visibility
    dataColumns = dataColumns.filter((field) => {
      if (!this.isColumnVisibilityEnabled()) return true;
      const isVisible = visibilityState.get(field);
      return isVisible !== false;
    });

    // Apply column order override (from column reordering)
    const orderOverride = this.columnOrderOverride();
    if (orderOverride) {
      const ordered: StringKey<T>[] = [];
      for (const col of orderOverride) {
        if ((dataColumns as string[]).includes(col)) ordered.push(col as StringKey<T>);
      }
      // Append any columns not in the override (newly added columns)
      for (const col of dataColumns) {
        if (!(ordered as string[]).includes(col)) ordered.push(col);
      }
      dataColumns = ordered;
    }

    const visibleColumns: string[] = [...dataColumns];

    // Add special columns in order: drag_handle, select, detail_expand, data, actions
    if (this.showExpandColumnSignal()) visibleColumns.unshift('__detail_expand');
    if (this.hasSelectionSignal()) visibleColumns.unshift('select');
    if (this.showDragHandleColumnSignal()) visibleColumns.unshift('__drag_handle');
    if (this.hasActionsSignal()) visibleColumns.push('actions');

    return visibleColumns;
  });

  // Ordered column defs respecting column reorder
  readonly orderedColumnDefsSignal = computed(() => {
    const cols = this.columnDefsSignal();
    const orderOverride = this.columnOrderOverride();
    if (!orderOverride) return cols;

    const colMap = new Map(cols.map((c) => [c.field, c]));
    const ordered: ColumnDefinition<T>[] = [];
    for (const field of orderOverride) {
      const col = colMap.get(field as StringKey<T>);
      if (col) ordered.push(col);
    }
    // Append any not in override
    for (const col of cols) {
      if (!ordered.includes(col)) ordered.push(col);
    }
    return ordered;
  });

  readonly isAllSelected = computed(() => {
    const data = this.currentDataSignal(); // Use current page data for "select all"
    const selected = this.selectedSignal();
    return data.length > 0 && data.every((row) => selected.has(row));
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

  /**
   * Tracks the controller this component is currently attached to.
   * Used to detach from the previous controller if `[config]` changes identity at runtime.
   */
  private attachedConfig: FieldConfiguration<T> | null = null;

  constructor() {
    this.dataSource = new SignalDataSource(this.currentDataSignal);
    this.setupEffects();

    // Re-attach when the bound [config] identity changes (e.g. swap controllers at runtime).
    effect(() => {
      const next = this.config();
      const prev = this.attachedConfig;
      if (next === prev) return;
      if (prev) _detachTableInstance(prev, this);
      if (next) _attachTableInstance(next, this);
      this.attachedConfig = next ?? null;
    });
  }

  ngAfterViewInit(): void {
    // First attach. The constructor effect has likely already attached at creation time,
    // but if [config] was set after view init (rare), this covers that case.
    const cfg = this.config();
    if (cfg && this.attachedConfig !== cfg) {
      _attachTableInstance(cfg, this);
      this.attachedConfig = cfg;
    }
  }

  ngOnDestroy(): void {
    // Clean up debounce timeout to prevent memory leaks
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }

    // Detach from the controller so controller.instances() stays accurate.
    if (this.attachedConfig) {
      _detachTableInstance(this.attachedConfig, this);
      this.attachedConfig = null;
    }
  }

  firstPage(): void {
    if (this.pageIndexSignal() > 0 && !this.disabled()) {
      this.updatePagination({ pageIndex: 0, pageSize: this.pageSizeSignal() });
    }
  }

  previousPage(): void {
    if (this.pageIndexSignal() > 0 && !this.disabled()) {
      this.updatePagination({ pageIndex: this.pageIndexSignal() - 1, pageSize: this.pageSizeSignal() });
    }
  }

  nextPage(): void {
    const lastPage = this.totalPagesSignal() - 1;
    if (this.pageIndexSignal() < lastPage && !this.disabled()) {
      this.updatePagination({ pageIndex: this.pageIndexSignal() + 1, pageSize: this.pageSizeSignal() });
    }
  }

  lastPage(): void {
    const lastPage = this.totalPagesSignal() - 1;
    if (this.pageIndexSignal() < lastPage && !this.disabled()) {
      this.updatePagination({ pageIndex: lastPage, pageSize: this.pageSizeSignal() });
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

  private updatePagination(options: { pageIndex: number; pageSize: number }): void {
    this.paginationState.update((state) => ({
      ...state,
      pageIndex: options.pageIndex,
      pageSize: options.pageSize,
    }));

    this.pageChange.emit(options);
  }

  // Enhanced sort method with server-side support
  sort(field: string): void {
    if (this.isResizingSignal()) return; // Skip sort while resizing
    const currentSort = this.sortState();
    const newDirection = this.calculateNewSortDirection(field, currentSort);
    const newSortState: SortState = {
      field: newDirection ? field : '',
      direction: newDirection,
    };

    // Update sort state
    this.sortState.set(newSortState);

    this.emitSortEvents(newSortState);

    // Reset to first page for offset mode (client-side sorting)
    if (this.modeSignal() === 'offset') {
      this.firstPage();
    }
  }

  classesFor({ key, config }: ActionItem<T> | BulkActionItem<T>): string {
    const baseClass = TableComponent.ACTION_CLASSES[key] || TableComponent.DEFAULT_ACTION_CLASS;
    const configClass = config.buttonClass || '';
    const transitionClasses = 'transition-colors duration-200';
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
    this.openBulkActionDropdown.set(null);

    // Built-in CSV/JSON export when using default export options
    if (bulkAction.key === 'export' && bulkAction.config.useDefaultExportOptions !== false) {
      if (option.value === 'csv') {
        exportToCsv(this.displayDataSignal() as readonly (T & object)[], this.orderedColumnDefsSignal());
        return;
      }
      if (option.value === 'json') {
        exportToJson(this.displayDataSignal() as readonly (T & object)[], this.orderedColumnDefsSignal());
        return;
      }
    }

    bulkAction.config.action(this.selectedArraySignal(), option);
  }

  toggleRow(row: T, checked: boolean): void {
    const cascade = this.checkboxCascadeSignal();

    this.selectedSignal.update((selectedSet) => {
      const newSet = new Set(selectedSet);
      if (checked) {
        newSet.add(row);
      } else {
        newSet.delete(row);
      }

      // Cascade selection in tree mode
      if (cascade !== 'none' && this.isTreeTableSignal()) {
        const childrenProp = this.childrenPropertySignal();

        // Downward cascade: select/deselect all descendants
        if (cascade === 'downward' || cascade === 'both') {
          this.cascadeDown(row, checked, newSet, childrenProp);
        }

        // Upward cascade: auto-check parent if all siblings are checked
        if (cascade === 'upward' || cascade === 'both') {
          this.cascadeUp(row, newSet, childrenProp);
        }
      }

      return newSet;
    });

    this.selectionChange.emit([...this.selectedSignal()]);
  }

  toggleSelectAll(checked: boolean): void {
    const data = this.currentDataSignal(); // Only select/deselect current page

    this.selectedSignal.update((selectedSet) => {
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
    const config = this.fieldConfig();
    const rowClassFn = config?.rowClass;
    const isActive = this.activeRow() === row || this.activeRows().has(row);
    const activeClass = config?.selectedRowClass ?? 'bg-primary/10';
    return {
      'bg-base-200': this.isSelected(row),
      [activeClass]: isActive,
      ...(rowClassFn ? rowClassFn(row) : {}),
    };
  }

  // Handler methods for pagination component
  handlePaginationPageChange(event: PageSizeChange): void {
    this.paginationState.update((state) => ({
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
    // Close any open filter popovers
    if (this.isBrowser) {
      this.elementRef.nativeElement.querySelectorAll('[id^="filter-popover-"][popover]').forEach((el: HTMLElement) => el.hidePopover?.());
    }
  }

  isFilterOpen(field: string): boolean {
    return this.openFilterField() === field;
  }

  getFilterForColumn(field: string): ColumnFilter<T> | undefined {
    return this.columnFiltersMapSignal().get(field);
  }

  getActiveFilterForColumn(field: string): FilterConfig<T> | undefined {
    return this.filterState().find((f) => f.field === field);
  }

  hasFilterForColumn(field: string): boolean {
    return this.columnFiltersMapSignal().has(field);
  }

  applyColumnFilter(field: string, value: unknown, operator: FilterOperator): void {
    const filterConfig = this.columnFiltersMapSignal().get(field);
    if (!filterConfig) return;

    // Remove existing filter for this field
    const filters = this.filterState().filter((f) => f.field !== field);

    // Add new filter if value is not empty. Treat empty arrays AND arrays of only
    // empty/null entries (e.g. ['', ''] from an untouched date-range UI) as empty so
    // clearing a range input actually clears the filter instead of leaving an active
    // filter with NaN bounds that excludes every row.
    const isEmpty =
      value == null || value === '' || (Array.isArray(value) && (value.length === 0 || value.every((v) => v == null || v === '')));

    if (!isEmpty) {
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

    this.filterChange.emit({
      field,
      value,
      operator,
      filters: this.filterState(),
    });
  }

  removeFilter(field: string): void {
    const filters = this.filterState().filter((f) => f.field !== field);
    this.filterState.set(filters);

    // Reset to first page
    this.firstPage();

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
    const allColumns = this.columnDefsSignal().map((c) => c.field);
    const visibleCount = allColumns.filter((f) => this.isColumnVisible(f)).length;
    if (visibleCount === 1 && currentState) {
      return; // Keep at least one column visible
    }

    this.columnVisibilityState.update((state) => {
      const newState = new Map(state);
      newState.set(field, !currentState);
      return newState;
    });

    // Save to localStorage if enabled
    this.saveColumnVisibilityToStorage();
  }

  showAllColumns(): void {
    const allColumns = this.columnDefsSignal().map((c) => c.field);
    this.columnVisibilityState.update((state) => {
      const newState = new Map(state);
      allColumns.forEach((field) => newState.set(field, true));
      return newState;
    });
    this.saveColumnVisibilityToStorage();
  }

  hideAllColumns(): void {
    const allColumns = this.columnDefsSignal().map((c) => c.field);
    const alwaysVisible = this.alwaysVisibleColumns();

    // Keep at least one column visible (first non-always-visible column or first column)
    const firstColumn = allColumns.find((f) => !alwaysVisible.has(f)) || allColumns[0];

    this.columnVisibilityState.update((state) => {
      const newState = new Map(state);
      allColumns.forEach((field) => {
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
      const allColumns = this.columnDefsSignal().map((c) => c.field);
      this.columnVisibilityState.update((state) => {
        const newState = new Map(state);
        allColumns.forEach((field) => {
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

  // ============================================================================
  // Tree Table Methods
  // ============================================================================

  hasChildren(row: T): boolean {
    return this.treeRowHasChildrenMap.get(row) ?? false;
  }

  isRowExpanded(row: T): boolean {
    const key = this.treeRowKeyMap.get(row);
    if (!key) return false;
    return this.expandedRowKeys().has(key);
  }

  /** 0 = root level */
  getRowLevel(row: T): number {
    return this.treeRowLevelMap.get(row) ?? 0;
  }

  getRowIndentPadding(row: T): number {
    const level = this.getRowLevel(row);
    const indentSize = this.treeIndentSizeSignal();
    // Add base padding (8px) + level-based indent
    return 8 + level * indentSize;
  }

  toggleRowExpand(row: T, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    const key = this.treeRowKeyMap.get(row);
    if (!key) return;

    const currentExpanded = this.expandedRowKeys();
    const isCurrentlyExpanded = currentExpanded.has(key);

    // When expanding, collect child keys for animation
    if (!isCurrentlyExpanded) {
      const childrenProp = this.childrenPropertySignal();
      const children = getRowChildren(row, childrenProp);
      if (children && children.length > 0) {
        const treeConfig = this.treeTableConfigSignal();
        const customGetKey = treeConfig?.getRowKey;
        const childKeys = new Set<string>();
        children.forEach((child, idx) => {
          childKeys.add(generateRowKey(child, customGetKey, idx));
        });
        this.treeAnimatingKeys.set(childKeys);
        setTimeout(() => this.treeAnimatingKeys.set(new Set()), 250);
      }
    }

    this.expandedRowKeys.update((keys) => {
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

  expandAllRows(): void {
    const allKeys = new Set<string>();
    this.collectAllRowKeys(this.originalDataSignal(), allKeys);
    this.expandedRowKeys.set(allKeys);
  }

  collapseAllRows(): void {
    this.expandedRowKeys.set(new Set());
  }

  expandToLevel(level: number): void {
    const allKeys = new Set<string>();
    this.collectKeysToLevel(this.originalDataSignal(), allKeys, 0, level);
    this.expandedRowKeys.set(allKeys);
  }

  collapseToLevel(level: number): void {
    const keysToKeep = new Set<string>();
    this.collectKeysToLevel(this.originalDataSignal(), keysToKeep, 0, level);
    this.expandedRowKeys.set(keysToKeep);
  }

  isTreeColumn(field: string): boolean {
    return this.treeColumnFieldSignal() === field;
  }

  getAncestorFlags(row: T): boolean[] {
    return this.treeRowAncestorFlagsMap.get(row) ?? [];
  }

  isLastChild(row: T): boolean {
    return this.treeRowIsLastChildMap.get(row) ?? false;
  }

  isTreeRowAnimating(row: T): boolean {
    const key = this.treeRowKeyMap.get(row);
    if (!key) return false;
    return this.treeAnimatingKeys().has(key);
  }

  isIndeterminate(row: T): boolean {
    const cascade = this.checkboxCascadeSignal();
    if (cascade === 'none') return false;
    if (!this.hasChildren(row)) return false;

    const childrenProp = this.childrenPropertySignal();
    const children = getRowChildren(row, childrenProp);
    if (!children || children.length === 0) return false;

    const selected = this.selectedSignal();
    let someSelected = false;
    let allSelected = true;

    for (const child of children) {
      if (selected.has(child)) {
        someSelected = true;
      } else {
        allSelected = false;
      }
    }

    return someSelected && !allSelected;
  }

  /** Get the rendered cell HTML for use in tree-cell-content */
  getCellDisplay(row: T, column: ColumnDefinition<T>): string {
    const sync = this.getCellDisplaySync(row, column);
    if (sync) {
      return sync.isHtml ? (sync.safeHtml as string) : sync.value;
    }
    return '';
  }

  private collectKeysToLevel(data: readonly T[], keys: Set<string>, currentLevel: number, targetLevel: number): void {
    if (currentLevel >= targetLevel) return;
    const treeConfig = this.treeTableConfigSignal();
    const childrenProp = treeConfig?.childrenProperty ?? 'children';
    const customGetKey = treeConfig?.getRowKey;

    data.forEach((row, index) => {
      const key = generateRowKey(row, customGetKey, index);
      const children = getRowChildren(row, childrenProp);

      if (children && children.length > 0) {
        keys.add(key);
        this.collectKeysToLevel(children, keys, currentLevel + 1, targetLevel);
      }
    });
  }

  private cascadeDown(row: T, checked: boolean, set: Set<T>, childrenProp: string): void {
    const children = getRowChildren(row, childrenProp);
    if (!children) return;
    for (const child of children) {
      if (checked) {
        set.add(child);
      } else {
        set.delete(child);
      }
      this.cascadeDown(child, checked, set, childrenProp);
    }
  }

  private cascadeUp(row: T, set: Set<T>, childrenProp: string): void {
    const key = this.treeRowKeyMap.get(row);
    if (!key) return;
    const parentKey = this.treeRowParentKeyMap.get(key);
    if (!parentKey) return;
    const parentRow = this.treeKeyToDataMap.get(parentKey);
    if (!parentRow) return;

    const siblings = getRowChildren(parentRow, childrenProp);
    if (!siblings) return;

    const allSiblingsSelected = siblings.every((s) => set.has(s));
    if (allSiblingsSelected) {
      set.add(parentRow);
    } else {
      set.delete(parentRow);
    }

    // Continue cascading up
    this.cascadeUp(parentRow, set, childrenProp);
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

  // ============================================================================
  // Sticky Column Methods
  // ============================================================================

  isStickyStart(field: string): boolean {
    if (field === 'select') return this.stickySelectionSignal();
    return this.stickyStartColumnsSignal().has(field);
  }

  isStickyEnd(field: string): boolean {
    if (field === 'actions') return this.stickyActionsSignal();
    return this.stickyEndColumnsSignal().has(field);
  }

  // ============================================================================
  // Column Resizing Methods
  // ============================================================================

  getColumnWidth(field: string): number | null {
    return this.columnWidthsSignal().get(field) ?? null;
  }

  onResizeStart(field: string, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.target as HTMLElement).closest('th');
    if (!th) return;

    this.isResizingSignal.set(true);
    this.resizeState = { field, startX: event.clientX, startWidth: th.offsetWidth };

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onResizeMove(event: PointerEvent): void {
    if (!this.resizeState) return;

    const { field, startX, startWidth } = this.resizeState;
    const diff = event.clientX - startX;
    let newWidth = Math.max(startWidth + diff, 50); // minimum 50px

    // Enforce column min/max from column definition
    const col = this.columnDefsSignal().find((c) => c.field === field);
    if (col?.minWidth) newWidth = Math.max(newWidth, col.minWidth);
    if (col?.maxWidth) newWidth = Math.min(newWidth, col.maxWidth);

    this.columnWidthsSignal.update((m) => {
      const newMap = new Map(m);
      newMap.set(field, newWidth);
      return newMap;
    });
  }

  onResizeEnd(): void {
    if (!this.resizeState) return;

    const { field, startWidth } = this.resizeState;
    const newWidth = this.columnWidthsSignal().get(field) ?? startWidth;

    this.columnResize.emit({ field, width: newWidth, previousWidth: startWidth });
    this.resizeState = null;
    this.isResizingSignal.set(false);
  }

  // ============================================================================
  // Inline Cell Editing Methods
  // ============================================================================

  startEdit(row: T, field: string): void {
    if (!this.enableEditingSignal()) return;
    const col = this.columnDefsSignal().find((c) => c.field === field);
    if (!col?.editable) return;

    this.editingCell.set({ row, field });
    this.editingValue.set(row[field as keyof T]);
    this.editError.set(null);
  }

  confirmEdit(): void {
    const cell = this.editingCell();
    if (!cell) return;

    const { row, field } = cell;
    const newValue = this.editingValue();
    const col = this.columnDefsSignal().find((c) => c.field === field);

    // Run validator if present
    if (col?.editValidator) {
      const result = col.editValidator(newValue, row);
      if (result !== true) {
        const errorMsg = typeof result === 'string' ? result : 'Invalid value';
        this.editError.set(errorMsg);
        this.cellEditError.emit({ row, field, value: newValue, error: errorMsg });
        return;
      }
    }

    const oldValue = row[field as keyof T];
    this.cellEdit.emit({ row, field, oldValue, newValue });

    this.editingCell.set(null);
    this.editingValue.set(null);
    this.editError.set(null);
  }

  cancelEdit(): void {
    const cell = this.editingCell();
    if (cell) {
      this.cellEditCancel.emit({ row: cell.row, field: cell.field });
    }
    this.editingCell.set(null);
    this.editingValue.set(null);
    this.editError.set(null);
  }

  isEditing(row: T, field: string): boolean {
    const cell = this.editingCell();
    return cell?.row === row && cell?.field === field;
  }

  getEditorType(column: ColumnDefinition<T>): string {
    return column.editType ?? 'text';
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  // ============================================================================
  // Summary Footer Row Methods
  // ============================================================================

  getFooterValue(column: ColumnDefinition<T>): string {
    if (!column.footer) return '';
    const data = this.displayDataSignal();
    const result = column.footer(data);
    return String(result);
  }

  getFooterRowCellValue(row: ResolvedFooterRow<T>, column: ColumnDefinition<T>): string {
    const fn = row.cells[column.field];
    if (!fn) return '';
    return fn(this.displayDataSignal());
  }

  /**
   * Column name sets for CDK multi-row footer.
   * Each footer row gets its own prefixed column set (e.g. '__fr0_salary', '__fr1_salary')
   * so CDK renders each row with its own cdkFooterCellDef — different content per row.
   */
  readonly footerColumnSets = computed(() => {
    const rows = this.resolvedFooterRowsSignal();
    if (!rows.length) return [];
    const baseCols = this.displayedColumnsSignal();
    return rows.map((row, i) => {
      // Colspan rows use a single synthetic column spanning full width
      if (row.colspanCells) return [`__cfr${i}`];
      // Column-aligned rows use prefixed columns
      return baseCols.map((col) => `__fr${i}_${col}`);
    });
  });

  /** Look up the footer aggregate value for a given footer row + base column name. */
  getFooterCellValueForCol(rowIdx: number, baseCol: string): string {
    const footerRow = this.resolvedFooterRowsSignal()[rowIdx];
    if (!footerRow || footerRow.colspanCells) return ''; // colspan rows handled differently
    const column = this.orderedColumnDefsSignal().find((c) => c.field === baseCol);
    if (!column) return ''; // Special column (select, actions, etc.) — empty cell
    return this.getFooterRowCellValue(footerRow, column);
  }

  /** Get the display value for a colspan footer cell. */
  getColspanCellValue(cell: ResolvedColspanCell): string {
    return cell.valueFn(this.displayDataSignal());
  }

  /** Get the display value for a colspan footer cell within a group. */
  getGroupColspanCellValue(cell: ResolvedColspanCell, group: RowGroup<T>): string {
    return cell.valueFn(group.rows);
  }

  // ============================================================================
  // Expandable Row Detail Methods
  // ============================================================================

  isDetailExpanded(row: T): boolean {
    return this.expandedDetailRows().has(row);
  }

  toggleDetailExpand(row: T, event?: MouseEvent): void {
    if (event) event.stopPropagation();

    const mode = this.expandModeSignal();
    const isExpanded = this.expandedDetailRows().has(row);

    this.expandedDetailRows.update((set) => {
      const newSet = mode === 'single' ? new Set<T>() : new Set(set);
      if (isExpanded) {
        newSet.delete(row);
      } else {
        newSet.add(row);
      }
      return newSet;
    });

    this.detailExpansionChange.emit({ row, expanded: !isExpanded });
  }

  expandAllDetails(): void {
    const data = this.currentDataSignal();
    this.expandedDetailRows.set(new Set(data));
  }

  collapseAllDetails(): void {
    this.expandedDetailRows.set(new Set());
  }

  // ============================================================================
  // Hierarchy Grid (Child Grid) Methods
  // ============================================================================

  getChildGridData(row: T): readonly unknown[] {
    const cfg = this.childGridConfigSignal();
    if (!cfg) return [];
    if (cfg.childDataFn) return cfg.childDataFn(row);
    if (cfg.childDataProperty) return ((row as Record<string, unknown>)[cfg.childDataProperty] as unknown[]) ?? [];
    return [];
  }

  getChildGridContainerClass(): string {
    const cfg = this.childGridConfigSignal();
    const bordered = cfg?.bordered !== false;
    return ['child-grid-wrapper', bordered ? 'child-grid-bordered' : '', cfg?.containerClass ?? ''].filter(Boolean).join(' ');
  }

  // ============================================================================
  // Master-Detail Grid Methods
  // ============================================================================

  onRowClick(row: T): void {
    this.rowClick.emit(row);
    const mode = this.selectableRowsModeSignal();
    if (mode === 'single') {
      const current = this.activeRow();
      this.activeRow.set(current === row ? null : row);
      this.activeRowChange.emit(this.activeRow());
    } else if (mode === 'multi') {
      this.activeRows.update((set) => {
        const next = new Set(set);
        if (next.has(row)) {
          next.delete(row);
        } else {
          next.add(row);
        }
        return next;
      });
      this.activeRowChange.emit(row);
      this.activeRowsChange.emit([...this.activeRows()]);
    }
    if (this.hasMasterDetailSignal()) {
      this.masterDetailSelectedRow.set(row);
      this.masterDetailRowChange.emit(row);
    }
  }

  isMasterDetailSelected(row: T): boolean {
    return this.masterDetailSelectedRow() === row;
  }

  // ============================================================================
  // Keyboard Navigation Methods
  // ============================================================================

  getCellId(rowIndex: number, colIndex: number): string {
    return `cell-${rowIndex}-${colIndex}`;
  }

  getActiveCellId(): string | null {
    const cell = this.activeCellSignal();
    if (!cell) return null;
    return this.getCellId(cell[0], cell[1]);
  }

  onTableKeydown(event: KeyboardEvent): void {
    if (!this.enableKeyboardNavSignal()) return;

    const cell = this.activeCellSignal();
    if (!cell && !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    const data = this.currentDataSignal();
    const cols = this.displayedColumnsSignal();
    const maxRow = data.length - 1;
    const maxCol = cols.length - 1;

    let [row, col] = cell ?? [0, 0];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        row = Math.min(row + 1, maxRow);
        break;
      case 'ArrowUp':
        event.preventDefault();
        row = Math.max(row - 1, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        col = Math.min(col + 1, maxCol);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        col = Math.max(col - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        col = 0;
        if (event.ctrlKey) row = 0;
        break;
      case 'End':
        event.preventDefault();
        col = maxCol;
        if (event.ctrlKey) row = maxRow;
        break;
      case 'Enter': {
        event.preventDefault();
        const colName = cols[col];
        const rowData = data[row];
        if (rowData) {
          // Toggle expand if on expand column
          if (colName === '__detail_expand') {
            this.toggleDetailExpand(rowData);
          } else if (colName !== 'select' && colName !== 'actions' && colName !== '__drag_handle') {
            // Start edit if editable
            this.startEdit(rowData, colName);
          }
        }
        break;
      }
      case ' ':
        event.preventDefault();
        if (cell && data[row]) {
          const colName = cols[col];
          if (colName === 'select' || this.hasSelectionSignal()) {
            this.toggleRow(data[row], !this.isSelected(data[row]));
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.activeCellSignal.set(null);
        return;
      default:
        return;
    }

    this.activeCellSignal.set([row, col]);
    // Scroll active cell into view
    requestAnimationFrame(() => {
      const id = this.getCellId(row, col);
      const el = this.elementRef.nativeElement.querySelector(`#${id}`);
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  isActiveCell(rowIndex: number, colIndex: number): boolean {
    const cell = this.activeCellSignal();
    if (!cell) return false;
    return cell[0] === rowIndex && cell[1] === colIndex;
  }

  /** Focus the host and set active cell when a cell is clicked (keyboard nav). */
  onCellClick(rowIndex: number, colIndex: number): void {
    if (!this.enableKeyboardNavSignal()) return;
    this.activeCellSignal.set([rowIndex, colIndex]);
    this.elementRef.nativeElement.focus();
  }

  // ============================================================================
  // Column Reordering (Native HTML5 Drag)
  // ============================================================================

  onColumnDragStart(field: string, event: DragEvent): void {
    if (!this.enableColumnReorderSignal()) return;
    this.draggedColumnField.set(field);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', field);
    }
  }

  onColumnDragOver(field: string, event: DragEvent): void {
    if (!this.enableColumnReorderSignal() || !this.draggedColumnField()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverColumnField.set(field);
  }

  onColumnDragLeave(): void {
    this.dragOverColumnField.set(null);
  }

  onColumnDrop(field: string, event: DragEvent): void {
    event.preventDefault();
    const fromField = this.draggedColumnField();
    this.draggedColumnField.set(null);
    this.dragOverColumnField.set(null);

    if (!fromField || fromField === field) return;

    const cols = [...this.displayedColumnsSignal()];
    const specialCols = new Set(['select', '__detail_expand', '__drag_handle', 'actions']);
    const dataCols = cols.filter((c) => !specialCols.has(c));

    const fromIdx = dataCols.indexOf(fromField);
    const toIdx = dataCols.indexOf(field);
    if (fromIdx === -1 || toIdx === -1) return;

    moveItemInArray(dataCols, fromIdx, toIdx);
    this.columnOrderOverride.set(dataCols);

    this.columnReorder.emit({
      previousIndex: fromIdx,
      currentIndex: toIdx,
      columns: dataCols,
    });
  }

  onColumnDragEnd(): void {
    this.draggedColumnField.set(null);
    this.dragOverColumnField.set(null);
  }

  // ============================================================================
  // Row Reordering (Native HTML5 Drag)
  // ============================================================================

  onRowDragStart(row: T, event: DragEvent): void {
    if (!this.enableRowReorderSignal()) return;
    this.draggedRow.set(row);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    }
    (event.target as HTMLElement).classList.add('dragging');
  }

  onRowDragOver(row: T, event: DragEvent): void {
    if (!this.enableRowReorderSignal() || !this.draggedRow()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const data = this.currentDataSignal();
    this.dragOverRowIndex.set(data.indexOf(row));
  }

  onRowDrop(row: T, event: DragEvent): void {
    event.preventDefault();
    const sourceRow = this.draggedRow();
    this.draggedRow.set(null);
    this.dragOverRowIndex.set(null);

    if (!sourceRow || sourceRow === row) return;

    const data = this.currentDataSignal();
    const fromIdx = data.indexOf(sourceRow);
    const toIdx = data.indexOf(row);
    if (fromIdx === -1 || toIdx === -1) return;

    this.rowReorder.emit({
      row: sourceRow,
      previousIndex: fromIdx,
      currentIndex: toIdx,
      data,
    });
  }

  onRowDragEnd(event: DragEvent): void {
    this.draggedRow.set(null);
    this.dragOverRowIndex.set(null);
    (event.target as HTMLElement).classList.remove('dragging');
  }

  // ============================================================================
  // Row Grouping Methods
  // ============================================================================

  toggleGroupExpand(groupValue: unknown): void {
    const groups = this.groupedDataSignal();
    const group = groups.find((g) => g.groupValue === groupValue);
    if (!group) return;

    const wasExpanded = group.expanded;

    this.expandedGroups.update((set) => {
      // Lazy-initialize: if null (never interacted), populate from current state
      let newSet: Set<unknown>;
      if (set === null) {
        // First interaction: populate set based on current expanded state of all groups
        newSet = new Set(groups.filter((g) => g.expanded).map((g) => g.groupValue));
      } else {
        newSet = new Set(set);
      }

      if (wasExpanded) {
        newSet.delete(groupValue);
      } else {
        newSet.add(groupValue);
      }
      return newSet;
    });

    this.groupExpandChange.emit({ groupValue, expanded: !wasExpanded });
  }

  expandAllGroups(): void {
    const groups = this.groupedDataSignal();
    this.expandedGroups.set(new Set(groups.map((g) => g.groupValue)));
  }

  collapseAllGroups(): void {
    this.expandedGroups.set(new Set());
  }

  getGroupAggregateValue(group: RowGroup<T>, field: string): string {
    const val = group.aggregates[field];
    return val != null ? String(Math.round(val * 100) / 100) : '';
  }

  getGroupCaptionValue(group: RowGroup<T>, field: string): string {
    const fn = group.resolvedCaptionCells?.[field as StringKey<T>];
    if (!fn) return '';
    return fn(group.rows);
  }

  getGroupFooterRowCellValue(group: RowGroup<T>, footerRowIndex: number, column: ColumnDefinition<T>): string {
    const footerRow = group.resolvedGroupFooterRows?.[footerRowIndex];
    if (!footerRow) return '';
    const fn = footerRow.cells[column.field];
    if (!fn) return '';
    return fn(group.rows);
  }

  private saveColumnVisibilityToStorage(): void {
    const config = this.columnVisibilityConfig();
    const storageKey = config?.storageKey;

    if (!storageKey) return;
    if (!this.hasLocalStorage) return;

    const visibilityState = this.columnVisibilityState();
    const visibilityObj: Record<string, boolean> = {};

    visibilityState.forEach((visible, field) => {
      visibilityObj[field] = visible;
    });

    // Defer write to avoid blocking the main thread
    queueMicrotask(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(visibilityObj));
      } catch {}
    });
  }

  private loadColumnVisibilityFromStorage(): void {
    const config = this.columnVisibilityConfig();
    const storageKey = config?.storageKey;

    if (!storageKey) return;
    if (!this.hasLocalStorage) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const visibilityObj: Record<string, boolean> = JSON.parse(stored);
        this.columnVisibilityState.update((state) => {
          const newState = new Map(state);
          Object.entries(visibilityObj).forEach(([field, visible]) => {
            newState.set(field, visible);
          });
          return newState;
        });
      }
    } catch {}
  }

  // Private methods
  private setupEffects(): void {
    // Note: group expansion initialization is handled lazily.
    // expandedGroups starts as null (uninitialized). groupedDataSignal treats
    // null as "use defaults" (initiallyExpanded). On first user interaction,
    // toggleGroupExpand populates the Set from current state. An empty Set
    // means "all collapsed" (not "all expanded").

    // Initialize column visibility (use untracked for reads that would cause re-trigger)
    effect(() => {
      const config = this.columnVisibilityConfig();
      if (config?.enabled) {
        // Try to load from localStorage first
        this.loadColumnVisibilityFromStorage();

        // If nothing was loaded and there are default visible columns, set them
        const visibilityState = untracked(() => this.columnVisibilityState());
        if (visibilityState.size === 0 && config.defaultVisible && config.defaultVisible.length > 0) {
          const allColumns = untracked(() => this.columnDefsSignal()).map((c) => c.field);
          this.columnVisibilityState.update((state) => {
            const newState = new Map(state);
            allColumns.forEach((field) => {
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
        // Precedence: expandAll > initialExpandLevel > initialExpandedKeys
        if (treeConfig.expandAll) {
          // Expand all on next tick to allow data to be loaded first
          setTimeout(() => this.expandAllRows(), 0);
        } else if (treeConfig.initialExpandLevel != null && treeConfig.initialExpandLevel > 0) {
          setTimeout(() => this.expandToLevel(treeConfig.initialExpandLevel!), 0);
        } else if (treeConfig.initialExpandedKeys && treeConfig.initialExpandedKeys.length > 0) {
          this.expandedRowKeys.set(new Set(treeConfig.initialExpandedKeys));
        }
      }
    });

    // Initialize pagination state from options
    effect(() => {
      const options = this.paginationOptions();
      if (options) {
        this.paginationState.update((state) => ({
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
      this.htmlCache.clear();
      this.paginationState.update((state) => ({
        ...state,
        pageIndex: 0,
        totalItems: this.totalItemsSignal(),
      }));
      this.selectedSignal.set(new Set());
    });

    // Update total items when it changes
    effect(() => {
      const totalItems = this.totalItemsSignal();
      this.paginationState.update((state) => ({
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

    // Master-Detail: auto-select first row when data changes
    effect(() => {
      const data = this.currentDataSignal();
      const cfg = this.masterDetailConfigSignal();
      if (!cfg) return;

      const autoSelect = cfg.autoSelectFirst !== false;
      const currentSelection = untracked(() => this.masterDetailSelectedRow());

      if (data.length === 0) {
        if (currentSelection !== null) {
          this.masterDetailSelectedRow.set(null);
        }
        return;
      }

      // Re-select if current selection is no longer in data, or auto-select first
      if (autoSelect && (currentSelection === null || !data.includes(currentSelection))) {
        this.masterDetailSelectedRow.set(data[0]);
        this.masterDetailRowChange.emit(data[0]);
      }
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
    const value = row[column.field];
    let formatted$: Observable<string>;

    if (column.format) {
      const result = column.format(value, row);
      formatted$ = isObservable(result) ? result : of(result || (column.fallback ?? '—'));
    } else {
      formatted$ = of(value || value === 0 ? String(value) : (column.fallback ?? '—'));
    }

    return formatted$.pipe(
      map((v) => {
        const html = this.isHtml(v);
        return { value: v, isHtml: html, safeHtml: html ? this.sanitizeHtml(v) : null };
      }),
    );
  }

  private isHtml(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    if (!value.includes('<') || !value.includes('>')) return false;

    const cached = this.htmlCache.get(value);
    if (cached !== undefined) return cached;

    if (!this.htmlParser) return false;
    const doc = this.htmlParser.parseFromString(value, 'text/html');
    const result = doc.body.children.length > 0 && doc.querySelector('parsererror') === null;
    this.htmlCache.set(value, result);
    return result;
  }

  private sanitizeHtml(value: string): SafeHtml {
    return this.sanitizer.sanitize(1, value) || '';
  }

  private formatHeader(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
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
        ?.map((col) => col.field)
        .filter((f) => !excludeFields.has(f)) ?? [];

    // If no searchable fields, return empty
    if (searchableFields.length === 0) return [];

    // Build Fuse.js configuration
    const fuseOptions: IFuseOptions<T> = {
      ...this.defaultFuseConfig,
      keys: searchableFields.map((field) => String(field)),
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
    return results.map((result) => result.item);
  }

  // Apply a single filter to a row
  private applyFilter(row: T, filter: FilterConfig<T>): boolean {
    const value = row[filter.field];
    const filterValue = filter.value;

    // Explicit empty checks first — independent of value nullity
    if (filter.operator === 'isEmpty') {
      return value == null || value === '';
    }
    if (filter.operator === 'isNotEmpty') {
      return value != null && value !== '';
    }

    // Null-value semantics: "not" operators match null rows (null is not equal to /
    // does not contain / is not in anything). Other operators filter nulls out.
    if (value == null) {
      return filter.operator === 'notEquals' || filter.operator === 'notContains' || filter.operator === 'notIn';
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
        return Array.isArray(filterValue) ? filterValue.includes(value) : false;

      case 'notIn':
        // Aligned with `in` — malformed (non-array) filter value fails closed.
        return Array.isArray(filterValue) ? !filterValue.includes(value) : false;

      case 'between': {
        if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
        const [a, b] = filterValue as [unknown, unknown];

        // Date range: parse both sides via Date so ISO strings compare correctly.
        // (Number('2025-01-15') is NaN, so the old number-only logic silently
        // excluded every row whenever a date range was applied.)
        if (filter.type === 'dateRange') {
          const t = new Date(value as string | number | Date).getTime();
          if (isNaN(t)) return false;
          const lo = a != null && a !== '' ? new Date(a as string | number | Date).getTime() : -Infinity;
          const hi = b != null && b !== '' ? new Date(b as string | number | Date).getTime() : Infinity;
          return t >= lo && t <= hi;
        }

        // Numeric range (numberRange or legacy usage). Partial ranges are allowed:
        // missing low bound → -Infinity; missing high bound → +Infinity.
        const n = Number(value);
        if (isNaN(n)) return false;
        const lo = a != null && a !== '' ? Number(a) : -Infinity;
        const hi = b != null && b !== '' ? Number(b) : Infinity;
        return n >= lo && n <= hi;
      }

      default:
        return true;
    }
  }
}
