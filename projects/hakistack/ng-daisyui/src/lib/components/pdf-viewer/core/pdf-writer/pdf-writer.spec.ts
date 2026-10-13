import { ContentBuilder } from './content';
import { PdfDoc } from './document';
import { deflate, inflate, unpredict } from './filters';
import { saveIncremental } from './incremental';
import { PdfDict, PdfRef, PdfStream, PdfString, PdfValue, name } from './objects';
import { PdfParser } from './parser';
import { formatNumber, serializeValue } from './serialize';
import { textWidth, wrapText } from './standard-fonts';

// ── Fixtures ────────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

/** Objects for a two-page document with an Info dictionary. Object 4's text is "Hello". */
function baseObjects(): Record<number, string> {
  const content = 'BT /F1 12 Tf 10 10 Td (Hello) Tj ET';
  return {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 /MediaBox [0 0 200 100] >>',
    3: '<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>',
    4: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    5: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Rotate 90 >>',
    6: '<< /Title (Original) /Producer (fixture) >>',
  };
}

/** A classic-xref PDF. */
function classicPdf(objects = baseObjects()): Uint8Array {
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
  out += `trailer\n<< /Size ${size} /Root 1 0 R /Info 6 0 R /ID [<0011223344> <0011223344>] >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

/**
 * A PDF 1.5 file with the page tree and Info packed in a compressed object
 * stream and a compressed xref stream with a PNG predictor (Up), as
 * Acrobat-era writers produce.
 */
async function objectStreamPdf(): Promise<Uint8Array> {
  const packed: [number, string][] = [
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [2, '<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 200 100] >>'],
    [3, '<< /Type /Page /Parent 2 0 R >>'],
    [6, '<< /Title (Packed) >>'],
  ];
  let header = '';
  let body = '';
  for (const [num, text] of packed) {
    header += `${num} ${body.length} `;
    body += text + ' ';
  }
  const objStmData = await deflate(enc.encode(header + body));
  const parts: Uint8Array[] = [enc.encode('%PDF-1.5\n')];
  let offset = parts[0].length;
  const objStmOffset = offset;
  const objStm = concat(
    enc.encode(
      `7 0 obj\n<< /Type /ObjStm /N ${packed.length} /First ${header.length} /Length ${objStmData.length} /Filter /FlateDecode >>\nstream\n`,
    ),
    objStmData,
    enc.encode('\nendstream\nendobj\n'),
  );
  parts.push(objStm);
  offset += objStm.length;

  // Xref rows (W [1 2 1]) for objects 0..8, PNG "Up"-predicted (filter byte 2 per row).
  const xrefOffset = offset;
  const rowFor = (num: number): number[] => {
    if (num === 0) return [0, 0, 0, 255];
    if (num === 7) return [1, objStmOffset >> 8, objStmOffset & 0xff, 0];
    if (num === 8) return [1, xrefOffset >> 8, xrefOffset & 0xff, 0];
    const idx = packed.findIndex(([n]) => n === num);
    return idx >= 0 ? [2, 0, 7, idx] : [0, 0, 0, 0];
  };
  const raw: number[] = [];
  let prev = [0, 0, 0, 0];
  for (let num = 0; num <= 8; num++) {
    const row = rowFor(num);
    raw.push(2, ...row.map((b, i) => (b - prev[i] + 256) & 0xff));
    prev = row;
  }
  const xrefData = await deflate(Uint8Array.from(raw));
  parts.push(
    enc.encode(
      `8 0 obj\n<< /Type /XRef /Size 9 /W [1 2 1] /Root 1 0 R /Info 6 0 R /Filter /FlateDecode ` +
        `/DecodeParms << /Predictor 12 /Columns 4 >> /Length ${xrefData.length} >>\nstream\n`,
    ),
    xrefData,
    enc.encode(`\nendstream\nendobj\nstartxref\n${xrefOffset}\n%%EOF\n`),
  );
  return concat(...parts);
}

const parse = (text: string): PdfValue => new PdfParser(enc.encode(text)).parseValue(true);

// ── Parser & serializer ─────────────────────────────────────────────────────

describe('PdfParser', () => {
  it('parses every object type', () => {
    const v = parse('<< /A 1 /B -2.5 /C true /D null /E (s\\(t\\)r\\n) /F <48656c6c6f> /G [1 2 0 R /N] /H << /I /J >> >>') as PdfDict;
    expect(v.get('A')).toBe(1);
    expect(v.get('B')).toBe(-2.5);
    expect(v.get('C')).toBe(true);
    expect(v.get('D')).toBeNull();
    expect((v.get('E') as PdfString).text()).toBe('s(t)r\n');
    expect((v.get('F') as PdfString).text()).toBe('Hello');
    const g = v.get('G') as PdfValue[];
    expect(g[0]).toBe(1);
    expect((g[1] as PdfRef).num).toBe(2);
    expect(g[2]).toBe(name('N'));
    expect((v.get('H') as PdfDict).getName('I')).toBe('J');
  });

  it('decodes name escapes, octal escapes, nested parentheses and line continuations', () => {
    expect(parse('/A#20B')).toBe(name('A B'));
    expect((parse('(\\101\\7a)') as PdfString).text()).toBe('A\u0007a');
    expect((parse('(a(b)c)') as PdfString).text()).toBe('a(b)c');
    expect((parse('(ab\\\ncd)') as PdfString).text()).toBe('abcd');
  });

  it('skips comments', () => {
    expect(parse('% a comment\n[1 % another\n 2]')).toEqual([1, 2]);
  });

  it('reads a stream with an indirect /Length, recovering from a wrong one', () => {
    const p = new PdfParser(enc.encode('1 0 obj << /Length 99 >>\nstream\nabcdef\nendstream endobj'));
    const { value } = p.parseIndirectObject();
    expect(latin1((value as PdfStream).data)).toBe('abcdef');
  });

  it('decodes UTF-16BE text strings', () => {
    expect((parse('<FEFF00E9004C>') as PdfString).text()).toBe('éL');
  });
});

describe('serializeValue', () => {
  it('round-trips through the parser', () => {
    const dict = new PdfDict({
      Type: name('Annot'),
      Rect: [0, 0.5, 100.25, -3],
      Name: name('With Space#'),
      T: PdfString.text('Paren (and) \\ back'),
      U: PdfString.text('Ünïcødé ✓'),
      P: new PdfRef(12, 0),
      Flag: false,
      Nothing: null,
    });
    const back = parse(serializeValue(dict)) as PdfDict;
    expect(back.getName('Type')).toBe('Annot');
    expect(back.get('Rect')).toEqual([0, 0.5, 100.25, -3]);
    expect(back.getName('Name')).toBe('With Space#');
    expect((back.get('T') as PdfString).text()).toBe('Paren (and) \\ back');
    expect((back.get('U') as PdfString).text()).toBe('Ünïcødé ✓');
    expect((back.get('P') as PdfRef).num).toBe(12);
    expect(back.get('Flag')).toBe(false);
    expect(back.get('Nothing')).toBeNull();
  });

  it('formats numbers without exponents', () => {
    expect(formatNumber(1e-7)).toBe('0');
    expect(formatNumber(12345678.123456789)).toBe('12345678.123457');
    expect(formatNumber(-0.5)).toBe('-0.5');
    expect(formatNumber(2)).toBe('2');
  });
});

// ── Filters ─────────────────────────────────────────────────────────────────

describe('filters', () => {
  it('deflates and inflates', async () => {
    const data = enc.encode('hello hello hello hello');
    expect(latin1(await inflate(await deflate(data)))).toBe('hello hello hello hello');
  });

  it('undoes PNG predictors', () => {
    // Two rows of 3 bytes: Sub then Up.
    const predicted = Uint8Array.from([1, 10, 5, 5, 2, 1, 1, 1]);
    const params = new PdfDict({ Predictor: 12, Columns: 3 });
    expect(Array.from(unpredict(predicted, params))).toEqual([10, 15, 20, 11, 16, 21]);
  });
});

// ── Reading ─────────────────────────────────────────────────────────────────

describe('PdfDoc', () => {
  it('reads a classic-xref document lazily', async () => {
    const doc = await PdfDoc.load(classicPdf());
    const pages = await doc.pages();
    expect(pages.map((p) => p.ref.num)).toEqual([3, 5]);
    expect(await doc.inherited(pages[0].dict, 'MediaBox')).toEqual([0, 0, 200, 100]); // from /Pages
    expect(await doc.inherited(pages[1].dict, 'Rotate')).toBe(90);
    expect(latin1((await doc.streamData(pages[0].dict.get('Contents')))!)).toContain('(Hello) Tj');
  });

  it('reads object streams and predicted xref streams', async () => {
    const doc = await PdfDoc.load(await objectStreamPdf());
    expect(doc.xref.usesXrefStream).toBe(true);
    const pages = await doc.pages();
    expect(pages).toHaveLength(1);
    const info = await doc.info();
    expect((info.dict.get('Title') as PdfString).text()).toBe('Packed');
  });

  it('rebuilds a broken cross-reference table by scanning', async () => {
    const bytes = classicPdf();
    const text = latin1(bytes).replace(/startxref\n\d+/, 'startxref\n999999');
    const doc = await PdfDoc.load(enc.encode(text));
    expect(doc.xref.reconstructed).toBe(true);
    expect(await doc.pages()).toHaveLength(2);
  });

  it('refuses encryption with a security handler other than the standard one', async () => {
    const text = latin1(classicPdf()).replace('/Root 1 0 R', '/Root 1 0 R /Encrypt 6 0 R');
    await expect(PdfDoc.load(enc.encode(text))).rejects.toThrow(/security handler/);
  });
});

// ── Incremental save ────────────────────────────────────────────────────────

describe('saveIncremental', () => {
  it('returns the original bytes when nothing changed', async () => {
    const bytes = classicPdf();
    expect(await saveIncremental(await PdfDoc.load(bytes))).toBe(bytes);
  });

  it('appends only the change, chained with /Prev, keeping the original bytes intact', async () => {
    const bytes = classicPdf();
    const doc = await PdfDoc.load(bytes);
    await doc.setInfo({ Title: 'Edited ✓' });
    const saved = await saveIncremental(doc);

    expect(latin1(saved.subarray(0, bytes.length))).toBe(latin1(bytes)); // signatures over the old bytes stay valid
    const appended = latin1(saved.subarray(bytes.length));
    expect(appended).toMatch(/^6 0 obj/);
    expect(appended).toContain(`/Prev ${doc.xref.startxref}`);
    expect(appended.match(/ obj\n/g)).toHaveLength(1); // only the Info dictionary

    const reread = await PdfDoc.load(saved);
    expect(((await reread.info()).dict.get('Title') as PdfString).text()).toBe('Edited ✓');
    expect((await reread.pages()).length).toBe(2); // older objects still reachable through /Prev
  });

  it('writes an xref stream when the document uses one, and the result reads back', async () => {
    const doc = await PdfDoc.load(await objectStreamPdf());
    await doc.setInfo({ Title: 'Changed' });
    const added = doc.add(new PdfDict({ Type: name('Annot'), Subtype: name('Square'), Rect: [0, 0, 10, 10] }));
    const saved = await saveIncremental(doc);
    const tail = latin1(saved.subarray(saved.length - 400));
    expect(tail).toContain('/Type /XRef');

    const reread = await PdfDoc.load(saved);
    expect(((await reread.info()).dict.get('Title') as PdfString).text()).toBe('Changed');
    expect((await reread.dict(added))?.getName('Subtype')).toBe('Square');
    expect((await reread.pages()).length).toBe(1); // still resolved from the object stream
  });

  it('chains several incremental updates', async () => {
    let bytes = classicPdf();
    for (const title of ['one', 'two', 'three']) {
      const doc = await PdfDoc.load(bytes);
      await doc.setInfo({ Title: title });
      bytes = await saveIncremental(doc);
    }
    const doc = await PdfDoc.load(bytes);
    expect(((await doc.info()).dict.get('Title') as PdfString).text()).toBe('three');
    expect(latin1(bytes).match(/%%EOF/g)).toHaveLength(4);
  });

  it('repairs a reconstructed file with a complete section and no /Prev', async () => {
    const text = latin1(classicPdf()).replace(/startxref\n\d+/, 'startxref\n999999');
    const doc = await PdfDoc.load(enc.encode(text));
    await doc.setInfo({ Title: 'Repaired' });
    const saved = await saveIncremental(doc);
    const appended = latin1(saved.subarray(text.length));
    expect(appended).not.toContain('/Prev');
    const reread = await PdfDoc.load(saved);
    expect(reread.xref.reconstructed).toBe(false);
    expect(((await reread.info()).dict.get('Title') as PdfString).text()).toBe('Repaired');
    expect((await reread.pages()).length).toBe(2);
  });

  it('frees deleted objects', async () => {
    const doc = await PdfDoc.load(classicPdf());
    doc.delete(new PdfRef(4, 0));
    const reread = await PdfDoc.load(await saveIncremental(doc));
    expect(await reread.get(new PdfRef(4, 0))).toBeNull();
  });

  it('keeps the permanent first /ID and changes the second', async () => {
    const doc = await PdfDoc.load(classicPdf());
    await doc.setInfo({ Title: 'x' });
    const reread = await PdfDoc.load(await saveIncremental(doc));
    const [first, second] = reread.trailer.get('ID') as PdfString[];
    expect(Array.from(first.bytes)).toEqual([0x00, 0x11, 0x22, 0x33, 0x44]);
    expect(second.bytes).toHaveLength(16);
  });
});

// ── Content & fonts ─────────────────────────────────────────────────────────

describe('ContentBuilder', () => {
  it('emits operators with formatted operands', () => {
    const c = new ContentBuilder().save().strokeColor([1, 0, 0.5]).lineWidth(1.5).rect(0, 0, 10.25, 5).stroke().restore();
    expect(c.toString()).toBe('q\n1 0 0.5 RG\n1.5 w\n0 0 10.25 5 re\nS\nQ');
  });

  it('writes text with escaped strings', () => {
    const c = new ContentBuilder().beginText().font('Helv', 12).textPosition(2, 3).showText('a (b)').endText();
    expect(c.toString()).toBe('BT\n/Helv 12 Tf\n2 3 Td\n(a \\(b\\)) Tj\nET');
  });

  it('approximates an ellipse with four curves', () => {
    expect(new ContentBuilder().ellipse(0, 0, 20, 10).toString().match(/ c$/gm)).toHaveLength(4);
  });
});

describe('standard font metrics', () => {
  it('measures text', () => {
    expect(textWidth('Hello', 'Helvetica', 10)).toBeCloseTo(((722 + 556 + 222 + 222 + 556) * 10) / 1000, 6);
    expect(textWidth('abc', 'Courier', 10)).toBe(18);
  });

  it('wraps at spaces and splits overlong words', () => {
    expect(wrapText('one two three', 'Courier', 10, 6 * 7)).toEqual(['one two', 'three']);
    expect(wrapText('abcdefghij', 'Courier', 10, 6 * 4)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapText('a\nb', 'Helvetica', 10, 100)).toEqual(['a', 'b']);
  });
});

describe('font resolution', () => {
  it('keeps WinAnsi text in the standard font and falls back to a registered font that covers the rest', async () => {
    const { fitsWinAnsi, registerCustomFont, resolveFont, registeredCustomFonts } = await import('./standard-fonts');
    expect(fitsWinAnsi('Café – “quotes” €')).toBe(true);
    expect(fitsWinAnsi('Ελληνικά')).toBe(false);
    expect(resolveFont('Helvetica', 'Ελληνικά')).toBeNull(); // nothing registered covers it yet
    const greek = { name: 'TestGreek', covers: (t: string) => /^[\sͰ-Ͽ]*$/.test(t), advance: (t: string, size: number) => t.length * size };
    registerCustomFont(greek);
    expect(resolveFont('Helvetica', 'Ελληνικά')).toBe(greek);
    expect(resolveFont('Helvetica', 'Hello')).toBe('Helvetica');
    expect(textWidth('Ελληνικά', 'Helvetica', 10)).toBe(80); // measured in the font it will be drawn with
    expect(registeredCustomFonts().map((f) => f.name)).toContain('TestGreek');
  });
});
