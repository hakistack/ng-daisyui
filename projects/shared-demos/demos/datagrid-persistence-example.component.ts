import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  createDataGrid,
  DataGridComponent,
  DataGridController,
  DataGridState,
  DataGridStateIssue,
  DataGridStatePatch,
} from '@hakistack/ng-daisyui';

import { DocSectionComponent } from '../shared/doc-section.component';
import { generateInvoices, Invoice, INVOICE_COLUMNS, readStoredJson, writeStoredJson } from './datagrid-demo.data';

const STORAGE_KEY = 'hk-demo-datagrid-view';

/** DataGrid › Persistence: save the view to localStorage, restore it on load, reset. */
@Component({
  selector: 'app-datagrid-persistence-example',
  imports: [DataGridComponent, DocSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-section
      title="Save and restore the view"
      description="getState() returns the whole view — sort, filters, search, page and columns — as plain JSON, so you can keep it in localStorage, a URL or your backend. On load, pass it back through setState(): parts that no longer match the columns (a renamed field, an operator that changed type) are dropped and reported instead of breaking the page. Sort, filter, resize or hide columns, then Save and Simulate reload; Load an outdated view shows what happens when a saved view no longer matches the columns."
      [codeExample]="code"
    >
      <div class="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Saved view">
        <button type="button" class="btn btn-sm btn-primary" (click)="save()">Save view</button>
        <button type="button" class="btn btn-sm" [disabled]="!saved()" (click)="reload()">Simulate reload</button>
        <button type="button" class="btn btn-sm" (click)="grid().resetState()">Reset to defaults</button>
        <button type="button" class="btn btn-sm btn-ghost" [disabled]="!saved()" (click)="forget()">Forget saved view</button>
        <button type="button" class="btn btn-sm btn-outline btn-warning" (click)="saveOutdated()">Load an outdated view</button>
        <label class="label cursor-pointer gap-2">
          <input type="checkbox" class="toggle toggle-sm" [checked]="autoSave()" (change)="setAutoSave($event)" />
          <span class="label-text text-sm">Auto-save on every change</span>
        </label>
      </div>
      @if (message(); as text) {
        <p class="mb-2 text-sm text-base-content/80" role="status">{{ text }}</p>
      }
      @if (issues().length) {
        <ul class="mb-2 space-y-1 rounded-box border border-warning/30 bg-warning/10 p-3 text-xs" aria-label="Dropped from the saved view">
          @for (issue of issues(); track $index) {
            <li>
              <code>{{ issue.path }}</code> — {{ issue.message }}
            </li>
          }
        </ul>
      }

      <hk-datagrid [controller]="grid()" height="380px" />

      <div class="mt-3 grid gap-4 lg:grid-cols-2">
        <div class="min-w-0">
          <div class="mb-1 text-sm font-medium" id="dg-persist-current">Current state — getState()</div>
          <pre class="max-h-72 overflow-auto rounded-box bg-base-200 p-3 text-xs" aria-labelledby="dg-persist-current">{{
            currentJson()
          }}</pre>
        </div>
        <div class="min-w-0">
          <div class="mb-1 text-sm font-medium" id="dg-persist-saved">localStorage["{{ storageKey }}"]</div>
          <pre class="max-h-72 overflow-auto rounded-box bg-base-200 p-3 text-xs" aria-labelledby="dg-persist-saved">{{ savedJson() }}</pre>
        </div>
      </div>
    </app-doc-section>
  `,
})
export class DataGridPersistenceExampleComponent {
  readonly storageKey = STORAGE_KEY;
  private readonly invoices = generateInvoices(3_000);

  readonly saved = signal<unknown>(readStoredJson(STORAGE_KEY));
  readonly autoSave = signal(false);
  readonly issues = signal<DataGridStateIssue[]>([]);
  readonly message = signal('');

  /** "Simulate reload" replaces it with a new controller, created exactly as on a fresh page load. */
  readonly grid = signal<DataGridController<Invoice>>(this.createGrid());

  readonly currentJson = computed(() => JSON.stringify(this.grid().state(), null, 2));
  readonly savedJson = computed(() => (this.saved() ? JSON.stringify(this.saved(), null, 2) : '(nothing saved)'));

  /** What an app does once on load: build the grid, then apply the saved view and keep the issues. */
  private createGrid(): DataGridController<Invoice> {
    const grid = createDataGrid<Invoice>({
      columns: INVOICE_COLUMNS,
      data: this.invoices,
      pageSize: 25,
      search: true,
      rowKey: (r) => r.id,
      ariaLabel: 'Invoices (saved view)',
      onStateChange: (state) => {
        if (this.autoSave()) this.store(state);
      },
    });
    const saved = readStoredJson(STORAGE_KEY);
    if (saved) {
      const issues = grid.setState(saved as DataGridStatePatch);
      this.issues.set(issues);
      this.message.set(issues.length ? 'Saved view restored, with dropped parts listed below.' : 'Saved view restored.');
    } else {
      this.issues.set([]);
      this.message.set('No saved view: showing the defaults.');
    }
    return grid;
  }

  save(): void {
    this.store(this.grid().getState());
    this.message.set('View saved to localStorage.');
  }

  /** A view saved by an older version of the app: a renamed column and an operator that no longer fits. */
  saveOutdated(): void {
    const current = this.grid().getState();
    this.store({
      ...current,
      sort: [{ field: 'client', direction: 'asc' }],
      filters: [
        { field: 'amount', operator: 'contains', value: '5' },
        { field: 'status', operator: 'equals', value: 'overdue' },
      ],
    });
    this.reload();
  }

  reload(): void {
    this.grid.set(this.createGrid());
  }

  forget(): void {
    writeStoredJson(STORAGE_KEY, null);
    this.saved.set(null);
    this.issues.set([]);
    this.message.set('Saved view removed. The next load starts from the defaults.');
  }

  setAutoSave(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.autoSave.set(on);
    if (on) this.save();
  }

  private store(state: DataGridState): void {
    if (!writeStoredJson(STORAGE_KEY, state)) {
      this.message.set('Storage is blocked in this browser; the view could not be saved.');
      return;
    }
    this.saved.set(state);
  }

  readonly code = `const KEY = 'invoices-view';

grid = createDataGrid<Invoice>({
  columns,
  data: invoices,
  pageSize: 25,
  // Auto-save: called after every user or programmatic change
  onStateChange: (state) => localStorage.setItem(KEY, JSON.stringify(state)),
});

constructor() {
  // Restore once on load. Invalid parts are dropped and returned, never thrown.
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const issues = this.grid.setState(JSON.parse(saved));
    if (issues.length) console.warn('Saved view partly outdated', issues);
  }
  // (Alternative: createDataGrid({ initialState: savedView, … }) — then resetState()
  //  returns to the saved view instead of the column defaults.)
}

save(): void {
  localStorage.setItem(KEY, JSON.stringify(this.grid.getState()));
}

reset(): void {
  this.grid.resetState();   // back to the defaults from columns (+ initialState)
}`;
}
