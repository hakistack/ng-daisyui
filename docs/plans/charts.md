# Charts Module — Planning Document

> Status: **v3 — Phase 0 complete; Phase 1 unblocked**
> Owner: @josedr
> Target library: `@hakistack/ng-daisyui`
> Last updated: 2026-04-23

---

## 1. Goal

Add a first-class **Charts** module to `@hakistack/ng-daisyui` that reaches **Power BI feature parity** (or very close to it) while staying consistent with the library's existing DX: declarative builder functions (`createChart(...)`), signals, standalone components, DaisyUI/Tailwind styling, OnPush, a11y-first.

Success criteria:

1. Cover ~95% of the chart types a typical business dashboard needs (see §3).
2. Single import surface: `<hk-chart [config]="…" />` — the chart type is a property of the config, not a different component per type.
3. Themeable via DaisyUI CSS variables (so `data-theme="kaizen"`, `"dark"`, etc. just work).
4. Interactive: tooltips, legends, zoom/pan, crossfilter/drilldown, export (PNG/SVG/CSV).
5. Angular-idiomatic: signals in/out, `afterNextRender` init, no direct DOM manipulation in consumer code.
6. Bundle-conscious: tree-shakeable, not a single 500 kB monolith in the fesm file.

Non-goals (v1):

- Full dashboard layout engine (grid, filter pane, cross-chart interaction manager). That's a v2 story — charts must first stand alone.
- Server-side aggregation or OLAP semantics — the consumer owns the data pipeline, we render what they give us.
- Custom WebGL 3D scenes or geospatial heatmaps with base layers (Mapbox/Leaflet level). Those are separate modules if ever needed.

---

## 2. Why this is a big feature

- Charting is a *library within a library*. Every engine has its own rendering primitives, event model, and config schema. Wrapping it well without leaking its abstractions is non-trivial.
- Power BI has ~35 built-in visuals + a marketplace. Matching even the built-in set means ~15–25 components worth of polish.
- Theming across data series (sequential, diverging, qualitative palettes) has to match our DaisyUI theme system dynamically — most chart libs expect static colors.
- A11y is hard: screen-reader support, keyboard navigation, color-blind-safe palettes, ARIA-live for updates.
- We must not bloat the fesm file. Quill just caused a resolve issue — we can't repeat that pattern with a 400 kB chart engine loaded eagerly.

Expect **multi-month rollout, not a sprint.**

---

## 3. Chart type catalog

Organized by category. **P0** = must-have for v1, **P1** = second wave, **P2** = nice-to-have / advanced dashboards.

### 3.1 Comparison / Ranking (P0)

- Column (vertical bar) — grouped, stacked, 100% stacked
- Bar (horizontal)
- Bullet chart
- Waterfall
- Funnel / pyramid

### 3.2 Trend / Time-series (P0)

- Line — single, multi-series, with markers
- Area — stacked, 100% stacked, streamgraph (P1)
- Spline
- Step line
- Range area (min/max bands) (P1)
- Candlestick / OHLC (P1)

### 3.3 Part-to-whole (P0)

- Pie
- Donut
- Sunburst (hierarchical donut) (P1)
- Treemap (P1)
- Marimekko / mosaic (P2)

### 3.4 Correlation (P1)

- Scatter
- Bubble
- Heatmap (matrix)
- Density / contour (P2)

### 3.5 Distribution (P1)

- Histogram
- Box plot
- Violin plot (P2)

### 3.6 KPI / Summary (P0)

- Gauge (radial, linear)
- KPI card (big number + trend sparkline + delta badge)
- Sparkline (inline, for tables)

### 3.7 Hierarchy / Flow (P1/P2)

- Sankey (P1)
- Chord diagram (P2)
- Network / force-directed graph (P2)
- Radial tree (P2)
- Parallel coordinates (P2)

### 3.8 Geospatial (P2, deferred)

- Choropleth (map) — requires map data + projection lib, defer to v3.
- Geo scatter — same.

### 3.9 Combo / Composite (P0)

- Combo (bar + line on dual axis)
- Multi-pane (synchronized x-axis)

### 3.10 Calendar / Time-grid (P2)

- Calendar heatmap (GitHub-style contribution graph)
- ThemeRiver

**v1 minimum viable set (Phase 1 target):** column, bar, line, area, pie, KPI card. Six types covering the 60% of real dashboard usage that most consumers actually reach for. Scatter, combo, gauge, donut, sparkline land in Phase 1.5.

