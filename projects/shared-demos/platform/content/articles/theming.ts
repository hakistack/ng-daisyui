import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Every component paints itself with daisyUI semantic tokens (`base-100`, `primary`, `error`, …) instead of fixed colors. Pick a daisyUI theme, or write your own, and the whole library follows it — light, dark or branded — without touching a component.',
      es: 'Cada componente se pinta con los tokens semánticos de daisyUI (`base-100`, `primary`, `error`, …) en lugar de colores fijos. Escoge un tema de daisyUI, o crea el tuyo, y toda la librería lo sigue —claro, oscuro o con tu marca— sin tocar ningún componente.',
    },
    {
      en: 'Theming has two independent parts: the **CSS** (which colors are active) and an optional **class-name bridge** (`provideHkTheme`) that tells components which daisyUI major version they run on.',
      es: 'El tema tiene dos partes independientes: el **CSS** (qué colores están activos) y un **puente de nombres de clase** opcional (`provideHkTheme`) que le dice a los componentes en qué versión mayor de daisyUI corren.',
    },
  ],
  sections: [
    {
      id: 'stylesheet-setup',
      heading: { en: 'Stylesheet setup', es: 'Configuración de la hoja de estilos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'With Tailwind CSS v4 and daisyUI v5, a single import of the package brings the library’s styles. It also adds an `@source` rule that points Tailwind at the compiled library bundle, so every class the components use is generated without a safelist.',
            es: 'Con Tailwind CSS v4 y daisyUI v5, un solo import del paquete trae los estilos de la librería. También añade una regla `@source` que apunta Tailwind al bundle compilado de la librería, así que cada clase que usan los componentes se genera sin safelist.',
          },
        },
        {
          kind: 'code',
          lang: 'css',
          title: 'src/styles.css',
          code: `@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default, dark --prefersdark;
}
@import "@hakistack/ng-daisyui";`,
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'src/index.html',
          code: `<html lang="en" data-theme="light">`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Do not add `@source inline(...)` safelists for library classes. The `@source` rule inside the package already covers them.',
            es: 'No añadas safelists `@source inline(...)` para las clases de la librería. La regla `@source` dentro del paquete ya las cubre.',
          },
        },
      ],
    },
    {
      id: 'tokens',
      heading: { en: 'Semantic tokens and --hk-* variables', es: 'Tokens semánticos y variables --hk-*' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Templates use daisyUI classes such as `bg-base-100`, `text-base-content` or `btn-primary`. A few component stylesheets need tints that Tailwind classes cannot express; for those the package defines `--hk-*` custom properties (for example `--hk-color-primary-20` or `--hk-color-base-content-10`) derived from the active daisyUI variables with `color-mix()`. They follow the theme automatically.',
            es: 'Las plantillas usan clases de daisyUI como `bg-base-100`, `text-base-content` o `btn-primary`. Algunas hojas de estilo de componentes necesitan tonos que las clases de Tailwind no expresan; para esos el paquete define propiedades personalizadas `--hk-*` (por ejemplo `--hk-color-primary-20` o `--hk-color-base-content-10`) derivadas de las variables activas de daisyUI con `color-mix()`. Siguen el tema automáticamente.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Panels rendered in a CDK overlay (such as the `hk-select` dropdown) live outside your component tree, so they read these global variables rather than component-scoped ones. That is why they still match the theme.',
            es: 'Los paneles que se dibujan en un overlay de CDK (como el desplegable de `hk-select`) viven fuera del árbol de tu componente, así que leen estas variables globales y no variables locales del componente. Por eso siguen coincidiendo con el tema.',
          },
        },
      ],
    },
    {
      id: 'dark-mode',
      heading: { en: 'Light, dark and runtime switching', es: 'Claro, oscuro y cambio en tiempo de ejecución' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Dark mode is just another daisyUI theme. Mark one theme `--prefersdark` to follow the operating system, or set `data-theme` yourself to let users choose. Changing the attribute restyles every component immediately; no Angular state is involved.',
            es: 'El modo oscuro es solo otro tema de daisyUI. Marca un tema con `--prefersdark` para seguir el sistema operativo, o asigna `data-theme` tú mismo para que el usuario escoja. Cambiar el atributo cambia el estilo de todos los componentes al instante; no hay estado de Angular de por medio.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'theme-switcher.ts',
          code: `import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeSwitcher {
  private readonly document = inject(DOCUMENT);

  set(theme: 'light' | 'dark'): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}`,
        },
      ],
    },
    {
      id: 'custom-theme',
      heading: { en: 'Your own theme', es: 'Tu propio tema' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Define a theme with the daisyUI theme plugin. Because components only reference semantic tokens, filling in the standard daisyUI variables is all it takes.',
            es: 'Define un tema con el plugin de temas de daisyUI. Como los componentes solo usan tokens semánticos, basta con llenar las variables estándar de daisyUI.',
          },
        },
        {
          kind: 'code',
          lang: 'css',
          title: 'src/styles.css',
          code: `@plugin "daisyui/theme" {
  name: "brand";
  default: false;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: oklch(99% 0 0);
  --color-base-200: oklch(96% 0.005 260);
  --color-base-300: oklch(92% 0.01 260);
  --color-base-content: oklch(25% 0.02 260);
  --color-primary: oklch(55% 0.2 260);
  --color-primary-content: oklch(98% 0 0);
  /* secondary, accent, neutral, info, success, warning, error … */
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'The package also ships two sample themes, Kaizen (dark) and Kaizen Light, in its `themes/` folder. They are written the same way and are a useful starting point.',
            es: 'El paquete también trae dos temas de ejemplo, Kaizen (oscuro) y Kaizen Light, en su carpeta `themes/`. Están escritos de la misma forma y sirven como punto de partida.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'The package `exports` map currently lists only `themes/daisyui-v4.css` and `themes/daisyui-v5.css`. Resolvers that honor `exports` may reject an import of the Kaizen files by package name; if that happens, copy the theme block into your own stylesheet.',
            es: 'El mapa `exports` del paquete hoy solo incluye `themes/daisyui-v4.css` y `themes/daisyui-v5.css`. Los resolvers que respetan `exports` pueden rechazar un import de los archivos Kaizen por nombre de paquete; si pasa, copia el bloque del tema en tu propia hoja de estilos.',
          },
        },
      ],
    },
    {
      id: 'class-bridge',
      heading: { en: 'daisyUI v4 vs v5: the class-name bridge', es: 'daisyUI v4 vs v5: el puente de nombres de clase' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A handful of daisyUI classes were renamed between v4 and v5 (tab styles, the active menu item, bordered cards). Components read those names from the `HK_THEME` token instead of hard-coding them. The default is v5, so a v5 app needs nothing; a v4 app registers [provideHkTheme](/api/provideHkTheme).',
            es: 'Algunas clases de daisyUI cambiaron de nombre entre v4 y v5 (estilos de tabs, el ítem activo del menú, tarjetas con borde). Los componentes leen esos nombres del token `HK_THEME` en lugar de fijarlos en el código. El valor por defecto es v5, así que una app v5 no necesita nada; una app v4 registra [provideHkTheme](/api/provideHkTheme).',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Purpose', es: 'Uso' },
            { en: 'daisyui-v5', es: 'daisyui-v5' },
            { en: 'daisyui-v4', es: 'daisyui-v4' },
          ],
          rows: [
            [
              { en: 'Lifted tabs', es: 'Tabs elevados' },
              { en: '`tabs-lift`', es: '`tabs-lift`' },
              { en: '`tabs-lifted`', es: '`tabs-lifted`' },
            ],
            [
              { en: 'Boxed tabs', es: 'Tabs en caja' },
              { en: '`tabs-box`', es: '`tabs-box`' },
              { en: '`tabs-boxed`', es: '`tabs-boxed`' },
            ],
            [
              { en: 'Bordered tabs', es: 'Tabs con borde' },
              { en: '`tabs-border`', es: '`tabs-border`' },
              { en: '`tabs-bordered`', es: '`tabs-bordered`' },
            ],
            [
              { en: 'Active menu item', es: 'Ítem activo del menú' },
              { en: '`menu-active`', es: '`menu-active`' },
              { en: '`active`', es: '`active`' },
            ],
            [
              { en: 'Bordered card', es: 'Tarjeta con borde' },
              { en: '`card-border`', es: '`card-border`' },
              { en: '`border border-base-300`', es: '`border border-base-300`' },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts (daisyUI v4 app)',
          code: `import { ApplicationConfig } from '@angular/core';
import { provideHkTheme } from '@hakistack/ng-daisyui';

export const appConfig: ApplicationConfig = {
  providers: [provideHkTheme('daisyui-v4')],
};`,
        },
        {
          kind: 'p',
          text: {
            en: 'On the Tailwind 3 / daisyUI 4 stack, import the precompiled `@hakistack/ng-daisyui/styles-v4.css` instead of the package root. It contains the `--hk-*` bridge plus every class the library uses, so your Tailwind config only scans your own app. The `ng add` schematic sets this up when you choose the legacy toolchain.',
            es: 'En el stack Tailwind 3 / daisyUI 4, importa el archivo precompilado `@hakistack/ng-daisyui/styles-v4.css` en lugar de la raíz del paquete. Contiene el puente `--hk-*` y todas las clases que usa la librería, así que tu configuración de Tailwind solo escanea tu propia app. El schematic `ng add` lo configura cuando escoges el toolchain legacy.',
          },
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'In your own templates, pick the class names of the daisyUI version you run. `HK_THEME` only affects library components.',
            es: 'En tus propias plantillas, usa los nombres de clase de la versión de daisyUI que corres. `HK_THEME` solo afecta los componentes de la librería.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'installation', note: { en: 'Full install and peer dependencies.', es: 'Instalación completa y dependencias peer.' } },
    {
      id: 'guide-troubleshooting',
      note: { en: 'What to check when components look unstyled.', es: 'Qué revisar cuando los componentes salen sin estilos.' },
    },
    {
      id: 'accessibility',
      note: { en: 'Contrast is part of your theme’s job.', es: 'El contraste también es responsabilidad de tu tema.' },
    },
  ],
};

export default content;
