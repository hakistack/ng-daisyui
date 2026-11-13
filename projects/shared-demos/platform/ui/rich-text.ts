/**
 * Minimal inline formatter for docs prose. Supports exactly three constructs:
 *   `code`, **bold**, [label](/internal/route or https://…)
 * Everything else is HTML-escaped, so content files can never inject markup.
 */
export function renderInline(text: string): string {
  const out: string[] = [];
  // Tokenize code spans first so ** or [] inside code stay literal.
  const parts = text.split(/(`[^`]+`)/g);
  for (const part of parts) {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      out.push(`<code class="hk-docs-code">${escapeHtml(part.slice(1, -1))}</code>`);
      continue;
    }
    let html = escapeHtml(part);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
      if (href.startsWith('/')) return `<a class="link link-primary" href="${href}" data-internal="true">${label}</a>`;
      if (/^https:\/\//.test(href))
        return `<a class="link link-primary" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      return label;
    });
    out.push(html);
  }
  return out.join('');
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Extract internal link targets (for the link checker). */
export function internalLinks(text: string): string[] {
  const links: string[] = [];
  const withoutCode = text.replace(/`[^`]+`/g, '');
  for (const m of withoutCode.matchAll(/\[[^\]]+\]\((\/[^)\s]*)\)/g)) links.push(m[1]);
  return links;
}
