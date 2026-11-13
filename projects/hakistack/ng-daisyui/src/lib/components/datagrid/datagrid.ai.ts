import type { FilterOperator } from '../../grid-core/grid.types';
import { getCellValue } from './datagrid.pipeline';
import { columnType, DATAGRID_OPERATORS, isFilterable, isSearchable, isSortable } from './datagrid.state';
import type {
  DataGridAiRequest,
  DataGridColumn,
  DataGridColumnType,
  DataGridState,
  DataGridStateIssue,
  DataGridStatePatch,
} from './datagrid.types';

/**
 * Natural-language → grid state.
 *
 * `buildAiRequest()` produces the instructions, the user message and a JSON
 * Schema; the controller sends them to Claude with structured outputs
 * (`requestClaudeJson`, or the consumer's own `complete` transport);
 * `parseAiReply()` turns the reply into a state patch that `setState()`
 * validates like any other untrusted input.
 *
 * The reply schema is deliberately flat (every value is a string, no unions):
 * it stays within structured-output limits for grids with many columns, and
 * `normalizeStatePatch()` coerces values to each column's type.
 */

/** Longest sample value worth sending; long free text does not help the model match. */
const MAX_SAMPLE_LENGTH = 60;

const ALL_OPERATORS: readonly FilterOperator[] = [...new Set(Object.values(DATAGRID_OPERATORS).flat())];

export interface AiRequestOptions<T> {
  /** Client-side rows, used only when `sampleValues > 0`. */
  data?: readonly T[];
  /** Frequent values per text column (and min/max for number/date columns) to share. Default: 0. */
  sampleValues?: number;
  /** Domain hint for the model. */
  context?: string;
  /** Reference date for relative expressions ("last month"). */
  now: Date;
}

export function buildAiRequest<T>(
  columns: readonly DataGridColumn<T>[],
  state: DataGridState,
  query: string,
  options: AiRequestOptions<T>,
): DataGridAiRequest {
  const samples = options.sampleValues && options.data?.length ? sampleColumns(columns, options.data, options.sampleValues) : null;
  const hidden = new Set(state.columns.filter((c) => !c.visible).map((c) => c.field));

  const columnLines = columns.map((c) => {
    const flags = [
      !isSortable(c) && 'not sortable',
      !isFilterable(c) && 'not filterable',
      isSearchable(c) && 'searchable',
      hidden.has(c.field) && 'hidden',
    ].filter(Boolean);
    let line = `- ${c.field} (${columnType(c)}) "${c.header}"`;
    if (flags.length) line += ` [${flags.join(', ')}]`;
    if (c.description) line += ` — ${c.description}`;
    const sample = samples?.get(c.field);
    if (sample) line += `. ${sample}`;
    return line;
  });

  const operatorLines = (Object.keys(DATAGRID_OPERATORS) as DataGridColumnType[]).map(
    (type) => `- ${type}: ${DATAGRID_OPERATORS[type].join(', ')}`,
  );

  const system = [
    'You turn a user request into the view state of a data grid: sort, filters, quick search and visible columns.',
    'Reply with the JSON object described by the schema and nothing else.',
    '',
    `Today is ${isoDate(options.now)} (${options.now.toLocaleDateString('en-US', { weekday: 'long' })}).`,
    ...(options.context ? ['', `About this data: ${options.context}`] : []),
    '',
    'Columns:',
    ...columnLines,
    '',
    'Filter operators by column type:',
    ...operatorLines,
    '',
    'Rules:',
    '- The reply replaces sort, filters and search. If the request refines the current view ("only…", "also…", "now sort by…"), keep what it does not change; if it is a new question, start from an empty view.',
    '- Filters are combined with AND. "A or B" on one column is the `in` operator. Other OR conditions cannot be expressed: build the closest view and say so in the explanation.',
    '- `values` are strings: one for comparisons, two for between ([from, to], inclusive, "" for an open end), one or more for in/notIn, none for isEmpty/isNotEmpty.',
    '- Text: contains, startsWith and endsWith ignore case; equals and in are exact and case-sensitive, so use them only with known values.',
    '- Numbers: plain digits without currency or thousands separators ("10000", "-2.5").',
    '- Dates: ISO "YYYY-MM-DD". Resolve relative dates against today.',
    '- search matches free text across searchable columns. Leave it "" unless the user asks for a keyword search across columns.',
    '- columns: the visible columns in display order, only when the user asks to show, hide or reorder columns; otherwise [].',
    '- explanation: one short sentence, in the language of the request, describing the resulting view and anything you could not do.',
  ].join('\n');

  const current = {
    sort: state.sort,
    filters: state.filters,
    search: state.search,
    visibleColumns: state.columns.filter((c) => c.visible).map((c) => c.field),
  };
  const prompt = `<current_view>\n${JSON.stringify(current)}\n</current_view>\n\n<request>\n${query.trim()}\n</request>`;

  return { system, prompt, schema: buildAiReplySchema(columns) };
}

/**
 * JSON Schema for the model's reply. Uses only keywords that structured
 * outputs support (every object closed, every property required, no unions).
 */
