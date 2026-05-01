import { computed, signal } from '@angular/core';
import {
  PdfDisplayMode,
  PdfSearchResult,
  PdfSidebarTab,
  PdfViewerConfig,
  PdfViewerController,
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
 * pdfUrl = signal<string>('document.pdf');
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
  // Merged config — defaults applied for the public-facing config signal.
  const config = computed<PdfViewerConfig>(() => ({
    page: input.page ?? DEFAULT_PAGE,
    zoom: input.zoom ?? DEFAULT_ZOOM,
    mode: input.mode ?? DEFAULT_MODE,
    password: input.password ?? '',
    showToolbar: input.showToolbar ?? true,
    showSidebar: input.showSidebar ?? true,
    defaultSidebarTab: input.defaultSidebarTab ?? DEFAULT_SIDEBAR_TAB,
    workerSrc: input.workerSrc,
    onLoaded: input.onLoaded,
    onPageChange: input.onPageChange,
    onError: input.onError,
    onPasswordRequired: input.onPasswordRequired,
  }));

  // Runtime state. The component will write to this via an internal contract;
  // consumers read it via controller.state(). Exposed as a writable signal
  // here, narrowed to a read-only Signal in the public type.
  const state = signal<PdfViewerState>({
    page: 0,
    numPages: 0,
    zoom: 1,
    zoomMode: input.zoom ?? DEFAULT_ZOOM,
    mode: input.mode ?? DEFAULT_MODE,
    loaded: false,
    error: null,
    searchMatches: 0,
    currentMatchIndex: -1,
    searchQuery: '',
    sidebarOpen: input.showSidebar ?? true,
    sidebarTab: input.defaultSidebarTab ?? DEFAULT_SIDEBAR_TAB,
  });

  const noop = () => {
    /* TODO Phase 1: wire to component. Stub during scaffolding. */
  };

  const noopAsync = (): Promise<PdfSearchResult> => {
    return Promise.resolve({ totalMatches: 0, query: '' });
  };

  // The controller. All imperative methods are no-ops until the component
  // is wired up in the next commit (basic rendering). Keeping them on the
  // surface now so the public API is stable from day one.
  const controller: PdfViewerController = {
    config,
    state: state.asReadonly(),

    // Navigation
    goToPage: noop,
    nextPage: noop,
    previousPage: noop,
    firstPage: noop,
    lastPage: noop,

    // Zoom
    setZoom: noop,
    zoomIn: noop,
    zoomOut: noop,
    resetZoom: noop,

    // Display
    setMode: noop,
    toggleSidebar: noop,
    toggleFullscreen: noop,

    // Search
    search: noopAsync,
    nextMatch: noop,
    previousMatch: noop,
    clearSearch: noop,

    // Document operations
    print: noop,
    download: noop,
    reload: noop,
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
