//! `wasm-bindgen` umbrella for the hakistack engine.
//!
//! Built with `wasm-pack build --target web --out-dir <pkg>`. Published as
//! `@hakistack/engine`. The Angular library lazy-imports this on first use.
//!
//! ## Marshalling principle: indices, not rows
//!
//! Row payloads cross the JS↔WASM boundary **once**, at [`WasmDataset::ingest`].
//! From then on every query (filter, sort, group, aggregate) takes plain JSON
//! and returns a `Uint32Array` of row indices. The TS side resolves indices
//! back into row objects against its original array — no per-keystroke
//! serialization of row payloads.

use js_sys::{Array, Float64Array, Reflect, Uint8Array, Uint32Array};
use wasm_bindgen::prelude::*;

use engine_core::{FxHashMap, bitset::Bitset};
use form_engine::{
    FieldIdx as FormFieldIdx, FormEngine as KernelFormEngine, FormSchema as KernelFormSchema,
    PredicateResolver, Value as KernelValue, ValueMap,
};
use search_engine::{
    fuzzy::{FuzzyIndex, FuzzyOpts},
    pdf::{PdfIndex, SearchOpts as PdfSearchOpts},
};
use table_engine::{
    aggregate::{RowSet, compute as compute_aggregate},
    dataset::Dataset,
    filter::{ColumnFilter, apply as apply_filters},
    group::group_by_multi,
    search::{SearchSpec, apply_search},
    sort::{SortSpec, sort_indices},
};
use tree_engine::{
    cascade::{cascade_up as tree_cascade_up, select_descendants as tree_select_descendants},
    dataset::TreeDataset,
    filter::{FilterSpec as TreeFilterSpec, filter as tree_filter},
    flatten::flatten as tree_flatten,
};

mod convert;
mod wire;

use wire::{
    WireAggFn, WireAggResult, WireFilter, WireFormSchema, WireFormValue, WireFuzzyOpts, WireGroup,
    WirePdfSearchOpts, WireSchemaColumn, WireSearchSpec, WireSortSpec, WireTreeFilterSpec,
};

/// Called automatically when the module is instantiated.
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "debug-panics")]
    console_error_panic_hook::set_once();
}

/// Engine version string. Useful smoke-test export and debugging aid.
#[wasm_bindgen]
pub fn engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ─── WasmDataset ────────────────────────────────────────────────────────────

/// Handle to an ingested dataset. Hold one per table-component instance and
/// call [`WasmDataset::free`] in `ngOnDestroy` to release the WASM-heap memory.
#[wasm_bindgen]
pub struct WasmDataset {
    inner: Dataset,
}

