/**
 * Public TypeScript surface for the PDF in-document search engine. Mirrors
 * the `search-engine::pdf` Rust kernel.
 */

export interface PdfSearchOpts {
  /** Default: false (case-insensitive). */
  caseSensitive?: boolean;
  /** Match only when bounded by ASCII word breaks. Default: false. */
  wholeWord?: boolean;
  /** Cap on hit count. `0` or omit ⇒ unlimited. */
  maxHits?: number;
}

/** A single search hit. */
export interface PdfSearchHit {
  /** 0-based page index. */
  page: number;
  /** Byte offset within the page's joined text where the hit begins. */
  charStart: number;
  /** Length of the matched text in bytes. */
  charLen: number;
}

/** Result of mapping a hit back to text-layer item indices for highlight painting. */
export interface PdfResolvedHit {
  /** First text item the hit overlaps (index into the array PDF.js returned). */
  itemStart: number;
  /** Last text item the hit overlaps (inclusive). */
  itemEnd: number;
  /** Char offset within `itemStart` where the hit begins. */
  intraStart: number;
  /** Char offset within `itemEnd` (exclusive) where the hit ends. */
  intraEnd: number;
}
