import { pdfDate } from '../pdf-writer/document';
import type { StandardFont } from '../pdf-writer/standard-fonts';
import {
  HkAnnotation,
  PdfAnnotationReply,
  PdfLineEnding,
  PdfMeasurement,
  PdfRect,
  PdfReviewStatus,
  PdfStampContent,
  isTextMarkup,
  newAnnotationId,
} from './annotation.types';
import { FONT_RESOURCE } from './appearance';
import { parseDefaultAppearance, parsePdfDate } from './annotation-io';
import { PageSpace } from './page-space';
import { hexToRgb, outerBounds, unionRects, withDerivedRect } from './shapes';

/**
 * XFDF (ISO 19444-1) and JSON exchange of annotations. XFDF uses PDF user
 * space, so each page's {@link PageSpace} is needed both ways. What XFDF
 * can't express (stamp contents, measurement scales) travels in attributes
 * of our own namespace, which other readers ignore.
 */

const XFDF_NS = 'http://ns.adobe.com/xfdf/';
export const HK_XFDF_NS = 'https://hakistack.dev/ns/pdf-annotations';

const ELEMENT: Record<HkAnnotation['type'], string> = {
  highlight: 'highlight',
  underline: 'underline',
  strikeout: 'strikeout',
  squiggly: 'squiggly',
  rect: 'square',
  ellipse: 'circle',
  line: 'line',
  polygon: 'polygon',
  polyline: 'polyline',
  ink: 'ink',
  freetext: 'freetext',
  note: 'text',
  stamp: 'stamp',
  link: 'link',
};
const TYPE_OF: Record<string, HkAnnotation['type']> = Object.fromEntries(
  Object.entries(ELEMENT).map(([type, el]) => [el, type as HkAnnotation['type']]),
);

