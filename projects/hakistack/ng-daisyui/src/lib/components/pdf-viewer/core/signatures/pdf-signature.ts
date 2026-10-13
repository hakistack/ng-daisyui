import { pageSpace } from '../annotations/annotation-io';
import type { PdfRect } from '../annotations/annotation.types';
import { appearanceStream } from '../annotations/appearance';
import { TextOp } from '../annotations/shapes';
import { readForm } from '../forms/form-reader';
import { DocMdpLevel, readDocMdp, uniqueFieldName } from '../forms/form-design';
import { PdfDoc, pdfDate } from '../pdf-writer/document';
import { FontEmbedder } from '../pdf-writer/font-embed';
import { saveIncremental } from '../pdf-writer/incremental';
import { PdfDict, PdfName, PdfRef, PdfString, PdfValue } from '../pdf-writer/objects';
import { lastIndexOf } from '../pdf-writer/parser';
import { textWidth } from '../pdf-writer/standard-fonts';
import { concat } from './asn1';
import {
  HashName,
  PdfSigner,
  SignedDataInfo,
  buildSignedData,
  digestOf,
  parseSignedData,
  parseTstInfo,
  verifySignedData,
  verifyWith,
} from './cms';
import { Certificate, DistinguishedName, isSelfIssued, parseCertificate } from './x509';

/**
 * PDF digital signatures (§12.8): reading and validating the signatures in
 * a document, and signing one (a detached CMS signature appended as the
 * last incremental update, so earlier signatures stay valid).
 */

export type PdfSignatureStatus = 'valid' | 'invalid' | 'unknown';

export interface PdfSignatureInfo {
  /** The signature field's fully qualified name. */
  readonly field: string;
  /** Where its widget is (null for an invisible signature, or one without a widget). */
  readonly page: number | null;
  readonly rect: PdfRect | null;
  /** `valid`: the signed bytes are intact and the signature checks out; `unknown`: it couldn't be checked. */
  readonly status: PdfSignatureStatus;
  /** The signed bytes' digest matches what was signed. */
  readonly integrity: boolean;
  /** The signature over that digest verifies with the signer's certificate. */
  readonly signatureValid: boolean;
  /** Nothing was appended after this signature (it's the document's last revision). */
  readonly coversWholeDocument: boolean;
  /** Length of the revision the signature covers: `bytes.subarray(0, revisionLength)` is the document as signed. */
  readonly revisionLength: number;
  /** The signer: the certificate's common name, else `/Name`. */
  readonly signer: string | null;
  /** When it was signed: a timestamp's time, else the signed `signingTime`, else `/M`. */
  readonly signingTime: Date | null;
  /** The time comes from an RFC 3161 timestamp (trustworthy), not the signer's clock. */
  readonly timestamped: boolean;
  readonly reason?: string;
  readonly location?: string;
  readonly contactInfo?: string;
  readonly subFilter: string;
  /** A certification (DocMDP) signature, with the changes it allows. */
  readonly certified: DocMdpLevel | null;
  readonly certificate: PdfCertificateInfo | null;
  /** The signer's certificate chains to one of the trust anchors given to {@link readSignatures}. */
  readonly trusted: boolean;
  /** Why the signature couldn't be checked or is invalid. */
  readonly error?: string;
}

export interface PdfCertificateInfo {
  readonly subject: DistinguishedName;
  readonly issuer: DistinguishedName;
  readonly notBefore: Date;
  readonly notAfter: Date;
  readonly selfSigned: boolean;
  /** The certificate wasn't valid at the signing time. */
  readonly expiredAtSigning: boolean;
  /** DER, for exporting the certificate. */
  readonly raw: Uint8Array;
}

export interface ReadSignaturesOptions {
  /** The password an encrypted document opens with. */
  readonly password?: string;
  /** Root (or intermediate) certificates, DER, whose signers count as trusted. */
  readonly trustAnchors?: readonly Uint8Array[];
}

