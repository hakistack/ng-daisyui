import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { createPdfViewer, HkPdfToolbarDirective, PdfViewerComponent } from '@hakistack/ng-daisyui';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';

type PdfViewerTab = 'basic' | 'controller' | 'preview' | 'config';

const SAMPLE_PDF_URL = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

@Component({
  selector: 'app-pdf-viewer-demo',
  imports: [PdfViewerComponent, HkPdfToolbarDirective, DocSectionComponent, DemoPageComponent],
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

        @if (activeTab() === 'preview') {
          <div class="grid gap-6">
            <app-doc-section
              title="Document preview"
              description="Pass layout: 'preview' to swap the chrome — title, subtitle, page indicator, page card, then prev/next plus a centered download. Defaults to single-page mode at fit-page zoom."
              [codeExample]="previewBasicCode"
            >
              <hk-pdf-viewer
                [src]="pdfUrl()"
                [config]="previewViewer.config()"
                title="Preview"
                subtitle="Part I — Financial Documents · Cash Flow Reports"
              />
            </app-doc-section>

            <app-doc-section
              title="Preview with full toolbar"
              description="Set showToolbar: true and the preview layout renders the full reader toolbar above the page card — page input, zoom select, mode toggle, print/download/fullscreen — together with the bottom prev/next/download. Use this when the embedded preview still benefits from power-user controls."
              [codeExample]="previewToolbarCode"
            >
              <hk-pdf-viewer
                [src]="pdfUrl()"
                [config]="previewWithToolbarViewer.config()"
                title="Q3 board pack"
                subtitle="Reviewed by Finance · pending sign-off"
              />
            </app-doc-section>

            <app-doc-section
              title="Continuous preview"
              description="Override mode: 'continuous' to keep the preview chrome (title + page link + bottom actions) but let the user scroll through every page inside the card. Prev/Next still jump page-to-page; the page link tracks the most-visible page."
              [codeExample]="previewContinuousCode"
            >
              <hk-pdf-viewer
                [src]="pdfUrl()"
                [config]="previewContinuousViewer.config()"
                title="Onboarding handbook"
                subtitle="Read top-to-bottom — confirm each page is reviewed"
              />
            </app-doc-section>

            <app-doc-section
              title="Minimal embedded preview"
              description="Skip title and subtitle for a card-only preview — just the page card and the three buttons. Drop it into a list, modal, or signing flow where the surrounding UI already provides context."
              [codeExample]="previewMinimalCode"
            >
              <hk-pdf-viewer [src]="pdfUrl()" [config]="previewViewer.config()" />
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

            <app-doc-section
              title="Fillable forms + save"
              description="Bind [(formValues)] to the viewer and PDF form widgets sync both ways: pre-fill values flow into the doc's annotationStorage, and user edits stream back through the binding. controller.saveAndDownload() bakes the current values into a fresh PDF."
              [codeExample]="formFillCode"
            >
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    #formUrlInput
                    type="url"
                    class="input input-sm input-bordered grow min-w-64"
                    placeholder="Fillable PDF URL"
                    [value]="formPdfUrl()"
                    (change)="formPdfUrl.set(formUrlInput.value)"
                  />
                  <button class="btn btn-sm btn-primary" (click)="onSaveFormDemo()">Save filled PDF</button>
                  <button class="btn btn-sm btn-ghost" (click)="resetFormFillDemo()">Clear values</button>
                </div>
                <hk-pdf-viewer [src]="formPdfUrl()" [config]="formViewer.config()" [(formValues)]="formFillValues" />
                @if (hasFormValues()) {
                  <div class="text-xs">
                    <div class="font-semibold mb-1">Bound formValues snapshot:</div>
                    <pre class="bg-base-200 p-2 rounded text-xs overflow-x-auto">{{ formValuesJson() }}</pre>
                  </div>
                }
                <div class="text-xs text-base-content/60">
                  Default URL points at the IRS W-9 form. Paste any fillable PDF URL with permissive CORS to try your own.
                </div>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Custom toolbar via slot"
              description="Drop an <ng-template hkPdfToolbar> inside <hk-pdf-viewer> to replace the built-in toolbar with your own markup. The viewer keeps its rendering, page tracking, zoom, and download/print plumbing — you just own the chrome."
              [codeExample]="customToolbarCode"
            >
              <hk-pdf-viewer [src]="pdfUrl()" [config]="customToolbarViewer.config()">
                <ng-template hkPdfToolbar let-state="state">
                  <div class="flex items-center gap-3 px-3 py-2 bg-primary text-primary-content">
                    <span class="font-semibold">Annual report</span>
                    <div class="badge badge-soft badge-sm">Read-only</div>
                    <div class="grow"></div>
                    <button
                      class="btn btn-sm btn-circle btn-ghost"
                      [disabled]="!state || state.page <= 1"
                      (click)="customToolbarViewer.previousPage()"
                      aria-label="Previous"
                    >
                      ‹
                    </button>
                    <span class="text-sm tabular-nums">{{ state?.page }} / {{ state?.numPages }}</span>
                    <button
                      class="btn btn-sm btn-circle btn-ghost"
                      [disabled]="!state || state.page >= state.numPages"
                      (click)="customToolbarViewer.nextPage()"
                      aria-label="Next"
                    >
                      ›
                    </button>
                    <button
                      class="btn btn-sm btn-soft"
                      [disabled]="!state?.loaded"
                      (click)="customToolbarViewer.download('annual-report.pdf')"
                    >
                      Download PDF
                    </button>
                  </div>
                </ng-template>
              </hk-pdf-viewer>
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

  readonly previewViewer = createPdfViewer({
    layout: 'preview',
    onPageChange: (p) => console.log('[pdf-viewer-demo] preview page →', p),
  });

  readonly previewWithToolbarViewer = createPdfViewer({
    layout: 'preview',
    showToolbar: true,
    onLoaded: (info) => console.log('[pdf-viewer-demo] preview+toolbar loaded:', info),
    onPageChange: (p) => console.log('[pdf-viewer-demo] preview+toolbar page →', p),
  });

  readonly previewContinuousViewer = createPdfViewer({
    layout: 'preview',
    mode: 'continuous',
    zoom: 'fit-width',
  });

  readonly customToolbarViewer = createPdfViewer({
    page: 1,
    zoom: 'fit-width',
    mode: 'continuous',
  });

  // ── Form-fill demo state ────────────────────────────────────────────────

  readonly formPdfUrl = signal<string>('https://www.irs.gov/pub/irs-pdf/fw9.pdf');
  readonly formFillValues = signal<Record<string, unknown>>({});

  readonly formViewer = createPdfViewer({
    page: 1,
    zoom: 'fit-width',
    mode: 'continuous',
  });

  readonly formValuesJson = computed(() => JSON.stringify(this.formFillValues(), null, 2));
  readonly hasFormValues = computed(() => Object.keys(this.formFillValues()).length > 0);

  onSaveFormDemo(): void {
    void this.formViewer.saveAndDownload('filled-form.pdf');
  }

  resetFormFillDemo(): void {
    this.formFillValues.set({});
  }

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
  pdfUrl = signal<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');

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

  readonly previewBasicCode = `// Preview layout: title + page indicator + page card + prev/next + download.
// No top toolbar. Defaults to mode: 'single' + zoom: 'fit-page'.
viewer = createPdfViewer({
  layout: 'preview',
});

// template:
<hk-pdf-viewer
  [src]="pdfUrl()"
  [config]="viewer.config()"
  title="Preview"
  subtitle="Part I — Financial Documents · Cash Flow Reports"
/>`;

  readonly previewToolbarCode = `// Preview chrome + full reader toolbar — best of both worlds when the
// embedded preview still benefits from page input, zoom, and mode controls.
viewer = createPdfViewer({
  layout: 'preview',
  showToolbar: true,
});`;

  readonly previewContinuousCode = `// Preview chrome but continuous scroll inside the card. Prev/Next snap
// page-by-page; the page link tracks the most-visible page automatically.
viewer = createPdfViewer({
  layout: 'preview',
  mode: 'continuous',
  zoom: 'fit-width',
});`;

  readonly previewMinimalCode = `// Embedded preview without a title/subtitle — the surrounding UI provides
// context. Dropping into a modal, signing flow, or file picker.
viewer = createPdfViewer({ layout: 'preview' });

// template (no title/subtitle inputs):
<hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />`;

  readonly formFillCode = `import { createPdfViewer, PdfViewerComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [PdfViewerComponent],
  template: \`
    <hk-pdf-viewer
      [src]="formPdfUrl()"
      [config]="viewer.config()"
      [(formValues)]="filled"
    />
    <button (click)="viewer.saveAndDownload('filled.pdf')">Save filled PDF</button>
  \`,
})
export class MyComponent {
  formPdfUrl = signal('/assets/forms/agreement.pdf');
  // Pre-fill some fields by name; bind to a form/store/whatever.
  filled = signal<Record<string, unknown>>({
    'topmostSubform[0].Page1[0].f1_1[0]': 'Acme Inc.',
  });

  viewer = createPdfViewer({ /* page, zoom, mode... */ });
}

// Programmatic save (returns Uint8Array — no download triggered):
const bytes = await viewer.save();
await fetch('/api/store-pdf', { method: 'POST', body: bytes });`;

  readonly customToolbarCode = `import {
  createPdfViewer,
  HkPdfToolbarDirective,
  PdfViewerComponent,
} from '@hakistack/ng-daisyui';

@Component({
  imports: [PdfViewerComponent, HkPdfToolbarDirective],
  template: \`
    <hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()">
      <ng-template hkPdfToolbar let-state="state">
        <div class="flex items-center gap-3 px-3 py-2 bg-primary text-primary-content">
          <span class="font-semibold">Annual report</span>
          <div class="badge badge-soft badge-sm">Read-only</div>
          <div class="grow"></div>
          <button
            class="btn btn-sm btn-circle btn-ghost"
            [disabled]="(state.page ?? 0) <= 1"
            (click)="viewer.previousPage()"
          >‹</button>
          <span>{{ state.page }} / {{ state.numPages }}</span>
          <button
            class="btn btn-sm btn-circle btn-ghost"
            [disabled]="(state.page ?? 0) >= (state.numPages ?? 0)"
            (click)="viewer.nextPage()"
          >›</button>
          <button
            class="btn btn-sm btn-soft"
            (click)="viewer.download('annual-report.pdf')"
          >Download PDF</button>
        </div>
      </ng-template>
    </hk-pdf-viewer>
  \`,
})
export class MyComponent {
  pdfUrl = signal('https://...');
  viewer = createPdfViewer({ /* page, zoom, mode... */ });
}`;
}
