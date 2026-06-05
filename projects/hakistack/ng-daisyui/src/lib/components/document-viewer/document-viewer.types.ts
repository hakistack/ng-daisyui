import { Type } from '@angular/core';

/**
 * Anything `<hk-document-viewer>` can render. URLs are fetched on the
 * component's behalf; `Uint8Array`/`Blob` are handed to the matched
 * renderer as-is.
 */
export type DocumentSource = string | Uint8Array | Blob;

/**
 * A document format the registry knows about. Renderers declare which
 * formats they handle so the registry can pick one per `(mime, ext)`
 * lookup. Use the union as a discriminant — narrow with `===` to dispatch
 * format-specific UI in templates.
 *
 * Naming convention: short stable strings that group multiple file
 * extensions / MIME types into one renderer concept ("spreadsheet" covers
 * xlsx + xls + ods, not three separate format keys).
 */
export type DocumentFormat =
  | 'pdf'
  | 'spreadsheet' // xlsx, xls, xlsb, ods — calamine WASM
  | 'docx' // docx (Word OOXML) — docx-preview peer dep
  | 'rtf' // rtf — rtf-parser peer dep
  | 'doc-legacy' // doc, odt — no renderer yet (LibreOffice WASM future)
  | 'presentation' // pptx, ppt, odp — no renderer yet (LibreOffice WASM future)
  | 'text' // txt, md, csv, log, json — preformatted text
  | 'html' // html, htm — sandboxed iframe + DOMPurify
  | 'image' // png, jpg, gif, webp, bmp, svg, ico, avif — native <img>
  | 'image-special' // heic, heif, tiff, tif — WASM decoder
  | 'eml' // eml — postal-mime peer dep
  | 'msg' // msg — @kenjiuno/msgreader peer dep
  | 'epub' // epub — foliate-js peer dep
  | 'unknown';

/** Resolved format information for a given source. */
export interface ResolvedFormat {
  readonly format: DocumentFormat;
  /** Detected MIME type, when one could be derived from extension or content. */
  readonly mimeType: string | null;
  /** Lowercased extension (with leading dot) when one was discoverable. */
  readonly extension: string | null;
}

/**
 * Inputs given to a renderer component instance. Renderers are plain
 * standalone components that read these via `input.required(...)`.
 *
 * `source` is whatever the user passed in. Most renderers will want
 * bytes — `loadSourceAsBytes()` in `document-viewer.helpers.ts` handles
 * URL fetch / Blob unwrapping.
 */
export interface DocumentRendererInputs {
  readonly source: DocumentSource;
  readonly format: ResolvedFormat;
  readonly filename: string | null;
}

/**
 * Registry entry. Renderers are matched in declaration order — the first
 * entry whose `formats` includes the resolved format wins.
 */
export interface DocumentRendererRegistration {
  readonly formats: readonly DocumentFormat[];
  readonly component: Type<unknown>;
}

/**
 * Public configuration object for the facade. Renderers and global
 * behavior options live here. Built via `createDocumentViewer({...})`.
 */
export interface DocumentViewerConfig {
  /**
   * Ordered list of renderer registrations. Empty = use only the
   * library's built-in renderers. Custom registrations are searched
   * **before** the built-ins, so apps can override a format without
   * having to swap the whole renderer.
   */
  readonly renderers?: readonly DocumentRendererRegistration[];

  /**
   * Optional MIME-type hint. When omitted, the format is detected from
   * the source's URL extension, the file extension if `filename` is set,
   * or by sniffing the first few bytes.
   */
  readonly mimeType?: string;

  /** Optional filename hint, used when the URL extension is missing or wrong. */
  readonly filename?: string;
}
