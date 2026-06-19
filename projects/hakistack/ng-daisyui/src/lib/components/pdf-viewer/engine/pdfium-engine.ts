import {
  PdfAnnotationRow,
  PdfAttachmentFile,
  PdfDocHandle,
  PdfEngine,
  PdfLinkRect,
  PdfOutlineNode,
  PdfPageSize,
  PdfRenderTask,
  PdfTextSegment,
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
  private readonly worker: Worker;
  private readonly revokeWorker: () => void;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

  constructor() {
    const { worker, revoke } = createPdfiumWorker();
    this.worker = worker;
    this.revokeWorker = revoke;
    this.worker.onmessage = (e: MessageEvent<PdfWorkerResponse>) => this.onMessage(e.data);
    this.worker.onerror = () => this.failAll(new Error('pdfium worker crashed'));
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

  pageText(doc: PdfDocHandle, page: number): Promise<PdfTextSegment[]> {
    return this.request({ type: 'pageText', id: 0, doc, page }) as Promise<PdfTextSegment[]>;
  }

  outline(doc: PdfDocHandle): Promise<PdfOutlineNode[]> {
    return this.request({ type: 'outline', id: 0, doc }) as Promise<PdfOutlineNode[]>;
  }

  pageLinks(doc: PdfDocHandle, page: number): Promise<PdfLinkRect[]> {
    return this.request({ type: 'pageLinks', id: 0, doc, page }) as Promise<PdfLinkRect[]>;
  }

  documentAnnotations(doc: PdfDocHandle): Promise<PdfAnnotationRow[]> {
    return this.request({ type: 'documentAnnotations', id: 0, doc }) as Promise<PdfAnnotationRow[]>;
  }

  attachments(doc: PdfDocHandle): Promise<PdfAttachmentFile[]> {
    return this.request({ type: 'attachments', id: 0, doc }) as Promise<PdfAttachmentFile[]>;
  }

  renderPage(doc: PdfDocHandle, page: number, cssWidth: number, dpr: number): PdfRenderTask {
    const id = this.nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'render', id, doc, page, cssWidth, dpr });
    }).then((r) => r as Awaited<PdfRenderTask['promise']>);
    return {
      promise,
      cancel: () => {
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        this.worker.postMessage({ type: 'cancel', id });
        p.reject(new DOMException('render cancelled', 'AbortError'));
      },
    };
  }

  dispose(doc: PdfDocHandle): void {
    this.worker.postMessage({ type: 'dispose', doc });
  }

  destroy(): void {
    this.failAll(new DOMException('engine destroyed', 'AbortError'));
    this.worker.terminate();
    this.revokeWorker();
  }

  /** Post a correlated request and await its `ok`/`error` reply. */
  private request(msg: { type: string; id: number; [k: string]: unknown }, transfer: Transferable[] = []): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id }, transfer);
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
