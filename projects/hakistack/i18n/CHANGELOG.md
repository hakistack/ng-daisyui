# Changelog — @hakistack/i18n

## Unreleased

### Fixed

- The generated template directive now loads the active language itself. Without `persistLanguage: true` (and with no other
  translation consumer) it used to render `[scope.key]` forever, even after switching languages. With the HTTP loader it now
  renders once the JSON has loaded.
- Modules sharing a scope are deep-merged everywhere. The runtime keys tree, the generated `TK` and the JSON/runtime
  translations used three different shallow merges, so a nested group present in two modules lost keys — differently in each
  tree (`t.common.buttons.cancel()` could type-check and then crash). The scan now emits `mergeKeys(...)` for shared branches.
- A key defined twice, or both a translation and a group (e.g. scope `a` with a key `b` plus a module scoped `a.b`), is now an
  error. `validate` and `generate` report every conflict and exit with code 1; the runtime throws. Previously the result
  depended on module order.
- Two `{ scoped: true }` modules declaring the same scope are merged into its per-scope JSON (the second one was dropped).
- Real keys whose last segment is `comment` (e.g. `post.comment`) are no longer stripped by the comment interceptor. The registry
  loader no longer puts translator comments in the runtime store at all.
- Missing keys log one dev-mode warning per key again (providing the visible missing handler had replaced Transloco's logging).
- `LanguageService.language()` and `<html lang>` follow the active language even when it is changed through `TranslocoService`;
  `setLanguage()` ignores languages that are not configured instead of activating and persisting them.
- Key literal types include the scope: `TK.common.buttons.save` is typed `'common.buttons.save'` (its runtime value), not
  `'buttons.save'`. `defineTranslations` captures the scope literal through a second, defaulted type parameter.
- `validate` treats `{{ name }}` and `{{name}}` as the same placeholder.
- `scan` quotes scope segments that are not identifiers (`'my-feature'`), discovers export names that are not upper case, and
  refuses duplicate export names across files instead of emitting a barrel that cannot compile.

### Changed — codegen (P1)

- `scan` parses `*.i18n.ts` with the TypeScript compiler API instead of regular expressions. Commented-out code and strings no
  longer produce modules; `export { X }`, `export { X as Y }`, aliased (`import { defineTranslations as dt }`) and namespace
  (`i18n.defineTranslations`) forms are discovered; a default export or a non-literal scope is reported with its line.
- `scan` reports key conflicts it can read from source before writing anything (exit code 1), and every diagnostic — duplicate
  export names, conflicts, missing scopes, `validate` errors, `generate` conflicts — names `file:line`.
- Outputs are written atomically (temp file + rename) and only when their content changed (`generate` used to rewrite every
  JSON file on every run). Files a previous run wrote and the current one no longer produces (a removed locale or scoped
  module, a renamed directive) are deleted. Only files recorded in `node_modules/.cache/hakistack-i18n/manifest.json` are ever
  deleted.
- Discovery order is deterministic (directory entries are sorted).
- `typescript` (`^5.4.0 || ^6.0.0`; TypeScript 7 changes the compiler API) is an optional peer dependency, used only by the CLI and resolved from the consumer's project.
- The CLI re-imports translation modules on every run of a long-lived process instead of serving jiti's cached module graph.

### Added — typing, locale and SSR (P3)

- Typed interpolation params: `scan` reads the `{{…}}` placeholders of each `t('…')` source text and types the key on the
  generated `TK` as `I18nKey<key, params>` (a plain string at runtime). `translateSignal` (Transloco's, with the check added)
  requires exactly those params — as an object or a signal — and the generated directive's `t.key(...)` does too under
  `strictTemplates`. New types: `I18nKey`, `KeyParams`, `ParamsOf`, `TranslateSignalArgs`. Params are not parsed in the type
  system: measured on 5,000 keys, template-literal parsing took type-checking from 0.16 s to ~0.95 s; the final engine checks
  in ~0.20 s and the typed `TK` adds ~0.3 s.
- Language vs locale: `languages[].locale` (BCP 47 formatting locale, e.g. `{ id: 'es', locale: 'es-PR' }`) and
  `languages[].dir`. `LanguageService.locale()` and `.dir()` signals; `<html lang>` is the locale and `<html dir>` is set
  (derived with `Intl.Locale` when not given). Helpers: `textDirection`, `parseAcceptLanguage`, `negotiateLanguage`.
- SSR: `persistLanguage: 'cookie'` (read from the request during SSR, written only in the browser) and `detectLanguage`
  (`Accept-Language` on the server, `navigator.languages` in the browser). Verified with `renderApplication`: concurrent
  requests render their own language and direction, with the registry and the lazy loader.

### Changed (P3)

- `initializeLanguage()` no longer writes the language it restored or detected; only an explicit `setLanguage()` is
  remembered.
- `TranslateFn` is a generic type alias (`TranslateFn<P>`) instead of an interface.

### Added — DX and bundle size (P2)

- `hakistack-i18n check`: scan + validate + generate, stopping at the first failure (exit code 1). The `ng add` schematic now
  wires `prestart` and `prebuild` to it (`i18n:check`, `i18n:watch` scripts).
- `watch` runs the full cycle (scan + validate + generate) on every change, prints errors and keeps running.
- Locales are declared once, in `i18n.config` `locales`: `scan` emits `i18n-locales.generated.d.ts` (the `I18nLocales`
  augmentation), referenced from `keys.generated.ts` / `index.generated.ts` so it applies even when the tsconfig lists files
  explicitly. The schematic no longer writes a hand-maintained `src/i18n-locales.d.ts`. `languages[].id` autocompletes them.
- Lazy per-language loading: `generate` writes `translations.generated.ts` (`TRANSLATIONS`) and one module per language (and
  per scoped scope) under `translations/`; `provideI18n({ keys: TK, translations: TRANSLATIONS })` selects the new `'lazy'`
  loader (`TranslocoLazyLoader`, an Angular pending task so SSR waits for it). `registry` is now optional when `keys` is given,
  which also lets `loader: 'http'` run without bundling any translation. Measured with 2,000+ keys in 4 languages: initial JS
  604.0 kB / 126.8 kB gzip (registry) → 184.9 kB / 56.9 kB gzip (lazy) + ~18.7 kB gzip for the active language.
- `TK` holds literal key strings for every module `scan` can read statically, so importing `TK` no longer imports the
  `*.i18n.ts` modules (and with them every translation). Modules built with spreads/references stay referenced as `NAME.keys`.
- `find-unused` distinguishes **used**, **possibly used** (dynamic references: TK groups used as values or indexed, key
  prefixes in strings and template literals, group names passed to `translate*`), **test-only**, **claimed** and **unused**;
  only unused keys fail `--strict`. It reads TypeScript with the compiler API (comments never count), follows
  `import { TK as K }` and `const g = TK.group` aliases, and applies the directive's `prefix:` in templates (`.html` and
  inline `template:`).

### Fixed (P2)

- Transloco no longer loads the fallback language next to the active one (`useFallbackTranslation` is off): every generated
  tree already resolves each key to the fallback. With the lazy loader a Spanish user downloaded both the Spanish and the English
  chunk; now only Spanish (verified in a production build in the browser).
- `/* i18n-used: home.dynamic.* */` markers with a `*` wildcard never matched (the pattern stopped at the `*`).

### Added

- `mergeKeys()`, `findKeyConflicts()` / `KeyConflict` and the `LanguageTreeOptions` (`{ comments }`) parameter of the tree
  builders, all on `@hakistack/i18n/engine` (re-exported from `@hakistack/i18n`).

### Changed

- `LanguageService.language()` reports Transloco's active language from construction; it no longer shows the stored language
  before `initializeLanguage()` has applied it.
- Projects with conflicting keys that used to build now fail `validate` / `generate` and throw at startup. Fix the reported keys.
