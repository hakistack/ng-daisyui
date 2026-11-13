import { describe, expect, it } from 'vitest';
import { DOC_PAGES } from '../catalog/pages';
import { SearchDoc, buildIndex, queryTokens, search, stem, tokenize } from './docs-search';

/** Same shape the DocsSearchService builds, minus Angular (both languages in keywords). */
const docs: SearchDoc[] = DOC_PAGES.map((p) => ({
  id: p.id,
  label: p.title.en,
  description: p.summary.en,
  keywords: [...p.keywords, p.title.es, p.summary.es, ...(p.symbols ?? [])],
  rank: 0,
}));
const index = buildIndex(docs);
const top = (q: string, n = 3) => search(index, q, n).map((d) => d.id);

describe('docs search', () => {
  it('folds case, accents and camelCase', () => {
    expect(tokenize('createDataGrid')).toEqual(['create', 'data', 'grid']);
    expect(tokenize('Paginación')).toEqual(['paginacion']);
    expect(stem('scrolling')).toBe('scroll');
  });

  it('drops stopwords but keeps a stopword-only query', () => {
    expect(queryTokens('How to create a form?')).toEqual(['form']);
    expect(queryTokens('create')).toEqual(['create']);
  });

  // The example queries from the platform brief: users who do not know the component name.
  it.each([
    ['How to create a form?', 'forms'],
    ['Server-side pagination', 'guide-server-side-data'],
    ['Date range', 'datepicker'],
    ['Virtual scrolling', 'virtual-scroller'],
    ['Change theme', 'theming'],
    ['PDF search', 'pdf-viewer'],
    ['millions of records', 'guide-large-datasets'],
    ['cambiar tema', 'theming'],
    ['tabla con búsqueda', 'guide-searchable-table'],
    ['DataGrid', 'datagrid'],
  ])('"%s" finds %s in the top 3', (query, expected) => {
    expect(top(query)).toContain(expected);
  });

  it('returns nothing for gibberish', () => {
    expect(search(index, 'qwzxv')).toEqual([]);
  });
});
