import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  Provider,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { INTERACTIVE_SELECTOR } from './pdf-viewer.helpers';
import { PdfDocumentSource, PdfLoadedInfo, PdfViewerConfig, PdfViewerError, PdfViewerInternalApi } from './pdf-viewer.types';
import { PdfAnnotationDialogsService } from './services/pdf-annotation-dialogs.service';
import { PdfAnnotationToolsService } from './services/pdf-annotation-tools.service';
import { ANNOTATION_CLIPBOARD_TYPE, PdfAnnotationsService } from './services/pdf-annotations.service';
import { PdfDocumentService } from './services/pdf-document.service';
import { PdfFindService } from './services/pdf-find.service';
import { PdfFormDesignerService } from './services/pdf-form-designer.service';
import { PdfFormsService } from './services/pdf-forms.service';
import { PdfLayersService } from './services/pdf-layers.service';
import { PdfPageDataService } from './services/pdf-page-data.service';
import { PdfPagesService } from './services/pdf-pages.service';
import { PdfRasterHiddenService } from './services/pdf-raster-hidden.service';
import { PdfSignaturesService } from './services/pdf-signatures.service';
import { PdfThumbnailsService } from './services/pdf-thumbnails.service';
import { PdfViewerStore, providePdfBitmapCache } from './services/pdf-viewer.store';
import { PdfViewportService } from './services/pdf-viewport.service';

/** The per-viewer services. Every host component (`hk-pdf-viewer`, `hk-pdf-workspace`) provides its own set. */
export const PDF_VIEWER_PROVIDERS: Provider[] = [
  PdfViewerStore,
  providePdfBitmapCache(),
  PdfPageDataService,
  PdfViewportService,
  PdfLayersService,
  PdfFormsService,
  PdfFormDesignerService,
  PdfSignaturesService,
  PdfFindService,
  PdfThumbnailsService,
  PdfRasterHiddenService,
  PdfAnnotationsService,
  PdfAnnotationDialogsService,
  PdfAnnotationToolsService,
  PdfPagesService,
  PdfDocumentService,
];

/**
 * What every PDF viewer host shares, whatever its chrome: the inputs and
 * outputs, the store connection, the controller binding, the reader keyboard
 * shortcuts and annotation copy / paste. `hk-pdf-viewer` and
 * `hk-pdf-workspace` extend it (and provide {@link PDF_VIEWER_PROVIDERS}), so
 * their API is the same by construction.
 */
