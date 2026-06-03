//! Multi-field stable sort kernel.
//!
//! Takes a slice of row indices (typically the output of [`crate::filter::apply`]
//! collected via [`Bitset::iter`]) and reorders them by a composite key. Empty
//! `specs` is a no-op; missing columns are skipped silently.
//!
//! ## Stability
//!
//! `slice::sort_by` is stable in Rust's stdlib, so rows with all keys equal
//! retain their relative order. Multi-column sort works by adding tiers — the
//! first spec is the primary key, the second is the tie-breaker, and so on.
//!
//! ## Null handling
//!
//! Each [`SortSpec`] carries a [`NullsPosition`]. Following Postgres `NULLS
//! FIRST` / `NULLS LAST` semantics, the position is **independent of
//! [`Direction`]** — nulls go where you put them regardless of asc / desc.
//!
//! ## Text comparison
//!
//! Sorts by the pre-folded `lower` field of each [`TextColumn`], so the order
//! is case-insensitive. Locale-aware comparison via `icu_collator` is on the
//! roadmap behind a Cargo feature flag — see `RUST_ENGINE.md` §5.3.

use std::cmp::Ordering;

use crate::dataset::{BoolColumn, Column, ColumnId, Dataset, DateColumn, NumberColumn, TextColumn};
use engine_core::{Idx, bitset::Bitset};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NullsPosition {
    First,
    Last,
}

#[derive(Debug, Clone, Copy)]
pub struct SortSpec {
    pub column: ColumnId,
    pub direction: Direction,
    pub nulls: NullsPosition,
}

impl SortSpec {
    /// Convenience: ascending, nulls last (the most common DataGrid default).
    pub fn asc(column: ColumnId) -> Self {
        Self {
            column,
            direction: Direction::Asc,
            nulls: NullsPosition::Last,
        }
    }

    /// Convenience: descending, nulls last.
    pub fn desc(column: ColumnId) -> Self {
        Self {
            column,
            direction: Direction::Desc,
            nulls: NullsPosition::Last,
        }
    }
}

/// Sort `indices` in place by the composite key. Stable. No-op when `specs`
/// is empty.
pub fn sort_indices(dataset: &Dataset, indices: &mut [Idx], specs: &[SortSpec]) {
    if specs.is_empty() {
        return;
    }
    let resolved: Vec<Resolved<'_>> = specs.iter().map(|s| Resolved::from(dataset, s)).collect();
    indices.sort_by(|&a, &b| compare_composite(&resolved, a, b));
}

/// Convenience: collect indices from a [`Bitset`] (e.g. the output of the
/// filter kernel) and sort them.
pub fn sort_from_mask(dataset: &Dataset, mask: &Bitset, specs: &[SortSpec]) -> Vec<Idx> {
    let mut idxs: Vec<Idx> = mask.iter().collect();
    sort_indices(dataset, &mut idxs, specs);
    idxs
}

// ─── Resolved spec ──────────────────────────────────────────────────────────
//
// Resolving the column reference once per sort, instead of per comparison,
// is the load-bearing optimization. With N rows and M specs, naive per-call
// HashMap lookups would be O(N log N · M) hashes; this is O(M).

