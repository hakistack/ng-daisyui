import { SweetAlertIcon, SweetAlertPosition } from 'sweetalert2';

export type AlertIcon = SweetAlertIcon;
export type AlertPosition = SweetAlertPosition;

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