export function buildAiReplySchema<T>(columns: readonly DataGridColumn<T>[]): Record<string, unknown> {
  const fieldSchema = (fields: string[]) => (fields.length ? { type: 'string', enum: fields } : { type: 'string' });
  return {
    type: 'object',
    properties: {
      sort: {
        type: 'array',
        description: 'Sort keys in priority order.',
        items: {
          type: 'object',
          properties: {
            field: fieldSchema(columns.filter(isSortable).map((c) => c.field)),
            direction: { type: 'string', enum: ['asc', 'desc'] },
          },
          required: ['field', 'direction'],
          additionalProperties: false,
        },
      },
      filters: {
        type: 'array',
        description: 'Row filters, combined with AND.',
        items: {
          type: 'object',
          properties: {
            field: fieldSchema(columns.filter(isFilterable).map((c) => c.field)),
            operator: { type: 'string', enum: [...ALL_OPERATORS] },
            values: { type: 'array', items: { type: 'string' } },
          },
          required: ['field', 'operator', 'values'],
          additionalProperties: false,
        },
      },
      search: { type: 'string' },
      columns: {
        type: 'array',
        description: 'Visible columns in order, or [] to keep them.',
        items: fieldSchema(columns.map((c) => c.field)),
      },
      explanation: { type: 'string' },
    },
    required: ['sort', 'filters', 'search', 'columns', 'explanation'],
    additionalProperties: false,
  };
}

export interface ParsedAiReply {
  patch: DataGridStatePatch;
  explanation: string;
  /** Problems with the reply itself; `setState()` reports the rest. */
  issues: DataGridStateIssue[];
}

/**
 * Convert the model's reply (object or JSON text) into a state patch.
 * Returns `null` when the reply is not a JSON object at all.
 */
export function parseAiReply<T>(raw: unknown, columns: readonly DataGridColumn<T>[], current: DataGridState): ParsedAiReply | null {
  let reply = raw;
  if (typeof reply === 'string') {
    try {
      reply = JSON.parse(reply);
    } catch {
      return null;
    }
  }
  if (!isRecord(reply)) return null;

  const patch: DataGridStatePatch = {};
  const issues: DataGridStateIssue[] = [];

  if ('sort' in reply) patch.sort = reply['sort'] as DataGridStatePatch['sort'];
  if ('search' in reply) patch.search = reply['search'] as string;

  if ('filters' in reply) {
    const filters = reply['filters'];
    if (Array.isArray(filters)) {
      patch.filters = filters.flatMap((f, i) => {
        if (!isRecord(f)) {
          issues.push({ path: `filters[${i}]`, message: 'Each filter must be an object.' });
          return [];
        }
        const values = Array.isArray(f['values']) ? f['values'] : [];
        return [{ field: f['field'], operator: f['operator'], ...filterValue(f['operator'], values) }];
      }) as DataGridStatePatch['filters'];
    } else {
      issues.push({ path: 'filters', message: 'filters must be an array.' });
    }
  }

  const visible = reply['columns'];
  if (Array.isArray(visible) && visible.length) {
    const listed = visible.filter((f): f is string => typeof f === 'string');
    const known = new Set(columns.map((c) => c.field));
    const shown = listed.filter((f) => known.has(f));
    for (const f of listed) if (!known.has(f)) issues.push({ path: 'columns', message: `Unknown column "${f}".` });
    if (shown.length) {
      const rest = current.columns.filter((c) => !shown.includes(c.field));
      patch.columns = [...shown.map((field) => ({ field, visible: true })), ...rest.map((c) => ({ field: c.field, visible: false }))];
    }
  }

  const explanation = typeof reply['explanation'] === 'string' ? reply['explanation'].trim() : '';
  return { patch, explanation, issues };
}

/** Map the reply's string list onto the `value` shape `normalizeStatePatch()` expects for the operator. */
function filterValue(operator: unknown, values: unknown[]): { value?: unknown } {
  switch (operator) {
    case 'isEmpty':
    case 'isNotEmpty':
      return {};
    case 'between':
      return { value: [values[0] ?? null, values[1] ?? null].map((v) => (v === '' ? null : v)) };
    case 'in':
    case 'notIn':
      return { value: values };
    default:
      return { value: values[0] };
  }
}

/**
 * One-line value hints per column: the most frequent values of text columns,
 * the range of number and date columns. Boolean columns need none.
 */
function sampleColumns<T>(columns: readonly DataGridColumn<T>[], data: readonly T[], limit: number): Map<string, string> {
  const out = new Map<string, string>();
  for (const column of columns) {
    if (!isFilterable(column)) continue;
    const type = columnType(column);
    if (type === 'text') {
      const counts = new Map<string, number>();
      for (const row of data) {
        const v = getCellValue(row, column);
        if (v == null || v === '') continue;
        const s = String(v);
        if (s.length <= MAX_SAMPLE_LENGTH) counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      if (counts.size === 0) continue;
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      // A column of unique values (ids, invoice numbers) only needs its shape, not a list.
      if (counts.size === data.length && data.length > limit) {
        out.set(column.field, `Unique per row, e.g. ${JSON.stringify(top[0][0])}`);
        continue;
      }
      const more = counts.size > top.length ? ` (${counts.size} distinct)` : '';
      out.set(column.field, `Values: ${top.map(([v]) => JSON.stringify(v)).join(', ')}${more}`);
    } else if (type === 'number' || type === 'date') {
      let min: number | null = null;
      let max: number | null = null;
      let minRaw: unknown = null;
      let maxRaw: unknown = null;
      for (const row of data) {
        const v = getCellValue(row, column);
        if (v == null || v === '') continue;
        const n = type === 'number' ? Number(v) : new Date(v as string | number | Date).getTime();
        if (!Number.isFinite(n)) continue;
        if (min === null || n < min) [min, minRaw] = [n, v];
        if (max === null || n > max) [max, maxRaw] = [n, v];
      }
      if (min === null) continue;
      out.set(column.field, `Range: ${formatSample(minRaw)} to ${formatSample(maxRaw)}`);
    }
  }
  return out;
}

function formatSample(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
