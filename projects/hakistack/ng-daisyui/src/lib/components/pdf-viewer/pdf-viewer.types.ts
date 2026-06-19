import { Signal, WritableSignal } from '@angular/core';

/** A PDF document source. The component accepts a URL string, an in-memory byte array, or a Blob. */
export type PdfDocumentSource = string | Uint8Array | Blob;

/** Zoom level. Numbers are absolute scales (1 = 100%); the named values fit-to-page/width or auto-detect. */
export type PdfZoom = number | 'fit-page' | 'fit-width' | 'auto';

/** Display mode. `'continuous'` is Adobe-like vertical scroll; `'single'` is one page at a time. */
export type PdfDisplayMode = 'single' | 'continuous';

/**
 * Sidebar tab. `thumbnails` (page previews) and `bookmarks` (PDF outline)
 * are always available. `attachments` (embedded files) and `annotations`
 * (highlight / comment / freetext list) populate from the document at load
 * time and show an empty state when the document has neither.
 */
export type PdfSidebarTab = 'thumbnails' | 'bookmarks' | 'attachments' | 'annotations';

/**
 * Lightweight view-model for a PDF annotation — what the sidebar's
 * Annotations tab needs to list it. The component scans every page's
 * `getAnnotations()` once at document load and projects the subset of
 * annotation types that are user-meaningful (highlights, comments,
 * free-text, ink). Read-only at this layer; annotation *editing* is a
 * future phase.
 */
export interface PdfAnnotationEntry {
  /** 1-indexed page the annotation lives on — click navigates here. */
  readonly pageNumber: number;
  /** PDF annotation subtype: `'Text'`, `'Highlight'`, `'FreeText'`, `'Ink'`, etc. */
  readonly subtype: string;
  /** User-authored text (comment body) when available. Empty for ink / shapes. */
  readonly contents: string;
  /** Document author of the annotation when available. */
  readonly author: string;
}

/**
 * Lightweight view-model for a PDF embedded file (attachment). Populated
 * from `pdfDoc.getAttachments()` at document load.
 */
export interface PdfAttachmentEntry {
  readonly filename: string;
  readonly description: string;
  /** Raw bytes — provided so the sidebar can offer "download" without re-fetching. */
  readonly content: Uint8Array;
}

/**
 * Visual chrome variant. `'default'` is the full reader (top toolbar with
 * page input, zoom, mode, download/print/fullscreen). `'preview'` is a
 * single-page document-preview layout — no toolbar, just a centered page
 * card with prev/next + download buttons underneath. Use preview when the
 * viewer is embedded in a flow where the surrounding UI already provides
 * navigation context (signing flows, document approval, file previews).
 */
export type PdfViewerLayout = 'default' | 'preview';

/**
 * Configuration passed to `createPdfViewer({...})`. Stable per-instance —
 * volatile state (the document source itself) lives on `<hk-pdf-viewer>`'s
 * `[src]` input so it can react to route changes / file uploads naturally.
 */
export interface PdfViewerConfig {
  /** Initial page number (1-indexed). Default: `1`. */
  readonly page?: number;
  /** Initial zoom level. Default: `'fit-width'` (`'fit-page'` when `layout` is `'preview'`). */
  readonly zoom?: PdfZoom;
  /** Initial display mode. Default: `'continuous'` (`'single'` when `layout` is `'preview'`). */
  readonly mode?: PdfDisplayMode;
  /**
   * Visual chrome variant. Default `'default'`. Use `'preview'` for a
   * minimal single-page-with-prev/next/download layout — useful when the
   * viewer is embedded in a flow that provides its own context.
   */
  readonly layout?: PdfViewerLayout;
  /** Pre-supply a password for encrypted PDFs. If unset and the doc is encrypted, `onPasswordRequired` fires. */
  readonly password?: string;
  /** Render the default toolbar above the canvas. Default: `true`. */
  readonly showToolbar?: boolean;
  /** Render the collapsible sidebar (thumbnails + bookmarks). Default: `true`. */
  readonly showSidebar?: boolean;
  /** Which sidebar tab is active by default. Default: `'thumbnails'`. */
  readonly defaultSidebarTab?: PdfSidebarTab;

