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

  /**
   * Two-stage dismiss timing — the service marks `dismissing: true` first
   * (component plays exit animation), then removes the notification from
   * the stack after this many ms. Tuned to the per-item CSS transition
   * (currently 220ms ease-out + a tiny safety margin so the node isn't
   * removed mid-frame).
   */
  private static readonly EXIT_ANIMATION_MS = 240;

  /** Pending removals — id → timeout. Used to no-op duplicate dismiss() calls. */
  private readonly pendingRemoval = new Map<string, ReturnType<typeof setTimeout>>();

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Push a notification onto the stack. Returns a `NotificationRef` for
   * programmatic dismiss / update.
   */
  show(config: NotificationConfig): NotificationRef {
    const notification = this.toNotification(config);

    this.stack.update((current) => {
      const next = [notification, ...current];
      // Cap the stack — overflow gets the same exit-animation treatment as
      // user-initiated dismisses: mark `dismissing: true` so the component
      // plays the exit transition, then schedule the actual removal.
      if (next.length > this.config.maxStack) {
        const overflowIds = next.slice(this.config.maxStack).map((n) => n.id);
        for (const id of overflowIds) this.scheduleRemoval(id, 'overflow');
        return next.map((n) => (overflowIds.includes(n.id) ? { ...n, dismissing: true, dismissReason: 'overflow' as const } : n));
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

  /**
   * Dismiss a single notification by id. Two-stage: marks the notification
   * as `dismissing: true` so the per-item component plays its exit
   * animation, then removes from the stack after `EXIT_ANIMATION_MS`.
   * Calling dismiss() again on the same id while exit is in flight is a
   * safe no-op.
   */
  dismiss(id: string, reason: NotificationDismissReason = 'manual'): void {
    if (this.pendingRemoval.has(id)) return; // already exiting
    const target = this.stack().find((n) => n.id === id);
    if (!target) return;

    // Stage 1: flag the exit so the component runs its CSS transition.
    this.stack.update((current) => current.map((n) => (n.id === id ? { ...n, dismissing: true, dismissReason: reason } : n)));

    // Stage 2: schedule the actual removal once the exit animation finishes.
    this.scheduleRemoval(id, reason);
  }

  /**
   * Dismiss every notification in the stack. Each entry plays its exit
   * animation; actual removal staggers per the standard exit timing.
   */
  dismissAll(): void {
    const ids = this.stack().map((n) => n.id);
    this.stack.update((current) => current.map((n) => (n.dismissing ? n : { ...n, dismissing: true, dismissReason: 'all' as const })));
    for (const id of ids) {
      if (!this.pendingRemoval.has(id)) this.scheduleRemoval(id, 'all');
    }
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

  /**
   * Schedule the second stage of a dismissing — actual stack removal and
   * dismiss-callback firing — after the exit animation completes. Idempotent:
   * if a removal is already pending for the id, this is a no-op.
   */
  private scheduleRemoval(id: string, reason: NotificationDismissReason): void {
    if (this.pendingRemoval.has(id)) return;
    const timeoutId = setTimeout(() => {
      this.pendingRemoval.delete(id);
      this.stack.update((current) => current.filter((n) => n.id !== id));
      this.fireDismissCallbacks(id, reason);
    }, NotificationService.EXIT_ANIMATION_MS);
    this.pendingRemoval.set(id, timeoutId);
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
