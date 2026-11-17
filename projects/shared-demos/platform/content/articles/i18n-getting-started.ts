import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: '`@hakistack/i18n` gives an Angular app **type-safe translations** on top of [Transloco](https://jsverse.github.io/transloco/). You write the texts in TypeScript files next to each feature; a CLI generates the JSON files, a typed key object (`TK`) and a typed template directive. JSON is an output, never something you edit, so code and translations cannot drift apart.',
      es: '`@hakistack/i18n` le da a una app Angular **traducciones con tipos** sobre [Transloco](https://jsverse.github.io/transloco/). Escribes los textos en archivos TypeScript junto a cada funcionalidad; un CLI genera los archivos JSON, un objeto de claves con tipos (`TK`) y una directiva de plantilla con tipos. El JSON es un resultado, nunca algo que editas, así que el código y las traducciones no pueden desincronizarse.',
    },
    {
      en: 'Transloco stays the runtime engine (active language, interpolation, fallback, plurals). This package is the layer you work with: authoring, key generation, validation and autocomplete. It does not need `@hakistack/ng-daisyui`.',
      es: 'Transloco sigue siendo el motor en tiempo de ejecución (idioma activo, interpolación, fallback, plurales). Este paquete es la capa con la que trabajas: escritura, generación de claves, validación y autocompletado. No necesita `@hakistack/ng-daisyui`.',
    },
  ],
  sections: [
    {
      id: 'install',
      heading: { en: 'Install', es: 'Instalación' },
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `ng add @hakistack/i18n          # recommended: installs Transloco and sets the project up
# or by hand:
npm i @hakistack/i18n @jsverse/transloco`,
        },
        {
          kind: 'p',
          text: {
            en: '`ng add` adds `@jsverse/transloco` (a peer dependency: you control its version), creates `i18n.config.json`, adds the `i18n:*` scripts and runs `i18n:check` before `start` and `build`, writes a sample `*.i18n.ts` module and adds the generated files to `.gitignore`. Options: `--locales=en,es,fr`, `--project`, `--skip-scripts`, `--skip-sample`, `--skip-install`.',
            es: '`ng add` añade `@jsverse/transloco` (dependencia peer: tú controlas su versión), crea `i18n.config.json`, añade los scripts `i18n:*` y ejecuta `i18n:check` antes de `start` y `build`, escribe un módulo `*.i18n.ts` de ejemplo y añade los archivos generados al `.gitignore`. Opciones: `--locales=en,es,fr`, `--project`, `--skip-scripts`, `--skip-sample`, `--skip-install`.',
          },
        },
      ],
    },
    {
      id: 'flow',
      heading: { en: 'How it fits together', es: 'Cómo encaja todo' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Write *.i18n.ts', es: 'Escribe *.i18n.ts' },
              detail: { en: '`defineTranslations` + `t()`', es: '`defineTranslations` + `t()`' },
            },
            {
              label: { en: 'Run hakistack-i18n check', es: 'Ejecuta hakistack-i18n check' },
              detail: { en: 'validates, generates `TK`, the directive and JSON', es: 'valida, genera `TK`, la directiva y el JSON' },
            },
            {
              label: { en: 'provideI18n(…)', es: 'provideI18n(…)' },
              detail: { en: 'one provider in `app.config.ts`', es: 'un solo provider en `app.config.ts`' },
            },
            {
              label: { en: 'Use typed keys', es: 'Usa claves con tipos' },
              detail: { en: '`*appTranslate` or `translateSignal(TK.…)`', es: '`*appTranslate` o `translateSignal(TK.…)`' },
            },
          ],
        },
      ],
    },
    {
      id: 'first-translation',
      heading: { en: 'Your first translation', es: 'Tu primera traducción' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'src/app/features/home/home.i18n.ts',
          code: `import { defineTranslations, t } from '@hakistack/i18n/engine';

export const HOME = defineTranslations('home', {
  title: t('Welcome', { es: 'Bienvenido' }),
  greeting: t('Hello, {{ username }}!', { es: '¡Hola, {{ username }}!' }),
});`,
        },
        {
          kind: 'code',
          lang: 'bash',
          code: 'npx hakistack-i18n check   # or: npm run i18n:check',
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { provideI18n } from '@hakistack/i18n';
import { ALL_TRANSLATIONS } from './i18n/definitions/index.generated';

export const appConfig: ApplicationConfig = {
  providers: [
    provideI18n({
      registry: ALL_TRANSLATIONS,
      languages: [
        { id: 'en', label: 'English' },
        { id: 'es', label: 'Español' },
      ],
      defaultLang: 'es',
      persistLanguage: true,
    }),
  ],
};`,
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'home.component.ts',
          code: `import { translateSignal } from '@hakistack/i18n';
import { TK } from '../../i18n/definitions/keys.generated';
import { AppTranslateDirective } from '../../i18n/definitions/appTranslate.directive';

@Component({
  imports: [AppTranslateDirective],
  template: \`
    <h1 *appTranslate="let t">{{ t.home.title() }}</h1>
    <p>{{ greeting() }}</p>
  \`,
})
export class HomeComponent {
  readonly username = signal('Ana');
  // The compiler requires { username }: it comes from the {{ username }} placeholder.
  protected readonly greeting = translateSignal(TK.home.greeting, computed(() => ({ username: this.username() })));
}`,
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: '`registry` puts every language in the initial bundle, which is fine for small apps. For larger apps load one language at a time with `keys` + `translations` (see [Runtime, loading & SSR](/i18n/runtime)).',
            es: '`registry` mete todos los idiomas en el bundle inicial, lo cual está bien para apps pequeñas. Para apps grandes carga un idioma a la vez con `keys` + `translations` (ver [Runtime, carga y SSR](/i18n/runtime)).',
          },
        },
      ],
    },
    {
      id: 'entry-points',
      heading: { en: 'Entry points', es: 'Entry points' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Import', es: 'Import' },
            { en: 'Contains', es: 'Contiene' },
          ],
          rows: [
            [
              { en: '`@hakistack/i18n`', es: '`@hakistack/i18n`' },
              {
                en: 'The Angular runtime: `provideI18n`, `LanguageService`, `translateSignal`, loaders. Re-exports the engine too.',
                es: 'El runtime de Angular: `provideI18n`, `LanguageService`, `translateSignal`, loaders. También re-exporta el engine.',
              },
            ],
            [
              { en: '`@hakistack/i18n/engine`', es: '`@hakistack/i18n/engine`' },
              {
                en: 'The Angular-free authoring engine: `defineTranslations`, `t`, tree helpers. It loads in Node, which is what the CLI runs, so `*.i18n.ts` files import from here.',
                es: 'El engine de escritura sin Angular: `defineTranslations`, `t`, utilidades de árboles. Carga en Node, que es lo que ejecuta el CLI, por eso los archivos `*.i18n.ts` importan desde aquí.',
              },
            ],
            [
              { en: '`hakistack-i18n` (bin)', es: '`hakistack-i18n` (bin)' },
              {
                en: 'The CLI: `check`, `watch`, `find-unused`… (see [CLI & codegen](/i18n/cli)).',
                es: 'El CLI: `check`, `watch`, `find-unused`… (ver [CLI y codegen](/i18n/cli)).',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Requirements: Angular 21, rxjs 7.8, Transloco 8.2+. The CLI parses your files with the project’s own `typescript` (an optional peer that every Angular project already has).',
            es: 'Requisitos: Angular 21, rxjs 7.8, Transloco 8.2+. El CLI analiza tus archivos con el `typescript` del propio proyecto (un peer opcional que todo proyecto Angular ya tiene).',
          },
        },
      ],
    },
  ],
  related: [
    {
      id: 'i18n-authoring',
      note: { en: 'Scopes, locales, params and key conflicts', es: 'Scopes, idiomas, parámetros y conflictos de claves' },
    },
    { id: 'i18n-runtime', note: { en: 'Lazy loading, locale, direction and SSR', es: 'Carga diferida, locale, dirección y SSR' } },
    {
      id: 'i18n',
      note: { en: 'Translate the ng-daisyui components’ own labels', es: 'Traduce las etiquetas propias de los componentes de ng-daisyui' },
    },
  ],
};

export default content;
