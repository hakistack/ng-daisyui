import type { PdfDoc } from './document';
import { deflate } from './filters';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfString } from './objects';
import { TrueTypeFont } from './truetype';

interface Embedded {
  readonly ref: PdfRef;
  /** Glyph id → the text it stands for (for /ToUnicode). */
  readonly used: Map<number, string>;
}

/**
 * Embeds TrueType fonts for one save, as Type0 fonts (Identity-H,
 * CIDFontType2 with an identity CID→GID map): text is written as glyph
 * ids straight away (`hex()`), the subsets with their widths and
 * `/ToUnicode` maps (so the text stays searchable and copyable) are written
 * once every appearance has been built (`finish()`).
 */
export class FontEmbedder {
  private readonly fonts = new Map<TrueTypeFont, Embedded>();

  constructor(private readonly doc: PdfDoc) {}

  /** The font dictionary to reference from resources (written on `finish`). */
  ref(font: TrueTypeFont): PdfRef {
    return this.entry(font).ref;
  }

  /** `text` as a hex string of 2-byte glyph ids, recording the glyphs for the subset. */
  hex(font: TrueTypeFont, text: string): string {
    const used = this.entry(font).used;
    let out = '<';
    for (const ch of text) {
      const gid = font.glyph(ch.codePointAt(0)!);
      if (!used.has(gid)) used.set(gid, ch);
      out += gid.toString(16).padStart(4, '0');
    }
    return out + '>';
  }

  /** Write every embedded font's objects (subset program, descriptor, CID font, ToUnicode). */
  async finish(): Promise<void> {
    for (const [font, { ref, used }] of this.fonts) {
      if (!font.embeddable) throw new Error(`the font "${font.name}" doesn't allow embedding`);
      const tag = subsetTag(used.keys());
      const baseFont = `${tag}+${font.postScriptName}`;
      const program = font.subset(used.keys());
      const fontFile = new PdfStream(new PdfDict({ Length1: program.length, Filter: PdfName.of('FlateDecode') }), await deflate(program));
      const flags = (font.fixedPitch ? 1 : 0) | 4 | (font.italicAngle ? 64 : 0); // symbolic: glyphs addressed by id
      const descriptor = new PdfDict({
        Type: PdfName.of('FontDescriptor'),
        FontName: PdfName.of(baseFont),
        Flags: flags,
        FontBBox: font.bbox.map(Math.round),
        ItalicAngle: font.italicAngle,
        Ascent: Math.round(font.ascent),
        Descent: Math.round(font.descent),
        CapHeight: Math.round(font.capHeight),
        StemV: font.bold ? 120 : 80,
        FontFile2: this.doc.add(fontFile),
      });
      const gids = [...used.keys()].sort((a, b) => a - b);
      const widths: (number | number[])[] = [];
      for (const g of gids) widths.push(g, [Math.round(font.glyphWidth(g))]);
      const cidFont = new PdfDict({
        Type: PdfName.of('Font'),
        Subtype: PdfName.of('CIDFontType2'),
        BaseFont: PdfName.of(baseFont),
        CIDSystemInfo: new PdfDict({ Registry: PdfString.text('Adobe'), Ordering: PdfString.text('Identity'), Supplement: 0 }),
        FontDescriptor: this.doc.add(descriptor),
        W: widths,
        DW: 1000,
        CIDToGIDMap: PdfName.of('Identity'),
      });
      const toUnicode = new PdfStream(
        new PdfDict({ Filter: PdfName.of('FlateDecode') }),
        await deflate(new TextEncoder().encode(toUnicodeCMap(used))),
      );
      this.doc.update(
        ref,
        new PdfDict({
          Type: PdfName.of('Font'),
          Subtype: PdfName.of('Type0'),
          BaseFont: PdfName.of(baseFont),
          Encoding: PdfName.of('Identity-H'),
          DescendantFonts: [this.doc.add(cidFont)],
          ToUnicode: this.doc.add(toUnicode),
        }),
      );
    }
  }

  private entry(font: TrueTypeFont): Embedded {
    let e = this.fonts.get(font);
    if (!e) {
      // Allocated now so appearances can reference it; filled in by finish().
      e = { ref: this.doc.add(null), used: new Map() };
      this.fonts.set(font, e);
    }
    return e;
  }
}

/** A `/ToUnicode` CMap: glyph id → UTF-16BE text. */
function toUnicodeCMap(used: ReadonlyMap<number, string>): string {
  const entries = [...used].sort(([a], [b]) => a - b);
  const lines = [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
  ];
  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    lines.push(`${chunk.length} beginbfchar`);
    for (const [gid, text] of chunk) lines.push(`<${gid.toString(16).padStart(4, '0')}> <${utf16Hex(text)}>`);
    lines.push('endbfchar');
  }
  lines.push('endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end');
  return lines.join('\n');
}

function utf16Hex(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) out += text.charCodeAt(i).toString(16).padStart(4, '0');
  return out;
}

/** A six-letter subset prefix derived from the glyphs (§9.6.4). */
function subsetTag(gids: Iterable<number>): string {
  let h = 2166136261;
  for (const g of gids) h = Math.imul(h ^ g, 16777619) >>> 0;
  let tag = '';
  for (let i = 0; i < 6; i++) {
    tag += String.fromCharCode(65 + (h % 26));
    h = Math.floor(h / 26) + i * 7919;
  }
  return tag;
}
