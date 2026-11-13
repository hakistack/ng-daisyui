import { columnOffsets, columnRange, rowRange, scrollToReveal } from './datagrid.virtual';

describe('rowRange', () => {
  it('covers the viewport plus overscan, clamped to the row count', () => {
    expect(rowRange(0, 100, 20, 1000, 2)).toEqual({ start: 0, end: 8 });
    expect(rowRange(400, 100, 20, 1000, 2)).toEqual({ start: 18, end: 28 });
    expect(rowRange(19_990, 100, 20, 1000, 2)).toEqual({ start: 997, end: 1000 });
  });

  it('is empty without rows', () => {
    expect(rowRange(0, 100, 20, 0, 2)).toEqual({ start: 0, end: 0 });
  });
});

describe('columnRange', () => {
  const offsets = columnOffsets([100, 200, 50, 150, 100]);

  it('builds prefix sums ending in the total width', () => {
    expect(offsets).toEqual([0, 100, 300, 350, 500, 600]);
  });

  it('returns the intersecting columns plus overscan', () => {
    expect(columnRange(offsets, 0, 250, 0)).toEqual({ start: 0, end: 2 });
    expect(columnRange(offsets, 320, 100, 0)).toEqual({ start: 2, end: 4 });
    expect(columnRange(offsets, 320, 100, 1)).toEqual({ start: 1, end: 5 });
    expect(columnRange(offsets, 0, 10_000, 0)).toEqual({ start: 0, end: 5 });
  });

  it('is empty without columns', () => {
    expect(columnRange([0], 0, 100, 1)).toEqual({ start: 0, end: 0 });
  });
});

describe('scrollToReveal', () => {
  it('scrolls only as far as needed', () => {
    expect(scrollToReveal(100, 200, 150, 20)).toBe(100);
    expect(scrollToReveal(100, 200, 50, 20)).toBe(50);
    expect(scrollToReveal(100, 200, 290, 20)).toBe(110);
  });
});
