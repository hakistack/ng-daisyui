import { PdfPageTextIndex, PdfSearchHit, PdfTextSearchOptions } from './types';

/** Join per-segment strings into a page index, recording each segment's start. */
export function buildTextIndex(strings: readonly string[]): PdfPageTextIndex {
  const itemOffsets: number[] = [];
  let text = '';
  for (const s of strings) {
    itemOffsets.push(text.length);
    text += s;
  }
  return { text, itemOffsets };
}

/** Recover the per-segment strings from an index (inverse of {@link buildTextIndex}). */
export function segmentStrings(index: PdfPageTextIndex): string[] {
  const { text, itemOffsets } = index;
  const out = new Array<string>(itemOffsets.length);
  for (let i = 0; i < itemOffsets.length; i++) {
    const end = i + 1 < itemOffsets.length ? itemOffsets[i + 1] : text.length;
    out[i] = text.slice(itemOffsets[i], end);
  }
  return out;
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * Substring search over page indexes, in page order. Mirrors the WASM search
 * engine's semantics so either can serve the find bar: case-insensitive unless
 * `caseSensitive`; `wholeWord` requires non-word characters (or text edges) on
 * both sides of the match. Matches don't overlap.
 */
export function findTextMatches(
  pages: Iterable<readonly [pageNumber: number, index: PdfPageTextIndex]>,
  query: string,
  options: PdfTextSearchOptions,
): PdfSearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const needle = options.caseSensitive ? q : q.toLowerCase();
  const hits: PdfSearchHit[] = [];
  for (const [pageNumber, idx] of pages) {
    const haystack = options.caseSensitive ? idx.text : idx.text.toLowerCase();
    let from = 0;
    while (from <= haystack.length) {
      const found = haystack.indexOf(needle, from);
      if (found === -1) break;
      const before = found > 0 ? idx.text[found - 1] : '';
      const after = found + q.length < idx.text.length ? idx.text[found + q.length] : '';
      if (!options.wholeWord || ((!before || !WORD_CHAR.test(before)) && (!after || !WORD_CHAR.test(after)))) {
        hits.push({ pageNumber, charStart: found, length: q.length });
      }
      from = found + Math.max(1, q.length);
    }
  }
  return hits;
}

/** Group hits by page number, preserving order within each page. */
export function groupHitsByPage(hits: readonly PdfSearchHit[]): Map<number, PdfSearchHit[]> {
  const byPage = new Map<number, PdfSearchHit[]>();
  for (const hit of hits) {
    const arr = byPage.get(hit.pageNumber);
    if (arr) arr.push(hit);
    else byPage.set(hit.pageNumber, [hit]);
  }
  return byPage;
}

/** A range inside one text-layer span that a search hit covers. */
export interface SpanMatchRange {
  /** Start offset within the span's text. */
  readonly start: number;
  /** End offset (exclusive) within the span's text. */
  readonly end: number;
  readonly hit: PdfSearchHit;
}

/**
 * Clip page-level hits to one span that starts at `spanStart` and is `spanLength`
 * chars long. Ranges come back sorted and non-overlapping (an overlapping later
 * hit is trimmed to start after the previous one), ready to wrap in `<mark>`s.
 */
export function spanMatchRanges(hits: readonly PdfSearchHit[], spanStart: number, spanLength: number): SpanMatchRange[] {
  const spanEnd = spanStart + spanLength;
  const ranges: SpanMatchRange[] = [];
  for (const hit of hits) {
    const start = Math.max(hit.charStart, spanStart);
    const end = Math.min(hit.charStart + hit.length, spanEnd);
    if (start < end) ranges.push({ start: start - spanStart, end: end - spanStart, hit });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: SpanMatchRange[] = [];
  let cursor = 0;
  for (const r of ranges) {
    const start = Math.max(r.start, cursor);
    if (start >= r.end) continue;
    out.push({ start, end: r.end, hit: r.hit });
    cursor = r.end;
  }
  return out;
}
