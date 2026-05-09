/**
 * Public TypeScript surface for the WASM fuzzy-search engine. Mirrors the
 * `search-engine::fuzzy` Rust kernel one-to-one.
 */

export interface FuzzySearchOpts {
  /** Default: false (case-insensitive). */
  caseSensitive?: boolean;
  /** Cap result count. Omit / `0` ⇒ return every match. */
  maxResults?: number;
}

/** One match result. `score` is in `nucleo-matcher`'s range — higher is better. */
export interface FuzzyMatch {
  /** Index into the original `items` array passed at ingest. */
  index: number;
  score: number;
}
