import { inject, isDevMode, signal, WritableSignal } from '@angular/core';

import { PipeRegistryService } from '../../services';
import { AGGREGATE_LABELS, AggregateFunction, computeAggregate } from './table-aggregates';
import {
  CellEditorConfig,
  ColspanFooterRowDef,
  ColumnDefinition,
  FieldConfig,
  FieldConfiguration,
  FlattenedRow,
  FooterCellDef,
  FooterColspanCellDef,
  FooterConfig,
  FooterRowDef,
  Formatter,
  GroupConfig,
  ResolvedColspanCell,
  ResolvedFooterRow,
  ResolvedGroupAggregates,
  RowGroup,
  StringKey,
  TableInstance,
  TreeTableConfig,
} from './table.types';

// ============================================================================
// Export Utilities (CSV & JSON)
// ============================================================================

/**
 * Exports table data to a CSV file and triggers a browser download.
 *
 * @param data - The rows to export.
 * @param columns - Column definitions used to determine headers and fields.
 * @param filename - Optional filename for the downloaded file. Defaults to 'export.csv'.
 */
export function exportToCsv<T extends object>(data: readonly T[], columns: readonly ColumnDefinition<T>[], filename?: string): void {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.field as keyof T];
        const str = value == null ? '' : String(value);
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, filename ?? 'export.csv', 'text/csv;charset=utf-8;');
}

/**
 * Exports table data to a JSON file and triggers a browser download.
 *
 * @param data - The rows to export.
 * @param columns - Column definitions used to determine which fields to include.
 * @param filename - Optional filename for the downloaded file. Defaults to 'export.json'.
 */
export function exportToJson<T extends object>(data: readonly T[], columns: readonly ColumnDefinition<T>[], filename?: string): void {
  const filtered = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.field] = row[col.field as keyof T];
    }
    return obj;
  });
  const json = JSON.stringify(filtered, null, 2);
  downloadFile(json, filename ?? 'export.json', 'application/json;charset=utf-8;');
}

/**
 * Creates a Blob from content and triggers a browser file download.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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

export function createTable<T extends object>(config: FieldConfig<T>): FieldConfiguration<T> {
  const normalizedConfig = createFieldConfig(config);

  const schema = buildColumnSchema(normalizedConfig);

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
  };

  controllerRegistry.set(controller, state);
  return controller;
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
    hasActions: config.hasActions ?? false,
    selectableRows: config.selectableRows ?? false,
    selectedRowClass: config.selectedRowClass,
    rowClass: config.rowClass,
    actions: config.actions ?? [],
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
 * Resolves footerRows config into pre-built value-computing functions per cell.
 * Returns undefined when no footerRows are configured.
 */
/**
 * Type guard to distinguish colspan-based footer rows from column-aligned ones.
 */
export function isColspanFooterRow<T>(row: FooterRowDef<T>): row is ColspanFooterRowDef<T> {
  return 'cells' in row && Array.isArray((row as ColspanFooterRowDef<T>).cells);
}

