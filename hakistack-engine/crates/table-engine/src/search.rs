//! Global search kernel.
//!
//! Searches across multiple text columns with a single substring needle.
//! ORs matches across columns: a row matches if **any** specified text
//! column contains the term. Numeric / bool / date columns are silently
//! skipped — non-text columns are not text-searchable.
//!
//! ## Modes
//!
//! - [`SearchMode::Contains`]   — needle anywhere in the cell
//! - [`SearchMode::StartsWith`] — cell starts with needle
//! - [`SearchMode::Exact`]      — cell equals needle
//!
//! Fuzzy search isn't here; that's a separate algorithm with a heavier
//! dependency tree (`nucleo-matcher`). It lives in the `search-engine` crate
//! so callers that don't need fuzzy don't pull it in.
//!
//! ## Case sensitivity
//!
//! Default is case-insensitive: the needle is folded once via
//! [`engine_core::fold::fold_lower`] and matched against each column's
//! pre-folded `lower` buffer. Set `case_sensitive: true` to compare against
//! the raw `values` buffer instead.

use crate::dataset::{Column, ColumnId, Dataset, TextColumn};
use engine_core::{
    bitset::Bitset,
    fold::{contains_bytes, finder, fold_lower},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchMode {
    Contains,
    StartsWith,
    Exact,
}

#[derive(Debug, Clone)]
pub struct SearchSpec {
    /// The substring to look for. Empty string ⇒ no-op (returns all-zeros).
    pub term: String,
    pub mode: SearchMode,
    /// Columns to search. Empty ⇒ every text column in the dataset.
    /// Non-text columns in the list are silently skipped.
    pub columns: Vec<ColumnId>,
    pub case_sensitive: bool,
}

/// Apply a search and return the matching-row mask.
///
/// Empty term ⇒ all-zeros mask (no rows match), matching the JS behavior of
/// `if (!searchTerm) return data;` — callers compose with the filter mask
/// at the call site, where an empty search means "no constraint added".
pub fn apply_search(dataset: &Dataset, spec: &SearchSpec) -> Bitset {
    let n = dataset.n_rows();
    let mut out = Bitset::with_capacity(n);

    if spec.term.is_empty() {
        return out;
    }

    let needle = if spec.case_sensitive {
        spec.term.clone()
    } else {
        fold_lower(&spec.term)
    };
    let f = finder(&needle);

    // Resolve target columns. Empty `columns` ⇒ scan every text column.
    let targets: Vec<&TextColumn> = if spec.columns.is_empty() {
        dataset
            .iter_columns()
            .filter_map(|(_, c)| {
                if let Column::Text(t) = c {
                    Some(t)
                } else {
                    None
                }
            })
            .collect()
    } else {
        spec.columns
            .iter()
            .filter_map(|&id| match dataset.column(id) {
                Some(Column::Text(t)) => Some(t),
                _ => None,
            })
            .collect()
    };

    if targets.is_empty() {
        return out;
    }

    for col in targets {
        match spec.mode {
            SearchMode::Contains => {
                let haystack = if spec.case_sensitive {
                    &col.values
                } else {
                    &col.lower
                };
                for i in 0..n {
                    if !out.get(i)
                        && col.validity.get(i)
                        && contains_bytes(&haystack[i as usize], &f)
                    {
                        out.set(i);
                    }
                }
            }
            SearchMode::StartsWith => {
                let haystack = if spec.case_sensitive {
                    &col.values
                } else {
                    &col.lower
                };
                for i in 0..n {
                    if !out.get(i)
                        && col.validity.get(i)
                        && haystack[i as usize].starts_with(&*needle)
                    {
                        out.set(i);
                    }
                }
            }
            SearchMode::Exact => {
                let haystack = if spec.case_sensitive {
                    &col.values
                } else {
                    &col.lower
                };
                for i in 0..n {
                    if !out.get(i) && col.validity.get(i) && *haystack[i as usize] == *needle {
                        out.set(i);
                    }
                }
            }
        }
    }

    out
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

    fn matches(b: &Bitset) -> Vec<Idx> {
        b.iter().collect()
    }

    fn ds() -> Dataset {
        // 5 rows, 3 columns: name (text), email (text), age (number).
        // Search should match across name + email but ignore age.
        Dataset::builder(5)
            .add_text(0, opt_strs(&["Alice", "Bob", "Carol", "alice", "Dave"]))
            .add_text(1, opt_strs(&["a@x", "b@x", "c@x", "alt@y", "d@x"]))
            .add_number(
                2,
                vec![Some(30.0), Some(25.0), Some(35.0), Some(28.0), Some(40.0)],
            )
            .build()
    }

    #[test]
    fn contains_is_case_insensitive_by_default() {
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "ALI".into(),
                mode: SearchMode::Contains,
                columns: vec![],
                case_sensitive: false,
            },
        );
        // "Alice" (0), "alice" (3), "alt@y" (3) — but row 3 only counted once.
        assert_eq!(matches(&m), vec![0, 3]);
    }

    #[test]
    fn case_sensitive_flag_changes_results() {
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "ali".into(),
                mode: SearchMode::Contains,
                columns: vec![],
                case_sensitive: true,
            },
        );
        // Only "alice" (3) matches case-sensitively (no "ali" in "Alice")
        // but "alt" doesn't contain "ali" either. Wait — "alt" doesn't contain "ali" sub.
        // Re-examining: "alice" contains "ali" lowercase ⇒ row 3 matches.
        assert_eq!(matches(&m), vec![3]);
    }

    #[test]
    fn search_or_combines_across_columns() {
        // Term "@x" appears only in the email column.
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "@x".into(),
                mode: SearchMode::Contains,
                columns: vec![],
                case_sensitive: false,
            },
        );
        // emails ending in @x: rows 0, 1, 2, 4 (not row 3 which is alt@y)
        assert_eq!(matches(&m), vec![0, 1, 2, 4]);
    }

    #[test]
    fn limited_columns_search_only_those() {
        // Column 0 only — should NOT match the email-only term.
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "@x".into(),
                mode: SearchMode::Contains,
                columns: vec![0],
                case_sensitive: false,
            },
        );
        assert_eq!(m.count_ones(), 0);
    }

    #[test]
    fn starts_with_mode() {
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "ali".into(),
                mode: SearchMode::StartsWith,
                columns: vec![0],
                case_sensitive: false,
            },
        );
        // "Alice" (0) and "alice" (3) start with "ali" case-insensitively
        assert_eq!(matches(&m), vec![0, 3]);
    }

    #[test]
    fn exact_mode() {
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "alice".into(),
                mode: SearchMode::Exact,
                columns: vec![0],
                case_sensitive: false,
            },
        );
        // Both "Alice" and "alice" are exact matches case-insensitively.
        assert_eq!(matches(&m), vec![0, 3]);
    }

    #[test]
    fn empty_term_returns_no_matches() {
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "".into(),
                mode: SearchMode::Contains,
                columns: vec![],
                case_sensitive: false,
            },
        );
        assert_eq!(m.count_ones(), 0);
    }

    #[test]
    fn non_text_columns_are_silently_skipped() {
        // Column 2 is a number column — searching in it must not error,
        // and must produce zero matches (not panic).
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "30".into(),
                mode: SearchMode::Contains,
                columns: vec![2],
                case_sensitive: false,
            },
        );
        assert_eq!(m.count_ones(), 0);
    }

    #[test]
    fn null_values_never_match() {
        let ds = Dataset::builder(3)
            .add_text(0, vec![Some("foo".into()), None, Some("bar".into())])
            .build();
        let m = apply_search(
            &ds,
            &SearchSpec {
                term: "o".into(),
                mode: SearchMode::Contains,
                columns: vec![],
                case_sensitive: false,
            },
        );
        // null at row 1 must not match
        assert_eq!(matches(&m), vec![0]);
    }

    #[test]
    fn missing_column_id_is_skipped() {
        let m = apply_search(
            &ds(),
            &SearchSpec {
                term: "alice".into(),
                mode: SearchMode::Contains,
                columns: vec![99], // doesn't exist
                case_sensitive: false,
            },
        );
        assert_eq!(m.count_ones(), 0);
    }
}
