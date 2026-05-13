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
import { IFuseOptions } from 'fuse.js';
import { createFuseCache, FuseCache } from '../../utils/fuse-cache';
import { HK_THEME } from '../../theme/theme.config';

import { AutoFocusDirective } from '../../directives';
import { HkCellTemplateDirective } from './table-cell-template.directive';
import { HkFooterDirective } from './table-footer-template.directive';

import {
  LucideDynamicIcon,
  LucideListFilter,
  LucideX,
  LucideCheckCheck,
  LucideChevronDown,
  LucideChevronRight,
  LucideCircleX,
  LucideFileText,
  LucideArrowUp,
  LucideArrowDown,
  LucideArrowUpDown,
  LucideCheck,
  LucideGripVertical,
} from '@lucide/angular';
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
  GroupConfig,
  GroupExpandEvent,
  PageSizeChange,
  PaginationOptions,
  ResolvedColspanCell,
  ResolvedFooterRow,
  ResolvedGroupAggregates,
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
  encodeGroupPath,
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
import {
  TableEngineService,
  TableHandle,
  buildSchemaKindMap,
  inferEngineSchema,
  normalizeDirection,
  translateAggregate,
  translateFilter,
  translateGroupFields,
  translateSort,
  type ColumnKind,
  type ColumnSchema,
  type FilterDef,
  type GroupNode as EngineGroupNode,
  type SortDef,
} from './engine';
import { computeAggregate, getAggregateSpec, type AggregateFunction } from './table-aggregates';

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

/**
 * Lazy slice of a data array: a `source` plus an optional `indices` array
 * into it. `indices === null` means "every row in source, in source order"
 * — saves allocating a `[0..n]` array when no transformation has been
 * applied yet.
 *
 * The data pipeline (filter / search / sort) flows views instead of
 * materialized `T[]` arrays so the page-slice boundary can pull only the
 * 50 rows it actually renders. This collapses the dominant per-sort-click
 * cost on 100k-row datasets from ~90 ms to ~30 ms (no full-array
 * `handle.rowsAt` allocation between stages).
 *
 * Tree mode and JS-fallback paths that produce a derived array (e.g.
 * `data.filter(predicate)`) wrap their result as `viewOf(arr, null)`.
 * Engine-routed paths return `{ source: original, indices: <subset> }`.
 */
interface IndexedView<T> {
  readonly source: readonly T[];
  readonly indices: Uint32Array | null;
  readonly length: number;
}

function viewOf<T>(source: readonly T[], indices: Uint32Array | null): IndexedView<T> {
  return { source, indices, length: indices?.length ?? source.length };
}

function materializeView<T>(view: IndexedView<T>): readonly T[] {
  if (!view.indices) return view.source;
  const out = new Array<T>(view.indices.length);
  for (let i = 0; i < view.indices.length; i++) out[i] = view.source[view.indices[i]];
  return out;
}

