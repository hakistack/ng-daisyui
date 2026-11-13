import type { CustomFont } from './standard-fonts';

/**
 * TrueType fonts (glyf outlines): enough parsing to map characters to
 * glyphs, measure text and write a subset for embedding. Subsets keep the
 * original glyph ids (unused glyphs become empty), so content streams can
 * be written as soon as text is laid out, before the subset is known.
 */

interface Table {
  readonly offset: number;
  readonly length: number;
}

/** OS/2 fsType bit: restricted licence (the font must not be embedded). */
const FS_TYPE_RESTRICTED = 0x0002;
/** Tables copied unchanged into a subset (hinting programs reference each other, so they travel together). */
const COPIED_TABLES = ['hhea', 'maxp', 'hmtx', 'cvt ', 'fpgm', 'prep', 'OS/2'];

export class TrueTypeFont implements CustomFont {
  readonly unitsPerEm: number;
  readonly numGlyphs: number;
  /** PostScript name (`/BaseFont`). */
  readonly postScriptName: string;
  readonly bbox: readonly [number, number, number, number];
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly italicAngle: number;
  readonly fixedPitch: boolean;
  readonly bold: boolean;
  /** Embedding allowed by the font's licence bits. */
  readonly embeddable: boolean;

  private readonly tables = new Map<string, Table>();
  private readonly view: DataView;
  private readonly cmap = new Map<number, number>();
  private readonly advances: Uint16Array;
  private readonly loca: Uint32Array;

