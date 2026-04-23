import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EChartsThemeFragment, readThemeTokens, ThemeTokens, tokensEqual, tokensToEChartsTheme } from './theme-bridge';

const SSR_TOKENS: ThemeTokens = {
  colors: {
    primary: 'rgb(37, 99, 235)',
    secondary: 'rgb(139, 92, 246)',
    accent: 'rgb(236, 72, 153)',
    info: 'rgb(14, 165, 233)',
    success: 'rgb(34, 197, 94)',
    warning: 'rgb(234, 179, 8)',
    error: 'rgb(239, 68, 68)',
    neutral: 'rgb(82, 82, 91)',
    base100: 'rgb(255, 255, 255)',
    base200: 'rgb(245, 245, 245)',
    base300: 'rgb(229, 229, 229)',
    baseContent: 'rgb(23, 23, 23)',
  },
  fontFamily: 'system-ui, sans-serif',
};

/**
 * Singleton service that owns a single `MutationObserver` on `<html[data-theme]>`
 * and exposes theme tokens + an ECharts theme fragment as signals.
 *
 * Zoneless-native: propagation flows through the signal graph only
 * (`MutationObserver` → `tokens.set()` → `computed` → consumer `effect`).
 * Reads are rAF-batched so rapid theme toggles coalesce to one read per frame,
 * and the signal is equality-checked to avoid redundant downstream updates.
 *
 * See charts.md §4.5 #5 and §5.3.
 */
@Injectable({ providedIn: 'root' })
export class DaisyUIThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly tokens = signal<ThemeTokens>(SSR_TOKENS, { equal: tokensEqual });
  readonly echartsTheme = computed<EChartsThemeFragment>(() => tokensToEChartsTheme(this.tokens()));

  private observer: MutationObserver | null = null;
  private rafHandle = 0;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.tokens.set(readThemeTokens());

    this.observer = new MutationObserver(() => this.scheduleRefresh());
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    });
  }

  private scheduleRefresh(): void {
    if (this.rafHandle) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = 0;
      this.tokens.set(readThemeTokens());
    });
  }
}
