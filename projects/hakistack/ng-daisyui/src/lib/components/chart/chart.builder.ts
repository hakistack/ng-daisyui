import { computed, Signal, signal } from '@angular/core';
import type { ChartConfig, ChartKind, EChartsOption } from './chart.types';
import { buildLineOption } from './kinds/line';
import { buildColumnOption } from './kinds/column';

type AnyConfig = ChartConfig<Record<string, unknown>>;
type KindBuilder = (config: AnyConfig) => EChartsOption;

const BUILDERS: Record<ChartKind, KindBuilder> = {
  line: (c) => buildLineOption(c as Extract<AnyConfig, { kind: 'line' }>),
  column: (c) => buildColumnOption(c as Extract<AnyConfig, { kind: 'column' }>),
};

/** Controller returned by `createChart()` — mirrors the `FormController` shape. */
export interface ChartController<T> {
  /** Read-only signal holding the current typed config. */
  readonly config: Signal<ChartConfig<T>>;
  /** Read-only signal holding the compiled ECharts option (fed into `<hk-chart>`). */
  readonly option: Signal<EChartsOption>;
  /** Replace the entire config; discriminated-union typing enforced at call site. */
  setConfig(next: ChartConfig<T>): void;
  /** Shallow merge for same-kind updates. Changing `kind` requires `setConfig`. */
  patchConfig(partial: Partial<Omit<ChartConfig<T>, 'kind'>>): void;
}

/**
 * Declarative chart builder. Type system blocks nonsensical combinations at
 * compile time — e.g. `{ kind: 'line', stacked: true }` is a type error because
 * `stacked` only exists on `ColumnConfig`.
 */
export function createChart<T>(initial: ChartConfig<T>): ChartController<T> {
  const cfg = signal<ChartConfig<T>>(initial);

  const option = computed<EChartsOption>(() => {
    const current = cfg() as AnyConfig;
    const base = BUILDERS[current.kind](current);
    return current.optionsOverride ? current.optionsOverride(base) : base;
  });

  return {
    config: cfg.asReadonly(),
    option,
    setConfig: (next) => cfg.set(next),
    patchConfig: (partial) => cfg.update((prev) => ({ ...prev, ...partial }) as ChartConfig<T>),
  };
}
