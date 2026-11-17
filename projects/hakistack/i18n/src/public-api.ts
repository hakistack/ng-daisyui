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
  findKeyConflicts,
  getTranslation,
  mergeKeys,
  isTranslationValue,
  normalizeScope,
  scopeToFilesystemPath,
  setAtScope,
  SOURCE_LANG,
  t,
  TRANSLATION_BRAND,
} from '@hakistack/i18n/engine';
export type {
  AuthoredTranslationNode,
  I18nKey,
  KeyParams,
  ParamsOf,
  I18nLocales,
  KeyConflict,
  Language,
  LanguageTree,
  LanguageTreeOptions,
  LocaleId,
  OtherLocales,
  SourceLang,
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
  I18nLanguagePersistence,
  I18nLoaderStrategy,
  I18nTranslationLoader,
  I18nTranslationLoaders,
  MissingKeyDevBehavior,
  ResolvedI18nRuntimeConfig,
} from './lib/runtime/config';
export { I18N_KEYS, I18N_RUNTIME_CONFIG } from './lib/runtime/tokens';

// Loaders / hooks — exported for custom wiring or one-line loader swaps.
export { TranslocoRegistryLoader } from './lib/runtime/registry-loader';
export { TranslocoHttpLoader } from './lib/runtime/http-loader';
export { TranslocoLazyLoader } from './lib/runtime/lazy-loader';
export { TranslocoCommentInterceptor } from './lib/runtime/comment-interceptor';
export { TranslocoVisibleMissingHandler } from './lib/runtime/missing-handler';

// Active-language service (language / locale / dir signals, persistence, <html lang|dir> sync).
export { LanguageService } from './lib/runtime/language.service';
export { negotiateLanguage, parseAcceptLanguage, textDirection } from './lib/runtime/locale';

// ============================================================================
// Template directive (base + context types — codegen emits the typed wrapper)
// ============================================================================
export { TranslateDirectiveBase } from './lib/runtime/translate.directive';
export type { TranslateContext, TranslatedKeys, TranslateFn } from './lib/runtime/translate.directive';

// ============================================================================
// Signal API — `translateSignal` is Transloco's with key params type-checked;
// `translateObjectSignal` is re-exported as is.
// ============================================================================
export { translateSignal } from './lib/runtime/translate-signal';
export type { TranslateSignalArgs } from './lib/runtime/translate-signal';
export { translateObjectSignal } from '@jsverse/transloco';
