// table.component.ts
import { CdkTableModule, DataSource } from '@angular/cdk/table';
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
  Injector,
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
  generateRowKey,
  getRowChildren,
  sortTreeData,
} from './table.helpers';
import { ColumnUiController } from './controllers/column-ui.controller';
import { FilterController } from './controllers/filter.controller';
import { FooterController } from './controllers/footer.controller';
import { GlobalSearchController } from './controllers/global-search.controller';
import { GroupController } from './controllers/group.controller';
import { PaginationController } from './controllers/pagination.controller';
import { SelectionController } from './controllers/selection.controller';
import { SortController } from './controllers/sort.controller';
import { TreeController } from './controllers/tree.controller';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  TableEngineService,
  TableHandle,
  buildSchemaKindMap,
  inferEngineSchema,
  normalizeDirection,
  translateGroupFields,
  translateSort,
  type ColumnKind,
  type ColumnSchema,
  type SortDef,
} from './engine';

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

// Types for better type safety
interface ActionItem<T> {
  readonly key: ActionType;
  readonly config: TableAction<T>;
}

interface BulkActionItem<T> {
  readonly key: ActionType;
  readonly config: TableBulkAction<T>;
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
  /** Passed to controllers so they can register their own `effect()`s outside the host's injection context. */
  private readonly injector = inject(Injector);

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
   * Effective pagination options — `fieldConfig.pagination` merged with any
   * runtime overrides pushed via `setPagination()`. Returns `null` when the
   * consumer didn't configure pagination at all, in which case the
   * pagination footer is hidden. The runtime overrides bag lives on the
   * PaginationController (declared lower); this computed reads from it.
   */
  readonly paginationOptions: Signal<PaginationOptions | null> = computed<PaginationOptions | null>(() => {
    const fromConfig = this.fieldConfig()?.pagination ?? null;
    const overrides = this.pagination.dynamicOverrides();
    if (!fromConfig && !overrides) return null;
    return { ...(fromConfig ?? {}), ...(overrides ?? {}) } as PaginationOptions;
  });

  // ============================================================================
  // Pagination (controller + template-facing aliases)
  // ============================================================================
  //
  // The PaginationController owns `state`, the runtime-overrides bag, the
  // two state-sync effects (options → state, totalItems → state), and the
  // page-nav methods. The host keeps the data-ref orchestration effect
  // because it spans selection / html-cache too; it calls
  // `this.pagination.clampToData(totalItems)` from inside that effect.
  // `totalItems` is wrapped in `computed()` to defer the read — the
  // `totalItemsSignal` field is declared further down.

  private readonly pagination: PaginationController = new PaginationController({
    paginationOptions: this.paginationOptions,
    totalItems: computed(() => this.totalItemsSignal()),
    showFirstLastButtons: this.showFirstLastButtons,
    disabled: this.disabled,
    injector: this.injector,
    onPageChange: (event) => this.pageChange.emit(event),
    onCursorChange: (event) => this.cursorChange.emit(event),
  });

  readonly pageIndexSignal = this.pagination.pageIndex;
  readonly pageSizeSignal = this.pagination.pageSize;
  readonly pageSizeOptionsSignal = this.pagination.pageSizeOptions;
  readonly modeSignal = this.pagination.mode;
  readonly nextCursorSignal = this.pagination.nextCursor;
  readonly prevCursorSignal = this.pagination.prevCursor;
  private readonly totalPagesSignal = this.pagination.totalPages;

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

  // Filter / sort / selection state all live on their controllers
  // (instantiated lower in the file once their signal dependencies are
  // declared). Templates and external callers still reach them through the
  // aliases exposed on the component.
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
  readonly openBulkActionDropdown = signal<string | null>(null); // Track which bulk action dropdown is open

  // Tree-table state (expansion, animating keys, topology caches) lives on
  // the TreeController instantiated lower in the file. `expandedRowKeys` and
  // `treeAnimatingKeys` are re-exposed there as aliases for templates.

  // Column visibility, reorder, resize, and sticky state all live on the
  // ColumnUiController declared lower (after `columnDefsSignal` /
  // `displayedColumnsSignal` are available). Template-facing aliases are
  // wired up there.
  readonly enableResizingSignal = computed(() => this.fieldConfig()?.enableColumnResizing ?? false);

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
  // The cells, the aggregate routing, and the multi-row CDK column sets live
  // on FooterController (declared further down). Only the projected-template
  // surface stays here — those are content-children of *this* component, so
  // they must live on the host. Aliases for `hasFooterSignal` etc. are
  // exposed next to the FooterController declaration.
  readonly showFooterSignal = computed(() => this.fieldConfig()?.showFooter ?? false);
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

