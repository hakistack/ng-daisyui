import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HK_PDF_DEFAULTS, HkPdfDefaults } from './pdf-viewer.defaults';

/**
 * Subset of `pdfjs-dist`'s top-level exports that the lib actually uses.
 * Kept as a `type` so we don't pull in a value import at type-check time —
 * the real module is dynamically imported at runtime.
 */
export type HkPdfjs = Pick<typeof import('pdfjs-dist'), 'getDocument' | 'GlobalWorkerOptions' | 'TextLayer' | 'AnnotationLayer'>;

/**
 * Singleton bridge between the lib and `pdfjs-dist`. Owns the lazy module
 * import, sets the worker URL once, and resolves the same instance for every
 * `<hk-pdf-viewer>` mounted in the app — so multiple viewers share a single
 * worker and a single CMap/standard-font configuration.
 *
 * Inspired by ngx-extended-pdf-viewer's `PDFScriptLoaderService` pattern,
 * but trimmed to what we actually need (no ES5 fallback, no script-tag
 * injection — bundlers handle that for us via `import.meta.url`).
 */
@Injectable({ providedIn: 'root' })
export class HkPdfService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly defaults = inject(HK_PDF_DEFAULTS, { optional: true }) ?? {};

  private loadPromise: Promise<HkPdfjs> | null = null;

  /**
   * `true` once `pdfjs-dist` has been imported and the worker URL is set.
   * Components watch this to know when it's safe to call `getDocument`.
   */
  readonly ready = signal(false);

  /** App-wide PDF defaults — read at `getDocument` time. */
  getDefaults(): HkPdfDefaults {
    return this.defaults;
  }

  /**
   * Lazily import `pdfjs-dist` and configure the worker. Idempotent — every
   * caller awaits the same promise.
   *
   * Returns the resolved module so callers can call `.getDocument(...)`
   * without re-importing.
   */
  load(): Promise<HkPdfjs> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('PDF.js requires a browser environment'));
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const pdfjs = (await import('pdfjs-dist')) as HkPdfjs;
      const pdfWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      // Don't clobber a worker that's already configured — another lib (or a
      // hand-rolled call) may have set it first. PDF.js shares one global.
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = this.defaults.workerSrc ?? pdfWorkerUrl;
      }
      this.ready.set(true);
      return pdfjs;
    })();

    return this.loadPromise;
  }

  /**
   * Build the parameter object passed to `pdfjs.getDocument(...)`. Merges
   * lib-wide defaults (CMaps, standard fonts, hardware acceleration, max
   * canvas pixels) with the per-call source + password.
   */
  buildDocumentParams(params: { url?: string; data?: Uint8Array | ArrayBuffer; password?: string }): Record<string, unknown> {
    return {
      ...params,
      cMapUrl: this.defaults.cMapUrl,
      cMapPacked: this.defaults.cMapPacked ?? true,
      standardFontDataUrl: this.defaults.standardFontDataUrl,
      enableHWA: this.defaults.enableHWA ?? true,
      maxCanvasPixels: this.defaults.maxCanvasPixels,
      useWorkerFetch: this.defaults.useWorkerFetch ?? false,
    };
  }
}
