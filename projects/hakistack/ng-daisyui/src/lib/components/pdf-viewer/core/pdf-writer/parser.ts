import { PdfArray, PdfDict, PdfName, PdfParseError, PdfRef, PdfStream, PdfString, PdfValue } from './objects';

/** ISO 32000-1 §7.2.2: white-space characters. */
const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
/** Delimiters: ( ) < > [ ] { } / % */
const DELIMITERS = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

const isWhitespace = (c: number): boolean => WHITESPACE.has(c);
const isRegular = (c: number): boolean => !WHITESPACE.has(c) && !DELIMITERS.has(c);
const isDigit = (c: number): boolean => c >= 0x30 && c <= 0x39;

/** Resolves an indirect /Length while parsing a stream (its value may live elsewhere in the file). */
export type LengthResolver = (ref: PdfRef) => number | undefined;

/**
 * Parses PDF objects from bytes (§7.3), starting at an offset. Handles
 * comments, all object types, `N G obj … endobj` wrappers and streams. A
 * stream whose /Length is missing or wrong is recovered by scanning for
 * `endstream`.
 */
export class PdfParser {
  pos: number;

  constructor(
    readonly bytes: Uint8Array,
    offset = 0,
    private readonly resolveLength?: LengthResolver,
  ) {
    this.pos = offset;
  }

  // ── Indirect objects ────────────────────────────────────────────────────

  /** Parse `N G obj <value> endobj` at the current position. */
  parseIndirectObject(): { ref: PdfRef; value: PdfValue } {
    const start = this.pos;
    const num = this.parseValue();
    const gen = this.parseValue();
    this.skipWhitespaceAndComments();
    if (typeof num !== 'number' || typeof gen !== 'number' || !this.consumeKeyword('obj')) {
      throw new PdfParseError('expected an indirect object header', start);
    }
    const value = this.parseValue(true);
    this.skipWhitespaceAndComments();
    this.consumeKeyword('endobj'); // tolerate a missing endobj
    return { ref: new PdfRef(num, gen), value };
  }

  // ── Values ──────────────────────────────────────────────────────────────

  /** Parse one value. With `allowStream`, a dictionary followed by `stream` becomes a {@link PdfStream}. */
  parseValue(allowStream = false): PdfValue {
    this.skipWhitespaceAndComments();
    const b = this.bytes;
    if (this.pos >= b.length) throw new PdfParseError('unexpected end of data', this.pos);
    const c = b[this.pos];

    if (c === 0x2f) return this.parseName();
    if (c === 0x28) return this.parseLiteralString();
    if (c === 0x3c) {
      if (b[this.pos + 1] === 0x3c) {
        const dict = this.parseDict();
        if (allowStream) {
          const save = this.pos;
          this.skipWhitespaceAndComments();
          if (this.consumeKeyword('stream')) return this.parseStreamBody(dict);
          this.pos = save;
        }
        return dict;
      }
      return this.parseHexString();
    }
    if (c === 0x5b) return this.parseArray();
    if (isDigit(c) || c === 0x2b || c === 0x2d || c === 0x2e) return this.parseNumberOrRef();

    const word = this.readWord();
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    throw new PdfParseError(`unexpected token '${word || String.fromCharCode(c)}'`, this.pos);
  }

  private parseNumberOrRef(): number | PdfRef {
    const n = this.parseNumber();
    // `N G R`: look ahead for a non-negative integer and an R, without consuming otherwise.
    if (Number.isInteger(n) && n >= 0) {
      const save = this.pos;
      this.skipWhitespaceAndComments();
      if (isDigit(this.bytes[this.pos])) {
        const gen = this.parseNumber();
        this.skipWhitespaceAndComments();
        if (Number.isInteger(gen) && this.bytes[this.pos] === 0x52 /* R */ && !isRegular(this.bytes[this.pos + 1] ?? 0x20)) {
          this.pos++;
          return new PdfRef(n, gen);
        }
      }
      this.pos = save;
    }
    return n;
  }

