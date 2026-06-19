/*
 * @hakistack/i18n
 *
 * TypeScript-first, build-time-generated, type-safe i18n for Angular on top of
 * Transloco. Author translations in `.ts`, get typed keys + JSON for free.
 *
 * Consumer surface:
 *   - Authoring:   `defineTranslations`, `t`
 *   - Runtime:     `provideI18n`, `LanguageService`, `translateSignal`
 *   - Templates:   `TranslateDirectiveBase` + `TranslateContext` (the codegen
 *                  emits a typed wrapper that extends the base)
 *   - Locale type: augment the `I18nLocales` interface to declare your locales.
 */

// ============================================================================
// Authoring engine — re-exported from the Angular-free `/engine` entry point
// for convenience. Author your *.i18n.ts against `@hakistack/i18n/engine`
// directly (it loads in Node, which the codegen CLI relies on).
// ============================================================================
export {
  buildEagerTree,
  buildKeysTree,
  buildLanguageTree,
  buildScopedTree,
  defineTranslations,
  extractLanguage,
  getTranslation,
  isTranslationValue,
  scopeToFilesystemPath,
  setAtScope,
  t,
} from '@hakistack/i18n/engine';
export type {
  AuthoredTranslationNode,
  I18nLocales,
  Language,
  LanguageTree,
  LocaleId,
  OtherLocales,
  TranslationModule,
  TranslationValue,
} from '@hakistack/i18n/engine';

// ============================================================================
// Runtime setup
// ============================================================================
export { provideI18n } from './lib/runtime/provide-i18n';
export type {
  I18nConfig,
  I18nLanguageOption,
  I18nLoaderStrategy,
  MissingKeyDevBehavior,
  ResolvedI18nRuntimeConfig,
} from './lib/runtime/config';
export { I18N_KEYS, I18N_RUNTIME_CONFIG } from './lib/runtime/tokens';

// Loaders / hooks — exported for custom wiring or one-line loader swaps.
export { TranslocoRegistryLoader } from './lib/runtime/registry-loader';
export { TranslocoHttpLoader } from './lib/runtime/http-loader';
export { TranslocoCommentInterceptor } from './lib/runtime/comment-interceptor';
export { TranslocoVisibleMissingHandler } from './lib/runtime/missing-handler';

// Active-language service (localStorage persistence + <html lang> sync).
export { LanguageService } from './lib/runtime/language.service';

// ============================================================================
// Template directive (base + context types — codegen emits the typed wrapper)
// ============================================================================
export { TranslateDirectiveBase } from './lib/runtime/translate.directive';
export type { TranslateContext, TranslatedKeys, TranslateFn } from './lib/runtime/translate.directive';

// ============================================================================
// Transloco signal API — re-exported so consumers don't reach into
// '@jsverse/transloco' directly.
// ============================================================================
export { translateSignal, translateObjectSignal } from '@jsverse/transloco';
