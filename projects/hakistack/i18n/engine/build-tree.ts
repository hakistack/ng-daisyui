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

/** A nested string-tree as Transloco / the JSON files consume it. */
export interface LanguageTree {
  [key: string]: string | LanguageTree;
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
 * If a leaf carries a `__comment` (set via `t(en, others, { comment })`), a
 * sibling entry `<key>.comment` is added at the same level. Translators see it;
 * the runtime interceptor strips it before it reaches the store.
 */
export function extractLanguage(translations: Record<string, unknown>, lang: string, defaultLang: string): LanguageTree {
  const result: LanguageTree = {};
  for (const [key, value] of Object.entries(translations)) {
    if (isTranslationValue(value)) {
      result[key] = getTranslation(value, lang, defaultLang);
      if (value.__comment) {
        result[`${key}.comment`] = value.__comment;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = extractLanguage(value as Record<string, unknown>, lang, defaultLang);
    }
  }
  return result;
}

/**
 * Place a subtree at a dot-delimited scope path in the target tree, creating
 * intermediate objects as needed. If the path already holds an object, the new
 * subtree's leaves are merged into it.
 */
export function setAtScope(target: LanguageTree, scope: string, subtree: LanguageTree): void {
  const parts = scope.split('.');
  let current: LanguageTree = target;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const slot = current[part];
    if (slot === undefined || typeof slot === 'string') {
      current[part] = {};
    }
    current = current[part] as LanguageTree;
  }

  const leaf = parts[parts.length - 1];
  const existing = current[leaf];
  if (existing && typeof existing === 'object') {
    Object.assign(existing, subtree);
  } else {
    current[leaf] = subtree;
  }
}

/**
 * Build the complete translation tree for a single language from the registry.
 * The returned tree matches the JSON file layout exactly — same keys, nesting,
 * and fallbacks — so a consumer cannot tell whether the data came from the
 * registry or from disk.
 */
export function buildLanguageTree(
  registry: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[],
  lang: string,
  defaultLang: string,
): LanguageTree {
  const tree: LanguageTree = {};
  for (const mod of registry) {
    const subtree = extractLanguage(mod.translations, lang, defaultLang);
    setAtScope(tree, mod.scope, subtree);
  }
  return tree;
}

/**
 * Build the eager (root) tree — only modules declared without `{ scoped: true }`.
 * Used by the generator when route-level scope providers are adopted.
 */
export function buildEagerTree(
  registry: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[],
  lang: string,
  defaultLang: string,
): LanguageTree {
  const tree: LanguageTree = {};
  for (const mod of registry) {
    if (mod.scoped) continue;
    const subtree = extractLanguage(mod.translations, lang, defaultLang);
    setAtScope(tree, mod.scope, subtree);
  }
  return tree;
}

/**
 * Build the per-scope tree for a single scoped module — returned unwrapped
 * (no scope key around it), matching the layout `provideTranslocoScope` expects
 * to load from `<scope-with-slashes>/<lang>.json`.
 *
 * Returns `null` if no module with the given scope exists, or if it's eager.
 */
export function buildScopedTree(
  registry: readonly TranslationModule<Record<string, AuthoredTranslationNode>>[],
  lang: string,
  defaultLang: string,
  scope: string,
): LanguageTree | null {
  for (const mod of registry) {
    if (mod.scope === scope && mod.scoped) {
      return extractLanguage(mod.translations, lang, defaultLang);
    }
  }
  return null;
}

/**
 * Convert a dot-separated scope to its filesystem path.
 *   'administration.users' → 'administration/users'
 */
export function scopeToFilesystemPath(scope: string): string {
  return scope.replace(/\./g, '/');
}