  /** Pre-resolved multi-row footer (built by `createTable({ footerRows: [...] })`). */
  readonly resolvedFooterRowsSignal = computed(() => this.config()?.resolvedFooterRows ?? []);

  /** Total column count including utility columns (selection, actions, etc.) */
  readonly totalColumnsCountSignal = computed(() => this.displayedColumnsSignal().length);

  // ============================================================================
  // Native Drag State (Row Reordering)
  // ============================================================================
  // Column-drag state (`draggedColumnField`, `dragOverColumnField`) lives on
  // the ColumnUiController and is re-exposed under its historical names.
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

  // Column reorder enable flag — state and handlers live on ColumnUiController.
  readonly enableColumnReorderSignal = computed(() => this.fieldConfig()?.enableColumnReorder ?? false);

  // ============================================================================
  // Row Reordering
  // ============================================================================
  readonly enableRowReorderSignal = computed(() => {
    const config = this.fieldConfig();
    if (!config?.enableRowReorder) return false;
    // Disable when sort or filter is active
    if (this.sorting.state().field) return false;
    if (this.filtering.hasActive()) return false;
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
  //
  // GroupController (declared lower) owns the grouped tree, the display
  // stream, expansion state, and the engine-routed groupBy pipeline.
  // `groupConfigSignal` and `resolvedGroupAggregatesSignal` are kept here
  // because they read from `fieldConfig()` / `config()` which other
  // computeds (e.g. footer aggregates) also depend on.
  readonly groupConfigSignal = computed(() => this.fieldConfig()?.grouping);
  readonly resolvedGroupAggregatesSignal = computed(() => this.config()?.resolvedGroupAggregates);
  readonly hasGroupFooterRowsSignal = computed(() => (this.groupConfigSignal()?.groupFooterRows?.length ?? 0) > 0);

  // Global search — the GlobalSearchController owns `term`, `debouncedTerm`,
  // the debounce effect, the Fuse cache, and the searched-view pipeline.
  // Declared lower in the file (after `filteredViewSignal` so the deps
  // resolve cleanly); template-facing aliases are wired up there.

  // `sortFieldSignal` / `sortDirectionSignal` are exposed as aliases off the
  // SortController, declared lower in the file next to the selection controller.
  // Pagination signals (`pageIndexSignal` etc.) are aliased off the
  // PaginationController declared above.

  readonly hasSelectionSignal = computed(() => this.fieldConfig()?.hasSelection ?? false);

  /** Max number of rows that can be checkbox-selected at once. `null` = unlimited (default). */
  readonly selectionLimitSignal = computed<number | null>(() => {
    const n = this.fieldConfig()?.selectionLimit;
    return typeof n === 'number' && n >= 1 ? n : null;
  });

  /**
   * Click-to-highlight UX mode. Distinct from checkbox selection — `single`
   * highlights at most one row at a time, `multi` toggles a Set, `false`
   * disables row-click highlighting entirely.
   */
  readonly selectableRowsModeSignal = computed<false | 'single' | 'multi'>(() => {
    const val = this.fieldConfig()?.selectableRows;
    if (val === 'multi') return 'multi';
    return val ? 'single' : false;
  });

  // `isSelectionLimitReachedSignal`, `showSelectAllCheckboxSignal`,
  // `selectableRowsSignal`, and the per-row predicate signal are exposed on
  // the selection controller (declared below). The template-/spec-facing
  // aliases are wired up there to keep the public surface stable.
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

  // Tree table — config is read here (the controller and other signals both
  // depend on it). Topology / expansion state aliases come off the
  // TreeController itself, declared further down.
  readonly treeTableConfigSignal = computed(() => this.fieldConfig()?.treeTable);

  /** Which data column renders the expand/collapse toggle. */
  readonly treeColumnFieldSignal = computed(() => {
    const config = this.treeTableConfigSignal();
    if (!config?.enabled) return null;
    const visible = this.fieldConfig()?.visible ?? [];
    const index = config.treeColumnIndex ?? 0;
    const safeIndex = index >= 0 && index < visible.length ? index : 0;
    return visible[safeIndex] ?? null;
  });

  // ============================================================================
  // Tree (controller + template-facing aliases)
  // ============================================================================
  //
  // Declared here — before `displayViewSignal` and the SelectionController —
  // so the data pipeline below and the cascade callbacks below can read
  // `this.tree` after this field initializes. The data signals it depends on
  // (`sortedDataSignal`, `originalDataSignal`) are declared further down, so
  // we wrap those references in `computed()` to defer the read until call
  // time (Angular doesn't evaluate computed bodies eagerly).

  private readonly tree = new TreeController<T>({
    config: this.treeTableConfigSignal,
    sortedData: computed(() => this.sortedDataSignal()),
    originalData: computed(() => this.originalDataSignal()),
    onExpansionChange: (event) => this.expansionChange.emit(event),
  });

  readonly expandedRowKeys = this.tree.expandedKeys;
  readonly treeAnimatingKeys = this.tree.animatingKeys;
  readonly isTreeTableSignal = this.tree.enabled;
  readonly treeIndentSizeSignal = this.tree.indentSize;
  private readonly childrenPropertySignal = this.tree.childrenProperty;
  readonly showIndentGuidesSignal = this.tree.showIndentGuides;
  readonly checkboxCascadeSignal = this.tree.cascadeMode;
  readonly filterHierarchyModeSignal = this.tree.filterHierarchyMode;

  // Filter computed signals — `activeFiltersSignal`, `hasActiveFiltersSignal`,
  // and `activeFiltersCountSignal` are aliased off the FilterController
  // (declared lower in the file alongside the other controllers).
  readonly enableFilteringSignal = computed(() => this.fieldConfig()?.enableFiltering ?? false);

  // Column visibility — `isColumnVisibilityEnabled`, `alwaysVisibleColumns`,
  // and `columnVisibilityLabels` are aliased off the ColumnUiController.
  readonly columnVisibilityConfig = computed(() => this.fieldConfig()?.columnVisibility);

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
  private readonly originalDataSignal: Signal<readonly T[]> = computed(() => this.data() ?? []);

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
    const filters = this.filtering.state();
    const mode = this.modeSignal();

    if (mode === 'cursor' || filters.length === 0) return viewOf(data, null);

    const predicate = (row: T) => filters.every((filter) => this.filtering.applyFilter(row, filter));

    if (this.isTreeTableSignal()) {
      const hierarchyMode = this.filterHierarchyModeSignal();
      const childrenProp = this.childrenPropertySignal();
      return viewOf(filterTreeData(data as T[], predicate, childrenProp, hierarchyMode), null);
    }

    // Engine path. We accept the engine result only if every active filter
    // translates without ambiguity; one untranslatable filter forces JS for
    // the whole list (rather than producing wrong results from a partial
    // application). Hybrid per-column dispatch is a future refinement.
    const engineIndices = this.filtering.tryEngineFilterIndices();
    if (engineIndices) return viewOf(data, engineIndices);

    return viewOf(data.filter(predicate), null);
  });

