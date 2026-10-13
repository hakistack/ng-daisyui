import { appearanceStream, standardFontDict, FONT_RESOURCE } from '../annotations/appearance';
import { pageSpace } from '../annotations/annotation-io';
import type { PdfRect } from '../annotations/annotation.types';
import { PageSpace } from '../annotations/page-space';
import { hexToRgb } from '../annotations/shapes';
import { PdfDoc, PdfPageRef } from '../pdf-writer/document';
import { FontEmbedder } from '../pdf-writer/font-embed';
import type { StandardFont } from '../pdf-writer/standard-fonts';
import { PdfDict, PdfName, PdfRef, PdfString, PdfValue } from '../pdf-writer/objects';
import { AfFormat } from './af';
import { widgetOps } from './form-appearance';
import { FormField, FormFieldKind, FormTextStyle, FormValue, FormWidget, emptyValue } from './form-model';
import { readForm } from './form-reader';

/**
 * Form design: fields as the designer edits them (existing ones keep the
 * name they have in the file as `origin`, so renames and moves can be
 * written back), and the writer that creates, changes and deletes fields
 * and widgets in the file.
 */

/**
 * A widget as designed: `origin` is its position among its field's widgets
 * in the file when it already exists (not its `/Annots` index, which other
 * edits in the same save may shift).
 */
export interface DesignWidget extends FormWidget {
  readonly origin?: number;
}

/** A field as designed: `origin` is its name in the file when it already exists. */
export interface DesignField extends Omit<FormField, 'widgets'> {
  readonly origin?: string;
  readonly widgets: readonly DesignWidget[];
}

export interface FormDesign {
  readonly fields: readonly DesignField[];
  /** Names (in the file) of the fields that were deleted. */
  readonly deleted: readonly string[];
}

/** `/DocMDP` (certification) permissions: 1 no changes, 2 fill and sign, 3 also annotate. */
export type DocMdpLevel = 1 | 2 | 3;

/** Field flags written for a designed field (§12.7.4). */
function fieldFlags(f: DesignField): number {
  let ff = 0;
  if (f.readOnly) ff |= 1;
  if (f.required) ff |= 2;
  if (f.noExport) ff |= 4;
  if (f.kind === 'text') {
    if (f.multiline) ff |= 1 << 12;
    if (f.password) ff |= 1 << 13;
    if (f.doNotScroll) ff |= 1 << 23;
    if (f.comb) ff |= 1 << 24;
  }
  if (f.kind === 'radio') ff |= (1 << 15) | (f.noToggleToOff ? 1 << 14 : 0) | (f.radiosInUnison ? 1 << 25 : 0);
  if (f.kind === 'combo') ff |= (1 << 17) | (f.editable ? 1 << 18 : 0);
  if (f.kind === 'list' && f.multiSelect) ff |= 1 << 21;
  return ff;
}

const FIELD_TYPE: Record<FormFieldKind, string> = {
  text: 'Tx',
  checkbox: 'Btn',
  radio: 'Btn',
  combo: 'Ch',
  list: 'Ch',
  button: 'Btn',
  signature: 'Sig',
};

// ── New fields ──────────────────────────────────────────────────────────────

export const DEFAULT_FIELD_STYLE: FormTextStyle = { font: 'Helvetica', fontSize: 0, color: '#000000', align: 'left' };

/** A new field of `kind` with one widget at `rect` on `page`. */
export function newDesignField(kind: FormFieldKind, name: string, page: number, rect: PdfRect, format?: AfFormat): DesignField {
  const onState = kind === 'checkbox' ? 'Yes' : kind === 'radio' ? 'Choice1' : undefined;
  return {
    name,
    kind,
    readOnly: false,
    required: false,
    noExport: false,
    multiline: false,
    password: false,
    comb: false,
    doNotScroll: false,
    multiSelect: false,
    editable: false,
    options: kind === 'combo' || kind === 'list' ? [{ value: 'Option 1', label: 'Option 1' }] : [],
    noToggleToOff: kind === 'radio',
    radiosInUnison: false,
    exportValues: onState ? { [onState]: onState } : {},
    value: emptyValue(kind),
    defaultValue: emptyValue(kind),
    widgets: [newWidget(kind, page, rect, onState)],
    style: DEFAULT_FIELD_STYLE,
    format,
  };
}

