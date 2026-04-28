/** Delta (period-over-period change) displayed as a colored badge on a KPI card. */
export interface KpiDelta {
  /** Percent change. Positive / negative determines default color unless `sentiment` is set. */
  readonly value: number;
  /**
   * Visual sentiment (drives badge color). Defaults to `'positive'` when `value > 0`,
   * `'negative'` when `value < 0`, `'neutral'` when `value === 0`.
   *
   * Override explicitly when the metric's "good" direction is inverse — e.g. cost
   * reduction is positive sentiment even though the value is negative.
   */
  readonly sentiment?: 'positive' | 'negative' | 'neutral';
  /** Contextual subtitle, e.g. `"vs last month"` or `"YoY"`. */
  readonly label?: string;
}

export type KpiValueFormatter = (value: number) => string;
