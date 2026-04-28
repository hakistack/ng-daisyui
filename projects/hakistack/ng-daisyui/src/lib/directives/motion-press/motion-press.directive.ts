import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, press } from 'motion';
import type { AnimationControls, MotionAnimationOptions } from '../motion.types';
import { prefersReducedMotion, safeStopAnimation } from '../motion.utils';

/** Keyframes object — same format as `motion`'s `animate()` (e.g. `{ scale: 0.95 }`). */
export type PressKeyframes = Record<string, unknown> | Record<string, unknown[]>;

/** Options forwarded to `motion`'s `press()` function. */
export interface PressOptions {
  /** Use passive event listeners (cannot call `preventDefault`). */
  passive?: boolean;
  /** Only trigger once, then auto-remove the listener. */
  once?: boolean;
}

/** Info passed to `pressEnd`. `success` is `true` if the press was released over the element (i.e. a successful tap). */
export interface PressEndInfo {
  success: boolean;
}

/**
 * Animate an element while pressed (mouse/touch), then restore on release.
 *
 * On press-start, animates **to** the target keyframes. On release, by default
 * animates **back** to the element's initial computed style. The restore is
 * faster than the press-down (60% of duration) for a snappier feel.
 *
 * `pressEnd` emits `{ event, success }` — `success` is `true` if released over
 * the element (a true tap), `false` if the pointer dragged off before release.
 *
 * Honors `prefers-reduced-motion`.
 *
 * @example Tap-to-shrink button
 * <button [hkPress]="{ scale: 0.95 }">Click</button>
 *
 * @example Detect successful tap vs. drag-off
 * <button [hkPress]="{ scale: 0.9 }"
 *         (pressEnd)="$event.success && handleTap()">
 * </button>
 */
@Directive({
  selector: '[hkPress]',
})
export class MotionPressDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Keyframes to animate **to** on press-start. Aliased as `[hkPress]`. */
  readonly pressKeyframes = input.required<PressKeyframes>({ alias: 'hkPress' });
  /** Forwarded to `motion`'s `press()`: `{ passive?, once? }`. */
  readonly pressOptions = input<PressOptions | undefined>();
  /** Animation timing/easing for the press transition. Default: `{ duration: 0.15, ease: 'easeOut' }`. */
  readonly animationOptions = input<MotionAnimationOptions | undefined>();
  /** Animate back to the captured initial style on release. Default: `true`. */
  readonly restoreOnRelease = input<boolean>(true);
  /** Override the restore target instead of using the captured initial style. */
  readonly customRestoreKeyframes = input<PressKeyframes | undefined>();

  /** Fires when press begins. */
  readonly pressStart = output<PointerEvent>();
  /** Fires on release. `success: true` means released over the element (tap); `false` means dragged off. */
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