---

## 4. Library evaluation

Charting engines evaluated against: chart-type coverage, bundle size, licensing, Angular 21 compatibility, a11y story, tree-shakeability, activity.

| Library | License | Bundle (gzipped) | Chart types | Angular integration | A11y | Tree-shake | Activity | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Apache ECharts** | Apache 2.0 | ~160 kB full, ~40 kB minimal | ~30 types incl. sankey, sunburst, boxplot, candlestick, graph, heatmap, treemap, gauge, radar, pictorial, calendar, themeRiver | `ngx-echarts` or direct | Built-in ARIA + decal patterns | Yes (named imports) | Very high (Apache Foundation) | **Primary candidate** |
| **ApexCharts** | MIT | ~120 kB | ~20 types incl. candlestick, heatmap, radar, treemap, range area, funnel | `ng-apexcharts` | Basic | Partial (monolithic core) | High | Solid fallback / complement |
| **Chart.js** | MIT | ~60 kB core + plugins | ~10 base types; advanced via plugins (chartjs-chart-sankey, -treemap, -matrix) | `ng2-charts` | Basic, improving | Yes | Very high | Too basic for Power-BI parity alone — but cheap for simple cases |
| **Plotly.js** | MIT | ~800 kB full, modular builds ~200 kB | ~40 types incl. 3D, statistical, geo | Direct (no great wrapper) | Good | Yes but config-heavy | High | Feature-rich, but heavy + not Angular-native in API |
| **D3.js** | ISC | ~80 kB (modular) | Anything you build | Direct | DIY | Yes | Very high | Too low-level for this scope — use only for custom visuals |
| **AG Charts Community** | MIT | ~120 kB | ~15 types incl. sankey, treemap, waterfall (financial charts in Enterprise only) | Has `ag-charts-angular` | Good | Yes | High | Good option but some premium charts gated |
| **Highcharts** | Non-commercial free only | ~100 kB | ~25 types | `highcharts-angular` | Good | Partial | Very high | **Rejected** — commercial license required, incompatible with UNLICENSED internal lib distribution |

### Leading choice: **ECharts** (Apache 2.0)

Why:

- Broadest free chart-type coverage — matches Power BI built-ins more closely than any MIT alternative.
- Active Apache project, safe licensing for internal + any future OSS use.
- Supports tree-shaking: `import { LineChart, BarChart } from 'echarts/charts'` etc. — we only pay for what we render.
- Handles SVG **and** canvas rendering out of the box (canvas for large datasets, SVG for print/export).
- Decent a11y primitives (`aria` option, decal patterns for color-blind users).

Risks:

- ECharts' config schema is enormous and stringly-typed. We **must** wrap it in a typed builder — otherwise consumers end up writing raw ECharts options and we've just shipped a thin adapter.
- It's a third-party dependency. Add to `peerDependencies` (not `dependencies`) so consumers who don't use charts don't ship it.
- Tree-shaking has transitive gotchas: `LineChart` needs `GridComponent`, tooltips need `TooltipComponent`, etc. The Phase 0 spike must enumerate these per kind and document actual chunk sizes — "tree-shakeable" on paper doesn't automatically mean 40 kB per chart in practice.

### Complementary: **Chart.js** (optional, for KPI + sparkline)

Considered keeping ECharts as the single engine. Likely correct — a sparkline as an ECharts line chart with all chrome stripped is ~the same payload once the engine is loaded. Don't fragment the engine choice.

**Decision: one engine, ECharts. Revisit only if a specific chart type ECharts can't do well shows up.**

---

## 4.5 Decisions locked before Phase 0

These six decisions block Phase 0 kickoff. All have binary answers. Resolve in a single design review, record the outcomes in this section, then move.

**Ratified 2026-04-22 by @josedr — all six defaults accepted.** Phase 0 work is unblocked.

