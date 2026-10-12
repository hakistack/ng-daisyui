import { buildTextIndex, findTextMatches, groupHitsByPage, segmentStrings, spanMatchRanges } from './text-index';

describe('buildTextIndex / segmentStrings', () => {
  it('records segment starts and round-trips', () => {
    const idx = buildTextIndex(['Hello ', 'world', '']);
    expect(idx.text).toBe('Hello world');
    expect(idx.itemOffsets).toEqual([0, 6, 11]);
    expect(segmentStrings(idx)).toEqual(['Hello ', 'world', '']);
  });
});

describe('findTextMatches', () => {
  const pages = [
    [1, buildTextIndex(['The cat sat. Cat', 'alog'])],
    [2, buildTextIndex(['concatenate CAT'])],
  ] as const;

  it('is case-insensitive by default, in page order, non-overlapping', () => {
    const hits = findTextMatches(pages, 'cat', { caseSensitive: false, wholeWord: false });
    expect(hits.map((h) => `${h.pageNumber}:${h.charStart}`)).toEqual(['1:4', '1:13', '2:3', '2:12']);
  });

  it('honours case sensitivity', () => {
    const hits = findTextMatches(pages, 'Cat', { caseSensitive: true, wholeWord: false });
    expect(hits.map((h) => `${h.pageNumber}:${h.charStart}`)).toEqual(['1:13']);
  });

  it('honours whole-word, across segment joins', () => {
    // "Cat" + "alog" joins into "Catalog", so it's not a whole word.
    const hits = findTextMatches(pages, 'cat', { caseSensitive: false, wholeWord: true });
    expect(hits.map((h) => `${h.pageNumber}:${h.charStart}`)).toEqual(['1:4', '2:12']);
  });

  it('returns nothing for a blank query', () => {
    expect(findTextMatches(pages, '   ', { caseSensitive: false, wholeWord: false })).toEqual([]);
  });

  it('handles unicode word characters', () => {
    const hits = findTextMatches([[1, buildTextIndex(['año ano'])]], 'ano', { caseSensitive: false, wholeWord: true });
    expect(hits.map((h) => h.charStart)).toEqual([4]);
  });
});

describe('groupHitsByPage', () => {
  it('groups preserving order', () => {
    const g = groupHitsByPage([
      { pageNumber: 2, charStart: 1, length: 1 },
      { pageNumber: 1, charStart: 5, length: 1 },
      { pageNumber: 2, charStart: 9, length: 1 },
    ]);
    expect([...g.keys()]).toEqual([2, 1]);
    expect(g.get(2)!.map((h) => h.charStart)).toEqual([1, 9]);
  });
});

describe('spanMatchRanges', () => {
  const hit = (charStart: number, length: number) => ({ pageNumber: 1, charStart, length });

  it('clips a hit that spans two spans', () => {
    const h = hit(4, 6); // chars 4..10
    expect(spanMatchRanges([h], 0, 6)).toEqual([{ start: 4, end: 6, hit: h }]);
    expect(spanMatchRanges([h], 6, 10)).toEqual([{ start: 0, end: 4, hit: h }]);
  });

  it('sorts and trims overlapping hits', () => {
    const a = hit(5, 4); // 5..9
    const b = hit(2, 5); // 2..7
    expect(spanMatchRanges([a, b], 0, 20)).toEqual([
      { start: 2, end: 7, hit: b },
      { start: 7, end: 9, hit: a },
    ]);
  });

  it('ignores hits outside the span', () => {
    expect(spanMatchRanges([hit(0, 2), hit(30, 2)], 10, 10)).toEqual([]);
  });
});
