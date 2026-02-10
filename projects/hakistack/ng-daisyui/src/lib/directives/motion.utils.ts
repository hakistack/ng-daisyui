import { isPlatformBrowser } from '@angular/common';
import type { AnimationControls } from './motion.types';

let cachedReducedMotion: boolean | null = null;

export function prefersReducedMotion(platformId: object): boolean {
  if (!isPlatformBrowser(platformId)) {
    return false;
  }
  if (cachedReducedMotion === null) {
    cachedReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return cachedReducedMotion;
}

export function safeStopAnimation(controls: AnimationControls | null): void {
  if (controls && typeof controls.stop === 'function') {
    try {
      controls.stop();
    } catch {
      // Silently ignore — animation may already be finished or disposed
    }
  }
}
