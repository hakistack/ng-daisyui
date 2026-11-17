# @hakistack/i18n

TypeScript-first, build-time-generated, **type-safe i18n for Angular** on top of
[Transloco](https://jsverse.github.io/transloco/). Author translations in `.ts`
files; the codegen derives the JSON files, the typed key object (`TK`), and a
typed template directive. There is no "JSON drifted from code" failure mode —
JSON is an output, not an input.

> Transloco is the runtime translation engine (active language, interpolation,
> fallback). Everything you interact with — authoring, key generation,
> validation, autocomplete — is this library's layer on top.

## Install

```bash
npm i @hakistack/i18n @jsverse/transloco
```

`@jsverse/transloco` is a peer dependency (you control its version). The CLI
depends on `jiti` (installed automatically), parses `*.i18n.ts` with your
project's `typescript` (an optional peer — every Angular project already has
it) and, for the `watch` command only, uses `chokidar` (an optional dependency).

## 1. Author translations (`*.i18n.ts`)

Author against the Angular-free `/engine` entry point:

```ts
// src/app/features/home/home.i18n.ts
import { defineTranslations, t } from '@hakistack/i18n/engine';

export const HOME = defineTranslations('home', {
  welcome: t('Welcome, Admin!', { es: '¡Bienvenido, Administrador!' }),
}, { scoped: true });
```

- `t(en, others?, { comment? })` — English (source) required, other locales
  optional, optional translator comment.
- Bare strings are shorthand for English-only (`reset: 'Reset'` ≡ `t('Reset')`).
- Only `t()` and bare strings are leaves. A hand-written object is always a
  *group*, so `languages: { en: 'English', es: 'Español' }` yields the two keys
  `languages.en` and `languages.es` — handy for language pickers.
- `en` is the fixed source locale: it is what `t()`'s first argument fills and
  what every other locale falls back to at build time and at runtime.
- `{ scoped: true }` emits a per-scope JSON file (forward-compat for
  `provideTranslocoScope` lazy loading); eager modules merge into the root JSON.

Locales are declared once, in `i18n.config` (`locales`). `scan` turns them into
an `I18nLocales` augmentation (`i18n-locales.generated.d.ts`), so `t()`
autocompletes exactly those locales and `languages[].id` in `provideI18n`
suggests them. A hand-written `I18nLocales` augmentation from an older setup
can stay (identical declarations merge) or be deleted.

## 2. Configure the codegen (`i18n.config.json`)

```jsonc
{
  "srcRoot": "src",
  "definitionsDir": "src/i18n/definitions",
  "outputDir": "src/assets/i18n",
  "locales": ["en", "es"]
}
```

(A `.ts`/`.js` config with a default export works too. `en` is always part of
`locales`; optional `directiveSelector` / `directiveClassName` rename the
generated directive.)

## 3. Run the codegen

```bash
npx hakistack-i18n check       # scan + validate + generate — the everyday command (prebuild, CI)
npx hakistack-i18n watch       # the same on every *.i18n.ts change (run next to ng serve)
npx hakistack-i18n find-unused # report keys with no reference (--strict fails on them)
```

The steps are also available alone: `scan` (barrel, `TK`, directive, locale
types), `validate` (missing / empty / placeholder-mismatched translations) and
`generate` (JSON + per-language modules). `check` stops at the first step that
fails and exits with code 1; `watch` prints errors and keeps running.

`scan` parses the files (TypeScript AST, nothing is executed). It finds
`export const X = defineTranslations('scope', …)`, local constants exported
with `export { X }` / `export { X as Y }`, and aliased or namespace imports of
`defineTranslations`; commented-out code never counts. The scope must be a
string literal. Problems are reported as `file:line`, and on an error (duplicate
export names, a key defined twice, a key that is both a translation and a
group) nothing is written and the command exits with code 1. `validate` and
`generate` re-check the executed registry, which also catches conflicts hidden
behind spreads or references.

Outputs are written atomically and only when their content changed, so dev
servers don't rebuild for nothing. Files a previous run wrote that are no
longer produced — a removed locale or scoped module, a renamed directive — are
deleted; the CLI only ever deletes files it wrote itself (tracked in
`node_modules/.cache/hakistack-i18n/`).

Typical `package.json` wiring:

