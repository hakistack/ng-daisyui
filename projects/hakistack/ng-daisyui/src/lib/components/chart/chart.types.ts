/**
 * Public chart types. See charts.md §5.4 (data contract) + §5.5 (public API).
 *
 * Phase 0 scope: `line` and `column` kinds only. Other kinds come online in
 * Phase 1 / 1.5 / 2 as per the rollout plan.
 */

export type ChartKind = 'line' | 'column';

export type AggregateFn = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';

export type NullPolicy = 'gap' | 'connect' | 'zero' | 'omit';

export type Renderer = 'svg' | 'canvas' | 'auto';

/** Opaque ECharts option — consumers never author this directly. */
export type EChartsOption = Record<string, unknown>;

export interface TooltipConfig<T> {
  readonly shared?: boolean;
  readonly valueFormatter?: (value: number, row: T) => string;
}

export interface LegendConfig {
  /** `'none'` hides the legend; default is `'bottom'` when series count > 1. */
  readonly position?: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

interface ChartConfigBase<T> {
  readonly data: readonly T[];
  readonly title?: string | { text: string; subtext?: string };
  readonly legend?: boolean | LegendConfig;
  readonly tooltip?: boolean | TooltipConfig<T>;
  readonly renderer?: Renderer;
  readonly nullPolicy?: NullPolicy;
  readonly aggregate?: AggregateFn;
  /** Escape hatch per §4.5 #2. Use sparingly — options aren't stable across minors. */
  readonly optionsOverride?: (base: EChartsOption) => EChartsOption;
}

export interface LineConfig<T> extends ChartConfigBase<T> {
  readonly kind: 'line';
  readonly x: keyof T;
  readonly y: keyof T;
  readonly series?: keyof T;
  readonly smooth?: boolean;
  readonly area?: boolean;
}

export interface ColumnConfig<T> extends ChartConfigBase<T> {
  readonly kind: 'column';
  readonly x: keyof T;
  readonly y: keyof T;
  readonly series?: keyof T;
  readonly stacked?: boolean;
}

/**
 * Discriminated union over `kind`. The TS compiler rejects combinations like
 * `{ kind: 'line', stacked: true }` — `stacked` is only valid for `'column'`.
 */
export type ChartConfig<T> = LineConfig<T> | ColumnConfig<T>;
