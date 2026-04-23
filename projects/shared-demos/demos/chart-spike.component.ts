import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ChartComponent, createChart } from '@hakistack/ng-daisyui';

interface SalesRow {
  month: string;
  series: 'Revenue' | 'Cost';
  value: number;
}

const INITIAL_DATA: SalesRow[] = [
  { month: 'Jan', series: 'Revenue', value: 12000 },
  { month: 'Feb', series: 'Revenue', value: 13200 },
  { month: 'Mar', series: 'Revenue', value: 14500 },
  { month: 'Apr', series: 'Revenue', value: 13800 },
  { month: 'May', series: 'Revenue', value: 15200 },
  { month: 'Jun', series: 'Revenue', value: 16500 },
  { month: 'Jan', series: 'Cost', value: 8000 },
  { month: 'Feb', series: 'Cost', value: 8500 },
  { month: 'Mar', series: 'Cost', value: 9200 },
  { month: 'Apr', series: 'Cost', value: 8900 },
  { month: 'May', series: 'Cost', value: 9800 },
  { month: 'Jun', series: 'Cost', value: 10500 },
];

@Component({
  selector: 'app-chart-spike',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 p-6">
      <div class="flex items-baseline justify-between">
        <div>
          <h1 class="text-2xl font-bold">Chart — Phase 0 Spike</h1>
          <p class="text-sm text-base-content/70">
            Exercises <code>createChart()</code> with discriminated-union typing and the DaisyUI theme bridge.
          </p>
        </div>
        <div class="join">
          <button class="btn btn-sm join-item" [class.btn-primary]="activeKind() === 'line'" (click)="setKind('line')">Line</button>
          <button class="btn btn-sm join-item" [class.btn-primary]="activeKind() === 'column'" (click)="setKind('column')">Column</button>
          <button
            class="btn btn-sm join-item"
            [class.btn-primary]="stacked()"
            (click)="toggleStacked()"
            [disabled]="activeKind() !== 'column'"
          >
            Stacked
          </button>
        </div>
      </div>

      <div class="card card-border border-base-300 bg-base-200 shadow-lg">
        <div class="card-body">
          <div class="h-80">
            <hk-chart [option]="chart.option()" ariaLabel="Revenue and cost by month" />
          </div>
        </div>
      </div>

      <div class="alert alert-info text-sm">
        <span>
          Focus the chart (click or Tab) and use Arrow keys to traverse data points. Toggle Line/Column/Stacked to verify
          <code>createChart()</code> rebuilds the option signal and the chart re-renders without losing theme styling.
        </span>
      </div>
    </div>
  `,
})
export class ChartSpikeComponent {
  readonly activeKind = signal<'line' | 'column'>('line');
  readonly stacked = signal(false);

  readonly chart = createChart<SalesRow>({
    kind: 'line',
    data: INITIAL_DATA,
    x: 'month',
    y: 'value',
    series: 'series',
    smooth: true,
    title: { text: 'Revenue vs Cost', subtext: 'Built via createChart()' },
  });

  setKind(kind: 'line' | 'column'): void {
    this.activeKind.set(kind);
    if (kind === 'line') {
      this.chart.setConfig({
        kind: 'line',
        data: INITIAL_DATA,
        x: 'month',
        y: 'value',
        series: 'series',
        smooth: true,
        title: { text: 'Revenue vs Cost', subtext: 'Built via createChart()' },
      });
    } else {
      this.chart.setConfig({
        kind: 'column',
        data: INITIAL_DATA,
        x: 'month',
        y: 'value',
        series: 'series',
        stacked: this.stacked(),
        title: { text: 'Revenue vs Cost', subtext: 'Built via createChart()' },
      });
    }
  }

  toggleStacked(): void {
    this.stacked.update((v) => !v);
    if (this.activeKind() === 'column') this.setKind('column');
  }
}
