/**
 * `<hk-table>` engine stress demo.
 *
 * Generates a configurable-size dataset (1k → 100k rows) with mixed-type
 * columns and renders it through `<hk-table>`. The page is the validation
 * surface for the WASM engine wiring: filtering and sorting route through
 * the engine when it has loaded; otherwise the JS pipeline runs.
 *
 * Two diagnostics surfaced in the UI:
 *
 * - **Engine status badge** — `loading` / `active` / `fallback`, driven by
 *   `TableEngineService.ready`.
 * - **Last filter latency** — `performance.now()` between a filter input
 *   change and the next paint, so users can compare row counts side-by-side.
 *
 * No instrumentation hooks into the table; we measure from the outside, the
 * way a user perceives the lag.
 */

import { Component, computed, effect, inject, signal, untracked, type WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableComponent, TableEngineService, createTable } from '@hakistack/ng-daisyui';

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
            <p class="text-xs text-base-content/60 mt-1">Wall-clock from filter input to next paint. Lower is better.</p>
          </div>
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
    totalItems: 0, // computed from data length by the table
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

  constructor() {
    // Pre-warm the engine so the first filter doesn't pay the WASM-load cost.
    this.engineService
      .preload()
      .then(() => this.engineService.version())
      .then((v) => this.engineVersion.set(v))
      .catch(() => this.engineVersion.set(null));

    // Switching dataset size invalidates the cached latency.
    effect(() => {
      this.rowCount();
      untracked(() => this.lastLatencyMs.set(null));
    });
  }

  setRowCount(n: RowPreset): void {
    this.rowCount.set(n);
  }

  /**
   * Stamp the start time when a column-filter change fires, then read the
   * end time after the next two animation frames — that's roughly when the
   * paint has flushed. Not surgical, but consistent enough to compare row
   * counts and engine on/off.
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
}
