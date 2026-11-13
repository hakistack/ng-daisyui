import { applyClientView, getCellText } from './datagrid.pipeline';
import { createInitialState } from './datagrid.state';
import type { DataGridColumn, DataGridState } from './datagrid.types';

interface Row {
  id: number;
  name: string;
  team: string;
  score: number | null;
  joined: string;
}

const rows: Row[] = [
  { id: 1, name: 'Ana', team: 'Blue', score: 90, joined: '2024-05-01' },
  { id: 2, name: 'bruno', team: 'Red', score: 75, joined: '2023-01-15' },
  { id: 3, name: 'Carla', team: 'Blue', score: null, joined: '2025-02-20' },
  { id: 4, name: 'Diego', team: 'Red', score: 90, joined: '2022-11-30' },
  { id: 5, name: 'Elena', team: 'Green', score: 60, joined: '2024-08-09' },
];

const columns: DataGridColumn<Row>[] = [
  { field: 'name', header: 'Name' },
  { field: 'team', header: 'Team' },
  { field: 'score', header: 'Score', type: 'number', format: (v) => (v == null ? '—' : `${v} pts`) },
  { field: 'joined', header: 'Joined', type: 'date' },
  { field: 'label', header: 'Label', value: (r) => `${r.name}@${r.team}` },
];

function state(patch: Partial<DataGridState> = {}, pageSize?: number): DataGridState {
  return { ...createInitialState(columns, pageSize, undefined).state, ...patch };
}

const ids = (view: { rows: readonly Row[] }) => view.rows.map((r) => r.id);

describe('applyClientView', () => {
  it('returns all rows untouched with an empty state', () => {
    const view = applyClientView(rows, columns, state());
    expect(view.rows).toBe(rows);
    expect(view.total).toBe(5);
  });

  it('combines filters with AND, using date semantics for date columns', () => {
    const view = applyClientView(
      rows,
      columns,
      state({
        filters: [
          { field: 'team', operator: 'equals', value: 'Blue' },
          { field: 'joined', operator: 'gte', value: '2024-01-01' },
        ],
      }),
    );
    expect(ids(view)).toEqual([1, 3]);
  });

  it('filters through custom accessors', () => {
    expect(ids(applyClientView(rows, columns, state({ filters: [{ field: 'label', operator: 'endsWith', value: '@red' }] })))).toEqual([
      2, 4,
    ]);
  });

  it('quick-searches the formatted text of visible searchable columns', () => {
    expect(ids(applyClientView(rows, columns, state({ search: 'BLUE' })))).toEqual([1, 3]);
    // score is a number column → not searchable by default, even though it formats to "90 pts".
    expect(ids(applyClientView(rows, columns, state({ search: 'pts' })))).toEqual([]);
    const hidden = state({ search: 'blue' });
    hidden.columns = hidden.columns.map((c) => (c.field === 'team' || c.field === 'label' ? { ...c, visible: false } : c));
    expect(ids(applyClientView(rows, columns, hidden))).toEqual([]);
  });

  it('sorts by several keys, stable, with nulls last in both directions', () => {
    const view = applyClientView(
      rows,
      columns,
      state({
        sort: [
          { field: 'score', direction: 'desc' },
          { field: 'name', direction: 'asc' },
        ],
      }),
    );
    expect(ids(view)).toEqual([1, 4, 2, 5, 3]);
    expect(ids(applyClientView(rows, columns, state({ sort: [{ field: 'score', direction: 'asc' }] })))).toEqual([5, 2, 1, 4, 3]);
  });

  it('sorts names naturally and case-insensitively', () => {
    expect(ids(applyClientView(rows, columns, state({ sort: [{ field: 'name', direction: 'asc' }] })))).toEqual([1, 2, 3, 4, 5]);
  });

  it('paginates and clamps an out-of-range page index', () => {
    const page2 = applyClientView(rows, columns, state({ page: { index: 1, size: 2 } }, 2));
    expect(ids(page2)).toEqual([3, 4]);
    expect(page2.total).toBe(5);

    const clamped = applyClientView(rows, columns, state({ page: { index: 9, size: 2 } }, 2));
    expect(clamped.pageIndex).toBe(2);
    expect(ids(clamped)).toEqual([5]);
  });
});

describe('getCellText', () => {
  it('uses format, else the raw value', () => {
    expect(getCellText(rows[2], columns[2])).toBe('—');
    expect(getCellText(rows[0], columns[0])).toBe('Ana');
    expect(getCellText({ ...rows[0], team: null } as unknown as Row, columns[1])).toBe('');
  });
});