  private constructor(
    /** The name it's registered under. */
    readonly name: string,
    private readonly bytes: Uint8Array,
  ) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const version = v.getUint32(0);
    if (version === 0x4f54544f) throw new Error('CFF-based OpenType fonts (OTTO) are not supported; use a TrueType-outline font');
    if (version === 0x74746366) throw new Error('font collections (.ttc) are not supported; extract one font');
    if (version !== 0x00010000 && version !== 0x74727565) throw new Error('not a TrueType font');
    const numTables = v.getUint16(4);
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + i * 16;
      const tag = String.fromCharCode(...bytes.subarray(rec, rec + 4));
      this.tables.set(tag, { offset: v.getUint32(rec + 8), length: v.getUint32(rec + 12) });
    }
    for (const required of ['head', 'hhea', 'maxp', 'hmtx', 'loca', 'glyf', 'cmap']) {
      if (!this.tables.has(required)) throw new Error(`font has no '${required}' table`);
    }
    const head = this.table('head').offset;
    this.unitsPerEm = v.getUint16(head + 18);
    const k = 1000 / this.unitsPerEm;
    this.bbox = [v.getInt16(head + 36) * k, v.getInt16(head + 38) * k, v.getInt16(head + 40) * k, v.getInt16(head + 42) * k];
    const longLoca = v.getInt16(head + 50) === 1;
    this.bold = (v.getUint16(head + 44) & 1) !== 0;

    this.numGlyphs = v.getUint16(this.table('maxp').offset + 4);
    const hhea = this.table('hhea').offset;
    this.ascent = v.getInt16(hhea + 4) * k;
    this.descent = v.getInt16(hhea + 6) * k;
    const numberOfHMetrics = v.getUint16(hhea + 34);

    const hmtx = this.table('hmtx').offset;
    this.advances = new Uint16Array(this.numGlyphs);
    let last = 0;
    for (let g = 0; g < this.numGlyphs; g++) {
      if (g < numberOfHMetrics) last = v.getUint16(hmtx + g * 4);
      this.advances[g] = last;
    }

    const loca = this.table('loca').offset;
    this.loca = new Uint32Array(this.numGlyphs + 1);
    for (let g = 0; g <= this.numGlyphs; g++) this.loca[g] = longLoca ? v.getUint32(loca + g * 4) : v.getUint16(loca + g * 2) * 2;

    const os2 = this.tables.get('OS/2');
    const fsType = os2 ? v.getUint16(os2.offset + 8) : 0;
    // Restricted licence: only when no other embedding bit (preview/print, editable) relaxes it.
    this.embeddable = !((fsType & 0x000f) === FS_TYPE_RESTRICTED);
    this.capHeight = os2 && os2.length >= 90 && v.getUint16(os2.offset) >= 2 ? v.getInt16(os2.offset + 88) * k : this.ascent * 0.7;
    const post = this.tables.get('post');
    this.italicAngle = post ? v.getInt32(post.offset + 4) / 65536 : 0;
    this.fixedPitch = post ? v.getUint32(post.offset + 12) !== 0 : false;
    this.postScriptName = this.readPostScriptName() ?? name.replace(/[^A-Za-z0-9-]/g, '');
    this.readCmap();
  }

  static parse(name: string, bytes: Uint8Array): TrueTypeFont {
    return new TrueTypeFont(name, bytes);
  }

  // ── Characters and metrics ──────────────────────────────────────────────

  /** The glyph for a code point (0, `.notdef`, when the font lacks it). */
  glyph(codePoint: number): number {
    return this.cmap.get(codePoint) ?? 0;
  }

  /** Whether every character has a glyph (whitespace and line breaks always count as covered). */
  covers(text: string): boolean {
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (cp > 0x20 && !this.cmap.has(cp)) return false;
    }
    return true;
  }

  /** Advance of a glyph in 1/1000 em. */
  glyphWidth(gid: number): number {
    return ((this.advances[gid] ?? 0) * 1000) / this.unitsPerEm;
  }

  /** Width of `text` at `size` points. */
  advance(text: string, size: number): number {
    let total = 0;
    for (const ch of text) total += this.glyphWidth(this.glyph(ch.codePointAt(0)!));
    return (total * size) / 1000;
  }

  // ── Subsetting ──────────────────────────────────────────────────────────

  /**
   * A font program with only `glyphs` (plus `.notdef` and composite glyph
   * components): every glyph keeps its id, unused ones are empty.
   */
  subset(glyphs: Iterable<number>): Uint8Array {
    const keep = new Set<number>([0]);
    const pending = [...glyphs];
    while (pending.length) {
      const g = pending.pop()!;
      if (g < 0 || g >= this.numGlyphs || keep.has(g)) continue;
      keep.add(g);
      pending.push(...this.components(g));
    }
    const glyf = this.table('glyf').offset;
    const pieces: Uint8Array[] = [];
    const loca = new Uint32Array(this.numGlyphs + 1);
    let offset = 0;
    for (let g = 0; g < this.numGlyphs; g++) {
      loca[g] = offset;
      if (!keep.has(g)) continue;
      const data = this.bytes.subarray(glyf + this.loca[g], glyf + this.loca[g + 1]);
      const padded = new Uint8Array((data.length + 3) & ~3);
      padded.set(data);
      pieces.push(padded);
      offset += padded.length;
    }
    loca[this.numGlyphs] = offset;

    const tables = new Map<string, Uint8Array>();
    const head = this.bytes.slice(this.table('head').offset, this.table('head').offset + this.table('head').length);
    const hv = new DataView(head.buffer);
    hv.setUint32(8, 0); // checkSumAdjustment, set below
    hv.setInt16(50, 1); // long loca
    tables.set('head', head);
    tables.set('glyf', concat(pieces));
    const locaBytes = new Uint8Array(loca.length * 4);
    const lv = new DataView(locaBytes.buffer);
    loca.forEach((o, i) => lv.setUint32(i * 4, o));
    tables.set('loca', locaBytes);
    for (const tag of COPIED_TABLES) {
      const t = this.tables.get(tag);
      if (t) tables.set(tag, this.bytes.slice(t.offset, t.offset + t.length));
    }
    // A version 3 'post' (no glyph names): the italic angle and pitch still matter.
    const post = new Uint8Array(32);
    const pv = new DataView(post.buffer);
    pv.setUint32(0, 0x00030000);
    pv.setInt32(4, Math.round(this.italicAngle * 65536));
    pv.setUint32(12, this.fixedPitch ? 1 : 0);
    tables.set('post', post);

    const font = sfnt(tables);
    // checkSumAdjustment = 0xB1B0AFBA − checksum(whole font)
    const headOffset = new DataView(font.buffer).getUint32(tableRecordOffset(font, 'head') + 8);
    new DataView(font.buffer).setUint32(headOffset + 8, (0xb1b0afba - checksum(font)) >>> 0);
    return font;
  }

  /** Glyph ids a composite glyph is built from. */
  private components(gid: number): number[] {
    const glyf = this.table('glyf').offset;
    const start = glyf + this.loca[gid];
    if (this.loca[gid + 1] - this.loca[gid] < 10 || this.view.getInt16(start) >= 0) return [];
    const out: number[] = [];
    let p = start + 10;
    for (;;) {
      const flags = this.view.getUint16(p);
      out.push(this.view.getUint16(p + 2));
      p += 4 + (flags & 0x0001 ? 4 : 2); // arguments: words or bytes
      if (flags & 0x0008)
        p += 2; // one scale
      else if (flags & 0x0040)
        p += 4; // x and y scale
      else if (flags & 0x0080) p += 8; // 2×2 matrix
      if (!(flags & 0x0020)) break; // no more components
    }
    return out;
  }

  // ── Tables ──────────────────────────────────────────────────────────────

  private table(tag: string): Table {
    const t = this.tables.get(tag);
    if (!t) throw new Error(`font has no '${tag}' table`);
    return t;
  }

  /** Unicode cmap: format 12 (full Unicode) when present, else format 4 (BMP). */
  private readCmap(): void {
    const v = this.view;
    const cmap = this.table('cmap').offset;
    const count = v.getUint16(cmap + 2);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < count; i++) {
      const rec = cmap + 4 + i * 8;
      const platform = v.getUint16(rec);
      const encoding = v.getUint16(rec + 2);
      const offset = cmap + v.getUint32(rec + 4);
      const format = v.getUint16(offset);
      const score =
        format === 12 && (platform === 3 || platform === 0)
          ? 3
          : format === 4 && ((platform === 3 && encoding === 1) || platform === 0)
            ? 2
            : -1;
      if (score > bestScore) {
        bestScore = score;
        best = offset;
      }
    }
    if (best < 0) throw new Error('font has no Unicode cmap');
    const format = v.getUint16(best);
    if (format === 12) {
      const groups = v.getUint32(best + 12);
      for (let i = 0; i < groups; i++) {
        const g = best + 16 + i * 12;
        const startChar = v.getUint32(g);
        const endChar = v.getUint32(g + 4);
        const startGlyph = v.getUint32(g + 8);
        for (let c = startChar; c <= endChar && c - startChar < 0x110000; c++) this.cmap.set(c, startGlyph + (c - startChar));
      }
      return;
    }
    const segCount = v.getUint16(best + 6) / 2;
    const ends = best + 14;
    const starts = ends + segCount * 2 + 2;
    const deltas = starts + segCount * 2;
    const ranges = deltas + segCount * 2;
    for (let s = 0; s < segCount; s++) {
      const end = v.getUint16(ends + s * 2);
      const start = v.getUint16(starts + s * 2);
      const delta = v.getInt16(deltas + s * 2);
      const rangeOffset = v.getUint16(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g: number;
        if (rangeOffset === 0) g = (c + delta) & 0xffff;
        else {
          const at = ranges + s * 2 + rangeOffset + (c - start) * 2;
          g = at + 1 < v.byteLength ? v.getUint16(at) : 0;
          if (g) g = (g + delta) & 0xffff;
        }
        if (g) this.cmap.set(c, g);
      }
    }
  }

  private readPostScriptName(): string | undefined {
    const name = this.tables.get('name');
    if (!name) return undefined;
    const v = this.view;
    const count = v.getUint16(name.offset + 2);
    const strings = name.offset + v.getUint16(name.offset + 4);
    for (let i = 0; i < count; i++) {
      const rec = name.offset + 6 + i * 12;
      if (v.getUint16(rec + 6) !== 6) continue; // nameID 6: PostScript name
      const platform = v.getUint16(rec);
      const length = v.getUint16(rec + 8);
      const at = strings + v.getUint16(rec + 10);
      let s = '';
      if (platform === 3 || platform === 0) for (let j = 0; j + 1 < length; j += 2) s += String.fromCharCode(v.getUint16(at + j));
      else for (let j = 0; j < length; j++) s += String.fromCharCode(this.bytes[at + j]);
      const clean = s.replace(/[^\x21-\x7e]/g, '').replace(/[()<>[\]{}/%]/g, '');
      if (clean) return clean;
    }
    return undefined;
  }
}

