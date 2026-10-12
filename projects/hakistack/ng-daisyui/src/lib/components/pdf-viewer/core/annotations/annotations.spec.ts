import { PdfDoc } from '../pdf-writer/document';
import { PdfDict, PdfRef, PdfStream } from '../pdf-writer/objects';
import { HkAnnotation } from './annotation.types';
import { ImportedAnnotation, parseDefaultAppearance, parsePdfDate, readAnnotations, writeAnnotationChanges } from './annotation-io';
import { PageSpace, visibleBox } from './page-space';
import { annotationOps, cloudSegs, eraseStrokes, outerBounds, resizeAnnotation, svgPath, translateAnnotation } from './shapes';

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

/** A one-page PDF (optionally rotated / with an offset MediaBox and existing /Annots objects). */
function pdf(opts: { rotate?: number; mediaBox?: string; annots?: string[] } = {}): Uint8Array {
  const annots = opts.annots ?? [];
  const objs: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox ${opts.mediaBox ?? '[0 0 600 800]'} /Rotate ${opts.rotate ?? 0}` +
      (annots.length ? ` /Annots [${annots.map((_, i) => `${4 + i} 0 R`).join(' ')}]` : '') +
      ' >>',
    ...annots,
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

/** Round every number so float noise from the user-space round trip doesn't matter. */
function rounded<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_, x: unknown) => (typeof x === 'number' ? Math.round(x * 10) / 10 : x)));
}

const base = {
  page: 0,
  color: '#ff0000',
  opacity: 1,
  author: 'Ana',
  created: '2026-01-02T03:04:05.000Z',
  modified: '2026-01-02T03:04:05.000Z',
};

function sampleAnnotations(): HkAnnotation[] {
  return [
    {
      ...base,
      id: 'hl',
      type: 'highlight',
      opacity: 0.5,
      color: '#ffeb3b',
      rect: { x: 50, y: 100, w: 100, h: 24 },
      quads: [
        { x: 50, y: 100, w: 100, h: 12 },
        { x: 50, y: 112, w: 60, h: 12 },
      ],
    },
    { ...base, id: 'ul', type: 'underline', rect: { x: 50, y: 140, w: 80, h: 12 }, quads: [{ x: 50, y: 140, w: 80, h: 12 }] },
    { ...base, id: 'sq', type: 'rect', rect: { x: 200, y: 100, w: 120, h: 60 }, strokeWidth: 2, fill: '#00ff00', contents: 'A box' },
    { ...base, id: 'el', type: 'ellipse', rect: { x: 200, y: 200, w: 80, h: 40 }, strokeWidth: 1, fill: null, cloudy: true },
    {
      ...base,
      id: 'ln',
      type: 'line',
      rect: { x: 50, y: 300, w: 150, h: 50 },
      points: [50, 300, 200, 350],
      strokeWidth: 1.5,
      startEnding: 'None',
      endEnding: 'OpenArrow',
      fill: null,
    },
    {
      ...base,
      id: 'pg',
      type: 'polygon',
      rect: { x: 300, y: 300, w: 100, h: 80 },
      vertices: [300, 300, 400, 300, 350, 380],
      strokeWidth: 1,
      fill: null,
      dash: [3, 2],
    },
    {
      ...base,
      id: 'pl',
      type: 'polyline',
      rect: { x: 50, y: 400, w: 100, h: 50 },
      vertices: [50, 400, 100, 450, 150, 400],
      strokeWidth: 1,
      fill: '#0000ff',
      startEnding: 'Circle',
      endEnding: 'ClosedArrow',
    },
    {
      ...base,
      id: 'ik',
      type: 'ink',
      rect: { x: 300, y: 450, w: 50, h: 30 },
      strokes: [
        [300, 450, 320, 470, 350, 480],
        [310, 460],
      ],
      strokeWidth: 2,
    },
    {
      ...base,
      id: 'ft',
      type: 'freetext',
      rect: { x: 50, y: 500, w: 200, h: 40 },
      contents: 'Hello (world) é',
      font: 'Helvetica',
      fontSize: 14,
      fontColor: '#123456',
      align: 'center',
      strokeWidth: 1,
      fill: '#ffffff',
    },
    {
      ...base,
      id: 'nt',
      type: 'note',
      rect: { x: 400, y: 600, w: 20, h: 20 },
      icon: 'Comment',
      color: '#ffd400',
      contents: 'Please check',
      status: 'Accepted',
      replies: [{ id: 'r1', author: 'Bo', contents: 'Done', created: '2026-01-03T00:00:00.000Z', modified: '2026-01-03T00:00:00.000Z' }],
    },
  ];
}

const baselineOf = (pages: { annotations: readonly ImportedAnnotation[] }[]) =>
  new Map(pages.flatMap((p) => p.annotations).map((a) => [a.annotation.id, a] as const));

// ── Page space ──────────────────────────────────────────────────────────────

describe('PageSpace', () => {
  it.each([0, 90, 180, 270])('maps display ↔ user and back at /Rotate %i', (rotate) => {
    const space = new PageSpace([10, 20, 610, 820], rotate);
    expect([space.width, space.height]).toEqual(rotate % 180 ? [800, 600] : [600, 800]);
    const [ux, uy] = space.toUser(15, 40);
    const [dx, dy] = space.toDisplay(ux, uy);
    expect(dx).toBeCloseTo(15, 9);
    expect(dy).toBeCloseTo(40, 9);
    // The displayed top-left corner is the page's top-left as shown.
    expect(space.toUser(0, 0)).toEqual({ 0: [10, 820], 90: [10, 20], 180: [610, 20], 270: [610, 820] }[rotate]);
  });

  it('uses the CropBox clipped to the MediaBox, like PDFium', () => {
    expect(visibleBox([0, 0, 600, 800], [50, 50, 700, 700])).toEqual([50, 50, 600, 700]);
    expect(visibleBox([0, 0, 600, 800], [700, 700, 900, 900])).toEqual([0, 0, 600, 800]);
    expect(visibleBox(undefined, undefined)).toEqual([0, 0, 612, 792]);
  });
});

// ── Geometry ────────────────────────────────────────────────────────────────

describe('annotation geometry', () => {
  const [, , rect, , line, , , ink] = sampleAnnotations();

  it('pads the /Rect for strokes and line endings', () => {
    const r = outerBounds(rect);
    expect(r.x).toBeLessThanOrEqual(200);
    expect(r.x + r.w).toBeGreaterThanOrEqual(320);
    const l = outerBounds(line); // the arrow head pokes past the end point
    expect(l.x + l.w).toBeGreaterThan(200);
  });

  it('moves and resizes point geometry', () => {
    const moved = translateAnnotation(line, 10, -5);
    expect(moved.type === 'line' && moved.points).toEqual([60, 295, 210, 345]);
    const resized = resizeAnnotation(ink, { x: 300, y: 450, w: 100, h: 60 });
    expect(resized.type === 'ink' && resized.strokes[0]).toEqual([300, 450, 340, 490, 400, 510]);
    expect(resized.rect).toEqual({ x: 300, y: 450, w: 100, h: 60 });
  });

  it('erases around a point, splitting strokes', () => {
    expect(eraseStrokes([[0, 0, 10, 0, 20, 0, 30, 0]], 10, 0, 1)).toEqual([
      [0, 0],
      [20, 0, 30, 0],
    ]);
  });

  it('draws clouds as closed bump curves', () => {
    const segs = cloudSegs([0, 0, 100, 0, 100, 50, 0, 50], 5);
    expect(segs.at(-1)).toEqual(['Z']);
    expect(segs.filter((s) => s[0] === 'C').length).toBe(30); // perimeter 300 / bump diameter 10
    expect(svgPath([['M', 0, 0], ['L', 1.23456, 2], ['Z']])).toBe('M0 0L1.235 2Z');
  });

  it('builds a display list for every type', () => {
    for (const a of sampleAnnotations()) expect(annotationOps(a).length).toBeGreaterThan(0);
  });
});

// ── Reading & writing ───────────────────────────────────────────────────────

describe('annotation file round trip', () => {
  it.each([0, 90])('writes every type and reads it back unchanged (/Rotate %i)', async (rotate) => {
    const bytes = pdf({ rotate, mediaBox: '[20 30 620 830]' });
    const saved = await writeAnnotationChanges(bytes, new Map(), sampleAnnotations());
    expect(latin1(saved.subarray(0, bytes.length))).toBe(latin1(bytes)); // incremental

    const [page] = await readAnnotations(await PdfDoc.load(saved));
    const back = page.annotations.map((a) => a.annotation);
    expect(rounded(back.map((a) => ({ ...a, replies: a.replies?.map((r) => ({ ...r })) })))).toEqual(rounded(sampleAnnotations()));
    // The note's reply and status are thread annotations, hidden with their parent.
    expect(page.managedIndices).toHaveLength(12);
  });

  it('gives every written annotation an appearance stream', async () => {
    const saved = await writeAnnotationChanges(pdf(), new Map(), sampleAnnotations());
    const doc = await PdfDoc.load(saved);
    const [p] = await doc.pages();
    const annots = (await doc.resolve(p.dict.get('Annots'))) as PdfRef[];
    for (const ref of annots) {
      const ap = (await doc.dict(ref))!.get('AP') as PdfDict;
      const n = await doc.resolve(ap.get('N'));
      expect(n).toBeInstanceOf(PdfStream);
      expect((n as PdfStream).dict.getName('Subtype')).toBe('Form');
    }
    const ft = await doc.dict(annots[8]);
    const content = latin1(((await doc.resolve((ft!.get('AP') as PdfDict).get('N'))) as PdfStream).data);
    expect(content).toContain('/Helv 14 Tf');
    expect(content).toContain('(Hello \\(world\\) \\351) Tj'); // WinAnsi é
  });

  it('writes only what changed on a later save, and removes deleted annotations with their thread', async () => {
    const first = await writeAnnotationChanges(pdf(), new Map(), sampleAnnotations());
    const pages = await readAnnotations(await PdfDoc.load(first));
    const baseline = baselineOf(pages);
    const current = pages[0].annotations.map((a) => a.annotation).filter((a) => a.id !== 'nt');
    const sq = current.findIndex((a) => a.id === 'sq');
    current[sq] = { ...current[sq], color: '#0000ff', modified: '2026-02-01T00:00:00.000Z' };

    const second = await writeAnnotationChanges(first, baseline, current);
    const appended = latin1(second.subarray(first.length));
    // The changed square, its new appearance, the page (new /Annots); nothing else.
    expect(appended.match(/ 0 obj\n/g)).toHaveLength(3);

    const [page] = await readAnnotations(await PdfDoc.load(second));
    expect(page.annotations.map((a) => a.annotation.id)).toEqual(['hl', 'ul', 'sq', 'el', 'ln', 'pg', 'pl', 'ik', 'ft']);
    expect(page.annotations[2].annotation.color).toBe('#0000ff');
    expect(page.managedIndices).toHaveLength(9); // the note's reply and status are gone too
  });

  it('rewrites a thread when replies or status change', async () => {
    const first = await writeAnnotationChanges(pdf(), new Map(), sampleAnnotations());
    const pages = await readAnnotations(await PdfDoc.load(first));
    const note = pages[0].annotations.find((a) => a.annotation.id === 'nt')!.annotation;
    const next = {
      ...note,
      status: 'Rejected' as const,
      replies: [...(note.replies ?? []), { id: 'r2', author: 'Cy', contents: 'No', created: '2026-01-04T00:00:00.000Z' }],
    };
    const others = pages[0].annotations.map((a) => a.annotation).filter((a) => a.id !== 'nt');
    const second = await writeAnnotationChanges(first, baselineOf(pages), [...others, next]);
    const [page] = await readAnnotations(await PdfDoc.load(second));
    const back = page.annotations.find((a) => a.annotation.id === 'nt')!.annotation;
    expect(back.status).toBe('Rejected');
    expect(back.replies?.map((r) => r.contents)).toEqual(['Done', 'No']);
  });

  it('returns the bytes untouched when nothing changed', async () => {
    const first = await writeAnnotationChanges(pdf(), new Map(), sampleAnnotations());
    const pages = await readAnnotations(await PdfDoc.load(first));
    const again = await writeAnnotationChanges(
      first,
      baselineOf(pages),
      pages[0].annotations.map((a) => a.annotation),
    );
    expect(again).toBe(first);
  });

  it('imports third-party annotations and leaves unsupported ones to the raster', async () => {
    const bytes = pdf({
      annots: [
        '<< /Type /Annot /Subtype /Square /Rect [10 10 110 60] /C [1 0 0] /Border [0 0 3] /NM (ext) /T (Zed) >>',
        '<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] >>',
        '<< /Type /Annot /Subtype /Stamp /Rect [0 0 10 10] /Name /Approved >>',
        '<< /Type /Annot /Subtype /Line /Rect [0 0 10 10] /L [0 0 10 10] /C [0 0 1] /Measure << >> >>',
        '<< /Type /Annot /Subtype /Highlight /Rect [0 0 10 10] /C [0 1 0] /F 2 >>',
        '<< /Type /Annot /Subtype /Text /Rect [0 0 10 10] /IRT 4 0 R /T (Ya) /Contents (Reply) /NM (rp) >>',
        '<< /Type /Annot /Subtype /FreeText /Rect [100 100 300 140] /DA (/TiRo 10 Tf 0 0 1 rg) /Q 2 /Contents (Typed) >>',
      ],
    });
    const [page] = await readAnnotations(await PdfDoc.load(bytes));
    expect(page.annotations.map((a) => a.annotation.type)).toEqual(['rect', 'freetext']);
    expect(page.managedIndices).toEqual([0, 5, 6]);
    const [sq, ft] = page.annotations.map((a) => a.annotation);
    expect(sq).toMatchObject({
      id: 'ext',
      author: 'Zed',
      strokeWidth: 3,
      rect: { x: 10, y: 740, w: 100, h: 50 },
      replies: [{ id: 'rp', contents: 'Reply' }],
    });
    expect(ft).toMatchObject({ font: 'Times-Roman', fontSize: 10, fontColor: '#0000ff', align: 'right', strokeWidth: 0 });
  });
});

describe('annotation parsing helpers', () => {
  it('parses default appearance strings', () => {
    expect(parseDefaultAppearance('/HeBo 9 Tf 1 0 0 rg 0 0 1 RG')).toEqual({
      font: 'Helvetica-Bold',
      fontSize: 9,
      color: '#ff0000',
      strokeColor: '#0000ff',
    });
    expect(parseDefaultAppearance('0.5 g /Cour 0 Tf')).toMatchObject({ font: 'Courier', fontSize: 12, color: '#808080' });
  });

  it('parses PDF dates with and without a time zone', () => {
    expect(parsePdfDate("D:20260102030405+02'00'")).toBe('2026-01-02T01:04:05.000Z');
    expect(parsePdfDate('D:2026')).toBe('2026-01-01T00:00:00.000Z');
    expect(parsePdfDate('garbage')).toBeUndefined();
  });
});
