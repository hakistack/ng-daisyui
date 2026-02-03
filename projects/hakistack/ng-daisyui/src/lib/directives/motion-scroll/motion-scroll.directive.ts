import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { scroll, animate } from 'motion';

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

/** Animation controls interface for Motion.js */
interface AnimationControls {
  stop: () => void;
  finished?: Promise<void>;
}

/** Animation options for scroll-linked animations */
interface ScrollAnimationOptions {
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  duration?: number;
  [key: string]: unknown;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[motionScroll]',
})
export class MotionScrollDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  // Main scroll animation keyframes
  readonly motionScroll = input<ScrollAnimationKeyframes | boolean | undefined>(undefined);

  // Scroll options
  readonly scrollOptions = input<ScrollOptions>({});

  // Individual scroll configuration options (for convenience)
  readonly scrollContainer = input<HTMLElement | undefined>();
  readonly scrollTarget = input<HTMLElement | undefined>();
  readonly scrollAxis = input<ScrollAxis>('y');
  readonly scrollOffset = input<ScrollOffset | undefined>();

  // Animation options
  readonly animationOptions = input<ScrollAnimationOptions>({});

  // Event outputs
  readonly scrollProgress = output<number>();
  readonly scrollInfo = output<ScrollInfo>();

  private element: HTMLElement;
  private cleanupFunction?: () => void;
  private animationControls: AnimationControls | null = null;

  constructor() {
    this.element = this.elementRef.nativeElement;
  }

  private prefersReducedMotion(): boolean {
    return isPlatformBrowser(this.platformId) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngOnInit(): void {
    this.setupScrollAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scrollAnimation'] || changes['scrollOptions'] || changes['scrollContainer'] || changes['scrollTarget'] || changes['scrollAxis'] || changes['scrollOffset']) {
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

    // Skip scroll animations if reduced motion is active
    if (this.prefersReducedMotion()) {
      return;
    }

    const options = this.buildScrollOptions();

    if (typeof anim === 'object') {
      // Animation keyframes provided - create scroll-linked animation
      this.setupScrollLinkedAnimation(options, anim);
    } else {
      // Boolean true - setup scroll progress tracking only
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
      // Create animation first
      const animationOpts = {
        ease: 'linear' as const,
        ...this.animationOptions(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.animationControls = animate(this.element, keyframes, animationOpts) as any;

      // Link animation to scroll - use type assertion for Motion.js compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.cleanupFunction = scroll(this.animationControls as any, this.filterScrollOptions(options) as any);
    } catch (error) {
      console.warn('Motion scroll-linked animation failed:', error);
      // Fallback to progress tracking
      this.setupScrollProgressTracking(options);
    }
  }

  private setupScrollProgressTracking(options: ScrollOptions): void {
    try {
       
      this.cleanupFunction = scroll((progress: number, info: ScrollInfo) => {
        // Emit progress and info events
        this.scrollProgress.emit(progress);
        this.scrollInfo.emit(info);
      }, this.filterScrollOptions(options) as any);
    } catch (error) {
      console.warn('Motion scroll tracking failed:', error);
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
    // Stop any running animation
    if (this.animationControls && typeof this.animationControls.stop === 'function') {
      try {
        this.animationControls.stop();
      } catch (error) {
        console.warn('Failed to stop scroll animation:', error);
      }
    }

    // Clean up scroll listener
    if (this.cleanupFunction) {
      try {
        this.cleanupFunction();
      } catch (error) {
        console.warn('Failed to cleanup scroll listener:', error);
      }
    }

    this.cleanupFunction = undefined;
    this.animationControls = null;
  }

  // Public methods for programmatic control - Note: With signals, these are now read-only
  // Consumers should update the input bindings directly to change values

  public stop(): void {
    this.cleanup();
  }

  public restart(): void {
    this.cleanup();
    this.setupScrollAnimation();
  }
}