#[wasm_bindgen]
impl WasmDataset {
    /// Build a dataset from columnar arrays.
    ///
    /// Arguments:
    /// - `n_rows`: total row count (every column array must match)
    /// - `schema`: `Array<{ id: number, kind: 'text' | 'number' | 'bool' | 'date' }>`
    /// - `columns`: `Array` of per-column payloads, same order and length as
    ///   `schema`. Wire shape depends on column kind:
    ///     - `text` ⇒ `(string | null)[]` (serde path — strings have no
    ///       packed typed-array form)
    ///     - `number` ⇒ `{ values: Float64Array, validity: Uint8Array }`
    ///     - `bool` ⇒ `{ values: Uint8Array (0/1), validity: Uint8Array }`
    ///     - `date` ⇒ `{ values: Float64Array (ms-epoch), validity: Uint8Array }`
    ///
    /// The typed-array pairs are bulk-copied into Rust via `TypedArray::to_vec`
    /// (one memcpy per column), then the validity `Uint8Array` is packed into
    /// a `Bitset` for word-at-a-time filter scans. This skips the per-row
    /// `Option<X>` wrapping that the prior all-serde path paid for —
    /// `serde_wasm_bindgen::from_value` allocated `N` heap Options per
    /// numeric column, dominating ingest time on large datasets.
    pub fn ingest(n_rows: u32, schema: JsValue, columns: Array) -> Result<WasmDataset, JsValue> {
        let schema: Vec<WireSchemaColumn> = serde_wasm_bindgen::from_value(schema)
            .map_err(|e| JsValue::from_str(&format!("schema parse error: {e}")))?;

        if columns.length() as usize != schema.len() {
            return Err(JsValue::from_str(&format!(
                "schema length ({}) does not match columns length ({})",
                schema.len(),
                columns.length(),
            )));
        }

        let mut builder = Dataset::builder(n_rows);

        for (i, col) in schema.iter().enumerate() {
            let col_js = columns.get(i as u32);
            match col.kind {
                wire::WireColumnKind::Text => {
                    // Text stays on serde — strings have no efficient
                    // typed-array form and the kernel needs owned `String`
                    // for fold + index. The text path is rarely the ingest
                    // bottleneck since fields are typically short.
                    let values: Vec<Option<String>> = serde_wasm_bindgen::from_value(col_js)
                        .map_err(|e| {
                            JsValue::from_str(&format!("column id {} (text): {e}", col.id))
                        })?;
                    // Numeric paths validate length inside extract_columnar_*;
                    // the text path must do it here, otherwise the builder's
                    // assert surfaces as an opaque WASM "unreachable" trap.
                    if values.len() as u32 != n_rows {
                        return Err(JsValue::from_str(&format!(
                            "column id {} (text): expected length {n_rows}, got {}",
                            col.id,
                            values.len()
                        )));
                    }
                    builder = builder.add_text(col.id, values);
                }
                wire::WireColumnKind::Number => {
                    let (values, validity) =
                        extract_columnar_f64(&col_js, n_rows, col.id, "number")?;
                    builder = builder.add_number_columnar(col.id, values, validity);
                }
                wire::WireColumnKind::Bool => {
                    let (values, validity) = extract_columnar_u8(&col_js, n_rows, col.id, "bool")?;
                    builder = builder.add_bool_columnar(col.id, values, validity);
                }
                wire::WireColumnKind::Date => {
                    let (values_f, mut validity) =
                        extract_columnar_f64(&col_js, n_rows, col.id, "date")?;
                    // JS Date.getTime() returns f64 ms-epoch; narrow to i64.
                    // Unchecked `f as i64` saturates ±∞ to ±i64::MAX/MIN and
                    // turns NaN into 0 — both surface as silently wrong dates.
                    // Treat non-finite / out-of-range as invalid: zero the
                    // slot and clear the validity bit so the kernel never
                    // reads the value. Mirrors how `add_number_columnar`
                    // handles NaN in numeric columns.
                    const I64_MIN_F: f64 = i64::MIN as f64;
                    const I64_MAX_F: f64 = i64::MAX as f64;
                    let mut values: Vec<i64> = Vec::with_capacity(values_f.len());
                    for (i, f) in values_f.into_iter().enumerate() {
                        if f.is_finite() && (I64_MIN_F..=I64_MAX_F).contains(&f) {
                            values.push(f as i64);
                        } else {
                            values.push(0);
                            validity.unset(i as u32);
                        }
                    }
                    builder = builder.add_date_columnar(col.id, values, validity);
                }
            }
        }

        Ok(WasmDataset {
            inner: builder.build(),
        })
    }

    pub fn n_rows(&self) -> u32 {
        self.inner.n_rows()
    }

    /// Apply filters, AND-combined. Empty filter list ⇒ all rows pass.
    /// Returns row indices in source order.
    pub fn filter(&self, filters: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: Vec<WireFilter> = serde_wasm_bindgen::from_value(filters)
            .map_err(|e| JsValue::from_str(&format!("filters parse error: {e}")))?;
        let kernel: Vec<ColumnFilter> = wire.into_iter().map(Into::into).collect();

        let mask = apply_filters(&self.inner, &kernel);
        Ok(uint32_array_from_bitset(&mask))
    }

    /// Apply a global multi-column search and return the matching-row mask.
    /// Empty term ⇒ empty result (caller composes with the filter mask, where
    /// "no search" means "no constraint added", not "everything matches").
    pub fn search(&self, spec: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: WireSearchSpec = serde_wasm_bindgen::from_value(spec)
            .map_err(|e| JsValue::from_str(&format!("search spec parse error: {e}")))?;
        let kernel: SearchSpec = wire.into();

        let mask = apply_search(&self.inner, &kernel);
        Ok(uint32_array_from_bitset(&mask))
    }

