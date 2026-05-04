import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { NotificationGlobalConfig, ResolvedNotificationGlobalConfig } from './notification.types';

/** Defaults applied when a field isn't supplied via `provideNotification({...})`. */
export const DEFAULT_NOTIFICATION_CONFIG: ResolvedNotificationGlobalConfig = {
  position: 'top-right',
  maxStack: 5,
  pauseOnHover: true,
};

export const NOTIFICATION_CONFIG = new InjectionToken<NotificationGlobalConfig>('NOTIFICATION_CONFIG');

/**
 * Register app-wide notification defaults — position, stack cap, hover-pause behavior.
 *
 * @example
 * providers: [
 *   provideNotification({
 *     position: 'top-right',
 *     maxStack: 5,
 *     pauseOnHover: true,
 *   }),
 * ]
 */
export function provideNotification(config: NotificationGlobalConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: NOTIFICATION_CONFIG, useValue: config }]);
}
