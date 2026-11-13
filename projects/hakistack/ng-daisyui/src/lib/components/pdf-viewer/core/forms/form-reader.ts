import { parseDefaultAppearance, pageSpace } from '../annotations/annotation-io';
import type { PdfRect } from '../annotations/annotation.types';
import { PageSpace } from '../annotations/page-space';
import { rgbToHex } from '../annotations/shapes';
import { PdfDoc } from '../pdf-writer/document';
import { decodeStream } from '../pdf-writer/filters';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfString, PdfValue } from '../pdf-writer/objects';
import type { StandardFont } from '../pdf-writer/standard-fonts';
import { parseCalculateAction, parseFormatAction, parseValidateAction } from './af';
import { FormField, FormFieldKind, FormModel, FormTextStyle, FormValue, FormWidget, emptyValue } from './form-model';

/** Where a field lives in the file, for writing it back. */
export interface FormFieldSource {
  /** The terminal field dictionary (holds `/V`); for a merged field/widget, the widget itself. */
  readonly ref: PdfRef;
  readonly widgets: readonly { readonly ref: PdfRef; readonly page: number; readonly index: number }[];
}

export interface ReadForm {
  readonly model: FormModel;
  readonly sources: ReadonlyMap<string, FormFieldSource>;
}

/** Field flags (§12.7.4). */
const FF = {
  readOnly: 1 << 0,
  required: 1 << 1,
  noExport: 1 << 2,
  multiline: 1 << 12,
  password: 1 << 13,
  noToggleToOff: 1 << 14,
  radio: 1 << 15,
  pushButton: 1 << 16,
  combo: 1 << 17,
  edit: 1 << 18,
  multiSelect: 1 << 21,
  doNotScroll: 1 << 23,
  comb: 1 << 24,
  radiosInUnison: 1 << 25,
} as const;

const EMPTY: ReadForm = { model: { fields: [], calculationOrder: [], needAppearances: false, tabOrder: [] }, sources: new Map() };

/** Read the document's AcroForm: its terminal fields with their widgets, values, flags and actions. */
export async function readForm(doc: PdfDoc): Promise<ReadForm> {
  const catalog = await doc.catalog();
  const acroForm = await doc.dict(catalog.get('AcroForm'));
  const pages = await doc.pages();
  const tabOrder: number[][] = pages.map(() => []);
  if (!acroForm) return { ...EMPTY, model: { ...EMPTY.model, tabOrder } };

  // Where each widget is: page, /Annots index, and the page's coordinate mapping.
  const located = new Map<string, { page: number; index: number }>();
  const spaces: PageSpace[] = [];
  const tabs: (string | undefined)[] = [];
  for (let p = 0; p < pages.length; p++) {
    spaces.push(await pageSpace(doc, pages[p].dict));
    tabs.push(pages[p].dict.getName('Tabs'));
    const annots = await doc.resolve(pages[p].dict.get('Annots'));
    if (Array.isArray(annots)) annots.forEach((a, i) => a instanceof PdfRef && located.set(a.key, { page: p, index: i }));
  }

  const dr = await doc.dict(acroForm.get('DR'));
  const drFonts = await doc.dict(dr?.get('Font'));
  const defaultDa = text(await doc.resolve(acroForm.get('DA'))) ?? '/Helv 0 Tf 0 g';
  const ctx: Ctx = { doc, located, spaces, drFonts, fields: [], sources: new Map(), visited: new Set() };

  const roots = await doc.resolve(acroForm.get('Fields'));
  if (Array.isArray(roots)) for (const root of roots) await walk(ctx, root, '', {}, defaultDa);

  const co = await doc.resolve(acroForm.get('CO'));
  const calculationOrder: string[] = [];
  if (Array.isArray(co)) {
    for (const ref of co) {
      if (!(ref instanceof PdfRef)) continue;
      for (const [name, src] of ctx.sources) if (src.ref.equals(ref)) calculationOrder.push(name);
    }
  }

  // Tab order: rows (top to bottom, then left to right), columns, or the order of /Annots.
  const widgetsByPage = new Map<number, { index: number; rect: PdfRect }[]>();
  for (const f of ctx.fields)
    for (const w of f.widgets) widgetsByPage.set(w.page, [...(widgetsByPage.get(w.page) ?? []), { index: w.index, rect: w.rect }]);
  for (const [page, widgets] of widgetsByPage) {
    const t = tabs[page];
    const sorted = [...widgets].sort((a, b) =>
      t === 'R' ? a.rect.y - b.rect.y || a.rect.x - b.rect.x : t === 'C' ? a.rect.x - b.rect.x || a.rect.y - b.rect.y : a.index - b.index,
    );
    tabOrder[page] = sorted.map((w) => w.index);
  }

  return {
    model: { fields: ctx.fields, calculationOrder, needAppearances: acroForm.get('NeedAppearances') === true, tabOrder },
    sources: ctx.sources,
  };
}

