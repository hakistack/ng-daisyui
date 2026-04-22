export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'trueCount' | 'falseCount' | 'median' | 'distinctCount';

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
export function computeAggregate<T>(data: readonly T[], field: Extract<keyof T, string>, fn: AggregateFunction): number {
  if (data.length === 0) return 0;

  if (fn === 'count') return data.length;

  if (fn === 'trueCount' || fn === 'falseCount' || fn === 'distinctCount') {
    return aggregateRaw(data, field, fn);
  }

  return aggregateNumeric(data, field, fn);
}

function aggregateRaw<T>(data: readonly T[], field: Extract<keyof T, string>, fn: 'trueCount' | 'falseCount' | 'distinctCount'): number {
  if (fn === 'distinctCount') {
    const seen = new Set<unknown>();
    for (const row of data) seen.add((row as Record<string, unknown>)[field]);
    return seen.size;
  }

  let count = 0;
  const truthy = fn === 'trueCount';
  for (const row of data) {
    const v = (row as Record<string, unknown>)[field];
    if (truthy ? !!v : !v) count++;
  }
  return count;
}

function aggregateNumeric<T>(data: readonly T[], field: Extract<keyof T, string>, fn: 'sum' | 'avg' | 'min' | 'max' | 'median'): number {
  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  const needsValues = fn === 'median';
  const values: number[] = needsValues ? [] : (undefined as unknown as number[]);

  for (const row of data) {
    const n = Number((row as Record<string, unknown>)[field]);
    if (Number.isNaN(n)) continue;
    sum += n;
    count++;
    if (n < min) min = n;
    if (n > max) max = n;
    if (needsValues) values.push(n);
  }

  if (count === 0) return 0;

  switch (fn) {
    case 'sum':
      return sum;
    case 'avg':
      return sum / count;
    case 'min':
      return min;
    case 'max':
      return max;
    case 'median': {
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    }
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
