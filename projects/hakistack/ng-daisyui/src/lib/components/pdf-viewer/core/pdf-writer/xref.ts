import { decodeStream } from './filters';
import { PdfDict, PdfParseError, PdfRef, PdfStream } from './objects';
import { PdfParser, lastIndexOf, matchesAt } from './parser';

/** Where an object lives (§7.5.4, §7.5.8). */
export type XrefEntry =
  | { readonly type: 'free' }
  | { readonly type: 'offset'; readonly offset: number; readonly gen: number }
  | { readonly type: 'compressed'; readonly stream: number; readonly index: number };

export interface XrefTable {
  readonly entries: Map<number, XrefEntry>;
  /** The newest trailer, with older trailers' keys filled in where missing. */
  readonly trailer: PdfDict;
  /** Offset of the newest xref section (the next incremental update's /Prev). */
  readonly startxref: number;
  /** Whether the newest section is an xref stream (an incremental update should write one too). */
  readonly usesXrefStream: boolean;
  /** True when the table had to be rebuilt by scanning the file. */
  readonly reconstructed: boolean;
}

/**
 * Read the cross-reference data: find `startxref`, then follow the chain of
 * sections (classic tables and xref streams, `/Prev`, and the `/XRefStm` of
 * hybrid files), newest entries winning. If the chain is broken, rebuild the
 * table by scanning for `N G obj` headers.
 */
export async function readXref(bytes: Uint8Array): Promise<XrefTable> {
  try {
    return await readXrefChain(bytes);
  } catch (err) {
    const rebuilt = reconstructXref(bytes);
    if (rebuilt) return rebuilt;
    throw err;
  }
}

async function readXrefChain(bytes: Uint8Array): Promise<XrefTable> {
  const sx = lastIndexOf(bytes, 'startxref');
  if (sx < 0) throw new PdfParseError('no startxref');
  const p = new PdfParser(bytes, sx + 'startxref'.length);
  const startxref = p.parseValue();
  if (typeof startxref !== 'number') throw new PdfParseError('bad startxref', sx);

  const entries = new Map<number, XrefEntry>();
  let trailer: PdfDict | null = null;
  let usesXrefStream = false;
  const seen = new Set<number>();
  const pending = [startxref];

  while (pending.length > 0) {
    const offset = pending.shift()!;
    if (seen.has(offset)) continue; // cycle guard
    seen.add(offset);
    const section = await readSection(bytes, offset);
    if (!trailer) {
      trailer = section.trailer.clone();
      usesXrefStream = section.isStream;
    } else {
      for (const [k, v] of section.trailer) if (!trailer.has(k)) trailer.set(k, v);
    }
    // Older sections never override newer entries.
    for (const [num, entry] of section.entries) if (!entries.has(num)) entries.set(num, entry);
    // Hybrid files: the /XRefStm of a classic section is read right after it, before /Prev.
    const xrefStm = section.trailer.get('XRefStm');
    if (typeof xrefStm === 'number') pending.unshift(xrefStm);
    const prev = section.trailer.get('Prev');
    if (typeof prev === 'number') pending.push(prev);
  }
  if (!trailer || !trailer.has('Root')) throw new PdfParseError('trailer has no /Root');
  trailer.delete('Prev');
  trailer.delete('XRefStm');
  return { entries, trailer, startxref, usesXrefStream, reconstructed: false };
}

async function readSection(
  bytes: Uint8Array,
  offset: number,
): Promise<{ entries: Map<number, XrefEntry>; trailer: PdfDict; isStream: boolean }> {
  const p = new PdfParser(bytes, offset);
  p.skipWhitespaceAndComments();
  if (matchesAt(bytes, p.pos, 'xref')) return readTable(p);
  const { value } = p.parseIndirectObject();
  if (!(value instanceof PdfStream) || value.dict.getName('Type') !== 'XRef')
    throw new PdfParseError('xref offset points at neither a table nor an xref stream', offset);
  return { ...(await readXrefStream(value)), isStream: true };
}

