import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { ToastPosition } from './toast.types';

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

  /** Pause auto-dismiss timer when hovering over toast */
  pauseOnHover: boolean;

  /** Additional time (ms) after hover ends before auto-dismiss */
  extendedTimeOut: number;

  /** Allow clicking anywhere on toast to dismiss (not just close button) */
  tapToDismiss: boolean;

  /** Automatically dismiss oldest toast when maxToasts limit is reached */
  autoDismiss: boolean;
}

/**
 * Default configuration for toast service
 */
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
