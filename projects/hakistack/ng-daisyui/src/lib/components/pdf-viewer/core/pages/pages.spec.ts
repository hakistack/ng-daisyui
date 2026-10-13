import { writeDocumentChanges } from '../forms/document-writer';
import { readForm } from '../forms/form-reader';
import { PdfDoc } from '../pdf-writer/document';
import { PdfDict, PdfRef, PdfString, PdfValue } from '../pdf-writer/objects';
import { createWebCryptoSigner } from '../signatures/cms';
import { readSignatures, signPdf } from '../signatures/pdf-signature';
import { createSelfSignedCertificate } from '../signatures/x509';
import {
  PdfVirtualPage,
  deletePages,
  duplicatePages,
  insertPages,
  isIdentityRemap,
  isSourceOrder,
  movePages,
  pageRemap,
  parsePageRanges,
  rotatePages,
} from './page-model';
import { PdfLayoutPage, PdfPageLayoutChanges, applyPageLayout, blankPdf, extractPages } from './page-writer';

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

function serialize(objects: Record<number, string>, trailerExtra = ''): Uint8Array {
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
  out += `trailer\n<< /Size ${size} /Root 1 0 R ${trailerExtra} /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>] >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

const stream = (text: string) => `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;

/**
 * Three pages under an intermediate node (which carries MediaBox and
 * Resources): page 1 has a square and a link to page 2, page 2 the text
 * field "name", page 3 is rotated 90°.
 */
function documentPdf(): Uint8Array {
  return serialize(
    {
      1: '<< /Type /Catalog /Pages 2 0 R /AcroForm 20 0 R >>',
      2: '<< /Type /Pages /Kids [7 0 R] /Count 3 >>',
      7: '<< /Type /Pages /Parent 2 0 R /Kids [3 0 R 5 0 R 9 0 R] /Count 3 /MediaBox [0 0 200 100] /Resources << /Font << /F1 10 0 R >> >> >>',
      3: '<< /Type /Page /Parent 7 0 R /Contents 4 0 R /Annots [11 0 R 12 0 R] >>',
      4: stream('BT /F1 12 Tf 10 10 Td (Page one) Tj ET'),
      5: '<< /Type /Page /Parent 7 0 R /Contents 6 0 R /Annots [13 0 R] >>',
      6: stream('BT /F1 12 Tf 10 10 Td (Page two) Tj ET'),
      9: '<< /Type /Page /Parent 7 0 R /Contents 8 0 R /Rotate 90 >>',
      8: stream('BT /F1 12 Tf 10 10 Td (Page three) Tj ET'),
      10: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      11: '<< /Type /Annot /Subtype /Square /Rect [10 10 50 50] /P 3 0 R >>',
      12: '<< /Type /Annot /Subtype /Link /Rect [60 10 90 30] /Dest [5 0 R /Fit] /P 3 0 R >>',
      13: '<< /Type /Annot /Subtype /Widget /FT /Tx /T (name) /V (Ana) /Rect [10 10 150 30] /P 5 0 R >>',
      20: '<< /Fields [13 0 R] /DA (/Helv 0 Tf 0 g) >>',
      21: '<< /Title (Contract) /Producer (fixture) >>',
    },
    '/Info 21 0 R',
  );
}

/** Two pages sharing a font; page A has the widget of field "name" (a parent field with a widget kid) and a GoTo link. */
function importPdf(): Uint8Array {
  return serialize({
    1: '<< /Type /Catalog /Pages 2 0 R /AcroForm 9 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R /Annots [8 0 R 11 0 R] >>',
    4: stream('BT /F1 12 Tf 10 10 Td (Imported A) Tj ET'),
    5: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    6: stream('BT /F1 12 Tf 10 10 Td (Imported B) Tj ET'),
    7: '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    8: '<< /Type /Annot /Subtype /Widget /Parent 10 0 R /Rect [10 200 200 220] /P 3 0 R >>',
    9: '<< /Fields [10 0 R] /DR << /Font << /Helv 12 0 R >> >> /DA (/Helv 0 Tf 0 g) >>',
    10: '<< /FT /Tx /T (name) /V (Bob) /Kids [8 0 R] >>',
    11: '<< /Type /Annot /Subtype /Link /Rect [10 10 50 30] /A << /S /GoTo /D [5 0 R /Fit] >> /P 3 0 R >>',
    12: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  });
}

async function contentText(doc: PdfDoc, page: PdfDict): Promise<string> {
  const data = await doc.streamData(page.get('Contents'));
  return data ? (/\((.*?)\)/.exec(latin1(data))?.[1] ?? '') : '';
}

async function annotRefs(doc: PdfDoc, page: PdfDict): Promise<PdfRef[]> {
  const v = await doc.resolve(page.get('Annots'));
  return Array.isArray(v) ? (v.filter((x) => x instanceof PdfRef) as PdfRef[]) : [];
}

const page = (uid: number, source = 0, index = uid - 1, extra: Partial<PdfVirtualPage> = {}): PdfVirtualPage => ({
  uid,
  source,
  index,
  width: 200,
  height: 100,
  rotation: 0,
  ...extra,
});

describe('virtual pages', () => {
  const pages = [page(1), page(2), page(3), page(4)];
  const uids = (list: readonly PdfVirtualPage[]) => list.map((p) => p.uid);

  it('moves a selection before a page, keeping its order', () => {
    expect(uids(movePages(pages, new Set([1, 3]), 4))).toEqual([2, 4, 1, 3]);
    expect(uids(movePages(pages, new Set([4]), 0))).toEqual([4, 1, 2, 3]);
    expect(uids(movePages(pages, new Set([2, 3]), 2))).toEqual([1, 2, 3, 4]);
    expect(uids(movePages(pages, new Set([1]), 2))).toEqual([2, 1, 3, 4]);
  });

  it('deletes, inserts, rotates and duplicates', () => {
    expect(uids(deletePages(pages, new Set([2, 4])))).toEqual([1, 3]);
    expect(uids(insertPages(pages, 1, [page(9, 1, 0)]))).toEqual([1, 9, 2, 3, 4]);
    expect(rotatePages(pages, new Set([1]), -90)[0].rotation).toBe(270);
    let next = 10;
    const dup = duplicatePages(pages, new Set([2]), () => next++);
    expect(uids(dup)).toEqual([1, 2, 10, 3, 4]);
    expect(dup[2]).toMatchObject({ copyOf: 2, source: 0, index: 1 });
  });

  it('maps positions from one layout to another, with copies and new pages', () => {
    let next = 10;
    const dup = duplicatePages(pages, new Set([2]), () => next++); // 1 2 10 3 4
    const copyOfCopy = duplicatePages(dup, new Set([10]), () => next++); // 1 2 10 11 3 4
    const after = insertPages(deletePages(movePages(copyOfCopy, new Set([4]), 0), new Set([3, 2])), 0, [page(20, 1, 0)]);
    // 20 4 1 10 11
    const remap = pageRemap(pages, after, (uid) => copyOfCopy.find((p) => p.uid === uid));
    expect(remap.moved).toEqual([2, -1, -1, 1]);
    expect(remap.copies).toEqual([
      [3, 1],
      [4, 1],
    ]);
    expect(remap.added).toEqual([0]);
    expect(isIdentityRemap(pageRemap(pages, pages))).toBe(true);
    expect(isSourceOrder(pages, 4)).toBe(true);
    expect(isSourceOrder(dup, 4)).toBe(false);
  });

  it('parses page ranges', () => {
    expect(parsePageRanges('1-3, 5, 8-', 9)).toEqual([1, 2, 3, 5, 8, 9]);
    expect(parsePageRanges('3 - 1; 2', 5)).toEqual([3, 2, 1]);
    expect(parsePageRanges('-2', 5)).toEqual([1, 2]);
    expect(parsePageRanges('0', 5)).toBeNull();
    expect(parsePageRanges('6', 5)).toBeNull();
    expect(parsePageRanges('a', 5)).toBeNull();
    expect(parsePageRanges('-', 5)).toBeNull();
    expect(parsePageRanges('', 5)).toBeNull();
  });
});

describe('page layout writer', () => {
  const layout = (pages: PdfLayoutPage[], managed?: Record<number, number[]>): PdfPageLayoutChanges => ({
    pages,
    sources: new Map([
      [1, { kind: 'pdf', load: () => PdfDoc.load(importPdf()) }],
      [2, { kind: 'blank', width: 100, height: 50 }],
    ]),
    managedAnnots: managed ? (i) => (managed[i] ? new Set(managed[i]) : undefined) : undefined,
  });
  const p = (source: number, index: number, rotation = 0, copy = false): PdfLayoutPage => ({ source, index, rotation, copy });

  it('reorders, deletes, duplicates, inserts blank pages and imports pages as one incremental update', async () => {
    const original = documentPdf();
    const out = await writeDocumentChanges(original, {
      pages: layout([p(0, 2, 180), p(0, 0, 90), p(0, 0, 0, true), p(2, 0), p(1, 0), p(1, 1)], { 0: [0] }),
    });
    expect(latin1(out.subarray(0, original.length))).toBe(latin1(original)); // incremental

    const doc = await PdfDoc.load(out);
    const pages = await doc.pages();
    expect(pages).toHaveLength(6);
    expect(await Promise.all(pages.map((pg) => contentText(doc, pg.dict)))).toEqual([
      'Page three',
      'Page one',
      'Page one',
      '',
      'Imported A',
      'Imported B',
    ]);
    const root = (await doc.catalog()).get('Pages') as PdfRef;
    for (const pg of pages) expect((pg.dict.get('Parent') as PdfRef).equals(root)).toBe(true);
    // Inherited attributes are materialized on pages that left the intermediate node.
    expect(pages[0].dict.get('MediaBox')).toEqual([0, 0, 200, 100]);
    expect(pages[0].dict.has('Resources')).toBe(true);
    // Rotations: added to the page's own.
    expect(pages[0].dict.get('Rotate')).toBe(270);
    expect(pages[1].dict.get('Rotate')).toBe(90);
    expect(pages[2].dict.get('Rotate') ?? 0).toBe(0);
    expect(pages[0].ref.num).toBe(9); // kept pages keep their objects
    expect(pages[1].ref.num).toBe(3);

    // The duplicate shares content, copies its link (not the square the viewer writes itself), pointing at itself.
    expect((pages[2].dict.get('Contents') as PdfRef).num).toBe(4);
    const dupAnnots = await annotRefs(doc, pages[2].dict);
    expect(dupAnnots).toHaveLength(1);
    const dupLink = (await doc.dict(dupAnnots[0]))!;
    expect(dupLink.getName('Subtype')).toBe('Link');
    expect((dupLink.get('P') as PdfRef).equals(pages[2].ref)).toBe(true);

    // The blank page.
    expect(pages[3].dict.get('MediaBox')).toEqual([0, 0, 100, 50]);

    // Imported pages: their font copied once, the GoTo link left out, the widget's field in /AcroForm.
    const fontA = (await doc.dict((await doc.dict(pages[4].dict.get('Resources')))!.get('Font')))!.get('F1') as PdfRef;
    const fontB = (await doc.dict((await doc.dict(pages[5].dict.get('Resources')))!.get('Font')))!.get('F1') as PdfRef;
    expect(fontA.equals(fontB)).toBe(true);
    const importedAnnots = await annotRefs(doc, pages[4].dict);
    expect(importedAnnots).toHaveLength(1);
    const widget = (await doc.dict(importedAnnots[0]))!;
    expect(widget.getName('Subtype')).toBe('Widget');
    expect((widget.get('P') as PdfRef).equals(pages[4].ref)).toBe(true);

    // Page 2 was deleted: its field left the form; the imported one kept its name (no clash left).
    const { model } = await readForm(doc);
    expect(model.fields.map((f) => [f.name, f.value, f.widgets.map((w) => w.page)])).toEqual([['name', 'Bob', [4]]]);
  });

  it('renames imported fields whose name is taken, and copies the source /DR fonts', async () => {
    const out = await writeDocumentChanges(documentPdf(), { pages: layout([p(0, 0), p(0, 1), p(0, 2), p(1, 0)]) });
    const doc = await PdfDoc.load(out);
    const { model } = await readForm(doc);
    expect(model.fields.map((f) => [f.name, f.value])).toEqual([
      ['name', 'Ana'],
      ['name_2', 'Bob'],
    ]);
    const acro = (await doc.dict((await doc.catalog()).get('AcroForm')))!;
    const dr = await doc.dict(acro.get('DR'));
    expect((await doc.dict(dr?.get('Font')))?.has('Helv')).toBe(true);
  });

  it('leaves the document alone when the layout is its own pages', async () => {
    const original = documentPdf();
    const doc = await PdfDoc.load(original);
    await applyPageLayout(doc, layout([p(0, 0), p(0, 1), p(0, 2)]));
    expect(doc.modified).toBe(false);
    // Rotation alone touches just that page.
    const out = await writeDocumentChanges(original, { pages: layout([p(0, 0), p(0, 1, 90), p(0, 2)]) });
    const rotated = await PdfDoc.load(out);
    const pages = await rotated.pages();
    expect(pages[1].dict.get('Rotate')).toBe(90);
    expect((pages[1].dict.get('Parent') as PdfRef).num).toBe(7); // the tree itself is untouched
  });

  it('extracts pages into a new, self-contained document', async () => {
    const edited = await writeDocumentChanges(documentPdf(), { pages: layout([p(0, 0), p(1, 0), p(0, 1)]) });
    const bytes = await extractPages(edited, [1, 0]);
    expect(latin1(bytes.subarray(0, 8))).toBe('%PDF-1.7');
    expect(bytes.length).toBeLessThan(edited.length);
    const doc = await PdfDoc.load(bytes);
    expect(doc.xref.reconstructed).toBe(false);
    const pages = await doc.pages();
    expect(await Promise.all(pages.map((pg) => contentText(doc, pg.dict)))).toEqual(['Imported A', 'Page one']);
    const { model } = await readForm(doc);
    expect(model.fields.map((f) => [f.name, f.widgets.map((w) => w.page)])).toEqual([['name_2', [0]]]);
    // No other page came along (the link on page one points at a page that wasn't extracted).
    let pageObjects = 0;
    for (const num of doc.xref.entries.keys()) {
      const v = (await doc.get(new PdfRef(num, 0))) as PdfValue;
      if (v instanceof PdfDict && v.getName('Type') === 'Page') pageObjects++;
    }
    expect(pageObjects).toBe(2);
    const info = await doc.dict(doc.trailer.get('Info'));
    expect((info?.get('Title') as PdfString).text()).toBe('Contract');
  });

  it('makes a blank one-page template', async () => {
    const doc = await PdfDoc.load(blankPdf(300, 400));
    const pages = await doc.pages();
    expect(pages).toHaveLength(1);
    expect(pages[0].dict.get('MediaBox')).toEqual([0, 0, 300, 400]);
  });

  it('keeps an existing signature valid (and reports the later change) after reorganizing', async () => {
    const keys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const signer = createWebCryptoSigner(keys.privateKey, [await createSelfSignedCertificate(keys, { commonName: 'Signer' })]);
    const signed = await signPdf(documentPdf(), signer, { reason: 'Approved' });
    const out = await writeDocumentChanges(signed, { pages: layout([p(0, 2), p(0, 0, 90), p(1, 1)]) });
    const [sig] = await readSignatures(out);
    expect(sig).toMatchObject({ status: 'valid', coversWholeDocument: false });
    expect(await (await PdfDoc.load(out)).pages()).toHaveLength(3);
    expect((await readSignatures(signed))[0].coversWholeDocument).toBe(true);
  });
});
