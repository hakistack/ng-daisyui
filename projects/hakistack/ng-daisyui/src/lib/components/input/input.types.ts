export type InputVariant = 'text' | 'currency' | 'phone' | 'percentage' | 'password';

/** Available size variants matching daisyUI */
export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Available color variants matching daisyUI */
export type InputColor = 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

export interface CurrencyConfig {
  readonly locale?: string;
  readonly currency?: string;
  readonly decimalPlaces?: number;
  readonly showSymbol?: boolean;
  readonly allowNegative?: boolean;
}

export interface PhoneConfig {
  readonly country?: string;
  readonly format?: 'national' | 'international';
}

export interface PercentageConfig {
  readonly decimalPlaces?: number;
  readonly min?: number;
  readonly max?: number;
  readonly showSymbol?: boolean;
}

export interface PasswordConfig {
  readonly showToggle?: boolean;
}
