import type { FilterOperator } from './grid.types';

/**
 * Pure, render-agnostic row predicates and comparators shared by `hk-table`
 * (via its controllers) and `hk-datagrid` (via its client pipeline).
 */

export interface MatchFilterOptions {
  /**
   * Compare as dates: both sides are parsed with `new Date(...)` and compared by
   * timestamp for `equals` / `notEquals` / `gt` / `gte` / `lt` / `lte` / `between`.
   * Needed because `Number('2025-01-15')` is NaN, so a numeric path silently
   * excludes every row whenever a date filter is applied.
   */
  readonly date?: boolean;
}

/**
 * Test one cell value against a filter.
 *
 * Null semantics: "not" operators match null cells (null is not equal to / does
 * not contain / is not in anything); every other operator filters nulls out.
 * Text operators are case-insensitive; `equals` / `notEquals` are strict.
 */
export function matchesFilter(value: unknown, operator: FilterOperator, filterValue: unknown, options?: MatchFilterOptions): boolean {
  if (operator === 'isEmpty') {
    return value == null || value === '';
  }
  if (operator === 'isNotEmpty') {
    return value != null && value !== '';
  }

  if (value == null) {
    return operator === 'notEquals' || operator === 'notContains' || operator === 'notIn';
  }

  if (options?.date) {
    const dateResult = matchesDateFilter(value, operator, filterValue);
    if (dateResult !== undefined) return dateResult;
  }

  switch (operator) {
    case 'equals':
      return value === filterValue;
    case 'notEquals':
      return value !== filterValue;
    case 'contains':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'notContains':
      return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'startsWith':
      return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
    case 'endsWith':
      return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
    case 'gt':
      return Number(value) > Number(filterValue);
    case 'lt':
      return Number(value) < Number(filterValue);
    case 'gte':
      return Number(value) >= Number(filterValue);
    case 'lte':
      return Number(value) <= Number(filterValue);
    case 'in':
      return Array.isArray(filterValue) ? filterValue.includes(value) : false;
    case 'notIn':
      // Aligned with `in` — malformed (non-array) filter value fails closed.
      return Array.isArray(filterValue) ? !filterValue.includes(value) : false;
    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
      // Partial ranges are allowed: missing low bound → -Infinity; missing high bound → +Infinity.
      const n = Number(value);
      if (isNaN(n)) return false;
      const [a, b] = filterValue as [unknown, unknown];
      const lo = a != null && a !== '' ? Number(a) : -Infinity;
      const hi = b != null && b !== '' ? Number(b) : Infinity;
      return n >= lo && n <= hi;
    }
    default:
      return true;
  }
}

/** Date-aware comparison. Returns `undefined` for operators that have no date meaning (text ops, in/notIn). */
function matchesDateFilter(value: unknown, operator: FilterOperator, filterValue: unknown): boolean | undefined {
  const t = toTimestamp(value);
  switch (operator) {
    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
      if (isNaN(t)) return false;
      const [a, b] = filterValue as [unknown, unknown];
      const lo = a != null && a !== '' ? toTimestamp(a) : -Infinity;
      const hi = b != null && b !== '' ? toTimestamp(b) : Infinity;
      return t >= lo && t <= hi;
    }
    case 'equals':
      return !isNaN(t) && t === toTimestamp(filterValue);
    case 'notEquals':
      return isNaN(t) || t !== toTimestamp(filterValue);
    case 'gt':
      return t > toTimestamp(filterValue);
    case 'gte':
      return t >= toTimestamp(filterValue);
    case 'lt':
      return t < toTimestamp(filterValue);
    case 'lte':
      return t <= toTimestamp(filterValue);
    default:
      return undefined;
  }
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  return NaN;
}

// One shared collator: `Intl.Collator#compare` is equivalent to `localeCompare`
// with the same options, but avoids re-resolving locale data on every call —
// the difference is large when sorting tens of thousands of rows.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Type-aware ascending comparator; multiply by -1 for descending.
 *
 * Handles strings (locale-aware, numeric-aware, case-insensitive), numbers
 * (incl. NaN guard), dates (timestamp diff), booleans (false < true), and
 * null/undefined — which always sink to the end regardless of direction.
 */
export function compareValues(valueA: unknown, valueB: unknown, direction: 'asc' | 'desc' = 'asc'): number {
  if (valueA == null && valueB == null) return 0;
  if (valueA == null) return 1;
  if (valueB == null) return -1;

  const multiplier = direction === 'asc' ? 1 : -1;
  const typeA = typeof valueA;

  if (typeA !== typeof valueB) {
    return collator.compare(String(valueA), String(valueB)) * multiplier;
  }
  if (typeA === 'string') {
    return collator.compare(valueA as string, valueB as string) * multiplier;
  }
  if (typeA === 'number') {
    const diff = (valueA as number) - (valueB as number);
    if (isNaN(diff)) return 0;
    return diff * multiplier;
  }
  if (typeA === 'boolean') {
    return ((valueA as boolean) === (valueB as boolean) ? 0 : (valueA as boolean) ? 1 : -1) * multiplier;
  }
  if (valueA instanceof Date && valueB instanceof Date) {
    return (valueA.getTime() - valueB.getTime()) * multiplier;
  }
  return collator.compare(String(valueA), String(valueB)) * multiplier;
}
