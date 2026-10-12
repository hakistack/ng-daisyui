import { PdfDoc } from '../pdf-writer/document';
import { PdfDict, PdfRef, PdfStream } from '../pdf-writer/objects';
import {
  acceptsKeystroke,
  calculate,
  commitValue,
  formatValue,
  parseCalculateAction,
  parseFormatAction,
  parseValidateAction,
  validateRange,
} from './af';
import { writeDocumentChanges } from './document-writer';
import { readForm } from './form-reader';

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

/** A one-page form: names, flags, widgets, options, actions, /CO and /Tabs R. */
function formPdf(): Uint8Array {
  const ap = (on: string) => `/AP << /N << /${on} 30 0 R /Off 31 0 R >> >>`;
  const objs: Record<number, string> = {
    1: '<< /Type /Catalog /Pages 2 0 R /AcroForm 4 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Tabs /R /Annots [10 0 R 11 0 R 13 0 R 14 0 R 15 0 R 16 0 R 17 0 R 18 0 R 19 0 R 20 0 R] >>',
    4: '<< /Fields [9 0 R 12 0 R 14 0 R 15 0 R 16 0 R 17 0 R 18 0 R 19 0 R 20 0 R] /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv 5 0 R /TiRo 6 0 R >> >> /CO [20 0 R] >>',
    5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    6: '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>',
    // person.name (a parent with one widget kid) and person.ssn (comb)
    9: '<< /T (person) /Kids [10 0 R 11 0 R] >>',
    10: '<< /Type /Annot /Subtype /Widget /Parent 9 0 R /T (name) /FT /Tx /V (Ana) /DA (/TiRo 11 Tf 0 0 1 rg) /Q 1 /Rect [50 700 250 720] /MK << /BG [1 1 0.8] /BC [0 0 0] >> /TU (Full name) >>',
    11: '<< /Type /Annot /Subtype /Widget /Parent 9 0 R /T (ssn) /FT /Tx /Ff 16777216 /MaxLen 9 /Rect [300 700 480 720] /AA << /K 21 0 R /F 21 0 R >> >>',
    // a radio group with two widget kids
    12: '<< /T (choice) /FT /Btn /Ff 49152 /V /b /Kids [13 0 R 14 0 R] >>',
    13: `<< /Type /Annot /Subtype /Widget /Parent 12 0 R /Rect [50 600 62 612] /AS /Off ${ap('a')} >>`,
    14: `<< /Type /Annot /Subtype /Widget /Parent 12 0 R /Rect [80 600 92 612] /AS /b ${ap('b')} >>`,
    15: `<< /Type /Annot /Subtype /Widget /T (agree) /FT /Btn /Rect [50 550 62 562] /AS /Off ${ap('Yes')} /MK << /CA (8) >> >>`,
    16: '<< /Type /Annot /Subtype /Widget /T (state) /FT /Ch /Ff 131072 /Opt [[(CA) (California)] [(NY) (New York)]] /V (NY) /Rect [50 500 200 520] >>',
    17: '<< /Type /Annot /Subtype /Widget /T (langs) /FT /Ch /Ff 2097152 /Opt [(en) (es) (fr)] /V [(en) (fr)] /Rect [50 400 200 460] >>',
    18: '<< /Type /Annot /Subtype /Widget /T (notes) /FT /Tx /Ff 4098 /Rect [300 400 500 460] >>',
    19: '<< /Type /Annot /Subtype /Widget /T (qty) /FT /Tx /V (2) /Rect [50 300 120 320] /AA << /F 22 0 R /V 23 0 R >> >>',
    20: '<< /Type /Annot /Subtype /Widget /T (total) /FT /Tx /Ff 1 /Rect [300 300 400 320] /AA << /C 24 0 R /F 25 0 R >> >>',
    21: '<< /S /JavaScript /JS (AFSpecial_Keystroke\\(3\\);) >>',
    22: '<< /S /JavaScript /JS (AFNumber_Format\\(0, 0, 0, 0, "", true\\);) >>',
    23: '<< /S /JavaScript /JS (AFRange_Validate\\(true, 1, true, 99\\);) >>',
    24: '<< /S /JavaScript /JS (/** BVCALC qty * 2.5 EVCALC **/ event.value = 0;) >>',
    25: '<< /S /JavaScript /JS (AFNumber_Format\\(2, 0, 2, 0, "$", true\\);) >>',
    30: '<< /Length 0 >>\nstream\n\nendstream',
    31: '<< /Length 0 >>\nstream\n\nendstream',
  };
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

describe('AF functions', () => {
  it('formats numbers, currency, percents and negatives', () => {
    const usd = parseFormatAction('AFNumber_Format(2, 0, 2, 0, "$", true);')!;
    expect(formatValue(usd, '1234.5').text).toBe('$1,234.50');
    expect(formatValue(usd, '-3').text).toBe('($3.00)');
    const eu = parseFormatAction('AFNumber_Format(2, 2, 0, 0, " €", false);')!;
    expect(formatValue(eu, '1234.5').text).toBe('1.234,50 €');
    expect(commitValue(eu, '1.234,5')).toBe('1234.5');
    expect(formatValue(parseFormatAction('AFPercent_Format(1, 0)'), '0.125').text).toBe('12.5%');
    expect(commitValue(usd, 'abc')).toBeNull();
  });

  it('formats and parses dates, times and masks', () => {
    const date = parseFormatAction('AFDate_FormatEx("dd-mmm-yyyy");')!;
    expect(commitValue(date, '3/4/2026')).toBe('03-Apr-2026');
    expect(commitValue(date, '31 Feb 2026')).toBeNull();
    expect(formatValue(parseFormatAction('AFDate_Format(1)'), '12/25/26').text).toBe('12/25/26');
    expect(commitValue(parseFormatAction('AFTime_Format(1)'), '13:05')).toBe('1:05 pm');
    const ssn = parseFormatAction('AFSpecial_Format(3);')!;
    expect(formatValue(ssn, '123456789').text).toBe('123-45-6789');
    expect(commitValue(ssn, '123-45-678')).toBeNull();
    expect(formatValue(parseFormatAction('AFSpecial_Format(2)'), '5551234').text).toBe('555-1234');
    const mask = parseFormatAction('AFSpecial_KeystrokeEx("AA-999");')!;
    expect(acceptsKeystroke(mask, 'AB-1')).toBe(true);
    expect(acceptsKeystroke(mask, 'A1')).toBe(false);
  });

  it('filters number keystrokes by separator style', () => {
    const n = parseFormatAction('AFNumber_Keystroke(2, 0, 0, 0, "", true)');
    expect(acceptsKeystroke(n, '1,234.5')).toBe(true);
    expect(acceptsKeystroke(n, '12a')).toBe(false);
  });

  it('validates ranges and calculates (simple and simplified notation, no eval)', () => {
    const range = parseValidateAction('AFRange_Validate(true, 0, true, 10);');
    expect([validateRange(range, '5'), validateRange(range, '11'), validateRange(range, '')]).toEqual([true, false, true]);
    const values: Record<string, string> = { a: '2', b: '3', 'line 1.qty': '4' };
    const get = (n: string) => values[n] ?? '';
    expect(calculate(parseCalculateAction('AFSimple_Calculate("SUM", new Array ("a", "b"));')!, get)).toBe('5');
    expect(calculate(parseCalculateAction('AFSimple_Calculate("PRD", "a, b");')!, get)).toBe('6');
    const sfn = parseCalculateAction('/** BVCALC (a + b) * line\\ 1.qty / 2 EVCALC **/')!;
    expect(sfn).toMatchObject({ fields: ['a', 'b', 'line 1.qty'] });
    expect(calculate(sfn, get)).toBe('10');
    expect(calculate(parseCalculateAction('/** BVCALC a + alert(1) EVCALC **/')!, get)).toBe('');
  });
});

describe('readForm', () => {
  it('reads fields, widgets, options, flags, actions and orders', async () => {
    const { model, sources } = await readForm(await PdfDoc.load(formPdf()));
    const by = Object.fromEntries(model.fields.map((f) => [f.name, f]));
    expect(Object.keys(by)).toEqual(['person.name', 'person.ssn', 'choice', 'agree', 'state', 'langs', 'notes', 'qty', 'total']);
    expect(by['person.name']).toMatchObject({
      kind: 'text',
      value: 'Ana',
      tooltip: 'Full name',
      style: { font: 'Times-Roman', fontSize: 11, color: '#0000ff', align: 'center' },
    });
    expect(by['person.name'].widgets[0]).toMatchObject({
      page: 0,
      index: 0,
      rect: { x: 50, y: 80, w: 200, h: 20 },
      background: '#ffffcc',
      borderColor: '#000000',
    });
    expect(by['person.ssn']).toMatchObject({ comb: true, maxLength: 9, format: { kind: 'special', psf: 3 } });
    expect(by['choice']).toMatchObject({ kind: 'radio', value: 'b', noToggleToOff: true });
    expect(by['choice'].widgets.map((w) => w.onState)).toEqual(['a', 'b']);
    expect(by['agree']).toMatchObject({ kind: 'checkbox', value: 'Off', widgets: [{ onState: 'Yes', caption: '8' }] });
    expect(by['state']).toMatchObject({
      kind: 'combo',
      value: 'NY',
      options: [
        { value: 'CA', label: 'California' },
        { value: 'NY', label: 'New York' },
      ],
    });
    expect(by['langs']).toMatchObject({ kind: 'list', multiSelect: true, value: ['en', 'fr'] });
    expect(by['notes']).toMatchObject({ multiline: true, required: true });
    expect(by['qty']).toMatchObject({ format: { kind: 'number', decimals: 0 }, validate: { min: 1, max: 99 } });
    expect(by['total']).toMatchObject({ readOnly: true, calculate: { kind: 'expression', fields: ['qty'] } });
    expect(model.calculationOrder).toEqual(['total']);
    // /Tabs R: rows top to bottom, then left to right.
    expect(model.tabOrder[0].slice(0, 3)).toEqual([0, 1, 2]);
    expect(sources.get('choice')?.widgets.map((w) => w.index)).toEqual([2, 3]);
  });
});

describe('writing form values', () => {
  it('writes /V on the field, /AS on buttons and new text appearances, incrementally', async () => {
    const bytes = formPdf();
    const values = new Map<string, string | string[]>([
      ['person.name', 'Bo Smith'],
      ['choice', 'a'],
      ['agree', 'Yes'],
      ['state', 'CA'],
      ['langs', ['es']],
      ['total', 'ignored: read-only'],
    ]);
    const saved = await writeDocumentChanges(bytes, { formValues: values });
    expect(latin1(saved.subarray(0, bytes.length))).toBe(latin1(bytes));
    const doc = await PdfDoc.load(saved);
    const { model } = await readForm(doc);
    const by = Object.fromEntries(model.fields.map((f) => [f.name, f.value]));
    expect(by).toMatchObject({ 'person.name': 'Bo Smith', choice: 'a', agree: 'Yes', state: 'CA', langs: ['es'], total: '' });

    // The radio's /V went on the parent field; each widget got its /AS.
    expect((await doc.dict(new PdfRef(12, 0)))?.getName('V')).toBe('a');
    expect((await doc.dict(new PdfRef(13, 0)))?.getName('AS')).toBe('a');
    expect((await doc.dict(new PdfRef(14, 0)))?.getName('AS')).toBe('Off');
    // The text widget has a fresh appearance with the new value in the widget's font.
    const name = await doc.dict(new PdfRef(10, 0));
    const ap = await doc.resolve((name!.get('AP') as PdfDict).get('N'));
    const content = latin1((ap as PdfStream).data);
    expect(content).toContain('(Bo Smith) Tj');
    expect(content).toContain('/TiRo 11 Tf');
  });

  it('returns the bytes untouched when values match the file', async () => {
    const bytes = formPdf();
    expect(await writeDocumentChanges(bytes, { formValues: new Map([['person.name', 'Ana']]) })).toBe(bytes);
  });
});
