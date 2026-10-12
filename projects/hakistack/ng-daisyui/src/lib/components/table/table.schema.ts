import { Observable } from 'rxjs';

import { PipeFormatter } from '../../types/base-pipes.type';
import { AggregateFunction } from './table-aggregates';
import { ColumnDefinition, FieldConfig, FooterConfig } from './table.types';

/**
 * Declarative tables API — schema-first column map.
 *
 * The **recommended** way to configure `createTable`: a single `columns` *map* where the key is the field
 * (`keyof T`) and the value co-locates everything about that column. This replaces the projection style
 * (`visible: [...]` + the parallel `headers` / `formatters` / `fallbacks` / `footers` / `cellEditors` /
 * `columnWidths` maps), removes the repeated field keys, and — crucially — **infers the cell value type**:
 * `format` / `editValidator` / `footer` receive `T[K]` / `readonly T[]` instead of `unknown`.
 *
 * `data` is **not** part of `createTable` — it stays a reactive component input
 * (`<hk-table [data]="rows()" [config]="table" />`). The legacy projection config keeps working via overload.
 *
 * @example
 * const table = createTable<User>({
 *   columns: {
 *     name:   { header: 'Name' },
 *     email:  { header: 'Email', fallback: '—' },
 *     salary: { header: 'Salary', format: (value, row) => `$${value.toFixed(2)}` }, // value: number
 *     role:   { header: 'Role', editType: 'select', editOptions: [{ label: 'Admin', value: 'admin' }] },
 *   },
 *   pagination: { mode: 'offset', pageSize: 10 },
 * });
 */

/**
 * Per-column definition in the declarative `columns` map. Mirrors `ColumnDefinition<T>` but drops `field`
 * (it is the map key) and sharpens the cell-level callbacks to the column's own value type `T[K]`.
 */
export interface TableColumn<T, K extends keyof T = keyof T> extends Omit<
  ColumnDefinition<T>,
  'field' | 'header' | 'format' | 'editValidator' | 'footer'
> {
  /** Column heading. Defaults to a humanized version of the field key when omitted. */
  header?: string;
  /**
   * Cell formatter. Either a function receiving the **typed** cell value `T[K]` and the full row, or a
   * built-in pipe tuple (`['currency', 'USD']`, `['date', 'short']`) resolved through the PipeRegistry.
   */
  format?: ((value: T[K], row: T) => string | Observable<string>) | PipeFormatter;
  /** Inline-edit validator. Receives the **typed** proposed value `T[K]`. Return `true` or an error string. */
  editValidator?: (value: T[K], row: T) => boolean | string;
  /**
   * Column footer. Accepts the aggregate shorthand (`'sum'`, `{ fn: 'avg', label: 'Avg' }`) so the legacy
   * `footers` map migrates 1:1, or a custom function over the visible rows.
   */
  footer?: AggregateFunction | FooterConfig<T> | ((data: readonly T[]) => string | number);
  /** Column width in px (folds into the resolved `columnWidths`). */
  width?: number;
}

/** A `columns` map: keys are field names (`keyof T`), values are column definitions. Order = key order. */
export type ColumnsMap<T extends object> = {
  [K in keyof T]?: TableColumn<T, K>;
};

/**
 * Declarative `createTable` config. Same as `FieldConfig<T>` for all table-level options, but the column
 * projection (`visible` + the six parallel per-field maps) is replaced by a single typed `columns` map.
 */
export interface DeclarativeTableConfig<T extends object> extends Omit<
  FieldConfig<T>,
  'visible' | 'headers' | 'formatters' | 'fallbacks' | 'footers' | 'cellEditors' | 'columnWidths'
> {
  /** Column map — the property name is the field; order follows declaration order. */
  columns: ColumnsMap<T>;
}
