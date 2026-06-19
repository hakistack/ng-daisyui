import { describe, expect, it } from 'vitest';

import { parseCsv, serializeCsv } from './csv.helpers';

describe('parseCsv', () => {
  it('parses a header row plus data rows into keyed objects', () => {
    const { columns, rows } = parseCsv('name,age\nAda,36\nGrace,45');
    expect(columns).toEqual(['name', 'age']);
    expect(rows).toEqual([
      { name: 'Ada', age: '36' },
      { name: 'Grace', age: '45' },
    ]);
  });

  it('returns empty columns/rows for blank input', () => {
    expect(parseCsv('')).toEqual({ columns: [], rows: [] });
  });

  it('treats a header-only file as zero rows', () => {
    expect(parseCsv('a,b,c')).toEqual({ columns: ['a', 'b', 'c'], rows: [] });
  });

  it('ignores a trailing newline', () => {
    const { rows } = parseCsv('h\nx\n');
    expect(rows).toEqual([{ h: 'x' }]);
  });

  it('handles quoted fields with embedded commas, quotes, and newlines', () => {
    const { rows } = parseCsv('a,b\n"x,y","he said ""hi"""\n"line1\nline2",z');
    expect(rows).toEqual([
      { a: 'x,y', b: 'he said "hi"' },
      { a: 'line1\nline2', b: 'z' },
    ]);
  });

  it('handles CRLF line endings', () => {
    const { columns, rows } = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(columns).toEqual(['a', 'b']);
    expect(rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('pads short rows and drops extra fields to match the header', () => {
    const { rows } = parseCsv('a,b,c\n1\n1,2,3,4');
    expect(rows).toEqual([
      { a: '1', b: '', c: '' },
      { a: '1', b: '2', c: '3' },
    ]);
  });
});

describe('serializeCsv', () => {
  it('writes a header row followed by data rows', () => {
    const csv = serializeCsv(
      ['name', 'age'],
      [
        { name: 'Ada', age: '36' },
        { name: 'Grace', age: '45' },
      ],
    );
    expect(csv).toBe('name,age\nAda,36\nGrace,45');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = serializeCsv(['a', 'b'], [{ a: 'x,y', b: 'he said "hi"' }]);
    expect(csv).toBe('a,b\n"x,y","he said ""hi"""');
  });

  it('fills missing keys with empty strings', () => {
    const csv = serializeCsv(['a', 'b'], [{ a: '1' }]);
    expect(csv).toBe('a,b\n1,');
  });
});

describe('parseCsv ↔ serializeCsv round-trip', () => {
  it('survives a round-trip through quoted/edge content', () => {
    const original = 'first,last,note\n"O\'\'Brien",Ada,"comma, and ""quotes"""\nGrace,Hopper,"multi\nline"';
    const { columns, rows } = parseCsv(original);
    const reserialized = serializeCsv(columns, [...rows]);
    // Re-parsing the serialized output yields identical structured data.
    expect(parseCsv(reserialized)).toEqual({ columns, rows });
  });
});
