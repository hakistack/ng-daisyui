import { PdfZoom } from '../pdf-viewer.types';
import { PdfPageEntry } from './types';

/** px reserved around the page when resolving fit-width / fit-page. */
export const VIEWPORT_PAD_X = 32;
export const VIEWPORT_PAD_Y = 32;
/** Ceiling for `'auto'` zoom. */
export const AUTO_ZOOM_CAP = 1.5;
/**
 * Ceiling for `'fit-width'`. On a very wide viewport (fullscreen, ultra-wide
 * monitors) an uncapped fit-width blows a portrait page up to several hundred
 * percent: it overflows vertically, and the device-pixel canvas can exceed the
 * browser's max canvas size, leaving the lower part of the page blank. Capping
 * keeps a comfortable reading width; the page stack centres the page past this
 * point. `fit-page` is intentionally uncapped (it's already bounded by height).
 */
export const FIT_ZOOM_MAX = 2;
/**
 * Max device-pixel dimension for a page canvas. Browsers cap canvas size (Safari
 * is the tightest, ~4096 px/side on some versions) and silently drop the
 * overflow, which shows as a blank lower page region at very high zoom.
 */
export const MAX_CANVAS_DIM = 4096;

/**
 * Resolve a zoom setting to a CSS scale factor (CSS px per PDF point).
 * `available` is the viewport's usable box (padding already removed). Fit modes
 * size against the first page, matching the viewer's long-standing behaviour.
 */
export function resolveZoomScale(zoom: PdfZoom, available: { width: number; height: number }, firstPage: PdfPageEntry): number {
  if (typeof zoom === 'number') return zoom;
  if (zoom === 'fit-width') return Math.min(FIT_ZOOM_MAX, available.width / firstPage.baseWidth);
  if (zoom === 'fit-page') return Math.min(available.width / firstPage.baseWidth, available.height / firstPage.baseHeight);
  if (zoom === 'auto') return Math.min(AUTO_ZOOM_CAP, available.width / firstPage.baseWidth);
  return 1;
}

/**
 * Effective device-pixel ratio for a canvas of `cssWidth × cssHeight`, reduced
 * so neither device side exceeds `maxDim`. The CSS box stays full-size, so the
 * browser upscales the raster (slightly soft, but complete) instead of dropping
 * the overflow.
 */
export function fitDevicePixelRatio(cssWidth: number, cssHeight: number, dpr: number, maxDim = MAX_CANVAS_DIM): number {
  const ideal = Math.max(cssWidth, cssHeight) * dpr;
  return ideal > maxDim ? (dpr * maxDim) / ideal : dpr;
}

/** Normalize degrees into `[0, 360)`. */
export function normalizeRotation(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Whether a rotation swaps the page's width and height (90° / 270°). */
export function isQuarterTurn(deg: number): boolean {
  const r = normalizeRotation(deg);
  return r === 90 || r === 270;
}

/**
 * Invert a page's CSS display rotation for a pointer delta.
 *
 * The page rotor applies a clockwise `rotate(deg)` about its centre, so a point
 * at local (unrotated) offset `(x, y)` from the centre lands on screen at
 * `R(deg)·(x, y)` where `R(deg) = [[cos, -sin], [sin, cos]]` (y-down ⇒ positive
 * angle is clockwise). To recover the local offset from a screen-space delta we
 * apply the inverse `R(-deg)`. For `deg = 0` this is the identity.
 */
export function inverseRotateDelta(dx: number, dy: number, deg: number): { dx: number; dy: number } {
  const rad = (-deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { dx: cos * dx - sin * dy, dy: sin * dx + cos * dy };
}

/**
 * Map a pointer position to a layer's **unrotated** local CSS coordinates.
 * `rect` is the layer's (possibly rotated) bounding box; `width`/`height` are
 * its own unrotated dims. Rotation about the centre preserves the centre, so
 * the bbox centre is the layer's true centre even when rotated.
 */
export function pointerToLocal(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  size: { width: number; height: number },
  rotation: number,
): { x: number; y: number } {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const local = inverseRotateDelta(dx, dy, rotation);
  return { x: size.width / 2 + local.dx, y: size.height / 2 + local.dy };
}

/**
 * Pack a `#rrggbb` colour plus alpha into `0xRRGGBBAA` (the engine's colour
 * format). Invalid channels fall back to 0.
 */
export function packRgba(hex: string, alpha: number): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = Math.max(0, Math.min(255, Math.round(alpha)));
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}
