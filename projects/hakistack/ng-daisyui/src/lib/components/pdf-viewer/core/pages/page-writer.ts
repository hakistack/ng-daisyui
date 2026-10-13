import { normalizeRotation } from '../geometry';
import { PdfDoc, PdfPageRef } from '../pdf-writer/document';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfString, PdfValue } from '../pdf-writer/objects';
import { saveNew } from '../pdf-writer/save-new';

/**
 * Writes a page layout (see `page-model.ts`) into a document, as part of an
 * incremental update: the page tree becomes one flat `/Kids` list; pages of
 * the document are reused as they are (a moved page is just a reference in
 * a new place), duplicates are new page objects sharing content and
 * resources, pages from other PDFs are deep-copied (resources shared by
 * several of them are copied once), blank pages are new. The form fields of
 * deleted pages leave `/AcroForm`. Rotations are applied separately, after
 * the annotations are written ({@link applyPageRotations}): annotations are
 * placed in the page's space before the rotation the user added.
 */

/** Where a source's pages come from. Source 0 is the document being written. */
export type PdfPageSourceData =
  | { readonly kind: 'pdf'; readonly load: () => Promise<PdfDoc> }
  | { readonly kind: 'blank'; readonly width: number; readonly height: number };

/** One page of the layout, in order. */
export interface PdfLayoutPage {
  readonly source: number;
  readonly index: number;
  /** Rotation added to the page's own (see {@link applyPageRotations}). */
  readonly rotation: number;
  /** A duplicate: written as a new page even when its page is also kept. */
  readonly copy: boolean;
}

export interface PdfPageLayoutChanges {
  readonly pages: readonly PdfLayoutPage[];
  readonly sources: ReadonlyMap<number, PdfPageSourceData>;
  /**
   * `/Annots` indices of a page of the document that the viewer writes
   * itself (its editable annotations, copied on duplicates as annotations of
   * their own): a duplicate leaves these out.
   */
  readonly managedAnnots?: (index: number) => ReadonlySet<number> | undefined;
}

/** Page attributes a page can inherit from its ancestors (§7.7.3.4). */
const INHERITABLE = ['Resources', 'MediaBox', 'CropBox', 'Rotate'] as const;
/** Page entries a copy doesn't keep: tree links, annotations (copied separately), structure, article beads, a stale thumbnail. */
const PAGE_DROPPED = new Set(['Parent', 'Annots', 'StructParents', 'B', 'Thumb']);

/** Apply the layout's order and pages (not its rotations). A layout equal to the document's pages changes nothing. */
export async function applyPageLayout(doc: PdfDoc, layout: PdfPageLayoutChanges): Promise<void> {
  const original = await doc.pages();
  const identity = layout.pages.length === original.length && layout.pages.every((p, i) => p.source === 0 && p.index === i && !p.copy);
  if (identity) return;

  const catalog = await doc.catalog();
  let rootRef = catalog.get('Pages');
  const rootDict = (await doc.dict(rootRef)) ?? new PdfDict({ Type: PdfName.of('Pages') });
  if (!(rootRef instanceof PdfRef)) {
    rootRef = doc.add(rootDict);
    doc.update(doc.trailer.get('Root') as PdfRef, catalog.clone().set('Pages', rootRef));
  }
  const root = rootRef as PdfRef;

  const kids: PdfRef[] = [];
  const kept = new Set<number>();
  const copiers = new Map<number, PageCopier>();
  const fieldRoots: PdfRef[] = [];
  for (const entry of layout.pages) {
    if (entry.source === 0) {
      const page = original[entry.index];
      if (!page) throw new Error(`page ${entry.index + 1} doesn't exist`);
      if (!entry.copy && !kept.has(entry.index)) {
        kept.add(entry.index);
        kids.push(await reparent(doc, page, root));
      } else {
        kids.push(await duplicatePage(doc, page, root, layout.managedAnnots?.(entry.index)));
      }
      continue;
    }
    const source = layout.sources.get(entry.source);
    if (!source) throw new Error(`unknown page source ${entry.source}`);
    if (source.kind === 'blank') {
      kids.push(doc.add(blankPage(source.width, source.height, root)));
      continue;
    }
    let copier = copiers.get(entry.source);
    if (!copier) copiers.set(entry.source, (copier = new PageCopier(await source.load(), doc)));
    kids.push(await copier.copyPage(entry.index, root));
  }
  for (const copier of copiers.values()) fieldRoots.push(...copier.fieldRoots);

  const next = rootDict.clone();
  next.delete('Parent');
  next.set('Type', PdfName.of('Pages'));
  next.set('Kids', kids);
  next.set('Count', kids.length);
  doc.update(root, next);

  const removed = original.filter((_, i) => !kept.has(i));
  await pruneFields(doc, removed);
  if (fieldRoots.length) await addFields(doc, fieldRoots, [...copiers.values()]);
}