interface Ctx {
  readonly doc: PdfDoc;
  readonly located: ReadonlyMap<string, { page: number; index: number }>;
  readonly spaces: readonly PageSpace[];
  readonly drFonts: PdfDict | null;
  readonly fields: FormField[];
  readonly sources: Map<string, FormFieldSource>;
  readonly visited: Set<string>;
}

/** Values a field inherits from its ancestors (§12.7.4.1). */
interface Inherited {
  FT?: string;
  Ff?: number;
  V?: PdfValue;
  DV?: PdfValue;
  Q?: number;
  MaxLen?: number;
  Opt?: PdfValue;
  AA?: PdfDict;
}

async function walk(ctx: Ctx, node: PdfValue, parentName: string, inherited: Inherited, da: string): Promise<void> {
  if (!(node instanceof PdfRef) || ctx.visited.has(node.key)) return;
  ctx.visited.add(node.key);
  const dict = await ctx.doc.dict(node);
  if (!dict) return;
  const partial = text(dict.get('T'));
  const name = partial === undefined ? parentName : parentName ? `${parentName}.${partial}` : partial;
  const own: Inherited = { ...inherited };
  for (const key of ['FT', 'Ff', 'V', 'DV', 'Q', 'MaxLen', 'Opt'] as const) {
    if (!dict.has(key)) continue;
    const v = await ctx.doc.resolve(dict.get(key));
    if (key === 'FT') own.FT = v instanceof PdfName ? v.value : own.FT;
    else if (key === 'Ff' || key === 'Q' || key === 'MaxLen') own[key] = typeof v === 'number' ? v : own[key];
    else own[key] = v;
  }
  const aa = await ctx.doc.dict(dict.get('AA'));
  if (aa) own.AA = aa;
  const ownDa = text(await ctx.doc.resolve(dict.get('DA'))) ?? da;

  const kids = await ctx.doc.resolve(dict.get('Kids'));
  const kidRefs = Array.isArray(kids) ? kids.filter((k): k is PdfRef => k instanceof PdfRef) : [];
  // Kids that are fields (have /T) are walked; kids without /T are this field's widgets.
  const kidDicts = await Promise.all(kidRefs.map((k) => ctx.doc.dict(k)));
  const fieldKids = kidRefs.filter((_, i) => kidDicts[i]?.has('T'));
  if (fieldKids.length) {
    for (const k of fieldKids) await walk(ctx, k, name, own, ownDa);
    return;
  }
  const widgetRefs = kidRefs.length ? kidRefs : [node]; // no kids: a merged field/widget
  if (!name || !own.FT) return;
  await addField(ctx, node, dict, name, own, ownDa, widgetRefs);
}

