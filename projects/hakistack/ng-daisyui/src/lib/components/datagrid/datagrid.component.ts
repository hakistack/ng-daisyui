import { ConnectedPosition, Overlay, OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideEllipsisVertical,
  LucideListFilter,
  LucideSparkles,
  LucideUndo2,
  LucideX,
} from '@lucide/angular';
import { isObservable, Subscription, take } from 'rxjs';

import { HkDataGridCellDirective } from './datagrid-cell.directive';
import { DataGridColumnMenuComponent } from './datagrid-column-menu.component';
import { _dataGridInternals } from './datagrid.helpers';
import { DataGridLabels, HK_DATAGRID_LABELS, resolveDataGridLabels, ResolvedDataGridLabels } from './datagrid.labels';
import { getCellText, getCellValue } from './datagrid.pipeline';
import { CellPos, inRange, normalizeRange, rangeCellCount, rangeToTsv, summarizeRange } from './datagrid.range';
import { minColumnWidth } from './datagrid.state';
import type { DataGridCellContext, DataGridController, DataGridFilter, DataGridPage, ResolvedDataGridColumn } from './datagrid.types';
import { columnOffsets, columnRange, rowRange, scrollToReveal } from './datagrid.virtual';

const OVERSCAN_ROWS = 6;
const OVERSCAN_COLUMNS = 2;
const SEARCH_DEBOUNCE_MS = 250;
const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100];
/** Width of the pinned checkbox column. */
const SELECTION_COLUMN_WIDTH = 44;
const KEYBOARD_RESIZE_STEP = 16;
const MAX_AUTOSIZE_WIDTH = 600;
/** Copying more cells than this would freeze the tab for seconds; the range is truncated. */
const MAX_COPY_CELLS = 500_000;

let nextId = 0;

interface RenderedColumn<T> {
  col: ResolvedDataGridColumn<T>;
  index: number;
  headerId: string;
  left: number;
  /** Sort direction when this column is a sort key. */
  direction: 'asc' | 'desc' | null;
  /** 1-based priority, shown only when there are several sort keys. */
  priority: number | null;
  ariaSort: 'ascending' | 'descending' | null;
  filtered: boolean;
}

interface RenderedCell<T> {
  id: string;
  colIndex: number;
  left: number;
  width: number;
  align: 'start' | 'center' | 'end';
  text: string;
  template: TemplateRef<DataGridCellContext<T>> | null;
  context: DataGridCellContext<T> | null;
}

interface RenderedRow<T> {
  key: unknown;
  index: number;
  top: number;
  row: T;
  selected: boolean;
  cells: RenderedCell<T>[];
}

interface FilterChip {
  field: string;
  text: string;
}

/**
 * Enterprise data grid: one render pipeline with row + column virtualization,
 * multi-column sort, quick search, column menu (sort / filter / hide / chooser),
 * resizable columns, row selection, Excel-style cell ranges with copy, and
 * pagination (client or server).
 *
 * Accessibility: an ARIA grid whose focus stays on the grid element; the active
 * cell is exposed through `aria-activedescendant`, so it survives virtualization.
 *
 * All view state lives in the controller from `createDataGrid()`.
 *
 * @example
 * <hk-datagrid [controller]="grid" height="600px" />
 */
@Component({
  selector: 'hk-datagrid',
  imports: [
    NgTemplateOutlet,
    OverlayModule,
    DataGridColumnMenuComponent,
    LucideArrowUp,
    LucideArrowDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideEllipsisVertical,
    LucideListFilter,
    LucideSparkles,
    LucideUndo2,
    LucideX,
  ],
  templateUrl: './datagrid.component.html',
  styleUrl: './datagrid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0',
    '(document:pointerup)': 'dragging = false',
  },
})
export class DataGridComponent<T> {
  readonly controller = input.required<DataGridController<T>>();
  /** Client-side rows (alternative to `config.data`). */
  readonly data = input<readonly T[] | undefined>(undefined);
  /** Grid height (CSS length). Virtualization needs a bounded height. */
  readonly height = input<string>('480px');
  /** Per-instance text overrides. */
  readonly labels = input<DataGridLabels>({});

