import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { HK_THEME } from '../../theme/theme.config';
import { HkPdfToolbarContext, HkPdfToolbarDirective } from './pdf-viewer.directives';
import { INTERACTIVE_SELECTOR } from './pdf-viewer.helpers';
import { PdfDocumentSource, PdfLoadedInfo, PdfViewerConfig, PdfViewerError, PdfViewerInternalApi } from './pdf-viewer.types';
import { PdfAnnotationToolsService } from './services/pdf-annotation-tools.service';
import { PdfDocumentService } from './services/pdf-document.service';
import { PdfFindService } from './services/pdf-find.service';
import { PdfFormsService } from './services/pdf-forms.service';
import { PdfLayersService } from './services/pdf-layers.service';
import { PdfPageDataService } from './services/pdf-page-data.service';
import { PdfThumbnailsService } from './services/pdf-thumbnails.service';
import { PdfViewerStore, providePdfBitmapCache } from './services/pdf-viewer.store';
import { PdfViewportService } from './services/pdf-viewport.service';
import { PdfFindBarComponent } from './ui/pdf-find-bar.component';
import { PdfPagesComponent } from './ui/pdf-pages.component';
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
 * work in per-viewer services (`services/`), and the chrome in `ui/`.
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
  imports: [NgTemplateOutlet, PdfToolbarComponent, PdfFindBarComponent, PdfSidebarComponent, PdfPagesComponent, PdfTextEditorComponent],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    PdfViewerStore,
    providePdfBitmapCache(),
    PdfPageDataService,
    PdfViewportService,
    PdfLayersService,
    PdfFormsService,
    PdfFindService,
    PdfThumbnailsService,
    PdfAnnotationToolsService,
    PdfDocumentService,
  ],
  host: {
    class: 'block',
    // Focusable so keyboard shortcuts work after a single click on the chrome,
    // without making each page wrapper tabbable.
    tabindex: '0',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class PdfViewerComponent implements OnInit {
  private readonly theme = inject(HK_THEME);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  private readonly find = inject(PdfFindService);
  private readonly tools = inject(PdfAnnotationToolsService);

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

  /** Headline above the page card in `layout: 'preview'`. Ignored in the default layout. Plain text. */
  readonly title = input<string>('');

  /** Subtitle under the title in `layout: 'preview'` (e.g. a section or breadcrumb). Ignored in the default layout. */
  readonly subtitle = input<string>('');

  /**
   * Two-way binding for the document's form-field values. Use as
   * `[(formValues)]="myValues"` to keep an Angular signal / property in
   * sync with the PDF's interactive form fields. Keys are PDF field names;
   * values are the field's current value (string / boolean / number
   * depending on widget type).
   *
   * Flow:
   * - The bound value is written into the PDFium document after each load
   *   (and whenever the binding changes), so re-mounting a viewer with
   *   pre-filled state immediately shows those values in the form widgets.
   *   A radio group's value is the export value of its selected option.
   * - When the user edits a widget, the new value flows back through the
   *   binding so consumer code can persist or display it.
   * - `controller.save()`, `saveAndDownload()` and the toolbar's Download
   *   return the document with the current values baked in.
   *
   * Empty object by default — non-form PDFs ignore this binding entirely.
   */
  readonly formValues = model<Record<string, unknown>>({});

  /** The document is parsed and ready (same payload as `config.onLoaded`). */
  readonly loaded = output<PdfLoadedInfo>();
  /** The current page changed (same as `config.onPageChange`). */
  readonly pageChange = output<number>();
  /** A load failure, or a non-fatal operation failure (same as `config.onError`). */
  readonly viewerError = output<PdfViewerError>();
  /** The document gained or lost unsaved edits (forms, annotations, page structure). */
  readonly dirtyChange = output<boolean>();
  /** The page count changed through a page insert or delete. */
  readonly pagesChange = output<number>();

  /** Outer container: theme-bridged card for the default layout, plain stack for preview. */
  readonly containerClass = computed(() => {
    if (this.store.layout() === 'preview') return 'flex flex-col bg-base-100';
    // `h-full` lets the card fill the host (which fills a sized parent).
    return `card ${this.theme.classes.cardBorder} bg-base-100 overflow-hidden flex flex-col h-full`;
  });

  /** Consumer toolbar (`<ng-template hkPdfToolbar>`); replaces the default toolbar when present. */
  readonly customToolbar = contentChild(HkPdfToolbarDirective);

  /** Context for a custom toolbar template: runtime state and resolved labels. */
  readonly toolbarContext = computed<HkPdfToolbarContext>(() => ({
    state: this.store.state(),
    labels: this.store.labels(),
  }));

  private unbindController: (() => void) | null = null;

  constructor() {
    this.store.connect({
      src: this.src,
      config: this.config,
      formValues: this.formValues,
      element: inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      events: {
        loaded: (info) => this.loaded.emit(info),
        pageChange: (page) => this.pageChange.emit(page),
        error: (error) => this.viewerError.emit(error),
        dirtyChange: (dirty) => this.dirtyChange.emit(dirty),
        pagesChange: (numPages) => this.pagesChange.emit(numPages),
      },
    });

    // Bind controller handlers when a controller's config arrives. The internal
    // bridge is stable per controller, so this binds once per controller.
    effect(() => {
      const internal = this.config()._internal;
      if (!internal || internal === this.store.internal) return;
      untracked(() => this.attachController(internal));
    });

    inject(DestroyRef).onDestroy(() => {
      this.unbindController?.();
      this.unbindController = null;
    });
  }

  ngOnInit(): void {
    // Warm the engine (lazy worker + wasm) so it's ready when [src] resolves.
    if (isPlatformBrowser(this.platformId)) this.store.ensureEngine();
  }

  private attachController(internal: PdfViewerInternalApi): void {
    this.unbindController?.();
    this.store.internal = internal;
    const { viewport, document: doc, find, tools, store } = this;
    this.unbindController = internal.bind({
      goToPage: (page) => viewport.goToPage(page),
      nextPage: () => viewport.nextPage(),
      previousPage: () => viewport.previousPage(),
      setZoom: (zoom) => viewport.setZoom(zoom),
      setMode: (mode) => viewport.setMode(mode),
      toggleSidebar: () => store.patchState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen })),
      toggleFullscreen: () => void doc.toggleFullscreen(),
      search: (query) => find.run(query),
      nextMatch: () => find.next(),
      previousMatch: () => find.previous(),
      clearSearch: () => find.clear(),
      print: () => void doc.print(),
      download: (filename) => void doc.download(filename),
      reload: () => doc.reload(),
      save: () => doc.save(),
      saveAndDownload: (filename) => doc.saveAndDownload(filename),
      exportPageAsImage: (options) => doc.exportPageAsImage(options),
      exportText: (filename) => doc.exportText(filename),
      setAnnotationTool: (tool) => tools.setTool(tool),
      setAnnotationColor: (color) => tools.setColor(color),
      deletePage: (pageNumber) => doc.deletePage(pageNumber),
      insertBlankPage: (atPageNumber) => doc.insertBlankPage(atPageNumber),
      rotatePage: (pageNumber, delta) => doc.rotatePage(pageNumber, delta),
    });
  }

  /**
   * Reader shortcuts while the viewer (or its chrome) has focus. Keys typed
   * into inputs, selects and editable content are left alone.
   *
   * - PageUp / ArrowLeft → previous page; PageDown / ArrowRight / Space → next page
   * - Home / End → first / last page
   * - ⌘/Ctrl + `+` / `=` → zoom in; ⌘/Ctrl + `-` → zoom out; ⌘/Ctrl + 0 → reset zoom
   * - ⌘/Ctrl + F → open the find bar; Escape → close it
   */
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const inEditable = tag === 'input' || tag === 'select' || tag === 'textarea' || target?.isContentEditable;
    const key = event.key;

    // Escape closes the find bar from anywhere in the viewer (its input handles its own Escape too).
    if (key === 'Escape' && this.store.findBarOpen()) {
      event.preventDefault();
      this.find.closeBar();
      return;
    }
    if (inEditable) return;

    if (!(event.metaKey || event.ctrlKey)) {
      // Space/arrows/Home/End belong to a focused button, link, tab, menu item,
      // etc. Only PageUp/PageDown page the document from anywhere in the viewer.
      if (key !== 'PageUp' && key !== 'PageDown' && target?.closest(INTERACTIVE_SELECTOR)) return;
      const action: Record<string, () => void> = {
        PageUp: () => this.viewport.previousPage(),
        ArrowLeft: () => this.viewport.previousPage(),
        PageDown: () => this.viewport.nextPage(),
        ArrowRight: () => this.viewport.nextPage(),
        ' ': () => this.viewport.nextPage(), // space-bar paging is a long-standing reader convention
        Home: () => this.viewport.firstPage(),
        End: () => this.viewport.lastPage(),
      };
      const run = action[key];
      if (run) {
        event.preventDefault();
        run();
      }
      return;
    }

    const shortcut: Record<string, () => void> = {
      '+': () => this.viewport.zoomIn(),
      '=': () => this.viewport.zoomIn(),
      '-': () => this.viewport.zoomOut(),
      _: () => this.viewport.zoomOut(),
      '0': () => this.viewport.resetZoom(),
      f: () => this.find.openBar(),
      F: () => this.find.openBar(),
    };
    const run = shortcut[key];
    if (run) {
      event.preventDefault();
      run();
    }
  }
}
