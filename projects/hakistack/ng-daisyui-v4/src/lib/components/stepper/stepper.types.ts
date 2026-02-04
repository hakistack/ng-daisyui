export interface StepperConfig {
  linear?: boolean;
  showNumbers?: boolean;
  showIndicator?: boolean;
  showStateIcons?: boolean;
  animateContent?: boolean;
  previousText?: string;
  nextText?: string;
  completeText?: string;
}

export type StepState = 'number' | 'done' | 'edit' | 'error';
