/**
 * Turning what the user drew, typed or uploaded into a signature stamp:
 * pure functions over points and pixels (the dialog does the DOM part).
 */

export interface InkSignature {
  /** Per stroke, flat `[x, y, pressure, …]` normalised to 0–1 of the box. */
  readonly strokes: number[][];
  /** Pen width as a fraction of the box height. */
  readonly width: number;
  /** Width ÷ height of the box. */
  readonly aspect: number;
}

/**
 * Fit drawn strokes (`[x, y, pressure, …]` in pad pixels) into their own
 * bounding box, padded by half the pen so round ends aren't clipped.
 * Returns null when nothing was drawn.
 */
export function normalizeInk(strokes: readonly (readonly number[])[], penWidth: number): InkSignature | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of strokes) {
    for (let i = 0; i + 1 < s.length; i += 3) {
      x0 = Math.min(x0, s[i]);
      y0 = Math.min(y0, s[i + 1]);
      x1 = Math.max(x1, s[i]);
      y1 = Math.max(y1, s[i + 1]);
    }
  }
  if (!Number.isFinite(x0)) return null;
  const pad = penWidth / 2;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return {
    strokes: strokes
      .filter((s) => s.length >= 3)
      .map((s) => {
        const out: number[] = [];
        for (let i = 0; i + 1 < s.length; i += 3) out.push(round((s[i] - x0) / w), round((s[i + 1] - y0) / h), round(s[i + 2] ?? 0.5));
        return out;
      }),
    width: penWidth / h,
    aspect: w / h,
  };
}

export interface Pixels {
  readonly width: number;
  readonly height: number;
  /** RGBA, row by row. */
  readonly data: Uint8ClampedArray | Uint8Array;
}

/**
 * Prepare an uploaded (or typed and rendered) signature image: make
 * near-white pixels transparent, fading in over the edge so strokes stay
 * smooth, then crop to the ink with a small margin. Returns null when no
 * ink remains.
 */
export function cleanSignatureImage(img: Pixels, removeBackground = true, threshold = 0.9): Pixels | null {
  const { width, height } = img;
  const data = new Uint8ClampedArray(img.data);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (removeBackground) {
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        // Fully transparent above the threshold, fading to opaque 0.25 below it.
        const keep = lum >= threshold ? 0 : Math.min(1, (threshold - lum) / 0.25);
        data[i + 3] = Math.round(data[i + 3] * keep);
      }
      if (data[i + 3] > 24) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) return null;
  const margin = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02) + 1;
  x0 = Math.max(0, x0 - margin);
  y0 = Math.max(0, y0 - margin);
  x1 = Math.min(width - 1, x1 + margin);
  y1 = Math.min(height - 1, y1 + margin);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) out.set(data.subarray(((y0 + y) * width + x0) * 4, ((y0 + y) * width + x0 + w) * 4), y * w * 4);
  return { width: w, height: h, data: out };
}

/** The box a signature of `aspect` gets inside `target` (centred, fitted, 90% of it). */
export function fitSignature(
  target: { x: number; y: number; w: number; h: number },
  aspect: number,
): { x: number; y: number; w: number; h: number } {
  const maxW = target.w * 0.9;
  const maxH = target.h * 0.9;
  const w = Math.min(maxW, maxH * aspect);
  const h = w / aspect;
  return { x: target.x + (target.w - w) / 2, y: target.y + (target.h - h) / 2, w, h };
}
