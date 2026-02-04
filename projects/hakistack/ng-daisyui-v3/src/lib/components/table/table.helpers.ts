import { inject } from '@angular/core';

import { PipeRegistryService } from '../../services';
import { ColumnDefinition, FieldConfig, FieldConfiguration, Formatter } from './table.types';

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
  } as FieldConfig<T>;
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
