import type { BarConfig, EChartsOption, NullPolicy } from '../chart.types';
import type { ThemeTokens } from '../themes/theme-bridge';
import { aggregateLong } from '../data/data-contract';

const BAR_DEFAULT_NULL_POLICY: NullPolicy = 'omit';

function applyNullPolicy(values: readonly (number | null)[], policy: NullPolicy): (number | null)[] {
  switch (policy) {
    case 'zero':
      return values.map((v) => (v === null ? 0 : v));
    case 'omit':
    case 'gap':
    case 'connect':
    default:
      return values.slice();
  }
}

/**
 * Horizontal bar chart. Swaps the axis types vs. column — categories on Y,
 * values on X. ECharts uses the same `'bar'` series type for both.
 */
export function buildBarOption<T>(config: BarConfig<T>, tokens: ThemeTokens): EChartsOption {
  const { data, x, y, series: seriesKey, aggregate = 'sum', nullPolicy = BAR_DEFAULT_NULL_POLICY, stacked = false } = config;

  const agg = aggregateLong(data, x, y, seriesKey, aggregate);
  const r = Math.min(tokens.radius.field, 8);

  const series = agg.seriesNames.map((name) => ({
    name: agg.singleSeries ? undefined : name,
    type: 'bar' as const,
    stack: stacked ? 'total' : undefined,
    itemStyle: { borderRadius: [0, r, r, 0] },
    emphasis: {
      focus: 'none',
      itemStyle: { color: 'inherit', borderColor: 'inherit' },
    },
    data: applyNullPolicy(agg.matrix[name], nullPolicy),
  }));

  return {
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: agg.xValues },
    series,
    legend: agg.singleSeries ? undefined : { data: agg.seriesNames, top: 'bottom' },
  };
}
