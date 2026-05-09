# Rust/WASM Engine for `hk-table`

> **Note on naming.** Despite the name, `hk-table` is a full **DataGrid**, not a display table. It already has inline cell editing (`enableInlineEditing`, `cellEditors`), column reorder + resize (`enableColumnReorder`, `resizeMode`, `columnWidths`), sticky/frozen columns (`stickyColumns`), row reorder, master-detail rows (`MasterDetailConfig`), child grids (`ChildGridConfig`), bulk actions, export to CSV/Excel/PDF/JSON, virtual scroll, server-side pagination, tree data, grouping with footer aggregates, fuzzy global search, and per-column filtering with operators. The compute pipeline this doc plans for Rust is sized for that workload, not a simple list view.

> Goal: move the hot-path data pipeline of `TableComponent` into a Rust core compiled to WebAssembly, while keeping the Angular surface (signals, templates, CDK DataSource) unchanged.

The existing TS pipeline is correct and feature-rich, but every keystroke in a filter or search box re-runs `filter → search → sort → flatten → paginate` over the full dataset in the JS main thread. That is fine for a few thousand rows; it falls over at 50k+ rows, deep trees, or complex multi-filter UI. A Rust engine targets exactly those bottlenecks.

---

## 1. Scope of the port

### In scope (Rust)
The compute pipeline downstream of raw `data: T[]`:

| Stage | Current location | Why it moves |
|-------|------------------|--------------|
| Column filtering | `table.component.ts:2730-2812` (`applyFilter`) | Per-row `toLowerCase`, per-row `Date.parse`, dispatch on every keystroke |
| Global search (literal modes) | `table.component.ts:670-729` | Per-field × per-row string scan, no index |
| Global search (fuzzy) | `performFuzzySearch` (Fuse.js) | JS-only; pure Rust fuzzy matcher (e.g. `nucleo-matcher`, `sublime_fuzzy`) is ~5–10× faster and gives better scoring |
| Sorting | `table.component.ts:732-750`, `compareValues:2640-2687` | Locale-aware comparisons are expensive in V8 |
| Tree filter / flatten / sort | `table.helpers.ts:816-918` | Recursive clones; can be a single arena-allocated pass |
| Aggregates | `table-aggregates.ts:1-92` | Median sorts every call; group/footer recompute on each data change |
| Grouping | `table.helpers.ts:742-802` | Hash group + per-group aggregates in one pass |
| Row-key generation / hashing | `generateRowKey` | Avoid `JSON.stringify` fallback |

### Out of scope (stays in TS)
- Angular signals, `computed`, effects, `OnPush` wiring
- CDK DataSource/connect/disconnect, virtual scroll viewport
- PipeRegistry, formatters, observable cell pipes (UI/i18n)
- Template rendering, cell/footer/expansion templates
- HTML cache, ARIA wiring, DaisyUI classes
- Cursor-mode pagination (server does the work)
- Pagination math (negligible)

The boundary is intentional: Rust returns plain row indices (or sliced arrays) and metadata; Angular renders.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│ TableComponent (Angular, signals, OnPush)               │
│ ─ inputs: data, config, paginationOptions               │
│ ─ outputs: filter/sort/page/selection events            │
│ ─ owns: templates, formatters, virtual scroll           │
└────────────────────────────┬────────────────────────────┘
                             │  push: data + config diffs
                             ▼
┌─────────────────────────────────────────────────────────┐
│ TableEngineService (TS facade, providedIn: 'root')      │
│ ─ wraps the WASM module                                 │
│ ─ owns dataset handle + per-table state                 │
│ ─ batches calls, debounces, marshals                    │
│ ─ falls back to JS pipeline if WASM unavailable         │
└────────────────────────────┬────────────────────────────┘
                             │  wasm-bindgen calls
                             ▼
