import { Directive, ElementRef, input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { inView, animate, stagger } from 'motion';
import {
  type AnimationControls,
  type AnimationPreset,
  ANIMATION_PRESETS,
  type MotionAnimationOptions,
  type MotionDirectiveOptions,
  type TriggerType,
} from '../motion.types';
import { prefersReducedMotion, safeStopAnimation } from '../motion.utils';

type InViewOptions = NonNullable<Parameters<typeof inView>[2]>;

/**
 * Animate an element using `motion` (Framer Motion's vanilla port).
 *
 * Pick a preset (`'fadeIn'`, `'zoomIn'`, `'slideInUp'`, etc.) or pass a custom
 * keyframes object. Honors `prefers-reduced-motion`: if the user has it enabled,
 * the final keyframe values are applied instantly with no animation.
 *
 * **Trigger modes** (`hkAnimateOptions.trigger`):
 * - `'immediate'` (default) — plays on init.
 * - `'scroll'` — plays when the element scrolls into view (uses `inView`).
 *   Pair with `once: true` to fire only the first time, plus `margin` / `amount` for thresholds.
 * - `'click'` — plays on each click of the host element.
 *
 * Imperative methods are exposed: `play()`, `stop()`, `reset()` — grab the directive
 * via `viewChild` if you need to drive it manually.
 *
 * @example Preset, immediate
 * <div hkAnimate="fadeInUp">Hello</div>
 *
 * @example Scroll-triggered, fire once
 * <section hkAnimate="zoomIn" [hkAnimateOptions]="{ trigger: 'scroll', once: true, amount: 0.3 }">
 *
 * @example Custom keyframes + stagger over children
 * <ul [hkAnimate]="{ opacity: [0, 1], y: [20, 0] }"
 *     [hkAnimateOptions]="{ trigger: 'scroll', stagger: 0.1, staggerSelector: 'li' }">
 *   <li>...</li>
 * </ul>
 */
@Directive({
  selector: '[hkAnimate]',
})
export class MotionAnimateDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Animation to play. Pass a preset name (see `AnimationPreset`) or a raw
   * keyframes object (e.g. `{ opacity: [0, 1], y: [20, 0] }`).
   * Default: `'fadeIn'`.
   */
  readonly hkAnimate = input<AnimationPreset | Record<string, unknown>>('fadeIn');
  /**
   * Trigger, timing, easing, scroll thresholds, and optional child stagger.
   * See `MotionDirectiveOptions` for the full shape.
   */
  readonly hkAnimateOptions = input<MotionDirectiveOptions>({});

  private element!: HTMLElement;
  private cleanupFunctions: (() => void)[] = [];
  private hasAnimated = false;
  private animationControls: AnimationControls | null = null;
  private clickHandler: (() => void) | null = null;

  ngOnInit(): void {
    this.element = this.elementRef.nativeElement;
    this.setupAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hkAnimate'] || changes['hkAnimateOptions']) {
      this.cleanup();
      this.hasAnimated = false;
      this.setupAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupAnimation(): void {
    if (!this.element) return;
    const trigger: TriggerType = this.hkAnimateOptions().trigger || 'immediate';

    switch (trigger) {
      case 'scroll':
        this.setupScrollAnimation();
        break;
      case 'click':
        this.setupClickAnimation();
        break;
      case 'immediate':
      default:
        this.playAnimation();
        break;
    }
  }

  private setupScrollAnimation(): void {
    const options: InViewOptions = {};
    const motionOpts = this.hkAnimateOptions();

    if (motionOpts.margin) options.margin = motionOpts.margin;
    if (motionOpts.amount !== undefined) options.amount = motionOpts.amount;

    const cleanup = inView(
      this.element,
      () => {
        if (!this.hasAnimated || !motionOpts.once) {
          this.playAnimation();
          this.hasAnimated = true;
        }
      },
      options,
    );

    if (typeof cleanup === 'function') {
      this.cleanupFunctions.push(cleanup);
    }
  }

  private setupClickAnimation(): void {
    this.clickHandler = () => this.playAnimation();
    this.element.addEventListener('click', this.clickHandler);
    const handler = this.clickHandler;
    this.cleanupFunctions.push(() => this.element.removeEventListener('click', handler));
  }

  private playAnimation(): void {
    if (prefersReducedMotion(this.platformId)) {
      const keyframes = this.getKeyframes();
      for (const [prop, value] of Object.entries(keyframes)) {
        const finalValue = Array.isArray(value) ? value[value.length - 1] : value;
        if (prop === 'opacity') {
          this.element.style.opacity = String(finalValue);
        }
      }
      return;
    }

    safeStopAnimation(this.animationControls);

    const opts = this.hkAnimateOptions();
    const staggerConfig = opts.stagger;

    try {
      if (staggerConfig) {
        const selector = opts.staggerSelector || ':scope > *';
        const children = Array.from(this.element.querySelectorAll(selector));
        if (children.length === 0) return;

        const { duration: staggerDuration, ...staggerOpts } =
          typeof staggerConfig === 'number' ? { duration: staggerConfig } : staggerConfig;
        const staggerDelay = stagger(staggerDuration, staggerOpts);

        this.animationControls = animate(
          children as Element[],
          this.getKeyframes() as Record<string, string | number | (string | number)[]>,
          { ...this.getAnimationOptions(), delay: staggerDelay } as never,
        ) as AnimationControls;
      } else {
        this.animationControls = animate(this.element, this.getKeyframes(), this.getAnimationOptions()) as AnimationControls;
      }
    } catch {
      this.animationControls = null;
    }
  }

  private getKeyframes(): Record<string, unknown> {
    const anim = this.hkAnimate();
    if (typeof anim === 'string') {
      return ANIMATION_PRESETS[anim] || ANIMATION_PRESETS.fadeIn;
    }
    return anim;
  }

  private getAnimationOptions(): MotionAnimationOptions {
    const opts = this.hkAnimateOptions();
    const { trigger, margin, amount, once, offset, axis, stagger, staggerSelector, ...animationOptions } = opts;
    void trigger;
    void margin;
    void amount;
    void once;
    void offset;
    void axis;
    void stagger;
    void staggerSelector;
    return { duration: 0.6, ease: 'easeOut' as const, ...animationOptions };
  }

  private cleanup(): void {
    safeStopAnimation(this.animationControls);
    this.animationControls = null;
    this.clickHandler = null;

    for (const fn of this.cleanupFunctions) {
      try {
        fn();
      } catch {
        /* element may already be removed */
      }
    }
    this.cleanupFunctions = [];
  }

  play(): void {
    this.playAnimation();
  }
  stop(): void {
    safeStopAnimation(this.animationControls);
  }
  reset(): void {
    this.hasAnimated = false;
  }
}
