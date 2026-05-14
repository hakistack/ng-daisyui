/**
 * Generate a RFC 4122 v4 UUID.
 *
 * Three-tier fallback so we work outside secure contexts (HTTP staging,
 * intranet apps without TLS) where `crypto.randomUUID` is undefined:
 *
 *   1. `crypto.randomUUID()` — fastest, available in secure contexts
 *      (HTTPS / localhost) and in Node 19+.
 *   2. `crypto.getRandomValues()` — available in every modern browser
 *      regardless of secure-context, plus Node 17+. Builds a v4 UUID
 *      from 16 random bytes with the standard variant/version bits.
 *   3. `Math.random()` — last-resort path for environments without any
 *      Web Crypto API (very old SSR shims). Not cryptographically
 *      secure, but matches our consumer needs (DOM ids, toast keys,
 *      etc. — never used for tokens or secrets).
 */
export function generateUniqueId(): string {
  const webCrypto: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;

  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    // RFC 4122 §4.4 — set the version (4) and variant (10xx) bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuid(bytes);
  }

  // Math.random fallback. Generates 16 pseudo-random bytes then applies
  // the same version/variant bit-stamping. Sufficient for non-security
  // uses (DOM id collisions are extraordinarily unlikely at this size).
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

const HEX = Array.from({ length: 256 }, (_, i) => (i + 0x100).toString(16).slice(1));

function formatUuid(bytes: Uint8Array): string {
  return (
    HEX[bytes[0]] +
    HEX[bytes[1]] +
    HEX[bytes[2]] +
    HEX[bytes[3]] +
    '-' +
    HEX[bytes[4]] +
    HEX[bytes[5]] +
    '-' +
    HEX[bytes[6]] +
    HEX[bytes[7]] +
    '-' +
    HEX[bytes[8]] +
    HEX[bytes[9]] +
    '-' +
    HEX[bytes[10]] +
    HEX[bytes[11]] +
    HEX[bytes[12]] +
    HEX[bytes[13]] +
    HEX[bytes[14]] +
    HEX[bytes[15]]
  );
}
