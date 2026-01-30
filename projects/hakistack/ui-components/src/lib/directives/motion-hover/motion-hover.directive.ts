import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { animate, hover } from 'motion';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';

// Proper types based on Motion.dev API
export interface HoverOptions {
  passive?: boolean;
  once?: boolean;
}

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

export interface HoverAnimationOptions {
  duration?: number;
  delay?: number;
  ease?: Easing | Easing[];
  type?: 'tween' | 'spring' | 'inertia';
  repeat?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  endDelay?: number;
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

export type HoverKeyframes = Record<string, unknown> | Record<string, unknown[]>;

/** Animation controls interface for Motion.js */
interface AnimationControls {
  stop: () => void;
  finished?: Promise<void>;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[motionHover]',
})
export class MotionHoverDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly a11y = inject(AccessibilityService);

  readonly hoverKeyframes = input.required<HoverKeyframes>({ alias: 'motionHover' });
  readonly hoverOptions = input<HoverOptions | undefined>();
  readonly animationOptions = input<HoverAnimationOptions | undefined>();
  readonly restoreOnLeave = input<boolean>(true);
  readonly customRestoreKeyframes = input<HoverKeyframes | undefined>();

  // Event outputs
  readonly hoverStart = output<PointerEvent>();
  readonly hoverEnd = output<PointerEvent>();

  private element: HTMLElement;
  private cleanup?: () => void;
  private currentAnimation: AnimationControls | null = null;
  private restoreAnimation: AnimationControls | null = null;
  private initialValues?: Record<string, unknown>;

  constructor() {
    this.element = this.elementRef.nativeElement;
  }

  ngOnInit(): void {
    this.captureInitialValues();
    this.setupHoverAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hoverKeyframes'] || changes['hoverOptions'] || changes['animationOptions']) {
      this.cleanupHover();
      this.captureInitialValues();
      this.setupHoverAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanupHover();
  }

  private captureInitialValues(): void {
    const keyframes = this.hoverKeyframes();
    if (!keyframes) return;

    this.initialValues = {};
    const computedStyle = window.getComputedStyle(this.element);

    for (const prop in keyframes) {
      try {
        // Capture initial CSS values for restoration
        switch (prop) {
          case 'x':
          case 'y':
          case 'z':
            this.initialValues[prop] = 0;
            break;
          case 'scale':
          case 'scaleX':
          case 'scaleY':
          case 'scaleZ':
            this.initialValues[prop] = 1;
            break;
          case 'rotate':
          case 'rotateX':
          case 'rotateY':
          case 'rotateZ':
            this.initialValues[prop] = 0;
            break;
          case 'opacity':
            this.initialValues[prop] = computedStyle.opacity || 1;
            break;
          case 'backgroundColor':
            this.initialValues[prop] = computedStyle.backgroundColor || 'transparent';
            break;
          default: {
            // Try to get the computed value
            const value = computedStyle.getPropertyValue(prop);
            if (value) {
              this.initialValues[prop] = value;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to capture initial value for ${prop}:`, error);
      }
    }
  }

  private setupHoverAnimation(): void {
    // Skip hover animations if reduced motion is active
    if (this.a11y.isReducedMotionActive()) {
      return;
    }

    const keyframes = this.hoverKeyframes();
    if (!keyframes) {
      console.warn('motionHover: No keyframes provided');
      return;
    }

    try {
      this.cleanup = hover(
        this.element,
        (element: Element, startEvent: PointerEvent) => {
          // Emit hover start event
          this.hoverStart.emit(startEvent);

          // Stop any existing animations
          this.stopAnimations();

          // Start hover animation
          this.currentAnimation = animate(element, keyframes, this.getAnimationOptions()) as AnimationControls;

          // Return cleanup function for hover end
          return (endEvent: PointerEvent) => {
            this.hoverEnd.emit(endEvent);

            // Handle restoration on hover end
            if (this.restoreOnLeave()) {
              this.animateRestore();
            }
          };
        },
        this.hoverOptions() || {},
      );
    } catch (error) {
      console.error('Motion hover setup failed:', error);
    }
  }

  private animateRestore(): void {
    this.stopAnimations();

    try {
      const restoreKeyframes = this.customRestoreKeyframes() || this.createRestoreKeyframes();

      if (restoreKeyframes && Object.keys(restoreKeyframes).length > 0) {
        this.restoreAnimation = animate(this.element, restoreKeyframes, this.getRestoreAnimationOptions()) as AnimationControls;
      }
    } catch (error) {
      console.warn('Failed to animate restore:', error);
    }
  }

  private createRestoreKeyframes(): HoverKeyframes {
    const keyframes = this.hoverKeyframes();
    if (!this.initialValues || !keyframes) return {};

    const restoreKeyframes: HoverKeyframes = {};

    for (const prop in keyframes) {
      if (Object.prototype.hasOwnProperty.call(this.initialValues, prop)) {
        restoreKeyframes[prop] = this.initialValues[prop];
      }
    }

    return restoreKeyframes;
  }

  private getAnimationOptions(): HoverAnimationOptions {
    const defaultOptions: HoverAnimationOptions = {
      duration: 0.3,
      ease: 'easeOut' as const,
      type: 'tween',
    };

    return {
      ...defaultOptions,
      ...this.animationOptions(),
    };
  }

  private getRestoreAnimationOptions(): HoverAnimationOptions {
    const restoreOptions = this.getAnimationOptions();

    // Make restore animation slightly faster and smoother
    return {
      ...restoreOptions,
      duration: (restoreOptions.duration || 0.3) * 0.8,
      ease: 'easeOut' as const,
    };
  }

  private stopAnimations(): void {
    if (this.currentAnimation && typeof this.currentAnimation.stop === 'function') {
      try {
        this.currentAnimation.stop();
      } catch (error) {
        console.warn('Failed to stop current animation:', error);
      }
    }

    if (this.restoreAnimation && typeof this.restoreAnimation.stop === 'function') {
      try {
        this.restoreAnimation.stop();
      } catch (error) {
        console.warn('Failed to stop restore animation:', error);
      }
    }
  }

  private cleanupHover(): void {
    this.stopAnimations();

    if (this.cleanup) {
      try {
        this.cleanup();
      } catch (error) {
        console.warn('Failed to cleanup hover listeners:', error);
      }
      this.cleanup = undefined;
    }
  }

  // Public methods for programmatic control
  public triggerHover(): void {
    const keyframes = this.hoverKeyframes();
    if (keyframes) {
      this.stopAnimations();
      this.currentAnimation = animate(this.element, keyframes, this.getAnimationOptions()) as AnimationControls;
    }
  }

  public triggerRestore(): void {
    if (this.restoreOnLeave()) {
      this.animateRestore();
    }
  }

  public stop(): void {
    this.stopAnimations();
  }
}
