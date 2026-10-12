import { StandardFont, textWidth, wrapText } from '../pdf-writer/standard-fonts';
import type { HkAnnotation, PdfLineEnding, PdfRect } from './annotation.types';

/**
 * Annotation geometry as a small display list in displayed page space
 * (points, top-left origin). The same list drives every backend: the SVG
 * layer on screen, Canvas2D for thumbnails, and the `/AP` appearance stream
 * written to the file, so what is seen is what is saved.
 */

export type PathSeg =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

export interface StrokeStyle {
  readonly color: string;
  readonly width: number;
  readonly dash?: readonly number[];
  readonly cap: 'butt' | 'round' | 'square';
  readonly join: 'miter' | 'round' | 'bevel';
}

export interface PathOp {
  readonly kind: 'path';
  readonly segs: readonly PathSeg[];
  readonly stroke?: StrokeStyle;
  readonly fill?: string;
  readonly opacity: number;
  /** Highlights multiply with the page, so text under them stays legible. */
  readonly blend?: 'multiply';
}

export interface TextLine {
  readonly text: string;
  /** Left end of the baseline. */
  readonly x: number;
  readonly y: number;
}

export interface TextOp {
  readonly kind: 'text';
  readonly lines: readonly TextLine[];
  readonly font: StandardFont;
  readonly fontSize: number;
  readonly color: string;
  readonly opacity: number;
  readonly clip: PdfRect;
}

export type DrawOp = PathOp | TextOp;

/** Padding between a free-text box's border and its text, in points. */
export const FREE_TEXT_PADDING = 2;
/** Default size of a note icon, in points. */
export const NOTE_ICON_SIZE = 20;
/** Radius of a cloudy border's bumps, in points (intensity 1). */
const CLOUD_RADIUS = 5;
/** Bézier control-point factor for a quarter circle. */
const KAPPA = 0.5522847498;

// ── Display list ────────────────────────────────────────────────────────────

/** The display list for an annotation. */
export function annotationOps(a: HkAnnotation): DrawOp[] {
  const opacity = a.opacity;
  switch (a.type) {
    case 'highlight':
      return [{ kind: 'path', segs: a.quads.flatMap(rectSegs), fill: a.color, opacity, blend: 'multiply' }];
    case 'underline':
    case 'strikeout':
    case 'squiggly': {
      const type = a.type;
      return a.quads.map((q) => markupLine(type, q, a.color, opacity));
    }
    case 'rect':
    case 'ellipse': {
      const inset = a.strokeWidth / 2;
      const box = {
        x: a.rect.x + inset,
        y: a.rect.y + inset,
        w: Math.max(0, a.rect.w - a.strokeWidth),
        h: Math.max(0, a.rect.h - a.strokeWidth),
      };
      let segs: PathSeg[];
      if (a.cloudy) segs = cloudSegs(a.type === 'rect' ? rectPoints(box) : ellipsePoints(box, 24), CLOUD_RADIUS);
      else segs = a.type === 'rect' ? rectSegs(box) : ellipseSegs(box);
      return [shapePath(segs, a.color, a.strokeWidth, a.fill, opacity, a.dash)];
    }
    case 'line': {
      const [x1, y1, x2, y2] = a.points;
      const ops: DrawOp[] = [
        shapePath(
          [
            ['M', x1, y1],
            ['L', x2, y2],
          ],
          a.color,
          a.strokeWidth,
          null,
          opacity,
          a.dash,
        ),
      ];
      ops.push(...endingOps(a.startEnding, [x1, y1], [x2, y2], a.color, a.strokeWidth, a.fill, opacity));
      ops.push(...endingOps(a.endEnding, [x2, y2], [x1, y1], a.color, a.strokeWidth, a.fill, opacity));
      return ops;
    }
    case 'polygon':
    case 'polyline': {
      const v = a.vertices;
      if (v.length < 4) return [];
      if (a.type === 'polygon') {
        const segs = a.cloudy ? cloudSegs(v, CLOUD_RADIUS) : polySegs(v, true);
        return [shapePath(segs, a.color, a.strokeWidth, a.fill, opacity, a.dash)];
      }
      const n = v.length;
      const ops: DrawOp[] = [shapePath(polySegs(v, false), a.color, a.strokeWidth, null, opacity, a.dash)];
      ops.push(...endingOps(a.startEnding ?? 'None', [v[0], v[1]], [v[2], v[3]], a.color, a.strokeWidth, a.fill, opacity));
      ops.push(...endingOps(a.endEnding ?? 'None', [v[n - 2], v[n - 1]], [v[n - 4], v[n - 3]], a.color, a.strokeWidth, a.fill, opacity));
      return ops;
    }
    case 'ink':
      return [
        {
          kind: 'path',
          segs: a.strokes.flatMap(smoothSegs),
          stroke: { color: a.color, width: a.strokeWidth, cap: 'round', join: 'round' },
          opacity,
        },
      ];
    case 'freetext': {
      const ops: DrawOp[] = [];
      const inset = a.strokeWidth / 2;
      const box = {
        x: a.rect.x + inset,
        y: a.rect.y + inset,
        w: Math.max(0, a.rect.w - a.strokeWidth),
        h: Math.max(0, a.rect.h - a.strokeWidth),
      };
      if (a.fill || a.strokeWidth > 0) ops.push(shapePath(rectSegs(box), a.color, a.strokeWidth, a.fill, opacity));
      ops.push({ kind: 'text', ...layoutFreeText(a), color: a.fontColor, opacity });
      return ops;
    }
    case 'note':
      return noteIconOps(a.rect, a.color, opacity);
  }
}