  /**
   * Override the PDF.js worker URL. By default the lib **inlines** the worker
   * source into its own JS bundle and creates a Blob URL at runtime —
   * consumers don't have to configure anything.
   *
   * Set this only if your CSP forbids `worker-src 'blob:'`, or if you want
   * to share a single worker URL across multiple viewers / serve from a CDN.
   *
   * @example workerSrc: '/assets/pdfjs/pdf.worker.min.mjs'
   */
  readonly workerSrc?: string;

  /**
   * Number of off-main-thread render workers. **Defaults to `0` (main-thread
   * rendering).**
   *
   * ⚠️ Experimental: pdf.js rasterizes text using the main-thread document's
   * font machinery, which isn't available inside a Web Worker — so off-thread
   * rendering (`> 0`) currently draws glyphs as `.notdef` boxes. Left here for
   * experimentation; true off-thread raster needs a self-rasterizing engine
   * (pdfium/Rust). Also requires {@link renderWorkerSrc} + `OffscreenCanvas`.
   * Clamped to 1–4; falls back to main thread if the worker can't load.
   */
  readonly renderPoolSize?: number;

  /**
   * URL of the bundled render worker asset shipped with the library
   * (`@hakistack/ng-daisyui/workers/pdf-render.worker.mjs`). ng-packagr can't
   * bundle workers, so the library can't auto-resolve it — provide it per
   * instance or app-wide via `provideHkPdfDefaults`. Without it, rendering
   * stays on the main thread.
   *
   * @example
   *   renderWorkerSrc: new URL('@hakistack/ng-daisyui/workers/pdf-render.worker.mjs', import.meta.url).href
   */
  readonly renderWorkerSrc?: string;

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

  /** @internal Hidden bridge between the controller (created in user code) and the component instance. */
  readonly _internal?: PdfViewerInternalApi;
}

/**
 * @internal — Component-side handlers the controller dispatches imperative
 * calls to. The component fills these in on init; before that, controller
 * methods are no-ops (so `viewer.nextPage()` before the view mounts is safe).
 */
export interface PdfViewerInternalHandlers {
  goToPage?: (page: number) => void;
  setZoom?: (zoom: PdfZoom) => void;
  setMode?: (mode: PdfDisplayMode) => void;
  toggleSidebar?: () => void;
  toggleFullscreen?: () => void;
  search?: (query: string) => Promise<PdfSearchResult>;
  nextMatch?: () => void;
  previousMatch?: () => void;
  clearSearch?: () => void;
  print?: () => void;
  download?: (filename?: string) => void;
  reload?: () => void;
  save?: () => Promise<Uint8Array>;
  saveAndDownload?: (filename?: string) => Promise<void>;
}

/**
 * @internal — Hidden channel attached to the config object so the component
 * and the controller can share a writable state signal and a handler bag.
 * Not part of the public API; consumers should never read from this.
 */
export interface PdfViewerInternalApi {
  /** Writable view of the runtime state — controller exposes the read-only view publicly. */
  readonly state: WritableSignal<PdfViewerState>;
  /** Component calls this on init to register imperative handlers. Returns an unbind function. */
  bind(handlers: PdfViewerInternalHandlers): () => void;
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
  /** Whether the search is case-sensitive. Default: `false` (Acrobat-compatible). */
  readonly searchCaseSensitive: boolean;
  /** Whether the search matches whole words only. Default: `false`. */
  readonly searchWholeWord: boolean;

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

  // ── Persistence (Phase 4 — forms + annotations) ─────────────────────────

  /**
   * Serialize the current document — including any form edits from the
   * `formValues` two-way binding and any AnnotationEditor changes — back to
   * a `Uint8Array`. Resolves to fresh PDF bytes the consumer can upload to
   * a server, store, or pass to another PDF tool. Built on PDF.js's
   * `pdfDoc.saveDocument()`; falls back to the original bytes if the
   * pdfjs-dist version doesn't expose that method.
   */
  save(): Promise<Uint8Array>;

  /**
   * Convenience wrapper around `save()` that also triggers a browser download
   * of the resulting bytes. Use this when the consumer just wants a "Save"
   * button that hands the user the filled / annotated PDF.
   */
  saveAndDownload(filename?: string): Promise<void>;
}
