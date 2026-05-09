//! Aggregate kernel.
//!
//! Computes one of nine aggregations over a column, restricted to a subset of
//! rows. The subset is described by [`RowSet`], which abstracts the three
//! shapes that callers naturally produce:
//!
//! - `RowSet::All` — every row in the dataset (footer of an unfiltered grid)
//! - `RowSet::Mask(&Bitset)` — output of [`crate::filter::apply`] (footer of a
//!   filtered grid)
//! - `RowSet::Indices(&[u32])` — a group bucket or a user range selection
//!
//! ## Algorithms
//!
//! All aggregates are single-pass O(n) **except median**, which falls through
//! to `slice::select_nth_unstable` (quickselect, O(n) average). Distinct count
//! uses an `FxHashSet` keyed on the value's bit pattern for numbers, content
//! bytes for text. Nulls (validity bit = 0) are excluded from every operation
//! except [`AggFn::DistinctCount`], where they don't add to the count either —
//! they simply don't contribute.
//!
//! Type / op mismatch (e.g. [`AggFn::Sum`] on a text column) returns
//! [`AggResult::None`] rather than panicking, matching the "no answer"
//! semantics of the JS implementation.

use crate::dataset::{BoolColumn, Column, ColumnId, Dataset, DateColumn, NumberColumn, TextColumn};
use engine_core::{bitset::Bitset, FxHashSet, Idx};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AggFn {
    /// Numbers only. Sum of valid values. Empty input → `None`.
    Sum,
    /// Numbers only. Mean of valid values. Empty input → `None`.
    Avg,
    /// Numbers and dates. Smallest valid value. Empty input → `None`.
    Min,
    /// Numbers and dates. Largest valid value. Empty input → `None`.
    Max,
    /// Any column. Count of valid (non-null) values.
    Count,
    /// Numbers only. Median; even-length input averages the two middles.
    Median,
    /// Bools only. Count of valid `true` values.
    TrueCount,
    /// Bools only. Count of valid `false` values.
    FalseCount,
    /// Any column. Count of distinct valid values.
    DistinctCount,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AggResult {
    /// Aggregate produced no value: empty input, or function/column kind mismatch.
    None,
    /// Numeric result (sum, avg, min/max on numbers, median).
    Number(f64),
    /// Date result (min/max on dates) as ms epoch.
    Date(i64),
    /// Counting result (count, true/false count, distinct count).
    Count(u32),
}

/// What rows to aggregate over.
#[derive(Debug, Clone, Copy)]
pub enum RowSet<'a> {
    All,
    Mask(&'a Bitset),
    Indices(&'a [Idx]),
}

/// Compute one aggregate.
pub fn compute(dataset: &Dataset, column: ColumnId, rows: RowSet<'_>, agg: AggFn) -> AggResult {
    let Some(col) = dataset.column(column) else {
        return AggResult::None;
    };
    let n_rows = dataset.n_rows();

    match (col, agg) {
        // ── Number column ────────────────────────────────────────────────
        (Column::Number(c), AggFn::Sum)    => sum_number(c, rows, n_rows),
        (Column::Number(c), AggFn::Avg)    => avg_number(c, rows, n_rows),
        (Column::Number(c), AggFn::Min)    => min_number(c, rows, n_rows),
        (Column::Number(c), AggFn::Max)    => max_number(c, rows, n_rows),
        (Column::Number(c), AggFn::Median) => median_number(c, rows, n_rows),
        (Column::Number(c), AggFn::Count)  => AggResult::Count(count_valid_number(c, rows, n_rows)),
        (Column::Number(c), AggFn::DistinctCount) => distinct_number(c, rows, n_rows),

        // ── Date column ──────────────────────────────────────────────────
        (Column::Date(c), AggFn::Min)   => min_date(c, rows, n_rows),
        (Column::Date(c), AggFn::Max)   => max_date(c, rows, n_rows),
        (Column::Date(c), AggFn::Count) => AggResult::Count(count_valid_date(c, rows, n_rows)),
        (Column::Date(c), AggFn::DistinctCount) => distinct_date(c, rows, n_rows),

        // ── Bool column ──────────────────────────────────────────────────
        (Column::Bool(c), AggFn::TrueCount)     => AggResult::Count(true_count(c, rows, n_rows)),
        (Column::Bool(c), AggFn::FalseCount)    => AggResult::Count(false_count(c, rows, n_rows)),
        (Column::Bool(c), AggFn::Count)         => AggResult::Count(count_valid_bool(c, rows, n_rows)),
        (Column::Bool(c), AggFn::DistinctCount) => distinct_bool(c, rows, n_rows),

        // ── Text column ──────────────────────────────────────────────────
        (Column::Text(c), AggFn::Count)         => AggResult::Count(count_valid_text(c, rows, n_rows)),
        (Column::Text(c), AggFn::DistinctCount) => distinct_text(c, rows, n_rows),

        // ── Mismatch ─────────────────────────────────────────────────────
        _ => AggResult::None,
    }
}

// ─── Iteration helper ───────────────────────────────────────────────────────
//
// Centralizes the three shapes of "which rows" so each aggregator is just a
// fold over a closure — the compiler inlines through this. Also reused by the
// `group` kernel.

#[inline]
pub(crate) fn for_each_index<F: FnMut(Idx)>(rows: RowSet<'_>, n_rows: u32, mut f: F) {
    match rows {
        RowSet::All            => (0..n_rows).for_each(&mut f),
        RowSet::Mask(b)        => b.iter().for_each(&mut f),
        RowSet::Indices(idxs)  => idxs.iter().copied().for_each(&mut f),
    }
}

// ─── Number aggregators ─────────────────────────────────────────────────────

fn sum_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut total = 0.0f64;
    let mut any = false;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            total += c.values[i as usize];
            any = true;
        }
    });
    if any { AggResult::Number(total) } else { AggResult::None }
}

