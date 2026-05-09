/**
 * `<hk-table>` engine stress demo.
 *
 * Generates a configurable-size dataset (1k → 100k rows) with mixed-type
 * columns and renders it through `<hk-table>`. The page is the validation
 * surface for the WASM engine wiring: filtering and sorting route through
 * the engine when it has loaded; otherwise the JS pipeline runs.
 *
 * Three diagnostics surfaced in the UI:
 *
 * - **Engine status badge** — `loading` / `active` / `fallback`.
 * - **Last filter latency** — wall-clock from input change to next paint.
 * - **Microbenchmark** — runs N iterations of `handle.filter()` and the
 *   equivalent JS reduce side-by-side, reports avg/p99 + speedup ratio.
 *
 * The microbenchmark uses its OWN `TableHandle`, separate from the table
 * component's internal one, so it measures pure kernel cost — no DOM
 * paint, no signal propagation, no Angular change-detection overhead.
 */

import { Component, computed, effect, inject, signal, untracked, type WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TableComponent,
  TableEngineService,
  TableHandle,
  createTable,
  type EngineColumnSchema,
  type EngineFilterDef,
} from '@hakistack/ng-daisyui';

interface StressRow {
  id: number;
  name: string;
  email: string;
  score: number;
  active: boolean;
  joined: Date;
  region: string;
}

const ROW_PRESETS = [1_000, 10_000, 50_000, 100_000] as const;
type RowPreset = (typeof ROW_PRESETS)[number];

const REGIONS = ['North', 'South', 'East', 'West', 'Central'] as const;
const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const LAST_NAMES = ['Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris'];

