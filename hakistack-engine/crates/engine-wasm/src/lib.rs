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

use js_sys::{Array, Uint32Array};
use wasm_bindgen::prelude::*;

use engine_core::bitset::Bitset;
use search_engine::{
    fuzzy::{FuzzyIndex, FuzzyOpts},
    pdf::{PdfIndex, SearchOpts as PdfSearchOpts},
};
use table_engine::{
    aggregate::{compute as compute_aggregate, RowSet},
    dataset::Dataset,
    filter::{apply as apply_filters, ColumnFilter},
    group::group_by_multi,
    search::{apply_search, SearchSpec},
    sort::{sort_indices, SortSpec},
};
use tree_engine::{
    cascade::{cascade_up as tree_cascade_up, select_descendants as tree_select_descendants},
    dataset::TreeDataset,
    filter::{filter as tree_filter, FilterSpec as TreeFilterSpec},
    flatten::flatten as tree_flatten,
};

mod convert;
mod wire;

use wire::{
    WireAggFn, WireAggResult, WireFilter, WireFuzzyOpts, WireGroup,
    WirePdfSearchOpts, WireSchemaColumn, WireSearchSpec, WireSortSpec,
    WireTreeFilterSpec,
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
    /// - `columns`: `Array<Array<value | null>>` — same order and length as `schema`.
    ///   Element types per column kind:
    ///     - `text` ⇒ `(string | null)[]`
    ///     - `number` ⇒ `(number | null)[]`
    ///     - `bool` ⇒ `(boolean | null)[]`
    ///     - `date` ⇒ `(number | null)[]` (ms-epoch)
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
                    let values: Vec<Option<String>> = serde_wasm_bindgen::from_value(col_js)
                        .map_err(|e| JsValue::from_str(&format!("column id {} (text): {e}", col.id)))?;
                    builder = builder.add_text(col.id, values);
                }
                wire::WireColumnKind::Number => {
                    let values: Vec<Option<f64>> = serde_wasm_bindgen::from_value(col_js)
                        .map_err(|e| JsValue::from_str(&format!("column id {} (number): {e}", col.id)))?;
                    builder = builder.add_number(col.id, values);
                }
                wire::WireColumnKind::Bool => {
                    let values: Vec<Option<bool>> = serde_wasm_bindgen::from_value(col_js)
                        .map_err(|e| JsValue::from_str(&format!("column id {} (bool): {e}", col.id)))?;
                    builder = builder.add_bool(col.id, values);
                }
                wire::WireColumnKind::Date => {
                    // JS Numbers are f64; safe to narrow ms-epoch values to i64.
                    let values_f: Vec<Option<f64>> = serde_wasm_bindgen::from_value(col_js)
                        .map_err(|e| JsValue::from_str(&format!("column id {} (date): {e}", col.id)))?;
                    let values: Vec<Option<i64>> = values_f.into_iter().map(|v| v.map(|f| f as i64)).collect();
                    builder = builder.add_date(col.id, values);
                }
            }
        }

        Ok(WasmDataset { inner: builder.build() })
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
        let indices: Vec<u32> = mask.iter().collect();
        Ok(uint32_array_from_slice(&indices))
    }

    /// Apply a global multi-column search and return the matching-row mask.
    /// Empty term ⇒ empty result (caller composes with the filter mask, where
    /// "no search" means "no constraint added", not "everything matches").
    pub fn search(&self, spec: JsValue) -> Result<Uint32Array, JsValue> {
        let wire: WireSearchSpec = serde_wasm_bindgen::from_value(spec)
            .map_err(|e| JsValue::from_str(&format!("search spec parse error: {e}")))?;
        let kernel: SearchSpec = wire.into();

        let mask = apply_search(&self.inner, &kernel);
        let indices: Vec<u32> = mask.iter().collect();
        Ok(uint32_array_from_slice(&indices))
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
        serde_wasm_bindgen::to_value(&wire_result).map_err(|e| JsValue::from_str(&format!("agg serialize error: {e}")))
    }

    /// Multi-level group. Returns a tree of `WireGroup` nodes.
    /// `columns` is the chain of grouping fields (e.g. `[country_id, state_id]`).
    /// `indices == null` ⇒ group across the entire dataset.
    pub fn group(&self, columns: Vec<u32>, indices: Option<Uint32Array>) -> Result<JsValue, JsValue> {
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
        if labels.len() != depths.len() {
            return Err(JsValue::from_str(&format!(
                "labels.length ({}) does not match depths.length ({})",
                labels.len(), depths.len()
            )));
        }
        Ok(WasmTree {
            inner: TreeDataset::from_dfs(labels, depths),
        })
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
        let visible: Vec<u32> = mask.iter().collect();
        Ok(uint32_array_from_slice(&visible))
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
            if i < n { vis.set(i); }
        }
        let mut exp = Bitset::with_capacity(n);
        let expanded_vec = expanded.to_vec();
        for &i in &expanded_vec {
            if i < n { exp.set(i); }
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
            if i < n { sel.set(i); }
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
        WasmPdfIndex { inner: PdfIndex::new(page_count) }
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
            Some(r) => uint32_array_from_slice(&[r.item_start, r.item_end, r.intra_start, r.intra_end]),
            None    => Uint32Array::new_with_length(0),
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn uint32_array_from_slice(slice: &[u32]) -> Uint32Array {
    let arr = Uint32Array::new_with_length(slice.len() as u32);
    arr.copy_from(slice);
    arr
}
