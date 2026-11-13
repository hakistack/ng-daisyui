import { PdfDoc } from '../pdf-writer/document';
import { HkAnnotation, PdfStampAnnotation } from './annotation.types';
import { ImportedAnnotation, readAnnotations, writeAnnotationChanges } from './annotation-io';
import { decodePng, encodePng, jpegInfo } from './images';
import { DEFAULT_SCALE, calibrate, formatMeasure, measureLabel, measureValue } from './measure';
import { PageSpace } from './page-space';
import { bytesToBase64 } from './shapes';
import { exportAnnotationsJson, exportXfdf, importAnnotationsJson, importXfdf } from './xfdf';

const enc = new TextEncoder();

/** A PDF with `pageCount` 600×800 pages; extra objects (numbered from 10) and catalog entries can be added. */
function pdf(opts: { pages?: number; annots?: string[]; catalogExtra?: string; extra?: Record<number, string> } = {}): Uint8Array {
  const pages = opts.pages ?? 1;
  const objs: Record<number, string> = {
    1: `<< /Type /Catalog /Pages 2 0 R ${opts.catalogExtra ?? ''} >>`,
    2: `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${3 + i} 0 R`).join(' ')}] /Count ${pages} >>`,
    ...opts.extra,
  };
  const annots = opts.annots ?? [];
  for (let i = 0; i < pages; i++) {
    const own = i === 0 && annots.length ? ` /Annots [${annots.map((_, k) => `${100 + k} 0 R`).join(' ')}]` : '';
    objs[3 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800]${own} >>`;
  }
  annots.forEach((a, k) => (objs[100 + k] = a));
  let out = '%PDF-1.7\n';
  const offsets: Record<number, number> = {};
  const nums = Object.keys(objs)
    .map(Number)
    .sort((a, b) => a - b);
  for (const n of nums) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objs[n]}\nendobj\n`;
  }
  const size = nums[nums.length - 1] + 1;
  const xref = out.length;
  out += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n++)
    out += offsets[n] !== undefined ? `${String(offsets[n]).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
  out += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

const rounded = <T>(v: T): T => JSON.parse(JSON.stringify(v, (_, x: unknown) => (typeof x === 'number' ? Math.round(x * 10) / 10 : x)));
const base = {
  page: 0,
  color: '#1d4ed8',
  opacity: 1,
  author: 'Ana',
  created: '2026-01-02T03:04:05.000Z',
  modified: '2026-01-02T03:04:05.000Z',
};
const FT = calibrate(1, 'in', 10, 'ft');

/** A 2×2 PNG: red, transparent, green, half-transparent blue. */
async function tinyPng(): Promise<Uint8Array> {
  return encodePng({
    width: 2,
    height: 2,
    rgb: Uint8Array.from([255, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255]),
    alpha: Uint8Array.from([255, 0, 255, 128]),
  });
}

async function phase4Annotations(): Promise<HkAnnotation[]> {
  const png = await tinyPng();
  return [
    {
      ...base,
      id: 'st-text',
      type: 'stamp',
      rect: { x: 50, y: 50, w: 160, h: 46 },
      name: 'Approved',
      stamp: { kind: 'text', text: 'APPROVED', subtext: 'Ana · today', shape: 'rect' },
    },
    {
      ...base,
      id: 'st-img',
      type: 'stamp',
      rect: { x: 300, y: 50, w: 40, h: 40 },
      name: 'Image',
      stamp: { kind: 'image', data: bytesToBase64(png), mime: 'image/png', width: 2, height: 2 },
    },
    {
      ...base,
      id: 'lk-uri',
      type: 'link',
      rect: { x: 50, y: 200, w: 100, h: 20 },
      target: { kind: 'uri', uri: 'https://example.com/a?b=1' },
      strokeWidth: 0,
    },
    { ...base, id: 'lk-page', type: 'link', rect: { x: 50, y: 240, w: 100, h: 20 }, target: { kind: 'page', page: 1 }, strokeWidth: 1 },
    {
      ...base,
      id: 'm-dist',
      type: 'line',
      rect: { x: 50, y: 300, w: 144, h: 0 },
      points: [50, 300, 194, 300],
      strokeWidth: 1,
      startEnding: 'Butt',
      endEnding: 'Butt',
      fill: null,
      measure: { kind: 'distance', scale: FT },
    },
    {
      ...base,
      id: 'm-area',
      type: 'polygon',
      rect: { x: 50, y: 400, w: 72, h: 72 },
      vertices: [50, 400, 122, 400, 122, 472, 50, 472],
      strokeWidth: 1,
      fill: null,
      measure: { kind: 'area', scale: FT },
    },
    {
      ...base,
      id: 'm-vol',
      type: 'polygon',
      rect: { x: 200, y: 400, w: 72, h: 72 },
      vertices: [200, 400, 272, 400, 272, 472, 200, 472],
      strokeWidth: 1,
      fill: null,
      measure: { kind: 'volume', scale: FT, depth: 3 },
    },
    {
      ...base,
      id: 'm-per',
      type: 'polyline',
      rect: { x: 300, y: 400, w: 72, h: 72 },
      vertices: [300, 400, 372, 400, 372, 472],
      strokeWidth: 1,
      fill: null,
      measure: { kind: 'perimeter', scale: calibrate(1, 'in', 1, 'ft-in') },
    },
    {
      ...base,
      id: 'm-rad',
      type: 'ellipse',
      rect: { x: 400, y: 400, w: 72, h: 72 },
      strokeWidth: 1,
      fill: null,
      measure: { kind: 'radius', scale: FT },
    },
  ];
}

describe('measurement', () => {
  it('calibrates a scale and measures in it', async () => {
    expect(FT).toMatchObject({ unit: 'ft', label: '1 in = 10 ft' });
    const [, , , , dist, area, vol, per, rad] = await phase4Annotations();
    expect(measureValue(dist)).toBeCloseTo(20, 9); // 2 in on paper
    expect(measureValue(area)).toBeCloseTo(100, 9); // 1 in² → 10 ft × 10 ft
    expect(measureValue(vol)).toBeCloseTo(300, 9);
    expect(measureLabel(per)).toBe(`2' 0"`); // 2 in on paper at 1 in = 1 ft
    expect(measureLabel(rad)).toBe('R 5 ft');
    expect(formatMeasure(3.375, 'distance', calibrate(1, 'in', 1, 'ft-in'))).toBe(`3' 4.5"`);
    expect(formatMeasure(1.23456, 'area', DEFAULT_SCALE)).toBe('1.23 sq in');
  });
});

describe('images', () => {
  it('round-trips PNG pixels and alpha', async () => {
    const img = await decodePng(await tinyPng());
    expect([img.width, img.height]).toEqual([2, 2]);
    expect(Array.from(img.rgb)).toEqual([255, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255]);
    expect(Array.from(img.alpha!)).toEqual([255, 0, 255, 128]);
  });

  it('reads a JPEG frame header', () => {
    // SOI, APP0 (empty-ish), SOF0 with 16×9, 3 components.
    const jpeg = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x09, 0x00, 0x10, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3,
      0x11, 1,
    ]);
    expect(jpegInfo(jpeg)).toEqual({ width: 16, height: 9, components: 3 });
  });
});

