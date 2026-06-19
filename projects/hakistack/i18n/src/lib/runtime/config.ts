import { AuthoredTranslationNode, TranslationModule } from '@hakistack/i18n/engine';

/** A selectable language: its id (locale code) and a human-facing label. */
export interface I18nLanguageOption {
  /** Locale code, e.g. `'en'`, `'es'`, `'es-MX'`. */
  id: string;
  /** Display label shown in language pickers, e.g. `'English'`, `'Español'`. */
  label: string;
}

/** Which loader strategy backs Transloco. */
export type I18nLoaderStrategy = 'registry' | 'http';

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
   * tuple. Backs the registry loader and (via `buildKeysTree`) the typed
   * directive's runtime key object.
   */
  registry: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[];

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
   * Loader strategy:
   *   - `'registry'` (default) → serve translations from the in-memory registry
   *     (no HTTP, SSR-safe, offline by default).
   *   - `'http'` → fetch `<assetsPath>/<lang>.json` over HTTP.
   */
  loader?: I18nLoaderStrategy;

  /** Base path the HTTP loader fetches from. Default: `/assets/i18n`. Only used when `loader: 'http'`. */
  assetsPath?: string;

  /** When `true`, wires {@link LanguageService} localStorage persistence on bootstrap. Default: `false`. */
  persistLanguage?: boolean;
}

/** Fully-resolved runtime config (defaults applied) shared via DI to loaders/handlers. */
export interface ResolvedI18nRuntimeConfig {
  registry: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[];
  defaultLang: string;
  fallbackLang: string;
  missingKeyInDev: MissingKeyDevBehavior;
  assetsPath: string;
}
