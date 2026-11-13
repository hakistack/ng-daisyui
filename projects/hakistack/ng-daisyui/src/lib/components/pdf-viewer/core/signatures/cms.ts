import {
  Asn1,
  TAG,
  concat,
  der,
  explicit,
  integer,
  nul,
  octetString,
  oid,
  oidToString,
  parseDer,
  readTime,
  seq,
  setOf,
  time,
} from './asn1';
import { Certificate, ecdsaDerToRaw, ecdsaRawToDer, parseCertificate } from './x509';

/**
 * CMS SignedData (RFC 5652) for PDF signatures: reading and verifying a
 * detached signature, and building one from a signer.
 */

const OID = {
  data: '1.2.840.113549.1.7.1',
  signedData: '1.2.840.113549.1.7.2',
  contentType: '1.2.840.113549.1.9.3',
  messageDigest: '1.2.840.113549.1.9.4',
  signingTime: '1.2.840.113549.1.9.5',
  signingCertificateV2: '1.2.840.113549.1.9.16.2.47',
  timeStampToken: '1.2.840.113549.1.9.16.2.14',
} as const;

const DIGESTS: Record<string, HashName> = {
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
};

/** Signature algorithm OIDs → how to verify (the hash, when the OID implies one). */
const SIGNATURES: Record<string, { kind: 'RSA' | 'PSS' | 'ECDSA'; hash?: HashName }> = {
  '1.2.840.113549.1.1.1': { kind: 'RSA' },
  '1.2.840.113549.1.1.5': { kind: 'RSA', hash: 'SHA-1' },
  '1.2.840.113549.1.1.11': { kind: 'RSA', hash: 'SHA-256' },
  '1.2.840.113549.1.1.12': { kind: 'RSA', hash: 'SHA-384' },
  '1.2.840.113549.1.1.13': { kind: 'RSA', hash: 'SHA-512' },
  '1.2.840.113549.1.1.10': { kind: 'PSS' },
  '1.2.840.10045.2.1': { kind: 'ECDSA' },
  '1.2.840.10045.4.1': { kind: 'ECDSA', hash: 'SHA-1' },
  '1.2.840.10045.4.3.2': { kind: 'ECDSA', hash: 'SHA-256' },
  '1.2.840.10045.4.3.3': { kind: 'ECDSA', hash: 'SHA-384' },
  '1.2.840.10045.4.3.4': { kind: 'ECDSA', hash: 'SHA-512' },
};

export interface SignedDataInfo {
  readonly certificates: readonly Certificate[];
  /** The signer's certificate, when the SignedData carries it. */
  readonly signer: Certificate | null;
  readonly digestAlgorithm: HashName | null;
  /** The encapsulated content (`adbe.pkcs7.sha1` puts the document digest there, a timestamp token its TSTInfo). */
  readonly content: Uint8Array | null;
  readonly signingTime: Date | null;
  /** The time of an embedded RFC 3161 timestamp (unsigned attribute), when there is one. */
  readonly timestampTime: Date | null;
  /** The parsed signer info, for {@link verifySignedData}. */
  readonly signerInfo: Asn1;
}

export type HashName = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export function parseSignedData(cms: Uint8Array): SignedDataInfo {
  const contentInfo = parseDer(cms);
  if (oidToString(contentInfo.children[0].value) !== OID.signedData) throw new Error('not a CMS SignedData');
  const sd = contentInfo.children[1].children[0];
  // version, digestAlgorithms, encapContentInfo, [0] certificates?, [1] crls?, signerInfos
  const encap = sd.children[2];
  const eContent = encap.children[1]?.children[0]?.value ?? null;
  const certificates: Certificate[] = [];
  for (const el of sd.children.slice(3, -1)) {
    if (el.tag !== 0xa0) continue;
    for (const c of el.children) {
      try {
        if (c.tag === TAG.SEQUENCE) certificates.push(parseCertificate(c.raw));
      } catch {
        /* attribute certificates and the like: ignored */
      }
    }
  }
  const signerInfo = sd.children[sd.children.length - 1].children[0];
  if (!signerInfo) throw new Error('no signer');
  const sid = signerInfo.children[1];
  const signer =
    sid.tag === TAG.SEQUENCE
      ? (certificates.find(
          (c) => equal(c.issuerRaw, sid.children[0].raw) && equal(stripZero(c.serial), stripZero(sid.children[1].value)),
        ) ?? null)
      : (certificates.find((c) => c.subjectKeyId && equal(c.subjectKeyId, sid.value)) ?? null);
  const digestOid = oidToString(signerInfo.children[2].children[0].value);
  const st = attribute(signerInfo, 0xa0, OID.signingTime);
  const token = attribute(signerInfo, 0xa1, OID.timeStampToken);
  let timestampTime: Date | null = null;
  if (token) {
    try {
      const tst = parseSignedData(token.raw).content;
      timestampTime = tst ? parseTstInfo(tst).genTime : null;
    } catch {
      /* unreadable timestamp: ignored */
    }
  }
  return {
    certificates,
    signer,
    digestAlgorithm: DIGESTS[digestOid] ?? null,
    content: eContent,
    signingTime: st ? readTime(st) : null,
    timestampTime,
    signerInfo,
  };
}

