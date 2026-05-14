import { computed, Signal } from '@angular/core';

import type { ColumnDefinition, ResolvedColspanCell, ResolvedFooterRow, RowGroup } from '../table.types';
import type { ColumnKind, TableHandle } from '../engine';
import { translateAggregate } from '../engine';
import { getAggregateSpec } from '../table-aggregates';

export interface FooterControllerDeps<T> {
  /** Pre-resolved footer-row definitions (built by `createTable`'s footerRows resolver). */
  readonly resolvedFooterRows: Signal<readonly ResolvedFooterRow<T>[]>;
  /** Column defs the table currently renders (after visibility / order). */
  readonly columnDefs: Signal<readonly ColumnDefinition<T>[]>;
  /** Ordered defs used by `getFooterCellValueForCol` to resolve a base column → def. */
  readonly orderedColumnDefs: Signal<readonly ColumnDefinition<T>[]>;
  /** Display column names (with utility prefixes like `select`, `actions_*`). */
  readonly displayedColumns: Signal<readonly string[]>;
  /** True when `fieldConfig.showFooter`. Gates the legacy single-row aggregate footer. */
  readonly showFooter: Signal<boolean>;
  /** True when any custom `<ng-template hkFooter>` directive is projected. */
  readonly hasFooterTemplateDirectives: Signal<boolean>;
  /** Engine deps for engine-routed aggregate evaluation. */
  readonly engineHandle: Signal<TableHandle<T> | null>;
  readonly engineSchemaKindMap: Signal<ReadonlyMap<string, ColumnKind> | null>;
  /** Currently-visible row indices into the original dataset, or `'unmappable'` (tree mode). */
  readonly displayIndices: Signal<Uint32Array | null | 'unmappable'>;
  /** Materialized current display data — used by the JS fallback path. */
  readonly displayData: Signal<readonly T[]>;
}

/**
 * Owns the footer rendering surface: legacy single-row aggregate footer
 * (`column.footer`), multi-row footers (`createTable({ footerRows: ... })`),
 * colspan cells, and the engine-routed aggregate evaluation that bypasses
 * the JS fallback when possible.
 *
 * Per-group footer values (rendered between grouped sections) live on the
 * GroupController already, since they read `group.rows` rather than the
 * display view. The one host-facing method that crosses both — group +
 * footer-row + column — stays here so the footer math lives in one place.
 */
export class FooterController<T> {
  // ─── Derived ──────────────────────────────────────────────────────────────

  /** True when any legacy `column.footer` aggregate is set AND `showFooter` is on. */
  readonly hasAggregateFooter: Signal<boolean>;
  /** True when `createTable({ footerRows: ... })` produced at least one row. */
  readonly hasFooterRows: Signal<boolean>;
  /** True when *any* footer surface is active — aggregate / rows / template directives. */
  readonly hasFooter: Signal<boolean>;
  /**
   * CDK multi-row footer column-name sets. Each footer row gets its own
   * prefixed column set (`__fr0_salary`, `__fr1_salary`, ...) so CDK can
   * render each row with its own `cdkFooterCellDef` and different content
   * per row. Colspan rows use a single synthetic column spanning full
   * width (`__cfr0`, ...).
   */
  readonly columnSets: Signal<string[][]>;

  constructor(private readonly deps: FooterControllerDeps<T>) {
    this.hasAggregateFooter = computed(() => deps.showFooter() && deps.columnDefs().some((col) => !!col.footer));

    this.hasFooterRows = computed(() => deps.resolvedFooterRows().length > 0);

    this.hasFooter = computed(() => this.hasFooterRows() || this.hasAggregateFooter() || deps.hasFooterTemplateDirectives());

    this.columnSets = computed(() => {
      const rows = deps.resolvedFooterRows();
      if (!rows.length) return [];
      const baseCols = deps.displayedColumns();
      return rows.map((row, i) => {
        if (row.colspanCells) return [`__cfr${i}`];
        return baseCols.map((col) => `__fr${i}_${col}`);
      });
    });
  }

  // ─── Per-cell value accessors (called from the template) ─────────────────

  /** Legacy single-row aggregate footer — value for a column's `footer` fn. */
  getFooterValue(column: ColumnDefinition<T>): string {
    if (!column.footer) return '';
    const engineResult = this.tryEngineAggregate(column.footer);
    if (engineResult !== null) return engineResult;
    return String(column.footer(this.deps.displayData()));
  }

  /** Multi-row footer — value for one cell of one row. */
  getFooterRowCellValue(row: ResolvedFooterRow<T>, column: ColumnDefinition<T>): string {
    const fn = row.cells[column.field];
    if (!fn) return '';
    const engineResult = this.tryEngineAggregate(fn);
    if (engineResult !== null) return engineResult;
    return fn(this.deps.displayData());
  }

  /** CDK column-name → footer cell value indirection. */
  getFooterCellValueForCol(rowIdx: number, baseCol: string): string {
    const footerRow = this.deps.resolvedFooterRows()[rowIdx];
    if (!footerRow || footerRow.colspanCells) return '';
    const column = this.deps.orderedColumnDefs().find((c) => c.field === baseCol);
    if (!column) return ''; // Special column (select, actions, etc.) — empty cell
    return this.getFooterRowCellValue(footerRow, column);
  }

  /** Colspan cell value at the table-wide level (uses display data). */
  getColspanCellValue(cell: ResolvedColspanCell): string {
    return cell.valueFn(this.deps.displayData());
  }

  /** Colspan cell value scoped to one group's rows. */
  getGroupColspanCellValue(cell: ResolvedColspanCell, group: RowGroup<T>): string {
    return cell.valueFn(group.rows);
  }

  /**
   * Per-group footer-row cell value. The group carries its own
   * `resolvedGroupFooterRows` (built once at config time), so we just need
   * to index into them with the row's column.
   */
  getGroupFooterRowCellValue(group: RowGroup<T>, footerRowIndex: number, column: ColumnDefinition<T>): string {
    const footerRow = group.resolvedGroupFooterRows?.[footerRowIndex];
    if (!footerRow) return '';
    const fn = footerRow.cells[column.field];
    if (!fn) return '';
    return fn(group.rows);
  }

  // ─── Private: engine-routed aggregate ─────────────────────────────────────

  /**
   * Engine-backed aggregate for a footer cell. Returns the formatted string
   * when the engine ran, `null` to signal the caller to fall back to JS.
   *
   * Routes through the engine only when:
   *   1. The footer function carries an `AggregateSpec` (was built via
   *      `aggregate(field, fn)`) — custom user functions stay on JS.
   *   2. The engine handle and schema kind-map are loaded.
   *   3. The agg fn + column kind combination is safe (per
   *      `translateAggregate`'s conservative rules).
   *   4. Visible rows map back to original-array indices (rules out
   *      tree-table mode).
   */
  private tryEngineAggregate(fn: unknown): string | null {
    const spec = getAggregateSpec<T>(fn);
    if (!spec) return null;

    const handle = this.deps.engineHandle();
    const kindMap = this.deps.engineSchemaKindMap();
    if (!handle || !kindMap) return null;

    const aggFn = translateAggregate<T>(spec.field, spec.fn, kindMap);
    if (!aggFn) return null;

    const indices = this.deps.displayIndices();
    if (indices === 'unmappable') return null;

    const result = handle.aggregate(spec.field, indices, aggFn);
    switch (result.kind) {
      case 'number':
      case 'count':
        return String(result.value);
      case 'date':
        return String(result.value); // ms-epoch — matches `Number(date)` JS behavior
      case 'none':
        return null; // empty input: let the JS path return `0`
    }
  }
}