enum Resolved<'a> {
    Skip,
    Text(&'a TextColumn, Direction, NullsPosition),
    Number(&'a NumberColumn, Direction, NullsPosition),
    Bool(&'a BoolColumn, Direction, NullsPosition),
    Date(&'a DateColumn, Direction, NullsPosition),
}

impl<'a> Resolved<'a> {
    fn from(dataset: &'a Dataset, spec: &SortSpec) -> Self {
        match dataset.column(spec.column) {
            Some(Column::Text(c)) => Self::Text(c, spec.direction, spec.nulls),
            Some(Column::Number(c)) => Self::Number(c, spec.direction, spec.nulls),
            Some(Column::Bool(c)) => Self::Bool(c, spec.direction, spec.nulls),
            Some(Column::Date(c)) => Self::Date(c, spec.direction, spec.nulls),
            None => Self::Skip,
        }
    }
}

fn compare_composite(resolved: &[Resolved<'_>], a: Idx, b: Idx) -> Ordering {
    for r in resolved {
        let ord = compare_one(r, a, b);
        if ord != Ordering::Equal {
            return ord;
        }
    }
    Ordering::Equal
}

fn compare_one(r: &Resolved<'_>, a: Idx, b: Idx) -> Ordering {
    let (ai, bi) = (a as usize, b as usize);
    match r {
        Resolved::Skip => Ordering::Equal,

        Resolved::Text(c, dir, nulls) => {
            let av = c.validity.get(a);
            let bv = c.validity.get(b);
            cmp_with_nulls(av, bv, *dir, *nulls, || {
                let l: &str = &c.lower[ai];
                let r: &str = &c.lower[bi];
                l.cmp(r)
            })
        }

        Resolved::Number(c, dir, nulls) => {
            let av = c.validity.get(a);
            let bv = c.validity.get(b);
            // total_cmp is the deterministic full ordering for f64
            cmp_with_nulls(av, bv, *dir, *nulls, || {
                c.values[ai].total_cmp(&c.values[bi])
            })
        }

        Resolved::Bool(c, dir, nulls) => {
            let av = c.validity.get(a);
            let bv = c.validity.get(b);
            cmp_with_nulls(av, bv, *dir, *nulls, || c.values[ai].cmp(&c.values[bi]))
        }

        Resolved::Date(c, dir, nulls) => {
            let av = c.validity.get(a);
            let bv = c.validity.get(b);
            cmp_with_nulls(av, bv, *dir, *nulls, || c.values[ai].cmp(&c.values[bi]))
        }
    }
}

#[inline]
fn cmp_with_nulls<F: FnOnce() -> Ordering>(
    a_valid: bool,
    b_valid: bool,
    dir: Direction,
    nulls: NullsPosition,
    cmp: F,
) -> Ordering {
    match (a_valid, b_valid) {
        (false, false) => Ordering::Equal,
        (false, true) => match nulls {
            NullsPosition::First => Ordering::Less,
            NullsPosition::Last => Ordering::Greater,
        },
        (true, false) => match nulls {
            NullsPosition::First => Ordering::Greater,
            NullsPosition::Last => Ordering::Less,
        },
        (true, true) => match dir {
            Direction::Asc => cmp(),
            Direction::Desc => cmp().reverse(),
        },
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dataset::Dataset;
    use crate::filter::{ColumnFilter, NumberOp, apply as apply_filters};

    fn opt_strs(v: &[&str]) -> Vec<Option<String>> {
        v.iter().map(|s| Some(s.to_string())).collect()
    }

    fn ds_named() -> Dataset {
        // 5 rows.
        // id 0 = name (text), id 1 = age (number), id 2 = active (bool),
        // id 3 = joined (date)
        Dataset::builder(5)
            .add_text(0, opt_strs(&["Carol", "alice", "Bob", "Alice", "dave"]))
            .add_number(
                1,
                vec![Some(30.0), Some(25.0), Some(40.0), Some(25.0), None],
            )
            .add_bool(
                2,
                vec![Some(true), Some(false), Some(true), Some(false), None],
            )
            .add_date(
                3,
                vec![Some(300), Some(100), Some(400), Some(100), Some(200)],
            )
            .build()
    }

    fn all_indices(n: u32) -> Vec<Idx> {
        (0..n).collect()
    }

    // ── Single-column ───────────────────────────────────────────────────

    #[test]
    fn text_asc_is_case_insensitive() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(0)]);
        // alice/Alice tie under case-insensitive cmp; both before Bob, Carol, dave.
        // Stable sort preserves their original order: 1 ("alice") then 3 ("Alice").
        assert_eq!(idxs, vec![1, 3, 2, 0, 4]);
    }

    #[test]
    fn text_desc_reverses() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(&ds, &mut idxs, &[SortSpec::desc(0)]);
        // dave, Carol, Bob, then the alice tie preserved in original relative order.
        assert_eq!(idxs, vec![4, 0, 2, 1, 3]);
    }

    #[test]
    fn number_asc_with_nulls_last() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(1)]);
        // ages: 30, 25, 40, 25, null  →  25(1), 25(3), 30(0), 40(2), null(4)
        assert_eq!(idxs, vec![1, 3, 0, 2, 4]);
    }

    #[test]
    fn number_asc_with_nulls_first() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(
            &ds,
            &mut idxs,
            &[SortSpec {
                column: 1,
                direction: Direction::Asc,
                nulls: NullsPosition::First,
            }],
        );
        assert_eq!(idxs, vec![4, 1, 3, 0, 2]);
    }

    #[test]
    fn number_desc_keeps_nulls_last() {
        // Postgres semantics: NULLS LAST stays last regardless of direction.
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(&ds, &mut idxs, &[SortSpec::desc(1)]);
        // 40(2), 30(0), 25(1), 25(3), null(4)
        assert_eq!(idxs, vec![2, 0, 1, 3, 4]);
    }

    #[test]
    fn date_asc() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(3)]);
        // 100(1), 100(3), 200(4), 300(0), 400(2)
        assert_eq!(idxs, vec![1, 3, 4, 0, 2]);
    }

    #[test]
    fn bool_asc_false_before_true() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(2)]);
        // false: 1, 3   true: 0, 2   null: 4 (last)
        assert_eq!(idxs, vec![1, 3, 0, 2, 4]);
    }

    // ── Multi-column ────────────────────────────────────────────────────

    #[test]
    fn multi_column_primary_then_secondary() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        // primary = age asc, secondary = name asc
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(1), SortSpec::asc(0)]);
        // Ages: 25(1, "alice"), 25(3, "Alice"), 30(0, "Carol"), 40(2, "Bob"), null(4)
        // Within the 25 tier, alice/Alice tie under case-insensitive cmp,
        // so stable sort preserves original order: 1 then 3.
        assert_eq!(idxs, vec![1, 3, 0, 2, 4]);
    }

    #[test]
    fn multi_column_secondary_breaks_tie() {
        // Build a dataset where the primary column has an exact tie that
        // the secondary column breaks unambiguously.
        let ds = Dataset::builder(4)
            .add_number(0, vec![Some(10.0), Some(10.0), Some(20.0), Some(20.0)])
            .add_text(1, opt_strs(&["b", "a", "d", "c"]))
            .build();
        let mut idxs = all_indices(4);
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(0), SortSpec::asc(1)]);
        // Within each group of equal numbers, sort by text:
        // 10/a (1), 10/b (0), 20/c (3), 20/d (2)
        assert_eq!(idxs, vec![1, 0, 3, 2]);
    }

    // ── Edge cases ──────────────────────────────────────────────────────

    #[test]
    fn empty_specs_is_noop() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        let original = idxs.clone();
        sort_indices(&ds, &mut idxs, &[]);
        assert_eq!(idxs, original);
    }

    #[test]
    fn empty_indices() {
        let ds = ds_named();
        let mut idxs: Vec<Idx> = vec![];
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(0)]);
        assert!(idxs.is_empty());
    }

    #[test]
    fn missing_column_skips_that_tier() {
        let ds = ds_named();
        let mut idxs = all_indices(5);
        // primary = nonexistent column 99 (skipped), secondary = age asc
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(99), SortSpec::asc(1)]);
        // Falls through to age ordering
        assert_eq!(idxs, vec![1, 3, 0, 2, 4]);
    }

    #[test]
    fn stable_when_all_keys_equal() {
        // Primary column has the same value for every row.
        let ds = Dataset::builder(4)
            .add_number(0, vec![Some(7.0), Some(7.0), Some(7.0), Some(7.0)])
            .build();
        let mut idxs = vec![3, 0, 2, 1];
        let original = idxs.clone();
        sort_indices(&ds, &mut idxs, &[SortSpec::asc(0)]);
        assert_eq!(idxs, original); // order preserved
    }

    // ── Composes with filter ────────────────────────────────────────────

    #[test]
    fn sort_after_filter_via_mask() {
        let ds = ds_named();
        let mask = apply_filters(
            &ds,
            &[ColumnFilter::Number {
                column: 1,
                op: NumberOp::Lt(35.0),
            }],
        );
        // Filter survivors: rows 0 (30), 1 (25), 3 (25)
        let sorted = sort_from_mask(&ds, &mask, &[SortSpec::asc(1)]);
        // Sorted by age asc: 25(1), 25(3), 30(0)
        assert_eq!(sorted, vec![1, 3, 0]);
    }
}
