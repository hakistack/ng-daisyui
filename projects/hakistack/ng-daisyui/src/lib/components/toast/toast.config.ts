import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { ToastPosition, ToastSeverity } from './toast.types';

/**
 * Global configuration options for the toast service
 */
export interface ToastGlobalConfig {
  /** Maximum number of toasts to display simultaneously (0 = unlimited) */
  maxToasts: number;

  /** Default duration in milliseconds before auto-dismiss */
  defaultLife: number;

  /** Duration of exit animation in milliseconds */
  exitDuration: number;

  /** Default position for toasts */
  position: ToastPosition;

  /** Prevent showing duplicate toasts with same severity and summary */
  preventDuplicates: boolean;

  /** Show progress bar countdown indicator */
  progressBar: boolean;

  /**
   * Pause the auto-dismiss timer while the pointer is over a toast. Keyboard focus inside a toast
   * (its action or close button) always pauses it, so keyboard users get the time they need (WCAG 2.2.1).
   */
  pauseOnHover: boolean;

  /** Minimum time (ms) a toast stays after hover/pause ends: it resumes with max(remaining time, this). */
  extendedTimeOut: number;

  /** Allow clicking anywhere on toast to dismiss (not just close button) */
  tapToDismiss: boolean;

  /** Automatically dismiss oldest toast when maxToasts limit is reached */
  autoDismiss: boolean;

  /** Text overrides for built-in toast helpers (e.g. `networkStatus()`). */
  labels: ToastLabels;
}

/**
 * Text overrides for built-in toast helpers. Any field undefined falls back
 * to the English default.
 */
export interface ToastLabels {
  /** Summary shown by `networkStatus('online')`. Default: "You are back online!" */
  onlineMessage?: string;
  /** Summary shown by `networkStatus('offline')`. Default: "You are offline!" */
  offlineMessage?: string;
  /** Accessible name of each toast's close (×) button. Default: "Dismiss notification" */
  dismissAriaLabel?: string;
  /**
   * Severity word read before the message (the colour and icon only show it visually).
   * Default: `{ success: 'Success', info: 'Info', warning: 'Warning', error: 'Error' }`
   */
  severityLabels?: Partial<Record<ToastSeverity, string>>;
}

/**
 * Default configuration for toast service
 */
/** English defaults for the severity word announced before each toast. */
export const DEFAULT_TOAST_SEVERITY_LABELS: Readonly<Record<ToastSeverity, string>> = {
  success: 'Success',
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
};

export const DEFAULT_TOAST_CONFIG: ToastGlobalConfig = {
  maxToasts: 5,
  defaultLife: 5000,
  exitDuration: 300,
  position: 'bottom-end',
  preventDuplicates: true,
  progressBar: true,
  pauseOnHover: true,
  extendedTimeOut: 1000,
  tapToDismiss: false,
  autoDismiss: true,
  labels: {},
};

/**
 * Injection token for providing custom toast configuration
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * providers: [
 *   {
 *     provide: TOAST_CONFIG,
 *     useValue: {
 *       maxToasts: 3,
 *       position: 'top-end',
 *       preventDuplicates: true,
 *     } as Partial<ToastGlobalConfig>
 *   }
 * ]
 * ```
 */
export const TOAST_CONFIG = new InjectionToken<Partial<ToastGlobalConfig>>('TOAST_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_TOAST_CONFIG,
});

/**
 * Provide toast service configuration.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideToast({ position: 'top-end', maxToasts: 3 })
 *   ]
 * };
 * ```
 */
export function provideToast(config?: Partial<ToastGlobalConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: TOAST_CONFIG, useValue: { ...DEFAULT_TOAST_CONFIG, ...config } }]);
}
