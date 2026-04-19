import type { inView } from 'motion';

export type EasingFunction = (progress: number) => number;

export type Easing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'circIn'
  | 'circOut'
  | 'circInOut'
  | 'backIn'
  | 'backOut'
  | 'backInOut'
  | 'anticipate'
  | [number, number, number, number]
  | EasingFunction;

export interface MotionAnimationOptions {
  duration?: number;
  delay?: number;
  ease?: Easing | Easing[];
  repeat?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  endDelay?: number;
  type?: 'tween' | 'spring' | 'inertia';
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
  bounce?: number;
  visualDuration?: number;
}

/** Matches the real return type from motion's animate() */
export interface AnimationControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  complete: () => void;
  cancel: () => void;
  then: (resolve: () => void, reject?: () => void) => Promise<void>;
  time: number;
  speed: number;
  duration: number;
  finished: Promise<void>;
}

export const ANIMATION_PRESETS = {
  fadeIn: { opacity: [0, 1] },
  fadeOut: { opacity: [1, 0] },
  fadeInUp: {
    opacity: [0, 1],
    y: [20, 0],
  },
  fadeInDown: {
    opacity: [0, 1],
    y: [-20, 0],
  },
  fadeInLeft: {
    opacity: [0, 1],
    x: [-20, 0],
  },
  fadeInRight: {
    opacity: [0, 1],
    x: [20, 0],
  },
  zoomIn: {
    opacity: [0, 1],
    scale: [0.8, 1],
  },
  zoomOut: {
    opacity: [1, 0],
    scale: [1, 0.8],
  },
  slideInUp: {
    y: ['100%', '0%'],
  },
  slideInDown: {
    y: ['-100%', '0%'],
  },
  bounceIn: {
    opacity: [0, 1],
    scale: [0.3, 1.05, 0.9, 1],
  },
  rotateIn: {
    opacity: [0, 1],
    rotate: [-180, 0],
    scale: [0.8, 1],
  },
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;
export type TriggerType = 'immediate' | 'scroll' | 'click';

type InViewOptions = NonNullable<Parameters<typeof inView>[2]>;
type MarginType = NonNullable<InViewOptions['margin']>;

export interface MotionDirectiveOptions extends MotionAnimationOptions {
  trigger?: TriggerType;
  margin?: MarginType;
  amount?: number | 'some' | 'all';
  once?: boolean;
  offset?: [string, string] | string[];
  axis?: 'x' | 'y';
}
