/**
 * Glyph advance widths (1/1000 em) of the standard Type 1 fonts every PDF
 * reader provides (§9.6.2.2), for laying out text in generated appearances.
 * Covers printable ASCII (WinAnsiEncoding 32–126); other characters use the
 * font's average width.
 */
export type StandardFont = 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Courier';

// prettier-ignore
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
// prettier-ignore
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];
// prettier-ignore
const TIMES_ROMAN = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444,
  921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722,
  556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500,
  333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500,
  500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541,
];

const WIDTHS: Record<StandardFont, { table: readonly number[] | null; fallback: number }> = {
  Helvetica: { table: HELVETICA, fallback: 556 },
  'Helvetica-Bold': { table: HELVETICA_BOLD, fallback: 611 },
  'Times-Roman': { table: TIMES_ROMAN, fallback: 500 },
  Courier: { table: null, fallback: 600 }, // monospaced
};

/** Advance width of one character in 1/1000 em. */
export function charWidth(font: StandardFont, ch: string): number {
  const { table, fallback } = WIDTHS[font];
  const code = ch.charCodeAt(0);
  if (!table || code < 32 || code > 126) return fallback;
  return table[code - 32];
}

/** A font registered for text the standard fonts can't show (a TrueType font the consumer supplied). */
export interface CustomFont {
  readonly name: string;
  /** Whether it has a glyph for every character. */
  covers(text: string): boolean;
  /** Width of `text` at `size` points. */
  advance(text: string, size: number): number;
}

const customFonts: CustomFont[] = [];

/** Register a font used for text outside WinAnsi (looked up in registration order). */
export function registerCustomFont(font: CustomFont): void {
  const at = customFonts.findIndex((f) => f.name === font.name);
  if (at >= 0) customFonts.splice(at, 1, font);
  else customFonts.push(font);
}

export function registeredCustomFonts(): readonly CustomFont[] {
  return customFonts;
}

/**
 * The font text is actually set in: the standard font when WinAnsi covers
 * the text, else the first registered font that has every character
 * (`null` when none does: the text then shows with `?` replacements).
 */
export function resolveFont(font: StandardFont, text: string): StandardFont | CustomFont | null {
  if (fitsWinAnsi(text)) return font;
  return customFonts.find((f) => f.covers(text)) ?? null;
}

/** Whether every character of `text` is in WinAnsiEncoding. */
export function fitsWinAnsi(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (
      !(
        (code >= 0x20 && code <= 0x7e) ||
        (code >= 0xa0 && code <= 0xff) ||
        code === 0x0a ||
        code === 0x0d ||
        code === 0x09 ||
        code in WIN_ANSI_HIGH
      )
    ) {
      return false;
    }
  }
  return true;
}

/** Width of `text` set in `font` at `size` points (in the registered font it falls back to, if any). */
export function textWidth(text: string, font: StandardFont, size: number): number {
  const resolved = resolveFont(font, text);
  if (resolved && typeof resolved !== 'string') return resolved.advance(text, size);
  let total = 0;
  for (const ch of text) total += charWidth(font, ch);
  return (total * size) / 1000;
}

/**
 * Break `text` into lines no wider than `maxWidth` points: on explicit
 * newlines, then at spaces, splitting a word only when it alone is too wide.
 */
export function wrapText(text: string, font: StandardFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r\n|\r|\n/)) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, font, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // A single word wider than the line: split it by characters.
      let piece = '';
      for (const ch of word) {
        if (textWidth(piece + ch, font, size) > maxWidth && piece) {
          lines.push(piece);
          piece = '';
        }
        piece += ch;
      }
      line = piece;
    }
    lines.push(line);
  }
  return lines;
}

/** WinAnsiEncoding's 0x80–0x9F block (the rest of 0xA0–0xFF matches Latin-1). */
// prettier-ignore
const WIN_ANSI_HIGH: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/**
 * Encode text for a standard font with `/WinAnsiEncoding` (what generated
 * appearances declare). Characters outside it become `?` until embedded
 * TrueType fonts arrive.
 */
export function winAnsiBytes(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) out.push(code);
    else out.push(WIN_ANSI_HIGH[code] ?? 0x3f);
  }
  return Uint8Array.from(out);
}
