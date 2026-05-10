# Rust/WASM Engine for `hk-tree`

> Goal: move the recursive walks (filter / flatten / selection cascade) of the tree component into a Rust core. Keep DOM, drag-drop visuals, and signals in TS.

---

## 1. Scope

### In scope (Rust)
| Stage | Current location | Why it moves |
|-------|------------------|--------------|
| Visibility filter (lenient/strict) | `tree.component.ts:171-194` (`filterState`) | Per-keystroke DFS over the whole tree; rebuilds visibility + ancestor propagation each time |
| Flatten with state | `tree.component.ts:224-285` (`flatNodes`) | DFS that builds path arrays and ancestry masks on every state change |
| Parent / key indexes | `tree.component.ts:145-168` (`parentByNode`, `nodeByKey`) | Built once per input change via recursive walk |
| Selection cascade (checkbox) | `tree.component.ts:819-893` (`selectDescendants`, `updateParentSelection`) | Recursive O(n) traversals on each toggle |
| Ancestor / descendant checks | `tree.component.ts:944-953` (`isDescendant`) | Walks parent chain; called per drag-over event |

### Out of scope (stays in TS)
- All rendering (DOM, templates, drag-drop visuals)
- Signals: `expandedKeys`, `selectedKeys`, `focusedKey`, `dropTargetKey`, `dropPositionSignal`
- Keyboard / mouse / pointer event handlers
- Lazy-load callbacks, drag-drop callbacks
- Angular change detection lifecycle

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ TreeComponent (Angular, signals, OnPush)                 │
│ ─ owns: rendering, drag-drop, keyboard, signals          │
│ ─ inputs: nodes, config, selection, filterText           │
│ ─ outputs: selectionChange, nodeExpand, lazyLoad, …      │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ TreeEngineService (TS, providedIn: 'root')               │
│ ─ wraps the WASM module                                  │
│ ─ JS fallback for SSR / opt-out                          │
└────────────────────────────┬─────────────────────────────┘
                             │  wasm-bindgen
                             ▼
┌──────────────────────────────────────────────────────────┐
│ @hakistack/engine (single .wasm, lazy-loaded)            │
│ ─ tree-engine crate: filter / flatten / selection / anc. │
│ ─ depends on engine-core for arenas + string folding     │
│ ─ Returns Uint32Array of node-key-ids in display order   │
└──────────────────────────────────────────────────────────┘
```

**Same principle as the table engine:** ingest the tree once, exchange only key-id arrays at query time. The Angular layer holds the original node objects and renders by id-lookup.

---

## 3. Data model

The arena type lives in `engine-core` (shared with the table's tree mode); the kernels that consume it live in `tree-engine`.

```rust
// hakistack-engine/crates/engine-core/src/arena.rs

pub struct TreeArena {
    n_nodes: u32,
    parent_of: Vec<i32>,        // -1 for roots
    first_child: Vec<i32>,      // index into children, -1 if leaf
    next_sibling: Vec<i32>,     // sibling chain
    depth_of: Vec<u8>,
    label_lc: Vec<Box<str>>,    // pre-folded labels for filter
    user_keys: Vec<u64>,        // FxHash of caller's key for round-trip
}
```

Pre-folding labels at ingest is the same trick as in the table engine. Filter at the keystroke is a `memmem` against an already-prepared buffer.

The "first child / next sibling" representation walks the tree without recursion (a single index walk replaces the JS DFS at `:224-285`).

---

## 4. Public WASM API

```rust
#[wasm_bindgen]
pub struct TreeHandle(/* opaque */);

#[wasm_bindgen]
impl TreeHandle {
    /// Build the arena from the current node array. Called when `nodes` input changes by reference.
    pub fn ingest(nodes: JsValue, key_field: &str, label_field: &str, children_field: &str) -> TreeHandle;

    /// Compute visibility from a filter term + mode. Returns a packed bitset (Uint8Array).
    /// Mode: "lenient" (ancestors of matches stay visible) | "strict" (only matches).
    pub fn filter(&self, term: &str, mode: &str, case_sensitive: bool) -> Uint8Array;

    /// Flatten the visible & expanded slice. Returns Uint32Array of (key_id, depth, has_children).
    pub fn flatten(&self, visible: &Uint8Array, expanded: &Uint32Array) -> Uint32Array;

    /// Cascade selection down a subtree. Returns the new selected-keys delta.
    pub fn select_descendants(&self, root_key_id: u32) -> Uint32Array;

    /// Recompute parent indeterminate / selected state given a child key.
    /// Returns Uint32Array of (parent_key_id, state) where state ∈ {0=clear, 1=selected, 2=indeterminate}.
    pub fn cascade_up(&self, selected: &Uint32Array, changed_key_id: u32) -> Uint32Array;

    /// True if `maybe_descendant` is in the subtree of `root`. Used per drag-over.
    pub fn is_descendant(&self, root_key_id: u32, maybe_descendant_key_id: u32) -> bool;

