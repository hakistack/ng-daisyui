import { computed, isDevMode, isSignal, signal, Signal, WritableSignal } from '@angular/core';

import { requestClaudeJson } from '../../utils/claude-json';
import { buildAiRequest, parseAiReply } from './datagrid.ai';
import { applyClientView, ClientView } from './datagrid.pipeline';
import {
  buildStateSchema,
  columnType,
  createInitialState,
  isFilterable,
  isSearchable,
  isSortable,
  MAX_PAGE_SIZE,
  minColumnWidth,
  normalizeStatePatch,
} from './datagrid.state';
import type {
  DataGridAskResult,
  DataGridConfig,
  DataGridController,
  DataGridPage,
  DataGridRequest,
  DataGridSort,
  DataGridState,
  DataGridStateIssue,
  DataGridStatePatch,
  ResolvedDataGridColumn,
} from './datagrid.types';

/**
 * Server-loading plumbing the component drives (it owns the injection context
 * for the request effect). Kept out of the public controller via a WeakMap.
 */
export interface DataGridInternals<T> {
  /** Server request derived from state; also changes on `refresh()`. `null` in client mode. */
  readonly request: Signal<{ request: DataGridRequest; version: number } | null>;
  readonly serverPage: WritableSignal<DataGridPage<T>>;
  readonly loading: WritableSignal<boolean>;
  readonly error: WritableSignal<unknown>;
  /** Page index actually displayed (clamped in client mode). */
  readonly pageIndex: Signal<number>;
  /** Selection status of the select-all scope, for the header checkbox. */
  readonly selectAllState: Signal<'none' | 'some' | 'all'>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalsRegistry = new WeakMap<DataGridController<any>, DataGridInternals<any>>();

/** @internal — used by DataGridComponent. Not exported from public-api.ts. */
export function _dataGridInternals<T>(controller: DataGridController<T>): DataGridInternals<T> {
  const internals = internalsRegistry.get(controller);
  if (!internals) throw new Error('[ng-daisyui] hk-datagrid: controller was not created with createDataGrid().');
  return internals;
}

/**
 * Create the controller for `<hk-datagrid>`.
 *
 * The controller owns the grid's `DataGridState` (sort, filters, search, page,
 * columns) as the single source of truth. Everything the UI does goes through
 * it, so the same calls work from code, a saved view, or an LLM:
 * `grid.setState(json)` validates the patch, applies what is valid and returns
 * the issues for the rest.
 *
 * Does not need an injection context.
 *
 * @example Client-side
 * grid = createDataGrid<Invoice>({
 *   columns: [
 *     { field: 'number', header: 'Invoice' },
 *     { field: 'customer', header: 'Customer' },
 *     { field: 'amount', header: 'Amount', type: 'number' },
 *     { field: 'dueDate', header: 'Due', type: 'date' },
 *   ],
 *   data: this.invoices, // array or signal
 *   search: true,
 * });
 * // <hk-datagrid [controller]="grid" />
 *
 * @example Server-side
 * grid = createDataGrid<Invoice>({
 *   columns,
 *   pageSize: 50,
 *   dataSource: (req, { signal }) => fetch('/api/invoices', { method: 'POST', body: JSON.stringify(req), signal }).then((r) => r.json()),
 * });
 */
export function createDataGrid<T>(config: DataGridConfig<T>): DataGridController<T> {
  const { columns: columnDefs, data, initialState, ...options } = config;
  const columns = Object.freeze([...columnDefs]);
  const serverSide = !!options.dataSource;

  if (isDevMode()) {
    const seen = new Set<string>();
    for (const c of columns) {
      if (seen.has(c.field)) console.warn(`[ng-daisyui] hk-datagrid: duplicate column field "${c.field}".`);
      seen.add(c.field);
    }
    if (serverSide && !options.pageSize) {
      console.warn('[ng-daisyui] hk-datagrid: server-side `dataSource` without `pageSize` requests every row at once.');
    }
  }

  const pageSize = options.pageSize ? Math.min(Math.max(1, Math.floor(options.pageSize)), MAX_PAGE_SIZE) : undefined;
  const initial = createInitialState(columns, pageSize, initialState);
  if (initial.issues.length && isDevMode()) {
    console.warn('[ng-daisyui] hk-datagrid: invalid initialState entries were dropped:', initial.issues);
  }

  const state = signal<DataGridState>(initial.state);
  const dataOverride = signal<readonly T[] | null>(null);
  const source = computed<readonly T[]>(() => dataOverride() ?? (isSignal(data) ? data() : (data ?? [])));

  const serverPage = signal<DataGridPage<T>>({ rows: [], total: 0 });
  const loading = signal(serverSide);
  const error = signal<unknown>(null);
  const version = signal(0);

  const clientView = computed<ClientView<T>>(() =>
    serverSide ? { rows: [], total: 0, matching: [], pageIndex: 0 } : applyClientView(source(), columns, state()),
  );

  const rows = computed(() => (serverSide ? serverPage().rows : clientView().rows));
  const total = computed(() => (serverSide ? serverPage().total : clientView().total));
  const pageIndex = computed(() => (serverSide ? (state().page?.index ?? 0) : clientView().pageIndex));

  const visibleColumns = computed<readonly ResolvedDataGridColumn<T>[]>(() => {
    const byField = new Map(columns.map((c) => [c.field, c]));
    let offset = 0;
    const out: ResolvedDataGridColumn<T>[] = [];
    for (const cs of state().columns) {
      const def = byField.get(cs.field);
      if (!def || !cs.visible) continue;
      const type = columnType(def);
      out.push({
        ...def,
        type,
        width: cs.width,
        align: def.align ?? (type === 'number' ? 'end' : 'start'),
        sortable: isSortable(def),
        filterable: isFilterable(def),
        searchable: isSearchable(def),
        offset,
      });
      offset += cs.width;
    }
    return out;
  });

  // Column width/visibility changes must not refetch: compare the request by value.
  const request = computed(
    () => {
      if (!serverSide) return null;
      const { sort, filters, search, page } = state();
      return { request: { sort, filters, search, page }, version: version() };
    },
    { equal: (a, b) => a?.version === b?.version && JSON.stringify(a?.request) === JSON.stringify(b?.request) },
  );

  // ── Selection ─────────────────────────────────────────────────────────────
  // Keyed map (key → row) so server mode keeps rows selected on pages that are no longer loaded.
  const rowKeyOf = (row: T): unknown => {
    if (options.rowKey) return options.rowKey(row);
    const id = (row as { id?: unknown } | null)?.id;
    return typeof id === 'string' || typeof id === 'number' ? id : row;
  };
  const selected = signal<ReadonlyMap<unknown, T>>(new Map());
  // Client mode returns the current row objects (data may have been replaced with fresh copies).
  const selectedRows = computed<readonly T[]>(() => {
    const map = selected();
    if (map.size === 0) return [];
    return serverSide ? [...map.values()] : source().filter((r) => map.has(rowKeyOf(r)));
  });
  const selectAllScope = computed(() => (serverSide ? serverPage().rows : clientView().matching));
  const selectAllState = computed<'none' | 'some' | 'all'>(() => {
    const map = selected();
    const scope = selectAllScope();
    if (map.size === 0 || scope.length === 0) return 'none';
    let count = 0;
    for (const row of scope) if (map.has(rowKeyOf(row))) count++;
    return count === 0 ? 'none' : count === scope.length ? 'all' : 'some';
  });

  function commitSelection(next: ReadonlyMap<unknown, T>): void {
    selected.set(next);
    options.onSelectionChange?.(selectedRows());
  }

  function commit(next: DataGridState): void {
    if (next === state()) return;
    state.set(next);
    options.onStateChange?.(next);
  }

  function apply(patch: DataGridStatePatch): DataGridStateIssue[] {
    const { state: next, issues } = normalizeStatePatch(patch, state(), columns);
    commit(next);
    return issues;
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  // `applied` / `before` are the states around the last applied answer: the
  // result stays visible (and undoable) only while `applied` is on screen.
  const aiEnabled = !!options.ai && (!!options.ai.complete || !!options.ai.apiKey?.trim());
  const askRecord = signal<{ result: DataGridAskResult; applied: DataGridState | null; before: DataGridState | null } | null>(null);
  const asking = signal(false);
  let askAbort: AbortController | null = null;
  const lastAsk = computed(() => {
    const record = askRecord();
    if (!record) return null;
    return record.applied && state() !== record.applied ? null : record.result;
  });

  async function ask(query: string): Promise<DataGridAskResult> {
    const ai = options.ai;
    askAbort?.abort();
    if (!ai || !aiEnabled) {
      const result: DataGridAskResult = {
        status: 'error',
        query,
        error: new Error('hk-datagrid: ask() needs `ai.apiKey` in the grid config.'),
      };
      askRecord.set({ result, applied: null, before: null });
      return result;
    }
    const abort = new AbortController();
    askAbort = abort;
    asking.set(true);
    const request = buildAiRequest(columns, state(), query, {
      data: serverSide ? undefined : source(),
      sampleValues: ai.sampleValues,
      context: ai.context,
      now: new Date(),
    });

    let result: DataGridAskResult;
    let applied: DataGridState | null = null;
    let before: DataGridState | null = null;
    try {
      const reply = ai.complete
        ? await ai.complete(request, { signal: abort.signal })
        : await requestClaudeJson({ apiKey: ai.apiKey!, model: ai.model }, request, abort.signal);
      if (abort.signal.aborted) return { status: 'cancelled', query };
      const parsed = parseAiReply(reply, columns, state());
      if (!parsed) {
        result = { status: 'error', query, error: new Error('The AI reply was not a JSON object.') };
      } else {
        // Snapshot at apply time: the user may have changed the view while waiting.
        before = state();
        const issues = [...parsed.issues, ...apply(parsed.patch)];
        applied = state();
        result = { status: 'applied', query, explanation: parsed.explanation, issues };
      }
    } catch (error) {
      if (abort.signal.aborted) return { status: 'cancelled', query };
      result = { status: 'error', query, error };
    } finally {
      if (askAbort === abort) {
        askAbort = null;
        asking.set(false);
      }
    }
    askRecord.set({ result, applied, before });
    return result;
  }

  const controller: DataGridController<T> = {
    columns,
    options,
    state: state.asReadonly(),
    visibleColumns,
    rows,
    total,
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    serverSide,

    getState: () => state(),
    setState: (patch) => apply(patch),
    resetState: () => commit(createInitialState(columns, pageSize, initialState).state),
    stateSchema: () => buildStateSchema(columns, !!pageSize),

    toggleSort(field, additive = false) {
      const column = columns.find((c) => c.field === field);
      if (!column || !isSortable(column)) return;
      const current = state().sort;
      const existing = current.find((s) => s.field === field);
      // asc → desc → off. A plain click on a column that is not the only sort key starts over at asc.
      const soleKey = current.length === 1 && !!existing;
      const nextDir = existing && (additive || soleKey) ? (existing.direction === 'asc' ? 'desc' : null) : 'asc';

      let sort: DataGridSort[];
      if (!additive) {
        sort = nextDir ? [{ field, direction: nextDir }] : [];
      } else if (!existing) {
        sort = [...current, { field, direction: 'asc' }];
      } else {
        sort = nextDir
          ? current.map((s) => (s.field === field ? { field, direction: nextDir } : s))
          : current.filter((s) => s.field !== field);
      }
      apply({ sort });
    },
    setSearch: (search) => {
      if (search !== state().search) apply({ search });
    },
    setPage(index) {
      const page = state().page;
      if (!page) return;
      const last = Math.max(0, Math.ceil(total() / page.size) - 1);
      const clamped = Math.min(Math.max(0, Math.floor(index)), last);
      if (clamped !== pageIndex() || clamped !== page.index) apply({ page: { index: clamped, size: page.size } });
    },
    setPageSize(size) {
      const page = state().page;
      if (!page || size === page.size) return;
      // Keep the first row of the current page on screen.
      const firstRow = pageIndex() * page.size;
      apply({ page: { index: Math.floor(firstRow / size), size } });
    },
    setData: (next) => dataOverride.set(next),
    refresh: () => version.update((v) => v + 1),

    setFilter(field, filter) {
      const others = state().filters.filter((f) => f.field !== field);
      return apply({ filters: filter ? [...others, { ...filter, field }] : others });
    },
    clearFilters() {
      if (state().filters.length) apply({ filters: [] });
    },
    setColumnWidth(field, width) {
      const column = columns.find((c) => c.field === field);
      if (!column || !Number.isFinite(width)) return;
      const next = Math.max(Math.round(width), minColumnWidth(column));
      const current = state();
      if (current.columns.find((c) => c.field === field)?.width === next) return;
      commit({ ...current, columns: current.columns.map((c) => (c.field === field ? { ...c, width: next } : c)) });
    },
    setColumnVisible(field, visible) {
      const current = state();
      const target = current.columns.find((c) => c.field === field);
      if (!target || target.visible === visible) return;
      // Never hide the last visible column.
      if (!visible && current.columns.filter((c) => c.visible).length <= 1) return;
      commit({ ...current, columns: current.columns.map((c) => (c.field === field ? { ...c, visible } : c)) });
    },

    selectedRows,
    selectedCount: computed(() => selectedRows().length),
    isSelected: (row) => selected().has(rowKeyOf(row)),
    toggleRow(row, force) {
      if (!options.selection) return;
      const key = rowKeyOf(row);
      const isOn = selected().has(key);
      const want = force ?? !isOn;
      if (want === isOn) return;
      if (options.selection === 'single') {
        commitSelection(want ? new Map([[key, row]]) : new Map());
        return;
      }
      const next = new Map(selected());
      if (want) next.set(key, row);
      else next.delete(key);
      commitSelection(next);
    },
    selectRows(rowsToSelect) {
      if (!options.selection || rowsToSelect.length === 0) return;
      if (options.selection === 'single') {
        const last = rowsToSelect[rowsToSelect.length - 1];
        commitSelection(new Map([[rowKeyOf(last), last]]));
        return;
      }
      const next = new Map(selected());
      for (const row of rowsToSelect) next.set(rowKeyOf(row), row);
      commitSelection(next);
    },
    selectAll() {
      if (options.selection !== 'multi') return;
      controller.selectRows(selectAllScope());
    },
    clearSelection() {
      if (selected().size) commitSelection(new Map());
    },

    aiEnabled,
    ask,
    asking: asking.asReadonly(),
    lastAsk,
    undoAsk() {
      const record = askRecord();
      if (!record?.before || state() !== record.applied) return;
      askRecord.set(null);
      commit(record.before);
    },
    dismissAsk() {
      askAbort?.abort();
      askAbort = null;
      asking.set(false);
      askRecord.set(null);
    },
  };

  internalsRegistry.set(controller, { request, serverPage, loading, error, pageIndex, selectAllState });
  return controller;
}
