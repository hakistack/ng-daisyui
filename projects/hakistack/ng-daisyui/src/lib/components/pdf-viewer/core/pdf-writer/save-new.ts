import { PdfDoc } from './document';
import { PdfDict, PdfString } from './objects';
import { concatBytes, serializeIndirectObject, serializeValue } from './serialize';

const encoder = new TextEncoder();

/**
 * Write a document made with `PdfDoc.create` as a complete file: header,
 * every object, a classic cross-reference table and the trailer. (An
 * existing file is saved with `saveIncremental`.)
 */
export function saveNew(doc: PdfDoc): Uint8Array {
  if (doc.bytes.length > 0) throw new Error('saveNew writes new documents; save an existing one with saveIncremental');
  if (doc.security) throw new Error('saveNew does not encrypt');
  // The binary comment marks the file as binary for transfer tools (§7.5.2).
  const parts: Uint8Array[] = [encoder.encode('%PDF-1.7\n'), new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])];
  let offset = parts[0].length + parts[1].length;
  const offsets = new Map<number, number>();
  for (const { ref, value } of [...doc.changes.values()].sort((a, b) => a.ref.num - b.ref.num)) {
    const bytes = serializeIndirectObject(ref, value);
    offsets.set(ref.num, offset);
    parts.push(bytes);
    offset += bytes.length;
  }
  let table = `xref\n0 ${doc.size}\n0000000000 65535 f\r\n`;
  for (let num = 1; num < doc.size; num++) {
    const at = offsets.get(num);
    table += at === undefined ? '0000000000 00000 f\r\n' : `${String(at).padStart(10, '0')} 00000 n\r\n`;
  }
  const trailer = new PdfDict({ Size: doc.size, Root: doc.trailer.get('Root'), Info: doc.trailer.get('Info') });
  const id = PdfString.bytes(randomId());
  trailer.set('ID', [id, id]);
  parts.push(encoder.encode(`${table}trailer\n${serializeValue(trailer)}\nstartxref\n${offset}\n%%EOF\n`));
  return concatBytes(parts);
}

function randomId(): Uint8Array {
  const out = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(out);
  else for (let i = 0; i < out.length; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}
