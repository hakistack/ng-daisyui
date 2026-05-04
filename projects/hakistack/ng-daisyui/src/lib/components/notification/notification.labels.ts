import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * App-wide default text for `<hk-notification-host>`. Override globally
 * via `provideHkNotificationLabels({...})`. Mirrors the pattern used by
 * `provideToast` / `provideHkPdfLabels`.
 */
export interface NotificationLabels {
  /** Close button aria-label. Default: "Close notification" */
  closeAriaLabel?: string;
  /** Default for the assistive announcement when severity is `info`. Default: "Information" */
  infoAriaPrefix?: string;
  /** Default for the assistive announcement when severity is `success`. Default: "Success" */
  successAriaPrefix?: string;
  /** Default for the assistive announcement when severity is `warning`. Default: "Warning" */
  warningAriaPrefix?: string;
  /** Default for the assistive announcement when severity is `error`. Default: "Error" */
  errorAriaPrefix?: string;
}

export type ResolvedNotificationLabels = Required<NotificationLabels>;

export const DEFAULT_NOTIFICATION_LABELS: ResolvedNotificationLabels = {
  closeAriaLabel: 'Close notification',
  infoAriaPrefix: 'Information',
  successAriaPrefix: 'Success',
  warningAriaPrefix: 'Warning',
  errorAriaPrefix: 'Error',
};

export const HK_NOTIFICATION_LABELS = new InjectionToken<NotificationLabels>('HK_NOTIFICATION_LABELS');

/**
 * Register app-wide text defaults for `<hk-notification-host>`. Any field
 * omitted falls back to the English default in `DEFAULT_NOTIFICATION_LABELS`.
 *
 * @example
 * providers: [
 *   provideHkNotificationLabels({
 *     closeAriaLabel: 'Cerrar notificación',
 *     successAriaPrefix: 'Éxito',
 *   }),
 * ]
 */
export function provideHkNotificationLabels(labels: NotificationLabels): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_NOTIFICATION_LABELS, useValue: labels }]);
}
