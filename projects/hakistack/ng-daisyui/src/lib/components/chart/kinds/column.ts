import type { ColumnConfig, EChartsOption, NullPolicy } from '../chart.types';
import { aggregateLong } from '../data/data-contract';

const COLUMN_DEFAULT_NULL_POLICY: NullPolicy = 'omit';

function applyNullPolicy(values: readonly (number | null)[], policy: NullPolicy): (number | null)[] {
  switch (policy) {
    case 'zero':
      return values.map((v) => (v === null ? 0 : v));
    case 'omit':
    case 'gap':
    case 'connect':
    default:
      // ECharts renders `null` in a bar series as a gap — matches `omit`.
      return values.slice();
  }
}

export function buildColumnOption<T>(config: ColumnConfig<T>): EChartsOption {
  const { data, x, y, series: seriesKey, aggregate = 'sum', nullPolicy = COLUMN_DEFAULT_NULL_POLICY, stacked = false } = config;

  const agg = aggregateLong(data, x, y, seriesKey, aggregate);

  const series = agg.seriesNames.map((name) => ({
    name: agg.singleSeries ? undefined : name,
    type: 'bar' as const,
    stack: stacked ? 'total' : undefined,
    itemStyle: { borderRadius: [4, 4, 0, 0] },
    // `color: 'inherit'` pins the emphasis fill to the palette color so the
    // hovered bar doesn't go transparent. ECharts v6 default emphasis leaks
    // `itemStyle.color = undefined` otherwise.
    emphasis: { itemStyle: { color: 'inherit' } },
    data: applyNullPolicy(agg.matrix[name], nullPolicy),
  }));

  return {
    xAxis: { type: 'category', data: agg.xValues },
    yAxis: { type: 'value' },
    series,
    legend: agg.singleSeries ? undefined : { data: agg.seriesNames, top: 'bottom' },
  };
}
