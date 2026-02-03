import { DestroyRef, EnvironmentProviders, inject, Injectable, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

import { AlertOptions, AlertResult, ConfirmOptions, CountdownOptions, DeleteConfirmOptions, LoadingOptions } from './alert.types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for AlertService
 */
export interface AlertConfig {
  /**
   * Custom translation function.
   * If not provided, fallback text is used directly.
   */
  translate?: (key: string, fallback: string, params?: Record<string, unknown>) => string;

  /**
   * Observable that emits when language changes.
   * Used to invalidate cached button translations.
   */
  langChange$?: Observable<unknown>;

  /**
   * Use system preference (prefers-color-scheme) for theme detection.
   * If false or not set, defaults to 'light'.
   * Ignored if `theme` function is provided.
   */
  useSystemTheme?: boolean;

  /**
   * Custom function to get current theme.
   * Overrides `useSystemTheme` if provided.
   */
  theme?: () => 'light' | 'dark';
}

const ALERT_CONFIG = new InjectionToken<AlertConfig>('ALERT_CONFIG');

/**
 * Provides AlertService configuration.
 *
 * @example
 * // Basic usage (English fallbacks, light theme)
 * provideAlert()
 *
 * @example
 * // With system theme detection (prefers-color-scheme)
 * provideAlert({ useSystemTheme: true })
 *
 * @example
 * // With Transloco and custom theme
 * provideAlert({
 *   translate: (key, fallback, params) => transloco.translate(key, params) || fallback,
 *   langChange$: transloco.langChanges$,
 *   theme: () => themeService.isDarkMode() ? 'dark' : 'light',
 * })
 */
export function provideAlert(config?: AlertConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ALERT_CONFIG, useValue: config ?? {} }]);
}

// ============================================================================
// Service
// ============================================================================

interface ButtonTexts {
  confirm: string;
  cancel: string;
  ok: string;
  yes: string;
  no: string;
  delete: string;
}

const BUTTON_KEYS: Readonly<ButtonTexts> = {
  confirm: 'common.buttons.confirm',
  cancel: 'common.buttons.cancel',
  ok: 'common.buttons.ok',
  yes: 'common.buttons.yes',
  no: 'common.buttons.no',
  delete: 'common.buttons.delete',
} as const;

const FALLBACK_BUTTONS: Readonly<ButtonTexts> = {
  confirm: 'Confirm',
  cancel: 'Cancel',
  ok: 'OK',
  yes: 'Yes',
  no: 'No',
  delete: 'Delete',
} as const;

type ButtonStyle = 'primary' | 'success' | 'error' | 'warning' | 'secondary' | 'ghost';