/** Free-text layout: wrapped lines with baselines, clipped to the box. */
export function layoutFreeText(a: {
  rect: PdfRect;
  contents?: string;
  font: StandardFont;
  fontSize: number;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
}): Omit<TextOp, 'kind' | 'color' | 'opacity'> {
  const pad = FREE_TEXT_PADDING + a.strokeWidth;
  const inner = { x: a.rect.x + pad, y: a.rect.y + pad, w: Math.max(1, a.rect.w - 2 * pad), h: Math.max(1, a.rect.h - 2 * pad) };
  const lineHeight = a.fontSize * 1.16;
  const lines = wrapText(a.contents ?? '', a.font, a.fontSize, inner.w).map((text, i) => {
    const width = textWidth(text, a.font, a.fontSize);
    const x = a.align === 'center' ? inner.x + (inner.w - width) / 2 : a.align === 'right' ? inner.x + inner.w - width : inner.x;
    return { text, x, y: inner.y + a.fontSize * 0.8 + i * lineHeight };
  });
  return { lines, font: a.font, fontSize: a.fontSize, clip: a.rect };
}

function shapePath(segs: PathSeg[], color: string, width: number, fill: string | null, opacity: number, dash?: readonly number[]): PathOp {
  return {
    kind: 'path',
    segs,
    stroke: width > 0 ? { color, width, dash: dash?.length ? dash : undefined, cap: 'butt', join: 'miter' } : undefined,
    fill: fill ?? undefined,
    opacity,
  };
}

/** Underline / strikeout / squiggly line for one quad; thickness follows the text height. */
function markupLine(type: 'underline' | 'strikeout' | 'squiggly', q: PdfRect, color: string, opacity: number): PathOp {
  const width = Math.max(0.5, q.h / 14);
  let segs: PathSeg[];
  if (type === 'underline') {
    const y = q.y + q.h - width / 2;
    segs = [
      ['M', q.x, y],
      ['L', q.x + q.w, y],
    ];
  } else if (type === 'strikeout') {
    const y = q.y + q.h * 0.52;
    segs = [
      ['M', q.x, y],
      ['L', q.x + q.w, y],
    ];
  } else {
    const amp = Math.max(1, q.h / 12);
    const period = amp * 4;
    const base = q.y + q.h - amp;
    segs = [['M', q.x, base]];
    for (let x = q.x, up = true; x < q.x + q.w; x += period / 2, up = !up) {
      segs.push(['L', Math.min(x + period / 2, q.x + q.w), up ? base - amp : base + amp]);
    }
  }
  return { kind: 'path', segs, stroke: { color, width, cap: 'butt', join: 'round' }, opacity };
}

// ── Path helpers ────────────────────────────────────────────────────────────

export function rectSegs(r: PdfRect): PathSeg[] {
  return [['M', r.x, r.y], ['L', r.x + r.w, r.y], ['L', r.x + r.w, r.y + r.h], ['L', r.x, r.y + r.h], ['Z']];
}

function rectPoints(r: PdfRect): number[] {
  return [r.x, r.y, r.x + r.w, r.y, r.x + r.w, r.y + r.h, r.x, r.y + r.h];
}

