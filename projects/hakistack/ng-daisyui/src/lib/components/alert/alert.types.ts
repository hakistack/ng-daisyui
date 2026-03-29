/**
 * Alert icon types matching DaisyUI severity levels
 */
export type AlertIcon = 'success' | 'error' | 'warning' | 'info' | 'question';

/**
 * Alert position options
 */
/**
 * Preset modal sizes mapping to Tailwind max-width classes.
 * - `sm`: max-w-sm (24rem)
 * - `md`: max-w-md (28rem) — default
 * - `lg`: max-w-lg (32rem)
 * - `xl`: max-w-xl (36rem)
 * - `2xl`: max-w-2xl (42rem)
 * - `4xl`: max-w-4xl (56rem)
 * - `full`: w-11/12 max-w-5xl (near full-screen)
 */
export type AlertSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';

/**
 * Alert position options
 */
export type AlertPosition =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'center'
  | 'center-start'
  | 'center-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end';

/**
 * Basic alert options for simple notifications
 */
export interface AlertOptions {
  /** Alert title */
  title: string;

  /** Alert message/body text */
  text?: string;

  /** HTML content (alternative to text) */
  html?: string;

  /**
   * URL to load HTML content from (alternative to `html`).
   * Fetched at runtime via `fetch()`. The response body is used as HTML content.
   * @example '/assets/alerts/terms.html', 'https://api.example.com/notice'
   */
  htmlUrl?: string;

  /** Alert icon type */
  icon?: AlertIcon;

  /** Confirm button text */
  confirmButtonText?: string;

  /** Show cancel button */
  showCancelButton?: boolean;

  /** Cancel button text */
  cancelButtonText?: string;

  /** Focus cancel button by default */
  focusCancel?: boolean;

  /** Allow clicking outside to close */
  allowOutsideClick?: boolean;

  /** Auto-close after ms (0 = disabled) */
  timer?: number;

  /** Show timer progress bar */
  timerProgressBar?: boolean;

  /** Optional footer HTML */
  footer?: string;

  /**
   * Preset modal size. Default: 'md'.
   * Use 'full' for a near full-screen modal (w-11/12 max-w-5xl).
   */
  size?: AlertSize;

  /**
   * Custom width CSS value (overrides `size`).
   * @example '600px', '80vw', '40rem'
   */
  width?: string;

  /**
   * Custom max-width CSS value (overrides `size`).
   * @example '900px', '60rem'
   */
  maxWidth?: string;

  /**
   * Custom height CSS value.
   * @example '400px', '50vh'
   */
  height?: string;

  /**
   * Custom max-height CSS value.
   * @example '80vh', '600px'
   */
  maxHeight?: string;
}

/**
 * Confirm dialog options
 */
export interface ConfirmOptions {
  /** Dialog title */
  title: string;

  /** Dialog message */
  text?: string;

  /** Confirm button text */
  confirmText?: string;

  /** Cancel button text */
  cancelText?: string;

  /** Icon type (default: 'warning') */
  icon?: AlertIcon;

  /** Focus cancel button (default: false) */
  focusCancel?: boolean;

  /** Confirm button style variant */
  confirmStyle?: 'primary' | 'success' | 'error' | 'warning';
}

/**
 * Delete confirmation options
 */
export interface DeleteConfirmOptions {
  /** Item name to display in message */
  itemName?: string;

  /** Custom title */
  title?: string;

  /** Custom message */
  text?: string;

  /** Confirm button text */
  confirmText?: string;

  /** Cancel button text */
  cancelText?: string;
}

/**
 * Countdown alert options for timed alerts with live countdown display
 */
export interface CountdownOptions {
  /** Alert title */
  title: string;

  /**
   * HTML content with a countdown element.
   * Use `{seconds}` placeholder for initial seconds value.
   * The element matching `countdownSelector` will be updated live.
   * @example 'Session expires in <kbd class="kbd">{seconds}</kbd> seconds'
   */
  html: string;

  /** Time in milliseconds before auto-close */
  timer: number;

  /** Alert icon type */
  icon?: AlertIcon;

  /** Show timer progress bar (default: true) */
  timerProgressBar?: boolean;

  /**
   * CSS selector for the countdown element (default: '.countdown, kbd').
   * The element's textContent will be updated with remaining seconds.
   */
  countdownSelector?: string;

  /** Confirm button text */
  confirmButtonText?: string;

  /** Show cancel button */
  showCancelButton?: boolean;

  /** Cancel button text */
  cancelButtonText?: string;

  /** Allow clicking outside to close */
  allowOutsideClick?: boolean;
}

/**
 * Loading dialog options
 */
export interface LoadingOptions {
  /** Loading title */
  title?: string;

  /** Loading message */
  text?: string;

  /** Allow closing while loading */
  allowClose?: boolean;
}

/**
 * Result from alert dialogs
 */
export interface AlertResult {
  /** User confirmed */
  isConfirmed: boolean;

  /** User cancelled or dismissed */
  isDismissed: boolean;

  /** User clicked cancel button */
  isCancelled: boolean;

  /** Dismiss reason */
  dismissReason?: 'cancel' | 'backdrop' | 'close' | 'esc' | 'timer';
}

export type ButtonStyle = 'primary' | 'success' | 'error' | 'warning' | 'secondary' | 'ghost';

/**
 * Internal configuration for alert overlays. Not exported from the library.
 */
export interface AlertInternalConfig {
  id: string;
  title: string;
  text?: string;
  html?: string;
  footer?: string;
  icon?: AlertIcon;
  showConfirmButton: boolean;
  confirmButtonText: string;
  confirmButtonStyle: ButtonStyle;
  showCancelButton: boolean;
  cancelButtonText: string;
  focusCancel: boolean;
  allowOutsideClick: boolean;
  allowEscapeKey: boolean;
  timer?: number;
  timerProgressBar: boolean;
  loading: boolean;
  countdownSelector?: string;
  size: AlertSize;
  customWidth?: string;
  customMaxWidth?: string;
  customHeight?: string;
  customMaxHeight?: string;
  resolve: (result: AlertResult) => void;
}
