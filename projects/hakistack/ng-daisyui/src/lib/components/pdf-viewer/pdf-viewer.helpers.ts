import { computed, signal } from '@angular/core';
import {
  PdfDisplayMode,
  PdfSearchResult,
  PdfSidebarTab,
  PdfViewerConfig,
  PdfViewerController,
  PdfViewerInternalApi,
  PdfViewerInternalHandlers,
  PdfViewerState,
  PdfZoom,
} from './pdf-viewer.types';

const DEFAULT_PAGE = 1;
const DEFAULT_ZOOM: PdfZoom = 'fit-width';
const DEFAULT_MODE: PdfDisplayMode = 'continuous';
const DEFAULT_SIDEBAR_TAB: PdfSidebarTab = 'thumbnails';
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;

/**
 * Create a `PdfViewerController` for `<hk-pdf-viewer>`.
 *
 * Returns a controller with a config signal (pass to `[config]` on the
 * component) plus imperative methods for navigation, zoom, search, print,
 * and download. Stable per-instance configuration goes here; the document
 * source itself stays on the component's `[src]` input because it's the most
 * volatile value (often driven by routes / uploads / list selection).
 *
 * @example Basic usage
 * viewer = createPdfViewer({
 *   page: 1,
 *   zoom: 'fit-width',
 *   onLoaded: (info) => console.log(`${info.numPages} pages`),
 * });
 *
 * pdfUrl = signal<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
 *
 * // template:
 * // <hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />
 *
 * // anywhere in your component class:
 * this.viewer.goToPage(5);
 * this.viewer.search('quarterly');
 *
 * @example With password and continuous-mode override
 * viewer = createPdfViewer({
 *   mode: 'single',
 *   password: 'sesame',
 *   onPasswordRequired: (cb) => cb(prompt('Password?') ?? ''),
 *   onError: (e) => this.toast.error(e.message),
 * });
 */
export function createPdfViewer(input: PdfViewerConfig = {}): PdfViewerController {
  const layout = input.layout ?? 'default';
  // Preview layout's idiomatic defaults: single-page focus + fit-page so the
  // whole page is visible inside its card. Caller can still override either.
  const initialZoom = input.zoom ?? (layout === 'preview' ? 'fit-page' : DEFAULT_ZOOM);
  const initialMode = input.mode ?? (layout === 'preview' ? 'single' : DEFAULT_MODE);
  const initialSidebarOpen = input.showSidebar ?? true;
  const initialSidebarTab = input.defaultSidebarTab ?? DEFAULT_SIDEBAR_TAB;

  // Writable state lives in this closure. The component reads/writes it via
  // the internal API; the controller exposes it read-only via state.asReadonly().
  const state = signal<PdfViewerState>({
    page: 0,
    numPages: 0,
    zoom: 1,
    zoomMode: initialZoom,
    mode: initialMode,
    loaded: false,
    error: null,
    searchMatches: 0,
    currentMatchIndex: -1,
    searchQuery: '',
    searchCaseSensitive: false,
    searchWholeWord: false,
    sidebarOpen: initialSidebarOpen,
    sidebarTab: initialSidebarTab,
  });

  // Handler bag. Component fills this in on init via internal.bind(); until
  // then, every imperative method is a no-op so calls before mount don't crash.
  let handlers: PdfViewerInternalHandlers = {};

  const internal: PdfViewerInternalApi = {
    state,
    bind(next) {
      handlers = next;
      return () => {
        handlers = {};
      };
    },
  };

  // Public config signal. The user's options ride alongside the hidden
  // _internal channel so the component (which only sees [config]) can
  // reach back to the controller.
  const config = computed<PdfViewerConfig>(() => ({
    page: input.page ?? DEFAULT_PAGE,
    zoom: initialZoom,
    mode: initialMode,
    layout,
    password: input.password ?? '',
    // Preview layout hides the toolbar by default (the bottom prev/next/download
    // is the primary chrome). Caller can opt back in with `showToolbar: true`.
    showToolbar: input.showToolbar ?? layout !== 'preview',
    showSidebar: input.showSidebar ?? true,
    defaultSidebarTab: input.defaultSidebarTab ?? DEFAULT_SIDEBAR_TAB,
    workerSrc: input.workerSrc,
    onLoaded: input.onLoaded,
    onPageChange: input.onPageChange,
    onError: input.onError,
    onPasswordRequired: input.onPasswordRequired,
    _internal: internal,
  }));

  const clampPage = (p: number): number => {
    const total = state().numPages;
    if (total <= 0) return 0;
    return Math.max(1, Math.min(total, Math.floor(p)));
  };

  // Imperative methods delegate to the component-registered handlers.
  // We compute targets here (e.g. nextPage = current + 1) so the component
  // only has to implement the primitive ops (goToPage, setZoom, setMode).
  const controller: PdfViewerController = {
    config,
    state: state.asReadonly(),

    goToPage: (page) => handlers.goToPage?.(clampPage(page)),
    nextPage: () => handlers.goToPage?.(clampPage(state().page + 1)),
    previousPage: () => handlers.goToPage?.(clampPage(state().page - 1)),
    firstPage: () => handlers.goToPage?.(clampPage(1)),
    lastPage: () => handlers.goToPage?.(clampPage(state().numPages)),

    setZoom: (zoom) => handlers.setZoom?.(zoom),
    zoomIn: () => handlers.setZoom?.(nextZoomStep(state().zoom)),
    zoomOut: () => handlers.setZoom?.(previousZoomStep(state().zoom)),
    resetZoom: () => handlers.setZoom?.(initialZoom),

    setMode: (mode) => handlers.setMode?.(mode),
    toggleSidebar: () => handlers.toggleSidebar?.(),
    toggleFullscreen: () => handlers.toggleFullscreen?.(),

    search: (query) => handlers.search?.(query) ?? Promise.resolve({ totalMatches: 0, query }),
    nextMatch: () => handlers.nextMatch?.(),
    previousMatch: () => handlers.previousMatch?.(),
    clearSearch: () => handlers.clearSearch?.(),

    print: () => handlers.print?.(),
    download: (filename) => handlers.download?.(filename),
    reload: () => handlers.reload?.(),

    save: () => handlers.save?.() ?? Promise.reject(new Error('Viewer not mounted')),
    saveAndDownload: (filename) => handlers.saveAndDownload?.(filename) ?? Promise.reject(new Error('Viewer not mounted')),
  };

  return controller;
}

/** Internal: clamp a zoom step within [ZOOM_MIN, ZOOM_MAX] bounds. */
export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

/** Internal: bump zoom up one step. */
export function nextZoomStep(zoom: number): number {
  return clampZoom(zoom + ZOOM_STEP);
}

/** Internal: bump zoom down one step. */
export function previousZoomStep(zoom: number): number {
  return clampZoom(zoom - ZOOM_STEP);
}
