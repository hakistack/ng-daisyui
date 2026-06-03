//! Flatten kernel.
//!
//! Walks the tree in DFS preorder and emits one entry per visible node whose
//! ancestor chain is entirely expanded. Output is a flat `Vec<u32>` of triples
//! `(node_idx, depth, has_children)` packed for cheap transport across the
//! WASM boundary — JS reads in groups of three.
//!
//! `has_children` here means "the node has at least one **visible** child"
//! after applying the current visibility mask. If a node has children in the
//! arena but they're all hidden by filter, `has_children` is 0 and the UI
//! won't render an expand chevron for it.

use crate::dataset::TreeDataset;
use engine_core::{Idx, arena::TreeArena, bitset::Bitset};

/// Output triple per emitted row.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FlatRow {
    pub node: u32,
    pub depth: u32,
    pub has_children: u32, // 0 or 1
}

/// Flatten the tree into the rendered row sequence.
///
/// `visible` — output of [`crate::filter::filter`] (or all-ones for unfiltered).
/// `expanded` — set of node indices that are currently expanded.
///   Roots are always emitted regardless of "expanded" status; descendants
///   only appear when every ancestor up the chain is in `expanded`.
pub fn flatten(dataset: &TreeDataset, visible: &Bitset, expanded: &Bitset) -> Vec<FlatRow> {
    let arena = &dataset.arena;
    let mut out: Vec<FlatRow> = Vec::new();

    // Walk in source order so siblings appear in their original order.
    // Iterative DFS using first_child / next_sibling pointers — no recursion.
    let n = arena.len() as Idx;
    if n == 0 {
        return out;
    }

    // Find roots: any node with parent == -1.
    let mut roots: Vec<i32> = Vec::new();
    for i in (0..n as i32).rev() {
        if arena.parent_of[i as usize] == -1 {
            roots.push(i);
        }
    }

    while let Some(node) = roots.pop() {
        emit_subtree(arena, dataset, visible, expanded, node, &mut out);
    }

    out
}

