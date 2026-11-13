import {
  Asn1,
  TAG,
  bitString,
  concat,
  explicit,
  integer,
  nul,
  oid,
  oidToString,
  parseDer,
  readString,
  readTime,
  seq,
  setOf,
  time,
  utf8,
  der,
} from './asn1';

/** An X.509 certificate, as far as signature checks and display need. */
export interface Certificate {
  readonly raw: Uint8Array;
  readonly serial: Uint8Array;
  /** The issuer and subject Names exactly as encoded (signer identification compares these). */
  readonly issuerRaw: Uint8Array;
  readonly subjectRaw: Uint8Array;
  readonly issuer: DistinguishedName;
  readonly subject: DistinguishedName;
  readonly notBefore: Date;
  readonly notAfter: Date;
  /** SubjectPublicKeyInfo, for `crypto.subtle.importKey('spki', …)`. */
  readonly spki: Uint8Array;
  readonly keyAlgorithm: 'RSA' | 'EC' | 'unknown';
  /** EC named curve (`P-256`, `P-384`, `P-521`). */
  readonly curve?: string;
  readonly subjectKeyId?: Uint8Array;
  /** What the issuer signed (for chain checks), how, and the signature. */
  readonly tbs: Uint8Array;
  readonly signatureAlgorithm: Asn1;
  readonly signature: Uint8Array;
}

export interface DistinguishedName {
  readonly commonName?: string;
  readonly organization?: string;
  readonly organizationalUnit?: string;
  readonly country?: string;
  readonly email?: string;
  /** `CN=…, O=…`. */
  readonly text: string;
}

const NAME_OIDS: Record<string, [keyof Omit<DistinguishedName, 'text'>, string]> = {
  '2.5.4.3': ['commonName', 'CN'],
  '2.5.4.10': ['organization', 'O'],
  '2.5.4.11': ['organizationalUnit', 'OU'],
  '2.5.4.6': ['country', 'C'],
  '1.2.840.113549.1.9.1': ['email', 'E'],
};

const CURVES: Record<string, string> = { '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521' };

export function parseCertificate(raw: Uint8Array): Certificate {
  const cert = parseDer(raw);
  const tbs = cert.children[0];
  let i = 0;
  if (tbs.children[0].tag === 0xa0) i++; // [0] version
  const serial = tbs.children[i++].value;
  i++; // signature algorithm
  const issuer = tbs.children[i++];
  const validity = tbs.children[i++];
  const subject = tbs.children[i++];
  const spki = tbs.children[i++];
  const algOid = oidToString(spki.children[0].children[0].value);
  const params = spki.children[0].children[1];
  let subjectKeyId: Uint8Array | undefined;
  for (const el of tbs.children.slice(i)) {
    if (el.tag !== 0xa3) continue; // [3] extensions
    for (const ext of el.children[0].children) {
      if (oidToString(ext.children[0].value) === '2.5.29.14') subjectKeyId = parseDer(ext.children[ext.children.length - 1].value).value;
    }
  }
  return {
    raw: cert.raw,
    serial,
    issuerRaw: issuer.raw,
    subjectRaw: subject.raw,
    issuer: readName(issuer),
    subject: readName(subject),
    notBefore: readTime(validity.children[0]),
    notAfter: readTime(validity.children[1]),
    spki: spki.raw,
    keyAlgorithm:
      algOid === '1.2.840.113549.1.1.1' || algOid === '1.2.840.113549.1.1.10' ? 'RSA' : algOid === '1.2.840.10045.2.1' ? 'EC' : 'unknown',
    curve: params?.tag === TAG.OID ? CURVES[oidToString(params.value)] : undefined,
    subjectKeyId,
    tbs: tbs.raw,
    signatureAlgorithm: cert.children[1],
    signature: cert.children[2].value.subarray(1), // BIT STRING: drop the unused-bits byte
  };
}

function readName(name: Asn1): DistinguishedName {
  const out: Record<string, string> = {};
  const parts: string[] = [];
  for (const rdn of name.children) {
    for (const atv of rdn.children) {
      const key = NAME_OIDS[oidToString(atv.children[0].value)];
      const value = readString(atv.children[1]);
      if (key) {
        out[key[0]] = value;
        parts.push(`${key[1]}=${value}`);
      }
    }
  }
  return { ...out, text: parts.join(', ') };
}