@Directive({
  host: {
    // Focusable so keyboard shortcuts work after a single click on the chrome,
    // without making each page wrapper tabbable.
    tabindex: '0',
    '(keydown)': 'onKeyDown($event)',
    '(copy)': 'onClipboard($event, false)',
    '(cut)': 'onClipboard($event, true)',
    '(paste)': 'onPaste($event)',
  },
})
export abstract class PdfViewerHostBase implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly store = inject(PdfViewerStore);
  protected readonly viewport = inject(PdfViewportService);
  protected readonly document = inject(PdfDocumentService);
  protected readonly find = inject(PdfFindService);
  protected readonly tools = inject(PdfAnnotationToolsService);
  protected readonly annotations = inject(PdfAnnotationsService);
  protected readonly forms = inject(PdfFormsService);
  protected readonly signatures = inject(PdfSignaturesService);
  protected readonly pages = inject(PdfPagesService);
  protected readonly designer = inject(PdfFormDesignerService);

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

  /** The document's file name, for downloads and the workspace badge. Default: from the URL or `File`, else `document.pdf`. */
  readonly fileName = input<string | null>(null);

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

  private unbindController: (() => void) | null = null;

  constructor() {
    this.store.connect({
      src: this.src,
      config: this.config,
      formValues: this.formValues,
      fileName: this.fileName,
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

  /** The chrome's answer to `controller.toggleSidebar()` (the workspace toggles its rail). */
  protected toggleSidebar(): void {
    this.store.patchState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  }

  /** The chrome's answer to `controller.organizePages()` (the workspace shows its page grid). */
  protected organizePages(): void {
    this.pages.organizerOpen.set(this.pages.canOrganize());
  }

  private attachController(internal: PdfViewerInternalApi): void {
    this.unbindController?.();
    this.store.internal = internal;
    const { viewport, document: doc, find, tools, annotations, forms, signatures, pages } = this;
    this.unbindController = internal.bind({
      goToPage: (page) => viewport.goToPage(page),
      nextPage: () => viewport.nextPage(),
      previousPage: () => viewport.previousPage(),
      setZoom: (zoom) => viewport.setZoom(zoom),
      setMode: (mode) => viewport.setMode(mode),
      toggleSidebar: () => this.toggleSidebar(),
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
      getAnnotations: () => annotations.list(),
      addAnnotation: (annotation) => annotations.add(annotation),
      updateAnnotation: (id, changes) => annotations.update(id, changes),
      deleteAnnotation: (id) => annotations.remove(id),
      selectAnnotation: (id) => annotations.select(id, true),
      undo: () => annotations.undo(),
      redo: () => annotations.redo(),
      exportAnnotations: (format) => (format === 'xfdf' ? annotations.exportXfdf() : annotations.exportJson()),
      importAnnotations: (data) => annotations.importAnnotations(data),
      setMeasureScale: (scale) => annotations.scale.set(scale),
      resetForm: () => forms.resetForm(),
      exportFormData: (format) => forms.exportData(format),
      importFormData: (data) => forms.importData(data),
      deletePage: (pageNumber) => doc.deletePage(pageNumber),
      insertBlankPage: (atPageNumber) => doc.insertBlankPage(atPageNumber),
      rotatePage: (pageNumber, delta) => doc.rotatePage(pageNumber, delta),
      rotatePages: (pageNumbers, delta) => pages.rotate(pageNumbers, delta),
      deletePages: (pageNumbers) => pages.delete(pageNumbers),
      duplicatePages: (pageNumbers) => pages.duplicate(pageNumbers),
      movePages: (pageNumbers, to) => pages.move(pageNumbers, to),
      importPages: (source, options) => pages.import(source, options),
      extractPages: (pageNumbers) => doc.extractPages(pageNumbers),
      organizePages: () => this.organizePages(),
      getSignatures: () => signatures.digital() ?? [],
      signDigitally: (options) => doc.signDigitally(options),
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
   * - ⌘/Ctrl + Z → undo; ⇧⌘/Ctrl + Z or Ctrl + Y → redo (annotation edits)
   * - While drawing: Enter finishes a polygon, Backspace drops its last vertex,
   *   Escape cancels; otherwise Escape leaves the active tool, then the selection
   * - Delete / Backspace → delete the selected annotation
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
    if (this.onAnnotationKey(event)) {
      event.preventDefault();
      return;
    }

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

  /**
   * Copy / cut the selected annotation (when no text is selected and focus
   * isn't in a field): as our clipboard format, readable by another viewer,
   * plus its comment as plain text.
   */
  onClipboard(event: ClipboardEvent, cut: boolean): void {
    const id = this.annotations.selectedId();
    if (!id || this.isEditableTarget(event.target) || this.hasTextSelection()) return;
    const data = this.annotations.copy([id]);
    event.clipboardData?.setData(ANNOTATION_CLIPBOARD_TYPE, data);
    event.clipboardData?.setData('text/plain', this.annotations.copyText());
    event.preventDefault();
    if (cut) void this.annotations.remove(id);
  }

  /** Paste annotations (ours, from this or another viewer) onto the current page. */
  onPaste(event: ClipboardEvent): void {
    if (this.isEditableTarget(event.target)) return;
    // Browsers that drop custom clipboard types still carry our plain text: then paste the last copy.
    const data =
      event.clipboardData?.getData(ANNOTATION_CLIPBOARD_TYPE) ||
      (this.annotations.isLastCopy(event.clipboardData?.getData('text/plain') ?? null) ? this.annotations.lastCopy() : null);
    if (!data) return;
    event.preventDefault();
    void this.annotations.paste(data, (this.store.state()?.page ?? 1) - 1);
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    const tag = el?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el?.isContentEditable;
  }

  private hasTextSelection(): boolean {
    const sel = this.store.element.ownerDocument.getSelection();
    return !!sel && !sel.isCollapsed && sel.toString().length > 0;
  }

  /** Annotation shortcuts (see {@link onKeyDown}); in design mode, the form designer's. Returns true when the key was handled. */
  private onAnnotationKey(event: KeyboardEvent): boolean {
    const key = event.key;
    const mod = event.metaKey || event.ctrlKey;
    if (this.designer.active()) {
      if (mod && (key === 'z' || key === 'Z')) {
        void (event.shiftKey ? this.designer.redo() : this.designer.undo());
        return true;
      }
      if (mod && (key === 'y' || key === 'Y')) {
        void this.designer.redo();
        return true;
      }
      if (key === 'Escape') {
        if (this.designer.tool()) this.designer.tool.set(null);
        else this.designer.selection.set(null);
        return true;
      }
      const sel = this.designer.selection();
      if ((key === 'Delete' || key === 'Backspace') && sel && !(event.target as HTMLElement | null)?.closest?.(INTERACTIVE_SELECTOR)) {
        void this.designer.remove(sel.field, sel.widget);
        return true;
      }
      return false;
    }
    if (mod && (key === 'z' || key === 'Z')) {
      void (event.shiftKey ? this.annotations.redo() : this.annotations.undo());
      return true;
    }
    if (mod && (key === 'y' || key === 'Y')) {
      void this.annotations.redo();
      return true;
    }
    if (mod) return false;
    if (this.tools.onKeydown(event)) return true;
    if (key === 'Escape' && this.store.annotationTool() !== 'none') {
      this.tools.setTool('none');
      return true;
    }
    const selected = this.annotations.selectedId();
    if (key === 'Escape' && selected) {
      this.annotations.select(null);
      return true;
    }
    // Not while a button, link or field has focus (the annotation's own hit target handles its keys).
    if ((key === 'Delete' || key === 'Backspace') && selected && !(event.target as HTMLElement | null)?.closest?.(INTERACTIVE_SELECTOR)) {
      void this.annotations.remove(selected);
      return true;
    }
    return false;
  }
}
