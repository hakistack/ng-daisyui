import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'The `hakistack-i18n` CLI turns your `*.i18n.ts` files into everything the app imports: typed keys, the template directive, locale types, JSON and per-language modules. Run `check` before every build and in CI; run `watch` next to `ng serve`.',
      es: 'El CLI `hakistack-i18n` convierte tus archivos `*.i18n.ts` en todo lo que importa la app: claves con tipos, la directiva de plantilla, tipos de idiomas, JSON y módulos por idioma. Ejecuta `check` antes de cada build y en CI; ejecuta `watch` junto a `ng serve`.',
    },
  ],
  sections: [
    {
      id: 'commands',
      heading: { en: 'Commands', es: 'Comandos' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Command', es: 'Comando' },
            { en: 'What it does', es: 'Qué hace' },
          ],
          rows: [
            [
              { en: '`check`', es: '`check`' },
              {
                en: '`scan` + `validate` + `generate`: the everyday command (prebuild, CI). Stops at the first failing step with exit code 1. `--quiet` prints only changes and errors.',
                es: '`scan` + `validate` + `generate`: el comando de todos los días (prebuild, CI). Se detiene en el primer paso que falla con código 1. `--quiet` muestra solo cambios y errores.',
              },
            ],
            [
              { en: '`watch`', es: '`watch`' },
              {
                en: 'The same on every `*.i18n.ts` change; prints errors and keeps running. Uses `chokidar` (optional dependency).',
                es: 'Lo mismo con cada cambio en un `*.i18n.ts`; muestra los errores y sigue corriendo. Usa `chokidar` (dependencia opcional).',
              },
            ],
            [
              { en: '`scan`', es: '`scan`' },
              {
                en: 'Writes the barrel, `TK`, the directive and the locale types. `--list` only lists the modules.',
                es: 'Escribe el barrel, `TK`, la directiva y los tipos de idiomas. `--list` solo lista los módulos.',
              },
            ],
            [
              { en: '`validate`', es: '`validate`' },
              {
                en: 'Fails on missing, empty or placeholder-mismatched translations and on key conflicts.',
                es: 'Falla si hay traducciones que faltan, vacías o con marcadores distintos, y si hay conflictos de claves.',
              },
            ],
            [
              { en: '`generate`', es: '`generate`' },
              { en: 'Writes the JSON files and the per-language modules.', es: 'Escribe los archivos JSON y los módulos por idioma.' },
            ],
            [
              { en: '`find-unused`', es: '`find-unused`' },
              {
                en: 'Classifies every key as used, possibly used, test-only, claimed or unused. `--strict` exits with 1 if any key is unused; `--verbose` prints where each one is referenced.',
                es: 'Clasifica cada clave como usada, posiblemente usada, solo en tests, reclamada o sin usar. `--strict` termina con 1 si hay claves sin usar; `--verbose` muestra dónde se referencia cada una.',
              },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'json',
          title: 'package.json (what ng add writes)',
          code: `{
  "scripts": {
    "i18n:check": "hakistack-i18n check",
    "i18n:watch": "hakistack-i18n watch",
    "prestart": "npm run i18n:check",
    "prebuild": "npm run i18n:check"
  }
}`,
        },
      ],
    },
    {
      id: 'config',
      heading: { en: 'i18n.config.json', es: 'i18n.config.json' },
      blocks: [
        {
          kind: 'code',
          lang: 'json',
          code: `{
  "srcRoot": "src",
  "definitionsDir": "src/i18n/definitions",
  "outputDir": "src/assets/i18n",
  "locales": ["en", "es"]
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'A `.ts` or `.js` config with a default export works too. `en` is always part of `locales`; `directiveSelector` and `directiveClassName` rename the generated directive. Every value can be overridden per run: `--config`, `--src-root`, `--definitions-dir`, `--output-dir`, `--locales=en,es`.',
            es: 'También sirve una configuración `.ts` o `.js` con export por defecto. `en` siempre forma parte de `locales`; `directiveSelector` y `directiveClassName` cambian el nombre de la directiva generada. Cada valor se puede sobrescribir por ejecución: `--config`, `--src-root`, `--definitions-dir`, `--output-dir`, `--locales=en,es`.',
          },
        },
      ],
    },
    {
      id: 'outputs',
      heading: { en: 'Generated files', es: 'Archivos generados' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'File (in definitionsDir)', es: 'Archivo (en definitionsDir)' },
            { en: 'Step', es: 'Paso' },
            { en: 'Contents', es: 'Contenido' },
          ],
          rows: [
            [
              { en: '`keys.generated.ts`', es: '`keys.generated.ts`' },
              { en: '`scan`', es: '`scan`' },
              {
                en: "`TK` — `TK.home.title === 'home.title'`, typed as that literal (with its params). Importing `TK` imports no `*.i18n.ts` module.",
                es: "`TK` — `TK.home.title === 'home.title'`, con ese literal como tipo (y sus parámetros). Importar `TK` no importa ningún módulo `*.i18n.ts`.",
              },
            ],
            [
              { en: '`index.generated.ts`', es: '`index.generated.ts`' },
              { en: '`scan`', es: '`scan`' },
              { en: '`ALL_TRANSLATIONS`, the registry of every module.', es: '`ALL_TRANSLATIONS`, el registro de todos los módulos.' },
            ],
            [
              { en: '`appTranslate.directive.ts`', es: '`appTranslate.directive.ts`' },
              { en: '`scan`', es: '`scan`' },
              { en: 'The typed `*appTranslate` directive.', es: 'La directiva `*appTranslate` con tipos.' },
            ],
            [
              { en: '`i18n-locales.generated.d.ts`', es: '`i18n-locales.generated.d.ts`' },
              { en: '`scan`', es: '`scan`' },
              { en: 'The `I18nLocales` augmentation from `locales`.', es: 'La ampliación de `I18nLocales` a partir de `locales`.' },
            ],
            [
              { en: '`translations.generated.ts` + `translations/`', es: '`translations.generated.ts` + `translations/`' },
              { en: '`generate`', es: '`generate`' },
              {
                en: '`TRANSLATIONS`: one lazily imported module per language (and per scoped scope). JSON goes to `outputDir`.',
                es: '`TRANSLATIONS`: un módulo importado de forma diferida por idioma (y por scope con `scoped`). El JSON va a `outputDir`.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Outputs are written atomically and only when their content changed, so dev servers do not rebuild for nothing. Files a previous run wrote that are no longer produced (a removed locale or scoped module, a renamed directive) are deleted; the CLI only deletes files it wrote itself, tracked in `node_modules/.cache/hakistack-i18n/`. Problems are reported as `file:line`, and on an error nothing is written.',
            es: 'Los resultados se escriben de forma atómica y solo cuando su contenido cambió, así los servidores de desarrollo no recompilan por nada. Los archivos que una ejecución anterior escribió y que ya no se producen (un idioma o módulo con scope eliminado, una directiva renombrada) se borran; el CLI solo borra archivos que escribió él, registrados en `node_modules/.cache/hakistack-i18n/`. Los problemas se reportan como `archivo:línea`, y si hay un error no se escribe nada.',
          },
        },
      ],
    },
    {
      id: 'unused',
      heading: { en: 'Finding unused keys', es: 'Encontrar claves sin usar' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**used** — `TK.home.title` (also through `import { TK as K }` or `const home = TK.home; home.title`), the exact key as a string, or `t.home.title()` under `*appTranslate="let t"` (with its `prefix` applied);',
              es: '**usada** — `TK.home.title` (también con `import { TK as K }` o `const home = TK.home; home.title`), la clave exacta como string, o `t.home.title()` bajo `*appTranslate="let t"` (con su `prefix` aplicado);',
            },
            {
              en: "**possibly used** — only dynamic references could reach it (`TK.home[name]`, `'home.' + name`, a group passed to `translateObject`). Never reported as unused;",
              es: "**posiblemente usada** — solo referencias dinámicas podrían alcanzarla (`TK.home[name]`, `'home.' + name`, un grupo pasado a `translateObject`). Nunca se reporta como sin usar;",
            },
            {
              en: '**test-only** — referenced only from `*.spec.ts`;',
              es: '**solo en tests** — referenciada solo desde `*.spec.ts`;',
            },
            {
              en: '**claimed** — matched by a `/* i18n-used: home.dynamic.* */` comment;',
              es: '**reclamada** — coincide con un comentario `/* i18n-used: home.dynamic.* */`;',
            },
            {
              en: '**unused** — everything else. Ordinary comments never count as references.',
              es: '**sin usar** — todo lo demás. Los comentarios normales nunca cuentan como referencia.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'i18n-authoring', note: { en: 'What scan reads from *.i18n.ts', es: 'Qué lee scan de *.i18n.ts' } },
    { id: 'i18n-getting-started', note: { en: 'Install and first run', es: 'Instalación y primera ejecución' } },
  ],
};

export default content;
