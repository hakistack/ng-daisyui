/**
 * Type-safe translation definitions — the authoring heart of `@hakistack/i18n`.
 *
 * Consumers author translations in `.ts` files (`*.i18n.ts`) using
 * `defineTranslations()` + `t()`. English is the required source locale; every
 * other locale is optional. The companion `keys` object gives type-safe
 * dot-path access at the value level, and the scanner derives a merged `TK`
 * literal from these modules.
 *
 * Unlike the original app-local engine, locales here are **not hardcoded**.
 * Consumers declare their locale union by augmenting the {@link I18nLocales}
 * interface (the scanner / schematic can emit this augmentation), so `t()` gets
 * autocomplete on exactly the locales the project supports.
 */

import { mergeInto, nestAtScope } from './merge';

// =============================================================================
// Locale configuration (consumer-augmented)
// =============================================================================

/**
 * The set of locales a project supports, as a type.
 *
 * `en` is the always-present source locale (English is the source of truth).
 * Consumers add their other locales by declaration-merging this interface:
 *
 * ```ts
 * declare module '@hakistack/i18n/engine' {
 *   interface I18nLocales {
 *     es: string;
 *     fr: string;
 *   }
 * }
 * ```
 *
 * After augmentation, `t('Hello', { es: '…', fr: '…' })` autocompletes `es`/`fr`
 * and `Language` resolves to `'en' | 'es' | 'fr'`.
 */
export interface I18nLocales {
  /** Source locale — always required on every translation value. */
  en: string;
}

/** Union of every declared locale id (e.g. `'en' | 'es'`). */
export type LocaleId = keyof I18nLocales & string;

/**
 * The source locale. `t()` stores its first argument here, every other locale
 * is optional, and build-time + runtime fallbacks end here. This is fixed by
 * the engine's types (`TranslationValue.en`), so it is not configurable.
 */
export const SOURCE_LANG = 'en';
export type SourceLang = typeof SOURCE_LANG;

/**
 * Runtime brand stamped (non-enumerably) on every `TranslationValue` produced
 * by `t()` or by bare-string normalization.
 *
 * Without a brand, a *group* whose child happens to be named `en` — e.g.
 * `languages: { en: 'English', es: 'Español' }` in a language picker — is
 * indistinguishable from a leaf. `Symbol.for` (global registry) is used so the
 * codegen CLI (which bundles its own copy of the engine) recognizes values
 * created by the consumer's installed copy.
 */
export const TRANSLATION_BRAND: unique symbol = Symbol.for('@hakistack/i18n:translation-value');

/** Alias kept for ergonomics — the active/target language id. */
export type Language = LocaleId;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * A single translation value across all declared locales.
 *
 * English (`en`) is required; every other declared locale is optional and falls
 * back to English at build time and runtime. The optional `__comment` field
 * stores translator-facing context — it is emitted as a sibling `<key>.comment`
 * entry in the JSON and stripped by the runtime interceptor so it never renders.
 */
export type TranslationValue = OtherLocales & {
  en: string;
  /** Internal — translator-context comment, attached via `t(en, others, { comment })`. */
  __comment?: string;
  /** Internal — runtime brand; only `t()` / normalization create branded values. */
  readonly [TRANSLATION_BRAND]: true;
};

/** Optional non-source locale fields, derived from the augmented locale set. */
export type OtherLocales = {
  [K in Exclude<LocaleId, 'en'>]?: string;
};

/**
 * Define a single translation value.
 *
 * @param en - English (source) translation — required.
 * @param translations - Other-locale translations — optional, autocompletes the
 *   consumer's declared locales.
 * @param options.comment - Translator-facing context. Emitted as a sibling
 *   `<key>.comment` entry in the JSON for translator review; stripped at runtime
 *   by the comment interceptor so it never renders.
 *
 * @example
 * t('Hello', { es: 'Hola' })
 * t('Save')  // English only — other locales fall back to English
 * t('Welcome', { es: '¡Bienvenido!' }, { comment: 'Greeting on home dashboard' })
 */
export function t(en: string, translations?: OtherLocales, options?: { comment?: string }): TranslationValue {
  const value = brand({ en, ...translations });
  if (options?.comment) {
    value.__comment = options.comment;
  }
  return value;
}

