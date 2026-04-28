import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { scroll, animate } from 'motion';
import type { AnimationPlaybackControls } from 'motion-dom';
import { prefersReducedMotion } from '../motion.utils';

export type ScrollAxis = 'x' | 'y';
export type OffsetValue = number | string;
/** A scroll-progress threshold: a named alignment or a CSS length / percentage. */
export type OffsetPoint = 'start' | 'center' | 'end' | OffsetValue;
/**
 * Pair of offsets `[start, end]` defining when scroll progress = 0 and = 1.
 * Example: `['start end', 'end start']` — progress 0 when target's start meets viewport's end (just entering),
 * progress 1 when target's end meets viewport's start (just leaving).
 */
export type ScrollOffset = [OffsetPoint, OffsetPoint] | OffsetPoint[];

/** Detailed scroll info emitted by `scrollInfo` — current px, total scroll length, velocity, per-axis. */
export interface ScrollInfo {
  x: { current: number; scrollLength: number; velocity: number };
  y: { current: number; scrollLength: number; velocity: number };
}

/** Scroll-tracker options. Same fields are available as individual inputs (`scrollContainer`, etc.). */
export interface ScrollOptions {
  container?: HTMLElement | null;
  target?: HTMLElement | null;
  axis?: ScrollAxis;
  offset?: ScrollOffset;
}

/** Keyframes for scroll-linked animation. Animation progress is driven by scroll position. */
export type ScrollAnimationKeyframes = Record<string, unknown[] | unknown>;

interface ScrollAnimationOptions {
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  duration?: number;
}

/**
 * Drive an animation or emit progress based on scroll position.
 *
 * Two modes, picked by what you pass to `[hkScroll]`:
 * 1. **Keyframes object** — animates the host element with progress linked to scroll
 *    (e.g. parallax, scroll-progress bar). Animation is paused-and-scrubbed, not played.
 * 2. **`true`** (or any non-object truthy) — emits `scrollProgress` (0–1) and `scrollInfo`
 *    on every scroll event without animating anything.
 *
 * Honors `prefers-reduced-motion`: if enabled, the directive does nothing.
 *
 * @example Scroll-progress bar (keyframes mode)
 * <div [hkScroll]="{ scaleX: [0, 1] }"
 *      class="fixed top-0 left-0 h-1 w-full origin-left bg-primary"></div>
 *
 * @example Track scroll progress without animating
 * <section [hkScroll]="true" (scrollProgress)="pct.set($event)"></section>
 *
 * @example Element-relative tracking
 * <article #target>
 *   <div [hkScroll]="{ opacity: [0, 1] }"
 *        [scrollTarget]="target"
 *        [scrollOffset]="['start end', 'end start']"></div>
 * </article>
 */
@Directive({
  selector: '[hkScroll]',
})
export class MotionScrollDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Mode selector. Pass keyframes (object) for scroll-linked animation, or
   * `true` to only emit `scrollProgress` / `scrollInfo`.
   */
  readonly hkScroll = input<ScrollAnimationKeyframes | boolean | undefined>(undefined);
  /** Bundle of scroll options. Individual inputs below take precedence. */
  readonly scrollOptions = input<ScrollOptions>({});
  /** Custom scroll container. Default: `null` (window). */
  readonly scrollContainer = input<HTMLElement | undefined>();
  /** Element used to compute progress thresholds. Default: the host. */
  readonly scrollTarget = input<HTMLElement | undefined>();
  /** Scroll axis. Default: `'y'`. */
  readonly scrollAxis = input<ScrollAxis>('y');
  /**
   * Progress thresholds: `[startOffset, endOffset]`. Progress is `0` at the start
   * offset and `1` at the end offset. Each offset is either `'start' | 'center' | 'end'`,
   * a CSS length, or a "target-side viewport-side" string like `'start end'`.
   */
  readonly scrollOffset = input<ScrollOffset | undefined>();
  /** Easing/duration for the linked animation (keyframes mode). Default ease: `'linear'`. */
  readonly animationOptions = input<ScrollAnimationOptions>({});

  /** Current scroll progress, normalized to `0..1`. Emitted on every scroll. */
  readonly scrollProgress = output<number>();
  /** Full scroll info: `{ x, y }` with current px, scroll length, and velocity. */
  readonly scrollInfo = output<ScrollInfo>();

  private element!: HTMLElement;
  private cleanupFunction?: VoidFunction;
  private animationControls: AnimationPlaybackControls | null = null;

  ngOnInit(): void {
    this.element = this.elementRef.nativeElement;
    this.setupScrollAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['hkScroll'] ||
      changes['scrollOptions'] ||
      changes['scrollContainer'] ||
      changes['scrollTarget'] ||
      changes['scrollAxis'] ||
      changes['scrollOffset']
    ) {
      this.cleanup();
      this.setupScrollAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupScrollAnimation(): void {
    const anim = this.hkScroll();
    if (!anim || prefersReducedMotion(this.platformId)) return;

    const options = this.buildScrollOptions();

    if (typeof anim === 'object') {
      this.setupScrollLinkedAnimation(options, anim);
    } else {
      this.setupScrollProgressTracking(options);
    }
  }

  private buildScrollOptions(): ScrollOptions {
    const opts = this.scrollOptions();
    return {
      container: opts.container || this.scrollContainer() || null,
      target: opts.target || this.scrollTarget() || this.element,
      axis: opts.axis || this.scrollAxis(),
      offset: opts.offset || this.scrollOffset(),
    };
  }

  private setupScrollLinkedAnimation(options: ScrollOptions, keyframes: ScrollAnimationKeyframes): void {
    try {
      const animOpts = { ease: 'linear' as const, ...this.animationOptions() };
      this.animationControls = animate(this.element, keyframes as Record<string, string | number | (string | number)[]>, animOpts);
      this.cleanupFunction = scroll(this.animationControls, this.filterScrollOptions(options) as Parameters<typeof scroll>[1]);
    } catch {
      this.setupScrollProgressTracking(options);
    }
  }

  private setupScrollProgressTracking(options: ScrollOptions): void {
    try {
      this.cleanupFunction = scroll(
        (progress: number, info: ScrollInfo) => {
          this.scrollProgress.emit(progress);
          this.scrollInfo.emit(info);
        },
        this.filterScrollOptions(options) as Parameters<typeof scroll>[1],
      );
    } catch {
      this.cleanupFunction = undefined;
    }
  }

  private filterScrollOptions(options: ScrollOptions): Partial<ScrollOptions> {
    const filtered: Partial<ScrollOptions> = {};
    if (options.container) filtered.container = options.container;
    if (options.target && options.target !== this.element) filtered.target = options.target;
    if (options.axis && options.axis !== 'y') filtered.axis = options.axis;
    if (options.offset) filtered.offset = options.offset;
    return filtered;
  }

  private cleanup(): void {
    if (this.animationControls) {
      try {
        this.animationControls.stop();
      } catch {
        /* already stopped */
      }
      this.animationControls = null;
    }
    if (this.cleanupFunction) {
      try {
        this.cleanupFunction();
      } catch {
        /* already disposed */
      }
      this.cleanupFunction = undefined;
    }
  }

  stop(): void {
    this.cleanup();
  }
  restart(): void {
    this.cleanup();
    this.setupScrollAnimation();
  }
}
