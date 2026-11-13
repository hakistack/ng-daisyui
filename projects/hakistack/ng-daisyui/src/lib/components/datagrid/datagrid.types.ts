import { Signal } from '@angular/core';
import { Observable } from 'rxjs';

import type { FilterOperator } from '../../grid-core/grid.types';

/** Value kind of a column. Drives sorting, filtering, alignment and the state JSON Schema. */
export type DataGridColumnType = 'text' | 'number' | 'date' | 'boolean';

export type DataGridSortDirection = 'asc' | 'desc';

/**
 * Column definition for `<hk-datagrid>`.
 *
 * @example
 * { field: 'amount', header: 'Amount', type: 'number', format: (v) => currency.format(v as number) }
 */
export interface DataGridColumn<T> {
  /** Stable column id. Also the default accessor: `row[field]`. */
  field: string;
  /** Header text. */
  header: string;
  /** Value kind. Default: `'text'`. */
  type?: DataGridColumnType;
  /** Custom accessor when the value is not `row[field]` (nested or computed values). */
  value?: (row: T) => unknown;
  /** Display formatter. The raw value is still what sorting and filtering use. */
  format?: (value: unknown, row: T) => string;
  /** Initial width in px. Default: 160 (120 for `number` / `boolean`). */
  width?: number;
  /** Lower bound applied whenever a width comes in through `setState`. Default: 48. */
  minWidth?: number;
  /** Cell alignment. Default: `'end'` for numbers, `'start'` otherwise. */
  align?: 'start' | 'center' | 'end';
  /** Allow sorting by this column. Default: `true`. */
  sortable?: boolean;
  /** Allow filters on this column (UI, `setState`, AI). Default: `true`. */
  filterable?: boolean;
  /** Include in the quick search. Default: `true` for `text` columns, `false` otherwise. */
  searchable?: boolean;
  /** Start hidden. Users (or `setState`) can show it later. Default: `false`. */
  hidden?: boolean;
  /**
   * Plain-language description of what the column holds. Shown as the header
   * tooltip and embedded in the state JSON Schema so an LLM can map a natural
   * language request ("overdue invoices") onto the right field.
   */
  description?: string;
}

export interface DataGridSort {
  field: string;
  direction: DataGridSortDirection;
}

export interface DataGridFilter {
  field: string;
  operator: FilterOperator;
  /** Omitted for `isEmpty` / `isNotEmpty`; a `[min, max]` pair for `between`; an array for `in` / `notIn`. */
  value?: unknown;
}

export interface DataGridColumnState {
  field: string;
  visible: boolean;
  width: number;
}

export interface DataGridPageState {
  /** Zero-based page index. */
  index: number;
  size: number;
}

/**
 * The complete, serializable view state of a datagrid. JSON in, JSON out:
 * persist it (saved views), send it to a server (`dataSource`), or let an
 * LLM produce it against `controller.stateSchema()`.
 */
export interface DataGridState {
  /** Sort keys in priority order (first = primary). */
  sort: DataGridSort[];
  /** Combined with AND. */
  filters: DataGridFilter[];
  /** Quick-search text across searchable columns. */
  search: string;
  /** `null` when the grid is not paginated (all rows virtualized). */
  page: DataGridPageState | null;
  /** Column order (array order), visibility and width. */
  columns: DataGridColumnState[];
}

/**
 * Partial state accepted by `setState` / `initialState`. Column entries only
 * need `field`; omitted properties keep their current value, and columns that
 * are not listed keep their state and move after the listed ones.
 */
export type DataGridStatePatch = Partial<Omit<DataGridState, 'columns'>> & {
  columns?: (Pick<DataGridColumnState, 'field'> & Partial<DataGridColumnState>)[];
};

/** Why part of a `setState` patch was dropped or adjusted. Useful as feedback for an LLM. */
export interface DataGridStateIssue {
  path: string;
  message: string;
}

/** What a server-side `dataSource` receives. */
export interface DataGridRequest {
  sort: DataGridSort[];
  filters: DataGridFilter[];
  search: string;
  page: DataGridPageState | null;
}

/** What a server-side `dataSource` returns. */
export interface DataGridPage<T> {
  rows: readonly T[];
  /** Total row count across all pages (after filters/search). */
  total: number;
}

