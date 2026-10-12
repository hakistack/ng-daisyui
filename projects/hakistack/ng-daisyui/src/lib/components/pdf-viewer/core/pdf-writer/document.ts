import { decodeStream } from './filters';
import { PdfDict, PdfParseError, PdfRef, PdfStream, PdfString, PdfValue, isDict } from './objects';
import { PdfParser } from './parser';
import { XrefTable, readXref } from './xref';

/** Thrown for valid PDFs the writer doesn't handle yet (e.g. encryption). */
export class PdfUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfUnsupportedError';
  }
}

/** A page of the document: its object reference and dictionary. */
export interface PdfPageRef {
  readonly ref: PdfRef;
  readonly dict: PdfDict;
}

/**
 * A PDF opened for incremental editing. Lazy: loading reads only the
 * cross-reference data and trailer; objects are parsed on first access
 * (including those packed in object streams) and cached. Edits are recorded
 * as new versions of objects and new objects; {@link saveIncremental} appends
 * just those, so the cost of saving follows the size of the change, not of
 * the document.
 */
export class PdfDoc {
  private readonly cache = new Map<number, PdfValue>();
  private readonly objectStreams = new Map<number, Promise<Map<number, PdfValue>>>();
  /** Objects changed or created in this session, by object number. */
  readonly changes = new Map<number, { ref: PdfRef; value: PdfValue }>();
  /** Objects deleted in this session. */
  readonly deletions = new Map<number, PdfRef>();
  private nextNumber: number;

  private constructor(
    readonly bytes: Uint8Array,
    readonly xref: XrefTable,
  ) {
    const size = xref.trailer.getNumber('Size') ?? 0;
    this.nextNumber = Math.max(size, Math.max(0, ...xref.entries.keys()) + 1);
  }

  static async load(bytes: Uint8Array): Promise<PdfDoc> {
    const xref = await readXref(bytes);
    if (xref.trailer.has('Encrypt')) throw new PdfUnsupportedError('encrypted PDFs are not supported yet');
    return new PdfDoc(bytes, xref);
  }

  get trailer(): PdfDict {
    return this.xref.trailer;
  }

  /** The PDF header version, e.g. `1.7`. */
  get version(): string {
    const head = new TextDecoder('latin1').decode(this.bytes.subarray(0, 16));
    return /%PDF-(\d\.\d)/.exec(head)?.[1] ?? '1.4';
  }

  // ── Reading ─────────────────────────────────────────────────────────────

  /** The object `ref` points at (the edited version if it was changed), or `null`. */
  async get(ref: PdfRef): Promise<PdfValue> {
    const changed = this.changes.get(ref.num);
    if (changed) return changed.value;
    if (this.deletions.has(ref.num)) return null;
    if (this.cache.has(ref.num)) return this.cache.get(ref.num)!;
    const value = await this.readObject(ref.num);
    this.cache.set(ref.num, value);
    return value;
  }

  /** Follow references until a direct value. */
  async resolve(value: PdfValue | undefined): Promise<PdfValue> {
    let v: PdfValue = value ?? null;
    for (let hops = 0; v instanceof PdfRef && hops < 32; hops++) v = await this.get(v);
    return v;
  }

  /** Resolve `value` and return it if it's a dictionary (a stream's dictionary counts). */
  async dict(value: PdfValue | undefined): Promise<PdfDict | null> {
    const v = await this.resolve(value);
    if (v instanceof PdfStream) return v.dict;
    return isDict(v) ? v : null;
  }

  async catalog(): Promise<PdfDict> {
    const root = await this.dict(this.trailer.get('Root'));
    if (!root) throw new PdfParseError('document has no catalog');
    return root;
  }

  /** Every page, in order (walks the page tree, guarding against cycles). */
  async pages(): Promise<PdfPageRef[]> {
    const catalog = await this.catalog();
    const out: PdfPageRef[] = [];
    const visited = new Set<string>();
    const walk = async (node: PdfValue | undefined): Promise<void> => {
      if (!(node instanceof PdfRef) || visited.has(node.key)) return;
      visited.add(node.key);
      const dict = await this.dict(node);
      if (!dict) return;
      if (dict.getName('Type') === 'Page' || (!dict.has('Kids') && dict.has('MediaBox'))) {
        out.push({ ref: node, dict });
        return;
      }
      const kids = await this.resolve(dict.get('Kids'));
      if (Array.isArray(kids)) for (const kid of kids) await walk(kid);
    };
    await walk(catalog.get('Pages'));
    return out;
  }

  /** A page attribute, following /Parent inheritance (§7.7.3.4) for Resources, MediaBox, CropBox and Rotate. */
  async inherited(page: PdfDict, key: 'Resources' | 'MediaBox' | 'CropBox' | 'Rotate'): Promise<PdfValue | undefined> {
    let node: PdfDict | null = page;
    for (let depth = 0; node && depth < 64; depth++) {
      if (node.has(key)) return node.get(key);
      node = await this.dict(node.get('Parent'));
    }
    return undefined;
  }