const BUTTON_STYLES: Record<ButtonStyle, string> = {
  primary: 'btn btn-primary',
  success: 'btn btn-success',
  error: 'btn btn-error',
  warning: 'btn btn-warning',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
};

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly config = inject(ALERT_CONFIG, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private cachedButtons: ButtonTexts | null = null;
  private langSubscriptionInit = false;

  private readonly baseCustomClass = {
    container: 'swal2-daisyui-container',
    popup: 'bg-base-100 text-base-content rounded-box shadow-2xl p-6 max-w-md',
    title: 'text-xl font-bold text-base-content mb-2',
    htmlContainer: 'text-base-content/80 text-base',
    closeButton: 'btn btn-sm btn-circle btn-ghost absolute right-2 top-2',
    icon: 'swal2-icon-daisyui border-4 mb-4',
    actions: 'flex gap-3 mt-6 w-full justify-end',
    confirmButton: BUTTON_STYLES.primary,
    denyButton: BUTTON_STYLES.warning,
    cancelButton: BUTTON_STYLES.secondary,
    loader: 'loading loading-spinner loading-md',
    footer: 'text-base-content/50 text-sm border-t border-base-200 mt-4 pt-4 w-full',
    timerProgressBar: 'bg-primary h-1 rounded-full',
  } as const;

  // =====================
  // Simple Alert Methods
  // =====================

  /**
   * Show a basic alert dialog
   */
  async show(options: AlertOptions): Promise<AlertResult> {
    const buttons = this.getButtons();

    const result = await this.fire({
      title: options.title,
      text: options.text,
      html: options.html,
      icon: options.icon,
      confirmButtonText: options.confirmButtonText ?? buttons.ok,
      showCancelButton: options.showCancelButton,
      cancelButtonText: options.cancelButtonText ?? buttons.cancel,
      focusCancel: options.focusCancel,
      allowOutsideClick: options.allowOutsideClick ?? true,
      timer: options.timer,
      timerProgressBar: options.timerProgressBar,
    });

    return this.mapResult(result);
  }

  /**
   * Show success alert
   */
  async success(title: string, text?: string): Promise<AlertResult> {
    return this.show({ title, text, icon: 'success' });
  }

  /**
   * Show error alert
   */
  async error(title: string, text?: string): Promise<AlertResult> {
    return this.show({ title, text, icon: 'error', allowOutsideClick: false });
  }

  /**
   * Show info alert
   */
  async info(title: string, text?: string): Promise<AlertResult> {
    return this.show({ title, text, icon: 'info' });
  }

  /**
   * Show warning alert
   */
  async warning(title: string, text?: string): Promise<AlertResult> {
    return this.show({ title, text, icon: 'warning' });
  }

  /**
   * Show a timed alert with live countdown display.
   *
   * @example
   * // Session timeout warning
   * const result = await alert.countdown({
   *   title: 'Session Expiring',
   *   html: 'You will be logged out in <kbd class="kbd">{seconds}</kbd> seconds.',
   *   timer: 30000,
   *   icon: 'warning',
   *   showCancelButton: true,
   *   confirmButtonText: 'Stay Logged In',
   *   cancelButtonText: 'Logout Now',
   * });
   *
   * if (result.isConfirmed) {
   *   // User clicked "Stay Logged In"
   * } else if (result.dismissReason === 'timer') {
   *   // Timer expired
   * }
   */
  async countdown(options: CountdownOptions): Promise<AlertResult> {
    const buttons = this.getButtons();
    let countdownInterval: number | undefined;

    const countdownSelector = options.countdownSelector ?? '.countdown, kbd';
    const initialSeconds = Math.ceil(options.timer / 1000);

    // Replace {seconds} placeholder with initial value
    const html = options.html.replace('{seconds}', String(initialSeconds));

    const result = await this.fire({
      title: options.title,
      html,
      icon: options.icon ?? 'warning',
      timer: options.timer,
      timerProgressBar: options.timerProgressBar ?? true,
      confirmButtonText: options.confirmButtonText ?? buttons.ok,
      showCancelButton: options.showCancelButton,
      cancelButtonText: options.cancelButtonText ?? buttons.cancel,
      allowOutsideClick: options.allowOutsideClick ?? false,
      didOpen: () => {
        const counterEl = Swal.getHtmlContainer()?.querySelector(countdownSelector);
        if (counterEl) {
          countdownInterval = window.setInterval(() => {
            const timeLeft = Math.ceil((Swal.getTimerLeft() ?? 0) / 1000);
            counterEl.textContent = String(timeLeft);
          }, 1000);
        }
      },
      willClose: () => {
        if (countdownInterval) {
          window.clearInterval(countdownInterval);
        }
      },
    });

    return this.mapResult(result);
  }

  // =====================
  // Confirmation Dialogs
  // =====================

  /**
   * Show confirmation dialog
   */
  async confirm(options: ConfirmOptions): Promise<AlertResult> {
    const buttons = this.getButtons();
    const confirmBtnStyle = options.confirmStyle ? BUTTON_STYLES[options.confirmStyle] : BUTTON_STYLES.success;

    const result = await this.fire({
      title: options.title,
      text: options.text,
      icon: options.icon ?? 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? buttons.confirm,
      cancelButtonText: options.cancelText ?? buttons.cancel,
      focusCancel: options.focusCancel ?? false,
      customClass: {
        confirmButton: confirmBtnStyle,
        cancelButton: BUTTON_STYLES.ghost,
      },
    });

    return this.mapResult(result);
  }

  /**
   * Show yes/no question dialog
   */
  async question(title: string, text?: string): Promise<AlertResult> {
    return this.confirm({
      title,
      text,
      icon: 'question',
      confirmText: this.getButtons().yes,
      cancelText: this.getButtons().no,
      confirmStyle: 'primary',
    });
  }

  /**
   * Show delete confirmation dialog
   */
  async confirmDelete(options: DeleteConfirmOptions = {}): Promise<AlertResult> {
    const buttons = this.getButtons();

    const title = options.title ?? this.translate('common.dialogs.deleteConfirm.title', 'Delete Confirmation');
    const text =
      options.text ??
      (options.itemName
        ? this.translate('common.dialogs.deleteConfirm.textWithItem', `Are you sure you want to delete "${options.itemName}"?`, {
            item: options.itemName,
          })
        : this.translate('common.dialogs.deleteConfirm.text', 'Are you sure you want to delete this?'));

    return this.confirm({
      title,
      text,
      icon: 'warning',
      confirmText: options.confirmText ?? buttons.delete,
      cancelText: options.cancelText ?? buttons.cancel,
      confirmStyle: 'error',
      focusCancel: true,
    });
  }

  // =====================
  // Loading State
  // =====================

  /**
   * Show loading dialog
   */
  showLoading(options: LoadingOptions = {}): void {
    Swal.fire({
      title: options.title ?? this.translate('common.loading', 'Loading...'),
      text: options.text,
      allowOutsideClick: options.allowClose ?? false,
      allowEscapeKey: options.allowClose ?? false,
      showConfirmButton: false,
      theme: this.getTheme(),
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  /**
   * Close loading dialog
   */
  hideLoading(): void {
    Swal.close();
  }

  /**
   * Update loading text
   */
  updateLoading(text: string): void {
    Swal.update({ text });
  }

  // =====================
  // Advanced / Direct Access
  // =====================

  /**
   * Direct access to SweetAlert2 fire method
   * For advanced use cases not covered by helper methods
   */
  async fire(options: SweetAlertOptions): Promise<SweetAlertResult> {
    const { customClass: optionsCustomClass, ...restOptions } = options;

    return Swal.fire({
      theme: this.getTheme(),
      buttonsStyling: false,
      customClass: {
        ...this.baseCustomClass,
        ...optionsCustomClass,
      },
      ...restOptions,
    });
  }

  // =====================
  // Private Helpers
  // =====================

  private getTheme(): 'light' | 'dark' {
    // Custom theme function takes priority
    if (this.config?.theme) {
      return this.config.theme();
    }

    // Use system preference if enabled
    if (this.config?.useSystemTheme && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Default to light
    return 'light';
  }

  private getButtons(): ButtonTexts {
    if (this.cachedButtons) {
      return this.cachedButtons;
    }

    // Subscribe to language changes only once (with proper cleanup)
    if (!this.langSubscriptionInit && this.config?.langChange$) {
      this.langSubscriptionInit = true;
      this.config.langChange$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.cachedButtons = null;
      });
    }

    // Build and cache buttons
    const buttons: ButtonTexts = {
      confirm: this.translate(BUTTON_KEYS.confirm, FALLBACK_BUTTONS.confirm),
      cancel: this.translate(BUTTON_KEYS.cancel, FALLBACK_BUTTONS.cancel),
      ok: this.translate(BUTTON_KEYS.ok, FALLBACK_BUTTONS.ok),
      yes: this.translate(BUTTON_KEYS.yes, FALLBACK_BUTTONS.yes),
      no: this.translate(BUTTON_KEYS.no, FALLBACK_BUTTONS.no),
      delete: this.translate(BUTTON_KEYS.delete, FALLBACK_BUTTONS.delete),
    };

    this.cachedButtons = buttons;
    return buttons;
  }

  private translate(key: string, fallback: string, params?: Record<string, unknown>): string {
    if (this.config?.translate) {
      return this.config.translate(key, fallback, params);
    }
    return fallback;
  }

  private mapResult(result: SweetAlertResult): AlertResult {
    return {
      isConfirmed: result.isConfirmed,
      isDismissed: result.isDismissed,
      isCancelled: result.dismiss === Swal.DismissReason.cancel,
      dismissReason: result.dismiss as AlertResult['dismissReason'],
    };
  }
}
