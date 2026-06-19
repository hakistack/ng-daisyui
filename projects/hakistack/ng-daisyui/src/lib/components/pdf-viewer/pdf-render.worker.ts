/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Off-main-thread PDF rasterization worker.
 *
 * A page proxy can't be transferred across workers, so this worker loads the
 * document from its own copy of the source bytes and rasterizes requested pages
 * into an `OffscreenCanvas`, transferring an `ImageBitmap` back. The main thread
 * then does a sub-millisecond `drawImage` instead of the 30–120 ms/page paint.
 *
 * Bundled standalone (with pdf.js inlined) by `scripts/build-render-worker.mjs`
 * into `workers/pdf-render.worker.mjs` — ng-packagr does NOT bundle workers, so
 * the library ships this as a prebuilt asset and consumers point the viewer's
 * `renderWorkerSrc` at it.
 */
import * as pdfjs from 'pdfjs-dist';

interface InitMsg {
  type: 'init';
  bytes: ArrayBuffer;
  workerSrc?: string;
  cMapUrl?: string;
  cMapPacked?: boolean;
  standardFontDataUrl?: string;
}
interface RenderMsg {
  type: 'render';
  requestId: number;
  pageNumber: number;
  scale: number;
  dpr: number;
}
interface CancelMsg {
  type: 'cancel';
  requestId: number;
}
type InMsg = InitMsg | RenderMsg | CancelMsg;

let docPromise: Promise<any> | null = null;
const tasks = new Map<number, { cancel: () => void }>();

const ctx = self as unknown as Worker;

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    if (msg.workerSrc) (pdfjs as any).GlobalWorkerOptions.workerSrc = msg.workerSrc;
    docPromise = (pdfjs as any)
      .getDocument({
        data: new Uint8Array(msg.bytes),
        cMapUrl: msg.cMapUrl,
        cMapPacked: msg.cMapPacked ?? true,
        standardFontDataUrl: msg.standardFontDataUrl,
      })
      .promise.catch((err: any) => {
        ctx.postMessage({ type: 'initError', message: String(err?.message ?? err) });
        throw err;
      });
    try {
      await docPromise;
      ctx.postMessage({ type: 'ready' });
    } catch {
      /* already reported */
    }
    return;
  }

  if (msg.type === 'cancel') {
    tasks.get(msg.requestId)?.cancel();
    tasks.delete(msg.requestId);
    return;
  }

  if (msg.type === 'render') {
    if (!docPromise) {
      ctx.postMessage({ type: 'renderError', requestId: msg.requestId, message: 'worker not initialized' });
      return;
    }
    try {
      const doc = await docPromise;
      const page = await doc.getPage(msg.pageNumber);
      const viewport = page.getViewport({ scale: msg.scale });
      const w = Math.max(1, Math.floor(viewport.width * msg.dpr));
      const h = Math.max(1, Math.floor(viewport.height * msg.dpr));
      const canvas = new OffscreenCanvas(w, h);
      const c2d = canvas.getContext('2d');
      if (!c2d) throw new Error('no 2d context');
      const transform = msg.dpr !== 1 ? [msg.dpr, 0, 0, msg.dpr, 0, 0] : undefined;
      // pdf.js 6.x: OffscreenCanvas isn't an HTMLCanvasElement, so render via
      // `canvasContext` with `canvas: null` (the documented escape hatch).
      const task = page.render({ canvas: null, canvasContext: c2d as unknown as CanvasRenderingContext2D, viewport, transform });
      tasks.set(msg.requestId, task);
      await task.promise;
      tasks.delete(msg.requestId);
      const bitmap = canvas.transferToImageBitmap();
      ctx.postMessage({ type: 'rendered', requestId: msg.requestId, bitmap, width: w, height: h }, [bitmap]);
    } catch (err: any) {
      tasks.delete(msg.requestId);
      ctx.postMessage({ type: 'renderError', requestId: msg.requestId, name: err?.name, message: String(err?.message ?? err) });
    }
  }
};