describe('stamps, links and measurements in the file', () => {
  it('writes and reads them back unchanged', async () => {
    const list = await phase4Annotations();
    const saved = await writeAnnotationChanges(pdf({ pages: 2 }), new Map(), list);
    const [page] = await readAnnotations(await PdfDoc.load(saved));
    expect(rounded(page.annotations.map((a) => a.annotation))).toEqual(rounded(list));
  });

  it('shares one image object between stamps with the same image', async () => {
    const [, img] = await phase4Annotations();
    const twice = [img, { ...img, id: 'st-img-2', rect: { ...img.rect, x: 400 } }] as PdfStampAnnotation[];
    const saved = await writeAnnotationChanges(pdf(), new Map(), twice);
    const text = new TextDecoder('latin1').decode(saved);
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(2); // the image and its soft mask, once
  });

  it('reads named destinations from the /Names tree and leaves other actions to the raster', async () => {
    const bytes = pdf({
      pages: 3,
      catalogExtra: '/Names << /Dests 10 0 R >>',
      extra: { 10: '<< /Kids [11 0 R] >>', 11: '<< /Limits [(a) (z)] /Names [(chapter2) [4 0 R /Fit]] >>' },
      annots: [
        '<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] /Dest (chapter2) >>',
        '<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] /A << /S /JavaScript /JS (app.alert(1)) >> >>',
        '<< /Type /Annot /Subtype /Stamp /Rect [0 0 10 10] /Name /Approved >>',
      ],
    });
    const [page] = await readAnnotations(await PdfDoc.load(bytes));
    expect(page.annotations.map((a) => a.annotation)).toMatchObject([{ type: 'link', target: { kind: 'page', page: 1 } }]);
    expect(page.managedIndices).toEqual([0]);
  });

  it('writes a new paint order, keeping other annotations in their places', async () => {
    const bytes = pdf({
      annots: [
        '<< /Type /Annot /Subtype /Square /Rect [0 0 50 50] /C [1 0 0] /NM (a) >>',
        '<< /Type /Annot /Subtype /Widget /Rect [0 0 10 10] /FT /Tx /T (field) >>',
        '<< /Type /Annot /Subtype /Square /Rect [0 0 60 60] /C [0 0 1] /NM (b) >>',
      ],
    });
    const [page] = await readAnnotations(await PdfDoc.load(bytes));
    const baseline = new Map(page.annotations.map((a) => [a.annotation.id, a] as [string, ImportedAnnotation]));
    const reversed = page.annotations.map((a) => a.annotation).reverse();
    const saved = await writeAnnotationChanges(bytes, baseline, reversed);
    const doc = await PdfDoc.load(saved);
    const [p] = await doc.pages();
    const order = [];
    for (const ref of (await doc.resolve(p.dict.get('Annots'))) as never[]) {
      const d = await doc.dict(ref);
      order.push(d?.get('NM') ? (d.get('NM') as { text(): string }).text() : d?.getName('Subtype'));
    }
    expect(order).toEqual(['b', 'Widget', 'a']);
    // Only the order changed: no annotation object was rewritten.
    expect(new TextDecoder('latin1').decode(saved.subarray(bytes.length)).match(/\/Subtype \/Square/g)).toBeNull();
  });
});

