import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  effect,
  inject,
  input,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';

import { DocumentEngineService, ParsedSpreadsheet, SpreadsheetCell, SpreadsheetSheet } from '../../../services/document-engine.service';
import { TableComponent } from '../../table/table.component';
import { createTable } from '../../table/table.helpers';
import { ColumnDefinition } from '../../table/table.types';
import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/** A spreadsheet row materialized into a plain record keyed by column id. */
type SpreadsheetRow = Record<string, unknown>;

/**
 * Renders `.xlsx` / `.xls` / `.xlsb` / `.ods` (and friends) by parsing
 * the bytes via the calamine-backed `document-wasm` bundle, then handing
 * each sheet's rows to `<hk-table>` for the actual rendering.
 *
 * Why hk-table instead of canvas / SVG? Tabular data displays best as a
 * scrollable grid with sort/filter/search — exactly what the existing
 * table component already does. Going through hk-table also reuses your
 * theme, virtualization, accessibility, and column visibility chrome.
 *
 * Per-sheet rendering is materialized into a `Record<string, unknown>[]`
 * because hk-table's column model is keyed by `StringKey<T>`. Cell
 * values are unwrapped from the tagged union into their primitive form
 * (Number → number, Date → Date object, Text → string, etc.). The first
 * row is treated as headers when it looks header-shaped (all text, no
 * blanks) — otherwise generic `Col A, Col B…` labels are generated.
 */
