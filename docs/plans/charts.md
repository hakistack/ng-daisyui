# Charts Module — Planning Document

> Status: **Draft / Proposal**
> Owner: @josedr
> Target library: `@hakistack/ng-daisyui`
> Last updated: 2026-04-22

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

**v1 minimum viable set:** column, bar, line, area, pie, donut, scatter, combo, gauge, KPI card, sparkline. That's 11 types covering ~70% of real dashboard usage.

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

### Complementary: **Chart.js** (optional, for KPI + sparkline)

Considered keeping ECharts as the single engine. Likely correct — a sparkline as an ECharts line chart with all chrome stripped is ~the same payload once the engine is loaded. Don't fragment the engine choice.

**Decision: one engine, ECharts. Revisit only if a specific chart type ECharts can't do well shows up.**

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
├── themes/
│   ├── daisyui-theme-bridge.ts # reads CSS vars → builds echarts theme
│   └── palettes.ts             # sequential, diverging, qualitative scales
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
└── chart.component.spec.ts
```

### 5.2 Engine loading strategy

ECharts must be **lazy-loaded** to keep the library's 150 kB budget intact:

- Library source: `import('echarts/core')` inside `afterNextRender`. No top-level static import.
- Only register the chart modules actually needed for the active config (`use([LineChart, CanvasRenderer, GridComponent, TooltipComponent])`).
- Use a module registry map: `{ 'line': () => import('echarts/charts').then(m => m.LineChart), ... }` so one chart type pulls one module.
- Declare `echarts` in **`peerDependencies`** with `peerDependenciesMeta: { echarts: { optional: true } }`. Document that consumers using `<hk-chart>` must `npm install echarts`.

This mirrors what we just did for quill (lazy editor), but taken one step further: even the engine itself is only pulled when a chart renders.

### 5.3 Theming

DaisyUI themes expose CSS custom properties (`--color-primary`, `--color-success`, etc.). Build a `daisyuiThemeBridge()` helper that:

1. Reads the current theme's CSS vars from `getComputedStyle(document.documentElement)`.
2. Produces an ECharts theme object with:
   - `color` array from `[primary, secondary, accent, info, success, warning, error, neutral]`
   - `backgroundColor: 'transparent'` (so charts sit on DaisyUI surfaces)
   - `textStyle.color` from `--color-base-content`
   - axis/split line colors from `--color-base-300`/`--color-base-200` at appropriate opacities
3. Subscribes to `data-theme` attribute changes on `<html>` via `MutationObserver` and re-renders (signal-driven).

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

Known nuances (not blockers, but decisions we lock in during Phase 0):

1. **CSS doesn't cascade into the chart.** ECharts renders to canvas/SVG and inlines styles as attributes — external CSS rules targeting the SVG don't apply. We **must** read CSS vars in JS (`getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`) and inject them into the config. That's the bridge's job.
2. **Live theme switches require a `MutationObserver`.** When `<html data-theme>` changes, CSS updates instantly but ECharts keeps the old compiled theme. The bridge observes the attribute and calls `chart.setOption()` with refreshed colors within a frame.
3. **Tooltips are HTML portals — this is a feature, not a limitation.** ECharts lets us return raw HTML for tooltips, so DaisyUI classes work directly: `<div class="card bg-base-100 shadow-xl p-3">…</div>`. Tooltips are indistinguishable from the rest of the UI.
4. **Built-in chrome is stylable but dated.** ECharts' default toolbox (export/zoom/restore buttons) and dataZoom handles accept colors, but the bundled icons look outdated. The clean move is to **disable ECharts' built-ins** and rebuild that chrome with DaisyUI components — `<button class="btn btn-ghost btn-sm">` controlling the chart through the controller API (`exportPng()`, `resetZoom()`, etc.). This produces a *more* native result than theming the defaults ever would.

Non-negotiable: the bridge must prove itself against at least 3 contrasting themes (e.g. `kaizen`, `dark`, `cupcake`) before Phase 1 starts. If colors don't live-update cleanly across theme switches in Phase 0, we stop and reconsider the engine choice — there is no "mostly themed" acceptable middle state here.

### 5.4 Public API (draft)

```typescript
// Builder
const chart = createChart({
  kind: 'column',
  data: salesData,
  x: 'month',
  y: ['revenue', 'cost'],
  stacked: false,
  title: 'Q1 Performance',
  legend: { position: 'top' },
  tooltip: { shared: true, valueFormatter: (v) => `$${v.toLocaleString()}` },
  yAxis: { label: 'USD' },
  colors: 'primary',             // palette key OR array of CSS vars
  onPointClick: (point) => { ... },
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

interface ChartConfig<T = any> {
  kind: ChartKind;
  data: readonly T[];
  title?: string | { text: string; subtext?: string };
  legend?: boolean | LegendConfig;
  tooltip?: boolean | TooltipConfig;
  colors?: PaletteKey | readonly string[];
  // kind-specific fields narrowed via discriminated union in the builder
  ...
}
```

Mirror `createTable`/`createForm` so the DX is familiar. Use discriminated unions so that, e.g., `kind: 'pie'` doesn't expose `xAxis`, and `kind: 'combo'` requires a `series` array with per-series kinds.

### 5.5 Reactivity

- `<hk-chart>` takes `config` as an `input()`. Changes trigger `setOption(newOpts, { notMerge: true })` on the ECharts instance.
- Separate `data` input so that data-only updates call `setOption({ series: [...] }, { lazyUpdate: true })` — no full re-render.
- Outputs: `chartReady`, `pointClick`, `legendSelect`, `brushSelect`, `zoom`.
- Controller pattern like `FormController`: `createChart()` returns `{ config, update, getInstance, exportPng, exportSvg, resize }` for imperative control.

### 5.6 A11y

- Enable ECharts' built-in `aria.enabled = true` and `aria.decal.show = true` (adds patterns as a redundant channel for color).
- Keyboard: arrow-key navigation through data points when focused (ECharts needs a small shim — track this as a risk).
- Each chart gets a screen-reader-only `<table>` fallback rendering the underlying data (like Power BI's "Show data" feature).
- High-contrast mode: bridge reads `--color-base-content` and switches palette to ensure AA contrast on all series.

---

## 6. Phased rollout

### Phase 0 — Foundation (1–2 weeks)

- Add `echarts` as optional peer dep.
- Build `<hk-chart>` shell component with lazy engine loader.
- DaisyUI theme bridge (live-updating).
- `createChart()` builder with discriminated-union typing.
- Demo app scaffold: `/chart/basic` route.

**Exit criteria:** A hardcoded line chart renders, respects theme, changes when theme toggles, no bundle regression (>10 kB) in fesm.

### Phase 1 — Core charts (2–3 weeks)

Implement P0: column, bar, line, area, pie, donut, scatter, combo, gauge, KPI card, sparkline.

Each chart gets:
- Typed option builder in `kinds/*.ts`
- Demo tab in table-demo-style subroute (`/chart/column`, `/chart/line`, etc.)
- Unit test with Vitest + jsdom for option shape
- Docs: API table, code block

**Exit criteria:** 11 chart types live, all themed, all a11y-passing under axe.

### Phase 2 — Advanced charts (3–4 weeks)

P1: heatmap, treemap, sunburst, radar, funnel, waterfall, candlestick, boxplot, sankey, bubble, range area, step line, histogram.

**Exit criteria:** ~24 types total. We're at Power BI built-in parity.

### Phase 3 — Interactivity & polish (2 weeks)

- Zoom/pan (dataZoom component)
- Brush selection + event output
- Drilldown pattern (click → load children, stack-push into config)
- Export: PNG, SVG, CSV of underlying data
- PDF snapshot via html2canvas (or deferred)
- Animation presets tied to `motion` directive

### Phase 4 — Dashboard primitives (v2, separate plan)

Not in this doc. Candidates: `<hk-chart-grid>`, cross-chart filter manager, saved-view serialization.

---

## 7. Open questions

1. **SSR.** ECharts needs `window`. Our existing components are SSR-safe via `isPlatformBrowser` guards. Confirm the lazy-load pattern handles SSR cleanly (render skeleton during SSR, hydrate on client).
2. **Testing.** Vitest + jsdom doesn't have `HTMLCanvasElement`. We likely need `canvas` mock or use SVG renderer exclusively in tests. Decide before Phase 0.
3. **Bundle budget.** Current fesm limit is 150 kB and we're at 115 kB. Chart component source itself should be <20 kB — the engine is a peer dep so it doesn't count, but the wrapper code must stay lean. Enforce via size-limit.
4. **Data volume.** Power BI handles 1M+ points via aggregation. We should document a "virtualize above N points" guidance; ECharts' canvas renderer handles ~100k points well, beyond that we need sampling helpers.
5. **Geospatial.** Deferred. If a consumer asks, options are echarts-for-weixin's geo module or a separate `@hakistack/ng-daisyui-maps` sub-package. Flag this early.
6. **Semantic color palettes.** Power BI ships sequential, diverging, and qualitative scales. Build or pull from `d3-scale-chromatic` (separate small dep)? Lean toward a small hand-curated set keyed to DaisyUI semantic colors + a few universal scientific palettes (viridis, magma).
7. **Internal-use constraint.** Library is currently UNLICENSED/internal. ECharts is Apache 2.0 — permissive, no obligation for internal use. If the library ever goes public, Apache 2.0 is still compatible with most downstream licenses. Safe either way.
8. **Naming.** `<hk-chart>` conflicts visually with `<hk-org-chart>` (organization chart, already in the library). Consider renaming the existing one to `<hk-org-chart>` → `<hk-organization-chart>` before shipping, or accept the ambiguity. Discuss before Phase 0.

---

## 8. First concrete tasks (if we proceed)

In order:

1. Spike: add `echarts` peer dep, build minimal `<hk-chart>` rendering one hardcoded line chart, measure fesm delta.
2. Theme bridge prototype: toggle `data-theme` on `<html>`, confirm chart recolors within one frame.
3. Decide renderer default (SVG vs canvas) for each chart kind — document in `chart.types.ts` JSDoc.
4. Build `createChart<T>()` with discriminated union for `kind: 'line' | 'column'` only — prove the type ergonomics before expanding.
5. Demo app route + one interactive example, wired into the nav (`Data Display` section or new `Charts` section).

Stop after step 5 and review before committing to Phase 1 fully.

---

## Appendix A — Rejected approaches

- **Hand-rolled D3 components per chart type.** Maximum flexibility, but easily 6+ months of work for Power BI parity, and we'd be rebuilding features ECharts gives us for free.
- **Multiple engines (Chart.js for simple, ECharts for advanced).** Fragments the DX and doubles the bundle surface consumers eventually pay for. Rejected.
- **Eager static import of ECharts in the library.** Would blow the 150 kB budget. Rejected.
- **Highcharts.** Licensing prohibitive for non-personal use.
