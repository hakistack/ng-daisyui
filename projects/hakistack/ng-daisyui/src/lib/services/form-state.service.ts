import { HttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, Injectable, InjectionToken, makeEnvironmentProviders, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Metadata for form state (wizard step, validation state, etc.)
 */
export interface FormStateMetadata {
  currentStep?: number;
  completedSteps?: string[];
  [key: string]: unknown;
}

/**
 * Represents the saved state of a form.
 */
export interface FormState {
  formId: string;
  values: Record<string, unknown>;
  metadata?: FormStateMetadata;
  updatedAt?: string;
}

/**
 * Configuration for API-based persistence.
 */
export interface FormStateApiOptions {
  mode: 'api';
  /** Base API URL for form state endpoints (e.g., '/api/forms') */
  apiUrl: string;
}

/**
 * Configuration for localStorage-based persistence.
 */
export interface FormStateLocalStorageOptions {
  mode: 'localStorage';
  /** Key prefix for localStorage entries (defaults to 'ngd-form-state-') */
  keyPrefix?: string;
}

/**
 * Configuration options for the form state service.
 */
export type FormStateOptions = FormStateApiOptions | FormStateLocalStorageOptions;

/**
 * Storage mode type for per-form overrides.
 */
export type FormStateStorageMode = 'api' | 'localStorage';

const FORM_STATE_OPTIONS = new InjectionToken<FormStateOptions>('FORM_STATE_OPTIONS');

/**
 * Provides form state auto-save functionality.
 *
 * @example
 * // API mode - persists to backend
 * provideFormState({ mode: 'api', apiUrl: '/api/forms' })
 *
 * @example
 * // localStorage mode - persists to browser storage
 * provideFormState({ mode: 'localStorage' })
 * provideFormState({ mode: 'localStorage', keyPrefix: 'myapp-form-' })
 */
export function provideFormState(options: FormStateOptions): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: FORM_STATE_OPTIONS, useValue: options }]);
}

/**
 * Service for persisting and loading form state.
 *
 * Must be configured using `provideFormState()` in your app providers.
 * If not configured, `isConfigured` will be false and operations will no-op.
 */
@Injectable({ providedIn: 'root' })
export class FormStateService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly options = inject(FORM_STATE_OPTIONS, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);

  private readonly DEFAULT_KEY_PREFIX = 'ngd-form-state-';

  /** Whether the service is configured and usable */
  readonly isConfigured = !!this.options;

  /** The persistence mode ('api' | 'localStorage' | null if not configured) */
  readonly mode = this.options?.mode ?? null;

  private get apiUrl(): string {
    if (this.options?.mode !== 'api') {
      throw new Error('FormStateService: apiUrl is only available in API mode.');
    }
    return this.options.apiUrl;
  }

  private get keyPrefix(): string {
    if (this.options?.mode === 'localStorage') {
      return this.options.keyPrefix ?? this.DEFAULT_KEY_PREFIX;
    }
    return this.DEFAULT_KEY_PREFIX;
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Resolve the effective storage mode.
   * Per-form override takes precedence over global config.
   */
  private resolveMode(override?: FormStateStorageMode): FormStateStorageMode | null {
    return override ?? this.options?.mode ?? null;
  }

  /**
   * Check if storage mode can be used.
   * localStorage always works (in browser), API requires HttpClient and apiUrl.
   */
  private canUseMode(mode: FormStateStorageMode | null): boolean {
    if (!mode) return false;
    if (mode === 'localStorage') return true;
    // API mode requires global config with apiUrl
    return this.options?.mode === 'api' && !!this.http;
  }

  /**
   * Load saved form state by form ID.
   * Returns null if not found or storage mode unavailable.
   *
   * @param formId - Unique form identifier
   * @param storageOverride - Override global storage mode for this operation
   */
  load(formId: string, storageOverride?: FormStateStorageMode): Observable<FormState | null> {
    const mode = this.resolveMode(storageOverride);

    if (!this.canUseMode(mode)) {
      return of(null);
    }

    if (mode === 'localStorage') {
      return of(this.loadFromLocalStorage(formId));
    }

    return this.http!.get<FormState>(`${this.apiUrl}/${formId}`).pipe(catchError(() => of(null)));
  }

  /**
   * Save form state (upsert).
   *
   * @param formId - Unique form identifier
   * @param values - Form values to persist
   * @param metadata - Optional metadata (step info, etc.)
   * @param storageOverride - Override global storage mode for this operation
   */
  save(
    formId: string,
    values: Record<string, unknown>,
    metadata?: FormStateMetadata,
    storageOverride?: FormStateStorageMode,
  ): Observable<void> {
    const mode = this.resolveMode(storageOverride);

    if (!this.canUseMode(mode)) {
      return of(void 0);
    }

    const state: FormState = {
      formId,
      values,
      metadata,
      updatedAt: new Date().toISOString(),
    };

    if (mode === 'localStorage') {
      this.saveToLocalStorage(state);
      return of(void 0);
    }

    return this.http!.put<void>(this.apiUrl, state);
  }

  /**
   * Clear saved form state.
   *
   * @param formId - Unique form identifier
   * @param storageOverride - Override global storage mode for this operation
   */
  clear(formId: string, storageOverride?: FormStateStorageMode): Observable<void> {
    const mode = this.resolveMode(storageOverride);

    if (!this.canUseMode(mode)) {
      return of(void 0);
    }

    if (mode === 'localStorage') {
      this.clearFromLocalStorage(formId);
      return of(void 0);
    }

    return this.http!.delete<void>(`${this.apiUrl}/${formId}`);
  }

  private loadFromLocalStorage(formId: string): FormState | null {
    if (!this.isBrowser) return null;

    try {
      const key = this.keyPrefix + formId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveToLocalStorage(state: FormState): void {
    if (!this.isBrowser) return;

    try {
      const key = this.keyPrefix + state.formId;
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }

  private clearFromLocalStorage(formId: string): void {
    if (!this.isBrowser) return;

    try {
      const key = this.keyPrefix + formId;
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }
}
