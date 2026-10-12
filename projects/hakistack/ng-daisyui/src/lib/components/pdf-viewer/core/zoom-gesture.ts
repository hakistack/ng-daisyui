/** Zoom range the viewer allows (CSS px per PDF point). */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5;

/**
 * Scale factor for one wheel event of a zoom gesture. Trackpad pinches arrive
 * as many small ctrl+wheel deltas (a few px each); a mouse wheel with Ctrl
 * held sends ~100px notches. The exponential makes zoom feel linear and
 * symmetric; the clamp keeps one wheel notch to ±25%.
 */
export function wheelZoomFactor(deltaY: number, deltaMode = 0): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY; // lines / pages → px
  return Math.min(1.25, Math.max(0.8, Math.exp(-px * 0.01)));
}

/** Combine a gesture's running ratio with a new factor, keeping `baseScale × ratio` inside the zoom range. */
export function accumulateZoomRatio(ratio: number, factor: number, baseScale: number): number {
  if (baseScale <= 0) return ratio;
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseScale * ratio * factor));
  return scale / baseScale;
}

/** Distance between two touch points. */
export function touchDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * New horizontal scroll offset after scaling content by `factor` so the point
 * `pointerX` px from the viewport's left edge stays under the pointer.
 */
export function anchoredScrollLeft(scrollLeft: number, pointerX: number, factor: number): number {
  return Math.max(0, (scrollLeft + pointerX) * factor - pointerX);
}
