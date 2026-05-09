//! Group kernel.
//!
//! Partitions row indices by one or more columns. Single-pass O(n × depth)
//! using one `FxHashMap` per node. Output preserves **first-seen** order
//! (the row order in which each new key first appears at each level) so
//! footer-row rendering is deterministic without an extra sort.
//!
//! Two entry points:
//!
//! - [`group_by`] for single-field grouping (backwards compatible)
//! - [`group_by_multi`] for nested grouping by N fields, returning a tree of
//!   [`Group`]s where each node's `indices` is the union of all descendant
//!   row indices — ready to feed straight into [`crate::aggregate::compute`]
//!   for per-level footer aggregates
//!
//! `Group` carries a `children: Vec<Group>` field (empty for single-level
//! results) so consumers can treat both cases uniformly.
//!
//! ## Composition with the rest of the pipeline
//!
//! ```text
//!   filter::apply  →  mask          (which rows survive)
//!   group_by(ds, col, RowSet::Mask(&mask))  →  Vec<Group>
//!   for each group:
//!       sort::sort_indices(&ds, &mut g.indices, &specs)
//!       aggregate::compute(&ds, footer_col, RowSet::Indices(&g.indices), AggFn::Sum)
//! ```
//!
//! Null handling: rows whose group-by column is null form their own
//! [`GroupKey::Null`] bucket — matches JS behavior where `undefined` /
//! `null` becomes a distinct key.

use std::collections::hash_map::Entry;
use std::hash::{Hash, Hasher};

use crate::aggregate::RowSet;
use crate::dataset::{Column, ColumnId, Dataset};
use engine_core::{FxHashMap, Idx};

/// One bucket from [`group_by`] or [`group_by_multi`].
///
/// For multi-level results, `indices` contains the union of every descendant
/// row index — so per-level footer aggregates work by passing
/// `RowSet::Indices(&group.indices)` at any depth.
#[derive(Debug, Clone)]
pub struct Group {
    pub key:      GroupKey,
    /// Row indices in source order. For multi-level groups, this is the union
    /// of all descendant indices.
    pub indices:  Vec<Idx>,
    /// Sub-groups one level deeper. Empty for single-level results and for
    /// leaf nodes in multi-level results.
    pub children: Vec<Group>,
}

/// Distinct grouping value. `f64` participates in equality and hashing via its
/// bit pattern, so two groups with the same numeric value collapse to one.
#[derive(Debug, Clone)]
pub enum GroupKey {
    Null,
    Text(Box<str>),
    Number(f64),
    Bool(bool),
    Date(i64),
}

impl GroupKey {
    pub fn is_null(&self) -> bool { matches!(self, GroupKey::Null) }

    pub fn as_text(&self) -> Option<&str> {
        if let GroupKey::Text(s) = self { Some(s) } else { None }
    }

    pub fn as_number(&self) -> Option<f64> {
        if let GroupKey::Number(n) = self { Some(*n) } else { None }
    }

    pub fn as_bool(&self) -> Option<bool> {
        if let GroupKey::Bool(b) = self { Some(*b) } else { None }
    }

    pub fn as_date(&self) -> Option<i64> {
        if let GroupKey::Date(d) = self { Some(*d) } else { None }
    }
}

impl PartialEq for GroupKey {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (GroupKey::Null, GroupKey::Null)             => true,
            (GroupKey::Text(a),   GroupKey::Text(b))     => a == b,
            (GroupKey::Number(a), GroupKey::Number(b))   => a.to_bits() == b.to_bits(),
            (GroupKey::Bool(a),   GroupKey::Bool(b))     => a == b,
            (GroupKey::Date(a),   GroupKey::Date(b))     => a == b,
            _ => false,
        }
    }
}
impl Eq for GroupKey {}

impl Hash for GroupKey {
    fn hash<H: Hasher>(&self, h: &mut H) {
        match self {
            GroupKey::Null         => 0u8.hash(h),
            GroupKey::Text(s)      => { 1u8.hash(h); s.hash(h); }
            GroupKey::Number(n)    => { 2u8.hash(h); n.to_bits().hash(h); }
            GroupKey::Bool(b)      => { 3u8.hash(h); b.hash(h); }
            GroupKey::Date(d)      => { 4u8.hash(h); d.hash(h); }
        }
    }
}

/// Partition `rows` by a single column. Convenience wrapper over
/// [`group_by_multi`]; every returned `Group` has `children` empty.
pub fn group_by(dataset: &Dataset, column: ColumnId, rows: RowSet<'_>) -> Vec<Group> {
    group_by_multi(dataset, &[column], rows)
}

