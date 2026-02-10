import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { scroll, animate } from 'motion';
import type { AnimationControls } from '../motion.types';
import { prefersReducedMotion, safeStopAnimation } from '../motion.utils';

export type ScrollAxis = 'x' | 'y';
export type OffsetValue = number | string;
export type OffsetPoint = 'start' | 'center' | 'end' | OffsetValue;
export type ScrollOffset = [OffsetPoint, OffsetPoint] | OffsetPoint[];

export interface ScrollInfo {
  x: {
    current: number;
    scrollLength: number;
    velocity: number;
  };
  y: {
    current: number;
    scrollLength: number;
    velocity: number;
  };
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
  // eslint-disable-next-line @angular-eslint/directive-selector
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

  private element: HTMLElement;
  private cleanupFunction?: () => void;
  private animationControls: AnimationControls | null = null;

  constructor() {
    this.element = this.elementRef.nativeElement;
  }

  ngOnInit(): void {
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
    if (!anim) return;

    if (prefersReducedMotion(this.platformId)) {
      return;
    }

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
      const animationOpts = {
        ease: 'linear' as const,
        ...this.animationOptions(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.animationControls = animate(this.element, keyframes, animationOpts) as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.cleanupFunction = scroll(this.animationControls as any, this.filterScrollOptions(options) as any);
    } catch {
      // Scroll-linked animation failed — fall back to progress tracking
      this.setupScrollProgressTracking(options);
    }
  }

  private setupScrollProgressTracking(options: ScrollOptions): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.cleanupFunction = scroll((progress: number, info: ScrollInfo) => {
        this.scrollProgress.emit(progress);
        this.scrollInfo.emit(info);
      }, this.filterScrollOptions(options) as any);
    } catch {
      // Scroll tracking failed — element may not be scrollable
    }
  }

  private filterScrollOptions(options: ScrollOptions): Partial<ScrollOptions> {
    const filteredOptions: Partial<ScrollOptions> = {};

    if (options.container) {
      filteredOptions.container = options.container;
    }

    if (options.target && options.target !== this.element) {
      filteredOptions.target = options.target;
    }

    if (options.axis && options.axis !== 'y') {
      filteredOptions.axis = options.axis;
    }

    if (options.offset) {
      filteredOptions.offset = options.offset;
    }

    return filteredOptions;
  }

  private cleanup(): void {
    safeStopAnimation(this.animationControls);

    if (this.cleanupFunction) {
      try {
        this.cleanupFunction();
      } catch {
        // Cleanup may fail if scroll context was already disposed
      }
    }

    this.cleanupFunction = undefined;
    this.animationControls = null;
  }

  public stop(): void {
    this.cleanup();
  }

  public restart(): void {
    this.cleanup();
    this.setupScrollAnimation();
  }
}
