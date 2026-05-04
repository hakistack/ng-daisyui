import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HK_THEME } from '../../theme/theme.config';
import { ResolvedNotificationLabels } from './notification.labels';
import { NotificationService } from './notification.service';
import { Notification, NotificationAction, NotificationDismissReason } from './notification.types';

/**
 * Per-notification renderer — internal companion to `<hk-notification-host>`.
 * Handles per-item lifecycle: auto-dismiss timer, pause-on-hover, autofocus,
 * action invocation. The host just iterates these.
 *
 * Not exported from public-api: consumers always go through `NotificationService`.
 */
@Component({
  selector: 'hk-notification-item',
  imports: [CommonModule],
  templateUrl: './notification-item.component.html',
  styleUrl: './notification-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'hk-notification-item pointer-events-auto block w-full',
    '[attr.role]': '"alert"',
    '[attr.aria-atomic]': '"true"',
    '[attr.aria-hidden]': 'notification().dismissing ? "true" : null',
    '[class.is-exiting]': 'notification().dismissing',
    '(mouseenter)': 'onHoverEnter()',
    '(mouseleave)': 'onHoverLeave()',
  },
})
export class NotificationItemComponent {
  private readonly theme = inject(HK_THEME);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(NotificationService);

  readonly notification = input.required<Notification>();
  readonly labels = input.required<ResolvedNotificationLabels>();

  readonly closed = output<NotificationDismissReason>();

  private readonly firstActionRef = viewChild<ElementRef<HTMLButtonElement>>('firstAction');

  // ── Layout helpers ───────────────────────────────────────────────────────

  readonly layout = computed(() => this.notification().layout);
  readonly isDefault = computed(() => this.layout() === 'default');
  readonly isSideAction = computed(() => this.layout() === 'side-action');
  readonly isStackedAction = computed(() => this.layout() === 'stacked-action');

  /** Avatar URL when the consumer passed a string; null when it's a TemplateRef or absent. */
  readonly avatarUrl = computed(() => {
    const a = this.notification().avatar;
    return typeof a === 'string' ? a : null;
  });

  /** Avatar TemplateRef when the consumer passed one; null otherwise. */
  readonly avatarTemplate = computed(() => {
    const a = this.notification().avatar;
    return a && typeof a !== 'string' ? (a as TemplateRef<unknown>) : null;
  });

  /** True when severity icon should render — fallback when no avatar / iconTemplate is set. */
  readonly showSeverityIcon = computed(() => !this.notification().iconTemplate && !this.notification().avatar);

  /** Theme-bridged panel class; mirrors the host's panel styling for consistency. */
  readonly panelClass = computed(
    () => `card ${this.theme.classes.cardBorder} bg-base-100 shadow-lg w-full overflow-hidden hk-notification-panel`,
  );

  // ── Auto-dismiss timer ───────────────────────────────────────────────────

  private timerId: ReturnType<typeof setTimeout> | null = null;
  private remainingMs = 0;
  private timerStartedAt = 0;
  private hovering = false;

  constructor() {
    // Schedule auto-dismiss on mount (or whenever the notification's duration
    // changes via update()). Re-runs cleanly because we read both the id and
    // duration as tracked deps. Once `dismissing` flips true the timer stays
    // cancelled — no more attempts to dismiss something already on its way out.
    effect(() => {
      const n = this.notification();
      this.cancelTimer();
      if (n.dismissing) return;
      if (n.duration && n.duration > 0) {
        this.remainingMs = n.duration;
        this.startTimer();
      }
    });

    // Auto-focus first action on mount when requested.
    effect(() => {
      if (this.notification().autoFocus) {
        queueMicrotask(() => this.firstActionRef()?.nativeElement.focus());
      }
    });

    this.destroyRef.onDestroy(() => this.cancelTimer());
  }

  // ── Hover handlers ───────────────────────────────────────────────────────

  protected onHoverEnter(): void {
    if (this.notification().dismissing) return;
    this.hovering = true;
    if (this.shouldPauseOnHover()) this.pauseTimer();
  }

  protected onHoverLeave(): void {
    if (this.notification().dismissing) return;
    this.hovering = false;
    if (this.shouldPauseOnHover() && this.remainingMs > 0) this.startTimer();
  }

  private shouldPauseOnHover(): boolean {
    const local = this.notification().pauseOnHover;
    return local ?? this.service.config.pauseOnHover;
  }

  private startTimer(): void {
    this.cancelTimer();
    this.timerStartedAt = Date.now();
    this.timerId = setTimeout(() => this.dismiss('auto'), this.remainingMs);
  }

  private pauseTimer(): void {
    if (!this.timerId) return;
    clearTimeout(this.timerId);
    this.timerId = null;
    this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.timerStartedAt));
  }

  private cancelTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  // ── User actions ─────────────────────────────────────────────────────────

  protected onActionClick(action: NotificationAction): void {
    const id = this.notification().id;
    const ref = {
      id,
      dismiss: (reason: NotificationDismissReason = 'action') => this.service.dismiss(id, reason),
      update: (partial: Partial<Notification>) => this.service.update(id, partial),
      onDismiss: () => {
        /* the consumer already has the original ref */
      },
    };
    const result = action.onClick(ref);
    if (result === 'dismiss') {
      this.dismiss('action');
    }
  }

  protected onClose(): void {
    this.dismiss('manual');
  }

  private dismiss(reason: NotificationDismissReason): void {
    this.cancelTimer();
    this.service.dismiss(this.notification().id, reason);
    this.closed.emit(reason);
  }

  // ── Action button class — daisyUI variant mapping ────────────────────────

  protected actionClass(action: NotificationAction): string {
    const base = 'btn btn-sm';
    switch (action.variant ?? 'ghost') {
      case 'primary':
        return `${base} btn-primary`;
      case 'outline':
        return `${base} btn-outline`;
      case 'soft':
        return `${base} btn-soft`;
      case 'ghost':
      default:
        return `${base} btn-ghost`;
    }
  }
}
