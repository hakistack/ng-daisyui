import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { faker } from '@faker-js/faker';
import { ChartComponent, ChartConfig, createChart, KpiCardComponent, KpiDelta } from '@hakistack/ng-daisyui';

interface SalesRow {
  readonly label: string;
  readonly series: string;
  readonly value: number;
}

const WINDOW_SIZE = 8;
const TICK_MS = 1500;
const CATEGORY_COUNT = 3;

// Seed faker so the initial dashboard looks the same on every reload — users
// expect KPI values to be stable until live ticks start changing them.
faker.seed(2026_04_23);

/** Pick N unique product categories via faker, dedup'd. */
function pickCategories(n: number): string[] {
  const out: string[] = [];
  const tries = new Set<string>();
  while (out.length < n && tries.size < 50) {
    const name = faker.commerce.department();
    tries.add(name);
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

const CATEGORIES = pickCategories(CATEGORY_COUNT);
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** Generate initial 6-month × 3-category dataset with realistic drift. */
function seedInitialData(): SalesRow[] {
  const rows: SalesRow[] = [];
  // Give each category its own magnitude so the chart has visual variety.
  const baseByCategory: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    baseByCategory[cat] = faker.number.int({ min: 7000, max: 18000 });
  }

  for (const cat of CATEGORIES) {
    let running = baseByCategory[cat];
    for (const month of MONTH_LABELS) {
      // Random walk with mild upward drift — looks like realistic sales trend.
      const noise = faker.number.float({ min: -0.08, max: 0.12 });
      running = Math.max(2000, Math.round(running * (1 + noise)));
      rows.push({ label: month, series: cat, value: running });
    }
  }
  return rows;
}

const INITIAL = seedInitialData();

type Kind = 'line' | 'column' | 'bar' | 'area' | 'pie';

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const currencyFmt = (v: number) => `$${v.toLocaleString()}`;

interface KpiCardModel {
  readonly label: string;
  readonly total: number;
  readonly trend: readonly number[];
  readonly delta: KpiDelta;
}

@Component({
  selector: 'app-dashboard-demo',
  imports: [ChartComponent, KpiCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 p-6">
      <div class="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 class="text-2xl font-bold">Live Dashboard</h1>
          <p class="text-sm text-base-content/70">
            Streaming data simulation using <code>@faker-js/faker</code> for realistic categories + <code>createChart()</code> for the chart
            pipeline. Every {{ tickMs }}ms a new observation ticks in.
          </p>
        </div>
        <button class="btn btn-sm gap-2" [class.btn-error]="isLive()" (click)="toggleLive()">
          @if (isLive()) {
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full rounded-full bg-error-content opacity-75 animate-ping"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-error-content"></span>
            </span>
            Live · tick {{ tickCount() }}
          } @else {
            ▶ Start live
          }
        </button>
      </div>

      <!-- KPI row — dynamic from faker-generated categories -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (card of kpiCards(); track card.label) {
          <hk-kpi-card [label]="card.label" [value]="card.total" [format]="currencyFmt" [delta]="card.delta" [trend]="card.trend" />
        }
      </div>

      <!-- Kind switcher -->
      <div class="flex items-baseline justify-between flex-wrap gap-2 pt-2">
        <h2 class="text-lg font-semibold">Primary chart</h2>
        <div class="flex gap-2">
          <div class="join">
            @for (k of kinds; track k) {
              <button class="btn btn-sm join-item" [class.btn-primary]="activeKind() === k" (click)="setKind(k)">{{ k }}</button>
            }
          </div>
          <button class="btn btn-sm" [class.btn-primary]="stacked()" (click)="toggleStacked()" [disabled]="!supportsStacked(activeKind())">
            Stacked
          </button>
          <button class="btn btn-sm" [class.btn-primary]="smooth()" (click)="toggleSmooth()" [disabled]="!supportsSmooth(activeKind())">
            Smooth
          </button>
          <button class="btn btn-sm" [class.btn-primary]="donut()" (click)="toggleDonut()" [disabled]="activeKind() !== 'pie'">
            Donut
          </button>
        </div>
      </div>

      <div class="card card-border border-base-300 bg-base-200 shadow-lg">
        <div class="card-body">
          <div class="h-80">
            <hk-chart [option]="chart.option()" [ariaLabel]="chartAriaLabel" />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardDemoComponent {
  readonly tickMs = TICK_MS;
  readonly kinds: readonly Kind[] = ['line', 'column', 'bar', 'area', 'pie'];
  readonly activeKind = signal<Kind>('line');
  readonly stacked = signal(false);
  readonly smooth = signal(true);
  readonly donut = signal(false);
  readonly currencyFmt = currencyFmt;
  readonly chartAriaLabel = `Sales by category: ${CATEGORIES.join(', ')}`;

  readonly data = signal<SalesRow[]>(INITIAL);
  readonly isLive = signal(false);
  readonly tickCount = signal(0);

  readonly chart = createChart<SalesRow>(this.buildConfig(INITIAL, 'line'));

  private readonly destroyRef = inject(DestroyRef);
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private nextTickNumber = MONTH_LABELS.length + 1;

  // --- KPI row driven by faker categories ---------------------------------

  private readonly perSeries = computed(() => {
    const by: Record<string, SalesRow[]> = {};
    for (const cat of CATEGORIES) by[cat] = [];
    for (const row of this.data()) {
      by[row.series]?.push(row);
    }
    return by;
  });

  readonly kpiCards = computed<KpiCardModel[]>(() =>
    CATEGORIES.map((category) => {
      const rows = this.perSeries()[category] ?? [];
      const trend = rows.map((r) => r.value);
      return {
        label: category,
        total: sum(trend),
        trend,
        delta: this.deltaBetweenHalves(trend),
      };
    }),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopLive());
  }

  // --- Controls -----------------------------------------------------------

  toggleLive(): void {
    if (this.isLive()) this.stopLive();
    else this.startLive();
  }

  setKind(kind: Kind): void {
    this.activeKind.set(kind);
    this.chart.setConfig(this.buildConfig(this.data(), kind));
  }

  toggleStacked(): void {
    this.stacked.update((v) => !v);
    this.chart.setConfig(this.buildConfig(this.data(), this.activeKind()));
  }

  toggleSmooth(): void {
    this.smooth.update((v) => !v);
    this.chart.setConfig(this.buildConfig(this.data(), this.activeKind()));
  }

  toggleDonut(): void {
    this.donut.update((v) => !v);
    this.chart.setConfig(this.buildConfig(this.data(), this.activeKind()));
  }

  supportsStacked(kind: Kind): boolean {
    return kind === 'column' || kind === 'bar' || kind === 'area';
  }

  supportsSmooth(kind: Kind): boolean {
    return kind === 'line' || kind === 'area';
  }

  // --- Live tick loop -----------------------------------------------------

  private startLive(): void {
    if (this.intervalRef) return;
    this.isLive.set(true);
    this.intervalRef = setInterval(() => this.tick(), TICK_MS);
  }

  private stopLive(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    this.isLive.set(false);
  }

  private tick(): void {
    this.tickCount.update((n) => n + 1);
    const current = this.data();
    const label = `T+${this.nextTickNumber++}`;

    const lastByCategory = this.lastValuesPerCategory(current);
    const newRows: SalesRow[] = CATEGORIES.map((category) => {
      const prev = lastByCategory[category];
      // Use faker for the noise term too — keeps the whole data path faker-driven.
      const noise = faker.number.float({ min: -0.09, max: 0.12 });
      const next = Math.max(2000, Math.round(prev * (1 + noise)));
      return { label, series: category, value: next };
    });

    const allLabels: string[] = [];
    const labelSeen = new Set<string>();
    for (const r of [...current, ...newRows]) {
      if (!labelSeen.has(r.label)) {
        labelSeen.add(r.label);
        allLabels.push(r.label);
      }
    }
    const keepLabels = new Set(allLabels.slice(-WINDOW_SIZE));
    const nextData = [...current, ...newRows].filter((r) => keepLabels.has(r.label));

    this.data.set(nextData);
    this.chart.setConfig(this.buildConfig(nextData, this.activeKind()));
  }

  private lastValuesPerCategory(rows: readonly SalesRow[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const cat of CATEGORIES) out[cat] = 0;
    for (const row of rows) out[row.series] = row.value;
    return out;
  }

  // --- Delta (recent half vs prior half) ----------------------------------

  private deltaBetweenHalves(trend: readonly number[]): KpiDelta {
    if (trend.length < 2) return { value: 0, label: 'vs prior period' };
    const mid = Math.floor(trend.length / 2);
    const prior = sum(trend.slice(0, mid));
    const recent = sum(trend.slice(mid));
    const pct = prior ? ((recent - prior) / prior) * 100 : 0;
    return { value: Math.round(pct * 10) / 10, label: 'vs prior period' };
  }

  // --- Chart config builder ----------------------------------------------

  private buildConfig(data: readonly SalesRow[], kind: Kind): ChartConfig<SalesRow> {
    const title = { text: `Sales by category (${CATEGORIES.length})`, subtext: `kind: ${kind}` };
    switch (kind) {
      case 'line':
        return { kind: 'line', data, x: 'label', y: 'value', series: 'series', smooth: this.smooth(), title };
      case 'column':
        return { kind: 'column', data, x: 'label', y: 'value', series: 'series', stacked: this.stacked(), title };
      case 'bar':
        return { kind: 'bar', data, x: 'label', y: 'value', series: 'series', stacked: this.stacked(), title };
      case 'area':
        return {
          kind: 'area',
          data,
          x: 'label',
          y: 'value',
          series: 'series',
          smooth: this.smooth(),
          stacked: this.stacked(),
          title,
        };
      case 'pie':
        return { kind: 'pie', data, category: 'series', value: 'value', donut: this.donut(), title };
    }
  }
}