/** A classic `xref` table and the `trailer` dictionary after it. */
function readTable(p: PdfParser): { entries: Map<number, XrefEntry>; trailer: PdfDict; isStream: boolean } {
  const bytes = p.bytes;
  p.consumeKeyword('xref');
  const entries = new Map<number, XrefEntry>();
  for (;;) {
    p.skipWhitespaceAndComments();
    if (p.consumeKeyword('trailer')) break;
    const first = p.parseValue();
    const count = p.parseValue();
    if (typeof first !== 'number' || typeof count !== 'number') throw new PdfParseError('bad xref subsection header', p.pos);
    for (let i = 0; i < count; i++) {
      p.skipWhitespaceAndComments();
      // "nnnnnnnnnn ggggg n" — parsed loosely, since some writers vary the spacing.
      const off = p.readWord();
      p.skipWhitespaceAndComments();
      const gen = p.readWord();
      p.skipWhitespaceAndComments();
      const kind = p.readWord();
      const num = first + i;
      if (kind === 'n') entries.set(num, { type: 'offset', offset: Number(off), gen: Number(gen) });
      else entries.set(num, { type: 'free' });
    }
    if (p.pos >= bytes.length) throw new PdfParseError('xref table without trailer');
  }
  const trailer = p.parseValue();
  if (!(trailer instanceof PdfDict)) throw new PdfParseError('bad trailer', p.pos);
  // Object 0 is always the head of the free list; some writers number subsections from 1 by mistake.
  return { entries, trailer, isStream: false };
}

/** An xref stream (§7.5.8): binary rows of /W field widths over /Index ranges. */
async function readXrefStream(stream: PdfStream): Promise<{ entries: Map<number, XrefEntry>; trailer: PdfDict }> {
  const dict = stream.dict;
  const data = await decodeStream(stream);
  const w = dict.get('W');
  if (!Array.isArray(w) || w.length < 3) throw new PdfParseError('xref stream without /W');
  const [w0, w1, w2] = w.map((x) => (typeof x === 'number' ? x : 0));
  const size = dict.getNumber('Size') ?? 0;
  const indexArr = dict.get('Index');
  const index = Array.isArray(indexArr) ? indexArr.map((x) => (typeof x === 'number' ? x : 0)) : [0, size];
  const rowLength = w0 + w1 + w2;
  const field = (at: number, width: number) => {
    let v = 0;
    for (let i = 0; i < width; i++) v = v * 256 + data[at + i];
    return v;
  };

  const entries = new Map<number, XrefEntry>();
  let row = 0;
  for (let s = 0; s + 1 < index.length; s += 2) {
    const first = index[s];
    const count = index[s + 1];
    for (let i = 0; i < count; i++, row++) {
      const at = row * rowLength;
      if (at + rowLength > data.length) break;
      const type = w0 === 0 ? 1 : field(at, w0); // a zero-width type field defaults to 1
      const f2 = field(at + w0, w1);
      const f3 = field(at + w0 + w1, w2);
      const num = first + i;
      if (type === 1) entries.set(num, { type: 'offset', offset: f2, gen: f3 });
      else if (type === 2) entries.set(num, { type: 'compressed', stream: f2, index: f3 });
      else entries.set(num, { type: 'free' });
    }
  }
  return { entries, trailer: dict };
}

/**
 * Last resort for a damaged file: find every `N G obj` header (later ones
 * win, as in an incremental update) and the last trailer or xref-stream
 * dictionary that names a /Root.
 */
export function reconstructXref(bytes: Uint8Array): XrefTable | null {
  const entries = new Map<number, XrefEntry>();
  const text = latin1(bytes);
  const header = /(\d+)\s+(\d+)\s+obj\b/g;
  let m: RegExpExecArray | null;
  let trailer: PdfDict | null = null;
  while ((m = header.exec(text))) {
    const num = Number(m[1]);
    entries.set(num, { type: 'offset', offset: m.index, gen: Number(m[2]) });
  }
  const trailerRe = /trailer\s*<</g;
  while ((m = trailerRe.exec(text))) {
    try {
      const dict = new PdfParser(bytes, m.index + 'trailer'.length).parseValue();
      if (dict instanceof PdfDict && dict.has('Root')) trailer = dict;
    } catch {
      /* try the next one */
    }
  }
  if (!trailer) {
    // Xref-stream files have no `trailer` keyword: the root is in the stream dictionary.
    for (const [num, entry] of entries) {
      if (entry.type !== 'offset') continue;
      try {
        const { value } = new PdfParser(bytes, entry.offset).parseIndirectObject();
        if (value instanceof PdfStream && value.dict.getName('Type') === 'XRef' && value.dict.has('Root')) trailer = value.dict;
        if (value instanceof PdfDict && value.getName('Type') === 'Catalog') trailer ??= new PdfDict({ Root: new PdfRef(num, entry.gen) });
      } catch {
        /* skip */
      }
    }
  }
  if (!trailer || entries.size === 0) return null;
  trailer = trailer.clone();
  trailer.delete('Prev');
  trailer.delete('XRefStm');
  return { entries, trailer, startxref: -1, usesXrefStream: false, reconstructed: true };
}

function latin1(bytes: Uint8Array): string {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return out;
}
