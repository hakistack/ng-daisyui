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
 * Marker key on aggregate-builder output. The table component reads it to
 * detect "this footer is a known aggregate I can route through the WASM
 * engine," falling back to invoking the function directly otherwise.
 *
 * Hidden via a `Symbol` so user-supplied custom footer functions never
 * collide with it.
 */
const AGGREGATE_SPEC_KEY = Symbol('hk.aggregate.spec');

/** Spec attached to the function returned by [`aggregate`]. */
export interface AggregateSpec<T> {
  readonly field: Extract<keyof T, string>;
  readonly fn: AggregateFunction;
}

/**
 * Builder helper for ColumnDefinition.footer — returns a function
 * that computes an aggregate over the displayed data.
 *
 * The returned function is tagged with `[AGGREGATE_SPEC_KEY]` so the table
 * component can route the work through the WASM engine when available,
 * skipping the per-render JS reduce. Calling the function directly still
 * works (engine-unaware code keeps the original behavior).
 */
export function aggregate<T>(field: Extract<keyof T, string>, fn: AggregateFunction) {
  const evaluator = (data: readonly T[]) => computeAggregate(data, field, fn);
  // Attach the spec — readonly, non-enumerable to keep it out of debug logs.
  Object.defineProperty(evaluator, AGGREGATE_SPEC_KEY, {
    value: { field, fn } satisfies AggregateSpec<T>,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return evaluator;
}

/**
 * Read the `AggregateSpec` attached by [`aggregate`], or `null` for
 * user-supplied custom footer functions.
 */
export function getAggregateSpec<T>(fn: unknown): AggregateSpec<T> | null {
  if (typeof fn !== 'function') return null;
  const record = fn as unknown as Record<symbol, AggregateSpec<T>>;
  return record[AGGREGATE_SPEC_KEY] ?? null;
}