@Component({
  selector: 'hk-document-spreadsheet-renderer',
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Parsing spreadsheet…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else if (workbook(); as wb) {
      <div class="flex flex-col gap-3">
        @if (wb.sheets.length > 1) {
          <div role="tablist" class="tabs tabs-bordered overflow-x-auto">
            @for (sheet of wb.sheets; track sheet.name; let i = $index) {
              <button
                type="button"
                role="tab"
                class="tab"
                [class]="{ 'tab-active': i === activeSheetIndex() }"
                (click)="activeSheetIndex.set(i)"
              >
                {{ sheet.name }}
              </button>
            }
          </div>
        }

        @if (tableConfig(); as cfg) {
          <hk-table [config]="cfg" [data]="tableData()" />
        } @else {
          <div class="text-base-content/50 py-8 text-center text-sm">Sheet is empty.</div>
        }
      </div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentSpreadsheetRenderer {
  private readonly engine = inject(DocumentEngineService);
  /**
   * Component's own injector, captured here (a valid injection context).
   * Used to call `createTable()` inside a `computed()` — `createTable`
   * does `inject(PipeRegistryService)` internally, which needs an active
   * injection context to resolve, and `computed()` bodies don't establish
   * one on their own.
   */
  private readonly injector = inject(Injector);

  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly workbook = signal<ParsedSpreadsheet | null>(null);

  /** Index into `workbook().sheets`. Reset to 0 whenever a new workbook loads. */
  readonly activeSheetIndex = signal(0);

  /** Active sheet (or `null` if the workbook has no sheets at all). */
  private readonly activeSheet = computed<SpreadsheetSheet | null>(() => {
    const wb = this.workbook();
    if (!wb || wb.sheets.length === 0) return null;
    const i = Math.min(this.activeSheetIndex(), wb.sheets.length - 1);
    return wb.sheets[i] ?? null;
  });

  /** Materialized `hk-table` config for the active sheet. */
  readonly tableConfig = computed(() => {
    const sheet = this.activeSheet();
    if (!sheet || sheet.height === 0) return null;
    const { columns } = buildColumnsAndRows(sheet);
    if (columns.length === 0) return null;
    // FieldConfig doesn't accept a top-level `columns` array — column defs
    // are built internally from `visible` + `headers`. We project our pre-
    // computed columns into that shape so consumer ergonomics stay simple.
    const visible = columns.map((c) => c.field);
    const headers: Record<string, string> = {};
    for (const col of columns) headers[col.field] = col.header;
    return runInInjectionContext(this.injector, () =>
      createTable<SpreadsheetRow>({
        visible,
        headers,
        // Spreadsheets land read-only — no inline editing. A small page
        // size keeps the initial render snappy on wide sheets; search is
        // more useful than scrolling through 10k rows.
        globalSearch: { enabled: true },
        pagination: { mode: 'offset', pageSize: 50 },
      }),
    );
  });

  /** Materialized row data for the active sheet. */
  readonly tableData = computed<readonly SpreadsheetRow[]>(() => {
    const sheet = this.activeSheet();
    if (!sheet || sheet.height === 0) return [];
    return buildColumnsAndRows(sheet).rows;
  });

  constructor() {
    effect(() => {
      const src = this.source();
      // Reset to first sheet whenever the source changes.
      untracked(() => {
        this.activeSheetIndex.set(0);
        void this.load(src);
      });
    });
  }

  private async load(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.workbook.set(null);
    try {
      const bytes = await loadSourceAsBytes(src);
      const parsed = await this.engine.parseSpreadsheet(bytes);
      this.workbook.set(parsed);
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to parse spreadsheet.');
    } finally {
      this.loading.set(false);
    }
  }
}

interface BuiltSheet {
  readonly columns: ColumnDefinition<SpreadsheetRow>[];
  readonly rows: readonly SpreadsheetRow[];
}

/**
 * Promote a sheet's first row to column headers when it looks header-
 * shaped (every cell is non-empty text). Otherwise generate generic
 * `A`, `B`, `C` … labels so the user still gets a usable grid.
 *
 * Cells are unwrapped from the tagged union into JS primitives:
 *   - `text`    → string
 *   - `number`  → number
 *   - `bool`    → boolean
 *   - `date`    → Date (created from the ms epoch)
 *   - `formula` → the formula string (with `=` prefix)
 *   - `error`   → the error code string
 *   - `empty`   → `null`
 */
function buildColumnsAndRows(sheet: SpreadsheetSheet): BuiltSheet {
  if (sheet.height === 0) return { columns: [], rows: [] };
  const width = Math.max(1, sheet.width);

  const headerSourceRow = sheet.rows[0] ?? [];
  const headersLookValid =
    headerSourceRow.length >= width && headerSourceRow.slice(0, width).every((c) => c.kind === 'text' && c.value.trim().length > 0);

  const headers: string[] = headersLookValid
    ? headerSourceRow.slice(0, width).map((c) => (c as Extract<SpreadsheetCell, { kind: 'text' }>).value)
    : Array.from({ length: width }, (_, i) => columnLetter(i));

  // Each column needs a stable JS identifier so `hk-table`'s `StringKey<T>`
  // constraint works. We use `col_0`, `col_1`, … so headers with spaces or
  // duplicates don't break record-key access.
  const fieldIds = headers.map((_, i) => `col_${i}`);

  const columns: ColumnDefinition<SpreadsheetRow>[] = fieldIds.map((field, i) => ({
    field,
    header: headers[i],
  }));

  const bodyStart = headersLookValid ? 1 : 0;
  const rows: SpreadsheetRow[] = [];
  for (let r = bodyStart; r < sheet.height; r++) {
    const sourceRow = sheet.rows[r] ?? [];
    const record: SpreadsheetRow = {};
    for (let c = 0; c < width; c++) {
      record[fieldIds[c]] = unwrapCell(sourceRow[c]);
    }
    rows.push(record);
  }

  return { columns, rows };
}

function unwrapCell(cell: SpreadsheetCell | undefined): unknown {
  if (!cell) return null;
  switch (cell.kind) {
    case 'empty':
      return null;
    case 'text':
      return cell.value;
    case 'number':
      return cell.value;
    case 'bool':
      return cell.value;
    case 'date':
      return new Date(cell.value);
    case 'formula':
      return `=${cell.value}`;
    case 'error':
      return cell.value;
  }
}

/**
 * Excel-style column lettering: 0 → A, 25 → Z, 26 → AA, etc. Used when
 * the first row doesn't look like headers, so users still get something
 * recognizable in the column heading.
 */
function columnLetter(idx: number): string {
  let n = idx;
  let out = '';
  while (true) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return out;
}
