/**
 * DaisyUI → ECharts theme bridge. Supports **both DaisyUI v5 and v4**.
 *
 * - **v5** exposes resolved color vars like `--color-primary` (an `oklch()`
 *   expression). A probe element lets the browser resolve it to `rgb()`.
 * - **v4** exposes raw OKLCH triples in `--p`, `--s`, `--b1`, etc. The bridge
 *   wraps them at read time as `oklch(var(--p))` and resolves the same way.
 *
 * Version detection runs on every token read (cheap, one property lookup).
 * If both schemas are present, v5 wins. If neither is present, SSR fallbacks
 * in the service kick in.
 */

export interface ThemeTokens {
  readonly colors: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
    readonly info: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly neutral: string;
    readonly base100: string;
    readonly base200: string;
    readonly base300: string;
    readonly baseContent: string;
  };
  readonly fontFamily: string;
  /** Radius tokens resolved to pixels so ECharts (which wants numbers) can consume directly. */
  readonly radius: {
    readonly box: number;
    readonly field: number;
    readonly selector: number;
  };
}

type ColorKey = keyof ThemeTokens['colors'];
type RadiusKey = keyof ThemeTokens['radius'];

const V5_COLOR_VARS: Record<ColorKey, string> = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  info: '--color-info',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  neutral: '--color-neutral',
  base100: '--color-base-100',
  base200: '--color-base-200',
  base300: '--color-base-300',
  baseContent: '--color-base-content',
};

// DaisyUI v4 exposes raw OKLCH triples in these vars — must be wrapped as
// `oklch(var(...))` to become a valid color expression.
const V4_COLOR_VARS: Record<ColorKey, string> = {
  primary: '--p',
  secondary: '--s',
  accent: '--a',
  info: '--in',
  success: '--su',
  warning: '--wa',
  error: '--er',
  neutral: '--n',
  base100: '--b1',
  base200: '--b2',
  base300: '--b3',
  baseContent: '--bc',
};

const V5_RADIUS_VARS: Record<RadiusKey, string> = {
  box: '--radius-box',
  field: '--radius-field',
  selector: '--radius-selector',
};

const V4_RADIUS_VARS: Record<RadiusKey, string> = {
  box: '--rounded-box',
  field: '--rounded-btn',
  selector: '--rounded-badge',
};

const RADIUS_FALLBACK_PX: Record<RadiusKey, number> = {
  box: 8,
  field: 6,
  selector: 4,
};

const FALLBACK_COLOR = 'rgb(128, 128, 128)';
const RGB_RE = /^rgba?\(([^)]+)\)$/;

type DaisyVersion = 'v5' | 'v4' | 'unknown';

/** Checks which DaisyUI schema is active on `<html>`. */
function detectVersion(): DaisyVersion {
  if (typeof document === 'undefined') return 'unknown';
  const style = getComputedStyle(document.documentElement);
  if (style.getPropertyValue(V5_COLOR_VARS.primary).trim()) return 'v5';
  if (style.getPropertyValue(V4_COLOR_VARS.primary).trim()) return 'v4';
  return 'unknown';
}

/** Wraps the CSS var reference in the right expression for the active schema. */
function colorExpr(version: DaisyVersion, varName: string): string {
  return version === 'v4' ? `oklch(var(${varName}))` : `var(${varName})`;
}

function readColors(probe: HTMLElement | null, version: DaisyVersion): Record<ColorKey, string> {
  const out = {} as Record<ColorKey, string>;
  const vars = version === 'v4' ? V4_COLOR_VARS : V5_COLOR_VARS;

  if (probe) {
    for (const key of Object.keys(vars) as ColorKey[]) {
      probe.style.color = colorExpr(version, vars[key]);
      const resolved = getComputedStyle(probe).color;
      out[key] = resolved && resolved !== '' ? resolved : FALLBACK_COLOR;
    }
    return out;
  }

  // No body yet — read raw values. Works for v5 where the var resolves to
  // `oklch(...)` (modern browsers pass it through). v4 raw triples can't be
  // resolved without the probe, so we return fallbacks.
  const rootStyle = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  for (const key of Object.keys(vars) as ColorKey[]) {
    const raw = rootStyle?.getPropertyValue(vars[key]).trim();
    out[key] = raw && version !== 'v4' ? raw : FALLBACK_COLOR;
  }
  return out;
}

function readRadius(probe: HTMLElement | null, version: DaisyVersion): ThemeTokens['radius'] {
  if (!probe) return RADIUS_FALLBACK_PX;
  const vars = version === 'v4' ? V4_RADIUS_VARS : V5_RADIUS_VARS;
  const out = {} as Record<RadiusKey, number>;
  for (const key of Object.keys(vars) as RadiusKey[]) {
    // Use `width` as the resolver — accepts any CSS length, computed style
    // returns pixels. Works for rem, px, em, calc(), etc.
    probe.style.width = `var(${vars[key]})`;
    const resolved = parseFloat(getComputedStyle(probe).width);
    out[key] = Number.isFinite(resolved) ? resolved : RADIUS_FALLBACK_PX[key];
  }
  return out;
}

