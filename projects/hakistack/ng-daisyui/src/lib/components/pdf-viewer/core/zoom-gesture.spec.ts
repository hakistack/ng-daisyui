import { MAX_ZOOM, MIN_ZOOM, accumulateZoomRatio, anchoredScrollLeft, touchDistance, wheelZoomFactor } from './zoom-gesture';

describe('zoom gesture math', () => {
  it('zooms in on negative deltas and out on positive ones, symmetrically', () => {
    const zoomIn = wheelZoomFactor(-10);
    const zoomOut = wheelZoomFactor(10);
    expect(zoomIn).toBeGreaterThan(1);
    expect(zoomOut).toBeLessThan(1);
    expect(zoomIn * zoomOut).toBeCloseTo(1, 10);
  });

  it('limits a mouse-wheel notch to ±25%', () => {
    expect(wheelZoomFactor(-100)).toBe(1.25);
    expect(wheelZoomFactor(100)).toBe(0.8);
    expect(wheelZoomFactor(-3, 1)).toBe(1.25); // line mode: 3 lines ≈ 48px
  });

  it('keeps the gesture inside the zoom range', () => {
    expect(1 * accumulateZoomRatio(1, 100, 1)).toBe(MAX_ZOOM);
    expect(2 * accumulateZoomRatio(1, 0.001, 2)).toBe(MIN_ZOOM);
    expect(accumulateZoomRatio(1.5, 1.2, 1)).toBeCloseTo(1.8, 10);
  });

  it('measures touch distance', () => {
    expect(touchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })).toBe(5);
  });

  it('keeps the point under the pointer when scaling horizontally', () => {
    // Content x under the pointer before: 100 + 50 = 150; after 2×: 300 → scrollLeft 250.
    expect(anchoredScrollLeft(100, 50, 2)).toBe(250);
    expect(anchoredScrollLeft(0, 10, 0.5)).toBe(0); // never negative
  });
});