┌─────────────────────────────────────────────────────────┐
│ @hakistack/engine (single .wasm, lazy-loaded)            │
│ ─ table-engine crate: filter / sort / group / tree       │
│ ─ depends on engine-core for arenas + string folding     │
│ ─ Returns row-index views, never copies row payloads     │
└─────────────────────────────────────────────────────────┘
```

### Key principle: indices, not rows
Rather than ship row objects in and out of WASM, ship row payloads **once**, hold them in a Rust arena, and from then on exchange only `Uint32Array` indices. Angular renders by indexing back into its original JS array.

This avoids JSON copy on every keystroke, which dominates naive WASM ports.

---

## 3. Data model in Rust

```rust
// hakistack-engine/crates/table-engine/src/dataset.rs

pub struct Dataset {
    n_rows: u32,
    columns: HashMap<ColumnId, Column>,
    // Pre-derived row keys for tree/selection
    row_keys: Vec<u64>,       // FxHash of trackBy field
    parent_of: Option<Vec<i32>>, // -1 if root, for tree mode
    children_of: Option<Vec<Range<u32>>>,
    depth_of: Option<Vec<u8>>,
}

pub enum Column {
    Text {
        values: Vec<Box<str>>,
        // case-folded once; reused for every keystroke
        normalized: Vec<Box<str>>,
    },
    Number(Vec<f64>),               // NaN = null
    Bool(Vec<Option<bool>>),
    Date(Vec<i64>),                 // ms epoch, i64::MIN = null
    Enum {
        codes: Vec<u16>,            // dictionary-encoded
        dict: Vec<Box<str>>,
    },
}
```

Notes:
- Strings are normalized (lowercase, NFKC if locale-aware) **once** at ingest; filters then run on `normalized` and never repeat the work.
- Dates are stored as `i64` epoch-ms, parsed once.
- Selects/multiselects use dictionary encoding so equality filtering is `u16 == u16`.
- Tree topology is stored as parent-pointer + cached children-range per node, so filter/flatten is a single linear pass with no recursion.

### Schema inference
On first ingest, the engine inspects `ColumnDefinition.type` (already in `table.types.ts`) and chooses a column kind. If `type` is missing, it samples the first 64 values to infer.

---

## 4. Public WASM API (wasm-bindgen)

```rust
#[wasm_bindgen]
pub struct TableHandle(/* opaque */);

#[wasm_bindgen]
impl TableHandle {
    /// Ingest rows. Called when `data` input changes by reference.
    /// `rows` is a transferred Uint8Array of MessagePack-encoded rows
    /// OR a JsValue array (chosen at compile time via feature flag).
    pub fn ingest(rows: JsValue, schema: JsValue) -> TableHandle;

    /// Update only changed rows by row-key. Used for streaming inserts.
    pub fn patch(&mut self, patches: JsValue);

    /// Apply filters + global search + sort and return a Uint32Array
    /// of matching row indices, in display order.
    pub fn query(&self, q: JsValue /* QueryDef */) -> Uint32Array;

    /// Tree mode: returns flattened rows as { index, depth, hasChildren, expanded }.
    pub fn flatten(&self, expanded: &Uint32Array) -> JsValue;

    /// Aggregates over the current view. Returns f64 array per requested fn.
    pub fn aggregate(&self, indices: &Uint32Array, fns: JsValue) -> Float64Array;

    /// Grouping: returns group buckets [{key, indices, agg}].
    pub fn group(&self, indices: &Uint32Array, by: &str, fns: JsValue) -> JsValue;

    /// Page slice — convenience to avoid an extra round-trip.
    pub fn page(&self, indices: &Uint32Array, page: u32, size: u32) -> Uint32Array;

