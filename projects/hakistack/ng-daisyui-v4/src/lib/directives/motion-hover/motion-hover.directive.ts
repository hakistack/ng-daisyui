import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, hover } from 'motion';
import type { AnimationControls, MotionAnimationOptions } from '../motion.types';
import { prefersReducedMotion, safeStopAnimation } from '../motion.utils';

export interface HoverOptions {
  passive?: boolean;
  once?: boolean;
}

export type HoverAnimationOptions = MotionAnimationOptions;

export type HoverKeyframes = Record<string, unknown> | Record<string, unknown[]>;

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[motionHover]',
})
export class MotionHoverDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly hoverKeyframes = input.required<HoverKeyframes>({ alias: 'motionHover' });
  readonly hoverOptions = input<HoverOptions | undefined>();
  readonly animationOptions = input<HoverAnimationOptions | undefined>();
  readonly restoreOnLeave = input<boolean>(true);
  readonly customRestoreKeyframes = input<HoverKeyframes | undefined>();

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

    if (!isPlatformBrowser(this.platformId)) return;

    this.initialValues = {};
    const computedStyle = window.getComputedStyle(this.element);

    for (const prop of Object.keys(keyframes)) {
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
          const value = computedStyle.getPropertyValue(prop);
          if (value) {
            this.initialValues[prop] = value;
          }
        }
      }
    }
  }

  private setupHoverAnimation(): void {
    if (prefersReducedMotion(this.platformId)) {
      return;
    }

    const keyframes = this.hoverKeyframes();
    if (!keyframes) {
      return;
    }

    try {
      this.cleanup = hover(
        this.element,
        (element: Element, startEvent: PointerEvent) => {
          this.hoverStart.emit(startEvent);
          this.stopAnimations();
          this.currentAnimation = animate(element, keyframes, this.getAnimationOptions()) as AnimationControls;

          return (endEvent: PointerEvent) => {
            this.hoverEnd.emit(endEvent);
            if (this.restoreOnLeave()) {
              this.animateRestore();
            }
          };
        },
        this.hoverOptions() || {},
      );
    } catch {
      // Hover setup failed — element may not support pointer events
    }
  }

  private animateRestore(): void {
    this.stopAnimations();

    try {
      const restoreKeyframes = this.customRestoreKeyframes() || this.createRestoreKeyframes();

      if (restoreKeyframes && Object.keys(restoreKeyframes).length > 0) {
        this.restoreAnimation = animate(this.element, restoreKeyframes, this.getRestoreAnimationOptions()) as AnimationControls;
      }
    } catch {
      // Restore animation failed — element may have been removed
    }
  }

  private createRestoreKeyframes(): HoverKeyframes {
    const keyframes = this.hoverKeyframes();
    if (!this.initialValues || !keyframes) return {};

    const restoreKeyframes: HoverKeyframes = {};

    for (const prop of Object.keys(keyframes)) {
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

    return {
      ...restoreOptions,
      duration: (restoreOptions.duration || 0.3) * 0.8,
      ease: 'easeOut' as const,
    };
  }

  private stopAnimations(): void {
    safeStopAnimation(this.currentAnimation);
    safeStopAnimation(this.restoreAnimation);
  }

  private cleanupHover(): void {
    this.stopAnimations();

    if (this.cleanup) {
      try {
        this.cleanup();
      } catch {
        // Cleanup may fail if element was already removed
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
