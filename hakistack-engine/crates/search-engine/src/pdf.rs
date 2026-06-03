//! PDF in-document substring search.
//!
//! The JS side calls PDF.js's `getTextContent()` per page (lazy, cached) and
//! hands the resulting `Vec<String>` of text items to [`PdfIndex::add_page`].
//! We pre-compute everything searches need:
//!
//! - `raw` — items joined into one string for case-sensitive search
//! - `lower` — Unicode-folded copy for case-insensitive search
//! - `item_starts` — char offsets where each text item starts. Lets the
//!   highlight painter resolve a `(char_start, char_len)` hit back to the
//!   sequence of text-layer spans it overlaps via binary search.
//!
//! Pages are stored sparsely in an `Option<PageEntry>` vector — pages whose
//! text hasn't been read yet are `None` and the search just skips them.

use engine_core::fold::{contains_bytes, finder, fold_lower};
use memchr::memmem::Finder;

#[derive(Debug, Clone, Copy)]
pub struct Hit {
    pub page: u32,
    pub char_start: u32,
    pub char_len: u32,
}

#[derive(Debug, Clone, Copy)]
pub struct ResolvedHit {
    /// First text-item index the hit overlaps.
    pub item_start: u32,
    /// Last text-item index the hit overlaps (inclusive).
    pub item_end: u32,
    /// Char offset within `item_start` where the hit begins.
    pub intra_start: u32,
    /// Char offset within `item_end` (exclusive) where the hit ends.
    pub intra_end: u32,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct SearchOpts {
    /// Match case exactly. Default `false` ⇒ case-insensitive.
    pub case_sensitive: bool,
    /// Match only when the hit is bounded by ASCII word breaks on both sides.
    pub whole_word: bool,
    /// Cap on hits returned. `0` ⇒ unlimited.
    pub max_hits: u32,
}

#[derive(Debug)]
struct PageEntry {
    raw: Box<str>,
    lower: Box<str>,
    /// `item_starts[i]` is the char offset where text item `i` begins in
    /// `raw` / `lower` (they share offsets — folding preserves byte
    /// positions for the ASCII-mostly text PDFs typically have, and we
    /// always compute against the variant we're searching).
    item_starts: Vec<u32>,
}

#[derive(Debug)]
pub struct PdfIndex {
    pages: Vec<Option<PageEntry>>,
}

impl PdfIndex {
    /// Empty index sized for `page_count` pages. Pages start as `None`;
    /// callers fill them in via [`add_page`] as PDF.js produces text content.
    pub fn new(page_count: u32) -> Self {
        let mut pages = Vec::with_capacity(page_count as usize);
        for _ in 0..page_count {
            pages.push(None);
        }
        Self { pages }
    }

    pub fn n_pages(&self) -> u32 {
        self.pages.len() as u32
    }

    /// Whether a page's text has been ingested yet. Useful for the JS layer
    /// to know whether searching this page produces stale results.
    pub fn has_page(&self, page: u32) -> bool {
        self.pages
            .get(page as usize)
            .map(|p| p.is_some())
            .unwrap_or(false)
    }

    /// Ingest a page's text items. The order of `text_items` matches the
    /// order PDF.js `getTextContent()` returns them — same order the text
    /// layer renders DOM spans, so item indices map back to spans 1-to-1.
    pub fn add_page(&mut self, page: u32, text_items: Vec<String>) {
        if (page as usize) >= self.pages.len() {
            return;
        }

        let mut item_starts: Vec<u32> = Vec::with_capacity(text_items.len() + 1);
        let mut raw_bytes: usize = 0;
        for item in &text_items {
            item_starts.push(raw_bytes as u32);
            raw_bytes += item.len();
        }
        // Sentinel for end-of-text — makes binary search at the end clean.
        item_starts.push(raw_bytes as u32);

        let mut raw = String::with_capacity(raw_bytes);
        for item in text_items {
            raw.push_str(&item);
        }
        let lower = fold_lower(&raw);

        self.pages[page as usize] = Some(PageEntry {
            raw: raw.into_boxed_str(),
            lower: lower.into_boxed_str(),
            item_starts,
        });
    }

