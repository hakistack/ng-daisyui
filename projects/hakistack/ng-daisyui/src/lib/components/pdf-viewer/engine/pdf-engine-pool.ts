import {
  PdfAnnotationRow,
  PdfAttachmentFile,
  PdfDocHandle,
  PdfEngine,
  PdfFormField,
  PdfLinkRect,
  PdfOutlineNode,
  PdfPageSize,
  PdfRenderTask,
  PdfTextSegment,
} from './pdf-engine.types';
import { PdfiumEngine } from './pdfium-engine';

/**
 * A pool of {@link PdfiumEngine} workers that parallelizes page rasterization.
 * Implements {@link PdfEngine} so the component talks to it identically to a
 * single engine.
 *
 * - **Render** dispatches to the least-busy worker — N pages rasterize at once
 *   during fast scroll/zoom (only possible because PDFium renders correct text
 *   off-thread; pd​f.js couldn't).
 * - **Reads** (text/outline/links/size/…) go to the primary worker (worker 0);
 *   they're cheap + infrequent, and keeping them off the render workers avoids
 *   contention.
 * - **Mutations** (`setFieldValue`) broadcast to **all** workers so every
 *   worker's copy of the document stays consistent — any worker can then render
 *   any page with the correct (edited) appearance. `save` reads from primary.
 *
 * Each worker opens its **own copy** of the bytes (one parsed document per
 * worker) — the cost of parallelism is ~N× the wasm + parsed-doc memory, so
 * pool size is kept small (1–4).
 */
export class PdfEnginePool implements PdfEngine {
  private readonly engines: PdfiumEngine[];
  /** In-flight render count per engine, for least-busy dispatch. */
  private readonly load: number[];
  /** Pool handle → per-engine document handles (parallel to `engines`). */
  private readonly docs = new Map<PdfDocHandle, number[]>();
  private nextHandle = 1;
  /**
   * Set when a broadcast mutation failed on some-but-not-all workers, so their
   * documents may have diverged. Once true, reads from the primary worker can no
   * longer be trusted to match what other workers render — the document must be
   * reloaded to clear it.
   */
  private desynced = false;

  constructor(size: number) {
    const n = Math.max(1, Math.min(4, Math.floor(size) || 1));
    this.engines = Array.from({ length: n }, () => new PdfiumEngine());
    this.load = new Array(n).fill(0);
  }

  /** Number of worker engines in the pool. */
  get size(): number {
    return this.engines.length;
  }

  /**
   * True if a mutation half-applied across the pool and the workers' documents
   * may now disagree. Reload the document to recover.
   */
  get isDesynced(): boolean {
    return this.desynced;
  }

  async open(bytes: ArrayBuffer, opts?: { password?: string }): Promise<PdfDocHandle> {
    // Each engine needs its own transferable copy (open transfers the buffer).
    const handles = await Promise.all(this.engines.map((e) => e.open(bytes.slice(0), opts)));
    const handle = this.nextHandle++;
    this.docs.set(handle, handles);
    // A fresh open re-syncs every worker from the same bytes.
    this.desynced = false;
    return handle;
  }

  pageCount(doc: PdfDocHandle): Promise<number> {
    return this.engines[0].pageCount(this.primary(doc));
  }

  pageSize(doc: PdfDocHandle, page: number): Promise<PdfPageSize> {
    return this.engines[0].pageSize(this.primary(doc), page);
  }

  documentTitle(doc: PdfDocHandle): Promise<string> {
    return this.engines[0].documentTitle(this.primary(doc));
  }

  pageText(doc: PdfDocHandle, page: number): Promise<PdfTextSegment[]> {
    return this.engines[0].pageText(this.primary(doc), page);
  }

  outline(doc: PdfDocHandle): Promise<PdfOutlineNode[]> {
    return this.engines[0].outline(this.primary(doc));
  }

  pageLinks(doc: PdfDocHandle, page: number): Promise<PdfLinkRect[]> {
    return this.engines[0].pageLinks(this.primary(doc), page);
  }

  documentAnnotations(doc: PdfDocHandle): Promise<PdfAnnotationRow[]> {
    return this.engines[0].documentAnnotations(this.primary(doc));
  }

  attachments(doc: PdfDocHandle): Promise<PdfAttachmentFile[]> {
    return this.engines[0].attachments(this.primary(doc));
  }

  formFields(doc: PdfDocHandle, page: number): Promise<PdfFormField[]> {
    return this.engines[0].formFields(this.primary(doc), page);
  }

