import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  effect,
  inject,
  input,
  runInInjectionContext,
  signal,
} from '@angular/core';

import { TableComponent } from '../../table/table.component';
import { createTable } from '../../table/table.helpers';
import { CellEditEvent, FieldConfiguration } from '../../table/table.types';
import { DocumentEditorInputs } from '../document-editor.types';
import { parseCsv, serializeCsv } from './csv.helpers';
import { loadTextSource } from './text-source.helper';

type CsvRow = Record<string, string>;

/**
 * CSV editor over the library's `hk-table` with inline cell editing. The
 * document model stays the canonical CSV **string**: the editor parses it into
 * rows for the grid, and on every cell edit re-serializes rows → CSV and pushes
 * that string through the `bridge` — so the Phase 0 `serializeText` round-trip
 * works unchanged and undo/redo flows through the shared command stack.
 *
 * `createTable` does `inject()` internally, so it must run inside an injection
 * context. Columns aren't known until the source decodes (async, outside the
 * constructor's context), so we rebuild the config with `runInInjectionContext`
 * after each load/reset.
 */
@Component({
  selector: 'hk-document-csv-editor',
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Loading…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else if (tableConfig(); as cfg) {
      <hk-table [config]="cfg" [data]="rows()" (cellEdit)="onCellEdit($event)" />
    } @else {
      <div class="text-base-content/50 py-8 text-center text-sm">Empty CSV — nothing to edit.</div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentCsvEditor implements OnDestroy {
  readonly source = input.required<DocumentEditorInputs['source']>();
  readonly format = input.required<DocumentEditorInputs['format']>();
  readonly filename = input.required<DocumentEditorInputs['filename']>();
  readonly bridge = input.required<DocumentEditorInputs['bridge']>();

  private readonly injector = inject(Injector);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<CsvRow[]>([]);
  readonly tableConfig = signal<FieldConfiguration<CsvRow> | null>(null);

  private columns: string[] = [];
  private unbindReset: (() => void) | null = null;

  constructor() {
    effect((onCleanup) => {
      const bridge = this.bridge();
      this.unbindReset = bridge.onReset((content) => this.applyCsv(asText(content)));
      onCleanup(() => this.unbindReset?.());
    });

    effect(() => {
      const src = this.source();
      void this.load(src);
    });
  }

  ngOnDestroy(): void {
    this.unbindReset?.();
  }

  onCellEdit(event: CellEditEvent<CsvRow>): void {
    const prevRows = this.rows();
    const idx = prevRows.indexOf(event.row);
    if (idx < 0) return;

    const nextRows = prevRows.map((r, i) => (i === idx ? { ...r, [event.field]: String(event.newValue ?? '') } : r));
    const prevCsv = serializeCsv(this.columns, prevRows);
    const nextCsv = serializeCsv(this.columns, nextRows);
    const bridge = this.bridge();

    bridge.stack.execute({
      label: 'Edit cell',
      do: () => {
        this.rows.set(nextRows);
        bridge.setContent(nextCsv);
      },
      undo: () => {
        this.rows.set(prevRows);
        bridge.setContent(prevCsv);
      },
    });
  }

  private async load(src: DocumentEditorInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const decoded = await loadTextSource(src);
      this.applyCsv(decoded);
      this.bridge().setInitial(decoded);
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load CSV.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Parse CSV text into the grid and (re)build the editable table config. */
  private applyCsv(text: string): void {
    const { columns, rows } = parseCsv(text);
    this.columns = [...columns];
    this.rows.set(rows.map((r) => ({ ...r })));

    if (columns.length === 0) {
      this.tableConfig.set(null);
      return;
    }

    const headers: Record<string, string> = {};
    const cellEditors: Record<string, { type: 'text' }> = {};
    for (const col of columns) {
      headers[col] = col;
      cellEditors[col] = { type: 'text' };
    }

    // createTable() injects internally — run it in the component's context.
    const config = runInInjectionContext(this.injector, () =>
      createTable<CsvRow>({ visible: [...columns], headers, enableInlineEditing: true, cellEditors }),
    );
    this.tableConfig.set(config);
  }
}

function asText(content: unknown): string {
  return typeof content === 'string' ? content : String(content ?? '');
}
