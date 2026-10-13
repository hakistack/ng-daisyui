import { PdfDict, PdfName, PdfStream, PdfString, PdfValue } from './objects';

/**
 * The standard security handler (§7.6.4): opening encrypted documents with
 * the user or owner password (RC4 40/128-bit, AES-128, AES-256 revisions
 * 5 and 6), decrypting what is read and encrypting what an incremental
 * update writes, with the document's own key. MD5 and RC4 are implemented
 * here (they're small); AES and SHA-2 come from WebCrypto.
 */

/** Thrown when neither the user nor the owner password matches. */
export class PdfPasswordError extends Error {
  constructor() {
    super('incorrect password');
    this.name = 'PdfPasswordError';
  }
}

/** Permission bits (§7.6.4.2, Table 22) that matter to an editor. */
export const PDF_PERMISSION = {
  print: 1 << 2,
  modify: 1 << 3,
  copy: 1 << 4,
  annotate: 1 << 5,
  fillForms: 1 << 8,
  assemble: 1 << 10,
} as const;

const PAD = Uint8Array.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e,
  0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

type Cipher = 'rc4' | 'aes128' | 'aes256' | 'none';

export class PdfSecurity {
  private constructor(
    /** The file key. */
    private readonly key: Uint8Array,
    private readonly stringCipher: Cipher,
    private readonly streamCipher: Cipher,
    /** `/P`: what the user may do. */
    readonly permissions: number,
    /** Opened with the owner password: every permission applies. */
    readonly owner: boolean,
    readonly encryptMetadata: boolean,
  ) {}

  /** Whether a permission is granted (always with the owner password). */
  allows(bit: number): boolean {
    return this.owner || (this.permissions & bit) !== 0;
  }

  /**
   * Authenticate with `password` (tried as the user, then the owner
   * password) against the `/Encrypt` dictionary and the first `/ID`.
   */
  static async open(encrypt: PdfDict, id0: Uint8Array, password = ''): Promise<PdfSecurity> {
    if (encrypt.getName('Filter') !== 'Standard') throw new Error(`unsupported security handler /${encrypt.getName('Filter')}`);
    const v = encrypt.getNumber('V') ?? 0;
    const r = encrypt.getNumber('R') ?? 2;
    const p = (encrypt.getNumber('P') ?? 0) >>> 0;
    const o = bytesOf(encrypt.get('O'));
    const u = bytesOf(encrypt.get('U'));
    const encryptMetadata = encrypt.get('EncryptMetadata') !== false;
    const { stringCipher, streamCipher } = ciphers(encrypt, v);

    if (r >= 5) {
      const pw = new TextEncoder().encode(password).subarray(0, 127);
      const oe = bytesOf(encrypt.get('OE'));
      const ue = bytesOf(encrypt.get('UE'));
      const hash = (input: Uint8Array, salt: Uint8Array, extra: Uint8Array) =>
        r === 5 ? sha256(concat(input, salt, extra)) : hash2B(input, salt, extra);
      if (equal(await hash(pw, o.subarray(32, 40), u.subarray(0, 48)), o.subarray(0, 32))) {
        const k = await hash(pw, o.subarray(40, 48), u.subarray(0, 48));
        return new PdfSecurity(await aesDecryptRaw(k, new Uint8Array(16), oe), stringCipher, streamCipher, p, true, encryptMetadata);
      }
      if (equal(await hash(pw, u.subarray(32, 40), new Uint8Array()), u.subarray(0, 32))) {
        const k = await hash(pw, u.subarray(40, 48), new Uint8Array());
        return new PdfSecurity(await aesDecryptRaw(k, new Uint8Array(16), ue), stringCipher, streamCipher, p, false, encryptMetadata);
      }
      throw new PdfPasswordError();
    }

    const length = r === 2 ? 5 : Math.max(5, Math.min(16, (encrypt.getNumber('Length') ?? 40) / 8));
    const pw = latin1Bytes(password);
    const userKey = fileKey(pw, o, p, id0, r, length, encryptMetadata);
    if (checkUser(userKey, u, id0, r)) return new PdfSecurity(userKey, stringCipher, streamCipher, p, false, encryptMetadata);
    // Owner password: it decrypts /O into the user password.
    const userPw = ownerToUserPassword(pw, o, r, length);
    const ownerKey = fileKey(userPw, o, p, id0, r, length, encryptMetadata);
    if (checkUser(ownerKey, u, id0, r)) return new PdfSecurity(ownerKey, stringCipher, streamCipher, p, true, encryptMetadata);
    throw new PdfPasswordError();
  }

