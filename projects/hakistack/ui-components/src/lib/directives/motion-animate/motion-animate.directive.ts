import { Directive, ElementRef, input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { animate, inView } from 'motion';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';

// Enhanced presets with proper Motion API keyframes
const ANIMATION_PRESETS = {
  fadeIn: { opacity: [0, 1] },
  fadeOut: { opacity: [1, 0] },
  fadeInUp: {
    opacity: [0, 1],
    y: [20, 0],
  },
  fadeInDown: {
    opacity: [0, 1],
    y: [-20, 0],
  },
  fadeInLeft: {
    opacity: [0, 1],
    x: [-20, 0],
  },
  fadeInRight: {
    opacity: [0, 1],
    x: [20, 0],
  },
  zoomIn: {
    opacity: [0, 1],
    scale: [0.8, 1],
  },
  zoomOut: {
    opacity: [1, 0],
    scale: [1, 0.8],
  },
  slideInUp: {
    y: ['100%', '0%'],
  },
  slideInDown: {
    y: ['-100%', '0%'],
  },
  bounceIn: {
    opacity: [0, 1],
    scale: [0.3, 1.05, 0.9, 1],
  },
  rotateIn: {
    opacity: [0, 1],
    rotate: [-180, 0],
    scale: [0.8, 1],
  },
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;
export type TriggerType = 'immediate' | 'scroll' | 'hover' | 'click';

export type EasingFunction = (progress: number) => number;

export type Easing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'circIn'
  | 'circOut'
  | 'circInOut'
  | 'backIn'
  | 'backOut'
  | 'backInOut'
  | 'anticipate'
  | [number, number, number, number] // cubic bezier
  | EasingFunction;

export interface MotionAnimationOptions {
  duration?: number;
  delay?: number;
  ease?: Easing | Easing[];
  repeat?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  endDelay?: number;
  type?: 'tween' | 'spring' | 'inertia';
  // Spring options
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
  // Duration-based spring options
  bounce?: number;
  visualDuration?: number;
}

type InViewOptions = NonNullable<Parameters<typeof inView>[2]>;
type MarginType = NonNullable<InViewOptions['margin']>;

export interface MotionDirectiveOptions extends MotionAnimationOptions {
  trigger?: TriggerType;
  // inView specific options
  margin?: MarginType;
  amount?: number | 'some' | 'all';
  once?: boolean;
  // scroll specific options
  offset?: [string, string] | string[];
  axis?: 'x' | 'y';
}

/** Animation controls interface for Motion.js */
interface AnimationControls {
  stop: () => void;
  finished?: Promise<void>;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[motionAnimate]',
})
export class MotionAnimateDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly a11y = inject(AccessibilityService);

  readonly motionAnimate = input<AnimationPreset | Record<string, unknown>>('fadeIn');
  readonly motionOptions = input<MotionDirectiveOptions>({});

  // Legacy support - will be deprecated
  readonly motionTrigger = input<TriggerType | undefined>();

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
    if (changes['animation'] || changes['motionOptions']) {
      this.cleanup();
      this.hasAnimated = false;
      this.setupAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupAnimation(): void {
    const trigger = this.motionOptions().trigger || this.motionTrigger() || 'immediate';

    switch (trigger) {
      case 'scroll':
        this.setupScrollAnimation();
        break;
      case 'hover':
        this.setupHoverAnimation();
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

    // Set margin if provided
    if (motionOpts.margin) {
      options.margin = motionOpts.margin;
    }

    // Set amount if provided
    if (motionOpts.amount !== undefined) {
      options.amount = motionOpts.amount;
    }

    // Use inView for scroll-triggered animations
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

  private setupHoverAnimation(): void {
    const handleMouseEnter = () => this.playAnimation();

    this.element.addEventListener('mouseenter', handleMouseEnter);
    this.cleanupFunctions.push(() => {
      this.element.removeEventListener('mouseenter', handleMouseEnter);
    });
  }

  private setupClickAnimation(): void {
    const handleClick = () => this.playAnimation();

    this.element.addEventListener('click', handleClick);
    this.cleanupFunctions.push(() => {
      this.element.removeEventListener('click', handleClick);
    });
  }

  private playAnimation(): void {
    // Skip animation if reduced motion is active
    if (this.a11y.isReducedMotionActive()) {
      // Apply final state instantly without animation
      const keyframes = this.getKeyframes();
      for (const [prop, value] of Object.entries(keyframes)) {
        const finalValue = Array.isArray(value) ? value[value.length - 1] : value;
        if (prop === 'opacity') {
          this.element.style.opacity = String(finalValue);
        }
      }
      return;
    }

    // Stop any existing animation
    if (this.animationControls && typeof this.animationControls.stop === 'function') {
      this.animationControls.stop();
    }

    const keyframes = this.getKeyframes();
    const options = this.getAnimationOptions();

    try {
      this.animationControls = animate(this.element, keyframes, options);
    } catch (error) {
      console.warn('Motion animation failed:', error);
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

    // Extract only animation-related options
    const { trigger, margin, amount, once, offset, axis, ...animationOptions } = this.motionOptions();

    return {
      ...defaultOptions,
      ...animationOptions,
    };
  }

  private cleanup(): void {
    // Stop any running animation
    if (this.animationControls && typeof this.animationControls.stop === 'function') {
      this.animationControls.stop();
    }

    // Clean up all event listeners and observers
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    this.cleanupFunctions = [];
  }

  // Public methods for programmatic control
  public play(): void {
    this.playAnimation();
  }

  public stop(): void {
    if (this.animationControls && typeof this.animationControls.stop === 'function') {
      this.animationControls.stop();
    }
  }

  public reset(): void {
    this.hasAnimated = false;
  }
}