    /// Run a search across every ingested page. Hits come back in
    /// `(page, char_start)` order — page-asc first, then position-asc within.
    /// Empty query ⇒ no hits.
    pub fn search(&self, query: &str, opts: SearchOpts) -> Vec<Hit> {
        if query.is_empty() {
            return Vec::new();
        }

        // Build the matcher once per call. Folding the needle here matches
        // the per-page haystack we'll search against.
        let needle_owned: String = if opts.case_sensitive {
            query.to_string()
        } else {
            fold_lower(query)
        };
        let needle_bytes = needle_owned.as_bytes();
        let f: Finder<'_> = finder(&needle_owned);

        let mut hits: Vec<Hit> = Vec::new();
        let cap = if opts.max_hits == 0 {
            u32::MAX
        } else {
            opts.max_hits
        };

        for (page_idx, slot) in self.pages.iter().enumerate() {
            if hits.len() as u32 >= cap {
                break;
            }
            let Some(entry) = slot else { continue };
            let haystack = if opts.case_sensitive {
                &entry.raw
            } else {
                &entry.lower
            };

            // Skip whole-page check: contains is a quick reject before we
            // pay for full iteration. Only useful when whole-word adds work.
            if opts.whole_word && !contains_bytes(haystack, &f) {
                continue;
            }

            let bytes = haystack.as_bytes();
            for pos in f.find_iter(bytes) {
                if hits.len() as u32 >= cap {
                    break;
                }
                let end = pos + needle_bytes.len();

                if opts.whole_word && !is_word_isolated(bytes, pos, end) {
                    continue;
                }

                hits.push(Hit {
                    page: page_idx as u32,
                    char_start: pos as u32,
                    char_len: needle_bytes.len() as u32,
                });
            }
        }

        hits
    }

    /// Resolve a hit's `(char_start, char_len)` to the text-item indices it
    /// overlaps. Returns `None` if the page hasn't been ingested or the
    /// position is out of range.
    pub fn resolve_hit(&self, page: u32, char_start: u32, char_len: u32) -> Option<ResolvedHit> {
        let entry = self.pages.get(page as usize)?.as_ref()?;
        if char_len == 0 {
            return None;
        }
        let end = char_start + char_len;
        // Safety: item_starts.len() ≥ 2 (sentinel + at least one item) when
        // any page is ingested, but a page can be ingested with an empty
        // text-items list — guard that path.
        if entry.item_starts.len() < 2 {
            return None;
        }

        let item_start = item_index_for(entry.item_starts.as_slice(), char_start);
        let item_end = item_index_for(entry.item_starts.as_slice(), end - 1);
        let intra_start = char_start - entry.item_starts[item_start as usize];
        let intra_end = end - entry.item_starts[item_end as usize];

        Some(ResolvedHit {
            item_start,
            item_end,
            intra_start,
            intra_end,
        })
    }
}

/// Binary search `item_starts` to find which text item contains `pos`.
/// Returns the item index. Caller has already validated `pos` is in range.
fn item_index_for(item_starts: &[u32], pos: u32) -> u32 {
    // partition_point returns the first index i where item_starts[i] > pos.
    // We want the item whose range contains pos: the i-1 from that.
    let pp = item_starts.partition_point(|&x| x <= pos);
    if pp == 0 { 0 } else { (pp - 1) as u32 }
}

/// Whole-word check: byte before `start` and byte at `end` must be ASCII
/// non-word (or be off the ends of the string). Mirrors the regex
/// `\b<needle>\b` semantics.
fn is_word_isolated(bytes: &[u8], start: usize, end: usize) -> bool {
    let left_ok = start == 0 || !is_word_byte(bytes[start - 1]);
    let right_ok = end >= bytes.len() || !is_word_byte(bytes[end]);
    left_ok && right_ok
}

fn is_word_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn idx() -> PdfIndex {
        let mut idx = PdfIndex::new(3);
        // Page 0
        idx.add_page(
            0,
            vec![
                "Hello ".into(),
                "world. ".into(),
                "This is page one.".into(),
            ],
        );
        // Page 1
        idx.add_page(1, vec!["Wonderful WORLD ".into(), "of search.".into()]);
        // Page 2 left as None (not ingested)
        idx
    }

