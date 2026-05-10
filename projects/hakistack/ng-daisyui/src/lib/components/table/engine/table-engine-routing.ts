/**
 * Helpers that translate the existing table component's filter/sort/column
 * shapes into the engine's wire types — and report when the engine cannot
 * service a particular operation, so the JS fallback runs instead.
 *
 * This is the only place that knows about both worlds. It's pure functions
 * so it stays unit-testable without spinning up the WASM.
 */

import type { AggregateFunction } from '../table-aggregates';
import type { ColumnDefinition, FilterConfig } from '../table.types';
import type { AggFn, ColumnKind, ColumnSchema, FilterDef, NumberOp, SortDef, TextOp, BoolOp, DateOp } from './table-engine.types';

/**
 * Index a schema array as `field → kind` for O(1) lookup. Both
 * `translateAggregate` and the table component's engine-routed search
 * call it per render — caching the Map removes the repeated linear scan.
 *
 * The component caches the result via a `computed` keyed on the schema
 * reference, so this is built once per ingest, not per keystroke.
 */
export function buildSchemaKindMap<T>(schema: readonly ColumnSchema<T>[]): Map<string, ColumnKind> {
  const map = new Map<string, ColumnKind>();
  for (const c of schema) map.set(c.field, c.kind);
  return map;
}

const SAMPLE_LIMIT = 64;

/**
 * Build an engine schema from the table's column definitions and a peek at
 * the data. Returns `null` if any column's type can't be determined (engine
 * sits out, JS fallback runs).
 */
export function inferEngineSchema<T>(columns: readonly ColumnDefinition<T>[], data: readonly T[]): ColumnSchema<T>[] | null {
  if (data.length === 0 || columns.length === 0) return null;

  const schema: ColumnSchema<T>[] = [];
  for (const col of columns) {
    const declared = col.filter?.type;
    const kind = declared ? mapDeclaredType(declared) : sampleInfer(data, col.field);
    if (!kind) return null; // unknown type ⇒ engine can't take this dataset
    schema.push({ field: col.field, kind });
  }
  return schema;
}

/**
 * Map the column's `FilterType` to the engine's narrower `ColumnKind`.
 * Range / select variants fold to their underlying type.
 */
function mapDeclaredType(t: NonNullable<NonNullable<ColumnDefinition<unknown>['filter']>['type']>): ColumnKind | null {
  switch (t) {
    case 'text':
      return 'text';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'bool';
    case 'numberRange':
      return 'number';
    case 'dateRange':
      return 'date';
    case 'select':
    case 'multiselect':
      // Select values are most often strings; if you need numeric/date
      // selects, declare `filter.type` explicitly. Treating as text matches
      // the JS implementation (`String(value).includes(...)`).
      return 'text';
    default:
      return null;
  }
}

function sampleInfer<T>(data: readonly T[], field: keyof T & string): ColumnKind | null {
  // Walk the first SAMPLE_LIMIT rows; pick the kind matching the first
  // non-null value. Bail if a later row produces a conflicting type.
  let observed: ColumnKind | null = null;
  const limit = Math.min(SAMPLE_LIMIT, data.length);
  for (let i = 0; i < limit; i++) {
    const v = (data[i] as Record<string, unknown>)[field];
    if (v == null) continue;
    const kind = typeOfValue(v);
    if (kind === null) return null;
    if (observed === null) observed = kind;
    else if (observed !== kind) return null;
  }
  return observed;
}

function typeOfValue(v: unknown): ColumnKind | null {
  switch (typeof v) {
    case 'boolean':
      return 'bool';
    case 'number':
      return Number.isFinite(v) ? 'number' : null;
    case 'string':
      return 'text';
    case 'object':
      if (v instanceof Date) return 'date';
      return null;
    default:
      return null;
  }
}

// ─── Filter translation ─────────────────────────────────────────────────────

/**
 * Convert the table's `FilterConfig` shape into the engine's `FilterDef`.
 * Returns `null` when the filter's value or shape can't be expressed in the
 * engine kernel (caller falls back to JS for that operation).
 */
export function translateFilter<T>(filter: FilterConfig<T>, schema: readonly ColumnSchema<T>[]): FilterDef<T> | null {
  const col = schema.find((s) => s.field === filter.field);
  if (!col) return null;

  // Resolve the filter's *intended* kind. The filter itself may carry a type
  // (numberRange / dateRange need that hint); otherwise use the column's kind.
  const filterKind = filter.type ? mapDeclaredType(filter.type) : col.kind;
  if (!filterKind) return null;

  switch (filterKind) {
    case 'text':
      return translateText(filter, filter.field);
    case 'number':
      return translateNumber(filter, filter.field);
    case 'bool':
      return translateBool(filter, filter.field);
    case 'date':
      return translateDate(filter, filter.field, filter.type === 'dateRange');
  }
}

