import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, hover } from 'motion';
import type { AnimationControls, MotionAnimationOptions } from '../motion.types';
import { prefersReducedMotion, safeStopAnimation } from '../motion.utils';

/** Options forwarded to `motion`'s `hover()` function. */
export interface HoverOptions {
  /** Use passive event listeners (cannot call `preventDefault`). */
  passive?: boolean;
  /** Only trigger once, then auto-remove the listener. */
  once?: boolean;
}

/** Animation options for the hover transition (duration, easing, etc). */
export type HoverAnimationOptions = MotionAnimationOptions;
/** Keyframes object — same format as `motion`'s `animate()` (e.g. `{ scale: 1.05 }`). */
export type HoverKeyframes = Record<string, unknown> | Record<string, unknown[]>;

/**
 * Animate an element on hover, then restore it when the cursor leaves.
 *
 * On hover-start, animates **to** the target keyframes. On hover-end, by default
 * animates **back** to the element's initial computed style (snapshot taken in
 * `ngOnInit`). Pass `customRestoreKeyframes` to override the restore target, or
 * set `[restoreOnLeave]="false"` to leave the hovered state in place.
 *
 * Honors `prefers-reduced-motion`: if enabled, the directive does nothing.
 *
 * @example Lift on hover
 * <button [hkHover]="{ y: -4, scale: 1.02 }">Hover me</button>
 *
 * @example Custom timing + restore target
 * <div [hkHover]="{ scale: 1.1, backgroundColor: '#3b82f6' }"
 *      [animationOptions]="{ duration: 0.4, ease: 'easeInOut' }"
 *      [customRestoreKeyframes]="{ scale: 1, backgroundColor: '#1f2937' }">
 * </div>
 *
 * @example Hover-start/end events
 * <div [hkHover]="{ scale: 1.05 }"
 *      (hoverStart)="trackEnter()"
 *      (hoverEnd)="trackLeave()">
 * </div>
 */
@Directive({
  selector: '[hkHover]',
})
export class MotionHoverDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Keyframes to animate **to** on hover. Aliased as `[hkHover]`.
   * Use shorthand transform props like `x`, `y`, `scale`, `rotate`.
   */
  readonly hoverKeyframes = input.required<HoverKeyframes>({ alias: 'hkHover' });
  /** Forwarded to `motion`'s `hover()`: `{ passive?, once? }`. */
  readonly hoverOptions = input<HoverOptions | undefined>();
  /** Animation timing/easing for the hover transition. Default: `{ duration: 0.3, ease: 'easeOut' }`. */
  readonly animationOptions = input<HoverAnimationOptions | undefined>();
  /**
   * If `true` (default), animate back to the captured initial style on hover-end.
   * Set `false` to leave the hovered state applied.
   */
  readonly restoreOnLeave = input<boolean>(true);
  /**
   * Override the restore target. Useful when the captured initial style isn't
   * what you want to return to (e.g. when the element starts hidden).
   */
  readonly customRestoreKeyframes = input<HoverKeyframes | undefined>();

  /** Fires when hover begins. Payload is the originating `PointerEvent`. */
  readonly hoverStart = output<PointerEvent>();
  /** Fires when hover ends. Payload is the originating `PointerEvent`. */
  readonly hoverEnd = output<PointerEvent>();

  // Resolved from elementRef lazily so it's safe during `ngOnChanges`
  // (which fires before `ngOnInit`).
  private get element(): HTMLElement {
    return this.elementRef.nativeElement;
  }
  private cleanup?: () => void;
  private currentAnimation: AnimationControls | null = null;
  private restoreAnimation: AnimationControls | null = null;
  private initialValues?: Record<string, unknown>;

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
    if (!isPlatformBrowser(this.platformId)) return;

    const keyframes = this.hoverKeyframes();
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
        case 'backgroundColor':
          this.initialValues[prop] = computedStyle.backgroundColor || 'transparent';
          break;
        default: {
          const value = computedStyle.getPropertyValue(prop);
          if (value) this.initialValues[prop] = value;
        }
      }
    }
  }

  private setupHoverAnimation(): void {
    if (prefersReducedMotion(this.platformId)) return;

    const keyframes = this.hoverKeyframes();
    if (!keyframes) return;

    try {
      this.cleanup = hover(
        this.element,
        (element: Element, startEvent: PointerEvent) => {
          this.hoverStart.emit(startEvent);
          this.stopAnimations();
          this.currentAnimation = animate(element, keyframes, this.getAnimationOptions()) as AnimationControls;

          return (endEvent: PointerEvent) => {
            this.hoverEnd.emit(endEvent);
            if (this.restoreOnLeave()) this.animateRestore();
          };
        },
        this.hoverOptions() || {},
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
      this.restoreAnimation = animate(this.element, restoreKeyframes, this.getRestoreOptions()) as AnimationControls;
    } catch {
      this.restoreAnimation = null;
    }
  }

  private createRestoreKeyframes(): HoverKeyframes {
    if (!this.initialValues) return {};
    const keyframes = this.hoverKeyframes();
    const restore: HoverKeyframes = {};
    for (const prop of Object.keys(keyframes)) {
      if (Object.prototype.hasOwnProperty.call(this.initialValues, prop)) {
        restore[prop] = this.initialValues[prop];
      }
    }
    return restore;
  }

  private getAnimationOptions(): HoverAnimationOptions {
    return { duration: 0.3, ease: 'easeOut' as const, type: 'tween', ...this.animationOptions() };
  }

  private getRestoreOptions(): HoverAnimationOptions {
    const opts = this.getAnimationOptions();
    return { ...opts, duration: (opts.duration || 0.3) * 0.8, ease: 'easeOut' as const };
  }

  private stopAnimations(): void {
    safeStopAnimation(this.currentAnimation);
    safeStopAnimation(this.restoreAnimation);
    this.currentAnimation = null;
    this.restoreAnimation = null;
  }

  private cleanupHover(): void {
    this.stopAnimations();
    if (this.cleanup) {
      try {
        this.cleanup();
      } catch {
        /* element may already be removed */
      }
      this.cleanup = undefined;
    }
  }

  triggerHover(): void {
    const keyframes = this.hoverKeyframes();
    if (!keyframes) return;
    this.stopAnimations();
    this.currentAnimation = animate(this.element, keyframes, this.getAnimationOptions()) as AnimationControls;
  }

  triggerRestore(): void {
    if (this.restoreOnLeave()) this.animateRestore();
  }

  stop(): void {
    this.stopAnimations();
  }
}
