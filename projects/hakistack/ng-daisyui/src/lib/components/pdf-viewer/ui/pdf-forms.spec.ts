import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readForm } from '../core/forms/form-reader';
import { PdfDoc } from '../core/pdf-writer/document';
import { PdfEngine } from '../engine/pdf-engine.types';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { createPdfViewer } from '../pdf-viewer.helpers';
import { PdfViewerConfig } from '../pdf-viewer.types';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfFormsService } from '../services/pdf-forms.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

/**
 * Form filling end to end in jsdom: the form is read from a real PDF, its
 * widgets are hidden in the raster, controls are built from the model
 * (formatting, keystroke filtering, validation, calculation), values flow
 * through the formValues binding, and save writes them into the file.
 */

const enc = new TextEncoder();

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

@Component({
  imports: [PdfViewerComponent],
  template: `<hk-pdf-viewer [src]="src" [config]="config()" [(formValues)]="values" />`,
})
class HostComponent {
  src = formPdf();
  readonly config = signal<PdfViewerConfig>({});
  values: Record<string, unknown> = {};
}

describe('PDF form filling', () => {
  let hidden: number[][];

  beforeEach(() => {
    hidden = [];
    const never = new Promise<never>(() => undefined);
    const engine: Partial<PdfEngine> = {
      open: async () => 1,
      pageCount: async () => 1,
      pageSizes: async () => [{ width: 600, height: 800 }],
      pageLabels: async () => [''],
      documentTitle: async () => '',
      renderPage: () => ({ promise: never, cancel: () => undefined }),
      renderTile: () => ({ promise: never, cancel: () => undefined }),
      pageText: async () => [],
      pagesText: async (_d, pages) => pages.map(() => []),
      pageLinks: async () => [],
      outline: async () => [],
      attachments: async () => [],
      setHiddenAnnotations: async (_d, entries) => void hidden.push([...entries]),
      dispose: () => undefined,
      destroy: () => undefined,
    };
    HTMLElement.prototype.scrollTo ??= function () {} as typeof HTMLElement.prototype.scrollTo;
    vi.spyOn(PdfViewerStore.prototype, 'ensureEngine').mockImplementation(function (this: PdfViewerStore) {
      this.engine ??= engine as PdfEngine;
      return this.engine;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    for (let i = 0; i < 6; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  async function load(values: Record<string, unknown> = {}, src?: Uint8Array) {
    const fixture = TestBed.createComponent(HostComponent);
    if (src) fixture.componentInstance.src = src;
    const viewer = createPdfViewer({ zoom: 1 });
    fixture.componentInstance.config.set(viewer.config());
    fixture.componentInstance.values = values;
    await settle(fixture);
    const forms = fixture.debugElement.query(By.directive(PdfViewerComponent)).injector.get(PdfFormsService);
    /** Build a field's control (the overlay builds them when a page renders; jsdom never renders). */
    const control = <T extends HTMLElement>(name: string) => {
      const field = forms.field(name)!;
      const el = forms.buildControl(field, field.widgets[0], 1) as T;
      document.body.appendChild(el);
      return el;
    };
    const designer = fixture.debugElement.query(By.directive(PdfViewerComponent)).injector.get(PdfFormDesignerService);
    return { fixture, viewer, forms, control, designer };
  }

  const type = (el: HTMLInputElement, text: string) => {
    el.dispatchEvent(new FocusEvent('focus'));
    el.value = text;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('change'));
    el.dispatchEvent(new FocusEvent('blur'));
  };

  it('reads the form and hides its fillable widgets in the raster', async () => {
    const { forms } = await load();
    expect(forms.model()?.fields.length).toBe(9);
    // Every text, button and choice widget (indices 0–9 on page 0) is drawn by the overlay instead.
    const flat = hidden.at(-1)!;
    const indices = flat.filter((_, i) => i % 2 === 1).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('formats on blur, normalises on commit, and recalculates dependants', async () => {
    const { forms, control, fixture } = await load();
    const qty = control<HTMLInputElement>('qty');
    type(qty, '4');
    await settle(fixture);
    expect(forms.value('qty')).toBe('4');
    expect(forms.value('total')).toBe('10'); // qty * 2.5, simplified field notation
    expect(control<HTMLInputElement>('total').value).toBe('$10.00');
    expect(fixture.componentInstance.values).toMatchObject({ qty: '4', total: '10' });
  });

  it('filters keystrokes and rejects invalid or out-of-range values', async () => {
    const { forms, control } = await load();
    const ssn = control<HTMLInputElement>('person.ssn');
    ssn.dispatchEvent(new FocusEvent('focus'));
    ssn.value = '12a';
    ssn.dispatchEvent(new Event('input'));
    expect(ssn.value).toBe(''); // the letter is refused; the field reverts to what was accepted
    type(ssn, '123');
    expect(ssn.getAttribute('aria-invalid')).toBe('true'); // an SSN needs 9 digits
    expect(forms.value('person.ssn')).toBe('');
    type(ssn, '123456789');
    expect(forms.value('person.ssn')).toBe('123456789');
    expect(ssn.value).toBe('123-45-6789');

    const qty = control<HTMLInputElement>('qty');
    type(qty, '150');
    expect(qty.getAttribute('aria-invalid')).toBe('true'); // AFRange_Validate 1–99
    expect(forms.value('qty')).toBe('2');
  });

  it('binds checkboxes, radios and lists through formValues both ways', async () => {
    const { forms, control, fixture } = await load({ agree: true, choice: 'a', langs: ['es'] });
    expect([forms.value('agree'), forms.value('choice'), forms.value('langs')]).toEqual(['Yes', 'a', ['es']]);
    const box = control<HTMLInputElement>('agree');
    expect(box.checked).toBe(true);
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(fixture.componentInstance.values).toMatchObject({ agree: false });
  });

  it('resets, and round-trips form data as JSON, XFDF and FDF', async () => {
    const { forms } = await load({ 'person.name': 'Zed', agree: true, state: 'CA', langs: ['en', 'es'] });
    for (const format of ['json', 'xfdf', 'fdf'] as const) {
      const data = forms.exportData(format);
      forms.resetForm();
      expect(forms.value('person.name')).toBe('');
      expect(forms.importData(data)).toBeGreaterThan(5);
      expect([forms.value('person.name'), forms.value('agree'), forms.value('state'), forms.value('langs')]).toEqual([
        'Zed',
        'Yes',
        'CA',
        ['en', 'es'],
      ]);
    }
    expect(forms.exportData('xfdf')).toContain('<field name="person">');
  });

  it('saves the values into the file', async () => {
    const { viewer } = await load({ 'person.name': 'Zed', choice: 'a' });
    const saved = await viewer.save();
    const { model } = await readForm(await PdfDoc.load(saved));
    const values = Object.fromEntries(model.fields.map((f) => [f.name, f.value]));
    expect(values).toMatchObject({ 'person.name': 'Zed', choice: 'a' });
  });

  it('designs a new field on the page, then fills and saves it', async () => {
    const { fixture, forms, designer, viewer } = await load();
    designer.start();
    designer.tool.set('text');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const surface = el.querySelector<HTMLElement>('.hk-pdf-design-surface.hk-pdf-design-drawing')!;
    expect(surface).toBeTruthy();
    // jsdom has no layout: client point (x − 300, y − 400) is page point (x, y) on this 600×800 page.
    const at = (type: string, x: number, y: number) =>
      surface.dispatchEvent(new MouseEvent(type, { clientX: x - 300, clientY: y - 400, button: 0, buttons: 1, bubbles: true }));
    at('pointerdown', 100, 200);
    at('pointermove', 250, 224);
    at('pointerup', 250, 224);
    await settle(fixture);
    const created = designer.fields().find((f) => f.name === 'Text1');
    expect(created?.widgets[0].rect).toEqual({ x: 100, y: 200, w: 150, h: 24 });
    expect(el.querySelector('.hk-pdf-design-box[aria-label="Text1"]')).toBeTruthy();

    expect(await designer.rename('Text1', 'person')).toBe('taken'); // "person.name" exists
    expect(await designer.rename('Text1', 'email')).toBeNull();
    await designer.undo();
    expect(designer.fields().some((f) => f.name === 'Text1')).toBe(true);
    await designer.redo();

    designer.finish();
    await settle(fixture);
    expect(forms.field('email')).toBeTruthy(); // fillable at once
    forms.setValues(new Map([['email', 'ana@example.com']]));
    const { model } = await readForm(await PdfDoc.load(await viewer.save()));
    expect(model.fields.find((f) => f.name === 'email')).toMatchObject({ kind: 'text', value: 'ana@example.com' });
  });

  it('moves an existing field and keeps its value', async () => {
    const { designer, viewer } = await load({ 'person.name': 'Zed' });
    designer.start();
    const [x] = [designer.fields().find((f) => f.name === 'person.name')!];
    await designer.setWidgetRect('person.name', 0, { ...x.widgets[0].rect, x: 10 });
    designer.finish();
    const { model } = await readForm(await PdfDoc.load(await viewer.save()));
    expect(model.fields.find((f) => f.name === 'person.name')).toMatchObject({ value: 'Zed', widgets: [{ rect: { x: 10 } }] });
  });

  it('does not design a certified document', async () => {
    const certified = new TextEncoder().encode(
      new TextDecoder('latin1')
        .decode(formPdf())
        .replace(
          '/AcroForm 4 0 R >>',
          '/AcroForm 4 0 R /Perms << /DocMDP << /Reference [<< /TransformMethod /DocMDP /TransformParams << /P 2 >> >>] >> >> >>',
        ),
    );
    const { designer, forms } = await load({}, certified);
    expect(forms.docMdp()).toBe(2);
    designer.start();
    expect(designer.active()).toBe(false);
  });
});