    /// Sort the given indices by a multi-tier sort spec, return the new order.
    /// Stable sort, so callers can chain by re-sorting the previous output.
    pub fn sort(&self, indices: &Uint32Array, specs: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: Vec<WireSortSpec> = serde_wasm_bindgen::from_value(specs)
            .map_err(|e| JsValue::from_str(&format!("sort specs parse error: {e}")))?;
        let kernel: Vec<SortSpec> = wire.into_iter().map(Into::into).collect();

        let mut idxs: Vec<u32> = indices.to_vec();
        sort_indices(&self.inner, &mut idxs, &kernel);
        Ok(uint32_array_from_slice(&idxs))
    }

    /// Compute one aggregate over the given column.
    ///
    /// `indices == null` ⇒ aggregate over the entire dataset
    /// (`RowSet::All`). Otherwise the aggregate runs over the supplied subset.
    pub fn aggregate(
        &self,
        column: u32,
        indices: Option<Uint32Array>,
        agg: JsValue,
    ) -> Result<JsValue, JsValue> {
        let wire_agg: WireAggFn = serde_wasm_bindgen::from_value(agg)
            .map_err(|e| JsValue::from_str(&format!("agg parse error: {e}")))?;

        // Hold the Vec on the stack so RowSet::Indices can borrow from it.
        let idx_vec_storage;
        let row_set = if let Some(arr) = indices.as_ref() {
            idx_vec_storage = arr.to_vec();
            RowSet::Indices(&idx_vec_storage)
        } else {
            RowSet::All
        };

        let kernel_result = compute_aggregate(&self.inner, column, row_set, wire_agg.into());
        let wire_result = WireAggResult::from(kernel_result);
        serde_wasm_bindgen::to_value(&wire_result)
            .map_err(|e| JsValue::from_str(&format!("agg serialize error: {e}")))
    }

    /// Multi-level group. Returns a tree of `WireGroup` nodes.
    /// `columns` is the chain of grouping fields (e.g. `[country_id, state_id]`).
    /// `indices == null` ⇒ group across the entire dataset.
    pub fn group(
        &self,
        columns: Vec<u32>,
        indices: Option<Uint32Array>,
    ) -> Result<JsValue, JsValue> {
        let idx_vec_storage;
        let row_set = if let Some(arr) = indices.as_ref() {
            idx_vec_storage = arr.to_vec();
            RowSet::Indices(&idx_vec_storage)
        } else {
            RowSet::All
        };

        let groups = group_by_multi(&self.inner, &columns, row_set);
        let wire_groups: Vec<WireGroup> = groups.into_iter().map(Into::into).collect();
        serde_wasm_bindgen::to_value(&wire_groups)
            .map_err(|e| JsValue::from_str(&format!("group serialize error: {e}")))
    }
}

// ─── WasmTree ───────────────────────────────────────────────────────────────

/// Handle to an ingested tree. Mirror of `WasmDataset` but for hierarchical
/// data: filter / flatten / cascade work on node indices; the JS side keeps
/// its original tree by reference and resolves indices back to nodes.
#[wasm_bindgen]
pub struct WasmTree {
    inner: TreeDataset,
}

#[wasm_bindgen]
impl WasmTree {
    /// Build a tree from a flat DFS-preorder representation.
    ///
    /// `labels[i]` is the i-th node's display label, `depths[i]` is its
    /// depth (0 = root). The JS side walks its hierarchical structure once
    /// and produces these flat arrays — much cheaper than nested objects
    /// across the boundary.
    pub fn ingest(labels: Vec<String>, depths: Vec<u8>) -> Result<WasmTree, JsValue> {
        // Length is duplicated by `TreeDataset::from_dfs` but we keep this
        // pre-check so the error message can include the actual lengths.
        if labels.len() != depths.len() {
            return Err(JsValue::from_str(&format!(
                "labels.length ({}) does not match depths.length ({})",
                labels.len(),
                depths.len()
            )));
        }
        TreeDataset::from_dfs(labels, depths)
            .map(|inner| WasmTree { inner })
            .map_err(|e| JsValue::from_str(&format!("tree ingest: {}", e)))
    }

    pub fn n_nodes(&self) -> u32 {
        self.inner.n_nodes()
    }

    /// Apply a label filter and return the visibility mask packed as a
    /// `Uint32Array` of *visible* node indices in source order.
    pub fn filter(&self, spec: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: WireTreeFilterSpec = serde_wasm_bindgen::from_value(spec)
            .map_err(|e| JsValue::from_str(&format!("tree filter spec parse error: {e}")))?;
        let kernel: TreeFilterSpec = wire.into();
        let mask = tree_filter(&self.inner, &kernel);
        Ok(uint32_array_from_bitset(&mask))
    }

