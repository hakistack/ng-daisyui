# Rust/WASM Engine — library-wide overview

This is the index for the per-component Rust engine plans, plus a record of which components were evaluated and **not** ported, with reasons.

---

## Components with a Rust engine plan

| Component | ROI | Plan |
|-----------|-----|------|
| `table` *(DataGrid)* | **High** — full DataGrid: filter / search / sort / tree / group / aggregate / inline edit / column reorder+resize / sticky cols / row reorder / master-detail / export. Most leverage of any component. | [`table/RUST_ENGINE.md`](table/RUST_ENGINE.md) |
| `pdf-viewer` | **High** — full-document substring search per keystroke on multi-MB PDFs | [`pdf-viewer/RUST_ENGINE.md`](pdf-viewer/RUST_ENGINE.md) |
| `tree` | **High** — recursive filter/flatten/cascade on trees of thousands of nodes | [`tree/RUST_ENGINE.md`](tree/RUST_ENGINE.md) |
| `command-palette` | **High** (with select) — Fuse.js per keystroke on potentially large item sets | [`command-palette/RUST_ENGINE.md`](command-palette/RUST_ENGINE.md) |
| `select` | **High** (shares engine) — same Fuse.js bottleneck, different host | [`select/RUST_ENGINE.md`](select/RUST_ENGINE.md) |

### Workspace architecture

All Rust code lives in a single Cargo workspace, `hakistack-engine/`, sitting at the repo root next to `projects/`. Two crates own infrastructure; the rest are feature engines that depend on `engine-core`:

- **`engine-core`** — pure Rust primitives shared by every engine: Unicode-aware string folding, bitsets, tree arenas (`parent_of` / `first_child` / `next_sibling` / Euler tour), `memmem` wrappers, FxHash aliases, `Uint32Array` result encoders. No `wasm-bindgen` dep, so it's testable with plain `cargo test`.
- **`engine-wasm`** — single `wasm-bindgen` umbrella that re-exports every engine through one .wasm bundle, published as the npm package `@hakistack/engine`.
- **`table-engine`** — filter / search / sort / group / aggregate / tree-flatten kernels for `hk-table`.
- **`tree-engine`** — filter / flatten / selection cascade / descendant test for `hk-tree`.
- **`search-engine`** — `fuzzy` module (bitap / `nucleo-matcher`) for `hk-command-palette` + `hk-select`; `pdf` module (substring / regex with offset map) for `hk-pdf-viewer`.
- **`form-engine`** — *planned*. Condition evaluator + validator pipeline + field-dependency graph for `hk-dynamic-form`. Pays off at 100+ fields with dense `showWhen` / `requiredWhen` rules — turns per-keystroke O(N×R) re-eval into incremental O(touched-rules). See `crates/form-engine/README.md` for the full plan + phased rollout.

Trade-off acknowledged: a single `engine-wasm` bundle means apps using only `<hk-select>` still download table + tree + pdf code. With reasonable Rust hygiene the bundle stays under ~250 KB gzipped. If that becomes a problem, `wasm-bindgen`'s per-feature entry points can split it later without restructuring the crates.

---

## Components evaluated and *not* ported

The decision below is based on the analysis in this conversation. If usage patterns shift (much larger datasets, new computation in a hot path), revisit.

### `editor` — **No port**

> `editor/`, ~1700 lines

- The editor is a TipTap (= ProseMirror) wrapper. The compute is owned by ProseMirror's transaction system, which is deeply DOM-coupled and cannot be moved to WASM without rewriting TipTap.
- Slash-command filtering runs on ~15 items — substring match, microseconds.
- HTML serialization happens per save, not per keystroke.
- **No bottleneck exists**. Porting would mean re-implementing TipTap, not optimizing it.

If anything ever justifies Rust here, it's a *different* feature: server-side HTML sanitization or markdown ↔ HTML conversion in a worker. That's outside the editor component's scope.

### `virtual-scroller` — **No port**

> `virtual-scroller/`, ~350 lines

- Wraps Angular CDK's virtual scroll. CDK handles viewport math, clipping, and item recycling.
- Component-level compute is: array slice for grid rows (O(n), cheap) and a linear scan over the visible+buffer window for null placeholders (O(50–200) items).
- No allocations in the hot path; no per-frame compute that would benefit from WASM.
- **Better lever**: optimize `trackBy` and template work in TS, not the scroller.

### `dynamic-form` — **No port** (revisit at scale)

> `dynamic-form/`, ~3000 lines

- Angular `ReactiveFormsModule` (`FormGroup`, `FormControl`, validators, `valueChanges`) is the substrate; it cannot be replaced.
- Conditional logic engine (`showWhen` / `hideWhen` / `requiredWhen` / `disabledWhen`) currently evaluates ~150 conditions per keystroke on a 50-field form — sub-millisecond.
- Validators are either Angular built-ins (already optimized) or user-supplied predicates (call out to JS no matter what).
- Auto-save diffing runs on a 1-second debounce.

