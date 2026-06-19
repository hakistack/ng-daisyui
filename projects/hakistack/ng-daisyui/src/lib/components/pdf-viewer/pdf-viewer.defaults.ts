import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * App-wide defaults forwarded to PDF.js for every `<hk-pdf-viewer>` instance.
 * Injected via `provideHkPdfDefaults({...})`. Per-instance config still wins —
 * these are the shared baseline for things like worker location, hardware
 * acceleration, and CMap/standard-font assets that rarely vary per viewer.
 */
export interface HkPdfDefaults {
  /**
   * Worker URL override. By default the lib emits the worker as a separate
   * chunk via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`,
   * which works zero-config on Vite, esbuild, and modern Webpack — the
   * recommended path for almost every Angular 21+ project.
   *
   * Override when the default doesn't fit. The three cases that come up:
   *
   * **1. Self-hosted worker (older projects, custom asset pipelines).**
   * Copy the worker into your app's `assets` folder and serve it from a
   * stable URL. Useful when your bundler doesn't fully support
   * `import.meta.url`, or when you want a single worker shared by every
   * route without per-chunk hashing.
   *
   * Add to your project (one-time):
   * ```bash
   * cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs src/assets/pdfjs/
   * ```
   * Make sure `angular.json`'s `assets` array includes `src/assets`.
   * Then in your `app.config.ts`:
   * ```ts
   * provideHkPdfDefaults({
   *   workerSrc: 'assets/pdfjs/pdf.worker.min.mjs',
   * }),
   * ```
   *
   * **2. Strict CSP (enterprise apps blocking blob: workers).**
   * Some Content-Security-Policy headers forbid `worker-src 'blob:'`. The
   * default URL resolution emits a hashed chunk URL, which most CSPs allow,
   * but if yours doesn't, point at a stable self-hosted path:
   * ```ts
   * provideHkPdfDefaults({
   *   workerSrc: '/static/pdfjs/pdf.worker.min.mjs',
   * }),
   * ```
   *
   * **3. Shared CDN.**
   * For apps deploying multiple viewers across micro-frontends, serving the
   * worker from a CDN avoids each app shipping its own copy:
   * ```ts
   * provideHkPdfDefaults({
   *   workerSrc: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs',
   * }),
   * ```
   * Be aware: CDN load adds a network dependency to your viewer's startup.
   *
   * The version of `pdf.worker.min.mjs` you serve **must** match the
   * `pdfjs-dist` version in your `package.json` — mismatched versions throw
   * `UnknownErrorException: API version does not match Worker version` at
   * load time.
   */
  readonly workerSrc?: string;

  /**
   * App-wide URL of the bundled off-thread render worker
   * (`@hakistack/ng-daisyui/workers/pdf-render.worker.mjs`). Only used when
   * {@link renderPoolSize} > 0 — see the warning there; off-thread rendering is
   * experimental (text renders as boxes due to a pdf.js worker font limitation)
   * and off by default.
   */
  readonly renderWorkerSrc?: string;

  /**
   * Off-thread render pool size. **Defaults to `0` (main-thread).** Experimental
   * when `> 0` — see {@link PdfViewerConfig.renderPoolSize}. Clamped to 1–4.
   */
  readonly renderPoolSize?: number;

  /**
   * Maximum canvas pixel area (width × height) for any single page. PDF.js
   * default is `2 ** 24` (~16M, ≈4096²). Lower this on memory-constrained
   * devices or when rendering very large multi-page docs; raise it if pages
   * appear blurry on hi-DPI displays.
   */
  readonly maxCanvasPixels?: number;

  /**
   * Enable hardware acceleration for canvas painting. Default: `true`.
   * Disable only when investigating GPU-related rendering glitches.
   */
  readonly enableHWA?: boolean;

  /**
   * When true, PDF.js fetches the document inside the worker (faster, fewer
   * main-thread copies). Default: `false` because it requires permissive CORS
   * on the PDF host.
   */
  readonly useWorkerFetch?: boolean;

  /**
   * URL prefix for CMap files (CJK font maps). Required when rendering PDFs
   * with Chinese / Japanese / Korean text. Set to a path your app serves
   * (typically `/assets/pdfjs/cmaps/`).
   */
  readonly cMapUrl?: string;

  /** Whether the CMap files are stored in the binary "packed" format. Default: `true`. */
  readonly cMapPacked?: boolean;

  /**
   * URL prefix for PDF.js's standard font data. Required for PDFs that
   * reference Type1 standard fonts without embedding them.
   */
  readonly standardFontDataUrl?: string;
}

/**
 * Injection token holding the merged `HkPdfDefaults`. Read by `HkPdfService`
 * and forwarded to `pdfjsLib.getDocument(...)` calls.
 */
export const HK_PDF_DEFAULTS = new InjectionToken<HkPdfDefaults>('HK_PDF_DEFAULTS');

/**
 * Register app-wide defaults for `<hk-pdf-viewer>`. Mirrors `provideHkPdfLabels`.
 *
 * @example
 * providers: [
 *   provideHkPdfDefaults({
 *     workerSrc: '/assets/pdfjs/pdf.worker.min.mjs',
 *     cMapUrl: '/assets/pdfjs/cmaps/',
 *     standardFontDataUrl: '/assets/pdfjs/standard_fonts/',
 *     maxCanvasPixels: 16777216,
 *   }),
 * ]
 */
export function provideHkPdfDefaults(defaults: HkPdfDefaults): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_PDF_DEFAULTS, useValue: defaults }]);
}
