import type { HkAnnotation, PdfMeasureKind, PdfMeasureScale, PdfMeasureUnit, PdfMeasurement } from './annotation.types';

/** PDF points in one unit. */
export const POINTS_PER_UNIT: Record<PdfMeasureUnit, number> = {
  pt: 1,
  in: 72,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
  pica: 12,
  ft: 864,
  'ft-in': 864,
  m: 7200 / 2.54,
};

export const MEASURE_UNITS = Object.keys(POINTS_PER_UNIT) as PdfMeasureUnit[];

/** The page's own scale: 1 in on paper is 1 in. */
export const DEFAULT_SCALE: PdfMeasureScale = { ratio: 1 / 72, unit: 'in', label: '1 in = 1 in' };

/**
 * A scale from a calibration, Acrobat style: `paper` units on the page
 * represent `real` units in the world ("1 in = 10 ft").
 */
export function calibrate(
  paper: number,
  paperUnit: PdfMeasureUnit,
  real: number,
  realUnit: PdfMeasureUnit,
  precision?: number,
): PdfMeasureScale {
  const paperPoints = paper * POINTS_PER_UNIT[paperUnit];
  const ratio = paperPoints > 0 && real > 0 ? real / paperPoints : DEFAULT_SCALE.ratio;
  return { ratio, unit: realUnit, label: `${trim(paper)} ${unitName(paperUnit)} = ${trim(real)} ${unitName(realUnit)}`, precision };
}

/** The value an annotation measures, in its scale's unit (squared for areas, cubed for volumes); null if it isn't a measurement. */
export function measureValue(a: HkAnnotation): number | null {
  const m = measurementOf(a);
  if (!m) return null;
  const r = m.scale.ratio;
  switch (m.kind) {
    case 'distance':
      return a.type === 'line' ? Math.hypot(a.points[2] - a.points[0], a.points[3] - a.points[1]) * r : null;
    case 'perimeter':
      return a.type === 'polyline' || a.type === 'polygon' ? pathLength(a.vertices, a.type === 'polygon') * r : null;
    case 'area':
      return a.type === 'polygon' ? polygonArea(a.vertices) * r * r : null;
    case 'volume':
      return a.type === 'polygon' ? polygonArea(a.vertices) * r * r * (m.depth ?? 1) : null;
    case 'radius':
      return a.type === 'ellipse' ? ((a.rect.w + a.rect.h) / 4) * r : null;
  }
}

/** The measured value as text: `12.5 ft`, `3' 4.5"`, `20 sq m`, `8 cu ft`. */
export function formatMeasure(value: number, kind: PdfMeasureKind, scale: PdfMeasureScale): string {
  const precision = scale.precision ?? 2;
  const unit = scale.unit === 'ft-in' ? 'ft' : scale.unit;
  if (kind === 'area') return `${fixed(value, precision)} sq ${unit}`;
  if (kind === 'volume') return `${fixed(value, precision)} cu ${unit}`;
  if (scale.unit === 'ft-in') {
    const feet = Math.floor(value + 1e-9);
    const inches = (value - feet) * 12;
    return `${feet}' ${fixed(inches, Math.min(precision, 2))}"`;
  }
  return `${fixed(value, precision)} ${unit}`;
}

/** An annotation's measurement, if it is one of the kinds its type supports. */
export function measurementOf(a: HkAnnotation): PdfMeasurement | null {
  if ((a.type === 'line' || a.type === 'polyline' || a.type === 'polygon' || a.type === 'ellipse') && a.measure) return a.measure;
  return null;
}

/** The label a measurement shows, or null. */
export function measureLabel(a: HkAnnotation): string | null {
  const m = measurementOf(a);
  const value = measureValue(a);
  if (!m || value === null) return null;
  const text = formatMeasure(value, m.kind, m.scale);
  return m.kind === 'radius' ? `R ${text}` : text;
}

export function pathLength(v: readonly number[], closed: boolean): number {
  let total = 0;
  const n = Math.floor(v.length / 2);
  for (let i = 1; i < n; i++) total += Math.hypot(v[i * 2] - v[i * 2 - 2], v[i * 2 + 1] - v[i * 2 - 1]);
  if (closed && n > 2) total += Math.hypot(v[0] - v[(n - 1) * 2], v[1] - v[(n - 1) * 2 + 1]);
  return total;
}

/** Shoelace area of a closed polygon. */
export function polygonArea(v: readonly number[]): number {
  const n = Math.floor(v.length / 2);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += v[i * 2] * v[j * 2 + 1] - v[j * 2] * v[i * 2 + 1];
  }
  return Math.abs(sum) / 2;
}

/** Area centroid of a polygon (falls back to the vertex mean for degenerate ones). */
export function polygonCentroid(v: readonly number[]): [number, number] {
  const n = Math.floor(v.length / 2);
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = v[i * 2] * v[j * 2 + 1] - v[j * 2] * v[i * 2 + 1];
    a += cross;
    cx += (v[i * 2] + v[j * 2]) * cross;
    cy += (v[i * 2 + 1] + v[j * 2 + 1]) * cross;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < n; i++) {
      sx += v[i * 2];
      sy += v[i * 2 + 1];
    }
    return [sx / Math.max(1, n), sy / Math.max(1, n)];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

function unitName(u: PdfMeasureUnit): string {
  return u === 'ft-in' ? 'ft' : u;
}

function fixed(n: number, decimals: number): string {
  return trim(Number(n.toFixed(decimals)));
}

function trim(n: number): string {
  return String(Math.round(n * 1e6) / 1e6);
}