  private parseNumber(): number {
    const start = this.pos;
    const b = this.bytes;
    let text = '';
    while (this.pos < b.length && (isDigit(b[this.pos]) || b[this.pos] === 0x2b || b[this.pos] === 0x2d || b[this.pos] === 0x2e)) {
      text += String.fromCharCode(b[this.pos++]);
    }
    // Some writers emit "--5" or "5-"; keep the leading sign and the digits.
    const n = Number(text.replace(/(?<=.)[+-]/g, '').replace(/^([+-])[+-]+/, '$1'));
    if (!Number.isFinite(n)) throw new PdfParseError(`bad number '${text}'`, start);
    return n;
  }

  private parseName(): PdfName {
    const b = this.bytes;
    this.pos++; // '/'
    const out: number[] = [];
    while (this.pos < b.length && isRegular(b[this.pos])) {
      const c = b[this.pos++];
      if (c === 0x23 /* # */ && this.pos + 1 < b.length) {
        const code = parseInt(String.fromCharCode(b[this.pos], b[this.pos + 1]), 16);
        if (!Number.isNaN(code)) {
          out.push(code);
          this.pos += 2;
          continue;
        }
      }
      out.push(c);
    }
    return PdfName.of(new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(out)));
  }

  private parseLiteralString(): PdfString {
    const b = this.bytes;
    const start = this.pos;
    this.pos++; // '('
    const out: number[] = [];
    let depth = 1;
    while (this.pos < b.length) {
      const c = b[this.pos++];
      if (c === 0x5c /* \ */) {
        const e = b[this.pos++];
        switch (e) {
          case 0x6e:
            out.push(0x0a);
            break; // \n
          case 0x72:
            out.push(0x0d);
            break; // \r
          case 0x74:
            out.push(0x09);
            break; // \t
          case 0x62:
            out.push(0x08);
            break; // \b
          case 0x66:
            out.push(0x0c);
            break; // \f
          case 0x0d: // line continuation: \ + EOL is ignored
            if (b[this.pos] === 0x0a) this.pos++;
            break;
          case 0x0a:
            break;
          default:
            if (e >= 0x30 && e <= 0x37) {
              let code = e - 0x30;
              for (let i = 0; i < 2 && b[this.pos] >= 0x30 && b[this.pos] <= 0x37; i++) code = code * 8 + (b[this.pos++] - 0x30);
              out.push(code & 0xff);
            } else {
              out.push(e); // \( \) \\ and unknown escapes → the char itself
            }
        }
        continue;
      }
      if (c === 0x28) depth++;
      else if (c === 0x29 && --depth === 0) return new PdfString(Uint8Array.from(out));
      out.push(c);
    }
    throw new PdfParseError('unterminated string', start);
  }

  private parseHexString(): PdfString {
    const b = this.bytes;
    const start = this.pos;
    this.pos++; // '<'
    let hex = '';
    while (this.pos < b.length && b[this.pos] !== 0x3e) {
      const c = b[this.pos++];
      if (!isWhitespace(c)) hex += String.fromCharCode(c);
    }
    if (this.pos >= b.length) throw new PdfParseError('unterminated hex string', start);
    this.pos++; // '>'
    if (hex.length % 2) hex += '0';
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16) || 0;
    return new PdfString(out, true);
  }

  private parseArray(): PdfArray {
    this.pos++; // '['
    const out: PdfArray = [];
    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.bytes.length) throw new PdfParseError('unterminated array', this.pos);
      if (this.bytes[this.pos] === 0x5d) {
        this.pos++;
        return out;
      }
      out.push(this.parseValue());
    }
  }

  private parseDict(): PdfDict {
    this.pos += 2; // '<<'
    const dict = new PdfDict();
    for (;;) {
      this.skipWhitespaceAndComments();
      const b = this.bytes;
      if (this.pos >= b.length) throw new PdfParseError('unterminated dictionary', this.pos);
      if (b[this.pos] === 0x3e && b[this.pos + 1] === 0x3e) {
        this.pos += 2;
        return dict;
      }
      const key = this.parseValue();
      if (!(key instanceof PdfName)) throw new PdfParseError('dictionary key is not a name', this.pos);
      this.skipWhitespaceAndComments();
      if (b[this.pos] === 0x3e && b[this.pos + 1] === 0x3e) {
        // A key without a value: treat as null rather than failing the whole object.
        dict.set(key.value, null);
        continue;
      }
      dict.set(key.value, this.parseValue());
    }
  }

  /** After the `stream` keyword: an EOL, then /Length bytes (or up to `endstream` when that's wrong). */
  private parseStreamBody(dict: PdfDict): PdfStream {
    const b = this.bytes;
    if (b[this.pos] === 0x0d) this.pos++;
    if (b[this.pos] === 0x0a) this.pos++;
    const start = this.pos;

    let length = dict.get('Length');
    if (length instanceof PdfRef) length = this.resolveLength?.(length);
    if (typeof length === 'number' && length >= 0 && start + length <= b.length && this.endstreamFollows(start + length)) {
      this.pos = start + length;
    } else {
      const end = this.findEndstream(start);
      if (end < 0) throw new PdfParseError('stream without endstream', start);
      // Drop the EOL that precedes `endstream`.
      let dataEnd = end;
      if (b[dataEnd - 1] === 0x0a) dataEnd--;
      if (b[dataEnd - 1] === 0x0d) dataEnd--;
      this.pos = dataEnd;
    }
    const data = b.slice(start, this.pos);
    this.skipWhitespaceAndComments();
    this.consumeKeyword('endstream');
    return new PdfStream(dict, data);
  }

  private endstreamFollows(at: number): boolean {
    let p = at;
    while (p < this.bytes.length && isWhitespace(this.bytes[p])) p++;
    return matchesAt(this.bytes, p, 'endstream');
  }

  private findEndstream(from: number): number {
    const b = this.bytes;
    for (let p = from; p < b.length - 8; p++) {
      if (b[p] === 0x65 /* e */ && matchesAt(b, p, 'endstream')) return p;
    }
    return -1;
  }

  // ── Lexing helpers ──────────────────────────────────────────────────────

  skipWhitespaceAndComments(): void {
    const b = this.bytes;
    while (this.pos < b.length) {
      const c = b[this.pos];
      if (isWhitespace(c)) {
        this.pos++;
      } else if (c === 0x25 /* % */) {
        while (this.pos < b.length && b[this.pos] !== 0x0a && b[this.pos] !== 0x0d) this.pos++;
      } else {
        return;
      }
    }
  }

  /** Read a run of regular characters (a keyword such as `obj`, `R`, `true`). */
  readWord(): string {
    const b = this.bytes;
    let word = '';
    while (this.pos < b.length && isRegular(b[this.pos])) word += String.fromCharCode(b[this.pos++]);
    return word;
  }

  /** Consume `keyword` if it's next (and is a whole word). */
  consumeKeyword(keyword: string): boolean {
    if (!matchesAt(this.bytes, this.pos, keyword)) return false;
    const after = this.bytes[this.pos + keyword.length];
    if (after !== undefined && isRegular(after)) return false;
    this.pos += keyword.length;
    return true;
  }
}

/** Whether `text` (ASCII) occurs in `bytes` at `at`. */
export function matchesAt(bytes: Uint8Array, at: number, text: string): boolean {
  if (at < 0 || at + text.length > bytes.length) return false;
  for (let i = 0; i < text.length; i++) if (bytes[at + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** Last occurrence of `text` (ASCII) in `bytes` at or before `from`, or -1. */
export function lastIndexOf(bytes: Uint8Array, text: string, from = bytes.length - text.length): number {
  for (let p = Math.min(from, bytes.length - text.length); p >= 0; p--) if (matchesAt(bytes, p, text)) return p;
  return -1;
}
