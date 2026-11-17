/**
 * Type-level key metadata: which interpolation params a translation key needs.
 *
 * A key with `{{…}}` placeholders in its source text is typed as a *branded*
 * string — `I18nKey<'home.welcome', 'username'>` — whose runtime value is still
 * the plain key string Transloco expects. The brand is a phantom property that
 * exists only in the type system; nothing is added at runtime.
 *
 * Placeholder names are read from the source (`en`) text — the one every other
 * locale must match (the validator enforces placeholder parity) — by
 * `hakistack-i18n scan`, which emits them on the generated `TK`. They are not
 * inferred by `t()` in the type system: parsing `{{…}}` with template-literal
 * types made type-checking 4–6× slower on a 5,000-key project, while reading
 * them once at codegen time costs nothing to the compiler.
 */

/** Phantom marker carrying a key's placeholder names (type-only, never present at runtime). */
declare const I18N_PARAMS: unique symbol;

/** A translation key whose text interpolates the params `P`. Plain `K` at runtime. */
export type I18nKey<K extends string = string, P extends string = string> = K & { readonly [I18N_PARAMS]: P };

/** Placeholder names a key needs (`never` for a plain string key, or when unknown). */
export type KeyParams<K> = K extends { readonly [I18N_PARAMS]: infer P extends string } ? P : never;

/** The params object a key requires: one entry per placeholder. */
export type ParamsOf<K> = { [N in KeyParams<K>]: unknown };
