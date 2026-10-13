import {
  PdfAttachmentFile,
  PdfDocHandle,
  PdfEngine,
  PdfLinkRect,
  PdfOutlineNode,
  PdfPageSize,
  PdfRenderTask,
  PdfTaskPriority,
  PdfTextSegment,
  PdfTileRequest,
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
 * - The documents are **read-only**: the viewer's edits (pages, annotations,
 *   forms) live in its own models and are written by hk-pdf-writer, so the
 *   workers' copies never diverge. Only the hidden-annotation set, a display
 *   setting, goes to every worker.
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
   * @param size Worker count, clamped 1–4.
   * @param createEngine Engine factory; tests pass fakes, production uses real workers.
   */
  constructor(size: number, createEngine: () => PdfiumEngine = () => new PdfiumEngine()) {
    const n = Math.max(1, Math.min(4, Math.floor(size) || 1));
    this.engines = Array.from({ length: n }, createEngine);
    this.load = new Array(n).fill(0);
  }

  /** Number of worker engines in the pool. */
  get size(): number {
    return this.engines.length;
  }

  async open(bytes: ArrayBuffer, opts?: { password?: string }): Promise<PdfDocHandle> {
    // Each engine needs its own transferable copy (open transfers the buffer).
    const handles = await Promise.all(this.engines.map((e) => e.open(bytes.slice(0), opts)));
    const handle = this.nextHandle++;
    this.docs.set(handle, handles);
    return handle;
  }

  pageCount(doc: PdfDocHandle): Promise<number> {
    return this.engines[0].pageCount(this.primary(doc));
  }

  pageSize(doc: PdfDocHandle, page: number): Promise<PdfPageSize> {
    return this.engines[0].pageSize(this.primary(doc), page);
  }

  pageSizes(doc: PdfDocHandle): Promise<PdfPageSize[]> {
    return this.engines[0].pageSizes(this.primary(doc));
  }

  pageLabels(doc: PdfDocHandle): Promise<string[]> {
    return this.engines[0].pageLabels(this.primary(doc));
  }

  documentTitle(doc: PdfDocHandle): Promise<string> {
    return this.engines[0].documentTitle(this.primary(doc));
  }

  pageText(doc: PdfDocHandle, page: number, priority?: PdfTaskPriority): Promise<PdfTextSegment[]> {
    return this.engines[0].pageText(this.primary(doc), page, priority);
  }

  pagesText(doc: PdfDocHandle, pages: readonly number[], priority?: PdfTaskPriority): Promise<PdfTextSegment[][]> {
    return this.engines[0].pagesText(this.primary(doc), pages, priority);
  }

  outline(doc: PdfDocHandle): Promise<PdfOutlineNode[]> {
    return this.engines[0].outline(this.primary(doc));
  }

  pageLinks(doc: PdfDocHandle, page: number): Promise<PdfLinkRect[]> {
    return this.engines[0].pageLinks(this.primary(doc), page);
  }

  attachments(doc: PdfDocHandle): Promise<PdfAttachmentFile[]> {
    return this.engines[0].attachments(this.primary(doc));
  }

  save(doc: PdfDocHandle): Promise<Uint8Array> {
    return this.engines[0].save(this.primary(doc));
  }

  /** Every worker renders, so every worker gets the set. */
  async setHiddenAnnotations(doc: PdfDocHandle, entries: readonly number[]): Promise<void> {
    const handles = this.docs.get(doc);
    if (!handles) return;
    await Promise.all(this.engines.map((e, i) => e.setHiddenAnnotations(handles[i], entries)));
  }

  renderPage(doc: PdfDocHandle, page: number, cssWidth: number, dpr: number, priority?: PdfTaskPriority): PdfRenderTask {
    return this.onLeastBusy(doc, (engine, handle) => engine.renderPage(handle, page, cssWidth, dpr, priority));
  }

  renderTile(doc: PdfDocHandle, page: number, tile: PdfTileRequest, priority?: PdfTaskPriority): PdfRenderTask {
    return this.onLeastBusy(doc, (engine, handle) => engine.renderTile(handle, page, tile, priority));
  }

  /** Dispatch a render to the worker with the fewest renders in flight. */
  private onLeastBusy(doc: PdfDocHandle, start: (engine: PdfiumEngine, handle: PdfDocHandle) => PdfRenderTask): PdfRenderTask {
    const handles = this.docs.get(doc);
    if (!handles) return { promise: Promise.reject(new Error('unknown document handle')), cancel: () => undefined };
    let i = 0;
    for (let k = 1; k < this.load.length; k++) {
      if (this.load[k] < this.load[i]) i = k;
    }
    this.load[i]++;
    const task = start(this.engines[i], handles[i]);
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
