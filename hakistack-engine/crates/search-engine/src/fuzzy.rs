//! Fuzzy search via `nucleo-matcher` (the same matcher behind helix / fzf).
//!
//! Unlike the table's literal global search, this kernel ranks results by
//! score — closer matches sort to the top. Used by `<hk-command-palette>`
//! and `<hk-select>` for their per-keystroke item filtering.
//!
//! ## Marshalling principle
//!
//! Strings are converted to `Utf32String` once at ingest. Per-query work is
//! a hot loop of `matcher.fuzzy_match(haystack, needle)` calls; the matcher
//! is reused across every haystack so its scratch buffers stay warm.

use engine_core::Idx;
use nucleo_matcher::{Config, Matcher, Utf32String};

#[derive(Debug, Clone, Copy, Default)]
pub struct FuzzyOpts {
    /// Match case exactly. Default `false` ⇒ case-insensitive matching.
    pub case_sensitive: bool,
    /// Cap on the result set. `None` ⇒ return every match.
    pub max_results: Option<u32>,
}

#[derive(Debug)]
pub struct FuzzyIndex {
    haystacks: Vec<Utf32String>,
}

impl FuzzyIndex {
    /// Build from a list of strings. Each string becomes one searchable item;
    /// the index `i` in the input is what `search` returns.
    pub fn from_items(items: Vec<String>) -> Self {
        Self {
            haystacks: items.into_iter().map(Utf32String::from).collect(),
        }
    }

    pub fn n_items(&self) -> u32 {
        self.haystacks.len() as u32
    }

    /// Score every haystack against `query`. Returns `(item_idx, score)` pairs
    /// sorted by score descending. Ties fall back to the original input order
    /// (lower index first) so the result is deterministic.
    ///
    /// Empty query ⇒ empty result. Callers usually compose this with a
    /// "show everything when no query" branch on the JS side.
    pub fn search(&self, query: &str, opts: FuzzyOpts) -> Vec<(Idx, u16)> {
        if query.is_empty() || self.haystacks.is_empty() {
            return Vec::new();
        }

        let mut config = Config::DEFAULT;
        config.ignore_case = !opts.case_sensitive;

        let mut matcher = Matcher::new(config);
        let needle = Utf32String::from(query);

        let mut results: Vec<(Idx, u16)> = Vec::new();
        for (i, h) in self.haystacks.iter().enumerate() {
            if let Some(score) = matcher.fuzzy_match(h.slice(..), needle.slice(..)) {
                results.push((i as Idx, score));
            }
        }

        results.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));

        if let Some(max) = opts.max_results {
            results.truncate(max as usize);
        }
        results
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn idx_score(items: &[(Idx, u16)]) -> Vec<Idx> {
        items.iter().map(|(i, _)| *i).collect()
    }

    fn sample() -> FuzzyIndex {
        FuzzyIndex::from_items(vec![
            "open file".into(),
            "open folder".into(),
            "save file".into(),
            "close all".into(),
            "FOOBAR".into(),
        ])
    }

    #[test]
    fn empty_query_returns_empty() {
        let i = sample();
        assert!(i.search("", FuzzyOpts::default()).is_empty());
    }

    #[test]
    fn empty_index_returns_empty() {
        let i = FuzzyIndex::from_items(vec![]);
        assert!(i.search("anything", FuzzyOpts::default()).is_empty());
    }

    #[test]
    fn matches_are_ranked_by_score() {
        let i = sample();
        let results = i.search("open file", FuzzyOpts::default());
        assert!(!results.is_empty());
        // "open file" must outrank "open folder" because it matches every char.
        assert_eq!(results[0].0, 0);
        // "save file" should score lower (only "file" matches contiguously).
        let positions: Vec<Idx> = idx_score(&results);
        let pos_open_file   = positions.iter().position(|&i| i == 0).unwrap();
        let pos_save_file   = positions.iter().position(|&i| i == 2);
        if let Some(p) = pos_save_file {
            assert!(p > pos_open_file);
        }
    }

    #[test]
    fn fuzzy_subsequence_match() {
        // "opnfl" should still match "open file".
        let i = sample();
        let results = i.search("opnfl", FuzzyOpts::default());
        let positions: Vec<Idx> = idx_score(&results);
        assert!(positions.contains(&0));
    }

    #[test]
    fn case_insensitive_default() {
        let i = sample();
        let results = i.search("foobar", FuzzyOpts::default());
        let positions: Vec<Idx> = idx_score(&results);
        assert!(positions.contains(&4)); // FOOBAR matches "foobar" case-insensitively
    }

    #[test]
    fn case_sensitive_misses() {
        let i = sample();
        let results = i.search(
            "foobar",
            FuzzyOpts { case_sensitive: true, max_results: None },
        );
        let positions: Vec<Idx> = idx_score(&results);
        // FOOBAR doesn't case-sensitive-match "foobar".
        assert!(!positions.contains(&4));
    }

    #[test]
    fn max_results_caps_output() {
        let i = sample();
        let results = i.search(
            "o",
            FuzzyOpts { case_sensitive: false, max_results: Some(2) },
        );
        assert!(results.len() <= 2);
    }

    #[test]
    fn ties_preserve_input_order() {
        // Two identical haystacks → equal score → input-order tiebreak.
        let i = FuzzyIndex::from_items(vec!["abc".into(), "abc".into(), "abc".into()]);
        let results = i.search("abc", FuzzyOpts::default());
        let positions: Vec<Idx> = idx_score(&results);
        assert_eq!(positions, vec![0, 1, 2]);
    }
}
