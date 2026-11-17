import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideDynamicIcon,
  LucideX,
  LucideCircleCheck,
  LucideInfo,
  LucideTriangleAlert,
  LucideCircleX,
  type LucideIcon,
} from '@lucide/angular';
import { DEFAULT_TOAST_SEVERITY_LABELS, TOAST_CONFIG } from './toast.config';
import { ToastService } from './toast.service';
import { Toast, ToastAction, ToastPosition, ToastSeverity } from './toast.types';

type PositionVertical = 'top' | 'bottom';
type PositionHorizontal = 'start' | 'center' | 'end';

@Component({
  selector: 'hk-toast',
  imports: [CommonModule, LucideDynamicIcon, LucideX],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  private readonly config = inject(TOAST_CONFIG, { optional: true });

  readonly toasts = this.toastService.toasts;
  readonly position = signal<ToastPosition>(this.config?.position || 'bottom-end');

  readonly dismissAriaLabel = this.config?.labels?.dismissAriaLabel ?? 'Dismiss notification';
  private readonly severityLabels = { ...DEFAULT_TOAST_SEVERITY_LABELS, ...this.config?.labels?.severityLabels };

  private readonly severityConfig: Record<ToastSeverity, { class: string; icon: LucideIcon }> = {
    success: { class: 'alert-success', icon: LucideCircleCheck },
    info: { class: 'alert-info', icon: LucideInfo },
    warning: { class: 'alert-warning', icon: LucideTriangleAlert },
    error: { class: 'alert-error', icon: LucideCircleX },
  };

  readonly positionVertical = computed<PositionVertical>(() => {
    const [vertical] = this.position().split('-') as [PositionVertical, PositionHorizontal];
    return vertical;
  });

  readonly containerClasses = computed(() => {
    const [vertical, horizontal] = this.position().split('-') as [PositionVertical, PositionHorizontal];

    const classes = ['toast-container'];
    classes.push(vertical === 'top' ? 'toast-top' : 'toast-bottom');
    classes.push(horizontal === 'start' ? 'toast-start' : horizontal === 'end' ? 'toast-end' : 'toast-center');

    return classes.join(' ');
  });

  getToastClasses(toast: Toast): string {
    const classes = ['alert', 'toast-item'];

    // Animation class based on position and state
    const isTop = this.positionVertical() === 'top';
    if (toast.dismissing) {
      classes.push(isTop ? 'toast-leave-top' : 'toast-leave-bottom');
    } else {
      classes.push(isTop ? 'toast-enter-top' : 'toast-enter-bottom');
    }

    // Soft variant
    if (toast.soft) {
      classes.push('alert-soft');
    }

    // Clickable
    if (toast.tapToDismiss || toast.onTap) {
      classes.push('cursor-pointer');
    }

    // Severity class
    classes.push(this.severityConfig[toast.severity]?.class ?? 'alert-info');

    return classes.join(' ');
  }

  getIcon(severity: ToastSeverity): LucideIcon {
    return this.severityConfig[severity]?.icon ?? LucideInfo;
  }

  /** Visually hidden severity word ("Error") read before the summary when browsing to a toast. */
  severityLabel(severity: ToastSeverity): string {
    return this.severityLabels[severity];
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  onToastClick(toast: Toast): void {
    this.toastService.handleToastClick(toast.id);
  }

  onMouseEnter(toast: Toast): void {
    if (toast.pauseOnHover && !toast.sticky) this.toastService.pauseAutoDismiss(toast.id, 'hover');
  }

  onMouseLeave(toast: Toast): void {
    if (toast.pauseOnHover && !toast.sticky && toast.isPaused) this.toastService.resumeAutoDismiss(toast.id, 'hover');
  }

  /**
   * Focus entering a toast (Tab to an action or the close button) pauses it, independent of
   * `pauseOnHover`; the service's timer only resumes once hover and focus have both been released.
   */
  onFocusIn(toast: Toast): void {
    if (!toast.sticky) this.toastService.pauseAutoDismiss(toast.id, 'focus');
  }

  onFocusOut(toast: Toast, event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) return;
    if (!toast.sticky) this.toastService.resumeAutoDismiss(toast.id, 'focus');
  }

  handleActionClick(toast: Toast, action: ToastAction, event: Event): void {
    event.stopPropagation();
    this.toastService.handleActionClick(toast.id, action);
  }

  getActionButtonClass(style?: 'default' | 'primary' | 'ghost'): string {
    const base = 'btn btn-xs';
    switch (style) {
      case 'primary':
        return `${base} btn-primary`;
      case 'ghost':
        return `${base} btn-ghost`;
      default:
        return `${base} btn-outline`;
    }
  }
}
