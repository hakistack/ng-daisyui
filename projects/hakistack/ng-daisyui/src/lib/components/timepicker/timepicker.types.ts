export interface TimepickerEvent {
  value: string | null;
  hours: number;
  minutes: number;
  seconds: number;
}

export type TimepickerPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export type TimepickerView = 'hours' | 'minutes' | 'seconds';

export interface ClockPosition {
  readonly value: number;
  readonly display: string;
  readonly x: number;
  readonly y: number;
  readonly inner: boolean;
}
