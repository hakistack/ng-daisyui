import { DestroyRef, Injectable, inject } from '@angular/core';
import { PdfSearchHandle, PdfSearchService } from '../../../services';
import { buildTextIndex, segmentStrings } from '../core/text-index';
import { PdfPageTextIndex } from '../core/types';
import { PdfLinkRect, PdfOutlineNode, PdfTaskPriority, PdfTextSegment } from '../engine/pdf-engine.types';
import { PdfViewerStore } from './pdf-viewer.store';

/**
 * Per-document data read from the engine and cached: text segments, link
 * rects, form fields, the page text indexes (mirrored into the WASM search
 * engine), and the sidebar's outline / attachments / annotation lists.
 */
@Injectable()
export class PdfPageDataService {
  private readonly store = inject(PdfViewerStore);
  private readonly searchEngine = inject(PdfSearchService);

  private readonly segmentsCache = new Map<number, PdfTextSegment[]>();
  private readonly linksCache = new Map<number, PdfLinkRect[]>();
  /** Joined text per page; built on first search or text-layer render. */
  readonly textIndexes = new Map<number, PdfPageTextIndex>();
  /** WASM search index for the open document (`null` until created or when unavailable). */
  private searchHandle: PdfSearchHandle | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disposeSearchHandle());
  }

  get search(): PdfSearchHandle | null {
    return this.searchHandle;
  }

  /** Drop everything cached for the current document. */
  reset(): void {
    this.segmentsCache.clear();
    this.linksCache.clear();
    this.textIndexes.clear();
    this.disposeSearchHandle();
  }

  /** A page's text segments (reading order), or `null` when extraction fails. */
  async segments(pageNumber: number): Promise<PdfTextSegment[] | null> {
    const session = this.store.session();
    const page = this.store.findPage(pageNumber);
    if (!session || !page) return null;
    const cached = this.segmentsCache.get(pageNumber);
    if (cached) return cached;
    try {
      const segs = await session.engine.pageText(page.doc, page.index);
      this.segmentsCache.set(pageNumber, segs);
      return segs;
    } catch {
      return null;
    }
  }

  /**
   * A page's link rects. A link into the document targets the page showing
   * that page now (dropped when it was deleted); one from an imported page
   * can't follow it into this document, so only its web links stay.
   */
  async links(pageNumber: number): Promise<PdfLinkRect[]> {
    const session = this.store.session();
    const page = this.store.findPage(pageNumber);
    if (!session || !page) return [];
    const cached = this.linksCache.get(pageNumber);
    if (cached) return cached;
    try {
      const fromDocument = page.doc === session.doc;
      const targets = this.store.documentPageNumbers();
      const links = (await session.engine.pageLinks(page.doc, page.index)).flatMap((l) => {
        if (l.pageIndex < 0) return l.uri ? [l] : [];
        const target = fromDocument ? targets.get(l.pageIndex) : undefined;
        return target === undefined ? [] : [{ ...l, pageIndex: target - 1 }];
      });
      this.linksCache.set(pageNumber, links);
      return links;
    } catch {
      return [];
    }
  }

  /** Index a page's segment strings (first call wins) and mirror it into the search engine. */
  indexPageText(pageNumber: number, strings: readonly string[]): void {
    if (this.textIndexes.has(pageNumber)) return;
    const idx = buildTextIndex(strings);
    this.textIndexes.set(pageNumber, idx);
    this.searchHandle?.addPage(pageNumber - 1, strings); // engine pages are 0-based
  }

  /** A page's text index, extracting it on first use. */
  async ensureTextIndex(pageNumber: number): Promise<PdfPageTextIndex | null> {
    const cached = this.textIndexes.get(pageNumber);
    if (cached) return cached;
    const segs = await this.segments(pageNumber);
    if (!segs) return null;
    this.indexPageText(
      pageNumber,
      segs.map((s) => s.text),
    );
    return this.textIndexes.get(pageNumber) ?? null;
  }

  /**
   * Make sure every page in `pageNumbers` is indexed, fetching the missing
   * ones' text in a single worker round-trip. Extraction failures leave those
   * pages unindexed (search skips them).
   */
  async ensureTextIndexes(pageNumbers: readonly number[], priority: PdfTaskPriority = 'normal'): Promise<void> {
    const missing = pageNumbers.filter((n) => !this.textIndexes.has(n));
    const session = this.store.session();
    if (missing.length === 0 || !session) return;
    // One round-trip per source document the pages come from.
    const bySource = new Map<number, number[]>();
    for (const n of missing) {
      const doc = this.store.findPage(n)?.doc;
      if (doc !== undefined) bySource.set(doc, [...(bySource.get(doc) ?? []), n]);
    }
    const token = this.store.loadToken;
    await Promise.all(
      [...bySource].map(async ([doc, numbers]) => {
        try {
          const texts = await session.engine.pagesText(
            doc,
            numbers.map((n) => this.store.findPage(n)!.index),
            priority,
          );
          if (this.store.loadToken !== token) return; // document or pages changed meanwhile
          numbers.forEach((pageNumber, i) => {
            this.segmentsCache.set(pageNumber, texts[i]);
            this.indexPageText(
              pageNumber,
              texts[i].map((s) => s.text),
            );
          });
        } catch {
          /* leave unindexed */
        }
      }),
    );
  }

  /** Whether every page of the document is indexed. */
  get fullyIndexed(): boolean {
    return this.store.pages.length > 0 && this.textIndexes.size >= this.store.pages.length;
  }

  /**
   * Create the WASM search index for `numPages`, then replay pages already
   * indexed in JS. Token-guarded: a newer load disposes a late handle.
   * Failure leaves search on the JS fallback.
   */
  createSearchIndex(numPages: number, token: number): void {
    this.searchEngine
      .createIndex(numPages)
      .then((handle) => {
        if (this.store.loadToken !== token) {
          handle.dispose();
          return;
        }
        this.searchHandle?.dispose();
        this.searchHandle = handle;
        for (const [pageNumber, idx] of this.textIndexes) handle.addPage(pageNumber - 1, segmentStrings(idx));
      })
      .catch(() => {
        this.searchHandle = null;
      });
  }

  disposeSearchHandle(): void {
    this.searchHandle?.dispose();
    this.searchHandle = null;
  }

  // ── Sidebar data ────────────────────────────────────────────────────────

  /** Outline (bookmarks) as the sidebar's `{ title, pageIndex, items }` tree; `[]` when absent. */
  async fetchOutline(): Promise<void> {
    const session = this.store.session();
    if (!session) {
      this.store.outline.set([]);
      return;
    }
    try {
      const tree = await session.engine.outline(session.doc);
      // Destinations are pages of the document: point them at where those pages are now (-1 when deleted).
      const targets = this.store.documentPageNumbers();
      const toNode = (n: PdfOutlineNode): unknown => ({
        title: n.title,
        pageIndex: n.pageIndex < 0 ? -1 : (targets.get(n.pageIndex) ?? 0) - 1,
        items: n.children.map(toNode),
      });
      this.store.outline.set(tree.map(toNode));
    } catch {
      this.store.outline.set([]);
    }
  }

  async fetchAttachments(): Promise<void> {
    const session = this.store.session();
    if (!session) {
      this.store.attachments.set([]);
      return;
    }
    try {
      const files = await session.engine.attachments(session.doc);
      this.store.attachments.set(files.map((f) => ({ filename: f.name, description: '', content: f.bytes })));
    } catch {
      this.store.attachments.set([]);
    }
  }
}