  /**
   * A new standard security handler and its `/Encrypt` dictionary
   * (revision 3 RC4-128, 4 AES-128 or 6 AES-256), for encrypting a document.
   */
  static async create(opts: {
    userPassword: string;
    ownerPassword: string;
    revision: 3 | 4 | 6;
    permissions: number;
    id0: Uint8Array;
  }): Promise<{ security: PdfSecurity; encrypt: PdfDict }> {
    const p = (opts.permissions | 0xfffff0c0) >>> 0; // reserved bits set, as the spec requires
    const signedP = p | 0; // /P is a signed 32-bit integer in the file
    if (opts.revision === 6) {
      const enc = new TextEncoder();
      const upw = enc.encode(opts.userPassword).subarray(0, 127);
      const opw = enc.encode(opts.ownerPassword).subarray(0, 127);
      const key = random(32);
      const uSalt = random(16);
      const u = concat(await hash2B(upw, uSalt.subarray(0, 8), new Uint8Array()), uSalt);
      const ue = await aesEncryptRaw(await hash2B(upw, uSalt.subarray(8, 16), new Uint8Array()), new Uint8Array(16), key);
      const oSalt = random(16);
      const o = concat(await hash2B(opw, oSalt.subarray(0, 8), u), oSalt);
      const oe = await aesEncryptRaw(await hash2B(opw, oSalt.subarray(8, 16), u), new Uint8Array(16), key);
      const perms = new Uint8Array(16);
      new DataView(perms.buffer).setUint32(0, p, true);
      perms.set([0xff, 0xff, 0xff, 0xff, 0x54 /* T */, 0x61, 0x64, 0x62], 4);
      perms.set(random(4), 12);
      const permsEnc = await aesEncryptRaw(key, new Uint8Array(16), perms);
      const cf = new PdfDict({ StdCF: new PdfDict({ CFM: PdfName.of('AESV3'), AuthEvent: PdfName.of('DocOpen'), Length: 32 }) });
      const encrypt = new PdfDict({
        Filter: PdfName.of('Standard'),
        V: 5,
        R: 6,
        Length: 256,
        O: PdfString.bytes(o),
        U: PdfString.bytes(u),
        OE: PdfString.bytes(oe),
        UE: PdfString.bytes(ue),
        Perms: PdfString.bytes(permsEnc),
        P: signedP,
        CF: cf,
        StmF: PdfName.of('StdCF'),
        StrF: PdfName.of('StdCF'),
      });
      return { security: new PdfSecurity(key, 'aes256', 'aes256', p, false, true), encrypt };
    }
    const length = 16;
    const upw = latin1Bytes(opts.userPassword);
    const opw = latin1Bytes(opts.ownerPassword || opts.userPassword);
    // /O: the user password encrypted with a key from the owner password (Algorithm 3).
    let ownerKey = md5(pad(opw));
    for (let i = 0; i < 50; i++) ownerKey = md5(ownerKey.subarray(0, length));
    let o = rc4(ownerKey.subarray(0, length), pad(upw));
    for (let i = 1; i <= 19; i++) o = rc4(xorKey(ownerKey.subarray(0, length), i), o);
    const key = fileKey(upw, o, p, opts.id0, opts.revision, length, true);
    // /U (Algorithm 5).
    let u = rc4(key, md5(concat(PAD, opts.id0)));
    for (let i = 1; i <= 19; i++) u = rc4(xorKey(key, i), u);
    u = concat(u, new Uint8Array(16));
    const aes = opts.revision === 4;
    const encrypt = new PdfDict({
      Filter: PdfName.of('Standard'),
      V: aes ? 4 : 2,
      R: opts.revision,
      Length: 128,
      O: PdfString.bytes(o),
      U: PdfString.bytes(u),
      P: signedP,
    });
    if (aes) {
      encrypt.set('CF', new PdfDict({ StdCF: new PdfDict({ CFM: PdfName.of('AESV2'), AuthEvent: PdfName.of('DocOpen'), Length: 16 }) }));
      encrypt.set('StmF', PdfName.of('StdCF'));
      encrypt.set('StrF', PdfName.of('StdCF'));
    }
    return { security: new PdfSecurity(key, aes ? 'aes128' : 'rc4', aes ? 'aes128' : 'rc4', p, false, true), encrypt };
  }

  // ── Objects ─────────────────────────────────────────────────────────────

  /** Decrypt an object read from the file (its strings, and its stream data before filters). */
  async decryptObject(num: number, gen: number, value: PdfValue): Promise<PdfValue> {
    return this.transform(num, gen, value, false);
  }

  /** Encrypt an object for writing. Returns a copy; the input is untouched. */
  async encryptObject(num: number, gen: number, value: PdfValue): Promise<PdfValue> {
    return this.transform(num, gen, value, true);
  }

