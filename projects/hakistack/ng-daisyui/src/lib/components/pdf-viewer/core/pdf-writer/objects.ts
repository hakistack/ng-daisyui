/**
 * The PDF object model (ISO 32000-1 §7.3): null, booleans, numbers, names,
 * strings, arrays, dictionaries, indirect references and streams.
 */

/** A name object (`/Type`). Interned, so names compare by identity. */
export class PdfName {
  private static readonly interned = new Map<string, PdfName>();

  private constructor(readonly value: string) {}

  static of(value: string): PdfName {
    let name = PdfName.interned.get(value);
    if (!name) {
      name = new PdfName(value);
      PdfName.interned.set(value, name);
    }
    return name;
  }

  toString(): string {
    return `/${this.value}`;
  }
}

/** Shorthand for {@link PdfName.of}. */
export const name = (value: string): PdfName => PdfName.of(value);

/**
 * A string object: raw bytes, as stored in the file. Text strings are
 * PDFDocEncoding or UTF-16BE with a BOM (§7.9.2.2); {@link text} decodes both.
 */
export class PdfString {
  constructor(
    readonly bytes: Uint8Array,
    /** Written as `<hex>` instead of `(literal)`. */
    readonly hex = false,
  ) {}

  /** A text string: PDFDocEncoding when every char fits in Latin-1, else UTF-16BE with a BOM. */
  static text(value: string): PdfString {
    if (/^[\u0000-ÿ]*$/.test(value)) {
      const bytes = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i);
      return new PdfString(bytes);
    }
    const bytes = new Uint8Array(2 + value.length * 2);
    bytes[0] = 0xfe;
    bytes[1] = 0xff;
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      bytes[2 + i * 2] = c >> 8;
      bytes[3 + i * 2] = c & 0xff;
    }
    return new PdfString(bytes);
  }

  /** Raw bytes as a string, one char per byte (for byte-oriented values such as /ID). */
  static bytes(value: Uint8Array, hex = true): PdfString {
    return new PdfString(value, hex);
  }

  /** Decode as a text string (UTF-16BE with BOM, UTF-8 with BOM, or PDFDocEncoding treated as Latin-1). */
  text(): string {
    const b = this.bytes;
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
      let out = '';
      for (let i = 2; i + 1 < b.length; i += 2) out += String.fromCharCode((b[i] << 8) | b[i + 1]);
      return out;
    }
    if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder().decode(b.subarray(3));
    let out = '';
    for (const c of b) out += String.fromCharCode(c);
    return out;
  }
}

/** An indirect reference (`12 0 R`). */
export class PdfRef {
  constructor(
    readonly num: number,
    readonly gen = 0,
  ) {}

  get key(): string {
    return `${this.num} ${this.gen}`;
  }

  equals(other: PdfRef): boolean {
    return this.num === other.num && this.gen === other.gen;
  }

  toString(): string {
    return `${this.num} ${this.gen} R`;
  }
}

export type PdfArray = PdfValue[];

/** A dictionary. Keys are names without the slash; insertion order is kept when writing. */
export class PdfDict {
  private readonly entries = new Map<string, PdfValue>();

  constructor(init?: Record<string, PdfValue | undefined> | Iterable<[string, PdfValue]>) {
    if (!init) return;
    const pairs = Symbol.iterator in init ? (init as Iterable<[string, PdfValue]>) : Object.entries(init);
    for (const [k, v] of pairs) if (v !== undefined) this.entries.set(k, v);
  }

  get size(): number {
    return this.entries.size;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): PdfValue | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: PdfValue): this {
    this.entries.set(key, value);
    return this;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  keys(): IterableIterator<string> {
    return this.entries.keys();
  }

  [Symbol.iterator](): IterableIterator<[string, PdfValue]> {
    return this.entries.entries();
  }

  /** The value as a name string (`/Type /Page` → `'Page'`), or `undefined`. */
  getName(key: string): string | undefined {
    const v = this.entries.get(key);
    return v instanceof PdfName ? v.value : undefined;
  }

  getNumber(key: string): number | undefined {
    const v = this.entries.get(key);
    return typeof v === 'number' ? v : undefined;
  }

  /** Shallow copy (values are shared). */
  clone(): PdfDict {
    return new PdfDict(this.entries);
  }
}

/** A stream: its dictionary plus the data exactly as stored (still encoded by its /Filter). */
export class PdfStream {
  constructor(
    readonly dict: PdfDict,
    public data: Uint8Array,
  ) {}
}

/** Any PDF value. `null` is the null object. */
export type PdfValue = null | boolean | number | PdfName | PdfString | PdfArray | PdfDict | PdfRef | PdfStream;

export function isDict(v: PdfValue | undefined): v is PdfDict {
  return v instanceof PdfDict;
}

export function isRef(v: PdfValue | undefined): v is PdfRef {
  return v instanceof PdfRef;
}

/** Thrown for input the reader can't make sense of. */
export class PdfParseError extends Error {
  constructor(
    message: string,
    readonly offset?: number,
  ) {
    super(offset === undefined ? message : `${message} (at byte ${offset})`);
    this.name = 'PdfParseError';
  }
}
