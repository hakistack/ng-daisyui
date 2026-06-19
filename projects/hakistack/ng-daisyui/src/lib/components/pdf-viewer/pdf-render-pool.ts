/**
 * Pool of {@link pdf-render.worker} instances for off-main-thread page raster.
 *
 * Each worker holds its own parsed copy of the document (a page proxy can't be
 * shared across workers), so the pool is kept small. `render()` returns a
 * cancellable handle shaped like a PDF.js `RenderTask` (`{ promise, cancel }`)
 * so the component's existing cancellation machinery (`renderTasksByPage`,
 * hysteresis, epoch) drives it unchanged.
 */

export interface RenderPoolInit {
  /** Raw document bytes (one structured-clone copy is sent to each worker). */
  readonly bytes: ArrayBuffer;
  /** URL of the bundled render worker asset (`renderWorkerSrc`). */
  readonly workerUrl: string | URL;
  /** PDF.js worker URL for the render worker's own parsing. */
  readonly pdfWorkerSrc?: string;
  readonly cMapUrl?: string;
  readonly cMapPacked?: boolean;
  readonly standardFontDataUrl?: string;
  /** Pool size; clamped to [1, 4]. */
  readonly size: number;
}

export interface RenderHandle {
  readonly promise: Promise<ImageBitmap>;
  cancel(): void;
}

interface PendingRequest {
  resolve(bitmap: ImageBitmap): void;
  reject(reason: unknown): void;
  worker: PoolWorker;
}

interface PoolWorker {
  readonly worker: Worker;
  inflight: number;
}

/** Feature-detect everything the worker path needs; false → use main thread. */
export function isRenderPoolSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function' &&
    typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function'
  );
}

export class PdfRenderPool {
  private readonly workers: PoolWorker[] = [];
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private ready: Promise<void> | null = null;
  private disposed = false;

  /** Spin up the pool and load the document into every worker. */
  init(opts: RenderPoolInit): Promise<void> {
    if (this.ready) return this.ready;
    const size = Math.max(1, Math.min(4, Math.floor(opts.size)));

    const readies: Promise<void>[] = [];
    for (let i = 0; i < size; i++) {
      const worker = new Worker(opts.workerUrl, { type: 'module' });
      const pw: PoolWorker = { worker, inflight: 0 };
      this.workers.push(pw);
      worker.onmessage = (e: MessageEvent) => this.onMessage(pw, e);

      // Each worker needs its own copy of the bytes (transfer detaches the
      // buffer), so clone per worker and transfer the clone.
      const copy = opts.bytes.slice(0);
      readies.push(
        new Promise<void>((resolve, reject) => {
          // Settle on ready/initError, but also on a worker `error` event (bad
          // URL / failed module load) or a timeout — otherwise a worker that
          // never posts back would hang init forever and the viewer would
          // never fall back to the main thread.
          let settled = false;
          const cleanup = () => {
            worker.removeEventListener('message', onReady);
            worker.removeEventListener('error', onError);
            clearTimeout(timer);
          };
          const onReady = (e: MessageEvent) => {
            const d = e.data;
            if (d?.type === 'ready') {
              settled = true;
              cleanup();
              resolve();
            } else if (d?.type === 'initError') {
              settled = true;
              cleanup();
              reject(new Error(d.message));
            }
          };
          const onError = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error('render worker failed to load'));
          };
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error('render worker init timed out'));
          }, 10_000);
          worker.addEventListener('message', onReady);
          worker.addEventListener('error', onError);
        }),
      );
      worker.postMessage(
        {
          type: 'init',
          bytes: copy,
          workerSrc: opts.pdfWorkerSrc,
          cMapUrl: opts.cMapUrl,
          cMapPacked: opts.cMapPacked,
          standardFontDataUrl: opts.standardFontDataUrl,
        },
        [copy],
      );
    }

    this.ready = Promise.all(readies).then(() => void 0);
    return this.ready;
  }

  /** Request a rasterized page. Resolves with a transferable `ImageBitmap`. */
  render(pageNumber: number, scale: number, dpr: number): RenderHandle {
    const requestId = this.nextRequestId++;
    const pw = this.leastBusy();

    const promise = new Promise<ImageBitmap>((resolve, reject) => {
      if (this.disposed || !pw) {
        reject(new DOMException('render pool unavailable', 'AbortError'));
        return;
      }
      this.pending.set(requestId, { resolve, reject, worker: pw });
      pw.inflight++;
      // Render only once every worker has finished loading the document.
      void this.ready?.then(() => {
        if (this.pending.has(requestId)) pw.worker.postMessage({ type: 'render', requestId, pageNumber, scale, dpr });
      });
    });

    return {
      promise,
      cancel: () => {
        const req = this.pending.get(requestId);
        if (!req) return;
        this.pending.delete(requestId);
        req.worker.inflight = Math.max(0, req.worker.inflight - 1);
        req.worker.worker.postMessage({ type: 'cancel', requestId });
        req.reject(new DOMException('render cancelled', 'AbortError'));
      },
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const { worker } of this.workers) worker.terminate();
    this.workers.length = 0;
    for (const req of this.pending.values()) req.reject(new DOMException('render pool disposed', 'AbortError'));
    this.pending.clear();
  }

  private leastBusy(): PoolWorker | undefined {
    let best: PoolWorker | undefined;
    for (const w of this.workers) if (!best || w.inflight < best.inflight) best = w;
    return best;
  }

  private onMessage(pw: PoolWorker, e: MessageEvent): void {
    const d = e.data;
    if (!d || (d.type !== 'rendered' && d.type !== 'renderError')) return;
    const req = this.pending.get(d.requestId);
    if (!req) {
      // Late arrival (cancelled): free the orphaned bitmap so memory doesn't leak.
      if (d.type === 'rendered' && d.bitmap) (d.bitmap as ImageBitmap).close();
      return;
    }
    this.pending.delete(d.requestId);
    pw.inflight = Math.max(0, pw.inflight - 1);
    if (d.type === 'rendered') req.resolve(d.bitmap as ImageBitmap);
    else req.reject(new Error(d.message ?? 'render failed'));
  }
}
