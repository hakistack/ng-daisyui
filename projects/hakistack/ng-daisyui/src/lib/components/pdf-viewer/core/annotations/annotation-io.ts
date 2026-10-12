import { PdfDoc, PdfPageRef, pdfDate } from '../pdf-writer/document';
import { saveIncremental } from '../pdf-writer/incremental';
import { PdfDict, PdfName, PdfRef, PdfString, PdfValue } from '../pdf-writer/objects';
import type { StandardFont } from '../pdf-writer/standard-fonts';
import {
  HkAnnotation,
  PdfAnnotationReply,
  PdfLineEnding,
  PdfRect,
  PdfReviewStatus,
  PdfTextMarkupType,
  isTextMarkup,
  newAnnotationId,
} from './annotation.types';
import { FONT_RESOURCE, buildAppearance, emptyAppearance } from './appearance';
import { PageSpace, visibleBox } from './page-space';
import { outerBounds, rgbToHex, hexToRgb, unionRects, withDerivedRect } from './shapes';

/** An annotation read from the file, with where it lives in its page's `/Annots`. */
export interface ImportedAnnotation {
  readonly annotation: HkAnnotation;
  /** Index in the page's `/Annots` array (also PDFium's annotation index). */
  readonly index: number;
  /** Indices of its thread: replies and review-state annotations (`/IRT`). */
  readonly threadIndices: readonly number[];
  /** Index of its `/Popup`, if any. */
  readonly popupIndex?: number;
}

export interface ImportedPage {
  readonly annotations: readonly ImportedAnnotation[];
  /** Annotation indices the viewer draws itself: hide them in the page raster. */
  readonly managedIndices: readonly number[];
}

const SUBTYPES: Record<string, HkAnnotation['type']> = {
  Highlight: 'highlight',
  Underline: 'underline',
  StrikeOut: 'strikeout',
  Squiggly: 'squiggly',
  Square: 'rect',
  Circle: 'ellipse',
  Line: 'line',
  Polygon: 'polygon',
  PolyLine: 'polyline',
  Ink: 'ink',
  FreeText: 'freetext',
  Text: 'note',
};

const SUBTYPE_OF: Record<HkAnnotation['type'], string> = {
  highlight: 'Highlight',
  underline: 'Underline',
  strikeout: 'StrikeOut',
  squiggly: 'Squiggly',
  rect: 'Square',
  ellipse: 'Circle',
  line: 'Line',
  polygon: 'Polygon',
  polyline: 'PolyLine',
  ink: 'Ink',
  freetext: 'FreeText',
  note: 'Text',
};

const LINE_ENDINGS = new Set<PdfLineEnding>([
  'None',
  'Square',
  'Circle',
  'Diamond',
  'OpenArrow',
  'ClosedArrow',
  'Butt',
  'ROpenArrow',
  'RClosedArrow',
  'Slash',
]);
const REVIEW_STATES = new Set<PdfReviewStatus>(['None', 'Accepted', 'Rejected', 'Cancelled', 'Completed']);

/** Annotation flags (§12.5.3). */
const FLAG_HIDDEN = 2;
const FLAG_PRINT = 4;
const FLAG_NO_ZOOM = 8;
const FLAG_NO_ROTATE = 16;
const FLAG_NO_VIEW = 32;
const FLAG_LOCKED = 128;

// ── Reading ─────────────────────────────────────────────────────────────────

/** The display ↔ user mapping of a page. */
export async function pageSpace(doc: PdfDoc, page: PdfDict): Promise<PageSpace> {
  const media = numbers(await doc.resolve(await doc.inherited(page, 'MediaBox')));
  const crop = numbers(await doc.resolve(await doc.inherited(page, 'CropBox')));
  const rotate = await doc.resolve(await doc.inherited(page, 'Rotate'));
  return new PageSpace(
    visibleBox(media.length === 4 ? media : undefined, crop.length === 4 ? crop : undefined),
    typeof rotate === 'number' ? rotate : 0,
  );
}

/**
 * Read the annotations the viewer edits, page by page. Kept read-only (left
 * to the page raster) are: other subtypes, hidden ones, measurement and
 * callout variants (until those tools exist), and anything grouped with
 * another annotation. Replies and review states attach to their parent.
 */
