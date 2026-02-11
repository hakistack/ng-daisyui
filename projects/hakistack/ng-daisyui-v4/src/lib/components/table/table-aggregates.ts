export type AggregateFunction =
  | 'sum' | 'avg' | 'count' | 'min' | 'max'
  | 'trueCount' | 'falseCount'
  | 'median' | 'distinctCount';

/** Labels for aggregate functions */
export const AGGREGATE_LABELS: Record<AggregateFunction, string> = {
  sum: 'Sum',
  avg: 'Avg',
  count: 'Count',
  min: 'Min',
  max: 'Max',
  trueCount: 'True Count',
  falseCount: 'False Count',
  median: 'Median',
  distinctCount: 'Distinct',
};

/**
 * Computes an aggregate value over a data array for a given field.
 */
export function computeAggregate<T>(
  data: readonly T[],
  field: Extract<keyof T, string>,
  fn: AggregateFunction,
): number {
  if (data.length === 0) return 0;

  const rawValues = data.map(row => (row as Record<string, unknown>)[field]);

  switch (fn) {
    case 'count':
      return data.length;
    case 'trueCount':
      return rawValues.filter(v => Boolean(v) === true).length;
    case 'falseCount':
      return rawValues.filter(v => Boolean(v) === false).length;
    case 'distinctCount':
      return new Set(rawValues).size;
    default:
      break;
  }

  const values = rawValues.map(v => Number(v)).filter(v => !isNaN(v));
  if (values.length === 0) return 0;

  switch (fn) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    default:
      return 0;
  }
}

/**
 * Builder helper for ColumnDefinition.footer — returns a function
 * that computes an aggregate over the displayed data.
 * For advanced use when you need a fully custom footer function.
 */
export function aggregate<T>(field: Extract<keyof T, string>, fn: AggregateFunction) {
  return (data: readonly T[]) => computeAggregate(data, field, fn);
}