/** Tiny LCG for deterministic row generation, no faker dependency. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

function generate(rowCount: number): StressRow[] {
  const rand = lcg(0xc0ffee);
  const rows: StressRow[] = new Array(rowCount);
  const t0 = Date.UTC(2025, 0, 1);
  const span = 365 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < rowCount; i++) {
    const r = rand();
    const first = FIRST_NAMES[r % FIRST_NAMES.length];
    const last = LAST_NAMES[(r >>> 8) % LAST_NAMES.length];
    rows[i] = {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      score: Math.round(((r % 10000) / 100) * 100) / 100,
      active: (r & 1) === 0,
      joined: new Date(t0 + ((r >>> 4) % span)),
      region: REGIONS[(r >>> 16) % REGIONS.length],
    };
  }
  return rows;
}

interface BenchResult {
  rowCount: number;
  iterations: number;
  jsAvgMs: number;
  jsP99Ms: number;
  engineAvgMs: number;
  engineP99Ms: number;
  speedupAvg: number;
  speedupP99: number;
}

@Component({
  selector: 'app-engine-stress-demo',
  imports: [CommonModule, FormsModule, TableComponent],
  template: `
    <div class="space-y-6 max-w-7xl">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-serif tracking-tight">Engine stress test</h1>
        <p class="text-base-content/60 text-sm mt-1">
          Renders a synthetic dataset through <code>&lt;hk-table&gt;</code>. Filtering and sorting route through the WASM engine when it has
          loaded; otherwise the JS pipeline runs as the fallback. The diagnostics below tell you which path is live.
        </p>
      </div>

      <!-- Controls + status -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body p-4">
            <h3 class="card-title text-sm">Dataset size</h3>
            <div class="join">
              @for (preset of presets; track preset) {
                <button
                  type="button"
                  class="btn btn-sm join-item"
                  [class.btn-primary]="rowCount() === preset"
                  (click)="setRowCount(preset)"
                >
                  {{ preset.toLocaleString() }}
                </button>
              }
            </div>
            <p class="text-xs text-base-content/60 mt-2">
              Rendering <strong>{{ rowCount().toLocaleString() }}</strong> rows.
            </p>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-300">
          <div class="card-body p-4">
            <h3 class="card-title text-sm">Engine status</h3>
            <div class="flex items-center gap-2">
              <span
                class="badge"
                [class.badge-success]="engineState() === 'active'"
                [class.badge-warning]="engineState() === 'loading'"
                [class.badge-ghost]="engineState() === 'fallback'"
              >
                {{ engineState() }}
              </span>
              <span class="text-xs text-base-content/60">{{ engineDescription() }}</span>
            </div>
            <p class="text-xs text-base-content/60 mt-2 font-mono">version: {{ engineVersion() ?? '—' }}</p>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-300">
          <div class="card-body p-4">
            <h3 class="card-title text-sm">Last filter latency</h3>
            <div class="text-3xl font-mono tabular-nums">
              {{ lastLatencyMs() != null ? lastLatencyMs()!.toFixed(1) + ' ms' : '—' }}
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              Wall-clock from filter input to next paint. Includes DOM render, not just the kernel.
            </p>
          </div>
        </div>
      </div>

      <!-- Microbenchmark -->
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-4">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 class="card-title text-sm">Microbenchmark — kernel cost only</h3>
              <p class="text-xs text-base-content/60 mt-1 max-w-2xl">
                Runs <strong>{{ benchIterations }}</strong> iterations of <code>name contains "a"</code> against the current dataset,
                alternating JS reduce vs <code>handle.filter()</code>. No DOM, no Angular change detection — pure kernel time.
              </p>
            </div>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="benchRunning() || engineState() !== 'active'"
              (click)="runBenchmark()"
            >
              @if (benchRunning()) {
                <span class="loading loading-spinner loading-xs"></span>
                Running…
              } @else {
                Run benchmark
              }
            </button>
          </div>

          @if (benchResult(); as r) {
            <div class="overflow-x-auto mt-4">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Path</th>
                    <th class="text-right">Avg / call</th>
                    <th class="text-right">p99</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>JS reduce</td>
                    <td class="text-right font-mono tabular-nums">{{ r.jsAvgMs.toFixed(2) }} ms</td>
                    <td class="text-right font-mono tabular-nums">{{ r.jsP99Ms.toFixed(2) }} ms</td>
                  </tr>
                  <tr>
                    <td>WASM engine</td>
                    <td class="text-right font-mono tabular-nums">{{ r.engineAvgMs.toFixed(2) }} ms</td>
                    <td class="text-right font-mono tabular-nums">{{ r.engineP99Ms.toFixed(2) }} ms</td>
                  </tr>
                  <tr class="font-semibold">
                    <td>Speedup</td>
                    <td class="text-right font-mono tabular-nums" [class.text-success]="r.speedupAvg >= 1.5">
                      {{ r.speedupAvg.toFixed(1) }}×
                    </td>
                    <td class="text-right font-mono tabular-nums" [class.text-success]="r.speedupP99 >= 1.5">
                      {{ r.speedupP99.toFixed(1) }}×
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="text-xs text-base-content/60 mt-2">
                Measured on {{ r.rowCount.toLocaleString() }} rows · higher speedup at larger datasets.
              </p>
            </div>
          }
        </div>
      </div>

      <!-- Table -->
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-0">
          <hk-table [config]="tableConfig" [data]="rows()" [paginationOptions]="paginationOptions" (filterChange)="onFilterStart()" />
        </div>
      </div>
    </div>
  `,
})
export class EngineStressDemoComponent {
  private readonly engineService = inject(TableEngineService);

  readonly presets = ROW_PRESETS;
  readonly rowCount: WritableSignal<RowPreset> = signal<RowPreset>(10_000);

  /** Memoized so re-renders don't regenerate millions of rows. */
  private readonly cache = new Map<RowPreset, StressRow[]>();
  readonly rows = computed(() => {
    const n = this.rowCount();
    let cached = this.cache.get(n);
    if (!cached) {
      cached = generate(n);
      this.cache.set(n, cached);
    }
    return cached;
  });

  readonly tableConfig = createTable<StressRow>({
    visible: ['id', 'name', 'email', 'score', 'active', 'joined', 'region'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      score: 'Score',
      active: 'Active',
      joined: 'Joined',
      region: 'Region',
    },
    formatters: {
      score: (v) => Number(v).toFixed(2),
      joined: (v) => (v as Date).toISOString().slice(0, 10),
      active: (v) => (v ? 'yes' : 'no'),
    },
    filters: [
      { field: 'id', type: 'number' },
      { field: 'name', type: 'text' },
      { field: 'email', type: 'text' },
      { field: 'score', type: 'number' },
      { field: 'active', type: 'boolean' },
      { field: 'joined', type: 'date' },
      {
        field: 'region',
        type: 'select',
        options: [
          { label: 'North', value: 'North' },
          { label: 'South', value: 'South' },
          { label: 'East', value: 'East' },
          { label: 'West', value: 'West' },
          { label: 'Central', value: 'Central' },
        ],
      },
    ],
    enableFiltering: true,
  });

  readonly paginationOptions = {
    mode: 'offset' as const,
    pageSize: 50,
    pageSizeOptions: [50, 100, 250],
    totalItems: 0,
  };

  // ── Diagnostics ──────────────────────────────────────────────────────

  readonly engineReady = this.engineService.ready;
  readonly engineVersion = signal<string | null>(null);

  readonly engineState = computed<'loading' | 'active' | 'fallback'>(() => {
    if (!this.engineReady()) return 'loading';
    return 'active';
  });

  readonly engineDescription = computed(() => {
    switch (this.engineState()) {
      case 'loading':
        return 'WASM module fetching…';
      case 'active':
        return 'WASM filter/sort live';
      case 'fallback':
        return 'JS pipeline (cursor / tree / failed load)';
    }
  });

  readonly lastLatencyMs = signal<number | null>(null);

  // ── Microbenchmark ───────────────────────────────────────────────────

  /** How many iterations to run per path. Enough to smooth out GC noise. */
  readonly benchIterations = 200;
  readonly benchRunning = signal(false);
  readonly benchResult = signal<BenchResult | null>(null);

  /** Schema for the benchmark's standalone TableHandle. */
  private readonly benchSchema: EngineColumnSchema<StressRow>[] = [
    { field: 'name', kind: 'text' },
    { field: 'email', kind: 'text' },
    { field: 'score', kind: 'number' },
  ];

  constructor() {
    // Pre-warm the engine so the first filter doesn't pay the WASM-load cost.
    this.engineService
      .preload()
      .then(() => this.engineService.version())
      .then((v) => this.engineVersion.set(v))
      .catch(() => this.engineVersion.set(null));

    // Switching dataset size invalidates cached latency + benchmark.
    effect(() => {
      this.rowCount();
      untracked(() => {
        this.lastLatencyMs.set(null);
        this.benchResult.set(null);
      });
    });
  }

  setRowCount(n: RowPreset): void {
    this.rowCount.set(n);
  }

  /**
   * Stamp the start time when a column-filter change fires, then read the
   * end time after two animation frames — roughly when the paint has flushed.
   */
  onFilterStart(): void {
    const t0 = performance.now();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const t1 = performance.now();
        this.lastLatencyMs.set(t1 - t0);
      });
    });
  }

  /**
   * Run the side-by-side benchmark. Creates its own `TableHandle` (separate
   * from `<hk-table>`'s) so timings are uncontaminated by Angular signal
   * propagation or DOM render. Iterates JS-then-engine alternately to
   * minimize systematic drift from CPU thermal / GC patterns over the run.
   */
  async runBenchmark(): Promise<void> {
    this.benchRunning.set(true);
    try {
      const data = this.rows();
      const handle = await this.engineService.createDataset(data, this.benchSchema);

      const filterDef: EngineFilterDef<StressRow>[] = [{ kind: 'text', field: 'name', op: { kind: 'contains', needle: 'a' } }];

      const jsTimes = new Float64Array(this.benchIterations);
      const engineTimes = new Float64Array(this.benchIterations);

      // Interleave JS / engine iterations so neither path benefits
      // disproportionately from CPU warm-up or cooler thermal state.
      for (let i = 0; i < this.benchIterations; i++) {
        // JS path
        const t0 = performance.now();
        let count = 0;
        for (const row of data) {
          if (row.name.toLowerCase().includes('a')) count++;
        }
        jsTimes[i] = performance.now() - t0;
        // Prevent V8 from optimizing the loop away — read `count` somewhere
        // observable. The if guard makes the read live without slowing the loop.
        if (count < 0) console.log(count);

        // Engine path
        const t1 = performance.now();
        const indices = handle.filter(filterDef);
        engineTimes[i] = performance.now() - t1;
        if (indices.length < 0) console.log(indices.length);
      }

      handle.dispose();

      this.benchResult.set({
        rowCount: data.length,
        iterations: this.benchIterations,
        jsAvgMs: mean(jsTimes),
        jsP99Ms: percentile(jsTimes, 0.99),
        engineAvgMs: mean(engineTimes),
        engineP99Ms: percentile(engineTimes, 0.99),
        speedupAvg: mean(jsTimes) / mean(engineTimes),
        speedupP99: percentile(jsTimes, 0.99) / percentile(engineTimes, 0.99),
      });
    } finally {
      this.benchRunning.set(false);
    }
  }
}

function mean(values: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] as number;
  return sum / values.length;
}

function percentile(values: ArrayLike<number>, p: number): number {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}
