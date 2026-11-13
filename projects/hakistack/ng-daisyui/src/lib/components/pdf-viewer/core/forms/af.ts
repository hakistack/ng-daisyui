/**
 * The Acrobat form functions forms use for formatting, keystroke filtering,
 * validation and calculation (`AFNumber_*`, `AFPercent_*`, `AFDate_*`,
 * `AFTime_*`, `AFSpecial_*`, `AFRange_Validate`, `AFSimple_Calculate` and
 * the "simplified field notation"), reimplemented in TypeScript.
 *
 * Only these calls are recognised, by parsing the action's JavaScript
 * source; the PDF's JavaScript is never executed.
 */

export type AfFormat =
  | {
      readonly kind: 'number';
      readonly decimals: number;
      /** 0 `1,234.56` · 1 `1234.56` · 2 `1.234,56` · 3 `1234,56` · 4 `1'234.56`. */
      readonly sepStyle: number;
      /** 0 `-` · 1 red · 2 parentheses · 3 red parentheses. */
      readonly negStyle: number;
      readonly currency: string;
      readonly prepend: boolean;
    }
  | { readonly kind: 'percent'; readonly decimals: number; readonly sepStyle: number }
  | { readonly kind: 'date'; readonly format: string }
  | { readonly kind: 'time'; readonly format: string }
  /** 0 ZIP · 1 ZIP+4 · 2 phone · 3 SSN. */
  | { readonly kind: 'special'; readonly psf: number }
  /** `9` digit, `A` letter, `O` letter or digit, `X` anything; other characters are literal. */
  | { readonly kind: 'mask'; readonly mask: string };

export interface AfRange {
  readonly min?: number;
  readonly max?: number;
}

export type AfCalculate =
  | { readonly kind: 'simple'; readonly op: 'SUM' | 'AVG' | 'PRD' | 'MIN' | 'MAX'; readonly fields: readonly string[] }
  | { readonly kind: 'expression'; readonly expression: string; readonly fields: readonly string[] };