fn avg_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut total = 0.0f64;
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            total += c.values[i as usize];
            count += 1;
        }
    });
    if count > 0 { AggResult::Number(total / count as f64) } else { AggResult::None }
}

fn min_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut current: Option<f64> = None;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            let v = c.values[i as usize];
            current = Some(match current {
                Some(m) if m.total_cmp(&v).is_le() => m,
                _ => v,
            });
        }
    });
    current.map_or(AggResult::None, AggResult::Number)
}

fn max_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut current: Option<f64> = None;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            let v = c.values[i as usize];
            current = Some(match current {
                Some(m) if m.total_cmp(&v).is_ge() => m,
                _ => v,
            });
        }
    });
    current.map_or(AggResult::None, AggResult::Number)
}

fn median_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut values: Vec<f64> = Vec::new();
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            values.push(c.values[i as usize]);
        }
    });

    let len = values.len();
    if len == 0 {
        return AggResult::None;
    }

    // O(n) quickselect for the lower-middle index.
    let mid = len / 2;
    let (_, lower_mid, _) = values.select_nth_unstable_by(mid, f64::total_cmp);
    let lower_mid = *lower_mid;

    if len % 2 == 1 {
        AggResult::Number(lower_mid)
    } else {
        // Even length: also need the upper-middle. After select_nth on `mid`,
        // the slice [..mid] holds all values ≤ lower_mid (in any order); the
        // largest of those is the value just below the median.
        let left = &values[..mid];
        let upper_of_left = left.iter().copied().fold(f64::NEG_INFINITY, |a, b| {
            if a.total_cmp(&b).is_ge() { a } else { b }
        });
        AggResult::Number((upper_of_left + lower_mid) / 2.0)
    }
}

fn count_valid_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> u32 {
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) { count += 1; }
    });
    count
}

fn distinct_number(c: &NumberColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    // Hash by f64 bits — identical bit patterns mean identical values for our
    // purposes. NaNs were normalized to null at ingest, so we never see them.
    let mut set: FxHashSet<u64> = FxHashSet::default();
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            set.insert(c.values[i as usize].to_bits());
        }
    });
    AggResult::Count(set.len() as u32)
}

// ─── Date aggregators ───────────────────────────────────────────────────────

fn min_date(c: &DateColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut current: Option<i64> = None;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            let v = c.values[i as usize];
            current = Some(current.map_or(v, |m| m.min(v)));
        }
    });
    current.map_or(AggResult::None, AggResult::Date)
}

fn max_date(c: &DateColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut current: Option<i64> = None;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            let v = c.values[i as usize];
            current = Some(current.map_or(v, |m| m.max(v)));
        }
    });
    current.map_or(AggResult::None, AggResult::Date)
}