/// Partition `rows` by N columns, producing a tree of [`Group`]s.
///
/// At each level, groups are ordered by first appearance. Each node's
/// `indices` collects every descendant row index, so per-level footer
/// aggregates work uniformly via `RowSet::Indices(&node.indices)`.
///
/// Returns an empty `Vec` if `columns` is empty or any column is missing.
pub fn group_by_multi(
    dataset: &Dataset,
    columns: &[ColumnId],
    rows:    RowSet<'_>,
) -> Vec<Group> {
    if columns.is_empty() {
        return Vec::new();
    }

    let cols: Option<Vec<&Column>> = columns.iter().map(|&id| dataset.column(id)).collect();
    let Some(cols) = cols else {
        return Vec::new();
    };

    // Build the tree using a working representation that carries each level's
    // bucket map alongside its nodes. Finalize strips the bucket maps at the
    // end so the public `Group` doesn't carry construction state.
    let mut roots: Vec<WorkingNode> = Vec::new();
    let mut root_bucket: FxHashMap<GroupKey, usize> = FxHashMap::default();

    crate::aggregate::for_each_index(rows, dataset.n_rows(), |idx| {
        insert_row(&mut roots, &mut root_bucket, &cols, 0, idx);
    });

    finalize(roots)
}

/// Recursive insertion: for `cols[level]`, find or create a child of the
/// current sub-tree's node list, push the row index, then descend.
fn insert_row(
    nodes:  &mut Vec<WorkingNode>,
    bucket: &mut FxHashMap<GroupKey, usize>,
    cols:   &[&Column],
    level:  usize,
    idx:    Idx,
) {
    if level >= cols.len() {
        return;
    }

    let key = read_key(cols[level], idx);

    let pos = match bucket.entry(key) {
        Entry::Occupied(e) => *e.get(),
        Entry::Vacant(e) => {
            // Clone happens once per distinct key per level — never per row.
            let key_for_node = e.key().clone();
            let new_idx = nodes.len();
            nodes.push(WorkingNode::new(key_for_node));
            e.insert(new_idx);
            new_idx
        }
    };

    nodes[pos].indices.push(idx);

    if level + 1 < cols.len() {
        let node = &mut nodes[pos];
        insert_row(&mut node.children, &mut node.bucket, cols, level + 1, idx);
    }
}

fn finalize(nodes: Vec<WorkingNode>) -> Vec<Group> {
    nodes.into_iter().map(|n| Group {
        key:      n.key,
        indices:  n.indices,
        children: finalize(n.children),
    }).collect()
}

/// Construction-only twin of [`Group`] that carries the per-level bucket map.
/// Stripped during [`finalize`].
struct WorkingNode {
    key:      GroupKey,
    indices:  Vec<Idx>,
    children: Vec<WorkingNode>,
    bucket:   FxHashMap<GroupKey, usize>,
}

impl WorkingNode {
    fn new(key: GroupKey) -> Self {
        Self {
            key,
            indices:  Vec::new(),
            children: Vec::new(),
            bucket:   FxHashMap::default(),
        }
    }
}

