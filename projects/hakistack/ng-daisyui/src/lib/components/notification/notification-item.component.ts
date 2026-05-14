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
    // `inert` while exiting: kicks focus out of the subtree, blocks pointer +
    // keyboard interaction, and hides from assistive tech. We can't use
    // `aria-hidden` here — the browser warns when it's applied to an element
    // that still owns focus (the close button the user just clicked).
    '[attr.inert]': 'notification().dismissing ? "" : null',
    '[class.is-exiting]': 'notification().dismissing',
    // CSS custom properties drive the position-aware slide direction.
    // Both entrance (@starting-style) and exit (.is-exiting) reference these
    // via var(...) so right-anchored stacks slide right, left-anchored slide
    // left, etc. Set as inline styles so they're available at first paint.
    '[style.--hk-enter-from]': 'enterFrom()',
    '[style.--hk-exit-to]': 'exitTo()',
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

  /**
   * daisyUI-native panel class. Builds on the `alert` component so notifications
   * inherit the same look-and-feel as the rest of the lib (toast / inline alerts):
   *
   * - **Severity-driven** (no avatar, no iconTemplate):
   *   - v5: `alert alert-soft alert-{severity}` — soft-tinted background.
   *   - v4: `alert bg-base-100 text-{severity}` — daisyUI v4 has no `alert-soft`,
   *     so we follow the docs' "Alert with title and description" pattern:
   *     neutral panel + severity-colored leading icon (via inherited
   *     currentColor on `stroke-current`). Title / message / close pin
   *     themselves to `text-base-content` so they stay readable.
   * - **Avatar-driven** (user notifications): `alert bg-base-100` — neutral panel
   *   so the avatar reads as the dominant element.
   *
   * Always adds `shadow-lg` (overlay convention) and the theme-bridged border
   * via `cardBorder` so v4 / v5 consumers stay aligned.
   */
  readonly panelClass = computed(() => {
    const base = `alert ${this.theme.classes.cardBorder} shadow-lg w-full hk-notification-panel`;
    if (this.notification().avatar || this.notification().iconTemplate) {
      return `${base} bg-base-100`;
    }
    const severity = this.notification().severity;
    if (this.theme.id === 'daisyui-v4') {
      return `${base} bg-base-100 text-${severity}`;
    }
    return `${base} alert-soft alert-${severity}`;
  });

  /**
   * Initial transform for the entrance animation — read by `@starting-style`.
   * A small offset (12px) toward the anchor edge reads as a subtle slide-in.
   */
  readonly enterFrom = computed(() => this.transformForPosition('12px'));

  /**
   * Final transform for the exit animation — applied when `.is-exiting` is set.
   * Slides the panel fully out of the viewport along its own width/height
   * toward the anchored edge.
   */
  readonly exitTo = computed(() => this.transformForPosition('120%'));

  /** Map the resolved position to a translate() that slides toward the anchor edge. */
  private transformForPosition(distance: string): string {
    switch (this.notification().position) {
      case 'top-right':
      case 'bottom-right':
        return `translateX(${distance})`;
      case 'top-left':
      case 'bottom-left':
        return `translateX(-${distance})`;
      case 'top-center':
        return `translateY(-${distance})`;
      case 'bottom-center':
        return `translateY(${distance})`;
      default:
        return `translateY(-${distance})`;
    }
  }

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

  /**
   * Default-layout buttons render as standard daisyUI `btn` variants — filled
   * primary, outlined, soft, or ghost — sitting in the inline action row below
   * the body text.
   */
  protected actionClass(action: NotificationAction): string {
    if (this.isSideAction() || this.isStackedAction()) return this.panelActionClass(action);
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

  /**
   * Side-action / stacked-action buttons sit inside the divider-bounded action
   * column on the right of the panel and need to read as text-only buttons —
   * Tailwind Plus's pattern. Primary keeps its emphasis via `text-primary`,
   * everything else falls through to neutral panel-content text.
   */
  private panelActionClass(action: NotificationAction): string {
    const base = 'btn btn-sm btn-ghost font-semibold';
    switch (action.variant ?? 'ghost') {
      case 'primary':
        return `${base} text-primary hover:text-primary`;
      case 'outline':
      case 'soft':
      case 'ghost':
      default:
        return base;
    }
  }
}
