/**
 * In-house CSV parse/serialize for the CSV editor — no `papaparse` dependency.
 * RFC-4180-ish: comma-separated, `"`-quoted fields, `""` for an escaped quote
 * inside a quoted field, and quoted fields may span commas and newlines. The
 * serialize side mirrors the quoting rules in `table.helpers.ts` `exportToCsv`.
 *
 * The editor keeps the document model as the CSV *string*; these helpers only
 * bridge between that string and the row/column shape `hk-table` consumes, so
 * the Phase 0 `serializeText` round-trip stays the single source of truth.
 */

/** A parsed CSV: the header names and one record object per data row. */
export interface ParsedCsv {
  readonly columns: readonly string[];
  readonly rows: ReadonlyArray<Record<string, string>>;
}

/**
 * Parse CSV text into columns + row objects. The first record is treated as the
 * header. Returns empty columns/rows for blank input. Rows shorter than the
 * header are padded with `''`; extra trailing fields are dropped to keep every
 * row keyed by the declared columns.
 */
export function parseCsv(text: string): ParsedCsv {
  const records = parseRecords(text);
  if (records.length === 0) return { columns: [], rows: [] };

  const columns = records[0];
  const rows = records.slice(1).map((fields) => {
    const row: Record<string, string> = {};
    columns.forEach((col, i) => {
      row[col] = fields[i] ?? '';
    });
    return row;
  });
  return { columns, rows };
}

/** Serialize columns + row objects back to CSV text (header row first). */
export function serializeCsv(columns: readonly string[], rows: ReadonlyArray<Record<string, string>>): string {
  const lines = [columns.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeField(row[col] ?? '')).join(','));
  }
  return lines.join('\n');
}

/** Quote a field only when it contains a comma, quote, CR, or LF. */
function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Tokenize CSV text into an array of records (each an array of field strings).
 * A single left-to-right scan handles quoted fields, escaped quotes, and
 * CR/LF/CRLF line endings. A trailing blank line is ignored.
 */
function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let sawAny = false;

  const pushField = (): void => {
    record.push(field);
    field = '';
  };
  const pushRecord = (): void => {
    pushField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    sawAny = true;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRecord();
    } else if (ch === '\r') {
      pushRecord();
      if (text[i + 1] === '\n') i++; // swallow CRLF as one line break
    } else {
      field += ch;
    }
  }

  // Flush the final record unless the input ended exactly on a line break.
  if (field !== '' || record.length > 0 || (sawAny && records.length === 0)) {
    pushRecord();
  }
  return records;
}
