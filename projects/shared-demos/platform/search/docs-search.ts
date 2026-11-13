/**
 * Docs search scoring. Pure functions — no Angular — so they are unit-tested
 * directly and reused by the command palette as a custom `filter`.
 *
 * Designed for task-style queries ("How to create a form?", "server-side
 * pagination", "cambiar tema"), not just exact component names:
 *  - accents and case are folded, EN/ES stopwords dropped,
 *  - tokens are lightly stemmed (scrolling → scroll, tablas → tabla),
 *  - label hits outweigh keyword hits, which outweigh description hits,
 *  - a full-phrase keyword match gets a bonus.
 */

export interface SearchDoc {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** Extra searchable text: keywords, other-language title/summary, symbol names. */
  readonly keywords?: readonly string[];
  /** Lower = shown first on equal score (pages before examples before API). */
  readonly rank: number;
}

interface Indexed {
  readonly doc: SearchDoc;
  readonly label: Set<string>;
  readonly labelText: string;
  readonly keywords: Set<string>;
  readonly keywordPhrases: readonly string[];
  readonly description: Set<string>;
}

const STOPWORDS = new Set([
  // en
  'a',
  'an',
  'the',
  'to',
  'how',
  'do',
  'i',
  'can',
  'what',
  'is',
  'are',
  'of',
  'in',
  'on',
  'for',
  'with',
  'my',
  'and',
  'or',
  'use',
  'using',
  'make',
  'create',
  'add',
  'get',
  'set',
  // es
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'en',
  'para',
  'con',
  'como',
  'que',
  'y',
  'o',
  'mi',
  'usar',
  'crear',
  'hacer',
  'agregar',
  'anadir',
  'se',
  'por',
  'al',
]);

export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function stem(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3);
  if (token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.endsWith('es') && token.length > 5) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/** Split camelCase / kebab / snake into words too: `createDataGrid` → create data grid. */
export function tokenize(text: string): string[] {
  const spaced = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return fold(spaced)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem);
}

export function queryTokens(query: string): string[] {
  const all = tokenize(query);
  const meaningful = all.filter((t) => !STOPWORDS.has(t));
  // "How to create a form" → [form]; but a query made only of stopwords ("create") is kept.
  return meaningful.length ? meaningful : all;
}

export function buildIndex(docs: readonly SearchDoc[]): Indexed[] {
  return docs.map((doc) => ({
    doc,
    label: new Set(tokenize(doc.label)),
    labelText: fold(doc.label),
    keywords: new Set((doc.keywords ?? []).flatMap(tokenize)),
    keywordPhrases: (doc.keywords ?? []).map((k) => tokenize(k).join(' ')),
    description: new Set(tokenize(doc.description ?? '')),
  }));
}

function hasPrefix(set: Set<string>, token: string): boolean {
  if (token.length < 3) return false;
  for (const t of set) if (t.startsWith(token)) return true;
  return false;
}

/** Score one indexed doc; 0 = no match. */
export function score(item: Indexed, tokens: readonly string[], rawQuery: string): number {
  if (!tokens.length) return 0;
  let total = 0;
  let matched = 0;
  for (const t of tokens) {
    let s = 0;
    if (item.label.has(t)) s = 10;
    else if (hasPrefix(item.label, t)) s = 7;
    else if (item.keywords.has(t)) s = 5;
    else if (hasPrefix(item.keywords, t)) s = 3;
    else if (item.description.has(t)) s = 2;
    else if (hasPrefix(item.description, t)) s = 1;
    if (s) matched++;
    total += s;
  }
  // Every meaningful token should match something; allow one miss on long queries.
  const needed = tokens.length <= 2 ? tokens.length : tokens.length - 1;
  if (matched < needed) return 0;

  const phrase = tokens.join(' ');
  if (tokens.length > 1 && item.keywordPhrases.some((k) => k.includes(phrase))) total += 8;
  const folded = fold(rawQuery.trim());
  if (folded && item.labelText === folded) total += 15;
  else if (folded && item.labelText.startsWith(folded)) total += 6;
  return total;
}

export function search<T extends SearchDoc>(index: readonly Indexed[], query: string, limit = 40): T[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  return index
    .map((item) => ({ item, s: score(item, tokens, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.item.doc.rank - b.item.doc.rank || a.item.doc.label.localeCompare(b.item.doc.label))
    .slice(0, limit)
    .map((r) => r.item.doc as T);
}
