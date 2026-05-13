//! JSON-shaped types that mirror the kernel API across the JS boundary.
//!
//! These types use `#[serde(tag = "kind")]` so JavaScript callers can pass
//! plain object literals like `{ kind: 'contains', needle: 'foo' }`, which
//! `serde_wasm_bindgen` deserializes directly. Conversion to/from the
//! `table_engine` kernel types is done in `convert.rs`.
//!
//! Keeping these wire types separate from the kernel keeps `table-engine`
//! free of any `serde` / `wasm-bindgen` dependency, so it stays fast to
//! compile and natively testable.

use serde::{Deserialize, Serialize};

// ─── Schema ─────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireSchemaColumn {
    pub id:   u32,
    pub kind: WireColumnKind,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireColumnKind {
    Text,
    Number,
    Bool,
    Date,
}

// ─── Filters ────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireFilter {
    Text   { column: u32, op: WireTextOp },
    Number { column: u32, op: WireNumberOp },
    Bool   { column: u32, op: WireBoolOp },
    Date   { column: u32, op: WireDateOp },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireTextOp {
    Contains    { needle: String },
    StartsWith  { needle: String },
    EndsWith    { needle: String },
    Equals      { needle: String },
    NotEquals   { needle: String },
    NotContains { needle: String },
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireNumberOp {
    Eq         { value: f64 },
    NotEq      { value: f64 },
    Gt         { value: f64 },
    Lt         { value: f64 },
    Gte        { value: f64 },
    Lte        { value: f64 },
    Between    { lo: f64, hi: f64 },
    In         { values: Vec<f64> },
    NotIn      { values: Vec<f64> },
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireBoolOp {
    Eq { value: bool },
    IsEmpty,
    IsNotEmpty,
}

/// Date wire ops use `f64` rather than `i64` because JS `Number` is f64 and
/// `serde_wasm_bindgen` won't coerce floats to integers automatically. The
/// converter narrows back to `i64` (via `as`) since ms-epoch dates are always
/// integer-valued in practice.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireDateOp {
    Eq      { value: f64 },
    Gt      { value: f64 },
    Lt      { value: f64 },
    Gte     { value: f64 },
    Lte     { value: f64 },
    Between { lo: f64, hi: f64 },
    IsEmpty,
    IsNotEmpty,
}

// ─── PDF search ────────────────────────────────────────────────────────────
//
// `search` returns a packed Uint32Array of (page, char_start, char_len) triples.
// `resolve_hit` returns a packed Uint32Array of 4 elements:
//   (item_start, item_end, intra_start, intra_end). Returns empty array
//   when the hit can't be resolved.

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WirePdfSearchOpts {
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub whole_word:     bool,
    /// `0` ⇒ no cap.
    #[serde(default)]
    pub max_hits:       u32,
}

// ─── Fuzzy search ──────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireFuzzyOpts {
    #[serde(default)]
    pub case_sensitive: bool,
    /// `0` ⇒ no cap (all results).
    #[serde(default)]
    pub max_results:    u32,
}

// ─── Tree filter ───────────────────────────────────────────────────────────
//
// Flatten and cascade results are returned as packed `Uint32Array`s rather
// than serde-encoded objects — minimal cost across the WASM boundary, and
// the JS side reads them in groups of (3) for flatten / (2) for cascade.

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireTreeFilterSpec {
    pub term:           String,
    pub mode:           WireTreeFilterMode,
    #[serde(default)]
    pub case_sensitive: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireTreeFilterMode {
    Lenient,
    Strict,
}

// ─── Search ─────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireSearchSpec {
    pub term:           String,
    pub mode:           WireSearchMode,
    /// Column ids to search. Empty ⇒ every text column in the dataset.
    #[serde(default)]
    pub columns:        Vec<u32>,
    #[serde(default)]
    pub case_sensitive: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireSearchMode {
    Contains,
    StartsWith,
    Exact,
}

// ─── Sort ───────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireSortSpec {
    pub column:    u32,
    pub direction: WireDirection,
    pub nulls:     WireNullsPosition,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireDirection {
    Asc,
    Desc,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireNullsPosition {
    First,
    Last,
}

// ─── Aggregate ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireAggFn {
    Sum,
    Avg,
    Min,
    Max,
    Count,
    Median,
    TrueCount,
    FalseCount,
    DistinctCount,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireAggResult {
    None,
    Number { value: f64 },
    /// Date result as ms-epoch encoded into f64 — JS Number safely holds
    /// integer values up to 2^53.
    Date   { value: f64 },
    Count  { value: u32 },
}

// ─── Group ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WireGroup {
    pub key:      WireGroupKey,
    pub indices:  Vec<u32>,
    pub depth:    u32,
    pub children: Vec<WireGroup>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireGroupKey {
    Null,
    Text   { value: String },
    Number { value: f64 },
    Bool   { value: bool },
    Date   { value: f64 },
}

// ─── Form engine ────────────────────────────────────────────────────────────
//
// The wire schema mirrors `form-engine`'s `FormSchema` / `Condition` types.
// All field references are resolved to indices on the TS side before
// crossing the boundary, so the engine never deals with name lookups in
// the hot path.

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireFormSchema {
    pub fields: Vec<WireFormField>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireFormField {
    pub name: String,
    #[serde(default)]
    pub required_baseline: bool,
    #[serde(default)]
    pub disabled_baseline: bool,
    #[serde(default)]
    pub show_when: Vec<WireFormCondition>,
    #[serde(default)]
    pub hide_when: Vec<WireFormCondition>,
    #[serde(default)]
    pub required_when: Vec<WireFormCondition>,
    #[serde(default)]
    pub disabled_when: Vec<WireFormCondition>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireFormCondition {
    pub field: u32,
    pub op:    WireFormOp,
    pub value: WireFormValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WireFormOp {
    Equals,
    NotEquals,
    Contains,
    GreaterThan,
    LessThan,
    In,
    NotIn,
    Function,
}

/// Tagged value wire format. The TS adapter normalizes JS values into one
/// of these variants once at schema-ingest time; nothing about the engine
/// hot path needs to inspect arbitrary `JsValue` shapes.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WireFormValue {
    Null,
    Bool     { value: bool },
    Number   { value: f64 },
    String   { value: String },
    Array    { items: Vec<WireFormValue> },
    /// `id` is assigned by the TS adapter when the user registers a
    /// `function`-operator predicate.
    Callback { id: u32 },
}
