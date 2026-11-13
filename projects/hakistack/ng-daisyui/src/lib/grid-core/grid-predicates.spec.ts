import { compareValues, matchesFilter } from './grid-predicates';

describe('matchesFilter', () => {
  it('handles empty operators regardless of value', () => {
    expect(matchesFilter(null, 'isEmpty', undefined)).toBe(true);
    expect(matchesFilter('', 'isEmpty', undefined)).toBe(true);
    expect(matchesFilter('x', 'isNotEmpty', undefined)).toBe(true);
    expect(matchesFilter(undefined, 'isNotEmpty', undefined)).toBe(false);
  });

  it('lets "not" operators match null cells and filters nulls out otherwise', () => {
    expect(matchesFilter(null, 'notEquals', 'a')).toBe(true);
    expect(matchesFilter(null, 'notContains', 'a')).toBe(true);
    expect(matchesFilter(null, 'notIn', ['a'])).toBe(true);
    expect(matchesFilter(null, 'equals', 'a')).toBe(false);
    expect(matchesFilter(null, 'gt', 1)).toBe(false);
  });

  it('compares text case-insensitively except for equals', () => {
    expect(matchesFilter('Hello World', 'contains', 'WORLD')).toBe(true);
    expect(matchesFilter('Hello', 'startsWith', 'he')).toBe(true);
    expect(matchesFilter('Hello', 'endsWith', 'LO')).toBe(true);
    expect(matchesFilter('Hello', 'equals', 'hello')).toBe(false);
  });

  it('supports numeric comparisons and open-ended between', () => {
    expect(matchesFilter(5, 'gt', 4)).toBe(true);
    expect(matchesFilter(5, 'lte', 5)).toBe(true);
    expect(matchesFilter(5, 'between', [1, 10])).toBe(true);
    expect(matchesFilter(5, 'between', [null, 4])).toBe(false);
    expect(matchesFilter(5, 'between', [5, null])).toBe(true);
    expect(matchesFilter(5, 'between', 5)).toBe(false);
  });

  it('fails closed for in/notIn with a non-array value', () => {
    expect(matchesFilter('a', 'in', 'a')).toBe(false);
    expect(matchesFilter('a', 'notIn', 'a')).toBe(false);
    expect(matchesFilter('a', 'in', ['a', 'b'])).toBe(true);
  });

  it('compares dates by timestamp when date is set', () => {
    const opts = { date: true };
    expect(matchesFilter('2025-03-10', 'gt', '2025-03-01', opts)).toBe(true);
    expect(matchesFilter(new Date('2025-03-10'), 'lt', '2025-03-01', opts)).toBe(false);
    expect(matchesFilter('2025-03-10', 'between', ['2025-03-01', '2025-03-31'], opts)).toBe(true);
    expect(matchesFilter('2025-03-10', 'equals', new Date('2025-03-10'), opts)).toBe(true);
    // Without the flag, ISO strings are not numbers.
    expect(matchesFilter('2025-03-10', 'gt', '2025-03-01')).toBe(false);
  });
});

describe('compareValues', () => {
  it('sorts strings naturally and case-insensitively', () => {
    expect(['item10', 'Item2', 'item1'].sort((a, b) => compareValues(a, b))).toEqual(['item1', 'Item2', 'item10']);
  });

  it('reverses for desc but always sinks nulls', () => {
    const values = [2, null, 3, undefined, 1];
    expect([...values].sort((a, b) => compareValues(a, b, 'asc'))).toEqual([1, 2, 3, null, undefined]);
    expect([...values].sort((a, b) => compareValues(a, b, 'desc'))).toEqual([3, 2, 1, null, undefined]);
  });

  it('orders booleans and dates', () => {
    expect(compareValues(false, true)).toBeLessThan(0);
    expect(compareValues(new Date('2025-01-02'), new Date('2025-01-01'))).toBeGreaterThan(0);
  });
});
