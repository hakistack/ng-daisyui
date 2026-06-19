import { PDFIUM_WORKER_SRC } from './pdfium/pdfium_worker_inline';

/**
 * Whether the PDFium engine can run here: the worker has been built (a real
 * vendored PDFium binary was inlined, not the placeholder) and the browser
 * supports the primitives the engine needs. `false` on the server, on engines
 * without `OffscreenCanvas`/`createImageBitmap`, or before the worker is built —
 * the component then renders via its existing path.
 */
export function isPdfiumEngineAvailable(): boolean {
  return (
    !!PDFIUM_WORKER_SRC &&
    typeof Worker !== 'undefined' &&
    typeof createImageBitmap !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

/**
 * Spin up the PDFium render worker with **zero consumer setup**. The entire
 * worker — its code plus the PDFium and `pdf_engine` wasm binaries — is inlined
 * into the library bundle (see scripts/build-pdfium-worker.mjs). At runtime we
 * turn that string into a Blob and a module Worker, so nothing is fetched and
 * no asset needs to be served.
 *
 * Requires a `worker-src blob:` (or `worker-src 'self' blob:`) CSP allowance.
 *
 * Returns the Worker and the Blob URL to revoke on teardown.
 */
export function createPdfiumWorker(): { worker: Worker; revoke: () => void } {
  if (!PDFIUM_WORKER_SRC) {
    throw new Error(
      'PDFium worker not built. Vendor a MODULARIZE/ES6 pdfium build into ' +
        'src/lib/wasm/pdfium/, run `npm run engine:build`, then `npm run build` ' +
        '(build-pdfium-worker.mjs). See PDFIUM_ENGINE.md §9b.',
    );
  }
  const blob = new Blob([PDFIUM_WORKER_SRC], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });
  return { worker, revoke: () => URL.revokeObjectURL(url) };
}
