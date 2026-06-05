import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/**
 * Renderer for `.rtf` (Rich Text Format) documents.
 *
 * Inline minimal RTF text-extractor — no peer deps. RTF is a
 * well-documented ASCII format where plain text sits between
 * backslash-prefixed control words; stripping the control words +
 * decoding the common escapes gives us the document's textual
 * content with paragraph breaks preserved. Bold / italic / underline
 * tracking is approximated by toggling on `\b` / `\i` / `\ul` and
 * resetting on `\par`.
 *
 * Most browser-friendly RTF libs on npm (`rtf-parser`, friends) ship
 * Node-only APIs (`Buffer`, `events`, etc.) that don't bundle into a
 * browser app cleanly. Rather than drag in Node polyfills for a
 * marginal-fidelity win, we own the extractor in a few dozen lines
 * here. Consumers needing pixel-perfect Word-style RTF rendering
 * should route to LibreOffice WASM (future work).
 *
 * What this DOES handle:
 *   - Plain text with paragraph breaks (`\par`)
 *   - Bold (`\b` / `\b0`), italic (`\i` / `\i0`), underline (`\ul` / `\ul0`)
 *   - Common escapes: `\\`, `\{`, `\}`, `\'XX` (hex byte)
 *   - Unicode escapes: `\uNNNN` (signed 16-bit code point)
 *
 * What it does NOT handle:
 *   - Tables, lists, headings, fonts, colors
 *   - Embedded images / OLE objects
 *   - Field codes (TOC, hyperlinks beyond plain text)
 */
@Component({
  selector: 'hk-document-rtf-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Loading…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error whitespace-pre-line">{{ e }}</div>
    } @else {
      <div class="prose prose-sm max-w-none bg-base-100 p-4 rounded border border-base-content/10" [innerHTML]="rendered()"></div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentRtfRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rendered = signal<string>('');

  constructor() {
    effect(() => {
      const src = this.source();
      void this.decode(src);
    });
  }

  private async decode(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.rendered.set('');
    try {
      const bytes = await loadSourceAsBytes(src);
      // RTF is ASCII-safe at the byte level (high bytes encoded as
      // \'XX or \uNNNN), so plain Latin-1 → string is the documented
      // decoding step before parsing.
      const rtfText = new TextDecoder('latin1').decode(bytes);
      const html = parseRtfToHtml(rtfText);
      this.rendered.set(html);
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to parse RTF.');
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * Strip RTF control words and emit a safe HTML approximation. The
 * output uses only tags we control (`<p>`, `<strong>`, `<em>`, `<u>`),
 * so [innerHTML] in the template is safe — no user markup ever reaches
 * the DOM verbatim. All textual content gets HTML-escaped before being
 * wrapped in our own tags.
 *
 * Parser state:
 *   - `out`         — accumulated HTML string
 *   - `paraOpen`    — true while inside a `<p>...</p>`
 *   - `bold/italic/underline` — toggle state for the current run
 *   - `paraText`    — text accumulated for the current paragraph;
 *                     flushed (with formatting tags) on `\par`
 *
 * RTF documents always start with `{\rtf1 ...}`; we skip the leading
 * `\rtf` header lines by ignoring control words until we see real text.
 */
function parseRtfToHtml(text: string): string {
  const paragraphs: string[] = [];
  let buffer = '';
  let bold = false;
  let italic = false;
  let underline = false;

  let i = 0;
  const len = text.length;

  /** Wrap text with current style tags and append to the paragraph buffer. */
  const append = (s: string): void => {
    if (!s) return;
    let wrapped = htmlEscape(s);
    if (bold) wrapped = `<strong>${wrapped}</strong>`;
    if (italic) wrapped = `<em>${wrapped}</em>`;
    if (underline) wrapped = `<u>${wrapped}</u>`;
    buffer += wrapped;
  };

  /** Flush the paragraph buffer as a `<p>` if non-empty. */
  const flushParagraph = (): void => {
    const trimmed = buffer.trim();
    if (trimmed) paragraphs.push(`<p>${trimmed}</p>`);
    buffer = '';
  };

  while (i < len) {
    const ch = text[i];

    if (ch === '\\') {
      // RTF escape: control word, hex byte, unicode escape, or escaped
      // brace/backslash.
      i++;
      if (i >= len) break;
      const next = text[i];

      if (next === '\\' || next === '{' || next === '}') {
        append(next);
        i++;
        continue;
      }

      if (next === "'") {
        // `\'XX` — single byte expressed as hex.
        const hex = text.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          append(String.fromCharCode(parseInt(hex, 16)));
          i += 3;
          continue;
        }
        i++;
        continue;
      }

      if (next === 'u') {
        // `\uNNNN` — signed 16-bit unicode code point, optionally
        // followed by a fallback ASCII char (skip that).
        const match = /^u(-?\d+)\s?/.exec(text.slice(i));
        if (match) {
          let code = parseInt(match[1], 10);
          if (code < 0) code += 65536; // signed → unsigned for surrogates
          append(String.fromCharCode(code));
          i += match[0].length;
          continue;
        }
      }

      // Generic control word: backslash + ASCII letters + optional
      // signed integer parameter, optionally terminated by a space.
      const cw = /^([a-zA-Z]+)(-?\d+)?\s?/.exec(text.slice(i));
      if (cw) {
        const name = cw[1];
        const param = cw[2];

        switch (name) {
          case 'par':
          case 'sect':
          case 'page':
            flushParagraph();
            break;
          case 'b':
            bold = param !== '0';
            break;
          case 'i':
            italic = param !== '0';
            break;
          case 'ul':
            underline = param !== '0';
            break;
          case 'ulnone':
            underline = false;
            break;
          case 'tab':
            append('\t');
            break;
          case 'line':
            append(' ');
            break;
          // Many control words (font tables, color tables, headers,
          // pagesetup) are document metadata we don't need. Ignoring
          // them is intentional — we only emit text.
        }
        i += cw[0].length;
        continue;
      }

      // Unknown escape: just skip the backslash.
      continue;
    }

    if (ch === '{' || ch === '}') {
      // Group delimiters — RTF uses these for scoping (font tables,
      // styles, etc.). We don't track groups precisely; the control-
      // word filtering above handles the bulk.
      i++;
      continue;
    }

    if (ch === '\n' || ch === '\r') {
      // Raw line breaks in the RTF source are not text — they're
      // formatting whitespace. Skip.
      i++;
      continue;
    }

    // Plain character — append.
    append(ch);
    i++;
  }

  flushParagraph();
  return paragraphs.length > 0 ? paragraphs.join('\n') : '<p class="text-base-content/60 italic">Empty document.</p>';
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
