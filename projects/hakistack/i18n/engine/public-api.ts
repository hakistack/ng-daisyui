/*
 * @hakistack/i18n/engine
 *
 * The Angular-free authoring + tree-building engine. This entry point has NO
 * Angular dependency, so it loads in a plain Node context — which is what lets
 * the codegen CLI execute your `*.i18n.ts` modules via a TS loader.
 *
 * Author your translation modules against THIS entry point:
 *
 * ```ts
 * import { defineTranslations, t } from '@hakistack/i18n/engine';
 * ```
 *
 * Runtime APIs (`provideI18n`, `translateSignal`, the directive base) live on
 * the main `@hakistack/i18n` entry point.
 */

export { buildKeysTree, defineTranslations, isTranslationValue, t } from './define-translations';
export type {
  AuthoredTranslationNode,
  I18nLocales,
  Language,
  LocaleId,
  OtherLocales,
  TranslationModule,
  TranslationValue,
} from './define-translations';

export {
  buildEagerTree,
  buildLanguageTree,
  buildScopedTree,
  extractLanguage,
  getTranslation,
  scopeToFilesystemPath,
  setAtScope,
} from './build-tree';
export type { LanguageTree } from './build-tree';
