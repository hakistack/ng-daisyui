import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
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
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { DaisyUIThemeService } from './themes/daisyui-theme.service';
import { attachKeyboardNav } from './a11y/keyboard-nav';
import type { EChartsOption } from './chart.types';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, SVGRenderer]);

/**
 * Renders an ECharts chart from a compiled option produced by `createChart()`.
 *
 * Phase 0 subset: line + column. Theme stays live via `DaisyUIThemeService`;
 * consumers never author ECharts options directly.
 */
@Component({
  selector: 'hk-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="hk-chart-host" role="img" [attr.aria-label]="ariaLabel() || 'Chart'"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 240px;
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

  private readonly hostRef = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly theme = inject(DaisyUIThemeService);

  readonly ready = signal(false);
  private instance: echarts.ECharts | null = null;
  private resizeObs: ResizeObserver | null = null;
  private detachKeyboardNav: (() => void) | null = null;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.initialize();
    });

    // Option change → full replace (notMerge: true) per §5.6, then overlay
    // theme so axis/legend styling survives the reset. `untracked` keeps the
    // theme signal out of this effect's dependency set; the separate theme
    // effect below handles theme-only changes.
    effect(() => {
      const option = this.option();
      if (!this.instance) return;
      this.instance.setOption(option ?? {}, { notMerge: true });
      untracked(() => {
        this.instance!.setOption(this.theme.echartsTheme(), { notMerge: false, lazyUpdate: true });
      });
    });

    // Theme-only change → merge on top of whatever option is current.
    effect(() => {
      const themeFragment = this.theme.echartsTheme();
      if (!this.instance) return;
      this.instance.setOption(themeFragment, { notMerge: false, lazyUpdate: true });
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

    this.instance.setOption(this.theme.echartsTheme());
    const initial = this.option();
    if (initial) this.instance.setOption(initial);

    this.resizeObs = new ResizeObserver(() => this.instance?.resize());
    this.resizeObs.observe(host);
    this.detachKeyboardNav = attachKeyboardNav(host, this.instance);
    this.ready.set(true);
  }
}