function readFontFamily(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif';
  const source = document.body ?? document.documentElement;
  const family = getComputedStyle(source).fontFamily.trim();
  return family || 'system-ui, sans-serif';
}

export function readThemeTokens(): ThemeTokens {
  const version = detectVersion();

  let probe: HTMLElement | null = null;
  const body = typeof document !== 'undefined' ? document.body : null;
  if (body) {
    probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.width = 'auto';
    body.appendChild(probe);
  }

  try {
    return {
      colors: readColors(probe, version),
      fontFamily: readFontFamily(),
      radius: readRadius(probe, version),
    };
  } finally {
    probe?.remove();
  }
}

/** Shallow structural equality on all token leaf values. */
export function tokensEqual(a: ThemeTokens, b: ThemeTokens): boolean {
  if (a === b) return true;
  if (a.fontFamily !== b.fontFamily) return false;
  if (a.radius.box !== b.radius.box || a.radius.field !== b.radius.field || a.radius.selector !== b.radius.selector) return false;
  for (const key of Object.keys(V5_COLOR_VARS) as ColorKey[]) {
    if (a.colors[key] !== b.colors[key]) return false;
  }
  return true;
}

/**
 * Named palettes consumers can select via `colors: 'qualitative' | 'semantic'`
 * on a chart config. Extra slots come from hue rotation so 10+ series charts
 * don't cycle back onto `primary`.
 */
export type PaletteName = 'qualitative' | 'semantic';

export function buildPalette(tokens: ThemeTokens, name: PaletteName = 'qualitative', slotCount = 10): string[] {
  const c = tokens.colors;

  const base =
    name === 'semantic'
      ? [c.success, c.error, c.warning, c.info, c.primary, c.secondary, c.accent, c.neutral]
      : // Qualitative: brand + neutral tones, no semantic colors.
        [c.primary, c.secondary, c.accent, c.neutral];

  if (base.length >= slotCount) return base.slice(0, slotCount);

  const extras: string[] = [];
  const steps = slotCount - base.length;
  for (let i = 1; i <= steps; i++) {
    const hueDeg = (360 / (steps + 1)) * i;
    extras.push(rotateHue(c.primary, hueDeg));
  }
  return [...base, ...extras];
}

function parseRgb(input: string): [number, number, number, number] | null {
  const m = RGB_RE.exec(input.trim());
  if (!m) return null;
  const parts = m[1].split(',').map((p) => p.trim());
  if (parts.length < 3) return null;
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length >= 4 ? Number(parts[3]) : 1;
  if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
  return [r, g, b, a];
}

function formatRgba(r: number, g: number, b: number, a: number): string {
  return a === 1
    ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
    : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

export function withAlpha(color: string, alpha: number): string {
  const parsed = parseRgb(color);
  if (!parsed) return color;
  return formatRgba(parsed[0], parsed[1], parsed[2], alpha);
}

function rotateHue(color: string, degrees: number): string {
  const parsed = parseRgb(color);
  if (!parsed) return color;
  const [r, g, b] = parsed;
  const [h, s, l] = rgbToHsl(r / 255, g / 255, b / 255);
  const newH = (h + degrees / 360) % 1;
  const [r2, g2, b2] = hslToRgb(newH, s, l);
  return formatRgba(r2 * 255, g2 * 255, b2 * 255, 1);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const to = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [to(h + 1 / 3), to(h), to(h - 1 / 3)];
}

/** Opaque type for the option fragment — avoid importing ECharts types here. */
export type EChartsThemeFragment = Record<string, unknown>;

export interface BuildThemeOptions {
  readonly palette?: PaletteName;
  readonly paletteSlots?: number;
}

export function tokensToEChartsTheme(tokens: ThemeTokens, opts: BuildThemeOptions = {}): EChartsThemeFragment {
  const { colors, fontFamily } = tokens;
  const { palette = 'qualitative', paletteSlots = 10 } = opts;

  const seriesColors = buildPalette(tokens, palette, paletteSlots);
  const textColor = colors.baseContent;
  const mutedText = withAlpha(textColor, 0.7);
  const axisLineColor = colors.base300;
  const splitLineColor = colors.base200;

  const axisStyle = {
    axisLine: { lineStyle: { color: axisLineColor } },
    axisTick: { lineStyle: { color: axisLineColor } },
    axisLabel: { color: mutedText, fontFamily },
    splitLine: { lineStyle: { color: splitLineColor } },
  };

  return {
    color: seriesColors,
    backgroundColor: 'transparent',
    textStyle: { fontFamily, color: textColor },
    title: {
      textStyle: { color: textColor, fontFamily, fontWeight: 600 },
      subtextStyle: { color: mutedText, fontFamily },
    },
    legend: {
      textStyle: { color: textColor, fontFamily },
      inactiveColor: withAlpha(textColor, 0.3),
    },
    tooltip: {
      backgroundColor: colors.base100,
      borderColor: colors.base300,
      textStyle: { color: textColor, fontFamily },
    },
    xAxis: axisStyle,
    yAxis: axisStyle,
  };
}