export function ellipseSegs(r: PdfRect): PathSeg[] {
  const rx = r.w / 2;
  const ry = r.h / 2;
  const cx = r.x + rx;
  const cy = r.y + ry;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    ['M', cx + rx, cy],
    ['C', cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry],
    ['C', cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy],
    ['C', cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry],
    ['C', cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy],
    ['Z'],
  ];
}

function ellipsePoints(r: PdfRect, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push(r.x + r.w / 2 + (Math.cos(t) * r.w) / 2, r.y + r.h / 2 + (Math.sin(t) * r.h) / 2);
  }
  return out;
}

function polySegs(v: readonly number[], close: boolean): PathSeg[] {
  const segs: PathSeg[] = [['M', v[0], v[1]]];
  for (let i = 2; i + 1 < v.length; i += 2) segs.push(['L', v[i], v[i + 1]]);
  if (close) segs.push(['Z']);
  return segs;
}

/** A stroke through its points, smoothed with Catmull-Rom splines (a single point is a dot). */
export function smoothSegs(p: readonly number[]): PathSeg[] {
  const n = Math.floor(p.length / 2);
  if (n === 0) return [];
  if (n === 1)
    return [
      ['M', p[0], p[1]],
      ['L', p[0], p[1]],
    ];
  if (n === 2)
    return [
      ['M', p[0], p[1]],
      ['L', p[2], p[3]],
    ];
  const pt = (i: number): [number, number] => {
    const k = Math.max(0, Math.min(n - 1, i)) * 2;
    return [p[k], p[k + 1]];
  };
  const segs: PathSeg[] = [['M', p[0], p[1]]];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pt(i - 1);
    const [x1, y1] = pt(i);
    const [x2, y2] = pt(i + 1);
    const [x3, y3] = pt(i + 2);
    segs.push(['C', x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2]);
  }
  return segs;
}

/**
 * A cloudy border around a closed polygon: evenly spaced semicircular bumps
 * along the perimeter, bulging outward.
 */
export function cloudSegs(v: readonly number[], radius: number): PathSeg[] {
  const n = Math.floor(v.length / 2);
  if (n < 3) return polySegs(v, true);
  const lengths: number[] = [];
  let perimeter = 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const len = Math.hypot(v[j * 2] - v[i * 2], v[j * 2 + 1] - v[i * 2 + 1]);
    lengths.push(len);
    perimeter += len;
    area += v[i * 2] * v[j * 2 + 1] - v[j * 2] * v[i * 2 + 1];
  }
  if (perimeter === 0) return [];
  const count = Math.max(3, Math.round(perimeter / (radius * 2)));
  const step = perimeter / count;
  const pointAt = (dist: number): [number, number] => {
    let d = dist % perimeter;
    for (let i = 0; i < n; i++) {
      if (d <= lengths[i] || i === n - 1) {
        const j = (i + 1) % n;
        const t = lengths[i] === 0 ? 0 : Math.min(1, d / lengths[i]);
        return [v[i * 2] + (v[j * 2] - v[i * 2]) * t, v[i * 2 + 1] + (v[j * 2 + 1] - v[i * 2 + 1]) * t];
      }
      d -= lengths[i];
    }
    return [v[0], v[1]];
  };
  const sign = area > 0 ? 1 : -1; // y-down: positive area turns clockwise on screen
  const start = pointAt(0);
  const segs: PathSeg[] = [['M', start[0], start[1]]];
  let prev = start;
  for (let k = 1; k <= count; k++) {
    const next = pointAt(k * step);
    const cx = next[0] - prev[0];
    const cy = next[1] - prev[1];
    const len = Math.hypot(cx, cy) || 1;
    const ox = ((sign * cy) / len) * (len / 2) * (4 / 3);
    const oy = ((sign * -cx) / len) * (len / 2) * (4 / 3);
    segs.push(['C', prev[0] + ox, prev[1] + oy, next[0] + ox, next[1] + oy, next[0], next[1]]);
    prev = next;
  }
  segs.push(['Z']);
  return segs;
}

/** Size of a line ending for a stroke width. */
export function endingSize(strokeWidth: number): number {
  return 6 + strokeWidth * 3;
}

