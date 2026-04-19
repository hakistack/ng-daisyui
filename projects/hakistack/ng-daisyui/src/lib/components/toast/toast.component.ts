import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LucideIconData, X, CircleCheck, Info, TriangleAlert, CircleX } from 'lucide-angular';
import { TOAST_CONFIG } from './toast.config';
import { ToastService } from './toast.service';
import { Toast, ToastAction, ToastPosition, ToastSeverity } from './toast.types';

type PositionVertical = 'top' | 'bottom';
type PositionHorizontal = 'start' | 'center' | 'end';

@Component({
  selector: 'hk-toast',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  private readonly config = inject(TOAST_CONFIG, { optional: true });

  readonly xIcon = X;

  readonly toasts = this.toastService.toasts;
  readonly position = signal<ToastPosition>(this.config?.position || 'bottom-end');

  private readonly severityConfig: Record<ToastSeverity, { class: string; icon: LucideIconData }> = {
    success: { class: 'alert-success', icon: CircleCheck },
    info: { class: 'alert-info', icon: Info },
    warning: { class: 'alert-warning', icon: TriangleAlert },
    error: { class: 'alert-error', icon: CircleX },
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

  getIcon(severity: ToastSeverity): LucideIconData {
    return this.severityConfig[severity]?.icon ?? Info;
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
