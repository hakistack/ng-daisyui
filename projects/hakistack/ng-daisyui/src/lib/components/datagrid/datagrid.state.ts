import type { FilterOperator } from '../../grid-core/grid.types';
import type {
  DataGridColumn,
  DataGridColumnState,
  DataGridColumnType,
  DataGridFilter,
  DataGridPageState,
  DataGridSort,
  DataGridState,
  DataGridStateIssue,
  DataGridStatePatch,
} from './datagrid.types';

/** Largest page size accepted through `setState` (guards against a runaway LLM / URL param). */
export const MAX_PAGE_SIZE = 1000;
const DEFAULT_MIN_WIDTH = 48;

/** Operators that make sense for each column type, in the order a UI should offer them. */
export const DATAGRID_OPERATORS: Readonly<Record<DataGridColumnType, readonly FilterOperator[]>> = {
  text: ['contains', 'notContains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  date: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  boolean: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
};

export function columnType<T>(column: DataGridColumn<T>): DataGridColumnType {
  return column.type ?? 'text';
}

export function defaultColumnWidth<T>(column: DataGridColumn<T>): number {
  if (column.width != null) return column.width;
  const type = columnType(column);
  return type === 'number' || type === 'boolean' ? 120 : 160;
}

export function minColumnWidth<T>(column: DataGridColumn<T>): number {
  return column.minWidth ?? DEFAULT_MIN_WIDTH;
}

export function isSortable<T>(column: DataGridColumn<T>): boolean {
  return column.sortable !== false;
}

export function isFilterable<T>(column: DataGridColumn<T>): boolean {
  return column.filterable !== false;
}

export function isSearchable<T>(column: DataGridColumn<T>): boolean {
  return column.searchable ?? columnType(column) === 'text';
}

/** The state a grid starts with: column defaults overlaid with `initialState`. */
export function createInitialState<T>(
  columns: readonly DataGridColumn<T>[],
  pageSize: number | undefined,
  initialState: DataGridStatePatch | undefined,
): { state: DataGridState; issues: DataGridStateIssue[] } {
  const base: DataGridState = {
    sort: [],
    filters: [],
    search: '',
    page: pageSize ? { index: 0, size: pageSize } : null,
    columns: columns.map((c) => ({ field: c.field, visible: !c.hidden, width: defaultColumnWidth(c) })),
  };
  return initialState ? normalizeStatePatch(initialState, base, columns) : { state: base, issues: [] };
}

/**
 * Merge an untrusted partial state into `current`.
 *
 * Accepts anything (`unknown`), because patches come from saved views, URLs
 * and LLM output. Every invalid entry is dropped and reported as an issue;
 * values are coerced to the column type where that is unambiguous ("5" → 5
 * for a number column). Never throws.
 *
 * Changing sort, filters or search resets the page index to 0 unless the
 * patch sets `page` itself.
 */
export function normalizeStatePatch<T>(
  patch: unknown,
  current: DataGridState,
  columns: readonly DataGridColumn<T>[],
): { state: DataGridState; issues: DataGridStateIssue[] } {
  const issues: DataGridStateIssue[] = [];
  if (!isRecord(patch)) {
    issues.push({ path: '', message: 'State patch must be an object.' });
    return { state: current, issues };
  }

  const byField = new Map(columns.map((c) => [c.field, c]));
  const next: DataGridState = { ...current };

  for (const key of Object.keys(patch)) {
    if (!['sort', 'filters', 'search', 'page', 'columns'].includes(key)) {
      issues.push({ path: key, message: `Unknown state key "${key}".` });
    }
  }

  if ('sort' in patch) next.sort = normalizeSort(patch['sort'], byField, issues);
  if ('filters' in patch) next.filters = normalizeFilters(patch['filters'], byField, issues);
  if ('search' in patch) {
    if (typeof patch['search'] === 'string') next.search = patch['search'];
    else issues.push({ path: 'search', message: 'search must be a string.' });
  }
  if ('columns' in patch) next.columns = normalizeColumns(patch['columns'], current.columns, byField, issues);

  if ('page' in patch) {
    next.page = normalizePage(patch['page'], current.page, issues);
  } else if (
    next.page &&
    next.page.index !== 0 &&
    (next.sort !== current.sort || next.filters !== current.filters || next.search !== current.search)
  ) {
    next.page = { ...next.page, index: 0 };
  }

  return { state: next, issues };
}

function normalizeSort<T>(input: unknown, byField: Map<string, DataGridColumn<T>>, issues: DataGridStateIssue[]): DataGridSort[] {
  if (!Array.isArray(input)) {
    issues.push({ path: 'sort', message: 'sort must be an array.' });
    return [];
  }
  const out: DataGridSort[] = [];
  input.forEach((item, i) => {
    const path = `sort[${i}]`;
    if (!isRecord(item) || typeof item['field'] !== 'string') {
      issues.push({ path, message: 'Each sort entry needs a string "field".' });
      return;
    }
    const field = item['field'];
    const column = byField.get(field);
    if (!column) return void issues.push({ path, message: `Unknown column "${field}".` });
    if (!isSortable(column)) return void issues.push({ path, message: `Column "${field}" is not sortable.` });
    if (item['direction'] !== 'asc' && item['direction'] !== 'desc') {
      return void issues.push({ path, message: 'direction must be "asc" or "desc".' });
    }
    if (out.some((s) => s.field === field)) return void issues.push({ path, message: `Duplicate sort on "${field}".` });
    out.push({ field, direction: item['direction'] });
  });
  return out;
}

function normalizeFilters<T>(input: unknown, byField: Map<string, DataGridColumn<T>>, issues: DataGridStateIssue[]): DataGridFilter[] {
  if (!Array.isArray(input)) {
    issues.push({ path: 'filters', message: 'filters must be an array.' });
    return [];
  }
  const out: DataGridFilter[] = [];
  input.forEach((item, i) => {
    const path = `filters[${i}]`;
    if (!isRecord(item) || typeof item['field'] !== 'string' || typeof item['operator'] !== 'string') {
      issues.push({ path, message: 'Each filter needs a string "field" and "operator".' });
      return;
    }
    const field = item['field'];
    const column = byField.get(field);
    if (!column) return void issues.push({ path, message: `Unknown column "${field}".` });
    if (!isFilterable(column)) return void issues.push({ path, message: `Column "${field}" is not filterable.` });

    const type = columnType(column);
    const operator = item['operator'] as FilterOperator;
    if (!DATAGRID_OPERATORS[type].includes(operator)) {
      return void issues.push({
        path: `${path}.operator`,
        message: `Operator "${operator}" is not valid for ${type} column "${field}". Use one of: ${DATAGRID_OPERATORS[type].join(', ')}.`,
      });
    }

    const value = normalizeFilterValue(type, operator, item['value'], `${path}.value`, issues);
    if (value === INVALID) return;
    out.push(value === undefined ? { field, operator } : { field, operator, value });
  });
  return out;
}

const INVALID = Symbol('invalid');

function normalizeFilterValue(
  type: DataGridColumnType,
  operator: FilterOperator,
  raw: unknown,
  path: string,
  issues: DataGridStateIssue[],
): unknown {
  if (operator === 'isEmpty' || operator === 'isNotEmpty') return undefined;

  if (operator === 'between') {
    if (!Array.isArray(raw) || raw.length !== 2) {
      issues.push({ path, message: 'between needs a [min, max] pair (use null for an open end).' });
      return INVALID;
    }
    if (raw[0] == null && raw[1] == null) {
      issues.push({ path, message: 'between needs at least one bound.' });
      return INVALID;
    }
    const pair = raw.map((v) => (v == null || v === '' ? null : coerceScalar(type, v)));
    if (pair.includes(INVALID)) {
      issues.push({ path, message: `between bounds must be ${type} values.` });
      return INVALID;
    }
    return pair;
  }

  if (operator === 'in' || operator === 'notIn') {
    const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    const coerced = list.map((v) => coerceScalar(type, v));
    if (coerced.length === 0 || coerced.includes(INVALID)) {
      issues.push({ path, message: `${operator} needs a non-empty array of ${type} values.` });
      return INVALID;
    }
    return coerced;
  }

  const scalar = raw == null || Array.isArray(raw) || isRecord(raw) ? INVALID : coerceScalar(type, raw);
  if (scalar === INVALID) issues.push({ path, message: `${operator} needs a single ${type} value.` });
  return scalar;
}

function coerceScalar(type: DataGridColumnType, v: unknown): unknown {
  switch (type) {
    case 'number': {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : INVALID;
    }
    case 'date': {
      if (!(typeof v === 'string' || typeof v === 'number' || v instanceof Date)) return INVALID;
      return isNaN(new Date(v).getTime()) ? INVALID : v instanceof Date ? v.toISOString() : v;
    }
    case 'boolean':
      if (typeof v === 'boolean') return v;
      if (v === 'true') return true;
      if (v === 'false') return false;
      return INVALID;
    default:
      return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : INVALID;
  }
}

function normalizePage(input: unknown, current: DataGridPageState | null, issues: DataGridStateIssue[]): DataGridPageState | null {
  if (current === null) {
    if (input !== null) issues.push({ path: 'page', message: 'This grid is not paginated; page must be null.' });
    return null;
  }
  if (!isRecord(input)) {
    issues.push({ path: 'page', message: 'page must be an object { index, size }.' });
    return current;
  }
  const index = input['index'] ?? current.index;
  const size = input['size'] ?? current.size;
  if (!Number.isInteger(index) || (index as number) < 0) {
    issues.push({ path: 'page.index', message: 'page.index must be an integer ≥ 0.' });
    return current;
  }
  if (!Number.isInteger(size) || (size as number) < 1 || (size as number) > MAX_PAGE_SIZE) {
    issues.push({ path: 'page.size', message: `page.size must be an integer between 1 and ${MAX_PAGE_SIZE}.` });
    return { index: index as number, size: current.size };
  }
  return { index: index as number, size: size as number };
}

function normalizeColumns<T>(
  input: unknown,
  current: readonly DataGridColumnState[],
  byField: Map<string, DataGridColumn<T>>,
  issues: DataGridStateIssue[],
): DataGridColumnState[] {
  if (!Array.isArray(input)) {
    issues.push({ path: 'columns', message: 'columns must be an array.' });
    return [...current];
  }
  const currentByField = new Map(current.map((c) => [c.field, c]));
  const out: DataGridColumnState[] = [];
  input.forEach((item, i) => {
    const path = `columns[${i}]`;
    if (!isRecord(item) || typeof item['field'] !== 'string') {
      return void issues.push({ path, message: 'Each column entry needs a string "field".' });
    }
    const field = item['field'];
    const def = byField.get(field);
    const prev = currentByField.get(field);
    if (!def || !prev) return void issues.push({ path, message: `Unknown column "${field}".` });
    if (out.some((c) => c.field === field)) return void issues.push({ path, message: `Duplicate column "${field}".` });

    let visible = prev.visible;
    if ('visible' in item) {
      if (typeof item['visible'] === 'boolean') visible = item['visible'];
      else issues.push({ path: `${path}.visible`, message: 'visible must be a boolean.' });
    }
    let width = prev.width;
    if ('width' in item) {
      const w = item['width'];
      if (typeof w === 'number' && Number.isFinite(w)) width = Math.max(Math.round(w), minColumnWidth(def));
      else issues.push({ path: `${path}.width`, message: 'width must be a number (px).' });
    }
    out.push({ field, visible, width });
  });

  // Columns the patch did not mention keep their state and go after the listed ones.
  for (const c of current) {
    if (!out.some((o) => o.field === c.field)) out.push(c);
  }
  if (!out.some((c) => c.visible)) {
    issues.push({ path: 'columns', message: 'At least one column must stay visible; showing the first column.' });
    out[0] = { ...out[0], visible: true };
  }
  return out;
}

/**
 * JSON Schema (2020-12) for a `DataGridState` over these columns. Field names
 * are enumerated, operators are restricted per column type, and column
 * descriptions are embedded — so the schema doubles as the contract for an
 * LLM that turns a natural-language request into grid state.
 *
 * Only keywords supported by structured-output decoders are used (no numeric
 * bounds); `setState` enforces the rest and reports issues.
 */
export function buildStateSchema<T>(columns: readonly DataGridColumn<T>[], paginated: boolean): Record<string, unknown> {
  const sortable = columns.filter(isSortable).map((c) => c.field);
  const filterable = columns.filter(isFilterable);

  const filterVariants = filterable.map((c) => {
    const type = columnType(c);
    const scalar = scalarSchema(type);
    return {
      type: 'object',
      description: describeColumn(c),
      properties: {
        field: { const: c.field },
        operator: { enum: [...DATAGRID_OPERATORS[type]] },
        value: {
          description: 'Omit for isEmpty/isNotEmpty. [min, max] for between (null = open end). Array for in/notIn.',
          anyOf: [scalar, { type: 'array', items: { anyOf: [scalar, { type: 'null' }] } }],
        },
      },
      required: ['field', 'operator'],
      additionalProperties: false,
    };
  });

  const properties: Record<string, unknown> = {
    sort: {
      type: 'array',
      description: 'Sort keys in priority order; the first entry is the primary sort.',
      items: {
        type: 'object',
        properties: {
          field: { enum: sortable },
          direction: { enum: ['asc', 'desc'] },
        },
        required: ['field', 'direction'],
        additionalProperties: false,
      },
    },
    filters: {
      type: 'array',
      description: 'Row filters, combined with AND.',
      items: filterVariants.length ? { anyOf: filterVariants } : { not: {} },
    },
    search: { type: 'string', description: 'Free-text quick search across text columns. Empty string for none.' },
    columns: {
      type: 'array',
      description: 'Column order, visibility and width (px). Columns not listed keep their current state.',
      items: {
        type: 'object',
        properties: {
          field: { enum: columns.map((c) => c.field) },
          visible: { type: 'boolean' },
          width: { type: 'number' },
        },
        required: ['field'],
        additionalProperties: false,
      },
    },
  };
  properties['page'] = paginated
    ? {
        type: 'object',
        description: `Zero-based page index and page size (1–${MAX_PAGE_SIZE}).`,
        properties: { index: { type: 'integer' }, size: { type: 'integer' } },
        required: ['index', 'size'],
        additionalProperties: false,
      }
    : { type: 'null' };

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'DataGridState',
    description: `View state of a data grid. Columns: ${columns.map(describeColumn).join('; ')}.`,
    type: 'object',
    properties,
    additionalProperties: false,
  };
}

function scalarSchema(type: DataGridColumnType): Record<string, unknown> {
  switch (type) {
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'string', format: 'date-time', description: 'ISO 8601 date or date-time.' };
    default:
      return { type: 'string' };
  }
}

function describeColumn<T>(c: DataGridColumn<T>): string {
  const base = `${c.field} (${columnType(c)}, "${c.header}")`;
  return c.description ? `${base}: ${c.description}` : base;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