function translateText<T>(f: FilterConfig<T>, field: keyof T & string): FilterDef<T> | null {
  const op = textOp(f);
  if (!op) return null;
  return { kind: 'text', field, op };
}

function textOp<T>(f: FilterConfig<T>): TextOp | null {
  if (f.operator === 'isEmpty') return { kind: 'isEmpty' };
  if (f.operator === 'isNotEmpty') return { kind: 'isNotEmpty' };
  const needle = stringOf(f.value);
  if (needle == null) return null;
  switch (f.operator) {
    case 'contains':
      return { kind: 'contains', needle };
    case 'startsWith':
      return { kind: 'startsWith', needle };
    case 'endsWith':
      return { kind: 'endsWith', needle };
    case 'equals':
      return { kind: 'equals', needle };
    case 'notEquals':
      return { kind: 'notEquals', needle };
    case 'notContains':
      return { kind: 'notContains', needle };
    default:
      return null;
  }
}

function translateNumber<T>(f: FilterConfig<T>, field: keyof T & string): FilterDef<T> | null {
  const op = numberOp(f);
  if (!op) return null;
  return { kind: 'number', field, op };
}

function numberOp<T>(f: FilterConfig<T>): NumberOp | null {
  if (f.operator === 'isEmpty') return { kind: 'isEmpty' };
  if (f.operator === 'isNotEmpty') return { kind: 'isNotEmpty' };

  if (f.operator === 'between') {
    const range = numberRange(f.value);
    return range ? { kind: 'between', lo: range[0], hi: range[1] } : null;
  }
  if (f.operator === 'in' || f.operator === 'notIn') {
    if (!Array.isArray(f.value)) return null;
    const values = (f.value as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n));
    if (values.length === 0) return null;
    return f.operator === 'in' ? { kind: 'in', values } : { kind: 'notIn', values };
  }

  const value = Number(f.value);
  if (!Number.isFinite(value)) return null;
  switch (f.operator) {
    case 'equals':
      return { kind: 'eq', value };
    case 'notEquals':
      return { kind: 'notEq', value };
    case 'gt':
      return { kind: 'gt', value };
    case 'lt':
      return { kind: 'lt', value };
    case 'gte':
      return { kind: 'gte', value };
    case 'lte':
      return { kind: 'lte', value };
    default:
      return null;
  }
}

function translateBool<T>(f: FilterConfig<T>, field: keyof T & string): FilterDef<T> | null {
  if (f.operator === 'isEmpty') return { kind: 'bool', field, op: { kind: 'isEmpty' } };
  if (f.operator === 'isNotEmpty') return { kind: 'bool', field, op: { kind: 'isNotEmpty' } };
  if (f.operator !== 'equals') return null;
  const value = booleanOf(f.value);
  if (value == null) return null;
  return { kind: 'bool', field, op: { kind: 'eq', value } };
}

function translateDate<T>(f: FilterConfig<T>, field: keyof T & string, isRange: boolean): FilterDef<T> | null {
  const op = dateOp(f, isRange);
  if (!op) return null;
  return { kind: 'date', field, op };
}

function dateOp<T>(f: FilterConfig<T>, isRange: boolean): DateOp | null {
  if (f.operator === 'isEmpty') return { kind: 'isEmpty' };
  if (f.operator === 'isNotEmpty') return { kind: 'isNotEmpty' };

  if (isRange || f.operator === 'between') {
    const range = dateRange(f.value);
    return range ? { kind: 'between', lo: range[0], hi: range[1] } : null;
  }

  const value = dateOf(f.value);
  if (value == null) return null;
  switch (f.operator) {
    case 'equals':
      return { kind: 'eq', value };
    case 'gt':
      return { kind: 'gt', value };
    case 'lt':
      return { kind: 'lt', value };
    case 'gte':
      return { kind: 'gte', value };
    case 'lte':
      return { kind: 'lte', value };
    default:
      return null;
  }
}

// ─── Sort translation ───────────────────────────────────────────────────────

/**
 * Convert single-field `(field, direction)` sort state into engine sort specs.
 * `direction` is the normalized asc/desc/none representation; the table's
 * internal `'' | 'Ascending' | 'Descending'` shape must be normalized by the
 * caller before calling in. Returns an empty array when no sort is active.
 */
