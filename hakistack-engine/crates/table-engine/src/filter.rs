//! Filter kernel.
//!
//! Filters AND together. The kernel returns a [`Bitset`] of length `n_rows`
//! where bit `i` is 1 iff row `i` passes every filter.
//!
//! ## Null handling
//!
//! Null values (validity bit = 0) **never match** any predicate, including
//! negated ones like [`TextOp::NotContains`] and [`NumberOp::NotEq`]. To select
//! null rows specifically, use [`TextOp::IsEmpty`] / [`NumberOp::IsEmpty`] /
//! etc. This is an intentional improvement over the JS implementation, which
//! string-coerces nulls to `"null"` / `"undefined"` and matches them
//! accidentally.
//!
//! ## Case sensitivity
//!
//! Text comparisons are case-insensitive. The query needle is lowercased once
//! per filter at apply time; the haystack was lowercased once at ingest. Total
//! work per keystroke is O(filters) folds + O(rows × cols) byte scans.

use crate::dataset::{BoolColumn, Column, ColumnId, Dataset, DateColumn, NumberColumn, TextColumn};
use engine_core::{
    bitset::Bitset,
    fold::{contains_bytes, finder, fold_lower},
};

/// One filter row from the user. Multiple filters AND together via [`apply`].
#[derive(Debug, Clone)]
pub enum ColumnFilter {
    Text   { column: ColumnId, op: TextOp },
    Number { column: ColumnId, op: NumberOp },
    Bool   { column: ColumnId, op: BoolOp },
    Date   { column: ColumnId, op: DateOp },
}

#[derive(Debug, Clone)]
pub enum TextOp {
    Contains(String),
    StartsWith(String),
    EndsWith(String),
    Equals(String),
    NotEquals(String),
    NotContains(String),
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Clone)]
pub enum NumberOp {
    Eq(f64),
    NotEq(f64),
    Gt(f64),
    Lt(f64),
    Gte(f64),
    Lte(f64),
    Between(f64, f64),  // inclusive [lo, hi]
    In(Vec<f64>),
    NotIn(Vec<f64>),
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Clone)]
pub enum BoolOp {
    Eq(bool),
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Clone)]
pub enum DateOp {
    Eq(i64),
    Gt(i64),
    Lt(i64),
    Gte(i64),
    Lte(i64),
    Between(i64, i64),  // inclusive [lo, hi]
    IsEmpty,
    IsNotEmpty,
}

/// Apply every filter, return the AND of their per-filter masks.
///
/// Empty filter list ⇒ all-1s mask (every row passes).
pub fn apply(dataset: &Dataset, filters: &[ColumnFilter]) -> Bitset {
    let mut result = Bitset::with_capacity(dataset.n_rows());
    result.fill();

    for f in filters {
        let mask = apply_single(dataset, f);
        result.and_with(&mask);
    }
    result
}

/// Apply one filter. Returns an all-zeros mask when the column is missing or
/// the wrong kind — caller's view is "no rows match," which is the same answer
/// the JS impl gives in that situation.
fn apply_single(dataset: &Dataset, filter: &ColumnFilter) -> Bitset {
    let n = dataset.n_rows();
    let mut mask = Bitset::with_capacity(n);

    match filter {
        ColumnFilter::Text { column, op } => {
            if let Some(Column::Text(col)) = dataset.column(*column) {
                apply_text(col, op, &mut mask);
            }
        }
        ColumnFilter::Number { column, op } => {
            if let Some(Column::Number(col)) = dataset.column(*column) {
                apply_number(col, op, &mut mask);
            }
        }
        ColumnFilter::Bool { column, op } => {
            if let Some(Column::Bool(col)) = dataset.column(*column) {
                apply_bool(col, op, &mut mask);
            }
        }
        ColumnFilter::Date { column, op } => {
            if let Some(Column::Date(col)) = dataset.column(*column) {
                apply_date(col, op, &mut mask);
            }
        }
    }
    mask
}

