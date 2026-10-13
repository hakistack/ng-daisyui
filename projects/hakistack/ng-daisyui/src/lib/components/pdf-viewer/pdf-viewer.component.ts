import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, inject, input } from '@angular/core';
import { PdfDocumentSource } from './pdf-viewer.types';
import { HK_THEME } from '../../theme/theme.config';
import { PDF_VIEWER_PROVIDERS, PdfViewerHostBase } from './pdf-viewer-host';
import { HkPdfToolbarContext, HkPdfToolbarDirective } from './pdf-viewer.directives';
import { PdfSignatureDialogComponent } from './ui/pdf-signature-dialog.component';
import { PdfDigitalSignDialogComponent } from './ui/pdf-digital-sign-dialog.component';
import { PdfFormDesignToolbarComponent } from './ui/pdf-form-design-toolbar.component';
import { PdfFormFieldPanelComponent } from './ui/pdf-form-field-panel.component';
import { PdfAnnotationDialogsComponent } from './ui/pdf-annotation-dialogs.component';
import { PdfAnnotationPanelComponent } from './ui/pdf-annotation-panel.component';
import { PdfAnnotationToolbarComponent } from './ui/pdf-annotation-toolbar.component';
import { PdfFindBarComponent } from './ui/pdf-find-bar.component';
import { PdfPagesComponent } from './ui/pdf-pages.component';
import { PdfPageOrganizerComponent } from './ui/pdf-page-organizer.component';
import { PdfSidebarComponent } from './ui/pdf-sidebar.component';
import { PdfTextEditorComponent } from './ui/pdf-text-editor.component';
import { PdfToolbarComponent } from './ui/pdf-toolbar.component';

/**
 * PDF viewer built on the PDFium (Rust→WASM) engine, which rasterizes pages
 * off the main thread with correct text. Renders any PDF source (URL,
 * `Uint8Array`, or `Blob`) with a customizable toolbar, sidebar (thumbnails +
 * bookmarks), text selection, search, forms, print, and download/export.
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
 * This component is a thin shell: state lives in {@link PdfViewerStore}, the
 * work in per-viewer services (`services/`), and the chrome in `ui/`. Inputs,
 * outputs, the controller binding and keyboard shortcuts come from
 * {@link PdfViewerHostBase}, shared with `hk-pdf-workspace`.
 *
 * @example
 * // class:
 * viewer = createPdfViewer({
 *   page: 1,
 *   zoom: 'fit-width',
 *   onLoaded: (info) => console.log(`${info.numPages} pages`),
 * });
 * pdfUrl = signal<string>('/assets/report.pdf');
 *
 * // template:
 * // <hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" (pageChange)="onPage($event)" />
 *
 * // anywhere:
 * // this.viewer.goToPage(5);
 * // this.viewer.search('quarterly');
 */
@Component({
  selector: 'hk-pdf-viewer',
  imports: [
    NgTemplateOutlet,
    PdfToolbarComponent,
    PdfAnnotationToolbarComponent,
    PdfAnnotationPanelComponent,
    PdfAnnotationDialogsComponent,
    PdfFormDesignToolbarComponent,
    PdfFormFieldPanelComponent,
    PdfSignatureDialogComponent,
    PdfDigitalSignDialogComponent,
    PdfFindBarComponent,
    PdfSidebarComponent,
    PdfPagesComponent,
    PdfPageOrganizerComponent,
    PdfTextEditorComponent,
  ],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: PDF_VIEWER_PROVIDERS,
  host: { class: 'block' },
})
export class PdfViewerComponent extends PdfViewerHostBase {
  private readonly theme = inject(HK_THEME);

  /**
   * The PDF document source. Accepts a URL string, a `Uint8Array` of bytes,
   * or a `Blob` (e.g. from a `<input type="file">`). When this changes the
   * viewer reloads the document.
   */
  readonly src = input.required<PdfDocumentSource>();

  /** The document's file name, for downloads. Default: from the URL or `File`, else `document.pdf`. */
  readonly fileName = input<string | null>(null);

  /** Headline above the page card in `layout: 'preview'`. Ignored in the default layout. Plain text. */
  readonly title = input<string>('');

  /** Subtitle under the title in `layout: 'preview'` (e.g. a section or breadcrumb). Ignored in the default layout. */
  readonly subtitle = input<string>('');

  /** Outer container: theme-bridged card for the default layout, plain stack for preview. */
  readonly containerClass = computed(() => {
    if (this.store.layout() === 'preview') return 'flex flex-col bg-base-100';
    // `h-full` lets the card fill the host (which fills a sized parent).
    return `card ${this.theme.classes.cardBorder} bg-base-100 overflow-hidden flex flex-col h-full`;
  });

  /** Consumer toolbar (`<ng-template hkPdfToolbar>`); replaces the default toolbar when present. */
  readonly customToolbar = contentChild(HkPdfToolbarDirective);

  protected currentSource(): PdfDocumentSource | null {
    return this.src();
  }

  protected currentFileName(): string | null {
    return this.fileName();
  }

  /** Context for a custom toolbar template: runtime state and resolved labels. */
  readonly toolbarContext = computed<HkPdfToolbarContext>(() => ({
    state: this.store.state(),
    labels: this.store.labels(),
  }));
}
