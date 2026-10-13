/**
 * hk-pdf-writer: a lazy PDF reader and incremental writer in TypeScript. It
 * reads the structure (xref tables and streams, object streams, the page
 * tree) and appends edits as incremental updates. Framework-free; PDFium
 * stays the renderer. See REFACTOR_PLAN.md §3.14.
 */
export * from './objects';
export { PdfParser } from './parser';
export { serializeValue, serializeIndirectObject, formatNumber } from './serialize';
export { decodeStream, deflate, inflate, flateStream } from './filters';
export { readXref, type XrefEntry, type XrefTable } from './xref';
export { PdfDoc, PdfUnsupportedError, pdfDate, type PdfPageRef } from './document';
export { saveIncremental } from './incremental';
export { ContentBuilder, type Rgb } from './content';
export {
  charWidth,
  textWidth,
  wrapText,
  winAnsiBytes,
  registerCustomFont,
  resolveFont,
  fitsWinAnsi,
  type StandardFont,
  type CustomFont,
} from './standard-fonts';
export { TrueTypeFont } from './truetype';
export { FontEmbedder } from './font-embed';
export { PdfSecurity, PdfPasswordError, PDF_PERMISSION } from './security';