    /// Flatten the tree, given which nodes are visible and which are expanded.
    /// Both inputs are `Uint32Array`s of node indices.
    ///
    /// Returns a packed `Uint32Array` of `(node, depth, has_children)` triples
    /// in DFS preorder. Length is `3 * row_count`. JS reads in groups of three.
    pub fn flatten(&self, visible: &Uint32Array, expanded: &Uint32Array) -> Uint32Array {
        let n = self.inner.n_nodes();

        // Materialize bitsets from the index arrays. This is faster than
        // round-tripping bitsets across the boundary (would need a separate
        // type) and JS already has the index arrays handy.
        let mut vis = Bitset::with_capacity(n);
        let visible_vec = visible.to_vec();
        for &i in &visible_vec {
            if i < n {
                vis.set(i);
            }
        }
        let mut exp = Bitset::with_capacity(n);
        let expanded_vec = expanded.to_vec();
        for &i in &expanded_vec {
            if i < n {
                exp.set(i);
            }
        }

        let rows = tree_flatten(&self.inner, &vis, &exp);
        let mut packed: Vec<u32> = Vec::with_capacity(rows.len() * 3);
        for r in rows {
            packed.push(r.node);
            packed.push(r.depth);
            packed.push(r.has_children);
        }
        uint32_array_from_slice(&packed)
    }

    /// Return every descendant of `root` in DFS preorder, including `root`.
    pub fn select_descendants(&self, root: u32) -> Uint32Array {
        let descendants = tree_select_descendants(&self.inner, root);
        uint32_array_from_slice(&descendants)
    }

    /// Cascade up from `changed`. Returns a packed `Uint32Array` of
    /// `(ancestor_idx, state)` pairs — `state` ∈ {0=clear, 1=selected, 2=indeterminate}.
    /// Length = `2 * ancestor_count`.
    pub fn cascade_up(&self, selected: &Uint32Array, changed: u32) -> Uint32Array {
        let n = self.inner.n_nodes();
        let mut sel = Bitset::with_capacity(n);
        let selected_vec = selected.to_vec();
        for &i in &selected_vec {
            if i < n {
                sel.set(i);
            }
        }

        let entries = tree_cascade_up(&self.inner, &sel, changed);
        let mut packed: Vec<u32> = Vec::with_capacity(entries.len() * 2);
        for (node, state) in entries {
            packed.push(node);
            packed.push(state as u32);
        }
        uint32_array_from_slice(&packed)
    }

    /// O(1) ancestor test using the arena's pre-computed Euler-tour intervals.
    pub fn is_descendant(&self, root: u32, candidate: u32) -> bool {
        let n = self.inner.n_nodes();
        if root >= n || candidate >= n {
            return false;
        }
        self.inner.arena.is_descendant(root, candidate)
    }
}

// ─── WasmFuzzyIndex ─────────────────────────────────────────────────────────

/// Handle to a fuzzy-search index. Powers `<hk-command-palette>` and
/// `<hk-select>` per-keystroke ranking, replacing Fuse.js. Each input string
/// becomes one searchable item; query results are returned as
/// `(item_index, score)` pairs sorted by score descending.
#[wasm_bindgen]
pub struct WasmFuzzyIndex {
    inner: FuzzyIndex,
}

#[wasm_bindgen]
impl WasmFuzzyIndex {
    /// Build an index from a flat list of strings. Index `i` in `items`
    /// is the index returned by `search`.
    pub fn ingest(items: Vec<String>) -> WasmFuzzyIndex {
        WasmFuzzyIndex {
            inner: FuzzyIndex::from_items(items),
        }
    }

    pub fn n_items(&self) -> u32 {
        self.inner.n_items()
    }

    /// Run a query. Returns a packed `Uint32Array` where consecutive pairs
    /// are `(item_index, score)`. Length is `2 × match_count`. JS reads in
    /// groups of two and decodes into `{ index, score }` records.
    ///
    /// `opts.max_results === 0` means "no cap" (all matches returned).
    pub fn search(&self, query: &str, opts: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: WireFuzzyOpts = serde_wasm_bindgen::from_value(opts)
            .map_err(|e| JsValue::from_str(&format!("fuzzy opts parse error: {e}")))?;
        let kernel: FuzzyOpts = wire.into();
        let results = self.inner.search(query, kernel);

        let mut packed: Vec<u32> = Vec::with_capacity(results.len() * 2);
        for (idx, score) in results {
            packed.push(idx);
            packed.push(score as u32);
        }
        Ok(uint32_array_from_slice(&packed))
    }
}

