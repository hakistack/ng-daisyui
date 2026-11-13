import type {
  ColspanFooterRowDef,
  ColumnDefinition,
  FlattenedRow,
  FooterCellDef,
  FooterColspanCellDef,
  FooterRowDef,
  GroupConfig,
  ResolvedColspanCell,
  ResolvedFooterRow,
  ResolvedGroupAggregates,
  RowGroup,
  StringKey,
} from './grid.types';
import { AGGREGATE_LABELS, AggregateFunction, computeAggregate } from './grid-aggregates';

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

// ============================================================================
// Footer & Group Aggregate Resolution
// ============================================================================

/**
 * Type guard to distinguish colspan-based footer rows from column-aligned ones.
 */
export function isColspanFooterRow<T>(row: FooterRowDef<T>): row is ColspanFooterRowDef<T> {
  return 'cells' in row && Array.isArray((row as ColspanFooterRowDef<T>).cells);
}

/**
 * Resolves footerRows config into pre-built value-computing functions per cell.
 * Returns undefined when no footerRows are configured.
 */
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
 * Path-encoding sentinels for multi-level group expansion state.
 * NUL between segments + a stable representation of `null` / `undefined` so
 * those keys round-trip cleanly through a string Set.
 */
const PATH_SEP = '\u0000';
const PATH_NULL = '\u0001NULL';
const PATH_UNDEF = '\u0001UNDEF';

/** Encode a group path to a stable string key for use in Sets / Maps. */
export function encodeGroupPath(path: readonly unknown[]): string {
  return path.map((v) => (v === null ? PATH_NULL : v === undefined ? PATH_UNDEF : String(v))).join(PATH_SEP);
}

/**
 * Groups data by one or more fields and computes aggregates per group.
 *
 * - Pass a single field for backwards-compatible single-level grouping
 *   (every returned `RowGroup` has `children = []`).
 * - Pass an array for nested multi-level grouping. The result is a tree:
 *   each non-leaf node carries its sub-groups in `children`, and `rows` at
 *   every depth holds the union of all descendant rows so per-level footer
 *   aggregates compose without re-walking.
 *
 * Single-pass O(n × depth). At each level groups appear in first-seen order;
 * an optional `groupSortFn` reorders within every level.
 */
export function groupData<T>(
  data: readonly T[],
  groupField: StringKey<T> | readonly StringKey<T>[],
  aggregateConfig?: Partial<Record<StringKey<T>, AggregateFunction>>,
  groupSortFn?: (a: unknown, b: unknown) => number,
  groupHeaderLabel?: (groupValue: unknown, rows: T[]) => string,
  initiallyExpanded = true,
  resolvedGroupAggregates?: ResolvedGroupAggregates<T>,
): RowGroup<T>[] {
  const fields: readonly StringKey<T>[] = Array.isArray(groupField) ? groupField : [groupField as StringKey<T>];
  if (fields.length === 0) return [];

  // Working tree shape — each node carries its child bucket map alongside
  // its child list so insertion is O(depth) hash probes per row.
  type WorkingNode = {
    groupValue: unknown;
    rows: T[];
    children: WorkingNode[];
    bucket: Map<unknown, number>;
  };

  const roots: WorkingNode[] = [];
  const rootBucket = new Map<unknown, number>();

  for (const row of data) {
    let nodes = roots;
    let bucket = rootBucket;
    for (let level = 0; level < fields.length; level++) {
      const key = (row as Record<string, unknown>)[fields[level]];
      let pos = bucket.get(key);
      if (pos === undefined) {
        pos = nodes.length;
        bucket.set(key, pos);
        nodes.push({
          groupValue: key,
          rows: [],
          children: [],
          bucket: new Map<unknown, number>(),
        });
      }
      const node = nodes[pos];
      node.rows.push(row);
      nodes = node.children;
      bucket = node.bucket;
    }
  }

  // Finalize: convert WorkingNode → RowGroup with depth, path, label, aggregates.
  const finalize = (working: readonly WorkingNode[], parentPath: readonly unknown[]): RowGroup<T>[] => {
    const out: RowGroup<T>[] = [];
    for (const w of working) {
      const path: readonly unknown[] = [...parentPath, w.groupValue];
      const depth = path.length - 1;

      const aggregates: Record<string, number> = {};
      if (aggregateConfig) {
        for (const [field, fn] of Object.entries(aggregateConfig)) {
          if (fn) {
            aggregates[field] = computeAggregate(w.rows, field as StringKey<T>, fn as AggregateFunction);
          }
        }
      }

      const groupLabel = groupHeaderLabel ? groupHeaderLabel(w.groupValue, w.rows) : String(w.groupValue ?? 'Unknown');

      const group: RowGroup<T> = {
        groupValue: w.groupValue,
        groupLabel,
        path,
        depth,
        rows: w.rows,
        children: finalize(w.children, path),
        aggregates,
        expanded: initiallyExpanded,
      };

      if (resolvedGroupAggregates?.resolvedCaptionCells) {
        group.resolvedCaptionCells = resolvedGroupAggregates.resolvedCaptionCells;
      }
      if (resolvedGroupAggregates?.resolvedGroupFooterRows) {
        group.resolvedGroupFooterRows = resolvedGroupAggregates.resolvedGroupFooterRows;
      }

      out.push(group);
    }

    if (groupSortFn) {
      out.sort((a, b) => groupSortFn(a.groupValue, b.groupValue));
    }
    return out;
  };

  return finalize(roots, []);
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
