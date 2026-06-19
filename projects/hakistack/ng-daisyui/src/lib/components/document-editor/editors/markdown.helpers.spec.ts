import { describe, expect, it } from 'vitest';

import { escapeHtml, renderMarkdown } from './markdown.helpers';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});

describe('renderMarkdown', () => {
  it('renders ATX headings at the right level', () => {
    expect(renderMarkdown('# Title')).toBe('<h1>Title</h1>');
    expect(renderMarkdown('### Sub')).toBe('<h3>Sub</h3>');
  });

  it('renders bold, italic, and inline code', () => {
    expect(renderMarkdown('**b** and *i* and `c`')).toBe('<p><strong>b</strong> and <em>i</em> and <code>c</code></p>');
  });

  it('does not apply emphasis inside inline code', () => {
    expect(renderMarkdown('`**not bold**`')).toBe('<p><code>**not bold**</code></p>');
  });

  it('renders links with safe rel', () => {
    expect(renderMarkdown('[hk](https://h.dev)')).toBe('<p><a href="https://h.dev" rel="noopener noreferrer">hk</a></p>');
  });

  it('groups consecutive unordered list items into one <ul>', () => {
    expect(renderMarkdown('- a\n- b')).toBe('<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
  });

  it('groups ordered list items into one <ol> and switches list type', () => {
    expect(renderMarkdown('1. a\n2. b')).toBe('<ol>\n<li>a</li>\n<li>b</li>\n</ol>');
    expect(renderMarkdown('- a\n1. b')).toBe('<ul>\n<li>a</li>\n</ul>\n<ol>\n<li>b</li>\n</ol>');
  });

  it('renders fenced code blocks verbatim and escaped', () => {
    expect(renderMarkdown('```\nconst x = 1 < 2;\n```')).toBe('<pre><code>const x = 1 &lt; 2;</code></pre>');
  });

  it('renders blockquotes and horizontal rules', () => {
    expect(renderMarkdown('> quoted')).toBe('<blockquote>quoted</blockquote>');
    expect(renderMarkdown('---')).toBe('<hr>');
  });

  it('joins consecutive plain lines into a paragraph and splits on blank lines', () => {
    expect(renderMarkdown('one\ntwo\n\nthree')).toBe('<p>one two</p>\n<p>three</p>');
  });

  it('escapes raw HTML / script in the source so it is never interpreted', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