/** Every signed signature field in the document, validated. */
export async function readSignatures(bytes: Uint8Array, opts: ReadSignaturesOptions = {}): Promise<PdfSignatureInfo[]> {
  const doc = await PdfDoc.load(bytes, opts.password);
  const form = await readForm(doc);
  const anchors = (opts.trustAnchors ?? []).map((c) => parseCertificate(c));
  const certifyRef = await certificationRef(doc);
  const certLevel = certifyRef ? await readDocMdp(doc) : null;
  const out: PdfSignatureInfo[] = [];
  for (const field of form.model.fields) {
    if (field.kind !== 'signature') continue;
    const src = form.sources.get(field.name);
    if (!src) continue;
    const vValue = await sigValue(doc, src.ref);
    const sig = await doc.dict(vValue);
    if (!sig) continue;
    const widget = field.widgets.find((w) => w.rect.w > 0 && w.rect.h > 0);
    const base = {
      field: field.name,
      page: widget?.page ?? null,
      rect: widget?.rect ?? null,
      certified: certifyRef && vValue instanceof PdfRef && vValue.equals(certifyRef) ? certLevel : null,
    };
    out.push(await validate(bytes, sig, base, anchors));
  }
  return out;
}

async function validate(
  bytes: Uint8Array,
  sig: PdfDict,
  base: Pick<PdfSignatureInfo, 'field' | 'page' | 'rect' | 'certified'>,
  anchors: readonly Certificate[],
): Promise<PdfSignatureInfo> {
  const text = (key: string) => {
    const v = sig.get(key);
    return v instanceof PdfString ? v.text() : undefined;
  };
  const subFilter = sig.getName('SubFilter') ?? '';
  const m = text('M');
  const info: Mutable<PdfSignatureInfo> = {
    ...base,
    status: 'unknown',
    integrity: false,
    signatureValid: false,
    coversWholeDocument: false,
    revisionLength: 0,
    signer: text('Name') ?? null,
    signingTime: m ? parsePdfDate(m) : null,
    timestamped: false,
    reason: text('Reason'),
    location: text('Location'),
    contactInfo: text('ContactInfo'),
    subFilter,
    certificate: null,
    trusted: false,
  };

  // The byte ranges: pairs of offset and length, covering everything but the /Contents hex string.
  const br = sig.get('ByteRange');
  const ranges =
    Array.isArray(br) && br.length >= 4 && br.length % 2 === 0 && br.every((n) => typeof n === 'number') ? (br as number[]) : null;
  const contents = sig.get('Contents');
  if (!ranges || !(contents instanceof PdfString)) return { ...info, status: 'invalid', error: 'malformed signature dictionary' };
  const end = ranges[ranges.length - 2] + ranges[ranges.length - 1];
  const wellFormed =
    ranges[0] === 0 &&
    end <= bytes.length &&
    ranges.every((n) => n >= 0 && Number.isInteger(n)) &&
    ranges.every((n, i) => i % 2 === 1 || i === 0 || n >= ranges[i - 2] + ranges[i - 1]) &&
    // The single gap is exactly the hex string (`<…>`).
    (ranges.length !== 4 || (bytes[ranges[1]] === 0x3c && bytes[ranges[2] - 1] === 0x3e));
  if (!wellFormed) return { ...info, status: 'invalid', error: 'the byte range is malformed' };
  info.revisionLength = end;
  info.coversWholeDocument = end === bytes.length || isOnlyWhitespace(bytes.subarray(end));
  const signed = concat(ranges.flatMap((n, i) => (i % 2 === 0 ? [bytes.subarray(n, n + ranges[i + 1])] : [])));

  if (subFilter === 'adbe.x509.rsa_sha1') return { ...info, error: 'adbe.x509.rsa_sha1 signatures are not supported' };
  let cms: SignedDataInfo;
  try {
    cms = parseSignedData(contents.bytes);
  } catch (err) {
    return { ...info, status: 'invalid', error: `unreadable signature: ${(err as Error).message}` };
  }
  if (cms.signer) {
    const c = cms.signer;
    info.signer = c.subject.commonName ?? info.signer;
    info.certificate = {
      subject: c.subject,
      issuer: c.issuer,
      notBefore: c.notBefore,
      notAfter: c.notAfter,
      selfSigned: isSelfIssued(c),
      expiredAtSigning: false,
      raw: c.raw,
    };
  }
  if (cms.timestampTime) {
    info.signingTime = cms.timestampTime;
    info.timestamped = true;
  } else if (cms.signingTime) info.signingTime = cms.signingTime;

  let result;
  let contentOk = true;
  if (subFilter === 'adbe.pkcs7.sha1') {
    result = await verifySignedData(cms, null);
    contentOk = !!cms.content && equal(cms.content, await digestOf('SHA-1', signed));
  } else if (subFilter === 'ETSI.RFC3161') {
    // A document timestamp: the token's TSTInfo carries the digest of the signed bytes.
    result = await verifySignedData(cms, null);
    try {
      const tst = parseTstInfo(cms.content ?? new Uint8Array());
      contentOk = !!tst.hash && equal(tst.digest, await digestOf(tst.hash, signed));
      info.signingTime = tst.genTime;
      info.timestamped = true;
    } catch {
      contentOk = false;
    }
  } else {
    result = await verifySignedData(cms, signed);
  }
  info.integrity = result.digestMatches && contentOk;
  info.signatureValid = result.signatureValid;
  info.error = result.error;
  // An error means it couldn't be checked (unsupported algorithm, missing certificate), unless the bytes are visibly altered.
  info.status = result.error ? (contentOk ? 'unknown' : 'invalid') : info.integrity && info.signatureValid ? 'valid' : 'invalid';
  if (!info.integrity) info.error ??= 'the document was altered after it was signed';
  else if (!info.signatureValid) info.error ??= "the signature doesn't match the signer's certificate";

  if (cms.signer && info.certificate) {
    const at = info.signingTime ?? new Date();
    info.certificate = { ...info.certificate, expiredAtSigning: at < cms.signer.notBefore || at > cms.signer.notAfter };
    info.trusted = await chainsTo(cms.signer, cms.certificates, anchors);
  }
  return info;
}

