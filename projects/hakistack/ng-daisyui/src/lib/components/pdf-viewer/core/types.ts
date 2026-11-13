/** A page as the renderers address it. Sizes are PDF points (scale 1). */
export interface PdfPageEntry {
  /** 1-based page number. */
  readonly pageNumber: number;
  readonly baseWidth: number;
  readonly baseHeight: number;
  /** The engine document and 0-based page it renders from. */
  readonly doc: number;
  readonly index: number;
  /** Raster identity (`source:index`): pages with the same key render the same (a page and its duplicates). */
  readonly key: string;
}

/**
 * Per-page search index: the page's text segments joined into one string.
 * `itemOffsets[i]` is the char index in `text` where segment `i` starts, so a
 * match position maps back to its text-layer span (segment index ≡ span index).
 */
export interface PdfPageTextIndex {
  readonly text: string;
  readonly itemOffsets: readonly number[];
}

/** A single search match, used to drive navigation and highlights. */
export interface PdfSearchHit {
  /** 1-based page number. */
  readonly pageNumber: number;
  /** Char index of the match start in the page's joined text. */
  readonly charStart: number;
  /** Match length in chars. */
  readonly length: number;
}

/** Search options shared by the WASM engine and the JS fallback. */
export interface PdfTextSearchOptions {
  readonly caseSensitive: boolean;
  readonly wholeWord: boolean;
}
