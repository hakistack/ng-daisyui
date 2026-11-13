import { signal } from '@angular/core';

import { _dataGridInternals, createDataGrid } from './datagrid.helpers';
import type { DataGridColumn, DataGridState } from './datagrid.types';

interface Person {
  id: number;
  name: string;
  age: number;
}

const people: Person[] = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}`, age: 20 + (i % 7) }));

const columns: DataGridColumn<Person>[] = [
  { field: 'name', header: 'Name' },
  { field: 'age', header: 'Age', type: 'number' },
  { field: 'id', header: 'ID', type: 'number', sortable: false },
];

describe('createDataGrid', () => {
  it('derives rows, total and visible columns from the data and state', () => {
    const grid = createDataGrid({ columns, data: people, pageSize: 10 });
    expect(grid.rows()).toHaveLength(10);
    expect(grid.total()).toBe(23);
    expect(grid.visibleColumns().map((c) => [c.field, c.offset, c.align])).toEqual([
      ['name', 0, 'start'],
      ['age', 160, 'end'],
      ['id', 280, 'end'],
    ]);
  });

  it('follows a data signal and setData()', () => {
    const data = signal<readonly Person[]>(people.slice(0, 3));
    const grid = createDataGrid({ columns, data });
    expect(grid.total()).toBe(3);
    data.set(people);
    expect(grid.total()).toBe(23);
    grid.setData(people.slice(0, 1));
    expect(grid.total()).toBe(1);
  });

  it('cycles sort asc → desc → off, and Shift adds levels', () => {
    const grid = createDataGrid({ columns, data: people });
    grid.toggleSort('age');
    expect(grid.getState().sort).toEqual([{ field: 'age', direction: 'asc' }]);
    grid.toggleSort('age');
    expect(grid.getState().sort).toEqual([{ field: 'age', direction: 'desc' }]);
    grid.toggleSort('age');
    expect(grid.getState().sort).toEqual([]);

    grid.toggleSort('age');
    grid.toggleSort('name', true);
    expect(grid.getState().sort).toEqual([
      { field: 'age', direction: 'asc' },
      { field: 'name', direction: 'asc' },
    ]);
    grid.toggleSort('name', true);
    grid.toggleSort('name', true);
    expect(grid.getState().sort).toEqual([{ field: 'age', direction: 'asc' }]);

    // A plain click on one of several keys makes it the only key, starting at asc.
    grid.toggleSort('name', true);
    grid.toggleSort('age');
    expect(grid.getState().sort).toEqual([{ field: 'age', direction: 'asc' }]);

    grid.toggleSort('id');
    expect(grid.getState().sort).toEqual([{ field: 'age', direction: 'asc' }]);
  });

  it('clamps setPage and keeps the first visible row on setPageSize', () => {
    const grid = createDataGrid({ columns, data: people, pageSize: 10 });
    grid.setPage(99);
    expect(grid.getState().page).toEqual({ index: 2, size: 10 });
    expect(grid.rows()).toHaveLength(3);
    grid.setPage(1);
    grid.setPageSize(5);
    expect(grid.getState().page).toEqual({ index: 2, size: 5 });
    expect(grid.rows()[0].id).toBe(11);
  });

  it('reports setState issues, notifies onStateChange and resets', () => {
    const changes: DataGridState[] = [];
    const grid = createDataGrid({ columns, data: people, onStateChange: (s) => changes.push(s) });
    const issues = grid.setState({
      filters: [
        { field: 'age', operator: 'gt', value: '24' },
        { field: 'name', operator: 'gt', value: 1 },
      ],
    });
    expect(issues).toHaveLength(1);
    expect(grid.total()).toBe(people.filter((p) => p.age > 24).length);
    expect(changes).toHaveLength(1);

    grid.resetState();
    expect(grid.getState().filters).toEqual([]);
    expect(grid.total()).toBe(23);
  });

  it('exposes a JSON schema for its state', () => {
    const schema = createDataGrid({ columns, pageSize: 10 }).stateSchema() as { properties: Record<string, unknown> };
    expect(Object.keys(schema.properties)).toEqual(['sort', 'filters', 'search', 'columns', 'page']);
  });

  it('builds a server request that ignores column-only changes and bumps on refresh', () => {
    const grid = createDataGrid<Person>({ columns, pageSize: 10, dataSource: () => Promise.resolve({ rows: [], total: 0 }) });
    const internals = _dataGridInternals(grid);
    const first = internals.request();
    expect(first?.request).toEqual({ sort: [], filters: [], search: '', page: { index: 0, size: 10 } });

    grid.setState({ columns: [{ field: 'age', width: 300 }] });
    expect(internals.request()).toBe(first);

    grid.refresh();
    expect(internals.request()?.version).toBe(1);
    expect(grid.loading()).toBe(true);
  });

  it('replaces or removes the filter of one field without touching others', () => {
    const grid = createDataGrid({ columns, data: people });
    grid.setFilter('age', { operator: 'gt', value: 22 });
    grid.setFilter('name', { operator: 'contains', value: '1' });
    grid.setFilter('age', { operator: 'lte', value: '21' });
    expect(grid.getState().filters).toEqual([
      { field: 'name', operator: 'contains', value: '1' },
      { field: 'age', operator: 'lte', value: 21 },
    ]);
    expect(grid.setFilter('age', { operator: 'contains', value: 'x' })).toHaveLength(1);
    grid.setFilter('name', null);
    expect(grid.getState().filters).toEqual([]);
    grid.setFilter('age', { operator: 'isEmpty' });
    grid.clearFilters();
    expect(grid.getState().filters).toEqual([]);
  });

  it('resizes and hides columns in place, keeping one visible', () => {
    const grid = createDataGrid({ columns, data: people });
    grid.setColumnWidth('age', 250);
    grid.setColumnWidth('id', 3);
    expect(grid.getState().columns).toEqual([
      { field: 'name', visible: true, width: 160 },
      { field: 'age', visible: true, width: 250 },
      { field: 'id', visible: true, width: 48 },
    ]);
    grid.setColumnVisible('name', false);
    grid.setColumnVisible('age', false);
    grid.setColumnVisible('id', false);
    expect(grid.visibleColumns().map((c) => c.field)).toEqual(['id']);
  });

  describe('selection', () => {
    it('does nothing without a selection mode', () => {
      const grid = createDataGrid({ columns, data: people });
      grid.toggleRow(people[0]);
      expect(grid.selectedCount()).toBe(0);
    });

    it('keeps one row in single mode', () => {
      const grid = createDataGrid({ columns, data: people, selection: 'single' });
      grid.toggleRow(people[0]);
      grid.toggleRow(people[1]);
      expect(grid.selectedRows()).toEqual([people[1]]);
      grid.selectAll();
      expect(grid.selectedCount()).toBe(1);
    });

    it('selects across filters, reports changes and survives sorting', () => {
      const changes: number[] = [];
      const grid = createDataGrid({ columns, data: people, selection: 'multi', onSelectionChange: (rows) => changes.push(rows.length) });
      const internals = _dataGridInternals(grid);

      grid.setFilter('age', { operator: 'equals', value: 20 });
      grid.selectAll();
      const matching = people.filter((p) => p.age === 20);
      expect(grid.selectedRows()).toEqual(matching);
      expect(internals.selectAllState()).toBe('all');

      grid.clearFilters();
      expect(internals.selectAllState()).toBe('some');
      grid.toggleSort('age');
      expect(grid.isSelected(matching[0])).toBe(true);

      grid.toggleRow(matching[0], false);
      grid.selectRows([people[1], people[2]]);
      expect(grid.selectedCount()).toBe(matching.length + 1);
      grid.clearSelection();
      expect(internals.selectAllState()).toBe('none');
      expect(changes).toEqual([matching.length, matching.length - 1, matching.length + 1, 0]);
    });

    it('uses rowKey so fresh copies of the data stay selected', () => {
      const data = signal<readonly Person[]>(people);
      const grid = createDataGrid({ columns, data, selection: 'multi', rowKey: (p) => p.id });
      grid.toggleRow(people[4]);
      data.set(people.map((p) => ({ ...p })));
      expect(grid.selectedRows()).toEqual([people[4]]);
      expect(grid.selectedRows()[0]).not.toBe(people[4]);
    });
  });

  describe('ask (AI)', () => {
    const reply = {
      sort: [{ field: 'age', direction: 'desc' }],
      filters: [{ field: 'age', operator: 'gte', values: ['25'] }],
      search: '',
      columns: [],
      explanation: 'People aged 25 or older, oldest first.',
    };

    it('sends the request to the handler, applies the reply and explains it', async () => {
      const complete = vi.fn().mockResolvedValue(reply);
      const grid = createDataGrid({ columns, data: people, ai: { complete } });
      expect(grid.aiEnabled).toBe(true);

      const pending = grid.ask('25 and up, oldest first');
      expect(grid.asking()).toBe(true);
      const result = await pending;

      expect(complete.mock.calls[0][0].prompt).toContain('25 and up, oldest first');
      expect(complete.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
      expect(result).toEqual({ status: 'applied', query: '25 and up, oldest first', explanation: reply.explanation, issues: [] });
      expect(grid.asking()).toBe(false);
      expect(grid.state().filters).toEqual([{ field: 'age', operator: 'gte', value: 25 }]);
      expect(grid.rows().every((p) => p.age >= 25)).toBe(true);
      expect(grid.lastAsk()).toBe(result);
    });

    it('reports invalid parts of the reply as issues and keeps the rest', async () => {
      const complete = vi.fn().mockResolvedValue({ ...reply, sort: [{ field: 'id', direction: 'asc' }] });
      const grid = createDataGrid({ columns, data: people, ai: { complete } });
      const result = await grid.ask('by id');
      expect(result.status).toBe('applied');
      expect(result.status === 'applied' && result.issues.map((i) => i.message)).toEqual(['Column "id" is not sortable.']);
      expect(grid.state().filters).toHaveLength(1);
    });

    it('undoes the answer while it is on screen; the result clears once the view changes', async () => {
      const grid = createDataGrid({ columns, data: people, ai: { complete: async () => reply } });
      grid.setSearch('Person 1');
      await grid.ask('q');
      grid.undoAsk();
      expect(grid.state().filters).toEqual([]);
      expect(grid.state().search).toBe('Person 1');
      expect(grid.lastAsk()).toBeNull();

      await grid.ask('q');
      grid.toggleSort('name');
      expect(grid.lastAsk()).toBeNull();
      grid.undoAsk(); // no-op: the answer is no longer on screen
      expect(grid.state().sort).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    it('turns handler failures and non-JSON replies into error results', async () => {
      const failing = createDataGrid({ columns, data: people, ai: { complete: () => Promise.reject(new Error('boom')) } });
      const result = await failing.ask('q');
      expect(result).toMatchObject({ status: 'error', query: 'q' });
      expect(result.status === 'error' && (result.error as Error).message).toBe('boom');
      expect(failing.lastAsk()).toBe(result);

      const garbled = createDataGrid({ columns, data: people, ai: { complete: async () => 'nope' } });
      expect((await garbled.ask('q')).status).toBe('error');
      expect(garbled.state().filters).toEqual([]);
    });

    it('cancels the request in flight when a new one starts or on dismissAsk()', async () => {
      const signals: AbortSignal[] = [];
      const complete = vi.fn((_req: unknown, { signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return new Promise((resolve) => setTimeout(() => resolve(reply), 0));
      });
      const grid = createDataGrid({ columns, data: people, ai: { complete } });
      const first = grid.ask('one');
      const second = grid.ask('two');
      expect(signals[0].aborted).toBe(true);
      expect(await first).toEqual({ status: 'cancelled', query: 'one' });
      expect((await second).status).toBe('applied');

      const third = grid.ask('three');
      grid.dismissAsk();
      expect(grid.asking()).toBe(false);
      expect(await third).toEqual({ status: 'cancelled', query: 'three' });
      expect(grid.lastAsk()).toBeNull();
    });

    it('is enabled by an API key (or a custom transport) and off without one', async () => {
      expect(createDataGrid({ columns, data: people, ai: { apiKey: 'sk-ant-test' } }).aiEnabled).toBe(true);
      expect(createDataGrid({ columns, data: people, ai: { apiKey: '  ' } }).aiEnabled).toBe(false);
      const grid = createDataGrid({ columns, data: people });
      expect(grid.aiEnabled).toBe(false);
      expect((await grid.ask('q')).status).toBe('error');
    });
  });
});
