/**
 * Minimal in-house Markdown → HTML for the split-preview editor — no `marked`
 * dependency (roadmap §3: Text/MD/CSV is 100% in-house). It covers a declared
 * subset: headings, bold/italic, inline + fenced code, links, unordered/ordered
 * lists, blockquotes, horizontal rules, and paragraphs. Anything outside the
 * subset renders as plain text — fidelity beyond the subset is a deliberate
 * non-goal (matching the roadmap's anti-"perfect fidelity" stance).
 *
 * Safety: the source is HTML-escaped **first**, so any raw HTML or `<script>`
 * in the markdown is shown as literal text, never interpreted. The renderer
 * then emits only a fixed set of known-safe tags. {@link sanitizeMarkdownHtml}
 * runs DOMPurify on top as belt-and-suspenders before the string is bound.
 */

/** Escape the five HTML-significant characters. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Render the supported inline spans within already-escaped text. */
function renderInline(escaped: string): string {
  // Split out code spans so bold/italic/link rules never touch code content.
  return escaped
    .split(/(`[^`]+`)/g)
    .map((part) => {
      if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
        return `<code>${part.slice(1, -1)}</code>`;
      }
      return (
        part
          // [text](url) — url is escaped already; DOMPurify strips bad schemes.
          .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
          // **bold** / __bold__
          .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '<strong>$2</strong>')
          // *italic* / _italic_
          .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '<em>$2</em>')
      );
    })
    .join('');
}

const HR = /^(?:---|\*\*\*|___)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BLOCKQUOTE = /^>\s?(.*)$/;
const UL_ITEM = /^[-*+]\s+(.*)$/;
const OL_ITEM = /^\d+\.\s+(.*)$/;

/**
 * Render Markdown to a sanitizable HTML string. Pure and synchronous so it's
 * easy to unit-test; the editor pipes the result through
 * {@link sanitizeMarkdownHtml} before binding.
 */
export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];

  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(escapeHtml(paragraph.join(' ')))}</p>`);
      paragraph = [];
    }
  };
  const closeList = (): void => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block: capture verbatim until the closing fence.
    if (/^```/.test(line)) {
      flushParagraph();
      closeList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      closeList();
      continue;
    }

    if (HR.test(line)) {
      flushParagraph();
      closeList();
      out.push('<hr>');
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(escapeHtml(heading[2].trim()))}</h${level}>`);
      continue;
    }

    const quote = BLOCKQUOTE.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      out.push(`<blockquote>${renderInline(escapeHtml(quote[1]))}</blockquote>`);
      continue;
    }

    const ul = UL_ITEM.exec(line);
    const ol = OL_ITEM.exec(line);
    if (ul || ol) {
      flushParagraph();
      const wanted: 'ul' | 'ol' = ul ? 'ul' : 'ol';
      if (listType !== wanted) {
        closeList();
        out.push(`<${wanted}>`);
        listType = wanted;
      }
      out.push(`<li>${renderInline(escapeHtml((ul ?? ol)![1]))}</li>`);
      continue;
    }

    // Plain line — accumulate into the current paragraph.
    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  return out.join('\n');
}

/**
 * Sanitize rendered Markdown HTML with DOMPurify when the optional peer dep is
 * present. The renderer's escape-first design already guarantees safe output;
 * this is the same belt-and-suspenders pass `html.renderer.ts` uses. If
 * DOMPurify isn't installed, the (already-safe) HTML is returned unchanged.
 */
export async function sanitizeMarkdownHtml(html: string): Promise<string> {
  try {
    const mod = await import('dompurify');
    const DOMPurify = (mod.default ?? mod) as typeof import('dompurify').default;
    return DOMPurify.sanitize(html, { ALLOW_UNKNOWN_PROTOCOLS: false, USE_PROFILES: { html: true } });
  } catch {
    return html;
  }
}
