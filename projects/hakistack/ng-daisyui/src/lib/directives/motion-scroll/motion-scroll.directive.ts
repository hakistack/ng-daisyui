import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { scroll, animate } from 'motion';
import type { AnimationPlaybackControls } from 'motion-dom';
import { prefersReducedMotion } from '../motion.utils';

export type ScrollAxis = 'x' | 'y';
export type OffsetValue = number | string;
export type OffsetPoint = 'start' | 'center' | 'end' | OffsetValue;
export type ScrollOffset = [OffsetPoint, OffsetPoint] | OffsetPoint[];

export interface ScrollInfo {
  x: { current: number; scrollLength: number; velocity: number };
  y: { current: number; scrollLength: number; velocity: number };
}

export interface ScrollOptions {
  container?: HTMLElement | null;
  target?: HTMLElement | null;
  axis?: ScrollAxis;
  offset?: ScrollOffset;
}

export type ScrollAnimationKeyframes = Record<string, unknown[] | unknown>;

interface ScrollAnimationOptions {
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  duration?: number;
}

@Directive({
  selector: '[motionScroll]',
})
export class MotionScrollDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly motionScroll = input<ScrollAnimationKeyframes | boolean | undefined>(undefined);
  readonly scrollOptions = input<ScrollOptions>({});
  readonly scrollContainer = input<HTMLElement | undefined>();
  readonly scrollTarget = input<HTMLElement | undefined>();
  readonly scrollAxis = input<ScrollAxis>('y');
  readonly scrollOffset = input<ScrollOffset | undefined>();
  readonly animationOptions = input<ScrollAnimationOptions>({});

  readonly scrollProgress = output<number>();
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
      changes['motionScroll'] ||
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
    const anim = this.motionScroll();
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
