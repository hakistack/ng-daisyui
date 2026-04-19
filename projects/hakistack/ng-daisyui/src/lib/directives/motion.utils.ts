import { isPlatformBrowser } from '@angular/common';
import type { AnimationControls } from './motion.types';

let reducedMotionQuery: MediaQueryList | null = null;

export function prefersReducedMotion(platformId: object): boolean {
  if (!isPlatformBrowser(platformId)) return false;
  if (!reducedMotionQuery) {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return reducedMotionQuery.matches;
}

export function safeStopAnimation(controls: AnimationControls | null): void {
  if (!controls) return;
  try {
    controls.stop();
  } catch {
    // Animation may already be finished or disposed
  }
}