    #[test]
    fn empty_query_returns_no_hits() {
        let h = idx().search("", SearchOpts::default());
        assert!(h.is_empty());
    }

    #[test]
    fn case_insensitive_default_finds_across_pages() {
        let i = idx();
        let h = i.search("world", SearchOpts::default());
        // "world" on page 0 + "WORLD" on page 1
        assert_eq!(h.len(), 2);
        assert_eq!(h[0].page, 0);
        assert_eq!(h[1].page, 1);
    }

    #[test]
    fn case_sensitive_misses_uppercase() {
        let i = idx();
        let h = i.search(
            "world",
            SearchOpts {
                case_sensitive: true,
                ..Default::default()
            },
        );
        assert_eq!(h.len(), 1);
        assert_eq!(h[0].page, 0);
    }

    #[test]
    fn whole_word_excludes_substring_matches() {
        let i = idx();
        // "wonder" appears inside "Wonderful" — substring matches but
        // whole-word should not.
        let sub = i.search("wonder", SearchOpts::default());
        assert_eq!(sub.len(), 1);

        let ww = i.search(
            "wonder",
            SearchOpts {
                whole_word: true,
                ..Default::default()
            },
        );
        assert_eq!(ww.len(), 0);
    }

    #[test]
    fn whole_word_respects_punctuation_boundaries() {
        // "world" on page 0 ends with "." — punctuation counts as boundary.
        let i = idx();
        let ww = i.search(
            "world",
            SearchOpts {
                whole_word: true,
                ..Default::default()
            },
        );
        assert_eq!(ww.len(), 2);
    }

    #[test]
    fn uningested_pages_are_skipped() {
        // Page 2 has no text loaded — must not panic, just yield no hits.
        let i = idx();
        assert!(!i.has_page(2));
        let h = i.search("anything", SearchOpts::default());
        assert!(h.iter().all(|hit| hit.page < 2));
    }

    #[test]
    fn max_hits_caps_output() {
        let mut i = PdfIndex::new(1);
        i.add_page(0, vec!["xxxxxxxxxx".into()]);
        let h = i.search(
            "x",
            SearchOpts {
                max_hits: 3,
                ..Default::default()
            },
        );
        assert_eq!(h.len(), 3);
    }

    #[test]
    fn resolve_hit_inside_single_item() {
        // "world" on page 0 lives entirely inside item index 1 ("world. ").
        let i = idx();
        let h = i.search("world", SearchOpts::default());
        let first = h[0];
        let r = i
            .resolve_hit(first.page, first.char_start, first.char_len)
            .unwrap();
        assert_eq!(r.item_start, 1);
        assert_eq!(r.item_end, 1);
        // "world" starts at char 0 within item 1 (which starts with "world. ")
        assert_eq!(r.intra_start, 0);
        assert_eq!(r.intra_end, 5);
    }

    #[test]
    fn resolve_hit_spans_multiple_items() {
        // Build a hit that crosses item boundaries.
        let mut i = PdfIndex::new(1);
        // items: ["abc", "def", "ghi"] → joined = "abcdefghi"
        i.add_page(0, vec!["abc".into(), "def".into(), "ghi".into()]);
        // Search for "cdefg" — starts mid-item-0, ends mid-item-2
        let hits = i.search("cdefg", SearchOpts::default());
        assert_eq!(hits.len(), 1);
        let r = i
            .resolve_hit(0, hits[0].char_start, hits[0].char_len)
            .unwrap();
        assert_eq!(r.item_start, 0); // contains 'c'
        assert_eq!(r.item_end, 2); // contains 'g'
        assert_eq!(r.intra_start, 2); // 'c' is at offset 2 in "abc"
        assert_eq!(r.intra_end, 1); // 'g' ends after offset 1 in "ghi"
    }

    #[test]
    fn resolve_hit_out_of_range_returns_none() {
        let i = idx();
        // Page 99 doesn't exist
        assert!(i.resolve_hit(99, 0, 1).is_none());
        // Page 2 wasn't ingested
        assert!(i.resolve_hit(2, 0, 1).is_none());
    }
}
