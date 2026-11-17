import { LiveAnnouncer } from '@angular/cdk/a11y';
import { isPlatformBrowser } from '@angular/common';
import { ApplicationRef, computed, DestroyRef, EnvironmentInjector, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';

import { prefersReducedMotion } from '../../directives/motion.utils';
import { attachToBody, BodyHost } from '../../utils/body-host';
import { generateUniqueId } from '../../utils/generate-uuid';
import { createPausableTimer, PausableTimer } from '../../utils/pausable-timer';
import { ToastComponent } from './toast.component';
import { DEFAULT_TOAST_CONFIG, DEFAULT_TOAST_SEVERITY_LABELS, TOAST_CONFIG, ToastGlobalConfig } from './toast.config';
import { Toast, ToastAction, ToastOptions, ToastSeverity } from './toast.types';

/**
 * Toast notification service.
 * Auto-initializes on first use - no provider setup required.
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   private toast = inject(ToastService);
 *
 *   showSuccess() {
 *     this.toast.success('Done!', 'Operation completed');
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  private readonly timers = new Map<string, PausableTimer>();

  private host?: BodyHost<ToastComponent>;
  private isInitialized = false;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  private readonly userConfig = inject(TOAST_CONFIG, { optional: true });
  readonly config: ToastGlobalConfig = { ...DEFAULT_TOAST_CONFIG, ...this.userConfig };

  constructor() {
    this.destroyRef.onDestroy(() => this.destroy());
  }

  private initialize(): void {
    if (this.isInitialized || !isPlatformBrowser(this.platformId)) return;

    this.bootstrapContainer();
    this.isInitialized = true;
  }

  /** Read live, so switching the OS setting applies to the next toast without a reload. */
  private reducedMotion(): boolean {
    return prefersReducedMotion(this.platformId);
  }

  /**
   * Show a toast notification.
   */
  show(options: ToastOptions): string {
    // Auto-initialize on first use
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.isInitialized) {
      return '';
    }

    try {
      if (this.config.preventDuplicates) {
        const duplicate = this.findDuplicate(options);
        if (duplicate) return duplicate.id;
      }

      const id = generateUniqueId();
      const now = Date.now();
      const life = options.life ?? this.config.defaultLife;

      const toast: Toast = {
        id,
        severity: options.severity,
        summary: options.summary,
        detail: options.detail,
        life,
        sticky: options.sticky ?? false,
        soft: options.soft ?? false,
        progressBar: (options.progressBar ?? this.config.progressBar) && !this.reducedMotion(),
        pauseOnHover: options.pauseOnHover ?? this.config.pauseOnHover,
        tapToDismiss: options.tapToDismiss ?? this.config.tapToDismiss,
        onTap: options.onTap,
        actions: options.actions,
        dismissing: false,
        progressTarget: 100,
        isPaused: false,
        createdAt: now,
        remainingTime: life,
        transitionDuration: 0,
      };

      this._toasts.update((toasts) => {
        const updated = [...toasts, toast];

        if (this.config.maxToasts > 0 && updated.length > this.config.maxToasts) {
          if (this.config.autoDismiss) {
            const oldest = updated[0];
            this.dismiss(oldest.id);
            return updated.slice(1);
          }
          return toasts;
        }

        return updated;
      });

      if (this._toasts().some((t) => t.id === id)) {
        this.announce(toast);
      }

      if (!toast.sticky) {
        this.scheduleAutoDismiss(id, life);

        if (toast.progressBar && isPlatformBrowser(this.platformId)) {
          requestAnimationFrame(() => {
            this._toasts.update((toasts) =>
              toasts.map((t) =>
                t.id === id && !t.isPaused && !t.dismissing
                  ? {
                      ...t,
                      progressTarget: 0,
                      transitionDuration: life,
                    }
                  : t,
              ),
            );
          });
        }
      }

      return id;
    } catch {
      return '';
    }
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(id: string): void {
    const toast = this._toasts().find((t) => t.id === id);
    if (!toast || toast.dismissing) return;

    this.clearTimer(id);

    this._toasts.update((toasts) => toasts.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));

    const exitDuration = this.reducedMotion() ? 0 : this.config.exitDuration;

    timer(exitDuration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
      });
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.clearAllTimers();
    this._toasts.set([]);
  }

  /**
   * Screen readers learn about a toast through the CDK live announcer: one persistent live region
   * that exists before the message is written into it. A `role="alert"` / `aria-live` element inserted
   * together with its content (how toasts used to announce) is often missed.
   * Errors interrupt (assertive); everything else waits for the current speech (polite).
   */
  private announce(toast: Toast): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const severity = this.config.labels?.severityLabels?.[toast.severity] ?? DEFAULT_TOAST_SEVERITY_LABELS[toast.severity];
    const message = [`${severity}: ${toast.summary}`, toast.detail].filter(Boolean).join('. ');
    void this.liveAnnouncer.announce(message, toast.severity === 'error' ? 'assertive' : 'polite');
  }

  /**
   * Pause a toast's auto-dismiss. `reason` lets several pauses overlap (the component uses `'hover'`
   * and `'focus'`); the toast resumes only when every reason has been released.
   */
  pauseAutoDismiss(id: string, reason = 'api'): void {
    const timer = this.timers.get(id);
    if (!timer?.hold(reason)) return;

    const toast = this._toasts().find((t) => t.id === id);
    if (!toast) return;

    const remaining = timer.remaining();
    this._toasts.update((toasts) =>
      toasts.map((t) =>
        t.id === id
          ? {
              ...t,
              isPaused: true,
              remainingTime: remaining,
              progressTarget: (remaining / toast.life) * 100,
              transitionDuration: 0,
            }
          : t,
      ),
    );
  }

  /**
   * Release a pause taken with the same `reason`. Pausing never shortens a toast: it resumes with
   * what was left, but at least `extendedTimeOut`.
   */
  resumeAutoDismiss(id: string, reason = 'api'): void {
    const timer = this.timers.get(id);
    const toast = this._toasts().find((t) => t.id === id);
    if (!timer || !toast || toast.sticky) return;

    const delay = timer.release(reason, this.config.extendedTimeOut);
    if (delay === null) return;

    this._toasts.update((toasts) =>
      toasts.map((t) =>
        t.id === id
          ? {
              ...t,
              isPaused: false,
              remainingTime: delay,
              progressTarget: 0,
              transitionDuration: delay,
            }
          : t,
      ),
    );
  }

  /**
   * Handle toast click
   */
  handleToastClick(id: string): void {
    const toast = this._toasts().find((t) => t.id === id);
    if (!toast) return;

    toast.onTap?.();

    if (toast.tapToDismiss) {
      this.dismiss(id);
    }
  }

  /**
   * Handle action button click
   */
  handleActionClick(id: string, action: ToastAction): void {
    action.onClick();

    if (action.dismissOnClick !== false) {
      this.dismiss(id);
    }
  }

  // Convenience methods
  success(summary: string, detail?: string, options?: Partial<ToastOptions>): string {
    return this.showByType('success', summary, detail, options);
  }

  error(summary: string, detail?: string, options?: Partial<ToastOptions>): string {
    return this.showByType('error', summary, detail, options);
  }

  info(summary: string, detail?: string, options?: Partial<ToastOptions>): string {
    return this.showByType('info', summary, detail, options);
  }

  warning(summary: string, detail?: string, options?: Partial<ToastOptions>): string {
    return this.showByType('warning', summary, detail, options);
  }

  networkStatus(status: 'online' | 'offline'): string {
    const labels = this.config.labels ?? {};
    return this.show({
      severity: status === 'online' ? 'success' : 'error',
      summary: status === 'online' ? (labels.onlineMessage ?? 'You are back online!') : (labels.offlineMessage ?? 'You are offline!'),
      life: 5000,
    });
  }

  private showByType(severity: ToastSeverity, summary: string, detail?: string, options?: Partial<ToastOptions>): string {
    return this.show({ severity, summary, detail, ...options });
  }

  private findDuplicate(options: ToastOptions): Toast | undefined {
    return this._toasts().find((t) => t.summary === options.summary && t.severity === options.severity && !t.dismissing);
  }

  private bootstrapContainer(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.host = attachToBody(ToastComponent, this.appRef, this.envInjector);
  }

  private destroy(): void {
    this.clearAllTimers();
    this._toasts.set([]);
    this.host?.destroy();
    this.host = undefined;
    this.isInitialized = false;
  }

  private scheduleAutoDismiss(id: string, delay: number): void {
    this.clearTimer(id);
    const timer = createPausableTimer(() => {
      this.timers.delete(id);
      this.dismiss(id);
    });
    timer.start(delay);
    this.timers.set(id, timer);
  }

  private clearTimer(id: string): void {
    this.timers.get(id)?.cancel();
    this.timers.delete(id);
  }

  private clearAllTimers(): void {
    this.timers.forEach((timer) => timer.cancel());
    this.timers.clear();
  }
}