export function resolveFooterRows<T>(
  footerRows: FooterRowDef<T>[] | undefined,
  columns: ColumnDefinition<T>[],
): ResolvedFooterRow<T>[] | undefined {
  if (!footerRows || footerRows.length === 0) return undefined;

  // Build a map of column format functions for fallback formatting
  const columnFormatMap = new Map<string, ColumnDefinition<T>['format']>();
  for (const col of columns) {
    if (col.format) columnFormatMap.set(col.field, col.format);
  }

  return footerRows.map((rowDef) => {
    // Colspan-based footer row
    if (isColspanFooterRow(rowDef)) {
      return resolveColspanFooterRow<T>(rowDef, columnFormatMap);
    }

    // Column-aligned footer row (existing logic)
    const cells: Partial<Record<StringKey<T>, (data: readonly T[]) => string>> = {};

    for (const [colField, entry] of Object.entries(rowDef.columns) as [StringKey<T>, AggregateFunction | FooterCellDef<T>][]) {
      const isShorthand = typeof entry === 'string';
      const fn: AggregateFunction = isShorthand ? entry : entry.fn;
      const label = isShorthand ? AGGREGATE_LABELS[fn] : (entry.label ?? AGGREGATE_LABELS[fn]);
      const aggregateField = (!isShorthand && entry.field ? entry.field : colField) as Extract<keyof T, string>;
      const cellFormat = !isShorthand && entry.format ? entry.format : undefined;
      const customFn = !isShorthand && entry.custom ? entry.custom : undefined;
      const columnFormat = columnFormatMap.get(colField);

      cells[colField] = (data: readonly T[]): string => {
        // Full custom override
        if (customFn) {
          const raw = customFn(data);
          if (cellFormat) return label ? `${label}: ${cellFormat(Number(raw))}` : cellFormat(Number(raw));
          return label ? `${label}: ${raw}` : String(raw);
        }

        const value = computeAggregate(data, aggregateField, fn);

        // Format: cell-level format > column format fallback > plain number
        let formatted: string;
        if (cellFormat) {
          formatted = cellFormat(value);
        } else if (columnFormat) {
          const result = columnFormat(value, {} as T);
          formatted = typeof result === 'string' ? result : String(value);
        } else {
          formatted = String(value);
        }

        return label ? `${label}: ${formatted}` : formatted;
      };
    }

    return { cells, class: rowDef.class };
  });
}

/**
 * Resolves a colspan-based footer row into pre-built ResolvedColspanCell values.
 */
function resolveColspanFooterRow<T>(
  rowDef: ColspanFooterRowDef<T>,
  columnFormatMap: Map<string, ColumnDefinition<T>['format']>,
): ResolvedFooterRow<T> {
  const colspanCells: ResolvedColspanCell[] = rowDef.cells.map((cellDef) => {
    const colspan = cellDef.colspan ?? 1;
    const valueFn = buildColspanValueFn<T>(cellDef, columnFormatMap);
    return { colspan, valueFn, class: cellDef.class };
  });

  return { cells: {}, class: rowDef.class, colspanCells };
}

/**
 * Builds a value function for a single colspan cell definition.
 */
function buildColspanValueFn<T>(
  cellDef: FooterColspanCellDef<T>,
  columnFormatMap: Map<string, ColumnDefinition<T>['format']>,
): (data: readonly unknown[]) => string {
  const { fn, label, field, format: cellFormat, custom: customFn } = cellDef;

  // Spacer cell: no fn and no custom → empty or label-only
  if (!fn && !customFn) {
    return () => label ?? '';
  }

  return (data: readonly unknown[]): string => {
    // Full custom override
    if (customFn) {
      const raw = customFn(data as readonly T[]);
      if (cellFormat) return label ? `${label}: ${cellFormat(Number(raw))}` : cellFormat(Number(raw));
      return label ? `${label}: ${raw}` : String(raw);
    }

    // Aggregate with fn
    const aggregateField = (field ?? '') as Extract<keyof T, string>;
    const value = computeAggregate(data as readonly T[], aggregateField, fn!);
    const resolvedLabel = label ?? AGGREGATE_LABELS[fn!];

    // Format: cell-level format > column format fallback > plain number
    let formatted: string;
    if (cellFormat) {
      formatted = cellFormat(value);
    } else if (field && columnFormatMap.has(field)) {
      const colFmt = columnFormatMap.get(field)!;
      const result = colFmt(value, {} as T);
      formatted = typeof result === 'string' ? result : String(value);
    } else {
      formatted = String(value);
    }

    return resolvedLabel ? `${resolvedLabel}: ${formatted}` : formatted;
  };
}

/**
 * Resolves group-level aggregate configuration (caption + group footer rows)
 * into pre-built value-computing functions per cell.
 */
