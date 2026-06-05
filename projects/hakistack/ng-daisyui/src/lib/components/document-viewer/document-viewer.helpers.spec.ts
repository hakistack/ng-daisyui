import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

import {
  getRenderableExtensions,
  getSupportedExtensions,
  guessFilename,
  loadSourceAsBytes,
  resolveFormat,
} from './document-viewer.helpers';
import { DocumentRendererRegistration } from './document-viewer.types';

describe('document-viewer.helpers', () => {
  // ─── resolveFormat ────────────────────────────────────────────────────
  //
  // Priority is: explicit mimeType → filename hint extension → URL
  // extension (when source is a string) → Blob.type. Tests cover the
  // happy path of each priority level plus the "no signal at all" case.

  describe('resolveFormat', () => {
    it('returns "pdf" for a .pdf URL', () => {
      const fmt = resolveFormat('https://example.com/doc.pdf');
      expect(fmt.format).toBe('pdf');
      expect(fmt.extension).toBe('.pdf');
    });

    it('returns "spreadsheet" for .xlsx / .xls / .ods', () => {
      for (const ext of ['xlsx', 'xls', 'xlsb', 'ods']) {
        const fmt = resolveFormat(`https://example.com/file.${ext}`);
        expect(fmt.format, `for .${ext}`).toBe('spreadsheet');
      }
    });

    it('routes word-processing extensions to discrete format keys', () => {
      // Each renderer has its own optional peer dep, so we use distinct
      // format keys rather than a single 'document' catch-all. `.doc` /
      // `.odt` map to 'doc-legacy' which has no renderer (yet).
      expect(resolveFormat('/file.docx').format).toBe('docx');
      expect(resolveFormat('/file.rtf').format).toBe('rtf');
      expect(resolveFormat('/file.doc').format).toBe('doc-legacy');
      expect(resolveFormat('/file.odt').format).toBe('doc-legacy');
    });

    it('routes html / htm to "html" (sandboxed iframe renderer)', () => {
      // Previously html was bucketed with 'text' and rendered as
      // preformatted source. Now it gets its own renderer that renders
      // the page in a sandboxed iframe.
      expect(resolveFormat('/page.html').format).toBe('html');
      expect(resolveFormat('/page.htm').format).toBe('html');
    });

    it('routes eml/msg to discrete format keys', () => {
      // Same rationale as word-processing — distinct parsers per format.
      expect(resolveFormat('/inbox.eml').format).toBe('eml');
      expect(resolveFormat('/outlook.msg').format).toBe('msg');
    });

    it('returns "image" for native browser formats', () => {
      for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif']) {
        const fmt = resolveFormat(`/img.${ext}`);
        expect(fmt.format, `for .${ext}`).toBe('image');
      }
    });

    it('returns "image-special" for tiff / heic only — avif stays native', () => {
      // tiff/heic/heif need the WASM decoder; avif modern browsers handle natively.
      expect(resolveFormat('/img.tiff').format).toBe('image-special');
      expect(resolveFormat('/img.tif').format).toBe('image-special');
      expect(resolveFormat('/img.heic').format).toBe('image-special');
      expect(resolveFormat('/img.heif').format).toBe('image-special');
      expect(resolveFormat('/img.avif').format).toBe('image');
    });

    it('returns "text" for txt / md / csv / log / json', () => {
      // html/htm intentionally excluded — they get the dedicated 'html'
      // renderer that uses a sandboxed iframe instead of preformatted
      // text. See the 'routes html / htm to "html"' test below.
      for (const ext of ['txt', 'md', 'csv', 'log', 'json']) {
        const fmt = resolveFormat(`/file.${ext}`);
        expect(fmt.format, `for .${ext}`).toBe('text');
      }
    });

    it('explicit mimeType hint wins over URL extension', () => {
      // URL says .bin (unknown), MIME hint says PDF → resolve as PDF.
      const fmt = resolveFormat('https://example.com/file.bin', 'application/pdf');
      expect(fmt.format).toBe('pdf');
      expect(fmt.mimeType).toBe('application/pdf');
    });

    it('mimeType is normalized (lowercase + parameter-stripped)', () => {
      // Real fetch headers often include charset / boundary / quality:
      //   "Application/PDF; charset=binary"
      const fmt = resolveFormat('https://x.com/foo', 'Application/PDF; charset=binary');
      expect(fmt.format).toBe('pdf');
      expect(fmt.mimeType).toBe('application/pdf');
    });

    it('filename hint extension is honored when URL has none', () => {
      // Common: fetch returns a streaming response without an
      // identifying URL path; consumer passes the original name.
      const fmt = resolveFormat('https://api.example.com/files/abc123/download', undefined, 'quarterly-report.xlsx');
      expect(fmt.format).toBe('spreadsheet');
      expect(fmt.extension).toBe('.xlsx');
    });

    it('strips ?query and #hash before extracting URL extension', () => {
      const fmt = resolveFormat('https://cdn.example.com/file.pdf?token=abc&v=2#page=5');
      expect(fmt.format).toBe('pdf');
      expect(fmt.extension).toBe('.pdf');
    });

    it('dot inside a directory name is not treated as an extension', () => {
      // The dot in `v1.2` looks like an extension if you naively use
      // lastIndexOf — the helper must reject when a slash follows.
      const fmt = resolveFormat('https://example.com/api/v1.2/file');
      expect(fmt.format).toBe('unknown');
    });

    it('Blob.type is the last-resort fallback', () => {
      const blob = new Blob([new Uint8Array([0])], { type: 'application/pdf' });
      const fmt = resolveFormat(blob);
      expect(fmt.format).toBe('pdf');
      expect(fmt.mimeType).toBe('application/pdf');
    });

    it('Uint8Array with no hints resolves to "unknown"', () => {
      const fmt = resolveFormat(new Uint8Array([1, 2, 3]));
      expect(fmt.format).toBe('unknown');
      expect(fmt.extension).toBeNull();
    });

    it('returns "unknown" for an unrecognized extension', () => {
      const fmt = resolveFormat('/file.xyz');
      expect(fmt.format).toBe('unknown');
    });
  });

  // ─── guessFilename ────────────────────────────────────────────────────

  describe('guessFilename', () => {
    it('uses File.name for a File source', () => {
      const file = new File([new Uint8Array([0])], 'report.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      expect(guessFilename(file)).toBe('report.xlsx');
    });

    it('returns null for a plain Blob (no filename available)', () => {
      const blob = new Blob([new Uint8Array([0])]);
      expect(guessFilename(blob)).toBeNull();
    });

    it('returns null for a Uint8Array (raw bytes, no name)', () => {
      expect(guessFilename(new Uint8Array([1, 2, 3]))).toBeNull();
    });

    it('extracts the last path segment from a URL', () => {
      expect(guessFilename('https://example.com/path/to/report.pdf')).toBe('report.pdf');
    });

    it('strips ?query and #hash before extracting the basename', () => {
      expect(guessFilename('https://cdn.example.com/file.pdf?t=1#p=2')).toBe('file.pdf');
    });

    it('returns the whole string when the URL has no slash', () => {
      // Rare in practice; `data:` URIs hit this path.
      expect(guessFilename('local.txt')).toBe('local.txt');
    });
  });

  // ─── loadSourceAsBytes ───────────────────────────────────────────────

  describe('loadSourceAsBytes', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('passes through a Uint8Array source unchanged', async () => {
      const src = new Uint8Array([1, 2, 3, 4]);
      const out = await loadSourceAsBytes(src);
      // Reference equality: no copy, no fetch.
      expect(out).toBe(src);
    });

    it('unwraps a Blob into its bytes', async () => {
      const blob = new Blob([new Uint8Array([10, 20, 30])]);
      const out = await loadSourceAsBytes(blob);
      expect(Array.from(out)).toEqual([10, 20, 30]);
    });

    it('fetches a URL and returns the response bytes', async () => {
      const expectedBytes = new Uint8Array([42, 100, 255]);
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(expectedBytes, { status: 200, headers: { 'content-type': 'application/octet-stream' } }),
        ) as typeof fetch;

      const out = await loadSourceAsBytes('https://example.com/data.bin');
      expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/data.bin');
      expect(Array.from(out)).toEqual([42, 100, 255]);
    });

    it('throws a descriptive error on non-OK fetch responses', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 404 })) as typeof fetch;

      await expect(loadSourceAsBytes('https://example.com/missing')).rejects.toThrow(/HTTP 404/);
    });
  });

  // ─── getSupportedExtensions / getRenderableExtensions ────────────────

  describe('getSupportedExtensions', () => {
    it('returns every known extension with a leading dot', () => {
      const exts = getSupportedExtensions();
      // Sanity: every entry starts with `.` and is non-empty after the dot.
      expect(exts.every((e) => e.startsWith('.') && e.length > 1)).toBe(true);
    });

    it('includes representative extensions from every format family', () => {
      const exts = new Set(getSupportedExtensions());
      // PDF, spreadsheets, docx, rtf, html, eml, msg, epub, images, text.
      expect(exts.has('.pdf')).toBe(true);
      expect(exts.has('.xlsx')).toBe(true);
      expect(exts.has('.docx')).toBe(true);
      expect(exts.has('.rtf')).toBe(true);
      expect(exts.has('.html')).toBe(true);
      expect(exts.has('.eml')).toBe(true);
      expect(exts.has('.msg')).toBe(true);
      expect(exts.has('.epub')).toBe(true);
      expect(exts.has('.png')).toBe(true);
      expect(exts.has('.tiff')).toBe(true);
      expect(exts.has('.txt')).toBe(true);
    });

    it('returns a stable sorted order', () => {
      const a = getSupportedExtensions();
      const b = getSupportedExtensions();
      expect(a).toEqual(b);
      const sorted = [...a].sort();
      expect(a).toEqual(sorted);
    });
  });

  describe('getRenderableExtensions', () => {
    it('only includes extensions claimed by the passed registrations', () => {
      // Faking a registration list that claims only 'pdf'. 'image' is
      // included implicitly per the helper's "native browser capability"
      // exception.
      const regs: DocumentRendererRegistration[] = [{ formats: ['pdf'], component: class {} }];
      const exts = new Set(getRenderableExtensions(regs));
      expect(exts.has('.pdf')).toBe(true);
      expect(exts.has('.png')).toBe(true); // 'image' implicit
      expect(exts.has('.docx')).toBe(false);
      expect(exts.has('.epub')).toBe(false);
    });

    it('always includes "image" extensions even when no renderer registered for it', () => {
      // Empty registration list — only the implicit 'image' exception applies.
      const exts = new Set(getRenderableExtensions([]));
      expect(exts.has('.png')).toBe(true);
      expect(exts.has('.jpg')).toBe(true);
      // But not unsupported formats:
      expect(exts.has('.pdf')).toBe(false);
      expect(exts.has('.docx')).toBe(false);
    });

    it('excludes extensions for "doc-legacy" / "presentation" until a renderer claims them', () => {
      // Even a permissive renderer-list that claims most formats won't
      // include the legacy office keys unless they explicitly register.
      const regs: DocumentRendererRegistration[] = [{ formats: ['pdf', 'docx', 'rtf', 'html', 'eml', 'msg', 'epub'], component: class {} }];
      const exts = new Set(getRenderableExtensions(regs));
      expect(exts.has('.doc')).toBe(false); // 'doc-legacy' unclaimed
      expect(exts.has('.pptx')).toBe(false); // 'presentation' unclaimed
      // But all the claimed formats are present:
      expect(exts.has('.docx')).toBe(true);
      expect(exts.has('.rtf')).toBe(true);
      expect(exts.has('.epub')).toBe(true);
    });
  });
});