  /** Public materialized form. Lazy — only allocated when actually read. */
  private readonly filteredDataSignal = computed(() => materializeView(this.filteredViewSignal()));

  // ============================================================================
  // Global Search (controller + template-facing aliases)
  // ============================================================================
  //
  // Declared here — after `filteredViewSignal` so the deps resolve cleanly.
  // The controller owns `term`, `debouncedTerm`, the Fuse cache, the
  // debounce effect, and the searched-view pipeline. The host re-exposes
  // its signals under their historical names so templates and specs work
  // unmodified.

  private readonly globalSearch = new GlobalSearchController<T>({
    config: computed(() => this.fieldConfig()?.globalSearch),
    filteredView: this.filteredViewSignal,
    mode: this.modeSignal,
    isTreeTable: this.isTreeTableSignal,
    filterHierarchyMode: this.filterHierarchyModeSignal,
    childrenProperty: this.childrenPropertySignal,
    columns: this.columns,
    engineHandle: this.engineHandleSignal,
    engineSchemaKindMap: this.engineSchemaKindMapSignal,
    injector: this.injector,
    onSearchChange: (event) => this.globalSearchChange.emit(event),
    onTermChanged: () => this.firstPage(),
  });

  readonly globalSearchTerm = this.globalSearch.term;
  private readonly debouncedSearchTerm = this.globalSearch.debouncedTerm;
  readonly hasGlobalSearchSignal = this.globalSearch.enabled;
  readonly globalSearchModeSignal = this.globalSearch.searchMode;
  readonly globalSearchPlaceholderSignal = this.globalSearch.placeholder;
  readonly globalSearchClearAriaSignal = this.globalSearch.clearAriaLabel;
  readonly hasGlobalSearchTermSignal = this.globalSearch.hasTerm;
  private readonly searchedViewSignal = this.globalSearch.searchedView;