/** The ops for a line ending drawn at `tip`, for a line coming from `from`. */
function endingOps(
  ending: PdfLineEnding,
  tip: [number, number],
  from: [number, number],
  color: string,
  strokeWidth: number,
  fill: string | null,
  opacity: number,
): PathOp[] {
  if (ending === 'None') return [];
  const segs = endingSegs(ending, tip, from, endingSize(strokeWidth));
  if (!segs) return [];
  const closed = segs.some((s) => s[0] === 'Z');
  return [
    {
      kind: 'path',
      segs,
      stroke: { color, width: Math.max(strokeWidth, 0.5), cap: 'butt', join: 'miter' },
      fill: closed ? (fill ?? undefined) : undefined,
      opacity,
    },
  ];
}

export function endingSegs(ending: PdfLineEnding, tip: [number, number], from: [number, number], size: number): PathSeg[] | null {
  let dx = tip[0] - from[0];
  let dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    dx = 1;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }
  const nx = -dy;
  const ny = dx;
  const [tx, ty] = tip;
  const rot = (deg: number, s: number): [number, number] => {
    const r = (deg * Math.PI) / 180;
    return [(dx * Math.cos(r) - dy * Math.sin(r)) * s, (dx * Math.sin(r) + dy * Math.cos(r)) * s];
  };
  const half = size / 2;
  switch (ending) {
    case 'OpenArrow':
    case 'ClosedArrow': {
      const [ax, ay] = rot(30, size);
      const [bx, by] = rot(-30, size);
      const segs: PathSeg[] = [
        ['M', tx - ax, ty - ay],
        ['L', tx, ty],
        ['L', tx - bx, ty - by],
      ];
      if (ending === 'ClosedArrow') segs.push(['Z']);
      return segs;
    }
    case 'ROpenArrow':
    case 'RClosedArrow': {
      const [ax, ay] = rot(30, size);
      const [bx, by] = rot(-30, size);
      const segs: PathSeg[] = [
        ['M', tx + ax, ty + ay],
        ['L', tx, ty],
        ['L', tx + bx, ty + by],
      ];
      if (ending === 'RClosedArrow') segs.push(['Z']);
      return segs;
    }
    case 'Circle':
      return ellipseSegs({ x: tx - half, y: ty - half, w: size, h: size });
    case 'Square':
      return [
        ['M', tx + (dx + nx) * half, ty + (dy + ny) * half],
        ['L', tx + (dx - nx) * half, ty + (dy - ny) * half],
        ['L', tx + (-dx - nx) * half, ty + (-dy - ny) * half],
        ['L', tx + (-dx + nx) * half, ty + (-dy + ny) * half],
        ['Z'],
      ];
    case 'Diamond':
      return [
        ['M', tx + dx * half, ty + dy * half],
        ['L', tx + nx * half, ty + ny * half],
        ['L', tx - dx * half, ty - dy * half],
        ['L', tx - nx * half, ty - ny * half],
        ['Z'],
      ];
    case 'Butt':
      return [
        ['M', tx + nx * half, ty + ny * half],
        ['L', tx - nx * half, ty - ny * half],
      ];
    case 'Slash': {
      const r = (60 * Math.PI) / 180;
      const sx = (dx * Math.cos(r) - dy * Math.sin(r)) * half;
      const sy = (dx * Math.sin(r) + dy * Math.cos(r)) * half;
      return [
        ['M', tx + sx, ty + sy],
        ['L', tx - sx, ty - sy],
      ];
    }
    default:
      return null;
  }
}

/** A speech-bubble icon filling `r`, with three text lines. */
function noteIconOps(r: PdfRect, color: string, opacity: number): DrawOp[] {
  const s = Math.min(r.w, r.h) / NOTE_ICON_SIZE;
  const x = r.x;
  const y = r.y;
  const p = (px: number, py: number): [number, number] => [x + px * s, y + py * s];
  const k = 2 * KAPPA;
  const bubble: PathSeg[] = [
    ['M', ...p(3, 1)],
    ['L', ...p(17, 1)],
    ['C', ...p(17 + k, 1), ...p(19, 3 - k), ...p(19, 3)],
    ['L', ...p(19, 12)],
    ['C', ...p(19, 12 + k), ...p(17 + k, 14), ...p(17, 14)],
    ['L', ...p(9, 14)],
    ['L', ...p(4, 19)],
    ['L', ...p(5, 14)],
    ['L', ...p(3, 14)],
    ['C', ...p(3 - k, 14), ...p(1, 12 + k), ...p(1, 12)],
    ['L', ...p(1, 3)],
    ['C', ...p(1, 3 - k), ...p(3 - k, 1), ...p(3, 1)],
    ['Z'],
  ];
  const lines: PathSeg[] = [];
  for (const ly of [4.5, 7.5, 10.5]) lines.push(['M', ...p(4.5, ly)], ['L', ...p(15.5, ly)]);
  const ink = '#1f2937';
  return [
    { kind: 'path', segs: bubble, fill: color, stroke: { color: ink, width: 0.75 * s, cap: 'round', join: 'round' }, opacity },
    { kind: 'path', segs: lines, stroke: { color: ink, width: 0.9 * s, cap: 'round', join: 'round' }, opacity },
  ];
}

