import { EnvironmentProviders, inject, isDevMode, makeEnvironmentProviders, provideAppInitializer, Provider } from '@angular/core';
import { provideTransloco, provideTranslocoInterceptor, provideTranslocoMissingHandler } from '@jsverse/transloco';

import { buildKeysTree } from '@hakistack/i18n/engine';
import { I18nConfig, ResolvedI18nRuntimeConfig } from './config';
import { TranslocoCommentInterceptor } from './comment-interceptor';
import { TranslocoHttpLoader } from './http-loader';
import { LanguageService } from './language.service';
import { TranslocoVisibleMissingHandler } from './missing-handler';
import { TranslocoRegistryLoader } from './registry-loader';
import { I18N_KEYS, I18N_RUNTIME_CONFIG } from './tokens';

/**
 * One-call i18n setup for a consumer app.
 *
 * Collapses what used to be a hand-written `provideTransloco(...)` config plus
 * a list of custom hooks (`provideTranslocoInterceptor`,
 * `provideTranslocoMissingHandler`) into a single provider. Wires:
 *   - Transloco with the registry loader (or HTTP loader).
 *   - The comment-stripping interceptor + the visible missing-key handler.
 *   - `I18N_KEYS` (the runtime `TK` tree) for the translate directive.
 *   - `I18N_RUNTIME_CONFIG` (resolved defaults) for the loader/handler.
 *   - Optional `LanguageService` localStorage restore on bootstrap.
 *
 * The consumer still imports the generated typed directive and
 * `translateSignal`/`TK` from their local barrel.
 *
 * @example
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideI18n({
 *       registry: ALL_TRANSLATIONS,
 *       languages: [
 *         { id: 'en', label: 'English' },
 *         { id: 'es', label: 'Español' },
 *       ],
 *       defaultLang: 'es',
 *       fallbackLang: 'en',
 *       persistLanguage: true,
 *     }),
 *   ],
 * };
 */
export function provideI18n(config: I18nConfig): EnvironmentProviders {
  const defaultLang = config.defaultLang ?? config.languages[0]?.id;
  if (!defaultLang) {
    throw new Error('provideI18n: `languages` must contain at least one entry (or set `defaultLang`).');
  }

  const resolved: ResolvedI18nRuntimeConfig = {
    registry: config.registry,
    defaultLang,
    fallbackLang: config.fallbackLang ?? 'en',
    missingKeyInDev: config.missingKeyInDev ?? 'show',
    assetsPath: (config.assetsPath ?? '/assets/i18n').replace(/\/$/, ''),
  };

  const loaderClass = config.loader === 'http' ? TranslocoHttpLoader : TranslocoRegistryLoader;

  const providers: (Provider | EnvironmentProviders)[] = [
    provideTransloco({
      config: {
        availableLangs: config.languages,
        defaultLang,
        fallbackLang: resolved.fallbackLang,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: {
          useFallbackTranslation: true,
          logMissingKey: isDevMode(),
        },
      },
      loader: loaderClass,
    }),
    provideTranslocoInterceptor(TranslocoCommentInterceptor),
    provideTranslocoMissingHandler(TranslocoVisibleMissingHandler),
    { provide: I18N_RUNTIME_CONFIG, useValue: resolved },
    { provide: I18N_KEYS, useValue: buildKeysTree(config.registry) },
  ];

  if (config.persistLanguage) {
    providers.push(
      provideAppInitializer(() => {
        const languageService = inject(LanguageService);
        return languageService.initializeLanguage();
      }),
    );
  }

  return makeEnvironmentProviders(providers);
}
