import { inject, isDevMode, signal, WritableSignal } from '@angular/core';

import { PipeRegistryService } from '../../services';
import { AGGREGATE_LABELS, AggregateFunction, computeAggregate } from '../../grid-core/grid-aggregates';
import {
  CellEditorConfig,
  ColumnDefinition,
  FieldConfig,
  FieldConfiguration,
  FooterConfig,
  Formatter,
  StringKey,
  TableInstance,
  TreeTableConfig,
} from './table.types';
import { ColumnsMap, DeclarativeTableConfig, TableColumn } from './table.schema';
import { resolveFooterRows, resolveGroupAggregates } from '../../grid-core/grid.helpers';

// Cache for formatted headers to avoid repeated string processing
const headerFormatCache = new Map<string, string>();

// ============================================================================
// Controller plumbing (module-private)
// ============================================================================

/**
 * Per-controller runtime state. Kept out of the public FieldConfiguration interface
 * via a module-private WeakMap so consumers can't accidentally depend on it.
 */
interface InternalControllerState<T extends object> {
  readonly instances: WritableSignal<TableInstance<T>[]>;
  readonly namedInstances: Map<string, TableInstance<T>>;
  warnedEmpty: boolean;
}

// Keyed by the controller object itself. WeakMap → no leaks when a controller is GC'd.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const controllerRegistry = new WeakMap<FieldConfiguration<any>, InternalControllerState<any>>();

function warnEmpty<T extends object>(state: InternalControllerState<T>): void {
  if (state.warnedEmpty || !isDevMode()) return;
  state.warnedEmpty = true;
  console.warn(
    '[ng-daisyui] TableController method called but no <hk-table> is currently attached. ' +
      'Either the table has not mounted yet (call from ngOnInit or later) or the controller is not bound to [config].',
  );
}

/**
 * @internal — called by TableComponent lifecycle hooks. Do not call from application code.
 * Not re-exported from public-api.ts.
 */
export function _attachTableInstance<T extends object>(
  cfg: FieldConfiguration<T> | null | undefined,
  instance: TableInstance<T>,
  id?: string,
): void {
  const state = cfg && controllerRegistry.get(cfg);
  if (!state) return;
  state.instances.update((list) => (list.includes(instance) ? list : [...list, instance]));
  if (id) state.namedInstances.set(id, instance);
}

/**
 * @internal — called by TableComponent lifecycle hooks. Do not call from application code.
 * Not re-exported from public-api.ts.
 */
export function _detachTableInstance<T extends object>(
  cfg: FieldConfiguration<T> | null | undefined,
  instance: TableInstance<T>,
  id?: string,
): void {
  const state = cfg && controllerRegistry.get(cfg);
  if (!state) return;
  state.instances.update((list) => list.filter((x) => x !== instance));
  if (id) state.namedInstances.delete(id);
}

// ============================================================================
// createTable
// ============================================================================

/**
 * Build a `<hk-table>` configuration with sensible defaults applied.
 *
 * Pass the result to the table component's `config` input. The return value also
 * exposes a `controller` signal — pass it to `[controller]` and you get
 * imperative APIs (sort, paginate, filter, select) plus access to grouped /
 * footer / master-detail state.
 *
 * @example Basic table
 * tableConfig = createTable<User>({
 *   columns: [
 *     { field: 'name', header: 'Name' },
 *     { field: 'email', header: 'Email' },
 *     { field: 'role', header: 'Role' },
 *   ],
 *   data: this.users(),
 *   pagination: { mode: 'offset', pageSize: 25 },
 * });
 *
 * @example With sorting, search, inline editing
 * tableConfig = createTable<Product>({
 *   columns: [
 *     { field: 'name', header: 'Name' },
 *     { field: 'price', header: 'Price', editable: true, editType: 'number' },
 *     { field: 'stock', header: 'Stock', editable: true, editType: 'number',
 *       footer: (rows) => rows.reduce((s, r) => s + r.stock, 0) },
 *   ],
 *   data: this.products(),
 *   sortable: true,
 *   globalSearch: { enabled: true },
 *   enableInlineEditing: true,
 *   showFooter: true,
 * });
 *
 * @example Tree table with bulk actions
 * tableConfig = createTable<Folder>({
 *   columns: [{ field: 'name', header: 'Folder' }],
 *   data: this.folders(),
 *   treeTable: { enabled: true, childrenProperty: 'children', expandAll: false },
 *   bulkActions: [{ id: 'delete', label: 'Delete', handler: this.deleteMany }],
 * });
 *
 * @returns A `FieldConfiguration` containing the resolved config plus a
 *          `controller` signal to forward to the table component.
 */