  save(doc: PdfDocHandle): Promise<Uint8Array> {
    return this.engines[0].save(this.primary(doc));
  }

  setFieldValue(doc: PdfDocHandle, page: number, name: string, value: string): Promise<boolean> {
    return this.broadcast(doc, (e, h) => e.setFieldValue(h, page, name, value));
  }

  addHighlight(doc: PdfDocHandle, page: number, x: number, y: number, w: number, h: number, color: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.addHighlight(hd, page, x, y, w, h, color));
  }

  addTextNote(doc: PdfDocHandle, page: number, x: number, y: number, contents: string, color: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.addTextNote(hd, page, x, y, contents, color));
  }

  addFreeText(
    doc: PdfDocHandle,
    page: number,
    x: number,
    y: number,
    w: number,
    h: number,
    contents: string,
    color: number,
  ): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.addFreeText(hd, page, x, y, w, h, contents, color));
  }

  addInk(doc: PdfDocHandle, page: number, points: number[], color: number, width: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.addInk(hd, page, points, color, width));
  }

  deleteAnnotation(doc: PdfDocHandle, page: number, index: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.deleteAnnotation(hd, page, index));
  }

  setAnnotationContents(doc: PdfDocHandle, page: number, index: number, contents: string): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.setAnnotationContents(hd, page, index, contents));
  }

  deletePage(doc: PdfDocHandle, index: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.deletePage(hd, index));
  }

  insertBlankPage(doc: PdfDocHandle, index: number, width: number, height: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.insertBlankPage(hd, index, width, height));
  }

  setPageRotation(doc: PdfDocHandle, page: number, degrees: number): Promise<boolean> {
    return this.broadcast(doc, (e, hd) => e.setPageRotation(hd, page, degrees));
  }

  /**
   * Apply a mutation to **every** worker's copy of the doc so they stay
   * render-consistent. Hardened against partial failure: we wait for *all*
   * workers (not bail on the first rejection), and if any worker's mutation
   * failed we **reject** — because the workers' documents may now disagree, and
   * a later render dispatched to a diverged worker would show wrong content.
   * The caller surfaces this (the document should be reloaded to resynchronize;
   * we can't silently "succeed" on a half-applied mutation).
   */
  private async broadcast(doc: PdfDocHandle, op: (engine: PdfiumEngine, handle: PdfDocHandle) => Promise<boolean>): Promise<boolean> {
    const handles = this.docs.get(doc);
    if (!handles) return false;
    const results = await Promise.allSettled(this.engines.map((e, i) => op(e, handles[i])));

    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (rejected.length > 0) {
      this.desynced = true;
      const cause = rejected[0].reason;
      throw new Error(
        `PDFium pool desynchronized: a document mutation failed on ${rejected.length}/${this.engines.length} ` +
          `worker(s); their documents may now differ. Reload the document to resynchronize. ` +
          `Cause: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }

    // All workers hold identical documents, so the boolean results should agree;
    // disagreement signals a logic bug (diagnostic, not fatal).
    const values = results.map((r) => (r as PromiseFulfilledResult<boolean>).value);
    if (values.some((v) => v !== values[0])) {
      console.warn('[hk-pdf-viewer] PDFium pool mutation results diverged across workers:', values);
    }
    return values[0] ?? false;
  }

  renderPage(doc: PdfDocHandle, page: number, cssWidth: number, dpr: number): PdfRenderTask {
    const handles = this.docs.get(doc);
    if (!handles) {
      // Unknown handle — return an immediately-rejecting task.
      return { promise: Promise.reject(new Error('unknown document handle')), cancel: () => undefined };
    }
    // Least-busy worker.
    let i = 0;
    for (let k = 1; k < this.load.length; k++) {
      if (this.load[k] < this.load[i]) i = k;
    }
    this.load[i]++;
    const task = this.engines[i].renderPage(handles[i], page, cssWidth, dpr);
    const settle = () => {
      this.load[i] = Math.max(0, this.load[i] - 1);
    };
    task.promise.then(settle, settle);
    return task;
  }

  dispose(doc: PdfDocHandle): void {
    const handles = this.docs.get(doc);
    if (!handles) return;
    this.engines.forEach((e, i) => e.dispose(handles[i]));
    this.docs.delete(doc);
  }

  destroy(): void {
    for (const e of this.engines) e.destroy();
    this.docs.clear();
  }

  /** The primary engine's handle for a pool doc (worker 0). */
  private primary(doc: PdfDocHandle): PdfDocHandle {
    const handles = this.docs.get(doc);
    if (!handles) throw new Error('unknown document handle');
    return handles[0];
  }
}