/**
 * Whether `cert` chains to a trust anchor: each issuer found among the
 * signature's certificates (or the anchors) by name, and its signature
 * checked.
 */
async function chainsTo(cert: Certificate, pool: readonly Certificate[], anchors: readonly Certificate[]): Promise<boolean> {
  if (!anchors.length) return false;
  const all = [...pool, ...anchors];
  let current = cert;
  for (let depth = 0; depth < 8; depth++) {
    if (anchors.some((a) => equal(a.raw, current.raw))) return true;
    const issuer = all.find((c) => equal(c.subjectRaw, current.issuerRaw) && c !== current);
    if (!issuer) return false;
    try {
      const hash: HashName = 'SHA-256';
      if (!(await verifyWith(issuer, current.signatureAlgorithm, current.signature, current.tbs, hash))) return false;
    } catch {
      return false;
    }
    if (anchors.includes(issuer)) return true;
    current = issuer;
  }
  return false;
}

/** The `/V` of a signature field, inherited from a parent if the terminal field lacks it. */
async function sigValue(doc: PdfDoc, ref: PdfRef): Promise<PdfValue | undefined> {
  let node = await doc.dict(ref);
  for (let depth = 0; node && depth < 16; depth++) {
    if (node.has('V')) return node.get('V');
    node = await doc.dict(node.get('Parent'));
  }
  return undefined;
}

/** The certification signature's dictionary reference (`/Perms /DocMDP`). */
async function certificationRef(doc: PdfDoc): Promise<PdfRef | null> {
  const perms = await doc.dict((await doc.catalog()).get('Perms'));
  const ref = perms?.get('DocMDP');
  return ref instanceof PdfRef ? ref : null;
}

// ── Signing ─────────────────────────────────────────────────────────────────

export interface SignPdfOptions {
  /** An existing, unsigned signature field to sign; or the name of the field to create (a unique one by default). */
  readonly field?: string;
  /** A visible signature: its page and box (displayed-page points). Without it the new field is invisible. */
  readonly page?: number;
  readonly rect?: PdfRect;
  /** Lines shown in a visible signature's box (default: who signed and when). */
  readonly appearanceText?: readonly string[];
  readonly name?: string;
  readonly reason?: string;
  readonly location?: string;
  readonly contactInfo?: string;
  /** Make it a certification signature allowing these changes (only the first signature can certify). */
  readonly certify?: DocMdpLevel;
  /** `ETSI.CAdES.detached` (PAdES baseline) or `adbe.pkcs7.detached`. Default: PAdES. */
  readonly subFilter?: 'adbe.pkcs7.detached' | 'ETSI.CAdES.detached';
  readonly signingTime?: Date;
  /** The password an encrypted document was opened with. */
  readonly password?: string;
  /** Bytes reserved for the signature (default: the certificates plus 8 KB). */
  readonly reserve?: number;
}

const BYTE_RANGE_PLACEHOLDER = [0, 1111111111, 2222222222, 3333333333];