  /** Public materialized form. Lazy — only allocated when actually read. */
  private readonly globalSearchedDataSignal: Signal<readonly T[]> = computed(() => materializeView(this.searchedViewSignal()));

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
    const { field, direction } = this.sorting.state();

    if (!field || !direction) return view;

    const compareFn = (a: T, b: T) =>
      this.sorting.compareValues((a as Record<string, unknown>)[field], (b as Record<string, unknown>)[field], direction);

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
  private readonly sortedDataSignal: Signal<readonly T[]> = computed(() => materializeView(this.sortedViewSignal()));

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

  /**
   * Display view — what the page-slice boundary slices. Tree mode wraps the
   * controller's flattened data (no indices); non-tree forwards the sorted
   * view as-is. `currentDataSignal` reads this and only materializes the
   * page rows.
   */
  private readonly displayViewSignal = computed<IndexedView<T>>(() => {
    const flattened = this.tree.flattened();
    if (flattened)
      return viewOf(
        flattened.map((f) => f.data),
        null,
      );
    return this.sortedViewSignal();
  });

  /** Public materialized form. Lazy — only allocated when actually read. */
  readonly displayDataSignal: Signal<readonly T[]> = computed(() => materializeView(this.displayViewSignal()));

  // Row grouping — `groupedDataSignal` and `groupedDisplaySignal` are
  // exposed as aliases off the GroupController (declared below).

