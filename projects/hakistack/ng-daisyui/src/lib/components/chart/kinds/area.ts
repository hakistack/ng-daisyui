import type { AreaConfig, EChartsOption, NullPolicy } from '../chart.types';
import type { ThemeTokens } from '../themes/theme-bridge';
import { aggregateLong } from '../data/data-contract';

const AREA_DEFAULT_NULL_POLICY: NullPolicy = 'zero';

function applyNullPolicy(values: readonly (number | null)[], policy: NullPolicy): (number | null)[] {
  switch (policy) {
    case 'zero':
      return values.map((v) => (v === null ? 0 : v));
    case 'connect':
    case 'gap':
    case 'omit':
    default:
      return values.slice();
  }
}

export function buildAreaOption<T>(config: AreaConfig<T>, _tokens: ThemeTokens): EChartsOption {
  const {
    data,
    x,
    y,
    series: seriesKey,
    aggregate = 'sum',
    nullPolicy = AREA_DEFAULT_NULL_POLICY,
    smooth = false,
    stacked = false,
  } = config;

  const agg = aggregateLong(data, x, y, seriesKey, aggregate);
  const connectNulls = nullPolicy === 'connect';

  const series = agg.seriesNames.map((name) => ({
    name: agg.singleSeries ? undefined : name,
    type: 'line' as const,
    smooth,
    areaStyle: { opacity: stacked ? 0.85 : 0.35 },
    symbolSize: 8,
    stack: stacked ? 'total' : undefined,
    connectNulls,
    // Same reasoning as line.ts — ECharts v6 line-series emphasis is buggy
    // with palette colors. Disable entirely; tooltips still work.
    emphasis: { disabled: true },
    data: applyNullPolicy(agg.matrix[name], nullPolicy),
  }));

  return {
    xAxis: { type: 'category', data: agg.xValues, boundaryGap: false },
    yAxis: { type: 'value' },
    series,
    legend: agg.singleSeries ? undefined : { data: agg.seriesNames, top: 'bottom' },
  };
}
