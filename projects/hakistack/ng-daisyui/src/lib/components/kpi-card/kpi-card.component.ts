import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartComponent } from '../chart/chart.component';
import { DaisyUIThemeService } from '../chart/themes/daisyui-theme.service';
import type { EChartsOption } from '../chart/chart.types';
import type { KpiDelta, KpiValueFormatter } from './kpi-card.types';

/**
 * KPI card — big number, period-over-period delta, and an optional trend
 * sparkline that bleeds flush to the card's bottom edge for a modern
 * dashboard look. The sparkline uses `<hk-chart decorative>` so it's hidden
 * from screen readers (the number + delta carry the data) and skips the
 * chart's keyboard-nav attachment.
 */
@Component({
  selector: 'hk-kpi-card',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .hk-kpi-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden; /* clip the sparkline to the card's rounded corners */
    }
    .hk-kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem 1rem 0.5rem;
    }
    .hk-kpi-sparkline {
      flex: 1 1 auto;
      min-height: 64px;
      margin-top: auto; /* push to the bottom when content is short */
    }
    .hk-kpi-sparkline hk-chart {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  template: `
    <div class="hk-kpi-card card card-border border-base-300 bg-base-200 shadow-sm">
      <div class="hk-kpi-content">
        <div class="flex items-center justify-between gap-2 text-sm text-base-content/60">
          <span class="truncate">{{ label() }}</span>
          @if (delta(); as d) {
            <span class="badge badge-soft badge-sm" [class]="deltaBadgeClass(d)">
              <span aria-hidden="true">{{ deltaArrow(d) }}</span>
              {{ formatDelta(d.value) }}
            </span>
          }
        </div>

        <div class="text-3xl font-bold tabular-nums leading-tight">{{ formattedValue() }}</div>

        @if (delta()?.label) {
          <span class="text-xs text-base-content/50">{{ delta()!.label }}</span>
        }
      </div>

      @if (sparklineOption(); as opt) {
        <div class="hk-kpi-sparkline">
          <hk-chart [option]="opt" [decorative]="true" />
        </div>
      }
    </div>
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly format = input<KpiValueFormatter | undefined>(undefined);
  readonly delta = input<KpiDelta | null>(null);
  readonly trend = input<readonly number[] | null>(null);

  private readonly theme = inject(DaisyUIThemeService);

  readonly formattedValue = computed<string>(() => {
    const v = this.value();
    if (typeof v === 'string') return v;
    const fmt = this.format();
    return fmt ? fmt(v) : v.toLocaleString();
  });

  readonly sparklineOption = computed<EChartsOption | null>(() => {
    const trend = this.trend();
    if (!trend || trend.length < 2) return null;

    const color = this.sparklineColor();

    return {
      // Zero margins + containLabel:false → sparkline fills the entire slot
      // edge-to-edge. No axes, no legend, no tooltip — pure decoration.
      grid: { left: 0, right: 0, top: 4, bottom: 0, containLabel: false },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: trend.map((_, i) => i) },
      yAxis: { type: 'value', show: false, scale: true },
      tooltip: { show: false },
      legend: { show: false },
      series: [
        {
          type: 'line',
          data: trend,
          smooth: true,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          areaStyle: {
            opacity: 0.3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color },
                { offset: 1, color: 'transparent' },
              ],
            },
          },
          animationDuration: 500,
          animationEasing: 'cubicOut',
        },
      ],
    };
  });

  formatDelta(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  deltaArrow(delta: KpiDelta): string {
    if (delta.value > 0) return '↑';
    if (delta.value < 0) return '↓';
    return '→';
  }

  deltaBadgeClass(delta: KpiDelta): string {
    switch (this.resolveSentiment(delta)) {
      case 'positive':
        return 'badge-success';
      case 'negative':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  private resolveSentiment(delta: KpiDelta | null): 'positive' | 'negative' | 'neutral' {
    if (!delta) return 'neutral';
    if (delta.sentiment) return delta.sentiment;
    if (delta.value > 0) return 'positive';
    if (delta.value < 0) return 'negative';
    return 'neutral';
  }

  private sparklineColor(): string {
    const c = this.theme.tokens().colors;
    switch (this.resolveSentiment(this.delta())) {
      case 'positive':
        return c.success;
      case 'negative':
        return c.error;
      default:
        return c.primary;
    }
  }
}
