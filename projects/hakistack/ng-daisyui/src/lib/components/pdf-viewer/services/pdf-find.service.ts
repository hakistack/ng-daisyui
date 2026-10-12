import { DestroyRef, Injectable, inject } from '@angular/core';
import { findTextMatches, groupHitsByPage, spanMatchRanges } from '../core/text-index';
import { PdfPageTextIndex, PdfSearchHit } from '../core/types';
import { PdfSearchResult } from '../pdf-viewer.types';
import { PdfPageDataService } from './pdf-page-data.service';
import { PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

/** Find-bar typing debounce (ms). */
const FIND_INPUT_DEBOUNCE_MS = 200;
/** Pages whose text a streamed search fetches per worker round-trip. */
const SEARCH_BATCH_PAGES = 25;

/**
 * In-document search: running queries (WASM engine, JS fallback), stepping
 * through matches, painting `<mark>` highlights into rendered text layers, and
 * the find bar's interaction handlers.
 */
@Injectable()
export class PdfFindService {
  private readonly store = inject(PdfViewerStore);
  private readonly pageData = inject(PdfPageDataService);
  private readonly viewport = inject(PdfViewportService);

  /** Active hits in document order; empty when no search is running. */
  private hits: PdfSearchHit[] = [];
  /** Hits grouped by page, built once per search. */
  private hitsByPage = new Map<number, PdfSearchHit[]>();
  /** Span list per rendered text layer (span index ≡ segment index). */
  private readonly layerSpans = new Map<HTMLElement, HTMLElement[]>();
  /** Spans currently holding highlight marks, per layer, for O(matched) clearing. */
  private readonly matchedSpans = new Map<HTMLElement, HTMLElement[]>();
  /** Layers with highlights, the iteration target for clearing. */
  private readonly highlightedLayers = new Set<HTMLElement>();
  /** Which hit each highlight `<mark>` belongs to. */
  private markHits = new WeakMap<HTMLElement, PdfSearchHit>();
  private inputDebounce: ReturnType<typeof setTimeout> | null = null;
  /** Bumped per search; a running streamed search stops when it moves. */
  private searchToken = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelInputDebounce());
  }

  /** Forget search state for a new document. */
  reset(): void {
    this.searchToken++;
    this.store.searchInProgress.set(false);
    this.hits = [];
    this.hitsByPage.clear();
    this.layerSpans.clear();
    this.matchedSpans.clear();
    this.highlightedLayers.clear();
    this.markHits = new WeakMap();
  }

  // ── Text-layer bookkeeping (called by the layers and viewport) ──────────

  /** A text layer finished rendering: remember its spans and highlight any hits on it. */
  registerTextLayer(pageNumber: number, layer: HTMLElement, spans: HTMLElement[]): void {
    this.layerSpans.set(layer, spans);
    if (this.hitsByPage.size > 0) this.applyHighlightsForPage(pageNumber, layer);
  }

  /** A text layer was cleared or evicted: drop what we cached for it. */
  forgetTextLayer(layer: HTMLElement): void {
    this.layerSpans.delete(layer);
    this.matchedSpans.delete(layer);
    this.highlightedLayers.delete(layer);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  /**
   * Search every page. Once the document is fully indexed the WASM index
   * answers in one shot. The first search streams instead: page text is
   * fetched in batches at low priority (rendering stays ahead), matches are
   * published as each batch completes, and the first match is shown as soon
   * as it's found. A newer query (or clearing) abandons a running one.
   */
  async run(query: string): Promise<PdfSearchResult> {
    const token = ++this.searchToken;
    this.clearHighlights();
    this.hits = [];

    const q = query.trim();
    if (!q) {
      this.store.searchInProgress.set(false);
      this.store.patchState((s) => ({ ...s, searchMatches: 0, currentMatchIndex: -1, searchQuery: '' }));
      return { totalMatches: 0, query: '' };
    }

    const s0 = this.store.state();
    const options = { caseSensitive: s0?.searchCaseSensitive ?? false, wholeWord: s0?.searchWholeWord ?? false };
    this.store.patchState((s) => ({ ...s, searchMatches: 0, currentMatchIndex: -1, searchQuery: q }));

    const handle = this.pageData.search;
    if (this.pageData.fullyIndexed && handle && !handle.isDisposed) {
      const engineHits = handle.search(q, options);
      if (engineHits) {
        this.publish(engineHits.map((h) => ({ pageNumber: h.page + 1, charStart: h.charStart, length: h.charLen })));
        return { totalMatches: this.hits.length, query: q };
      }
    }

    this.store.searchInProgress.set(true);
    try {
      const pages = this.store.pages.map((p) => p.pageNumber);
      for (let i = 0; i < pages.length; i += SEARCH_BATCH_PAGES) {
        const batch = pages.slice(i, i + SEARCH_BATCH_PAGES);
        await this.pageData.ensureTextIndexes(batch, 'low');
        if (token !== this.searchToken) return { totalMatches: this.hits.length, query: q }; // superseded
        const found = findTextMatches(this.indexedPages(batch), q, options);
        if (found.length > 0) this.publish([...this.hits, ...found]);
      }
    } finally {
      if (token === this.searchToken) this.store.searchInProgress.set(false);
    }
    return { totalMatches: this.hits.length, query: q };
  }

  /**
   * Publish the hit list: update the counter, highlight rendered pages, and
   * jump to the first match the first time there is one.
   */
  private publish(hits: PdfSearchHit[]): void {
    const firstHit = this.hits.length === 0 && hits.length > 0;
    this.hits = hits;
    this.hitsByPage = groupHitsByPage(hits);
    this.store.patchState((s) => ({ ...s, searchMatches: hits.length }));
    this.applyAllHighlights();
    if (firstHit) this.gotoMatch(0);
  }

  private *indexedPages(pageNumbers: readonly number[]): Generator<readonly [number, PdfPageTextIndex]> {
    for (const pageNumber of pageNumbers) {
      const idx = this.pageData.textIndexes.get(pageNumber);
      if (idx) yield [pageNumber, idx];
    }
  }

  /** Step to the next match (wraps). */
  next(): void {
    if (this.hits.length === 0) return;
    const cur = this.store.snapshot()?.currentMatchIndex ?? -1;
    this.gotoMatch((cur + 1) % this.hits.length);
  }

  /** Step to the previous match (wraps). */
  previous(): void {
    if (this.hits.length === 0) return;
    const cur = this.store.snapshot()?.currentMatchIndex ?? -1;
    this.gotoMatch((cur - 1 + this.hits.length) % this.hits.length);
  }

  /** Clear results and highlights (abandons a running search). */
  clear(): void {
    this.searchToken++;
    this.store.searchInProgress.set(false);
    this.hits = [];
    this.clearHighlights();
    this.store.patchState((s) => ({ ...s, searchMatches: 0, currentMatchIndex: -1, searchQuery: '' }));
  }

  private gotoMatch(index: number): void {
    const hit = this.hits[index];
    if (!hit) return;
    this.store.patchState((s) => ({ ...s, currentMatchIndex: index }));
    this.viewport.goToPage(hit.pageNumber);
    this.refreshActiveHighlight();
  }

  // ── Highlights ──────────────────────────────────────────────────────────

  /** Highlight every rendered page that has hits (pages render later highlight themselves). */
  private applyAllHighlights(): void {
    if (this.hitsByPage.size === 0) return;
    for (const pageNumber of this.viewport.renderedPages) {
      if (!this.hitsByPage.has(pageNumber)) continue;
      const layer = this.viewport.wrapperFor(pageNumber)?.querySelector<HTMLElement>('.hk-pdf-text-layer');
      if (layer) this.applyHighlightsForPage(pageNumber, layer);
    }
    this.refreshActiveHighlight();
  }

  /**
   * Mark the exact matched characters on one page's text layer. Each span a
   * hit overlaps is rebuilt as text slices plus `<mark>`s covering only the
   * matched range; marks live inside the span, so they inherit its `scaleX`
   * and the page's rotation and line up with the glyphs on the canvas.
   */
  private applyHighlightsForPage(pageNumber: number, layer: HTMLElement): void {
    this.restoreMatchedSpans(layer);
    const hits = this.hitsByPage.get(pageNumber);
    if (!hits || hits.length === 0) return;

    let spans = this.layerSpans.get(layer);
    if (!spans) {
      spans = Array.from(layer.querySelectorAll<HTMLElement>(':scope > span'));
      this.layerSpans.set(layer, spans);
    }
    if (spans.length === 0) return;

    const matched: HTMLElement[] = [];
    let charOffset = 0;
    for (const span of spans) {
      const text = span.textContent ?? '';
      const ranges = spanMatchRanges(hits, charOffset, text.length);
      charOffset += text.length;
      if (ranges.length === 0) continue;
      const frag = document.createDocumentFragment();
      let cursor = 0;
      for (const r of ranges) {
        if (r.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, r.start)));
        const mark = document.createElement('mark');
        mark.className = 'hk-pdf-text-match';
        mark.textContent = text.slice(r.start, r.end);
        this.markHits.set(mark, r.hit);
        frag.appendChild(mark);
        cursor = r.end;
      }
      if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
      span.replaceChildren(frag);
      matched.push(span);
    }
    if (matched.length > 0) {
      this.matchedSpans.set(layer, matched);
      this.highlightedLayers.add(layer);
      const cur = this.hits[this.store.snapshot()?.currentMatchIndex ?? -1];
      if (cur?.pageNumber === pageNumber) this.paintActiveMarks(layer, cur);
    }
  }

  /** Collapse a layer's highlighted spans back to plain text. */
  private restoreMatchedSpans(layer: HTMLElement): void {
    for (const span of this.matchedSpans.get(layer) ?? []) span.textContent = span.textContent ?? '';
    this.matchedSpans.delete(layer);
    this.highlightedLayers.delete(layer);
  }

  /** Flag the marks belonging to `hit` as active; returns the first. */
  private paintActiveMarks(layer: HTMLElement, hit: PdfSearchHit): HTMLElement | null {
    let first: HTMLElement | null = null;
    for (const span of this.matchedSpans.get(layer) ?? []) {
      for (const mark of Array.from(span.getElementsByTagName('mark'))) {
        if (this.markHits.get(mark) !== hit) continue;
        mark.classList.add('hk-pdf-text-match-active');
        first ??= mark;
      }
    }
    return first;
  }

  /** Move the active styling to the current match and centre it in the viewport. */
  private refreshActiveHighlight(): void {
    for (const layer of this.highlightedLayers) {
      for (const span of this.matchedSpans.get(layer) ?? []) {
        for (const mark of Array.from(span.getElementsByClassName('hk-pdf-text-match-active'))) {
          mark.classList.remove('hk-pdf-text-match-active');
        }
      }
    }
    const hit = this.hits[this.store.snapshot()?.currentMatchIndex ?? -1];
    if (!hit) return;
    const layer = this.viewport.wrapperFor(hit.pageNumber)?.querySelector<HTMLElement>('.hk-pdf-text-layer');
    if (!layer) return;
    const firstActive = this.paintActiveMarks(layer, hit);

    // Centre in our viewport only; `scrollIntoView` would scroll ancestors too.
    const vp = this.viewport.viewportEl();
    if (firstActive && vp) {
      const sRect = firstActive.getBoundingClientRect();
      const vpRect = vp.getBoundingClientRect();
      const delta = sRect.top - vpRect.top - (vp.clientHeight - sRect.height) / 2;
      vp.scrollTo({ top: vp.scrollTop + delta, behavior: 'auto' });
    }
  }

  private clearHighlights(): void {
    for (const layer of Array.from(this.highlightedLayers)) this.restoreMatchedSpans(layer);
    this.highlightedLayers.clear();
    this.hitsByPage.clear();
  }

  // ── Find bar ────────────────────────────────────────────────────────────

  /** Open the find bar and focus its input once the `@if` has rendered it. */
  openBar(): void {
    this.store.findBarOpen.set(true);
    queueMicrotask(() => {
      const el = this.store.element.querySelector<HTMLInputElement>('.hk-pdf-find-input');
      el?.focus();
      el?.select();
    });
  }

  /** Close the find bar and clear results. */
  closeBar(): void {
    this.store.findBarOpen.set(false);
    this.cancelInputDebounce();
    this.clear();
  }

  /** Debounce typing into one search per pause. */
  onInput(value: string): void {
    this.cancelInputDebounce();
    this.inputDebounce = setTimeout(() => {
      this.inputDebounce = null;
      void this.run(value);
    }, FIND_INPUT_DEBOUNCE_MS);
  }

  /** Enter: search now if typing is pending, else step to the next match (browser-find behaviour). */
  onEnter(value: string): void {
    if (this.inputDebounce !== null) {
      this.cancelInputDebounce();
      void this.run(value);
      return;
    }
    const s = this.store.state();
    if (s && s.searchQuery && s.searchMatches > 0) this.next();
  }

  /** Toggle an option and re-run the active query so the counter updates in place. */
  toggleCaseSensitive(): void {
    this.store.patchState((s) => ({ ...s, searchCaseSensitive: !s.searchCaseSensitive }));
    this.rerun();
  }

  toggleWholeWord(): void {
    this.store.patchState((s) => ({ ...s, searchWholeWord: !s.searchWholeWord }));
    this.rerun();
  }

  private rerun(): void {
    const q = this.store.state()?.searchQuery ?? '';
    if (q) void this.run(q);
  }

  private cancelInputDebounce(): void {
    if (this.inputDebounce !== null) clearTimeout(this.inputDebounce);
    this.inputDebounce = null;
  }
}
