//! Tree dataset: arena topology plus per-node labels.
//!
//! Mirrors the table's `Dataset` shape — ingest once, exchange indices
//! after that. The arena stores topology only; label storage and
//! pre-folding for case-insensitive filter live here.

use engine_core::{
    arena::TreeArena,
    fold::fold_lower,
};

/// One ingested tree.
#[derive(Debug)]
pub struct TreeDataset {
    pub arena:    TreeArena,
    /// Original node labels in DFS preorder. Used for sort/render later.
    pub labels:   Vec<Box<str>>,
    /// Pre-lowercased labels for case-insensitive filter / search.
    pub label_lc: Vec<Box<str>>,
}

impl TreeDataset {
    /// Ingest a flat DFS preorder representation.
    ///
    /// `labels` and `depths` must be the same length; `depths[i]` is the
    /// depth of the i-th node (0 = root). The two arrays come from the
    /// JS side after walking its hierarchical data once — passing flat
    /// arrays is cheaper across the WASM boundary than nested objects.
    pub fn from_dfs(labels: Vec<String>, depths: Vec<u8>) -> Self {
        assert_eq!(
            labels.len(),
            depths.len(),
            "labels and depths must have the same length"
        );
        let arena = TreeArena::from_dfs_depths(&depths);
        let mut raw  = Vec::with_capacity(labels.len());
        let mut lc   = Vec::with_capacity(labels.len());
        for label in labels {
            let folded = fold_lower(&label);
            raw.push(label.into_boxed_str());
            lc.push(folded.into_boxed_str());
        }
        Self {
            arena,
            labels:   raw,
            label_lc: lc,
        }
    }

    pub fn n_nodes(&self) -> u32 {
        self.arena.len() as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ingest_round_trip() {
        let ds = TreeDataset::from_dfs(
            vec!["Root".into(), "Child A".into(), "Child B".into()],
            vec![0, 1, 1],
        );
        assert_eq!(ds.n_nodes(), 3);
        assert_eq!(&*ds.labels[0], "Root");
        assert_eq!(&*ds.label_lc[1], "child a");
    }

    #[test]
    #[should_panic(expected = "same length")]
    fn ingest_rejects_length_mismatch() {
        TreeDataset::from_dfs(vec!["a".into()], vec![0, 1]);
    }
}
