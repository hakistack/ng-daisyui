/**
 * Reads DaisyUI CSS custom properties from the document root and maps them
 * into an ECharts option fragment. See charts.md §5.3 for the contract.
 *
 * Browsers resolve `oklch()` → `rgb()` when we read computed style, which is
 * why we apply each var to a probe element rather than reading the raw CSS
 * var — ECharts' color parser is older and doesn't understand oklch directly.
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
}

const COLOR_VAR_KEYS = {
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
} as const;

type ColorKey = keyof typeof COLOR_VAR_KEYS;

const RGB_RE = /^rgba?\(([^)]+)\)$/;

/**
 * Reads all DaisyUI theme tokens in a single pass. Uses one probe element
 * reused across all 12 color reads to minimize DOM churn.
 */
export function readThemeTokens(): ThemeTokens {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);

  try {
    const colors = {} as Record<ColorKey, string>;
    for (const key of Object.keys(COLOR_VAR_KEYS) as ColorKey[]) {
      probe.style.color = `var(${COLOR_VAR_KEYS[key]})`;
      colors[key] = getComputedStyle(probe).color || 'rgb(128, 128, 128)';
    }
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('font-family').trim() || 'system-ui, sans-serif';
    return { colors, fontFamily };
  } finally {
    probe.remove();
  }
}

/** Shallow structural equality on the 12 color strings + fontFamily. */
export function tokensEqual(a: ThemeTokens, b: ThemeTokens): boolean {
  if (a === b) return true;
  if (a.fontFamily !== b.fontFamily) return false;
  for (const key of Object.keys(COLOR_VAR_KEYS) as ColorKey[]) {
    if (a.colors[key] !== b.colors[key]) return false;
  }
  return true;
}

/**
 * Opaque type for an ECharts option fragment — we don't import echarts types
 * here to keep the bridge engine-agnostic at the module level.
 */
export type EChartsThemeFragment = Record<string, unknown>;

/** Converts theme tokens into an ECharts option fragment. */
export function tokensToEChartsTheme(tokens: ThemeTokens): EChartsThemeFragment {
  const { colors, fontFamily } = tokens;
  const textColor = colors.baseContent;
  const mutedText = withAlpha(textColor, 0.7);
  const splitLineColor = withAlpha(textColor, 0.1);
  const axisLineColor = withAlpha(textColor, 0.2);

  const axisStyle = {
    axisLine: { lineStyle: { color: axisLineColor } },
    axisTick: { lineStyle: { color: axisLineColor } },
    axisLabel: { color: mutedText, fontFamily },
    splitLine: { lineStyle: { color: splitLineColor } },
  };

  return {
    color: [colors.primary, colors.secondary, colors.accent, colors.info, colors.success, colors.warning, colors.error, colors.neutral],
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

function withAlpha(rgb: string, alpha: number): string {
  const match = RGB_RE.exec(rgb.trim());
  if (!match) return rgb;
  const [r, g, b] = match[1].split(',', 3).map((p) => p.trim());
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