fn count_valid_date(c: &DateColumn, rows: RowSet<'_>, n: u32) -> u32 {
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) { count += 1; }
    });
    count
}

fn distinct_date(c: &DateColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut set: FxHashSet<i64> = FxHashSet::default();
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            set.insert(c.values[i as usize]);
        }
    });
    AggResult::Count(set.len() as u32)
}

// ─── Bool aggregators ───────────────────────────────────────────────────────

fn true_count(c: &BoolColumn, rows: RowSet<'_>, n: u32) -> u32 {
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) && c.values[i as usize] { count += 1; }
    });
    count
}

fn false_count(c: &BoolColumn, rows: RowSet<'_>, n: u32) -> u32 {
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) && !c.values[i as usize] { count += 1; }
    });
    count
}

fn count_valid_bool(c: &BoolColumn, rows: RowSet<'_>, n: u32) -> u32 {
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) { count += 1; }
    });
    count
}

fn distinct_bool(c: &BoolColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    // At most 2 distinct values possible; quick early-exit pays off.
    let mut seen_true = false;
    let mut seen_false = false;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            if c.values[i as usize] { seen_true = true; } else { seen_false = true; }
        }
    });
    AggResult::Count(seen_true as u32 + seen_false as u32)
}

// ─── Text aggregators ───────────────────────────────────────────────────────

fn count_valid_text(c: &TextColumn, rows: RowSet<'_>, n: u32) -> u32 {
    let mut count = 0u32;
    for_each_index(rows, n, |i| {
        if c.validity.get(i) { count += 1; }
    });
    count
}