// ─── WasmPdfIndex ───────────────────────────────────────────────────────────

/// Handle to a PDF in-document search index. Pages are added lazily as PDF.js
/// produces text content via `getTextContent()`. Searches scan every ingested
/// page and return packed `(page, char_start, char_len)` triples that the
/// highlight painter resolves to text-layer DOM spans via [`resolve_hit`].
#[wasm_bindgen]
pub struct WasmPdfIndex {
    inner: PdfIndex,
}

#[wasm_bindgen]
impl WasmPdfIndex {
    /// Build an empty index for `page_count` pages. All pages start
    /// uningested; call [`add_page`] as PDF.js delivers each page's text.
    pub fn new(page_count: u32) -> WasmPdfIndex {
        WasmPdfIndex {
            inner: PdfIndex::new(page_count),
        }
    }

    pub fn n_pages(&self) -> u32 {
        self.inner.n_pages()
    }

    pub fn has_page(&self, page: u32) -> bool {
        self.inner.has_page(page)
    }

    /// Ingest a page's text items. `text_items` is the array PDF.js's
    /// `getTextContent().items.map(it => it.str)` produces — same order as
    /// the text-layer DOM spans, so item indices map back 1-to-1.
    pub fn add_page(&mut self, page: u32, text_items: Vec<String>) {
        self.inner.add_page(page, text_items);
    }

    /// Run a search across every ingested page. Returns a packed
    /// `Uint32Array` where each consecutive triple is
    /// `(page, char_start, char_len)`. Length is `3 × hit_count`.
    pub fn search(&self, query: &str, opts: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: WirePdfSearchOpts = serde_wasm_bindgen::from_value(opts)
            .map_err(|e| JsValue::from_str(&format!("pdf search opts parse error: {e}")))?;
        let kernel: PdfSearchOpts = wire.into();
        let hits = self.inner.search(query, kernel);

        let mut packed: Vec<u32> = Vec::with_capacity(hits.len() * 3);
        for h in hits {
            packed.push(h.page);
            packed.push(h.char_start);
            packed.push(h.char_len);
        }
        Ok(uint32_array_from_slice(&packed))
    }

    /// Resolve a hit to its text-item indices. Returns a 4-element
    /// `Uint32Array`: `(item_start, item_end, intra_start, intra_end)`.
    /// Empty array when the hit can't be resolved (page uningested, etc.).
    pub fn resolve_hit(&self, page: u32, char_start: u32, char_len: u32) -> Uint32Array {
        match self.inner.resolve_hit(page, char_start, char_len) {
            Some(r) => {
                uint32_array_from_slice(&[r.item_start, r.item_end, r.intra_start, r.intra_end])
            }
            None => Uint32Array::new_with_length(0),
        }
    }
}

// ─── WasmFormEngine ─────────────────────────────────────────────────────────

/// Handle to a form-engine instance. Owns the immutable schema, the
/// per-form runtime state (value map + visibility / required / disabled
/// bitsets), and the JS predicate registry for `function`-op conditions.
///
/// One handle per `<hk-dynamic-form>`; call `free()` (auto-generated by
/// wasm-bindgen) in `ngOnDestroy` to release WASM-heap memory.
#[wasm_bindgen]
pub struct WasmFormEngine {
    inner: KernelFormEngine,
    predicates: FxHashMap<u32, js_sys::Function>,
}

/// Resolver borrows the predicate registry by reference so the engine
/// can be mutated independently. The lifetime is per-call.
struct JsPredicateResolver<'a> {
    predicates: &'a FxHashMap<u32, js_sys::Function>,
}

impl<'a> PredicateResolver for JsPredicateResolver<'a> {
    fn resolve(&self, id: u32, _values: &ValueMap) -> bool {
        // Predicates are zero-arg thunks — the TS adapter closes over the
        // form's current values and reads them from there. Crossing the
        // boundary with the value map would defeat the dep-graph win we
        // came here for.
        match self.predicates.get(&id) {
            Some(f) => match f.call0(&JsValue::null()) {
                Ok(v) => v.as_bool().unwrap_or(false),
                Err(_) => false,
            },
            None => false,
        }
    }
}