  /** Decoded stream data. */
  async streamData(value: PdfValue | undefined): Promise<Uint8Array | null> {
    const v = await this.resolve(value);
    return v instanceof PdfStream ? decodeStream(v) : null;
  }

  // ── Editing ─────────────────────────────────────────────────────────────

  /** Add a new object; returns its reference. */
  add(value: PdfValue): PdfRef {
    const ref = new PdfRef(this.nextNumber++, 0);
    this.changes.set(ref.num, { ref, value });
    return ref;
  }

  /** Record a new version of an existing object. */
  update(ref: PdfRef, value: PdfValue): void {
    this.deletions.delete(ref.num);
    this.changes.set(ref.num, { ref, value });
    this.cache.set(ref.num, value);
  }

  /** Free an object. */
  delete(ref: PdfRef): void {
    this.changes.delete(ref.num);
    this.cache.delete(ref.num);
    this.deletions.set(ref.num, ref);
  }

  /** Whether anything was changed. */
  get modified(): boolean {
    return this.changes.size > 0 || this.deletions.size > 0;
  }

  /** The document information dictionary, created (as a new object) when missing. */
  async info(): Promise<{ ref: PdfRef; dict: PdfDict }> {
    const infoRef = this.trailer.get('Info');
    if (infoRef instanceof PdfRef) {
      const dict = await this.dict(infoRef);
      if (dict) return { ref: infoRef, dict };
    }
    const dict = new PdfDict();
    const ref = this.add(dict);
    this.trailer.set('Info', ref);
    return { ref, dict };
  }

  /** Set document information entries (Title, Author, …) as text strings, and ModDate to now. */
  async setInfo(values: Record<string, string>): Promise<void> {
    const { ref, dict } = await this.info();
    const next = dict.clone();
    for (const [k, v] of Object.entries(values)) next.set(k, PdfString.text(v));
    next.set('ModDate', PdfString.text(pdfDate(new Date())));
    this.update(ref, next);
  }

  /** The first free object number (for the trailer's /Size). */
  get size(): number {
    return this.nextNumber;
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async readObject(num: number): Promise<PdfValue> {
    const entry = this.xref.entries.get(num);
    if (!entry || entry.type === 'free') return null;
    if (entry.type === 'compressed') {
      const objects = await this.objectStream(entry.stream);
      return objects.get(num) ?? null;
    }
    const parser = new PdfParser(this.bytes, entry.offset, (ref) => this.syncLength(ref));
    try {
      return parser.parseIndirectObject().value;
    } catch (err) {
      throw new PdfParseError(`object ${num}: ${(err as Error).message}`);
    }
  }

  /** Resolve an indirect stream /Length without awaiting (only plain, uncompressed integers qualify). */
  private syncLength(ref: PdfRef): number | undefined {
    const cached = this.cache.get(ref.num);
    if (typeof cached === 'number') return cached;
    const entry = this.xref.entries.get(ref.num);
    if (entry?.type !== 'offset') return undefined;
    try {
      const v = new PdfParser(this.bytes, entry.offset).parseIndirectObject().value;
      return typeof v === 'number' ? v : undefined;
    } catch {
      return undefined;
    }
  }

  /** Parse an object stream (§7.5.7) once: `N` pairs of `objNum offset`, then the objects from `/First`. */
  private objectStream(num: number): Promise<Map<number, PdfValue>> {
    let parsed = this.objectStreams.get(num);
    if (!parsed) {
      parsed = (async () => {
        const stream = await this.get(new PdfRef(num, 0));
        if (!(stream instanceof PdfStream)) throw new PdfParseError(`object stream ${num} is not a stream`);
        const data = await decodeStream(stream);
        const n = stream.dict.getNumber('N') ?? 0;
        const first = stream.dict.getNumber('First') ?? 0;
        const header = new PdfParser(data, 0);
        const index: [number, number][] = [];
        for (let i = 0; i < n; i++) {
          const objNum = header.parseValue();
          const offset = header.parseValue();
          if (typeof objNum === 'number' && typeof offset === 'number') index.push([objNum, offset]);
        }
        const objects = new Map<number, PdfValue>();
        for (const [objNum, offset] of index) {
          try {
            objects.set(objNum, new PdfParser(data, first + offset).parseValue());
          } catch {
            objects.set(objNum, null);
          }
        }
        return objects;
      })();
      this.objectStreams.set(num, parsed);
    }
    return parsed;
  }
}

/** A PDF date string (§7.9.4): `D:YYYYMMDDHHmmSS±HH'mm'`. */
export function pdfDate(date: Date): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}'${pad(offset % 60)}'`
  );
}
