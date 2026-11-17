import { isPlatformBrowser } from '@angular/common';
import type { AnimationControls } from './motion.types';

let reducedMotionQuery: MediaQueryList | null = null;

/** Live `prefers-reduced-motion` check (false on the server and where `matchMedia` is missing, e.g. jsdom). */
export function prefersReducedMotion(platformId: object): boolean {
  if (!isPlatformBrowser(platformId) || typeof window.matchMedia !== 'function') return false;
  reducedMotionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
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
