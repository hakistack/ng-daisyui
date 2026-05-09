//! Tree filter kernel.
//!
//! Two modes match the existing JS behavior:
//!
//! - [`FilterMode::Lenient`] — a node is visible if **it OR any descendant**
//!   matches. The natural tree-search UX where typing "engine" reveals every
//!   node containing "engine" plus the ancestor chain so context isn't lost.
//! - [`FilterMode::Strict`]  — a node is visible only if **it matches
//!   directly**. Hides ancestors whose only "match" is via a descendant.
//!
//! Single linear pass over the arena in postorder (children before parents),
//! so the lenient bubble-up requires no recursion. Output is a [`Bitset`]
//! of length `n_nodes` where bit `i` is 1 iff node `i` is visible.

use crate::dataset::TreeDataset;
use engine_core::{
    bitset::Bitset,
    fold::{contains_bytes, finder, fold_lower},
    Idx,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterMode {
    Lenient,
    Strict,
}

#[derive(Debug, Clone)]
pub struct FilterSpec {
    pub term:           String,
    pub mode:           FilterMode,
    pub case_sensitive: bool,
}

/// Run a label filter, return the visibility bitset.
///
/// Empty term ⇒ all-ones mask (everything visible) — matches the JS
/// "no filter, show all" behavior.
pub fn filter(dataset: &TreeDataset, spec: &FilterSpec) -> Bitset {
    let n = dataset.n_nodes();
    let mut visible = Bitset::with_capacity(n);

    if spec.term.is_empty() {
        visible.fill();
        return visible;
    }

    let needle = if spec.case_sensitive {
        spec.term.clone()
    } else {
        fold_lower(&spec.term)
    };
    let f = finder(&needle);

    // Compute per-node "self matches" first.
    let mut self_match = Bitset::with_capacity(n);
    for i in 0..n {
        let haystack = if spec.case_sensitive {
            &dataset.labels[i as usize]
        } else {
            &dataset.label_lc[i as usize]
        };
        if contains_bytes(haystack, &f) {
            self_match.set(i);
        }
    }

    match spec.mode {
        FilterMode::Strict => self_match,
        FilterMode::Lenient => {
            // Bubble matches UP: if any descendant matches, the ancestor is
            // also visible. We walk in postorder via the arena's exit-order
            // so each parent is visited only after all its descendants.
            //
            // exit_order is dense in [0, 2*n) but only n of those are exit
            // events. Sorting node indices by exit_order gives postorder.
            let mut order: Vec<Idx> = (0..n).collect();
            order.sort_by_key(|&i| dataset.arena.exit_order[i as usize]);

            for &i in &order {
                if self_match.get(i) {
                    visible.set(i);
                }
                // If this node ends up visible, propagate to the parent.
                if visible.get(i) {
                    let p = dataset.arena.parent_of[i as usize];
                    if p >= 0 {
                        visible.set(p as Idx);
                    }
                }
            }
            visible
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dataset::TreeDataset;

    /// Tree:
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
    }

    fn matches(b: &Bitset) -> Vec<Idx> {
        b.iter().collect()
    }

    #[test]
    fn empty_term_shows_everything() {
        let v = filter(&ds(), &FilterSpec {
            term: "".into(),
            mode: FilterMode::Lenient,
            case_sensitive: false,
        });
        assert_eq!(v.count_ones(), 5);
    }

    #[test]
    fn lenient_keeps_ancestors_of_matches_visible() {
        let v = filter(&ds(), &FilterSpec {
            term: "back".into(),
            mode: FilterMode::Lenient,
            case_sensitive: false,
        });
        // "Backend" (2) matches; ancestors "Engineering" (1) and "Root" (0)
        // also become visible. "Frontend" (3) and "Marketing" (4) hidden.
        assert_eq!(matches(&v), vec![0, 1, 2]);
    }

    #[test]
    fn strict_hides_ancestors_that_dont_directly_match() {
        let v = filter(&ds(), &FilterSpec {
            term: "back".into(),
            mode: FilterMode::Strict,
            case_sensitive: false,
        });
        // Only "Backend" matches its own label.
        assert_eq!(matches(&v), vec![2]);
    }

    #[test]
    fn case_insensitive_default() {
        let v = filter(&ds(), &FilterSpec {
            term: "ENGINEER".into(),
            mode: FilterMode::Lenient,
            case_sensitive: false,
        });
        // "Engineering" (1) matches → ancestors visible too.
        // Children of Engineering are NOT made visible — lenient bubbles UP.
        assert_eq!(matches(&v), vec![0, 1]);
    }

    #[test]
    fn case_sensitive_misses() {
        let v = filter(&ds(), &FilterSpec {
            term: "ENGINEER".into(),
            mode: FilterMode::Lenient,
            case_sensitive: true,
        });
        assert_eq!(v.count_ones(), 0);
    }

    #[test]
    fn match_at_root_makes_only_root_visible_in_strict() {
        let v = filter(&ds(), &FilterSpec {
            term: "Root".into(),
            mode: FilterMode::Strict,
            case_sensitive: false,
        });
        assert_eq!(matches(&v), vec![0]);
    }

    #[test]
    fn match_at_root_lenient_does_not_show_descendants() {
        // Lenient bubbles UP not DOWN: matching the root doesn't make all
        // descendants visible.
        let v = filter(&ds(), &FilterSpec {
            term: "Root".into(),
            mode: FilterMode::Lenient,
            case_sensitive: false,
        });
        assert_eq!(matches(&v), vec![0]);
    }

    #[test]
    fn no_match_lenient_yields_empty() {
        let v = filter(&ds(), &FilterSpec {
            term: "xyz-not-here".into(),
            mode: FilterMode::Lenient,
            case_sensitive: false,
        });
        assert_eq!(v.count_ones(), 0);
    }
}