export async function readAnnotations(doc: PdfDoc): Promise<ImportedPage[]> {
  const pages = await doc.pages();
  const usedIds = new Set<string>();
  const out: ImportedPage[] = [];
  for (let p = 0; p < pages.length; p++) out.push(await readPage(doc, pages[p], p, usedIds));
  return out;
}

interface RawAnnot {
  readonly index: number;
  readonly ref: PdfRef | null;
  readonly dict: PdfDict;
  readonly subtype: string;
}

async function readPage(doc: PdfDoc, page: PdfPageRef, pageIndex: number, usedIds: Set<string>): Promise<ImportedPage> {
  const list = await doc.resolve(page.dict.get('Annots'));
  if (!Array.isArray(list) || list.length === 0) return { annotations: [], managedIndices: [] };
  const space = await pageSpace(doc, page.dict);

  const raw: RawAnnot[] = [];
  for (let i = 0; i < list.length; i++) {
    const dict = await doc.dict(list[i]);
    if (dict)
      raw.push({ index: i, ref: list[i] instanceof PdfRef ? (list[i] as PdfRef) : null, dict, subtype: dict.getName('Subtype') ?? '' });
  }
  const byRef = new Map<string, RawAnnot>();
  for (const r of raw) if (r.ref) byRef.set(r.ref.key, r);
  const parentOf = (r: RawAnnot): RawAnnot | undefined => {
    const irt = r.dict.get('IRT');
    return irt instanceof PdfRef ? byRef.get(irt.key) : undefined;
  };
  /** Thread members resolve to the root they reply to (replies to replies included). */
  const rootOf = (r: RawAnnot): RawAnnot => {
    let cur = r;
    for (let depth = 0; depth < 16; depth++) {
      const parent = parentOf(cur);
      if (!parent) return cur;
      cur = parent;
    }
    return cur;
  };

  const grouped = new Set<RawAnnot>();
  const threads = new Map<RawAnnot, RawAnnot[]>();
  const popups = new Map<RawAnnot, number>();
  for (const r of raw) {
    if (r.subtype === 'Popup') {
      const parent = r.dict.get('Parent');
      const owner = parent instanceof PdfRef ? byRef.get(parent.key) : undefined;
      if (owner) popups.set(owner, r.index);
      continue;
    }
    if (!parentOf(r)) continue;
    if (r.dict.getName('RT') === 'Group') {
      grouped.add(rootOf(r));
      continue;
    }
    const root = rootOf(r);
    threads.set(root, [...(threads.get(root) ?? []), r]);
  }

  const annotations: ImportedAnnotation[] = [];
  const managed: number[] = [];
  for (const r of raw) {
    if (parentOf(r) || grouped.has(r) || !isEditable(r)) continue;
    const thread = threads.get(r) ?? [];
    const base = toModel(r, thread, pageIndex, space, usedIds);
    if (!base) continue;
    annotations.push({ annotation: base, index: r.index, threadIndices: thread.map((t) => t.index), popupIndex: popups.get(r) });
    managed.push(r.index, ...thread.map((t) => t.index));
  }
  return { annotations, managedIndices: managed.sort((a, b) => a - b) };
}

function isEditable(r: RawAnnot): boolean {
  if (!(r.subtype in SUBTYPES)) return false;
  const flags = r.dict.getNumber('F') ?? 0;
  if (flags & (FLAG_HIDDEN | FLAG_NO_VIEW)) return false;
  if (r.dict.has('Measure')) return false;
  const intent = r.dict.getName('IT');
  if (r.subtype === 'FreeText' && (intent === 'FreeTextCallout' || r.dict.has('CL'))) return false;
  if (r.subtype === 'Line' && (r.dict.has('LL') || intent === 'LineDimension')) return false;
  if ((r.subtype === 'Polygon' || r.subtype === 'PolyLine') && intent?.endsWith('Dimension')) return false;
  if (r.subtype === 'Text' && r.dict.has('State')) return false; // an orphaned review state
  return true;
}

