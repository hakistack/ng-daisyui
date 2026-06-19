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
 * declare module '@hakistack/i18n' {
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
  const value = { en, ...translations } as TranslationValue;
  if (options?.comment) {
    value.__comment = options.comment;
  }
  return value;
}

/**
 * Authored translation node — what callers write inside `defineTranslations()`.
 * Accepts:
 *   - `TranslationValue` (full form, from `t()`)
 *   - `string` (shorthand for English-only — equivalent to `t(value)`)
 *   - nested object of either
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
      ? Prefix extends ''
        ? K
        : `${Prefix}.${K}`
      : T[K] extends Record<string, unknown>
        ? BuildKeyObject<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
        : never
    : never;
};

/**
 * Translation module returned by {@link defineTranslations}.
 *
 * `translations` stores the normalized form (every bare string promoted to
 * `{ en: value }`); `keys` is the type-derived companion of dot-paths.
 */
export interface TranslationModule<T extends Record<string, AuthoredTranslationNode> = Record<string, AuthoredTranslationNode>> {
  /** Scope/prefix for these translations (e.g. `'common'`, `'administration.users'`). */
  scope: string;
  /** Normalized translation definitions (strings promoted to `{ en: value }`). */
  translations: T;
  /** Auto-generated keys object for type-safe usage. */
  keys: BuildKeyObject<T>;
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
export function defineTranslations<T extends Record<string, AuthoredTranslationNode>>(
  scope: string,
  translations: T,
  options?: { scoped?: boolean },
): TranslationModule<T> {
  const normalized = normalizeTree(translations) as Record<string, TranslationNode>;
  const keys = buildKeys(normalized, scope) as BuildKeyObject<T>;
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
    return { en: node } as TranslationValue;
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

/** Type guard: is this value a `TranslationValue` (has a string `en`)? */
export function isTranslationValue(value: unknown): value is TranslationValue {
  return value !== null && typeof value === 'object' && 'en' in value && typeof (value as TranslationValue).en === 'string';
}

// =============================================================================
// Auto-derive a merged keys tree from module scopes (value-level)
// =============================================================================

/**
 * Build a merged keys tree from a list of translation modules by placing each
 * module's `keys` object at its scope path and deep-merging.
 *
 * This is the **runtime** value used by the directive (via the `I18N_KEYS`
 * token) — it produces the exact nested shape the scanner emits as the typed
 * `TK` literal. The scanner emits a concrete literal for *compile-time*
 * autocomplete; this function produces the identical structure at runtime, so
 * the two never diverge.
 *
 * Throws on duplicate scopes or scalar/scope conflicts.
 */
export function buildKeysTree(modules: readonly TranslationModule[]): Record<string, unknown> {
  const tree: Record<string, unknown> = {};

  // Sort by scope depth so parent scopes are placed before children — guarantees
  // a deeper scope descends through an already-copied parent slot.
  const sorted = [...modules].sort((a, b) => a.scope.split('.').length - b.scope.split('.').length);

  for (const mod of sorted) {
    placeAtScope(tree, mod.scope, mod.keys);
  }
  return tree;
}

function placeAtScope(tree: Record<string, unknown>, scope: string, keys: unknown): void {
  const path = scope.split('.');
  let current = tree;

  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i];
    const slot = current[part];
    if (slot === undefined) {
      current[part] = {};
    } else if (typeof slot !== 'object' || slot === null) {
      throw new Error(`i18n: scope conflict at '${path.slice(0, i + 1).join('.')}': scalar where nested scope expected`);
    }
    current = current[part] as Record<string, unknown>;
  }

  const leaf = path[path.length - 1];
  const existing = current[leaf];

  if (existing === undefined) {
    current[leaf] = { ...(keys as object) };
  } else if (typeof existing === 'object' && existing !== null) {
    current[leaf] = { ...(keys as object), ...(existing as object) };
  } else {
    throw new Error(`i18n: duplicate scope '${scope}'`);
  }
}
