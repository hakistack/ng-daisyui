import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Translations are TypeScript: one `*.i18n.ts` file per feature, built with `defineTranslations` and `t()` from the Angular-free `@hakistack/i18n/engine`. English is the source language and is always required; every other language is optional and falls back to English.',
      es: 'Las traducciones son TypeScript: un archivo `*.i18n.ts` por funcionalidad, construido con `defineTranslations` y `t()` del `@hakistack/i18n/engine` sin Angular. El inglés es el idioma fuente y siempre es obligatorio; los demás idiomas son opcionales y usan el inglés como fallback.',
    },
  ],
  sections: [
    {
      id: 'define',
      heading: { en: 'defineTranslations and t()', es: 'defineTranslations y t()' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'admin-users.i18n.ts',
          code: `import { defineTranslations, t } from '@hakistack/i18n/engine';

export const ADMIN_USERS = defineTranslations(
  'admin.users',
  {
    title: t('Users', { es: 'Usuarios' }),
    reset: 'Reset',                                   // bare string = English only
    deleted: t('{{ count }} users deleted', { es: '{{ count }} usuarios eliminados' }, { comment: 'Toast after a bulk delete' }),
    languages: { en: 'English', es: 'Español' },     // a plain object is a GROUP: keys languages.en / languages.es
  },
  { scoped: true },
);`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '`t(en, others?, { comment? })` — the English text, the other languages and an optional comment for translators.',
              es: '`t(en, otros?, { comment? })` — el texto en inglés, los demás idiomas y un comentario opcional para quien traduce.',
            },
            {
              en: 'Only `t()` and bare strings are translations (leaves). Any hand-written object is a group of keys.',
              es: 'Solo `t()` y los strings sueltos son traducciones (hojas). Cualquier objeto escrito a mano es un grupo de claves.',
            },
            {
              en: 'The scope must be a string literal: it becomes the key prefix (`admin.users.title`) and is part of the key’s type.',
              es: 'El scope debe ser un string literal: se convierte en el prefijo de la clave (`admin.users.title`) y forma parte del tipo de la clave.',
            },
            {
              en: '`{ scoped: true }` writes a separate JSON file for the scope (for per-scope lazy loading); without it the module is merged into the root JSON.',
              es: '`{ scoped: true }` escribe un JSON aparte para el scope (para cargarlo de forma diferida); sin eso el módulo se mezcla en el JSON raíz.',
            },
          ],
        },
      ],
    },
    {
      id: 'locales',
      heading: { en: 'Locales', es: 'Idiomas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Languages are declared once, in `i18n.config.json` (`locales`). `scan` turns that list into an `I18nLocales` augmentation, so `t()` autocompletes exactly those languages and `languages[].id` in `provideI18n` suggests them. `en` is always included.',
            es: 'Los idiomas se declaran una vez, en `i18n.config.json` (`locales`). `scan` convierte esa lista en una ampliación de `I18nLocales`, así `t()` autocompleta exactamente esos idiomas y `languages[].id` en `provideI18n` los sugiere. `en` siempre está incluido.',
          },
        },
      ],
    },
    {
      id: 'typed-params',
      heading: { en: 'Typed interpolation params', es: 'Parámetros de interpolación con tipos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "For every text with `{{…}}` placeholders the codegen types the key with its params — `I18nKey<'home.greeting', 'username'>`, still the plain string `'home.greeting'` at runtime. The compiler then checks the params in components and in strict templates:",
            es: "Para cada texto con marcadores `{{…}}` el codegen tipa la clave con sus parámetros — `I18nKey<'home.greeting', 'username'>`, que en tiempo de ejecución sigue siendo el string `'home.greeting'`. El compilador revisa entonces los parámetros en componentes y en plantillas estrictas:",
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `// greeting: t('Welcome back, {{ username }}!', { es: '¡Hola de nuevo, {{username}}!' })
translateSignal(TK.home.greeting, { username });                             // ✓
translateSignal(TK.home.greeting, computed(() => ({ username: name() })));  // ✓ reactive params
translateSignal(TK.home.greeting);                                           // ✗ params required
translateSignal(TK.home.greeting, { user: 'x' });                            // ✗ unknown param`,
        },
        {
          kind: 'p',
          text: {
            en: 'Params come from the English text, and `validate` makes every other language use the same placeholders (`{{ name }}` and `{{name}}` count as the same). A nested `{{ user.name }}` requires `user`. The codegen reads them once instead of making the type system parse strings: on a 5,000-key project that kept type-checking 4–6× faster.',
            es: 'Los parámetros salen del texto en inglés, y `validate` obliga a los demás idiomas a usar los mismos marcadores (`{{ name }}` y `{{name}}` cuentan como el mismo). Un `{{ user.name }}` anidado requiere `user`. El codegen los lee una vez en vez de hacer que el sistema de tipos analice strings: en un proyecto de 5.000 claves eso mantuvo el chequeo de tipos 4–6× más rápido.',
          },
        },
      ],
    },
    {
      id: 'shared-scopes',
      heading: { en: 'Shared scopes and key conflicts', es: 'Scopes compartidos y conflictos de claves' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Several modules may share a scope, and a module may nest under another one’s scope (`admin` + `admin.users`). Their keys are deep-merged — the same merge (`mergeKeys`) in the generated `TK`, in the runtime and in the JSON.',
            es: 'Varios módulos pueden compartir un scope, y un módulo puede anidarse bajo el scope de otro (`admin` + `admin.users`). Sus claves se mezclan en profundidad — la misma mezcla (`mergeKeys`) en el `TK` generado, en el runtime y en el JSON.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'A key defined twice, or a key that is both a translation and a group (scope `a` with a key `b`, plus a module scoped `a.b`), is an **error**: `scan`, `validate` and `generate` report each conflict with its file and exit with code 1, and the runtime throws instead of letting one module silently win. `findKeyConflicts(registry)` runs the same check from code.',
            es: 'Una clave definida dos veces, o una clave que es a la vez traducción y grupo (scope `a` con una clave `b`, más un módulo con scope `a.b`), es un **error**: `scan`, `validate` y `generate` reportan cada conflicto con su archivo y terminan con código 1, y el runtime lanza un error en lugar de dejar que un módulo gane en silencio. `findKeyConflicts(registry)` hace la misma revisión desde código.',
          },
        },
      ],
    },
    {
      id: 'what-scan-reads',
      heading: { en: 'What the codegen understands', es: 'Qué entiende el codegen' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "`scan` parses files with the TypeScript compiler; nothing is executed and commented-out code never counts. It finds `export const X = defineTranslations('scope', …)`, local constants exported with `export { X }` or `export { X as Y }`, and aliased or namespace imports of `defineTranslations`. Export names must be unique across all `*.i18n.ts` files.",
            es: "`scan` analiza los archivos con el compilador de TypeScript; no se ejecuta nada y el código comentado nunca cuenta. Encuentra `export const X = defineTranslations('scope', …)`, constantes locales exportadas con `export { X }` o `export { X as Y }`, e imports con alias o de namespace de `defineTranslations`. Los nombres exportados deben ser únicos entre todos los archivos `*.i18n.ts`.",
          },
        },
        {
          kind: 'p',
          text: {
            en: 'A module built with spreads or references to other constants still works: `TK` references it as `NAME.keys` (and bundles it), and `validate`/`generate` re-check the executed registry, which also catches conflicts hidden behind spreads.',
            es: 'Un módulo construido con spreads o referencias a otras constantes sigue funcionando: `TK` lo referencia como `NAME.keys` (y lo incluye en el bundle), y `validate`/`generate` revisan otra vez el registro ejecutado, lo que también detecta conflictos escondidos tras spreads.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'i18n-cli', note: { en: 'Generate TK, the directive and the JSON', es: 'Genera TK, la directiva y el JSON' } },
    { id: 'i18n-runtime', note: { en: 'Use the keys in components and templates', es: 'Usa las claves en componentes y plantillas' } },
  ],
};

export default content;