describe('XFDF and JSON', () => {
  const spaces = [new PageSpace([0, 0, 600, 800], 0), new PageSpace([0, 0, 600, 800], 90)];

  it('round-trips every annotation type through XFDF, threads included', async () => {
    const list: HkAnnotation[] = [
      ...(await phase4Annotations()),
      {
        ...base,
        id: 'hl',
        type: 'highlight',
        opacity: 0.5,
        rect: { x: 50, y: 600, w: 100, h: 12 },
        quads: [{ x: 50, y: 600, w: 100, h: 12 }],
      },
      { ...base, id: 'ik', type: 'ink', page: 1, rect: { x: 10, y: 10, w: 20, h: 20 }, strokes: [[10, 10, 30, 30]], strokeWidth: 2 },
      {
        ...base,
        id: 'ft',
        type: 'freetext',
        rect: { x: 300, y: 600, w: 150, h: 40 },
        contents: 'Line one\nLine <two> & "three"',
        font: 'Courier',
        fontSize: 11,
        fontColor: '#111827',
        align: 'right',
        strokeWidth: 1,
        fill: '#ffffff',
      },
      {
        ...base,
        id: 'nt',
        type: 'note',
        rect: { x: 500, y: 700, w: 20, h: 20 },
        icon: 'Comment',
        color: '#facc15',
        contents: 'Check',
        status: 'Rejected',
        replies: [{ id: 'r1', author: 'Bo', contents: 'Fixed', created: '2026-01-03T00:00:00.000Z', modified: '2026-01-03T00:00:00.000Z' }],
      },
    ];
    const xml = exportXfdf(list, spaces, 'doc.pdf');
    expect(xml).toContain('<xfdf xmlns="http://ns.adobe.com/xfdf/"');
    expect(xml).toContain('<URI Name="https://example.com/a?b=1"/>');
    const back = importXfdf(xml, spaces);
    expect(rounded(back)).toEqual(rounded(list));
  });

  it('shows a foreign stamp by its name and skips pages the document lacks', () => {
    const xml = `<?xml version="1.0"?><xfdf xmlns="http://ns.adobe.com/xfdf/"><annots>
      <stamp page="0" rect="10,10,110,40" name="s1" icon="NotApproved" color="#FF0000"/>
      <square page="7" rect="0,0,10,10" name="s2" color="#FF0000"/>
    </annots></xfdf>`;
    const back = importXfdf(xml, spaces);
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ type: 'stamp', name: 'NotApproved', stamp: { kind: 'text', text: 'NOT APPROVED' } });
  });

  it('round-trips JSON and rejects other files', async () => {
    const list = await phase4Annotations();
    expect(importAnnotationsJson(exportAnnotationsJson(list))).toEqual(list);
    expect(() => importAnnotationsJson('{"hello":1}')).toThrow();
  });
});