  private readonly userLabels = inject(HK_DATAGRID_LABELS, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly viewportRef = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly cellDirectives = contentChildren(HkDataGridCellDirective);

  readonly id = `hk-dg-${nextId++}`;

  readonly l = computed<ResolvedDataGridLabels>(() => resolveDataGridLabels(this.userLabels, this.labels()));

  // ── Viewport metrics (estimates until the first measurement) ──────────────
  private readonly scrollTop = signal(0);
  private readonly scrollLeft = signal(0);
  private readonly viewportWidth = signal(1024);
  private readonly viewportHeight = signal(480);
  readonly focused = signal(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  private readonly options = computed(() => this.controller().options);
  readonly state = computed(() => this.controller().state());
  readonly columns = computed(() => this.controller().visibleColumns());
  readonly rows = computed(() => this.controller().rows());
  readonly total = computed(() => this.controller().total());
  readonly loading = computed(() => this.controller().loading());
  readonly error = computed(() => this.controller().error());
  private readonly internals = computed(() => _dataGridInternals(this.controller()));

  readonly selectionMode = computed(() => this.options().selection ?? null);
  readonly selectAllState = computed(() => this.internals().selectAllState());
  readonly showColumnMenu = computed(() => this.options().columnMenu !== false);
  readonly resizable = computed(() => this.options().resizable !== false);

  readonly rowHeight = computed(() => this.options().rowHeight ?? 36);
  /** The header row shares the row height. */
  readonly headerHeight = this.rowHeight;
  /** Pinned leading column (row checkboxes); data columns start after it. */
  readonly leadWidth = computed(() => (this.selectionMode() ? SELECTION_COLUMN_WIDTH : 0));
  /** aria-colindex offset caused by the leading column. */
  readonly colIndexBase = computed(() => (this.selectionMode() ? 2 : 1));

  private readonly offsets = computed(() => columnOffsets(this.columns().map((c) => c.width)));
  readonly totalWidth = computed(() => this.leadWidth() + this.offsets()[this.offsets().length - 1]);
  /** Rows, header and the empty state stretch to the viewport when the columns are narrower. */
  readonly fillWidth = computed(() => Math.max(this.totalWidth(), this.viewportWidth()));
  /** Empty grids keep a few rows of height so the empty/loading message has room. */
  readonly bodyHeight = computed(() => Math.max(this.rows().length, this.rows().length ? 0 : 3) * this.rowHeight());
  readonly canvasHeight = computed(() => this.headerHeight() + this.bodyHeight());

  private readonly rowWindow = computed(() =>
    rowRange(this.scrollTop(), this.viewportHeight() - this.headerHeight(), this.rowHeight(), this.rows().length, OVERSCAN_ROWS),
  );
  // The pinned lead column covers the left edge, so the data area is narrower than the viewport.
  private readonly colWindow = computed(() =>
    columnRange(this.offsets(), this.scrollLeft(), this.viewportWidth() - this.leadWidth(), OVERSCAN_COLUMNS),
  );

  private readonly cellTemplates = computed(() => new Map(this.cellDirectives().map((d) => [d.field(), d.template])));

  readonly renderedColumns = computed<RenderedColumn<T>[]>(() => {
    const { start, end } = this.colWindow();
    const { sort, filters } = this.state();
    const lead = this.leadWidth();
    const filtered = new Set(filters.map((f) => f.field));
    return this.columns()
      .slice(start, end)
      .map((col, i) => {
        const sortIndex = sort.findIndex((s) => s.field === col.field);
        const direction = sortIndex >= 0 ? sort[sortIndex].direction : null;
        return {
          col,
          index: start + i,
          headerId: this.headerCellId(start + i),
          left: lead + col.offset,
          direction,
          priority: sortIndex >= 0 && sort.length > 1 ? sortIndex + 1 : null,
          ariaSort: sortIndex === 0 && direction ? (direction === 'asc' ? 'ascending' : 'descending') : null,
          filtered: filtered.has(col.field),
        };
      });
  });

  readonly renderedRows = computed<RenderedRow<T>[]>(() => {
    const { start, end } = this.rowWindow();
    const cols = this.renderedColumns();
    const templates = this.cellTemplates();
    const controller = this.controller();
    const rowKey = this.options().rowKey;
    const rowHeight = this.rowHeight();
    const header = this.headerHeight();
    const selecting = !!this.selectionMode();
    // Track selection changes so checkboxes re-render.
    if (selecting) controller.selectedRows();

    return this.rows()
      .slice(start, end)
      .map((row, k) => {
        const index = start + k;
        const cells = cols.map(({ col, index: colIndex, left }) => {
          const template = templates.get(col.field) ?? null;
          return {
            id: this.cellId(index, colIndex),
            colIndex,
            left,
            width: col.width,
            align: col.align,
            text: template ? '' : getCellText(row, col),
            template,
            context: template ? { $implicit: getCellValue(row, col), row, column: col, rowIndex: index } : null,
          };
        });
        return {
          key: rowKey ? rowKey(row) : defaultRowKey(row, index),
          index,
          top: header + index * rowHeight,
          row,
          selected: selecting && controller.isSelected(row),
          cells,
        };
      });
  });

  // ── Active cell (row −1 = header) and cell range ──────────────────────────
  private readonly activeRaw = signal<CellPos>({ row: 0, col: 0 });
  /** Range anchor; `null` = the range is just the active cell. */
  private readonly anchor = signal<CellPos | null>(null);

  /** Active cell clamped to the current view (rows/columns may have shrunk). */
  readonly active = computed<CellPos>(() => {
    const { row, col } = this.activeRaw();
    const rowCount = this.rows().length;
    return {
      row: rowCount === 0 ? -1 : Math.min(row, rowCount - 1),
      col: Math.max(0, Math.min(col, this.columns().length - 1)),
    };
  });
  /** Multi-cell range, or `null` when only the active cell is selected. */
  readonly range = computed(() => {
    const anchor = this.anchor();
    if (!anchor) return null;
    const lastRow = this.rows().length - 1;
    const lastCol = this.columns().length - 1;
    const clamped = { row: Math.min(anchor.row, lastRow), col: Math.min(anchor.col, lastCol) };
    const range = normalizeRange(clamped, this.active());
    return range && rangeCellCount(range) > 1 ? range : null;
  });
  readonly rangeSummary = computed(() => {
    const range = this.range();
    if (!range) return null;
    const s = summarizeRange(this.rows(), this.columns(), range);
    return this.l().rangeSummary(s.count, s.numericCount ? s.sum : null, s.avg);
  });

  /** Only point at elements that are actually rendered. */
  readonly activeDescendant = computed(() => {
    const { row, col } = this.active();
    const cw = this.colWindow();
    if (this.columns().length === 0 || col < cw.start || col >= cw.end) return null;
    if (row === -1) return this.headerCellId(col);
    const rw = this.rowWindow();
    return row >= rw.start && row < rw.end ? this.cellId(row, col) : null;
  });

  // ── Toolbar: filter chips + selection count ───────────────────────────────
  readonly filterChips = computed<FilterChip[]>(() => {
    const headers = new Map(this.controller().columns.map((c) => [c.field, c.header]));
    const ops = this.l().operators;
    return this.state().filters.map((f) => ({ field: f.field, text: describeFilter(f, headers.get(f.field) ?? f.field, ops[f.operator]) }));
  });
  readonly selectedCount = computed(() => (this.selectionMode() ? this.controller().selectedCount() : 0));
  readonly showToolbar = computed(
    () => this.aiEnabled() || !!this.options().search || this.filterChips().length > 0 || this.selectedCount() > 0,
  );

  // ── AI box ────────────────────────────────────────────────────────────────
  readonly aiEnabled = computed(() => this.controller().aiEnabled);
  readonly asking = computed(() => this.controller().asking());
  readonly lastAsk = computed(() => this.controller().lastAsk());
  readonly aiQuery = signal('');
  readonly aiSuggestions = computed(() => {
    const show = !this.aiQuery() && !this.asking() && !this.lastAsk();
    return show ? (this.options().ai?.suggestions ?? []) : [];
  });
  readonly aiExplanation = computed(() => {
    const result = this.lastAsk();
    return result?.status === 'applied' ? result.explanation : null;
  });
  readonly aiIssues = computed(() => {
    const result = this.lastAsk();
    return result?.status === 'applied' && result.issues.length ? this.l().aiIssues(result.issues.map((i) => i.message)) : null;
  });
  readonly aiError = computed(() => {
    const result = this.lastAsk();
    if (result?.status !== 'error') return null;
    const detail = result.error instanceof Error ? result.error.message : typeof result.error === 'string' ? result.error : '';
    return detail ? `${this.l().aiError} ${detail}` : this.l().aiError;
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  readonly pager = computed(() => {
    const page = this.state().page;
    if (!page) return null;
    const total = this.total();
    const index = this.internals().pageIndex();
    const pageCount = Math.max(1, Math.ceil(total / page.size));
    const options = this.options().pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
    return {
      index,
      size: page.size,
      pageCount,
      isFirst: index === 0,
      isLast: index >= pageCount - 1,
      range: this.l().range(total === 0 ? 0 : index * page.size + 1, Math.min((index + 1) * page.size, total), total),
      pageOf: this.l().pageOf(index + 1, pageCount),
      sizeOptions: [...new Set([...options, page.size])].sort((a, b) => a - b),
    };
  });

  /** Polite live-region text: row count after each change, or the loading message. */
  readonly status = computed(() => (this.loading() ? this.l().loading : this.l().rowCount(this.total())));

  // ── Column menu (CDK connected overlay) ───────────────────────────────────
  readonly menu = signal<{ column: ResolvedDataGridColumn<T>; origin: HTMLElement } | null>(null);
  readonly menuScrollStrategy = inject(Overlay).scrollStrategies.reposition();
  readonly menuPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 2 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 2 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -2 },
  ];

  /** Pointer drag in progress (cell range selection). Cleared on any pointerup. */
  dragging = false;
  private resizing: { field: string; startX: number; startWidth: number; moved: boolean } | null = null;
  private lastToggledRow: number | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private measureCanvas: HTMLCanvasElement | undefined;

  constructor() {
    // `[data]` input → controller.
    effect(() => {
      const data = this.data();
      if (data !== undefined) untracked(() => this.controller().setData(data));
    });

    // A new view (sort/filter/search/page/columns) invalidates the cell range.
    effect(() => {
      this.rows();
      this.columns();
      untracked(() => this.anchor.set(null));
    });

    // Server mode: fetch whenever the request (state subset + refresh version) changes.
    // Superseded requests are aborted, so a slow response never overwrites a newer one.
    effect((onCleanup) => {
      const controller = this.controller();
      const internals = _dataGridInternals(controller);
      const pending = internals.request();
      const dataSource = controller.options.dataSource;
      if (!pending || !dataSource) return;

      const abort = new AbortController();
      let sub: Subscription | undefined;
      untracked(() => {
        internals.loading.set(true);
        internals.error.set(null);
      });

      const done = (page: DataGridPage<T>) => {
        if (abort.signal.aborted) return;
        internals.serverPage.set(page);
        internals.loading.set(false);
        const size = pending.request.page?.size;
        const last = size ? Math.max(0, Math.ceil(page.total / size) - 1) : 0;
        if (size && pending.request.page!.index > last) controller.setPage(last);
      };
      const fail = (err: unknown) => {
        if (abort.signal.aborted) return;
        internals.error.set(err ?? new Error('Data source failed'));
        internals.loading.set(false);
      };

      try {
        const result = dataSource(pending.request, { signal: abort.signal });
        if (isObservable(result)) sub = result.pipe(take(1)).subscribe({ next: done, error: fail });
        else Promise.resolve(result).then(done, fail);
      } catch (err) {
        fail(err);
      }

      onCleanup(() => {
        abort.abort();
        sub?.unsubscribe();
      });
    });

    afterNextRender(() => this.observeViewport());
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  // ── Scroll, search, paging ────────────────────────────────────────────────
  onScroll(): void {
    const el = this.viewportRef().nativeElement;
    if (this.menu() && el.scrollLeft !== this.scrollLeft()) this.closeMenu(false);
    this.scrollTop.set(el.scrollTop);
    this.scrollLeft.set(el.scrollLeft);
  }

  submitAsk(event: Event): void {
    event.preventDefault();
    const query = this.aiQuery().trim();
    if (query && !this.asking()) void this.controller().ask(query);
  }

  askSuggestion(query: string): void {
    this.aiQuery.set(query);
    void this.controller().ask(query);
  }

  onSearchInput(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.controller().setSearch(value), SEARCH_DEBOUNCE_MS);
  }

  onPageSizeChange(value: string): void {
    this.controller().setPageSize(Number(value));
  }

  goToPage(index: number): void {
    this.controller().setPage(index);
    this.viewportRef().nativeElement.scrollTop = 0;
  }

  // ── Header ────────────────────────────────────────────────────────────────
  onHeaderClick(column: RenderedColumn<T>, event: MouseEvent): void {
    // A click that ends a resize drag must not sort.
    if ((event.target as Element).closest('.hk-dg-resize')) return;
    this.activeRaw.set({ row: -1, col: column.index });
    this.anchor.set(null);
    if (column.col.sortable) this.controller().toggleSort(column.col.field, event.shiftKey);
  }

  openMenuFrom(column: RenderedColumn<T>, button: HTMLElement, event: MouseEvent): void {
    event.stopPropagation();
    this.activeRaw.set({ row: -1, col: column.index });
    this.menu.set({ column: column.col, origin: button.closest<HTMLElement>('[role="columnheader"]') ?? button });
  }

  /** Keyboard path: reveal the active column's header, then anchor the menu on it once rendered. */
  private openMenuForActive(): void {
    const { col } = this.active();
    const column = this.columns()[col];
    if (!column || !this.showColumnMenu()) return;
    this.reveal(-1, col);
    afterNextRender(
      () => {
        const header = document.getElementById(this.headerCellId(col));
        if (header) this.menu.set({ column, origin: header });
      },
      { injector: this.injector },
    );
  }

  closeMenu(refocus: boolean): void {
    if (!this.menu()) return;
    this.menu.set(null);
    if (refocus) this.viewportRef().nativeElement.focus();
  }

  onMenuOutsideClick(event: MouseEvent): void {
    // The trigger button toggles the menu itself; ignore clicks on it here.
    if ((event.target as Element | null)?.closest?.('.hk-dg-menu-trigger')) return;
    this.closeMenu(false);
  }

  // ── Column resize ─────────────────────────────────────────────────────────
  startResize(column: ResolvedDataGridColumn<T>, event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    this.resizing = { field: column.field, startX: event.clientX, startWidth: column.width, moved: false };
  }

  onResizeMove(event: PointerEvent): void {
    if (!this.resizing) return;
    this.resizing.moved = true;
    this.controller().setColumnWidth(this.resizing.field, this.resizing.startWidth + event.clientX - this.resizing.startX);
  }

  endResize(event: PointerEvent): void {
    if (!this.resizing) return;
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    this.resizing = null;
  }

  /** Double-click on the resize handle: fit the column to its header and the rendered cells. */
  autoSize({ col: column, index }: RenderedColumn<T>): void {
    const viewport = this.viewportRef().nativeElement;
    const sample = viewport.querySelector('[role="gridcell"]') ?? viewport;
    this.measureCanvas ??= document.createElement('canvas');
    const ctx = this.measureCanvas.getContext('2d');
    if (!ctx) return;
    const style = getComputedStyle(sample);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    // Header text is semibold and shares space with the sort and menu icons.
    let widest = ctx.measureText(column.header).width * 1.08 + 44;
    for (const r of this.renderedRows()) {
      const cell = r.cells.find((c) => c.colIndex === index);
      const text = cell?.template ? getCellText(r.row, column) : (cell?.text ?? '');
      widest = Math.max(widest, ctx.measureText(text).width);
    }
    const padding = 24 + 2; // px-3 on both sides + borders
    this.controller().setColumnWidth(
      column.field,
      Math.min(MAX_AUTOSIZE_WIDTH, Math.max(minColumnWidth(column), Math.ceil(widest + padding))),
    );
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  onRowCheckbox(row: RenderedRow<T>, event: MouseEvent): void {
    const controller = this.controller();
    // Shift+click selects the run of rows from the last toggled one.
    if (event.shiftKey && this.selectionMode() === 'multi' && this.lastToggledRow !== null) {
      const [from, to] = [Math.min(this.lastToggledRow, row.index), Math.max(this.lastToggledRow, row.index)];
      controller.selectRows(this.rows().slice(from, to + 1));
    } else {
      controller.toggleRow(row.row);
    }
    this.lastToggledRow = row.index;
    this.activeRaw.update((a) => ({ row: row.index, col: a.col }));
  }

  onSelectAll(): void {
    const controller = this.controller();
    if (this.selectAllState() === 'all') controller.clearSelection();
    else controller.selectAll();
  }

  // ── Cells: pointer range selection ────────────────────────────────────────
  onCellPointerDown(rowIndex: number, colIndex: number, event: PointerEvent): void {
    if (event.button !== 0) return;
    const pos = { row: rowIndex, col: colIndex };
    if (event.shiftKey) {
      this.anchor.update((a) => a ?? this.active());
    } else {
      this.anchor.set(pos);
      this.dragging = true;
    }
    this.activeRaw.set(pos);
  }

  onCellPointerEnter(rowIndex: number, colIndex: number): void {
    if (!this.dragging) return;
    this.activeRaw.set({ row: rowIndex, col: colIndex });
  }

  /** Ctrl/Cmd+C on the grid: copy the range (or active cell / header) as TSV. */
  onCopy(event: ClipboardEvent): void {
    if (event.target !== this.viewportRef().nativeElement || !event.clipboardData) return;
    const { row, col } = this.active();
    const columns = this.columns();
    let text: string;
    if (row === -1) {
      text = columns[col]?.header ?? '';
    } else {
      const range = normalizeRange(this.range() ? this.anchor() : null, this.active());
      if (!range) return;
      const maxRows = Math.max(1, Math.floor(MAX_COPY_CELLS / (range.c1 - range.c0 + 1)));
      text = rangeToTsv(this.rows(), columns, { ...range, r1: Math.min(range.r1, range.r0 + maxRows - 1) });
    }
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  }

  removeFilter(field: string): void {
    this.controller().setFilter(field, null);
  }

  isInRange(rowIndex: number, colIndex: number): boolean {
    return inRange(this.range(), rowIndex, colIndex);
  }

  /**
   * APG data-grid keyboard model. Tab leaves the grid; inside it:
   * - arrows move one cell; Shift extends the range; Ctrl jumps to the edge
   * - Home/End: first/last cell of the row (Ctrl: of the grid)
   * - PageUp/PageDown: one viewport
   * - Ctrl+A: select every cell; Escape: collapse the range
   * - Enter/Space on a header: sort (Shift adds a level)
   * - Space / Shift+Space on a row: toggle row selection
   * - Alt+↓, Shift+F10 or the Menu key: column menu
   * - Alt+←/→: resize the active column
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.target !== this.viewportRef().nativeElement) return;
    const colCount = this.columns().length;
    if (colCount === 0) return;

    const rowCount = this.rows().length;
    const lastRow = rowCount - 1;
    const pageRows = Math.max(1, Math.floor((this.viewportHeight() - this.headerHeight()) / this.rowHeight()));
    const ctrl = event.ctrlKey || event.metaKey;
    const current = this.active();
    let { row, col } = current;

    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const column = this.columns()[col];
      if (column && this.resizable()) {
        this.controller().setColumnWidth(column.field, column.width + (event.key === 'ArrowRight' ? 1 : -1) * KEYBOARD_RESIZE_STEP);
        event.preventDefault();
      }
      return;
    }
    if ((event.altKey && event.key === 'ArrowDown') || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      this.openMenuForActive();
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        row = ctrl ? lastRow : Math.min(row + 1, lastRow);
        break;
      case 'ArrowUp':
        row = ctrl ? Math.min(0, lastRow) : Math.max(row - 1, event.shiftKey ? 0 : -1);
        break;
      case 'ArrowRight':
        col = ctrl ? colCount - 1 : Math.min(col + 1, colCount - 1);
        break;
      case 'ArrowLeft':
        col = ctrl ? 0 : Math.max(col - 1, 0);
        break;
      case 'Home':
        col = 0;
        if (ctrl) row = Math.min(0, lastRow);
        break;
      case 'End':
        col = colCount - 1;
        if (ctrl) row = lastRow;
        break;
      case 'PageDown':
        row = Math.min(row + pageRows, lastRow);
        break;
      case 'PageUp':
        row = row === -1 ? -1 : Math.max(row - pageRows, 0);
        break;
      case 'a':
      case 'A':
        if (!ctrl || rowCount === 0) return;
        event.preventDefault();
        this.anchor.set({ row: 0, col: 0 });
        this.activeRaw.set({ row: lastRow, col: colCount - 1 });
        return;
      case 'Escape':
        if (!this.anchor()) return;
        event.preventDefault();
        this.anchor.set(null);
        return;
      case 'Enter':
      case ' ': {
        if (row === -1) {
          const column = this.columns()[col];
          if (column.sortable) this.controller().toggleSort(column.field, event.shiftKey);
          event.preventDefault();
        } else if (event.key === ' ' && this.selectionMode()) {
          const target = this.rows()[row];
          if (target) this.controller().toggleRow(target);
          event.preventDefault();
        }
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    // Shift extends a range from where the cursor was; plain movement collapses it.
    if (event.shiftKey && row >= 0 && current.row >= 0) this.anchor.update((a) => a ?? current);
    else this.anchor.set(null);
    this.activeRaw.set({ row, col });
    this.reveal(row, col);
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  /** Scroll so the cell is fully visible below the sticky header and right of the pinned column. */
  private reveal(row: number, col: number): void {
    // Use the tracked metrics (not el.client*): they are kept in sync by onScroll/ResizeObserver
    // and stay meaningful before the first measurement.
    const el = this.viewportRef().nativeElement;
    const column = this.columns()[col];
    if (row >= 0) {
      const top = scrollToReveal(this.scrollTop(), this.viewportHeight() - this.headerHeight(), row * this.rowHeight(), this.rowHeight());
      el.scrollTop = top;
      this.scrollTop.set(top);
    }
    if (column) {
      const left = scrollToReveal(this.scrollLeft(), this.viewportWidth() - this.leadWidth(), column.offset, column.width);
      el.scrollLeft = left;
      this.scrollLeft.set(left);
    }
  }

  private observeViewport(): void {
    const el = this.viewportRef().nativeElement;
    const measure = () => {
      this.viewportWidth.set(el.clientWidth || this.viewportWidth());
      this.viewportHeight.set(el.clientHeight || this.viewportHeight());
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private headerCellId(col: number): string {
    return `${this.id}-h${col}`;
  }

  private cellId(row: number, col: number): string {
    return `${this.id}-r${row}c${col}`;
  }
}

function defaultRowKey(row: unknown, index: number): unknown {
  const id = (row as { id?: unknown } | null)?.id;
  return typeof id === 'string' || typeof id === 'number' ? id : index;
}

function describeFilter(filter: DataGridFilter, header: string, operator: string): string {
  const { value } = filter;
  if (value === undefined) return `${header} ${operator}`;
  if (filter.operator === 'between' && Array.isArray(value)) return `${header} ${operator} ${value[0] ?? '…'} – ${value[1] ?? '…'}`;
  if (Array.isArray(value)) return `${header} ${operator} ${value.join(', ')}`;
  return `${header} ${operator} ${String(value)}`;
}
