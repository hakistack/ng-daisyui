import { TemplateRef } from '@angular/core';

/** Severity tier — controls the default icon + color when no `iconTemplate` / `avatar` is set. */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * Visual layout variant. Three shapes match the Tailwind Plus reference:
 * - `'default'` — content stack with optional inline-actions row + close button.
 * - `'side-action'` — content on the left, vertical divider, single action button on the right.
 * - `'stacked-action'` — content on the left, vertical divider, stacked action buttons on the right.
 *
 * Auto-inferred from action count when not set: 0 → default, 1 → side-action,
 * ≥2 → stacked-action. Explicit `layout` always wins.
 */
export type NotificationLayout = 'default' | 'side-action' | 'stacked-action';

/** Where the host stack anchors. Mobile auto-switches to `bottom-center` regardless. */
export type NotificationPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

/** Action button shown inside a notification panel. */
export interface NotificationAction {
  /** Visible button label. Used as the accessibility name. */
  readonly label: string;
  /**
   * daisyUI button variant. `'primary'` is the eye-catching action,
   * `'ghost'` is the muted "Dismiss"-style, `'outline'` is for "Decline" pairings.
   * Default: `'ghost'`.
   */
  readonly variant?: 'primary' | 'ghost' | 'outline' | 'soft';
  /**
   * Click handler. Receives the `NotificationRef` so the consumer can
   * dismiss / update the notification from inside the handler. Returning
   * the literal string `'dismiss'` is a shorthand for `ref.dismiss()`.
   */
  readonly onClick: (ref: NotificationRef) => void | 'dismiss';
}

/**
 * Configuration for a single notification — the object passed to
 * `notifications.show({...})`.
 */
export interface NotificationConfig {
  /** Visible heading. The first line of the panel. */
  readonly title: string;
  /** Optional supporting text rendered below the title. */
  readonly message?: string;

  /**
   * Severity — drives the default icon + color when neither `iconTemplate`
   * nor `avatar` is set. Default: `'info'`.
   */
  readonly severity?: NotificationSeverity;

  /**
   * Avatar URL or template. When set, replaces the severity icon. Use this
   * for user-generated notifications (Leslie sent you a message…).
   */
  readonly avatar?: string | TemplateRef<unknown>;

  /**
   * Custom icon template — overrides both the severity icon and the avatar.
   * Use when the consumer needs a Lucide / custom SVG / branded icon.
   */
  readonly iconTemplate?: TemplateRef<unknown>;

  /**
   * Action buttons. Layout depends on `layout` (or auto-infers from count
   * when `layout` is unset).
   */
  readonly actions?: readonly NotificationAction[];

  /**
   * Visual layout variant. Auto-inferred from `actions.length` when omitted:
   * - 0 actions → `'default'` (content + close)
   * - 1 action  → `'side-action'` (vertical divider + side button)
   * - ≥2 actions → `'stacked-action'` (vertical divider + stacked buttons)
   * Explicit values always win.
   */
  readonly layout?: NotificationLayout;

  /**
   * Auto-dismiss after this many milliseconds. **Default: undefined**
   * (persistent — opposite of toast). Pass `0` for explicit "no auto-dismiss".
   */
  readonly duration?: number;

  /** Show the close (X) button in the top-right of the panel. Default: `true`. */
  readonly closable?: boolean;

  /**
   * When `duration` is set, hovering the panel pauses the dismiss timer.
   * Default: inherits from `provideNotification({ pauseOnHover })`.
   */
  readonly pauseOnHover?: boolean;

  /**
   * Auto-focus the first action button when the notification mounts.
   * Default: `false` — don't steal focus from the user's current task.
   */
  readonly autoFocus?: boolean;

  /** Per-notification position override. Default: from `provideNotification`. */
  readonly position?: NotificationPosition;

  /** Optional consumer-supplied id. Auto-generated if absent. */
  readonly id?: string;
}

/**
 * A live notification on the stack — the runtime form of a `NotificationConfig`
 * after the service applies defaults and mints an id.
 */
export interface Notification extends NotificationConfig {
  /** Service-assigned (or consumer-supplied) stable id. */
  readonly id: string;
  /** Resolved layout (auto-inferred from action count if not explicitly set). */
  readonly layout: NotificationLayout;
  /** Resolved severity (default `'info'`). */
  readonly severity: NotificationSeverity;
  /** Whether the close button is rendered. */
  readonly closable: boolean;
  /** Resolved position. */
  readonly position: NotificationPosition;
  /** Wall-clock time the notification was added — useful for sorting / animations. */
  readonly createdAt: number;

  /**
   * @internal
   * Set to `true` by the service while the exit animation plays. The per-item
   * component watches this and toggles its `is-exiting` class so the same
   * CSS transition that runs on entrance plays in reverse on dismiss.
   * Removed from the stack ~220ms after this flips true.
   */
  readonly dismissing?: boolean;

  /**
   * @internal
   * Reason the dismissal was triggered — captured at flip-time so the
   * `onDismiss` callbacks fire with the correct reason after the exit animation.
   */
  readonly dismissReason?: NotificationDismissReason;
}

/** Reason a notification was dismissed — passed to the `onDismiss` callback. */
export type NotificationDismissReason = 'manual' | 'action' | 'auto' | 'overflow' | 'all';

/**
 * Handle returned by `NotificationService.show()`. Consumers use it to
 * dismiss / update the notification programmatically, or hook into its
 * dismiss lifecycle.
 */
export interface NotificationRef {
  /** Stable identifier — same as the `Notification.id` on the stack. */
  readonly id: string;
  /** Dismiss this notification immediately. No-op if already dismissed. */
  dismiss(reason?: NotificationDismissReason): void;
  /** Replace fields on the live notification (e.g. update the title from "Saving…" to "Saved"). */
  update(partial: Partial<NotificationConfig>): void;
  /** Register a callback fired when this notification dismisses. Multiple callbacks supported. */
  onDismiss(callback: (reason: NotificationDismissReason) => void): void;
}

/**
 * App-wide notification configuration — set via `provideNotification({...})`.
 * All fields are optional; defaults defined in `DEFAULT_NOTIFICATION_CONFIG`.
 */
export interface NotificationGlobalConfig {
  /** Default position for the notification stack. Default: `'top-right'`. */
  readonly position?: NotificationPosition;
  /** Maximum concurrent notifications. Overflow drops the oldest. Default: `5`. */
  readonly maxStack?: number;
  /** Default for `pauseOnHover` when not set per-notification. Default: `true`. */
  readonly pauseOnHover?: boolean;
}

/** Resolved global config — every field guaranteed. */
export type ResolvedNotificationGlobalConfig = Required<NotificationGlobalConfig>;
