import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HK_THEME } from '../../theme/theme.config';
import { DEFAULT_NOTIFICATION_LABELS, HK_NOTIFICATION_LABELS, ResolvedNotificationLabels } from './notification.labels';
import { NotificationService } from './notification.service';
import { NotificationPosition } from './notification.types';

/**
 * Singleton notification host — render once at app root (or any layout that
 * persists across route changes) so `NotificationService` notifications
 * appear in a consistent location.
 *
 * **Phase 1 status (current):** scaffolding only — accepts the service stack,
 * renders a placeholder for each notification (title + close). Layout
 * variants (`default` / `side-action` / `stacked-action`), severity icons,
 * action buttons, slide-in animations, and pause-on-hover land in the next
 * commit.
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
  imports: [CommonModule],
  templateUrl: './notification-host.component.html',
  styleUrl: './notification-host.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationHostComponent {
  private readonly theme = inject(HK_THEME);
  private readonly userLabels = inject(HK_NOTIFICATION_LABELS, { optional: true });
  protected readonly service = inject(NotificationService);

  /** Labels with consumer overrides; falls back to English. */
  readonly labels = computed<ResolvedNotificationLabels>(() => ({
    ...DEFAULT_NOTIFICATION_LABELS,
    ...this.userLabels,
  }));

  /** Container alignment classes — derived from the configured position. */
  readonly containerClass = computed(() => this.containerClassFor(this.service.config.position));

  /** Per-panel theme-bridged card class (used in the next commit's template fill-in). */
  readonly panelClass = computed(() => `card ${this.theme.classes.cardBorder} bg-base-100 shadow-lg w-full max-w-sm pointer-events-auto`);

  protected dismiss(id: string): void {
    this.service.dismiss(id, 'manual');
  }

  /** Map a `NotificationPosition` to Tailwind alignment classes. */
  private containerClassFor(position: NotificationPosition): string {
    // Fixed full-screen wrapper is shared; only the inner stack alignment changes.
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
