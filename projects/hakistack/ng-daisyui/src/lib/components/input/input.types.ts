import type { CountryCode } from 'libphonenumber-js';

export type InputVariant = 'text' | 'currency' | 'phone' | 'percentage' | 'password';

/** Available size variants matching daisyUI */
export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Available color variants matching daisyUI */
export type InputColor = 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

/**
 * Literal daisyUI class names for each size / color. Classes must appear as complete strings in the
 * source: Tailwind v4 generates CSS only for class names it finds by scanning the FESM, so a
 * template literal like `input-${size}` silently produced no CSS. Internal — shared by hk-input
 * and hk-select (not exported from the public API).
 */
export const INPUT_SIZE_CLASSES: Readonly<Record<InputSize, string>> = {
  xs: 'input-xs',
  sm: 'input-sm',
  md: '',
  lg: 'input-lg',
  xl: 'input-xl',
};

export const INPUT_COLOR_CLASSES: Readonly<Record<InputColor, string>> = {
  neutral: 'input-neutral',
  primary: 'input-primary',
  secondary: 'input-secondary',
  accent: 'input-accent',
  info: 'input-info',
  success: 'input-success',
  warning: 'input-warning',
  error: 'input-error',
};

export interface CurrencyConfig {
  readonly locale?: string;
  readonly currency?: string;
  readonly decimalPlaces?: number;
  readonly showSymbol?: boolean;
  readonly allowNegative?: boolean;
}

export interface PhoneConfig {
  readonly country?: CountryCode;
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
