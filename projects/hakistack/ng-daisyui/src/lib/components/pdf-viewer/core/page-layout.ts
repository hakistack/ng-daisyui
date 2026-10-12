/**
 * Vertical layout of a page stack: page `i` occupies `[top(i), top(i) + height(i))`
 * and pages are separated by `gap`. Coordinates are CSS px from the top of the
 * stack's content box. Pure arithmetic, so the viewer can position, window and
 * track pages without measuring the DOM — and keep the scroll height exact
 * while only a handful of pages are mounted.
 */
export class PageLayout {
  private readonly tops: Float64Array;
  readonly totalHeight: number;

  constructor(
    private readonly heights: readonly number[],
    readonly gap: number,
  ) {
    this.tops = new Float64Array(heights.length);
    let y = 0;
    for (let i = 0; i < heights.length; i++) {
      this.tops[i] = y;
      y += heights[i] + (i < heights.length - 1 ? gap : 0);
    }
    this.totalHeight = y;
  }

  get count(): number {
    return this.heights.length;
  }

  top(index: number): number {
    return this.tops[index];
  }

  height(index: number): number {
    return this.heights[index];
  }

  bottom(index: number): number {
    return this.tops[index] + this.heights[index];
  }

  /** Last page whose top is at or above `y` (clamped to the document). O(log n). */
  indexAt(y: number): number {
    if (this.count === 0) return -1;
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.tops[mid] <= y) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** The page containing `y`, or the nearest one when `y` falls in a gap. */
  nearestIndex(y: number): number {
    const i = this.indexAt(y);
    if (i < 0 || i === this.count - 1 || y <= this.bottom(i)) return i;
    return y - this.bottom(i) <= this.top(i + 1) - y ? i : i + 1;
  }

  /** Inclusive index range of pages intersecting `[y0, y1]`, or `null` for an empty layout. */
  range(y0: number, y1: number): [first: number, last: number] | null {
    if (this.count === 0) return null;
    let first = this.indexAt(y0);
    if (first < this.count - 1 && this.bottom(first) < y0) first++; // y0 sits in the gap below `first`
    const last = Math.max(first, this.indexAt(y1));
    return [first, last];
  }

  /**
   * Height of a spacer standing in for pages `[0, first)` in a flex column with
   * `gap`: the spacer itself is followed by one gap, so it's that much shorter.
   */
  spacerBefore(first: number): number {
    return first <= 0 ? 0 : this.tops[first] - this.gap;
  }

  /** Height of a spacer standing in for pages `(last, count)`. */
  spacerAfter(last: number): number {
    return last >= this.count - 1 ? 0 : this.totalHeight - this.bottom(last) - this.gap;
  }
}
