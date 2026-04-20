import { Directive, ElementRef, input, output, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { resize } from 'motion';

export interface ResizeInfo {
  width: number;
  height: number;
}

@Directive({
  selector: '[hkResize]',
})
export class MotionResizeDirective implements OnInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Track 'viewport' for window size, or leave empty/false to track the host element (default) */
  readonly hkResize = input<'viewport' | boolean | undefined>(undefined);

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
