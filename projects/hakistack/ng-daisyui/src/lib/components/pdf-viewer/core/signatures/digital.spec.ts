import { PdfDoc } from '../pdf-writer/document';
import { saveIncremental } from '../pdf-writer/incremental';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfString, PdfValue } from '../pdf-writer/objects';
import { PdfSecurity } from '../pdf-writer/security';
import { serializeIndirectObject, serializeValue } from '../pdf-writer/serialize';
import { integer, oid, oidToString, parseDer, readTime, seq, setOf, time, utf8 } from './asn1';
import { PdfSigner, buildSignedData, createWebCryptoSigner, parseSignedData, verifySignedData } from './cms';
import { parsePdfDate, readSignatures, signPdf } from './pdf-signature';
import { createSelfSignedCertificate, ecdsaDerToRaw, ecdsaRawToDer, isSelfIssued, parseCertificate } from './x509';

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

/** A one-page document; `extra` objects are added as-is (7+), `acro` goes in the catalog. */
function pdf(extra: Record<number, string> = {}, catalogExtra = '', pageExtra = ''): Uint8Array {
  const content = 'BT /F1 12 Tf 72 700 Td (Contract text) Tj ET';
  const objects: Record<number, string> = {
    1: `<< /Type /Catalog /Pages 2 0 R ${catalogExtra} >>`,
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R ${pageExtra} >>`,
    4: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ...extra,
  };
  let out = '%PDF-1.7\n';
  const offsets: Record<number, number> = {};
  const nums = Object.keys(objects).map(Number);
  for (const n of nums) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const size = Math.max(...nums) + 1;
  const xref = out.length;
  out += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n++)
    out += offsets[n] !== undefined ? `${String(offsets[n]).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
  out += `trailer\n<< /Size ${size} /Root 1 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>] >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

let rsa: { keys: CryptoKeyPair; cert: Uint8Array; signer: PdfSigner };
let ec: { keys: CryptoKeyPair; cert: Uint8Array; signer: PdfSigner };

beforeAll(async () => {
  const rsaKeys = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const rsaCert = await createSelfSignedCertificate(rsaKeys, {
    commonName: 'Ana Pérez',
    organization: 'Hakistack',
    email: 'ana@example.com',
  });
  rsa = { keys: rsaKeys, cert: rsaCert, signer: createWebCryptoSigner(rsaKeys.privateKey, [rsaCert]) };
  const ecKeys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const ecCert = await createSelfSignedCertificate(ecKeys, { commonName: 'EC Signer' });
  ec = { keys: ecKeys, cert: ecCert, signer: createWebCryptoSigner(ecKeys.privateKey, [ecCert]) };
}, 60_000);

describe('ASN.1 DER', () => {
  it('round-trips OIDs, integers, strings and times', () => {
    expect(oidToString(parseDer(oid('1.2.840.113549.1.9.16.2.47')).value)).toBe('1.2.840.113549.1.9.16.2.47');
    expect(Array.from(integer(0x80))).toEqual([0x02, 0x02, 0x00, 0x80]);
    expect(Array.from(integer(Uint8Array.of(0, 0, 5)))).toEqual([0x02, 0x01, 0x05]);
    const when = new Date(Date.UTC(2031, 4, 6, 7, 8, 9));
    expect(readTime(parseDer(time(when))).getTime()).toBe(when.getTime());
    const far = new Date(Date.UTC(2051, 0, 1));
    expect(parseDer(time(far)).tag).toBe(0x18); // GeneralizedTime past 2049
    expect(readTime(parseDer(time(far))).getTime()).toBe(far.getTime());
    const s = parseDer(seq(utf8('añ'), integer(1)));
    expect(s.children).toHaveLength(2);
    expect(new TextDecoder().decode(s.children[0].value)).toBe('añ');
  });

  it('sorts SET OF elements and handles long lengths', () => {
    const set = setOf(integer(3), integer(1), integer(2));
    expect(parseDer(set).children.map((c) => c.value[0])).toEqual([1, 2, 3]);
    const big = seq(new Uint8Array(300).fill(0x05));
    expect(Array.from(big.subarray(0, 4))).toEqual([0x30, 0x82, 0x01, 0x2c]);
  });

  it('follows indefinite lengths (BER)', () => {
    const ber = Uint8Array.of(0x30, 0x80, 0x02, 0x01, 0x07, 0x00, 0x00);
    const el = parseDer(ber);
    expect(el.children[0].value[0]).toBe(7);
    expect(el.raw.length).toBe(7);
  });

  it('converts ECDSA signatures between r‖s and DER', () => {
    const raw = Uint8Array.from({ length: 64 }, (_, i) => (i === 0 || i === 32 ? 0x80 : i));
    expect(Array.from(ecdsaDerToRaw(ecdsaRawToDer(raw), 32))).toEqual(Array.from(raw));
  });
});

describe('X.509 and CMS', () => {
  it('parses a self-signed certificate', () => {
    const c = parseCertificate(rsa.cert);
    expect(c.subject.commonName).toBe('Ana Pérez');
    expect(c.subject.organization).toBe('Hakistack');
    expect(c.subject.email).toBe('ana@example.com');
    expect(c.subject.text).toBe('CN=Ana Pérez, O=Hakistack, E=ana@example.com');
    expect(c.keyAlgorithm).toBe('RSA');
    expect(isSelfIssued(c)).toBe(true);
    expect(c.notAfter.getTime() - c.notBefore.getTime()).toBe(365 * 86_400_000);
    const e = parseCertificate(ec.cert);
    expect(e.keyAlgorithm).toBe('EC');
    expect(e.curve).toBe('P-256');
  });

  it('builds and verifies a detached SignedData (RSA and ECDSA)', async () => {
    const content = enc.encode('the signed bytes');
    for (const { signer } of [rsa, ec]) {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', content));
      const cms = await buildSignedData(signer, digest, { signingTime: new Date(Date.UTC(2026, 0, 2)), cades: true });
      const info = parseSignedData(cms);
      expect(info.signer).not.toBeNull();
      expect(info.digestAlgorithm).toBe('SHA-256');
      expect(info.signingTime?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
      expect(await verifySignedData(info, content)).toEqual({ digestMatches: true, signatureValid: true });
      expect((await verifySignedData(info, enc.encode('other bytes'))).digestMatches).toBe(false);
    }
  });
});

describe('PDF signatures', () => {
  it('signs invisibly and validates', async () => {
    const signed = await signPdf(pdf(), rsa.signer, {
      reason: 'Approved',
      location: 'Madrid',
      signingTime: new Date(Date.UTC(2026, 9, 1, 12)),
    });
    const text = latin1(signed);
    expect(text).toContain('/SubFilter /ETSI.CAdES.detached');
    expect(text).toMatch(/\/ByteRange \[0 \d+ \d+ \d+ *\]/);
    expect(text).toContain('/SigFlags 3');
    const [sig, ...rest] = await readSignatures(signed);
    expect(rest).toHaveLength(0);
    expect(sig).toMatchObject({
      field: 'Signature1',
      status: 'valid',
      integrity: true,
      signatureValid: true,
      coversWholeDocument: true,
      revisionLength: signed.length,
      signer: 'Ana Pérez',
      reason: 'Approved',
      location: 'Madrid',
      subFilter: 'ETSI.CAdES.detached',
      certified: null,
      trusted: false,
      page: null,
    });
    expect(sig.signingTime?.toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(sig.certificate?.selfSigned).toBe(true);
    expect(sig.certificate?.expiredAtSigning).toBe(true); // signed (by its clock) before the certificate was issued
    // The original revision is untouched.
    const original = pdf();
    expect(Array.from(signed.subarray(0, original.length))).toEqual(Array.from(original));
  });

  it('detects a tampered document', async () => {
    const signed = await signPdf(pdf(), rsa.signer);
    expect((await readSignatures(signed))[0].certificate?.expiredAtSigning).toBe(false);
    const tampered = signed.slice();
    const at = latin1(tampered).indexOf('Contract text');
    tampered[at] = 'X'.charCodeAt(0);
    const [sig] = await readSignatures(tampered);
    expect(sig.status).toBe('invalid');
    expect(sig.integrity).toBe(false);
  });

  it('reports changes made after signing, and keeps the signature valid', async () => {
    const signed = await signPdf(pdf(), rsa.signer);
    const doc = await PdfDoc.load(signed);
    await doc.setInfo({ Title: 'Edited later' });
    const edited = await saveIncremental(doc);
    const [sig] = await readSignatures(edited);
    expect(sig.status).toBe('valid');
    expect(sig.coversWholeDocument).toBe(false);
    expect(sig.revisionLength).toBe(signed.length);
  });

  it('signs twice: each signature covers its own revision', async () => {
    const once = await signPdf(pdf(), rsa.signer, { field: 'First' });
    const twice = await signPdf(once, ec.signer, { field: 'Second' });
    const sigs = await readSignatures(twice);
    expect(sigs.map((s) => [s.field, s.status, s.coversWholeDocument, s.signer])).toEqual([
      ['First', 'valid', false, 'Ana Pérez'],
      ['Second', 'valid', true, 'EC Signer'],
    ]);
  });

  it('signs an existing empty signature field, with a visible appearance', async () => {
    const doc = pdf(
      { 7: '<< /Type /Annot /Subtype /Widget /FT /Sig /T (Approver) /Rect [100 100 300 160] /P 3 0 R /F 4 >>', 8: '<< /Fields [7 0 R] >>' },
      '/AcroForm 8 0 R',
      '/Annots [7 0 R]',
    );
    const signed = await signPdf(doc, rsa.signer, { field: 'Approver', subFilter: 'adbe.pkcs7.detached' });
    const [sig] = await readSignatures(signed);
    expect(sig).toMatchObject({ field: 'Approver', status: 'valid', page: 0, subFilter: 'adbe.pkcs7.detached' });
    expect(sig.rect).toEqual({ x: 100, y: 632, w: 200, h: 60 });
    const reread = await PdfDoc.load(signed);
    const widget = await reread.dict(new PdfRef(7, 0));
    const ap = await reread.dict(widget?.get('AP'));
    const n = await reread.streamData(ap?.get('N'));
    expect(latin1(n!)).toContain('Digitally signed by Ana P');
    await expect(signPdf(signed, rsa.signer, { field: 'Approver' })).rejects.toThrow(/already signed/);
    await expect(signPdf(doc, rsa.signer, { field: 'Approver', certify: 2 })).resolves.toBeInstanceOf(Uint8Array);
  });

  it('places a new visible signature on a page', async () => {
    const signed = await signPdf(pdf(), ec.signer, { page: 0, rect: { x: 50, y: 50, w: 180, h: 50 }, appearanceText: ['Firmado por EC'] });
    const [sig] = await readSignatures(signed);
    expect(sig).toMatchObject({ status: 'valid', page: 0, rect: { x: 50, y: 50, w: 180, h: 50 } });
    expect(latin1(signed)).toContain('/Rect [50 692 230 742]');
  });

  it('certifies (DocMDP) and refuses certifying a signed document', async () => {
    const certified = await signPdf(pdf(), rsa.signer, { certify: 1 });
    const [sig] = await readSignatures(certified);
    expect(sig.certified).toBe(1);
    expect(latin1(certified)).toMatch(/\/Perms <<\/DocMDP \d+ 0 R>>/);
    await expect(signPdf(certified, rsa.signer, { certify: 2 })).rejects.toThrow(/first signature/);
  });

  it('trusts signers that chain to a trust anchor', async () => {
    const signed = await signPdf(pdf(), rsa.signer);
    expect((await readSignatures(signed, { trustAnchors: [rsa.cert] }))[0].trusted).toBe(true);
    expect((await readSignatures(signed, { trustAnchors: [ec.cert] }))[0].trusted).toBe(false);
  });

  it('fails when the signature does not fit the reserved space', async () => {
    await expect(signPdf(pdf(), rsa.signer, { reserve: 64 })).rejects.toThrow(/doesn't fit/);
  });

  it('signs an encrypted document, leaving /Contents unencrypted', async () => {
    const encrypted = await encryptedPdf();
    const signed = await signPdf(encrypted, rsa.signer, { password: 'user', reason: 'Secret approval' });
    expect(latin1(signed)).not.toContain('Secret approval'); // strings are encrypted…
    const [sig] = await readSignatures(signed, { password: 'user' });
    expect(sig).toMatchObject({ status: 'valid', reason: 'Secret approval', signer: 'Ana Pérez' }); // …but the signature checks out
  });

  it('parses PDF dates', () => {
    expect(parsePdfDate("D:20261012143000+02'00'")?.toISOString()).toBe('2026-10-12T12:30:00.000Z');
    expect(parsePdfDate('D:2026')?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(parsePdfDate('garbage')).toBeNull();
  });
});

/** A one-page AES-128 document (user password `user`). */
async function encryptedPdf(): Promise<Uint8Array> {
  const id0 = Uint8Array.from({ length: 16 }, (_, i) => i * 3);
  const { security, encrypt } = await PdfSecurity.create({
    userPassword: 'user',
    ownerPassword: 'owner',
    revision: 4,
    permissions: -1,
    id0,
  });
  const objects: [number, PdfValue][] = [
    [1, new PdfDict({ Type: PdfName.of('Catalog'), Pages: new PdfRef(2, 0) })],
    [2, new PdfDict({ Type: PdfName.of('Pages'), Kids: [new PdfRef(3, 0)], Count: 1 })],
    [3, new PdfDict({ Type: PdfName.of('Page'), Parent: new PdfRef(2, 0), MediaBox: [0, 0, 612, 792], Contents: new PdfRef(4, 0) })],
    [4, new PdfStream(new PdfDict(), enc.encode('BT /F1 12 Tf 72 700 Td (Secret) Tj ET'))],
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
  offsets[5] = offset;
  const encBytes = serializeIndirectObject(new PdfRef(5, 0), encrypt);
  parts.push(encBytes);
  offset += encBytes.length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let n = 1; n <= 5; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  const trailer = new PdfDict({
    Size: 6,
    Root: new PdfRef(1, 0),
    Encrypt: new PdfRef(5, 0),
    ID: [PdfString.bytes(id0), PdfString.bytes(id0)],
  });
  parts.push(enc.encode(`${xref}trailer\n${serializeValue(trailer)}\nstartxref\n${offset}\n%%EOF\n`));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
