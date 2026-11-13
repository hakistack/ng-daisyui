import { inRange, normalizeRange, rangeCellCount, rangeToTsv, summarizeRange } from './datagrid.range';
import type { DataGridColumn } from './datagrid.types';

interface Row {
  name: string;
  qty: number | null;
  note: string;
}

const rows: Row[] = [
  { name: 'Ana', qty: 2, note: 'plain' },
  { name: 'Bruno', qty: null, note: 'has\ttab' },
  { name: 'Carla', qty: 5, note: 'say "hi"' },
];

const columns: DataGridColumn<Row>[] = [
  { field: 'name', header: 'Name' },
  { field: 'qty', header: 'Qty', type: 'number', format: (v) => (v == null ? '' : `${v} u`) },
  { field: 'note', header: 'Note' },
];

describe('normalizeRange', () => {
  it('spans anchor and active in any direction', () => {
    expect(normalizeRange({ row: 2, col: 2 }, { row: 0, col: 1 })).toEqual({ r0: 0, r1: 2, c0: 1, c1: 2 });
    expect(normalizeRange(null, { row: 1, col: 0 })).toEqual({ r0: 1, r1: 1, c0: 0, c1: 0 });
  });

  it('is null on the header row and clamps a header anchor', () => {
    expect(normalizeRange(null, { row: -1, col: 0 })).toBeNull();
    expect(normalizeRange({ row: -1, col: 0 }, { row: 1, col: 0 })).toEqual({ r0: 0, r1: 1, c0: 0, c1: 0 });
  });

  it('counts and tests membership', () => {
    const range = { r0: 0, r1: 1, c0: 0, c1: 2 };
    expect(rangeCellCount(range)).toBe(6);
    expect(inRange(range, 1, 2)).toBe(true);
    expect(inRange(range, 2, 0)).toBe(false);
    expect(inRange(null, 0, 0)).toBe(false);
  });
});

describe('rangeToTsv', () => {
  it('copies displayed text and quotes fields Excel would mangle', () => {
    expect(rangeToTsv(rows, columns, { r0: 0, r1: 2, c0: 0, c1: 2 })).toBe(
      ['Ana\t2 u\tplain', 'Bruno\t\t"has\ttab"', 'Carla\t5 u\t"say ""hi"""'].join('\n'),
    );
  });

  it('ignores rows and columns beyond the data', () => {
    expect(rangeToTsv(rows, columns, { r0: 2, r1: 9, c0: 0, c1: 9 })).toBe('Carla\t5 u\t"say ""hi"""');
  });
});

describe('summarizeRange', () => {
  it('counts non-empty cells and sums raw numbers', () => {
    expect(summarizeRange(rows, columns, { r0: 0, r1: 2, c0: 0, c1: 1 })).toEqual({ count: 5, numericCount: 2, sum: 7, avg: 3.5 });
    expect(summarizeRange(rows, columns, { r0: 0, r1: 2, c0: 0, c1: 0 }).avg).toBeNull();
  });
});