    pub fn dispose(self);
}
```

`QueryDef` is a small POJO:

```ts
type QueryDef = {
  filters: ColumnFilter[];        // mirrors current TableFilter type
  search?: { term: string; mode: 'contains'|'startsWith'|'exact'|'fuzzy';
             keys?: string[]; excludeFields?: string[]; caseSensitive?: boolean;
             fuzzy?: { threshold: number; minMatchCharLength: number;
                       ignoreLocation: boolean } };
  sort?: { field: string; direction: 'asc'|'desc'; nullsLast?: boolean }[];
};
```

Multi-field sort is added for free in Rust — TS has it on the wishlist already.

---

## 5. Algorithms

### 5.1 Filters
- One `Filter` enum per column kind: `TextFilter { op, needle_lc }`, `NumberFilter { op, lo, hi }`, `DateFilter { op, lo, hi }`, `EnumFilter { op, codes_bitset }`.
- Build a `Vec<RowMask>` of length `n_rows / 64` (bitset). For each filter, AND its bitset into the result.
- Text needles are lowercased once per query, never per row.
- Operators: `contains/startsWith/endsWith/equals/notEquals/notContains` are fast on `&str` with `memchr` / `memmem`.

### 5.2 Global search
- Literal modes: same bitset trick; OR across configured keys.
- Fuzzy: use `nucleo-matcher` (the engine behind helix/fzf) — already SIMD-accelerated where supported. Returns `(index, score)`; sort by score then secondary by configured tie-breaker.
- Cache the haystack (already-normalized text columns); invalidate when `data` ref changes or `searchableKeys` changes — same invariant as today's `createFuseCache`.

### 5.3 Sort
- Multi-field stable sort over the surviving indices using `slice::sort_by` with a composite comparator.
- Locale-aware string sort uses `icu_collator` (feature-gated; off by default to keep WASM small — fall back to byte/`str::cmp` when locale isn't required).
- Tree sort: sort children within each parent, no clones (rewrite parent_of + children_of arrays).

### 5.4 Tree flatten
- Single linear pass over `parent_of`, push to output when ancestor chain is fully expanded.
- Filter + flatten can be fused: a child match marks all ancestors visible (one-pass postorder).

### 5.5 Aggregates
- Single-pass kernels for sum/avg/min/max/count/trueCount/falseCount/distinctCount (FxHashSet of u64-encoded values).
- Median uses `select_nth_unstable` (quickselect, O(n)) instead of full sort.
- Per-group aggregates run in the same pass that builds the group buckets.

### 5.6 Grouping
- Hash by group-by column (dictionary-encoded if Enum, FxHash otherwise) → buckets of `Vec<u32>` indices.
- Per-bucket aggregates streamed in the same loop.

---

## 6. Angular integration

### `TableEngineService`
Singleton, lazy-loaded WASM:

```ts
@Injectable({ providedIn: 'root' })
export class TableEngineService {
  private modPromise = import('@hakistack/engine'); // wasm-pack output of engine-wasm
  private mod?: HakistackEngineModule;
  readonly available = signal(false);

  async warmup(): Promise<void> { /* load wasm, set available */ }

  createHandle<T>(rows: readonly T[], schema: TableSchema): TableHandleProxy<T> {
    if (!this.mod) throw new EngineUnavailable();
    return new TableHandleProxy(this.mod, rows, schema);
  }
}
```

### `TableHandleProxy`
Thin wrapper that:
1. Owns the WASM `TableHandle`
2. Holds the original JS rows by reference (engine returns indices; proxy resolves to row objects)
3. Disposes on `ngOnDestroy`

### Wiring into `TableComponent`
Replace the existing computed chain:

```
filteredDataSignal → globalSearchedDataSignal → sortedDataSignal
  → flattenedTreeDataSignal → displayDataSignal → currentDataSignal
