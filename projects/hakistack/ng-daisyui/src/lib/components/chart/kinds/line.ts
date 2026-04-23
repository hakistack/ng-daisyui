import type { EChartsOption, LineConfig, NullPolicy } from '../chart.types';
import { aggregateLong, SENTINEL_SINGLE_SERIES } from '../data/data-contract';

const LINE_DEFAULT_NULL_POLICY: NullPolicy = 'gap';

function applyNullPolicy(values: readonly (number | null)[], policy: NullPolicy): (number | null)[] {
  switch (policy) {
    case 'zero':
      return values.map((v) => (v === null ? 0 : v));
    case 'connect':
      // Preserve nulls but tell echarts to connect across them via series.connectNulls
      return values.slice();
    case 'gap':
    case 'omit':
    default:
      return values.slice();
  }
}

export function buildLineOption<T>(config: LineConfig<T>): EChartsOption {
  const { data, x, y, series: seriesKey, aggregate = 'sum', nullPolicy = LINE_DEFAULT_NULL_POLICY, smooth = false, area = false } = config;

  const agg = aggregateLong(data, x, y, seriesKey, aggregate);
  const connectNulls = nullPolicy === 'connect';

  const series = agg.seriesNames.map((name) => ({
    name: agg.singleSeries ? undefined : name,
    type: 'line' as const,
    smooth,
    areaStyle: area ? {} : undefined,
    symbolSize: 8,
    connectNulls,
    // Pin line + symbol emphasis to palette colors so hover doesn't render
    // them with an unset fill. Matches the column kind's treatment.
    emphasis: { lineStyle: { color: 'inherit' }, itemStyle: { color: 'inherit' } },
    data: applyNullPolicy(agg.matrix[name], nullPolicy),
  }));

  return {
    xAxis: { type: 'category', data: agg.xValues, boundaryGap: false },
    yAxis: { type: 'value' },
    series,
    legend: agg.singleSeries ? undefined : { data: agg.seriesNames, top: 'bottom' },
  };
}

export { SENTINEL_SINGLE_SERIES };