const ENDINGS = new Set<PdfLineEnding>([
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
const STATUSES = new Set<PdfReviewStatus>(['None', 'Accepted', 'Rejected', 'Cancelled', 'Completed']);

// ── XFDF export ─────────────────────────────────────────────────────────────

/** Serialize annotations as an XFDF document. `spaces[page]` maps each page to user space. */
export function exportXfdf(annotations: readonly HkAnnotation[], spaces: readonly PageSpace[], href?: string): string {
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<xfdf xmlns="${XFDF_NS}" xmlns:hk="${HK_XFDF_NS}" xml:space="preserve">`,
    '  <annots>',
  ];
  for (const a of annotations) {
    const space = spaces[a.page];
    if (!space) continue;
    out.push(...annotationElement(a, space).map((line) => `    ${line}`));
    for (const r of a.replies ?? []) out.push(`    ${replyElement(a, r, space)}`);
    if (a.status && a.status !== 'None') out.push(`    ${statusElement(a, space)}`);
  }
  out.push('  </annots>');
  if (href) out.push(`  <f href="${esc(href)}"/>`);
  out.push('</xfdf>');
  return out.join('\n');
}

function annotationElement(a: HkAnnotation, space: PageSpace): string[] {
  const attrs: [string, string | number | undefined][] = [
    ['page', a.page],
    ['rect', nums(space.rectToUser(outerBounds(a)))],
    ['name', a.id],
    ['title', a.author],
    ['subject', a.subject],
    ['date', a.modified ? pdfDate(new Date(a.modified)) : undefined],
    ['creationdate', a.created ? pdfDate(new Date(a.created)) : undefined],
    ['color', a.color.toUpperCase()],
    ['opacity', a.opacity < 1 ? round(a.opacity) : undefined],
    ['flags', a.locked ? 'print,locked' : 'print'],
  ];
  const children: string[] = [];
  const fringe = (inner: PdfRect) => {
    const o = space.rectToUser(outerBounds(a));
    const i = space.rectToUser(inner);
    return nums([i[0] - o[0], i[1] - o[1], o[2] - i[2], o[3] - i[3]].map((v) => Math.max(0, v)));
  };
  const stroke = (width: number, dash?: readonly number[]) => {
    attrs.push(['width', round(width)]);
    if (dash?.length) attrs.push(['style', 'dash'], ['dashes', nums(dash)]);
  };

  if (isTextMarkup(a)) {
    const coords: number[] = [];
    for (const q of a.quads) coords.push(...space.pointsToUser([q.x, q.y, q.x + q.w, q.y, q.x, q.y + q.h, q.x + q.w, q.y + q.h]));
    attrs.push(['coords', nums(coords)]);
  }
  switch (a.type) {
    case 'rect':
    case 'ellipse':
      stroke(a.strokeWidth, a.dash);
      if (a.fill) attrs.push(['interior-color', a.fill.toUpperCase()]);
      if (a.cloudy) attrs.push(['style', 'cloudy'], ['intensity', 1]);
      attrs.push(['fringe', fringe(a.rect)]);
      break;
    case 'line': {
      stroke(a.strokeWidth, a.dash);
      const [x1, y1, x2, y2] = space.pointsToUser(a.points);
      attrs.push(['start', nums([x1, y1])], ['end', nums([x2, y2])], ['head', a.startEnding], ['tail', a.endEnding]);
      if (a.fill) attrs.push(['interior-color', a.fill.toUpperCase()]);
      break;
    }
    case 'polygon':
    case 'polyline':
      stroke(a.strokeWidth, a.dash);
      if (a.fill) attrs.push(['interior-color', a.fill.toUpperCase()]);
      if (a.type === 'polygon' && a.cloudy) attrs.push(['style', 'cloudy'], ['intensity', 1]);
      if (a.type === 'polyline') attrs.push(['head', a.startEnding ?? 'None'], ['tail', a.endEnding ?? 'None']);
      children.push(`<vertices>${points(space.pointsToUser(a.vertices))}</vertices>`);
      break;
    case 'ink':
      stroke(a.strokeWidth);
      children.push('<inklist>', ...a.strokes.map((s) => `  <gesture>${points(space.pointsToUser(s))}</gesture>`), '</inklist>');
      break;
    case 'freetext': {
      stroke(a.strokeWidth);
      attrs.push(['justification', a.align === 'center' ? 1 : a.align === 'right' ? 2 : 0], ['fringe', fringe(a.rect)]);
      if (a.fill) attrs.push(['interior-color', a.fill.toUpperCase()]);
      const [r, g, b] = hexToRgb(a.fontColor).map(round);
      const [sr, sg, sb] = hexToRgb(a.color).map(round);
      children.push(
        `<defaultappearance>/${FONT_RESOURCE[a.font]} ${round(a.fontSize)} Tf ${r} ${g} ${b} rg ${sr} ${sg} ${sb} RG</defaultappearance>`,
      );
      children.push(
        `<defaultstyle>font: ${esc(a.font)} ${round(a.fontSize)}pt; text-align:${a.align}; color:${a.fontColor}</defaultstyle>`,
      );
      break;
    }
    case 'note':
      attrs.push(['icon', a.icon]);
      break;
    case 'stamp':
      attrs.push(['icon', a.name], ['hk:stamp', JSON.stringify(a.stamp)]);
      break;
    case 'link':
      attrs.push(['width', round(a.strokeWidth)]);
      if (a.target.kind === 'uri') {
        children.push('<OnActivation>', `  <Action Trigger="U"><URI Name="${esc(a.target.uri)}"/></Action>`, '</OnActivation>');
      } else {
        children.push(`<Dest><Fit Page="${a.target.page}"/></Dest>`);
      }
      break;
  }
  const m = 'measure' in a ? a.measure : undefined;
  if (m) attrs.push(['hk:measure', JSON.stringify(m)]);
  if (a.contents && a.type !== 'link') children.push(`<contents>${esc(a.contents)}</contents>`);

  const head = `<${ELEMENT[a.type]} ${attrString(attrs)}`;
  if (!children.length) return [`${head}/>`];
  return [`${head}>`, ...children.map((c) => `  ${c}`), `</${ELEMENT[a.type]}>`];
}

function threadAttrs(a: HkAnnotation, space: PageSpace): [string, string | number | undefined][] {
  const box = outerBounds(a);
  return [
    ['page', a.page],
    ['rect', nums(space.rectToUser({ x: box.x, y: box.y, w: Math.min(20, box.w), h: Math.min(20, box.h) }))],
    ['inreplyto', a.id],
    ['color', a.color.toUpperCase()],
    ['flags', 'print,nozoom,norotate'],
  ];
}

function replyElement(a: HkAnnotation, r: PdfAnnotationReply, space: PageSpace): string {
  const attrs = [
    ...threadAttrs(a, space),
    ['name', r.id],
    ['title', r.author],
    ['date', r.modified ? pdfDate(new Date(r.modified)) : undefined],
    ['creationdate', r.created ? pdfDate(new Date(r.created)) : undefined],
    ['replyType', 'reply'],
  ] as [string, string | number | undefined][];
  return `<text ${attrString(attrs)}><contents>${esc(r.contents)}</contents></text>`;
}

function statusElement(a: HkAnnotation, space: PageSpace): string {
  const attrs = [
    ...threadAttrs(a, space),
    ['name', `${a.id}-status`],
    ['title', a.author],
    ['date', a.modified ? pdfDate(new Date(a.modified)) : undefined],
    ['state', a.status],
    ['statemodel', 'Review'],
  ] as [string, string | number | undefined][];
  return `<text ${attrString(attrs)}/>`;
}

// ── XFDF import ─────────────────────────────────────────────────────────────

/**
 * Parse an XFDF document into annotations for the pages `spaces` describes
 * (annotations on other pages are skipped). Replies and review states attach
 * to the annotation they answer. Requires a DOM `DOMParser`.
 */
export function importXfdf(xml: string, spaces: readonly PageSpace[]): HkAnnotation[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('invalid XFDF');
  const annots = Array.from(doc.getElementsByTagNameNS('*', 'annots')).flatMap((a) => Array.from(a.children));
  const out = new Map<string, HkAnnotation>();
  const thread: Element[] = [];
  for (const el of annots) {
    if (el.localName === 'text' && el.getAttribute('inreplyto')) {
      thread.push(el);
      continue;
    }
    const a = fromElement(el, spaces);
    if (a) out.set(a.id, a);
  }
  for (const el of thread) {
    const parent = out.get(el.getAttribute('inreplyto') ?? '');
    if (!parent) continue;
    const state = el.getAttribute('state') as PdfReviewStatus | null;
    if (state) {
      if (STATUSES.has(state)) out.set(parent.id, { ...parent, status: state === 'None' ? undefined : state });
      continue;
    }
    const reply: PdfAnnotationReply = {
      id: el.getAttribute('name') || newAnnotationId(),
      author: el.getAttribute('title') ?? '',
      contents: childText(el, 'contents') ?? '',
      created: parsePdfDate(el.getAttribute('creationdate') ?? undefined),
      modified: parsePdfDate(el.getAttribute('date') ?? undefined),
    };
    out.set(parent.id, { ...parent, replies: [...(parent.replies ?? []), reply] });
  }
  return [...out.values()];
}

function fromElement(el: Element, spaces: readonly PageSpace[]): HkAnnotation | null {
  const type = TYPE_OF[el.localName];
  const page = Number(el.getAttribute('page'));
  const space = spaces[page];
  const rectAttr = numList(el.getAttribute('rect'));
  if (!type || !space || rectAttr.length !== 4) return null;
  const outer = space.rectFromUser(rectAttr);
  const attr = (name: string) => el.getAttribute(name) ?? undefined;
  const width = Number(attr('width') ?? 1);
  const dash = attr('style') === 'dash' ? numList(attr('dashes') ?? '3') : undefined;
  const cloudy = attr('style') === 'cloudy' || undefined;
  const fill = attr('interior-color') ? attr('interior-color')!.toLowerCase() : null;
  const inner = (): PdfRect => {
    const f = numList(attr('fringe') ?? '');
    if (f.length !== 4) return outer;
    const [x0, y0, x1, y1] = [
      Math.min(rectAttr[0], rectAttr[2]),
      Math.min(rectAttr[1], rectAttr[3]),
      Math.max(rectAttr[0], rectAttr[2]),
      Math.max(rectAttr[1], rectAttr[3]),
    ];
    return space.rectFromUser([x0 + f[0], y0 + f[1], x1 - f[2], y1 - f[3]]);
  };
  const ending = (name: string): PdfLineEnding => {
    const v = attr(name) as PdfLineEnding | undefined;
    return v && ENDINGS.has(v) ? v : 'None';
  };
  let measure: PdfMeasurement | undefined;
  try {
    const raw = el.getAttributeNS(HK_XFDF_NS, 'measure');
    measure = raw ? (JSON.parse(raw) as PdfMeasurement) : undefined;
  } catch {
    measure = undefined;
  }
  const flags = (attr('flags') ?? '').split(',');
  const common = {
    id: attr('name') || newAnnotationId(),
    page,
    rect: outer,
    color: (attr('color') ?? '#000000').toLowerCase(),
    opacity: Number(attr('opacity') ?? 1),
    author: attr('title'),
    subject: attr('subject'),
    contents: childText(el, 'contents'),
    created: parsePdfDate(attr('creationdate')),
    modified: parsePdfDate(attr('date')),
    locked: flags.includes('locked') || flags.includes('readonly') || undefined,
  };

  switch (type) {
    case 'highlight':
    case 'underline':
    case 'strikeout':
    case 'squiggly': {
      const c = numList(attr('coords') ?? '');
      const quads: PdfRect[] = [];
      for (let i = 0; i + 7 < c.length; i += 8) quads.push(boundsOf(space.pointsFromUser(c.slice(i, i + 8))));
      return withDerivedRect({ ...common, type, quads: quads.length ? quads : [outer] });
    }
    case 'rect':
    case 'ellipse':
      return { ...common, type, rect: inner(), strokeWidth: width, fill, dash, cloudy, measure };
    case 'line': {
      const [x1, y1] = space.pointsFromUser(numList(attr('start') ?? ''));
      const [x2, y2] = space.pointsFromUser(numList(attr('end') ?? ''));
      if ([x1, y1, x2, y2].some((v) => !Number.isFinite(v))) return null;
      return withDerivedRect({
        ...common,
        type,
        points: [x1, y1, x2, y2],
        strokeWidth: width,
        startEnding: ending('head'),
        endEnding: ending('tail'),
        fill,
        dash,
        measure,
      });
    }
    case 'polygon':
    case 'polyline': {
      const vertices = space.pointsFromUser(pointList(childText(el, 'vertices') ?? ''));
      if (vertices.length < 4) return null;
      if (type === 'polygon') return withDerivedRect({ ...common, type, vertices, strokeWidth: width, fill, dash, cloudy, measure });
      const [head, tail] = [ending('head'), ending('tail')];
      const none = head === 'None' && tail === 'None';
      return withDerivedRect({
        ...common,
        type,
        vertices,
        strokeWidth: width,
        fill,
        dash,
        startEnding: none ? undefined : head,
        endEnding: none ? undefined : tail,
        measure,
      });
    }
    case 'ink': {
      const strokes = Array.from(el.getElementsByTagNameNS('*', 'gesture'))
        .map((g) => space.pointsFromUser(pointList(g.textContent ?? '')))
        .filter((s) => s.length >= 2);
      return strokes.length ? withDerivedRect({ ...common, type, strokes, strokeWidth: width }) : null;
    }
    case 'freetext': {
      const da = parseDefaultAppearance(childText(el, 'defaultappearance') ?? '');
      const j = Number(attr('justification') ?? 0);
      return {
        ...common,
        type,
        rect: inner(),
        color: da.strokeColor ?? '#000000',
        font: da.font as StandardFont,
        fontSize: da.fontSize,
        fontColor: da.color ?? '#000000',
        align: j === 1 ? 'center' : j === 2 ? 'right' : 'left',
        strokeWidth: attr('width') === undefined ? 0 : width,
        fill,
      };
    }
    case 'note':
      return { ...common, type, icon: attr('icon') ?? 'Note' };
    case 'stamp': {
      const name = attr('icon') ?? 'Draft';
      let stamp: PdfStampContent;
      try {
        stamp = JSON.parse(el.getAttributeNS(HK_XFDF_NS, 'stamp') ?? '') as PdfStampContent;
      } catch {
        // A stamp from another editor: show its name as a text stamp.
        stamp = { kind: 'text', text: name.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(), shape: 'rounded' };
      }
      return { ...common, type, name, stamp };
    }
    case 'link': {
      const uri = el.getElementsByTagNameNS('*', 'URI')[0]?.getAttribute('Name');
      const fit = el.getElementsByTagNameNS('*', 'Dest')[0]?.firstElementChild?.getAttribute('Page');
      const target = uri ? ({ kind: 'uri', uri } as const) : fit != null ? ({ kind: 'page', page: Number(fit) } as const) : null;
      return target ? { ...common, type, target, strokeWidth: attr('width') === undefined ? 0 : width, contents: undefined } : null;
    }
  }
}

// ── JSON ────────────────────────────────────────────────────────────────────

const JSON_FORMAT = 'hk-pdf-annotations';

/** Annotations as JSON (lossless: image stamps included). */
export function exportAnnotationsJson(annotations: readonly HkAnnotation[]): string {
  return JSON.stringify({ format: JSON_FORMAT, version: 1, annotations }, null, 2);
}

/** Parse {@link exportAnnotationsJson} output (or a bare array of annotations). */
export function importAnnotationsJson(json: string): HkAnnotation[] {
  const data = JSON.parse(json) as { format?: string; annotations?: unknown } | unknown[];
  const list = Array.isArray(data) ? data : data.format === JSON_FORMAT ? data.annotations : null;
  if (!Array.isArray(list)) throw new Error('not an annotation export');
  return list.filter(
    (a): a is HkAnnotation =>
      !!a &&
      typeof a === 'object' &&
      typeof (a as HkAnnotation).type === 'string' &&
      typeof (a as HkAnnotation).page === 'number' &&
      !!(a as HkAnnotation).rect,
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function attrString(attrs: readonly [string, string | number | undefined][]): string {
  return attrs
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}="${esc(String(v))}"`)
    .join(' ');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\r?\n/g, '&#10;');
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function nums(v: readonly number[]): string {
  return v.map(round).join(',');
}

function points(v: readonly number[]): string {
  const out: string[] = [];
  for (let i = 0; i + 1 < v.length; i += 2) out.push(`${round(v[i])},${round(v[i + 1])}`);
  return out.join(';');
}

function numList(s: string | null | undefined): number[] {
  return (s ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function pointList(s: string): number[] {
  return s
    .split(';')
    .flatMap((p) => p.split(','))
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n));
}

function childText(el: Element, name: string): string | undefined {
  const child = Array.from(el.children).find((c) => c.localName === name);
  return child ? (child.textContent ?? '') : undefined;
}

function boundsOf(p: readonly number[]): PdfRect {
  const rects: PdfRect[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) rects.push({ x: p[i], y: p[i + 1], w: 0, h: 0 });
  return unionRects(rects);
}
