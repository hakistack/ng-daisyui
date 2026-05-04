import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DEFAULT_NOTIFICATION_LABELS, HK_NOTIFICATION_LABELS, ResolvedNotificationLabels } from './notification.labels';
import { NotificationItemComponent } from './notification-item.component';
import { NotificationService } from './notification.service';
import { NotificationPosition } from './notification.types';

/**
 * Singleton notification host — render once at app root (or any layout that
 * persists across route changes) so `NotificationService` notifications
 * appear in a consistent location.
 *
 * Iterates `NotificationService.notifications()` and delegates rendering
 * to `<hk-notification-item>` per entry. Manages only stack-level layout
 * (position anchor, column alignment, ARIA live region) — per-item
 * lifecycle (timer, hover-pause, autofocus, action handling) lives in
 * `NotificationItemComponent`.
 *
 * @example
 * // app.config.ts:
 * providers: [
 *   provideNotification({ position: 'top-right', maxStack: 5 }),
 * ],
 *
 * // root template (e.g. app.html):
 * // <hk-notification-host />
 *
 * // anywhere:
 * notifications = inject(NotificationService);
 * notifications.success({ title: 'Saved!' });
 */
@Component({
  selector: 'hk-notification-host',
  imports: [CommonModule, NotificationItemComponent],
  templateUrl: './notification-host.component.html',
  styleUrl: './notification-host.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationHostComponent {
  private readonly userLabels = inject(HK_NOTIFICATION_LABELS, { optional: true });
  protected readonly service = inject(NotificationService);

  /** Labels with consumer overrides; falls back to English. */
  readonly labels = computed<ResolvedNotificationLabels>(() => ({
    ...DEFAULT_NOTIFICATION_LABELS,
    ...this.userLabels,
  }));

  /** Outer wrapper alignment classes — derived from the configured position. */
  readonly containerClass = computed(() => this.containerClassFor(this.service.config.position));

  /**
   * Inner stack alignment. For bottom anchors we reverse the column so the
   * newest notification sits closest to the bottom edge (where the user's
   * eye lands on a stacking-from-the-bottom UI).
   */
  readonly stackClass = computed(() => {
    const isBottom = this.service.config.position.startsWith('bottom-');
    return `flex flex-col gap-3 max-w-md w-full ${isBottom ? 'flex-col-reverse' : ''}`;
  });

  /** Map a `NotificationPosition` to Tailwind alignment classes. */
  private containerClassFor(position: NotificationPosition): string {
    const base = 'pointer-events-none fixed inset-0 z-50 flex p-4 sm:p-6';
    switch (position) {
      case 'top-right':
        return `${base} items-start justify-end`;
      case 'top-left':
        return `${base} items-start justify-start`;
      case 'top-center':
        return `${base} items-start justify-center`;
      case 'bottom-right':
        return `${base} items-end justify-end`;
      case 'bottom-left':
        return `${base} items-end justify-start`;
      case 'bottom-center':
        return `${base} items-end justify-center`;
    }
  }
}
