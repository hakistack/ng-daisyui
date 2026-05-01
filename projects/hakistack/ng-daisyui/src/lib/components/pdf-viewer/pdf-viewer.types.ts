import { Signal } from '@angular/core';

/** A PDF document source. The component accepts a URL string, an in-memory byte array, or a Blob. */
export type PdfDocumentSource = string | Uint8Array | Blob;

/** Zoom level. Numbers are absolute scales (1 = 100%); the named values fit-to-page/width or auto-detect. */
export type PdfZoom = number | 'fit-page' | 'fit-width' | 'auto';

/** Display mode. `'continuous'` is Adobe-like vertical scroll; `'single'` is one page at a time. */
export type PdfDisplayMode = 'single' | 'continuous';

/** Sidebar tab. */
export type PdfSidebarTab = 'thumbnails' | 'bookmarks';

/**
 * Configuration passed to `createPdfViewer({...})`. Stable per-instance —
 * volatile state (the document source itself) lives on `<hk-pdf-viewer>`'s
 * `[src]` input so it can react to route changes / file uploads naturally.
 */
export interface PdfViewerConfig {
  /** Initial page number (1-indexed). Default: `1`. */
  readonly page?: number;
  /** Initial zoom level. Default: `'fit-width'`. */
  readonly zoom?: PdfZoom;
  /** Initial display mode. Default: `'continuous'`. */
  readonly mode?: PdfDisplayMode;
  /** Pre-supply a password for encrypted PDFs. If unset and the doc is encrypted, `onPasswordRequired` fires. */
  readonly password?: string;
  /** Render the default toolbar above the canvas. Default: `true`. */
  readonly showToolbar?: boolean;
  /** Render the collapsible sidebar (thumbnails + bookmarks). Default: `true`. */
  readonly showSidebar?: boolean;
  /** Which sidebar tab is active by default. Default: `'thumbnails'`. */
  readonly defaultSidebarTab?: PdfSidebarTab;

  // ── Lifecycle callbacks ──────────────────────────────────────────────────

  /** Fires once the document is parsed and ready to render. */
  readonly onLoaded?: (info: PdfLoadedInfo) => void;
  /** Fires whenever the visible page changes (scroll in continuous mode, click in single mode). */
  readonly onPageChange?: (page: number) => void;
  /** Fires when an error occurs during load or render. */
  readonly onError?: (error: PdfViewerError) => void;
  /**
   * Fires when the document is encrypted and no password was pre-supplied (or it was wrong).
   * The callback receives a function to call with the password the user entered.
   */
  readonly onPasswordRequired?: (callback: (password: string) => void) => void;

  /** @internal Trigger signal for external state mutations. */
  readonly _stateTrigger?: Signal<number>;
}

/** Payload of the `onLoaded` callback. */
export interface PdfLoadedInfo {
  /** Total number of pages in the document. */
  readonly numPages: number;
  /** PDF metadata title (from the document's `/Title` info dict). May be empty. */
  readonly title: string;
  /** PDF.js fingerprint — stable identifier for the document instance. */
  readonly fingerprint: string;
  /** Document size in bytes, when known. */
  readonly fileSize?: number;
}

/** Error payload emitted via `onError`. */
export interface PdfViewerError {
  readonly code: 'load_failed' | 'invalid_pdf' | 'password_cancelled' | 'render_failed' | 'unknown';
  readonly message: string;
  /** Whether the consumer can recover by retrying (e.g. password prompt cancelled — they can retry). */
  readonly recoverable: boolean;
  /** Original error, when available. */
  readonly cause?: unknown;
}

/** Reactive runtime state exposed by the controller. */
export interface PdfViewerState {
  /** Current visible page (1-indexed). 0 when no document is loaded. */
  readonly page: number;
  /** Total pages. 0 when no document is loaded. */
  readonly numPages: number;
  /** Current zoom level (resolved, not symbolic — `'fit-width'` resolves to its computed scale). */
  readonly zoom: number;
  /** Current zoom mode — preserved for UI display (so toolbar can show "Fit Width" instead of "115%"). */
  readonly zoomMode: PdfZoom;
  /** Current display mode. */
  readonly mode: PdfDisplayMode;
  /** Whether the document has finished loading. */
  readonly loaded: boolean;
  /** Whether an error is currently active. */
  readonly error: PdfViewerError | null;

  // Search state
  /** Total matches for the active search query, or 0 if no search is running. */
  readonly searchMatches: number;
  /** Index of the currently-focused match (0-indexed), or -1 if no search is running. */
  readonly currentMatchIndex: number;
  /** Active search query, or empty if no search is running. */
  readonly searchQuery: string;

  // UI state
  /** Whether the sidebar is currently open. */
  readonly sidebarOpen: boolean;
  /** Currently-active sidebar tab. */
  readonly sidebarTab: PdfSidebarTab;
}

/** Result of a search() call. */
export interface PdfSearchResult {
  readonly totalMatches: number;
  readonly query: string;
}

/**
 * Imperative controller returned by `createPdfViewer()`. Pass `controller.config()`
 * to `<hk-pdf-viewer [config]="..." />` and call methods directly from your
 * component class — no `@ViewChild` needed.
 */
export interface PdfViewerController {
  /** Reactive view of the merged config (defaults applied). */
  readonly config: Signal<PdfViewerConfig>;
  /** Reactive runtime state — page, zoom, loaded status, search progress, etc. */
  readonly state: Signal<PdfViewerState>;

  // ── Navigation ───────────────────────────────────────────────────────────

  /** Jump to a specific page (1-indexed). Clamped to valid range. */
  goToPage(page: number): void;
  /** Advance one page. No-op at last page. */
  nextPage(): void;
  /** Go back one page. No-op at first page. */
  previousPage(): void;
  /** Jump to page 1. */
  firstPage(): void;
  /** Jump to the last page. */
  lastPage(): void;

  // ── Zoom ─────────────────────────────────────────────────────────────────

  /** Set zoom directly. Numeric values are absolute scales (1 = 100%); named values are responsive. */
  setZoom(zoom: PdfZoom): void;
  /** Increase zoom by one step (default: 25%). */
  zoomIn(): void;
  /** Decrease zoom by one step (default: 25%). */
  zoomOut(): void;
  /** Reset to the configured initial zoom. */
  resetZoom(): void;

  // ── Display ──────────────────────────────────────────────────────────────

  /** Switch between single-page and continuous-scroll modes. */
  setMode(mode: PdfDisplayMode): void;
  /** Toggle the sidebar open/closed. */
  toggleSidebar(): void;
  /** Toggle browser fullscreen via the Fullscreen API. */
  toggleFullscreen(): void;

  // ── Search ───────────────────────────────────────────────────────────────

  /** Run a find-in-document search. Resolves with the total match count. */
  search(query: string): Promise<PdfSearchResult>;
  /** Move focus to the next match. No-op if no search is active. */
  nextMatch(): void;
  /** Move focus to the previous match. No-op if no search is active. */
  previousMatch(): void;
  /** Clear the active search and remove highlighted matches. */
  clearSearch(): void;

  // ── Document operations ──────────────────────────────────────────────────

  /** Open the browser print dialog for the current document. */
  print(): void;
  /** Trigger a browser download of the current document. */
  download(filename?: string): void;
  /** Reload the current document. */
  reload(): void;
}
