import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: an Angular 21 app where `@hakistack/ng-daisyui` components render with their styles. That takes three things: the package and its required peers, Tailwind CSS v4 with daisyUI v5 wired into your global stylesheet, and the library stylesheet imported after them. App providers are optional and depend on which features you use.',
      es: 'Objetivo: una app de Angular 21 donde los componentes de `@hakistack/ng-daisyui` se vean con sus estilos. Hacen falta tres cosas: el paquete y sus dependencias peer obligatorias, Tailwind CSS v4 con daisyUI v5 conectados a tu hoja de estilos global, y la hoja de estilos de la librería importada después de ellos. Los proveedores de la app son opcionales y dependen de las funciones que uses.',
    },
  ],
  sections: [
    {
      id: 'requirements',
      heading: { en: 'Requirements', es: 'Requisitos' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Angular 21 (`@angular/core`, `common`, `forms`, `router`, `cdk` and `aria`, all `^21`) and RxJS `^7.8`.',
              es: 'Angular 21 (`@angular/core`, `common`, `forms`, `router`, `cdk` y `aria`, todos `^21`) y RxJS `^7.8`.',
            },
            {
              en: 'Tailwind CSS `^4` and daisyUI `^5`. This is the main supported stack.',
              es: 'Tailwind CSS `^4` y daisyUI `^5`. Este es el stack principal soportado.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: "A legacy path for Tailwind CSS v3 + daisyUI v4 exists: a precompiled `styles-v4.css` plus `provideHkTheme('daisyui-v4')`. The package peers still ask for Tailwind 4 and daisyUI 5, so npm reports a peer warning on that path. Details in [Theming](/foundations/theming).",
            es: "Existe un camino legacy para Tailwind CSS v3 + daisyUI v4: un `styles-v4.css` precompilado más `provideHkTheme('daisyui-v4')`. Las dependencias peer del paquete siguen pidiendo Tailwind 4 y daisyUI 5, así que npm muestra una advertencia de peer en ese camino. Detalles en [Temas](/foundations/theming).",
          },
        },
      ],
    },
    {
      id: 'ng-add',
      heading: { en: 'Option A: ng add', es: 'Opción A: ng add' },
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `ng add @hakistack/ng-daisyui`,
        },
        {
          kind: 'p',
          text: {
            en: 'The schematic asks which toolchain to set up. With **Tailwind v4 + DaisyUI v5** (the default, `--target v5`) it:',
            es: 'El schematic pregunta qué toolchain configurar. Con **Tailwind v4 + DaisyUI v5** (el valor por defecto, `--target v5`):',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'adds `@angular/cdk` and `@angular/aria` to `dependencies`, matching your Angular major version;',
              es: 'añade `@angular/cdk` y `@angular/aria` a `dependencies`, con la misma versión mayor de tu Angular;',
            },
            {
              en: 'adds `tailwindcss`, `@tailwindcss/postcss` and `daisyui` to `devDependencies`;',
              es: 'añade `tailwindcss`, `@tailwindcss/postcss` y `daisyui` a `devDependencies`;',
            },
            {
              en: 'adds the three stylesheet lines shown in step 3 below to the first `.css` file in your project’s build `styles`;',
              es: 'añade las tres líneas de hoja de estilos del paso 3 (más abajo) al primer archivo `.css` de los `styles` del build de tu proyecto;',
            },
            {
              en: 'runs `npm install`. Packages and lines you already have are skipped.',
              es: 'corre `npm install`. Los paquetes y líneas que ya tienes se omiten.',
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Flags: `--target v5 | v4-legacy`, `--project <name>`, `--skip-install`, `--skip-style-import`.',
            es: 'Opciones: `--target v5 | v4-legacy`, `--project <name>`, `--skip-install`, `--skip-style-import`.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'On the v5 path, `ng add` creates `.postcssrc.json` (only when the project has no PostCSS config yet) but does not add theme imports or register providers. Continue from step 3.',
            es: 'En el camino v5, `ng add` crea `.postcssrc.json` (solo si el proyecto aún no tiene una configuración de PostCSS), pero no añade imports de temas ni registra proveedores. Sigue desde el paso 3.',
          },
        },
      ],
    },
    {
      id: 'manual-install',
      heading: { en: 'Option B: manual setup — 1. Install packages', es: 'Opción B: configuración manual — 1. Instala los paquetes' },
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `npm install @hakistack/ng-daisyui @angular/cdk @angular/aria
npm install -D tailwindcss @tailwindcss/postcss postcss daisyui`,
        },
        {
          kind: 'p',
          text: {
            en: 'A new Angular 21 app already has `@angular/core`, `common`, `forms`, `router` and `rxjs`. These runtime dependencies come with the library and need no action: `@lucide/angular` (icons), `fuse.js` (fuzzy search), `motion` (animations), `libphonenumber-js` (phone inputs), `uuid` and `tslib`.',
            es: 'Una app nueva de Angular 21 ya trae `@angular/core`, `common`, `forms`, `router` y `rxjs`. Estas dependencias de ejecución vienen con la librería y no requieren nada de tu parte: `@lucide/angular` (iconos), `fuse.js` (búsqueda difusa), `motion` (animaciones), `libphonenumber-js` (campos de teléfono), `uuid` y `tslib`.',
          },
        },
      ],
    },
    {
      id: 'peers',
      heading: { en: 'Required and optional peers', es: 'Dependencias peer obligatorias y opcionales' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Package', es: 'Paquete' },
            { en: 'Needed for', es: 'Se necesita para' },
          ],
          rows: [
            [
              {
                en: '`@angular/core`, `common`, `forms`, `router`, `cdk`, `aria` (`^21`), `rxjs` (`^7.8`)',
                es: '`@angular/core`, `common`, `forms`, `router`, `cdk`, `aria` (`^21`), `rxjs` (`^7.8`)',
              },
              { en: '**Required.** Every app.', es: '**Obligatorio.** Toda app.' },
            ],
            [
              { en: '`tailwindcss` (`^4`), `daisyui` (`^5`)', es: '`tailwindcss` (`^4`), `daisyui` (`^5`)' },
              { en: '**Required.** All styling.', es: '**Obligatorio.** Todos los estilos.' },
            ],
            [
              { en: '`@tiptap/*` (`^3`)', es: '`@tiptap/*` (`^3`)' },
              {
                en: 'Optional. The [rich text editor](/editor) (`hk-editor`) and `field.editor()` in forms.',
                es: 'Opcional. El [editor de texto enriquecido](/editor) (`hk-editor`) y `field.editor()` en formularios.',
              },
            ],
            [
              { en: '`docx-preview`', es: '`docx-preview`' },
              {
                en: 'Optional. `.docx` files in the [document viewer](/document-viewer).',
                es: 'Opcional. Archivos `.docx` en el [visor de documentos](/document-viewer).',
              },
            ],
            [
              { en: '`@kenjiuno/msgreader`', es: '`@kenjiuno/msgreader`' },
              {
                en: 'Optional. Outlook `.msg` files in the document viewer.',
                es: 'Opcional. Archivos `.msg` de Outlook en el visor de documentos.',
              },
            ],
            [
              { en: '`postal-mime`', es: '`postal-mime`' },
              { en: 'Optional. `.eml` email files in the document viewer.', es: 'Opcional. Correos `.eml` en el visor de documentos.' },
            ],
            [
              { en: '`foliate-js`', es: '`foliate-js`' },
              { en: 'Optional. EPUB books in the document viewer.', es: 'Opcional. Libros EPUB en el visor de documentos.' },
            ],
            [
              { en: '`dompurify`', es: '`dompurify`' },
              {
                en: 'Optional. HTML files in the document viewer and the Markdown preview of the [document editor](/document-editor).',
                es: 'Opcional. Archivos HTML en el visor de documentos y la vista previa de Markdown del [editor de documentos](/document-editor).',
              },
            ],
            [
              { en: '`heic2any`', es: '`heic2any`' },
              {
                en: 'Optional. Fallback decoder for HEIC photos when the built-in WASM decoder is not available.',
                es: 'Opcional. Decodificador de respaldo para fotos HEIC cuando el decodificador WASM incluido no está disponible.',
              },
            ],
            [
              { en: '`@anthropic-ai/sdk`', es: '`@anthropic-ai/sdk`' },
              {
                en: 'Optional. The [DataGrid](/datagrid) AI layer (`controller.ask()`), unless you pass your own `ai.complete` transport.',
                es: 'Opcional. La capa de IA del [DataGrid](/datagrid) (`controller.ask()`), a menos que pases tu propio transporte `ai.complete`.',
              },
            ],
            [
              { en: '`ts-morph`', es: '`ts-morph`' },
              {
                en: 'Optional, dev only. The `migrate-table-columns` schematic.',
                es: 'Opcional, solo en desarrollo. El schematic `migrate-table-columns`.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Optional peers are loaded with dynamic imports when their feature first runs, so your app builds without them. Install the ones for the features you use. For the editor:',
            es: 'Las dependencias peer opcionales se cargan con imports dinámicos cuando su función se usa por primera vez, así que tu app compila sin ellas. Instala las de las funciones que uses. Para el editor:',
          },
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-file-handler @tiptap/suggestion`,
        },
      ],
    },
    {
      id: 'postcss',
      heading: { en: '2. Enable Tailwind in the Angular build', es: '2. Activa Tailwind en el build de Angular' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The Angular build runs Tailwind CSS v4 through PostCSS. `ng add` creates this file for you; on a manual install, create it at the project root if it is not there yet.',
            es: 'El build de Angular corre Tailwind CSS v4 a través de PostCSS. `ng add` crea este archivo por ti; si instalas a mano, créalo en la raíz del proyecto si todavía no existe.',
          },
        },
        {
          kind: 'code',
          lang: 'json',
          title: '.postcssrc.json',
          code: `{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}`,
        },
      ],
    },
    {
      id: 'styles',
      heading: { en: '3. Import the styles', es: '3. Importa los estilos' },
      blocks: [
        {
          kind: 'code',
          lang: 'css',
          title: 'src/styles.css',
          code: `@import "tailwindcss";
@plugin "daisyui";
@import "@hakistack/ng-daisyui";`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Keep the order: Tailwind, then the daisyUI plugin, then the library.',
              es: 'Respeta el orden: Tailwind, luego el plugin de daisyUI y luego la librería.',
            },
            {
              en: 'Tailwind v4 does not scan `node_modules`. You do not need your own `@source` line for the library: its stylesheet already contains an `@source` rule that points Tailwind at the compiled library bundle, so every class the components use is generated.',
              es: 'Tailwind v4 no escanea `node_modules`. No necesitas tu propia línea `@source` para la librería: su hoja de estilos ya contiene una regla `@source` que apunta Tailwind al bundle compilado de la librería, así que se genera cada clase que usan los componentes.',
            },
            {
              en: 'Do not add safelists or `@source inline(...)` for library classes. If classes are missing, the import is what needs fixing.',
              es: 'No añadas safelists ni `@source inline(...)` para las clases de la librería. Si faltan clases, lo que hay que arreglar es el import.',
            },
            {
              en: 'Import from the package root, never from deep paths inside the package.',
              es: 'Importa desde la raíz del paquete, nunca desde rutas internas del paquete.',
            },
          ],
        },
      ],
    },
    {
      id: 'themes',
      heading: { en: '4. Pick a theme', es: '4. Escoge un tema' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Choose which daisyUI themes to build in the plugin block, and set one on `<html>` with `data-theme`. The package also ships two themes of its own, `kaizen` (dark) and `kaizen-light`, which you can import after the library.',
            es: 'Escoge qué temas de daisyUI compilar en el bloque del plugin y fija uno en `<html>` con `data-theme`. El paquete también trae dos temas propios, `kaizen` (oscuro) y `kaizen-light`, que puedes importar después de la librería.',
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
@import "@hakistack/ng-daisyui";

/* Optional: the themes that ship with the package */
@import "@hakistack/ng-daisyui/themes/kaizen";
@import "@hakistack/ng-daisyui/themes/kaizen-light";`,
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'src/index.html',
          code: `<html lang="en" data-theme="light">`,
        },
        {
          kind: 'p',
          text: {
            en: 'Runtime switching, dark mode and your own theme are covered in [Theming](/foundations/theming).',
            es: 'El cambio de tema en tiempo de ejecución, el modo oscuro y tu propio tema se explican en [Temas](/foundations/theming).',
          },
        },
      ],
    },
    {
      id: 'providers',
      heading: { en: '5. App providers: what is required', es: '5. Proveedores de la app: qué es obligatorio' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'On Tailwind 4 + daisyUI 5, **no library provider is required**. Services such as `ToastService`, `AlertService` and `NotificationService` are provided in root and work with defaults. Add a provider only when you use the feature it configures.',
            es: 'Con Tailwind 4 + daisyUI 5, **ningún proveedor de la librería es obligatorio**. Servicios como `ToastService`, `AlertService` y `NotificationService` se proveen en root y funcionan con valores por defecto. Añade un proveedor solo cuando uses la función que configura.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Provider', es: 'Proveedor' },
            { en: 'Add it when', es: 'Añádelo cuando' },
          ],
          rows: [
            [
              { en: '[providePipes](/api/providePipes)', es: '[providePipes](/api/providePipes)' },
              {
                en: "A table column uses a pipe formatter (`fmt.*()` or a tuple like `['date', 'short']`), or you register your own pipes. Without it you get `NullInjectorError`.",
                es: "Una columna de tabla usa un formateador de pipe (`fmt.*()` o una tupla como `['date', 'short']`), o registras tus propios pipes. Sin él obtienes `NullInjectorError`.",
              },
            ],
            [
              { en: '`provideRouter(...)` (Angular)', es: '`provideRouter(...)` (Angular)' },
              {
                en: 'Menu items or breadcrumbs use `routerLink`.',
                es: 'Los ítems de menú o los breadcrumbs usan `routerLink`.',
              },
            ],
            [
              { en: '[provideFormState](/api/provideFormState)', es: '[provideFormState](/api/provideFormState)' },
              {
                en: 'A form uses `autoSave` (drafts in `localStorage` or your API).',
                es: 'Un formulario usa `autoSave` (borradores en `localStorage` o en tu API).',
              },
            ],
            [
              {
                en: '[provideToast](/api/provideToast), [provideAlert](/api/provideAlert), [provideNotification](/api/provideNotification)',
                es: '[provideToast](/api/provideToast), [provideAlert](/api/provideAlert), [provideNotification](/api/provideNotification)',
              },
              {
                en: 'You want different app-wide defaults (position, limits, labels, translation).',
                es: 'Quieres otros valores globales (posición, límites, textos, traducción).',
              },
            ],
            [
              { en: '`provide*Labels()`', es: '`provide*Labels()`' },
              {
                en: 'You replace built-in text. See [Internationalization](/foundations/i18n).',
                es: 'Reemplazas textos integrados. Mira [Internacionalización](/foundations/i18n).',
              },
            ],
            [
              { en: '`provideLucideIcons(...)` (`@lucide/angular`)', es: '`provideLucideIcons(...)` (`@lucide/angular`)' },
              {
                en: "You pass icons by name (`icon: 'house'`) in menus, tabs or your own templates. The library registers the icons it uses internally.",
                es: "Pasas iconos por nombre (`icon: 'house'`) en menús, tabs o tus propias plantillas. La librería registra los iconos que usa internamente.",
              },
            ],
            [
              { en: '[provideHkTheme](/api/provideHkTheme)', es: '[provideHkTheme](/api/provideHkTheme)' },
              {
                en: "Only on daisyUI 4: `provideHkTheme('daisyui-v4')`. v5 is the default.",
                es: "Solo con daisyUI 4: `provideHkTheme('daisyui-v4')`. v5 es el valor por defecto.",
              },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'src/app/app.config.ts (a typical app)',
          code: `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFormState, providePipes, provideToast } from '@hakistack/ng-daisyui';
import { LucideHouse, LucideSettings, provideLucideIcons } from '@lucide/angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePipes(),
    provideToast({ position: 'top-end', maxToasts: 3 }),
    provideFormState({ mode: 'localStorage' }),
    provideLucideIcons(LucideHouse, LucideSettings),
  ],
};`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: '`NotificationService` is the one feedback service that needs markup: place `<hk-notification-host />` once in your root template. Toasts and alerts create their own containers.',
            es: '`NotificationService` es el único servicio de avisos que necesita marcado: pon `<hk-notification-host />` una vez en tu plantilla raíz. Los toasts y las alertas crean sus propios contenedores.',
          },
        },
      ],
    },
    {
      id: 'verify',
      heading: { en: '6. Check that it works', es: '6. Comprueba que funciona' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Drop this component into a page and run `ng serve`. You should see a styled input, a styled dropdown and a toast when you click Save.',
            es: 'Pon este componente en una página y corre `ng serve`. Deberías ver un campo con estilos, un desplegable con estilos y un toast al hacer clic en Guardar.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'install-check.component.ts',
          code: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InputComponent, SelectComponent, ToastService } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-install-check',
  imports: [InputComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div class="flex flex-col gap-3 p-4 max-w-sm">
      <hk-input placeholder="Name" ariaLabel="Name" color="primary" />
      <hk-select [options]="options" />
      <button type="button" class="btn btn-primary" (click)="toast.success('Saved')">Save</button>
    </div>
  \`,
})
export class InstallCheckComponent {
  readonly toast = inject(ToastService);
  readonly options = [
    { label: 'One', value: '1' },
    { label: 'Two', value: '2' },
  ];
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Everything styled: you are done. Continue with [Key patterns](/key-patterns).',
              es: 'Todo con estilos: terminaste. Sigue con [Patrones clave](/key-patterns).',
            },
            {
              en: 'Button styled but the input or dropdown plain: Tailwind is running but the library import is missing or comes before the daisyUI plugin.',
              es: 'El botón tiene estilos pero el campo o el desplegable no: Tailwind corre, pero falta el import de la librería o está antes del plugin de daisyUI.',
            },
            {
              en: 'Nothing styled, not even the button: Tailwind is not running. Check `.postcssrc.json` and that `styles.css` is listed in the build `styles` of `angular.json`.',
              es: 'Nada tiene estilos, ni siquiera el botón: Tailwind no está corriendo. Revisa `.postcssrc.json` y que `styles.css` esté en los `styles` del build en `angular.json`.',
            },
          ],
        },
      ],
    },
    {
      id: 'common-problems',
      heading: { en: 'Common install problems', es: 'Problemas comunes de instalación' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Symptom', es: 'Síntoma' },
            { en: 'Likely cause', es: 'Causa probable' },
          ],
          rows: [
            [
              { en: 'npm `ERESOLVE` or peer warnings', es: '`ERESOLVE` de npm o advertencias de peer' },
              {
                en: 'Angular is not on 21, or Tailwind/daisyUI are on v3/v4. Upgrade them, or use the legacy path knowing the warning stays.',
                es: 'Angular no está en 21, o Tailwind/daisyUI están en v3/v4. Actualízalos, o usa el camino legacy sabiendo que la advertencia se queda.',
              },
            ],
            [
              { en: 'Tabs or menus look slightly wrong, the rest is fine', es: 'Los tabs o menús se ven un poco mal y lo demás bien' },
              {
                en: 'The daisyUI major version and `provideHkTheme` do not match.',
                es: 'La versión mayor de daisyUI y `provideHkTheme` no coinciden.',
              },
            ],
            [
              {
                en: '`NullInjectorError: No provider for DatePipe` (or another pipe)',
                es: '`NullInjectorError: No provider for DatePipe` (u otro pipe)',
              },
              { en: 'A table formatter needs `providePipes()`.', es: 'Un formateador de tabla necesita `providePipes()`.' },
            ],
            [
              { en: 'Blank icons or “Unable to resolve icon”', es: 'Iconos en blanco o “Unable to resolve icon”' },
              {
                en: 'An icon passed by name is not registered with `provideLucideIcons(...)`.',
                es: 'Un icono pasado por nombre no está registrado con `provideLucideIcons(...)`.',
              },
            ],
            [
              { en: 'The editor shows an error instead of loading', es: 'El editor muestra un error en lugar de cargar' },
              {
                en: 'The optional `@tiptap/*` peers are not installed. The console prints the exact install command.',
                es: 'No están instaladas las dependencias peer opcionales `@tiptap/*`. La consola muestra el comando exacto para instalarlas.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'More symptoms and fixes in [Troubleshooting](/guides/troubleshooting).',
            es: 'Más síntomas y soluciones en [Solución de problemas](/guides/troubleshooting).',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'key-patterns', note: { en: 'What to learn right after installing.', es: 'Qué aprender justo después de instalar.' } },
    { id: 'theming', note: { en: 'Themes, dark mode and the v4/v5 bridge.', es: 'Temas, modo oscuro y el puente v4/v5.' } },
    { id: 'guide-bundle-size', note: { en: 'Keep the initial bundle small.', es: 'Mantén pequeño el bundle inicial.' } },
    { id: 'guide-troubleshooting', note: { en: 'Fixes for common problems.', es: 'Soluciones para problemas comunes.' } },
  ],
};

export default content;
