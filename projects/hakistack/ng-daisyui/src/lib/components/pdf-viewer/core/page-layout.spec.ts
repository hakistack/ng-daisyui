import { PageLayout } from './page-layout';

describe('PageLayout', () => {
  // Three pages of heights 100, 200, 100 with a 10px gap:
  // [0,100)  gap [100,110)  [110,310)  gap [310,320)  [320,420)
  const layout = new PageLayout([100, 200, 100], 10);

  it('computes tops, bottoms and the total height', () => {
    expect([layout.top(0), layout.top(1), layout.top(2)]).toEqual([0, 110, 320]);
    expect(layout.bottom(1)).toBe(310);
    expect(layout.totalHeight).toBe(420);
  });

  it('finds the page at a position by binary search', () => {
    expect(layout.indexAt(-50)).toBe(0);
    expect(layout.indexAt(0)).toBe(0);
    expect(layout.indexAt(105)).toBe(0); // in the gap → the page above
    expect(layout.indexAt(110)).toBe(1);
    expect(layout.indexAt(10_000)).toBe(2);
  });

  it('picks the nearest page when a position falls in a gap', () => {
    expect(layout.nearestIndex(150)).toBe(1);
    expect(layout.nearestIndex(103)).toBe(0);
    expect(layout.nearestIndex(108)).toBe(1);
  });

  it('returns the range of pages intersecting a band', () => {
    expect(layout.range(0, 50)).toEqual([0, 0]);
    expect(layout.range(50, 150)).toEqual([0, 1]);
    expect(layout.range(105, 108)).toEqual([1, 1]); // band entirely inside a gap
    expect(layout.range(300, 5000)).toEqual([1, 2]);
    expect(new PageLayout([], 10).range(0, 100)).toBeNull();
  });

  it('sizes spacers so mounted pages land exactly where the full stack would put them', () => {
    // Mounting only page 1: the before-spacer plus one gap must equal top(1),
    // and the after-spacer plus one gap must cover the rest.
    expect(layout.spacerBefore(1) + layout.gap).toBe(layout.top(1));
    expect(layout.bottom(1) + layout.gap + layout.spacerAfter(1)).toBe(layout.totalHeight);
    expect(layout.spacerBefore(0)).toBe(0);
    expect(layout.spacerAfter(2)).toBe(0);
  });

  it('handles 100k pages', () => {
    const big = new PageLayout(new Array(100_000).fill(1000), 16);
    expect(big.indexAt(1016 * 54_321 + 5)).toBe(54_321);
    expect(big.totalHeight).toBe(100_000 * 1016 - 16);
  });
});
