import { EnvironmentProviders, InjectionToken } from '@angular/core';
import { HkLabelsSource, provideLabelsSource } from '../../utils/labels-source';

/**
 * App-wide default text for `<hk-notification-host>`. Override globally
 * via `provideHkNotificationLabels({...})`. Mirrors the pattern used by
 * `provideToast` / `provideHkPdfLabels`.
 */
export interface NotificationLabels {
  /** Close button aria-label. Default: "Close notification" */
  closeAriaLabel?: string;
  /** Accessible name of the notifications region (landmark). Default: "Notifications" */
  regionAriaLabel?: string;
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
  regionAriaLabel: 'Notifications',
  infoAriaPrefix: 'Information',
  successAriaPrefix: 'Success',
  warningAriaPrefix: 'Warning',
  errorAriaPrefix: 'Error',
};

export const HK_NOTIFICATION_LABELS = new InjectionToken<HkLabelsSource<NotificationLabels>>('HK_NOTIFICATION_LABELS');

/**
 * Register app-wide text defaults for `<hk-notification-host>`. Any field
 * omitted falls back to the English default in `DEFAULT_NOTIFICATION_LABELS`.
 * Accepts a labels object, a `Signal` of labels, or a function run in an injection
 * context (see `HkLabelsSource`). A signal source makes the component follow language
 * switches.
 *
 * @example
 * providers: [
 *   provideHkNotificationLabels({
 *     closeAriaLabel: 'Cerrar notificación',
 *     successAriaPrefix: 'Éxito',
 *   }),
 * ]
 */
export function provideHkNotificationLabels(labels: HkLabelsSource<NotificationLabels>): EnvironmentProviders {
  return provideLabelsSource(HK_NOTIFICATION_LABELS, labels);
}