export function translateSort<T>(field: string, direction: 'asc' | 'desc' | null, schema: readonly ColumnSchema<T>[]): SortDef<T>[] {
  if (!field || !direction) return [];
  if (!schema.some((s) => s.field === field)) return [];
  return [
    {
      field: field as keyof T & string,
      direction,
      // Default to nulls last; matches the JS `compareValues` sentinel handling.
      nulls: 'last',
    },
  ];
}

/**
 * Normalize the table's internal sort-direction representation to the
 * `'asc' | 'desc' | null` shape `translateSort` expects.
 */
export function normalizeDirection(d: '' | 'Ascending' | 'Descending'): 'asc' | 'desc' | null {
  if (d === 'Ascending') return 'asc';
  if (d === 'Descending') return 'desc';
  return null;
}

// ─── Group translation ──────────────────────────────────────────────────────

/**
 * Validate that every `groupBy` field is in the engine schema and has a kind
 * the engine groups *safely*. Returns the field names verbatim or `null` when
 * the engine should sit out:
 *
 * - Field not in schema (lazy-loaded column / hidden field) → null
 * - Field is a date column → null. Engine returns `value: number` (ms-epoch)
 *   in group keys, but the JS path's `groupValue` is whatever the row had
 *   originally — could be a `Date` object, an ISO string, anything. Different
 *   types produce different `groupHeaderLabel` defaults and are not safe to
 *   swap silently.
 *
 * Text / number / bool columns engine-route. Those produce primitive
 * `groupValue`s (string / number / boolean) that match what the JS path
 * extracts via `(row as any)[field]`.
 */
export function translateGroupFields<T>(
  fields: readonly (keyof T & string)[],
  schema: readonly ColumnSchema<T>[],
): readonly (keyof T & string)[] | null {
  if (fields.length === 0) return null;
  for (const f of fields) {
    const col = schema.find((s) => s.field === f);
    if (!col) return null;
    if (col.kind === 'date') return null;
  }
  return fields;
}

// ─── Aggregate translation ──────────────────────────────────────────────────

/**
 * Decide whether a given `(field, fn)` aggregate is safe to route through
 * the engine. Returns the translated `AggFn` or `null` when:
 *
 * - the field isn't in the engine schema (e.g., a user-defined column not
 *   visible at ingest time);
 * - the agg fn's semantics differ from the JS implementation (`count`,
 *   `distinctCount` — JS doesn't skip nulls, engine does);
 * - the agg fn isn't compatible with the column's kind (e.g., `sum` on a
 *   text column).
 *
 * The conservative bias here matters: returning `null` means the caller falls
 * back to the existing `computeAggregate` JS reduce. We'd rather fall back
 * silently than emit a numerically different result from what users see today.
 */
export function translateAggregate<T>(
  field: keyof T & string,
  fn: AggregateFunction,
  /** Pre-built `field → kind` Map (call `buildSchemaKindMap` once per schema). */
  kindMap: ReadonlyMap<string, ColumnKind>,
): AggFn | null {
  // `count` and `distinctCount` semantically differ from JS; keep them on JS.
  if (fn === 'count' || fn === 'distinctCount') return null;

  const kind = kindMap.get(field);
  if (!kind) return null;

  switch (fn) {
    case 'sum':
    case 'avg':
    case 'median':
      return kind === 'number' ? (fn as AggFn) : null;
    case 'min':
    case 'max':
      return kind === 'number' || kind === 'date' ? (fn as AggFn) : null;
    case 'trueCount':
    case 'falseCount':
      return kind === 'bool' ? (fn as AggFn) : null;
  }
}

// ─── Value coercion helpers ─────────────────────────────────────────────────

function stringOf(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

function booleanOf(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function dateOf(v: unknown): number | null {
  if (v == null || v === '') return null;
  const t = new Date(v as string | number | Date).getTime();
  return Number.isFinite(t) ? t : null;
}

function numberRange(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [a, b] = v as [unknown, unknown];
  const lo = a != null && a !== '' ? Number(a) : -Infinity;
  const hi = b != null && b !== '' ? Number(b) : Infinity;
  if (!Number.isFinite(lo) && lo !== -Infinity) return null;
  if (!Number.isFinite(hi) && hi !== Infinity) return null;
  return [lo, hi];
}

function dateRange(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [a, b] = v as [unknown, unknown];
  const lo = a != null && a !== '' ? new Date(a as string | number | Date).getTime() : Number.NEGATIVE_INFINITY;
  const hi = b != null && b !== '' ? new Date(b as string | number | Date).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isNaN(lo) || Number.isNaN(hi)) return null;
  return [lo, hi];
}
