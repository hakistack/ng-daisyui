import { AuthoredTranslationNode, LocaleId, TranslationModule } from '@hakistack/i18n/engine';
import { Translation } from '@jsverse/transloco';

/** A selectable language: its id (the translation language), a label and optional locale metadata. */
export interface I18nLanguageOption {
  /** Translation language id, e.g. `'en'`, `'es'`. Autocompletes the locales declared in `i18n.config`. */
  id: LocaleId | (string & {});
  /** Display label shown in language pickers, e.g. `'English'`, `'Español'`. */
  label: string;
  /**
   * BCP 47 locale for formatting (dates, numbers, currency) and `<html lang>`
   * when it differs from the translation language — e.g. Spanish texts with
   * Puerto Rico formats: `{ id: 'es', locale: 'es-PR' }`. Default: `id`.
   */
  locale?: string;
  /** Text direction. Default: derived from the locale (`'rtl'` for Arabic, Hebrew, Persian, Urdu…). */
  dir?: 'ltr' | 'rtl';
}

/** Where the chosen language is remembered: `'local-storage'` (browser only) or `'cookie'` (also readable by SSR). */
export type I18nLanguagePersistence = 'local-storage' | 'cookie';

/** Which loader strategy backs Transloco. */
export type I18nLoaderStrategy = 'registry' | 'lazy' | 'http';

/** Loads one language's translation tree (a generated module whose default export is the tree). */
export type I18nTranslationLoader = () => Promise<{ default: Translation }>;

/**
 * Per-language loaders — the `TRANSLATIONS` constant `hakistack-i18n generate`
 * writes to `translations.generated.ts`. `root` holds the full tree per
 * language; `scopes` the per-scope trees of `{ scoped: true }` modules (keyed
 * by slash path, as `provideTranslocoScope` requests them).
 */
export interface I18nTranslationLoaders {
  root: Record<string, I18nTranslationLoader>;
  scopes?: Record<string, Record<string, I18nTranslationLoader>>;
}

/** Behavior for missing keys in dev mode. */
export type MissingKeyDevBehavior = 'show' | 'empty';

/**
 * Consumer-facing configuration for {@link provideI18n}.
 *
 * Collapses what used to be a hand-written `provideTransloco(...)` config plus
 * a list of custom hooks into one object.
 */
export interface I18nConfig {
  /**
   * The discovered translation modules — the scanner-generated `ALL_TRANSLATIONS`
   * tuple. Backs the `'registry'` loader (every language in the bundle) and,
   * when `keys` is omitted, the typed directive's runtime key object.
   */
  registry?: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[];

  /**
   * The generated `TK` object. Required without `registry`; lets the app use
   * the `'lazy'` or `'http'` loader without importing any `*.i18n.ts` module,
   * so no translation ends up in the initial bundle.
   */
  keys?: Record<string, unknown>;

  /**
   * The generated `TRANSLATIONS` loaders (`translations.generated.ts`). Enables
   * the `'lazy'` loader: one chunk per language, loaded on demand.
   */
  translations?: I18nTranslationLoaders;

  /** Available languages with labels. The first is used as default if `defaultLang` is omitted. */
  languages: I18nLanguageOption[];

  /** Active language on bootstrap. Defaults to the first entry in `languages`. */
  defaultLang?: string;

  /**
   * Locale every other locale falls back to when a key is untranslated.
   * Defaults to `'en'` (the source locale). Mirrors the build-time generator.
   */
  fallbackLang?: string;

  /**
   * Missing-key rendering in dev mode:
   *   - `'show'` (default) → renders `[scope.key]` so typos jump out.
   *   - `'empty'` → renders `''` (Transloco's default).
   * Production always renders `''`.
   */
  missingKeyInDev?: MissingKeyDevBehavior;

  /**
   * Loader strategy. Default: `'lazy'` when `translations` is given, otherwise `'registry'`.
   *   - `'registry'` → serve translations from the in-memory registry (every
   *     language in the bundle; no HTTP, SSR-safe, offline by default).
   *   - `'lazy'` → dynamic-import the active language's generated module
   *     (one chunk per language; SSR-safe, no HTTP configuration).
   *   - `'http'` → fetch `<assetsPath>/<lang>.json` over HTTP (update
   *     translations without rebuilding the app).
   */
  loader?: I18nLoaderStrategy;

  /** Base path the HTTP loader fetches from. Default: `/assets/i18n`. Only used when `loader: 'http'`. */
  assetsPath?: string;

  /**
   * Restore the language the user chose on bootstrap (and remember new choices):
   *   - `true` / `'local-storage'` → `localStorage` (browser only).
   *   - `'cookie'` → a `hakistack_i18n_lang` cookie, which the server also reads
   *     during SSR, so the server renders the user's language and hydration
   *     shows no language switch.
   * Default: `false`.
   */
  persistLanguage?: boolean | I18nLanguagePersistence;

  /**
   * When no language is remembered, pick the best match for the user's
   * preferences — the request's `Accept-Language` during SSR, `navigator.languages`
   * in the browser — instead of `defaultLang`. Default: `false`.
   */
  detectLanguage?: boolean;
}

/** Fully-resolved runtime config (defaults applied) shared via DI to loaders/handlers. */
export interface ResolvedI18nRuntimeConfig {
  registry: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[];
  translations: I18nTranslationLoaders | null;
  languages: readonly I18nLanguageOption[];
  /** Where `LanguageService.setLanguage` remembers the choice. */
  persistence: I18nLanguagePersistence;
  detectLanguage: boolean;
  defaultLang: string;
  fallbackLang: string;
  missingKeyInDev: MissingKeyDevBehavior;
  assetsPath: string;
}
