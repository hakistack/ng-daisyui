//! String folding for filter haystacks.
//!
//! Pre-folding once at ingest is the load-bearing trick that lets per-keystroke
//! filter / search avoid `toLowerCase` on every row. ASCII fast-path keeps the
//! common case allocation-free when the input is already lowercase.

use memchr::memmem;

/// Lowercase a string. Uses an ASCII fast-path; falls back to Unicode-correct
/// `to_lowercase()` for non-ASCII input.
pub fn fold_lower(s: &str) -> String {
    if s.is_ascii() {
        s.to_ascii_lowercase()
    } else {
        s.to_lowercase()
    }
}

/// Build a reusable substring finder from a needle. The finder is more
/// efficient than calling `memmem::find` repeatedly because the bad-character
/// table is computed once.
pub fn finder(needle: &str) -> memmem::Finder<'_> {
    memmem::Finder::new(needle.as_bytes())
}

/// Returns true if any byte position in `haystack` matches `needle`.
pub fn contains_bytes(haystack: &str, needle: &memmem::Finder<'_>) -> bool {
    needle.find(haystack.as_bytes()).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ascii_fast_path() {
        assert_eq!(fold_lower("Hello"), "hello");
        assert_eq!(fold_lower("ALREADY-LOWER!"), "already-lower!");
    }

    #[test]
    fn unicode_fold() {
        // Lowercase ≠ case-fold per Unicode: "Straße" stays "straße" (ß has no
        // single-char lowercase form). JS's `toLowerCase` does the same, so
        // matching that behavior keeps parity with the JS fallback.
        assert_eq!(fold_lower("Straße"), "straße");
        assert_eq!(fold_lower("ÉRIC"), "éric");
    }

    #[test]
    fn finder_finds_substring() {
        let f = finder("ello");
        assert!(contains_bytes("hello world", &f));
        assert!(!contains_bytes("hi world", &f));
    }
}
