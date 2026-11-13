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
depends on `jiti` (installed automatically) and, for the `watch` command only,
on `chokidar` (an optional dependency).

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

Declare your locale set once so `t()` autocompletes the right locales:

```ts
// src/app/i18n-locales.d.ts
import '@hakistack/i18n/engine';
declare module '@hakistack/i18n/engine' {
  interface I18nLocales {
    es: string;
  }
}
```

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
npx hakistack-i18n scan        # emit barrel + TK literal + typed directive
npx hakistack-i18n generate    # write JSON translation files
npx hakistack-i18n validate    # gate on missing / placeholder-mismatched strings
npx hakistack-i18n watch       # re-run scan on *.i18n.ts changes (during ng serve)
npx hakistack-i18n find-unused # report defined keys with no references
```

Typical `package.json` wiring:

```jsonc
{
  "scripts": {
    "i18n:scan": "hakistack-i18n scan",
    "i18n:generate": "hakistack-i18n generate",
    "i18n:validate": "hakistack-i18n validate",
    "prestart": "npm run i18n:scan",
    "prebuild": "npm run i18n:scan && npm run i18n:generate && npm run i18n:validate"
  }
}
```

The scan emits three files into `definitionsDir` (never hand-edited):
`index.generated.ts` (the `ALL_TRANSLATIONS` registry), `keys.generated.ts`
(the flat camelCase `TK` literal — `TK.home.welcome === 'home.welcome'`), and
`appTranslate.directive.ts` (the typed template directive).

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

No HTTP fetch by default — the registry loader serves translations from memory
(SSR-safe, offline-friendly). Pass `loader: 'http'` to fetch `*.json` instead.

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

## Entry points

| Import | Contains |
|--------|----------|
| `@hakistack/i18n` | Runtime: `provideI18n`, `LanguageService`, `translateSignal`, `TranslateDirectiveBase`, loaders/hooks. (Re-exports the engine too.) |
| `@hakistack/i18n/engine` | Angular-free authoring/tree engine: `defineTranslations`, `t`, build-tree helpers. Loads in Node — this is what the codegen executes. |