```

with a single `viewIndicesSignal = computed(() => engine.query({ filters, search, sort }))`, then:

```ts
displayDataSignal = computed(() =>
  viewIndicesSignal().map(i => originalDataSignal()[i])
);
```

The fallback path (when WASM is unavailable or feature-flagged off) keeps the current TS implementation byte-for-byte. Behavior must be identical — same operators, same locale rules, same null handling.

### Feature flag
A `provideTableEngine({ mode: 'auto' | 'wasm' | 'js' })` provider lets apps opt in. Default `'auto'`: use WASM when loaded, otherwise JS.

---

## 7. Marshalling cost & how to keep it small

The naive cost (serialize every row to MessagePack on each query) would erase the gains. The plan:

1. **Ingest once.** Rows enter Rust on `data`-input change (reference equality), not per-query.
2. **Indices, not rows.** Queries return `Uint32Array`; the JS side does `rows[i]`.
3. **Patch API.** For streaming inserts/updates, send only the diff by row-key.
4. **Schema cached.** `QueryDef` is small (filters + sort + search); ~hundreds of bytes per call.
5. **Zero-copy where possible.** Use `js-sys::Uint32Array::view` for index returns.

Expected steady-state per-keystroke marshal: **< 1 KB in, ~`4 × n_visible` bytes out**.

---

## 8. Repository layout

The `table-engine` crate lives in the workspace-wide `hakistack-engine/` Cargo workspace (see `RUST_ENGINE_OVERVIEW.md` for the full layout). Only the table-relevant pieces are shown here:

```
ui-library-workspace/
├── hakistack-engine/                       # Rust workspace (root level)
│   └── crates/
│       ├── engine-core/                    # arenas, string folding, bitsets
│       ├── engine-wasm/                    # umbrella wasm-bindgen surface
│       └── table-engine/
│           ├── Cargo.toml                  # depends on engine-core
│           ├── src/
│           │   ├── lib.rs                  # pure Rust API (no wasm-bindgen)
│           │   ├── dataset.rs
│           │   ├── filter.rs
│           │   ├── search.rs               # literal + fuzzy (uses search-engine)
│           │   ├── sort.rs
│           │   ├── tree.rs
│           │   ├── aggregate.rs
│           │   ├── group.rs
│           │   └── schema.rs
│           └── tests/
│               └── parity.rs               # cargo test, native, no WASM
└── projects/hakistack/ng-daisyui/src/lib/components/table/
    ├── engine/
    │   ├── table-engine.service.ts         # wraps @hakistack/engine
    │   ├── table-handle.proxy.ts
    │   ├── table-engine.types.ts
    │   └── js-fallback.ts                  # current pipeline, extracted
    └── table.component.ts                  # uses engine via service
