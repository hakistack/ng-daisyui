import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HK_THEME } from '../../theme/theme.config';
import { DEFAULT_PDF_VIEWER_LABELS, HK_PDF_LABELS, ResolvedPdfViewerLabels } from './pdf-viewer.labels';
import { PdfDocumentSource, PdfViewerConfig } from './pdf-viewer.types';

/**
 * Lazy-loading PDF viewer built on Mozilla's PDF.js (`pdfjs-dist`). Renders
 * any PDF source (URL, `Uint8Array`, or `Blob`) with a customizable toolbar,
 * sidebar (thumbnails + bookmarks), text selection, search, print, and
 * download.
 *
 * **Phase 1 status (current):** scaffolding only — accepts inputs, exposes the
 * controller API, and renders a loading placeholder. PDF rendering itself
 * lands in the next commit.
 *
 * Configuration is split between two surfaces:
 * - **`[src]`** (this component's input) — the document source. Volatile,
 *   often signal-driven (route params, file uploads, list selection).
 * - **`[config]`** — stable per-instance config + lifecycle callbacks.
 *   Build with `createPdfViewer({...})` and pass `controller.config()` here.
 *
 * Imperative actions (navigation, zoom, search, print, download) are
 * methods on the `PdfViewerController` returned by `createPdfViewer()` —
 * call them directly from your component class without `@ViewChild`.
 *
 * @example
 * // class:
 * viewer = createPdfViewer({
 *   page: 1,
 *   zoom: 'fit-width',
 *   onLoaded: (info) => console.log(`${info.numPages} pages`),
 * });
 * pdfUrl = signal<string>('document.pdf');
 *
 * // template:
 * // <hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />
 *
 * // anywhere:
 * // this.viewer.goToPage(5);
 * // this.viewer.search('quarterly');
 */
@Component({
  selector: 'hk-pdf-viewer',
  imports: [CommonModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PdfViewerComponent implements OnInit {
  private readonly theme = inject(HK_THEME);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userLabels = inject(HK_PDF_LABELS, { optional: true });

  /**
   * The PDF document source. Accepts a URL string, a `Uint8Array` of bytes,
   * or a `Blob` (e.g. from a `<input type="file">`). When this changes the
   * viewer reloads the document.
   */
  readonly src = input.required<PdfDocumentSource>();

  /**
   * Configuration object — pass `controller.config()` from a `createPdfViewer({...})`
   * call. See `PdfViewerConfig` for the full shape.
   */
  readonly config = input.required<PdfViewerConfig>();

  /** Labels with consumer overrides applied; falls back to English defaults. */
  readonly labels = computed<ResolvedPdfViewerLabels>(() => ({
    ...DEFAULT_PDF_VIEWER_LABELS,
    ...this.userLabels,
  }));

  /** Outer container — theme-bridged card to match the rest of the lib's containers. */
  readonly containerClass = computed(() => `card ${this.theme.classes.cardBorder} bg-base-100 overflow-hidden flex flex-col`);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void this.initWorker();
  }

  /**
   * Configure pdfjs-dist's worker URL. Uses `new URL(..., import.meta.url)`
   * so the consumer's bundler (Vite, Webpack 5+, Angular CLI esbuild) emits
   * the worker as a separate chunk and serves it from their own build output —
   * no consumer config required.
   *
   * Honors `config.workerSrc` as an override for environments with strict
   * CSPs or shared CDN setups.
   */
  private async initWorker(): Promise<void> {
    const { GlobalWorkerOptions } = await import('pdfjs-dist');

    // If pdfjs already has a workerSrc set (another viewer instance, manual
    // setup), don't clobber it.
    if (GlobalWorkerOptions.workerSrc) return;

    const override = this.config().workerSrc;
    if (override) {
      GlobalWorkerOptions.workerSrc = override;
      return;
    }

    GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
}
