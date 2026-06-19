/**
 * PDF engine boundary for `hk-pdf-viewer`.
 *
 * The component talks to a PDF engine only through {@link PdfEngine}. There is
 * exactly one production implementation — {@link PdfiumEngine} (PDFium via Rust
 * → WASM, running in a worker) — the interface exists so the component stays
 * unit-testable with a mock. This is NOT a fallback/registry; pd​f.js is being
 * removed entirely (see `PDFIUM_ENGINE.md`).
 *
 * Phase 1 scaffold: the surface mirrors what the component needs (pages, sizes,
 * raster, later text/outline/annotations). The worker that backs it is built
 * separately (ng-packagr can't bundle workers) and requires a vendored
 * emscripten `pdfium.wasm` at runtime.
 */

/** Opaque handle to an open document held inside the worker. */
export type PdfDocHandle = number;

/** A rasterized page bitmap ready to blit onto a DOM canvas. */
export interface PdfRenderResult {
  readonly bitmap: ImageBitmap;
  /** Device-pixel dimensions of `bitmap` (= css * dpr). */
  readonly width: number;
  readonly height: number;
}

/** Page dimensions in PDF points (1/72"). */
export interface PdfPageSize {
  readonly width: number;
  readonly height: number;
}

/**
 * One positioned run of page text. The rect is in PDF points with a
 * **top-left** origin (already Y-flipped by the engine), so the component
 * multiplies by the render scale to place a `<span>`. Segments come back in
 * reading order — segment index ≡ text-layer span index, which the search
 * highlighter relies on to map a char offset back to its span.
 */
export interface PdfTextSegment {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A bookmark/outline node. `pageIndex` is 0-based (`-1` = no destination). */
export interface PdfOutlineNode {
  readonly title: string;
  readonly pageIndex: number;
  readonly children: PdfOutlineNode[];
}

/**
 * A clickable link rect on a page. Rect is in PDF points, top-left origin
 * (same convention as {@link PdfTextSegment}). Exactly one target is set:
 * `pageIndex >= 0` (internal jump) or a non-empty `uri` (external).
 */
export interface PdfLinkRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly pageIndex: number;
  readonly uri: string;
}

/** A document annotation for the sidebar list. `pageIndex` is 0-based. */
export interface PdfAnnotationRow {
  readonly pageIndex: number;
  readonly subtype: string;
  readonly contents: string;
}

/** An embedded file. */
export interface PdfAttachmentFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/**
 * The engine contract. All calls are async (they cross the worker boundary).
 * Phase 1 covers open/pageCount/pageSize/renderPage/dispose; text, outline,
 * links, annotations, forms, and save are layered in Phases 2–4.
 */
export interface PdfEngine {
  /** Parse a document from raw bytes; resolves to a handle for later calls. */
  open(bytes: ArrayBuffer, opts?: { password?: string }): Promise<PdfDocHandle>;
  pageCount(doc: PdfDocHandle): Promise<number>;
  pageSize(doc: PdfDocHandle, page: number): Promise<PdfPageSize>;
  /** Rasterize a page at `cssWidth * dpr` device pixels. Cancellable handle. */
  renderPage(doc: PdfDocHandle, page: number, cssWidth: number, dpr: number): PdfRenderTask;
  /** Extract a page's positioned text segments (reading order) for text + search. */
  pageText(doc: PdfDocHandle, page: number): Promise<PdfTextSegment[]>;
  /** Document outline (bookmark tree). Empty array when the PDF has none. */
  outline(doc: PdfDocHandle): Promise<PdfOutlineNode[]>;
  /** Clickable link rects on a page (for the overlay). */
  pageLinks(doc: PdfDocHandle, page: number): Promise<PdfLinkRect[]>;
  /** User-meaningful annotations across the whole document, for the sidebar. */
  documentAnnotations(doc: PdfDocHandle): Promise<PdfAnnotationRow[]>;
  /** Embedded files. */
  attachments(doc: PdfDocHandle): Promise<PdfAttachmentFile[]>;
  /** Release the document + free its WASM memory. */
  dispose(doc: PdfDocHandle): void;
  /** Tear down the worker + engine. */
  destroy(): void;
}

/** Cancellable render handle, shaped like a PDF.js `RenderTask` so the
 *  component's existing cancellation machinery drives it unchanged. */
export interface PdfRenderTask {
  readonly promise: Promise<PdfRenderResult>;
  cancel(): void;
}

// ── Worker message protocol ────────────────────────────────────────────────
// Main thread → worker.
export type PdfWorkerRequest =
  | { type: 'open'; id: number; bytes: ArrayBuffer; password?: string }
  | { type: 'pageCount'; id: number; doc: PdfDocHandle }
  | { type: 'pageSize'; id: number; doc: PdfDocHandle; page: number }
  | { type: 'render'; id: number; doc: PdfDocHandle; page: number; cssWidth: number; dpr: number }
  | { type: 'pageText'; id: number; doc: PdfDocHandle; page: number }
  | { type: 'outline'; id: number; doc: PdfDocHandle }
  | { type: 'pageLinks'; id: number; doc: PdfDocHandle; page: number }
  | { type: 'documentAnnotations'; id: number; doc: PdfDocHandle }
  | { type: 'attachments'; id: number; doc: PdfDocHandle }
  | { type: 'cancel'; id: number }
  | { type: 'dispose'; doc: PdfDocHandle };

// Worker → main thread.
export type PdfWorkerResponse =
  | { type: 'ready' }
  | { type: 'initError'; message: string }
  | { type: 'ok'; id: number; result: unknown }
  | { type: 'rendered'; id: number; bitmap: ImageBitmap; width: number; height: number }
  | { type: 'error'; id: number; message: string };
