import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { resize } from 'motion';

/** Payload emitted by `resizeChange` — current width/height in CSS px. */
export interface ResizeInfo {
  width: number;
  height: number;
}

/**
 * Emit `resizeChange` whenever the host element (or the viewport) is resized.
 *
 * SSR-safe: subscription is set up only in the browser. Backed by `motion`'s
 * `resize()`, which uses `ResizeObserver` for elements and `window.resize` for viewport.
 *
 * @example Track host element size (default)
 * <div hkResize (resizeChange)="onSize($event)">Resize me</div>
 *
 * @example Track viewport size
 * <div hkResize="viewport" (resizeChange)="vp.set($event)"></div>
 */
@Directive({
  selector: '[hkResize]',
})
export class MotionResizeDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Mode:
   * - `'viewport'` — track `window` resize.
   * - any other value (default) — track the host element via `ResizeObserver`.
   */
  readonly hkResize = input<'viewport' | boolean | undefined>(undefined);

  /** Fires on every resize with the current `{ width, height }` in CSS px. */
  readonly resizeChange = output<ResizeInfo>();

  private element!: HTMLElement;
  private cleanup?: VoidFunction;

  ngOnInit(): void {
    this.element = this.elementRef.nativeElement;
    this.setupResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hkResize']) {
      this.cleanupResize();
      this.setupResize();
    }
  }

  ngOnDestroy(): void {
    this.cleanupResize();
  }

  private setupResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const mode = this.hkResize();

      if (mode === 'viewport') {
        this.cleanup = resize(({ width, height }: ResizeInfo) => {
          this.resizeChange.emit({ width, height });
        });
      } else {
        this.cleanup = resize(this.element, (_element: Element, { width, height }: ResizeInfo) => {
          this.resizeChange.emit({ width, height });
        });
      }
    } catch {
      this.cleanup = undefined;
    }
  }

  private cleanupResize(): void {
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
    this.cleanupResize();
  }
  restart(): void {
    this.cleanupResize();
    this.setupResize();
  }
}