/** Stamp the non-enumerable brand on a plain `{ en, … }` record. */
function brand(value: OtherLocales & { en: string; __comment?: string }): TranslationValue {
  Object.defineProperty(value, TRANSLATION_BRAND, { value: true, enumerable: false, writable: false, configurable: false });
  return value as TranslationValue;
}

/**
 * Authored translation node — what callers write inside `defineTranslations()`.
 * Accepts:
 *   - `TranslationValue` (full form, from `t()`)
 *   - `string` (shorthand for English-only — equivalent to `t(value)`)
 *   - nested object of either
 *
 * Only `t()` produces a leaf. A hand-written `{ en: '…', es: '…' }` object is a
 * *group* with children named `en`/`es` — which is what a language picker wants.
 *
 * Strings are normalized to `TranslationValue` at module construction so the
 * rest of the pipeline (generator, validator, keys builder) only ever sees the
 * canonical `{ en, … }` shape.
 *
 * Note: any leaf string containing `{{…}}` placeholders MUST use `t()` — the
 * validator rejects bare placeholder strings because parity across locales
 * cannot be expressed with the shorthand.
 */
export type AuthoredTranslationNode = TranslationValue | string | { [key: string]: AuthoredTranslationNode };

/** Canonical (post-normalization) translation node — internal use only. */
type TranslationNode = TranslationValue | { [key: string]: TranslationNode };

/**
 * Recursively builds dot-notation key strings from the authored object shape.
 * Treats both `TranslationValue` and `string` as leaves (string is shorthand).
 */
type BuildKeyObject<T, Prefix extends string = ''> = {
  readonly [K in keyof T]: K extends string
    ? T[K] extends TranslationValue | string
      ? Join<Prefix, K>
      : T[K] extends Record<string, unknown>
        ? BuildKeyObject<T[K], Join<Prefix, K>>
        : never
    : never;
};

type Join<Prefix extends string, K extends string> = Prefix extends '' ? K : `${Prefix}.${K}`;

/**
 * Translation module returned by {@link defineTranslations}.
 *
 * `translations` stores the normalized form (every bare string promoted to
 * `{ en: value }`); `keys` is the type-derived companion of dot-paths.
 */
export interface TranslationModule<
  T extends Record<string, AuthoredTranslationNode> = Record<string, AuthoredTranslationNode>,
  S extends string = string,
> {
  /** Scope/prefix for these translations (e.g. `'common'`, `'administration.users'`). */
  scope: S;
  /** Normalized translation definitions (strings promoted to `{ en: value }`). */
  translations: T;
  /** Auto-generated keys object for type-safe usage (full keys, scope included: `'common.buttons.save'`). */
  keys: BuildKeyObject<T, S>;
  /**
   * If `true`, the generator emits this module's data to a subdirectory matching
   * its scope path (`administration.users` → `administration/users/<lang>.json`)
   * rather than merging into the root `<lang>.json`. Future-proofs
   * `provideTranslocoScope`-based lazy loading. Default: `false` (eager).
   */
  scoped: boolean;
}

/**
 * Define a translation module with auto-generated keys.
 *
 * @param scope - The scope/prefix for these translations.
 * @param translations - The translation definitions (full `t()` form or
 *   bare-string shorthand, nested freely).
 * @param options.scoped - Emit to a per-scope JSON file (see {@link TranslationModule.scoped}).
 *
 * @example
 * export const COMMON = defineTranslations('common', {
 *   buttons: {
 *     save:   t('Save', { es: 'Guardar' }),
 *     cancel: t('Cancel', { es: 'Cancelar' }),
 *     reset:  'Reset',                            // shorthand
 *   },
 * });
 * // COMMON.keys.buttons.save === 'common.buttons.save'
 */
export function defineTranslations<T extends Record<string, AuthoredTranslationNode>, const S extends string = string>(
  scope: S,
  translations: T,
  options?: { scoped?: boolean },
): TranslationModule<T, S> {
  const normalized = normalizeTree(translations) as Record<string, TranslationNode>;
  const keys = buildKeys(normalized, scope) as BuildKeyObject<T, S>;
  return {
    scope,
    translations: normalized as unknown as T,
    keys,
    scoped: options?.scoped ?? false,
  };
}

// =============================================================================
// Internal Utilities
// =============================================================================

