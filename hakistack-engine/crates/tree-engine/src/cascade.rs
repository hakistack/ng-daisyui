//! Selection cascade kernels.
//!
//! Two operations the JS tree component already needs but currently does
//! recursively in TS:
//!
//! - [`select_descendants`] — given a root node, return every descendant
//!   index in DFS preorder. The caller adds them to its selection set.
//! - [`cascade_up`] — given the current selection set and a node that just
//!   changed, walk parents and recompute each ancestor's tri-state
//!   (clear / selected / indeterminate) based on its descendants. Returns
//!   `(node_idx, state)` pairs for the affected ancestors.

use crate::dataset::TreeDataset;
use engine_core::{Idx, bitset::Bitset};

/// Tri-state for a node when looking at its descendants' selection.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum NodeState {
    Clear = 0,
    Selected = 1,
    Indeterminate = 2,
}

/// Return every descendant of `root` in DFS preorder, including `root` itself.
/// Used by checkbox-mode trees when the user selects a parent: every
/// descendant gets selected too.
pub fn select_descendants(dataset: &TreeDataset, root: Idx) -> Vec<u32> {
    let arena = &dataset.arena;
    let n = arena.len() as Idx;
    if root >= n {
        return Vec::new();
    }

    let mut out: Vec<u32> = Vec::new();
    let mut stack: Vec<i32> = vec![root as i32];

    while let Some(node) = stack.pop() {
        out.push(node as u32);

        // Push children in reverse so leftmost is visited first.
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

    out
}

/// Walk up from `changed` toward the root, recomputing each ancestor's
/// tri-state from the union of its descendants in `selected`. Returns
/// the chain of `(ancestor_idx, new_state)` pairs.
///
/// O(depth × children-per-level) — typically O(depth) with small fanout.
/// Caller applies the state by updating its own checkbox-state map.
pub fn cascade_up(dataset: &TreeDataset, selected: &Bitset, changed: Idx) -> Vec<(u32, NodeState)> {
    let arena = &dataset.arena;
    let n = arena.len() as Idx;
    if changed >= n {
        return Vec::new();
    }

    let mut out: Vec<(u32, NodeState)> = Vec::new();
    let mut current = arena.parent_of[changed as usize];

    while current >= 0 {
        // Count: how many *direct children* of this node are selected vs.
        // unselected? If all selected ⇒ Selected. If none ⇒ Clear.
        // Mixed (or any descendant indeterminate) ⇒ Indeterminate.
        //
        // For tri-state cascade, we can simplify: walk the entire subtree
        // rooted at `current`, count selected descendants. If 0 → Clear,
        // if covers all leaves of the subtree → Selected, else
        // Indeterminate. This is what the JS impl does and matches user
        // expectation for checkbox trees.
        let state = subtree_state(dataset, selected, current as Idx);
        out.push((current as u32, state));

        current = arena.parent_of[current as usize];
    }

    out
}

/// Compute the tri-state for a single node by inspecting its subtree.
fn subtree_state(dataset: &TreeDataset, selected: &Bitset, root: Idx) -> NodeState {
    let arena = &dataset.arena;
    let mut total: u32 = 0;
    let mut sel: u32 = 0;
    let mut stack: Vec<i32> = vec![root as i32];

    while let Some(node) = stack.pop() {
        // Only count *leaves* — interior nodes' state is derived from leaves.
        // For a tree with no children, the node itself is the leaf.
        let first = arena.first_child[node as usize];
        if first == -1 {
            total += 1;
            if selected.get(node as Idx) {
                sel += 1;
            }
        } else {
            // Push all children.
            let mut c = first;
            while c != -1 {
                stack.push(c);
                c = arena.next_sibling[c as usize];
            }
        }
    }

    if sel == 0 {
        NodeState::Clear
    } else if sel == total {
        NodeState::Selected
    } else {
        NodeState::Indeterminate
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dataset::TreeDataset;

    /// Tree:
    ///   0 Root
    ///   ├── 1 Engineering
    ///   │   ├── 2 Backend
    ///   │   └── 3 Frontend
    ///   └── 4 Marketing
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

    fn selection(idxs: &[Idx], n: u32) -> Bitset {
        let mut b = Bitset::with_capacity(n);
        for &i in idxs {
            b.set(i);
        }
        b
    }

    // ── select_descendants ──────────────────────────────────────────────

    #[test]
    fn select_descendants_includes_self() {
        let d = ds();
        assert_eq!(select_descendants(&d, 0), vec![0, 1, 2, 3, 4]);
        assert_eq!(select_descendants(&d, 1), vec![1, 2, 3]);
        assert_eq!(select_descendants(&d, 2), vec![2]); // leaf
        assert_eq!(select_descendants(&d, 4), vec![4]);
    }

    #[test]
    fn select_descendants_out_of_range_is_empty() {
        let d = ds();
        assert!(select_descendants(&d, 99).is_empty());
    }

    // ── cascade_up ──────────────────────────────────────────────────────

    #[test]
    fn cascade_up_to_indeterminate_when_one_leaf_selected() {
        // Select only Backend (2). Engineering (1) becomes indeterminate;
        // Root (0) becomes indeterminate (only 1 of 3 leaves selected).
        let d = ds();
        let s = selection(&[2], d.n_nodes());
        let result = cascade_up(&d, &s, 2);

        assert_eq!(result.len(), 2);
        assert_eq!(result[0], (1, NodeState::Indeterminate)); // Engineering
        assert_eq!(result[1], (0, NodeState::Indeterminate)); // Root
    }

    #[test]
    fn cascade_up_fully_selected_subtree() {
        // Select Backend AND Frontend (both leaves of Engineering).
        // Engineering ⇒ Selected. Root has Marketing unselected ⇒ Indeterminate.
        let d = ds();
        let s = selection(&[2, 3], d.n_nodes());
        let result = cascade_up(&d, &s, 3);

        assert_eq!(result[0], (1, NodeState::Selected)); // Engineering
        assert_eq!(result[1], (0, NodeState::Indeterminate)); // Root
    }

    #[test]
    fn cascade_up_all_leaves_selected() {
        let d = ds();
        let s = selection(&[2, 3, 4], d.n_nodes());
        let result = cascade_up(&d, &s, 2);

        assert_eq!(result[0], (1, NodeState::Selected)); // Engineering
        assert_eq!(result[1], (0, NodeState::Selected)); // Root
    }

    #[test]
    fn cascade_up_after_clearing_returns_clear_states() {
        // Empty selection — every ancestor should report Clear.
        let d = ds();
        let s = selection(&[], d.n_nodes());
        let result = cascade_up(&d, &s, 2);

        assert_eq!(result[0], (1, NodeState::Clear));
        assert_eq!(result[1], (0, NodeState::Clear));
    }

    #[test]
    fn cascade_up_from_root_returns_empty() {
        let d = ds();
        let s = selection(&[0], d.n_nodes());
        // Root has no parent, so no ancestors to update.
        let result = cascade_up(&d, &s, 0);
        assert!(result.is_empty());
    }
}