/** Add each page's rotation (by position, clockwise) to its `/Rotate`. */
export async function applyPageRotations(doc: PdfDoc, rotations: readonly number[]): Promise<void> {
  if (!rotations.some((r) => normalizeRotation(r) !== 0)) return;
  const pages = await doc.pages();
  for (let i = 0; i < pages.length && i < rotations.length; i++) {
    const delta = normalizeRotation(rotations[i]);
    if (delta === 0) continue;
    const current = await doc.resolve(await doc.inherited(pages[i].dict, 'Rotate'));
    const dict = (await doc.dict(pages[i].ref))!.clone();
    dict.set('Rotate', normalizeRotation((typeof current === 'number' ? current : 0) + delta));
    doc.update(pages[i].ref, dict);
  }
}

/**
 * A new PDF with the pages at `indices` (0-based, in that order) of
 * `bytes`: just the objects they use, their annotations, and the form
 * fields of their widgets. The document information is kept.
 */
export async function extractPages(bytes: Uint8Array, indices: readonly number[], password = ''): Promise<Uint8Array> {
  const source = await PdfDoc.load(bytes, password);
  const out = PdfDoc.create();
  await applyPageLayout(out, {
    pages: indices.map((index) => ({ source: 1, index, rotation: 0, copy: true })),
    sources: new Map([[1, { kind: 'pdf', load: async () => source }]]),
  });
  const info = await source.dict(source.trailer.get('Info'));
  if (info) {
    const copy = new PdfDict();
    for (const [k, v] of info) {
      const value = await source.resolve(v);
      if (value instanceof PdfString || typeof value === 'number' || value instanceof PdfName) copy.set(k, value);
    }
    out.trailer.set('Info', out.add(copy));
  }
  return saveNew(out);
}

/** A one-page PDF of `width` × `height` points with nothing on it (the template blank pages render from). */
export function blankPdf(width: number, height: number): Uint8Array {
  const doc = PdfDoc.create();
  const catalog = doc.trailer.get('Root') as PdfRef;
  const root = (doc.changes.get(catalog.num)!.value as PdfDict).get('Pages') as PdfRef;
  const page = doc.add(blankPage(width, height, root));
  doc.update(root, new PdfDict({ Type: PdfName.of('Pages'), Kids: [page], Count: 1 }));
  return saveNew(doc);
}

