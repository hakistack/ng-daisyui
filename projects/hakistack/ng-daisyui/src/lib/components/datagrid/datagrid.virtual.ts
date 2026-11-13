/** Half-open index range `[start, end)`. */
export interface IndexRange {
  start: number;
  end: number;
}

/**
 * Rows to render for fixed-height virtualization: the rows intersecting the
 * viewport plus `overscan` on each side.
 */
export function rowRange(scrollTop: number, viewportHeight: number, rowHeight: number, rowCount: number, overscan: number): IndexRange {
  if (rowCount === 0 || rowHeight <= 0) return { start: 0, end: 0 };
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visible = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;
  return {
    start: Math.max(0, first - overscan),
    end: Math.min(rowCount, first + visible + overscan),
  };
}

/** Prefix sums: `offsets[i]` is the left edge of column `i`; the last entry is the total width. */
export function columnOffsets(widths: readonly number[]): number[] {
  const offsets = new Array<number>(widths.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < widths.length; i++) offsets[i + 1] = offsets[i] + widths[i];
  return offsets;
}

/** Columns intersecting `[scrollLeft, scrollLeft + viewportWidth)`, plus `overscan` on each side. */
export function columnRange(offsets: readonly number[], scrollLeft: number, viewportWidth: number, overscan: number): IndexRange {
  const count = offsets.length - 1;
  if (count <= 0) return { start: 0, end: 0 };
  const left = Math.max(0, scrollLeft);
  const first = lastOffsetAtOrBefore(offsets, left);
  const last = lastOffsetAtOrBefore(offsets, left + Math.max(0, viewportWidth));
  return {
    start: Math.max(0, first - overscan),
    end: Math.min(count, last + 1 + overscan),
  };
}

/** Index of the column whose left edge is the last one ≤ `x` (binary search). */
function lastOffsetAtOrBefore(offsets: readonly number[], x: number): number {
  let lo = 0;
  let hi = offsets.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Scroll position that brings `[start, start + size)` fully into a viewport of
 * `viewportSize` currently scrolled to `scroll`; returns `scroll` unchanged
 * when it is already visible.
 */
export function scrollToReveal(scroll: number, viewportSize: number, start: number, size: number): number {
  if (start < scroll) return start;
  if (start + size > scroll + viewportSize) return Math.max(0, start + size - viewportSize);
  return scroll;
}
