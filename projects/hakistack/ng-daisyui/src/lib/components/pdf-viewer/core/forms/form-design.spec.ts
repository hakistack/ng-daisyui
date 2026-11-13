import { readAnnotations } from '../annotations/annotation-io';
import { PdfDoc } from '../pdf-writer/document';
import { PdfDict } from '../pdf-writer/objects';
import { writeDocumentChanges } from './document-writer';
import { DesignField, newDesignField, newWidget, readDocMdp, toDesign, uniqueFieldName, nameConflicts } from './form-design';
import { readForm } from './form-reader';

const enc = new TextEncoder();

function pdf(objs: Record<number, string>): Uint8Array {
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

const blank = () =>
  pdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] >>',
  });

describe('form design', () => {
  it('creates every kind of field in a document without a form', async () => {
    const r = (y: number) => ({ x: 50, y, w: 150, h: 20 });
    const radio = newDesignField('radio', 'size', 0, { x: 50, y: 300, w: 14, h: 14 });
    const fields: DesignField[] = [
      { ...newDesignField('text', 'name', 0, r(50)), required: true, tooltip: 'Your name', maxLength: 30 },
      { ...newDesignField('text', 'dob', 0, r(80), { kind: 'date', format: 'mm/dd/yyyy' }) },
      { ...newDesignField('text', 'pin', 0, r(110)), password: true },
      newDesignField('checkbox', 'agree', 0, { x: 50, y: 140, w: 14, h: 14 }),
      {
        ...newDesignField('combo', 'country', 0, r(170)),
        options: [
          { value: 'MX', label: 'Mexico' },
          { value: 'US', label: 'United States' },
        ],
        editable: true,
      },
      {
        ...newDesignField('list', 'tags', 0, { x: 50, y: 200, w: 150, h: 60 }),
        options: [
          { value: 'a', label: 'a' },
          { value: 'b', label: 'b' },
        ],
        multiSelect: true,
      },
      newDesignField('signature', 'sign', 0, { x: 300, y: 50, w: 200, h: 50 }),
      {
        ...radio,
        exportValues: { Choice1: 'S', Choice2: 'L' },
        widgets: [...radio.widgets, newWidget('radio', 0, { x: 80, y: 300, w: 14, h: 14 }, 'Choice2')],
      },
    ];
    const saved = await writeDocumentChanges(blank(), { formDesign: { fields, deleted: [] } });
    const doc = await PdfDoc.load(saved);
    const { model } = await readForm(doc);
    const by = Object.fromEntries(model.fields.map((f) => [f.name, f]));
    expect(Object.keys(by).sort()).toEqual(['agree', 'country', 'dob', 'name', 'pin', 'sign', 'size', 'tags']);
    expect(by['name']).toMatchObject({ kind: 'text', required: true, tooltip: 'Your name', maxLength: 30 });
    expect(by['dob'].format).toEqual({ kind: 'date', format: 'mm/dd/yyyy' });
    expect(by['pin'].password).toBe(true);
    expect(by['agree']).toMatchObject({ kind: 'checkbox', widgets: [{ onState: 'Yes' }] });
    expect(by['country']).toMatchObject({
      kind: 'combo',
      editable: true,
      options: [
        { value: 'MX', label: 'Mexico' },
        { value: 'US', label: 'United States' },
      ],
    });
    expect(by['tags']).toMatchObject({ kind: 'list', multiSelect: true });
    expect(by['sign'].kind).toBe('signature');
    expect(by['size'].widgets.map((w) => w.onState)).toEqual(['Choice1', 'Choice2']);
    expect(by['size'].exportValues).toEqual({ Choice1: 'S', Choice2: 'L' });
    expect(by['name'].widgets[0].rect).toEqual({ x: 50, y: 50, w: 150, h: 20 });
    // /AcroForm with default resources for the appearances' fonts.
    const acro = await doc.dict((await doc.catalog()).get('AcroForm'));
    const fonts = (await doc.dict(acro?.get('DR'))) as PdfDict;
    expect([...((await doc.dict(fonts.get('Font'))) as PdfDict).keys()]).toEqual(expect.arrayContaining(['Helv', 'ZaDb']));

    // Values can be written into the new fields straight away.
    const filled = await writeDocumentChanges(saved, {
      formValues: new Map<string, string>([
        ['name', 'Ana'],
        ['size', 'Choice2'],
      ]),
    });
    const after = Object.fromEntries((await readForm(await PdfDoc.load(filled))).model.fields.map((f) => [f.name, f.value]));
    expect(after).toMatchObject({ name: 'Ana', size: 'Choice2' });
  });

  it('renames, moves, reconfigures and deletes existing fields, alongside annotation changes', async () => {
    const bytes = pdf({
      1: '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [10 0 R 11 0 R] >> >>',
      2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Annots [12 0 R 10 0 R 11 0 R] >>',
      10: '<< /Type /Annot /Subtype /Widget /FT /Tx /T (first) /V (x) /Rect [50 700 200 720] >>',
      11: '<< /Type /Annot /Subtype /Widget /FT /Tx /T (second) /Rect [50 600 200 620] >>',
      12: '<< /Type /Annot /Subtype /Square /Rect [300 300 400 400] /C [1 0 0] /NM (sq) >>',
    });
    const read = await readForm(await PdfDoc.load(bytes));
    const [first, second] = toDesign(read.model.fields);
    const design = {
      fields: [{ ...first, name: 'renamed', required: true, widgets: [{ ...first.widgets[0], rect: { x: 60, y: 90, w: 200, h: 24 } }] }],
      deleted: [second.origin!],
    };
    // Delete the square too: its /Annots slot comes before the widgets.
    const annotations = await readAnnotations(await PdfDoc.load(bytes));
    const baseline = new Map(annotations[0].annotations.map((a) => [a.annotation.id, a] as const));
    const saved = await writeDocumentChanges(bytes, { formDesign: design, annotations: { baseline, current: [] } });
    const doc = await PdfDoc.load(saved);
    const { model } = await readForm(doc);
    expect(model.fields.map((f) => [f.name, f.required, f.value])).toEqual([['renamed', true, 'x']]);
    expect(model.fields[0].widgets[0].rect).toEqual({ x: 60, y: 90, w: 200, h: 24 });
    const [page] = await doc.pages();
    expect(((await doc.resolve(page.dict.get('Annots'))) as unknown[]).length).toBe(1);
  });

  it('names fields uniquely and detects conflicts with parents and children', () => {
    expect(uniqueFieldName('Text', new Set(['Text1', 'Text2']))).toBe('Text3');
    expect(nameConflicts('a', ['a.b'])).toBe(true);
    expect(nameConflicts('a.b.c', ['a.b'])).toBe(true);
    expect(nameConflicts('ab', ['a'])).toBe(false);
  });

  it('reads /DocMDP certification permissions', async () => {
    const certified = pdf({
      1: '<< /Type /Catalog /Pages 2 0 R /Perms << /DocMDP 4 0 R >> >>',
      2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] >>',
      4: '<< /Type /Sig /Reference [<< /TransformMethod /DocMDP /TransformParams << /P 1 >> >>] >>',
    });
    expect(await readDocMdp(await PdfDoc.load(certified))).toBe(1);
    expect(await readDocMdp(await PdfDoc.load(blank()))).toBeNull();
  });
});
