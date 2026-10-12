import { PdfDoc } from './document';
import { deflate } from './filters';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfString } from './objects';
import { concatBytes, serializeIndirectObject, serializeValue } from './serialize';
import { XrefEntry } from './xref';

const encoder = new TextEncoder();

type WrittenEntry = { readonly num: number; readonly entry: XrefEntry };

/**
 * Save as an incremental update (§7.5.6): the original bytes untouched, then
 * the changed and new objects, then a cross-reference section for them whose
 * /Prev points at the previous one. Existing signatures stay valid (their
 * byte ranges are unchanged) and the cost follows the size of the change.
 *
 * The new section uses the same form as the newest existing one (xref stream
 * or classic table). For a file whose xref had to be reconstructed, the
 * section lists every object and has no /Prev, which also repairs the file.
 */
export async function saveIncremental(doc: PdfDoc): Promise<Uint8Array> {
  if (!doc.modified) return doc.bytes;

  const parts: Uint8Array[] = [doc.bytes];
  let offset = doc.bytes.length;
  const lastByte = doc.bytes[doc.bytes.length - 1];
  if (lastByte !== 0x0a && lastByte !== 0x0d) {
    parts.push(encoder.encode('\n'));
    offset += 1;
  }

  const written: WrittenEntry[] = [];
  for (const { ref, value } of [...doc.changes.values()].sort((a, b) => a.ref.num - b.ref.num)) {
    const bytes = serializeIndirectObject(ref, value);
    written.push({ num: ref.num, entry: { type: 'offset', offset, gen: ref.gen } });
    parts.push(bytes);
    offset += bytes.length;
  }
  for (const ref of doc.deletions.values()) written.push({ num: ref.num, entry: { type: 'free' } });

  // A reconstructed table is re-listed in full (old entries the new section doesn't replace).
  if (doc.xref.reconstructed) {
    const replaced = new Set(written.map((w) => w.num));
    for (const [num, entry] of doc.xref.entries) if (!replaced.has(num)) written.push({ num, entry });
  }

  const trailer = buildTrailer(doc);
  const xrefOffset = offset;
  if (doc.xref.usesXrefStream) {
    // The xref stream is itself an object, listed in its own section.
    const streamRef = new PdfRef(doc.size, 0);
    trailer.set('Size', doc.size + 1);
    written.push({ num: streamRef.num, entry: { type: 'offset', offset: xrefOffset, gen: 0 } });
    const stream = await xrefStream(written, trailer);
    parts.push(serializeIndirectObject(streamRef, stream));
  } else {
    parts.push(encoder.encode(xrefTable(written) + `trailer\n${serializeValue(trailer)}\n`));
  }
  parts.push(encoder.encode(`startxref\n${xrefOffset}\n%%EOF\n`));
  return concatBytes(parts);
}

/** The new trailer: the old one's keys, the new /Size and /Prev, and a fresh second /ID element. */
function buildTrailer(doc: PdfDoc): PdfDict {
  const trailer = new PdfDict();
  for (const key of ['Root', 'Info', 'Encrypt']) {
    const v = doc.trailer.get(key);
    if (v !== undefined) trailer.set(key, v);
  }
  trailer.set('Size', doc.size);
  if (!doc.xref.reconstructed && doc.xref.startxref >= 0) trailer.set('Prev', doc.xref.startxref);
  // §14.4: the first ID is permanent; the second changes on every update.
  const id = doc.trailer.get('ID');
  const first = Array.isArray(id) && id[0] instanceof PdfString ? id[0] : PdfString.bytes(randomBytes(16));
  trailer.set('ID', [first, PdfString.bytes(randomBytes(16))]);
  return trailer;
}

/** Group sorted object numbers into consecutive runs: `[[first, count], …]`. */
function subsections(entries: readonly WrittenEntry[]): WrittenEntry[][] {
  const sorted = [...entries].sort((a, b) => a.num - b.num);
  const runs: WrittenEntry[][] = [];
  for (const e of sorted) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1].num + 1 === e.num) run.push(e);
    else runs.push([e]);
  }
  return runs;
}

/** A classic table: 20-byte lines `oooooooooo ggggg n\r\n` (§7.5.4). */
function xrefTable(entries: readonly WrittenEntry[]): string {
  let out = 'xref\n';
  for (const run of subsections(entries)) {
    out += `${run[0].num} ${run.length}\n`;
    for (const { entry } of run) {
      if (entry.type === 'offset') out += `${String(entry.offset).padStart(10, '0')} ${String(entry.gen).padStart(5, '0')} n\r\n`;
      else out += `0000000000 65535 f\r\n`; // compressed entries can't appear in a classic table; only frees do
    }
  }
  return out;
}

/** An xref stream (§7.5.8) with /W [1 4 2] rows, Flate-compressed. */
async function xrefStream(entries: readonly WrittenEntry[], trailer: PdfDict): Promise<PdfStream> {
  const runs = subsections(entries);
  const rows = new Uint8Array(entries.length * 7);
  const index: number[] = [];
  let r = 0;
  for (const run of runs) {
    index.push(run[0].num, run.length);
    for (const { entry } of run) {
      const at = r++ * 7;
      const [type, f2, f3] =
        entry.type === 'offset' ? [1, entry.offset, entry.gen] : entry.type === 'compressed' ? [2, entry.stream, entry.index] : [0, 0, 0];
      rows[at] = type;
      rows[at + 1] = (f2 >>> 24) & 0xff;
      rows[at + 2] = (f2 >>> 16) & 0xff;
      rows[at + 3] = (f2 >>> 8) & 0xff;
      rows[at + 4] = f2 & 0xff;
      rows[at + 5] = (f3 >>> 8) & 0xff;
      rows[at + 6] = f3 & 0xff;
    }
  }
  const dict = trailer.clone();
  dict.set('Type', PdfName.of('XRef'));
  dict.set('W', [1, 4, 2]);
  dict.set('Index', index);
  dict.set('Filter', PdfName.of('FlateDecode'));
  return new PdfStream(dict, await deflate(rows));
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(out);
  else for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}