// ─── Helpers ────────────────────────────────────────────────────────────────
//
// All four per-column kernels share the same inner-loop shape: for every row,
// check validity, run the predicate, write a bit into `out`. The naive loop
// pays a `validity.get(i)` (word lookup + bit shift) and `out.set(i)` for each
// of the N rows, even when the result for 64 rows could be assembled in a
// single u64 and stored once.
//
// `fill_word_iter` reorganizes the work column-by-word: walk the *valid* bits
// of each validity word with the `bits & (bits - 1)` clear-lowest-set trick,
// run the predicate only for valid rows (skipping nulls with no work), and
// commit one 64-bit `out.words_mut()[w] = acc` per chunk instead of 64
// scattered `out.set(i)` calls. For 100k rows this collapses ~200k bitset
// reads/writes to ~3.1k word writes. Wins:
//
//   - null-heavy columns: walk only valid bits (~validity.count_ones() vs N)
//   - cache friendly: linear access to `col.values` / `col.lower`
//   - amortized away the per-row word/shift arithmetic
//
// `negated_validity_into` covers the `IsEmpty` family — output is the
// complement of validity, masked to the row count.
//
// `validity_into` covers `IsNotEmpty` — output is a copy of validity.

#[inline]
fn fill_word_iter<F>(out: &mut Bitset, validity: &Bitset, n: usize, mut check: F)
where
    F: FnMut(usize) -> bool,
{
    let v_words = validity.words();
    let words = out.words_mut();
    for (w, &v_word) in v_words.iter().enumerate() {
        let base = w * 64;
        let mut bits = v_word;
        let mut acc: u64 = 0;
        while bits != 0 {
            let b = bits.trailing_zeros() as usize;
            let i = base + b;
            if i < n && check(i) {
                acc |= 1u64 << b;
            }
            bits &= bits - 1;
        }
        words[w] = acc;
    }
}

#[inline]
fn validity_into(out: &mut Bitset, validity: &Bitset) {
    out.copy_from(validity);
}

#[inline]
fn negated_validity_into(out: &mut Bitset, validity: &Bitset) {
    let v_words = validity.words();
    let words = out.words_mut();
    for (w, &v_word) in v_words.iter().enumerate() {
        words[w] = !v_word;
    }
    out.mask_tail();
}

// ─── Text ───────────────────────────────────────────────────────────────────

fn apply_text(col: &TextColumn, op: &TextOp, out: &mut Bitset) {
    let n = col.lower.len();

    match op {
        TextOp::Contains(needle) => {
            let needle = fold_lower(needle);
            let f = finder(&needle);
            fill_word_iter(out, &col.validity, n, |i| contains_bytes(&col.lower[i], &f));
        }
        TextOp::NotContains(needle) => {
            let needle = fold_lower(needle);
            let f = finder(&needle);
            fill_word_iter(out, &col.validity, n, |i| !contains_bytes(&col.lower[i], &f));
        }
        TextOp::StartsWith(needle) => {
            let needle = fold_lower(needle);
            fill_word_iter(out, &col.validity, n, |i| col.lower[i].starts_with(&*needle));
        }
        TextOp::EndsWith(needle) => {
            let needle = fold_lower(needle);
            fill_word_iter(out, &col.validity, n, |i| col.lower[i].ends_with(&*needle));
        }
        TextOp::Equals(needle) => {
            let needle = fold_lower(needle);
            fill_word_iter(out, &col.validity, n, |i| *col.lower[i] == *needle);
        }
        TextOp::NotEquals(needle) => {
            let needle = fold_lower(needle);
            fill_word_iter(out, &col.validity, n, |i| *col.lower[i] != *needle);
        }
        TextOp::IsEmpty => {
            // Both null rows AND empty-string rows match. The negation
            // captures null rows in one word op; we then layer the empty-
            // string check over valid rows.
            negated_validity_into(out, &col.validity);
            let v_words = col.validity.words();
            let words = out.words_mut();
            for (w, &v_word) in v_words.iter().enumerate() {
                let base = w * 64;
                let mut bits = v_word;
                while bits != 0 {
                    let b = bits.trailing_zeros() as usize;
                    let i = base + b;
                    if i < n && col.lower[i].is_empty() {
                        words[w] |= 1u64 << b;
                    }
                    bits &= bits - 1;
                }
            }
            out.mask_tail();
        }
        TextOp::IsNotEmpty => {
            fill_word_iter(out, &col.validity, n, |i| !col.lower[i].is_empty());
        }
    }
}

// ─── Number ─────────────────────────────────────────────────────────────────