// ── Bounds and transforms ───────────────────────────────────────────────────

export function unionRects(rects: readonly PdfRect[]): PdfRect {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Bounding box of flat points. */
export function pointsBounds(points: readonly number[]): PdfRect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < points.length; i += 2) {
    x0 = Math.min(x0, points[i]);
    y0 = Math.min(y0, points[i + 1]);
    x1 = Math.max(x1, points[i]);
    y1 = Math.max(y1, points[i + 1]);
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
}

/** Bounds of a display list, strokes included (control points count, so it's conservative). */
export function opsBounds(ops: readonly DrawOp[]): PdfRect | null {
  const rects: PdfRect[] = [];
  for (const op of ops) {
    if (op.kind === 'text') {
      rects.push(op.clip);
      continue;
    }
    const pts: number[] = [];
    for (const s of op.segs) if (s[0] !== 'Z') pts.push(...(s.slice(1) as number[]));
    if (pts.length === 0) continue;
    const b = pointsBounds(pts);
    const pad = op.stroke ? op.stroke.width / 2 : 0;
    rects.push({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad });
  }
  return rects.length ? unionRects(rects) : null;
}

/** The annotation's `/Rect`: everything it paints, plus its selection box, rounded outward. */
export function outerBounds(a: HkAnnotation): PdfRect {
  if (a.type === 'note') return a.rect; // the icon is drawn inset within its box
  const painted = opsBounds(annotationOps(a));
  const u = painted ? unionRects([painted, a.rect]) : a.rect;
  const x = Math.floor(u.x - 1);
  const y = Math.floor(u.y - 1);
  return { x, y, w: Math.ceil(u.x + u.w + 1) - x, h: Math.ceil(u.y + u.h + 1) - y };
}

/** Recompute `rect` from the geometry for the types whose box is derived. */
export function withDerivedRect<A extends HkAnnotation>(a: A): A {
  switch (a.type) {
    case 'highlight':
    case 'underline':
    case 'strikeout':
    case 'squiggly':
      return { ...a, rect: unionRects(a.quads) };
    case 'line':
      return { ...a, rect: pointsBounds(a.points) };
    case 'polygon':
    case 'polyline':
      return { ...a, rect: pointsBounds(a.vertices) };
    case 'ink':
      return { ...a, rect: pointsBounds(a.strokes.flat()) };
    default:
      return a;
  }
}

const shiftPoints = (p: readonly number[], dx: number, dy: number) => p.map((v, i) => v + (i % 2 === 0 ? dx : dy));
const shiftRect = (r: PdfRect, dx: number, dy: number): PdfRect => ({ ...r, x: r.x + dx, y: r.y + dy });

/** Move an annotation by `(dx, dy)` points. */
export function translateAnnotation<A extends HkAnnotation>(a: A, dx: number, dy: number): A {
  const moved = { ...a, rect: shiftRect(a.rect, dx, dy) };
  switch (moved.type) {
    case 'highlight':
    case 'underline':
    case 'strikeout':
    case 'squiggly':
      return { ...moved, quads: moved.quads.map((q) => shiftRect(q, dx, dy)) } as A;
    case 'line':
      return { ...moved, points: shiftPoints(moved.points, dx, dy) as unknown as [number, number, number, number] } as A;
    case 'polygon':
    case 'polyline':
      return { ...moved, vertices: shiftPoints(moved.vertices, dx, dy) } as A;
    case 'ink':
      return { ...moved, strokes: moved.strokes.map((s) => shiftPoints(s, dx, dy)) } as A;
    default:
      return moved as A;
  }
}

/** Whether the adorner offers resize handles for this annotation. */
export function isResizable(a: HkAnnotation): boolean {
  return a.type !== 'note' && a.type !== 'highlight' && a.type !== 'underline' && a.type !== 'strikeout' && a.type !== 'squiggly';
}

