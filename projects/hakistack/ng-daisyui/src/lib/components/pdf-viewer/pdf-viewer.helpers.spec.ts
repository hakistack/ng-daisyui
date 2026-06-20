import { clampZoom, inverseRotateDelta, nextZoomStep, previousZoomStep } from './pdf-viewer.helpers';

/** Forward clockwise rotation R(deg) — the transform the page rotor applies. */
function rotateDelta(dx: number, dy: number, deg: number): { dx: number; dy: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { dx: cos * dx - sin * dy, dy: sin * dx + cos * dy };
}

describe('inverseRotateDelta', () => {
  it('is the identity at 0°', () => {
    expect(inverseRotateDelta(5, 7, 0)).toEqual({ dx: 5, dy: 7 });
  });

  it('maps the orthogonal angles correctly', () => {
    // 90° clockwise rotor → screen (5,7) came from local (7,-5).
    const r90 = inverseRotateDelta(5, 7, 90);
    expect(r90.dx).toBeCloseTo(7, 9);
    expect(r90.dy).toBeCloseTo(-5, 9);

    const r180 = inverseRotateDelta(5, 7, 180);
    expect(r180.dx).toBeCloseTo(-5, 9);
    expect(r180.dy).toBeCloseTo(-7, 9);

    const r270 = inverseRotateDelta(5, 7, 270);
    expect(r270.dx).toBeCloseTo(-7, 9);
    expect(r270.dy).toBeCloseTo(5, 9);
  });

  it('round-trips against the forward rotor for every angle (incl. non-orthogonal)', () => {
    for (const deg of [0, 30, 45, 90, 137, 180, 270, 359]) {
      for (const [dx, dy] of [
        [3, 11],
        [-8, 2],
        [0, -6],
      ]) {
        const local = inverseRotateDelta(dx, dy, deg);
        const back = rotateDelta(local.dx, local.dy, deg);
        expect(back.dx).toBeCloseTo(dx, 9);
        expect(back.dy).toBeCloseTo(dy, 9);
      }
    }
  });

  it('preserves distance from centre (rotation is rigid)', () => {
    const local = inverseRotateDelta(9, 12, 73);
    expect(Math.hypot(local.dx, local.dy)).toBeCloseTo(Math.hypot(9, 12), 9);
  });
});

describe('zoom step helpers', () => {
  it('clamps to [0.25, 5]', () => {
    expect(clampZoom(0.1)).toBe(0.25);
    expect(clampZoom(99)).toBe(5);
    expect(clampZoom(1)).toBe(1);
  });

  it('steps up by 0.25 and clamps at the ceiling', () => {
    expect(nextZoomStep(1)).toBeCloseTo(1.25, 9);
    expect(nextZoomStep(4.9)).toBe(5);
    expect(nextZoomStep(5)).toBe(5);
  });

  it('steps down by 0.25 and clamps at the floor', () => {
    expect(previousZoomStep(1)).toBeCloseTo(0.75, 9);
    expect(previousZoomStep(0.3)).toBe(0.25);
    expect(previousZoomStep(0.25)).toBe(0.25);
  });
});
