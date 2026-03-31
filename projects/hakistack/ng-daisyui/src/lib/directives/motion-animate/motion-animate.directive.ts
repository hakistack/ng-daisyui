import { Directive, ElementRef, input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { inView, animate } from 'motion';
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

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[motionAnimate]',
})
export class MotionAnimateDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly motionAnimate = input<AnimationPreset | Record<string, unknown>>('fadeIn');
  readonly motionOptions = input<MotionDirectiveOptions>({});

  private element: HTMLElement;
  private cleanupFunctions: (() => void)[] = [];
  private hasAnimated = false;
  private animationControls: AnimationControls | null = null;

  constructor() {
    this.element = this.elementRef.nativeElement;
  }

  ngOnInit(): void {
    this.setupAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['motionAnimate'] || changes['motionOptions']) {
      this.cleanup();
      this.hasAnimated = false;
      this.setupAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupAnimation(): void {
    const trigger: TriggerType = this.motionOptions().trigger || 'immediate';

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
    const motionOpts = this.motionOptions();

    if (motionOpts.margin) {
      options.margin = motionOpts.margin;
    }

    if (motionOpts.amount !== undefined) {
      options.amount = motionOpts.amount;
    }

    const cleanup = inView(
      this.element,
      () => {
        const shouldAnimate = !this.hasAnimated || !motionOpts.once;
        if (shouldAnimate) {
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
    const handleClick = () => this.playAnimation();

    this.element.addEventListener('click', handleClick);
    this.cleanupFunctions.push(() => {
      this.element.removeEventListener('click', handleClick);
    });
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

    const keyframes = this.getKeyframes();
    const options = this.getAnimationOptions();

    try {
      this.animationControls = animate(this.element, keyframes, options);
    } catch {
      // Animation failed — element may have been removed from DOM
    }
  }

  private getKeyframes(): Record<string, unknown> {
    const anim = this.motionAnimate();
    if (typeof anim === 'string') {
      return ANIMATION_PRESETS[anim] || ANIMATION_PRESETS.fadeIn;
    }
    return anim;
  }

  private getAnimationOptions(): MotionAnimationOptions {
    const defaultOptions: MotionAnimationOptions = {
      duration: 0.6,
      ease: 'easeOut' as const,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to exclude directive-only options
    const { trigger, margin, amount, once, offset, axis, ...animationOptions } = this.motionOptions();

    return {
      ...defaultOptions,
      ...animationOptions,
    };
  }

  private cleanup(): void {
    safeStopAnimation(this.animationControls);

    for (const cleanupFn of this.cleanupFunctions) {
      try {
        cleanupFn();
      } catch {
        // Cleanup may fail if element was already removed
      }
    }
    this.cleanupFunctions = [];
  }

  // Public methods for programmatic control
  public play(): void {
    this.playAnimation();
  }

  public stop(): void {
    safeStopAnimation(this.animationControls);
  }

  public reset(): void {
    this.hasAnimated = false;
  }
}