```

The wasm-bindgen surface for the table lives in `engine-wasm`, not in `table-engine` itself — `table-engine` stays a pure Rust library so it's testable with `cargo test` natively.

Build step adds `npm run build:wasm` (which calls `scripts/build-wasm.mjs` → `wasm-pack build --target web hakistack-engine/crates/engine-wasm`, optimized via `wasm-opt -O3`), and `npm run build` runs it before `ng-packagr`.

---

## 9. Testing strategy

The existing `table.component.spec.ts` (2148 lines) is the ground truth. Strategy:

1. **Parity harness.** Run the same `(data, config)` through both pipelines and assert deep equality of `displayDataSignal` and aggregate outputs. Add to `table.component.spec.ts` as a parameterized describe block.
2. **Property tests.** In Rust, `proptest` over filter operators × random data to confirm no panics and idempotence (`query(query(x)) == query(x)` where applicable).
3. **Bench corpus.** 1k / 10k / 100k / 1M-row fixtures; track timings in CI to catch regressions.
4. **Locale tests.** Ensure `localeCompare` parity for the locales the app actually uses (en, es) — extend if needed.

---

## 10. Performance targets

Indicative on a mid-tier laptop (M2 / Chrome), versus current TS pipeline:

| Operation | 10k rows | 100k rows | 1M rows |
|-----------|---------:|----------:|--------:|
| Filter (text contains, 1 col) | 1.3× faster | 4× faster | 8× faster |
| Filter (3 columns mixed) | 2× | 6× | 12× |
| Sort (string, locale) | 1.5× | 4× | 7× |
| Fuzzy search | 3× | 6× | 10× |
| Tree filter+flatten (depth 4) | 2× | 5× | n/a (JS OOMs) |
| Group + aggregate | 2× | 5× | 10× |

The headline case is **typing in a filter on a 100k-row table**: today this drops a few frames per keystroke; with the engine it stays under 16 ms.

---

## 11. Phased rollout

1. **Phase 0 — Extraction.** Refactor the current TS pipeline into pure functions in `engine/js-fallback.ts`. No behavior change. Ship.
2. **Phase 1 — Service shim.** Introduce `TableEngineService` with only the JS path. `TableComponent` consumes it. Still no behavior change.
3. **Phase 2 — Rust core.** Implement `dataset` + `filter` + `sort` + `query` with parity tests. Ship behind `provideTableEngine({ mode: 'wasm' })` flag, opt-in.
4. **Phase 3 — Tree + group + aggregate.** Cover the rest of the pipeline.
5. **Phase 4 — Default on.** Flip `mode: 'auto'`. Keep JS fallback for SSR (Node + WASM is fine, but allow apps to disable for cold-start budget).
6. **Phase 5 — Multi-field sort, indexed search, web-worker offload.** Features that are awkward in TS but trivial once the engine exists.

Each phase is independently shippable and reversible.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Bundle size grows (WASM ~150–250 KB gzipped) | Lazy-load on first table mount; ship without locale tables by default |
| SSR / Node parity | Use universal wasm bundle; document `provideTableEngine({ mode: 'js' })` for SSR |
| Locale `Intl.Collator` parity | Use `icu_collator` only when `sortFn` is locale-sensitive; document supported locales |
| Behavior drift from JS | Parity test harness on every PR; JS path stays as the reference |
| Marshal overhead defeats gains | Index-only API + ingest-once invariant (§7) |
| Custom user `sortFn` / filter predicates | Fall back to JS for that single column when a function is supplied — partial JS-Rust hybrid is fine |
| Streaming data mutations | `patch()` API by row-key; full re-ingest if reference changes |

---

## 13. What this does *not* solve

- Render time of 100k DOM rows — that needs virtual scrolling (already in place via CDK).
- Network/server latency in cursor mode — engine is bypassed there.
- Memory pressure if apps hold gigantic tables in memory — WASM heap is bounded; same problem either way.

The engine narrows the gap between "what the data layer could do" and "what 60 fps on a laptop allows." DOM is still the ceiling.

---

## 14. Future DataGrid features — where each one fits

Three features were flagged as "missing for full DataGrid parity." The right home for each is *not* the same.

### 14.1 Spreadsheet-style cell keyboard navigation

**Status today:** Skeleton present (`table.component.ts:2040-2125`). Arrow keys, Home/End, Ctrl+Home/End, Enter-to-edit, Escape, Space-to-select-row are all wired.

**Missing:** Tab / Shift+Tab to advance one cell, **F2** to enter edit (Excel convention; Enter currently does it), Page Up / Page Down, Ctrl+Arrow to jump to data boundaries.

**Where it lives:** **Pure TS, in `TableComponent`.** This is keyboard event handling and DOM focus; there is no compute. Rust adds zero value.

**Effort:** ~50 lines in `onTableKeydown` to add the missing key cases, plus a `boundary-jump` helper that walks the current view to find the next non-empty cell. No engine work.

### 14.2 Range selection (drag-select multiple cells)

A spreadsheet user clicks a cell, drags to another cell, and gets a rectangular selection that they can copy (Ctrl+C → TSV/CSV) or see live aggregates for ("Sum: 1234, Avg: 56" in the status bar, like Excel).

**Pieces:**

| Concern | Where | Why |
|---|---|---|
| Mouse drag detection, hit-testing, visual outline | TS | Pure DOM/pointer-event work |
| `Set<{row, col}>` of selected cells | TS | Small state, signal-friendly |
| Copy → TSV/CSV serialization | TS | Cell formatters live there; ~ms even for thousands of cells |
| **Live aggregates of selection** ("Sum / Avg / Count of selected cells") | **Rust** | Already a kernel: `engine.aggregate(indices, fns)`. Returns instantly even on 100k-cell selections |
| Range fill (Excel's drag handle to repeat a value or pattern) | TS | Trivial |

**Verdict:** ~90% TS, with a single Rust call for the live-aggregate readout if you want the Excel-style status bar. The engine already exposes `aggregate()` — no new Rust work needed; just a new TS consumer.

### 14.3 Pivot / cross-tab views

A pivot table is: pick `N` row-axis fields, `M` column-axis fields, `K` value fields with aggregations, and produce a 2-D matrix where each cell is `agg_k(rows where row_axes match X and col_axes match Y)`.

**This is the big one.** Pivots are exactly the workload Rust + WASM is built for:

- Inputs scale fast: 100k rows × 5 row dims × 3 col dims × 4 aggregations = millions of bucket lookups.
- The compute is pure: hash multi-key into a sparse matrix, stream aggregates per bucket, sort axis labels.
- The output is small: a dense or sparse 2-D index matrix that the TS side renders.
- It maps cleanly onto the engine's existing primitives (`engine-core::bitset`, `table-engine::group`, `table-engine::aggregate`).

**Proposed:** a new `table-engine::pivot` module exposed through `engine-wasm`:

```rust
// hakistack-engine/crates/table-engine/src/pivot.rs

