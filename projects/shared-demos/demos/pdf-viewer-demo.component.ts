import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { createPdfViewer, PdfViewerComponent } from '@hakistack/ng-daisyui';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';

type PdfViewerTab = 'basic' | 'controller' | 'config';

const SAMPLE_PDF_URL = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

@Component({
  selector: 'app-pdf-viewer-demo',
  imports: [PdfViewerComponent, DocSectionComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="PDF Viewer"
      description="Lazy-loading PDF viewer powered by Mozilla's PDF.js. Phase 1 — scaffolding committed; rendering lands in the next commit."
      icon="file-text"
      category="Data Display"
      importName="PdfViewerComponent, createPdfViewer"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="grid gap-6">
            <app-doc-section
              title="Basic usage"
              description="Pass a URL via [src] and a controller config via [config]. Component takes care of the rest."
              [codeExample]="basicCode"
            >
              <hk-pdf-viewer [src]="pdfUrl()" [config]="basicViewer.config()" />
              <div class="mt-3 text-xs text-base-content/60">
                <strong>Status:</strong> Phase 1 scaffolding — component renders a loading placeholder. Rendering implementation follows in
                the next commit.
              </div>
            </app-doc-section>

            <app-doc-section title="Switching the source" description="The [src] input accepts a string URL, a Uint8Array, or a Blob.">
              <div class="flex flex-wrap gap-2 mb-3">
                <button class="btn btn-sm btn-primary" (click)="loadSampleUrl()">Load sample URL</button>
                <button class="btn btn-sm" (click)="clearSrc()">Clear</button>
              </div>
              <div class="text-xs">
                <div><strong>Current src:</strong></div>
                <pre class="bg-base-200 p-2 rounded text-xs mt-1 overflow-x-auto">{{ pdfUrl() || '(empty)' }}</pre>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'controller') {
          <div class="grid gap-6">
            <app-doc-section
              title="Controller API"
              description="Methods on the controller returned by createPdfViewer() — call them anywhere, no @ViewChild needed."
              [codeExample]="controllerCode"
            >
              <hk-pdf-viewer [src]="pdfUrl()" [config]="basicViewer.config()" />
              <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button class="btn btn-sm" (click)="basicViewer.firstPage()">First</button>
                <button class="btn btn-sm" (click)="basicViewer.previousPage()">Previous</button>
                <button class="btn btn-sm" (click)="basicViewer.nextPage()">Next</button>
                <button class="btn btn-sm" (click)="basicViewer.lastPage()">Last</button>
                <button class="btn btn-sm" (click)="basicViewer.zoomIn()">Zoom in</button>
                <button class="btn btn-sm" (click)="basicViewer.zoomOut()">Zoom out</button>
                <button class="btn btn-sm" (click)="basicViewer.print()">Print</button>
                <button class="btn btn-sm" (click)="basicViewer.download('document.pdf')">Download</button>
                <button class="btn btn-sm" (click)="basicViewer.toggleSidebar()">Toggle sidebar</button>
              </div>
              <div class="mt-3 text-xs text-base-content/60">
                These buttons call controller methods. They're no-ops in the current scaffolding commit; behavior wires up in the next.
              </div>
            </app-doc-section>

            <app-doc-section
              title="Reactive state"
              description="Read controller.state() — a signal of the runtime view (page, zoom, loaded, search)."
            >
              <div class="text-xs space-y-1">
                <div><strong>Page:</strong> {{ basicViewer.state().page }} / {{ basicViewer.state().numPages }}</div>
                <div><strong>Zoom:</strong> {{ basicViewer.state().zoom }} ({{ basicViewer.state().zoomMode }})</div>
                <div><strong>Mode:</strong> {{ basicViewer.state().mode }}</div>
                <div><strong>Loaded:</strong> {{ basicViewer.state().loaded }}</div>
                <div><strong>Sidebar open:</strong> {{ basicViewer.state().sidebarOpen }}</div>
                @if (basicViewer.state().error; as err) {
                  <div class="text-error"><strong>Error:</strong> {{ err.code }} — {{ err.message }}</div>
                }
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'config') {
          <div class="grid gap-6">
            <app-doc-section
              title="Single-page mode"
              description="Set mode: 'single' to render one page at a time instead of continuous scroll."
              [codeExample]="singleModeCode"
            >
              <hk-pdf-viewer [src]="pdfUrl()" [config]="singlePageViewer.config()" />
            </app-doc-section>

            <app-doc-section
              title="No toolbar / no sidebar"
              description="Hide the chrome with showToolbar / showSidebar for embedded viewers."
              [codeExample]="minimalCode"
            >
              <hk-pdf-viewer [src]="pdfUrl()" [config]="minimalViewer.config()" />
            </app-doc-section>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class PdfViewerDemoComponent {
  private readonly route = inject(ActivatedRoute);

  readonly featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  readonly activeTab = computed(() => (this.featureParam() ?? 'basic') as PdfViewerTab);

  readonly pdfUrl = signal<string>(SAMPLE_PDF_URL);

  readonly basicViewer = createPdfViewer({
    page: 1,
    zoom: 'fit-width',
    mode: 'continuous',
    onLoaded: (info) => console.log('[pdf-viewer-demo] loaded:', info),
    onPageChange: (p) => console.log('[pdf-viewer-demo] page →', p),
    onError: (e) => console.error('[pdf-viewer-demo] error:', e),
  });

  readonly singlePageViewer = createPdfViewer({
    mode: 'single',
    zoom: 'fit-page',
  });

  readonly minimalViewer = createPdfViewer({
    showToolbar: false,
    showSidebar: false,
  });

  loadSampleUrl(): void {
    this.pdfUrl.set(SAMPLE_PDF_URL);
  }

  clearSrc(): void {
    this.pdfUrl.set('');
  }

  // ── Code samples ────────────────────────────────────────────────────────

  readonly basicCode = `import { createPdfViewer, PdfViewerComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [PdfViewerComponent],
  template: \`<hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />\`,
})
export class MyComponent {
  pdfUrl = signal<string>('document.pdf');

  viewer = createPdfViewer({
    page: 1,
    zoom: 'fit-width',
    mode: 'continuous',
    onLoaded: (info) => console.log(\`\${info.numPages} pages\`),
    onPageChange: (p) => console.log('page', p),
  });
}`;

  readonly controllerCode = `// Anywhere in your component class:
this.viewer.goToPage(5);
this.viewer.nextPage();
this.viewer.zoomIn();
this.viewer.search('quarterly results');
this.viewer.print();
this.viewer.download('report.pdf');

// Reactive state — useful for custom UI:
this.viewer.state(); // { page, numPages, zoom, mode, loaded, error, ... }`;

  readonly singleModeCode = `viewer = createPdfViewer({
  mode: 'single',
  zoom: 'fit-page',
});`;

  readonly minimalCode = `// Embed without chrome — just the canvas. You drive nav from your own UI.
viewer = createPdfViewer({
  showToolbar: false,
  showSidebar: false,
});`;
}