// Overloads: declarative `columns` map and legacy projection config (`visible` + parallel maps).
// The two are mutually exclusive — each requires a property the other omits — so resolution is unambiguous.
// Legacy is listed last so `Parameters<typeof createTable<T>>[0]` resolves to `FieldConfig<T>` (back-compat).
export function createTable<T extends object>(config: DeclarativeTableConfig<T>): FieldConfiguration<T>;
export function createTable<T extends object>(config: FieldConfig<T>): FieldConfiguration<T>;
export function createTable<T extends object>(config: FieldConfig<T> | DeclarativeTableConfig<T>): FieldConfiguration<T> {
  const declarative = isColumnsMap((config as { columns?: unknown }).columns);
  const baseConfig = declarative ? declarativeToFieldConfig(config as DeclarativeTableConfig<T>) : (config as FieldConfig<T>);

  const normalizedConfig = createFieldConfig(baseConfig);

  const schema = buildColumnSchema(normalizedConfig);

  // Overlay the rich per-column props that `buildColumnSchema` does not read (sticky, filter, resizable,
  // min/maxWidth, reorderable, a flat editType, and a function-valued footer). Nothing is lost.
  if (declarative) {
    overlayRichColumnProps(schema, (config as DeclarativeTableConfig<T>).columns);
  }

  // Resolve multi-row footer
  const resolvedFooterRows = resolveFooterRows(normalizedConfig.footerRows, schema);

  // Auto-enable showFooter when footerRows has entries
  if (resolvedFooterRows && resolvedFooterRows.length > 0) {
    (normalizedConfig as { showFooter: boolean }).showFooter = true;
  }

  // Resolve group-level aggregates (caption + group footer rows)
  const resolvedGroupAggregates = resolveGroupAggregates(normalizedConfig.grouping, schema);

  // --- Controller state ---
  const state: InternalControllerState<T> = {
    instances: signal<TableInstance<T>[]>([]),
    namedInstances: new Map(),
    warnedEmpty: false,
  };

  const forward =
    <K extends keyof TableInstance<T>>(method: K) =>
    (...args: unknown[]): void => {
      const target = state.instances()[0];
      if (!target) {
        warnEmpty(state);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (target[method] as (...a: any[]) => unknown).apply(target, args);
    };

  const controller: FieldConfiguration<T> = {
    config: normalizedConfig,
    columns: schema,
    resolvedFooterRows,
    resolvedGroupAggregates,
    childGrid: normalizedConfig.childGrid,
    masterDetail: normalizedConfig.masterDetail,

    get: (id: string) => state.namedInstances.get(id),

    applyColumnFilter: forward('applyColumnFilter') as FieldConfiguration<T>['applyColumnFilter'],
    removeFilter: forward('removeFilter') as FieldConfiguration<T>['removeFilter'],
    clearAllFilters: forward('clearAllFilters') as FieldConfiguration<T>['clearAllFilters'],
    firstPage: forward('firstPage') as FieldConfiguration<T>['firstPage'],
    previousPage: forward('previousPage') as FieldConfiguration<T>['previousPage'],
    nextPage: forward('nextPage') as FieldConfiguration<T>['nextPage'],
    lastPage: forward('lastPage') as FieldConfiguration<T>['lastPage'],
    gotoPage: forward('gotoPage') as FieldConfiguration<T>['gotoPage'],
    sort: forward('sort') as FieldConfiguration<T>['sort'],
    clearSelection: forward('clearSelection') as FieldConfiguration<T>['clearSelection'],
    clearGlobalSearch: forward('clearGlobalSearch') as FieldConfiguration<T>['clearGlobalSearch'],
    toggleColumnVisibility: forward('toggleColumnVisibility') as FieldConfiguration<T>['toggleColumnVisibility'],
    showAllColumns: forward('showAllColumns') as FieldConfiguration<T>['showAllColumns'],
    hideAllColumns: forward('hideAllColumns') as FieldConfiguration<T>['hideAllColumns'],
    resetColumnVisibility: forward('resetColumnVisibility') as FieldConfiguration<T>['resetColumnVisibility'],
    expandAllRows: forward('expandAllRows') as FieldConfiguration<T>['expandAllRows'],
    collapseAllRows: forward('collapseAllRows') as FieldConfiguration<T>['collapseAllRows'],
    expandToLevel: forward('expandToLevel') as FieldConfiguration<T>['expandToLevel'],
    collapseToLevel: forward('collapseToLevel') as FieldConfiguration<T>['collapseToLevel'],
    expandAllDetails: forward('expandAllDetails') as FieldConfiguration<T>['expandAllDetails'],
    collapseAllDetails: forward('collapseAllDetails') as FieldConfiguration<T>['collapseAllDetails'],
    setPagination: forward('setPagination') as FieldConfiguration<T>['setPagination'],
  };

  controllerRegistry.set(controller, state);
  return controller;
}

// ── Declarative `columns` map → FieldConfig conversion ───────────────────────

/** A declarative config carries a `columns` *map* (plain object), never an array. */
function isColumnsMap(columns: unknown): columns is ColumnsMap<object> {
  return typeof columns === 'object' && columns !== null && !Array.isArray(columns);
}

/** Props on a `TableColumn` that `buildColumnSchema` already understands (handled via the parallel maps). */
const SCHEMA_HANDLED_COLUMN_PROPS = new Set([
  'header',
  'format',
  'fallback',
  'footer',
  'editType',
  'editOptions',
  'editValidator',
  'width',
]);

/**
 * Decompose the declarative `columns` map into the legacy `FieldConfig` shape so the existing
 * `createFieldConfig` → `buildColumnSchema` pipeline (pipe formatters, footer aggregates, default headers,
 * cellEditor merge) can be reused verbatim. Rich props that `buildColumnSchema` ignores are overlaid later.
 */
function declarativeToFieldConfig<T extends object>(config: DeclarativeTableConfig<T>): FieldConfig<T> {
  const { columns, ...rest } = config;
  const keys = Object.keys(columns) as (keyof T)[];

  const headers: Partial<Record<StringKey<T>, string>> = {};
  const formatters: Partial<Record<StringKey<T>, Formatter<T>>> = {};
  const fallbacks: Partial<Record<StringKey<T>, string>> = {};
  const footers: NonNullable<FieldConfig<T>['footers']> = {};
  const cellEditors: Partial<Record<StringKey<T>, CellEditorConfig>> = {};
  const columnWidths: Partial<Record<StringKey<T>, number>> = {};

  for (const key of keys) {
    const col = columns[key] as TableColumn<T> | undefined;
    if (!col) continue;
    const k = key as StringKey<T>;

    if (col.header !== undefined) headers[k] = col.header;
    if (col.format !== undefined) formatters[k] = col.format as Formatter<T>;
    if (col.fallback !== undefined) fallbacks[k] = col.fallback;
    if (col.width !== undefined) columnWidths[k] = col.width;

    // Aggregate / FooterConfig footers go through buildColumnSchema; function footers are overlaid later.
    if (col.footer !== undefined && typeof col.footer !== 'function') {
      footers[k] = col.footer;
    }

    // Any inline-edit prop maps to a cell editor so buildColumnSchema marks the column editable and wires the
    // validator. `editType` defaults to `'text'` (same default as `ColumnDefinition.editType`) so that
    // `{ editValidator }` or `{ editOptions }` on their own are not silently dropped.
    if (col.editType !== undefined || col.editOptions !== undefined || col.editValidator !== undefined) {
      cellEditors[k] = {
        type: col.editType ?? 'text',
        options: col.editOptions,
        validator: col.editValidator as CellEditorConfig['validator'],
      };
    }
  }

  return {
    ...(rest as Omit<FieldConfig<T>, 'visible' | 'headers' | 'formatters' | 'fallbacks' | 'footers' | 'cellEditors' | 'columnWidths'>),
    visible: keys as StringKey<T>[],
    headers,
    formatters,
    fallbacks,
    footers,
    cellEditors,
    columnWidths,
  };
}

/**
 * Copy the per-column props that `buildColumnSchema` does not read from the declarative map onto the resolved
 * column schema: `sticky`, `filter`, `resizable`, `minWidth`, `maxWidth`, `reorderable`, and a
 * function-valued `footer`. (`header` / `format` / `fallback` / aggregate-`footer` / `editType*` / `width`
 * were already resolved by the pipeline.)
 */
function overlayRichColumnProps<T extends object>(schema: ColumnDefinition<T>[], columns: ColumnsMap<T>): void {
  for (const column of schema) {
    const col = columns[column.field as keyof T] as TableColumn<T> | undefined;
    if (!col) continue;

    const target = column as unknown as Record<string, unknown>;
    const source = col as unknown as Record<string, unknown>;
    for (const prop of Object.keys(col)) {
      if (SCHEMA_HANDLED_COLUMN_PROPS.has(prop)) continue;
      target[prop] = source[prop];
    }

    // Function-valued footer wasn't handled by buildColumnSchema — apply it directly.
    if (typeof col.footer === 'function') {
      column.footer = col.footer as ColumnDefinition<T>['footer'];
    }
  }
}

/**
 * Ensures that all optional fields in the FieldConfig object are filled with default values.
 * This prevents undefined errors when consuming the config.
 *
 * @param config - The initial field configuration object.
 * @returns A complete FieldConfig object with defaults applied.
 */
function createFieldConfig<T>(config: FieldConfig<T>): FieldConfig<T> {
  return {
    visible: config.visible,
    hidden: config.hidden ?? [],
    headers: config.headers ?? {},
    formatters: config.formatters ?? {},
    fallbacks: config.fallbacks ?? {},
    hasSelection: config.hasSelection ?? false,
    selectionLimit: config.selectionLimit,
    isRowSelectable: config.isRowSelectable,
    hasActions: config.hasActions ?? false,
    selectableRows: config.selectableRows ?? false,
    selectedRowClass: config.selectedRowClass,
    rowClass: config.rowClass,
    actions: config.actions ?? [],
    actionsPosition: config.actionsPosition ?? 'end',
    actionsLabel: config.actionsLabel,
    startActionsLabel: config.startActionsLabel,
    endActionsLabel: config.endActionsLabel,
    bulkActions: config.bulkActions ?? [],
    clearSelectionText: config.clearSelectionText,
    selectionHintText: config.selectionHintText,
    enableFiltering: config.enableFiltering ?? false,
    filters: config.filters ?? [],
    globalSearch: config.globalSearch,
    columnVisibility: config.columnVisibility,
    treeTable: config.treeTable ? normalizeTreeTableConfig(config.treeTable) : undefined,
    stickyColumns: config.stickyColumns ?? {},
    enableColumnResizing: config.enableColumnResizing ?? false,
    columnWidths: config.columnWidths ?? {},
    resizeMode: config.resizeMode ?? 'expand',
    virtualScroll: config.virtualScroll,
    enableInlineEditing: config.enableInlineEditing ?? false,
    cellEditors: config.cellEditors ?? {},
    showFooter: config.showFooter ?? false,
    footers: config.footers ?? {},
    footerRows: config.footerRows,
    expandableDetail: config.expandableDetail ?? !!config.childGrid,
    expandMode: config.expandMode ?? 'multi',
    enableKeyboardNavigation: config.enableKeyboardNavigation ?? false,
    enableColumnReorder: config.enableColumnReorder ?? false,
    enableRowReorder: config.enableRowReorder ?? false,
    showDragHandle: config.showDragHandle ?? true,
    grouping: config.grouping,
    childGrid: config.childGrid,
    masterDetail: config.masterDetail,
    labels: config.labels,
    filterLabels: config.filterLabels,
    pagination: config.pagination,
  } as FieldConfig<T>;
}

/**
 * Normalizes tree table config with default values.
 */
function normalizeTreeTableConfig<T>(config: TreeTableConfig<T>): TreeTableConfig<T> {
  return {
    enabled: config.enabled,
    childrenProperty: config.childrenProperty ?? 'children',
    initialExpandedKeys: config.initialExpandedKeys ?? [],
    expandAll: config.expandAll ?? false,
    getRowKey: config.getRowKey,
    indentSize: config.indentSize ?? 24,
    treeColumnIndex: config.treeColumnIndex ?? 0,
    showIndentGuides: config.showIndentGuides ?? true,
    filterHierarchyMode: config.filterHierarchyMode ?? 'ancestors',
    initialExpandLevel: config.initialExpandLevel,
    checkboxCascade: config.checkboxCascade ?? 'none',
  };
}

/**
 * Builds a column schema from the given field configuration, applying header formatting and pipe formatters.
 * Optimized to reduce function calls and improve type safety.
 *
 * @param fields - The field configuration containing visible fields, headers, formatters, and fallbacks.
 * @returns An array of ColumnDefinition objects to be used in a table.
 */
function buildColumnSchema<T>(fields: FieldConfig<T>): ColumnDefinition<T>[] {
  const pipeRegistry = inject(PipeRegistryService);

  return fields.visible.map((key) => {
    const keyStr = String(key);
    const formatter = fields.formatters?.[key];
    const header = fields.headers?.[key] ?? getFormattedHeader(keyStr);

    const columnDef: ColumnDefinition<T> = {
      field: key,
      header,
      fallback: fields.fallbacks?.[key],
    };

    // Only add format function if formatter exists
    const formatFunction = createFormatFunction(formatter, pipeRegistry);
    if (formatFunction) {
      columnDef.format = formatFunction;
    }

    // Merge cellEditors config into column definition
    const editorConfig = fields.cellEditors?.[key as StringKey<T>] as CellEditorConfig | undefined;
    if (editorConfig) {
      columnDef.editable = true;
      columnDef.editType = editorConfig.type;
      columnDef.editOptions = editorConfig.options;
      columnDef.editValidator = editorConfig.validator as ColumnDefinition<T>['editValidator'];
    }

    // Merge footers config into column definition
    const footerEntry = fields.footers?.[key as StringKey<T>];
    if (footerEntry) {
      columnDef.footer = createFooterFunction<T>(footerEntry, key, columnDef.format);
    }

    return columnDef;
  });
}

/**
 * Creates a format function based on the formatter type.
 * Extracted for better testability and reusability.
 */
function createFormatFunction<T>(formatter: Formatter<T> | undefined, pipeRegistry: PipeRegistryService): ColumnDefinition<T>['format'] {
  if (!formatter) {
    return undefined;
  }

  if (typeof formatter === 'function') {
    return formatter as ColumnDefinition<T>['format'];
  }

  if (Array.isArray(formatter)) {
    // Pass the formatter tuple directly to apply - it handles [pipeName, options?] format
    // Return early for null/undefined values to avoid pipe errors
    return (value) =>
      value === null || value === undefined ? '' : pipeRegistry.apply(value, formatter as readonly [string, ...unknown[]]);
  }

  return undefined;
}

/**
 * Creates a footer function from the footers config entry.
 * Applies the column's existing format function to the aggregate value, and prepends a label.
 */
function createFooterFunction<T>(
  entry: AggregateFunction | FooterConfig<T>,
  columnField: StringKey<T>,
  columnFormat?: ColumnDefinition<T>['format'],
): (data: readonly T[]) => string | number {
  const fn: AggregateFunction = typeof entry === 'string' ? entry : entry.fn;
  const label = typeof entry === 'string' ? AGGREGATE_LABELS[fn] : (entry.label ?? AGGREGATE_LABELS[fn]);
  const aggregateField = (typeof entry === 'object' && entry.field ? entry.field : columnField) as Extract<keyof T, string>;

  return (data: readonly T[]) => {
    const value = computeAggregate(data, aggregateField, fn);

    // Apply the column's existing format function to the numeric result
    let formatted: string;
    if (columnFormat) {
      const result = columnFormat(value, {} as T);
      // Only use sync results (string), skip Observable
      formatted = typeof result === 'string' ? result : String(value);
    } else {
      formatted = String(value);
    }

    return label ? `${label}: ${formatted}` : formatted;
  };
}

/**
 * Projects only the configured `visible` and `hidden` fields from the input data array.
 * Optimized for better performance with large datasets.
 *
 * @param data - The full dataset.
 * @param config - The field configuration specifying which fields to include.
 * @returns A new array of objects with only the specified fields.
 */
export function projectFields<T extends object>(data: T[], config: FieldConfig<T>): T[] {
  if (data.length === 0) return [];

  const fields = new Set([...config.visible, ...(config.hidden ?? [])]);

  return data.map((item) => {
    const projected = {} as T;
    for (const field of fields) {
      if (field in item) {
        projected[field] = item[field];
      }
    }
    return projected;
  });
}

/**
 * Converts a field key (e.g., camelCase, snake_case, kebab-case) into a human-readable header string.
 * Uses memoization for better performance with repeated calls.
 *
 * @param field - The raw field key.
 * @returns A formatted string with capitalized words and spaces.
 */
function getFormattedHeader(field: string): string {
  const cached = headerFormatCache.get(field);
  if (cached) return cached;

  const formatted = formatHeader(field);
  headerFormatCache.set(field, formatted);
  return formatted;
}

/**
 * Internal header formatting logic.
 * Separated for easier testing and potential customization.
 */
function formatHeader(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
    .replace(/[-_]/g, ' ') // Replace hyphens/underscores
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Utility to clear the header format cache if needed (useful for testing or memory management).
 */
export function clearHeaderFormatCache(): void {
  headerFormatCache.clear();
}
