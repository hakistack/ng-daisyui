import { Signal, WritableSignal } from '@angular/core';
import type { HkAnnotation, HkAnnotationInit, PdfMeasureScale } from './core/annotations/annotation.types';
import type { PdfFontSource } from './core/pdf-writer/fonts';
import type { DocMdpLevel } from './core/forms/form-design';
import type { PdfSigner } from './core/signatures/cms';
import type { PdfSignatureInfo } from './core/signatures/pdf-signature';

/** A PDF document source. The component accepts a URL string, an in-memory byte array, or a Blob. */
export type PdfDocumentSource = string | Uint8Array | Blob;

/** Zoom level. Numbers are absolute scales (1 = 100%); the named values fit-to-page/width or auto-detect. */
export type PdfZoom = number | 'fit-page' | 'fit-width' | 'auto';

/**
 * Display mode.
 * - `'continuous'`: vertical scroll through every page.
 * - `'single'`: one page at a time.
 * - `'spread'`: continuous scroll, two pages side by side (1–2, 3–4, …).
 * - `'spread-cover'`: like `'spread'` with the first page alone, as in a book (1, 2–3, 4–5, …).
 */
export type PdfDisplayMode = 'single' | 'continuous' | 'spread' | 'spread-cover';

/**
 * Sidebar tab. `thumbnails` (page previews) and `bookmarks` (PDF outline)
 * are always available. `attachments` (embedded files) and `annotations`
 * (highlight / comment / freetext list) populate from the document at load
 * time and show an empty state when the document has neither.
 */
export type PdfSidebarTab = 'thumbnails' | 'bookmarks' | 'attachments' | 'annotations' | 'signatures';

/**
 * Who signs digitally: a {@link PdfSigner}, or a function returning one
 * when the user signs (to pick a certificate, unlock a token or call a
 * signing service); `null` cancels.
 */
export type PdfSignerSource = PdfSigner | (() => PdfSigner | null | Promise<PdfSigner | null>);

/** Options of a digital signature (see `PdfViewerController.signDigitally`). */
export interface PdfDigitalSignOptions {
  /** An unsigned signature field to sign, or the name of the field to create. */
  readonly field?: string;
  /** A visible signature in a new field: its page (0-based) and box (points, top-left origin). Invisible without it. */
  readonly page?: number;
  readonly rect?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly reason?: string;
  readonly location?: string;
  readonly contactInfo?: string;
  /** Certify the document (DocMDP): 1 no changes, 2 form filling and signing, 3 also annotations. */
  readonly certify?: DocMdpLevel;
  /** Default `ETSI.CAdES.detached` (PAdES). */
  readonly subFilter?: 'adbe.pkcs7.detached' | 'ETSI.CAdES.detached';
  /** Overrides the configured `signer`. */
  readonly signer?: PdfSigner;
}

/**
 * Active annotation tool. `'none'` = normal interaction (select, move and
 * edit existing annotations; select text).
 * - Text markup from the text selection: `'highlight'`, `'underline'`,
 *   `'strikeout'`, `'squiggly'`.
 * - Shapes, dragged out: `'rect'`, `'ellipse'`, `'line'`, `'arrow'`.
 * - Click a vertex at a time, double-click (or Enter) to finish: `'polygon'`,
 *   `'polyline'`, `'cloud'`.
 * - `'ink'` draws freehand; `'eraser'` erases ink.
 * - `'freetext'` places a text box; `'note'` drops a sticky note.
 * - `'stamp'` places the stamp chosen in the stamp menu; `'link'` drags out a link area.
 * - Measurements: `'distance'` (drag), `'perimeter'`, `'area'` and `'volume'`
 *   (vertex by vertex), `'radius'` (drag a circle), in the current scale.
 */
export type PdfAnnotationTool =
  | 'none'
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'squiggly'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'polygon'
  | 'polyline'
  | 'cloud'
  | 'ink'
  | 'eraser'
  | 'freetext'
  | 'note'
  | 'stamp'
  | 'link'
  | 'distance'
  | 'perimeter'
  | 'area'
  | 'radius'
  | 'volume';

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