export function resolveGroupAggregates<T>(
  groupConfig: GroupConfig<T> | undefined,
  columns: ColumnDefinition<T>[],
): ResolvedGroupAggregates<T> | undefined {
  if (!groupConfig) return undefined;

  const hasCaptions = groupConfig.captionAggregates != null;
  const hasGroupFooters = groupConfig.groupFooterRows != null && groupConfig.groupFooterRows.length > 0;

  if (!hasCaptions && !hasGroupFooters) return undefined;

  const result: ResolvedGroupAggregates<T> = {};

  if (hasCaptions) {
    const resolved = resolveFooterRows([groupConfig.captionAggregates!], columns);
    if (resolved && resolved.length > 0) {
      result.resolvedCaptionCells = resolved[0].cells;
    }
  }

  if (hasGroupFooters) {
    result.resolvedGroupFooterRows = resolveFooterRows(groupConfig.groupFooterRows!, columns);
  }

  return result;
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

// ============================================================================
// Tree Table Utilities
// ============================================================================

/**
 * Generates a unique key for a row based on available properties.
 * Priority: getRowKey function > TreeNode.key > row.id > JSON hash
 */
export function generateRowKey<T>(row: T, getRowKey?: (row: T) => string, index?: number): string {
  // 1. Use custom getRowKey function if provided
  if (getRowKey) {
    return getRowKey(row);
  }

  const record = row as Record<string, unknown>;

  // 2. Use TreeNode.key if available
  if ('key' in record && typeof record['key'] === 'string') {
    return record['key'];
  }

  // 3. Use row.id if available
  if ('id' in record && (typeof record['id'] === 'string' || typeof record['id'] === 'number')) {
    return String(record['id']);
  }

  // 4. Fallback to index-based key or JSON hash
  if (index !== undefined) {
    return `__tree_row_${index}`;
  }

  // 5. Generate a hash from JSON (last resort)
  try {
    return `__hash_${hashCode(JSON.stringify(row))}`;
  } catch {
    return `__unknown_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Simple hash code function for string.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets children from a row based on the configured property name.
 */
export function getRowChildren<T>(row: T, childrenProperty: string): T[] | undefined {
  const record = row as Record<string, unknown>;
  const children = record[childrenProperty];

  if (Array.isArray(children)) {
    return children as T[];
  }

  return undefined;
}

/**
 * Checks if a row has children.
 */
export function rowHasChildren<T>(row: T, childrenProperty: string): boolean {
  const children = getRowChildren(row, childrenProperty);
  return !!children && children.length > 0;
}

// ============================================================================
// Row Grouping Utilities
// ============================================================================

/**
 * Groups data by a field and computes aggregates per group.
 * Single-pass O(n) grouping.
 */
export function groupData<T>(
  data: readonly T[],
  groupField: StringKey<T>,
  aggregateConfig?: Partial<Record<StringKey<T>, AggregateFunction>>,
  groupSortFn?: (a: unknown, b: unknown) => number,
  groupHeaderLabel?: (groupValue: unknown, rows: T[]) => string,
  initiallyExpanded = true,
  resolvedGroupAggregates?: ResolvedGroupAggregates<T>,
): RowGroup<T>[] {
  // Group rows by field value
  const groupMap = new Map<unknown, T[]>();
  for (const row of data) {
    const key = (row as Record<string, unknown>)[groupField];
    let group = groupMap.get(key);
    if (!group) {
      group = [];
      groupMap.set(key, group);
    }
    group.push(row);
  }

  // Build RowGroup array
  const groups: RowGroup<T>[] = [];
  for (const [groupValue, rows] of groupMap) {
    const aggregates: Record<string, number> = {};
    if (aggregateConfig) {
      for (const [field, fn] of Object.entries(aggregateConfig)) {
        if (fn) {
          aggregates[field] = computeAggregate(rows, field as StringKey<T>, fn as AggregateFunction);
        }
      }
    }

    const groupLabel = groupHeaderLabel ? groupHeaderLabel(groupValue, rows) : String(groupValue ?? 'Unknown');

    const group: RowGroup<T> = {
      groupValue,
      groupLabel,
      rows,
      aggregates,
      expanded: initiallyExpanded,
    };

    // Attach resolved group aggregates
    if (resolvedGroupAggregates?.resolvedCaptionCells) {
      group.resolvedCaptionCells = resolvedGroupAggregates.resolvedCaptionCells;
    }
    if (resolvedGroupAggregates?.resolvedGroupFooterRows) {
      group.resolvedGroupFooterRows = resolvedGroupAggregates.resolvedGroupFooterRows;
    }

    groups.push(group);
  }

  // Sort groups if custom sort provided
  if (groupSortFn) {
    groups.sort((a, b) => groupSortFn(a.groupValue, b.groupValue));
  }

  return groups;
}

/**
 * Flattens hierarchical tree data into a flat array for table display.
 * Only includes children of expanded rows.
 *
 * @param data - The hierarchical data array (root level items)
 * @param expandedKeys - Set of row keys that are currently expanded
 * @param getKey - Function to get unique key for a row
 * @param childrenProperty - Property name containing children
 * @param level - Current nesting level (internal use)
 * @param parentKey - Key of the parent row (internal use)
 * @returns Flattened array with level and hierarchy information
 */
export function flattenTreeData<T>(
  data: readonly T[],
  expandedKeys: Set<string>,
  getKey: (row: T, index: number) => string,
  childrenProperty: string,
  level = 0,
  parentKey: string | null = null,
  ancestorLastFlags: boolean[] = [],
): FlattenedRow<T>[] {
  const result: FlattenedRow<T>[] = [];

  data.forEach((row, index) => {
    const key = getKey(row, index);
    const children = getRowChildren(row, childrenProperty);
    const hasChildren = !!children && children.length > 0;
    const isLastChild = index === data.length - 1;

    // Add current row to result
    result.push({
      data: row,
      level,
      hasChildren,
      key,
      parentKey,
      isLastChild,
      ancestorLastFlags,
    });

    // If expanded and has children, recursively add children
    if (hasChildren && expandedKeys.has(key)) {
      const childRows = flattenTreeData(children!, expandedKeys, getKey, childrenProperty, level + 1, key, [
        ...ancestorLastFlags,
        isLastChild,
      ]);
      result.push(...childRows);
    }
  });

  return result;
}

/**
 * Filters tree data while preserving hierarchy.
 * When a child matches, its ancestors are kept visible.
 */
export function filterTreeData<T>(
  data: readonly T[],
  predicate: (row: T) => boolean,
  childrenProperty: string,
  mode: 'ancestors' | 'descendants' | 'both' | 'none',
): T[] {
  if (mode === 'none') {
    return data.filter((row) => predicate(row)) as T[];
  }

  return data.reduce<T[]>((result, row) => {
    const children = getRowChildren(row, childrenProperty);
    const selfMatches = predicate(row);

    if (mode === 'descendants' || mode === 'both') {
      if (selfMatches) {
        // Include this node with all its original children
        result.push(row);
        return result;
      }
    }

    if (children && children.length > 0) {
      const filteredChildren = filterTreeData(children, predicate, childrenProperty, mode);
      if (filteredChildren.length > 0) {
        // Clone the node with filtered children (ancestor kept because child matched)
        const cloned = { ...row } as Record<string, unknown>;
        cloned[childrenProperty] = filteredChildren;
        result.push(cloned as T);
        return result;
      }
    }

    if (selfMatches) {
      result.push(row);
    }

    return result;
  }, []);
}

/**
 * Sorts tree data recursively at each level.
 */
export function sortTreeData<T>(data: readonly T[], compareFn: (a: T, b: T) => number, childrenProperty: string): T[] {
  const sorted = [...data].sort(compareFn);

  return sorted.map((row) => {
    const children = getRowChildren(row, childrenProperty);
    if (children && children.length > 0) {
      const sortedChildren = sortTreeData(children, compareFn, childrenProperty);
      const cloned = { ...row } as Record<string, unknown>;
      cloned[childrenProperty] = sortedChildren;
      return cloned as T;
    }
    return row;
  });
}

/**
 * Collects all ancestor keys from a filtered tree for auto-expanding.
 */
export function collectAncestorKeys<T>(
  data: readonly T[],
  getKey: (row: T, index: number) => string,
  childrenProperty: string,
  keys: Set<string> = new Set(),
): Set<string> {
  data.forEach((row, index) => {
    const children = getRowChildren(row, childrenProperty);
    if (children && children.length > 0) {
      keys.add(getKey(row, index));
      collectAncestorKeys(children, getKey, childrenProperty, keys);
    }
  });
  return keys;
}
