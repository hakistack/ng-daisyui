import { getCellText, getCellValue } from './datagrid.pipeline';
import type { DataGridColumn } from './datagrid.types';

/** A cell position in the current view: row index (−1 = header) and visible-column index. */
export interface CellPos {
  row: number;
  col: number;
}

/** Inclusive rectangle of data cells. */
export interface CellRange {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}

export interface RangeSummary {
  /** Non-empty cells. */
  count: number;
  /** Cells holding a finite number. */
  numericCount: number;
  sum: number;
  avg: number | null;
}

/**
 * Rectangle spanned by `anchor` and `active` (both inclusive). No anchor → the
 * active cell alone. Header positions (row −1) are clamped to the first data row.
 * Returns `null` when the active cell is not a data cell.
 */
export function normalizeRange(anchor: CellPos | null, active: CellPos): CellRange | null {
  if (active.row < 0) return null;
  const a = anchor ?? active;
  return {
    r0: Math.max(0, Math.min(a.row, active.row)),
    r1: Math.max(a.row, active.row),
    c0: Math.min(a.col, active.col),
    c1: Math.max(a.col, active.col),
  };
}

export function rangeCellCount(range: CellRange): number {
  return (range.r1 - range.r0 + 1) * (range.c1 - range.c0 + 1);
}

export function inRange(range: CellRange | null, row: number, col: number): boolean {
  return !!range && row >= range.r0 && row <= range.r1 && col >= range.c0 && col <= range.c1;
}

/**
 * Tab-separated text of the displayed values in `range` — what Excel and
 * Google Sheets expect on the clipboard. Values containing a tab, newline or
 * quote are quoted (RFC 4180 style), which both apps understand.
 */
export function rangeToTsv<T>(rows: readonly T[], columns: readonly DataGridColumn<T>[], range: CellRange): string {
  const lines: string[] = [];
  const last = Math.min(range.r1, rows.length - 1);
  for (let r = range.r0; r <= last; r++) {
    const cells: string[] = [];
    for (let c = range.c0; c <= range.c1 && c < columns.length; c++) {
      cells.push(tsvField(getCellText(rows[r], columns[c])));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}

function tsvField(text: string): string {
  return /[\t\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Excel-style status-bar figures for the raw values in `range`. */
export function summarizeRange<T>(rows: readonly T[], columns: readonly DataGridColumn<T>[], range: CellRange): RangeSummary {
  let count = 0;
  let numericCount = 0;
  let sum = 0;
  const last = Math.min(range.r1, rows.length - 1);
  for (let r = range.r0; r <= last; r++) {
    for (let c = range.c0; c <= range.c1 && c < columns.length; c++) {
      const value = getCellValue(rows[r], columns[c]);
      if (value == null || value === '') continue;
      count++;
      if (typeof value === 'number' && Number.isFinite(value)) {
        numericCount++;
        sum += value;
      }
    }
  }
  return { count, numericCount, sum, avg: numericCount ? sum / numericCount : null };
}
