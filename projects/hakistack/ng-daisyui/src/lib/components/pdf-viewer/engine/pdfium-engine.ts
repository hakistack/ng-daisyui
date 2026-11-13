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
  PdfWorkerResponse,
} from './pdf-engine.types';
import { createPdfiumWorker } from './pdfium-worker.loader';

/**
 * Main-thread {@link PdfEngine} backed by `pdfium.worker.ts`. It owns the
 * worker, correlates requests by id, and exposes the engine surface the
 * component consumes. PDFium parsing + rasterization happen in the worker;
 * the main thread only posts messages and receives `ImageBitmap`s.
 *
 * Zero consumer setup: the worker (with the PDFium + `pdf_engine` wasm embedded)
 * is inlined into the library bundle and instantiated from a Blob URL at
 * runtime — nothing is fetched, no asset needs to be served. ng-packagr can't
 * bundle workers, so the inlining happens in scripts/build-pdfium-worker.mjs.
 * Requires a `worker-src blob:` CSP allowance.
 */
export class PdfiumEngine implements PdfEngine {
  /** Resolves once the worker is created (its source is a lazy dynamic import). */
  private readonly workerReady: Promise<Worker>;
  private worker: Worker | null = null;
  private revokeWorker: (() => void) | null = null;
  private destroyed = false;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

  constructor() {
    this.workerReady = createPdfiumWorker().then(({ worker, revoke }) => {
      if (this.destroyed) {
        worker.terminate();
        revoke();
        throw new DOMException('engine destroyed', 'AbortError');
      }
      this.worker = worker;
      this.revokeWorker = revoke;
      worker.onmessage = (e: MessageEvent<PdfWorkerResponse>) => this.onMessage(e.data);
      worker.onerror = () => this.failAll(new Error('pdfium worker crashed'));
      return worker;
    });
    // Don't let a never-used engine produce an unhandled rejection.
    this.workerReady.catch(() => undefined);
  }

  open(bytes: ArrayBuffer, opts?: { password?: string }): Promise<PdfDocHandle> {
    // Transfer the buffer so we don't copy the whole file across the boundary.
    return this.request({ type: 'open', id: 0, bytes, password: opts?.password }, [bytes]) as Promise<PdfDocHandle>;
  }

  pageCount(doc: PdfDocHandle): Promise<number> {
    return this.request({ type: 'pageCount', id: 0, doc }) as Promise<number>;
  }

  pageSize(doc: PdfDocHandle, page: number): Promise<PdfPageSize> {
    return this.request({ type: 'pageSize', id: 0, doc, page }) as Promise<PdfPageSize>;
  }

  pageSizes(doc: PdfDocHandle): Promise<PdfPageSize[]> {
    return this.request({ type: 'pageSizes', id: 0, doc }) as Promise<PdfPageSize[]>;
  }

  pageLabels(doc: PdfDocHandle): Promise<string[]> {
    return this.request({ type: 'pageLabels', id: 0, doc }) as Promise<string[]>;
  }

  documentTitle(doc: PdfDocHandle): Promise<string> {
    return this.request({ type: 'documentTitle', id: 0, doc }) as Promise<string>;
  }

  pageText(doc: PdfDocHandle, page: number, priority?: PdfTaskPriority): Promise<PdfTextSegment[]> {
    return this.request({ type: 'pageText', id: 0, doc, page, priority }) as Promise<PdfTextSegment[]>;
  }

  pagesText(doc: PdfDocHandle, pages: readonly number[], priority?: PdfTaskPriority): Promise<PdfTextSegment[][]> {
    return this.request({ type: 'pagesText', id: 0, doc, pages: [...pages], priority }) as Promise<PdfTextSegment[][]>;
  }

  outline(doc: PdfDocHandle): Promise<PdfOutlineNode[]> {
    return this.request({ type: 'outline', id: 0, doc }) as Promise<PdfOutlineNode[]>;
  }

  pageLinks(doc: PdfDocHandle, page: number): Promise<PdfLinkRect[]> {
    return this.request({ type: 'pageLinks', id: 0, doc, page }) as Promise<PdfLinkRect[]>;
  }

  attachments(doc: PdfDocHandle): Promise<PdfAttachmentFile[]> {
    return this.request({ type: 'attachments', id: 0, doc }) as Promise<PdfAttachmentFile[]>;
  }

  setHiddenAnnotations(doc: PdfDocHandle, entries: readonly number[]): Promise<void> {
    return this.request({ type: 'setHiddenAnnotations', id: 0, doc, entries: [...entries] }) as Promise<void>;
  }

  save(doc: PdfDocHandle): Promise<Uint8Array> {
    return this.request({ type: 'save', id: 0, doc }) as Promise<Uint8Array>;
  }

  renderPage(doc: PdfDocHandle, page: number, cssWidth: number, dpr: number, priority?: PdfTaskPriority): PdfRenderTask {
    return this.renderTask({ type: 'render', doc, page, cssWidth, dpr, priority });
  }

  renderTile(doc: PdfDocHandle, page: number, tile: PdfTileRequest, priority?: PdfTaskPriority): PdfRenderTask {
    return this.renderTask({ type: 'renderTile', doc, page, ...tile, priority });
  }

  /**
   * Post a render request and hand back a cancellable task. Cancelling rejects
   * locally right away and tells the worker, which drops the request if it
   * hasn't started it yet.
   */
  private renderTask(msg: Record<string, unknown>): PdfRenderTask {
    const id = this.nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.workerReady.then((w) => {
        if (this.pending.has(id)) w.postMessage({ ...msg, id }); // skipped if cancelled before the worker was ready
      }, reject);
    }).then((r) => r as Awaited<PdfRenderTask['promise']>);
    return {
      promise,
      cancel: () => {
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        this.workerReady.then((w) => w.postMessage({ type: 'cancel', id })).catch(() => undefined);
        p.reject(new DOMException('render cancelled', 'AbortError'));
      },
    };
  }

  dispose(doc: PdfDocHandle): void {
    this.workerReady.then((w) => w.postMessage({ type: 'dispose', doc })).catch(() => undefined);
  }

  destroy(): void {
    this.destroyed = true;
    this.failAll(new DOMException('engine destroyed', 'AbortError'));
    this.worker?.terminate();
    this.revokeWorker?.();
  }

  /** Post a correlated request and await its `ok`/`error` reply. */
  private request(msg: { type: string; id: number; [k: string]: unknown }, transfer: Transferable[] = []): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.workerReady.then((w) => {
        if (this.pending.has(id)) w.postMessage({ ...msg, id }, transfer);
      }, reject);
    });
  }

  private onMessage(res: PdfWorkerResponse): void {
    if (res.type === 'ready' || res.type === 'initError') return; // bootstrap signals (unused here)
    const p = this.pending.get(res.id);
    if (!p) return;
    this.pending.delete(res.id);
    if (res.type === 'ok') p.resolve(res.result);
    else if (res.type === 'rendered') p.resolve({ bitmap: res.bitmap, width: res.width, height: res.height });
    else p.reject(new Error(res.message));
  }

  private failAll(err: unknown): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
