import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CdkTrapFocus } from '@angular/cdk/a11y';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import type { AlertIcon, AlertInternalConfig, AlertResult, AlertSize } from '../../services/alert/alert.types';

const SIZE_CLASS_MAP: Record<AlertSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'w-11/12 max-w-5xl',
};

const ICON_MAP: Record<AlertIcon, string> = {
  success: 'CircleCheck',
  error: 'CircleX',
  warning: 'TriangleAlert',
  info: 'Info',
  question: 'CircleHelp',
};

const ICON_COLOR_MAP: Record<AlertIcon, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  question: 'text-primary',
};

const BUTTON_CLASS_MAP: Record<string, string> = {
  primary: 'btn btn-primary',
  success: 'btn btn-success',
  error: 'btn btn-error',
  warning: 'btn btn-warning',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
};

const EXIT_DURATION = 150;

@Component({
  selector: 'hk-alert-overlay',
  templateUrl: './alert-overlay.component.html',
  styleUrl: './alert-overlay.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideIconComponent, CdkTrapFocus],
  host: { class: 'hk-alert-overlay' },
})
export class AlertOverlayComponent {
  readonly config = input.required<AlertInternalConfig>();
  readonly dismissing = signal(false);

  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly elementRef = inject(ElementRef);

  private previousActiveElement: HTMLElement | null = null;
  private timerId: ReturnType<typeof setTimeout> | undefined;
  private countdownInterval: ReturnType<typeof setInterval> | undefined;
  private dismissed = false;

  readonly titleId = `alert-title-${Math.random().toString(36).slice(2, 9)}`;
  readonly bodyId = `alert-body-${Math.random().toString(36).slice(2, 9)}`;

  readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');
  readonly confirmBtn = viewChild<ElementRef<HTMLButtonElement>>('confirmBtn');

  readonly iconName = computed(() => {
    const icon = this.config().icon;
    return icon ? ICON_MAP[icon] : '';
  });

  readonly iconContainerClasses = computed(() => {
    const icon = this.config().icon;
    return icon ? ICON_COLOR_MAP[icon] : '';
  });

  readonly modalBoxClasses = computed(() => {
    const cfg = this.config();
    // If custom width/maxWidth are set, don't apply preset size classes
    if (cfg.customWidth || cfg.customMaxWidth) {
      return 'modal-box relative overflow-hidden';
    }
    const sizeClass = SIZE_CLASS_MAP[cfg.size] ?? SIZE_CLASS_MAP['md'];
    return `modal-box relative overflow-hidden ${sizeClass}`;
  });

  readonly modalBoxStyles = computed(() => {
    const cfg = this.config();
    const styles: Record<string, string> = {};
    if (cfg.customWidth) {
      styles['width'] = cfg.customWidth;
    }
    if (cfg.customMaxWidth) {
      styles['max-width'] = cfg.customMaxWidth;
    }
    if (cfg.customHeight) {
      styles['height'] = cfg.customHeight;
    }
    if (cfg.customMaxHeight) {
      styles['max-height'] = cfg.customMaxHeight;
    }
    return styles;
  });

  readonly confirmButtonClasses = computed(() => {
    const style = this.config().confirmButtonStyle;
    return BUTTON_CLASS_MAP[style] ?? BUTTON_CLASS_MAP['primary'];
  });

  readonly trustedHtml = computed<SafeHtml>(() => {
    const html = this.config().html;
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : '';
  });

  constructor() {
    this.previousActiveElement = document.activeElement as HTMLElement | null;

    afterNextRender(
      () => {
        this.setupTimer();
        this.setupCountdown();
        this.setupFocus();
      },
      { injector: this.injector },
    );

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  onConfirm(): void {
    this.resolveAndDismiss({
      isConfirmed: true,
      isDismissed: false,
      isCancelled: false,
    });
  }

  dismiss(reason: AlertResult['dismissReason']): void {
    this.resolveAndDismiss({
      isConfirmed: false,
      isDismissed: true,
      isCancelled: reason === 'cancel',
      dismissReason: reason,
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.config().allowEscapeKey) {
      event.preventDefault();
      this.dismiss('esc');
    }
  }

  private resolveAndDismiss(result: AlertResult): void {
    if (this.dismissed) return;
    this.dismissed = true;

    this.clearTimers();
    this.dismissing.set(true);

    setTimeout(() => {
      this.config().resolve(result);
      this.restoreFocus();
    }, EXIT_DURATION);
  }

  private setupTimer(): void {
    const timer = this.config().timer;
    if (timer && timer > 0) {
      this.timerId = setTimeout(() => {
        this.dismiss('timer');
      }, timer);
    }
  }

  private setupCountdown(): void {
    const cfg = this.config();
    if (!cfg.timer || !cfg.countdownSelector) return;

    const container = this.elementRef.nativeElement as HTMLElement;
    const counterEl = container.querySelector(cfg.countdownSelector);
    if (!counterEl) return;

    const endTime = Date.now() + cfg.timer;

    this.countdownInterval = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining >= 0) {
        counterEl.textContent = String(remaining);
      }
    }, 1000);
  }

  private setupFocus(): void {
    if (this.config().focusCancel) {
      const cancelEl = this.cancelBtn()?.nativeElement;
      cancelEl?.focus();
    }
  }

  private clearTimers(): void {
    if (this.timerId !== undefined) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
    if (this.countdownInterval !== undefined) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  private restoreFocus(): void {
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      try {
        this.previousActiveElement.focus();
      } catch {
        // Element may no longer be in the DOM
      }
    }
  }
}