const DATE_FORMATS = [
  'm/d',
  'm/d/yy',
  'mm/dd/yy',
  'mm/yy',
  'd-mmm',
  'd-mmm-yy',
  'dd-mmm-yy',
  'yy-mm-dd',
  'mmm-yy',
  'mmmm-yy',
  'mmm d, yyyy',
  'mmmm d, yyyy',
  'm/d/yy h:MM tt',
  'm/d/yy HH:MM',
];
const TIME_FORMATS = ['HH:MM', 'h:MM tt', 'HH:MM:ss', 'h:MM:ss tt'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SPECIAL_MASKS = ['99999', '99999-9999', '(999) 999-9999', '999-99-9999'];

// ── Parsing actions ─────────────────────────────────────────────────────────

/** Arguments of the first call to `fn` in `js` (strings unquoted, numbers and booleans parsed). */
function callArgs(js: string, fn: string): unknown[] | null {
  const at = js.search(new RegExp(`\\b${fn}\\s*\\(`));
  if (at < 0) return null;
  let i = js.indexOf('(', at) + 1;
  const args: unknown[] = [];
  let depth = 0;
  let current = '';
  for (; i < js.length; i++) {
    const c = js[i];
    if (c === '"' || c === "'") {
      let s = '';
      for (i++; i < js.length && js[i] !== c; i++) s += js[i] === '\\' ? js[++i] : js[i];
      current += JSON.stringify(s);
      continue;
    }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') {
      if (depth === 0) break;
      depth--;
    }
    if (c === ',' && depth === 0) {
      args.push(literal(current));
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim()) args.push(literal(current));
  return args;
}

function literal(src: string): unknown {
  const s = src.trim();
  if (s.startsWith('"')) return JSON.parse(s);
  if (s === 'true' || s === 'false') return s === 'true';
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // new Array("a", "b") / ["a", "b"]
  const list = /^(?:new\s+Array\s*\(|\[)(.*)[)\]]$/s.exec(s);
  if (list) return [...list[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
  return s;
}

const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : Number(v) || d);

/** The format a format (`/AA /F`) or keystroke (`/AA /K`) action applies. */
export function parseFormatAction(js: string | undefined): AfFormat | undefined {
  if (!js) return undefined;
  let a: unknown[] | null;
  if ((a = callArgs(js, 'AFNumber_Format') ?? callArgs(js, 'AFNumber_Keystroke'))) {
    return {
      kind: 'number',
      decimals: num(a[0], 2),
      sepStyle: num(a[1]),
      negStyle: num(a[2]),
      currency: String(a[4] ?? ''),
      prepend: a[5] !== false,
    };
  }
  if ((a = callArgs(js, 'AFPercent_Format') ?? callArgs(js, 'AFPercent_Keystroke')))
    return { kind: 'percent', decimals: num(a[0], 2), sepStyle: num(a[1]) };
  if ((a = callArgs(js, 'AFDate_FormatEx') ?? callArgs(js, 'AFDate_KeystrokeEx'))) return { kind: 'date', format: String(a[0]) };
  if ((a = callArgs(js, 'AFDate_Format') ?? callArgs(js, 'AFDate_Keystroke')))
    return { kind: 'date', format: DATE_FORMATS[num(a[0])] ?? 'm/d/yy' };
  if ((a = callArgs(js, 'AFTime_FormatEx') ?? callArgs(js, 'AFTime_KeystrokeEx'))) return { kind: 'time', format: String(a[0]) };
  if ((a = callArgs(js, 'AFTime_Format') ?? callArgs(js, 'AFTime_Keystroke')))
    return { kind: 'time', format: TIME_FORMATS[num(a[0])] ?? 'HH:MM' };
  if ((a = callArgs(js, 'AFSpecial_KeystrokeEx'))) return { kind: 'mask', mask: String(a[0]) };
  if ((a = callArgs(js, 'AFSpecial_Format') ?? callArgs(js, 'AFSpecial_Keystroke'))) return { kind: 'special', psf: num(a[0]) };
  return undefined;
}

/** The range an `AFRange_Validate` action enforces. */
export function parseValidateAction(js: string | undefined): AfRange | undefined {
  const a = js ? callArgs(js, 'AFRange_Validate') : null;
  if (!a) return undefined;
  return { min: a[0] === true ? num(a[1]) : undefined, max: a[2] === true ? num(a[3]) : undefined };
}

/** The calculation an `AFSimple_Calculate` or simplified-notation action performs. */
export function parseCalculateAction(js: string | undefined): AfCalculate | undefined {
  if (!js) return undefined;
  const a = callArgs(js, 'AFSimple_Calculate');
  if (a) {
    const op = String(a[0]).toUpperCase();
    const list = Array.isArray(a[1]) ? (a[1] as string[]) : String(a[1] ?? '').split(',');
    if (['SUM', 'AVG', 'PRD', 'MIN', 'MAX'].includes(op)) {
      return { kind: 'simple', op: op as 'SUM', fields: list.map((f) => f.trim()).filter(Boolean) };
    }
  }
  const sfn = /BVCALC([\s\S]*?)EVCALC/.exec(js);
  if (sfn) {
    const expression = sfn[1].trim();
    return {
      kind: 'expression',
      expression,
      fields: tokenize(expression)
        .filter((t) => t.kind === 'name')
        .map((t) => t.value),
    };
  }
  return undefined;
}

// ── Numbers ─────────────────────────────────────────────────────────────────

const SEPARATORS: [group: string, decimal: string][] = [
  [',', '.'],
  ['', '.'],
  ['.', ','],
  ['', ','],
  ["'", '.'],
];

/** A user-typed number in a separator style (`AFMakeNumber`); null when it isn't one. */
export function parseNumber(text: string, sepStyle = 0): number | null {
  const [, decimal] = SEPARATORS[sepStyle] ?? SEPARATORS[0];
  let s = text.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.includes('-');
  s = s.replace(/[^\d.,']/g, '');
  if (decimal === ',') s = s.replace(/[.']/g, '').replace(',', '.');
  else s = s.replace(/[,']/g, '');
  if (!s || !/^\d*\.?\d*$/.test(s) || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

/** A stored value: canonical (`1234.5`, what commits write) or, from other writers, in the field's style. */
function storedNumber(value: string, sepStyle: number): number | null {
  return /^\s*-?\d+(\.\d+)?\s*$/.test(value) ? Number(value) : parseNumber(value, sepStyle);
}

function groupDigits(n: number, decimals: number, sepStyle: number): string {
  const [group, decimal] = SEPARATORS[sepStyle] ?? SEPARATORS[0];
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, group) : int;
  return frac ? `${grouped}${decimal}${frac}` : grouped;
}

// ── Formatting ──────────────────────────────────────────────────────────────

export interface Formatted {
  readonly text: string;
  /** Negative numbers in red styles. */
  readonly red?: boolean;
}

/** The value as the field displays it when not being edited (the format action). */
export function formatValue(fmt: AfFormat | undefined, value: string): Formatted {
  if (!fmt || value === '') return { text: value };
  switch (fmt.kind) {
    case 'number': {
      const n = storedNumber(value, fmt.sepStyle);
      if (n === null) return { text: value };
      let text = groupDigits(n, fmt.decimals, fmt.sepStyle);
      if (fmt.currency) text = fmt.prepend ? `${fmt.currency}${text}` : `${text}${fmt.currency}`;
      if (n < 0) text = fmt.negStyle >= 2 ? `(${text})` : fmt.negStyle === 1 ? text : `-${text}`;
      return { text, red: n < 0 && (fmt.negStyle === 1 || fmt.negStyle === 3) };
    }
    case 'percent': {
      const n = storedNumber(value, fmt.sepStyle);
      return n === null ? { text: value } : { text: `${n < 0 ? '-' : ''}${groupDigits(n * 100, fmt.decimals, fmt.sepStyle)}%` };
    }
    case 'date': {
      const d = parseDate(value, fmt.format);
      return { text: d ? formatDate(d, fmt.format) : value };
    }
    case 'time': {
      const d = parseDate(value, fmt.format);
      return { text: d ? formatDate(d, fmt.format) : value };
    }
    case 'special':
      return { text: applyMask(value, specialMask(fmt.psf, value)) ?? value };
    case 'mask':
      return { text: applyMask(value, fmt.mask) ?? value };
  }
}

/**
 * Normalise a committed value (what the keystroke action stores): numbers
 * lose formatting, dates are rewritten in the field's format. Returns null
 * when the value doesn't fit the format (the edit is rejected).
 */
export function commitValue(fmt: AfFormat | undefined, typed: string): string | null {
  const text = typed.trim();
  if (!fmt || text === '') return typed;
  switch (fmt.kind) {
    case 'number': {
      const n = parseNumber(text, fmt.sepStyle);
      return n === null ? null : String(round(n, Math.max(fmt.decimals, 6)));
    }
    case 'percent': {
      const n = parseNumber(text.replace('%', ''), fmt.sepStyle);
      return n === null ? null : String(round(n / 100, 8));
    }
    case 'date':
    case 'time': {
      const d = parseDate(text, fmt.format);
      return d ? formatDate(d, fmt.format) : null;
    }
    case 'special': {
      const digits = text.replace(/\D/g, '');
      return applyMask(digits, specialMask(fmt.psf, digits)) ? digits : null;
    }
    case 'mask':
      return applyMask(text, fmt.mask) === null ? null : text;
  }
}

/** Whether a partially typed value can still become valid (keystroke filtering while typing). */
export function acceptsKeystroke(fmt: AfFormat | undefined, text: string): boolean {
  if (!fmt || text === '') return true;
  switch (fmt.kind) {
    case 'number':
    case 'percent': {
      const [group, decimal] = SEPARATORS[fmt.sepStyle] ?? SEPARATORS[0];
      const allowed = new RegExp(`^[-+(]?[\\d${esc(group)}]*(${esc(decimal)}\\d*)?\\)?%?$`);
      return allowed.test(text.replace(fmt.kind === 'number' ? fmt.currency : '', '').trim());
    }
    case 'special':
      return text.replace(/\D/g, '').length <= specialMask(fmt.psf, text).replace(/[^9]/g, '').length && /^[\d\s()-]*$/.test(text);
    case 'mask': {
      if (text.length > fmt.mask.length) return false;
      return [...text].every((c, i) => maskCharOk(fmt.mask[i], c));
    }
    default:
      return true; // dates and times are checked on commit
  }
}

/** Whether a committed value is within an `AFRange_Validate` range. */
export function validateRange(range: AfRange | undefined, value: string): boolean {
  if (!range || value.trim() === '') return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  return (range.min === undefined || n >= range.min) && (range.max === undefined || n <= range.max);
}

// ── Calculation ─────────────────────────────────────────────────────────────

/** Compute a calculated field from the other fields' committed values (empty counts as 0). */
export function calculate(calc: AfCalculate, valueOf: (name: string) => string): string {
  const n = (name: string) => {
    const v = Number(valueOf(name));
    return Number.isFinite(v) ? v : 0;
  };
  if (calc.kind === 'simple') {
    const values = calc.fields.map(n);
    if (!values.length) return '';
    let result: number;
    switch (calc.op) {
      case 'SUM':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'AVG':
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'PRD':
        result = values.reduce((a, b) => a * b, 1);
        break;
      case 'MIN':
        result = Math.min(...values);
        break;
      case 'MAX':
        result = Math.max(...values);
        break;
    }
    return String(round(result, 10));
  }
  const result = evaluate(calc.expression, n);
  return result === null ? '' : String(round(result, 10));
}

interface Token {
  readonly kind: 'num' | 'name' | 'op';
  readonly value: string;
}

/** Tokens of simplified field notation: numbers, field names (`\\` escapes a character), `+ - * / ( )`. */
function tokenize(expr: string): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < expr.length; ) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
    } else if ('+-*/()'.includes(c)) {
      out.push({ kind: 'op', value: c });
      i++;
    } else if (/[\d.]/.test(c)) {
      let s = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) s += expr[i++];
      out.push({ kind: 'num', value: s });
    } else {
      let s = '';
      while (i < expr.length && !/[\s+\-*/()]/.test(expr[i])) {
        if (expr[i] === '\\' && i + 1 < expr.length) i++;
        s += expr[i++];
      }
      out.push({ kind: 'name', value: s });
    }
  }
  return out;
}

/** Evaluate an arithmetic expression over field values (recursive descent, no `eval`). */
function evaluate(expr: string, valueOf: (name: string) => number): number | null {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const primary = (): number => {
    const t = tokens[pos++];
    if (!t) throw new Error('unexpected end');
    if (t.kind === 'num') return Number(t.value);
    if (t.kind === 'name') return valueOf(t.value);
    if (t.value === '(') {
      const v = sum();
      if (tokens[pos++]?.value !== ')') throw new Error('missing )');
      return v;
    }
    if (t.value === '-') return -primary();
    if (t.value === '+') return primary();
    throw new Error(`unexpected ${t.value}`);
  };
  const product = (): number => {
    let v = primary();
    while (peek()?.value === '*' || peek()?.value === '/') {
      const op = tokens[pos++].value;
      const r = primary();
      v = op === '*' ? v * r : r === 0 ? 0 : v / r;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (peek()?.value === '+' || peek()?.value === '-') {
      const op = tokens[pos++].value;
      const r = product();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  try {
    const v = sum();
    return pos === tokens.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// ── Dates ───────────────────────────────────────────────────────────────────

/** Parse a date/time loosely in the order a format implies (numbers or month names). */
export function parseDate(text: string, format: string): Date | null {
  const parts = text.match(/\d+|[A-Za-z]+/g);
  if (!parts) return null;
  const order = format.match(/y+|m+|d+|H+|h+|M+|s+|t+/g) ?? [];
  let year = new Date().getFullYear();
  let month = 0;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let pm: boolean | null = null;
  let pi = 0;
  for (const token of order) {
    const p = parts[pi];
    if (p === undefined) break;
    switch (token[0]) {
      case 'y':
        if (!/^\d+$/.test(p)) return null;
        year = Number(p) < 100 ? 2000 + Number(p) - (Number(p) > 50 ? 100 : 0) : Number(p);
        break;
      case 'm': {
        const m = /^\d+$/.test(p) ? Number(p) - 1 : MONTHS.findIndex((name) => name.toLowerCase().startsWith(p.toLowerCase().slice(0, 3)));
        if (m < 0 || m > 11) return null;
        month = m;
        break;
      }
      case 'd':
        if (!/^\d+$/.test(p) || Number(p) < 1 || Number(p) > 31) return null;
        day = Number(p);
        break;
      case 'H':
      case 'h':
        hour = Number(p);
        break;
      case 'M':
        minute = Number(p);
        break;
      case 's':
        second = Number(p);
        break;
      case 't':
        pm = /^p/i.test(p);
        break;
    }
    pi++;
  }
  // A trailing am/pm that the format didn't list in order.
  const tt = parts.find((p) => /^(am|pm|a|p)$/i.test(p));
  if (tt && pm === null) pm = /^p/i.test(tt);
  if (pm !== null && hour < 12 && pm) hour += 12;
  if (pm === false && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const d = new Date(year, month, day, hour, minute, second);
  return d.getMonth() === month ? d : null; // rejects 31 February
}

/** Format a date with Acrobat's tokens (`d dd ddd dddd m mm mmm mmmm yy yyyy H HH h hh MM ss tt`). */
export function formatDate(d: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return format.replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|HH|H|hh|h|MM|M|ss|s|tt|t/g, (t) => {
    const h12 = d.getHours() % 12 || 12;
    switch (t) {
      case 'yyyy':
        return String(d.getFullYear());
      case 'yy':
        return pad(d.getFullYear() % 100);
      case 'mmmm':
        return MONTHS[d.getMonth()];
      case 'mmm':
        return MONTHS[d.getMonth()].slice(0, 3);
      case 'mm':
        return pad(d.getMonth() + 1);
      case 'm':
        return String(d.getMonth() + 1);
      case 'dddd':
        return days[d.getDay()];
      case 'ddd':
        return days[d.getDay()].slice(0, 3);
      case 'dd':
        return pad(d.getDate());
      case 'd':
        return String(d.getDate());
      case 'HH':
        return pad(d.getHours());
      case 'H':
        return String(d.getHours());
      case 'hh':
        return pad(h12);
      case 'h':
        return String(h12);
      case 'MM':
        return pad(d.getMinutes());
      case 'M':
        return String(d.getMinutes());
      case 'ss':
        return pad(d.getSeconds());
      case 's':
        return String(d.getSeconds());
      case 'tt':
        return d.getHours() < 12 ? 'am' : 'pm';
      default:
        return d.getHours() < 12 ? 'a' : 'p';
    }
  });
}

// ── Masks ───────────────────────────────────────────────────────────────────

function specialMask(psf: number, value: string): string {
  // Phone numbers without an area code use the short form.
  if (psf === 2 && value.replace(/\D/g, '').length <= 7) return '999-9999';
  return SPECIAL_MASKS[psf] ?? SPECIAL_MASKS[0];
}

function maskCharOk(m: string | undefined, c: string): boolean {
  switch (m) {
    case '9':
      return /\d/.test(c);
    case 'A':
      return /[A-Za-z]/.test(c);
    case 'O':
      return /[A-Za-z0-9]/.test(c);
    case 'X':
      return true;
    default:
      return c === m;
  }
}

/** Fit a value's significant characters into a mask; null when they don't fit. */
function applyMask(value: string, mask: string): string | null {
  const chars = [...value].filter((c) => /[A-Za-z0-9]/.test(c));
  let out = '';
  let ci = 0;
  for (const m of mask) {
    if ('9AOX'.includes(m)) {
      const c = chars[ci++];
      if (c === undefined || !maskCharOk(m, c)) return null;
      out += c;
    } else {
      out += m;
    }
  }
  return ci === chars.length ? out : null;
}

function round(n: number, decimals: number): number {
  const k = Math.pow(10, decimals);
  return Math.round(n * k) / k;
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
