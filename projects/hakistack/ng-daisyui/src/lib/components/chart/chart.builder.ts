import { computed, inject, Signal, signal } from '@angular/core';
import type { ChartConfig, ChartKind, EChartsOption } from './chart.types';
import type { ThemeTokens } from './themes/theme-bridge';
import { DaisyUIThemeService } from './themes/daisyui-theme.service';
import { buildLineOption } from './kinds/line';
import { buildColumnOption } from './kinds/column';
import { buildBarOption } from './kinds/bar';
import { buildAreaOption } from './kinds/area';
import { buildPieOption } from './kinds/pie';

type AnyConfig = ChartConfig<Record<string, unknown>>;
type KindBuilder = (config: AnyConfig, tokens: ThemeTokens) => EChartsOption;

const BUILDERS: Record<ChartKind, KindBuilder> = {
  line: (c, t) => buildLineOption(c as Extract<AnyConfig, { kind: 'line' }>, t),
  column: (c, t) => buildColumnOption(c as Extract<AnyConfig, { kind: 'column' }>, t),
  bar: (c, t) => buildBarOption(c as Extract<AnyConfig, { kind: 'bar' }>, t),
  area: (c, t) => buildAreaOption(c as Extract<AnyConfig, { kind: 'area' }>, t),
  pie: (c, t) => buildPieOption(c as Extract<AnyConfig, { kind: 'pie' }>, t),
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
  // Inject here so the computed below can read live theme tokens — radius
  // values flow into kind builders and update on theme switch.
  const theme = inject(DaisyUIThemeService);
  const cfg = signal<ChartConfig<T>>(initial);

  const option = computed<EChartsOption>(() => {
    const current = cfg() as AnyConfig;
    const tokens = theme.tokens();
    const base = BUILDERS[current.kind](current, tokens);
    return current.optionsOverride ? current.optionsOverride(base) : base;
  });

  return {
    config: cfg.asReadonly(),
    option,
    setConfig: (next) => cfg.set(next),
    patchConfig: (partial) => cfg.update((prev) => ({ ...prev, ...partial }) as ChartConfig<T>),
  };
}
