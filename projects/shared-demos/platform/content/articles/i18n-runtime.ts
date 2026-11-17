import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'One call, `provideI18n`, configures Transloco, the loader, missing-key handling, language persistence and `<html lang>` / `<html dir>`. Components then read translations through the generated `*appTranslate` directive or `translateSignal`, both checked by the compiler.',
      es: 'Una sola llamada, `provideI18n`, configura Transloco, el loader, el manejo de claves que faltan, la persistencia del idioma y `<html lang>` / `<html dir>`. Los componentes leen las traducciones con la directiva generada `*appTranslate` o con `translateSignal`, ambas revisadas por el compilador.',
    },
  ],
  sections: [
    {
      id: 'loaders',
      heading: { en: 'Choosing a loader', es: 'Elegir un loader' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Config', es: 'Config' },
            { en: 'Loader', es: 'Loader' },
            { en: 'When', es: 'Cuándo' },
          ],
          rows: [
            [
              { en: '`registry: ALL_TRANSLATIONS`', es: '`registry: ALL_TRANSLATIONS`' },
              { en: "`'registry'` (default)", es: "`'registry'` (por defecto)" },
              {
                en: 'Every language from memory: no HTTP, SSR-safe, offline. Every language is in the initial bundle — fine for small apps.',
                es: 'Todos los idiomas desde memoria: sin HTTP, seguro con SSR, offline. Todos los idiomas van en el bundle inicial — bien para apps pequeñas.',
              },
            ],
            [
              { en: '`keys: TK, translations: TRANSLATIONS`', es: '`keys: TK, translations: TRANSLATIONS`' },
              { en: "`'lazy'` (default with `translations`)", es: "`'lazy'` (por defecto con `translations`)" },
              {
                en: 'One chunk per language, imported the first time it is needed. Only the active language is downloaded; no HTTP setup; SSR waits for it.',
                es: 'Un chunk por idioma, importado la primera vez que se necesita. Solo se descarga el idioma activo; sin configurar HTTP; SSR lo espera.',
              },
            ],
            [
              { en: "`keys: TK, loader: 'http'`", es: "`keys: TK, loader: 'http'`" },
              { en: "`'http'`", es: "`'http'`" },
              {
                en: 'Fetches `<assetsPath>/<lang>.json` (default `/assets/i18n`), so translations can change without a rebuild.',
                es: 'Descarga `<assetsPath>/<lang>.json` (por defecto `/assets/i18n`), así las traducciones pueden cambiar sin recompilar.',
              },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts — lazy',
          code: `import { provideI18n } from '@hakistack/i18n';
import { TK } from './i18n/definitions/keys.generated';
import { TRANSLATIONS } from './i18n/definitions/translations.generated';

provideI18n({
  keys: TK,                    // instead of registry: no *.i18n.ts module is imported
  translations: TRANSLATIONS,  // one chunk per language
  languages: [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español', locale: 'es-PR' },
  ],
  fallbackLang: 'en',
});`,
        },
        {
          kind: 'p',
          text: {
            en: 'Measured on a production build with 2,000+ keys in 4 languages: initial JS went from 126.8 kB gzip (registry) to 56.9 kB gzip (lazy), plus ~18.7 kB gzip for the active language. Every generated tree already resolves untranslated keys to the fallback language, so the fallback language is never downloaded alongside.',
            es: 'Medido en un build de producción con más de 2.000 claves en 4 idiomas: el JS inicial pasó de 126,8 kB gzip (registry) a 56,9 kB gzip (lazy), más ~18,7 kB gzip del idioma activo. Cada árbol generado ya resuelve las claves sin traducir al idioma de fallback, así que el idioma de fallback nunca se descarga además.',
          },
        },
      ],
    },
    {
      id: 'use',
      heading: { en: 'Using translations', es: 'Usar traducciones' },
      blocks: [
        {
          kind: 'code',
          lang: 'html',
          title: 'template — the generated AppTranslateDirective',
          code: `<div *appTranslate="let t">{{ t.home.title() }}</div>
<p>{{ t.common.validation.minLength({ min: 3 }) }}</p>
<!-- optional key prefix -->
<div *appTranslate="let t; prefix: 'admin'">{{ t.users.title() }}</div>`,
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'component',
          code: `protected readonly title = translateSignal(TK.home.title);
protected readonly greeting = translateSignal(TK.home.greeting, { username: 'Ana' });`,
        },
        {
          kind: 'p',
          text: {
            en: '`translateSignal` is Transloco’s own function (same arguments, same reactivity) with the param check added; plain string keys stay untyped. The directive and `translateSignal` load the active language themselves.',
            es: '`translateSignal` es la función de Transloco (mismos argumentos, misma reactividad) con la revisión de parámetros añadida; las claves en string plano siguen sin tipos. La directiva y `translateSignal` cargan el idioma activo por su cuenta.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: "In development a missing key renders as `[scope.key]` and logs one warning per key (`missingKeyInDev: 'empty'` renders `''`); production renders `''`.",
            es: "En desarrollo una clave que falta se muestra como `[scope.key]` y registra una advertencia por clave (`missingKeyInDev: 'empty'` muestra `''`); en producción se muestra `''`.",
          },
        },
      ],
    },
    {
      id: 'language',
      heading: { en: 'Language, locale and direction', es: 'Idioma, locale y dirección' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`LanguageService` exposes `language()` (which translations), `locale()` (the BCP 47 formatting locale, for `Intl.*` or locale pipes) and `dir()`, and keeps `<html lang>` and `<html dir>` in sync, also during SSR. A language option may name its own `locale`; `dir` is derived from it (`textDirection`) unless you set it.',
            es: '`LanguageService` expone `language()` (qué traducciones), `locale()` (el locale de formato BCP 47, para `Intl.*` o pipes de locale) y `dir()`, y mantiene `<html lang>` y `<html dir>` sincronizados, también en SSR. Una opción de idioma puede indicar su propio `locale`; `dir` se deriva de él (`textDirection`) a menos que lo fijes.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `private readonly lang = inject(LanguageService);
readonly price = computed(() =>
  new Intl.NumberFormat(this.lang.locale(), { style: 'currency', currency: 'USD' }).format(19.9),
);

switchTo(id: string) {
  void this.lang.setLanguage(id); // ignored if id is not in languages
}`,
        },
        {
          kind: 'p',
          text: {
            en: '`language()` and `<html lang>` follow Transloco’s active language however it changes. Plurals and ICU messages stay Transloco’s (`@jsverse/transloco-messageformat`), and `@jsverse/transloco-locale` works alongside for pipes.',
            es: '`language()` y `<html lang>` siguen el idioma activo de Transloco sin importar cómo cambie. Los plurales y mensajes ICU siguen siendo de Transloco (`@jsverse/transloco-messageformat`), y `@jsverse/transloco-locale` funciona junto a esto para los pipes.',
          },
        },
      ],
    },
    {
      id: 'persistence',
      heading: { en: 'Remembering and detecting the language', es: 'Recordar y detectar el idioma' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Option', es: 'Opción' },
            { en: 'Effect', es: 'Efecto' },
          ],
          rows: [
            [
              { en: '`persistLanguage: true`', es: '`persistLanguage: true`' },
              {
                en: 'Remembers the choice in `localStorage` (browser only).',
                es: 'Recuerda la elección en `localStorage` (solo navegador).',
              },
            ],
            [
              { en: "`persistLanguage: 'cookie'`", es: "`persistLanguage: 'cookie'`" },
              {
                en: 'Remembers it in a `hakistack_i18n_lang` cookie that the server reads from the request, so SSR renders the user’s language and hydration shows no switch.',
                es: 'La recuerda en una cookie `hakistack_i18n_lang` que el servidor lee de la petición, así SSR muestra el idioma del usuario y la hidratación no muestra un cambio.',
              },
            ],
            [
              { en: '`detectLanguage: true`', es: '`detectLanguage: true`' },
              {
                en: 'When nothing is remembered, picks the best match for `Accept-Language` (server) or `navigator.languages` (browser) with `negotiateLanguage`. A detected language is not stored.',
                es: 'Cuando no hay nada recordado, elige la mejor coincidencia para `Accept-Language` (servidor) o `navigator.languages` (navegador) con `negotiateLanguage`. Un idioma detectado no se guarda.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'ssr',
      heading: { en: 'Server rendering', es: 'Renderizado en el servidor' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "Every piece of state lives in the application injector, so concurrent requests never share a language. The `'lazy'` loader is an Angular pending task: the server waits for the active language before serializing.",
            es: "Todo el estado vive en el injector de la aplicación, así que las peticiones concurrentes nunca comparten idioma. El loader `'lazy'` es una tarea pendiente de Angular: el servidor espera el idioma activo antes de serializar.",
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Verified with `renderApplication` on Angular 21.2: three concurrent requests (cookie `es`, `Accept-Language: ar-EG`, no preference) rendered `<html lang="es-PR" dir="ltr">`, `<html lang="ar" dir="rtl">` and `<html lang="en" dir="ltr">` with their own texts, with both the registry and the lazy loader.',
            es: 'Verificado con `renderApplication` en Angular 21.2: tres peticiones concurrentes (cookie `es`, `Accept-Language: ar-EG`, sin preferencia) generaron `<html lang="es-PR" dir="ltr">`, `<html lang="ar" dir="rtl">` y `<html lang="en" dir="ltr">` con sus propios textos, tanto con el loader registry como con el lazy.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'i18n-authoring', note: { en: 'Where the keys and their params come from', es: 'De dónde salen las claves y sus parámetros' } },
    {
      id: 'i18n-api',
      note: { en: 'Every option of I18nConfig and LanguageService', es: 'Todas las opciones de I18nConfig y LanguageService' },
    },
  ],
};

export default content;