```jsonc
{
  "scripts": {
    "i18n:check": "hakistack-i18n check",
    "i18n:watch": "hakistack-i18n watch",
    "prestart": "npm run i18n:check",
    "prebuild": "npm run i18n:check"
  }
}
```

Generated into `definitionsDir` (never hand-edited):

| File | From | Contents |
|------|------|----------|
| `keys.generated.ts` | `scan` | `TK` — `TK.home.welcome === 'home.welcome'`, typed as that literal |
| `index.generated.ts` | `scan` | `ALL_TRANSLATIONS`, the registry of every module |
| `appTranslate.directive.ts` | `scan` | the typed template directive |
| `i18n-locales.generated.d.ts` | `scan` | the `I18nLocales` augmentation from `locales` |
| `translations.generated.ts` + `translations/` | `generate` | `TRANSLATIONS`: one lazily imported module per language (and per scoped scope) |

`TK` holds the key strings themselves for every module `scan` can read
statically, so importing `TK` does not import any `*.i18n.ts` module. A module
built with spreads or references is referenced as `NAME.keys` instead (and is
bundled with `TK`).

Several modules may share a scope, and a module may nest under another one's
scope (`admin` + `admin.users`): their keys are deep-merged (`mergeKeys` in the
generated `TK`, the same merge the runtime and the JSON use). A key defined
twice, or a key that is both a translation and a group, is an error:
`validate` and `generate` list each conflict with its scopes and exit with code
1, and the runtime throws instead of letting one module silently win. Export
names must be unique across `*.i18n.ts` files (`scan` refuses duplicates).

## 4. Wire it up (one call)

```ts
// app.config.ts
import { provideI18n } from '@hakistack/i18n';
import { ALL_TRANSLATIONS } from './i18n/definitions/index.generated';

export const appConfig: ApplicationConfig = {
  providers: [
    provideI18n({
      registry: ALL_TRANSLATIONS,
      languages: [
        { id: 'en', label: 'English' },
        { id: 'es', label: 'Español' },
      ],
      defaultLang: 'es',     // active language on bootstrap
      fallbackLang: 'en',    // untranslated keys fall back here
      persistLanguage: true, // restore last language from localStorage
    }),
  ],
};
```

The registry loader serves every language from memory (no HTTP, SSR-safe,
offline-friendly) — simplest for small apps, but every language is in the
initial bundle. For larger apps load one language at a time:

```ts
import { TK } from './i18n/definitions/keys.generated';
import { TRANSLATIONS } from './i18n/definitions/translations.generated';

provideI18n({
  keys: TK,                    // instead of registry: no *.i18n.ts module is imported
  translations: TRANSLATIONS,  // one chunk per language, imported when first needed
  languages: [...],
})
```

The lazy loader is SSR-safe (server rendering waits for the import) and needs
no HTTP setup. Only the active language is downloaded: every generated tree
already resolves untranslated keys to the fallback language, so the fallback
language itself is never loaded alongside. `loader: 'http'` with `keys: TK` fetches the generated
`<assetsPath>/<lang>.json` instead, so translations can change without a
rebuild.

Measured on a production build with 2,000+ keys in 4 languages: the initial
JS goes from 604.0 kB / 126.8 kB gzip (registry) to 184.9 kB / 56.9 kB gzip
(lazy), plus a ~18.7 kB gzip chunk for the active language only.

`persistLanguage` only controls localStorage persistence: the generated
directive and `translateSignal` load the active language themselves.
`LanguageService.language()` and `<html lang>` follow Transloco's active
language however it is changed; `setLanguage()` ignores languages that are not
in `languages`.

In dev mode a missing key renders as `[scope.key]` and logs one console warning
per key (`missingKeyInDev: 'empty'` renders `''`); production renders `''`.

## 5. Use translations

```ts
// component
import { translateSignal } from '@hakistack/i18n';
import { TK } from '../../i18n/definitions/keys.generated';

protected readonly welcome = translateSignal(TK.home.welcome);
```

```html
<!-- template — import the generated AppTranslateDirective, fully typed -->
<div *appTranslate="let t">{{ t.home.welcome() }}</div>
<p>{{ t.common.validation.minLength({ min: 3 }) }}</p>
<!-- optional key prefix (the input is named <selector>Prefix) -->
<div *appTranslate="let t; prefix: 'admin'">{{ t.users.title() }}</div>
```

### Typed interpolation params

