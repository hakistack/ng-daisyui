import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { DocumentSource, DocumentViewerComponent, getSupportedExtensions, resolveFormat } from '@hakistack/ng-daisyui';

import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';

type DocumentViewerTab = 'basic' | 'spreadsheet' | 'image' | 'switching';

/**
 * Sample URLs for the format-dispatch tab.
 *
 * Every URL here serves with `Access-Control-Allow-Origin: *` so the
 * browser fetch doesn't fail on CORS. We deliberately don't include an
 * `.xlsx` sample — public CORS-enabled spreadsheet hosts are scarce and
 * the file picker is just as good for proving the architecture. Drop a
 * sample into `projects/demo/public/sample.xlsx` and reference `/sample.xlsx`
 * if you want a click-to-load spreadsheet experience.
 */
const SAMPLE_PDF = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
const SAMPLE_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';
const SAMPLE_TEXT =
  'data:text/plain;charset=utf-8,Hello%20from%20hk-document-viewer.%0AThis%20is%20a%20plain-text%20document.%0AThe%20text%20renderer%20handles%20.txt%2C%20.md%2C%20.csv%2C%20.log%2C%20.html.';

@Component({
  selector: 'app-document-viewer-demo',
  imports: [DocumentViewerComponent, DemoPageComponent, DocSectionComponent],
  template: `
    <app-demo-page
      title="Document Viewer"
      description="Universal viewer that routes formats to per-renderer components. Phase 1: PDF (via hk-pdf-viewer), spreadsheet (calamine WASM → hk-table), text, image. More renderers — docx, pptx, rtf, eml — land in later phases."
      icon="file-text"
      category="Data Display"
      importName="DocumentViewerComponent"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <app-doc-section
            title="Pick a file"
            description="Upload anything — PDF, xlsx, image, text. The viewer detects the format and dispatches to the matching renderer."
          >
            <div class="flex flex-wrap gap-2 items-center mb-3">
              <input type="file" class="file-input file-input-sm file-input-bordered" [attr.accept]="acceptAll" (change)="onFile($event)" />
              <button class="btn btn-sm" (click)="clear()">Clear</button>
            </div>

            @if (currentSource(); as src) {
              <div class="text-xs text-base-content/60 mb-2">
                <strong>Detected:</strong>
                <span class="font-mono">{{ detectedSummary() }}</span>
              </div>
              <div class="border border-base-content/10 rounded-md overflow-hidden">
                <hk-document-viewer [src]="src" [config]="viewerConfig()" />
              </div>
            } @else {
              <div class="text-base-content/40 text-sm py-12 text-center">Pick a file above, or jump to a sample in the next tab.</div>
            }
          </app-doc-section>
        }

        @if (activeTab() === 'spreadsheet') {
          <app-doc-section
            title="Spreadsheet renderer"
            description="Upload an .xlsx / .xls / .xlsb / .ods file. Parsing runs entirely in-browser via calamine (Rust → WASM), then the rows are handed to <hk-table>. Sheet tabs appear at the top when the workbook has multiple sheets."
            [codeExample]="spreadsheetCode"
          >
            <div class="flex flex-wrap gap-2 items-center mb-3">
              <input
                type="file"
                class="file-input file-input-sm file-input-bordered"
                [attr.accept]="acceptSheet"
                (change)="onFile($event)"
              />
              <button class="btn btn-sm" (click)="clear()">Clear</button>
            </div>
            <div class="text-xs text-base-content/50 mb-3">
              Open DevTools → Network and watch <code class="font-mono">document_wasm</code> load on the first upload — and stay cached for
              every subsequent file.
            </div>
            @if (currentSource(); as src) {
              <div class="border border-base-content/10 rounded-md overflow-hidden">
                <hk-document-viewer [src]="src" [config]="viewerConfig()" />
              </div>
            } @else {
              <div class="text-base-content/40 text-sm py-12 text-center">Pick a spreadsheet above to see calamine parse it on-device.</div>
            }
          </app-doc-section>
        }

        @if (activeTab() === 'image') {
          <app-doc-section
            title="Image renderer (TIFF, HEIC, + friends)"
            description="Upload a TIFF / HEIC / BMP / GIF / ICO / PNM / QOI file. The renderer dispatches by format: TIFF and the lesser formats go through the Rust image crate compiled to WASM; HEIC routes to heic2any (libheif WASM under the hood — an optional peer dep)."
          >
            <div class="flex flex-wrap gap-2 items-center mb-3">
              <input
                type="file"
                class="file-input file-input-sm file-input-bordered"
                [attr.accept]="acceptImage"
                (change)="onFile($event)"
              />
              <button class="btn btn-sm" (click)="clear()">Clear</button>
            </div>
            <div class="text-xs text-base-content/50 mb-3 space-y-1">
              <div><strong>TIFF</strong> uses our in-tree <code class="font-mono">image_wasm</code> bundle (pure Rust).</div>
              <div>
                <strong>HEIC</strong> uses <code class="font-mono">heic2any</code> as an optional peer dep — install with
                <code class="font-mono">npm install heic2any</code> in your app.
              </div>
              <div>Open DevTools → Network to confirm each bundle loads only when first needed and is cached after.</div>
            </div>
            @if (currentSource(); as src) {
              <div class="border border-base-content/10 rounded-md overflow-hidden">
                <hk-document-viewer [src]="src" [config]="viewerConfig()" />
              </div>
            } @else {
              <div class="text-base-content/40 text-sm py-12 text-center">Pick a TIFF or HEIC to see the WASM decoder in action.</div>
            }
          </app-doc-section>
        }

        @if (activeTab() === 'switching') {
          <app-doc-section
            title="Format dispatch"
            description="The same component renders different formats from CORS-friendly sample URLs. Open DevTools → Network — the calamine WASM bundle is intentionally NOT pulled here (no spreadsheet sample), proving the lazy-load boundary holds."
          >
            <div class="flex flex-wrap gap-2 mb-3">
              <button class="btn btn-sm" (click)="loadSample(SAMPLE_PDF, 'sample.pdf')">PDF</button>
              <button class="btn btn-sm" (click)="loadSample(SAMPLE_IMG, 'sample.png')">Image</button>
              <button class="btn btn-sm" (click)="loadSample(SAMPLE_TEXT, 'sample.txt')">Text</button>
              <button class="btn btn-sm" (click)="clear()">Clear</button>
            </div>
            @if (currentSource(); as src) {
              <div class="border border-base-content/10 rounded-md overflow-hidden">
                <hk-document-viewer [src]="src" [config]="viewerConfig()" />
              </div>
            }
          </app-doc-section>
        }
      </div>
    </app-demo-page>
  `,
})
export class DocumentViewerDemoComponent {
  readonly SAMPLE_PDF = SAMPLE_PDF;
  readonly SAMPLE_IMG = SAMPLE_IMG;
  readonly SAMPLE_TEXT = SAMPLE_TEXT;