#[wasm_bindgen]
impl WasmFormEngine {
    /// Build a new engine from a `WireFormSchema`. The schema is uploaded
    /// once; per-keystroke calls only ship value updates.
    pub fn ingest(schema: JsValue) -> Result<WasmFormEngine, JsValue> {
        let wire: WireFormSchema = serde_wasm_bindgen::from_value(schema)
            .map_err(|e| JsValue::from_str(&format!("form schema parse error: {e}")))?;
        let kernel: KernelFormSchema = wire.into();
        let predicates = FxHashMap::default();
        let resolver = JsPredicateResolver {
            predicates: &predicates,
        };
        let inner = KernelFormEngine::new(kernel, &resolver);
        Ok(WasmFormEngine { inner, predicates })
    }

    pub fn field_count(&self) -> u32 {
        self.inner.schema.field_count()
    }

    /// Resolve a field name to its index. Returns `u32::MAX` for unknown
    /// names — JS contract: the adapter caches this map once and never
    /// hits the lookup on the hot path.
    pub fn index_of(&self, name: &str) -> u32 {
        self.inner.schema.idx_of(name).unwrap_or(u32::MAX)
    }

    pub fn is_visible(&self, field: u32) -> bool {
        self.inner.is_visible(field)
    }

    pub fn is_required(&self, field: u32) -> bool {
        self.inner.is_required(field)
    }

    pub fn is_disabled(&self, field: u32) -> bool {
        self.inner.is_disabled(field)
    }

    /// Push a single field value. Returns a packed `Uint32Array` of
    /// `(kind, field, payload)` triples — empty when the value is the
    /// same as the previous one or no observable transition occurred.
    pub fn set_value(&mut self, field: u32, value: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: WireFormValue = serde_wasm_bindgen::from_value(value)
            .map_err(|e| JsValue::from_str(&format!("form value parse error: {e}")))?;
        let v: KernelValue = wire.into();
        let resolver = JsPredicateResolver {
            predicates: &self.predicates,
        };
        let events = self.inner.set_value(field, v, &resolver);
        Ok(pack_form_events(&events))
    }

    /// Batch write: array of `[field_idx, value]` pairs. Single dep-graph
    /// walk afterward, so two changes that touch the same downstream
    /// field only emit one transition event.
    pub fn set_values(&mut self, pairs: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: Vec<(u32, WireFormValue)> = serde_wasm_bindgen::from_value(pairs)
            .map_err(|e| JsValue::from_str(&format!("form patch parse error: {e}")))?;
        let kernel_pairs: Vec<(FormFieldIdx, KernelValue)> =
            wire.into_iter().map(|(i, v)| (i, v.into())).collect();
        let resolver = JsPredicateResolver {
            predicates: &self.predicates,
        };
        let events = self.inner.set_values(kernel_pairs, &resolver);
        Ok(pack_form_events(&events))
    }

    /// Full pass. Used by the TS adapter when an external signal moves
    /// (no `formValues` diff available) and `function`-predicate fields
    /// must be re-checked alongside every other conditional field.
    pub fn recompute_all(&mut self) -> Uint32Array {
        let resolver = JsPredicateResolver {
            predicates: &self.predicates,
        };
        let events = self.inner.recompute_all(&resolver);
        pack_form_events(&events)
    }

    /// Register a JS function-operator predicate. `id` is the value the
    /// schema's `WireFormValue::Callback { id }` will refer to; the
    /// function is zero-arg and returns boolean.
    pub fn register_predicate(&mut self, id: u32, evaluator: js_sys::Function) {
        self.predicates.insert(id, evaluator);
    }

    pub fn unregister_predicate(&mut self, id: u32) {
        self.predicates.remove(&id);
    }
}

