import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  ComponentRef,
  computed,
  createComponent,
  DestroyRef,
  EnvironmentInjector,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';

import { generateUniqueId } from '../../utils/generate-uuid';
import { ToastComponent } from './toast.component';
import { DEFAULT_TOAST_CONFIG, TOAST_CONFIG, ToastGlobalConfig } from './toast.config';
import { Toast, ToastAction, ToastOptions, ToastSeverity } from './toast.types';

interface ToastTimer {
  timerId: ReturnType<typeof setTimeout>;
  startTime: number;
  remainingTime: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  private readonly timers = new Map<string, ToastTimer>();

  private compRef?: ComponentRef<ToastComponent>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly userConfig = inject(TOAST_CONFIG, { optional: true });
  private readonly config: ToastGlobalConfig = { ...DEFAULT_TOAST_CONFIG, ...this.userConfig };

  /** Check if user prefers reduced motion */
  private readonly prefersReducedMotion = this.checkReducedMotion();

  constructor() {
    this.destroyRef.onDestroy(() => this.clear());
  }

  /**
   * Check if user prefers reduced motion
   */
  private checkReducedMotion(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /**
   * Show a toast notification
   */
  show(options: ToastOptions): string {
    try {
      this.ensureContainer();

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
        progressBar: (options.progressBar ?? this.config.progressBar) && !this.prefersReducedMotion,
        pauseOnHover: options.pauseOnHover ?? this.config.pauseOnHover,
        tapToDismiss: options.tapToDismiss ?? this.config.tapToDismiss,
        onTap: options.onTap,
        actions: options.actions,
        dismissing: false,
        progressTarget: 100, // Start at 100%, will animate to 0
        isPaused: false,
        createdAt: now,
        remainingTime: life,
        transitionDuration: 0, // No transition initially
      };

      this._toasts.update(toasts => {
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

      if (!toast.sticky) {
        this.scheduleAutoDismiss(id, life);

        // Start progress animation after DOM render (next frame)
        if (toast.progressBar && isPlatformBrowser(this.platformId)) {
          requestAnimationFrame(() => {
            this._toasts.update(toasts =>
              toasts.map(t =>
                t.id === id && !t.isPaused && !t.dismissing
                  ? {
                      ...t,
                      progressTarget: 0,
                      transitionDuration: life,
                    }
                  : t
              )
            );
          });
        }
      }

      return id;
    } catch (error) {
      console.error('ToastService: Failed to show toast', error);
      return '';
    }
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(id: string): void {
    const toast = this._toasts().find(t => t.id === id);
    if (!toast || toast.dismissing) return;

    this.clearTimer(id);

    this._toasts.update(toasts => toasts.map(t => (t.id === id ? { ...t, dismissing: true } : t)));

    // Use shorter duration if reduced motion is preferred
    const exitDuration = this.prefersReducedMotion ? 0 : this.config.exitDuration;

    timer(exitDuration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._toasts.update(toasts => toasts.filter(t => t.id !== id));

        if (!this.hasToasts()) {
          this.teardownContainer();
        }
      });
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.clearAllTimers();
    this._toasts.set([]);
    this.teardownContainer();
  }

  /**
   * Pause auto-dismiss timer (on hover)
   * Uses performance.now() for better precision
   */
  pauseAutoDismiss(id: string): void {
    const timerData = this.timers.get(id);
    if (!timerData) return;

    // Use performance.now() for better precision
    const elapsed = performance.now() - timerData.startTime;
    const remaining = Math.max(0, timerData.remainingTime - elapsed);

    clearTimeout(timerData.timerId);
    this.timers.set(id, { ...timerData, remainingTime: remaining });

    // Calculate current progress based on elapsed time
    const toast = this._toasts().find(t => t.id === id);
    if (!toast) return;

    // Calculate where the progress bar should be right now
    const currentProgress = (remaining / toast.life) * 100;

    // Freeze the progress bar at current position
    this._toasts.update(toasts =>
      toasts.map(t =>
        t.id === id
          ? {
              ...t,
              isPaused: true,
              remainingTime: remaining,
              progressTarget: currentProgress, // Freeze at current position
              transitionDuration: 0, // No transition while paused
            }
          : t
      )
    );
  }

  /**
   * Resume auto-dismiss timer (on hover end)
   * Uses performance.now() for better precision
   */
  resumeAutoDismiss(id: string): void {
    const timerData = this.timers.get(id);
    if (!timerData) return;

    const toast = this._toasts().find(t => t.id === id);
    if (!toast || toast.sticky) return;

    // Use extended timeout if configured, otherwise use remaining time
    const delay = this.config.extendedTimeOut > 0 ? this.config.extendedTimeOut : timerData.remainingTime;

    this.timers.delete(id);
    this.scheduleAutoDismiss(id, delay);

    // Resume animation: keep current width, animate to 0 over remaining time
    this._toasts.update(toasts =>
      toasts.map(t =>
        t.id === id
          ? {
              ...t,
              isPaused: false,
              remainingTime: delay,
              // progressWidth stays at current value (set during pause)
              progressTarget: 0, // Animate to 0
              transitionDuration: delay, // Over remaining time
            }
          : t
      )
    );
  }

  /**
   * Handle toast click
   */
  handleToastClick(id: string): void {
    const toast = this._toasts().find(t => t.id === id);
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

    // Dismiss after action unless explicitly set to false
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
    return this.show({
      severity: status === 'online' ? 'success' : 'error',
      summary: status === 'online' ? 'You are back online!' : 'You are offline!',
      life: 5000,
    });
  }

  private showByType(severity: ToastSeverity, summary: string, detail?: string, options?: Partial<ToastOptions>): string {
    return this.show({ severity, summary, detail, ...options });
  }

  private findDuplicate(options: ToastOptions): Toast | undefined {
    return this._toasts().find(t => t.summary === options.summary && t.severity === options.severity && !t.dismissing);
  }

  private ensureContainer(): void {
    if (!this.compRef) {
      this.bootstrapContainer();
    }
  }

  private bootstrapContainer(): void {
    this.compRef = createComponent(ToastComponent, {
      environmentInjector: this.envInjector,
    });

    this.appRef.attachView(this.compRef.hostView);
    document.body.appendChild(this.compRef.location.nativeElement);
  }

  private teardownContainer(): void {
    if (!this.compRef) return;

    this.appRef.detachView(this.compRef.hostView);
    this.compRef.destroy();
    this.compRef = undefined;
  }

  private scheduleAutoDismiss(id: string, delay: number): void {
    const timerId = setTimeout(() => this.dismiss(id), delay);
    this.timers.set(id, {
      timerId,
      startTime: performance.now(),
      remainingTime: delay,
    });
  }

  private clearTimer(id: string): void {
    const timerData = this.timers.get(id);
    if (timerData) {
      clearTimeout(timerData.timerId);
      this.timers.delete(id);
    }
  }

  private clearAllTimers(): void {
    this.timers.forEach(timerData => clearTimeout(timerData.timerId));
    this.timers.clear();
  }
}
