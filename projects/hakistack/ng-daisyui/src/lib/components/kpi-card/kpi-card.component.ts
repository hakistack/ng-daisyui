import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HK_THEME } from '../../theme/theme.config';
import type { KpiDelta, KpiValueFormatter } from './kpi-card.types';

/**
 * KPI card — big number with a period-over-period delta badge. Compact,
 * dependency-light component intended for dashboard summaries.
 */
@Component({
  selector: 'hk-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .hk-kpi-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .hk-kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem;
    }
  `,
  template: `
    <div [class]="containerClass()">
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
    </div>
  `,
})
export class KpiCardComponent {
  private readonly theme = inject(HK_THEME);

  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly format = input<KpiValueFormatter | undefined>(undefined);
  readonly delta = input<KpiDelta | null>(null);

  /** Card container — theme-bridged so daisyUI v4 / v5 class names resolve correctly. */
  readonly containerClass = computed(() => `hk-kpi-card card ${this.theme.classes.cardBorder} bg-base-200 shadow-sm`);

  readonly formattedValue = computed<string>(() => {
    const v = this.value();
    if (typeof v === 'string') return v;
    const fmt = this.format();
    return fmt ? fmt(v) : v.toLocaleString();
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
}