/** Options for {@link PdfViewerController.exportPageAsImage}. */
export interface PdfImageExportOptions {
  /** 1-indexed page to export. Defaults to the current page. */
  readonly page?: number;
  /** Render scale relative to the page's natural size. Default `2` (crisp). */
  readonly scale?: number;
  /** Image MIME type. Default `'image/png'`. */
  readonly type?: 'image/png' | 'image/jpeg';
  /** JPEG quality 0–1 (ignored for PNG). */
  readonly quality?: number;
  /** Download filename. Defaults to `<doc>-p<N>.<ext>`. */
  readonly filename?: string;
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
   * Number of off-thread PDFium render workers. Pages rasterize in parallel
   * across the pool during fast scroll/zoom. Default `2`; clamped to `1`–`4`
   * and to the device's core count. Each worker holds its own parsed copy of
   * the document, so higher values cost ~N× the engine memory — set `1` to
   * disable pooling on memory-constrained targets.
   */
  readonly renderPoolSize?: number;
  /**
   * Memory budget (MB) for cached page rasters, which make scroll-back and
   * zoom-revisit instant. Default: 96 MB on devices reporting ≤ 4 GB of memory,
   * 256 MB otherwise. The least recently used rasters are released first.
   */
  readonly bitmapCacheMB?: number;
  /** Author written on new annotations, replies and review states. Default: the `defaultAuthor` label ("Guest"). */
  readonly annotationAuthor?: string;
  /**
   * What users may do with annotations. `'edit'` (default): everything.
   * `'review'`: read, comment, reply and set status, but not add, move or
   * restyle. `'view'`: read only.
   */
  readonly annotationMode?: 'edit' | 'review' | 'view';
  /** Users may only change annotations they authored (matched on `annotationAuthor`); others behave as locked. Default `false`. */
  readonly restrictAnnotationsToAuthor?: boolean;
  /**
   * TrueType fonts for text the standard PDF fonts can't show (Greek,
   * Cyrillic, CJK, …) in free text, stamps and form fields: a subset is
   * embedded on save. Without one, form fields fall back to
   * `/NeedAppearances` and annotations show `?` for those characters.
   */
  readonly fonts?: readonly PdfFontSource[];
  /** CSS font families offered for typed signatures, ahead of the built-in handwriting families (load web fonts yourself). */
  readonly signatureFonts?: readonly string[];
  /** Enables digital signing (the "Sign digitally" action and `signDigitally()`). See {@link PdfSignerSource}. */
  readonly signer?: PdfSignerSource;
  /** Certificates (DER bytes or PEM text) whose signers the Signatures panel shows as trusted. */
  readonly trustedCertificates?: readonly (Uint8Array | string)[];

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
  /** Step forward / back. Optional: falls back to `goToPage(page ± 1)`; the viewer steps by spread in two-page modes. */
  nextPage?: () => void;
  previousPage?: () => void;
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
  exportPageAsImage?: (options?: PdfImageExportOptions) => Promise<void>;
  exportText?: (filename?: string) => Promise<void>;
  setAnnotationTool?: (tool: PdfAnnotationTool) => void;
  setAnnotationColor?: (color: string) => void;
  getAnnotations?: () => readonly HkAnnotation[];
  addAnnotation?: (annotation: HkAnnotationInit) => Promise<string>;
  updateAnnotation?: (id: string, changes: Partial<HkAnnotation>) => Promise<void>;
  deleteAnnotation?: (id: string) => Promise<void>;
  selectAnnotation?: (id: string | null) => void;
  undo?: () => Promise<boolean>;
  redo?: () => Promise<boolean>;
  exportAnnotations?: (format: 'xfdf' | 'json') => string;
  importAnnotations?: (data: string) => Promise<number>;
  setMeasureScale?: (scale: PdfMeasureScale) => void;
  resetForm?: () => void;
  exportFormData?: (format: 'json' | 'xfdf' | 'fdf') => string;
  importFormData?: (data: string) => number;
  deletePage?: (pageNumber: number) => Promise<void>;
  insertBlankPage?: (atPageNumber: number) => Promise<void>;
  rotatePage?: (pageNumber: number, delta?: number) => void;
  getSignatures?: () => readonly PdfSignatureInfo[];
  signDigitally?: (options?: PdfDigitalSignOptions) => Promise<Uint8Array>;
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
  /** Reserved; always `''` (the PDFium engine doesn't expose a fingerprint). Kept for API compatibility. */
  readonly fingerprint: string;
  /** Document size in bytes, when known. */
  readonly fileSize?: number;
}

