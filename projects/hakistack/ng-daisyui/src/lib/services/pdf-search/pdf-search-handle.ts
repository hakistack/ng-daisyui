/**
 * Thin wrapper over the WASM `WasmPdfIndex` handle.
 *
 * Each PDF document gets one handle, sized to its page count at creation.
 * Pages are added as PDF.js's `getTextContent()` lazily produces them. After
 * that every search round-trip is one query string in, one packed
 * `Uint32Array` of `(page, charStart, charLen)` triples out.
 */

import type { PdfResolvedHit, PdfSearchHit, PdfSearchOpts } from './pdf-search.types';

/** Minimal shape of the wasm-pack-generated `WasmPdfIndex`. */
export interface WasmPdfIndex {
  free(): void;
  n_pages(): number;
  has_page(page: number): boolean;
  add_page(page: number, text_items: string[]): void;
  search(query: string, opts: unknown): Uint32Array;
  resolve_hit(page: number, charStart: number, charLen: number): Uint32Array;
}

export class PdfSearchHandle {
  private constructor(private readonly wasm: WasmPdfIndex) {}

  /** @internal — use `PdfSearchService.createIndex` */
  static _create(wasm: WasmPdfIndex): PdfSearchHandle {
    return new PdfSearchHandle(wasm);
  }

  get pageCount(): number {
    return this.wasm.n_pages();
  }

  /** Whether a page's text has been ingested. False ⇒ the page won't yield hits yet. */
  hasPage(page: number): boolean {
    return this.wasm.has_page(page);
  }

  /** Add the text content of a single page. Idempotent overwrite — re-call to refresh. */
  addPage(page: number, textItems: readonly string[]): void {
    this.wasm.add_page(page, [...textItems]);
  }

  /**
   * Run a search across every ingested page. Empty query returns an empty
   * array. Hits come back in `(page asc, charStart asc)` order — the same
   * order the JS substring loop produces today.
   */
  search(query: string, opts: PdfSearchOpts = {}): PdfSearchHit[] {
    const packed = this.wasm.search(query, {
      caseSensitive: opts.caseSensitive ?? false,
      wholeWord: opts.wholeWord ?? false,
      maxHits: opts.maxHits ?? 0,
    });
    const out: PdfSearchHit[] = new Array(packed.length / 3);
    for (let i = 0, j = 0; i < packed.length; i += 3, j++) {
      out[j] = { page: packed[i], charStart: packed[i + 1], charLen: packed[i + 2] };
    }
    return out;
  }

  /**
   * Resolve a hit to its text-layer item indices. Returns `null` when the
   * page hasn't been ingested or the position is out of range.
   */
  resolveHit(hit: PdfSearchHit): PdfResolvedHit | null {
    const r = this.wasm.resolve_hit(hit.page, hit.charStart, hit.charLen);
    if (r.length !== 4) return null;
    return {
      itemStart: r[0],
      itemEnd: r[1],
      intraStart: r[2],
      intraEnd: r[3],
    };
  }

  /** Free the underlying WASM-heap memory. Call on PDF unload / component teardown. */
  dispose(): void {
    this.wasm.free();
  }
}