export type DataGridDataSource<T> = (
  request: DataGridRequest,
  context: { signal: AbortSignal },
) => Promise<DataGridPage<T>> | Observable<DataGridPage<T>>;

// ── AI ───────────────────────────────────────────────────────────────────────

/** What the grid sends to Claude: instructions, user message and the reply's JSON Schema. */
export interface DataGridAiRequest {
  /** Instructions: column catalog, operators, rules, today's date. */
  system: string;
  /** User message: the current view plus the request. */
  prompt: string;
  /** JSON Schema of the expected reply (structured outputs compatible). */
  schema: Record<string, unknown>;
}

/**
 * Custom transport for a `DataGridAiRequest` (e.g. your own endpoint).
 * Resolves with the model's JSON reply, as an object or raw JSON text.
 */
export type DataGridAiHandler = (request: DataGridAiRequest, context: { signal: AbortSignal }) => Promise<unknown>;

/**
 * Enables the AI box and `ask()`. Pass the consumer's Anthropic key (usually
 * from the app environment); the grid calls Claude with structured outputs.
 * An empty key leaves AI off. Requires the optional peer `@anthropic-ai/sdk`.
 *
 * @example
 * ai: { apiKey: environment.anthropicApiKey, sampleValues: 12 }
 */
export interface DataGridAiConfig {
  /** Anthropic API key. */
  apiKey?: string;
  /** Claude model. Default: `'claude-opus-5-5'`. */
  model?: string;
  /** Send requests through your own transport instead of calling Claude with `apiKey`. */
  complete?: DataGridAiHandler;
  /**
   * Client mode: share up to this many frequent values per text column (and
   * the min/max of number and date columns) so the model can match names
   * exactly ("Acme" → "Acme Corp"). Default: 0, no row data leaves the browser.
   */
  sampleValues?: number;
  /** Domain hint, e.g. `'Accounts-receivable invoices; amounts in USD.'`. */
  context?: string;
  /** Example requests shown as one-click chips while the AI box is empty. */
  suggestions?: string[];
}

/** Outcome of `controller.ask()`. */
export type DataGridAskResult =
  | {
      status: 'applied';
      query: string;
      /** One sentence from the model describing the new view. */
      explanation: string;
      /** Parts of the reply that were invalid and dropped. */
      issues: DataGridStateIssue[];
    }
  | { status: 'error'; query: string; error: unknown }
  | { status: 'cancelled'; query: string };

export interface DataGridConfig<T> {
  columns: DataGridColumn<T>[];
  /** Client-side rows. Ignored when `dataSource` is set. Can also be bound via `[data]`. */
  data?: readonly T[] | Signal<readonly T[]>;
  /** Server-side mode: the grid sends its state, the server returns one page. Requires `pageSize`. */
  dataSource?: DataGridDataSource<T>;
  /** Enables pagination with this page size. Omit to virtualize every row. */
  pageSize?: number;
  /** Page-size choices in the footer. Default: `[25, 50, 100]` (plus `pageSize`). */
  pageSizeOptions?: number[];
  /** Fixed row height in px (virtualization relies on it). Default: 36. */
  rowHeight?: number;
  /** Show the quick-search box. Default: `false`. */
  search?: boolean;
  /**
   * Stable row identity, used for rendering and selection. Default: `row.id`,
   * else the row object itself (selection then survives sorting/filtering but
   * not replacing the data with new objects).
   */
  rowKey?: (row: T) => string | number;
  /** Row selection with a pinned checkbox column. Default: none. */
  selection?: 'single' | 'multi';
  /** Called whenever the selected rows change. */
  onSelectionChange?: (rows: readonly T[]) => void;
  /** Header menu (sort, filter, hide, column chooser) on every column. Default: `true`. */
  columnMenu?: boolean;
  /** Allow resizing columns by dragging the header edge (Alt+←/→ from the keyboard). Default: `true`. */
  resizable?: boolean;
  /** State applied on creation (merged over the defaults derived from `columns`). */
  initialState?: DataGridStatePatch;
  /** Called after every state change (user or programmatic). */
  onStateChange?: (state: DataGridState) => void;
  /** Natural-language view requests ("overdue invoices over 10k, newest first") with Claude. Enables `ask()` and the AI box. */
  ai?: DataGridAiConfig;
  /** Accessible name of the grid. */
  ariaLabel?: string;
}