  // Total items for pagination - must be defined after displayDataSignal
  readonly totalItemsSignal: Signal<number> = computed(() => {
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
  private readonly currentDataSignal: Signal<readonly T[]> = computed(() => {
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

  // ============================================================================
  // Selection
  // ============================================================================
  //
  // Selection state (`selected`, `activeRow`, `activeRows`), cascade rules,
  // and the per-row predicate live in `controllers/selection.controller.ts`.
  // The component re-exports the controller's signals/methods under their
  // historical names so templates, specs, and external callers see no API
  // change. See [[feedback_extract_shared_patterns]] — this is step 1 of the
  // SOLID-aligned table refactor.

  private readonly selection = new SelectionController<T>({
    currentData: this.currentDataSignal,
    hasSelection: this.hasSelectionSignal,
    selectionLimit: this.selectionLimitSignal,
    isRowSelectable: computed(() => {
      const fn = this.fieldConfig()?.isRowSelectable;
      return typeof fn === 'function' ? fn : () => true;
    }),
    selectableRowsMode: this.selectableRowsModeSignal,
    cascadeMode: this.checkboxCascadeSignal,
    isTreeTable: this.isTreeTableSignal,
    childrenProperty: this.childrenPropertySignal,
    getChildren: (row, prop) => getRowChildren(row, prop),
    getParent: (row) => this.tree.getParent(row),
    hasChildren: (row) => this.tree.hasChildren(row),
    onSelectionChange: (selected) => this.selectionChange.emit(selected),
    onActiveRowChange: (row) => this.activeRowChange.emit(row),
    onActiveRowsChange: (rows) => this.activeRowsChange.emit(rows),
  });

  // Public re-exports of controller state. Naming matches the pre-refactor
  // shape so existing templates and specs work unmodified.
  readonly selectedSignal = this.selection.selected;
  readonly activeRow = this.selection.activeRow;
  readonly activeRows = this.selection.activeRows;
  readonly isSelectionLimitReachedSignal = this.selection.isSelectionLimitReached;
  readonly showSelectAllCheckboxSignal = this.selection.showSelectAllCheckbox;
  readonly selectableRowsSignal = this.selection.selectableRowsActive;

  // ============================================================================
  // Sorting
  // ============================================================================
  //
  // Sort cycle (asc → desc → unsorted) and the type-aware row comparator live
  // in `controllers/sort.controller.ts`. The upstream `sortedViewSignal`
  // pipeline below reads `this.sorting.state()` and calls
  // `this.sorting.compareValues(...)` for the JS fallback path.

  private readonly sorting = new SortController({
    isResizing: computed(() => this.isResizingSignal()),
    isOffsetMode: computed(() => this.modeSignal() === 'offset'),
    onResetToFirstPage: () => this.firstPage(),
    onSortFieldChange: (field) => this.sortFieldChange.emit(field),
    onSortDirectionChange: (direction) => this.sortDirectionChange.emit(direction),
    onSortChange: (state) => this.sortChange.emit({ field: state.field, direction: state.direction }),
  });

  readonly sortFieldSignal = this.sorting.field;
  readonly sortDirectionSignal = this.sorting.direction;

  // ============================================================================
  // Filtering
  // ============================================================================
  //
  // Column-filter list, dropdown open-state, engine wire-translation memo,
  // and the per-row predicate live in `controllers/filter.controller.ts`.
  // The upstream `filteredViewSignal` pipeline below reads
  // `this.filtering.state()` and calls `this.filtering.applyFilter(...)` /
  // `this.filtering.tryEngineFilterIndices()`.

  private readonly filtering = new FilterController<T>({
    columnFiltersMap: this.columnFiltersMapSignal,
    engineHandle: this.engineHandleSignal,
    engineSchema: this.engineSchemaSignal,
    onResetToFirstPage: () => this.firstPage(),
    onCloseDropdowns: () => {
      if (this.isBrowser) {
        this.elementRef.nativeElement.querySelectorAll('[id^="filter-popover-"][popover]').forEach((el: HTMLElement) => el.hidePopover?.());
      }
    },
    onFilterChange: (payload) => this.filterChange.emit(payload),
  });

  readonly openFilterField = this.filtering.openField;
  readonly activeFiltersSignal = this.filtering.activeFilters;
  readonly hasActiveFiltersSignal = this.filtering.hasActive;
  readonly activeFiltersCountSignal = this.filtering.activeCount;

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

  readonly selectedArraySignal = this.selection.selectedArray;

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

  readonly isAllSelected = this.selection.isAllSelected;

  // ============================================================================
  // Column UI (visibility / reorder / resize / sticky)
  // ============================================================================
  //
  // Declared after `displayedColumnsSignal` / `orderedColumnDefsSignal` /
  // `columnDefsSignal` so the deps resolve cleanly. The host re-exposes
  // controller state under historical names so templates and specs work
  // unmodified. Initialization (`applyInitialVisibility`) runs in the host
  // `setupEffects` block so it's reactive to config changes.

  private readonly columnUi = new ColumnUiController<T>({
    columnDefs: this.columnDefsSignal,
    displayedColumns: this.displayedColumnsSignal,
    visibilityConfig: this.columnVisibilityConfig,
    enableResizing: this.enableResizingSignal,
    enableReorder: this.enableColumnReorderSignal,
    stickyConfig: computed(() => this.fieldConfig()?.stickyColumns),
    hasSelection: this.hasSelectionSignal,
    hasActions: this.hasActionsSignal,
    canUseStorage: this.hasLocalStorage,
    onColumnReorder: (event) => this.columnReorder.emit(event),
    onColumnResize: (event) => this.columnResize.emit(event),
  });

  // Public re-exports of controller state. Naming matches the pre-refactor
  // shape so templates, specs, and external callers see no API change.
  readonly columnVisibilityState = this.columnUi.visibilityState;
  readonly isColumnVisibilityEnabled = this.columnUi.isVisibilityEnabled;
  readonly alwaysVisibleColumns = this.columnUi.alwaysVisible;
  readonly columnVisibilityLabels = this.columnUi.visibilityLabels;
  readonly columnOrderOverride = this.columnUi.orderOverride;
  readonly columnWidthsSignal = this.columnUi.widths;
  readonly isResizingSignal = this.columnUi.isResizing;
  readonly stickyStartColumnsSignal = this.columnUi.stickyStartColumns;
  readonly stickyEndColumnsSignal = this.columnUi.stickyEndColumns;
  readonly hasStickyColumnsSignal = this.columnUi.hasStickyColumns;
  readonly stickySelectionSignal = this.columnUi.stickySelection;
  readonly stickyActionsSignal = this.columnUi.stickyActions;
  readonly draggedColumnField = this.columnUi.draggedField;
  readonly dragOverColumnField = this.columnUi.dragOverField;

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
    this.globalSearch.dispose();

    if (this.attachedConfig) {
      _detachTableInstance(this.attachedConfig, this, this.attachedId ?? undefined);
      this.attachedConfig = null;
      this.attachedId = null;
    }

    this.disposeEngineHandle();
  }

  firstPage(): void {
    this.pagination.firstPage();
  }

  previousPage(): void {
    this.pagination.previousPage();
  }

  nextPage(): void {
    this.pagination.nextPage();
  }

  lastPage(): void {
    this.pagination.lastPage();
  }

  gotoPage(pageNumber: number): void {
    this.pagination.gotoPage(pageNumber);
  }

  setPagination(opts: Partial<PaginationOptions>): void {
    this.pagination.setPagination(opts);
  }

  clearSelection(): void {
    this.selection.clearSelection();
  }

  sort(field: string): void {
    this.sorting.sort(field);
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
    this.selection.toggleRow(row, checked);
  }

  toggleSelectAll(checked: boolean): void {
    this.selection.toggleSelectAll(checked);
  }

  isSelected(row: T): boolean {
    return this.selection.isSelected(row);
  }

  isRowSelectDisabled(row: T): boolean {
    return this.selection.isRowSelectDisabled(row);
  }

  isRowSelectDisabledByLimit(row: T): boolean {
    return this.selection.isRowSelectDisabledByLimit(row);
  }

  isSelectAllDisabled(): boolean {
    return this.selection.isSelectAllDisabled();
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

  // Handler methods for pagination component (forwarders to PaginationController)
  handlePaginationPageChange(event: PageSizeChange): void {
    this.pagination.handlePageChange(event);
  }

  handleCursorChange(event: CursorPageChange): void {
    this.pagination.handleCursorChange(event);
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

  // Filter methods (thin forwarders to the FilterController)
  toggleFilterDropdown(field: string): void {
    this.filtering.toggleDropdown(field);
  }

  closeAllFilterDropdowns(): void {
    this.filtering.closeAllDropdowns();
  }

  isFilterOpen(field: string): boolean {
    return this.filtering.isOpen(field);
  }

  getFilterForColumn(field: string): ColumnFilter<T> | undefined {
    return this.filtering.getColumnFilter(field);
  }

  getActiveFilterForColumn(field: string): FilterConfig<T> | undefined {
    return this.filtering.getActiveFilterForColumn(field);
  }

  hasFilterForColumn(field: string): boolean {
    return this.filtering.hasFilterForColumn(field);
  }

  applyColumnFilter(field: string, value: unknown, operator: FilterOperator): void {
    this.filtering.applyColumnFilter(field, value, operator);
  }

  removeFilter(field: string): void {
    this.filtering.removeFilter(field);
  }

  clearAllFilters(): void {
    this.filtering.clearAll();
  }

  // Global search methods (thin forwarders to GlobalSearchController)
  onGlobalSearchChange(searchTerm: string): void {
    this.globalSearch.setTerm(searchTerm);
  }

  clearGlobalSearch(): void {
    this.globalSearch.clear();
  }

  // Column visibility methods (thin forwarders to ColumnUiController)
  isColumnVisible(field: string): boolean {
    return this.columnUi.isColumnVisible(field);
  }

  toggleColumnVisibility(field: string): void {
    this.columnUi.toggleVisibility(field);
  }

  showAllColumns(): void {
    this.columnUi.showAll();
  }

  hideAllColumns(): void {
    this.columnUi.hideAll();
  }

  resetColumnVisibility(): void {
    this.columnUi.reset();
  }

  // ============================================================================
  // Tree Table Methods (thin forwarders to TreeController)
  // ============================================================================

  hasChildren(row: T): boolean {
    return this.tree.hasChildren(row);
  }

  isRowExpanded(row: T): boolean {
    return this.tree.isExpanded(row);
  }

  /** 0 = root level */
  getRowLevel(row: T): number {
    return this.tree.getLevel(row);
  }

  getRowIndentPadding(row: T): number {
    return this.tree.getIndentPadding(row);
  }

  toggleRowExpand(row: T, event?: MouseEvent): void {
    this.tree.toggleRow(row, event);
  }

  expandAllRows(): void {
    this.tree.expandAll();
  }

  collapseAllRows(): void {
    this.tree.collapseAll();
  }

  expandToLevel(level: number): void {
    this.tree.expandToLevel(level);
  }

  collapseToLevel(level: number): void {
    this.tree.collapseToLevel(level);
  }

  isTreeColumn(field: string): boolean {
    return this.treeColumnFieldSignal() === field;
  }

  getAncestorFlags(row: T): boolean[] {
    return this.tree.getAncestorFlags(row);
  }

  isLastChild(row: T): boolean {
    return this.tree.isLastChild(row);
  }

  isTreeRowAnimating(row: T): boolean {
    return this.tree.isAnimating(row);
  }

  isIndeterminate(row: T): boolean {
    return this.selection.isIndeterminate(row);
  }

  /** Get the rendered cell HTML for use in tree-cell-content */
  getCellDisplay(row: T, column: ColumnDefinition<T>): string {
    const sync = this.getCellDisplaySync(row, column);
    if (sync) {
      return sync.isHtml ? (sync.safeHtml as string) : sync.value;
    }
    return '';
  }

  // ============================================================================
  // Sticky / Resize Methods (thin forwarders to ColumnUiController)
  // ============================================================================

  isStickyStart(field: string): boolean {
    return this.columnUi.isStickyStart(field);
  }

  isStickyEnd(field: string): boolean {
    return this.columnUi.isStickyEnd(field);
  }

  getColumnWidth(field: string): number | null {
    return this.columnUi.getColumnWidth(field);
  }

  onResizeStart(field: string, event: PointerEvent): void {
    this.columnUi.onResizeStart(field, event);
  }

  onResizeMove(event: PointerEvent): void {
    this.columnUi.onResizeMove(event);
  }

  onResizeEnd(): void {
    this.columnUi.onResizeEnd();
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

  // ============================================================================
  // Grouping (controller + template-facing aliases)
  // ============================================================================
  //
  // Declared here — after `displayDataSignal` and `displayIndicesSignal` —
  // because the grouping pipeline reads both. The public method bodies
  // (`toggleGroupExpand`, `expandAllGroups`, `collapseAllGroups`) below
  // forward to this controller; templates read `groupedDataSignal` and
  // `groupedDisplaySignal` through the aliases.

  private readonly grouping = new GroupController<T>({
    config: this.groupConfigSignal,
    resolvedGroupAggregates: this.resolvedGroupAggregatesSignal,
    hasGroupFooterRows: this.hasGroupFooterRowsSignal,
    displayData: this.displayDataSignal,
    displayIndices: this.displayIndicesSignal,
    originalData: this.originalDataSignal,
    engineHandle: this.engineHandleSignal,
    engineSchema: this.engineSchemaSignal,
    onGroupExpand: (event) => this.groupExpandChange.emit(event),
  });

  readonly isGroupedSignal = this.grouping.isGrouped;
  readonly groupDepthSignal = this.grouping.depth;
  readonly hasGroupCaptionAggregatesSignal = this.grouping.hasCaptionAggregates;
  readonly expandedGroups = this.grouping.expandedPaths;
  readonly groupedDataSignal = this.grouping.groupedData;
  readonly groupedDisplaySignal = this.grouping.groupedDisplay;

  // ============================================================================
  // Footer (controller + template-facing aliases)
  // ============================================================================
  //
  // Declared here — after `displayDataSignal` and `displayIndicesSignal` —
  // because engine-routed aggregates need them. The template-facing
  // signals (`hasFooterSignal`, `footerColumnSets`) and per-cell value
  // accessors all forward to this controller.

  private readonly footer = new FooterController<T>({
    resolvedFooterRows: this.resolvedFooterRowsSignal,
    columnDefs: this.columnDefsSignal,
    orderedColumnDefs: this.orderedColumnDefsSignal,
    displayedColumns: this.displayedColumnsSignal,
    showFooter: this.showFooterSignal,
    hasFooterTemplateDirectives: this.hasFooterTemplateDirectives,
    engineHandle: this.engineHandleSignal,
    engineSchemaKindMap: this.engineSchemaKindMapSignal,
    displayIndices: this.displayIndicesSignal,
    displayData: this.displayDataSignal,
  });

  readonly hasAggregateFooterSignal = this.footer.hasAggregateFooter;
  readonly hasFooterRowsSignal = this.footer.hasFooterRows;
  readonly hasFooterSignal = this.footer.hasFooter;
  readonly footerColumnSets = this.footer.columnSets;

  // Template-facing value accessors — forward straight to the controller.
  getFooterValue(column: ColumnDefinition<T>): string {
    return this.footer.getFooterValue(column);
  }

  getFooterRowCellValue(row: ResolvedFooterRow<T>, column: ColumnDefinition<T>): string {
    return this.footer.getFooterRowCellValue(row, column);
  }

  getFooterCellValueForCol(rowIdx: number, baseCol: string): string {
    return this.footer.getFooterCellValueForCol(rowIdx, baseCol);
  }

  getColspanCellValue(cell: ResolvedColspanCell): string {
    return this.footer.getColspanCellValue(cell);
  }

  getGroupColspanCellValue(cell: ResolvedColspanCell, group: RowGroup<T>): string {
    return this.footer.getGroupColspanCellValue(cell, group);
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
    this.selection.toggleActiveRow(row);
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
  // Column Reordering (thin forwarders to ColumnUiController)
  // ============================================================================

  onColumnDragStart(field: string, event: DragEvent): void {
    this.columnUi.onDragStart(field, event);
  }

  onColumnDragOver(field: string, event: DragEvent): void {
    this.columnUi.onDragOver(field, event);
  }

  onColumnDragLeave(): void {
    this.columnUi.onDragLeave();
  }

  onColumnDrop(field: string, event: DragEvent): void {
    this.columnUi.onDrop(field, event);
  }

  onColumnDragEnd(): void {
    this.columnUi.onDragEnd();
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

  toggleGroupExpand(path: readonly unknown[]): void {
    this.grouping.toggle(path);
  }

  expandAllGroups(): void {
    this.grouping.expandAll();
  }

  collapseAllGroups(): void {
    this.grouping.collapseAll();
  }

  getGroupAggregateValue(group: RowGroup<T>, field: string): string {
    return this.grouping.getAggregateValue(group, field);
  }

  getGroupCaptionValue(group: RowGroup<T>, field: string): string {
    return this.grouping.getCaptionValue(group, field);
  }

  getGroupFooterRowCellValue(group: RowGroup<T>, footerRowIndex: number, column: ColumnDefinition<T>): string {
    return this.footer.getGroupFooterRowCellValue(group, footerRowIndex, column);
  }

  // Private methods
  private setupEffects(): void {
    // Note: group expansion initialization is handled lazily.
    // expandedGroups starts as null (uninitialized). groupedDataSignal treats
    // null as "use defaults" (initiallyExpanded). On first user interaction,
    // toggleGroupExpand populates the Set from current state. An empty Set
    // means "all collapsed" (not "all expanded").

    // Initialize column visibility — load from storage + seed defaults.
    // The controller handles precedence; this effect just re-runs it when
    // the config or column defs change.
    effect(() => {
      this.columnVisibilityConfig();
      untracked(() => this.columnUi.applyInitialVisibility());
    });

    // Initialize tree table expanded state — precedence and timing live on
    // the controller; this effect just runs it whenever the config changes.
    effect(() => {
      this.treeTableConfigSignal();
      this.tree.applyInitialExpansion();
    });

    // Pagination is driven by three disjoint triggers; the PaginationController
    // owns the two pure state-sync effects (options → state, totalItems →
    // state). The third — data ref → clamp pageIndex + prune selection +
    // clear html cache — stays here because it spans multiple controllers.
    //
    // Selection-preservation: when the new `data` array still contains a
    // previously-selected row by reference, keep it. Inline derived arrays
    // (`users().slice(...)`, `.filter(...)`) mint a fresh ref every CD tick
    // but the row refs inside are stable. Clamp instead of reset to 0 for
    // the same reason — resetting made "next page" land back on page 1
    // whenever the parent re-rendered.
    effect(() => {
      const data = this.data();
      untracked(() => {
        this.htmlCache.clear();
        this.pagination.clampToData(this.totalItemsSignal());
        this.selection.pruneToData(data);
      });
    });

    // Note: Sorting now works for both offset and cursor modes
    // Cursor mode emits events for server-side sorting

    // The global-search debounce effect lives on the GlobalSearchController.

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
      const hasFilters = this.filtering.hasActive();
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

      // Wrap the controller mutation in untracked() so this effect doesn't
      // register as a consumer of the signal it's about to update.
      untracked(() => this.tree.mergeExpanded(ancestorKeys));
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
}
