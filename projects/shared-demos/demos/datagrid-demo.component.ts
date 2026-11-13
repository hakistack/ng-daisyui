import { Component, computed, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import {
  createDataGrid,
  DataGridColumn,
  DataGridComponent,
  DataGridPage,
  DataGridRequest,
  DataGridStateIssue,
  HkDataGridCellDirective,
} from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

interface Invoice {
  id: number;
  number: string;
  customer: string;
  region: string;
  amount: number;
  issued: string;
  due: string;
  status: 'paid' | 'open' | 'overdue';
  paid: boolean;
  [extra: `m${number}`]: number;
}

type ExampleTab = 'client' | 'server' | 'state' | 'ai';
type ApiTab = 'controller' | 'state' | 'types';

const CUSTOMERS = [
  'Acme Corp',
  'Globex',
  'Initech',
  'Umbrella',
  'Hooli',
  'Stark Industries',
  'Wayne Enterprises',
  'Soylent',
  'Tyrell',
  'Cyberdyne',
];
const REGIONS = ['North', 'South', 'East', 'West', 'Caribbean'];
const STATUSES: Invoice['status'][] = ['paid', 'open', 'overdue'];
const MONTHS = 24;

/** Deterministic pseudo-random data so the demo is identical across reloads. */
function generateInvoices(count: number): Invoice[] {
  let seed = 42;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const day = 86_400_000;
  const start = Date.UTC(2024, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const issued = start + Math.floor(rand() * 600) * day;
    const status = STATUSES[Math.floor(rand() * 3)];
    const invoice = {
      id: i + 1,
      number: `INV-${String(i + 1).padStart(6, '0')}`,
      customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
      region: REGIONS[Math.floor(rand() * REGIONS.length)],
      amount: Math.round(rand() * 2_000_000) / 100,
      issued: new Date(issued).toISOString().slice(0, 10),
      due: new Date(issued + 30 * day).toISOString().slice(0, 10),
      status,
      paid: status === 'paid',
    } as Invoice;
    for (let m = 1; m <= MONTHS; m++) invoice[`m${m}`] = Math.round(rand() * 10_000);
    return invoice;
  });
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const COLUMNS: DataGridColumn<Invoice>[] = [
  { field: 'number', header: 'Invoice', width: 130 },
  { field: 'customer', header: 'Customer', width: 180, description: 'Billed company' },
  { field: 'region', header: 'Region', width: 120, description: 'Sales region of the customer' },
  {
    field: 'amount',
    header: 'Amount',
    type: 'number',
    width: 130,
    format: (v) => currency.format(v as number),
    description: 'Invoice total in USD',
  },
  { field: 'issued', header: 'Issued', type: 'date', width: 120 },
  { field: 'due', header: 'Due', type: 'date', width: 120, description: 'Payment due date' },
  { field: 'status', header: 'Status', width: 110, description: 'paid, open or overdue' },
  { field: 'paid', header: 'Paid', type: 'boolean', width: 90, format: (v) => (v ? 'Yes' : 'No') },
  ...Array.from({ length: MONTHS }, (_, i) => ({
    field: `m${i + 1}`,
    header: `Month ${i + 1}`,
    type: 'number' as const,
    width: 110,
    searchable: false,
  })),
];

/** The demo keeps the key in this browser only; an app would pass `environment.anthropicApiKey`. */
const AI_KEY_STORAGE = 'hk-demo-anthropic-key';

function readStoredKey(): string {
  try {
    return localStorage.getItem(AI_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

const STATUS_BADGE: Record<Invoice['status'], string> = {
  paid: 'bg-success/10 border-success/20 text-success',
  open: 'bg-info/10 border-info/20 text-info',
  overdue: 'bg-error/10 border-error/20 text-error',
};

@Component({
  selector: 'app-datagrid-demo',
  imports: [DataGridComponent, HkDataGridCellDirective, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="DataGrid"
      description="Enterprise grid: row + column virtualization, multi-column sort, serializable state and server-side data"
      icon="table"
      category="Data Display"
      importName="DataGridComponent"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'client') {
          <app-doc-section
            title="100,000 rows × 32 columns"
            description="Client-side, virtualized in both directions. Sort: click a header (Shift+click adds a level). Column menu: ⋮ or Alt+↓ (sort, filter, hide, columns). Resize: drag the header edge, double-click to fit, or Alt+←/→. Select rows with the checkboxes or Space. Cell ranges: drag or Shift+arrows, Ctrl+A for all, Ctrl+C copies to Excel."
            [codeExample]="clientCode"
          >
            <hk-datagrid [controller]="clientGrid" height="520px">
              <ng-template hkDataGridCell="status" let-value>
                <span class="badge badge-sm border" [class]="statusClass(value)">{{ value }}</span>
              </ng-template>
            </hk-datagrid>
          </app-doc-section>
        }

        @if (activeTab() === 'server') {
          <app-doc-section
            title="Server-side data source"
            description="The grid sends its state (sort, filters, search, page) to the data source; superseded requests are aborted. This demo simulates a 400 ms API."
            [codeExample]="serverCode"
          >
            <hk-datagrid [controller]="serverGrid" height="460px" />
            <div class="mt-3 text-sm text-base-content/70">
              Last request: <code class="text-xs">{{ lastRequest() }}</code>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'state') {
          <app-doc-section
            title="State as JSON"
            description="The whole view is one serializable object. setState() validates any JSON against the columns, applies what is valid and returns issues for the rest — the contract the AI layer will build on."
            [codeExample]="stateCode"
          >
            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <hk-datagrid [controller]="stateGrid" height="460px" class="min-w-0" />
              <div class="flex min-w-0 flex-col gap-2">
                <label class="text-sm font-medium" for="dg-state-json">State patch (JSON)</label>
                <textarea
                  id="dg-state-json"
                  class="textarea textarea-bordered h-56 font-mono text-xs"
                  [value]="patchText()"
                  (input)="patchText.set($any($event.target).value)"
                ></textarea>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="btn btn-primary btn-sm" (click)="applyPatch()">Apply</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="loadExample()">Example</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="stateGrid.resetState(); issues.set([])">Reset</button>
                </div>
                @if (issues().length) {
                  <ul class="space-y-1 rounded-box border border-warning/30 bg-warning/10 p-3 text-xs" aria-label="Issues">
                    @for (issue of issues(); track $index) {
                      <li>
                        <code>{{ issue.path || '(root)' }}</code> — {{ issue.message }}
                      </li>
                    }
                  </ul>
                }
                <details class="text-xs">
                  <summary class="cursor-pointer text-sm font-medium">Current state</summary>
                  <pre class="mt-2 max-h-64 overflow-auto rounded-box bg-base-200 p-3">{{ currentState() }}</pre>
                </details>
              </div>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'ai') {
          <app-doc-section
            title="Ask AI"
            description="Describe the view in plain language (any language). Pass your Anthropic key in the grid config and the grid calls Claude itself: it sends the columns, operators and current view, Claude answers with structured output against the grid's schema, and the answer goes through the same setState() validation as any other input. Undo restores the previous view."
            [codeExample]="aiCode"
          >
            <div class="mb-3 flex flex-wrap items-end gap-2">
              <label class="flex min-w-0 flex-1 flex-col gap-1 text-sm" for="dg-ai-key">
                <span class="font-medium">Anthropic API key</span>
                <input
                  id="dg-ai-key"
                  type="password"
                  autocomplete="off"
                  class="input input-bordered input-sm w-full max-w-md"
                  placeholder="sk-ant-…"
                  [value]="aiKey()"
                  (change)="saveAiKey($any($event.target).value)"
                />
              </label>
              <span class="text-xs text-base-content/70"
                >Stored only in this browser. In your app: <code>apiKey: environment.anthropicApiKey</code></span
              >
            </div>
            <hk-datagrid [controller]="aiGrid()" height="520px">
              <ng-template hkDataGridCell="status" let-value>
                <span class="badge badge-sm border" [class]="statusClass(value)">{{ value }}</span>
              </ng-template>
            </hk-datagrid>
            @if (aiGrid().lastAsk()) {
              <details class="mt-3 text-xs">
                <summary class="cursor-pointer text-sm font-medium">Resulting state</summary>
                <pre class="mt-2 max-h-64 overflow-auto rounded-box bg-base-200 p-3">{{ aiState() }}</pre>
              </details>
            }
          </app-doc-section>
        }
      </div>

      <div api class="space-y-6">
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'controller'" (click)="apiTab.set('controller')">
            Controller
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'state'" (click)="apiTab.set('state')">Config</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>
        @if (apiTab() === 'controller') {
          <app-api-table title="DataGridController" [entries]="controllerDocs" />
        }
        @if (apiTab() === 'state') {
          <app-api-table title="DataGridConfig" [entries]="configDocs" />
          <app-api-table title="DataGridColumn" [entries]="columnDocs" />
        }
        @if (apiTab() === 'types') {
          <div class="card card-border card-bordered bg-base-100">
            <div class="card-body gap-3">
              <h3 class="card-title text-lg">DataGridState</h3>
              <app-code-block [code]="typesCode" />
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class DataGridDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'client') as ExampleTab);
  apiTab = signal<ApiTab>('controller');

  private readonly invoices = generateInvoices(100_000);

  readonly clientGrid = createDataGrid<Invoice>({
    columns: COLUMNS,
    data: this.invoices,
    search: true,
    selection: 'multi',
    ariaLabel: 'Invoices',
    rowKey: (r) => r.id,
  });

  readonly lastRequest = signal('—');
  readonly serverGrid = createDataGrid<Invoice>({
    columns: COLUMNS.slice(0, 8),
    pageSize: 50,
    search: true,
    ariaLabel: 'Invoices (server)',
    dataSource: (request, { signal }) => this.fakeApi(request, signal),
  });

  readonly stateGrid = createDataGrid<Invoice>({
    columns: COLUMNS.slice(0, 8),
    data: this.invoices.slice(0, 5_000),
    pageSize: 25,
    ariaLabel: 'Invoices (state demo)',
  });
  readonly aiKey = signal(readStoredKey());
  // Recreated when the key changes; an app passes its key once from the environment.
  readonly aiGrid = computed(() => {
    const apiKey = this.aiKey();
    return untracked(() => this.createAiGrid(apiKey));
  });
  private createAiGrid(apiKey: string) {
    return createDataGrid<Invoice>({
      columns: COLUMNS.slice(0, 8),
      data: this.invoices,
      search: true,
      ariaLabel: 'Invoices (AI)',
      rowKey: (r) => r.id,
      ai: {
        apiKey,
        sampleValues: 12,
        context: 'Accounts-receivable invoices. Amounts are USD; issued and due are ISO dates (YYYY-MM-DD).',
        suggestions: [
          'Overdue invoices from Acme over $10k, biggest first',
          'Facturas abiertas de la región Caribe que vencen en marzo 2025',
          'Only customer, amount and due date, soonest due first',
          'Unpaid invoices issued in Q1 2025 for Globex or Initech',
        ],
      },
    });
  }
  readonly aiState = computed(() => {
    const { sort, filters, search, columns } = this.aiGrid().state();
    return JSON.stringify({ sort, filters, search, visible: columns.filter((c) => c.visible).map((c) => c.field) }, null, 2);
  });

  readonly patchText = signal('');
  readonly issues = signal<DataGridStateIssue[]>([]);
  readonly currentState = computed(() => JSON.stringify(this.stateGrid.state(), null, 2));

  statusClass(status: unknown): string {
    return STATUS_BADGE[status as Invoice['status']] ?? '';
  }

  saveAiKey(value: string): void {
    const key = value.trim();
    this.aiKey.set(key);
    try {
      if (key) localStorage.setItem(AI_KEY_STORAGE, key);
      else localStorage.removeItem(AI_KEY_STORAGE);
    } catch {
      // Storage blocked: the key still works for this page view.
    }
  }

  loadExample(): void {
    this.patchText.set(
      JSON.stringify(
        {
          filters: [
            { field: 'status', operator: 'equals', value: 'overdue' },
            { field: 'amount', operator: 'gte', value: '5000' },
            { field: 'amount', operator: 'contains', value: '1' },
          ],
          sort: [
            { field: 'due', direction: 'asc' },
            { field: 'amount', direction: 'desc' },
          ],
          columns: [{ field: 'customer' }, { field: 'amount' }, { field: 'due' }, { field: 'issued', visible: false }],
        },
        null,
        2,
      ),
    );
  }

  applyPatch(): void {
    try {
      this.issues.set(this.stateGrid.setState(JSON.parse(this.patchText() || '{}')));
    } catch (err) {
      this.issues.set([{ path: '', message: `Invalid JSON: ${(err as Error).message}` }]);
    }
  }

  /** Simulated backend: same pipeline, applied "server-side", with latency and abort support. */
  private fakeApi(request: DataGridRequest, signal: AbortSignal): Promise<DataGridPage<Invoice>> {
    this.lastRequest.set(JSON.stringify(request));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const helper = createDataGrid<Invoice>({ columns: COLUMNS, data: this.invoices, pageSize: request.page?.size });
        helper.setState({ sort: request.sort, filters: request.filters, search: request.search, page: request.page });
        resolve({ rows: helper.rows(), total: helper.total() });
      }, 400);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }

  readonly clientCode = `grid = createDataGrid<Invoice>({
  columns: [
    { field: 'number', header: 'Invoice' },
    { field: 'customer', header: 'Customer', description: 'Billed company' },
    { field: 'amount', header: 'Amount', type: 'number', format: (v) => currency.format(v) },
    { field: 'due', header: 'Due', type: 'date' },
    { field: 'status', header: 'Status' },
  ],
  data: this.invoices,   // array or signal
  search: true,
});

<hk-datagrid [controller]="grid" height="520px">
  <ng-template hkDataGridCell="status" let-value>
    <span class="badge badge-sm">{{ value }}</span>
  </ng-template>
</hk-datagrid>`;

  readonly serverCode = `grid = createDataGrid<Invoice>({
  columns,
  pageSize: 50,
  dataSource: (request, { signal }) =>
    // request = { sort, filters, search, page }
    this.http.post<DataGridPage<Invoice>>('/api/invoices/query', request),
    // or: fetch(url, { method: 'POST', body: JSON.stringify(request), signal }).then((r) => r.json())
});`;

  readonly stateCode = `const issues = grid.setState({
  filters: [{ field: 'status', operator: 'equals', value: 'overdue' }],
  sort: [{ field: 'due', direction: 'asc' }],
});
// issues: [] when everything was valid, otherwise { path, message }[]

grid.getState();      // serializable DataGridState — persist it as a saved view
grid.stateSchema();   // JSON Schema of a valid state for these columns`;

  readonly aiCode = `// npm install @anthropic-ai/sdk   (optional peer, loaded only when AI is used)
grid = createDataGrid<Invoice>({
  columns,
  data: this.invoices,
  ai: {
    apiKey: environment.anthropicApiKey,   // no key → no AI box
    // model: 'claude-opus-5-5',           // default
    sampleValues: 12,   // share frequent values so "Acme" matches "Acme Corp" (default 0)
    suggestions: ['Overdue invoices from Acme over $10k, biggest first'],
  },
});

grid.ask('only the open ones');   // also callable from code; never rejects
grid.undoAsk();`;

  readonly typesCode = `interface DataGridState {
  sort: { field: string; direction: 'asc' | 'desc' }[];   // priority order
  filters: { field: string; operator: FilterOperator; value?: unknown }[];  // AND
  search: string;
  page: { index: number; size: number } | null;         // null = unpaginated
  columns: { field: string; visible: boolean; width: number }[];  // display order
}`;

  readonly controllerDocs: ApiDocEntry[] = [
    { name: 'state', type: 'Signal<DataGridState>', description: 'Current state (single source of truth).' },
    { name: 'rows / total', type: 'Signal<readonly T[]> / Signal<number>', description: 'Current view and matching row count.' },
    { name: 'getState()', type: '() => DataGridState', description: 'Snapshot of the state.' },
    {
      name: 'setState(patch)',
      type: '(DataGridStatePatch) => DataGridStateIssue[]',
      description: 'Validate and apply a partial state; returns issues for dropped parts.',
    },
    { name: 'resetState()', type: '() => void', description: 'Back to the initial state.' },
    { name: 'stateSchema()', type: '() => JSON Schema', description: 'JSON Schema for a valid state over these columns.' },
    {
      name: 'toggleSort(field, additive?)',
      type: '(string, boolean) => void',
      description: 'asc → desc → off; additive keeps other sort keys.',
    },
    { name: 'setSearch / setPage / setPageSize', type: 'methods', description: 'Convenience setters.' },
    { name: 'setData(rows)', type: '(readonly T[]) => void', description: 'Replace client-side rows.' },
    { name: 'refresh()', type: '() => void', description: 'Re-run the server request.' },
    {
      name: 'ask(query)',
      type: '(string) => Promise<DataGridAskResult>',
      description: 'Natural language → state with Claude. Cancels the request in flight; never rejects.',
    },
    {
      name: 'asking / lastAsk',
      type: 'Signal<boolean> / Signal<DataGridAskResult | null>',
      description: 'Request in flight; last answer while still on screen.',
    },
    { name: 'undoAsk() / dismissAsk()', type: '() => void', description: 'Restore the view from before the answer / cancel and clear.' },
  ];

  readonly configDocs: ApiDocEntry[] = [
    { name: 'columns', type: 'DataGridColumn<T>[]', description: 'Column definitions.' },
    { name: 'data', type: 'readonly T[] | Signal<readonly T[]>', description: 'Client-side rows (or bind [data]).' },
    { name: 'dataSource', type: '(request, { signal }) => Promise | Observable', description: 'Server-side mode.' },
    { name: 'pageSize', type: 'number', description: 'Enables pagination. Omit to virtualize every row.' },
    { name: 'pageSizeOptions', type: 'number[]', default: '[25, 50, 100]', description: 'Footer page-size choices.' },
    { name: 'rowHeight', type: 'number', default: '36', description: 'Fixed row height in px.' },
    { name: 'search', type: 'boolean', default: 'false', description: 'Show the quick-search box.' },
    { name: 'rowKey', type: '(row) => string | number', description: 'Stable row identity.' },
    { name: 'initialState', type: 'DataGridStatePatch', description: 'Initial sort/filters/columns/page.' },
    { name: 'onStateChange', type: '(state) => void', description: 'Called after every state change.' },
    {
      name: 'ai',
      type: '{ apiKey, model?, sampleValues?, context?, suggestions?, complete? }',
      description: 'Enables the AI box and ask() with your Anthropic key. complete() replaces the built-in Claude call (custom transport).',
    },
    { name: 'ariaLabel', type: 'string', description: 'Accessible name of the grid.' },
  ];

  readonly columnDocs: ApiDocEntry[] = [
    { name: 'field / header', type: 'string', description: 'Column id (default accessor) and header text.' },
    {
      name: 'type',
      type: "'text' | 'number' | 'date' | 'boolean'",
      default: "'text'",
      description: 'Drives sort, filter operators, alignment and the schema.',
    },
    { name: 'value', type: '(row) => unknown', description: 'Custom accessor.' },
    { name: 'format', type: '(value, row) => string', description: 'Display formatter.' },
    { name: 'width / minWidth', type: 'number', description: 'Width in px.' },
    { name: 'sortable / filterable / searchable', type: 'boolean', description: 'Per-column capabilities.' },
    { name: 'hidden', type: 'boolean', description: 'Start hidden.' },
    { name: 'description', type: 'string', description: 'Header tooltip and schema hint for the AI layer.' },
  ];
}
