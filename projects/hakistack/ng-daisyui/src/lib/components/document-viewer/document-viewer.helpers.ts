import { DocumentFormat, DocumentSource, ResolvedFormat } from './document-viewer.types';

/**
 * Lookup table mapping extension → format. Extensions are stored without
 * a leading dot. Add new formats here as renderers come online so the
 * registry can route to them without code changes.
 */
const EXT_TO_FORMAT: Readonly<Record<string, DocumentFormat>> = {
  // PDF
  pdf: 'pdf',

  // Spreadsheets — handled by calamine in document-wasm
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  xlsb: 'spreadsheet',
  xlsm: 'spreadsheet',
  ods: 'spreadsheet',
  csv: 'text', // text renderer (or special spreadsheet in future)

  // Word-processing
  docx: 'document',
  doc: 'document',
  rtf: 'document',
  odt: 'document',

  // Presentations
  pptx: 'presentation',
  ppt: 'presentation',
  odp: 'presentation',

  // Plain / lightweight markup — rendered as text for Phase 1
  txt: 'text',
  log: 'text',
  md: 'text',
  json: 'text',
  html: 'text',
  htm: 'text',

  // Images — native browser <img> handles these.
  // `avif` is here because modern Chrome / Firefox / Safari decode it
  // natively; older browsers will show a broken-image icon (acceptable
  // tradeoff vs. paying the WASM cost for everyone).
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  svg: 'image',
  ico: 'image',
  avif: 'image',

  // Images — need a JS/WASM decoder.
  // `.tiff`/`.tif` → handled by the Rust `image` crate via image_wasm.
  // `.heic`/`.heif` → routed here so the renderer surfaces a clean error
  //   message; libheif WASM lands in Phase 2.1 for real support.
  // `.avif` is on the native path below (modern browsers decode natively).
  heic: 'image-special',
  heif: 'image-special',
  tiff: 'image-special',
  tif: 'image-special',

  // Email
  eml: 'email',
  msg: 'email',

  // E-books
  epub: 'epub',
};

/**
 * Common MIME → format mapping. Used when the consumer provides an
 * explicit mimeType and the extension lookup fails or isn't available.
 * Keys are lowercased; comparison is case-insensitive.
 */
const MIME_TO_FORMAT: Readonly<Record<string, DocumentFormat>> = {
  'application/pdf': 'pdf',

  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.ms-excel.sheet.binary.macroenabled.12': 'spreadsheet',
  'application/vnd.ms-excel.sheet.macroenabled.12': 'spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
  'text/csv': 'text',

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
  'application/rtf': 'document',
  'application/vnd.oasis.opendocument.text': 'document',

  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.oasis.opendocument.presentation': 'presentation',

  'text/plain': 'text',
  'text/markdown': 'text',
  'application/json': 'text',
  'text/html': 'text',

  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/bmp': 'image',
  'image/svg+xml': 'image',
  'image/x-icon': 'image',
  'image/avif': 'image',

  'image/heic': 'image-special',
  'image/heif': 'image-special',
  'image/tiff': 'image-special',

  'message/rfc822': 'email',
  'application/vnd.ms-outlook': 'email',

  'application/epub+zip': 'epub',
};

/**
 * Resolve a [`DocumentSource`] plus optional hints to a concrete format.
 * Priority:
 *
 *   1. explicit `mimeType` hint
 *   2. extension extracted from `filename` hint
 *   3. extension extracted from URL (when the source is a string)
 *   4. MIME from a `Blob.type` when present
 *
 * If none of the above identify a format, `format === 'unknown'`.
 */
export function resolveFormat(source: DocumentSource, mimeHint?: string, filenameHint?: string): ResolvedFormat {
  // (1) explicit MIME hint wins.
  if (mimeHint) {
    const mime = mimeHint.toLowerCase().split(';')[0].trim();
    const fromMime = MIME_TO_FORMAT[mime];
    if (fromMime) {
      const ext = filenameHint ? extractExtension(filenameHint) : null;
      return { format: fromMime, mimeType: mime, extension: ext };
    }
  }

  // (2) filename hint extension.
  if (filenameHint) {
    const ext = extractExtension(filenameHint);
    if (ext) {
      const fromExt = EXT_TO_FORMAT[ext.slice(1)];
      if (fromExt) return { format: fromExt, mimeType: mimeHint ?? null, extension: ext };
    }
  }

  // (3) URL extension when the source is a string.
  if (typeof source === 'string') {
    const ext = extractExtension(stripUrlNoise(source));
    if (ext) {
      const fromExt = EXT_TO_FORMAT[ext.slice(1)];
      if (fromExt) return { format: fromExt, mimeType: mimeHint ?? null, extension: ext };
    }
  }

  // (4) Blob.type fallback.
  if (source instanceof Blob && source.type) {
    const mime = source.type.toLowerCase().split(';')[0].trim();
    const fromMime = MIME_TO_FORMAT[mime];
    if (fromMime) return { format: fromMime, mimeType: mime, extension: null };
  }

  return { format: 'unknown', mimeType: mimeHint ?? null, extension: null };
}

/**
 * Load the source into a `Uint8Array`. Renderers that need raw bytes
 * (spreadsheet, anything WASM-backed) call this; renderers that can work
 * with URLs directly (`<img>`, the existing `<hk-pdf-viewer>`) don't.
 */
export async function loadSourceAsBytes(source: DocumentSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());

  // URL — straight fetch. Caller should set CORS appropriately for
  // cross-origin sources.
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to fetch document (HTTP ${response.status}): ${source}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Extract a lowercase extension (with leading dot) from a path or URL.
 * Returns `null` when there is no recognizable extension.
 */
function extractExtension(path: string): string | null {
  const last = path.lastIndexOf('.');
  if (last === -1 || last === path.length - 1) return null;
  const slashAfter = path.indexOf('/', last);
  // A slash after the last dot means the dot was inside a directory name
  // (e.g. `https://example.com/v1.2/page` — `.2/page` is not an extension).
  if (slashAfter !== -1) return null;
  return path.slice(last).toLowerCase();
}

/** Strip query string + hash from a URL before extension extraction. */
function stripUrlNoise(url: string): string {
  let stripped = url;
  const hash = stripped.indexOf('#');
  if (hash !== -1) stripped = stripped.slice(0, hash);
  const query = stripped.indexOf('?');
  if (query !== -1) stripped = stripped.slice(0, query);
  return stripped;
}

/**
 * Guess a filename from the source (URL last-segment, Blob filename if
 * the consumer wrapped a `File`, or `null` for `Uint8Array`).
 */
export function guessFilename(source: DocumentSource): string | null {
  if (source instanceof File) return source.name;
  if (source instanceof Blob) return null;
  if (typeof source === 'string') {
    const stripped = stripUrlNoise(source);
    const slash = stripped.lastIndexOf('/');
    return slash === -1 ? stripped : stripped.slice(slash + 1) || null;
  }
  return null;
}
