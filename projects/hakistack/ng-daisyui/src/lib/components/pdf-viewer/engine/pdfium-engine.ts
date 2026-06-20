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

  documentTitle(doc: PdfDocHandle): Promise<string> {
    return this.request({ type: 'documentTitle', id: 0, doc }) as Promise<string>;
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

  formFields(doc: PdfDocHandle, page: number): Promise<PdfFormField[]> {
    return this.request({ type: 'formFields', id: 0, doc, page }) as Promise<PdfFormField[]>;
  }

  setFieldValue(doc: PdfDocHandle, page: number, name: string, value: string): Promise<boolean> {
    return this.request({ type: 'setFieldValue', id: 0, doc, page, name, value }) as Promise<boolean>;
  }

  addHighlight(doc: PdfDocHandle, page: number, x: number, y: number, w: number, h: number, color: number): Promise<boolean> {
    return this.request({ type: 'addHighlight', id: 0, doc, page, x, y, w, h, color }) as Promise<boolean>;
  }

  addTextNote(doc: PdfDocHandle, page: number, x: number, y: number, contents: string, color: number): Promise<boolean> {
    return this.request({ type: 'addTextNote', id: 0, doc, page, x, y, contents, color }) as Promise<boolean>;
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
    return this.request({ type: 'addFreeText', id: 0, doc, page, x, y, w, h, contents, color }) as Promise<boolean>;
  }

  addInk(doc: PdfDocHandle, page: number, points: number[], color: number, width: number): Promise<boolean> {
    return this.request({ type: 'addInk', id: 0, doc, page, points, color, width }) as Promise<boolean>;
  }

  deleteAnnotation(doc: PdfDocHandle, page: number, index: number): Promise<boolean> {
    return this.request({ type: 'deleteAnnotation', id: 0, doc, page, index }) as Promise<boolean>;
  }

  setAnnotationContents(doc: PdfDocHandle, page: number, index: number, contents: string): Promise<boolean> {
    return this.request({ type: 'setAnnotationContents', id: 0, doc, page, index, contents }) as Promise<boolean>;
  }

  deletePage(doc: PdfDocHandle, index: number): Promise<boolean> {
    return this.request({ type: 'deletePage', id: 0, doc, index }) as Promise<boolean>;
  }

  insertBlankPage(doc: PdfDocHandle, index: number, width: number, height: number): Promise<boolean> {
    return this.request({ type: 'insertBlankPage', id: 0, doc, index, width, height }) as Promise<boolean>;
  }

  setPageRotation(doc: PdfDocHandle, page: number, degrees: number): Promise<boolean> {
    return this.request({ type: 'setPageRotation', id: 0, doc, page, degrees }) as Promise<boolean>;
  }

  save(doc: PdfDocHandle): Promise<Uint8Array> {
    return this.request({ type: 'save', id: 0, doc }) as Promise<Uint8Array>;
  }

  renderPage(doc: PdfDocHandle, page: number, cssWidth: number, dpr: number): PdfRenderTask {
    const id = this.nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.workerReady.then((w) => {
        // Skip if cancelled before the worker was ready.
        if (this.pending.has(id)) w.postMessage({ type: 'render', id, doc, page, cssWidth, dpr });
      }, reject);
    }).then((r) => r as Awaited<PdfRenderTask['promise']>);
    return {
      promise,
      cancel: () => {
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        // Best-effort: tell the worker (no-op if it never received the render).
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