fn emit_subtree(
    arena: &TreeArena,
    _dataset: &TreeDataset,
    visible: &Bitset,
    expanded: &Bitset,
    root: i32,
    out: &mut Vec<FlatRow>,
) {
    // Iterative DFS with a stack of nodes to visit. Maintain "is this node's
    // ancestor chain fully expanded?" by tracking the open path.
    let mut stack: Vec<i32> = Vec::new();
    stack.push(root);

    while let Some(node) = stack.pop() {
        let i = node as Idx;
        if !visible.get(i) {
            continue;
        }

        // has_children: any visible child?
        let mut has_visible_child = false;
        let mut c = arena.first_child[node as usize];
        while c != -1 {
            if visible.get(c as Idx) {
                has_visible_child = true;
                break;
            }
            c = arena.next_sibling[c as usize];
        }

        out.push(FlatRow {
            node: i,
            depth: arena.depth_of[node as usize] as u32,
            has_children: if has_visible_child { 1 } else { 0 },
        });

        // Descend only if this node is expanded. Roots are not auto-expanded —
        // matches the existing JS behavior where roots show by default but
        // their children only appear once the user clicks the chevron.
        if !expanded.get(i) {
            continue;
        }

        // Push children in REVERSE so the first child is processed first.
        let mut chain: Vec<i32> = Vec::new();
        let mut c = arena.first_child[node as usize];
        while c != -1 {
            chain.push(c);
            c = arena.next_sibling[c as usize];
        }
        for c in chain.into_iter().rev() {
            stack.push(c);
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dataset::TreeDataset;
    use crate::filter::{FilterMode, FilterSpec, filter};
    use engine_core::Idx;

    /// Tree (same as filter tests):
    ///   0 "Root"
    ///   ├── 1 "Engineering"
    ///   │   ├── 2 "Backend"
    ///   │   └── 3 "Frontend"
    ///   └── 4 "Marketing"
    fn ds() -> TreeDataset {
        TreeDataset::from_dfs(
            vec![
                "Root".into(),
                "Engineering".into(),
                "Backend".into(),
                "Frontend".into(),
                "Marketing".into(),
            ],
            vec![0, 1, 2, 2, 1],
        )
        .unwrap()
    }

    fn all_visible(n: u32) -> Bitset {
        let mut b = Bitset::with_capacity(n);
        b.fill();
        b
    }

    fn no_expanded(n: u32) -> Bitset {
        Bitset::with_capacity(n)
    }

    fn expand(nodes: &[Idx], n: u32) -> Bitset {
        let mut b = Bitset::with_capacity(n);
        for &i in nodes {
            b.set(i);
        }
        b
    }

    fn nodes(out: &[FlatRow]) -> Vec<u32> {
        out.iter().map(|r| r.node).collect()
    }

    #[test]
    fn collapsed_root_only_emits_root() {
        let d = ds();
        let v = all_visible(d.n_nodes());
        let e = no_expanded(d.n_nodes());
        let out = flatten(&d, &v, &e);
        assert_eq!(nodes(&out), vec![0]);
        assert_eq!(out[0].depth, 0);
        assert_eq!(out[0].has_children, 1);
    }

    #[test]
    fn expanded_root_shows_children() {
        let d = ds();
        let v = all_visible(d.n_nodes());
        let e = expand(&[0], d.n_nodes());
        let out = flatten(&d, &v, &e);
        assert_eq!(nodes(&out), vec![0, 1, 4]);
        // Engineering has children but isn't expanded yet.
        assert_eq!(out[1].has_children, 1);
        assert_eq!(out[1].depth, 1);
        // Marketing has no children.
        assert_eq!(out[2].has_children, 0);
    }

    #[test]
    fn expanded_full_path_shows_grandchildren() {
        let d = ds();
        let v = all_visible(d.n_nodes());
        let e = expand(&[0, 1], d.n_nodes());
        let out = flatten(&d, &v, &e);
        assert_eq!(nodes(&out), vec![0, 1, 2, 3, 4]);
        assert_eq!(out[2].depth, 2);
        assert_eq!(out[3].depth, 2);
    }

    #[test]
    fn child_expanded_but_parent_collapsed_is_invisible() {
        let d = ds();
        let v = all_visible(d.n_nodes());
        // Engineering (1) is expanded but Root (0) is NOT — so children of
        // Engineering should still be hidden because Root is collapsed.
        let e = expand(&[1], d.n_nodes());
        let out = flatten(&d, &v, &e);
        assert_eq!(nodes(&out), vec![0]); // only root visible
    }

    #[test]
    fn filtered_subtree_collapses_into_visible_path() {
        let d = ds();
        let visible = filter(
            &d,
            &FilterSpec {
                term: "back".into(),
                mode: FilterMode::Lenient,
                case_sensitive: false,
            },
        );
        // visible = {0 (Root), 1 (Engineering), 2 (Backend)}
        // With everything expanded, output is {0, 1, 2} — Frontend hidden,
        // Marketing hidden, even though they're "expanded" in the set.
        let e = expand(&[0, 1], d.n_nodes());
        let out = flatten(&d, &visible, &e);
        assert_eq!(nodes(&out), vec![0, 1, 2]);
    }

    #[test]
    fn has_children_false_when_all_children_filtered_out() {
        // Filter to "Backend" only — Engineering still visible (lenient ancestor)
        // but its OTHER child (Frontend) is hidden. has_children for
        // Engineering must reflect "still has 1 visible child" (Backend).
        let d = ds();
        let visible = filter(
            &d,
            &FilterSpec {
                term: "back".into(),
                mode: FilterMode::Lenient,
                case_sensitive: false,
            },
        );
        let e = expand(&[0, 1], d.n_nodes());
        let out = flatten(&d, &visible, &e);
        // Find Engineering in output
        let eng = out.iter().find(|r| r.node == 1).unwrap();
        assert_eq!(eng.has_children, 1); // Backend still visible

        let backend = out.iter().find(|r| r.node == 2).unwrap();
        assert_eq!(backend.has_children, 0); // leaf, no children at all
    }

    #[test]
    fn empty_tree() {
        let d = TreeDataset::from_dfs(vec![], vec![]).unwrap();
        let v = all_visible(0);
        let e = no_expanded(0);
        let out = flatten(&d, &v, &e);
        assert!(out.is_empty());
    }

    #[test]
    fn forest_emits_roots_in_order() {
        // Two-root forest: 0 → [1], 2 → [3]
        let d = TreeDataset::from_dfs(
            vec!["A".into(), "Aa".into(), "B".into(), "Ba".into()],
            vec![0, 1, 0, 1],
        )
        .unwrap();
        let v = all_visible(d.n_nodes());
        let e = expand(&[0, 2], d.n_nodes());
        let out = flatten(&d, &v, &e);
        assert_eq!(nodes(&out), vec![0, 1, 2, 3]);
    }
}