/** Sign `bytes`: returns the document with the signature appended as an incremental update. */
export async function signPdf(bytes: Uint8Array, signer: PdfSigner, opts: SignPdfOptions = {}): Promise<Uint8Array> {
  if (!signer.certificates.length) throw new Error('the signer has no certificate');
  const cert = parseCertificate(signer.certificates[0]);
  const signingTime = opts.signingTime ?? new Date();
  const doc = await PdfDoc.load(bytes, opts.password);
  const catalog = (await doc.catalog()).clone();
  const catalogRef = doc.trailer.get('Root') as PdfRef;
  const acroValue = catalog.get('AcroForm');
  const acro = (await doc.dict(acroValue))?.clone() ?? new PdfDict({ Fields: [] });
  const form = await readForm(doc);
  const existing = opts.field ? form.model.fields.find((f) => f.name === opts.field) : undefined;
  if (existing && existing.kind !== 'signature') throw new Error(`"${opts.field}" isn't a signature field`);
  if (existing?.value) throw new Error(`"${opts.field}" is already signed`);
  if (opts.certify && form.model.fields.some((f) => f.kind === 'signature' && f.value)) {
    throw new Error('only the first signature of a document can certify it');
  }

  const reserve = opts.reserve ?? signer.certificates.reduce((n, c) => n + c.length, 0) + 8192;
  const sig = new PdfDict({
    Type: PdfName.of('Sig'),
    Filter: PdfName.of('Adobe.PPKLite'),
    SubFilter: PdfName.of(opts.subFilter ?? 'ETSI.CAdES.detached'),
    ByteRange: BYTE_RANGE_PLACEHOLDER,
    Contents: PdfString.bytes(new Uint8Array(reserve)),
    M: PdfString.text(pdfDate(signingTime)),
  });
  if (opts.name) sig.set('Name', PdfString.text(opts.name));
  if (opts.reason) sig.set('Reason', PdfString.text(opts.reason));
  if (opts.location) sig.set('Location', PdfString.text(opts.location));
  if (opts.contactInfo) sig.set('ContactInfo', PdfString.text(opts.contactInfo));
  if (opts.certify) {
    const params = new PdfDict({ Type: PdfName.of('TransformParams'), P: opts.certify, V: PdfName.of('1.2') });
    sig.set('Reference', [new PdfDict({ Type: PdfName.of('SigRef'), TransformMethod: PdfName.of('DocMDP'), TransformParams: params })]);
  }
  const sigRef = doc.add(sig);
  if (opts.certify) {
    const perms = (await doc.dict(catalog.get('Perms')))?.clone() ?? new PdfDict();
    catalog.set('Perms', perms.set('DocMDP', sigRef));
  }

  const fonts = new FontEmbedder(doc);
  const pages = await doc.pages();
  if (existing) {
    const src = form.sources.get(existing.name)!;
    const dict = (await doc.dict(src.ref))!.clone().set('V', sigRef);
    doc.update(src.ref, dict);
    const w = existing.widgets[0];
    if (w && w.rect.w > 0 && w.rect.h > 0) {
      const widgetRef = src.widgets[0].ref;
      const wd = widgetRef.equals(src.ref) ? dict : (await doc.dict(widgetRef))!.clone();
      const space = await pageSpace(doc, pages[w.page].dict);
      wd.set(
        'AP',
        new PdfDict({
          N: doc.add(
            await appearanceStream(
              signatureOps(w.rect, appearanceLines(opts, cert, signingTime)),
              w.rect,
              space,
              (v) => doc.add(v),
              new Map(),
              fonts,
            ),
          ),
        }),
      );
      doc.update(widgetRef, wd);
    }
  } else {
    const taken = new Set(form.model.fields.map((f) => f.name));
    const fieldName = opts.field ?? uniqueFieldName('Signature', taken);
    const pageIndex = Math.min(Math.max(0, opts.page ?? 0), pages.length - 1);
    const page = pages[pageIndex];
    const space = await pageSpace(doc, page.dict);
    const visible = opts.rect && opts.rect.w > 0 && opts.rect.h > 0 ? opts.rect : null;
    const widget = new PdfDict({
      Type: PdfName.of('Annot'),
      Subtype: PdfName.of('Widget'),
      FT: PdfName.of('Sig'),
      T: PdfString.text(fieldName),
      V: sigRef,
      F: 132, // print, locked
      Rect: visible ? space.rectToUser(visible) : [0, 0, 0, 0],
      P: page.ref,
    });
    if (visible) {
      const ops = signatureOps(visible, appearanceLines(opts, cert, signingTime));
      widget.set('AP', new PdfDict({ N: doc.add(await appearanceStream(ops, visible, space, (v) => doc.add(v), new Map(), fonts)) }));
    }
    const widgetRef = doc.add(widget);
    const annotsValue = page.dict.get('Annots');
    const annots = await doc.resolve(annotsValue);
    const list = [...(Array.isArray(annots) ? annots : []), widgetRef];
    if (annotsValue instanceof PdfRef) doc.update(annotsValue, list);
    else doc.update(page.ref, page.dict.clone().set('Annots', list));
    const fieldsValue = acro.get('Fields');
    const fields = await doc.resolve(fieldsValue);
    const fieldList = [...(Array.isArray(fields) ? fields : []), widgetRef];
    if (fieldsValue instanceof PdfRef) doc.update(fieldsValue, fieldList);
    else acro.set('Fields', fieldList);
  }
  await fonts.finish();

  acro.set('SigFlags', 3); // signatures exist; append only
  if (acroValue instanceof PdfRef) doc.update(acroValue, acro);
  else catalog.set('AcroForm', acro);
  doc.update(catalogRef, catalog);

  const out = await saveIncremental(doc);
  return fillSignature(out, signer, reserve, signingTime, (opts.subFilter ?? 'ETSI.CAdES.detached') === 'ETSI.CAdES.detached');
}

