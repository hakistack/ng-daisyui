# Rust/WASM Engine for `hk-command-palette`

> Goal: replace Fuse.js for the command-palette's per-keystroke fuzzy search. Lives in the `search-engine` crate's `fuzzy` module; same engine is shared with `hk-select` (see `select/RUST_ENGINE.md`). Sibling module `search-engine::pdf` powers `hk-pdf-viewer`.

---

## 1. Scope

### In scope (Rust)
| Stage | Current location | Why it moves |
|-------|------------------|--------------|
| Fuzzy search + scoring | `command-palette.component.ts:366-379` (via `runFilter` + Fuse cache) | Per-keystroke; Fuse.js is the slowest thing on the path |
| Substring fallback | `lib/utils/fuse-cache.ts` (`substringFilter`) | Trivial, but lives in the same kernel for consistency |
| Result ranking & tie-break | inside Fuse today | Better algorithms available in Rust (`nucleo-matcher`) |

### Out of scope (stays in TS)
- Mode prefix detection (`:96-103`) — string ops, negligible
- Grouping by `group` id (`:161-182`) — small post-filter, negligible
- Selection navigation (`:381-391`) — O(filtered)
- DOM (dialog, list rendering, focus, hotkeys)
- Controller dispatch (`open`, `close`, `setQuery`, ...)
- Lifecycle callbacks (`onSelect`, `onOpen`, ...)

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ CommandPaletteComponent (Angular, signals)               │
│ ─ owns: dialog, input, list, mode prefix, grouping       │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ FuzzySearchService (TS, providedIn: 'root')              │
│ ─ wraps the WASM module                                  │
│ ─ shared with hk-select                                  │
│ ─ JS fallback: substring + simplified bitap              │
└────────────────────────────┬─────────────────────────────┘
                             │  wasm-bindgen
                             ▼
┌──────────────────────────────────────────────────────────┐
│ @hakistack/engine (single .wasm, lazy-loaded)            │
│ ─ search-engine::fuzzy module                            │
│ ─ Matchers: substring (memchr), nucleo-matcher           │
│ ─ Returns Uint32Array of (index, score)                  │
└──────────────────────────────────────────────────────────┘
```

**Same indices-not-rows principle** as the other engines. Items are ingested once on the input change; each keystroke ships only the query string.

---

## 3. Data model

```rust
// hakistack-engine/crates/search-engine/src/fuzzy/index.rs
// String folding + memmem helpers come from engine-core.

pub struct FuzzyIndex {
    n_items: u32,
    keys: Vec<KeyColumn>,        // one per searchable field
}

pub struct KeyColumn {
    name: Box<str>,
    haystacks: Vec<Box<str>>,    // raw text per item (or empty)
    folded:    Vec<Box<str>>,    // pre-lowercased / NFKC
}
```

Pre-folding once is the same trick as elsewhere — no per-keystroke `toLowerCase`.

---

## 4. Public WASM API

```rust
#[wasm_bindgen]
pub struct FuzzyHandle(/* opaque */);

#[wasm_bindgen]
impl FuzzyHandle {
    /// Build the index from items + an array of key paths.
    /// `getters` is a pre-extracted JS array of arrays of strings:
    /// getters[itemIndex][keyIndex] = stringValue
    pub fn ingest(getters: JsValue, key_names: JsValue) -> FuzzyHandle;

    /// Search and return Uint32Array of (item_index, score_u16) sorted by score desc.
    pub fn search(&self, query: &str, opts: JsValue /* SearchOpts */) -> Uint32Array;