function toModel(r: RawAnnot, thread: readonly RawAnnot[], page: number, space: PageSpace, usedIds: Set<string>): HkAnnotation | null {
  const d = r.dict;
  const type = SUBTYPES[r.subtype];
  let id = text(d.get('NM'));
  if (!id || usedIds.has(id)) id = newAnnotationId();
  usedIds.add(id);

  const rectArr = numbers(d.get('Rect'));
  if (rectArr.length !== 4) return null;
  const outer = space.rectFromUser(rectArr);
  const flags = d.getNumber('F') ?? 0;
  const { width, dash } = border(d);
  const replies: PdfAnnotationReply[] = [];
  let status: PdfReviewStatus | undefined;
  let statusDate = '';
  for (const t of thread) {
    if (t.dict.has('State') || t.dict.has('StateModel')) {
      const state = t.dict.getName('State') as PdfReviewStatus | undefined;
      const when = text(t.dict.get('M')) ?? text(t.dict.get('CreationDate')) ?? '';
      if (state && REVIEW_STATES.has(state) && (t.dict.getName('StateModel') ?? 'Review') === 'Review' && when >= statusDate) {
        status = state;
        statusDate = when;
      }
      continue;
    }
    replies.push({
      id: text(t.dict.get('NM')) || newAnnotationId(),
      author: text(t.dict.get('T')) ?? '',
      contents: text(t.dict.get('Contents')) ?? '',
      created: parsePdfDate(text(t.dict.get('CreationDate'))),
      modified: parsePdfDate(text(t.dict.get('M'))),
    });
  }
  replies.sort((a, b) => (a.created ?? a.modified ?? '').localeCompare(b.created ?? b.modified ?? ''));

  const common = {
    id,
    page,
    color: color(d.get('C')) ?? '#000000',
    opacity: clamp01(d.getNumber('CA') ?? 1),
    author: text(d.get('T')),
    contents: text(d.get('Contents')),
    subject: text(d.get('Subj')),
    created: parsePdfDate(text(d.get('CreationDate'))),
    modified: parsePdfDate(text(d.get('M'))),
    locked: (flags & FLAG_LOCKED) !== 0 || undefined,
    status,
    replies: replies.length ? replies : undefined,
  };
  const inner = (): PdfRect => {
    const rd = numbers(d.get('RD'));
    if (rd.length !== 4) return outer;
    const [x0, y0, x1, y1] = [
      Math.min(rectArr[0], rectArr[2]),
      Math.min(rectArr[1], rectArr[3]),
      Math.max(rectArr[0], rectArr[2]),
      Math.max(rectArr[1], rectArr[3]),
    ];
    return space.rectFromUser([x0 + rd[0], y0 + rd[1], x1 - rd[2], y1 - rd[3]]);
  };
  const cloudy = d.get('BE') instanceof PdfDict && (d.get('BE') as PdfDict).getName('S') === 'C';
  const fill = color(d.get('IC'));

  switch (type) {
    case 'highlight':
    case 'underline':
    case 'strikeout':
    case 'squiggly': {
      const qp = numbers(d.get('QuadPoints'));
      const quads: PdfRect[] = [];
      for (let i = 0; i + 7 < qp.length; i += 8) quads.push(boundsOf(space.pointsFromUser(qp.slice(i, i + 8))));
      return withDerivedRect({ ...common, rect: outer, type: type as PdfTextMarkupType, quads: quads.length ? quads : [outer] });
    }
    case 'rect':
    case 'ellipse':
      if (!d.has('C')) return null; // no border colour and nothing else to edit: leave as is
      return { ...common, type, rect: inner(), strokeWidth: width, fill, dash, cloudy: cloudy || undefined };
    case 'line': {
      const l = numbers(d.get('L'));
      if (l.length !== 4) return null;
      const [x1, y1, x2, y2] = space.pointsFromUser(l);
      const [start, end] = endings(d.get('LE'));
      return withDerivedRect({
        ...common,
        type,
        rect: outer,
        points: [x1, y1, x2, y2],
        strokeWidth: width,
        startEnding: start,
        endEnding: end,
        fill,
        dash,
      });
    }
    case 'polygon':
    case 'polyline': {
      const v = numbers(d.get('Vertices'));
      if (v.length < 4) return null;
      const [start, end] = endings(d.get('LE'));
      const vertices = space.pointsFromUser(v);
      if (type === 'polygon')
        return withDerivedRect({ ...common, type, rect: outer, vertices, strokeWidth: width, fill, dash, cloudy: cloudy || undefined });
      return withDerivedRect({
        ...common,
        type,
        rect: outer,
        vertices,
        strokeWidth: width,
        fill,
        dash,
        startEnding: start,
        endEnding: end,
      });
    }
    case 'ink': {
      const list = d.get('InkList');
      const strokes = Array.isArray(list) ? list.map((s) => space.pointsFromUser(numbers(s))).filter((s) => s.length >= 2) : [];
      if (!strokes.length) return null;
      return withDerivedRect({ ...common, type, rect: outer, strokes, strokeWidth: width });
    }
    case 'freetext': {
      const da = parseDefaultAppearance(text(d.get('DA')) ?? '');
      const q = d.getNumber('Q') ?? 0;
      return {
        ...common,
        type,
        rect: inner(),
        color: da.strokeColor ?? '#000000',
        font: da.font,
        fontSize: da.fontSize,
        fontColor: da.color ?? '#000000',
        align: q === 1 ? 'center' : q === 2 ? 'right' : 'left',
        strokeWidth: d.has('BS') || d.has('Border') ? width : 0,
        fill: fill ?? color(d.get('C')),
      };
    }
    case 'note':
      return { ...common, type, rect: outer, color: color(d.get('C')) ?? '#ffd400', icon: d.getName('Name') ?? 'Note' };
  }
}