/** The first value of a signed (`0xa0`) or unsigned (`0xa1`) attribute. */
function attribute(signerInfo: Asn1, tag: number, id: string): Asn1 | undefined {
  const attrs = signerInfo.children.find((c) => c.tag === tag);
  return attrs?.children.find((a) => oidToString(a.children[0].value) === id)?.children[1]?.children[0];
}

/** An RFC 3161 TSTInfo: what was timestamped (a digest) and when. */
export function parseTstInfo(der: Uint8Array): { hash: HashName | null; digest: Uint8Array; genTime: Date } {
  const tst = parseDer(der);
  const imprint = tst.children[2];
  return {
    hash: DIGESTS[oidToString(imprint.children[0].children[0].value)] ?? null,
    digest: imprint.children[1].value,
    genTime: readTime(tst.children[4]),
  };
}

export interface VerifyResult {
  /** The signed attributes' message digest matches the signed content's digest. */
  readonly digestMatches: boolean;
  /** The signature over the signed attributes verifies with the signer's key. */
  readonly signatureValid: boolean;
  /** Why it couldn't be verified (unsupported algorithm, missing certificate…). */
  readonly error?: string;
}

/**
 * Verify a SignedData: over its encapsulated content, or over `detached`
 * (a PDF signature's byte ranges) when it has none.
 */
export async function verifySignedData(info: SignedDataInfo, detached: Uint8Array | null): Promise<VerifyResult> {
  const si = info.signerInfo;
  const hash = info.digestAlgorithm;
  if (!hash) return { digestMatches: false, signatureValid: false, error: 'unsupported digest algorithm' };
  if (!info.signer) return { digestMatches: false, signatureValid: false, error: "the signer's certificate isn't in the signature" };
  const content = info.content ?? detached;
  if (!content) return { digestMatches: false, signatureValid: false, error: 'nothing to verify against' };
  const digest = await digestOf(hash, content);
  const signedAttrs = si.children.find((c) => c.tag === 0xa0);
  const sigAlgIndex = signedAttrs ? 4 : 3;
  let message: Uint8Array;
  let digestMatches: boolean;
  if (signedAttrs) {
    const md = attribute(si, 0xa0, OID.messageDigest)?.value;
    digestMatches = !!md && equal(md, digest);
    // The signature covers the attributes DER-encoded as a SET (not the [0] IMPLICIT tag).
    message = concat([Uint8Array.of(TAG.SET), signedAttrs.raw.subarray(1)]);
  } else {
    digestMatches = true;
    message = content;
  }
  try {
    const signatureValid = await verifyWith(info.signer, si.children[sigAlgIndex], si.children[sigAlgIndex + 1].value, message, hash);
    return { digestMatches, signatureValid };
  } catch (err) {
    return { digestMatches, signatureValid: false, error: (err as Error).message };
  }
}

/**
 * Check `signature` over `message` with `cert`'s public key and the
 * algorithm `sigAlg` (an AlgorithmIdentifier); `fallbackHash` is used when
 * the algorithm doesn't name one (plain rsaEncryption or ecPublicKey).
 * Throws for unsupported algorithms.
 */
export async function verifyWith(
  cert: Certificate,
  sigAlg: Asn1,
  signature: Uint8Array,
  message: Uint8Array,
  fallbackHash: HashName,
): Promise<boolean> {
  const algOid = oidToString(sigAlg.children[0].value);
  const alg = SIGNATURES[algOid];
  if (!alg) throw new Error(`unsupported signature algorithm ${algOid}`);
  const hash = alg.hash ?? fallbackHash;
  const data = message as Uint8Array<ArrayBuffer>;
  if (alg.kind === 'ECDSA') {
    const curve = cert.curve ?? 'P-256';
    const size = curve === 'P-521' ? 66 : curve === 'P-384' ? 48 : 32;
    const key = await crypto.subtle.importKey('spki', cert.spki as Uint8Array<ArrayBuffer>, { name: 'ECDSA', namedCurve: curve }, false, [
      'verify',
    ]);
    return crypto.subtle.verify({ name: 'ECDSA', hash }, key, ecdsaDerToRaw(signature, size) as Uint8Array<ArrayBuffer>, data);
  }
  if (alg.kind === 'PSS') {
    // RSASSA-PSS-params: [0] hashAlgorithm, [1] maskGenAlgorithm, [2] saltLength (defaults SHA-1, 20).
    const params = sigAlg.children[1];
    const pssHash = params?.children.find((c) => c.tag === 0xa0)?.children[0]?.children[0];
    const saltEl = params?.children.find((c) => c.tag === 0xa2)?.children[0];
    const h = pssHash ? (DIGESTS[oidToString(pssHash.value)] ?? 'SHA-1') : 'SHA-1';
    const key = await crypto.subtle.importKey('spki', rsaSpki(cert.spki) as Uint8Array<ArrayBuffer>, { name: 'RSA-PSS', hash: h }, false, [
      'verify',
    ]);
    return crypto.subtle.verify(
      { name: 'RSA-PSS', saltLength: saltEl ? bigInt(saltEl.value) : 20 },
      key,
      signature as Uint8Array<ArrayBuffer>,
      data,
    );
  }
  const key = await crypto.subtle.importKey(
    'spki',
    rsaSpki(cert.spki) as Uint8Array<ArrayBuffer>,
    { name: 'RSASSA-PKCS1-v1_5', hash },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature as Uint8Array<ArrayBuffer>, data);
}

