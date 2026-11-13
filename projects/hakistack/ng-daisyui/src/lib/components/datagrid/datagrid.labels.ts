import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

import type { FilterOperator } from '../../grid-core/grid.types';

/**
 * Text used by `<hk-datagrid>`. Override app-wide with `provideHkDataGridLabels({...})`
 * or per instance with the `[labels]` input. Mirrors `provideHkPdfLabels`.
 */
export interface DataGridLabels {
  /** Quick-search placeholder. Default: "Search…" */
  searchPlaceholder?: string;
  /** Quick-search accessible name. Default: "Search rows" */
  searchAriaLabel?: string;
  /** Shown when no row matches. Default: "No rows to display" */
  empty?: string;
  /** Shown / announced while loading. Default: "Loading…" */
  loading?: string;
  /** Shown when the data source fails. Default: "Could not load data." */
  error?: string;
  /** Retry button after an error. Default: "Retry" */
  retry?: string;
  /** Live-region announcement after the rows change. Default: "N rows" */
  rowCount?: (total: number) => string;
  /** Screen-reader suffix for secondary sort keys. Default: "sorted ascending, priority 2" */
  sortStatus?: (direction: 'asc' | 'desc', priority: number) => string;
  /** Pagination landmark name. Default: "Pagination" */
  paginationAriaLabel?: string;
  /** Page-size select label. Default: "Rows per page" */
  rowsPerPage?: string;
  /** Default: "First page" */
  firstPage?: string;
  /** Default: "Previous page" */
  previousPage?: string;
  /** Default: "Next page" */
  nextPage?: string;
  /** Default: "Last page" */
  lastPage?: string;
  /** Range summary. Default: "1–50 of 1,234" */
  range?: (start: number, end: number, total: number) => string;
  /** Default: "Page 1 of 25" */
  pageOf?: (page: number, pageCount: number) => string;

  // ── Selection ──
  /** Row checkbox. Default: "Select row" */
  selectRow?: string;
  /** Header checkbox. Default: "Select all rows" */
  selectAll?: string;
  /** Toolbar count. Default: "3 selected" */
  selectedCount?: (count: number) => string;
  /** Default: "Clear selection" */
  clearSelection?: string;

  // ── Cell range ──
  /** Status bar for a multi-cell range. Default: "Count: 12 · Sum: 3,400 · Avg: 283.33" */
  rangeSummary?: (count: number, sum: number | null, avg: number | null) => string;

  // ── Column menu & filters ──
  /** Menu button and dialog name. Default: "Column options: Amount" */
  columnMenu?: (header: string) => string;
  /** Default: "Sort ascending" */
  sortAscending?: string;
  /** Default: "Sort descending" */
  sortDescending?: string;
  /** Default: "Clear sort" */
  clearSort?: string;
  /** Filter section title. Default: "Filter" */
  filter?: string;
  /** Operator select. Default: "Operator" */
  operator?: string;
  /** Value input. Default: "Value" */
  value?: string;
  /** Lower bound of `between`. Default: "From" */
  valueFrom?: string;
  /** Upper bound of `between`. Default: "To" */
  valueTo?: string;
  /** Placeholder for `in` / `notIn`. Default: "Comma-separated values" */
  listPlaceholder?: string;
  /** Shown when Apply is pressed without a value. Default: "Enter a value." */
  valueRequired?: string;
  /** Default: "Apply" */
  apply?: string;
  /** Default: "Clear" */
  clear?: string;
  /** Default: "Yes" */
  booleanTrue?: string;
  /** Default: "No" */
  booleanFalse?: string;
  /** Default: "Hide column" */
  hideColumn?: string;
  /** Column chooser title. Default: "Columns" */
  columns?: string;
  /** Filter chip remove button. Default: "Remove filter: Amount ≥ 100" */
  removeFilter?: (description: string) => string;
  /** Default: "Clear filters" */
  clearFilters?: string;
  /** Header text marking a filtered column for screen readers. Default: "filtered" */
  filtered?: string;

  // ── AI ──
  /** AI box placeholder. Default: "Ask for a view, e.g. overdue invoices over 10k, newest first" */
  aiPlaceholder?: string;
  /** AI box accessible name. Default: "Describe the view you want" */
  aiAriaLabel?: string;
  /** Submit button. Default: "Ask" */
  aiSubmit?: string;
  /** Shown while the model works. Default: "Thinking…" */
  aiAsking?: string;
  /** Cancel / dismiss button. Default: "Cancel" */
  aiCancel?: string;
  /** Restores the previous view. Default: "Undo" */
  aiUndo?: string;
  /** Dismisses the result message. Default: "Dismiss" */
  aiDismiss?: string;
  /** Request failed. Default: "The AI request failed." */
  aiError?: string;
  /** Name of the suggestion chips group. Default: "Suggestions" */
  aiSuggestions?: string;
  /** Parts of the answer that were dropped. Default: "Not applied: …" */
  aiIssues?: (messages: string[]) => string;