pub struct PivotSpec<'a> {
    pub row_axes: &'a [ColumnId],
    pub col_axes: &'a [ColumnId],
    pub values:   &'a [(ColumnId, AggFn)],
    pub filters:  &'a [FilterDef],
    pub subtotals: bool,
}

pub fn pivot(dataset: &Dataset, spec: &PivotSpec) -> PivotResult;
// PivotResult is a flat (row_idx, col_idx, value) sparse triple stream
// + axis label arrays to render headers.
```

WASM API (added to `TableHandle`):

```rust
pub fn pivot(&self, spec: JsValue) -> JsValue;
// returns { rowLabels, colLabels, cells: Float64Array, presence: Uint8Array }
```

**TS side:** a new `<hk-pivot-grid>` component (or `mode: 'pivot'` on `<hk-table>`) that consumes the result and renders the matrix with collapsible row/column headers, drill-down, frozen first column. ~1k lines of TS, no compute.

**ROI:** Very high *if* pivots matter to your users. For 100k-row datasets a TS pivot would block the main thread for seconds; in Rust it's tens of milliseconds. If pivots aren't a real ask, skip it — pivot UI is non-trivial work and the engine plan should follow user demand, not feature-list parity with ag-grid.

### 14.4 Multi-column sort (already mentioned in §5)

Worth restating here: the engine adds this for free via `slice::sort_by` with a composite comparator. The TS surface needs only a column-header click handler that builds a sort-spec array (Shift+click adds a sort tier). Small TS PR + zero engine work; the engine is already multi-sort capable.

---

## 15. Open questions

1. Do we want the engine to be a separate npm package (`@hakistack/table-engine`) or live inside `@hakistack/ng-daisyui`? Separate keeps it framework-agnostic (could power a React adapter) but doubles release plumbing.
2. Locale collation: opt-in via `sortFn: 'locale'` on the column, or always-on? Always-on costs ~80 KB ICU.
3. Web Worker: run the WASM on the main thread (simpler, no postMessage cost) or in a worker (off the main thread, but every query crosses postMessage)? Recommendation: main thread by default, worker as opt-in via `provideTableEngine({ worker: true })`.
4. MessagePack vs `JsValue` for ingest: MessagePack is faster for large tables but adds a ~10 KB dep. Recommendation: `JsValue` for < 10k rows, MessagePack auto-switch above.