| # | Decision | Default position | Alternatives | Status |
|---|---|---|---|---|
| 1 | **Data input shape** | Long format (`[{x, series, value}]`). Wide format requires caller-side pivot via `pivotWide()` helper we ship. | Accept both, auto-detect by row shape. Rejected — ambiguous error modes. | ✅ 2026-04-22 |
| 2 | **Escape hatch** | Allowed via `optionsOverride: (base) => mutated` on `createChart`. Documented as "use when the typed builder doesn't cover your case; expect breaking changes across minors." | Forbid entirely; force API extension per case. | ✅ 2026-04-22 |
| 3 | **Renderer rubric** | SVG default. Switch to canvas when `data.length > 2000` OR `kind ∈ {heatmap, scatter, bubble}` OR `animation: false`. Configurable per chart via `renderer: 'svg' \| 'canvas' \| 'auto'` (default `auto`). | Per-kind hardcoded. Rejected — removes consumer control. | ✅ 2026-04-22 |
| 4 | **Component naming** | Rename existing `<hk-org-chart>` → `<hk-organization-chart>` **before** Phase 0 starts. Free up `<hk-chart>` unambiguously. | Ship both, accept ambiguity. Rejected — breaking rename later is worse. | ✅ 2026-04-22 |
| 5 | **Theme observation** | Single `DaisyUIThemeService` (`providedIn: 'root'`) with one `MutationObserver` on `<html[data-theme]>`. Exposes `theme = signal<ThemeTokens>()`. Every chart reads via `computed()`. | Per-chart observer. Rejected — wasteful on dashboards with 20+ charts. | ✅ 2026-04-22 |
| 6 | **Bundle budget (revised 2026-04-23)** | **Feature-scaled, not flat.** Main fesm entry: hold at **150 kB brotli** until Phase 2, then reassess. Per-kind wrapper code in fesm: **<2 kB brotli** per new chart kind. Chart lazy chunk (first kind loaded, including ECharts core + renderers + components): **<200 kB gzipped transfer**. Each subsequent kind: **+20 kB gzipped** amortized over shared core. Enforce fesm via `size-limit` CI; document lazy-chunk sizes per kind but don't CI-gate (consumer-side, engine-dependent). | Original v2 numbers (fesm +2 kB, lazy <60 kB) — rejected after Phase 0 spike empirically showed ECharts first-chart floor ~150 kB gzipped. See footnote below. | ✅ 2026-04-23 |

**Footnote on #6 revision (2026-04-23).** Original v2 numbers treated "Power BI-level charting" as if it could fit into a standard-component budget. The Phase 0 spike empirically measured ECharts' first-chart footprint at **~150 kB gzipped transfer** (LineChart + BarChart + GridComponent + TooltipComponent + LegendComponent + TitleComponent + SVGRenderer + core). Industry comparison: Chart.js minimal functional line ~75 kB, ApexCharts ~130 kB, Plotly 200+ kB. No full-featured engine fits 60 kB. Revised numbers reflect engine reality while preserving the discipline — per-kind increments stay small (<20 kB) since the engine core amortizes across all kinds. Bundle growth tracks feature growth, not some arbitrary flat ceiling.

---

## 5. Architecture

### 5.1 Directory layout

```
projects/hakistack/ng-daisyui/src/lib/components/chart/
├── chart.component.ts          # <hk-chart> — single entry component
├── chart.component.html
├── chart.component.css
├── chart.builder.ts            # createChart(), helpers
├── chart.helpers.ts            # theme → echarts color mapping, palette utils
├── chart.types.ts              # ChartConfig, ChartKind, series types
├── data/
│   ├── data-contract.ts        # long/wide detection, pivot helpers, null policy
│   └── aggregation.ts          # sum/avg/min/max/count reducers
├── themes/
│   ├── daisyui-theme.service.ts  # providedIn: 'root', single observer
│   ├── theme-bridge.ts           # CSS vars → echarts theme object
│   └── palettes.ts               # sequential, diverging, qualitative scales
├── kinds/                      # per-chart-type option builders (typed)
│   ├── column.ts
│   ├── bar.ts
│   ├── line.ts
│   ├── area.ts
│   ├── pie.ts
│   ├── scatter.ts
│   ├── gauge.ts
│   ├── kpi.ts
│   ├── sparkline.ts
│   └── combo.ts
├── interactions/
│   ├── tooltip.ts
│   ├── legend.ts
│   ├── zoom.ts
│   └── export.ts
├── a11y/
│   ├── data-table-fallback.ts  # SR-only <table> mirror of the data
│   └── keyboard-nav.ts
└── chart.component.spec.ts
```

### 5.2 Engine loading strategy

ECharts must be **lazy-loaded** to keep the library's 150 kB budget intact:

