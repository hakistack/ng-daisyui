import { describe, expect, it } from 'vitest';
import { renderInline } from '../ui/rich-text';
import { buildNavigation, buildSidebar, navOrder } from './navigation';
import { DOC_PAGES, pageForUrl, productOf } from './pages';
import { apiRoute, ownerPage, symbolProduct } from '../api/api-manifest.service';

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
    expect(nav[0].section).toBe('overview');
    expect(nav[1].section).toBe('getting-started');
    const components = nav.find((s) => s.section === 'components')!;
    expect(components.groups.map((g) => g.id)).toEqual(['forms', 'data', 'navigation', 'feedback', 'documents']);
    expect(navOrder().length).toBe(DOC_PAGES.filter((p) => !p.hidden).length);
  });

  it('groups the sidebar by product: ecosystem pages unlabelled, each package under its npm name', () => {
    const blocks = buildSidebar();
    expect(blocks.map((b) => [b.product, b.label])).toEqual([
      ['hakistack', undefined],
      ['ng-daisyui', '@hakistack/ng-daisyui'],
      ['i18n', '@hakistack/i18n'],
      ['hakistack', undefined],
    ]);
    expect(blocks[1].sections[0].section).toBe('getting-started');
    expect(blocks.at(-1)!.sections.map((s) => s.section)).toEqual(['contributing']);
    // Every section is in exactly one block, in order.
    expect(blocks.flatMap((b) => b.sections.map((s) => s.section))).toEqual(buildNavigation().map((s) => s.section));
  });

  it('assigns every page a product through its section', () => {
    for (const p of DOC_PAGES) expect(productOf(p)).toBeTruthy();
    expect(productOf(pageForUrl('/overview')!)).toBe('hakistack');
    expect(productOf(pageForUrl('/datagrid')!)).toBe('ng-daisyui');
    expect(productOf(pageForUrl('/i18n/runtime')!)).toBe('i18n');
  });

  it('routes /api/i18n/* to the i18n API page and /api/* to the ng-daisyui one', () => {
    expect(pageForUrl('/api/i18n/translateSignal')?.id).toBe('i18n-api');
    expect(pageForUrl('/api/i18n')?.id).toBe('i18n-api');
    expect(pageForUrl('/api/DataGridComponent')?.id).toBe('api');
  });
});

describe('API ownership across packages', () => {
  const pages = DOC_PAGES;
  it('gives a symbol to a page of its own package only, even when names or areas repeat', () => {
    // Same name in both packages (hypothetical): each resolves within its own product.
    expect(ownerPage({ name: 'translateSignal', area: 'i18n-runtime', package: '@hakistack/i18n' }, pages)?.id).toBe('i18n-runtime');
    expect(ownerPage({ name: 'defineTranslations', area: 'i18n-engine', package: '@hakistack/i18n' }, pages)?.id).toBe('i18n-authoring');
    expect(ownerPage({ name: 'translateSignal', area: 'i18n-runtime' }, pages)).toBeUndefined();
    // An ng-daisyui area never claims an i18n symbol.
    const uiArea = pages.find((p) => productOf(p) === 'ng-daisyui' && p.areas?.length)!.areas![0];
    expect(ownerPage({ name: 'X', area: uiArea, package: '@hakistack/i18n' }, pages)).toBeUndefined();
  });

  it('builds per-package API routes', () => {
    expect(apiRoute({ name: 'LanguageService', package: '@hakistack/i18n' })).toBe('/api/i18n/LanguageService');
    expect(apiRoute({ name: 'DataGridComponent' })).toBe('/api/DataGridComponent');
    expect(symbolProduct({ package: '@hakistack/i18n' })).toBe('i18n');
    expect(symbolProduct({})).toBe('ng-daisyui');
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
