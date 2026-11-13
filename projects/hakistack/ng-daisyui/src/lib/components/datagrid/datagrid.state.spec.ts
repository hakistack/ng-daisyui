import { buildStateSchema, createInitialState, normalizeStatePatch } from './datagrid.state';
import type { DataGridColumn, DataGridState } from './datagrid.types';

interface Invoice {
  id: number;
  customer: string;
  amount: number;
  due: string;
  paid: boolean;
}

const columns: DataGridColumn<Invoice>[] = [
  { field: 'customer', header: 'Customer', description: 'Billing customer name' },
  { field: 'amount', header: 'Amount', type: 'number' },
  { field: 'due', header: 'Due', type: 'date' },
  { field: 'paid', header: 'Paid', type: 'boolean', sortable: false },
  { field: 'id', header: 'ID', type: 'number', filterable: false, hidden: true },
];

function base(pageSize?: number): DataGridState {
  return createInitialState(columns, pageSize, undefined).state;
}

describe('createInitialState', () => {
  it('derives column state from definitions', () => {
    const state = base();
    expect(state.page).toBeNull();
    expect(state.columns).toEqual([
      { field: 'customer', visible: true, width: 160 },
      { field: 'amount', visible: true, width: 120 },
      { field: 'due', visible: true, width: 160 },
      { field: 'paid', visible: true, width: 120 },
      { field: 'id', visible: false, width: 120 },
    ]);
  });

  it('applies a valid initialState and a page when paginated', () => {
    const { state, issues } = createInitialState(columns, 50, { sort: [{ field: 'amount', direction: 'desc' }] });
    expect(issues).toEqual([]);
    expect(state.sort).toEqual([{ field: 'amount', direction: 'desc' }]);
    expect(state.page).toEqual({ index: 0, size: 50 });
  });
});

describe('normalizeStatePatch', () => {
  it('rejects non-object patches without changing state', () => {
    const current = base();
    const { state, issues } = normalizeStatePatch('nope', current, columns);
    expect(state).toBe(current);
    expect(issues).toHaveLength(1);
  });

  it('reports unknown keys', () => {
    const { issues } = normalizeStatePatch({ grouping: [] }, base(), columns);
    expect(issues[0].path).toBe('grouping');
  });

  it('keeps valid sort keys and reports the rest', () => {
    const { state, issues } = normalizeStatePatch(
      {
        sort: [
          { field: 'amount', direction: 'desc' },
          { field: 'paid', direction: 'asc' },
          { field: 'nope', direction: 'asc' },
          { field: 'amount', direction: 'asc' },
          { field: 'due', direction: 'up' },
        ],
      },
      base(),
      columns,
    );
    expect(state.sort).toEqual([{ field: 'amount', direction: 'desc' }]);
    expect(issues.map((i) => i.path)).toEqual(['sort[1]', 'sort[2]', 'sort[3]', 'sort[4]']);
  });

  it('validates operators per column type and coerces values', () => {
    const { state, issues } = normalizeStatePatch(
      {
        filters: [
          { field: 'amount', operator: 'gte', value: '100' },
          { field: 'amount', operator: 'contains', value: '1' },
          { field: 'customer', operator: 'in', value: 'Acme' },
          { field: 'due', operator: 'between', value: ['2025-01-01', null] },
          { field: 'paid', operator: 'equals', value: 'false' },
          { field: 'customer', operator: 'isEmpty', value: 'ignored' },
          { field: 'id', operator: 'equals', value: 1 },
          { field: 'amount', operator: 'gt', value: 'lots' },
          { field: 'due', operator: 'between', value: [null, null] },
        ],
      },
      base(),
      columns,
    );
    expect(state.filters).toEqual([
      { field: 'amount', operator: 'gte', value: 100 },
      { field: 'customer', operator: 'in', value: ['Acme'] },
      { field: 'due', operator: 'between', value: ['2025-01-01', null] },
      { field: 'paid', operator: 'equals', value: false },
      { field: 'customer', operator: 'isEmpty' },
    ]);
    expect(issues.map((i) => i.path)).toEqual(['filters[1].operator', 'filters[6]', 'filters[7].value', 'filters[8].value']);
    expect(issues[0].message).toContain('gt');
  });

  it('resets the page index when sort, filters or search change', () => {
    const current = { ...base(25), page: { index: 3, size: 25 } };
    expect(normalizeStatePatch({ search: 'acme' }, current, columns).state.page).toEqual({ index: 0, size: 25 });
    expect(normalizeStatePatch({ columns: [] }, current, columns).state.page).toEqual({ index: 3, size: 25 });
    expect(normalizeStatePatch({ search: 'acme', page: { index: 2, size: 25 } }, current, columns).state.page).toEqual({
      index: 2,
      size: 25,
    });
  });

  it('validates the page and refuses one on an unpaginated grid', () => {
    expect(normalizeStatePatch({ page: { index: 1, size: 5000 } }, base(25), columns).state.page).toEqual({ index: 1, size: 25 });
    expect(normalizeStatePatch({ page: { index: -1 } }, base(25), columns).issues[0].path).toBe('page.index');
    const unpaginated = normalizeStatePatch({ page: { index: 1, size: 10 } }, base(), columns);
    expect(unpaginated.state.page).toBeNull();
    expect(unpaginated.issues[0].path).toBe('page');
  });

  it('reorders columns, merges partial entries and appends unlisted ones', () => {
    const { state } = normalizeStatePatch(
      {
        columns: [
          { field: 'amount', width: 10 },
          { field: 'customer', visible: false },
        ],
      },
      base(),
      columns,
    );
    expect(state.columns.map((c) => c.field)).toEqual(['amount', 'customer', 'due', 'paid', 'id']);
    expect(state.columns[0]).toEqual({ field: 'amount', visible: true, width: 48 });
    expect(state.columns[1].visible).toBe(false);
  });

  it('keeps at least one column visible', () => {
    const { state, issues } = normalizeStatePatch({ columns: columns.map((c) => ({ field: c.field, visible: false })) }, base(), columns);
    expect(state.columns[0].visible).toBe(true);
    expect(issues.some((i) => i.path === 'columns')).toBe(true);
  });
});

describe('buildStateSchema', () => {
  it('enumerates fields and restricts operators per column', () => {
    const schema = buildStateSchema(columns, true) as {
      properties: Record<string, { items?: { anyOf?: { properties: { field: { const: string }; operator: { enum: string[] } } }[] } }>;
      description: string;
    };
    const variants = schema.properties['filters'].items!.anyOf!;
    expect(variants.map((v) => v.properties.field.const)).toEqual(['customer', 'amount', 'due', 'paid']);
    expect(variants[1].properties.operator.enum).toContain('between');
    expect(variants[0].properties.operator.enum).not.toContain('gt');
    expect(schema.description).toContain('Billing customer name');
  });

  it('describes page as null for unpaginated grids', () => {
    const schema = buildStateSchema(columns, false) as { properties: Record<string, unknown> };
    expect(schema.properties['page']).toEqual({ type: 'null' });
  });
});
