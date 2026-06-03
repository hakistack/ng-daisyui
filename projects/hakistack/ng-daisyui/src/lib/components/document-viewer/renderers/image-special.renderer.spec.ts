import { describe, expect, it } from 'vitest';

import { isHeicLikeFormat, sniffHeicMagic } from './image-special.renderer';
import { ResolvedFormat } from '../document-viewer.types';

/**
 * Test fixtures for HEIC sniff: synthesize the leading 12 bytes of an
 * ISO Base Media File Format container with various brand identifiers.
 * Real HEIC files have far more bytes after this, but the sniffer only
 * inspects offsets 4–11.
 *
 * Layout:
 *   bytes 0-3   : ftyp box size (any value — we use a placeholder)
 *   bytes 4-7   : 'ftyp' magic
 *   bytes 8-11  : 4-char brand identifier
 */
function makeBmffHeader(brand: string): Uint8Array {
  if (brand.length !== 4) throw new Error('brand must be exactly 4 chars');
  const buf = new Uint8Array(12);
  // size placeholder (24 = 0x18 — typical small ftyp box)
  buf[0] = 0x00;
  buf[1] = 0x00;
  buf[2] = 0x00;
  buf[3] = 0x18;
  // 'ftyp'
  buf[4] = 0x66;
  buf[5] = 0x74;
  buf[6] = 0x79;
  buf[7] = 0x70;
  // brand chars
  for (let i = 0; i < 4; i++) buf[8 + i] = brand.charCodeAt(i);
  return buf;
}

describe('isHeicLikeFormat', () => {
  const make = (overrides: Partial<ResolvedFormat>): ResolvedFormat => ({
    format: 'image-special',
    mimeType: null,
    extension: null,
    ...overrides,
  });

  it('matches .heic extension', () => {
    expect(isHeicLikeFormat(make({ extension: '.heic' }))).toBe(true);
  });

  it('matches .heif extension', () => {
    expect(isHeicLikeFormat(make({ extension: '.heif' }))).toBe(true);
  });

  it('matches image/heic mime', () => {
    expect(isHeicLikeFormat(make({ mimeType: 'image/heic' }))).toBe(true);
  });

  it('matches image/heif mime', () => {
    expect(isHeicLikeFormat(make({ mimeType: 'image/heif' }))).toBe(true);
  });

  it('matches image/heic-sequence (startsWith covers all variants)', () => {
    // iOS sometimes serves multi-image HEIC with this MIME.
    expect(isHeicLikeFormat(make({ mimeType: 'image/heic-sequence' }))).toBe(true);
  });

  it('does NOT match .tiff (different image-special format)', () => {
    expect(isHeicLikeFormat(make({ extension: '.tiff' }))).toBe(false);
  });

  it('does NOT match .png', () => {
    expect(isHeicLikeFormat(make({ extension: '.png' }))).toBe(false);
  });

  it('does NOT match when both extension and mime are null', () => {
    expect(isHeicLikeFormat(make({}))).toBe(false);
  });
});

describe('sniffHeicMagic', () => {
  // Single-image HEIC brands per the ISO Base Media File Format spec.
  it.each(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'hei2'])('recognizes brand "%s"', (brand) => {
    expect(sniffHeicMagic(makeBmffHeader(brand))).toBe(true);
  });

  it('rejects "ftyp" header with an unknown brand', () => {
    // ISO BMFF with a non-HEIC brand — e.g. mp4 ('isom') or 3gp ('3gp4').
    expect(sniffHeicMagic(makeBmffHeader('isom'))).toBe(false);
    expect(sniffHeicMagic(makeBmffHeader('mp42'))).toBe(false);
  });

  it('rejects bytes without the ftyp magic', () => {
    // PNG signature instead of ftyp.
    const png = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47, // PNG signature
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature cont.
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR length
    ]);
    expect(sniffHeicMagic(png)).toBe(false);
  });

  it('rejects too-short inputs without throwing', () => {
    // Sniffer must defensively bail on a buffer that can't even fit a
    // ftyp box — a real file could be truncated mid-fetch.
    expect(sniffHeicMagic(new Uint8Array([]))).toBe(false);
    expect(sniffHeicMagic(new Uint8Array(11))).toBe(false);
    expect(sniffHeicMagic(new Uint8Array(8))).toBe(false);
  });

  it('rejects all-zero buffer of valid length', () => {
    // Edge case: a buffer that's the right size but has no magic.
    expect(sniffHeicMagic(new Uint8Array(12))).toBe(false);
  });
});
