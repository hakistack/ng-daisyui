import { PdfDict, PdfName, PdfRef, PdfStream, PdfString, PdfValue } from './objects';

const encoder = new TextEncoder();

/**
 * Format a number for a PDF file: integers as-is, reals with at most 6
 * decimals, trailing zeros removed, never exponent notation (§7.3.3).
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  let s = n.toFixed(6);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/** Escape a name per §7.3.5: anything outside `!`..`~`, plus delimiters and `#`, as `#xx`. */
function formatName(value: string): string {
  let out = '/';
  for (const byte of encoder.encode(value)) {
    const regular = byte > 0x20 && byte < 0x7f && !'()<>[]{}/%#'.includes(String.fromCharCode(byte));
    out += regular ? String.fromCharCode(byte) : `#${byte.toString(16).padStart(2, '0')}`;
  }
  return out;
}

function formatString(s: PdfString): string {
  if (s.hex) {
    let hex = '<';
    for (const b of s.bytes) hex += b.toString(16).padStart(2, '0');
    return hex + '>';
  }
  let out = '(';
  for (const b of s.bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out += '\\' + String.fromCharCode(b);
    else if (b === 0x0d) out += '\\r';
    else if (b === 0x0a) out += '\\n';
    else if (b < 0x20 || b > 0x7e) out += '\\' + b.toString(8).padStart(3, '0');
    else out += String.fromCharCode(b);
  }
  return out + ')';
}

/** Serialize a value (not a stream) as PDF syntax. Output is ASCII. */
export function serializeValue(value: PdfValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return formatNumber(value);
  if (value instanceof PdfName) return formatName(value.value);
  if (value instanceof PdfString) return formatString(value);
  if (value instanceof PdfRef) return `${value.num} ${value.gen} R`;
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(' ')}]`;
  if (value instanceof PdfDict) {
    let out = '<<';
    for (const [k, v] of value) out += `${formatName(k)} ${serializeValue(v)}`;
    return out + '>>';
  }
  if (value instanceof PdfStream) throw new Error('streams can only be written as indirect objects');
  throw new Error(`cannot serialize ${String(value)}`);
}

/** Serialize `N G obj … endobj`. A stream's /Length is set from its data. */
export function serializeIndirectObject(ref: PdfRef, value: PdfValue): Uint8Array {
  const head = `${ref.num} ${ref.gen} obj\n`;
  if (value instanceof PdfStream) {
    value.dict.set('Length', value.data.length);
    const dict = encoder.encode(`${head}${serializeValue(value.dict)}\nstream\n`);
    const tail = encoder.encode('\nendstream\nendobj\n');
    return concatBytes([dict, value.data, tail]);
  }
  return encoder.encode(`${head}${serializeValue(value)}\nendobj\n`);
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