/** Error payload emitted via `onError`. */
export interface PdfViewerError {
  readonly code: 'load_failed' | 'invalid_pdf' | 'password_cancelled' | 'render_failed' | 'unsupported' | 'unknown';
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
   * Serialize the current document — including form-field edits — back to a
   * `Uint8Array` via the PDFium engine. Resolves to fresh PDF bytes the
   * consumer can upload to a server, store, or pass to another PDF tool.
   */
  save(): Promise<Uint8Array>;

  /**
   * Convenience wrapper around `save()` that also triggers a browser download
   * of the resulting bytes. Use this when the consumer just wants a "Save"
   * button that hands the user the filled / annotated PDF.
   */
  saveAndDownload(filename?: string): Promise<void>;

  // ── Export (Phase 5) ─────────────────────────────────────────────────────

  /**
   * Rasterize a page (default: the current page) to a PNG/JPEG image and
   * trigger a browser download. Uses the off-thread PDFium raster at the
   * requested scale.
   */
  exportPageAsImage(options?: PdfImageExportOptions): Promise<void>;

  /**
   * Extract the document's text content and trigger a `.txt` download.
   * Spacing fidelity follows the PDF's own text runs.
   */
  exportText(filename?: string): Promise<void>;

  // ── Annotation editing ───────────────────────────────────────────────────

  /**
   * Set the active annotation tool (see {@link PdfAnnotationTool}); `'none'`
   * returns to normal interaction. A text-markup tool applies at once to a
   * current text selection.
   */
  setAnnotationTool(tool: PdfAnnotationTool): void;

  /** Set the colour (hex, e.g. `'#ffeb3b'`) of the active tool, or of every tool when none is active. */
  setAnnotationColor(color: string): void;

  /** The document's editable annotations (positions in points on the displayed page, top-left origin). */
  getAnnotations(): readonly HkAnnotation[];
  /** Add an annotation; resolves with its id. Undoable; written by `save()`. */
  addAnnotation(annotation: HkAnnotationInit): Promise<string>;
  /** Change an annotation. Locked annotations only accept comment, reply, status and lock changes. */
  updateAnnotation(id: string, changes: Partial<HkAnnotation>): Promise<void>;
  /** Delete an annotation (not when locked). */
  deleteAnnotation(id: string): Promise<void>;
  /** Select an annotation (scrolling to its page), or clear the selection with `null`. */
  selectAnnotation(id: string | null): void;
  /** Undo the last annotation edit. Resolves `false` when there is nothing to undo. */
  undo(): Promise<boolean>;
  /** Redo the last undone edit. Resolves `false` when there is nothing to redo. */
  redo(): Promise<boolean>;
  /** The annotations as XFDF (ISO 19444-1) or JSON (lossless, image stamps included). Empty before a document loads. */
  exportAnnotations(format: 'xfdf' | 'json'): string;
  /** Import XFDF or JSON (auto-detected) as one undo step; resolves with how many were imported. */
  importAnnotations(data: string): Promise<number>;
  /** The scale new measurements use, e.g. `{ ratio: 10 / 72, unit: 'ft', label: '1 in = 10 ft' }`. */
  setMeasureScale(scale: PdfMeasureScale): void;

  // ── Forms ────────────────────────────────────────────────────────────────

  /** Reset every form field to its default value. */
  resetForm(): void;
  /** The form's values as JSON (`name → value`, like `formValues`), XFDF or FDF. Empty before a form loads. */
  exportFormData(format: 'json' | 'xfdf' | 'fdf'): string;
  /** Fill the form from JSON, XFDF or FDF (auto-detected); returns how many fields were set. */
  importFormData(data: string): number;

  // ── Page operations ──────────────────────────────────────────────────────

  /** Delete a page (1-based). No-op on the last remaining page. Persists in `save()`. */
  deletePage(pageNumber: number): Promise<void>;

  /** Insert a blank page so it becomes page `atPageNumber` (1-based; clamped). */
  insertBlankPage(atPageNumber: number): Promise<void>;

  /** Rotate a page (1-based) by `delta`° (default +90). Baked into `save()`. */
  rotatePage(pageNumber: number, delta?: number): void;

  // ── Digital signatures ───────────────────────────────────────────────────

  /** The document's digital signatures, validated (empty while loading or when there are none). */
  getSignatures(): readonly PdfSignatureInfo[];
  /**
   * Sign the document (with every pending edit) digitally, using the
   * configured `signer` or `options.signer`. The viewer reloads the signed
   * document; resolves with its bytes.
   */
  signDigitally(options?: PdfDigitalSignOptions): Promise<Uint8Array>;
}