function blankPage(width: number, height: number, parent: PdfRef): PdfDict {
  return new PdfDict({
    Type: PdfName.of('Page'),
    Parent: parent,
    MediaBox: [0, 0, round(width), round(height)],
    Resources: new PdfDict(),
    Rotate: 0,
  });
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Hang a kept page directly under the root. A page that was under an
 * intermediate node gets the attributes it inherited from it.
 */
async function reparent(doc: PdfDoc, page: PdfPageRef, root: PdfRef): Promise<PdfRef> {
  const parent = page.dict.get('Parent');
  if (parent instanceof PdfRef && parent.equals(root)) return page.ref;
  const dict = page.dict.clone();
  for (const key of INHERITABLE) {
    if (dict.has(key)) continue;
    const v = await doc.inherited(page.dict, key);
    if (v !== undefined) dict.set(key, v);
  }
  dict.set('Parent', root);
  doc.update(page.ref, dict);
  return page.ref;
}

/**
 * A copy of a page of the same document: content and resources shared,
 * annotations copied (except form widgets, popups and the ones the viewer
 * writes itself), each pointing at the new page.
 */
async function duplicatePage(doc: PdfDoc, page: PdfPageRef, root: PdfRef, managed?: ReadonlySet<number>): Promise<PdfRef> {
  const dict = new PdfDict();
  for (const [k, v] of page.dict) if (!PAGE_DROPPED.has(k)) dict.set(k, v);
  for (const key of INHERITABLE) {
    if (dict.has(key)) continue;
    const v = await doc.inherited(page.dict, key);
    if (v !== undefined) dict.set(key, v);
  }
  dict.set('Parent', root);
  const ref = doc.add(dict);
  const annots = await doc.resolve(page.dict.get('Annots'));
  const copies: PdfRef[] = [];
  if (Array.isArray(annots)) {
    for (let i = 0; i < annots.length; i++) {
      if (managed?.has(i)) continue;
      const a = await doc.dict(annots[i]);
      const subtype = a?.getName('Subtype');
      if (!a || subtype === 'Widget' || subtype === 'Popup') continue;
      const copy = a.clone();
      for (const key of ['Popup', 'Parent', 'IRT', 'StructParent']) copy.delete(key);
      copy.set('P', ref);
      copies.push(doc.add(copy));
    }
  }
  if (copies.length) dict.set('Annots', copies);
  return ref;
}

/**
 * Deep-copies pages from another document. Every object reached is copied
 * once (shared fonts and images stay shared); the copy never follows into
 * other pages (a page reached through a link or an annotation's `/P` becomes
 * null) and drops signature values. Form widgets come with their fields
 * (each field's ancestors, keeping only the copied widgets); the fields'
 * roots are collected in {@link fieldRoots} for `/AcroForm`.
 */
class PageCopier {
  readonly fieldRoots: PdfRef[] = [];
  private readonly memo = new Map<string, PdfRef>();
  private readonly fields = new Map<string, PdfRef>();
  private pages: PdfPageRef[] | null = null;

  constructor(
    readonly source: PdfDoc,
    private readonly target: PdfDoc,
  ) {}

  async copyPage(index: number, parent: PdfRef): Promise<PdfRef> {
    this.pages ??= await this.source.pages();
    const page = this.pages[index];
    if (!page) throw new Error(`the imported document has no page ${index + 1}`);
    const dict = new PdfDict();
    for (const [k, v] of page.dict) {
      if (PAGE_DROPPED.has(k)) continue;
      const value = await this.copy(v);
      if (value !== null) dict.set(k, value);
    }
    for (const key of INHERITABLE) {
      if (dict.has(key)) continue;
      const v = await this.source.inherited(page.dict, key);
      if (v !== undefined) dict.set(key, await this.copy(v));
    }
    if (!dict.has('Rotate')) dict.set('Rotate', 0); // don't inherit the target's
    dict.set('Parent', parent);
    const ref = this.target.add(dict);

    const annots = await this.source.resolve(page.dict.get('Annots'));
    const copies: PdfRef[] = [];
    if (Array.isArray(annots)) {
      // Pre-allocate this page's annotations so popups and replies point at their copies.
      const local = new Map<string, PdfRef>();
      const kept: { src: PdfRef | null; dict: PdfDict; out: PdfRef }[] = [];
      for (const value of annots) {
        const a = await this.source.dict(value);
        if (!a || !(await this.keepAnnotation(a))) continue;
        const out = this.target.add(null);
        if (value instanceof PdfRef) local.set(value.key, out);
        kept.push({ src: value instanceof PdfRef ? value : null, dict: a, out });
      }
      for (const { src, dict: a, out } of kept) {
        const widget = a.getName('Subtype') === 'Widget';
        const copy = new PdfDict();
        for (const [k, v] of a) {
          if (k === 'P' || k === 'StructParent' || (widget && k === 'Parent')) continue;
          const r = v instanceof PdfRef ? local.get(v.key) : undefined;
          const value = r ?? (await this.copy(v));
          if (value !== null) copy.set(k, value);
        }
        copy.set('P', ref);
        this.target.update(out, copy);
        copies.push(out);
        if (widget && src) await this.attachField(a, out);
      }
    }
    if (copies.length) dict.set('Annots', copies);
    return ref;
  }

  /** Links into the source document (destinations and GoTo actions) can't follow the page: they're left out. */
  private async keepAnnotation(a: PdfDict): Promise<boolean> {
    const subtype = a.getName('Subtype');
    if (subtype === 'Popup') return !!(await this.source.dict(a.get('Parent')));
    if (subtype !== 'Link') return true;
    if (a.has('Dest')) return false;
    const action = await this.source.dict(a.get('A'));
    return action?.getName('S') !== 'GoTo';
  }

  /** Give a copied widget its field: copy its ancestors once each, linking `/Parent` and `/Kids` to the copies. */
  private async attachField(widget: PdfDict, widgetCopy: PdfRef): Promise<void> {
    let child = widgetCopy;
    let isField = widget.has('T') || widget.has('FT');
    let parentRef = widget.get('Parent');
    while (parentRef instanceof PdfRef) {
      const existing = this.fields.get(parentRef.key);
      const copy = existing ?? this.target.add(null);
      const childDict = this.target.changes.get(child.num)?.value as PdfDict;
      childDict.set('Parent', copy);
      if (existing) {
        ((this.target.changes.get(existing.num)!.value as PdfDict).get('Kids') as PdfValue[]).push(child);
        return;
      }
      this.fields.set(parentRef.key, copy);
      const parent = await this.source.dict(parentRef);
      const dict = new PdfDict();
      for (const [k, v] of parent ?? new PdfDict()) {
        if (k === 'Kids' || k === 'Parent') continue;
        const value = await this.copy(v);
        if (value !== null) dict.set(k, value);
      }
      dict.set('Kids', [child]);
      this.target.update(copy, dict);
      child = copy;
      isField = true;
      parentRef = parent?.get('Parent');
    }
    if (isField) this.fieldRoots.push(child);
  }

  /** Copy a value, following references into the target. */
  async copy(value: PdfValue): Promise<PdfValue> {
    if (value instanceof PdfRef) return this.copyRef(value);
    if (Array.isArray(value)) return Promise.all(value.map((v) => this.copy(v)));
    if (value instanceof PdfStream) return new PdfStream(await this.copyDict(value.dict, 'Length'), value.data); // /Length is rewritten
    if (value instanceof PdfDict) return isPageNode(value) || isSignatureValue(value) ? null : this.copyDict(value);
    return value;
  }

  private async copyDict(dict: PdfDict, skip?: string): Promise<PdfDict> {
    const out = new PdfDict();
    for (const [k, v] of dict) {
      if (k === skip) continue;
      const c = await this.copy(v);
      if (c !== null) out.set(k, c);
    }
    return out;
  }

  private async copyRef(ref: PdfRef): Promise<PdfValue> {
    const done = this.memo.get(ref.key);
    if (done) return done;
    const value = await this.source.get(ref);
    const dict = value instanceof PdfStream ? value.dict : value instanceof PdfDict ? value : null;
    if (value === null || (dict && (isPageNode(dict) || isSignatureValue(dict)))) return null;
    const out = this.target.add(null); // reserved first: the graph may loop back here
    this.memo.set(ref.key, out);
    this.target.update(out, await this.copy(value));
    return out;
  }
}

function isPageNode(d: PdfDict): boolean {
  const type = d.getName('Type');
  return type === 'Page' || type === 'Pages';
}

function isSignatureValue(d: PdfDict): boolean {
  return d.has('ByteRange') && d.has('Contents');
}

/** Take the form fields whose widgets were all on removed pages out of `/AcroForm`; drop the rest of those widgets from their fields. */
async function pruneFields(doc: PdfDoc, removed: readonly PdfPageRef[]): Promise<void> {
  const widgets = new Set<string>();
  for (const page of removed) {
    const annots = await doc.resolve(page.dict.get('Annots'));
    if (!Array.isArray(annots)) continue;
    for (const a of annots) if (a instanceof PdfRef && (await doc.dict(a))?.getName('Subtype') === 'Widget') widgets.add(a.key);
  }
  if (widgets.size === 0) return;
  const catalog = await doc.catalog();
  const acroValue = catalog.get('AcroForm');
  const acro = await doc.dict(acroValue);
  const fields = await doc.resolve(acro?.get('Fields'));
  if (!acro || !Array.isArray(fields)) return;

  /** The kids that stay; nodes left without kids go too. */
  const prune = async (list: readonly PdfValue[], depth: number): Promise<PdfValue[]> => {
    const out: PdfValue[] = [];
    for (const item of list) {
      if (item instanceof PdfRef && widgets.has(item.key)) continue;
      const node = await doc.dict(item);
      const kids = await doc.resolve(node?.get('Kids'));
      if (node && item instanceof PdfRef && Array.isArray(kids) && kids.length > 0 && depth < 32) {
        const left = await prune(kids, depth + 1);
        if (left.length === 0) continue;
        if (left.length !== kids.length) doc.update(item, node.clone().set('Kids', left));
      }
      out.push(item);
    }
    return out;
  };
  const left = await prune(fields, 0);
  if (left.length === fields.length && left.every((v, i) => v === fields[i])) return;
  await setAcroForm(doc, acroValue, acro.clone().set('Fields', left));
}

/** Add copied fields to `/AcroForm` (created when missing), renaming roots whose name is taken, with the sources' `/DR` fonts and `/DA`. */
async function addFields(doc: PdfDoc, roots: readonly PdfRef[], copiers: readonly PageCopier[]): Promise<void> {
  const catalog = await doc.catalog();
  const acroValue = catalog.get('AcroForm');
  const acro = (await doc.dict(acroValue))?.clone() ?? new PdfDict();
  const fields = [...(((await doc.resolve(acro.get('Fields'))) as PdfValue[] | null) ?? [])];
  const taken = new Set<string>();
  for (const f of fields) {
    const t = (await doc.dict(f))?.get('T');
    if (t instanceof PdfString) taken.add(t.text());
  }
  for (const root of new Set(roots)) {
    const dict = doc.changes.get(root.num)?.value as PdfDict | undefined;
    const t = dict?.get('T');
    if (dict && t instanceof PdfString) {
      let name = t.text();
      for (let n = 2; taken.has(name); n++) name = `${t.text()}_${n}`;
      if (name !== t.text()) dict.set('T', PdfString.text(name));
      taken.add(name);
    }
    fields.push(root);
  }
  acro.set('Fields', fields);

  // Fonts the copied fields' /DA strings name.
  const dr = (await doc.dict(acro.get('DR')))?.clone() ?? new PdfDict();
  const fonts = (await doc.dict(dr.get('Font')))?.clone() ?? new PdfDict();
  for (const copier of copiers) {
    const srcAcro = await copier.source.dict((await copier.source.catalog()).get('AcroForm'));
    if (!srcAcro) continue;
    if (!acro.has('DA') && srcAcro.has('DA')) acro.set('DA', (await copier.copy(srcAcro.get('DA')!)) ?? new PdfString(new Uint8Array()));
    const srcFonts = await copier.source.dict((await copier.source.dict(srcAcro.get('DR')))?.get('Font'));
    for (const [k, v] of srcFonts ?? new PdfDict()) {
      if (fonts.has(k)) continue;
      const font = await copier.copy(v);
      if (font !== null) fonts.set(k, font);
    }
  }
  if (fonts.size) acro.set('DR', dr.set('Font', fonts));
  await setAcroForm(doc, acroValue, acro);
}

async function setAcroForm(doc: PdfDoc, current: PdfValue | undefined, acro: PdfDict): Promise<void> {
  if (current instanceof PdfRef) {
    doc.update(current, acro);
    return;
  }
  const rootRef = doc.trailer.get('Root') as PdfRef;
  doc.update(rootRef, (await doc.catalog()).clone().set('AcroForm', doc.add(acro)));
}
