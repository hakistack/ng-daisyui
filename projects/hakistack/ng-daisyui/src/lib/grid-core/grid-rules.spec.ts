import { clampPageIndex, GridSortKey, lastPageIndex, naturalRowKey, nextSort, pageCount } from './grid-rules';

describe('nextSort', () => {
  const asc = (field: string): GridSortKey => ({ field, direction: 'asc' });
  const desc = (field: string): GridSortKey => ({ field, direction: 'desc' });

  it('cycles a plain click asc → desc → off', () => {
    expect(nextSort([], 'name')).toEqual([asc('name')]);
    expect(nextSort([asc('name')], 'name')).toEqual([desc('name')]);
    expect(nextSort([desc('name')], 'name')).toEqual([]);
  });

  it('restarts at asc when a plain click hits another column or one of several keys', () => {
    expect(nextSort([desc('name')], 'age')).toEqual([asc('age')]);
    expect(nextSort([asc('name'), asc('age')], 'age')).toEqual([asc('age')]);
  });

  it('appends, cycles in place and removes keys on additive clicks', () => {
    expect(nextSort([asc('name')], 'age', true)).toEqual([asc('name'), asc('age')]);
    expect(nextSort([asc('name'), asc('age')], 'name', true)).toEqual([desc('name'), asc('age')]);
    expect(nextSort([desc('name'), asc('age')], 'name', true)).toEqual([asc('age')]);
  });
});

describe('page arithmetic', () => {
  it('counts at least one page and points at the last index', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(95, 10)).toBe(10);
    expect(pageCount(100, 10)).toBe(10);
    expect(pageCount(5, 0)).toBe(1);
    expect(lastPageIndex(0, 10)).toBe(0);
    expect(lastPageIndex(95, 10)).toBe(9);
  });

  it('clamps and floors a page index into range', () => {
    expect(clampPageIndex(-3, 95, 10)).toBe(0);
    expect(clampPageIndex(4.7, 95, 10)).toBe(4);
    expect(clampPageIndex(40, 95, 10)).toBe(9);
    expect(clampPageIndex(2, 0, 10)).toBe(0);
  });
});

describe('naturalRowKey', () => {
  it('prefers id, then a TreeNode-style key, else nothing', () => {
    expect(naturalRowKey({ id: 7, key: 'k' })).toBe(7);
    expect(naturalRowKey({ id: 'a' })).toBe('a');
    expect(naturalRowKey({ key: 'node-1', data: {} })).toBe('node-1');
    expect(naturalRowKey({ id: { nested: true }, name: 'x' })).toBeUndefined();
    expect(naturalRowKey(null)).toBeUndefined();
    expect(naturalRowKey('row')).toBeUndefined();
  });
});
