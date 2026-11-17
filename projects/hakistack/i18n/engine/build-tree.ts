/**
 * Build a per-language translation tree from the in-memory module registry.
 *
 * Shared by:
 *   - the generator CLI — writes the tree as JSON to `<outputDir>/<lang>.json`
 *     for translator-facing tooling (build artifacts, not a runtime dependency).
 *   - the runtime `TranslocoRegistryLoader` — returns the tree synchronously to
 *     Transloco, eliminating the HTTP fetch.
 *
 * Producing the tree from the registry guarantees the runtime sees the exact
 * shape the generator emits — there's no "JSON drifted from TS" failure mode.
 *
 * Locale handling is parameterized: every function takes the `defaultLang`
 * (source/fallback locale) explicitly rather than reading a hardcoded constant,
 * so the engine is reusable across consumers with different locale sets.
 */

import { AuthoredTranslationNode, isTranslationValue, TranslationModule, TranslationValue } from './define-translations';
import { mergeInto, nestAtScope } from './merge';

/** A nested string-tree as Transloco / the JSON files consume it. */
export interface LanguageTree {
  [key: string]: string | LanguageTree;
}

/** Options for building string trees from the registry. */
export interface LanguageTreeOptions {
  /**
   * Emit translator comments as `<key>.comment` siblings. Default `true` (the
   * translator-facing JSON). The runtime registry loader passes `false` so
   * comments never reach Transloco's store.
   */
  comments?: boolean;
}

/**
 * Resolve a single `TranslationValue` for a given language.
 * Falls back to `defaultLang` for any locale that didn't supply a translation —
 * mirrors `useFallbackTranslation: true` in the runtime Transloco config.
 */
export function getTranslation(value: TranslationValue, lang: string, defaultLang: string): string {
  const byLang = value as Record<string, string | undefined>;
  if (lang === defaultLang) {
    return byLang[defaultLang] ?? value.en;
  }
  return byLang[lang] ?? byLang[defaultLang] ?? value.en;
}

/**
 * Walk a normalized translation subtree (all leaves are `TranslationValue`s) and
 * emit a string-only tree for the given language.
 *
 * If a leaf carries a `__comment` (set via `t(en, others, { comment })`) and
 * `options.comments` is not `false`, a sibling entry `<key>.comment` is added at
 * the same level for translators.
 */
export function extractLanguage(
  translations: Record<string, unknown>,
  lang: string,
  defaultLang: string,
  options: LanguageTreeOptions = {},
): LanguageTree {
  const comments = options.comments ?? true;
  const result: LanguageTree = {};
  for (const [key, value] of Object.entries(translations)) {
    if (isTranslationValue(value)) {
      result[key] = getTranslation(value, lang, defaultLang);
      if (comments && value.__comment) {
        result[`${key}.comment`] = value.__comment;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = extractLanguage(value as Record<string, unknown>, lang, defaultLang, options);
    }
  }
  return result;
}

/**
 * Deep-merge a subtree into the target at a dot-delimited scope path, creating
 * intermediate objects as needed. Throws when a key would be defined twice or
 * when a translation and a group collide (see `mergeInto`).
 */
export function setAtScope(target: LanguageTree, scope: string, subtree: LanguageTree): void {
  mergeInto(target, nestAtScope(scope, subtree));
}

type Registry = readonly TranslationModule<Record<string, AuthoredTranslationNode>>[];

/**
 * Build the complete translation tree for a single language from the registry.
 * The returned tree matches the JSON file layout exactly — same keys, nesting,
 * and fallbacks — so a consumer cannot tell whether the data came from the
 * registry or from disk.
 */
export function buildLanguageTree(registry: Registry, lang: string, defaultLang: string, options?: LanguageTreeOptions): LanguageTree {
  const tree: LanguageTree = {};
  for (const mod of registry) {
    setAtScope(tree, mod.scope, extractLanguage(mod.translations, lang, defaultLang, options));
  }
  return tree;
}

/**
 * Build the eager (root) tree — only modules declared without `{ scoped: true }`.
 * Used by the generator when route-level scope providers are adopted.
 */
export function buildEagerTree(registry: Registry, lang: string, defaultLang: string, options?: LanguageTreeOptions): LanguageTree {
  return buildLanguageTree(
    registry.filter((mod) => !mod.scoped),
    lang,
    defaultLang,
    options,
  );
}

/**
 * Build the per-scope tree for a scope — returned unwrapped (no scope key
 * around it), matching the layout `provideTranslocoScope` expects to load from
 * `<scope-with-slashes>/<lang>.json`. Every scoped module declaring that scope
 * is merged in.
 *
 * `scope` may be given in dotted (`administration.users`) or slash form
 * (`administration/users` — what Transloco hands a loader); both match.
 *
 * Returns `null` if no scoped module declares the scope.
 */
export function buildScopedTree(
  registry: Registry,
  lang: string,
  defaultLang: string,
  scope: string,
  options?: LanguageTreeOptions,
): LanguageTree | null {
  const wanted = normalizeScope(scope);
  const modules = registry.filter((mod) => mod.scoped && normalizeScope(mod.scope) === wanted);
  if (modules.length === 0) return null;
  const tree: LanguageTree = {};
  for (const mod of modules) mergeInto(tree, extractLanguage(mod.translations, lang, defaultLang, options), wanted);
  return tree;
}

/**
 * Convert a dot-separated scope to its filesystem path.
 *   'administration.users' → 'administration/users'
 */
export function scopeToFilesystemPath(scope: string): string {
  return scope.replace(/\./g, '/');
}

/**
 * Canonical dotted form of a scope, accepting either separator.
 *   'administration/users' → 'administration.users'
 */
export function normalizeScope(scope: string): string {
  return scope.replace(/\//g, '.');
}