export function newWidget(kind: FormFieldKind, page: number, rect: PdfRect, onState?: string): DesignWidget {
  return {
    page,
    index: -1,
    rect,
    onState,
    borderColor: '#000000',
    background: kind === 'signature' ? '#eef2ff' : undefined,
    borderWidth: 1,
    caption: kind === 'checkbox' ? '4' : kind === 'radio' ? 'l' : undefined,
    appearance: DEFAULT_FIELD_STYLE,
    rotation: 0,
  };
}

/** A name not used by `taken` (`Text1`, `Text2`, …). */
export function uniqueFieldName(base: string, taken: ReadonlySet<string>): string {
  for (let i = 1; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

/** Whether `name` collides with another field, or with its parents / children (`a` vs `a.b`). */
export function nameConflicts(name: string, others: readonly string[]): boolean {
  return others.some((o) => o === name || o.startsWith(`${name}.`) || name.startsWith(`${o}.`));
}

/** The JavaScript of a format as `/AA` actions (keystroke + format), the AF calls Acrobat writes. */
export function formatActions(format: AfFormat | undefined): { K?: string; F?: string } {
  if (!format) return {};
  switch (format.kind) {
    case 'number': {
      const args = `${format.decimals}, ${format.sepStyle}, ${format.negStyle}, 0, ${JSON.stringify(format.currency)}, ${format.prepend}`;
      return { K: `AFNumber_Keystroke(${args});`, F: `AFNumber_Format(${args});` };
    }
    case 'percent':
      return {
        K: `AFPercent_Keystroke(${format.decimals}, ${format.sepStyle});`,
        F: `AFPercent_Format(${format.decimals}, ${format.sepStyle});`,
      };
    case 'date':
      return { K: `AFDate_KeystrokeEx(${JSON.stringify(format.format)});`, F: `AFDate_FormatEx(${JSON.stringify(format.format)});` };
    case 'time':
      return { K: `AFTime_KeystrokeEx(${JSON.stringify(format.format)});`, F: `AFTime_FormatEx(${JSON.stringify(format.format)});` };
    case 'special':
      return { K: `AFSpecial_Keystroke(${format.psf});`, F: `AFSpecial_Format(${format.psf});` };
    case 'mask':
      return { K: `AFSpecial_KeystrokeEx(${JSON.stringify(format.mask)});` };
  }
}

// ── Writing ─────────────────────────────────────────────────────────────────

/**
 * Write a form design into an open document: new fields (merged
 * field/widget dictionaries, or a parent with widget kids for radio groups
 * and multi-widget fields) added to `/AcroForm /Fields` and their pages'
 * `/Annots`; changed fields and widgets updated in place (located by
 * reference); deleted ones removed. `/AcroForm` (with `/DR` fonts) is
 * created when the document has none. Annotation changes must be applied
 * before this (they address `/Annots` by index).
 */
export async function applyFormDesign(doc: PdfDoc, design: FormDesign, fonts = new FontEmbedder(doc)): Promise<void> {
  const { model, sources } = await readForm(doc);
  const pages = await doc.pages();
  const spaces = await Promise.all(pages.map((p) => pageSpace(doc, p.dict)));
  const acro = await acroForm(doc);
  const addObject = (v: PdfValue) => doc.add(v);
  const fieldsArr = [...(((await doc.resolve(acro.dict.get('Fields'))) as PdfValue[] | null) ?? [])];
  const annots = new Map<number, PdfValue[]>(); // edited /Annots per page
  const annotsOf = async (page: number) => {
    let list = annots.get(page);
    if (!list) {
      const v = await doc.resolve(pages[page].dict.get('Annots'));
      annots.set(page, (list = Array.isArray(v) ? [...v] : []));
    }
    return list;
  };
  const removeRef = (list: PdfValue[], ref: PdfRef) => {
    const i = list.findIndex((v) => v instanceof PdfRef && v.equals(ref));
    if (i >= 0) list.splice(i, 1);
  };

  // Deleted fields: out of /Fields (or their parent's /Kids) and their widgets out of /Annots.
  for (const name of design.deleted) {
    const src = sources.get(name);
    if (!src) continue;
    removeRef(fieldsArr, src.ref);
    const parentRef = (await doc.dict(src.ref))?.get('Parent');
    if (parentRef instanceof PdfRef) {
      const parent = (await doc.dict(parentRef))?.clone();
      const kids = parent?.get('Kids');
      if (parent && Array.isArray(kids)) {
        parent.set(
          'Kids',
          kids.filter((k) => !(k instanceof PdfRef && k.equals(src.ref))),
        );
        doc.update(parentRef, parent);
      }
    }
    for (const w of src.widgets) {
      removeRef(await annotsOf(w.page), w.ref);
      doc.delete(w.ref);
    }
    if (!src.widgets.some((w) => w.ref.equals(src.ref))) doc.delete(src.ref);
  }

  const original = new Map(model.fields.map((f) => [f.name, f]));
  for (const field of design.fields) {
    const before = field.origin ? original.get(field.origin) : undefined;
    const src = field.origin ? sources.get(field.origin) : undefined;
    if (before && src) {
      if (sameDesign(before, field)) continue;
      await updateField(doc, field, src, spaces, addObject, fonts, annotsOf, removeRef);
    } else {
      const ref = await createField(doc, field, pages, spaces, addObject, fonts, annotsOf);
      fieldsArr.push(ref);
    }
  }

  const acroDict = acro.dict.clone().set('Fields', fieldsArr);
  await ensureResources(doc, acroDict, new Set(design.fields.map((f) => f.style.font)));
  if (acro.ref) doc.update(acro.ref, acroDict);
  else {
    const rootRef = doc.trailer.get('Root') as PdfRef;
    doc.update(rootRef, (await doc.catalog()).clone().set('AcroForm', doc.add(acroDict)));
  }
  for (const [page, list] of annots) {
    const value = pages[page].dict.get('Annots');
    if (value instanceof PdfRef) doc.update(value, list);
    else doc.update(pages[page].ref, (await doc.dict(pages[page].ref))!.clone().set('Annots', list));
  }
}

async function acroForm(doc: PdfDoc): Promise<{ ref: PdfRef | null; dict: PdfDict }> {
  const value = (await doc.catalog()).get('AcroForm');
  const dict = await doc.dict(value);
  return { ref: value instanceof PdfRef ? value : null, dict: dict ?? new PdfDict({ Fields: [] }) };
}

/** `/DR` fonts for every `/DA` written (and ZapfDingbats for buttons), and a default `/DA`, when missing. */
async function ensureResources(doc: PdfDoc, acro: PdfDict, used: ReadonlySet<StandardFont>): Promise<void> {
  const drValue = acro.get('DR');
  const dr = (await doc.dict(drValue))?.clone() ?? new PdfDict();
  const fontValue = dr.get('Font');
  const fontDict = (await doc.dict(fontValue))?.clone() ?? new PdfDict();
  let changed = false;
  for (const font of new Set<StandardFont>(['Helvetica', ...used])) {
    if (!fontDict.has(FONT_RESOURCE[font])) {
      fontDict.set(FONT_RESOURCE[font], standardFontDict(font));
      changed = true;
    }
  }
  if (!fontDict.has('ZaDb')) {
    fontDict.set('ZaDb', new PdfDict({ Type: PdfName.of('Font'), Subtype: PdfName.of('Type1'), BaseFont: PdfName.of('ZapfDingbats') }));
    changed = true;
  }
  if (changed) {
    if (fontValue instanceof PdfRef) doc.update(fontValue, fontDict);
    else dr.set('Font', fontDict);
    if (drValue instanceof PdfRef) doc.update(drValue, dr);
    else acro.set('DR', dr);
  }
  if (!acro.has('DA')) acro.set('DA', PdfString.text('/Helv 0 Tf 0 g'));
}

/** The `/DA` of a style. */
function da(style: FormTextStyle): PdfString {
  const [r, g, b] = hexToRgb(style.color).map((n) => Math.round(n * 1000) / 1000);
  return PdfString.text(`/${FONT_RESOURCE[style.font]} ${style.fontSize} Tf ${r} ${g} ${b} rg`);
}

function color(hex: string | undefined): number[] | undefined {
  return hex ? hexToRgb(hex).map((n) => Math.round(n * 1000) / 1000) : undefined;
}

/** Field-level entries (`/FT /Ff /T /TU /DA /Q /MaxLen /Opt /AA /V /DV`). */
function fieldEntries(dict: PdfDict, f: DesignField, partialName: string): void {
  dict.set('FT', PdfName.of(FIELD_TYPE[f.kind]));
  dict.set('T', PdfString.text(partialName));
  const ff = fieldFlags(f);
  if (ff) dict.set('Ff', ff);
  else dict.delete('Ff');
  if (f.tooltip) dict.set('TU', PdfString.text(f.tooltip));
  else dict.delete('TU');
  if (f.kind === 'text' || f.kind === 'combo' || f.kind === 'list') {
    dict.set('DA', da(f.style));
    dict.set('Q', f.style.align === 'center' ? 1 : f.style.align === 'right' ? 2 : 0);
  }
  if (f.kind === 'text' && f.maxLength) dict.set('MaxLen', f.maxLength);
  else dict.delete('MaxLen');
  if (f.kind === 'combo' || f.kind === 'list') {
    dict.set(
      'Opt',
      f.options.map((o) => (o.value === o.label ? PdfString.text(o.value) : [PdfString.text(o.value), PdfString.text(o.label)])),
    );
  } else if (f.kind === 'checkbox' || f.kind === 'radio') {
    // Export values that differ from the state names go in /Opt, in widget order.
    const exports = f.widgets.map((w) => f.exportValues[w.onState ?? ''] ?? w.onState ?? '');
    if (f.widgets.some((w, i) => exports[i] !== w.onState))
      dict.set(
        'Opt',
        exports.map((e) => PdfString.text(e)),
      );
    else dict.delete('Opt');
  }
  const actions = formatActions(f.format);
  if (actions.K || actions.F) {
    const aa = new PdfDict();
    if (actions.K) aa.set('K', new PdfDict({ S: PdfName.of('JavaScript'), JS: PdfString.text(actions.K) }));
    if (actions.F) aa.set('F', new PdfDict({ S: PdfName.of('JavaScript'), JS: PdfString.text(actions.F) }));
    dict.set('AA', aa);
  } else {
    dict.delete('AA');
  }
  const value = (v: FormValue) =>
    f.kind === 'checkbox' || f.kind === 'radio'
      ? PdfName.of(v as string)
      : Array.isArray(v)
        ? v.length === 1
          ? PdfString.text(v[0])
          : v.map((x) => PdfString.text(x))
        : PdfString.text(v as string);
  dict.set('V', value(f.value));
  dict.set('DV', value(f.defaultValue));
}

/** Widget-level entries (`/Rect /MK /BS /F /P /AP /AS`). */
async function widgetEntries(
  dict: PdfDict,
  f: DesignField,
  w: DesignWidget,
  pageRef: PdfRef,
  space: PageSpace,
  addObject: (v: PdfValue) => PdfRef,
  fonts: FontEmbedder,
  doc: PdfDoc,
): Promise<void> {
  dict.set('Type', PdfName.of('Annot'));
  dict.set('Subtype', PdfName.of('Widget'));
  dict.set('Rect', space.rectToUser(w.rect));
  dict.set('P', pageRef);
  dict.set('F', 4);
  const mk = new PdfDict();
  const bc = color(w.borderColor);
  const bg = color(w.background);
  if (bc) mk.set('BC', bc);
  if (bg) mk.set('BG', bg);
  if (w.caption) mk.set('CA', PdfString.text(w.caption));
  dict.set('MK', mk);
  dict.set('BS', new PdfDict({ W: w.borderWidth, S: PdfName.of('S') }));
  const fw = { ...f, widgets: [] } as unknown as FormField;
  if (f.kind === 'checkbox' || f.kind === 'radio') {
    const state = w.onState ?? 'Yes';
    const on = doc.add(await appearanceStream(widgetOps(fw, w, state), w.rect, space, addObject, new Map(), fonts));
    const off = doc.add(await appearanceStream(widgetOps(fw, w, 'Off'), w.rect, space, addObject, new Map(), fonts));
    dict.set('AP', new PdfDict({ N: new PdfDict({ [state]: on, Off: off }) }));
    dict.set('AS', PdfName.of(f.value === state ? state : 'Off'));
  } else {
    const ap = doc.add(await appearanceStream(widgetOps(fw, w, f.value), w.rect, space, addObject, new Map(), fonts));
    dict.set('AP', new PdfDict({ N: ap }));
    dict.delete('AS');
  }
}

async function createField(
  doc: PdfDoc,
  f: DesignField,
  pages: readonly PdfPageRef[],
  spaces: readonly PageSpace[],
  addObject: (v: PdfValue) => PdfRef,
  fonts: FontEmbedder,
  annotsOf: (page: number) => Promise<PdfValue[]>,
): Promise<PdfRef> {
  const single = f.widgets.length === 1 && f.kind !== 'radio';
  if (single) {
    // A merged field/widget dictionary.
    const w = f.widgets[0];
    const dict = new PdfDict();
    fieldEntries(dict, f, f.name);
    await widgetEntries(dict, f, w, pages[w.page].ref, spaces[w.page], addObject, fonts, doc);
    const ref = doc.add(dict);
    (await annotsOf(w.page)).push(ref);
    return ref;
  }
  const parent = new PdfDict();
  fieldEntries(parent, f, f.name);
  const parentRef = doc.add(parent);
  const kids: PdfRef[] = [];
  for (const w of f.widgets) {
    const dict = new PdfDict({ Parent: parentRef });
    await widgetEntries(dict, f, w, pages[w.page].ref, spaces[w.page], addObject, fonts, doc);
    const ref = doc.add(dict);
    kids.push(ref);
    (await annotsOf(w.page)).push(ref);
  }
  doc.update(parentRef, parent.clone().set('Kids', kids));
  return parentRef;
}

async function updateField(
  doc: PdfDoc,
  f: DesignField,
  src: { ref: PdfRef; widgets: readonly { ref: PdfRef; page: number; index: number }[] },
  spaces: readonly PageSpace[],
  addObject: (v: PdfValue) => PdfRef,
  fonts: FontEmbedder,
  annotsOf: (page: number) => Promise<PdfValue[]>,
  removeRef: (list: PdfValue[], ref: PdfRef) => void,
): Promise<void> {
  const pages = await doc.pages();
  const fieldDict = (await doc.dict(src.ref))!.clone();
  // Renaming changes the last part of the name (the field keeps its place in the hierarchy).
  const partial = f.name.split('.').pop()!;
  fieldEntries(fieldDict, f, partial);
  const merged = src.widgets.length === 1 && src.widgets[0].ref.equals(src.ref);
  const kept = new Set<string>();
  for (const w of f.widgets) {
    const existing = w.origin !== undefined ? src.widgets[w.origin] : undefined;
    if (existing && merged) {
      await widgetEntries(fieldDict, f, w, pages[w.page].ref, spaces[w.page], addObject, fonts, doc);
      kept.add(existing.ref.key);
    } else if (existing) {
      const wd = (await doc.dict(existing.ref))!.clone();
      await widgetEntries(wd, f, w, pages[w.page].ref, spaces[w.page], addObject, fonts, doc);
      doc.update(existing.ref, wd);
      kept.add(existing.ref.key);
    } else {
      // A widget added to an existing field (a new radio option).
      const wd = new PdfDict({ Parent: src.ref });
      await widgetEntries(wd, f, w, pages[w.page].ref, spaces[w.page], addObject, fonts, doc);
      const ref = doc.add(wd);
      (await annotsOf(w.page)).push(ref);
      const kids = fieldDict.get('Kids');
      fieldDict.set('Kids', [...(Array.isArray(kids) ? kids : []), ref]);
      kept.add(ref.key);
    }
  }
  // Widgets the design dropped.
  for (const s of src.widgets) {
    if (kept.has(s.ref.key)) continue;
    removeRef(await annotsOf(s.page), s.ref);
    const kids = fieldDict.get('Kids');
    if (Array.isArray(kids))
      fieldDict.set(
        'Kids',
        kids.filter((k) => !(k instanceof PdfRef && k.equals(s.ref))),
      );
    if (!s.ref.equals(src.ref)) doc.delete(s.ref);
  }
  doc.update(src.ref, fieldDict);
}

/** Whether a designed field is unchanged from the file's (by everything the designer edits). */
function sameDesign(before: FormField, after: DesignField): boolean {
  const strip = (f: Omit<FormField, 'widgets'> & { widgets: readonly FormWidget[] }) =>
    JSON.stringify({
      ...f,
      origin: undefined,
      calculate: undefined,
      validate: undefined,
      widgets: f.widgets.map((w) => ({ ...w, origin: undefined, index: undefined, appearance: undefined })),
    });
  return before.name === after.name && strip(before) === strip({ ...after, name: before.name });
}

/** The document's `/DocMDP` level (certification signature), if any. */
export async function readDocMdp(doc: PdfDoc): Promise<DocMdpLevel | null> {
  const perms = await doc.dict((await doc.catalog()).get('Perms'));
  const sig = await doc.dict(perms?.get('DocMDP'));
  if (!sig) return null;
  const refs = await doc.resolve(sig.get('Reference'));
  if (Array.isArray(refs)) {
    for (const r of refs) {
      const ref = await doc.dict(r);
      if (ref?.getName('TransformMethod') !== 'DocMDP') continue;
      const p = (await doc.dict(ref.get('TransformParams')))?.getNumber('P') ?? 2;
      return (p === 1 || p === 3 ? p : 2) as DocMdpLevel;
    }
  }
  return 2;
}

/** The fields of a read form as design fields (existing: they remember their names and widget positions). */
export function toDesign(fields: readonly FormField[]): DesignField[] {
  return fields.map((f) => ({ ...f, origin: f.name, widgets: f.widgets.map((w, i) => ({ ...w, origin: i })) }));
}
