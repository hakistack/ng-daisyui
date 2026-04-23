import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { DaisyUIThemeService } from './themes/daisyui-theme.service';
import { tokensToEChartsTheme } from './themes/theme-bridge';
import { attachKeyboardNav } from './a11y/keyboard-nav';
import type { EChartsOption, Palette } from './chart.types';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, SVGRenderer]);

/**
 * Renders an ECharts chart from a compiled option produced by `createChart()`.
 *
 * Phase 0 subset: line + column. Theme stays live via `DaisyUIThemeService`;
 * consumers never author ECharts options directly.
 */
@Component({
  selector: 'hk-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Decorative charts (e.g. sparkline inside a KPI card) must size to the
    // wrapping container — no fallback min-height or they overflow small slots.
    '[style.min-height]': 'decorative() ? "0" : "240px"',
  },
  template: `
    <div
      #host
      class="hk-chart-host"
      [attr.role]="decorative() ? 'presentation' : 'img'"
      [attr.aria-hidden]="decorative() ? 'true' : null"
      [attr.aria-label]="decorative() ? null : ariaLabel() || 'Chart'"
    ></div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .hk-chart-host {
      width: 100%;
      height: 100%;
      outline: none;
      border-radius: var(--radius-box, 0.5rem);
    }
    .hk-chart-host:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  `,
})
export class ChartComponent {
  readonly option = input<EChartsOption | null>(null);
  readonly ariaLabel = input<string>('');
  readonly palette = input<Palette>('qualitative');
  /** Purely decorative chart (e.g. sparkline inside a KPI card). Skips keyboard nav and hides from screen readers. */
  readonly decorative = input<boolean>(false);

  private readonly hostRef = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly theme = inject(DaisyUIThemeService);

  readonly ready = signal(false);
  private instance: echarts.ECharts | null = null;
  private resizeObs: ResizeObserver | null = null;
  private detachKeyboardNav: (() => void) | null = null;

  /**
   * Theme fragment computed locally so the palette input participates in the
   * signal graph alongside the raw DaisyUI tokens. If `palette` is an explicit
   * color array, it overrides the `color` field after the default qualitative
   * build — every other aspect (text, axes, tooltip) still comes from tokens.
   */
  private readonly themeFragment = computed<EChartsOption>(() => {
    const tokens = this.theme.tokens();
    const palette = this.palette();
    if (typeof palette === 'string') {
      return tokensToEChartsTheme(tokens, { palette });
    }
    return { ...tokensToEChartsTheme(tokens, { palette: 'qualitative' }), color: palette.slice() };
  });

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.initialize();
    });

    // Option change → full replace (notMerge: true) per §5.6, then overlay
    // theme so axis/legend styling survives the reset. `untracked` keeps the
    // theme fragment out of this effect's dependency set; the separate theme
    // effect below handles theme-only changes.
    effect(() => {
      const option = this.option();
      if (!this.instance) return;
      this.instance.setOption(option ?? {}, { notMerge: true });
      untracked(() => {
        this.instance!.setOption(this.scopedTheme(option), { notMerge: false, lazyUpdate: true });
      });
    });

    // Theme-only change → merge on top of whatever option is current.
    effect(() => {
      this.themeFragment(); // track signal
      if (!this.instance) return;
      this.instance.setOption(this.scopedTheme(this.option()), { notMerge: false, lazyUpdate: true });
    });

    this.destroyRef.onDestroy(() => {
      this.detachKeyboardNav?.();
      this.resizeObs?.disconnect();
      this.instance?.dispose();
      this.instance = null;
    });
  }

  private initialize(): void {
    const host = this.hostRef().nativeElement;
    this.instance = echarts.init(host, undefined, { renderer: 'svg' });

    const initial = this.option();
    if (initial) this.instance.setOption(initial);
    this.instance.setOption(this.scopedTheme(initial));

    this.resizeObs = new ResizeObserver(() => this.instance?.resize());
    this.resizeObs.observe(host);
    if (!this.decorative()) {
      this.detachKeyboardNav = attachKeyboardNav(host, this.instance);
    }
    this.ready.set(true);
  }

  /**
   * Strips `xAxis`/`yAxis` styling from the theme fragment when the current
   * option doesn't declare axes (e.g. pie charts). Otherwise the theme
   * re-introduces phantom axes after a kind switch.
   */
  private scopedTheme(option: EChartsOption | null): EChartsOption {
    const theme = this.themeFragment();
    const hasAxes = !!option && ('xAxis' in option || 'yAxis' in option);
    if (hasAxes) return theme;
    const { xAxis: _xa, yAxis: _ya, ...rest } = theme as EChartsOption & { xAxis?: unknown; yAxis?: unknown };
    return rest;
  }
}