  private async transform(num: number, gen: number, value: PdfValue, encrypt: boolean): Promise<PdfValue> {
    if (value instanceof PdfStream) {
      const type = value.dict.getName('Type');
      if (type === 'XRef') return value; // cross-reference streams are never encrypted
      const skip = (type === 'Metadata' && !this.encryptMetadata) || hasIdentityCrypt(value.dict);
      const dict = (await this.transform(num, gen, value.dict, encrypt)) as PdfDict;
      const data = skip ? value.data : await this.apply(this.streamCipher, num, gen, value.data, encrypt);
      return new PdfStream(dict, data);
    }
    if (value instanceof PdfString) return new PdfString(await this.apply(this.stringCipher, num, gen, value.bytes, encrypt), value.hex);
    if (Array.isArray(value)) return Promise.all(value.map((v) => this.transform(num, gen, v, encrypt)));
    if (value instanceof PdfDict) {
      const out = new PdfDict();
      for (const [k, v] of value) out.set(k, await this.transform(num, gen, v, encrypt));
      return out;
    }
    return value;
  }

  private async apply(cipher: Cipher, num: number, gen: number, data: Uint8Array, encrypt: boolean): Promise<Uint8Array> {
    if (cipher === 'none' || data.length === 0) return data;
    const key = cipher === 'aes256' ? this.key : objectKey(this.key, num, gen, cipher === 'aes128');
    if (cipher === 'rc4') return rc4(key, data);
    if (encrypt) {
      const iv = random(16);
      return concat(iv, await aesCbc(key, iv, data, true));
    }
    if (data.length < 32 || data.length % 16 !== 0) return data.length < 16 ? new Uint8Array() : data.subarray(16);
    try {
      return await aesCbc(key, data.subarray(0, 16), data.subarray(16), false);
    } catch {
      return new Uint8Array(); // bad padding: unreadable
    }
  }
}

// ── Key derivation (revisions 2–4) ──────────────────────────────────────────

function ciphers(encrypt: PdfDict, v: number): { stringCipher: Cipher; streamCipher: Cipher } {
  if (v < 4) return { stringCipher: 'rc4', streamCipher: 'rc4' };
  const cf = encrypt.get('CF');
  const filter = (name: string | undefined): Cipher => {
    if (!name || name === 'Identity') return 'none';
    const f = cf instanceof PdfDict ? cf.get(name) : null;
    const cfm = f instanceof PdfDict ? f.getName('CFM') : undefined;
    return cfm === 'AESV2' ? 'aes128' : cfm === 'AESV3' ? 'aes256' : cfm === 'V2' ? 'rc4' : 'none';
  };
  return { stringCipher: filter(encrypt.getName('StrF')), streamCipher: filter(encrypt.getName('StmF')) };
}

function pad(password: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  const pw = password.subarray(0, 32);
  out.set(pw);
  out.set(PAD.subarray(0, 32 - pw.length), pw.length);
  return out;
}

/** Algorithm 2: the file key from the user password. */
function fileKey(
  password: Uint8Array,
  o: Uint8Array,
  p: number,
  id0: Uint8Array,
  r: number,
  length: number,
  encryptMetadata: boolean,
): Uint8Array {
  const pBytes = new Uint8Array(4);
  new DataView(pBytes.buffer).setUint32(0, p >>> 0, true);
  const parts = [pad(password), o.subarray(0, 32), pBytes, id0];
  if (r >= 4 && !encryptMetadata) parts.push(Uint8Array.from([0xff, 0xff, 0xff, 0xff]));
  let key = md5(concat(...parts));
  if (r >= 3) for (let i = 0; i < 50; i++) key = md5(key.subarray(0, length));
  return key.subarray(0, length);
}

/** Algorithms 4 and 5: does this key produce `/U`? */
function checkUser(key: Uint8Array, u: Uint8Array, id0: Uint8Array, r: number): boolean {
  if (r === 2) return equal(rc4(key, PAD), u.subarray(0, 32));
  let x = rc4(key, md5(concat(PAD, id0)));
  for (let i = 1; i <= 19; i++) x = rc4(xorKey(key, i), x);
  return equal(x, u.subarray(0, 16));
}

/** Algorithm 7: the user password hidden in `/O`, recovered with the owner password. */
function ownerToUserPassword(ownerPw: Uint8Array, o: Uint8Array, r: number, length: number): Uint8Array {
  let key = md5(pad(ownerPw));
  if (r >= 3) for (let i = 0; i < 50; i++) key = md5(key.subarray(0, length));
  key = key.subarray(0, r === 2 ? 5 : length);
  if (r === 2) return rc4(key, o.subarray(0, 32));
  let x = o.subarray(0, 32);
  for (let i = 19; i >= 0; i--) x = rc4(xorKey(key, i), x);
  return x;
}

