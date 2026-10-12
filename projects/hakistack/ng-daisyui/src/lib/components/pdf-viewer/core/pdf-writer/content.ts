import { formatNumber, serializeValue } from './serialize';
import { PdfName, PdfString } from './objects';

/** An RGB colour with channels in 0–1. */
export type Rgb = readonly [r: number, g: number, b: number];

/** Bézier control-point factor for approximating a quarter circle (4/3 · (√2 − 1)). */
const KAPPA = 0.5522847498;

/**
 * Builds a content stream (§8–9): path construction and painting, colour,
 * graphics state, and text. Operators are appended in call order; numbers are
 * formatted without exponents. Used for annotation appearance streams and
 * widget appearances.
 */
export class ContentBuilder {
  private readonly ops: string[] = [];

  private op(operator: string, ...operands: (number | string)[]): this {
    this.ops.push([...operands.map((o) => (typeof o === 'number' ? formatNumber(o) : o)), operator].join(' '));
    return this;
  }

  // Graphics state
  save(): this {
    return this.op('q');
  }
  restore(): this {
    return this.op('Q');
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): this {
    return this.op('cm', a, b, c, d, e, f);
  }
  lineWidth(w: number): this {
    return this.op('w', w);
  }
  /** Dash pattern (`[3 2] 0 d`); an empty array means solid. */
  dash(pattern: readonly number[], phase = 0): this {
    return this.op('d', `[${pattern.map(formatNumber).join(' ')}]`, phase);
  }
  lineCap(cap: 0 | 1 | 2): this {
    return this.op('J', cap);
  }
  lineJoin(join: 0 | 1 | 2): this {
    return this.op('j', join);
  }
  /** Apply a named ExtGState from the resources (e.g. for opacity). */
  extGState(resourceName: string): this {
    return this.op('gs', serializeValue(PdfName.of(resourceName)));
  }
  strokeColor([r, g, b]: Rgb): this {
    return this.op('RG', r, g, b);
  }
  fillColor([r, g, b]: Rgb): this {
    return this.op('rg', r, g, b);
  }

  // Paths
  moveTo(x: number, y: number): this {
    return this.op('m', x, y);
  }
  lineTo(x: number, y: number): this {
    return this.op('l', x, y);
  }
  curveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this {
    return this.op('c', x1, y1, x2, y2, x3, y3);
  }
  closePath(): this {
    return this.op('h');
  }
  rect(x: number, y: number, w: number, h: number): this {
    return this.op('re', x, y, w, h);
  }
  /** An ellipse inscribed in the box, as four Bézier curves. */
  ellipse(x: number, y: number, w: number, h: number): this {
    const rx = w / 2;
    const ry = h / 2;
    const cx = x + rx;
    const cy = y + ry;
    const ox = rx * KAPPA;
    const oy = ry * KAPPA;
    return this.moveTo(cx + rx, cy)
      .curveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry)
      .curveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy)
      .curveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry)
      .curveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy)
      .closePath();
  }
  /** A polyline through flat `[x0, y0, x1, y1, …]` points. */
  polyline(points: readonly number[], close = false): this {
    if (points.length < 2) return this;
    this.moveTo(points[0], points[1]);
    for (let i = 2; i + 1 < points.length; i += 2) this.lineTo(points[i], points[i + 1]);
    return close ? this.closePath() : this;
  }
  stroke(): this {
    return this.op('S');
  }
  fill(): this {
    return this.op('f');
  }
  fillAndStroke(): this {
    return this.op('B');
  }
  /** End the path without painting (used after a clip). */
  endPath(): this {
    return this.op('n');
  }
  clip(): this {
    return this.op('W');
  }

  // Text
  beginText(): this {
    return this.op('BT');
  }
  endText(): this {
    return this.op('ET');
  }
  font(resourceName: string, size: number): this {
    return this.op('Tf', serializeValue(PdfName.of(resourceName)), size);
  }
  textPosition(x: number, y: number): this {
    return this.op('Td', x, y);
  }
  leading(l: number): this {
    return this.op('TL', l);
  }
  showText(text: string): this {
    return this.op('Tj', serializeValue(PdfString.text(text)));
  }
  /** Move to the next line and show text (`'`). */
  nextLineShowText(text: string): this {
    return this.op("'", serializeValue(PdfString.text(text)));
  }

  /** Append raw operators (trusted, already-formatted content). */
  raw(content: string): this {
    this.ops.push(content);
    return this;
  }

  toString(): string {
    return this.ops.join('\n');
  }

  toBytes(): Uint8Array {
    return new TextEncoder().encode(this.toString());
  }
}