fn read_key(col: &Column, i: Idx) -> GroupKey {
    let idx = i as usize;
    match col {
        Column::Text(c) => {
            if c.validity.get(i) {
                GroupKey::Text(c.values[idx].clone())
            } else {
                GroupKey::Null
            }
        }
        Column::Number(c) => {
            if c.validity.get(i) {
                GroupKey::Number(c.values[idx])
            } else {
                GroupKey::Null
            }
        }
        Column::Bool(c) => {
            if c.validity.get(i) {
                GroupKey::Bool(c.values[idx])
            } else {
                GroupKey::Null
            }
        }
        Column::Date(c) => {
            if c.validity.get(i) {
                GroupKey::Date(c.values[idx])
            } else {
                GroupKey::Null
            }
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aggregate::{compute as compute_agg, AggFn, AggResult};
    use crate::dataset::Dataset;
    use crate::filter::{apply as apply_filters, ColumnFilter, BoolOp};

    fn opt_strs(v: &[&str]) -> Vec<Option<String>> {
        v.iter().map(|s| Some(s.to_string())).collect()
    }

    /// 6 rows. col 0 = status (text), 1 = revenue (number),
    /// 2 = active (bool), 3 = quarter (date).
    fn ds() -> Dataset {
        Dataset::builder(6)
            .add_text(0,
                vec![
                    Some("active".into()),
                    Some("paused".into()),
                    Some("active".into()),
                    None,
                    Some("active".into()),
                    Some("paused".into()),
                ])
            .add_number(1, vec![Some(100.0), Some(50.0), Some(200.0), Some(30.0), Some(75.0), Some(150.0)])
            .add_bool(2, vec![Some(true), Some(false), Some(true), Some(true), Some(false), Some(false)])
            .add_date(3, vec![Some(100), Some(100), Some(200), Some(200), Some(100), Some(200)])
            .build()
    }

    fn indices_of<'a>(groups: &'a [Group], key: &GroupKey) -> &'a [Idx] {
        &groups.iter().find(|g| &g.key == key).unwrap().indices
    }

    // ── Single-column grouping ──────────────────────────────────────────

    #[test]
    fn group_by_text_preserves_first_seen_order() {
        let g = group_by(&ds(), 0, RowSet::All);
        // First-seen order: "active" (row 0), "paused" (row 1), Null (row 3)
        assert_eq!(g.len(), 3);
        assert_eq!(g[0].key.as_text(), Some("active"));
        assert_eq!(g[1].key.as_text(), Some("paused"));
        assert!(g[2].key.is_null());
    }

    #[test]
    fn group_by_text_collects_correct_rows() {
        let g = group_by(&ds(), 0, RowSet::All);
        assert_eq!(indices_of(&g, &GroupKey::Text("active".into())), &[0, 2, 4]);
        assert_eq!(indices_of(&g, &GroupKey::Text("paused".into())), &[1, 5]);
        assert_eq!(indices_of(&g, &GroupKey::Null), &[3]);
    }

    #[test]
    fn group_by_number() {
        let g = group_by(&ds(), 1, RowSet::All);
        // All distinct numbers → 6 groups of 1 each
        assert_eq!(g.len(), 6);
        for grp in &g {
            assert_eq!(grp.indices.len(), 1);
        }
    }

    #[test]
    fn group_by_bool_makes_two_groups() {
        let g = group_by(&ds(), 2, RowSet::All);
        assert_eq!(g.len(), 2);
        // First-seen: true (row 0), then false (row 1)
        assert_eq!(g[0].key.as_bool(), Some(true));
        assert_eq!(g[0].indices, vec![0, 2, 3]);
        assert_eq!(g[1].key.as_bool(), Some(false));
        assert_eq!(g[1].indices, vec![1, 4, 5]);
    }

    #[test]
    fn group_by_date() {
        let g = group_by(&ds(), 3, RowSet::All);
        // First-seen: 100 (row 0), 200 (row 2)
        assert_eq!(g.len(), 2);
        assert_eq!(g[0].key.as_date(), Some(100));
        assert_eq!(g[0].indices, vec![0, 1, 4]);
        assert_eq!(g[1].key.as_date(), Some(200));
        assert_eq!(g[1].indices, vec![2, 3, 5]);
    }

    // ── Null handling ───────────────────────────────────────────────────

    #[test]
    fn nulls_form_their_own_group() {
        let ds = Dataset::builder(4)
            .add_text(0, vec![Some("a".into()), None, Some("a".into()), None])
            .build();
        let g = group_by(&ds, 0, RowSet::All);
        assert_eq!(g.len(), 2);
        assert_eq!(indices_of(&g, &GroupKey::Text("a".into())), &[0, 2]);
        assert_eq!(indices_of(&g, &GroupKey::Null), &[1, 3]);
    }

    // ── RowSet variants ─────────────────────────────────────────────────

    #[test]
    fn group_after_filter_via_mask() {
        let ds = ds();
        // Filter: only active=true rows  →  rows 0, 2, 3
        let mask = apply_filters(&ds, &[ColumnFilter::Bool {
            column: 2,
            op: BoolOp::Eq(true),
        }]);
        let g = group_by(&ds, 0, RowSet::Mask(&mask));
        // Status of rows 0, 2, 3:  "active", "active", null  → 2 groups
        assert_eq!(g.len(), 2);
        assert_eq!(indices_of(&g, &GroupKey::Text("active".into())), &[0, 2]);
        assert_eq!(indices_of(&g, &GroupKey::Null), &[3]);
    }

    #[test]
    fn group_over_specific_indices() {
        let idxs = [0u32, 1, 2];
        let g = group_by(&ds(), 0, RowSet::Indices(&idxs));
        // Status at 0,1,2:  "active", "paused", "active"
        assert_eq!(g.len(), 2);
        assert_eq!(indices_of(&g, &GroupKey::Text("active".into())), &[0, 2]);
        assert_eq!(indices_of(&g, &GroupKey::Text("paused".into())), &[1]);
    }

    // ── Edge cases ──────────────────────────────────────────────────────

    #[test]
    fn missing_column_returns_empty() {
        assert!(group_by(&ds(), 99, RowSet::All).is_empty());
    }

    #[test]
    fn empty_input_returns_empty() {
        let empty: Vec<Idx> = vec![];
        assert!(group_by(&ds(), 0, RowSet::Indices(&empty)).is_empty());
    }

    #[test]
    fn single_distinct_value_one_group() {
        let ds = Dataset::builder(3)
            .add_text(0, opt_strs(&["x", "x", "x"]))
            .build();
        let g = group_by(&ds, 0, RowSet::All);
        assert_eq!(g.len(), 1);
        assert_eq!(g[0].indices, vec![0, 1, 2]);
    }

    // ── Composition with aggregates ─────────────────────────────────────

    #[test]
    fn per_group_revenue_sum() {
        // The flagship use case: group by status, sum revenue within each group.
        let ds = ds();
        let groups = group_by(&ds, 0, RowSet::All);

        let active = groups.iter().find(|g| g.key.as_text() == Some("active")).unwrap();
        let paused = groups.iter().find(|g| g.key.as_text() == Some("paused")).unwrap();
        let nullg  = groups.iter().find(|g| g.key.is_null()).unwrap();

        // active rows: 0, 2, 4   revenue: 100 + 200 + 75 = 375
        assert_eq!(
            compute_agg(&ds, 1, RowSet::Indices(&active.indices), AggFn::Sum),
            AggResult::Number(375.0)
        );
        // paused rows: 1, 5   revenue: 50 + 150 = 200
        assert_eq!(
            compute_agg(&ds, 1, RowSet::Indices(&paused.indices), AggFn::Sum),
            AggResult::Number(200.0)
        );
        // null group: row 3   revenue: 30
        assert_eq!(
            compute_agg(&ds, 1, RowSet::Indices(&nullg.indices), AggFn::Sum),
            AggResult::Number(30.0)
        );
    }

    #[test]
    fn per_group_count_aggregates() {
        let ds = ds();
        let groups = group_by(&ds, 0, RowSet::All);
        // status counts: active=3, paused=2, null=1
        let counts: Vec<u32> = groups.iter().map(|g| g.indices.len() as u32).collect();
        assert_eq!(counts, vec![3, 2, 1]);
    }

    // ── Multi-level grouping ────────────────────────────────────────────

    /// Mini sales dataset:
    /// row | country | state | revenue
    ///  0  | US      | CA    |  100
    ///  1  | US      | NY    |  200
    ///  2  | US      | CA    |  150
    ///  3  | UK      | LDN   |   90
    ///  4  | UK      | LDN   |  110
    ///  5  | US      | NY    |   50
    fn sales() -> Dataset {
        Dataset::builder(6)
            .add_text(0, opt_strs(&["US", "US", "US", "UK", "UK", "US"]))
            .add_text(1, opt_strs(&["CA", "NY", "CA", "LDN", "LDN", "NY"]))
            .add_number(2, vec![Some(100.0), Some(200.0), Some(150.0), Some(90.0), Some(110.0), Some(50.0)])
            .build()
    }

    #[test]
    fn multi_level_two_columns_builds_tree() {
        let ds = sales();
        let groups = group_by_multi(&ds, &[0, 1], RowSet::All);

        // Top level: US (first-seen), then UK
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].key.as_text(), Some("US"));
        assert_eq!(groups[1].key.as_text(), Some("UK"));

        // US contains all US rows
        assert_eq!(groups[0].indices, vec![0, 1, 2, 5]);
        // UK contains all UK rows
        assert_eq!(groups[1].indices, vec![3, 4]);

        // US has children CA (first), NY (second)
        let us = &groups[0];
        assert_eq!(us.children.len(), 2);
        assert_eq!(us.children[0].key.as_text(), Some("CA"));
        assert_eq!(us.children[0].indices, vec![0, 2]);
        assert_eq!(us.children[1].key.as_text(), Some("NY"));
        assert_eq!(us.children[1].indices, vec![1, 5]);

        // UK has one child LDN
        let uk = &groups[1];
        assert_eq!(uk.children.len(), 1);
        assert_eq!(uk.children[0].key.as_text(), Some("LDN"));
        assert_eq!(uk.children[0].indices, vec![3, 4]);

        // Leaves have empty children
        assert!(us.children[0].children.is_empty());
        assert!(uk.children[0].children.is_empty());
    }

    #[test]
    fn multi_level_aggregates_compose_at_every_depth() {
        let ds = sales();
        let groups = group_by_multi(&ds, &[0, 1], RowSet::All);

        let us = &groups[0];
        let us_ca = &us.children[0];
        let us_ny = &us.children[1];

        // Country-level: US revenue = 100 + 200 + 150 + 50 = 500
        assert_eq!(
            compute_agg(&ds, 2, RowSet::Indices(&us.indices), AggFn::Sum),
            AggResult::Number(500.0)
        );
        // State-level: US/CA revenue = 100 + 150 = 250
        assert_eq!(
            compute_agg(&ds, 2, RowSet::Indices(&us_ca.indices), AggFn::Sum),
            AggResult::Number(250.0)
        );
        // State-level: US/NY revenue = 200 + 50 = 250
        assert_eq!(
            compute_agg(&ds, 2, RowSet::Indices(&us_ny.indices), AggFn::Sum),
            AggResult::Number(250.0)
        );
    }

    #[test]
    fn multi_level_three_columns() {
        // 3 levels: country → state → quarter
        let ds = Dataset::builder(4)
            .add_text(0, opt_strs(&["US", "US", "UK", "US"]))
            .add_text(1, opt_strs(&["CA", "CA", "LDN", "CA"]))
            .add_text(2, opt_strs(&["Q1", "Q2", "Q1", "Q1"]))
            .build();
        let groups = group_by_multi(&ds, &[0, 1, 2], RowSet::All);
        // US/CA/Q1: rows 0, 3
        let us = &groups[0];
        let us_ca = &us.children[0];
        let us_ca_q1 = &us_ca.children[0];
        assert_eq!(us_ca_q1.key.as_text(), Some("Q1"));
        assert_eq!(us_ca_q1.indices, vec![0, 3]);
        // US/CA/Q2: row 1
        let us_ca_q2 = &us_ca.children[1];
        assert_eq!(us_ca_q2.key.as_text(), Some("Q2"));
        assert_eq!(us_ca_q2.indices, vec![1]);
    }

    #[test]
    fn multi_level_with_null_at_some_levels() {
        let ds = Dataset::builder(4)
            .add_text(0, vec![Some("US".into()), None, Some("US".into()), None])
            .add_text(1, opt_strs(&["CA", "CA", "NY", "NY"]))
            .build();
        let groups = group_by_multi(&ds, &[0, 1], RowSet::All);
        // First-seen: "US" (row 0), null (row 1)
        assert_eq!(groups[0].key.as_text(), Some("US"));
        assert!(groups[1].key.is_null());
        // Each top-level has its own state buckets
        assert_eq!(groups[0].children[0].key.as_text(), Some("CA")); // US/CA
        assert_eq!(groups[0].children[1].key.as_text(), Some("NY")); // US/NY
        assert_eq!(groups[1].children[0].key.as_text(), Some("CA")); // null/CA
        assert_eq!(groups[1].children[1].key.as_text(), Some("NY")); // null/NY
    }

    #[test]
    fn multi_level_via_filter_mask() {
        // Filter to only US rows, then multi-group by [country, state].
        let ds = sales();
        let mask = apply_filters(&ds, &[ColumnFilter::Text {
            column: 0,
            op: crate::filter::TextOp::Equals("US".into()),
        }]);
        let groups = group_by_multi(&ds, &[0, 1], RowSet::Mask(&mask));
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].key.as_text(), Some("US"));
        assert_eq!(groups[0].indices, vec![0, 1, 2, 5]);
        assert_eq!(groups[0].children.len(), 2);
    }

    #[test]
    fn empty_columns_returns_empty() {
        assert!(group_by_multi(&sales(), &[], RowSet::All).is_empty());
    }

    #[test]
    fn missing_column_at_any_level_returns_empty() {
        // Even one missing column → empty result, no partial grouping
        assert!(group_by_multi(&sales(), &[0, 99], RowSet::All).is_empty());
        assert!(group_by_multi(&sales(), &[99, 0], RowSet::All).is_empty());
    }

    #[test]
    fn single_level_via_multi_matches_single_level_api() {
        // group_by(col) and group_by_multi(&[col]) must agree.
        let ds = sales();
        let single = group_by(&ds, 0, RowSet::All);
        let multi  = group_by_multi(&ds, &[0], RowSet::All);

        assert_eq!(single.len(), multi.len());
        for (s, m) in single.iter().zip(multi.iter()) {
            assert_eq!(s.key, m.key);
            assert_eq!(s.indices, m.indices);
            assert!(s.children.is_empty());
            assert!(m.children.is_empty());
        }
    }
}