    pub fn dispose(self);
}
```

```ts
type SearchOpts = {
  mode: 'substring' | 'fuzzy';
  caseSensitive?: boolean;
  threshold?: number;          // 0..1, lower = stricter
  minMatchCharLength?: number;
  maxResults?: number;
};
```

The TS side does the work the engine doesn't care about: grouping the result list by `group`, applying mode prefixes, mapping `item_index` back to the original item.

---

## 5. Algorithms

- **Substring mode**: `memchr::memmem` per key. OR across keys; first match wins for that item.
- **Fuzzy mode**: `nucleo-matcher` (the matcher behind helix / fzf). Returns `(score, indices)`; we keep score, drop indices since the palette doesn't currently render character highlights.
- **Ranking**: stable sort by score desc; secondary by the order items appear in the source list (preserves user intent).
- **Threshold filtering**: drop matches below `threshold`; default 0.3 to match Fuse's default.

Per-keystroke: ingest is skipped (already done), only the query crosses the boundary. Steady-state cost is dominated by `nucleo-matcher`'s SIMD-accelerated scoring.

---

## 6. Angular integration

`CommandPaletteComponent` already has a `filteredSignal` computed at `:111-159`. Replace its body:

```ts
// before
const fuse = createFuseCache(items, keys, options);
const matches = fuse.search(query);

// after
const handle = engine.handleFor(items, keys);   // memoized by ref
const buf = handle.search(query, { mode: 'fuzzy', threshold });
filtered = decodeMatches(buf, items);            // O(matches), not O(items)
```

`engine.handleFor` is a small TS-level memoizer keyed on `(items reference, keys reference)` — same invariant as the existing `createFuseCache`.

### JS fallback
Keep the current Fuse.js-based path as `engine/js-fallback.ts`. The service picks WASM when available, JS otherwise.

---

## 7. Performance targets

Indicative on a mid-tier laptop:

| Item count | Fuse.js (JS) | Rust target | Speedup |
|-----------:|-------------:|------------:|--------:|
| 100 | 2 ms | < 1 ms | 3× |
| 1 000 | 25 ms | 3 ms | 8× |
| 5 000 | 120 ms | 8 ms | 15× |
| 10 000 | 280 ms | 15 ms | 18× |

User-visible win: command palettes with 5k+ items (workspace switchers, big repo file pickers) stop feeling laggy.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Bundle size — adding WASM for what some apps treat as a small list | Lazy-load on first palette open; small palettes never pay the cost |
| Score parity with Fuse — apps that have tuned `threshold` to Fuse's curve | Document the change; expose a `compat: 'fuse-like'` mode that calibrates the threshold |
| Custom `filterStrategy: 'custom'` predicates | Fall back to JS for palettes using a custom function — engine never engages |
| Char-position highlighting (future feature) | nucleo returns match indices; expose them through a separate `search_with_indices` call when we wire highlighting |

---

## 9. What this does *not* solve

- DOM rendering of large filtered lists — pair with a virtualized list if a palette ever exceeds ~200 visible items.
- Mode-prefix UX, hotkey ergonomics, focus management — pure UI.
- Cross-language ranking taste — fuzzy ranking is opinion, not science. Expect to tune.

---

## 10. Phased rollout

Coordinated with `hk-select` since they share the engine.

1. **Phase 0** — extract palette's filter into `engine/js-fallback.ts`. No behavior change.
2. **Phase 1** — `FuzzySearchService` (lives in a shared `lib/services/` location since `hk-select` will also use it). JS path only.
3. **Phase 2** — `search-engine::fuzzy` module with substring + nucleo backends, exposed through `engine-wasm`. Parity tests against Fuse for the ranking taste check.
4. **Phase 3** — flip palette default to WASM. Wire `hk-select` next.
5. **Phase 4** — char-position highlighting for results (uses the indices nucleo already returns).

Each phase ships independently; JS fallback remains the reference.

---

## 11. Shared with `hk-select`

The same `FuzzySearchService` powers `hk-select`'s search box. Implementation is identical; only the post-filter logic (grouping, virtual-scroll coordination) differs. See `select/RUST_ENGINE.md`.

Sharing the `search-engine::fuzzy` module across the two components (and putting the `pdf` matcher in the same crate) avoids:
- Multiple parity test suites
- Drift in ranking behavior between palette and select
- Duplicated `engine-core` primitive imports

Everything ships as one `@hakistack/engine` bundle (see `RUST_ENGINE_OVERVIEW.md`).