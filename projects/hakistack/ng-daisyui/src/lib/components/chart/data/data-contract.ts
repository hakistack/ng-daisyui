import type { AggregateFn } from '../chart.types';

/**
 * Long-format data contract (charts.md §5.4.1). All `kinds/*.ts` builders
 * normalize their input through `aggregateLong` before producing ECharts
 * options.
 */

const SENTINEL_SINGLE_SERIES = '__hk_value__';

const REDUCERS: Record<AggregateFn, (values: readonly number[]) => number> = {
  sum: (values) => values.reduce((acc, v) => acc + v, 0),
  avg: (values) => (values.length ? values.reduce((acc, v) => acc + v, 0) / values.length : 0),
  min: (values) => (values.length ? Math.min(...values) : 0),
  max: (values) => (values.length ? Math.max(...values) : 0),
  count: (values) => values.length,
  first: (values) => values[0] ?? 0,
  last: (values) => values[values.length - 1] ?? 0,
};

export interface AggregatedLong {
  /** Ordered, deduped x-axis categories as strings. */
  readonly xValues: readonly string[];
  /** Ordered series names. Single-series charts hold the internal sentinel. */
  readonly seriesNames: readonly string[];
  /** `matrix[seriesName][xIndex]` → aggregated value or `null` when absent. */
  readonly matrix: Readonly<Record<string, readonly (number | null)[]>>;
  /** True when the caller didn't pass a `series` key — one synthetic series. */
  readonly singleSeries: boolean;
}

/**
 * Groups long rows by (x, series), aggregates duplicates via `REDUCERS[aggregate]`,
 * and returns the matrix ECharts needs. Preserves first-seen order of both
 * axes — callers who need sorted output should sort the source data.
 */
export function aggregateLong<T>(
  data: readonly T[],
  xKey: keyof T,
  yKey: keyof T,
  seriesKey: keyof T | undefined,
  aggregate: AggregateFn = 'sum',
): AggregatedLong {
  const xOrder: string[] = [];
  const xSeen = new Set<string>();
  const seriesOrder: string[] = [];
  const seriesSeen = new Set<string>();
  const buckets = new Map<string, Map<string, number[]>>();

  for (const row of data) {
    const record = row as Record<string, unknown>;
    const x = String(record[xKey as string]);
    const s = seriesKey ? String(record[seriesKey as string]) : SENTINEL_SINGLE_SERIES;
    const rawY = record[yKey as string];
    const y = typeof rawY === 'number' ? rawY : Number(rawY);

    if (!xSeen.has(x)) {
      xSeen.add(x);
      xOrder.push(x);
    }
    if (!seriesSeen.has(s)) {
      seriesSeen.add(s);
      seriesOrder.push(s);
    }

    let bySeries = buckets.get(s);
    if (!bySeries) {
      bySeries = new Map();
      buckets.set(s, bySeries);
    }
    let vals = bySeries.get(x);
    if (!vals) {
      vals = [];
      bySeries.set(x, vals);
    }
    if (!Number.isNaN(y)) vals.push(y);
  }

  const reducer = REDUCERS[aggregate];
  const matrix: Record<string, (number | null)[]> = {};
  for (const s of seriesOrder) {
    matrix[s] = xOrder.map((x) => {
      const vals = buckets.get(s)?.get(x);
      return vals && vals.length > 0 ? reducer(vals) : null;
    });
  }

  return {
    xValues: xOrder,
    seriesNames: seriesOrder,
    matrix,
    singleSeries: !seriesKey,
  };
}

/** Pivot wide-format rows into long format. §5.4.1 helper. */
export function pivotWide<T extends Record<string, unknown>>(
  wide: readonly T[],
  opts: { readonly idVars: readonly string[]; readonly valueVars: readonly string[] },
): Array<Record<string, unknown>> {
  const out: Record<string, unknown>[] = [];
  for (const row of wide) {
    for (const valueVar of opts.valueVars) {
      const long: Record<string, unknown> = { series: valueVar, value: row[valueVar] };
      for (const idVar of opts.idVars) long[idVar] = row[idVar];
      out.push(long);
    }
  }
  return out;
}

export { SENTINEL_SINGLE_SERIES };