async function addField(
  ctx: Ctx,
  ref: PdfRef,
  dict: PdfDict,
  name: string,
  inh: Inherited,
  da: string,
  widgetRefs: readonly PdfRef[],
): Promise<void> {
  const ff = inh.Ff ?? 0;
  const kind: FormFieldKind | null =
    inh.FT === 'Tx'
      ? 'text'
      : inh.FT === 'Ch'
        ? ff & FF.combo
          ? 'combo'
          : 'list'
        : inh.FT === 'Sig'
          ? 'signature'
          : inh.FT === 'Btn'
            ? ff & FF.pushButton
              ? 'button'
              : ff & FF.radio
                ? 'radio'
                : 'checkbox'
            : null;
  if (!kind) return;
  const style = await textStyle(ctx, da, inh.Q);

  const widgets: FormWidget[] = [];
  const located: { ref: PdfRef; page: number; index: number }[] = [];
  for (const wref of widgetRefs) {
    const w = await ctx.doc.dict(wref);
    const at = ctx.located.get(wref.key);
    if (!w || !at) continue;
    const rectArr = numbers(await ctx.doc.resolve(w.get('Rect')));
    if (rectArr.length !== 4) continue;
    const mk = await ctx.doc.dict(w.get('MK'));
    const bs = await ctx.doc.dict(w.get('BS'));
    const border = numbers(await ctx.doc.resolve(w.get('Border')));
    const ap = await ctx.doc.dict(w.get('AP'));
    const normal = await ctx.doc.dict(ap?.get('N'));
    const onState = normal ? [...normal.keys()].find((k) => k !== 'Off') : undefined;
    const wDa = text(await ctx.doc.resolve(w.get('DA')));
    widgets.push({
      page: at.page,
      index: at.index,
      rect: ctx.spaces[at.page].rectFromUser(rectArr),
      onState: kind === 'checkbox' || kind === 'radio' ? (onState ?? 'Yes') : undefined,
      borderColor: color(await ctx.doc.resolve(mk?.get('BC'))),
      background: color(await ctx.doc.resolve(mk?.get('BG'))),
      borderWidth: bs?.getNumber('W') ?? (border.length >= 3 ? border[2] : mk?.has('BC') ? 1 : 0),
      caption: text(await ctx.doc.resolve(mk?.get('CA'))),
      appearance: wDa || w.has('Q') ? await textStyle(ctx, wDa ?? da, w.getNumber('Q') ?? inh.Q) : style,
      rotation: mk?.getNumber('R') ?? 0,
    });
    located.push({ ref: wref, page: at.page, index: at.index });
  }
  if (!widgets.length) return;

  // Options: [export, display] pairs or plain strings.
  const options: { value: string; label: string }[] = [];
  if (Array.isArray(inh.Opt)) {
    for (const o of inh.Opt) {
      const item = await ctx.doc.resolve(o);
      if (Array.isArray(item)) options.push({ value: text(item[0]) ?? '', label: text(item[1]) ?? text(item[0]) ?? '' });
      else if (item instanceof PdfString) options.push({ value: item.text(), label: item.text() });
    }
  }
  // Checkbox / radio export values: /Opt lists them in widget order (used when the on-states are 0, 1, 2…).
  const exportValues: Record<string, string> = {};
  widgets.forEach((w, i) => {
    if (w.onState) exportValues[w.onState] = (kind === 'checkbox' || kind === 'radio') && options[i] ? options[i].value : w.onState;
  });

  const value = await readValue(ctx, kind, inh.V, widgetRefs);
  const defaultValue = inh.DV === undefined ? emptyValue(kind) : await readValue(ctx, kind, inh.DV, []);
  const js = async (key: string) => jsText(ctx.doc, inh.AA?.get(key));

  ctx.fields.push({
    name,
    kind,
    tooltip: text(await ctx.doc.resolve(dict.get('TU'))),
    readOnly: (ff & FF.readOnly) !== 0,
    required: (ff & FF.required) !== 0,
    noExport: (ff & FF.noExport) !== 0,
    multiline: kind === 'text' && (ff & FF.multiline) !== 0,
    password: kind === 'text' && (ff & FF.password) !== 0,
    comb: kind === 'text' && (ff & FF.comb) !== 0 && !!inh.MaxLen,
    doNotScroll: (ff & FF.doNotScroll) !== 0,
    maxLength: kind === 'text' && inh.MaxLen ? inh.MaxLen : undefined,
    multiSelect: kind === 'list' && (ff & FF.multiSelect) !== 0,
    editable: kind === 'combo' && (ff & FF.edit) !== 0,
    options: kind === 'checkbox' || kind === 'radio' ? [] : options,
    noToggleToOff: kind === 'radio' && (ff & FF.noToggleToOff) !== 0,
    radiosInUnison: kind === 'radio' && (ff & FF.radiosInUnison) !== 0,
    exportValues,
    value,
    defaultValue,
    widgets,
    style,
    format: kind === 'text' || kind === 'combo' ? (parseFormatAction(await js('F')) ?? parseFormatAction(await js('K'))) : undefined,
    validate: parseValidateAction(await js('V')),
    calculate: parseCalculateAction(await js('C')),
  });
  ctx.sources.set(name, { ref, widgets: located });
}