/** Context for `<ng-template hkDataGridCell="field" let-value let-row="row">`. */
export interface DataGridCellContext<T> {
  $implicit: unknown;
  row: T;
  column: DataGridColumn<T>;
  /** Index within the current view (after filter/sort/page). */
  rowIndex: number;
}

/**
 * Returned by `createDataGrid()`. Holds the state (single source of truth) and
 * the derived view; bind it with `<hk-datagrid [controller]="grid" />`.
 */
export interface DataGridController<T> {
  readonly columns: readonly DataGridColumn<T>[];
  readonly options: Readonly<Omit<DataGridConfig<T>, 'columns' | 'data' | 'initialState'>>;

  /** Current state. */
  readonly state: Signal<DataGridState>;
  /** Visible columns in display order, with resolved widths. */
  readonly visibleColumns: Signal<readonly ResolvedDataGridColumn<T>[]>;
  /** Rows of the current view (filtered, sorted, paginated). */
  readonly rows: Signal<readonly T[]>;
  /** Rows matching filters/search across all pages. */
  readonly total: Signal<number>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<unknown>;
  /** `true` when rows come from `dataSource`. */
  readonly serverSide: boolean;

  getState(): DataGridState;
  /** Apply a partial state. Invalid parts are dropped and reported, never thrown. */
  setState(patch: DataGridStatePatch): DataGridStateIssue[];
  /** Back to the state derived from `columns` + `initialState`. */
  resetState(): void;
  /** JSON Schema (2020-12) describing a valid `DataGridState` for these columns. */
  stateSchema(): Record<string, unknown>;

  /** Click-style sort: cycles asc → desc → off. `additive` keeps the other sort keys (Shift+click). */
  toggleSort(field: string, additive?: boolean): void;
  setSearch(search: string): void;
  setPage(index: number): void;
  setPageSize(size: number): void;
  /** Replace client-side rows. */
  setData(rows: readonly T[]): void;
  /** Re-run the server request with the current state. */
  refresh(): void;

  // ── Filters & columns (state shortcuts that do not reorder columns) ───────
  /** Replace the filter on `field` (or remove it with `null`). Returns validation issues. */
  setFilter(field: string, filter: Omit<DataGridFilter, 'field'> | null): DataGridStateIssue[];
  clearFilters(): void;
  setColumnWidth(field: string, width: number): void;
  setColumnVisible(field: string, visible: boolean): void;

  // ── Selection (not part of DataGridState: it is data, not view) ───────────
  /** Selected rows (all pages / all loaded pages in server mode). */
  readonly selectedRows: Signal<readonly T[]>;
  readonly selectedCount: Signal<number>;
  isSelected(row: T): boolean;
  toggleRow(row: T, selected?: boolean): void;
  selectRows(rows: readonly T[]): void;
  /** Client mode: every row matching filters/search. Server mode: the current page. */
  selectAll(): void;
  clearSelection(): void;

  // ── AI (requires `config.ai`) ─────────────────────────────────────────────
  readonly aiEnabled: boolean;
  /**
   * Turn a natural-language request into grid state with Claude and apply it. A new call cancels the one in flight. Never rejects.
   */
  ask(query: string): Promise<DataGridAskResult>;
  readonly asking: Signal<boolean>;
  /**
   * Result of the last `ask()`. An applied result clears itself once the view
   * changes again, so it always describes what is on screen.
   */
  readonly lastAsk: Signal<DataGridAskResult | null>;
  /** Restore the view from before the last applied `ask()` (while it is still on screen). */
  undoAsk(): void;
  /** Cancel the request in flight and clear `lastAsk`. */
  dismissAsk(): void;
}

/** A column with its defaults and current width resolved. */
export interface ResolvedDataGridColumn<T> extends DataGridColumn<T> {
  type: DataGridColumnType;
  width: number;
  align: 'start' | 'center' | 'end';
  sortable: boolean;
  filterable: boolean;
  searchable: boolean;
  /** Left offset in px within the scroll canvas. */
  offset: number;
}
