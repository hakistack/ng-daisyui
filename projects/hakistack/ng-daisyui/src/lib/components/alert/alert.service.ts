import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  DestroyRef,
  EnvironmentInjector,
  EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { generateUniqueId } from '../../utils/generate-uuid';
import { AlertContainerComponent } from './alert-container.component';
import {
  AlertInternalConfig,
  AlertOptions,
  AlertResult,
  ButtonStyle,
  ConfirmOptions,
  CountdownOptions,
  DeleteConfirmOptions,
  LoadingOptions,
} from './alert.types';

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
   * @deprecated No longer needed — DaisyUI CSS variables handle theming automatically.
   */
  useSystemTheme?: boolean;

  /**
   * @deprecated No longer needed — DaisyUI CSS variables handle theming automatically.
   */
  theme?: () => 'light' | 'dark';
}

const ALERT_CONFIG = new InjectionToken<AlertConfig>('ALERT_CONFIG');

/**
 * Provides AlertService configuration.
 *
 * @example
 * // Basic usage (English fallbacks)
 * provideAlert()
 *
 * @example
 * // With Transloco
 * provideAlert({
 *   translate: (key, fallback, params) => transloco.translate(key, params) || fallback,
 *   langChange$: transloco.langChanges$,
 * })
 */
export function provideAlert(config?: AlertConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ALERT_CONFIG, useValue: config ?? {} }]);
}

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

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly alertConfig = inject(ALERT_CONFIG, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);

  private compRef?: ComponentRef<AlertContainerComponent>;
  private isInitialized = false;
  private cachedButtons: ButtonTexts | null = null;
  private langSubscriptionInit = false;

  private currentAlertId: string | null = null;
  private loadingOverlayId: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.destroy());
  }

  /**
   * Show a basic alert dialog
   */
  async show(options: AlertOptions): Promise<AlertResult> {
    const buttons = this.getButtons();

    // Resolve htmlUrl → html if provided
    let html = options.html;
    if (!html && options.htmlUrl) {
      html = await this.fetchHtml(options.htmlUrl);
    }

    return this.showInternal({
      id: generateUniqueId(),
      title: options.title,
      text: options.text,
      html,
      footer: options.footer,
      icon: options.icon,
      showConfirmButton: true,
      confirmButtonText: options.confirmButtonText ?? buttons.ok,
      confirmButtonStyle: 'primary',
      showCancelButton: options.showCancelButton ?? false,
      cancelButtonText: options.cancelButtonText ?? buttons.cancel,
      focusCancel: options.focusCancel ?? false,
      allowOutsideClick: options.allowOutsideClick ?? true,
      allowEscapeKey: true,
      timer: options.timer,
      timerProgressBar: options.timerProgressBar ?? false,
      loading: false,
      size: options.size ?? 'md',
      customWidth: options.width,
      customMaxWidth: options.maxWidth,
      customHeight: options.height,
      customMaxHeight: options.maxHeight,
      resolve: () => {},
    });
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
   * const result = await alert.countdown({
   *   title: 'Session Expiring',
   *   html: 'You will be logged out in <kbd class="kbd">{seconds}</kbd> seconds.',
   *   timer: 30000,
   *   icon: 'warning',
   *   showCancelButton: true,
   *   confirmButtonText: 'Stay Logged In',
   *   cancelButtonText: 'Logout Now',
   * });
   */
  async countdown(options: CountdownOptions): Promise<AlertResult> {
    const buttons = this.getButtons();
    const countdownSelector = options.countdownSelector ?? '.countdown, kbd';
    const initialSeconds = Math.ceil(options.timer / 1000);
    const html = options.html.replace('{seconds}', String(initialSeconds));

    return this.showInternal({
      id: generateUniqueId(),
      title: options.title,
      html,
      icon: options.icon ?? 'warning',
      showConfirmButton: true,
      confirmButtonText: options.confirmButtonText ?? buttons.ok,
      confirmButtonStyle: 'primary',
      showCancelButton: options.showCancelButton ?? false,
      cancelButtonText: options.cancelButtonText ?? buttons.cancel,
      focusCancel: false,
      allowOutsideClick: options.allowOutsideClick ?? false,
      allowEscapeKey: true,
      timer: options.timer,
      timerProgressBar: options.timerProgressBar ?? true,
      loading: false,
      countdownSelector,
      size: 'md',
      resolve: () => {},
    });
  }

  /**
   * Show confirmation dialog
   */
  async confirm(options: ConfirmOptions): Promise<AlertResult> {
    const buttons = this.getButtons();
    const confirmStyle: ButtonStyle = options.confirmStyle ?? 'success';

    return this.showInternal({
      id: generateUniqueId(),
      title: options.title,
      text: options.text,
      icon: options.icon ?? 'warning',
      showConfirmButton: true,
      confirmButtonText: options.confirmText ?? buttons.confirm,
      confirmButtonStyle: confirmStyle,
      showCancelButton: true,
      cancelButtonText: options.cancelText ?? buttons.cancel,
      focusCancel: options.focusCancel ?? false,
      allowOutsideClick: false,
      allowEscapeKey: true,
      loading: false,
      timerProgressBar: false,
      size: 'md',
      resolve: () => {},
    });
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

  /**
   * Show loading dialog
   */
  showLoading(options: LoadingOptions = {}): void {
    this.initialize();
    if (!this.compRef) return;

    const id = generateUniqueId();
    this.loadingOverlayId = id;

    this.addOverlay({
      id,
      title: options.title ?? this.translate('common.loading', 'Loading...'),
      text: options.text,
      loading: true,
      showConfirmButton: false,
      confirmButtonText: '',
      confirmButtonStyle: 'primary',
      showCancelButton: false,
      cancelButtonText: '',
      focusCancel: false,
      allowOutsideClick: options.allowClose ?? false,
      allowEscapeKey: options.allowClose ?? false,
      timerProgressBar: false,
      size: 'md',
      resolve: () => {},
    });
  }

  /**
   * Close loading dialog
   */
  hideLoading(): void {
    if (this.loadingOverlayId) {
      this.removeOverlay(this.loadingOverlayId);
      this.loadingOverlayId = null;
    }
  }

  /**
   * Update loading text
   */
  updateLoading(text: string): void {
    if (this.loadingOverlayId && this.compRef) {
      this.compRef.instance.overlays.update((list) => list.map((o) => (o.id === this.loadingOverlayId ? { ...o, text } : o)));
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private showInternal(config: AlertInternalConfig): Promise<AlertResult> {
    this.initialize();
    if (!this.compRef) {
      return Promise.resolve({ isConfirmed: false, isDismissed: true, isCancelled: false, dismissReason: 'close' });
    }

    // Dismiss previous non-loading alert (single-alert stacking)
    if (this.currentAlertId) {
      this.removeOverlay(this.currentAlertId);
    }

    return new Promise<AlertResult>((resolve) => {
      const wrappedConfig: AlertInternalConfig = {
        ...config,
        resolve: (result: AlertResult) => {
          this.currentAlertId = null;
          this.removeOverlay(wrappedConfig.id);
          resolve(result);
        },
      };

      this.currentAlertId = wrappedConfig.id;
      this.addOverlay(wrappedConfig);
    });
  }

  private addOverlay(config: AlertInternalConfig): void {
    this.compRef?.instance.overlays.update((list) => [...list, config]);
  }

  private removeOverlay(id: string): void {
    this.compRef?.instance.overlays.update((list) => list.filter((o) => o.id !== id));
  }

  private initialize(): void {
    if (this.isInitialized || !isPlatformBrowser(this.platformId)) return;
    this.bootstrapContainer();
    this.isInitialized = true;
  }

  private bootstrapContainer(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.compRef = createComponent(AlertContainerComponent, {
      environmentInjector: this.envInjector,
    });

    this.appRef.attachView(this.compRef.hostView);
    document.body.appendChild(this.compRef.location.nativeElement);
  }

  private destroy(): void {
    if (this.compRef) {
      this.appRef.detachView(this.compRef.hostView);
      this.compRef.destroy();
      this.compRef = undefined;
    }
    this.isInitialized = false;
    this.currentAlertId = null;
    this.loadingOverlayId = null;
  }

  private getButtons(): ButtonTexts {
    if (this.cachedButtons) {
      return this.cachedButtons;
    }

    if (!this.langSubscriptionInit && this.alertConfig?.langChange$) {
      this.langSubscriptionInit = true;
      this.alertConfig.langChange$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.cachedButtons = null;
      });
    }

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
    if (this.alertConfig?.translate) {
      return this.alertConfig.translate(key, fallback, params);
    }
    return fallback;
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`AlertService: Failed to fetch HTML from ${url} (${response.status})`);
        return `<p class="text-error">Failed to load content.</p>`;
      }
      return response.text();
    } catch (error) {
      console.error(`AlertService: Failed to fetch HTML from ${url}`, error);
      return `<p class="text-error">Failed to load content.</p>`;
    }
  }
}
