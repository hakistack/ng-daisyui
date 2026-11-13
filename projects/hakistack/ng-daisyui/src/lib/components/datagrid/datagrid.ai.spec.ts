import { buildAiReplySchema, buildAiRequest, parseAiReply } from './datagrid.ai';
import { createInitialState } from './datagrid.state';
import type { DataGridColumn } from './datagrid.types';

interface Invoice {
  id: number;
  customer: string;
  amount: number;
  due: string;
  paid: boolean;
}

const columns: DataGridColumn<Invoice>[] = [
  { field: 'customer', header: 'Customer', description: 'Billed company' },
  { field: 'amount', header: 'Amount', type: 'number' },
  { field: 'due', header: 'Due', type: 'date', sortable: false },
  { field: 'paid', header: 'Paid', type: 'boolean', hidden: true },
];

const data: Invoice[] = [
  { id: 1, customer: 'Acme Corp', amount: 120, due: '2026-01-10', paid: true },
  { id: 2, customer: 'Globex', amount: 15000, due: '2026-03-01', paid: false },
  { id: 3, customer: 'Acme Corp', amount: 9.5, due: '2025-12-31', paid: false },
];

const state = createInitialState(columns, undefined, undefined).state;
const now = new Date(2026, 9, 13);

describe('buildAiRequest', () => {
  it('describes columns, operators, rules and today in the system prompt', () => {
    const { system } = buildAiRequest(columns, state, 'big ones', { now, context: 'AR invoices in USD' });
    expect(system).toContain('Today is 2026-10-13 (Tuesday).');
    expect(system).toContain('About this data: AR invoices in USD');
    expect(system).toContain('- customer (text) "Customer" [searchable] — Billed company');
    expect(system).toContain('- due (date) "Due" [not sortable]');
    expect(system).toContain('- paid (boolean) "Paid" [hidden]');
    expect(system).toContain('- number: equals, notEquals, gt, gte, lt, lte, between, in, notIn, isEmpty, isNotEmpty');
  });

  it('sends no row data unless sampleValues is set', () => {
    expect(buildAiRequest(columns, state, 'q', { now, data }).system).not.toContain('Acme');

    const { system } = buildAiRequest(columns, state, 'q', { now, data, sampleValues: 5 });
    expect(system).toContain('Values: "Acme Corp", "Globex"');
    expect(system).toContain('- amount (number) "Amount". Range: 9.5 to 15000');
    expect(system).toContain('Range: 2025-12-31 to 2026-03-01');
  });

  it('puts the current view and the request in the user message', () => {
    const current = { ...state, sort: [{ field: 'amount', direction: 'desc' as const }] };
    const { prompt } = buildAiRequest(columns, current, '  only Acme  ', { now });
    expect(prompt).toContain('"sort":[{"field":"amount","direction":"desc"}]');
    expect(prompt).toContain('"visibleColumns":["customer","amount","due"]');
    expect(prompt).toMatch(/<request>\nonly Acme\n<\/request>$/);
  });
});

describe('buildAiReplySchema', () => {
  it('is a closed object with every property required and no unions', () => {
    const schema = buildAiReplySchema(columns);
    const json = JSON.stringify(schema);
    expect(json).not.toContain('anyOf');
    expect(json).not.toContain('"minimum"');
    expect(schema['required']).toEqual(['sort', 'filters', 'search', 'columns', 'explanation']);
    const sortField = (schema['properties'] as any).sort.items.properties.field; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(sortField.enum).toEqual(['customer', 'amount', 'paid']);
  });
});

describe('parseAiReply', () => {
  const reply = {
    sort: [{ field: 'amount', direction: 'desc' }],
    filters: [
      { field: 'amount', operator: 'between', values: ['100', ''] },
      { field: 'customer', operator: 'in', values: ['Acme Corp', 'Globex'] },
      { field: 'due', operator: 'isEmpty', values: ['ignored'] },
      { field: 'paid', operator: 'equals', values: ['false'] },
    ],
    search: '',
    columns: [],
    explanation: ' Unpaid invoices over 100. ',
  };

  it('maps string values onto each operator shape', () => {
    const parsed = parseAiReply(reply, columns, state)!;
    expect(parsed.explanation).toBe('Unpaid invoices over 100.');
    expect(parsed.patch.filters).toEqual([
      { field: 'amount', operator: 'between', value: ['100', null] },
      { field: 'customer', operator: 'in', value: ['Acme Corp', 'Globex'] },
      { field: 'due', operator: 'isEmpty' },
      { field: 'paid', operator: 'equals', value: 'false' },
    ]);
    expect(parsed.patch.columns).toBeUndefined();
  });

  it('accepts JSON text and rejects non-objects', () => {
    expect(parseAiReply(JSON.stringify(reply), columns, state)?.patch.sort).toEqual(reply.sort);
    expect(parseAiReply('not json', columns, state)).toBeNull();
    expect(parseAiReply([1], columns, state)).toBeNull();
  });

  it('turns a column list into an explicit visibility patch', () => {
    const parsed = parseAiReply({ ...reply, columns: ['amount', 'customer', 'nope'] }, columns, state)!;
    expect(parsed.patch.columns).toEqual([
      { field: 'amount', visible: true },
      { field: 'customer', visible: true },
      { field: 'due', visible: false },
      { field: 'paid', visible: false },
    ]);
    expect(parsed.issues).toEqual([{ path: 'columns', message: 'Unknown column "nope".' }]);
  });
});
