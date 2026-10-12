import {
  FIT_ZOOM_MAX,
  fitDevicePixelRatio,
  isQuarterTurn,
  normalizeRotation,
  packRgba,
  pointerToLocal,
  resolveZoomScale,
} from './geometry';

const letter = { pageNumber: 1, baseWidth: 612, baseHeight: 792 };

describe('resolveZoomScale', () => {
  it('passes numeric zoom through', () => {
    expect(resolveZoomScale(1.25, { width: 1000, height: 800 }, letter)).toBe(1.25);
  });

  it('fits width, capped at FIT_ZOOM_MAX', () => {
    expect(resolveZoomScale('fit-width', { width: 612, height: 100 }, letter)).toBe(1);
    expect(resolveZoomScale('fit-width', { width: 10_000, height: 100 }, letter)).toBe(FIT_ZOOM_MAX);
  });

  it('fits the whole page by the tighter axis, uncapped', () => {
    expect(resolveZoomScale('fit-page', { width: 1224, height: 792 }, letter)).toBe(1);
    expect(resolveZoomScale('fit-page', { width: 6120, height: 7920 }, letter)).toBe(10);
  });

  it('caps auto at 1.5', () => {
    expect(resolveZoomScale('auto', { width: 306, height: 100 }, letter)).toBe(0.5);
    expect(resolveZoomScale('auto', { width: 5000, height: 100 }, letter)).toBe(1.5);
  });
});

describe('fitDevicePixelRatio', () => {
  it('keeps the dpr when the canvas fits', () => {
    expect(fitDevicePixelRatio(1000, 1300, 2, 4096)).toBe(2);
  });

  it('reduces the dpr so the longest device side equals the cap', () => {
    const dpr = fitDevicePixelRatio(3000, 2000, 2, 4096);
    expect(3000 * dpr).toBeCloseTo(4096, 9);
  });
});

describe('rotation helpers', () => {
  it('normalizes into [0, 360)', () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(360)).toBe(0);
  });

  it('detects quarter turns', () => {
    expect(isQuarterTurn(90)).toBe(true);
    expect(isQuarterTurn(-90)).toBe(true);
    expect(isQuarterTurn(180)).toBe(false);
  });
});

describe('pointerToLocal', () => {
  const size = { width: 200, height: 100 };

  it('is a plain offset for an unrotated layer', () => {
    const rect = { left: 10, top: 20, width: 200, height: 100 };
    expect(pointerToLocal(60, 45, rect, size, 0)).toEqual({ x: 50, y: 25 });
  });

  it('undoes a 90° clockwise display rotation', () => {
    // Rotated 90° cw about its centre, the 200×100 layer occupies a 100×200 box.
    const rect = { left: 0, top: 0, width: 100, height: 200 };
    // Local top-left corner (0,0) is offset (-100,-50) from centre and lands at
    // screen offset R(90)(-100,-50) = (50,-100) → client (100, 0).
    const p = pointerToLocal(100, 0, rect, size, 90);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
  });
});

describe('packRgba', () => {
  it('packs hex + alpha into 0xRRGGBBAA', () => {
    expect(packRgba('#ffeb3b', 0x66)).toBe(0xffeb3b66);
    expect(packRgba('000000', 255)).toBe(0x000000ff);
  });

  it('treats invalid channels as 0 and clamps alpha', () => {
    expect(packRgba('#zz0000', 300)).toBe(0x000000ff);
  });
});
