import { HttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, Injectable, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ============================================================================
// Types
// ============================================================================

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
 * Configuration options for the form state service.
 */
export interface FormStateOptions {
  /** Base API URL for form state endpoints (e.g., '/api/forms') */
  apiUrl: string;
}

// ============================================================================
// Internal Injection Token (not exported)
// ============================================================================

const FORM_STATE_OPTIONS = new InjectionToken<FormStateOptions>('FORM_STATE_OPTIONS');

// ============================================================================
// Provider Function
// ============================================================================

/**
 * Provides form state auto-save functionality.
 *
 * @example
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideFormState({ apiUrl: '/api/forms' }),
 *   ],
 * };
 */
export function provideFormState(options: FormStateOptions): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: FORM_STATE_OPTIONS, useValue: options }]);
}

// ============================================================================
// Service
// ============================================================================

/**
 * Service for persisting and loading form state.
 *
 * Must be configured using `provideFormState()` in your app providers.
 * If not configured, `isConfigured` will be false and operations will no-op.
 */
@Injectable({ providedIn: 'root' })
export class FormStateService {
  private readonly http = inject(HttpClient);
  private readonly options = inject(FORM_STATE_OPTIONS, { optional: true });

  /** Whether the service is configured and usable */
  readonly isConfigured = !!this.options?.apiUrl;

  private get apiUrl(): string {
    if (!this.options?.apiUrl) {
      throw new Error('FormStateService: Not configured. Add provideFormState({ apiUrl: "/api/forms" }) to your app providers.');
    }
    return this.options.apiUrl;
  }

  /**
   * Load saved form state by form ID.
   * Returns null if not found or not configured.
   */
  load(formId: string): Observable<FormState | null> {
    if (!this.isConfigured) return of(null);

    return this.http.get<FormState>(`${this.apiUrl}/${formId}`).pipe(catchError(() => of(null)));
  }

  /**
   * Save form state (upsert).
   */
  save(formId: string, values: Record<string, unknown>, metadata?: FormStateMetadata): Observable<void> {
    return this.http.put<void>(this.apiUrl, { formId, values, metadata });
  }

  /**
   * Clear saved form state.
   */
  clear(formId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${formId}`);
  }
}
