import type { AggregateFn, EChartsOption, PieConfig } from '../chart.types';
import type { ThemeTokens } from '../themes/theme-bridge';
import { withAlpha } from '../themes/theme-bridge';

/**
 * Pie / donut. Different data shape than axis-based charts — one categorical
 * dimension + one value dimension, no `series` splitter. Duplicate categories
 * are aggregated.
 */

const REDUCERS: Record<AggregateFn, (values: readonly number[]) => number> = {
  sum: (values) => values.reduce((acc, v) => acc + v, 0),
  avg: (values) => (values.length ? values.reduce((acc, v) => acc + v, 0) / values.length : 0),
  min: (values) => (values.length ? Math.min(...values) : 0),
  max: (values) => (values.length ? Math.max(...values) : 0),
  count: (values) => values.length,
  first: (values) => values[0] ?? 0,
  last: (values) => values[values.length - 1] ?? 0,
};

export function buildPieOption<T>(config: PieConfig<T>, tokens: ThemeTokens): EChartsOption {
  const { data, category, value, aggregate = 'sum', donut = false, showLabels = true } = config;

  const categoryOrder: string[] = [];
  const categorySeen = new Set<string>();
  const buckets = new Map<string, number[]>();

  for (const row of data) {
    const record = row as Record<string, unknown>;
    const c = String(record[category as string]);
    const rawV = record[value as string];
    const v = typeof rawV === 'number' ? rawV : Number(rawV);

    if (!categorySeen.has(c)) {
      categorySeen.add(c);
      categoryOrder.push(c);
    }
    let vals = buckets.get(c);
    if (!vals) {
      vals = [];
      buckets.set(c, vals);
    }
    if (!Number.isNaN(v)) vals.push(v);
  }

  const reduce = REDUCERS[aggregate];
  const pieData = categoryOrder.map((name) => ({
    name,
    value: reduce(buckets.get(name) ?? []),
  }));

  const radius: string | [string, string] = donut ? ['45%', '72%'] : '72%';
  const textColor = tokens.colors.baseContent;
  const mutedText = withAlpha(textColor, 0.7);

  return {
    series: [
      {
        type: 'pie',
        radius,
        center: ['50%', '52%'],
        data: pieData,
        avoidLabelOverlap: true,
        padAngle: donut ? 2 : 0,
        itemStyle: {
          // Donut slice corner rounding from `--radius-selector` — matches
          // DaisyUI badges / small decorative elements.
          borderRadius: donut ? Math.min(tokens.radius.selector, 6) : 0,
          borderWidth: 2,
          borderColor: tokens.colors.base100,
        },
        label: {
          show: showLabels,
          formatter: '{b}: {d}%',
          color: mutedText,
          textBorderColor: 'transparent',
          textBorderWidth: 0,
          textShadowBlur: 0,
        },
        labelLine: {
          show: showLabels,
          smooth: true,
          lineStyle: { color: tokens.colors.base300 },
        },
        emphasis: {
          focus: 'none',
          scaleSize: 6,
          itemStyle: { color: 'inherit', borderColor: tokens.colors.base100 },
          label: { color: textColor, fontWeight: 600 },
        },
      },
    ],
    legend: categoryOrder.length > 1 ? { top: 'bottom', data: categoryOrder } : undefined,
  };
}
