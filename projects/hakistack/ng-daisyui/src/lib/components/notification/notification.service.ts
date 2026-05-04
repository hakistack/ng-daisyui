import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { generateUniqueId } from '../../utils/generate-uuid';
import { DEFAULT_NOTIFICATION_CONFIG, NOTIFICATION_CONFIG } from './notification.config';
import {
  Notification,
  NotificationConfig,
  NotificationDismissReason,
  NotificationLayout,
  NotificationRef,
  NotificationSeverity,
  ResolvedNotificationGlobalConfig,
} from './notification.types';

/**
 * Service-driven notification stack for `<hk-notification-host>`.
 *
 * Use anywhere — components, services, HTTP interceptors, route guards —
 * to surface user-facing events. Companion to `<hk-toast>`: where toast
 * shows transient status (file saved, error occurred), notifications are
 * for richer events (Leslie sent you a message, build #2389 finished)
 * with actions, avatars, and persistence until manually dismissed.
 *
 * Render the host once at app root:
 * ```html
 * <hk-notification-host />
 * ```
 *
 * Then call `show()` from anywhere:
 * ```ts
 * notifications = inject(NotificationService);
 *
 * notifications.success({ title: 'Saved!', message: 'Anyone with the link can view this file.' });
 *
 * notifications.show({
 *   title: 'New message',
 *   message: 'Sure! 8:30pm works great!',
 *   avatar: '/leslie.jpg',
 *   actions: [{ label: 'Reply', variant: 'primary', onClick: () => goToChat() }],
 * });
 * ```
 *
 * Returns a `NotificationRef` for programmatic control (`dismiss`, `update`,
 * `onDismiss`).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly userConfig = inject(NOTIFICATION_CONFIG, { optional: true });

  /** Resolved global config — applies provider overrides on top of defaults. */
  readonly config: ResolvedNotificationGlobalConfig = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...this.userConfig,
  };

  /** Live writable stack — internal. Public consumers read via `notifications`. */
  private readonly stack = signal<readonly Notification[]>([]);

  /** Read-only view of the active notification stack. */
  readonly notifications: Signal<readonly Notification[]> = this.stack.asReadonly();

  /** Convenience signal: how many notifications are currently active. */
  readonly count = computed(() => this.notifications().length);

  /** Per-id dismiss callbacks — keyed by id, fired on dismiss with the reason. */
  private readonly dismissCallbacks = new Map<string, ((reason: NotificationDismissReason) => void)[]>();

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Push a notification onto the stack. Returns a `NotificationRef` for
   * programmatic dismiss / update.
   */
  show(config: NotificationConfig): NotificationRef {
    const notification = this.toNotification(config);

    this.stack.update((current) => {
      const next = [notification, ...current];
      // Cap the stack — drop oldest when over the limit.
      if (next.length > this.config.maxStack) {
        const overflow = next.slice(this.config.maxStack);
        // Schedule overflow dismiss callbacks asynchronously so the call
        // returns the ref before any onDismiss hooks fire.
        queueMicrotask(() => overflow.forEach((n) => this.fireDismissCallbacks(n.id, 'overflow')));
        return next.slice(0, this.config.maxStack);
      }
      return next;
    });

    return this.makeRef(notification.id);
  }

  /** Severity shortcut — `severity: 'success'` with the given `title` + `message`. */
  success(config: Omit<NotificationConfig, 'severity'>): NotificationRef {
    return this.show({ ...config, severity: 'success' });
  }

  /** Severity shortcut — `severity: 'info'`. */
  info(config: Omit<NotificationConfig, 'severity'>): NotificationRef {
    return this.show({ ...config, severity: 'info' });
  }

  /** Severity shortcut — `severity: 'warning'`. */
  warning(config: Omit<NotificationConfig, 'severity'>): NotificationRef {
    return this.show({ ...config, severity: 'warning' });
  }

  /** Severity shortcut — `severity: 'error'`. */
  error(config: Omit<NotificationConfig, 'severity'>): NotificationRef {
    return this.show({ ...config, severity: 'error' });
  }

  /** Dismiss a single notification by id. No-op if it's already gone. */
  dismiss(id: string, reason: NotificationDismissReason = 'manual'): void {
    let removed = false;
    this.stack.update((current) => {
      const next = current.filter((n) => {
        if (n.id === id) {
          removed = true;
          return false;
        }
        return true;
      });
      return removed ? next : current;
    });
    if (removed) this.fireDismissCallbacks(id, reason);
  }

  /** Dismiss every notification in the stack. */
  dismissAll(): void {
    const ids = this.stack().map((n) => n.id);
    this.stack.set([]);
    ids.forEach((id) => this.fireDismissCallbacks(id, 'all'));
  }

  /**
   * Replace fields on an existing notification — useful for "Saving…" → "Saved" flows.
   * No-op if the id isn't on the stack.
   */
  update(id: string, partial: Partial<NotificationConfig>): void {
    this.stack.update((current) =>
      current.map((n) => {
        if (n.id !== id) return n;
        return this.toNotification({ ...n, ...partial, id: n.id }, n);
      }),
    );
  }

  // ── Internals ───────────────────────────────────────────────────────────

  /** Build a runtime `Notification` from a partial `NotificationConfig`. */
  private toNotification(config: NotificationConfig, previous?: Notification): Notification {
    const severity: NotificationSeverity = config.severity ?? previous?.severity ?? 'info';
    const layout: NotificationLayout = config.layout ?? this.inferLayout(config) ?? previous?.layout ?? 'default';
    const closable = config.closable ?? previous?.closable ?? true;
    const position = config.position ?? previous?.position ?? this.config.position;

    return {
      ...config,
      id: config.id ?? previous?.id ?? generateUniqueId(),
      severity,
      layout,
      closable,
      position,
      createdAt: previous?.createdAt ?? Date.now(),
    };
  }

  /** Auto-infer layout from action count when not explicitly set. */
  private inferLayout(config: NotificationConfig): NotificationLayout | undefined {
    if (config.layout) return config.layout;
    const count = config.actions?.length ?? 0;
    if (count === 0) return 'default';
    if (count === 1) return 'side-action';
    return 'stacked-action';
  }

  /** Construct a `NotificationRef` bound to an id. */
  private makeRef(id: string): NotificationRef {
    return {
      id,
      dismiss: (reason = 'manual') => this.dismiss(id, reason),
      update: (partial) => this.update(id, partial),
      onDismiss: (callback) => {
        const list = this.dismissCallbacks.get(id) ?? [];
        list.push(callback);
        this.dismissCallbacks.set(id, list);
      },
    };
  }

  private fireDismissCallbacks(id: string, reason: NotificationDismissReason): void {
    const callbacks = this.dismissCallbacks.get(id);
    if (!callbacks) return;
    this.dismissCallbacks.delete(id);
    for (const cb of callbacks) {
      try {
        cb(reason);
      } catch {
        /* keep running — one bad callback shouldn't stop the others */
      }
    }
  }
}