fn pack_form_events(events: &[form_engine::Event]) -> Uint32Array {
    let mut packed: Vec<u32> = Vec::with_capacity(events.len() * 3);
    for e in events {
        let triple = e.pack();
        packed.push(triple[0]);
        packed.push(triple[1]);
        packed.push(triple[2]);
    }
    uint32_array_from_slice(&packed)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn uint32_array_from_slice(slice: &[u32]) -> Uint32Array {
    let arr = Uint32Array::new_with_length(slice.len() as u32);
    arr.copy_from(slice);
    arr
}

/// Pack set bits into a `Uint32Array` without paying the growth-doubling
/// peak that `bitset.iter().collect::<Vec<u32>>()` incurs (no `size_hint`).
/// One word-popcount pass sizes the Vec exactly; one bulk memcpy hands it
/// to JS. Used by every filter / search / tree call.
fn uint32_array_from_bitset(mask: &Bitset) -> Uint32Array {
    let n = mask.count_ones();
    let mut indices: Vec<u32> = Vec::with_capacity(n as usize);
    for idx in mask.iter() {
        indices.push(idx);
    }
    let arr = Uint32Array::new_with_length(n);
    arr.copy_from(&indices);
    arr
}

/// Pull `{ values: Float64Array, validity: Uint8Array }` from a JS object,
/// bulk-copy into Rust Vecs, and pack the validity bytes into a Bitset.
/// Used by `ingest` for `number` and `date` columns.
fn extract_columnar_f64(
    col_js: &JsValue,
    n_rows: u32,
    col_id: u32,
    kind: &'static str,
) -> Result<(Vec<f64>, Bitset), JsValue> {
    let values_js = Reflect::get(col_js, &JsValue::from_str("values")).map_err(|_| {
        JsValue::from_str(&format!("column id {col_id} ({kind}): missing 'values'"))
    })?;
    let validity_js = Reflect::get(col_js, &JsValue::from_str("validity")).map_err(|_| {
        JsValue::from_str(&format!("column id {col_id} ({kind}): missing 'validity'"))
    })?;

    let values_arr: Float64Array = values_js.dyn_into().map_err(|_| {
        JsValue::from_str(&format!(
            "column id {col_id} ({kind}): 'values' is not a Float64Array"
        ))
    })?;
    let validity_arr: Uint8Array = validity_js.dyn_into().map_err(|_| {
        JsValue::from_str(&format!(
            "column id {col_id} ({kind}): 'validity' is not a Uint8Array"
        ))
    })?;

    if values_arr.length() != n_rows || validity_arr.length() != n_rows {
        return Err(JsValue::from_str(&format!(
            "column id {col_id} ({kind}): expected length {n_rows}, got values={} validity={}",
            values_arr.length(),
            validity_arr.length(),
        )));
    }

    // `to_vec()` is one bulk memcpy from WASM memory into a Rust Vec.
    let values: Vec<f64> = values_arr.to_vec();
    let validity_bytes: Vec<u8> = validity_arr.to_vec();
    let validity = Bitset::from_bytes(&validity_bytes, n_rows);
    Ok((values, validity))
}

/// Pull `{ values: Uint8Array, validity: Uint8Array }`. Used for `bool`
/// columns where JS sends 0/1 bytes.
fn extract_columnar_u8(
    col_js: &JsValue,
    n_rows: u32,
    col_id: u32,
    kind: &'static str,
) -> Result<(Vec<u8>, Bitset), JsValue> {
    let values_js = Reflect::get(col_js, &JsValue::from_str("values")).map_err(|_| {
        JsValue::from_str(&format!("column id {col_id} ({kind}): missing 'values'"))
    })?;
    let validity_js = Reflect::get(col_js, &JsValue::from_str("validity")).map_err(|_| {
        JsValue::from_str(&format!("column id {col_id} ({kind}): missing 'validity'"))
    })?;

    let values_arr: Uint8Array = values_js.dyn_into().map_err(|_| {
        JsValue::from_str(&format!(
            "column id {col_id} ({kind}): 'values' is not a Uint8Array"
        ))
    })?;
    let validity_arr: Uint8Array = validity_js.dyn_into().map_err(|_| {
        JsValue::from_str(&format!(
            "column id {col_id} ({kind}): 'validity' is not a Uint8Array"
        ))
    })?;

    if values_arr.length() != n_rows || validity_arr.length() != n_rows {
        return Err(JsValue::from_str(&format!(
            "column id {col_id} ({kind}): expected length {n_rows}, got values={} validity={}",
            values_arr.length(),
            validity_arr.length(),
        )));
    }

    let values: Vec<u8> = values_arr.to_vec();
    let validity_bytes: Vec<u8> = validity_arr.to_vec();
    let validity = Bitset::from_bytes(&validity_bytes, n_rows);
    Ok((values, validity))
}
