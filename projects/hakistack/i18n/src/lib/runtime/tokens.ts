import { InjectionToken } from '@angular/core';

import { ResolvedI18nRuntimeConfig } from './config';

/**
 * The merged keys tree (`TK`) provided by {@link provideI18n}.
 *
 * Holds the consumer's nested object of dot-path key strings — the exact shape
 * the scanner emits as the typed `TK` literal. `TranslateDirectiveBase` injects
 * this instead of importing `TK` directly, so the library never depends on a
 * consumer-generated symbol. Casing of keys is irrelevant at runtime: the
 * directive reads string leaves and calls `transloco.translate(leaf)`.
 */
export const I18N_KEYS = new InjectionToken<Record<string, unknown>>('I18N_KEYS');

/** Fully-resolved runtime config, shared with the loader and missing handler. */
export const I18N_RUNTIME_CONFIG = new InjectionToken<ResolvedI18nRuntimeConfig>('I18N_RUNTIME_CONFIG');