/** Replace the placeholders: the real /ByteRange (space-padded to the same length), then the CMS signature over it. */
async function fillSignature(out: Uint8Array, signer: PdfSigner, reserve: number, signingTime: Date, cades: boolean): Promise<Uint8Array> {
  const marker = `[${BYTE_RANGE_PLACEHOLDER.join(' ')}]`;
  const at = lastIndexOf(out, marker);
  if (at < 0) throw new Error('signature placeholder not found');
  let start = at + marker.length;
  while (start < out.length && out[start] !== 0x3c) start++; // `<` of /Contents
  const end = start + 2 + reserve * 2;
  if (out[end - 1] !== 0x3e) throw new Error('signature placeholder not found');
  const ranges = `[0 ${start} ${end} ${out.length - end}]`;
  out.set(new TextEncoder().encode(ranges.padEnd(marker.length, ' ')), at);

  const digest = await digestOf('SHA-256', concat([out.subarray(0, start), out.subarray(end)]));
  const cms = await buildSignedData(signer, digest, { signingTime, cades });
  if (cms.length > reserve) throw new Error(`the signature (${cms.length} bytes) doesn't fit the ${reserve} bytes reserved`);
  let hex = '';
  for (const b of cms) hex += b.toString(16).padStart(2, '0');
  out.set(new TextEncoder().encode(hex), start + 1);
  return out;
}

function appearanceLines(opts: SignPdfOptions, cert: Certificate, time: Date): readonly string[] {
  if (opts.appearanceText?.length) return opts.appearanceText;
  const who = opts.name ?? cert.subject.commonName ?? cert.subject.text;
  const lines = [`Digitally signed by ${who}`, `Date: ${time.toISOString().replace('T', ' ').slice(0, 19)} UTC`];
  if (opts.reason) lines.push(`Reason: ${opts.reason}`);
  if (opts.location) lines.push(`Location: ${opts.location}`);
  return lines;
}

/** A visible signature: its lines of text, sized to fit the box. */
export function signatureOps(rect: PdfRect, lines: readonly string[]): TextOp[] {
  const pad = 3;
  const lineFactor = 1.2;
  const widest = Math.max(1, ...lines.map((l) => textWidth(l, 'Helvetica', 1)));
  const size = Math.max(4, Math.min(12, (rect.w - 2 * pad) / widest, (rect.h - 2 * pad) / (lines.length * lineFactor)));
  return [
    {
      kind: 'text',
      font: 'Helvetica',
      fontSize: size,
      color: '#000000',
      opacity: 1,
      clip: rect,
      lines: lines.map((text, i) => ({ text, x: rect.x + pad, y: rect.y + pad + size * (i * lineFactor + 0.9) })),
    },
  ];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** `D:YYYYMMDDHHmmSSOHH'mm'` (every part after the year optional). */
export function parsePdfDate(s: string): Date | null {
  const m = /^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+-])?(\d{2})?'?(\d{2})?'?/.exec(s.trim());
  if (!m) return null;
  const [, y, mo = '01', d = '01', h = '00', mi = '00', se = '00', tz, th = '00', tm = '00'] = m;
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se);
  const offset = tz === '+' || tz === '-' ? (tz === '-' ? -1 : 1) * (+th * 60 + +tm) : 0;
  return new Date(utc - offset * 60_000);
}

function isOnlyWhitespace(b: Uint8Array): boolean {
  return b.every((c) => c === 0x0a || c === 0x0d || c === 0x20 || c === 0x00);
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
