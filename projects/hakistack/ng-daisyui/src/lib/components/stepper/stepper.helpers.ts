import { StepperConfig } from './stepper.types';

export function createStepper(config: Partial<StepperConfig> = {}): StepperConfig {
  return {
    linear: config.linear ?? false,
    showIndicator: config.showIndicator ?? true,
    previousText: config.previousText ?? 'Previous',
    nextText: config.nextText ?? 'Next',
    completeText: config.completeText ?? 'Complete',
  };
}
