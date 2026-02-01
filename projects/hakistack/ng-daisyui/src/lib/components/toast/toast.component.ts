import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';

import { IconName, LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { TOAST_CONFIG } from './toast.config';
import { ToastService } from './toast.service';
import { Toast, ToastAction, ToastPosition, ToastSeverity } from './toast.types';

type PositionVertical = 'top' | 'bottom';
type PositionHorizontal = 'start' | 'center' | 'end';

@Component({
  selector: 'app-toast',
  imports: [LucideIconComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Use None because component is dynamically created and appended to body
  encapsulation: ViewEncapsulation.None,
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  private readonly config = inject(TOAST_CONFIG, { optional: true });

  readonly toasts = this.toastService.toasts;
  readonly position = signal<ToastPosition>(this.config?.position || 'bottom-end');

  private readonly severityConfig: Record<ToastSeverity, { class: string; icon: IconName }> = {
    success: { class: 'alert-success', icon: 'CircleCheck' },
    info: { class: 'alert-info', icon: 'Info' },
    warning: { class: 'alert-warning', icon: 'TriangleAlert' },
    error: { class: 'alert-error', icon: 'CircleX' },
  };

  readonly positionVertical = computed<PositionVertical>(() => {
    const [vertical] = this.position().split('-') as [PositionVertical, PositionHorizontal];
    return vertical;
  });

  readonly containerClasses = computed(() => {
    const [vertical, horizontal] = this.position().split('-') as [PositionVertical, PositionHorizontal];

    const verticalClass = vertical === 'top' ? 'top-4' : 'bottom-4';
    const horizontalClass = horizontal === 'start' ? 'left-4' : horizontal === 'end' ? 'right-4' : 'left-1/2 -translate-x-1/2';

    const flexDirection = vertical === 'top' ? 'flex-col' : 'flex-col-reverse';

    return `fixed flex pointer-events-none z-50 ${verticalClass} ${horizontalClass} ${flexDirection} gap-2`;
  });

  getToastClasses(toast: Toast): string {
    const classes = ['alert', 'toast-item', 'pointer-events-auto'];

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

    // Severity class
    classes.push(this.severityConfig[toast.severity]?.class ?? 'alert-info');

    return classes.join(' ');
  }

  getIcon(severity: ToastSeverity): IconName {
    return this.severityConfig[severity]?.icon ?? 'Info';
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  onToastClick(toast: Toast): void {
    this.toastService.handleToastClick(toast.id);
  }

  onMouseEnter(toast: Toast): void {
    if (toast.pauseOnHover && !toast.sticky) {
      this.toastService.pauseAutoDismiss(toast.id);
    }
  }

  onMouseLeave(toast: Toast): void {
    if (toast.pauseOnHover && !toast.sticky && toast.isPaused) {
      this.toastService.resumeAutoDismiss(toast.id);
    }
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
