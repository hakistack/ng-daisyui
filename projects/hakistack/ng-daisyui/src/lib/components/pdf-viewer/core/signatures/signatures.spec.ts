import { readAnnotations, writeAnnotationChanges } from '../annotations/annotation-io';
import { HkAnnotation } from '../annotations/annotation.types';
import { PdfDoc } from '../pdf-writer/document';
import { PdfStream } from '../pdf-writer/objects';
import { cleanSignatureImage, fitSignature, normalizeInk } from './capture';

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

function blank(): Uint8Array {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R /Resources << >> >>',
    '<< /Length 21 >>\nstream\n0.5 g 0 0 10 10 re f\nendstream',
  ];
  let out = '%PDF-1.7\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

const signature = (flatten?: boolean): HkAnnotation => ({
  id: 'sig',
  type: 'stamp',
  page: 0,
  rect: { x: 100, y: 600, w: 150, h: 50 },
  color: '#1d4ed8',
  opacity: 1,
  name: 'Signature',
  stamp: { kind: 'ink', strokes: [[0.1, 0.5, 0.5, 0.5, 0.2, 0.8, 0.9, 0.6, 0.4]], width: 0.06, aspect: 3 },
  flatten,
});

describe('signature capture', () => {
  it('normalises drawn strokes to their box, with pressure', () => {
    const ink = normalizeInk([[10, 20, 0.5, 110, 70, 1]], 4)!;
    expect(ink.aspect).toBeCloseTo(104 / 54, 6);
    expect(ink.strokes[0]).toEqual([0.0192, 0.037, 0.5, 0.9808, 0.963, 1]);
    expect(ink.width).toBeCloseTo(4 / 54, 6);
    expect(normalizeInk([], 4)).toBeNull();
  });

  it('removes a white background and crops to the ink', () => {
    // 10×4: white, with a black 2×2 square at (3,1).
    const data = new Uint8ClampedArray(10 * 4 * 4).fill(255);
    for (const [x, y] of [
      [3, 1],
      [4, 1],
      [3, 2],
      [4, 2],
    ])
      data.set([0, 0, 0, 255], (y * 10 + x) * 4);
    const out = cleanSignatureImage({ width: 10, height: 4, data })!;
    expect([out.width, out.height]).toEqual([4, 4]); // the square plus a 1px margin, clamped to the image
    expect(out.data[3]).toBe(0); // the corner (former white) is transparent
    expect(cleanSignatureImage({ width: 2, height: 1, data: new Uint8ClampedArray(8).fill(255) })).toBeNull();
  });

  it('fits a signature into a field box, centred', () => {
    expect(fitSignature({ x: 0, y: 0, w: 200, h: 40 }, 3)).toEqual({ x: 46, y: 2, w: 108, h: 36 });
  });
});

describe('signatures in the file', () => {
  it('keeps a drawn signature as a re-editable vector stamp', async () => {
    const saved = await writeAnnotationChanges(blank(), new Map(), [signature()]);
    const [page] = await readAnnotations(await PdfDoc.load(saved));
    expect(page.annotations[0].annotation).toMatchObject({ type: 'stamp', name: 'Signature', stamp: { kind: 'ink', aspect: 3 } });
  });

  it('flattens into the page content when asked', async () => {
    const bytes = blank();
    const saved = await writeAnnotationChanges(bytes, new Map(), [signature(true)]);
    const doc = await PdfDoc.load(saved);
    const [page] = await readAnnotations(doc);
    expect(page.annotations).toHaveLength(0); // no longer an annotation
    const [p] = await doc.pages();
    const contents = (await doc.resolve(p.dict.get('Contents'))) as unknown[];
    expect(contents).toHaveLength(4); // q, the original content, Q, the signature
    const last = (await doc.resolve(contents[3] as never)) as PdfStream;
    expect(latin1(last.data)).toMatch(/^q \/HkFl0 Do Q/);
    const resources = await doc.dict(p.dict.get('Resources'));
    expect((await doc.dict(resources?.get('XObject')))?.has('HkFl0')).toBe(true);
  });
});