fn apply_number(col: &NumberColumn, op: &NumberOp, out: &mut Bitset) {
    let n = col.values.len();

    match op {
        NumberOp::Eq(x)            => fill_word_iter(out, &col.validity, n, |i| col.values[i] == *x),
        NumberOp::NotEq(x)         => fill_word_iter(out, &col.validity, n, |i| col.values[i] != *x),
        NumberOp::Gt(x)            => fill_word_iter(out, &col.validity, n, |i| col.values[i] >  *x),
        NumberOp::Lt(x)            => fill_word_iter(out, &col.validity, n, |i| col.values[i] <  *x),
        NumberOp::Gte(x)           => fill_word_iter(out, &col.validity, n, |i| col.values[i] >= *x),
        NumberOp::Lte(x)           => fill_word_iter(out, &col.validity, n, |i| col.values[i] <= *x),
        NumberOp::Between(lo, hi)  => fill_word_iter(out, &col.validity, n, |i| col.values[i] >= *lo && col.values[i] <= *hi),
        NumberOp::In(list)         => fill_word_iter(out, &col.validity, n, |i| list.iter().any(|x| col.values[i] == *x)),
        NumberOp::NotIn(list)      => fill_word_iter(out, &col.validity, n, |i| !list.iter().any(|x| col.values[i] == *x)),
        NumberOp::IsEmpty          => negated_validity_into(out, &col.validity),
        NumberOp::IsNotEmpty       => validity_into(out, &col.validity),
    }
}

// ─── Bool ───────────────────────────────────────────────────────────────────

fn apply_bool(col: &BoolColumn, op: &BoolOp, out: &mut Bitset) {
    let n = col.values.len();
    match op {
        BoolOp::Eq(x)        => fill_word_iter(out, &col.validity, n, |i| col.values[i] == *x),
        BoolOp::IsEmpty      => negated_validity_into(out, &col.validity),
        BoolOp::IsNotEmpty   => validity_into(out, &col.validity),
    }
}

// ─── Date ───────────────────────────────────────────────────────────────────

