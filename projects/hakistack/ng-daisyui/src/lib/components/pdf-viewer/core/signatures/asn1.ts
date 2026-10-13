/**
 * ASN.1 DER: just enough to read and write the structures of PDF
 * signatures (CMS SignedData, X.509 certificates, signed attributes).
 */

export interface Asn1 {
  /** Identifier octet (class, constructed bit and tag number for low tags). */
  readonly tag: number;
  /** The whole element (header and content). */
  readonly raw: Uint8Array;
  /** The content octets. */
  readonly value: Uint8Array;
  /** Children of a constructed element. */
  readonly children: readonly Asn1[];
}

export const TAG = {
  BOOLEAN: 0x01,
  INTEGER: 0x02,
  BIT_STRING: 0x03,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OID: 0x06,
  UTF8_STRING: 0x0c,
  PRINTABLE_STRING: 0x13,
  IA5_STRING: 0x16,
  UTC_TIME: 0x17,
  GENERALIZED_TIME: 0x18,
  SEQUENCE: 0x30,
  SET: 0x31,
} as const;

/** Context-specific tag `[n]` (constructed unless `primitive`). */
export const context = (n: number, primitive = false) => (primitive ? 0x80 : 0xa0) | n;

// ── Reading ─────────────────────────────────────────────────────────────────

/** Parse one DER element at `offset` (indefinite lengths, as some BER signers emit, are followed too). */
export function parseDer(bytes: Uint8Array, offset = 0): Asn1 {
  const tag = bytes[offset];
  let p = offset + 1;
  if ((tag & 0x1f) === 0x1f) while (bytes[p++] & 0x80); // high tag numbers: skipped (unused here)
  let length = bytes[p++];
  let indefinite = false;
  if (length === 0x80) {
    indefinite = true;
    length = -1;
  } else if (length & 0x80) {
    const n = length & 0x7f;
    length = 0;
    for (let i = 0; i < n; i++) length = length * 256 + bytes[p++];
  }
  const constructed = (tag & 0x20) !== 0;
  const children: Asn1[] = [];
  let end: number;
  if (indefinite) {
    let q = p;
    while (!(bytes[q] === 0 && bytes[q + 1] === 0)) {
      const child = parseDer(bytes, q);
      children.push(child);
      q += child.raw.length;
    }
    end = q + 2;
  } else {
    end = p + length;
    if (end > bytes.length) throw new Error('ASN.1: length past the end of the data');
    if (constructed) {
      for (let q = p; q < end; ) {
        const child = parseDer(bytes, q);
        children.push(child);
        q += child.raw.length;
      }
    }
  }
  return { tag, raw: bytes.subarray(offset, end), value: bytes.subarray(p, indefinite ? end - 2 : end), children };
}

export function oidToString(value: Uint8Array): string {
  const parts: number[] = [Math.floor(value[0] / 40), value[0] % 40];
  let n = 0;
  for (let i = 1; i < value.length; i++) {
    n = n * 128 + (value[i] & 0x7f);
    if (!(value[i] & 0x80)) {
      parts.push(n);
      n = 0;
    }
  }
  return parts.join('.');
}

/** A UTCTime or GeneralizedTime as a Date. */
export function readTime(el: Asn1): Date {
  const s = new TextDecoder().decode(el.value);
  const digits = el.tag === TAG.UTC_TIME ? 2 : 4;
  const m = new RegExp(`^(\\d{${digits}})(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})?(?:\\.\\d+)?(Z|[+-]\\d{4})?$`).exec(s);
  if (!m) return new Date(NaN);
  let year = Number(m[1]);
  if (m[1].length === 2) year += year < 50 ? 2000 : 1900;
  const tz = !m[7] || m[7] === 'Z' ? 'Z' : `${m[7].slice(0, 3)}:${m[7].slice(3)}`;
  return new Date(`${year}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}${tz}`);
}

export function readString(el: Asn1): string {
  if (el.tag === 0x1e) {
    // BMPString (UTF-16BE)
    let s = '';
    for (let i = 0; i + 1 < el.value.length; i += 2) s += String.fromCharCode((el.value[i] << 8) | el.value[i + 1]);
    return s;
  }
  return new TextDecoder(el.tag === TAG.UTF8_STRING ? 'utf-8' : 'latin1').decode(el.value);
}

// ── Writing ─────────────────────────────────────────────────────────────────

/** A DER element from a tag and content octets. */
export function der(tag: number, content: Uint8Array): Uint8Array {
  const len = content.length;
  let header: number[];
  if (len < 0x80) header = [tag, len];
  else {
    const bytes: number[] = [];
    for (let n = len; n > 0; n = Math.floor(n / 256)) bytes.unshift(n & 0xff);
    header = [tag, 0x80 | bytes.length, ...bytes];
  }
  const out = new Uint8Array(header.length + len);
  out.set(header);
  out.set(content, header.length);
  return out;
}

export const seq = (...items: Uint8Array[]) => der(TAG.SEQUENCE, concat(items));

/** A SET OF, its elements sorted as DER requires. */
export function setOf(...items: Uint8Array[]): Uint8Array {
  const sorted = [...items].sort((a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  });
  return der(TAG.SET, concat(sorted));
}

export function oid(dotted: string): Uint8Array {
  const parts = dotted.split('.').map(Number);
  const out = [parts[0] * 40 + parts[1]];
  for (const n of parts.slice(2)) {
    const bytes = [n & 0x7f];
    for (let v = Math.floor(n / 128); v > 0; v = Math.floor(v / 128)) bytes.unshift((v & 0x7f) | 0x80);
    out.push(...bytes);
  }
  return der(TAG.OID, Uint8Array.from(out));
}

/** A non-negative INTEGER from big-endian bytes (a leading zero keeps it positive). */
export function integer(bytes: Uint8Array | number): Uint8Array {
  let b = typeof bytes === 'number' ? Uint8Array.from(bytes === 0 ? [0] : bigEndian(bytes)) : bytes;
  let start = 0;
  while (start < b.length - 1 && b[start] === 0 && !(b[start + 1] & 0x80)) start++;
  b = b.subarray(start);
  return der(TAG.INTEGER, b[0] & 0x80 ? concat([Uint8Array.of(0), b]) : b);
}

export const octetString = (b: Uint8Array) => der(TAG.OCTET_STRING, b);
export const bitString = (b: Uint8Array) => der(TAG.BIT_STRING, concat([Uint8Array.of(0), b]));
export const nul = () => der(TAG.NULL, new Uint8Array());
export const utf8 = (s: string) => der(TAG.UTF8_STRING, new TextEncoder().encode(s));
export const explicit = (n: number, inner: Uint8Array) => der(context(n), inner);

/** UTCTime (years 1950–2049) or GeneralizedTime. */
export function time(d: Date): Uint8Array {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getUTCFullYear();
  const rest = `${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  return y >= 1950 && y < 2050
    ? der(TAG.UTC_TIME, new TextEncoder().encode(`${pad(y % 100)}${rest}`))
    : der(TAG.GENERALIZED_TIME, new TextEncoder().encode(`${y}${rest}`));
}

function bigEndian(n: number): number[] {
  const out: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) out.unshift(v & 0xff);
  return out;
}

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