/** Algorithm 1: the per-object key. */
function objectKey(key: Uint8Array, num: number, gen: number, aes: boolean): Uint8Array {
  const extra = Uint8Array.from([num & 0xff, (num >> 8) & 0xff, (num >> 16) & 0xff, gen & 0xff, (gen >> 8) & 0xff]);
  const salt = aes ? Uint8Array.from([0x73, 0x41, 0x6c, 0x54]) : new Uint8Array();
  return md5(concat(key, extra, salt)).subarray(0, Math.min(key.length + 5, 16));
}

function xorKey(key: Uint8Array, i: number): Uint8Array {
  return key.map((b) => b ^ i);
}

function hasIdentityCrypt(dict: PdfDict): boolean {
  const f = dict.get('Filter');
  const names = f instanceof PdfName ? [f.value] : Array.isArray(f) ? f.map((x) => (x instanceof PdfName ? x.value : '')) : [];
  return names.includes('Crypt');
}

// ── Revision 6 hash (Algorithm 2.B) ─────────────────────────────────────────

async function hash2B(password: Uint8Array, salt: Uint8Array, udata: Uint8Array): Promise<Uint8Array> {
  let k = await sha256(concat(password, salt, udata));
  for (let round = 0; ; round++) {
    const k1 = concat(...Array.from({ length: 64 }, () => concat(password, k, udata)));
    const e = await aesCbc(k.subarray(0, 16), k.subarray(16, 32), k1, true); // the input is block-aligned: drop the padding block
    const ex = e.subarray(0, k1.length);
    let sum = 0;
    for (let i = 0; i < 16; i++) sum += ex[i];
    const algo = ['SHA-256', 'SHA-384', 'SHA-512'][sum % 3];
    k = new Uint8Array(await crypto.subtle.digest(algo, ex as Uint8Array<ArrayBuffer>));
    // At least 64 rounds, then until the last byte of E ≤ (rounds done) − 32.
    if (round + 1 >= 64 && ex[ex.length - 1] <= round + 1 - 32) break;
  }
  return k.subarray(0, 32);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>));
}

// ── AES (WebCrypto) ─────────────────────────────────────────────────────────

async function aesCbc(key: Uint8Array, iv: Uint8Array, data: Uint8Array, encrypt: boolean): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as Uint8Array<ArrayBuffer>, 'AES-CBC', false, [encrypt ? 'encrypt' : 'decrypt']);
  const params = { name: 'AES-CBC', iv: iv as Uint8Array<ArrayBuffer> };
  const out = encrypt
    ? await crypto.subtle.encrypt(params, k, data as Uint8Array<ArrayBuffer>)
    : await crypto.subtle.decrypt(params, k, data as Uint8Array<ArrayBuffer>);
  return new Uint8Array(out);
}

/** AES-CBC encryption without padding (block-aligned input). */
async function aesEncryptRaw(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  return (await aesCbc(key, iv, data, true)).subarray(0, data.length);
}

/**
 * AES-CBC decryption without padding. WebCrypto insists on PKCS#7, so a
 * block is appended that decrypts to a full padding block.
 */
async function aesDecryptRaw(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const last = data.subarray(data.length - 16);
  const padBlock = new Uint8Array(16).fill(16).map((b, i) => b ^ last[i]);
  const extra = (await aesCbc(key, new Uint8Array(16), padBlock, true)).subarray(0, 16);
  return aesCbc(key, iv, concat(data, extra), false);
}

// ── RC4 and MD5 ─────────────────────────────────────────────────────────────

export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = new Uint8Array(data.length);
  for (let n = 0, i = 0, j = 0; n < data.length; n++) {
    i = (i + 1) & 0xff;
    j = (j + s[i]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
    out[n] = data[n] ^ s[(s[i] + s[j]) & 0xff];
  }
  return out;
}

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 72) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 2 ** 32), true);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const m = new Uint32Array(16);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) m[i] = view.getUint32(off + i * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      const x = (a + f + MD5_K[i] + m[g]) >>> 0;
      b = (b + ((x << MD5_S[i]) | (x >>> (32 - MD5_S[i])))) >>> 0;
      a = tmp;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((w, i) => ov.setUint32(i * 4, w, true));
  return out;
}

// ── Bytes ───────────────────────────────────────────────────────────────────

function bytesOf(v: PdfValue | undefined): Uint8Array {
  return v instanceof PdfString ? v.bytes : new Uint8Array();
}

function latin1Bytes(s: string): Uint8Array {
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function random(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}