fn apply_date(col: &DateColumn, op: &DateOp, out: &mut Bitset) {
    let n = col.values.len();

    match op {
        DateOp::Eq(x)             => fill_word_iter(out, &col.validity, n, |i| col.values[i] == *x),
        DateOp::Gt(x)             => fill_word_iter(out, &col.validity, n, |i| col.values[i] >  *x),
        DateOp::Lt(x)             => fill_word_iter(out, &col.validity, n, |i| col.values[i] <  *x),
        DateOp::Gte(x)            => fill_word_iter(out, &col.validity, n, |i| col.values[i] >= *x),
        DateOp::Lte(x)            => fill_word_iter(out, &col.validity, n, |i| col.values[i] <= *x),
        DateOp::Between(lo, hi)   => fill_word_iter(out, &col.validity, n, |i| col.values[i] >= *lo && col.values[i] <= *hi),
        DateOp::IsEmpty           => negated_validity_into(out, &col.validity),
        DateOp::IsNotEmpty        => validity_into(out, &col.validity),
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dataset::Dataset;
    use engine_core::Idx;

    fn opt_strs(v: &[&str]) -> Vec<Option<String>> {
        v.iter().map(|s| Some(s.to_string())).collect()
    }

    fn matches(mask: &Bitset) -> Vec<Idx> {
        mask.iter().collect()
    }

    fn sample_dataset() -> Dataset {
        Dataset::builder(5)
            .add_text(0,  opt_strs(&["Alice", "Bob", "Carol", "alice", "Dave"]))
            .add_number(1, vec![Some(10.0), Some(20.0), Some(30.0), None, Some(40.0)])
            .add_bool(2,   vec![Some(true), Some(false), Some(true), None, Some(false)])
            .add_date(3,   vec![Some(100), Some(200), None, Some(300), Some(400)])
            .build()
    }

    // ── Text ────────────────────────────────────────────────────────────

    #[test]
    fn text_contains_is_case_insensitive() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::Contains("ali".into()),
        }]);
        // "Alice" (0) and "alice" (3) both match
        assert_eq!(matches(&mask), vec![0, 3]);
    }

    #[test]
    fn text_starts_with() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::StartsWith("c".into()),
        }]);
        assert_eq!(matches(&mask), vec![2]); // "Carol"
    }

    #[test]
    fn text_ends_with() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::EndsWith("e".into()),
        }]);
        // "Alice", "alice", "Dave"
        assert_eq!(matches(&mask), vec![0, 3, 4]);
    }

    #[test]
    fn text_equals_and_not_equals() {
        let ds = sample_dataset();
        let eq = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::Equals("BOB".into()),
        }]);
        assert_eq!(matches(&eq), vec![1]);

        let neq = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::NotEquals("Bob".into()),
        }]);
        // 1 ("Bob") excluded; nulls would also be excluded but there are none here
        assert_eq!(matches(&neq), vec![0, 2, 3, 4]);
    }

    #[test]
    fn text_not_contains_excludes_nulls() {
        let ds = Dataset::builder(3)
            .add_text(0, vec![Some("foo".into()), None, Some("bar".into())])
            .build();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::NotContains("foo".into()),
        }]);
        // null row (1) excluded — improvement over JS which would coerce null → "null"
        assert_eq!(matches(&mask), vec![2]);
    }

    #[test]
    fn text_is_empty_matches_null_and_empty_string() {
        let ds = Dataset::builder(4)
            .add_text(0, vec![Some("foo".into()), None, Some("".into()), Some("bar".into())])
            .build();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 0,
            op: TextOp::IsEmpty,
        }]);
        assert_eq!(matches(&mask), vec![1, 2]);
    }

    // ── Number ──────────────────────────────────────────────────────────

    #[test]
    fn number_comparisons() {
        let ds = sample_dataset();
        let gt = apply(&ds, &[ColumnFilter::Number { column: 1, op: NumberOp::Gt(20.0) }]);
        assert_eq!(matches(&gt), vec![2, 4]);

        let lte = apply(&ds, &[ColumnFilter::Number { column: 1, op: NumberOp::Lte(20.0) }]);
        assert_eq!(matches(&lte), vec![0, 1]); // null at 3 excluded
    }

    #[test]
    fn number_between_is_inclusive() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Number {
            column: 1,
            op: NumberOp::Between(10.0, 30.0),
        }]);
        assert_eq!(matches(&mask), vec![0, 1, 2]);
    }

    #[test]
    fn number_in_and_not_in() {
        let ds = sample_dataset();
        let inn = apply(&ds, &[ColumnFilter::Number {
            column: 1,
            op: NumberOp::In(vec![10.0, 40.0]),
        }]);
        assert_eq!(matches(&inn), vec![0, 4]);

        let nin = apply(&ds, &[ColumnFilter::Number {
            column: 1,
            op: NumberOp::NotIn(vec![10.0, 40.0]),
        }]);
        assert_eq!(matches(&nin), vec![1, 2]); // null at 3 excluded
    }

    #[test]
    fn number_is_empty_matches_null_and_nan() {
        let ds = Dataset::builder(3)
            .add_number(0, vec![Some(1.0), None, Some(f64::NAN)])
            .build();
        let mask = apply(&ds, &[ColumnFilter::Number {
            column: 0,
            op: NumberOp::IsEmpty,
        }]);
        assert_eq!(matches(&mask), vec![1, 2]);
    }

    // ── Bool ────────────────────────────────────────────────────────────

    #[test]
    fn bool_eq() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Bool { column: 2, op: BoolOp::Eq(true) }]);
        assert_eq!(matches(&mask), vec![0, 2]);
    }

    // ── Date ────────────────────────────────────────────────────────────

    #[test]
    fn date_between() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Date {
            column: 3,
            op: DateOp::Between(150, 350),
        }]);
        assert_eq!(matches(&mask), vec![1, 3]); // 200 and 300; null at 2 excluded
    }

    // ── Combine ─────────────────────────────────────────────────────────

    #[test]
    fn multiple_filters_and_together() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[
            ColumnFilter::Number { column: 1, op: NumberOp::Gt(15.0) },
            ColumnFilter::Bool   { column: 2, op: BoolOp::Eq(true) },
        ]);
        // number > 15 ⇒ {1, 2, 4}; bool = true ⇒ {0, 2}; AND ⇒ {2}
        assert_eq!(matches(&mask), vec![2]);
    }

    #[test]
    fn empty_filters_match_all_rows() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[]);
        assert_eq!(mask.count_ones(), 5);
    }

    #[test]
    fn missing_column_yields_no_matches() {
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 99, // doesn't exist
            op: TextOp::Contains("anything".into()),
        }]);
        assert_eq!(mask.count_ones(), 0);
    }

    #[test]
    fn wrong_column_kind_yields_no_matches() {
        // Trying to text-filter a number column → mask all zeros
        let ds = sample_dataset();
        let mask = apply(&ds, &[ColumnFilter::Text {
            column: 1, // Number column
            op: TextOp::Contains("anything".into()),
        }]);
        assert_eq!(mask.count_ones(), 0);
    }
}
