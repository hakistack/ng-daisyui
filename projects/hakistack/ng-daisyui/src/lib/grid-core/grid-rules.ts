/**
 * Pure rules shared by `hk-table` and `hk-datagrid`: the sort cycle, page arithmetic and row identity.
 * Both grids call these instead of re-deriving them, so a click, a page clamp or a row key behaves the
 * same in either.
 */

export type GridSortDirection = 'asc' | 'desc';

export interface GridSortKey {
  readonly field: string;
  readonly direction: GridSortDirection;
}

/**
 * The next sort after a header click on `field`: asc → desc → off.
 *
 * - Plain click: `field` becomes the only key. It keeps cycling only when it already is the only key;
 *   a click on a column that is one of several keys (or not sorted) starts over at asc.
 * - Additive click (multi-sort): `field` is appended at asc, or cycles in place, and is removed after desc.
 */
export function nextSort<S extends GridSortKey>(current: readonly S[], field: string, additive = false): GridSortKey[] {
  const existing = current.find((s) => s.field === field);
  const soleKey = current.length === 1 && !!existing;
  const nextDirection: GridSortDirection | null =
    existing && (additive || soleKey) ? (existing.direction === 'asc' ? 'desc' : null) : 'asc';

  if (!additive) return nextDirection ? [{ field, direction: nextDirection }] : [];
  if (!existing) return [...current, { field, direction: 'asc' }];
  return nextDirection
    ? current.map((s) => (s.field === field ? { field, direction: nextDirection } : s))
    : current.filter((s) => s.field !== field);
}

/** Number of pages for `total` rows — at least 1, so "page 1 of 1" holds for an empty grid. */
export function pageCount(total: number, pageSize: number): number {
  return pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
}

/** Zero-based index of the last page. */
export function lastPageIndex(total: number, pageSize: number): number {
  return pageCount(total, pageSize) - 1;
}

/** `index` floored and kept within `[0, lastPageIndex]`. */
export function clampPageIndex(index: number, total: number, pageSize: number): number {
  return Math.min(Math.max(0, Math.floor(index)), lastPageIndex(total, pageSize));
}

/**
 * The identity a row carries by itself: an own `id` (string or number), else a `TreeNode`-style string
 * `key`. `undefined` when it has neither — callers then use the consumer's key function or their own
 * fallback (a render index, the row object).
 */
export function naturalRowKey(row: unknown): string | number | undefined {
  if (row === null || typeof row !== 'object') return undefined;
  const { id, key } = row as { id?: unknown; key?: unknown };
  if (typeof id === 'string' || typeof id === 'number') return id;
  if (typeof key === 'string') return key;
  return undefined;
}