For every `t('…')` whose source text has `{{…}}` placeholders, `scan` types the
key with its params (`I18nKey<'home.greeting', 'username'>` — still the plain
string `'home.greeting'` at runtime). The compiler then checks them, in
components and in strict templates:

```ts
// home.i18n.ts: greeting: t('Welcome back, {{ username }}!', { es: '¡Hola de nuevo, {{username}}!' })
translateSignal(TK.home.greeting, { username });                       // ✓
translateSignal(TK.home.greeting, computed(() => ({ username: name() }))); // ✓ reactive params
translateSignal(TK.home.greeting);                                     // ✗ params required
translateSignal(TK.home.greeting, { user: 'x' });                      // ✗ unknown param
```

```html
{{ t.home.greeting({ username: user.name }) }}  <!-- ✗ without the param under strictTemplates -->
```

`translateSignal` is Transloco's own (same arguments and behavior) with this
check added; plain string keys stay untyped. Params come from the source
(`en`) text — `validate` keeps every locale in parity — and a nested
`{{ user.name }}` requires `user`. They are read once by the codegen rather than
parsed by the type system: on a 5,000-key project, template-literal parsing made
type-checking 4–6× slower, while the generated `TK` adds ~0.3 s.

## 6. Language, locale and direction

A language option can carry its formatting locale and text direction:

```ts
languages: [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español', locale: 'es-PR' }, // Spanish texts, Puerto Rico formats
  { id: 'ar', label: 'العربية' },                  // dir: 'rtl' derived from the locale
],
```

`LanguageService` exposes `language()` (translations), `locale()` (BCP 47, for
`Intl.*` or locale pipes) and `dir()`, and keeps `<html lang>` (the locale) and
`<html dir>` in sync — also during SSR:

```ts
private readonly lang = inject(LanguageService);
readonly price = computed(() => new Intl.NumberFormat(this.lang.locale(), { style: 'currency', currency: 'USD' }).format(19.9));
```

For pipes, `@jsverse/transloco-locale` works alongside: map languages to
locales with `langToLocaleMapping: { es: 'es-PR' }`. Pluralization and ICU
messages are Transloco's (`@jsverse/transloco-messageformat`); nothing here
replaces them.

## 7. SSR

`persistLanguage: 'cookie'` remembers the user's choice in a
`hakistack_i18n_lang` cookie that the server reads from the request, so the
server renders the user's language and hydration shows no switch.
`detectLanguage: true` picks the best match for `Accept-Language` (server) or
`navigator.languages` (browser) when nothing is remembered; a detected language
is not stored. Every piece of state lives in the application's injector, so
concurrent requests never share a language. The `'lazy'` loader is an Angular
pending task: the server waits for the active language before serializing.

Verified with a real `renderApplication` (Angular 21.2): three concurrent
requests — cookie `es`, `Accept-Language: ar-EG`, no preference — render
`<html lang="es-PR" dir="ltr">`, `<html lang="ar" dir="rtl">` and
`<html lang="en" dir="ltr">` with their own texts, with both the registry and
the lazy loader.

## Entry points

| Import | Contains |
|--------|----------|
| `@hakistack/i18n` | Runtime: `provideI18n`, `LanguageService`, `translateSignal`, `TranslateDirectiveBase`, loaders/hooks, `I18nTranslationLoaders`. (Re-exports the engine too.) |
| `@hakistack/i18n/engine` | Angular-free authoring/tree engine: `defineTranslations`, `t`, build-tree helpers. Loads in Node — this is what the codegen executes. |

## Finding unused keys

`hakistack-i18n find-unused` classifies every key:

- **used** — `TK.home.welcome` (also through `import { TK as K }` or
  `const home = TK.home; home.welcome`), the exact key as a string
  (`translate('home.welcome')`), or `t.home.welcome()` in a template under
  `*appTranslate="let t"` (with its `prefix:` applied);
- **possibly used** — only dynamic references that may reach it: a TK group
  used as a value or indexed (`TK.home[name]`), a key prefix in a string
  (`'home.' + name`, `` `home.${name}` ``), a group name passed to a
  `translate*` call (`translateObject('home')`). Never reported as unused;
- **test-only** — referenced only from `*.spec.ts`;
- **claimed** — matched by a `/* i18n-used: home.dynamic.* */` comment;
- **unused** — everything else. `--strict` exits with code 1 when there are any.

Comments never count as references.

