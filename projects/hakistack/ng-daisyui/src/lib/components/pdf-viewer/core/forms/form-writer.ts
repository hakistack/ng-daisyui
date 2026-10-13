import { appearanceStream } from '../annotations/appearance';
import { pageSpace } from '../annotations/annotation-io';
import { PageSpace } from '../annotations/page-space';
import { PdfDoc } from '../pdf-writer/document';
import { PdfDict, PdfName, PdfRef, PdfString, PdfValue } from '../pdf-writer/objects';
import { FontEmbedder } from '../pdf-writer/font-embed';
import { StandardFont, resolveFont } from '../pdf-writer/standard-fonts';
import { widgetOps } from './form-appearance';
import { FormField, FormValue, sameValue } from './form-model';
import { readForm } from './form-reader';

/**
 * Write field values into an open document (no save): `/V` on the field,
 * `/AS` on checkbox and radio widgets, regenerated `/AP` for text and choice
 * widgets. Fields are matched by fully qualified name against the document
 * itself, so this works on whatever bytes the save starts from. Text a
 * standard font can't show sets `/NeedAppearances` so viewers redraw it.
 * Returns whether anything changed.
 */
export async function applyFormValues(
  doc: PdfDoc,
  values: ReadonlyMap<string, FormValue>,
  fonts = new FontEmbedder(doc),
): Promise<boolean> {
  if (values.size === 0) return false;
  const { model, sources } = await readForm(doc);
  const pages = await doc.pages();
  const spaces = new Map<number, PageSpace>();
  const spaceOf = async (page: number) => {
    let s = spaces.get(page);
    if (!s) spaces.set(page, (s = await pageSpace(doc, pages[page].dict)));
    return s;
  };
  // Edited dictionaries by object; a merged field/widget gets both edits in one version.
  const edits = new Map<string, { ref: PdfRef; dict: PdfDict }>();
  const edit = async (ref: PdfRef) => {
    let e = edits.get(ref.key);
    if (!e) {
      const dict = (await doc.dict(ref))?.clone();
      if (!dict) return null;
      edits.set(ref.key, (e = { ref, dict }));
    }
    return e.dict;
  };
  const addObject = (value: PdfValue) => doc.add(value);
  let needAppearances = false;

  for (const field of model.fields) {
    const value = values.get(field.name);
    const source = sources.get(field.name);
    if (value === undefined || !source || field.readOnly || sameValue(value, field.value)) continue;
    const fieldDict = await edit(source.ref);
    if (!fieldDict) continue;
    setValue(fieldDict, field, value);

    for (let i = 0; i < field.widgets.length; i++) {
      const widget = field.widgets[i];
      const wsrc = source.widgets[i];
      const wd = wsrc && (await edit(wsrc.ref));
      if (!wd) continue;
      if (field.kind === 'checkbox' || field.kind === 'radio') {
        wd.set('AS', PdfName.of(value === widget.onState ? widget.onState! : 'Off'));
        continue;
      }
      if (field.kind !== 'text' && field.kind !== 'combo' && field.kind !== 'list') continue;
      const space = await spaceOf(widget.page);
      const ap = doc.add(await appearanceStream(widgetOps(field, widget, value), widget.rect, space, addObject, new Map(), fonts));
      wd.set('AP', new PdfDict({ N: ap }));
      if (!drawable(value, widget.appearance.font)) needAppearances = true;
    }
  }
  for (const { ref, dict } of edits.values()) doc.update(ref, dict);

  if (needAppearances) {
    const catalog = await doc.catalog();
    const acroRef = catalog.get('AcroForm');
    const acro = (await doc.dict(acroRef))?.clone();
    if (acro) {
      acro.set('NeedAppearances', true);
      if (acroRef instanceof PdfRef) doc.update(acroRef, acro);
      else {
        const rootRef = doc.trailer.get('Root');
        if (rootRef instanceof PdfRef) doc.update(rootRef, catalog.clone().set('AcroForm', acro));
      }
    }
  }
  return edits.size > 0;
}

function setValue(dict: PdfDict, field: FormField, value: FormValue): void {
  if (field.kind === 'checkbox' || field.kind === 'radio') {
    dict.set('V', PdfName.of(value as string));
    return;
  }
  if (field.kind === 'list') {
    const list = Array.isArray(value) ? value : [value as string];
    dict.set('V', list.length === 1 ? PdfString.text(list[0]) : list.map((v) => PdfString.text(v)));
    const indices = list.map((v) => field.options.findIndex((o) => o.value === v)).filter((i) => i >= 0);
    if (indices.length)
      dict.set(
        'I',
        indices.sort((a, b) => a - b),
      );
    else dict.delete('I');
    return;
  }
  dict.set('V', PdfString.text(value as string));
}

/** Whether the generated appearance can show the value: WinAnsi text, or a registered font covers it. */
function drawable(value: FormValue, font: StandardFont): boolean {
  const text = Array.isArray(value) ? value.join('') : (value as string);
  return resolveFont(font, text) !== null;
}