/** Border width and dash from `/BS` (or the legacy `/Border`). */
function border(d: PdfDict): { width: number; dash?: number[] } {
  const bs = d.get('BS');
  if (bs instanceof PdfDict) {
    const width = bs.getNumber('W') ?? 1;
    const dash = bs.getName('S') === 'D' ? numbers(bs.get('D')) : undefined;
    return { width, dash: dash ? (dash.length ? dash : [3]) : undefined };
  }
  const b = d.get('Border'); // [hRadius vRadius width dash?]
  if (Array.isArray(b) && typeof b[2] === 'number') return { width: b[2], dash: Array.isArray(b[3]) ? numbers(b[3]) : undefined };
  return { width: 1 };
}

function endings(v: PdfValue | undefined): [PdfLineEnding, PdfLineEnding] {
  const names = Array.isArray(v) ? v.map((x) => (x instanceof PdfName ? (x.value as PdfLineEnding) : 'None')) : [];
  const pick = (n: PdfLineEnding | undefined): PdfLineEnding => (n && LINE_ENDINGS.has(n) ? n : 'None');
  return [pick(names[0]), pick(names[1])];
}

/** Font, size and colours from a `/DA` string such as `/Helv 12 Tf 0 0 1 rg`. */
export function parseDefaultAppearance(da: string): { font: StandardFont; fontSize: number; color?: string; strokeColor?: string } {
  const tokens = da.trim().split(/\s+/);
  let font: StandardFont = 'Helvetica';
  let fontSize = 12;
  let fill: string | undefined;
  let stroke: string | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const nums = (n: number) => tokens.slice(i - n, i).map(Number);
    switch (tokens[i]) {
      case 'Tf': {
        const name = tokens[i - 2] ?? '';
        fontSize = Number(tokens[i - 1]) || 12;
        font = /HeBo|Bold/i.test(name)
          ? 'Helvetica-Bold'
          : /TiRo|Times/i.test(name)
            ? 'Times-Roman'
            : /Cour/i.test(name)
              ? 'Courier'
              : 'Helvetica';
        break;
      }
      case 'g':
        fill = rgbToHex(nums(1)[0], nums(1)[0], nums(1)[0]);
        break;
      case 'rg':
        fill = rgbToHex(...(nums(3) as [number, number, number]));
        break;
      case 'k':
        fill = cmykToHex(nums(4));
        break;
      case 'G':
        stroke = rgbToHex(nums(1)[0], nums(1)[0], nums(1)[0]);
        break;
      case 'RG':
        stroke = rgbToHex(...(nums(3) as [number, number, number]));
        break;
      case 'K':
        stroke = cmykToHex(nums(4));
        break;
    }
  }
  return { font, fontSize: fontSize > 0 ? fontSize : 12, color: fill, strokeColor: stroke };
}

// ── Writing ─────────────────────────────────────────────────────────────────

/** Where an imported annotation came from, tracked across edits until save. */
export type AnnotationBaseline = ReadonlyMap<string, ImportedAnnotation>;

/**
 * Write the difference between the imported annotations (`baseline`) and the
 * current ones as an incremental update of `bytes`: changed annotations get
 * new versions of their objects, new ones are appended to their page's
 * `/Annots`, deleted ones (with their popup and thread) are removed. Every
 * written annotation carries a generated appearance. Unchanged annotations
 * aren't touched, and nothing is written when nothing changed.
 */
