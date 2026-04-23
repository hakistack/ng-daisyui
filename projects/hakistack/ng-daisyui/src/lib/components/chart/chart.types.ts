/**
 * Public chart types. See charts.md §5.4 (data contract) + §5.5 (public API).
 *
 * Phase 0 scope: `line` and `column` kinds only. Other kinds come online in
 * Phase 1 / 1.5 / 2 as per the rollout plan.
 */

export type ChartKind = 'line' | 'column' | 'bar' | 'area' | 'pie';

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

/**
 * Named palette. Pick via `colors` on a chart config:
 *   - `'qualitative'` (default) — primary / secondary / accent / neutral +
 *     hue-rotated extras. Safe for unlabeled series; carries no semantic
 *     meaning for a given slot.
 *   - `'semantic'` — success / error / warning / info first. Use only when
 *     slot order genuinely maps to meaning (e.g. P&L green / red).
 *   - Explicit `string[]` — override entirely with custom CSS colors.
 */
export type Palette = 'qualitative' | 'semantic' | readonly string[];

interface ChartConfigBase<T> {
  readonly data: readonly T[];
  readonly title?: string | { text: string; subtext?: string };
  readonly legend?: boolean | LegendConfig;
  readonly tooltip?: boolean | TooltipConfig<T>;
  readonly renderer?: Renderer;
  readonly nullPolicy?: NullPolicy;
  readonly aggregate?: AggregateFn;
  readonly colors?: Palette;
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

export interface BarConfig<T> extends ChartConfigBase<T> {
  readonly kind: 'bar';
  readonly x: keyof T;
  readonly y: keyof T;
  readonly series?: keyof T;
  readonly stacked?: boolean;
}

export interface AreaConfig<T> extends ChartConfigBase<T> {
  readonly kind: 'area';
  readonly x: keyof T;
  readonly y: keyof T;
  readonly series?: keyof T;
  readonly smooth?: boolean;
  readonly stacked?: boolean;
}

export interface PieConfig<T> extends ChartConfigBase<T> {
  readonly kind: 'pie';
  readonly category: keyof T;
  readonly value: keyof T;
  readonly donut?: boolean;
  readonly showLabels?: boolean;
}

/**
 * Discriminated union over `kind`. The TS compiler rejects combinations like
 * `{ kind: 'line', stacked: true }` — `stacked` is only valid for `'column'`,
 * `'bar'`, and `'area'`. `{ kind: 'pie', x: 'foo' }` is likewise rejected —
 * pies use `category`/`value`, not `x`/`y`/`series`.
 */
export type ChartConfig<T> = LineConfig<T> | ColumnConfig<T> | BarConfig<T> | AreaConfig<T> | PieConfig<T>;