/** Certificates from PEM text (any number of `CERTIFICATE` blocks) or DER bytes. */
export function certificatesFrom(source: Uint8Array | string): Uint8Array[] {
  if (typeof source !== 'string') return [source];
  const out: Uint8Array[] = [];
  for (const m of source.matchAll(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g)) {
    out.push(Uint8Array.from(atob(m[1].replace(/\s+/g, '')), (c) => c.charCodeAt(0)));
  }
  return out;
}

// ── Self-signed certificates (tests, development) ───────────────────────────

/**
 * A self-signed certificate for a WebCrypto key pair (RSASSA-PKCS1-v1_5 or
 * ECDSA with SHA-256): for trying signing out and for tests. Real
 * signatures use a certificate issued by a CA.
 */
export async function createSelfSignedCertificate(
  keys: CryptoKeyPair,
  opts: { commonName: string; organization?: string; email?: string; days?: number },
): Promise<Uint8Array> {
  const ec = keys.privateKey.algorithm.name === 'ECDSA';
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey));
  const name = seq(
    setOf(seq(oid('2.5.4.3'), utf8(opts.commonName))),
    ...(opts.organization ? [setOf(seq(oid('2.5.4.10'), utf8(opts.organization)))] : []),
    ...(opts.email ? [setOf(seq(oid('1.2.840.113549.1.9.1'), der(TAG.IA5_STRING, new TextEncoder().encode(opts.email))))] : []),
  );
  const sigAlg = ec ? seq(oid('1.2.840.10045.4.3.2')) : seq(oid('1.2.840.113549.1.1.11'), nul());
  const now = new Date();
  const serial = crypto.getRandomValues(new Uint8Array(12));
  serial[0] &= 0x7f;
  const keyUsage = seq(oid('2.5.29.15'), der(TAG.BOOLEAN, Uint8Array.of(0xff)), der(TAG.OCTET_STRING, bitStringRaw(0b11000000, 6))); // digitalSignature, nonRepudiation
  const tbs = seq(
    explicit(0, integer(2)),
    integer(serial),
    sigAlg,
    name,
    seq(time(now), time(new Date(now.getTime() + (opts.days ?? 365) * 86_400_000))),
    name,
    spki,
    explicit(3, seq(keyUsage)),
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      ec ? { name: 'ECDSA', hash: 'SHA-256' } : 'RSASSA-PKCS1-v1_5',
      keys.privateKey,
      tbs as Uint8Array<ArrayBuffer>,
    ),
  );
  return seq(tbs, sigAlg, bitString(ec ? ecdsaRawToDer(sig) : sig));
}

/** The certificate is its own issuer (same name; the signature is checked by the caller). */
export function isSelfIssued(cert: Certificate): boolean {
  return cert.issuerRaw.length === cert.subjectRaw.length && cert.issuerRaw.every((b, i) => b === cert.subjectRaw[i]);
}

/** A BIT STRING with `unused` trailing bits in its single byte. */
function bitStringRaw(byte: number, unused: number): Uint8Array {
  return der(TAG.BIT_STRING, Uint8Array.of(unused, byte));
}

/** WebCrypto's ECDSA signature (r‖s) → DER `SEQUENCE { r, s }`. */
export function ecdsaRawToDer(raw: Uint8Array): Uint8Array {
  const half = raw.length / 2;
  return seq(integer(raw.subarray(0, half)), integer(raw.subarray(half)));
}

/** DER `SEQUENCE { r, s }` → r‖s of `size` bytes each (what WebCrypto verifies). */
export function ecdsaDerToRaw(sig: Uint8Array, size: number): Uint8Array {
  const parsed = parseDer(sig);
  const fit = (v: Uint8Array) => {
    const b = v[0] === 0 ? v.subarray(1) : v;
    const out = new Uint8Array(size);
    out.set(b.subarray(Math.max(0, b.length - size)), Math.max(0, size - b.length));
    return out;
  };
  return concat([fit(parsed.children[0].value), fit(parsed.children[1].value)]);
}