export async function digestOf(hash: HashName, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest(hash, data as Uint8Array<ArrayBuffer>));
}

// ── Building ────────────────────────────────────────────────────────────────

/**
 * Produces the signature value for a PDF signature. `data` is what gets
 * signed (the DER signed attributes) and `digest` its SHA-256, for signers
 * (HSMs, remote services) that sign a hash rather than data.
 */
export interface PdfSigner {
  /** The signing certificate (DER) first, then the rest of its chain. */
  readonly certificates: readonly Uint8Array[];
  /** `RSA` (PKCS#1 v1.5) or `ECDSA` (the signature may be r‖s or DER). */
  readonly algorithm: 'RSA' | 'ECDSA';
  sign(data: Uint8Array, digest: Uint8Array): Promise<Uint8Array>;
}

/** A {@link PdfSigner} for a WebCrypto private key (RSASSA-PKCS1-v1_5 or ECDSA, SHA-256) and its certificate chain. */
export function createWebCryptoSigner(privateKey: CryptoKey, certificates: readonly Uint8Array[]): PdfSigner {
  const ecdsa = privateKey.algorithm.name === 'ECDSA';
  return {
    certificates,
    algorithm: ecdsa ? 'ECDSA' : 'RSA',
    sign: async (data) =>
      new Uint8Array(
        await crypto.subtle.sign(
          ecdsa ? { name: 'ECDSA', hash: 'SHA-256' } : 'RSASSA-PKCS1-v1_5',
          privateKey,
          data as Uint8Array<ArrayBuffer>,
        ),
      ),
  };
}

/**
 * A detached CMS SignedData over a document digest (SHA-256), with the
 * signed attributes PAdES expects (content type, signing time, message
 * digest, and the ESS signing-certificate-v2 binding when `cades`).
 */
export async function buildSignedData(
  signer: PdfSigner,
  documentDigest: Uint8Array,
  opts: { signingTime: Date; cades: boolean },
): Promise<Uint8Array> {
  if (!signer.certificates.length) throw new Error('the signer has no certificate');
  const cert = parseCertificate(signer.certificates[0]);
  const sha256 = seq(oid('2.16.840.1.101.3.4.2.1'));
  const attrs = [
    seq(oid(OID.contentType), setOf(oid(OID.data))),
    seq(oid(OID.signingTime), setOf(time(opts.signingTime))),
    seq(oid(OID.messageDigest), setOf(octetString(documentDigest))),
  ];
  if (opts.cades) {
    const certHash = new Uint8Array(await crypto.subtle.digest('SHA-256', signer.certificates[0] as Uint8Array<ArrayBuffer>));
    attrs.push(seq(oid(OID.signingCertificateV2), setOf(seq(seq(seq(octetString(certHash)))))));
  }
  const signedAttrs = setOf(...attrs);
  const attrsDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', signedAttrs as Uint8Array<ArrayBuffer>));
  let signature = await signer.sign(signedAttrs, attrsDigest);
  const ecdsa = signer.algorithm === 'ECDSA';
  if (ecdsa && signature[0] !== 0x30) signature = ecdsaRawToDer(signature); // r‖s → DER
  const sigAlg = ecdsa ? seq(oid('1.2.840.10045.4.3.2')) : seq(oid('1.2.840.113549.1.1.11'), nul());
  const signerInfo = seq(
    integer(1),
    seq(cert.issuerRaw, integer(cert.serial)),
    sha256,
    der(0xa0, signedAttrs.subarray(headerLength(signedAttrs))), // [0] IMPLICIT
    sigAlg,
    octetString(signature),
  );
  const signedData = seq(integer(1), setOf(sha256), seq(oid(OID.data)), der(0xa0, concat([...signer.certificates])), setOf(signerInfo));
  return seq(oid(OID.signedData), explicit(0, signedData));
}

function headerLength(el: Uint8Array): number {
  return el[1] & 0x80 ? 2 + (el[1] & 0x7f) : 2;
}

/** RSA-PSS keys in certificates sometimes carry PSS parameters WebCrypto refuses: re-wrap as rsaEncryption. */
function rsaSpki(spki: Uint8Array): Uint8Array {
  const parsed = parseDer(spki);
  if (oidToString(parsed.children[0].children[0].value) !== '1.2.840.113549.1.1.10') return spki;
  return seq(seq(oid('1.2.840.113549.1.1.1'), nul()), parsed.children[1].raw);
}

function stripZero(b: Uint8Array): Uint8Array {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.subarray(i);
}

function bigInt(b: Uint8Array): number {
  let n = 0;
  for (const x of b) n = n * 256 + x;
  return n;
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