/** Materialize only `[start, end)` of the view — used at the page-slice boundary. */
function materializeSlice<T>(view: IndexedView<T>, start: number, end: number): T[] {
  const lo = Math.max(0, start);
  const hi = Math.min(view.length, end);
  if (hi <= lo) return [];
  const out = new Array<T>(hi - lo);
  if (!view.indices) {
    for (let i = lo; i < hi; i++) out[i - lo] = view.source[i];
  } else {
    for (let i = lo; i < hi; i++) out[i - lo] = view.source[view.indices[i]];
  }
  return out;
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
    LucideDynamicIcon,
    LucideListFilter,
    LucideX,
    LucideCheckCheck,
    LucideChevronDown,
    LucideChevronRight,
    LucideCircleX,
    LucideFileText,
    LucideArrowUp,
    LucideArrowDown,
    LucideArrowUpDown,
    LucideCheck,
    LucideGripVertical,
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
  private readonly engineService = inject(TableEngineService);

  // ───────────────────────────────────────────────────────────────────────
  // Typed event-target helpers
  // Replace `$any($event.target).value/.checked` in templates — same runtime
  // cost, but the template type checker sees `string` / `boolean` / `number`
  // so we don't leak `any` into component APIs.
  // ───────────────────────────────────────────────────────────────────────
  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
  inputChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
  inputNumber(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  // Handle click outside to close dropdowns
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdownContainer = target.closest('.bulk-action-dropdown');
    if (!dropdownContainer) {
      this.openBulkActionDropdown.set(null);
    }
    // Close any open daisyUI v4 filter <details> dropdowns when the click
    // lands outside them. v4 uses <details> (the v5 path is native popover
    // which already handles light-dismiss). Native <details> doesn't auto-
    // close on outside clicks — we do it here.
    if (this.isDaisyV4Signal() && !target.closest('[data-hk-filter]')) {
      const root = this.elementRef.nativeElement as HTMLElement;
      const open = root.querySelectorAll<HTMLDetailsElement>('details[data-hk-filter][open]');
      open.forEach((el) => {
        el.open = false;
      });
    }
  }

  /**
   * Enforce single-open behavior across filter `<details>` elements. The
   * `name="hk-filter-group"` attribute does this natively in Chrome 120+ /
   * Safari 17.2+ / Firefox 124+; this handler is the safety net for any
   * browser that hasn't caught up yet. Fires only on the just-opened
   * detail; closing siblings does fire their `toggle` event too, but they
   * fall through the early-return so there's no loop.
   */
  onFilterDetailsToggle(detail: HTMLDetailsElement): void {
    if (!detail.open) return;
    const root = this.elementRef.nativeElement as HTMLElement;
    const open = root.querySelectorAll<HTMLDetailsElement>('details[data-hk-filter][open]');
    open.forEach((other) => {
      if (other !== detail) other.open = false;
    });
  }

  private readonly htmlParser = this.isBrowser && typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  private readonly htmlCache = new Map<string, boolean>();

  // Inputs as signals
  readonly data = input<readonly T[] | null>(null);
  readonly config = input<FieldConfiguration<T> | null>(null);
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

  /**
   * Runtime-overrides bag for pagination. Static configuration comes from
   * `fieldConfig.pagination` (set via `createTable({ pagination: {...} })`);
   * server-driven values like `totalItems`, `nextCursor`, `prevCursor`
   * arrive through `controller.setPagination(opts)` and land here, merged
   * on top of the static config by `paginationOptions` below.
   */
  private readonly dynamicPaginationOverrides = signal<Partial<PaginationOptions> | null>(null);

  /**
   * Effective pagination options — `fieldConfig.pagination` merged with any
   * runtime overrides pushed via `setPagination()`. Returns `null` when the
   * consumer didn't configure pagination at all, in which case the
   * pagination footer is hidden.
   */
  readonly paginationOptions = computed<PaginationOptions | null>(() => {
    const fromConfig = this.fieldConfig()?.pagination ?? null;
    const overrides = this.dynamicPaginationOverrides();
    if (!fromConfig && !overrides) return null;
    return { ...(fromConfig ?? {}), ...(overrides ?? {}) } as PaginationOptions;
  });

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

  // ───────────────────────────────────────────────────────────────────────
  // WASM engine state
  //
  // The handle is created lazily — `engineHandleSignal` stays null until the
  // first ingest succeeds. Filter / sort signals read it; when null, they
  // run the JS fallback. The `engineSchemaSignal` is the same schema used
  // for the in-flight ingest, kept around so filter / sort translators can
  // map field names → column ids without re-inferring on every keystroke.
  // ───────────────────────────────────────────────────────────────────────
  private readonly engineHandleSignal = signal<TableHandle<T> | null>(null);
  private readonly engineSchemaSignal = signal<ColumnSchema<T>[] | null>(null);

  /**
   * Cached `field → ColumnKind` lookup. Built once per schema change, then
   * reused by `tryEngineSearch` (text-only column filtering) and
   * `tryEngineAggregate` (numeric/date kind gating). Replaces the per-call
   * `schema.find(s => s.field === f)` linear scans that previously ran on
   * every search keystroke and every footer aggregation cell.
   */
  private readonly engineSchemaKindMapSignal = computed<ReadonlyMap<string, ColumnKind> | null>(() => {
    const schema = this.engineSchemaSignal();
    return schema ? buildSchemaKindMap(schema) : null;
  });

  /**
   * Identity Map from original-array row → its index. Used by the engine-route
   * helpers (`tryEngineSort`, `displayIndicesSignal`) to translate visible rows
   * back to original-array indices for the engine's `RowSet::Indices` input.
   *
   * Cached as a computed signal so it rebuilds **only** when `data` input
   * reference changes — not on every sort click. At 100k rows that single
   * change cuts sort-click latency by ~50 ms.
   */
  private readonly originalIndexMapSignal = computed<Map<T, number>>(() => {
    const original = this.originalDataSignal();
    const map = new Map<T, number>();
    for (let i = 0; i < original.length; i++) map.set(original[i], i);
    return map;
  });

  /**
   * Pre-computed `[0, 1, 2, …, n-1]` indices array for the no-filter fast
   * path: when the visible data IS the original (no column filter, no global
   * search), `tryEngineSort` can skip the Map round-trip entirely and just
   * pass this cached `Uint32Array` straight to the engine.
   */
  private readonly originalAllIndicesSignal = computed<Uint32Array>(() => {
    const n = this.originalDataSignal().length;
    const out = new Uint32Array(n);
    for (let i = 0; i < n; i++) out[i] = i;
    return out;
  });

  // Internal signals
  private readonly sortState = signal<SortState>({ field: '', direction: '' });
  private readonly filterState = signal<FilterConfig<T>[]>([]);
  readonly selectedSignal = signal(new Set<T>());
  readonly activeRow = signal<T | null>(null);
  readonly activeRows = signal<Set<T>>(new Set());
  readonly openFilterField = signal<string | null>(null); // Track which filter dropdown is open
  /**
   * Active daisyUI version. The v5 filter popover uses native HTML popover
   * API + CSS anchor positioning; v4 doesn't support anchor positioning AND
   * its `.card` / `.dropdown` classes break popover's UA display:none rule.
   * Template branches markup on this signal so v4 consumers get a focus-
   * driven `.dropdown` instead — matches daisyUI v4's documented pattern.
   */
  private readonly hkTheme = inject(HK_THEME);
  readonly isDaisyV4Signal = computed(() => this.hkTheme.id === 'daisyui-v4');
  /**
   * Absolute viewport coords for the currently-open filter dropdown.
   * Computed from the trigger button's `getBoundingClientRect()` on open.
   * Native popover + CSS anchor positioning would have been nicer, but
   * anchor positioning is Chromium-only as of 2026 — so we compute it
   * ourselves to work in Firefox / Safari too.
   */
  readonly openFilterPos = signal<{ top: number; left: number } | null>(null);
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

  /** Number of special columns prepended before data columns (drag handle, select, expand, [actions_start?]). */
  readonly specialColumnOffsetSignal = computed(() => {
    let offset = 0;
    if (this.showDragHandleColumnSignal()) offset++;
    if (this.hasSelectionSignal()) offset++;
    if (this.showExpandColumnSignal()) offset++;
    if (this.hasStartActionsSignal()) offset++;
    return offset;
  });

  /** Column index of the select column within displayedColumnsSignal. */
  readonly selectColIndexSignal = computed(() => (this.showDragHandleColumnSignal() ? 1 : 0));

  /** Column index of the detail-expand column within displayedColumnsSignal. */
  readonly expandColIndexSignal = computed(() => {
    let idx = 0;
    if (this.showDragHandleColumnSignal()) idx++;
    if (this.hasSelectionSignal()) idx++;
    return idx;
  });

  /** Column index of the start-side actions column within displayedColumnsSignal (-1 if none). */
  readonly startActionsColIndexSignal = computed(() => this.displayedColumnsSignal().indexOf('actions_start'));
  /** Column index of the end-side actions column within displayedColumnsSignal (-1 if none). */
  readonly endActionsColIndexSignal = computed(() => this.displayedColumnsSignal().indexOf('actions_end'));
  /** Column index of the primary actions column — end side if present, else start side. */
  readonly actionsColIndexSignal = computed(() => {
    const endIdx = this.endActionsColIndexSignal();
    if (endIdx !== -1) return endIdx;
    const startIdx = this.startActionsColIndexSignal();
    return startIdx === -1 ? this.displayedColumnsSignal().length - 1 : startIdx;
  });

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
  readonly isEmptySignal = computed(() => !this.loading() && !this.error() && this.displayViewSignal().length === 0);
  /** True when showing error state */
  readonly hasErrorSignal = computed(() => !!this.error());

  // ============================================================================
  // Row Grouping
  // ============================================================================
  readonly groupConfigSignal = computed(() => this.fieldConfig()?.grouping);
  readonly isGroupedSignal = computed(() => {
    const cfg = this.groupConfigSignal();
    if (!cfg?.groupBy) return false;
    return Array.isArray(cfg.groupBy) ? cfg.groupBy.length > 0 : true;
  });
  /** Group depth for nested grouping. Always ≥ 1 when grouped. */
  readonly groupDepthSignal = computed(() => {
    const cfg = this.groupConfigSignal();
    if (!cfg?.groupBy) return 0;
    return Array.isArray(cfg.groupBy) ? cfg.groupBy.length : 1;
  });
  /**
   * Path-keyed expansion state. Each entry is `encodeGroupPath(path)` for an
   * EXPANDED group. `null` sentinel = "never interacted; defer to
   * `initiallyExpanded`". Storing expanded paths instead of collapsed ones
   * means new groups inherit the default state correctly across data changes.
   */
  readonly expandedGroups = signal<Set<string> | null>(null);
  readonly resolvedGroupAggregatesSignal = computed(() => this.config()?.resolvedGroupAggregates);
  readonly hasGroupCaptionAggregatesSignal = computed(() => !!this.groupConfigSignal()?.captionAggregates);
  readonly hasGroupFooterRowsSignal = computed(() => (this.groupConfigSignal()?.groupFooterRows?.length ?? 0) > 0);

  // Global search signals
  readonly globalSearchTerm = signal<string>('');
  private readonly debouncedSearchTerm = signal<string>('');
  private searchDebounceTimeout?: ReturnType<typeof setTimeout>;

  // Fuzzy-search cache — auto-invalidates on data-ref OR keys change.
  // No `includeScore` (was a 0.1.76- defect — score computed but never read).
  // Recreated when consumer passes a *different* `fuseOptions` object reference.
  private fuseCache: FuseCache<T> = createFuseCache<T>();
  private _fuseOptionsRef: IFuseOptions<T> | undefined;

  // Global search computed signals
  readonly hasGlobalSearchSignal = computed(() => this.fieldConfig()?.globalSearch?.enabled ?? false);
  readonly globalSearchModeSignal = computed(() => this.fieldConfig()?.globalSearch?.mode ?? 'contains');
  readonly globalSearchPlaceholderSignal = computed(() => this.fieldConfig()?.globalSearch?.placeholder ?? 'Search all columns...');
  readonly globalSearchClearAriaSignal = computed(() => this.fieldConfig()?.globalSearch?.labels?.clearAriaLabel ?? 'Clear search');
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
  /** Last `paginationOptions.pageSize` we synced into state — used to detect actual config changes vs. re-runs that just toggle `disabled` etc. */
  private lastSeenOptionsPageSize: number | undefined;

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

  /** Max number of rows that can be checkbox-selected at once. `null` = unlimited (default). */
  readonly selectionLimitSignal = computed<number | null>(() => {
    const n = this.fieldConfig()?.selectionLimit;
    return typeof n === 'number' && n >= 1 ? n : null;
  });

  /** True when the selection has hit `selectionLimit`. Drives disabled-checkbox state. */
  readonly isSelectionLimitReachedSignal = computed(() => {
    const limit = this.selectionLimitSignal();
    return limit !== null && this.selectedSignal().size >= limit;
  });

  /**
   * Whether to render the header "select all" checkbox.
   * Hidden whenever a `selectionLimit` is configured — "select all" + any
   * cap is awkward UX (radio-like at limit=1, partial-fill confusion at
   * limit=N). The empty <th> kept by the caller keeps the column aligned
   * with the row checkboxes below.
   */
  readonly showSelectAllCheckboxSignal = computed(() => this.selectionLimitSignal() === null);
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
  readonly actionsPositionSignal = computed(() => this.fieldConfig()?.actionsPosition ?? 'end');
  readonly startActionsLabelSignal = computed(() => {
    const c = this.fieldConfig();
    return c?.startActionsLabel ?? c?.actionsLabel ?? 'Actions';
  });
  readonly endActionsLabelSignal = computed(() => {
    const c = this.fieldConfig();
    return c?.endActionsLabel ?? c?.actionsLabel ?? 'Actions';
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
  readonly columnVisibilityLabels = computed(() => this.columnVisibilityConfig()?.labels ?? {});

  // Label resolution for the main table template. `tableLabels()` returns a
  // merged object (defaults + user overrides) so templates can `{{ tableLabels().foo }}`
  // without `?? 'default'` sprinkled everywhere.
  readonly tableLabels = computed(() => {
    const overrides = this.fieldConfig()?.labels ?? {};
    return {
      loading: overrides.loading ?? 'Loading data...',
      itemSelected: overrides.itemSelected ?? 'item selected',
      itemsSelected: overrides.itemsSelected ?? 'items selected',
      activeFilters: overrides.activeFilters ?? 'Active Filters',
      clearAllFilters: overrides.clearAllFilters ?? 'Clear All',
      clearAllFiltersAriaLabel: overrides.clearAllFiltersAriaLabel ?? 'Clear all filters',
      removeFilterAriaLabel: overrides.removeFilterAriaLabel ?? ((field: string) => `Remove filter for ${field}`),
      filterButtonAriaLabel: overrides.filterButtonAriaLabel ?? ((col: string) => `Filter ${col}`),
      selectRowAriaLabel: overrides.selectRowAriaLabel ?? 'Select row',
      deselectRowAriaLabel: overrides.deselectRowAriaLabel ?? 'Deselect row',
      selectAllAriaLabel: overrides.selectAllAriaLabel ?? 'Select all rows on this page',
      deselectAllAriaLabel: overrides.deselectAllAriaLabel ?? 'Deselect all rows on this page',
      clearSelectionAriaLabel: overrides.clearSelectionAriaLabel ?? 'Clear selection',
      selectionLimitReachedHint: overrides.selectionLimitReachedHint ?? ((limit: number) => `Maximum of ${limit} selected`),
      expandRowAriaLabel: overrides.expandRowAriaLabel ?? 'Expand row',
      collapseRowAriaLabel: overrides.collapseRowAriaLabel ?? 'Collapse row',
      expandDetailsAriaLabel: overrides.expandDetailsAriaLabel ?? 'Expand details',
      collapseDetailsAriaLabel: overrides.collapseDetailsAriaLabel ?? 'Collapse details',
    };
  });
  readonly filterLabels = computed(() => this.fieldConfig()?.filterLabels ?? {});

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
  //
  // Pipeline order:
  //   1. Cursor mode  ⇒ skip (server handles filtering)
  //   2. Tree mode    ⇒ JS hierarchy-aware filter (engine has no tree kernel yet)
  //   3. Engine path  ⇒ if a handle exists and every active filter translates
  //      cleanly, hand off to WASM and resolve indices to rows.
  //   4. JS fallback  ⇒ same predicate-based filter as before.
  /**
   * Filtered view — never materializes a full T[] for the engine path.
   *
   * Tree mode and JS predicate fallback produce derived arrays and wrap them
   * as `viewOf(arr, null)`. Engine path returns `{ source: original, indices }`,
   * letting the rest of the pipeline (search / sort) operate on indices and
   * the page-slice boundary materialize only what it renders.
   */
  private readonly filteredViewSignal = computed<IndexedView<T>>(() => {
    const data = this.originalDataSignal();
    const filters = this.filterState();
    const mode = this.modeSignal();

    if (mode === 'cursor' || filters.length === 0) return viewOf(data, null);

    const predicate = (row: T) => filters.every((filter) => this.applyFilter(row, filter));

    if (this.isTreeTableSignal()) {
      const hierarchyMode = this.filterHierarchyModeSignal();
      const childrenProp = this.childrenPropertySignal();
      return viewOf(filterTreeData(data as T[], predicate, childrenProp, hierarchyMode), null);
    }

    // Engine path. We accept the engine result only if every active filter
    // translates without ambiguity; one untranslatable filter forces JS for
    // the whole list (rather than producing wrong results from a partial
    // application). Hybrid per-column dispatch is a future refinement.
    const engineIndices = this.tryEngineFilterIndices(filters);
    if (engineIndices) return viewOf(data, engineIndices);

    return viewOf(data.filter(predicate), null);
  });

  /** Public materialized form. Lazy — only allocated when actually read. */
  private readonly filteredDataSignal = computed(() => materializeView(this.filteredViewSignal()));

  /**
   * Engine-backed filter. Returns the indices array (into the original
   * dataset) or `null` for the JS fallback. The handle is read off a signal
   * so this re-runs when the WASM module finishes loading.
   */
  private tryEngineFilterIndices(filters: readonly FilterConfig<T>[]): Uint32Array | null {
    const handle = this.engineHandleSignal();
    const schema = this.engineSchemaSignal();
    if (!handle || !schema) return null;

    // Memo: filter→wire translation. The filterState signal hands out a new
    // array reference only on actual filter changes, so ref-equality on
    // (filters, schema) is the right key. Reuses the cached wire on every
    // other re-run of the filteredViewSignal computed (data updates, search
    // text changes, etc.). Invalidated when either ref changes.
    const memo = this.filterTranslateMemo;
    let wire: FilterDef<T>[] | null = null;
    if (memo && memo.filters === filters && memo.schema === schema) {
      wire = memo.wire;
    } else {
      const built: FilterDef<T>[] = [];
      for (const f of filters) {
        const translated = translateFilter<T>(f, schema);
        if (!translated) {
          this.filterTranslateMemo = null;
          return null;
        }
        built.push(translated);
      }
      wire = built;
      this.filterTranslateMemo = { filters, schema, wire };
    }

    return handle.filter(wire);
  }

  private filterTranslateMemo: { filters: readonly FilterConfig<T>[]; schema: readonly ColumnSchema<T>[]; wire: FilterDef<T>[] } | null =
    null;

  /**
   * Searched view — fed by `filteredViewSignal`. Engine path narrows engine
   * search results against the post-filter index set and returns indices;
   * tree / fuzzy / custom paths produce a derived array wrapped in a view.
   */
  private readonly searchedViewSignal = computed<IndexedView<T>>(() => {
    const view = this.filteredViewSignal();
    const searchTerm = this.debouncedSearchTerm();
    const config = this.fieldConfig()?.globalSearch;
    const mode = this.modeSignal();

    if (mode === 'cursor' || !config?.enabled || !searchTerm) return view;

    const searchMode = config.mode ?? 'contains';

    // Build the search predicate (used by JS / fuzzy / tree fallbacks)
    let searchPredicate: (row: T) => boolean;

    if (config.customSearch) {
      searchPredicate = (row: T) => config.customSearch!(row, searchTerm);
    } else if (searchMode === 'fuzzy') {
      // Fuzzy doesn't combine well with the indices pipeline. Materialize
      // the upstream view, run the JS fuzzy search, wrap the result.
      const data = materializeView(view);
      return viewOf(this.performFuzzySearch(data, searchTerm, config), null);
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

    // Tree mode: hierarchy-aware search. Materialize upstream first; tree
    // helpers expect concrete arrays. Ancestor auto-expand happens in
    // setupEffects(), not here (cycle avoidance — see comment there).
    if (this.isTreeTableSignal()) {
      const hierarchyMode = this.filterHierarchyModeSignal();
      const childrenProp = this.childrenPropertySignal();
      const data = materializeView(view);
      return viewOf(filterTreeData(data as T[], searchPredicate, childrenProp, hierarchyMode), null);
    }

    // Engine path: indices ∩ filter-indices, no row materialization.
    const engineIndices = this.tryEngineSearchIndices(view, searchTerm, config);
    if (engineIndices) return viewOf(view.source, engineIndices);

    // JS fallback: walk the view, push surviving indices.
    return viewOf(view.source, this.filterViewByPredicate(view, searchPredicate));
  });

  /** Public materialized form. Lazy — only allocated when actually read. */
  private readonly globalSearchedDataSignal = computed(() => materializeView(this.searchedViewSignal()));

  /**
   * Engine-backed global search returning indices into the original dataset.
   * Intersects the engine's match set with the post-column-filter index set.
   * Returns `null` when the engine can't service this config.
   */
  private tryEngineSearchIndices(
    view: IndexedView<T>,
    searchTerm: string,
    config: NonNullable<ReturnType<TableComponent<T>['fieldConfig']>>['globalSearch'] & object,
  ): Uint32Array | null {
    const handle = this.engineHandleSignal();
    const kindMap = this.engineSchemaKindMapSignal();
    if (!handle || !kindMap) return null;

    const mode = (config.mode ?? 'contains') as 'contains' | 'startsWith' | 'exact';
    if (mode !== 'contains' && mode !== 'startsWith' && mode !== 'exact') return null;

    const excludeFields = new Set(config.excludeFields ?? []);
    const fields =
      this.columns()
        ?.map((c) => c.field)
        .filter((f) => !excludeFields.has(f)) ?? [];

    const engineFields = fields.filter((f) => kindMap.get(f) === 'text') as (keyof T & string)[];

    const matchedIdx = handle.search({
      term: searchTerm,
      mode,
      fields: engineFields,
      caseSensitive: config.caseSensitive ?? false,
    });

    // Intersect with the upstream view's index set. When the view has no
    // indices (`null`), every row is in scope and the intersection is a
    // no-op — return the engine's result directly.
    if (view.indices === null) return matchedIdx;

    const visibleSet = new Set<number>();
    for (let i = 0; i < view.indices.length; i++) visibleSet.add(view.indices[i]);

    const out = new Uint32Array(matchedIdx.length);
    let n = 0;
    for (let i = 0; i < matchedIdx.length; i++) {
      const idx = matchedIdx[i];
      if (visibleSet.has(idx)) out[n++] = idx;
    }
    return n === out.length ? out : out.slice(0, n);
  }

  /** Walk a view, return the indices array for rows that pass `predicate`. */
  private filterViewByPredicate(view: IndexedView<T>, predicate: (row: T) => boolean): Uint32Array {
    const buf: number[] = [];
    if (!view.indices) {
      for (let i = 0; i < view.source.length; i++) {
        if (predicate(view.source[i])) buf.push(i);
      }
    } else {
      for (let i = 0; i < view.indices.length; i++) {
        const idx = view.indices[i];
        if (predicate(view.source[idx])) buf.push(idx);
      }
    }
    return Uint32Array.from(buf);
  }

  /**
   * Sorted view — fed by `searchedViewSignal`. Engine path runs entirely on
   * indices: takes the upstream view's indices (or the cached identity array
   * when there are none), hands them to the WASM sort kernel, returns the
   * reordered indices. No `handle.rowsAt` allocation in the hot path.
   *
   * Two fast paths matter at 100k rows:
   *
   * 1. **No filter / search active** (`view.indices === null`) — reuse the
   *    cached `[0..n]` `originalAllIndicesSignal` instead of allocating.
   *    This is the common "sort the raw dataset" case.
   * 2. **Filter / search active** — the upstream view already has the
   *    indices we need. Pass them straight to the engine; no row→index
   *    Map round-trip.
   */
  private readonly sortedViewSignal = computed<IndexedView<T>>(() => {
    const view = this.searchedViewSignal();
    const { field, direction } = this.sortState();

    if (!field || !direction) return view;

    const compareFn = (a: T, b: T) =>
      this.compareValues((a as Record<string, unknown>)[field], (b as Record<string, unknown>)[field], direction);

    if (this.isTreeTableSignal()) {
      const childrenProp = this.childrenPropertySignal();
      const data = materializeView(view);
      return viewOf(sortTreeData(data as T[], compareFn, childrenProp), null);
    }

    // Engine path: indices in, indices out.
    const engineIndices = this.tryEngineSortIndices(view, field, direction);
    if (engineIndices) return viewOf(view.source, engineIndices);

    // JS fallback. Sort indices (or materialized rows when source isn't
    // original) so we still skip a full materialization when possible.
    if (view.indices === null) {
      return viewOf([...view.source].sort(compareFn), null);
    }
    const idx = view.indices.slice();
    idx.sort((a, b) => compareFn(view.source[a], view.source[b]));
    return viewOf(view.source, idx);
  });

  /** Public materialized form. Lazy — only allocated when actually read. */
  private readonly sortedDataSignal = computed(() => materializeView(this.sortedViewSignal()));

  /** Engine-backed sort returning indices into the original dataset. */
  private tryEngineSortIndices(view: IndexedView<T>, field: string, direction: '' | 'Ascending' | 'Descending'): Uint32Array | null {
    const handle = this.engineHandleSignal();
    const schema = this.engineSchemaSignal();
    if (!handle || !schema) return null;

    if (view.source !== this.originalDataSignal()) return null; // JS-derived source ⇒ JS sort

    const dir = normalizeDirection(direction);
    const specs: SortDef<T>[] = translateSort<T>(field, dir, schema);
    if (specs.length === 0) return null;

    const visibleIndices = view.indices ?? this.originalAllIndicesSignal();
    return handle.sort(visibleIndices, specs);
  }

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

  /**
   * Display view — what the page-slice boundary slices. Tree mode wraps the
   * flattened data (no indices); non-tree forwards the sorted view as-is.
   * `currentDataSignal` reads this and only materializes the page rows.
   */
  private readonly displayViewSignal = computed<IndexedView<T>>(() => {
    const flattened = this.flattenedTreeDataSignal();
    if (flattened)
      return viewOf(
        flattened.map((f) => f.data),
        null,
      );
    return this.sortedViewSignal();
  });

  /** Public materialized form. Lazy — only allocated when actually read. */
  readonly displayDataSignal = computed(() => materializeView(this.displayViewSignal()));

  // ============================================================================
  // Row Grouping Pipeline
  // ============================================================================
  readonly groupedDataSignal = computed<RowGroup<T>[]>(() => {
    const config = this.groupConfigSignal();
    if (!this.isGroupedSignal()) return [];

    const data = this.displayDataSignal();
    const expandedGroups = this.expandedGroups();
    const resolvedGroupAggregates = this.resolvedGroupAggregatesSignal();
    const initiallyExpanded = config?.initiallyExpanded ?? true;

    // Engine path. Builds the tree topology in WASM and reuses the existing
    // RowGroup<T> shape so the rest of the pipeline (template, expansion
    // state, aggregates) is unchanged. Falls back to JS when:
    //   - any groupBy field isn't engine-safe (date columns, missing schema)
    //   - display rows can't be mapped to original-array indices (tree mode)
    //   - engine handle isn't ready
    const tree =
      this.tryEngineGroup(data, config!, initiallyExpanded, resolvedGroupAggregates) ??
      groupData<T>(
        data,
        config!.groupBy,
        config!.aggregates as Partial<Record<StringKey<T>, AggregateFunction>>,
        config!.groupSortFn,
        config!.groupHeaderLabel,
        initiallyExpanded,
        resolvedGroupAggregates,
      );

    // Apply expansion state recursively. `null` ⇒ first paint, use the
    // configured default for every node; otherwise, a path is expanded iff
    // it appears in the Set.
    const applyExpansion = (nodes: RowGroup<T>[]) => {
      for (const node of nodes) {
        node.expanded = expandedGroups === null ? initiallyExpanded : expandedGroups.has(encodeGroupPath(node.path));
        if (node.children.length > 0) applyExpansion(node.children);
      }
    };
    applyExpansion(tree);

    return tree;
  });

  /**
   * Engine-backed group. Returns the `RowGroup<T>` tree on success or `null`
   * to signal a JS fallback.
   *
   * This wires three things in sequence:
   *   1. **Field translation** — every `groupBy` field must be engine-safe
   *      (text / number / bool). Date columns intentionally fall back so
   *      `groupValue` typing matches the original JS behavior.
   *   2. **Index mapping** — visible rows (`data`) need to map to
   *      original-array indices for the engine's `RowSet::Indices` input.
   *      Tree-mode synthetic rows can't, so they fall back.
   *   3. **Tree conversion** — the engine produces a flat tree of
   *      `EngineGroupNode { key, indices, depth, children }`. We walk it
   *      recursively producing `RowGroup<T>`, computing per-group aggregates
   *      via the existing TS `computeAggregate` helper (correctness over
   *      perf — aggregate counts are typically tiny).
   */
  private tryEngineGroup(
    data: readonly T[],
    config: GroupConfig<T>,
    initiallyExpanded: boolean,
    resolvedGroupAggregates: ResolvedGroupAggregates<T> | undefined,
  ): RowGroup<T>[] | null {
    const handle = this.engineHandleSignal();
    const schema = this.engineSchemaSignal();
    if (!handle || !schema) return null;

    const fields: readonly (keyof T & string)[] = Array.isArray(config.groupBy)
      ? (config.groupBy as readonly (keyof T & string)[])
      : [config.groupBy as keyof T & string];
    const safeFields = translateGroupFields<T>(fields, schema);
    if (!safeFields) return null;

    const indices = this.displayIndicesSignal();
    if (indices === 'unmappable') return null;

    const original = this.originalDataSignal();
    const engineNodes = handle.group(safeFields, indices);

    const out = this.engineGroupsToRowGroups(engineNodes, original, [], config, initiallyExpanded, resolvedGroupAggregates);

    // Optional `groupSortFn` is applied here too — kernel produces
    // first-seen order; user-provided sort runs at every level.
    if (config.groupSortFn) {
      const sort = config.groupSortFn;
      const sortRecursive = (nodes: RowGroup<T>[]) => {
        nodes.sort((a, b) => sort(a.groupValue, b.groupValue));
        for (const n of nodes) {
          if (n.children.length > 0) sortRecursive(n.children);
        }
      };
      sortRecursive(out);
    }

    return out;
  }

  /** Recursive RowGroup<T> builder from engine nodes. Computes labels + aggregates per node. */
  private engineGroupsToRowGroups(
    nodes: readonly EngineGroupNode[],
    original: readonly T[],
    parentPath: readonly unknown[],
    config: GroupConfig<T>,
    initiallyExpanded: boolean,
    resolvedGroupAggregates: ResolvedGroupAggregates<T> | undefined,
  ): RowGroup<T>[] {
    const out = new Array<RowGroup<T>>(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const groupValue = engineKeyToValue(node.key);
      const path = [...parentPath, groupValue];
      const rows = Array.from(node.indices, (idx) => original[idx]);

      const groupLabel = config.groupHeaderLabel ? config.groupHeaderLabel(groupValue, rows) : String(groupValue ?? 'Unknown');

      const aggregates: Record<string, number> = {};
      if (config.aggregates) {
        for (const [field, fn] of Object.entries(config.aggregates)) {
          if (fn) {
            aggregates[field] = computeAggregate(rows, field as Extract<keyof T, string>, fn as AggregateFunction);
          }
        }
      }

      const group: RowGroup<T> = {
        groupValue,
        groupLabel,
        path,
        depth: node.depth,
        rows,
        children: this.engineGroupsToRowGroups(node.children, original, path, config, initiallyExpanded, resolvedGroupAggregates),
        aggregates,
        expanded: initiallyExpanded,
      };

      if (resolvedGroupAggregates?.resolvedCaptionCells) {
        group.resolvedCaptionCells = resolvedGroupAggregates.resolvedCaptionCells;
      }
      if (resolvedGroupAggregates?.resolvedGroupFooterRows) {
        group.resolvedGroupFooterRows = resolvedGroupAggregates.resolvedGroupFooterRows;
      }

      out[i] = group;
    }
    return out;
  }

  /**
   * Flattens the group tree into a per-row stream the template can render
   * sequentially. A non-leaf branch emits its header, then (if expanded)
   * recurses into its children and their headers/data/footers, then emits
   * its own footer rows. A leaf branch (no children) emits its header,
   * then (if expanded) the data rows, then any footer rows.
   *
   * The `depth` carried on each emitted entry drives indentation in the
   * template; `path` is the stable key used by the toggle handler.
   */
  readonly groupedDisplaySignal = computed<
    Array<
      | { type: 'group-header'; group: RowGroup<T>; depth: number }
      | { type: 'group-footer'; group: RowGroup<T>; depth: number; footerRowIndex?: number }
      | { type: 'data'; row: T; depth: number }
    >
  >(() => {
    const groups = this.groupedDataSignal();
    if (groups.length === 0) return [];

    const config = this.groupConfigSignal();
    const showGroupFooter = config?.showGroupFooter ?? false;
    const hasGroupFooterRows = this.hasGroupFooterRowsSignal();

    type DisplayRow =
      | { type: 'group-header'; group: RowGroup<T>; depth: number }
      | { type: 'group-footer'; group: RowGroup<T>; depth: number; footerRowIndex?: number }
      | { type: 'data'; row: T; depth: number };

    const result: DisplayRow[] = [];

    const emitFooters = (group: RowGroup<T>, depth: number) => {
      if (hasGroupFooterRows && group.resolvedGroupFooterRows) {
        for (let i = 0; i < group.resolvedGroupFooterRows.length; i++) {
          result.push({ type: 'group-footer', group, depth, footerRowIndex: i });
        }
      } else if (showGroupFooter) {
        result.push({ type: 'group-footer', group, depth });
      }
    };

    const walk = (nodes: readonly RowGroup<T>[]) => {
      for (const node of nodes) {
        result.push({ type: 'group-header', group: node, depth: node.depth });
        if (!node.expanded) continue;

        if (node.children.length > 0) {
          // Non-leaf: recurse into sub-groups, then emit this level's footers.
          walk(node.children);
          emitFooters(node, node.depth);
        } else {
          // Leaf: data rows, then this level's footers.
          for (const row of node.rows) {
            result.push({ type: 'data', row, depth: node.depth });
          }
          emitFooters(node, node.depth);
        }
      }
    };

    walk(groups);
    return result;
  });

  // Total items for pagination - must be defined after displayDataSignal
  readonly totalItemsSignal = computed(() => {
    const mode = this.modeSignal();
    // For server-side pagination, use totalItems from options
    if (mode === 'cursor') {
      return this.paginationOptions()?.totalItems ?? this.originalDataSignal().length;
    }
    // For client-side pagination, use display data length. Read the view's
    // length directly so we don't trigger full materialization just to
    // count rows.
    return this.paginationOptions()?.totalItems ?? this.displayViewSignal().length;
  });

  /**
   * Page-slice boundary. Reads the lazy `displayViewSignal` and only
   * materializes the rows actually rendered (50 in the typical offset case)
   * — the engine-routed pipeline upstream never builds a full T[].
   */
  private readonly currentDataSignal = computed(() => {
    const mode = this.modeSignal();
    const view = this.displayViewSignal();

    // Virtual scroll: CDK reads the entire dataset. Materialize once.
    if (this.isVirtualScrollSignal()) return materializeView(view);

    if (mode === 'offset') {
      const start = this.pageIndexSignal() * this.pageSizeSignal();
      const end = start + this.pageSizeSignal();
      return materializeSlice(view, start, end);
    }

    // Cursor mode: server returns the page; pass through.
    return materializeView(view);
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
    return actions.map((config) => ({ key: config.type, config })).sort(TableComponent.compareByActionOrder);
  });

  readonly startActionListSignal = computed(() => {
    const defaultPos = this.actionsPositionSignal();
    return this.actionListSignal().filter((a) => (a.config.position ?? defaultPos) === 'start');
  });
  readonly endActionListSignal = computed(() => {
    const defaultPos = this.actionsPositionSignal();
    return this.actionListSignal().filter((a) => (a.config.position ?? defaultPos) !== 'start');
  });
  readonly hasStartActionsSignal = computed(() => this.startActionListSignal().length > 0);
  readonly hasEndActionsSignal = computed(() => this.endActionListSignal().length > 0);

  readonly bulkActionListSignal = computed<BulkActionItem<T>[]>(() => {
    const bulkActions = this.fieldConfig()?.bulkActions ?? [];
    return bulkActions.map((config) => ({ key: config.type, config })).sort(TableComponent.compareByActionOrder);
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
      const dataSet = new Set<string>(dataColumns as string[]);
      const ordered: StringKey<T>[] = [];
      const seen = new Set<string>();
      for (const col of orderOverride) {
        if (dataSet.has(col)) {
          ordered.push(col as StringKey<T>);
          seen.add(col);
        }
      }
      // Append any columns not in the override (newly added columns)
      for (const col of dataColumns) {
        if (!seen.has(col)) ordered.push(col);
      }
      dataColumns = ordered;
    }

    const visibleColumns: string[] = [...dataColumns];

    // Add special columns in order: drag_handle, select, detail_expand, [actions_start?], data, [actions_end?]
    if (this.hasStartActionsSignal()) visibleColumns.unshift('actions_start');
    if (this.showExpandColumnSignal()) visibleColumns.unshift('__detail_expand');
    if (this.hasSelectionSignal()) visibleColumns.unshift('select');
    if (this.showDragHandleColumnSignal()) visibleColumns.unshift('__drag_handle');
    if (this.hasEndActionsSignal()) visibleColumns.push('actions_end');

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
  private static readonly ACTION_ORDER_INDEX: ReadonlyMap<string, number> = new Map(
    TableComponent.ACTION_ORDER.map((type, index) => [type as string, index]),
  );

  /**
   * Shared comparator: sorts action-like items by ACTION_ORDER_INDEX, putting
   * known types first in declared order and leaving unknown types in their
   * original relative order (stable sort).
   */
  private static compareByActionOrder<K extends { key: string }>(a: K, b: K): number {
    const order = TableComponent.ACTION_ORDER_INDEX;
    const indexA = order.get(a.key);
    const indexB = order.get(b.key);
    if (indexA !== undefined && indexB !== undefined) return indexA - indexB;
    if (indexA !== undefined) return -1;
    if (indexB !== undefined) return 1;
    return 0;
  }

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
  private attachedId: string | null = null;

  constructor() {
    this.dataSource = new SignalDataSource(this.currentDataSignal);
    this.setupEffects();
    this.setupEngineLifecycle();

    // Re-attach when the bound [config] identity changes (e.g. swap controllers at runtime).
    effect(() => {
      const next = this.config();
      const prev = this.attachedConfig;
      if (next === prev) return;
      if (prev) _detachTableInstance(prev, this, this.attachedId ?? undefined);
      const id = next?.config?.id;
      if (next) _attachTableInstance(next, this, id);
      this.attachedConfig = next ?? null;
      this.attachedId = id ?? null;
    });
  }

  /**
   * Create a WASM dataset whenever the bound `data` reference changes (and
   * the table is in a mode the engine can serve). Disposes the previous
   * handle on every re-ingest and on component destroy. In-flight ingests
   * are cancelled if the data ref changes again before the WASM module
   * has finished loading.
   */
  private setupEngineLifecycle(): void {
    effect((onCleanup) => {
      const data = this.originalDataSignal();
      const mode = this.modeSignal();
      const isTree = this.isTreeTableSignal();

      // The engine doesn't serve cursor mode (server-side) or tree tables
      // (no tree-flatten kernel yet). JS pipeline runs as the source of truth.
      if (mode === 'cursor' || isTree || data.length === 0) {
        this.disposeEngineHandle();
        return;
      }

      // Schema must be inferable for every column. Failure ⇒ JS fallback.
      const cols = this.columnDefsSignal();
      const schema = inferEngineSchema<T>(cols, data);
      if (!schema) {
        this.disposeEngineHandle();
        return;
      }

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      this.engineService
        .createDataset<T>(data, schema)
        .then((handle) => {
          if (cancelled) {
            handle.dispose();
            return;
          }
          this.disposeEngineHandle();
          this.engineSchemaSignal.set(schema);
          this.engineHandleSignal.set(handle);
        })
        .catch(() => {
          // WASM failed to load — service has already logged. Stay on JS.
          this.disposeEngineHandle();
        });
    });
  }

  private disposeEngineHandle(): void {
    const old = this.engineHandleSignal();
    if (old) {
      old.dispose();
      this.engineHandleSignal.set(null);
      this.engineSchemaSignal.set(null);
    }
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }

    if (this.attachedConfig) {
      _detachTableInstance(this.attachedConfig, this, this.attachedId ?? undefined);
      this.attachedConfig = null;
      this.attachedId = null;
    }

    this.disposeEngineHandle();
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

  /**
   * Merge `opts` into the runtime pagination override bag. Used by
   * server-driven flows that need to push `totalItems` / `nextCursor` /
   * `prevCursor` after each fetch resolves — the static config from
   * `createTable({ pagination: {...} })` is the floor, this is the live
   * delta on top.
   */
  setPagination(opts: Partial<PaginationOptions>): void {
    this.dynamicPaginationOverrides.update((curr) => ({ ...(curr ?? {}), ...opts }));
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
    // Belt-and-suspenders against programmatic callers / keyboard focus that
    // bypass the `[disabled]` HTML attribute on the checkbox. The HTML guard
    // is the primary UX (greyed out + tooltip); this guard ensures the
    // model state stays consistent if a checked=true event slips through.
    if (checked && this.isSelectionLimitReachedSignal() && !this.isSelected(row)) {
      return;
    }

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
    const limit = this.selectionLimitSignal();

    this.selectedSignal.update((selectedSet) => {
      const newSet = new Set(selectedSet);

      if (checked) {
        // Cap additions at remaining capacity so a select-all click on a
        // page that doesn't fit under the limit fills partway instead of
        // overshooting. Already-selected rows on this page don't count
        // against capacity — they're a no-op `add`.
        for (const row of data) {
          if (limit !== null && newSet.size >= limit && !newSet.has(row)) break;
          newSet.add(row);
        }
      } else {
        for (const row of data) newSet.delete(row);
      }

      return newSet;
    });

    this.selectionChange.emit([...this.selectedSignal()]);
  }

  isSelected(row: T): boolean {
    return this.selectedSignal().has(row);
  }

  /**
   * Whether this row's checkbox should render as `disabled`. True when a
   * `selectionLimit` is configured, the limit has been reached, and this
   * row isn't already in the selected set. Disabled rows can't be toggled
   * on — but a checked row can still be unchecked (limit goes down → others
   * re-enable).
   */
  isRowSelectDisabled(row: T): boolean {
    return this.isSelectionLimitReachedSignal() && !this.isSelected(row);
  }

  /**
   * Whether the header "select all on page" checkbox should render as
   * `disabled`. Disabled only when at limit *and* clicking would try to add
   * (i.e. not all rows on the page are currently selected — in which case
   * the click would deselect, which is always allowed).
   */
  isSelectAllDisabled(): boolean {
    if (this.selectionLimitSignal() === null) return false;
    if (this.isAllSelected()) return false; // would deselect — always allowed
    return this.isSelectionLimitReachedSignal();
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
    // Skip the whole flow when there's nothing to clear — prevents a phantom
    // emit/firstPage when the user clicks the clear affordance with an
    // already-empty term (or when consumers programmatically call clear on
    // an empty state).
    const wasEmpty = this.globalSearchTerm() === '' && this.debouncedSearchTerm() === '';
    if (wasEmpty) return;

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
    if (field === 'actions_start') return this.stickyActionsSignal();
    return this.stickyStartColumnsSignal().has(field);
  }

  isStickyEnd(field: string): boolean {
    if (field === 'actions_end') return this.stickyActionsSignal();
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
    const engineResult = this.tryEngineAggregate(column.footer);
    if (engineResult !== null) return engineResult;

    // JS fallback — invoke the user-supplied / aggregate-builder function.
    const data = this.displayDataSignal();
    return String(column.footer(data));
  }

  getFooterRowCellValue(row: ResolvedFooterRow<T>, column: ColumnDefinition<T>): string {
    const fn = row.cells[column.field];
    if (!fn) return '';
    const engineResult = this.tryEngineAggregate(fn);
    if (engineResult !== null) return engineResult;
    return fn(this.displayDataSignal());
  }

  /**
   * Map the display view back to original-array indices. With the
   * `IndexedView<T>` pipeline this is essentially free for the engine path:
   * the view already holds indices into `originalDataSignal()`. Tree mode
   * and JS-derived sources (no indices, source !== original) fall back to
   * the per-row Map lookup; tree-table flattening reports `'unmappable'`
   * because flattened rows aren't in the original array.
   *
   * Engine aggregates accept a `Uint32Array` of indices to scope to;
   * `null` means "all rows in the dataset" (engine sees the original ingest).
   */
  private readonly displayIndicesSignal = computed<Uint32Array | null | 'unmappable'>(() => {
    const view = this.displayViewSignal();
    const original = this.originalDataSignal();

    // Engine-routed: source is original, indices is the answer.
    if (view.source === original) return view.indices;

    // JS-derived display (tree flatten, fuzzy search, custom search).
    // Walk and map; bail to 'unmappable' if any row isn't in the original.
    const idxMap = this.originalIndexMapSignal();
    const out = new Uint32Array(view.length);
    if (view.indices === null) {
      for (let i = 0; i < view.source.length; i++) {
        const idx = idxMap.get(view.source[i]);
        if (idx === undefined) return 'unmappable';
        out[i] = idx;
      }
    } else {
      for (let i = 0; i < view.indices.length; i++) {
        const idx = idxMap.get(view.source[view.indices[i]]);
        if (idx === undefined) return 'unmappable';
        out[i] = idx;
      }
    }
    return out;
  });

  /**
   * Engine-backed aggregate for a footer cell. Returns the formatted string
   * when the engine ran, `null` to signal the caller to fall back to JS.
   *
   * Routes through the engine only when:
   *   1. The footer function carries an `AggregateSpec` (was built via
   *      `aggregate(field, fn)`) — custom user functions stay on JS.
   *   2. The handle is loaded.
   *   3. The agg fn + column kind combination is safe (per
   *      `translateAggregate` — see its docs for the conservative rules).
   *   4. Visible rows can be mapped back to original-array indices (rules
   *      out tree-table mode for now).
   */
  private tryEngineAggregate(fn: unknown): string | null {
    const spec = getAggregateSpec<T>(fn);
    if (!spec) return null;

    const handle = this.engineHandleSignal();
    const kindMap = this.engineSchemaKindMapSignal();
    if (!handle || !kindMap) return null;

    const aggFn = translateAggregate<T>(spec.field, spec.fn, kindMap);
    if (!aggFn) return null;

    const indices = this.displayIndicesSignal();
    if (indices === 'unmappable') return null;

    const result = handle.aggregate(spec.field, indices, aggFn);
    switch (result.kind) {
      case 'number':
        return String(result.value);
      case 'count':
        return String(result.value);
      case 'date':
        return String(result.value); // ms-epoch number — matches `Number(date)` JS behavior
      case 'none':
        return null; // empty input: JS path returns `0`, let it.
    }
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
          } else if (colName !== 'select' && colName !== 'actions_start' && colName !== 'actions_end' && colName !== '__drag_handle') {
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
    const specialCols = new Set(['select', '__detail_expand', '__drag_handle', 'actions_start', 'actions_end']);
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

  /**
   * Toggle the expansion state of a single group, addressed by its full path.
   *
   * Path-based addressing is needed for multi-level grouping where two groups
   * can share the same leaf-level value (e.g. "US → CA" and "MX → CA"); for
   * single-level grouping `path` is just `[groupValue]`.
   */
  toggleGroupExpand(path: readonly unknown[]): void {
    const node = this.findGroupByPath(path);
    if (!node) return;

    const wasExpanded = node.expanded;
    const key = encodeGroupPath(path);

    this.expandedGroups.update((set) => {
      // Lazy-initialize on first interaction: snapshot current expanded paths.
      let newSet: Set<string>;
      if (set === null) {
        newSet = new Set();
        const collect = (nodes: readonly RowGroup<T>[]) => {
          for (const n of nodes) {
            if (n.expanded) newSet.add(encodeGroupPath(n.path));
            if (n.children.length > 0) collect(n.children);
          }
        };
        collect(this.groupedDataSignal());
      } else {
        newSet = new Set(set);
      }

      if (wasExpanded) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });

    this.groupExpandChange.emit({ groupValue: node.groupValue, path, expanded: !wasExpanded });
  }

  /** Expand every group at every depth. */
  expandAllGroups(): void {
    const all = new Set<string>();
    const visit = (nodes: readonly RowGroup<T>[]) => {
      for (const n of nodes) {
        all.add(encodeGroupPath(n.path));
        if (n.children.length > 0) visit(n.children);
      }
    };
    visit(this.groupedDataSignal());
    this.expandedGroups.set(all);
  }

  /** Collapse every group at every depth. */
  collapseAllGroups(): void {
    this.expandedGroups.set(new Set());
  }

  /** Locate a group node by its path. Walks the (already-computed) tree. */
  private findGroupByPath(path: readonly unknown[]): RowGroup<T> | undefined {
    let nodes: readonly RowGroup<T>[] = this.groupedDataSignal();
    let found: RowGroup<T> | undefined;
    for (const key of path) {
      found = nodes.find((n) => n.groupValue === key);
      if (!found) return undefined;
      nodes = found.children;
    }
    return found;
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

    // Pagination state is driven by three disjoint triggers. Each effect owns
    // exactly one input — reads of other signals are `untracked()` so an update
    // to one source never fires the other effects (prevents e.g. a server-side
    // `totalItems` update from yanking pageIndex back to 0).

    // Trigger: paginationOptions / showFirstLastButtons / disabled change.
    //
    // The previous version unconditionally overwrote `pageSize` from
    // `options.pageSize` on every fire — so the moment `disabled` or
    // `showFirstLastButtons` emitted, the user's dropdown choice (e.g.
    // "100 per page") got reverted to the static initial value. We now
    // only sync `pageSize` when `options.pageSize` *itself* changes
    // between two reads; otherwise the user's live choice is preserved.
    effect(() => {
      const options = this.paginationOptions();
      const showFirstLast = this.showFirstLastButtons();
      const disabled = this.disabled();
      if (!options) return;
      const optionsPageSize = options.pageSize ?? 10;
      const seen = this.lastSeenOptionsPageSize;
      const optionsPageSizeChanged = seen === undefined || seen !== optionsPageSize;
      this.lastSeenOptionsPageSize = optionsPageSize;
      this.paginationState.update((state) => ({
        ...state,
        // Only override the user's interactive choice when the *consumer-
        // declared* page size actually changed. Re-renders that just toggle
        // `disabled` no longer touch pageSize.
        pageSize: optionsPageSizeChanged ? optionsPageSize : state.pageSize,
        showFirstLastButtons: showFirstLast,
        disabled,
      }));
    });

    // Trigger: data() changes — reset pageIndex, clear caches, drop dangling
    // selection.
    //
    // Selection-preservation rule: when the new `data` array still contains a
    // previously-selected row by reference, keep it. Templates routinely pass
    // a derived array (`users().slice(0, N)`, `users().filter(...)`) inline,
    // which produces a fresh reference every CD tick but the row refs inside
    // are stable. Wiping the whole selection on every ref change made clicks
    // silently dropped between renders — model and DOM drift out of sync.
    effect(() => {
      const data = this.data();
      untracked(() => {
        this.htmlCache.clear();
        // Clamp pageIndex into the valid range instead of resetting to 0.
        // Resetting on every data ref change made navigation feel broken:
        // any inline derived data array (`users().slice(0, N)`, etc.) mints
        // a fresh ref each CD pass, so clicking "next" landed back on page 1
        // every time. Clamping only intervenes when the user's current page
        // is genuinely out of range (e.g. row count just dropped).
        const totalItems = this.totalItemsSignal();
        const pageSize = this.paginationState().pageSize || 10;
        const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1);
        this.paginationState.update((state) => ({
          ...state,
          pageIndex: Math.min(state.pageIndex, maxPageIndex),
          totalItems,
        }));

        if (!data || data.length === 0) {
          this.selectedSignal.set(new Set());
          return;
        }
        const current = this.selectedSignal();
        if (current.size === 0) return;
        const liveRows = new Set<T>(data);
        let dropped = false;
        const next = new Set<T>();
        for (const row of current) {
          if (liveRows.has(row)) next.add(row);
          else dropped = true;
        }
        if (dropped) this.selectedSignal.set(next);
      });
    });

    // Trigger: totalItems changes independently (server-side pagination)
    effect(() => {
      const totalItems = this.totalItemsSignal();
      untracked(() => {
        this.paginationState.update((state) => ({ ...state, totalItems }));
      });
    });

    // Note: Sorting now works for both offset and cursor modes
    // Cursor mode emits events for server-side sorting

    // Debounce global search term.
    // The effect runs once on creation with the initial empty `searchTerm`,
    // so emitting unconditionally produced a phantom `globalSearchChange`
    // event on first paint. Server-side cursor consumers that load data both
    // in `ngOnInit` and in `(globalSearchChange)` ended up making two
    // identical first-load HTTP calls. Both the emit and `firstPage()` now
    // gate on the term actually changing.
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
        const changed = searchTerm !== previousSearchTerm;
        this.debouncedSearchTerm.set(searchTerm);

        // For cursor/server-side pagination, emit event — but only when the
        // term genuinely changed. The initial empty-string emit on mount is
        // not a user action and would race with consumer-side initial loads.
        const mode = this.modeSignal();
        if (changed && mode === 'cursor' && config?.enabled) {
          const searchMode = config.mode ?? 'contains';
          this.globalSearchChange.emit({
            searchTerm,
            mode: searchMode,
          });
        }

        // Reset to first page when search changes
        if (changed) {
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

    // Auto-expand ancestors of matching nodes when a tree-table column-filter
    // or global-search is active. This used to live inside filteredDataSignal /
    // globalSearchedDataSignal, but performing the signal write inside those
    // computeds created an NG0103 cycle (the computed registered itself as a
    // consumer of expandedRowKeys, which it then wrote to → re-trigger →
    // re-write → ...). Moving the side effect into a dedicated effect()
    // keeps the data computeds pure and breaks the cycle.
    //
    // Tracked deps: tree-table flag, hierarchy mode, filter state, debounced
    // search term, and the post-filter+search data. None of them are
    // expandedRowKeys — so writing to it does NOT re-trigger this effect.
    effect(() => {
      if (!this.isTreeTableSignal()) return;

      const hierarchyMode = this.filterHierarchyModeSignal();
      if (hierarchyMode === 'none') return;

      // Only auto-expand when filtering or search is actually active.
      const hasFilters = this.filterState().length > 0;
      const hasSearch = !!this.debouncedSearchTerm();
      if (!hasFilters && !hasSearch) return;

      // Read the post-filter+search output (covers both column filters and
      // global search). Pure read — no signal writes inside this computed.
      const filtered = this.globalSearchedDataSignal();
      if (filtered.length === 0) return;

      const childrenProp = this.childrenPropertySignal();
      const treeConfig = this.treeTableConfigSignal();
      const customGetKey = treeConfig?.getRowKey;
      const ancestorKeys = collectAncestorKeys(filtered as T[], (row, index) => generateRowKey(row, customGetKey, index), childrenProp);
      if (ancestorKeys.size === 0) return;

      // Wrap the read+write of expandedRowKeys in untracked() so this effect
      // doesn't register as a consumer of the signal it's about to update.
      untracked(() => {
        const current = this.expandedRowKeys();
        const merged = new Set([...current, ...ancestorKeys]);
        if (merged.size !== current.size) {
          this.expandedRowKeys.set(merged);
        }
      });
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
   * Performs fuzzy search via the shared FuseCache helper. The cache
   * invalidates on data-ref OR keys change — so toggling column visibility
   * or `excludeFields` correctly rebuilds the index, which the previous
   * data-only invalidation missed.
   */
  private performFuzzySearch(data: readonly T[], searchTerm: string, config: NonNullable<GlobalSearchConfig<T>>): readonly T[] {
    const excludeFields = new Set(config.excludeFields ?? []);
    const searchableFields =
      this.columns()
        ?.map((col) => col.field)
        .filter((f) => !excludeFields.has(f)) ?? [];

    if (searchableFields.length === 0) return [];

    const searchableKeys = searchableFields.map((f) => String(f));

    // Recreate the cache only when the consumer's `fuseOptions` reference
    // changes — not on every keystroke. This honors consumer overrides
    // (threshold, ignoreLocation, etc.) without thrashing the cache.
    const consumerOptions = config.fuseOptions;
    if (consumerOptions !== this._fuseOptionsRef) {
      this._fuseOptionsRef = consumerOptions;
      this.fuseCache = createFuseCache<T>(consumerOptions ? this.extractFuseOverrides(consumerOptions) : undefined);
    }

    return this.fuseCache.search(searchTerm, data, searchableKeys);
  }

  /** Whitelist Fuse options that are safe to override per-instance. */
  private extractFuseOverrides(opts: IFuseOptions<T>): Omit<IFuseOptions<T>, 'keys'> {
    return {
      threshold: opts.threshold,
      ignoreLocation: opts.ignoreLocation,
      minMatchCharLength: opts.minMatchCharLength,
      includeScore: opts.includeScore,
      isCaseSensitive: opts.isCaseSensitive,
    };
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

/**
 * Map an engine `GroupKey` (typed wire shape) to the `unknown` value the JS
 * `RowGroup<T>` uses for `groupValue`. We never reach here for date columns —
 * `translateGroupFields` rejects them because the engine's ms-epoch numeric
 * key would mismatch the original `Date | string | number` types JS would
 * have extracted.
 */
function engineKeyToValue(key: import('./engine').GroupKey): unknown {
  switch (key.kind) {
    case 'null':
      return null;
    case 'text':
      return key.value;
    case 'number':
      return key.value;
    case 'bool':
      return key.value;
    case 'date':
      return key.value; // ms-epoch, reachable only if translateGroupFields is relaxed later
  }
}