export async function writeAnnotationChanges(
  bytes: Uint8Array,
  baseline: AnnotationBaseline,
  current: readonly HkAnnotation[],
  now = new Date(),
): Promise<Uint8Array> {
  const doc = await PdfDoc.load(bytes);
  const pages = await doc.pages();
  const byPage = new Map<number, HkAnnotation[]>();
  for (const a of current) byPage.set(a.page, [...(byPage.get(a.page) ?? []), a]);
  const baseByPage = new Map<number, ImportedAnnotation[]>();
  for (const b of baseline.values()) baseByPage.set(b.annotation.page, [...(baseByPage.get(b.annotation.page) ?? []), b]);

  let empty: PdfRef | null = null;
  const emptyAp = () => (empty ??= doc.add(emptyAppearance()));

  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    const cur = byPage.get(p) ?? [];
    const base = baseByPage.get(p) ?? [];
    const curIds = new Set(cur.map((a) => a.id));
    const deleted = base.filter((b) => !curIds.has(b.annotation.id));
    const changed = cur.filter((a) => {
      const b = baseline.get(a.id);
      return !b || b.annotation.page !== p || !sameAnnotation(b.annotation, a);
    });
    if (!deleted.length && !changed.length) continue;

    const space = await pageSpace(doc, page.dict);
    const annotsValue = page.dict.get('Annots');
    const resolved = await doc.resolve(annotsValue);
    const annots: PdfValue[] = Array.isArray(resolved) ? [...resolved] : [];
    const removed = new Set<number>();
    const appended: PdfValue[] = [];
    const drop = (indices: readonly number[]) => {
      for (const i of indices) {
        removed.add(i);
        if (annots[i] instanceof PdfRef) doc.delete(annots[i] as PdfRef);
      }
    };

    for (const b of deleted) drop([b.index, ...b.threadIndices, ...(b.popupIndex !== undefined ? [b.popupIndex] : [])]);

    for (const a of changed) {
      const b = baseline.get(a.id);
      const ap = doc.add(buildAppearance(a, space));
      if (b && b.annotation.page === p) {
        const entry = annots[b.index];
        const old = await doc.dict(entry);
        const dict = annotationDict(a, space, page.ref, ap, old, now);
        let ref: PdfRef;
        if (entry instanceof PdfRef) {
          doc.update(entry, dict);
          ref = entry;
        } else {
          ref = doc.add(dict); // a direct dictionary: replies need a reference to point at
          annots[b.index] = ref;
        }
        if (!sameThread(b.annotation, a)) {
          drop(b.threadIndices);
          appended.push(...threadRefs(doc, a, ref, space, page.ref, emptyAp, now));
        }
      } else {
        const ref = doc.add(annotationDict(a, space, page.ref, ap, null, now));
        appended.push(ref, ...threadRefs(doc, a, ref, space, page.ref, emptyAp, now));
      }
    }

    const next = [...annots.filter((_, i) => !removed.has(i)), ...appended];
    if (annotsValue instanceof PdfRef) {
      doc.update(annotsValue, next);
    } else {
      const pageDict = page.dict.clone();
      pageDict.set('Annots', next);
      doc.update(page.ref, pageDict);
    }
  }
  return saveIncremental(doc);
}

/** Keys an annotation's geometry and style regenerate; stale copies are dropped from an edited dictionary. */
const REGENERATED = [
  'AP',
  'AS',
  'QuadPoints',
  'InkList',
  'L',
  'Vertices',
  'LE',
  'IC',
  'BS',
  'Border',
  'BE',
  'RD',
  'DA',
  'DS',
  'RC',
  'Q',
  'CA',
  'C',
];