/**
 * Normalize an authored tree by replacing every bare-string leaf with
 * `{ en: value }`. The output contains only `TranslationValue` leaves and
 * nested records — the canonical shape consumed by the generator/validator.
 */
function normalizeTree(node: AuthoredTranslationNode): TranslationNode {
  if (typeof node === 'string') {
    return brand({ en: node });
  }
  if (isTranslationValue(node)) {
    return node;
  }
  const result: Record<string, TranslationNode> = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = normalizeTree(value as AuthoredTranslationNode);
  }
  return result;
}

/** Recursively builds the dot-path keys object from a normalized tree. */
function buildKeys(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isTranslationValue(value)) {
      result[key] = fullKey;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = buildKeys(value as Record<string, unknown>, fullKey);
    }
  }
  return result;
}

/** Type guard: is this value a branded `TranslationValue` (created by `t()` or normalization)? */
export function isTranslationValue(value: unknown): value is TranslationValue {
  return value !== null && typeof value === 'object' && (value as Record<symbol, unknown>)[TRANSLATION_BRAND] === true;
}

// =============================================================================
// Auto-derive a merged keys tree from module scopes (value-level)
// =============================================================================

/**
 * Build a merged keys tree from a list of translation modules by placing each
 * module's `keys` object at its scope path and deep-merging.
 *
 * This is the **runtime** value used by the directive (via the `I18N_KEYS`
 * token). It uses the same deep merge as the scanner-emitted `TK` literal
 * (`mergeKeys`) and the language trees, so all three agree on which keys exist.
 * Throws when a key is defined twice or is both a translation and a group.
 */
export function buildKeysTree(modules: readonly TranslationModule[]): Record<string, unknown> {
  const tree: Record<string, unknown> = {};
  for (const mod of modules) {
    mergeInto(tree, nestAtScope(mod.scope, mod.keys as Record<string, unknown>), '', true);
  }
  return tree;
}

// =============================================================================
// Key conflicts (reported by the CLI before anything is generated)
// =============================================================================

/** A key defined by more than one module, or used both as a translation and as a group. */
export interface KeyConflict {
  /** Full dotted key, e.g. `'common.buttons.save'`. */
  key: string;
  kind: 'duplicate' | 'translation-and-group';
  /** Scopes of the modules involved (one entry per contributing module). */
  scopes: string[];
}

/**
 * Find every key collision across the registry, including the ones a deep
 * merge cannot see: a dotted key name (`'a.b'`) colliding with a nested group
 * (`a: { b }`) produces the same Transloco key.
 */
export function findKeyConflicts(modules: readonly TranslationModule[]): KeyConflict[] {
  const leaves: { key: string; scope: string }[] = [];
  const walk = (node: Record<string, unknown>, prefix: string, scope: string): void => {
    for (const [key, value] of Object.entries(node)) {
      const full = `${prefix}.${key}`;
      if (isTranslationValue(value)) leaves.push({ key: full, scope });
      else if (typeof value === 'object' && value !== null) walk(value as Record<string, unknown>, full, scope);
    }
  };
  for (const mod of modules) walk(mod.translations as Record<string, unknown>, mod.scope, mod.scope);
  return conflictsFromLeaves(leaves);
}

/**
 * Conflict detection over a flat list of full keys (one entry per definition).
 * Shared by {@link findKeyConflicts} (runtime registry) and the CLI scanner
 * (keys read statically from source).
 */
export function conflictsFromLeaves(leaves: Iterable<{ key: string; scope: string }>): KeyConflict[] {
  const byKey = new Map<string, string[]>();
  const groups = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, key: string, scope: string) => map.set(key, [...(map.get(key) ?? []), scope]);
  for (const { key, scope } of leaves) {
    add(byKey, key, scope);
    const parts = key.split('.');
    for (let i = 1; i < parts.length; i++) add(groups, parts.slice(0, i).join('.'), scope);
  }

  const conflicts: KeyConflict[] = [];
  for (const [key, scopes] of byKey) {
    if (scopes.length > 1) conflicts.push({ key, kind: 'duplicate', scopes });
    const groupScopes = groups.get(key);
    if (groupScopes) conflicts.push({ key, kind: 'translation-and-group', scopes: [...new Set([...scopes, ...groupScopes])] });
  }
  return conflicts.sort((a, b) => a.key.localeCompare(b.key));
}