**Revisit only if:** forms regularly exceed 100 fields with 50+ cross-field rules, profiling shows condition evaluation > 50 ms/keystroke, and user predicates are demonstrably the slow part. In that case, port only the *condition engine* (operator dispatch + dependency graph), keep everything else in TS.

### `datepicker` — **No port**

> `datepicker/`, ~1600 lines

- Calendar grid is a fixed 42-cell render — O(1) per month.
- `Intl.DateTimeFormat` for locale formatting is already C++ inside V8/JSC.
- Only theoretical concern: linear `disabledDates` scan if it grows to 10k+ entries. Mitigation is a TS `Set` lookup, not Rust.
- DOM, signals, keyboard nav stay in TS regardless.

**No compute bottleneck exists.** Porting would add bundle size with zero user-visible win.

### `timepicker` — **No port**

> `timepicker/`, ~2150 lines

- Clock-dial drag uses `Math.atan2` / `cos` / `sin` per pointer event (~60 events/sec). Per-event cost is microseconds in modern JS engines.
- Input parsing runs at human typing speed (~10/sec). ~50 µs each.
- I/O-bound (DOM, focus, signals), not compute-bound.
- Profile-first: if neither component appears in flame graphs, optimization ROI is zero.

### `notification`, `alert`, `toast`, `dialog-wrapper`, `tab`, `stepper`, `input` — **No port**

Pure UI components. No data pipelines, no per-keystroke compute, no bulk operations. Optimization belongs in the templates and change-detection strategy, not in WASM.

---

## Cross-cutting principles (apply to every plan)

These are the constants — every per-component doc applies them.

1. **Indices, not rows.** Ingest data once on input change; queries return `Uint32Array` of indices. Avoids the marshalling cost that defeats naive WASM ports.
2. **Pre-fold strings at ingest.** Lowercase / NFKC once; never per keystroke.
3. **Lazy-load WASM.** Engine module fetched on first user interaction, not on app boot.
4. **Keep a JS fallback.** It is the reference implementation for parity tests, and it covers SSR / no-WASM environments.
5. **Custom user predicates fall back to JS** for the single instance that uses them. Hybrid is fine.
6. **Phased rollout per component.** Phase 0 always extracts the current TS code into a pure-function module behind a service shim — that ships first with no behavior change.
7. **Default `mode: 'auto'`.** WASM when loaded, JS otherwise. Apps can opt out with a provider for SSR or bundle-size reasons.

---

## Repository layout

```
ui-library-workspace/
├── projects/                          # Angular workspace (unchanged)
│   └── hakistack/ng-daisyui/
│       └── src/lib/
│           ├── components/            # engine adapters live as services here
│           └── wasm/                  # build-wasm.mjs copies output here
├── hakistack-engine/                  # Rust workspace
│   ├── Cargo.toml                     # [workspace] members = ["crates/*"]
│   ├── crates/
│   │   ├── engine-core/               # pure Rust shared primitives, no wasm-bindgen
│   │   ├── engine-wasm/               # single wasm-bindgen umbrella → @hakistack/engine
│   │   ├── table-engine/
│   │   ├── tree-engine/
│   │   ├── search-engine/             # fuzzy + pdf modules
│   │   └── form-engine/               # planned — README + phased rollout
│   └── pkg/                           # wasm-pack output (gitignored)
├── scripts/
│   └── build-wasm.mjs                 # runs `wasm-pack build` against engine-wasm
└── package.json
```

Notes:
- `hakistack-engine/` sits at the workspace root, **not** under `projects/`. It's not Angular code, it doesn't go through `ng-packagr`, and `wasm-pack` builds it independently.
- `scripts/build-wasm.mjs` runs `wasm-pack build --target web crates/engine-wasm`, then copies the output into `projects/hakistack/ng-daisyui/src/lib/wasm/` for development, or publishes `@hakistack/engine` to the registry for releases. Reuses the existing `scripts/` convention rather than introducing a new `tools/`.
- `engine-core` is testable natively (`cargo test -p engine-core`) without the WASM toolchain, which keeps the inner-loop fast.
- The Angular library lazy-imports `@hakistack/engine` on first use of any engine-backed feature; apps not using engine-backed components never pay the bundle cost.

---

## Order of work (recommended)

1. **`engine-core` + `table-engine`** — most leverage, most code, sets the patterns and shared primitives every other engine reuses.
2. **`search-engine` (fuzzy module)** + `command-palette` — small, isolated, proves the engine pattern on a second component.
3. **`select`** — picks up `search-engine::fuzzy` for free.
4. **`search-engine` (pdf module)** + `pdf-viewer` — same crate, second module.
5. **`tree-engine` + `tree`** — last of the high-ROI set; reuses arena primitives already in `engine-core`.

Each step is independently shippable. If priorities change after step 1, the rest of the order can be re-shuffled.