/** The annotation dictionary for `a`, keeping unknown keys of the old version (`/Popup`, `/StructParent`, …). */
export function annotationDict(a: HkAnnotation, space: PageSpace, pageRef: PdfRef, ap: PdfRef, old: PdfDict | null, now: Date): PdfDict {
  const d = old?.clone() ?? new PdfDict();
  for (const key of REGENERATED) d.delete(key);
  const outer = outerBounds(a);
  const rect = space.rectToUser(outer);
  const oldFlags = old?.getNumber('F') ?? 0;
  const flags = ((oldFlags & ~(FLAG_HIDDEN | FLAG_LOCKED)) | FLAG_PRINT | (a.locked ? FLAG_LOCKED : 0)) >>> 0;

  d.set('Type', PdfName.of('Annot'));
  d.set('Subtype', PdfName.of(SUBTYPE_OF[a.type]));
  d.set('Rect', rect);
  d.set('NM', PdfString.text(a.id));
  d.set('P', pageRef);
  d.set('F', flags);
  setText(d, 'T', a.author);
  setText(d, 'Contents', a.contents);
  setText(d, 'Subj', a.subject);
  d.set('M', PdfString.text(pdfDate(a.modified ? new Date(a.modified) : now)));
  if (a.created) d.set('CreationDate', PdfString.text(pdfDate(new Date(a.created))));
  else if (!d.has('CreationDate')) d.set('CreationDate', PdfString.text(pdfDate(now)));
  if (a.opacity < 1) d.set('CA', a.opacity);
  d.set('AP', new PdfDict({ N: ap }));

  const bs = (width: number, dash?: readonly number[]) =>
    new PdfDict(dash?.length ? { W: width, S: PdfName.of('D'), D: [...dash] } : { W: width, S: PdfName.of('S') });
  const rd = (inner: PdfRect) => {
    const i = space.rectToUser(inner);
    return [i[0] - rect[0], i[1] - rect[1], rect[2] - i[2], rect[3] - i[3]].map((v) => Math.max(0, round(v)));
  };
  const cloud = () => new PdfDict({ S: PdfName.of('C'), I: 1 });

  if (isTextMarkup(a)) {
    d.set('C', rgb(a.color));
    const qp: number[] = [];
    for (const q of a.quads) qp.push(...space.pointsToUser([q.x, q.y, q.x + q.w, q.y, q.x, q.y + q.h, q.x + q.w, q.y + q.h]).map(round));
    d.set('QuadPoints', qp);
    return d;
  }
  switch (a.type) {
    case 'rect':
    case 'ellipse':
      d.set('C', rgb(a.color));
      d.set('BS', bs(a.strokeWidth, a.dash));
      if (a.fill) d.set('IC', rgb(a.fill));
      if (a.cloudy) d.set('BE', cloud());
      d.set('RD', rd(a.rect));
      break;
    case 'line':
      d.set('C', rgb(a.color));
      d.set('BS', bs(a.strokeWidth, a.dash));
      d.set('L', space.pointsToUser(a.points).map(round));
      d.set('LE', [PdfName.of(a.startEnding), PdfName.of(a.endEnding)]);
      if (a.fill) d.set('IC', rgb(a.fill));
      break;
    case 'polygon':
    case 'polyline':
      d.set('C', rgb(a.color));
      d.set('BS', bs(a.strokeWidth, a.dash));
      d.set('Vertices', space.pointsToUser(a.vertices).map(round));
      if (a.fill) d.set('IC', rgb(a.fill));
      if (a.type === 'polygon' && a.cloudy) d.set('BE', cloud());
      if (a.type === 'polyline') d.set('LE', [PdfName.of(a.startEnding ?? 'None'), PdfName.of(a.endEnding ?? 'None')]);
      break;
    case 'ink':
      d.set('C', rgb(a.color));
      d.set('BS', bs(a.strokeWidth));
      d.set(
        'InkList',
        a.strokes.map((s) => space.pointsToUser(s).map(round)),
      );
      break;
    case 'freetext': {
      const [r, g, b] = hexToRgb(a.fontColor);
      const [sr, sg, sb] = hexToRgb(a.color);
      d.set(
        'DA',
        PdfString.text(
          `/${FONT_RESOURCE[a.font]} ${round(a.fontSize)} Tf ${round(r)} ${round(g)} ${round(b)} rg ${round(sr)} ${round(sg)} ${round(sb)} RG`,
        ),
      );
      d.set('DS', PdfString.text(`font: ${a.font} ${round(a.fontSize)}pt; text-align:${a.align}; color:${a.fontColor}`));
      d.set('Q', a.align === 'center' ? 1 : a.align === 'right' ? 2 : 0);
      d.set('BS', bs(a.strokeWidth));
      // Acrobat reads the background from /C; PDF 2.0 readers from /IC.
      if (a.fill) {
        d.set('C', rgb(a.fill));
        d.set('IC', rgb(a.fill));
      }
      d.set('RD', rd(a.rect));
      break;
    }
    case 'note':
      d.set('C', rgb(a.color));
      d.set('Name', PdfName.of(a.icon));
      d.set('F', (flags | FLAG_NO_ZOOM | FLAG_NO_ROTATE) >>> 0);
      if (!d.has('Open')) d.set('Open', false);
      break;
  }
  return d;
}

