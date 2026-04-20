import { animate } from 'motion';
import type { AnimationPlaybackControls, DOMKeyframesDefinition, DynamicOption, ElementOrSelector } from 'motion-dom';

export interface SequenceSegment {
  /** CSS selector, Element, Element[], or NodeList */
  target: ElementOrSelector;
  /** Keyframes to animate */
  keyframes: DOMKeyframesDefinition;
  /** Per-segment animation options */
  options?: {
    duration?: number;
    delay?: number | DynamicOption<number>;
    ease?: string | number[] | ((t: number) => number);
    at?: number | string;
    [key: string]: unknown;
  };
}

export interface SequenceOptions {
  duration?: number;
  delay?: number;
  repeat?: number;
  defaultTransition?: {
    duration?: number;
    ease?: string | number[] | ((t: number) => number);
  };
}

/**
 * Play a sequenced animation across multiple elements.
 * Wraps motion's `animate(array)` with typed segments.
 *
 * ```typescript
 * const controls = animateSequence([
 *   { target: '.title', keyframes: { opacity: 1, y: 0 }, options: { duration: 0.5 } },
 *   { target: '.subtitle', keyframes: { opacity: 1 }, options: { at: '<0.2' } },
 *   { target: '.cta', keyframes: { scale: [0.8, 1], opacity: 1 }, options: { at: '+0.1' } },
 * ]);
 * ```
 */
export function animateSequence(segments: SequenceSegment[], options?: SequenceOptions): AnimationPlaybackControls {
  const sequence = segments.map((seg) => {
    const entry: [ElementOrSelector, DOMKeyframesDefinition] | [ElementOrSelector, DOMKeyframesDefinition, Record<string, unknown>] = [
      seg.target,
      seg.keyframes,
    ];

    if (seg.options && Object.keys(seg.options).length) {
      return [...entry, seg.options] as const;
    }
    return entry;
  });

  return animate(sequence as Parameters<typeof animate>[0], options as Parameters<typeof animate>[1]);
}