- Library source: `import('echarts/core')` inside `afterNextRender`. No top-level static import.
- Only register the chart modules actually needed for the active config (`use([LineChart, CanvasRenderer, GridComponent, TooltipComponent])`).
- Use a module registry map that declares **transitive** dependencies per kind:

  ```typescript
  const KIND_MODULES: Record<ChartKind, () => Promise<EChartsModule[]>> = {
    line:   () => Promise.all([import('echarts/charts').then(m => m.LineChart),
                               import('echarts/components').then(m => m.GridComponent),
                               import('echarts/components').then(m => m.TooltipComponent)]),
    column: () => Promise.all([/* BarChart + Grid + Tooltip */]),
    // ...
  };
  ```

  Phase 0 spike enumerates and measures these per kind. Document actual gzipped chunk sizes in `chart.types.ts` JSDoc comments.
- Declare `echarts` in **`peerDependencies`** with `peerDependenciesMeta: { echarts: { optional: true } }`. Document that consumers using `<hk-chart>` must `npm install echarts`.

This mirrors what we just did for quill (lazy editor), but taken one step further: even the engine itself is only pulled when a chart renders.

### 5.3 Theming

Handled by `DaisyUIThemeService` (see §4.5 decision #5) — a single `providedIn: 'root'` singleton that owns one `MutationObserver` on `<html[data-theme]>` and exposes a `theme` signal. Chart components `inject()` it and read via `computed()`; when the signal changes, the chart's effect calls `setOption()` with refreshed colors.

The service produces an ECharts theme object with:

1. `color` array from `[primary, secondary, accent, info, success, warning, error, neutral]` read via `getComputedStyle(document.documentElement)`.
2. `backgroundColor: 'transparent'` (so charts sit on DaisyUI surfaces).
3. `textStyle.color` from `--color-base-content`.
4. Axis/split line colors from `--color-base-300`/`--color-base-200` at appropriate opacities.
5. Border radius from `--radius-field` / `--radius-box` to match DaisyUI's rounded aesthetic.

This is the single most important piece of the integration — if themes don't update live, the library feels broken. It must be built in from day 1, not bolted on later.

#### 5.3.1 Theming completeness — what "fully DaisyUI-native" means

Short answer: **visually, 100% native theming is achievable.** Every property that defines a chart's look is exposed in the ECharts config and can be driven from a DaisyUI token. The work is in the bridge — not in the engine's flexibility.

What's fully themeable (i.e. driven from DaisyUI CSS vars via the bridge):

- Series colors (`color: []`) — from `primary / secondary / accent / info / success / warning / error / neutral`
- Background (`backgroundColor: 'transparent'`) — charts sit on DaisyUI surfaces
- Typography (`textStyle.fontFamily/.fontSize/.color`) — from `--font-sans`, `--color-base-content`
- Axes — line, tick, and split-line colors from `--color-base-300` / `--color-base-200`
- Legend, title, subtitle — colors, fonts, spacing, icons
- Data labels and per-series `itemStyle` — fill, `borderColor`, `borderRadius` (matches DaisyUI's rounded aesthetic, e.g. pulling `--radius-box` / `--radius-field`)
- Shadows (`shadowColor`, `shadowBlur`), opacity, per-element overrides
- Animations — duration, easing (can tie into existing `motion` presets)

Known nuances (decisions locked in §4.5):

1. **CSS doesn't cascade into the chart.** ECharts renders to canvas/SVG and inlines styles as attributes — external CSS rules targeting the SVG don't apply. We read CSS vars in JS (`getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`) and inject them into the config. That's the bridge's job.
2. **Live theme switches require the shared observer in `DaisyUIThemeService`.** When `<html data-theme>` changes, CSS updates instantly but ECharts keeps the old compiled theme. The service observes the attribute and pushes a new `ThemeTokens` value; chart effects call `chart.setOption()` with refreshed colors within a frame.
3. **Tooltips are HTML portals — this is a feature, not a limitation.** ECharts lets us return raw HTML for tooltips, so DaisyUI classes work directly: `<div class="card bg-base-100 shadow-xl p-3">…</div>`. Tailwind/DaisyUI utility classes work because they're global. **Caveat:** tooltips render in a detached DOM node outside Angular's view encapsulation, so Angular-scoped styles (`:host` selectors or `ViewEncapsulation.Emulated` classes) do **not** apply. Keep tooltip markup restricted to global utility classes.
4. **Built-in chrome is stylable but dated.** ECharts' default toolbox (export/zoom/restore buttons) and dataZoom handles accept colors, but the bundled icons look outdated. The clean move is to **disable ECharts' built-ins** and rebuild that chrome with DaisyUI components — `<button class="btn btn-ghost btn-sm">` controlling the chart through the controller API (`exportPng()`, `resetZoom()`, etc.). This produces a *more* native result than theming the defaults ever would.

Non-negotiable: the bridge must prove itself against at least 3 contrasting themes (e.g. `kaizen`, `dark`, `cupcake`) before Phase 1 starts. If colors don't live-update cleanly across theme switches in Phase 0, we stop and reconsider the engine choice — there is no "mostly themed" acceptable middle state here.

### 5.4 Data contract

The hardest part of a charting wrapper isn't rendering — it's the data-to-visual mapping. This section is binding: all `kinds/*.ts` builders must conform.

#### 5.4.1 Accepted shape

**Long format only** (decision §4.5 #1). Rows are individual observations:

```typescript
type LongRow<TX = unknown, TValue = number> = {
  readonly [key: string]: unknown;
  // At minimum, the field referenced by `x` and the field referenced by `y`/`value`.
};

// Example:
const data: LongRow[] = [
  { month: '2026-01', series: 'revenue', value: 12000 },
  { month: '2026-01', series: 'cost',    value:  8000 },
  { month: '2026-02', series: 'revenue', value: 15000 },
  // ...
];
```

For wide data, callers pivot with the shipped helper:

```typescript
import { pivotWide } from '@hakistack/ng-daisyui/chart';

const long = pivotWide(wide, { idVars: ['month'], valueVars: ['revenue', 'cost'] });
```

Rationale: long format is unambiguous, composes with aggregation, and matches what most data APIs return. Shipping a pivot helper removes the "I have wide data" friction without letting two formats compete inside the builder.

#### 5.4.2 Aggregation

When two rows share the same `x` + `series` combination, the default is **sum**. Callers override via `aggregate`:

```typescript
createChart({
  kind: 'column',
  data,
  x: 'month',
  y: 'value',
  series: 'series',
  aggregate: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last',
});
```

No silent "pick last" behavior. If `aggregate` is unset and duplicates exist, we `console.warn` in dev mode (`isDevMode()`) and sum. Production builds sum silently.

#### 5.4.3 Null / missing policy

Per-kind defaults, overridable on `createChart`:

| Kind | Default null behavior | Override |
|---|---|---|
| line, spline, step | **Gap** (break the line) | `nullPolicy: 'gap' \| 'connect' \| 'zero'` |
| area | **Zero** (area continues at baseline) | same |
| column, bar | **Omit** (no bar for that category) | `nullPolicy: 'omit' \| 'zero'` |
| scatter, bubble | **Omit** | same |
| pie, donut | **Omit** (slice excluded) | same |

Document this in each kind's JSDoc. The prop is `nullPolicy`, always — no kind-specific naming.

#### 5.4.4 Immutability contract

The `data` input must be treated as a new reference on change. Concretely:

- `data` is typed `readonly T[]`.
- `<hk-chart>` uses referential equality on `data` inside an `effect()` to decide whether to call `setOption({ series })`.
- If the caller mutates the array in place, the chart **will not** re-render. This is documented in the API table with a 🚨 callout.
- Signals are supported natively: if `data` comes from a signal, the chart's effect automatically tracks it.

OnPush + mutable arrays is the classic Angular footgun. Stating the contract explicitly is cheaper than debugging it later.

#### 5.4.5 Data volume guidance

- Up to ~2,000 points: SVG, full animations.
- 2,000–100,000 points: canvas (auto via §4.5 rubric), animations off by default, `progressive: 1000` enabled.
- 100,000+ points: **sampling required**. Ship `sampleLTTB(data, threshold)` and `sampleAverage(data, bucketMs)` helpers. Document as "consumer-owned" — we provide tools, we don't auto-sample (loses fidelity silently).

### 5.5 Public API (draft)

```typescript
// Builder
const chart = createChart({
  kind: 'column',
  data: salesData,
  x: 'month',
  y: 'value',
  series: 'category',            // optional; omit for single-series
  aggregate: 'sum',              // default; shown for clarity
  stacked: false,
  title: 'Q1 Performance',
  legend: { position: 'top' },
  tooltip: { shared: true, valueFormatter: (v) => `$${v.toLocaleString()}` },
  yAxis: { label: 'USD' },
  colors: 'primary',             // palette key OR array of CSS vars
  nullPolicy: 'omit',
  renderer: 'auto',              // 'svg' | 'canvas' | 'auto'
  onPointClick: (point) => { /* ... */ },
  optionsOverride: (base) => base, // escape hatch; use sparingly
});

// Template
<hk-chart [config]="chart.config()" [data]="data()" />
```

Key shape:

```typescript
type ChartKind =
  | 'column' | 'bar' | 'line' | 'area' | 'spline' | 'step'
  | 'pie' | 'donut'
  | 'scatter' | 'bubble'
  | 'combo'
  | 'gauge' | 'kpi' | 'sparkline'
  // phase 2+
  | 'heatmap' | 'treemap' | 'sunburst' | 'sankey' | 'radar' | 'funnel' | 'waterfall' | 'boxplot' | 'candlestick';

interface ChartConfigBase<T = LongRow> {
  kind: ChartKind;
  data: readonly T[];
  title?: string | { text: string; subtext?: string };
  legend?: boolean | LegendConfig;
  tooltip?: boolean | TooltipConfig;
  colors?: PaletteKey | readonly string[];
  renderer?: 'svg' | 'canvas' | 'auto';
  nullPolicy?: 'gap' | 'connect' | 'zero' | 'omit';
  aggregate?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';
  optionsOverride?: (base: EChartsOption) => EChartsOption;
}

// Discriminated union — kind: 'pie' doesn't expose xAxis, etc.
type ChartConfig<T = LongRow> =
  | (ChartConfigBase<T> & { kind: 'column' | 'bar'; x: keyof T; y: keyof T; series?: keyof T; stacked?: boolean; })
  | (ChartConfigBase<T> & { kind: 'pie' | 'donut'; category: keyof T; value: keyof T; })
  | (ChartConfigBase<T> & { kind: 'combo'; x: keyof T; series: Array<{ kind: 'line' | 'column'; y: keyof T; axis?: 'left' | 'right'; }>; })
  // ...
```

Mirror `createTable`/`createForm` so the DX is familiar. Discriminated unions guarantee that `kind: 'pie'` doesn't accept `xAxis`, and `kind: 'combo'` requires a per-series `kind` array.

### 5.6 Reactivity and change detection

- `<hk-chart>` takes `config` and `data` as separate `input()` signals.
- An internal `effect()` diffs them:
  - `config` reference change → full `setOption(newOpts, { notMerge: true })`.
  - `data` reference change only → `setOption({ series: [...] }, { lazyUpdate: true })` — skip chrome rebuild.
  - Neither changed → no-op.
- No deep equality. Consumers must produce new references on change (stated in §5.4.4).
- Outputs: `chartReady`, `pointClick`, `legendSelect`, `brushSelect`, `zoom`.
- Controller pattern like `FormController`: `createChart()` returns `{ config, update, getInstance, exportPng, exportSvg, resize }` for imperative control.

### 5.7 SSR

- Component renders a sized placeholder `<div role="img" [attr.aria-label]="title">` during SSR, with dimensions from the config's `width`/`height` or `100%`.
- Engine load + chart init happens in `afterNextRender`, which is browser-only by contract.
- **No internal `@defer`.** Document the recommended pattern in docs:
  ```html
  @defer (on viewport) {
    <hk-chart [config]="chart.config()" [data]="data()" />
  } @placeholder {
    <div class="skeleton h-64 w-full"></div>
  }
  ```
  This gives consumers control without forcing a deferral decision on every chart.

### 5.8 Accessibility (parallel workstream, not a phase exit)

A11y runs parallel to Phases 1–2, not as a checklist at the end. Real a11y needs live testing, not axe.

Minimum bar from first chart shipped:

- ECharts' built-in `aria.enabled = true` and `aria.decal.show = true` (pattern overlays as a redundant channel for color).
- **SR-only `<table>` data fallback** on every chart, rendering the underlying dataset. Matches Power BI's "Show data" affordance. Implemented in `a11y/data-table-fallback.ts`, included by default, toggleable via `a11y: { dataTable: false }` only for consumers with a specific reason.
- Keyboard navigation: arrow keys cycle through data points when chart is focused. Requires an ECharts shim tracked as a risk (§7.2).
- Live-region updates rate-limited to one announcement per 500ms (prevents screen-reader spam when streaming data).
- High-contrast mode: theme bridge switches to a WCAG-AA-verified palette when `(prefers-contrast: more)` matches.
- Color-blind-safe default qualitative palette (not just DaisyUI's theme palette, which may fail deuteranopia/protanopia simulation).

Tested with NVDA + Firefox and VoiceOver + Safari at each chart kind's completion. axe is a floor, not a ceiling.

---

## 6. Phased rollout

### Phase 0 — Foundation (1–2 weeks)

- Record §4.5 decisions as ✅.
- Rename `<hk-org-chart>` → `<hk-organization-chart>`.
- Add `echarts` as optional peer dep.
- Build `<hk-chart>` shell component with lazy engine loader.
- Build `DaisyUIThemeService` with live-updating signal.
- `createChart()` builder with discriminated-union typing for `line` and `column` only.
- Build `data-contract.ts` with `pivotWide` and aggregation reducers.
- Demo app scaffold: `/chart/basic` route.

**Exit criteria (all must be falsifiably met) — revised 2026-04-23 to match §4.5 #6:**

- One line chart renders, respects theme, recolors within one animation frame across `kaizen` / `dark` / `cupcake` theme switches. ✅ **Met.**
- Main fesm stays under its `size-limit` ceiling (150 kB brotli). Post-Phase-0 measurement: **122.22 kB brotli** (+7.34 kB delta from 114.88 kB pre-chart baseline). ✅ **Met.**
- First-chart lazy chunk (ECharts core + LineChart + BarChart + GridComponent + TooltipComponent + LegendComponent + TitleComponent + SVGRenderer + wrapper): **<200 kB gzipped transfer**. Post-Phase-0 measurement: **~150 kB gzipped**. ✅ **Met.**
- Typed builder: `createChart({ kind: 'line', stacked: true })` fails at compile time (`stacked` is only valid for `kind: 'column'`). ✅ **Met** — discriminated union in `chart.types.ts`.

**Phase 0 complete (2026-04-23).** Phase 1 unblocked.

### Phase 1 — Core charts (4–5 weeks)

Implement P0 v1 set: **column, bar, line, area, pie, KPI card**. Six types.

Each chart gets:
- Typed option builder in `kinds/*.ts`
- Demo tab in table-demo-style subroute (`/chart/column`, `/chart/line`, etc.)
- Unit tests (Vitest + jsdom) for option shape + data contract edge cases (empty arrays, single row, nulls, duplicates with aggregation)
- Docs: API table, code block, live example
- SR-only `<table>` fallback wired in
- Keyboard nav verified manually

**Exit criteria:** 6 chart types live, all themed across 3 themes, all pass axe + manual NVDA smoke test, all within bundle budget.

### Phase 1.5 — Remaining P0 (2–3 weeks)

scatter, combo, gauge, donut, sparkline. Same per-chart checklist as Phase 1.

**Exit criteria:** 11 chart types total. Covers ~70% of Power BI built-in usage patterns.

### Phase 2 — Advanced charts (4–5 weeks)

P1: heatmap, treemap, sunburst, radar, funnel, waterfall, candlestick, boxplot, sankey, bubble, range area, step line, histogram.

**Exit criteria:** ~24 types total. At Power BI built-in parity.

### Phase 3 — Interactivity & polish (2–3 weeks)

- Zoom/pan (dataZoom component) with DaisyUI-styled custom controls
- Brush selection + event output
- Drilldown pattern (click → load children, stack-push into config)
- Export: PNG, SVG, CSV of underlying data
- PDF snapshot via html2canvas (or deferred)
- Animation presets tied to `motion` directive

### Phase 4 — Dashboard primitives (v2, separate plan)

Not in this doc. Candidates: `<hk-chart-grid>`, cross-chart filter manager, saved-view serialization.

---

## 7. Open questions & risks

1. **SSR deferral default.** Current plan: no internal `@defer`, document the pattern. Revisit if 10+ charts on an SSR'd page cause measurable TTI regression.
2. **Keyboard nav shim.** ECharts doesn't ship per-point keyboard focus out of the box. The shim is small but needs prototyping in Phase 0 alongside the theme bridge. If it's more than ~200 lines, escalate.
3. **Testing environment.** Vitest + jsdom has no `HTMLCanvasElement`. Decision: force `renderer: 'svg'` in test environment via a test-only override. Don't ship `canvas` mock — too heavy, fragile.
4. **Data volume.** Power BI handles 1M+ points via aggregation. §5.4.5 documents the guidance and we ship LTTB + time-bucket helpers. No auto-sampling.
5. **Geospatial.** Deferred. If a consumer asks, options are echarts's geo module or a separate `@hakistack/ng-daisyui-maps` sub-package. Flag this early.
6. **Semantic color palettes.** Power BI ships sequential, diverging, and qualitative scales. Build a small hand-curated set keyed to DaisyUI semantic colors + a few universal scientific palettes (viridis, magma, cividis). No `d3-scale-chromatic` dependency — inline the ~8 palettes we actually use.
7. **Internal-use constraint.** Library is currently UNLICENSED/internal. ECharts is Apache 2.0 — permissive, no obligation for internal use. If the library ever goes public, Apache 2.0 is still compatible with most downstream licenses. Safe either way.
8. **ECharts major-version upgrades.** We pin to a minor range in `peerDependencies`. Upgrade path documented per minor, breaking changes in ECharts major → our major.

---

## 8. First concrete tasks (if we proceed)

In order:

1. Hold §4.5 decision review. Record all six as ✅ in the table.
2. Rename `<hk-org-chart>` → `<hk-organization-chart>`. Ship as a separate PR before any chart work.
3. Spike: add `echarts` peer dep, build minimal `<hk-chart>` rendering one hardcoded line chart, measure fesm delta + lazy chunk size against Phase 0 budget.
4. Theme bridge prototype: `DaisyUIThemeService` with signal, verify three-theme live switch within one animation frame.
5. Keyboard nav shim spike — prove it's feasible in <200 lines before committing to the a11y workstream.
6. Build `createChart<T>()` with discriminated union for `kind: 'line' | 'column'` only — prove the type ergonomics and data contract before expanding.
7. Demo app route + one interactive example, wired into the nav (`Data Display` section or new `Charts` section).

Stop after step 7 and review all Phase 0 exit criteria before committing to Phase 1.

---

## Appendix A — Rejected approaches

- **Hand-rolled D3 components per chart type.** Maximum flexibility, but easily 6+ months of work for Power BI parity, and we'd be rebuilding features ECharts gives us for free.
- **Multiple engines (Chart.js for simple, ECharts for advanced).** Fragments the DX and doubles the bundle surface consumers eventually pay for. Rejected.
- **Eager static import of ECharts in the library.** Would blow the 150 kB budget. Rejected.
- **Highcharts.** Licensing prohibitive for non-personal use.
- **Wide-format data input.** Ambiguous when combined with aggregation; caller pivots via shipped helper instead.
- **Silent aggregation on duplicate x+series rows.** Rejected in favor of dev-mode warning + documented default.
- **Deep-equality diffing on `data` input.** O(n) on every CD cycle kills performance for large datasets. Reference equality + documented immutability contract instead.
- **Per-chart `MutationObserver` for theme changes.** Wasteful on dashboards. Single `providedIn: 'root'` service instead.
- **Internal `@defer` wrapper in `<hk-chart>`.** Removes consumer control over SSR/hydration tradeoffs. Documented pattern instead.
- **axe as a11y exit criterion.** Floor, not ceiling. Real screen-reader testing required per chart.

---

## Appendix B — Change log

- **v3 (2026-04-23):** Phase 0 complete. Revised §4.5 #6 bundle budget: feature-scaled numbers (main fesm holds at 150 kB brotli, per-kind wrapper <2 kB, first-chart lazy chunk <200 kB gzip, +20 kB per additional kind) replace the unrealistic v2 flat targets. Exit criteria in §6 re-aligned to revised budget and all four now ✅ met. Spike-measured values recorded inline as evidence.
- **v2 (2026-04-22):** Added §4.5 locked-decisions table. Expanded §5.4 into full data contract (shape, aggregation, nulls, immutability, volume). Added §5.7 SSR section. Promoted a11y (§5.8) to parallel workstream. Tightened Phase 0 exit criteria to falsifiable numbers. Split Phase 1 into 1 (6 charts) + 1.5 (5 charts). Added transitive module enumeration to §5.2. Added tooltip encapsulation caveat to §5.3.1. Moved theme observation to dedicated service.
- **v1 (2026-04-22):** Initial draft.