/** A field value: text, a name (buttons), or an array (multi-select lists). */
async function readValue(ctx: Ctx, kind: FormFieldKind, v: PdfValue | undefined, widgetRefs: readonly PdfRef[]): Promise<FormValue> {
  const value = await ctx.doc.resolve(v);
  if (kind === 'checkbox' || kind === 'radio') {
    if (value instanceof PdfName) return value.value;
    // No /V: the widget whose /AS is on.
    for (const ref of widgetRefs) {
      const as = (await ctx.doc.dict(ref))?.getName('AS');
      if (as && as !== 'Off') return as;
    }
    return 'Off';
  }
  if (kind === 'signature') return value instanceof PdfDict ? 'signed' : ''; // /V is the signature dictionary
  if (kind === 'list') {
    if (Array.isArray(value)) return value.map((x) => text(x) ?? '').filter(Boolean);
    const one = text(value);
    return one ? [one] : [];
  }
  if (value instanceof PdfStream) return new TextDecoder().decode(await decodeStream(value));
  return text(value) ?? (value instanceof PdfName ? value.value : '');
}

async function textStyle(ctx: Ctx, da: string, q: number | undefined): Promise<FormTextStyle> {
  const parsed = parseDefaultAppearance(da);
  const resource = /\/([^\s/]+)\s+[\d.]+\s+Tf/.exec(da)?.[1];
  let font: StandardFont = parsed.font;
  if (resource && ctx.drFonts) {
    const fontDict = await ctx.doc.dict(ctx.drFonts.get(resource));
    const base = fontDict?.getName('BaseFont') ?? '';
    font = /Times|Serif/i.test(base)
      ? 'Times-Roman'
      : /Courier|Mono/i.test(base)
        ? 'Courier'
        : /Bold/i.test(base)
          ? 'Helvetica-Bold'
          : parsed.font;
  }
  const sizeMatch = /([\d.]+)\s+Tf/.exec(da);
  return {
    font,
    fontSize: sizeMatch ? Number(sizeMatch[1]) : parsed.fontSize,
    color: parsed.color ?? '#000000',
    align: q === 1 ? 'center' : q === 2 ? 'right' : 'left',
  };
}

/** The JavaScript of an action (string or stream), or undefined. */
async function jsText(doc: PdfDoc, action: PdfValue | undefined): Promise<string | undefined> {
  const a = await doc.dict(action);
  if (!a || a.getName('S') !== 'JavaScript') return undefined;
  const js = await doc.resolve(a.get('JS'));
  if (js instanceof PdfString) return js.text();
  if (js instanceof PdfStream) return new TextDecoder('latin1').decode(await decodeStream(js));
  return undefined;
}

function text(v: PdfValue | undefined): string | undefined {
  return v instanceof PdfString ? v.text() : undefined;
}

function numbers(v: PdfValue | undefined): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
}

function color(v: PdfValue | undefined): string | undefined {
  const c = numbers(v);
  if (c.length === 1) return rgbToHex(c[0], c[0], c[0]);
  if (c.length === 3) return rgbToHex(c[0], c[1], c[2]);
  if (c.length === 4) return rgbToHex((1 - c[0]) * (1 - c[3]), (1 - c[1]) * (1 - c[3]), (1 - c[2]) * (1 - c[3]));
  return undefined;
}
