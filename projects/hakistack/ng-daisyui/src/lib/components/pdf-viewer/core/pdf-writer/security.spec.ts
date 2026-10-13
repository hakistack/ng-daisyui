import { PdfDoc } from './document';
import { decodeStream } from './filters';
import { saveIncremental } from './incremental';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfString, PdfValue } from './objects';
import { PDF_PERMISSION, PdfPasswordError, PdfSecurity, md5, rc4 } from './security';
import { concatBytes, serializeIndirectObject, serializeValue } from './serialize';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

/** An encrypted one-page PDF with a title and a content stream, written with `security`. */
async function encryptedPdf(revision: 3 | 4 | 6, permissions = PDF_PERMISSION.print | PDF_PERMISSION.annotate) {
  const id0 = Uint8Array.from({ length: 16 }, (_, i) => i * 7);
  const { security, encrypt } = await PdfSecurity.create({ userPassword: 'user', ownerPassword: 'owner', revision, permissions, id0 });
  const content = 'BT /F1 12 Tf 72 700 Td (Secret page text) Tj ET';
  const objects: [number, PdfValue][] = [
    [1, new PdfDict({ Type: PdfName.of('Catalog'), Pages: new PdfRef(2, 0) })],
    [2, new PdfDict({ Type: PdfName.of('Pages'), Kids: [new PdfRef(3, 0)], Count: 1 })],
    [3, new PdfDict({ Type: PdfName.of('Page'), Parent: new PdfRef(2, 0), MediaBox: [0, 0, 612, 792], Contents: new PdfRef(4, 0) })],
    [4, new PdfStream(new PdfDict(), enc.encode(content))],
    [5, new PdfDict({ Title: PdfString.text('Top secret title') })],
  ];
  const parts: Uint8Array[] = [enc.encode('%PDF-1.7\n')];
  const offsets: number[] = [];
  let offset = parts[0].length;
  for (const [num, value] of objects) {
    offsets[num] = offset;
    const bytes = serializeIndirectObject(new PdfRef(num, 0), await security.encryptObject(num, 0, value));
    parts.push(bytes);
    offset += bytes.length;
  }
  offsets[6] = offset;
  const encBytes = serializeIndirectObject(new PdfRef(6, 0), encrypt); // never encrypted itself
  parts.push(encBytes);
  offset += encBytes.length;
  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  for (let n = 1; n <= 6; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  const trailer = new PdfDict({
    Size: 7,
    Root: new PdfRef(1, 0),
    Info: new PdfRef(5, 0),
    Encrypt: new PdfRef(6, 0),
    ID: [PdfString.bytes(id0), PdfString.bytes(id0)],
  });
  parts.push(enc.encode(`${xref}trailer\n${serializeValue(trailer)}\nstartxref\n${offset}\n%%EOF\n`));
  return concatBytes(parts);
}

describe('security primitives', () => {
  it('computes MD5 and RC4 test vectors', () => {
    expect(hex(md5(new Uint8Array()))).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(hex(md5(enc.encode('abc')))).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(hex(md5(enc.encode('a'.repeat(100))))).toBe('36a92cc94a9e0fa21f625f8bfb007adf');
    expect(hex(rc4(enc.encode('Key'), enc.encode('Plaintext')))).toBe('bbf316e8d940af0ad3');
  });
});

describe.each([3, 4, 6] as const)('encrypted documents (revision %i)', (revision) => {
  it('opens with the user password, decrypting strings and streams', async () => {
    const doc = await PdfDoc.load(await encryptedPdf(revision), 'user');
    expect(doc.security?.owner).toBe(false);
    expect(((await doc.info()).dict.get('Title') as PdfString).text()).toBe('Top secret title');
    const [page] = await doc.pages();
    const content = await doc.resolve(page.dict.get('Contents'));
    expect(latin1(await decodeStream(content as PdfStream))).toContain('(Secret page text) Tj');
  });

  it('opens with the owner password, with every permission', async () => {
    const doc = await PdfDoc.load(await encryptedPdf(revision, 0), 'owner');
    expect(doc.security?.owner).toBe(true);
    expect(doc.security?.allows(PDF_PERMISSION.annotate)).toBe(true);
  });

  it('refuses a wrong password and reports the user permissions', async () => {
    const bytes = await encryptedPdf(revision, PDF_PERMISSION.print);
    await expect(PdfDoc.load(bytes, 'nope')).rejects.toBeInstanceOf(PdfPasswordError);
    const doc = await PdfDoc.load(bytes, 'user');
    expect([doc.security?.allows(PDF_PERMISSION.print), doc.security?.allows(PDF_PERMISSION.annotate)]).toEqual([true, false]);
  });

  it('writes an encrypted incremental update that reads back', async () => {
    const bytes = await encryptedPdf(revision);
    const doc = await PdfDoc.load(bytes, 'user');
    await doc.setInfo({ Title: 'Edited secret' });
    const saved = await saveIncremental(doc);
    expect(latin1(saved.subarray(bytes.length))).not.toContain('Edited secret'); // ciphertext only
    const reread = await PdfDoc.load(saved, 'user');
    expect(((await reread.info()).dict.get('Title') as PdfString).text()).toBe('Edited secret');
    expect(latin1(saved.subarray(bytes.length))).toContain('/Encrypt 6 0 R');
  });
});
