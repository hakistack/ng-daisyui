import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, press } from 'motion';
import type { AnimationControls, MotionAnimationOptions } from '../motion.types';
import { prefersReducedMotion, safeStopAnimation } from '../motion.utils';

export type PressKeyframes = Record<string, unknown> | Record<string, unknown[]>;

export interface PressOptions {
  passive?: boolean;
  once?: boolean;
}

export interface PressEndInfo {
  success: boolean;
}

@Directive({
  selector: '[hkPress]',
})
export class MotionPressDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly pressKeyframes = input.required<PressKeyframes>({ alias: 'hkPress' });
  readonly pressOptions = input<PressOptions | undefined>();
  readonly animationOptions = input<MotionAnimationOptions | undefined>();
  readonly restoreOnRelease = input<boolean>(true);
  readonly customRestoreKeyframes = input<PressKeyframes | undefined>();

  readonly pressStart = output<PointerEvent>();
  readonly pressEnd = output<{ event: PointerEvent; success: boolean }>();

  private element!: HTMLElement;
  private cleanup?: () => void;
  private currentAnimation: AnimationControls | null = null;
  private restoreAnimation: AnimationControls | null = null;
  private initialValues?: Record<string, unknown>;

  ngOnInit(): void {
    this.element = this.elementRef.nativeElement;
    this.captureInitialValues();
    this.setupPressAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pressKeyframes'] || changes['pressOptions'] || changes['animationOptions']) {
      this.cleanupPress();
      this.captureInitialValues();
      this.setupPressAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanupPress();
  }

  private captureInitialValues(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const keyframes = this.pressKeyframes();
    if (!keyframes) return;

    const computedStyle = window.getComputedStyle(this.element);
    this.initialValues = {};

    for (const prop of Object.keys(keyframes)) {
      switch (prop) {
        case 'x':
        case 'y':
        case 'z':
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
          this.initialValues[prop] = 0;
          break;
        case 'scale':
        case 'scaleX':
        case 'scaleY':
        case 'scaleZ':
          this.initialValues[prop] = 1;
          break;
        case 'opacity':
          this.initialValues[prop] = computedStyle.opacity || 1;
          break;
        default: {
          const value = computedStyle.getPropertyValue(prop);
          if (value) this.initialValues[prop] = value;
        }
      }
    }
  }

  private setupPressAnimation(): void {
    if (prefersReducedMotion(this.platformId)) return;

    const keyframes = this.pressKeyframes();
    if (!keyframes) return;

    try {
      this.cleanup = press(
        this.element,
        (element: Element, startEvent: PointerEvent) => {
          this.pressStart.emit(startEvent);
          this.stopAnimations();
          this.currentAnimation = animate(element, keyframes, this.getAnimationOptions()) as AnimationControls;

          return (endEvent: PointerEvent, info: PressEndInfo) => {
            this.pressEnd.emit({ event: endEvent, success: info.success });
            if (this.restoreOnRelease()) this.animateRestore();
          };
        },
        this.pressOptions() || {},
      );
    } catch {
      this.cleanup = undefined;
    }
  }

  private animateRestore(): void {
    this.stopAnimations();
    const restoreKeyframes = this.customRestoreKeyframes() || this.createRestoreKeyframes();
    if (!restoreKeyframes || Object.keys(restoreKeyframes).length === 0) return;

    try {
      const opts = this.getAnimationOptions();
      this.restoreAnimation = animate(this.element, restoreKeyframes, {
        ...opts,
        duration: (opts.duration || 0.2) * 0.6,
        ease: 'easeOut' as const,
      }) as AnimationControls;
    } catch {
      this.restoreAnimation = null;
    }
  }

  private createRestoreKeyframes(): PressKeyframes {
    if (!this.initialValues) return {};
    const keyframes = this.pressKeyframes();
    const restore: PressKeyframes = {};
    for (const prop of Object.keys(keyframes)) {
      if (Object.prototype.hasOwnProperty.call(this.initialValues, prop)) {
        restore[prop] = this.initialValues[prop];
      }
    }
    return restore;
  }

  private getAnimationOptions(): MotionAnimationOptions {
    return { duration: 0.15, ease: 'easeOut' as const, ...this.animationOptions() };
  }

  private stopAnimations(): void {
    safeStopAnimation(this.currentAnimation);
    safeStopAnimation(this.restoreAnimation);
    this.currentAnimation = null;
    this.restoreAnimation = null;
  }

  private cleanupPress(): void {
    this.stopAnimations();
    if (this.cleanup) {
      try {
        this.cleanup();
      } catch {
        /* already disposed */
      }
      this.cleanup = undefined;
    }
  }

  stop(): void {
    this.stopAnimations();
  }
}
