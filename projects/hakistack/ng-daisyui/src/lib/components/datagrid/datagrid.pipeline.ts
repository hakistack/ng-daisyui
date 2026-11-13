import { compareValues, matchesFilter } from '../../grid-core/grid-predicates';
import { columnType, isSearchable } from './datagrid.state';
import type { DataGridColumn, DataGridState } from './datagrid.types';

/** Raw cell value: the column's accessor, else `row[field]`. */
export function getCellValue<T>(row: T, column: DataGridColumn<T>): unknown {
  return column.value ? column.value(row) : (row as Record<string, unknown>)[column.field];
}

/** Display text: `format()` when given, else the raw value as a string ('' for null). */
export function getCellText<T>(row: T, column: DataGridColumn<T>): string {
  const value = getCellValue(row, column);
  if (column.format) return column.format(value, row);
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

export interface ClientView<T> {
  /** Rows of the current page (or all matching rows when unpaginated). */
  rows: readonly T[];
  /** Matching rows across all pages. */
  total: number;
  /** Every matching row in view order, before the page slice (select-all, copy). */
  matching: readonly T[];
  /** Page index actually shown — clamped when the data shrank under the requested page. */
  pageIndex: number;
}

/**
 * Client-side view: filters (AND) → quick search → multi-key stable sort → page slice.
 * Pure; the controller memoizes it in a `computed()`.
 */
export function applyClientView<T>(data: readonly T[], columns: readonly DataGridColumn<T>[], state: DataGridState): ClientView<T> {
  const byField = new Map(columns.map((c) => [c.field, c]));
  let rows: readonly T[] = data;

  const filters = state.filters.flatMap((f) => {
    const column = byField.get(f.field);
    return column ? [{ ...f, column, date: columnType(column) === 'date' }] : [];
  });
  if (filters.length) {
    rows = rows.filter((row) => filters.every((f) => matchesFilter(getCellValue(row, f.column), f.operator, f.value, { date: f.date })));
  }

  const term = state.search.trim().toLowerCase();
  if (term) {
    const visible = new Set(state.columns.filter((c) => c.visible).map((c) => c.field));
    const searchable = columns.filter((c) => visible.has(c.field) && isSearchable(c));
    rows = rows.filter((row) => searchable.some((c) => getCellText(row, c).toLowerCase().includes(term)));
  }

  const keys = state.sort.flatMap((s) => {
    const column = byField.get(s.field);
    return column ? [{ column, direction: s.direction }] : [];
  });
  if (keys.length) {
    // Decorate once so accessors run n times, not n·log(n). Array#sort is stable,
    // so rows that tie on every key keep their input order.
    const decorated = rows.map((row, i) => ({ row, i, values: keys.map((k) => getCellValue(row, k.column)) }));
    decorated.sort((a, b) => {
      for (let k = 0; k < keys.length; k++) {
        const c = compareValues(a.values[k], b.values[k], keys[k].direction);
        if (c !== 0) return c;
      }
      return a.i - b.i;
    });
    rows = decorated.map((d) => d.row);
  }

  const total = rows.length;
  if (!state.page) return { rows, total, matching: rows, pageIndex: 0 };

  const lastPage = Math.max(0, Math.ceil(total / state.page.size) - 1);
  const pageIndex = Math.min(state.page.index, lastPage);
  const start = pageIndex * state.page.size;
  return { rows: rows.slice(start, start + state.page.size), total, matching: rows, pageIndex };
}