// ── sfnt writing ────────────────────────────────────────────────────────────

/** An sfnt (TrueType) file from its tables, sorted by tag and 4-byte aligned. */
function sfnt(tables: Map<string, Uint8Array>): Uint8Array {
  const tags = [...tables.keys()].sort();
  const n = tags.length;
  const entrySelector = Math.floor(Math.log2(n));
  const searchRange = 2 ** entrySelector * 16;
  const headerSize = 12 + n * 16;
  let size = headerSize;
  for (const t of tags) size += (tables.get(t)!.length + 3) & ~3;
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x00010000);
  v.setUint16(4, n);
  v.setUint16(6, searchRange);
  v.setUint16(8, entrySelector);
  v.setUint16(10, n * 16 - searchRange);
  let offset = headerSize;
  tags.forEach((tag, i) => {
    const data = tables.get(tag)!;
    const rec = 12 + i * 16;
    for (let j = 0; j < 4; j++) out[rec + j] = tag.charCodeAt(j);
    v.setUint32(rec + 4, checksum(data));
    v.setUint32(rec + 8, offset);
    v.setUint32(rec + 12, data.length);
    out.set(data, offset);
    offset += (data.length + 3) & ~3;
  });
  return out;
}

function tableRecordOffset(font: Uint8Array, tag: string): number {
  const v = new DataView(font.buffer, font.byteOffset);
  const n = v.getUint16(4);
  for (let i = 0; i < n; i++) {
    const rec = 12 + i * 16;
    if (String.fromCharCode(...font.subarray(rec, rec + 4)) === tag) return rec;
  }
  throw new Error(`no '${tag}' table`);
}

function checksum(data: Uint8Array): number {
  let sum = 0;
  const padded = data.length % 4 ? concat([data, new Uint8Array(4 - (data.length % 4))]) : data;
  const v = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  for (let i = 0; i < padded.length; i += 4) sum = (sum + v.getUint32(i)) >>> 0;
  return sum;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
