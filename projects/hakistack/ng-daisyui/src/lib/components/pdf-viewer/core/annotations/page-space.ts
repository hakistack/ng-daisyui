import type { PdfRect } from './annotation.types';

/** `[a, b, c, d, e, f]`: maps `(x, y)` to `(a·x + c·y + e, b·x + d·y + f)`. */
export type PdfMatrix = readonly [number, number, number, number, number, number];

/**
 * The mapping between a page's displayed space (points, top-left origin, the
 * page's `/Rotate` applied: what PDFium renders and the viewer shows) and its
 * PDF user space (bottom-left origin, unrotated).
 *
 * `box` is the visible page box (the CropBox clipped to the MediaBox) in user
 * space; `rotate` the page's `/Rotate` (a multiple of 90).
 */
export class PageSpace {
  /** Displayed size in points. */
  readonly width: number;
  readonly height: number;
  /** Maps "display-up" coordinates (top-left origin flipped to bottom-left) to user space. */
  readonly matrix: PdfMatrix;

  constructor(
    readonly box: readonly [number, number, number, number],
    readonly rotate: number,
  ) {
    const [x0, y0, x1, y1] = box;
    const r = ((rotate % 360) + 360) % 360;
    const quarter = r === 90 || r === 270;
    this.width = quarter ? y1 - y0 : x1 - x0;
    this.height = quarter ? x1 - x0 : y1 - y0;
    // Display-up (dx right, dy up) → user. The page is shown turned clockwise by `r`.
    this.matrix =
      r === 90 ? [0, 1, -1, 0, x1, y0] : r === 180 ? [-1, 0, 0, -1, x1, y1] : r === 270 ? [0, -1, 1, 0, x0, y1] : [1, 0, 0, 1, x0, y0];
  }

  /** Displayed point (top-left origin) → user space. */
  toUser(x: number, y: number): [number, number] {
    const [a, b, c, d, e, f] = this.matrix;
    const dy = this.height - y;
    return [a * x + c * dy + e, b * x + d * dy + f];
  }

  /** User-space point → displayed point (top-left origin). */
  toDisplay(ux: number, uy: number): [number, number] {
    const [a, b, c, d, e, f] = this.matrix;
    // Invert the rotation part (orthonormal: the inverse is the transpose).
    const tx = ux - e;
    const ty = uy - f;
    const dx = a * tx + b * ty;
    const dy = c * tx + d * ty;
    return [dx, this.height - dy];
  }

  /** A displayed rect → user-space `[llx, lly, urx, ury]`. */
  rectToUser(r: PdfRect): [number, number, number, number] {
    const [ax, ay] = this.toUser(r.x, r.y);
    const [bx, by] = this.toUser(r.x + r.w, r.y + r.h);
    return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
  }

  /** A user-space rect (any corner order) → displayed rect. */
  rectFromUser(rect: readonly number[]): PdfRect {
    const [ax, ay] = this.toDisplay(rect[0], rect[1]);
    const [bx, by] = this.toDisplay(rect[2], rect[3]);
    return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
  }

  /** Flat displayed points → flat user-space points. */
  pointsToUser(points: readonly number[]): number[] {
    const out: number[] = [];
    for (let i = 0; i + 1 < points.length; i += 2) out.push(...this.toUser(points[i], points[i + 1]));
    return out;
  }

  /** Flat user-space points → flat displayed points. */
  pointsFromUser(points: readonly number[]): number[] {
    const out: number[] = [];
    for (let i = 0; i + 1 < points.length; i += 2) out.push(...this.toDisplay(points[i], points[i + 1]));
    return out;
  }
}

/** Normalize a rectangle array to `[llx, lly, urx, ury]`. */
export function normalizeBox(v: readonly number[]): [number, number, number, number] {
  return [Math.min(v[0], v[2]), Math.min(v[1], v[3]), Math.max(v[0], v[2]), Math.max(v[1], v[3])];
}

/**
 * The visible page box PDFium uses for a page's size and rendering: the
 * CropBox intersected with the MediaBox, or the MediaBox when the CropBox is
 * missing or doesn't overlap it.
 */
export function visibleBox(
  mediaBox: readonly number[] | undefined,
  cropBox: readonly number[] | undefined,
): [number, number, number, number] {
  const media = mediaBox && mediaBox.length === 4 ? normalizeBox(mediaBox) : ([0, 0, 612, 792] as [number, number, number, number]);
  if (!cropBox || cropBox.length !== 4) return media;
  const crop = normalizeBox(cropBox);
  const box: [number, number, number, number] = [
    Math.max(media[0], crop[0]),
    Math.max(media[1], crop[1]),
    Math.min(media[2], crop[2]),
    Math.min(media[3], crop[3]),
  ];
  return box[2] > box[0] && box[3] > box[1] ? box : media;
}
