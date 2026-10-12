import type { PdfRect } from './annotation.types';

/**
 * Merge the rectangles of a text selection (one per text span, in any order)
 * into one quad per line fragment: rectangles that share a line (vertical
 * overlap of at least half the shorter one) and touch or nearly touch
 * horizontally become one. Degenerate rectangles are dropped.
 */
export function mergeSelectionRects(rects: readonly PdfRect[]): PdfRect[] {
  const sorted = rects.filter((r) => r.w > 0.5 && r.h > 0.5).sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x);
  const out: PdfRect[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && sameLine(last, r) && r.x <= last.x + last.w + Math.min(last.h, r.h)) {
      const x0 = Math.min(last.x, r.x);
      const y0 = Math.min(last.y, r.y);
      const x1 = Math.max(last.x + last.w, r.x + r.w);
      const y1 = Math.max(last.y + last.h, r.y + r.h);
      out[out.length - 1] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    } else {
      out.push(r);
    }
  }
  return out;
}

function sameLine(a: PdfRect, b: PdfRect): boolean {
  const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return overlap >= Math.min(a.h, b.h) / 2;
}