  /** Operator names (menu options and chips). Missing entries fall back to English. */
  operators?: Partial<Record<FilterOperator, string>>;
}

export type ResolvedDataGridLabels = Required<Omit<DataGridLabels, 'operators'>> & { operators: Record<FilterOperator, string> };

export const DEFAULT_DATAGRID_OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: '=',
  notEquals: '≠',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'between',
  in: 'is one of',
  notIn: 'is not one of',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
};

const fmt = (n: number) => n.toLocaleString();

export const DEFAULT_DATAGRID_LABELS: ResolvedDataGridLabels = {
  searchPlaceholder: 'Search…',
  searchAriaLabel: 'Search rows',
  empty: 'No rows to display',
  loading: 'Loading…',
  error: 'Could not load data.',
  retry: 'Retry',
  rowCount: (total) => `${fmt(total)} ${total === 1 ? 'row' : 'rows'}`,
  sortStatus: (direction, priority) => `sorted ${direction === 'asc' ? 'ascending' : 'descending'}, priority ${priority}`,
  paginationAriaLabel: 'Pagination',
  rowsPerPage: 'Rows per page',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  range: (start, end, total) => (total === 0 ? '0 of 0' : `${fmt(start)}–${fmt(end)} of ${fmt(total)}`),
  pageOf: (page, pageCount) => `Page ${fmt(page)} of ${fmt(pageCount)}`,
  selectRow: 'Select row',
  selectAll: 'Select all rows',
  selectedCount: (count) => `${fmt(count)} selected`,
  clearSelection: 'Clear selection',
  rangeSummary: (count, sum, avg) =>
    [`Count: ${fmt(count)}`, sum != null ? `Sum: ${fmt(sum)}` : '', avg != null ? `Avg: ${fmt(Math.round(avg * 100) / 100)}` : '']
      .filter(Boolean)
      .join(' · '),
  columnMenu: (header) => `Column options: ${header}`,
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  filter: 'Filter',
  operator: 'Operator',
  value: 'Value',
  valueFrom: 'From',
  valueTo: 'To',
  listPlaceholder: 'Comma-separated values',
  valueRequired: 'Enter a value.',
  apply: 'Apply',
  clear: 'Clear',
  booleanTrue: 'Yes',
  booleanFalse: 'No',
  hideColumn: 'Hide column',
  columns: 'Columns',
  removeFilter: (description) => `Remove filter: ${description}`,
  clearFilters: 'Clear filters',
  filtered: 'filtered',
  aiPlaceholder: 'Ask for a view, e.g. overdue invoices over 10k, newest first',
  aiAriaLabel: 'Describe the view you want',
  aiSubmit: 'Ask',
  aiAsking: 'Thinking…',
  aiCancel: 'Cancel',
  aiUndo: 'Undo',
  aiDismiss: 'Dismiss',
  aiError: 'The AI request failed.',
  aiSuggestions: 'Suggestions',
  aiIssues: (messages) => `Not applied: ${messages.join(' ')}`,
  operators: DEFAULT_DATAGRID_OPERATOR_LABELS,
};

/** Merge app-wide and per-instance overrides over the defaults (operators merged key by key). */
export function resolveDataGridLabels(...overrides: (DataGridLabels | null | undefined)[]): ResolvedDataGridLabels {
  let resolved: ResolvedDataGridLabels = DEFAULT_DATAGRID_LABELS;
  for (const o of overrides) {
    if (!o) continue;
    resolved = { ...resolved, ...o, operators: { ...resolved.operators, ...o.operators } } as ResolvedDataGridLabels;
  }
  return resolved;
}

export const HK_DATAGRID_LABELS = new InjectionToken<DataGridLabels>('HK_DATAGRID_LABELS');

/**
 * Register app-wide text for `<hk-datagrid>`. Omitted fields fall back to
 * `DEFAULT_DATAGRID_LABELS`.
 *
 * @example
 * providers: [
 *   provideHkDataGridLabels({
 *     empty: 'Sin resultados',
 *     rowCount: (n) => `${n} filas`,
 *   }),
 * ]
 */
export function provideHkDataGridLabels(labels: DataGridLabels): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_DATAGRID_LABELS, useValue: labels }]);
}