  /**
   * Three accept lists demonstrate two patterns:
   *
   *   - `acceptAll`     — derived from the lib's `EXT_TO_FORMAT` map.
   *                       Single source of truth. Adding a new format
   *                       to helpers.ts auto-extends every consumer
   *                       that uses this helper.
   *   - `acceptSheet` / `acceptImage` — hardcoded per-tab narrowings.
   *                       Intentionally curated to scope each tab to
   *                       the formats it demonstrates.
   *
   * The native `<input accept>` attribute is a comma-separated string,
   * not an array — `.join(',')` at the binding site keeps the source
   * authoring shape (string[]) and runtime shape (string) honest.
   */
  readonly acceptAll = getSupportedExtensions().join(',');
  readonly acceptSheet = ['.xlsx', '.xls', '.xlsb', '.xlsm', '.ods', '.csv'].join(',');
  readonly acceptImage = ['.tiff', '.tif', '.heic', '.heif', '.bmp', '.gif', '.ico', '.pnm', '.pbm', '.pgm', '.ppm', '.qoi'].join(',');

  private readonly route = inject(ActivatedRoute);
  private readonly tabFromRoute = toSignal(this.route.paramMap.pipe(map((p) => (p.get('feature') ?? 'basic') as DocumentViewerTab)), {
    initialValue: 'basic' as DocumentViewerTab,
  });

  readonly activeTab = computed<DocumentViewerTab>(() => this.tabFromRoute());

  readonly currentSource = signal<DocumentSource | null>(null);
  /** Filename hint passed alongside the source — improves format detection. */
  readonly currentFilename = signal<string | null>(null);

  readonly viewerConfig = computed(() => ({
    filename: this.currentFilename() ?? undefined,
  }));

  readonly detectedSummary = computed(() => {
    const src = this.currentSource();
    if (!src) return '';
    const fmt = resolveFormat(src, undefined, this.currentFilename() ?? undefined);
    return `${fmt.format}${fmt.extension ? ` (${fmt.extension})` : ''}${fmt.mimeType ? ` · ${fmt.mimeType}` : ''}`;
  });

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.currentSource.set(file);
    this.currentFilename.set(file.name);
  }

  loadSample(url: string, filename: string): void {
    this.currentSource.set(url);
    this.currentFilename.set(filename);
  }

  clear(): void {
    this.currentSource.set(null);
    this.currentFilename.set(null);
  }

  readonly spreadsheetCode = `// Class
currentSource = signal<DocumentSource | null>(null);

loadXlsx(): void {
  this.currentSource.set('/sample.xlsx');
}

// Template
@if (currentSource(); as src) {
  <hk-document-viewer [src]="src" [config]="{ filename: 'sample.xlsx' }" />
}`;
}
