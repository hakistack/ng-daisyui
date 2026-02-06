import { inject } from '@angular/core';

import { PipeRegistryService } from '../../services';
import { ColumnDefinition, FieldConfig, FieldConfiguration, FlattenedRow, Formatter, TreeTableConfig } from './table.types';

// Cache for formatted headers to avoid repeated string processing
const headerFormatCache = new Map<string, string>();

export function createTable<T>(config: FieldConfig<T>): FieldConfiguration<T> {
  const normalizedConfig = createFieldConfig(config);

  const schema = buildColumnSchema(normalizedConfig);

  return { config: normalizedConfig, columns: schema };
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
    actions: config.actions ?? [],
    bulkActions: config.bulkActions ?? [],
    clearSelectionText: config.clearSelectionText,
    selectionHintText: config.selectionHintText,
    enableFiltering: config.enableFiltering ?? false,
    filters: config.filters ?? [],
    globalSearch: config.globalSearch,
    columnVisibility: config.columnVisibility,
    treeTable: config.treeTable ? normalizeTreeTableConfig(config.treeTable) : undefined,
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

  return fields.visible.map(key => {
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
    return value => (value === null || value === undefined ? '' : pipeRegistry.apply(value, formatter as readonly [string, ...unknown[]]));
  }

  return undefined;
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

  return data.map(item => {
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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
export function generateRowKey<T>(
  row: T,
  getRowKey?: (row: T) => string,
  index?: number,
): string {
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
    hash = ((hash << 5) - hash) + char;
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
): FlattenedRow<T>[] {
  const result: FlattenedRow<T>[] = [];

  data.forEach((row, index) => {
    const key = getKey(row, index);
    const children = getRowChildren(row, childrenProperty);
    const hasChildren = !!children && children.length > 0;

    // Add current row to result
    result.push({
      data: row,
      level,
      hasChildren,
      key,
      parentKey,
    });

    // If expanded and has children, recursively add children
    if (hasChildren && expandedKeys.has(key)) {
      const childRows = flattenTreeData(
        children!,
        expandedKeys,
        getKey,
        childrenProperty,
        level + 1,
        key,
      );
      result.push(...childRows);
    }
  });

  return result;
}