/** Fit an annotation into a new selection box, scaling point geometry. */
export function resizeAnnotation<A extends HkAnnotation>(a: A, to: PdfRect): A {
  if (!isResizable(a)) return a;
  const from = a.rect;
  const sx = from.w > 0 ? to.w / from.w : 1;
  const sy = from.h > 0 ? to.h / from.h : 1;
  const map = (p: readonly number[]) => p.map((v, i) => (i % 2 === 0 ? to.x + (v - from.x) * sx : to.y + (v - from.y) * sy));
  switch (a.type) {
    case 'line':
      return withDerivedRect({ ...a, points: map(a.points) as unknown as [number, number, number, number] });
    case 'polygon':
    case 'polyline':
      return withDerivedRect({ ...a, vertices: map(a.vertices) });
    case 'ink':
      return withDerivedRect({ ...a, strokes: a.strokes.map(map) });
    default:
      return { ...a, rect: to };
  }
}

/** Distance from a point to a polyline (flat points). */
export function distanceToPolyline(x: number, y: number, p: readonly number[]): number {
  if (p.length < 2) return Infinity;
  if (p.length < 4) return Math.hypot(x - p[0], y - p[1]);
  let best = Infinity;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const ax = p[i];
    const ay = p[i + 1];
    const bx = p[i + 2];
    const by = p[i + 3];
    const lx = bx - ax;
    const ly = by - ay;
    const len2 = lx * lx + ly * ly;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * lx + (y - ay) * ly) / len2));
    best = Math.min(best, Math.hypot(x - (ax + t * lx), y - (ay + t * ly)));
  }
  return best;
}

/**
 * Erase around `(x, y)` with `radius`: drop the points it covers and split
 * strokes there. Returns the remaining strokes (possibly none).
 */
export function eraseStrokes(strokes: readonly (readonly number[])[], x: number, y: number, radius: number): number[][] {
  const out: number[][] = [];
  for (const s of strokes) {
    let current: number[] = [];
    for (let i = 0; i + 1 < s.length; i += 2) {
      if (Math.hypot(s[i] - x, s[i + 1] - y) <= radius) {
        if (current.length) out.push(current);
        current = [];
      } else {
        current.push(s[i], s[i + 1]);
      }
    }
    if (current.length) out.push(current);
  }
  return out;
}

// ── Backends ────────────────────────────────────────────────────────────────

/** SVG path data for a list of segments. */
export function svgPath(segs: readonly PathSeg[]): string {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return segs.map((s) => (s[0] === 'Z' ? 'Z' : `${s[0]}${(s.slice(1) as number[]).map(r).join(' ')}`)).join('');
}

/** CSS font family for a standard font. */
export function cssFontFamily(font: StandardFont): string {
  return font.startsWith('Times')
    ? "'Times New Roman', Times, serif"
    : font === 'Courier'
      ? "'Courier New', Courier, monospace"
      : 'Helvetica, Arial, sans-serif';
}

/** Paint a display list on a 2D canvas whose transform already maps points to pixels. */
export function paintOps(ctx: CanvasRenderingContext2D, ops: readonly DrawOp[]): void {
  for (const op of ops) {
    ctx.save();
    ctx.globalAlpha = op.opacity;
    if (op.kind === 'text') {
      ctx.beginPath();
      ctx.rect(op.clip.x, op.clip.y, op.clip.w, op.clip.h);
      ctx.clip();
      ctx.fillStyle = op.color;
      ctx.font = `${op.font === 'Helvetica-Bold' ? 'bold ' : ''}${op.fontSize}px ${cssFontFamily(op.font)}`;
      for (const line of op.lines) ctx.fillText(line.text, line.x, line.y);
    } else {
      if (op.blend === 'multiply') ctx.globalCompositeOperation = 'multiply';
      const path = new Path2D(svgPath(op.segs));
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill(path);
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke.color;
        ctx.lineWidth = op.stroke.width;
        ctx.lineCap = op.stroke.cap;
        ctx.lineJoin = op.stroke.join;
        ctx.setLineDash(op.stroke.dash ? [...op.stroke.dash] : []);
        ctx.stroke(path);
      }
    }
    ctx.restore();
  }
}

/** `#rgb` / `#rrggbb` → channels in 0–1 (black when invalid). */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0;
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

/** Channels in 0–1 → `#rrggbb`. */
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