fn distinct_text(c: &TextColumn, rows: RowSet<'_>, n: u32) -> AggResult {
    let mut set: FxHashSet<&str> = FxHashSet::default();
    for_each_index(rows, n, |i| {
        if c.validity.get(i) {
            set.insert(&c.values[i as usize]);
        }
    });
    AggResult::Count(set.len() as u32)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dataset::Dataset;
    use crate::filter::{apply as apply_filters, ColumnFilter, NumberOp};

    fn opt_strs(v: &[&str]) -> Vec<Option<String>> {
        v.iter().map(|s| Some(s.to_string())).collect()
    }

    fn ds() -> Dataset {
        Dataset::builder(6)
            .add_text(0, opt_strs(&["a", "b", "a", "c", "b", "a"]))
            .add_number(1, vec![Some(10.0), Some(20.0), None, Some(30.0), Some(40.0), Some(20.0)])
            .add_bool(2, vec![Some(true), Some(false), Some(true), None, Some(false), Some(true)])
            .add_date(3, vec![Some(100), Some(200), Some(300), None, Some(200), Some(400)])
            .build()
    }

    // ── Number ──────────────────────────────────────────────────────────

    #[test]
    fn sum_skips_nulls() {
        // 10 + 20 + 30 + 40 + 20 = 120
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::Sum), AggResult::Number(120.0));
    }

    #[test]
    fn avg_uses_count_of_valid() {
        // 120 / 5 = 24
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::Avg), AggResult::Number(24.0));
    }

    #[test]
    fn sum_empty_input_is_none() {
        let empty: Vec<Idx> = vec![];
        assert_eq!(compute(&ds(), 1, RowSet::Indices(&empty), AggFn::Sum), AggResult::None);
    }

    #[test]
    fn sum_all_nulls_is_none() {
        let null_only = Dataset::builder(2).add_number(0, vec![None, None]).build();
        assert_eq!(compute(&null_only, 0, RowSet::All, AggFn::Sum), AggResult::None);
    }

    #[test]
    fn min_max_on_numbers() {
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::Min), AggResult::Number(10.0));
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::Max), AggResult::Number(40.0));
    }

    #[test]
    fn count_excludes_nulls() {
        // number column has 5 valid, 1 null
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::Count), AggResult::Count(5));
    }

    #[test]
    fn median_odd_length() {
        let ds = Dataset::builder(5)
            .add_number(0, vec![Some(1.0), Some(3.0), Some(5.0), Some(2.0), Some(4.0)])
            .build();
        assert_eq!(compute(&ds, 0, RowSet::All, AggFn::Median), AggResult::Number(3.0));
    }

    #[test]
    fn median_even_length_averages_two_middles() {
        let ds = Dataset::builder(4)
            .add_number(0, vec![Some(1.0), Some(2.0), Some(3.0), Some(4.0)])
            .build();
        // mid two: 2 and 3 → 2.5
        assert_eq!(compute(&ds, 0, RowSet::All, AggFn::Median), AggResult::Number(2.5));
    }

    #[test]
    fn distinct_count_numbers() {
        // values: 10, 20, null, 30, 40, 20  →  distinct: {10, 20, 30, 40} = 4
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::DistinctCount), AggResult::Count(4));
    }

    // ── Date ────────────────────────────────────────────────────────────

    #[test]
    fn min_max_on_dates() {
        assert_eq!(compute(&ds(), 3, RowSet::All, AggFn::Min), AggResult::Date(100));
        assert_eq!(compute(&ds(), 3, RowSet::All, AggFn::Max), AggResult::Date(400));
    }

    #[test]
    fn distinct_count_dates() {
        // 100, 200, 300, null, 200, 400  →  {100, 200, 300, 400} = 4
        assert_eq!(compute(&ds(), 3, RowSet::All, AggFn::DistinctCount), AggResult::Count(4));
    }

    // ── Bool ────────────────────────────────────────────────────────────

    #[test]
    fn true_false_counts() {
        // bool: t, f, t, null, f, t  →  trues: 3, falses: 2
        assert_eq!(compute(&ds(), 2, RowSet::All, AggFn::TrueCount),  AggResult::Count(3));
        assert_eq!(compute(&ds(), 2, RowSet::All, AggFn::FalseCount), AggResult::Count(2));
    }

    #[test]
    fn distinct_count_bool_caps_at_two() {
        assert_eq!(compute(&ds(), 2, RowSet::All, AggFn::DistinctCount), AggResult::Count(2));
        let only_true = Dataset::builder(3)
            .add_bool(0, vec![Some(true), Some(true), None])
            .build();
        assert_eq!(compute(&only_true, 0, RowSet::All, AggFn::DistinctCount), AggResult::Count(1));
    }

    // ── Text ────────────────────────────────────────────────────────────

    #[test]
    fn distinct_count_text_is_case_sensitive() {
        // "a", "b", "a", "c", "b", "a"  →  {"a", "b", "c"} = 3
        assert_eq!(compute(&ds(), 0, RowSet::All, AggFn::DistinctCount), AggResult::Count(3));
    }

    #[test]
    fn count_text_excludes_nulls() {
        let with_nulls = Dataset::builder(4)
            .add_text(0, vec![Some("a".into()), None, Some("b".into()), None])
            .build();
        assert_eq!(compute(&with_nulls, 0, RowSet::All, AggFn::Count), AggResult::Count(2));
    }

    // ── RowSet variants ─────────────────────────────────────────────────

    #[test]
    fn aggregate_over_filter_mask() {
        let ds = ds();
        let mask = apply_filters(&ds, &[ColumnFilter::Number {
            column: 1,
            op: NumberOp::Gt(15.0),
        }]);
        // survivors: rows 1 (20), 3 (30), 4 (40), 5 (20) → sum 110
        assert_eq!(compute(&ds, 1, RowSet::Mask(&mask), AggFn::Sum), AggResult::Number(110.0));
    }

    #[test]
    fn aggregate_over_specific_indices() {
        // Range-selection use case: user dragged across rows 0, 2, 5.
        let idxs = [0u32, 2, 5];
        // values at those indices: 10, null, 20  →  sum 30, count 2
        assert_eq!(compute(&ds(), 1, RowSet::Indices(&idxs), AggFn::Sum), AggResult::Number(30.0));
        assert_eq!(compute(&ds(), 1, RowSet::Indices(&idxs), AggFn::Count), AggResult::Count(2));
    }

    // ── Mismatches ──────────────────────────────────────────────────────

    #[test]
    fn sum_on_text_column_is_none() {
        assert_eq!(compute(&ds(), 0, RowSet::All, AggFn::Sum), AggResult::None);
    }

    #[test]
    fn missing_column_is_none() {
        assert_eq!(compute(&ds(), 99, RowSet::All, AggFn::Sum), AggResult::None);
    }

    #[test]
    fn true_count_on_number_is_none() {
        assert_eq!(compute(&ds(), 1, RowSet::All, AggFn::TrueCount), AggResult::None);
    }
}