/** Replies and the review state of `a`, as new Text annotations replying to `parent`. They never paint. */
function threadRefs(
  doc: PdfDoc,
  a: HkAnnotation,
  parent: PdfRef,
  space: PageSpace,
  pageRef: PdfRef,
  emptyAp: () => PdfRef,
  now: Date,
): PdfRef[] {
  const box = outerBounds(a);
  const rect = space.rectToUser({ x: box.x, y: box.y, w: Math.min(20, box.w), h: Math.min(20, box.h) });
  const base = (
    id: string,
    author: string | undefined,
    contents: string | undefined,
    modified: string | undefined,
    created: string | undefined,
  ) => {
    const d = new PdfDict({
      Type: PdfName.of('Annot'),
      Subtype: PdfName.of('Text'),
      Rect: rect,
      NM: PdfString.text(id),
      P: pageRef,
      IRT: parent,
      F: FLAG_PRINT | FLAG_NO_ZOOM | FLAG_NO_ROTATE,
      C: rgb(a.color),
      M: PdfString.text(pdfDate(modified ? new Date(modified) : now)),
      CreationDate: PdfString.text(pdfDate(created ? new Date(created) : now)),
      AP: new PdfDict({ N: emptyAp() }),
      Open: false,
    });
    setText(d, 'T', author);
    setText(d, 'Contents', contents);
    return d;
  };
  const refs = (a.replies ?? []).map((r) => doc.add(base(r.id, r.author, r.contents, r.modified, r.created)));
  if (a.status && a.status !== 'None') {
    const d = base(newAnnotationId(), a.author, `${a.status}`, a.modified, undefined);
    d.set('State', PdfName.of(a.status));
    d.set('StateModel', PdfName.of('Review'));
    refs.push(doc.add(d));
  }
  return refs;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Deep equality of two annotations (key order ignored). */
export function sameAnnotation(a: HkAnnotation, b: HkAnnotation): boolean {
  return stableJson(a) === stableJson(b);
}

function sameThread(a: HkAnnotation, b: HkAnnotation): boolean {
  return (a.status ?? 'None') === (b.status ?? 'None') && stableJson(a.replies ?? []) === stableJson(b.replies ?? []);
}

function stableJson(v: unknown): string {
  return JSON.stringify(v, (_, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([, x]) => x !== undefined)
            .sort(([x], [y]) => x.localeCompare(y)),
        )
      : value,
  );
}

function numbers(v: PdfValue | undefined): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
}

function text(v: PdfValue | undefined): string | undefined {
  return v instanceof PdfString ? v.text() : undefined;
}

function setText(d: PdfDict, key: string, value: string | undefined): void {
  if (value) d.set(key, PdfString.text(value));
  else d.delete(key);
}

/** `/C`-style colour arrays (gray, RGB or CMYK) → `#rrggbb`; `null` for none / transparent. */
function color(v: PdfValue | undefined): string | null {
  const c = numbers(v);
  if (c.length === 1) return rgbToHex(c[0], c[0], c[0]);
  if (c.length === 3) return rgbToHex(c[0], c[1], c[2]);
  if (c.length === 4) return cmykToHex(c);
  return null;
}

function cmykToHex([c, m, y, k]: number[]): string {
  return rgbToHex((1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k));
}

function rgb(hex: string): number[] {
  return hexToRgb(hex).map(round);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function boundsOf(points: readonly number[]): PdfRect {
  const rects: PdfRect[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) rects.push({ x: points[i], y: points[i + 1], w: 0, h: 0 });
  return unionRects(rects);
}

/** A PDF date (`D:YYYYMMDDHHmmSS+HH'mm'`, trailing parts optional) → ISO 8601, or undefined. */
export function parsePdfDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const m = /^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+-])?(\d{2})?'?(\d{2})?'?/.exec(s.trim());
  if (!m) return undefined;
  const [, y, mo = '01', d = '01', h = '00', mi = '00', se = '00', tz, th = '00', tm = '00'] = m;
  const offset = !tz || tz === 'Z' || tz === 'z' ? 'Z' : `${tz}${th}:${tm}`;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}${offset}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
