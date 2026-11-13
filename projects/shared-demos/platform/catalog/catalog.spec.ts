import { describe, expect, it } from 'vitest';
import { renderInline } from '../ui/rich-text';
import { buildNavigation, navOrder } from './navigation';
import { DOC_PAGES, pageForUrl } from './pages';

describe('docs catalog', () => {
  it('has unique ids and routes', () => {
    expect(new Set(DOC_PAGES.map((p) => p.id)).size).toBe(DOC_PAGES.length);
    expect(new Set(DOC_PAGES.map((p) => p.route)).size).toBe(DOC_PAGES.length);
  });

  it('resolves example URLs to their page, exact routes first', () => {
    expect(pageForUrl('/datagrid/server?tab=examples')?.id).toBe('datagrid');
    expect(pageForUrl('/tree-table/large')?.id).toBe('tree-table');
    expect(pageForUrl('/tree')?.id).toBe('tree');
    expect(pageForUrl('/guides/bundle-size#lazy')?.id).toBe('guide-bundle-size');
    expect(pageForUrl('/nope')).toBeUndefined();
  });

  it('builds the sidebar from the catalog in section order', () => {
    const nav = buildNavigation();
    expect(nav[0].section).toBe('getting-started');
    const components = nav.find((s) => s.section === 'components')!;
    expect(components.groups.map((g) => g.id)).toEqual(['forms', 'data', 'navigation', 'feedback', 'documents']);
    expect(navOrder().length).toBe(DOC_PAGES.filter((p) => !p.hidden).length);
  });
});

describe('rich text', () => {
  it('escapes HTML and only allows code, bold and links', () => {
    expect(renderInline('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(renderInline('Use `<hk-input>` **now**')).toBe('Use <code class="hk-docs-code">&lt;hk-input&gt;</code> <strong>now</strong>');
  });

  it('renders internal links for routing and drops unsafe schemes', () => {
    expect(renderInline('[Table](/table)')).toContain('href="/table" data-internal="true"');
    expect(renderInline('[x](javascript:alert)')).toBe('x');
    expect(renderInline('[x](javascript:alert(1))')).not.toContain('<a');
  });
});