    pub fn dispose(self);
}
```

Returning a packed bitset from `filter` (one bit per node) lets `flatten` consume it cheaply — no re-traversal of an "is visible" lookup per node.

---

## 5. Algorithms

### 5.1 Filter (lenient / strict)
Single linear pass over the arena:
1. Walk nodes in postorder (using `first_child`/`next_sibling`, no recursion).
2. Mark a node as `match` if its `label_lc` contains the (pre-folded) needle via `memmem`.
3. In **lenient** mode: bubble visibility up — a node is visible if it matches OR any descendant matches.
4. In **strict** mode: a node is visible only if it matches.

Output: bitset of length `n_nodes`. Building one is O(n) and allocation-free after the first call (reuse the buffer).

### 5.2 Flatten
Iterative depth-first walk over the arena. For each node, push `(key_id, depth, has_children)` if the bitset says visible *and* every ancestor is in the `expanded` set (or root). One pass, no allocations beyond the output `Uint32Array`.

### 5.3 Selection cascade
- **Down**: subtree iteration from a root using the same iterative DFS. Skip subtrees whose root is a leaf. Returns the array of newly-selected key ids.
- **Up**: walk `parent_of` chain. For each ancestor, count selected vs total descendants in the cached children-range table to decide selected / indeterminate / clear. O(depth), not O(n).

### 5.4 Descendant test
With an Euler-tour / `entry_order` + `exit_order` precomputed at ingest, `is_descendant(a, b)` is O(1): `entry[a] < entry[b] < exit[a]`. Replaces the parent-chain walk used today on every drag-over.

---

## 6. Angular integration

`TreeComponent`'s computed chain:

```ts
// before
filterState = computed(() => { /* DFS */ });
flatNodes   = computed(() => { /* DFS */ });

// after
private handle = signal<TreeHandle | null>(null);
private visible = computed(() => this.handle()?.filter(filterText(), mode));
flatNodes = computed(() => {
  const h = this.handle(), v = this.visible();
  if (!h || !v) return jsFallback.flatten(...);
  const buf = h.flatten(v, expandedKeyIds());
  return decodeFlatten(buf, originalNodes());
});
```

`decodeFlatten` is a tiny TS function that turns the Uint32Array into `{ node, depth, hasChildren, ... }[]` by indexing the original nodes — the same shape the template already consumes.

Drag-over now calls `handle.is_descendant(root, candidate)` instead of `isDescendant(...)`. Same API at the call site.

Selection toggle calls `select_descendants` / `cascade_up`; the result Uint32Arrays are merged into the existing `selectedKeys` and `indeterminateKeys` signals.

### JS fallback
Move the current implementations into `engine/js-fallback.ts` (pure functions). The service auto-selects when WASM isn't available. Behavior must be identical — lenient / strict filter rules, selection semantics, all ported faithfully.

---

## 7. Performance targets

> **Projected, not measured.** Only `<hk-table>` has live measured numbers
> in `/engine-stress` today (~1.5–3× kernel speedup at 100k rows). The
> tree numbers below are design targets. Drag-over `is_descendant` is
> the only entry that's algorithmically obvious — Euler-tour interval
> check is genuinely O(1) vs O(depth) parent walk; the constant factor
> may be similar at small depths but the engine wins as trees deepen.

| Operation | 1k nodes | 10k nodes | 100k nodes |
|-----------|---------:|----------:|-----------:|
| Filter (per keystroke) | 1.5× | 5× | 12× |
| Flatten (after expand toggle) | 2× | 6× | 15× |
| Selection cascade (subtree of 1k) | 2× | 4× | 8× |
| Drag-over `is_descendant` | many× | many× | many× — O(1) vs O(depth) |

Filter is the user-visible win: typing in the filter box stays at 60 fps on 100k-node trees, where today it drops frames around 5k nodes.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Bundle size | Already a single `@hakistack/engine` bundle shared with table/search/tree; lazy-loaded once for the whole library |
| Custom user filter predicates | Fall back to JS for that single tree — partial hybrid is fine |
| Lazy-load nodes (children fetched on expand) | Re-ingest only the affected subtree via a `patch_subtree` API; full re-ingest if topology changes substantially |
| Node-key collisions on hash | Use 64-bit FxHash, fall back to TS-side string keys if collision detected during build |
| SSR / Node | JS fallback path; tree usually doesn't need to render in SSR anyway |

---

## 9. What this does *not* solve

- DOM rendering of thousands of expanded rows — that's still on the browser. Pair the engine with a CDK virtual scroll viewport for big trees.
- Drag-drop visuals — the engine answers "is X under Y?", but the placement preview, drop-line, and reorder logic stay in TS.
- Lazy-load latency — bound by the network call.

---

## 10. Phased rollout

1. **Phase 0** — extract `filterState`, `flatNodes`, `selectDescendants`, `updateParentSelection`, `isDescendant` into pure functions in `engine/js-fallback.ts`. No behavior change.
2. **Phase 1** — `TreeEngineService` consuming only the JS path.
3. **Phase 2** — Rust `TreeArena` + `filter` + `flatten` (covers the keystroke hot path). Parity tests vs JS fallback.
4. **Phase 3** — selection cascade + descendant test.
5. **Phase 4** — flip default to WASM with `provideTreeEngine({ mode: 'auto' })`.

Each phase is independently shippable; the JS fallback remains the reference.

---

## 11. Sharing with the table engine

The table engine already has a tree mode (`flattenTreeData`, `filterTreeData`, `sortTreeData` in `table.helpers.ts`). The arena layout, filter kernel, and flatten kernel proposed here are *the same shapes*.

Both engines consume `engine-core::arena::TreeArena` and the iterative DFS walkers in `engine-core`. The crate-specific code (`tree-engine`, `table-engine`) is thin: it wires the arena to the host-specific input shapes and emits the result format each component expects.

This is the upside of the `engine-core` + per-feature-crate architecture — primitives are shared by construction, without an extra crate or premature API lock-in.
