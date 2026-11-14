import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import {
  createPdfViewer,
  HkPdfToolbarDirective,
  PdfDocumentSource,
  PdfLoadedInfo,
  PdfViewerComponent,
  PdfViewerError,
  PdfWorkspaceComponent,
  WorkspaceDocument,
} from '@hakistack/ng-daisyui';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';

type PdfViewerTab = 'basic' | 'controller' | 'preview' | 'config' | 'workspace' | 'states';

/** Scenarios of the `states` tab. All but `valid` are built in memory: reproducible, no network. */
type PdfStateScenario = 'valid' | 'not-pdf' | 'truncated' | 'unreachable';

interface PdfEventEntry {
  readonly id: number;
  /** Milliseconds since the source was set. */
  readonly ms: number;
  readonly kind: 'loaded' | 'viewerError';
  readonly detail: string;
}

/** Served from the demo app (`public/samples/`): the demo works offline and without CORS (IRS Form W-9, public domain). */
const SAMPLE_PDF_URL = '/samples/fw9.pdf';

@Component({
  selector: 'app-pdf-viewer-demo',
  imports: [PdfViewerComponent, PdfWorkspaceComponent, HkPdfToolbarDirective, DocSectionComponent, DemoPageComponent],
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
              <div class="h-[75vh]">
                <hk-pdf-viewer [src]="pdfUrl()" [config]="basicViewer.config()" />
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

            <app-doc-section
              title="Off-thread rendering (always on)"
              description="Rendering, text extraction, and form handling all run in a Web Worker via the PDFium (Rust→WASM) engine — glyphs rasterize off the main thread with correct text. There's nothing to toggle; the main thread only blits the resulting bitmaps."
            >
              <div class="h-[75vh]">
                <hk-pdf-viewer [src]="pdfUrl()" [config]="perfViewer.config()" />
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
              <div class="h-[75vh]">
                <hk-pdf-viewer [src]="pdfUrl()" [config]="basicViewer.config()" />
              </div>
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

        @if (activeTab() === 'states') {
          <app-doc-section
            title="Loading and errors"
            description="While a document opens, the viewer shows a spinner over the page area (Reload repeats it). When the source can't be used, the page area shows an error panel and (viewerError) / onError receive a PdfViewerError: code, message, recoverable and the original cause. Bytes that aren't a PDF, or a file cut off after its header, are rejected by PDFium (typically invalid_pdf, not recoverable); a URL that can't be fetched gives load_failed (recoverable, so the panel offers Retry). The broken sources are built in memory, so they fail the same way everywhere."
            [codeExample]="statesCode"
          >
            <div class="mb-3 flex flex-wrap gap-2" role="group" aria-label="PDF scenarios">
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-active]="statesScenario() === 'valid'"
                (click)="loadStatesScenario('valid')"
              >
                Valid PDF
              </button>
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-active]="statesScenario() === 'not-pdf'"
                (click)="loadStatesScenario('not-pdf')"
              >
                Not a PDF
              </button>
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-active]="statesScenario() === 'truncated'"
                (click)="loadStatesScenario('truncated')"
              >
                Truncated PDF
              </button>
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-active]="statesScenario() === 'unreachable'"
                (click)="loadStatesScenario('unreachable')"
              >
                Unreachable URL
              </button>
              <button type="button" class="btn btn-sm btn-ghost" (click)="reloadStates()">Reload</button>
            </div>

            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div class="h-[60vh] min-h-96 min-w-0">
                <hk-pdf-viewer
                  class="h-full"
                  [src]="statesSrc()"
                  [config]="statesViewer.config()"
                  fileName="scenario.pdf"
                  (loaded)="onStatesLoaded($event)"
                  (viewerError)="onStatesError($event)"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-3 text-xs">
                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-box border border-base-300 p-3">
                  <dt class="text-base-content/70">state().loaded</dt>
                  <dd class="font-mono">{{ statesViewer.state().loaded }}</dd>
                  <dt class="text-base-content/70">state().numPages</dt>
                  <dd class="font-mono">{{ statesViewer.state().numPages }}</dd>
                  <dt class="text-base-content/70">state().error?.code</dt>
                  <dd class="font-mono">{{ statesViewer.state().error?.code ?? 'null' }}</dd>
                </dl>
                <div>
                  <div class="mb-1 text-sm font-medium" id="pdf-states-error">Last (viewerError) payload</div>
                  <pre class="max-h-56 overflow-auto rounded-box bg-base-200 p-3" aria-labelledby="pdf-states-error">{{
                    lastStatesError() ?? '(none yet)'
                  }}</pre>
                </div>
                <div>
                  <div class="mb-1 text-sm font-medium" id="pdf-states-log">Events</div>
                  <ol
                    class="max-h-48 space-y-1 overflow-auto rounded-box bg-base-200 p-3 font-mono"
                    aria-labelledby="pdf-states-log"
                    aria-live="polite"
                  >
                    @for (e of statesEvents(); track e.id) {
                      <li>
                        <span class="text-base-content/70">+{{ e.ms }} ms</span>
                        <span [class]="e.kind === 'viewerError' ? 'text-error' : 'text-success'"> ({{ e.kind }})</span>
                        {{ e.detail }}
                      </li>
                    } @empty {
                      <li class="text-base-content/70">Pick a scenario.</li>
                    }
                  </ol>
                </div>
              </div>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'workspace') {
          <div class="grid gap-6">
            <app-doc-section
              title="Workspace"
              description="A workspace is for several documents: the rail lists them (and the open one's pages, outline and attachments), the document is in the middle, and the selection, its properties, signatures and comments are on the right. Same [config] controller and outputs as hk-pdf-viewer; [documents] + [(active)] choose what opens. Switching away from unsaved edits asks first. Side panels hide behind their divider and fold away on narrow containers; the Grid view organizes pages in place."
              [codeExample]="workspaceCode"
            >
              <div class="mb-3 flex flex-wrap items-center gap-3">
                <button type="button" class="btn btn-sm" (click)="addManyWorkspaceDocs()">Add 120 documents</button>
                <span class="text-base-content/70 text-sm">{{ workspaceDocs().length }} documents · open: {{ workspaceActive() }}</span>
              </div>
              <div class="h-[85vh] min-h-[36rem]">
                <hk-pdf-workspace [documents]="workspaceDocs()" [(active)]="workspaceActive" [config]="workspaceViewer.config()" />
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

  // ── States demo ─────────────────────────────────────────────────────────

  readonly statesViewer = createPdfViewer({ zoom: 'fit-width' });
  readonly statesScenario = signal<PdfStateScenario>('valid');
  readonly statesSrc = signal<PdfDocumentSource>(SAMPLE_PDF_URL);
  readonly statesEvents = signal<PdfEventEntry[]>([]);
  readonly lastStatesError = signal<string | null>(null);
  private statesStartedAt = performance.now();
  private statesEventId = 0;

  loadStatesScenario(scenario: PdfStateScenario): void {
    this.statesScenario.set(scenario);
    this.statesEvents.set([]);
    this.lastStatesError.set(null);
    this.statesStartedAt = performance.now();
    const text = new TextEncoder();
    switch (scenario) {
      case 'valid':
        this.statesSrc.set(SAMPLE_PDF_URL);
        break;
      case 'not-pdf':
        // A text file renamed to .pdf
        this.statesSrc.set(text.encode('Quarterly results — this is plain text, not a PDF.'));
        break;
      case 'truncated':
        // A real header and the start of an object, then the file ends
        this.statesSrc.set(text.encode('%PDF-1.7\n%\u00e2\u00e3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R'));
        break;
      case 'unreachable': {
        // An object URL revoked before the viewer fetches it: fetch() fails like an offline request
        const url = URL.createObjectURL(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
        URL.revokeObjectURL(url);
        this.statesSrc.set(url);
        break;
      }
    }
  }

  reloadStates(): void {
    this.statesEvents.set([]);
    this.lastStatesError.set(null);
    this.statesStartedAt = performance.now();
    this.statesViewer.reload();
  }

  onStatesLoaded(info: PdfLoadedInfo): void {
    this.logStatesEvent(
      'loaded',
      info.fileSize ? `${info.numPages} pages, ${Math.round(info.fileSize / 1024)} KB` : `${info.numPages} pages`,
    );
  }

  onStatesError(error: PdfViewerError): void {
    const cause = error.cause instanceof Error ? error.cause.message : error.cause === undefined ? undefined : String(error.cause);
    this.lastStatesError.set(JSON.stringify({ code: error.code, message: error.message, recoverable: error.recoverable, cause }, null, 2));
    this.logStatesEvent('viewerError', `${error.code} — ${error.message}`);
  }

  private logStatesEvent(kind: PdfEventEntry['kind'], detail: string): void {
    const ms = Math.round(performance.now() - this.statesStartedAt);
    this.statesEvents.update((list) => [...list, { id: ++this.statesEventId, ms, kind, detail }]);
  }

  readonly statesCode = `import { Component, signal } from '@angular/core';
import { createPdfViewer, PdfDocumentSource, PdfLoadedInfo, PdfViewerComponent, PdfViewerError } from '@hakistack/ng-daisyui';

@Component({
  imports: [PdfViewerComponent],
  template: \`
    <div class="h-[60vh]">
      <hk-pdf-viewer
        class="h-full"
        [src]="src()"
        [config]="viewer.config()"
        (loaded)="onLoaded($event)"
        (viewerError)="onError($event)"
      />
    </div>
    @if (viewer.state().error; as err) {
      <p>{{ err.code }}: {{ err.message }} (recoverable: {{ err.recoverable }})</p>
    }
  \`,
})
export class StatementComponent {
  src = signal<PdfDocumentSource>('/files/statement.pdf');

  // Same events as callbacks: createPdfViewer({ onLoaded, onError })
  viewer = createPdfViewer({ zoom: 'fit-width' });

  onLoaded(info: PdfLoadedInfo): void {
    console.log(info.numPages, 'pages');
  }

  onError(error: PdfViewerError): void {
    // code: 'load_failed' | 'invalid_pdf' | 'password_cancelled' | 'render_failed' | 'unsupported' | 'unknown'
    if (error.recoverable) console.warn('Retry possible', error.message);
    else console.error('Cannot open this file', error.code, error.cause);
  }

  retry(): void {
    this.viewer.reload();
  }

  // Bytes that aren't a PDF → invalid_pdf
  openBroken(): void {
    this.src.set(new TextEncoder().encode('plain text, not a PDF'));
  }
}`;

  readonly workspaceViewer = createPdfViewer({
    zoom: 'fit-width',
    onError: (error) => console.warn('[pdf-viewer-demo] workspace error:', error),
  });
  readonly workspaceDocs = signal<WorkspaceDocument[]>([
    { id: 'agreement', name: 'Service agreement.pdf', src: '/samples/service-agreement.pdf', description: 'Contracts', pages: 3 },
    { id: 'w9', name: 'Form W-9.pdf', src: SAMPLE_PDF_URL, description: 'Taxes · fillable form', pages: 6 },
    { id: 'invoice', name: 'Invoice 0042.pdf', src: '/samples/invoice-0042.pdf', description: 'Billing · October', pages: 1 },
  ]);
  readonly workspaceActive = signal<string | null>('agreement');

  /** A long list, to see the rail with many documents (filter, virtual list, resizable split). */
  addManyWorkspaceDocs(): void {
    const samples = [
      { src: '/samples/service-agreement.pdf', kind: 'Agreement', pages: 3, area: 'Contracts' },
      { src: SAMPLE_PDF_URL, kind: 'Form W-9', pages: 6, area: 'Taxes' },
      { src: '/samples/invoice-0042.pdf', kind: 'Invoice', pages: 1, area: 'Billing' },
    ];
    const start = this.workspaceDocs().length;
    const added = Array.from({ length: 120 }, (_, i) => {
      const n = start + i + 1;
      const sample = samples[n % samples.length];
      const id = String(n).padStart(3, '0');
      return {
        id: `doc-${id}`,
        name: `${sample.kind} ${id}.pdf`,
        src: sample.src,
        description: `${sample.area} · batch ${Math.ceil(n / 10)}`,
        pages: sample.pages,
      };
    });
    this.workspaceDocs.update((docs) => [...docs, ...added]);
  }

  readonly workspaceCode = `// Same controller as <hk-pdf-viewer>
viewer = createPdfViewer({ zoom: 'fit-width' });

documents: WorkspaceDocument[] = [
  { id: 'agreement', name: 'Service agreement.pdf', src: '/files/agreement.pdf', description: 'Contracts', pages: 3 },
  { id: 'w9', name: 'Form W-9.pdf', src: '/files/fw9.pdf', description: 'Taxes' },
];
active = signal<string | null>('agreement');

<!-- Fills its parent's height -->
<div class="h-[85vh]">
  <hk-pdf-workspace [documents]="documents" [(active)]="active" [config]="viewer.config()" />
</div>`;

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

  readonly perfViewer = createPdfViewer({
    zoom: 'fit-width',
    mode: 'continuous',
    onError: (e) => console.error('[pdf-viewer-demo perf] error:', e),
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

  readonly formPdfUrl = signal<string>(SAMPLE_PDF_URL);
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
  PdfDocumentSource,
  PdfLoadedInfo,
  PdfViewerComponent,
  PdfViewerError,
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
