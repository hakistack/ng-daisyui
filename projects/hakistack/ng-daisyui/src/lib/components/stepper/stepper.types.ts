export interface StepperConfig {
  /** Require steps to be completed in order (default: false) */
  linear?: boolean;
  /** Show the step indicator bar (default: true) */
  showIndicator?: boolean;
  /** Animate content transitions between steps (default: true) */
  animateContent?: boolean;
  /** Label for the previous button (default: 'Previous') */
  previousText?: string;
  /** Label for the next button (default: 'Next') */
  nextText?: string;
  /** Label for the final step's complete button (default: 'Complete') */
  completeText?: string;
}

/** Visual state of a step indicator */
export type StepState = 'number' | 'done' | 'edit' | 'error';
