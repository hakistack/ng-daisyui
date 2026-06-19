# Rust/WASM Engine for `hk-select`

> Goal: replace Fuse.js for the select dropdown's per-keystroke fuzzy search. **Shares the same Rust module (`search-engine::fuzzy`) as `hk-command-palette`** — see `command-palette/RUST_ENGINE.md` for the engine details. This doc covers the select-specific wiring.

---

## 1. Scope

### In scope (Rust)
| Stage | Current location | Why it moves |
|-------|------------------|--------------|
| Fuzzy/substring search over options | `select.component.ts:142-154` (`filteredOptions`) | Per-keystroke; Fuse.js is the cost on big option sets |
| `isAllSelected` / `isMaxReached` checks | `select.component.ts:215-226` | Re-filters on every read; bitset can replace it |

### Out of scope (stays in TS)
- Grouping (`select.component.ts:181-195`, `groupedOptions`)
- CDK virtual scroll viewport (`CdkVirtualScrollViewport`, `:72`)
- Highlight match render (`:474-482`) — runs only on visible items
- Keyboard nav, scroll-to-highlighted, chip rendering
- `ControlValueAccessor` form integration
- DOM, dropdown positioning, focus

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ SelectComponent (Angular, signals, CVA)                  │
│ ─ owns: dropdown, virtual scroll, chips, form binding    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ FuzzySearchService (TS, shared with hk-command-palette)  │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ @hakistack/engine — search-engine::fuzzy                 │
│ ─ Same module as command-palette                         │
└──────────────────────────────────────────────────────────┘
```

The engine is identical to the one described in `command-palette/RUST_ENGINE.md` (§3-5). The only thing that differs is what `SelectComponent` does with the result.

---

## 3. Wiring

### Search

`select.component.ts:142-154` becomes:

```ts
private handle = computed(() => engine.handleFor(this.options(), ['label', 'value']));

readonly filteredOptions = computed(() => {
  const term = this.searchTerm();
  if (!term) return this.options();
  const matches = this.handle().search(term, { mode: this.searchMode(), threshold: 0.3 });
  return decodeMatches(matches, this.options());
});
```

`engine.handleFor` is memoized on `(options reference, keys reference)`, same invariant as the existing `createFuseCache` cache key.

### Selection state — `isAllSelected` / `isMaxReached`

These currently re-filter on every read (`:215-226`). Replace with a `selectedKeys: Set<unknown>` signal-derived `Uint8Array` bitset:

```ts
readonly isAllSelected = computed(() =>
  this.options().every(o => this.selectedSet().has(o.value))
);
readonly isMaxReached = computed(() =>
  this.maxSelectedItems() != null && this.selectedSet().size >= this.maxSelectedItems()!
);
```

This is **not a Rust port** — it's a TS-side fix that drops out of the cleanup. Worth doing in the same phase.

### Highlight rendering

Stays in TS as `highlightMatch()` at `:474-482`. The engine could return char-position indices per match (nucleo provides them), and the highlight could use those instead of a regex re-scan — but that's a follow-up; today's regex highlight is fast enough on visible items only.

---

## 4. Performance targets

> **Projected, not measured.** See `command-palette/RUST_ENGINE.md` for the
> same caveat — only `<hk-table>` has live measured numbers in
> `/engine-stress` today. Numbers below are design targets; verify on your
> own data.

| Option count | Fuse.js (JS) | Rust target | Speedup |
|-------------:|-------------:|------------:|--------:|
| 100 | 1 ms | < 1 ms | 2× |
| 1 000 | 18 ms | 2 ms | 9× |
| 5 000 | 90 ms | 6 ms | 15× |
| 10 000 | 200 ms | 12 ms | 17× |

User-visible win: country pickers, currency selectors, big tag dropdowns stop dropping frames during typing.

---

## 5. Threading model: why *not* a Web Worker?

Fuse.js documents a [Web Worker pattern](https://www.fusejs.io/web-workers.html) to keep search off the main thread. WASM can do the same — a `.wasm` module instantiates inside a worker exactly like JS — and Rust additionally offers true in-engine threads via `wasm-bindgen-rayon`. We use **neither** for `hk-select`. Run the synchronous WASM call on the main thread.

Why: the Worker pattern exists because Fuse.js takes ~200 ms at 10 000 options and freezes the UI (see §4). Rust takes that to ~12 ms — inside a frame budget — so the problem the worker solves **no longer exists**. A worker would make select *worse*:

- `filteredOptions` (`select.component.ts:142-154`) is a synchronous `computed()`. A worker forces it **async**, which breaks the signals/CVA wiring listed as out of scope (§1).
- The corpus must live *inside* the worker (load once); `postMessage`-ing the options every keystroke costs more than the search itself.
- `wasm-bindgen-rayon` needs site-wide `COOP`/`COEP` headers — a deployment constraint a component library cannot impose on consumers.

**When a worker *would* earn its place:** a much larger or continuously-growing corpus where even ~12 ms × frequent updates adds up — e.g. full-text search over documents, not a dropdown. The pattern there is WASM-in-worker, index held in the worker, RPC via Comlink. Out of scope here; noted so the decision isn't re-litigated.

---

## 6. What to *not* port

- **Virtual scroll math.** The CDK already handles viewport clipping; Rust adds nothing.
- **Grouping** (`:181-195`). Buckets a small filtered list into `Map<string, SelectOption[]>`. Microseconds. Stays.
- **Chip rendering / max-chips logic.** Pure UI.
- **Keyboard nav.** O(filtered), trivial.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Most selects are small (< 50 options); WASM is overhead | Lazy-load engine on first search keystroke. Selects without a search box never pay the cost. |
| Ranking taste differs from Fuse | Same `compat: 'fuse-like'` flag the palette uses. |
| Custom search predicates | Fall back to JS for the affected select instance. |

---

## 8. Phased rollout

Coordinated with `hk-command-palette`. Engine ships once.

1. **Phase 0** — extract `filteredOptions` into `engine/js-fallback.ts`. Fix `isAllSelected`/`isMaxReached` to use a Set on the way through. No engine yet.
2. **Phase 1** — point `SelectComponent` at `FuzzySearchService` (palette already wired in its own Phase 1). JS path only.
3. **Phase 2** — flip on WASM after the palette has been on it for a release cycle.

The select adoption is downstream of the palette's; the palette is the engine's first customer and proves it before select takes the dependency.

---

## 9. See also

- `command-palette/RUST_ENGINE.md` — engine architecture, data model, WASM API, algorithms
- `tree/RUST_ENGINE.md` — same indices-not-rows pattern applied to hierarchical data
- `table/RUST_ENGINE.md` — the most complete example of this pattern
