import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: a small initial bundle, with heavy features downloaded only by users who reach them. Most of the expensive parts of the library are already split out; this guide shows what is automatic, what is up to you, and how to check the result.',
      es: 'Objetivo: un bundle inicial pequeño, donde las funcionalidades pesadas solo las descarguen quienes llegan a usarlas. La mayoría de las partes costosas de la librería ya vienen separadas; esta guía muestra qué es automático, qué depende de ti y cómo verificar el resultado.',
    },
  ],
  sections: [
    {
      id: 'automatic',
      heading: { en: 'Already lazy: nothing to do', es: 'Ya se carga de forma diferida: no tienes que hacer nada' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The WebAssembly modules are embedded as base64 in their own chunks and loaded with dynamic `import()` the first time a feature needs them. No asset copying, no HTTP setup.',
            es: 'Los módulos WebAssembly vienen incrustados en base64 en sus propios chunks y se cargan con `import()` dinámico la primera vez que una funcionalidad los necesita. No hay que copiar assets ni configurar HTTP.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Chunk', es: 'Chunk' },
            { en: 'Loaded when', es: 'Se carga cuando' },
          ],
          rows: [
            [
              { en: 'Shared engine (Rust)', es: 'Motor compartido (Rust)' },
              {
                en: 'A dynamic form builds its condition engine, a table receives client data, the command palette indexes its items, a searchable select with 200 or more options gets its first query, a tree uses its engine, or a PDF is searched. Loaded once, shared by all of them.',
                es: 'Un formulario dinámico arma su motor de condiciones, una tabla recibe datos del cliente, el command palette indexa sus ítems, un select con búsqueda de 200 opciones o más recibe su primera consulta, un árbol usa su motor o se busca en un PDF. Se carga una vez y todos lo comparten.',
              },
            ],
            [
              { en: 'Document engine', es: 'Motor de documentos' },
              { en: 'A spreadsheet is opened in the document viewer.', es: 'Se abre una hoja de cálculo en el visor de documentos.' },
            ],
            [
              { en: 'Image engine', es: 'Motor de imágenes' },
              { en: 'A TIFF is opened.', es: 'Se abre un TIFF.' },
            ],
            [
              { en: 'PDFium worker', es: 'Worker de PDFium' },
              {
                en: 'A PDF is first opened. This is the largest chunk (several MB before compression), started as a `blob:` worker.',
                es: 'Se abre un PDF por primera vez. Es el chunk más grande (varios MB sin comprimir) y se inicia como worker `blob:`.',
              },
            ],
            [
              { en: 'Phone formatting', es: 'Formato de teléfono' },
              {
                en: '`libphonenumber-js` (a regular dependency) loads when the first `hk-input` with `variant="phone"` renders. Until then the field keeps plain digits.',
                es: '`libphonenumber-js` (una dependencia normal) se carga cuando se renderiza el primer `hk-input` con `variant="phone"`. Mientras tanto, el campo muestra solo dígitos.',
              },
            ],
            [
              { en: 'Optional peers', es: 'Dependencias peer opcionales' },
              {
                en: 'Installed only by apps that need them. `docx-preview`, `dompurify`, `postal-mime`, `@kenjiuno/msgreader`, `foliate-js` and `heic2any` load when a file of their format opens; `@tiptap/*` when `hk-editor` first renders; `@anthropic-ai/sdk` when a DataGrid AI request runs.',
                es: 'Solo las instalan las apps que las necesitan. `docx-preview`, `dompurify`, `postal-mime`, `@kenjiuno/msgreader`, `foliate-js` y `heic2any` se cargan cuando se abre un archivo de su formato; `@tiptap/*`, cuando `hk-editor` se renderiza por primera vez; `@anthropic-ai/sdk`, cuando corre una petición de IA del DataGrid.',
              },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Features on the shared engine (table, tree, form conditions, fuzzy search) have a TypeScript fallback, so the UI works while that chunk downloads or if it fails to load. The document and image engines have none: if they fail, the viewer shows an error for that file.',
            es: 'Las funcionalidades del motor compartido (tabla, árbol, condiciones de formularios, búsqueda difusa) tienen una ruta de respaldo en TypeScript, así que la interfaz funciona mientras se descarga ese chunk o si falla al cargar. Los motores de documentos e imágenes no la tienen: si fallan, el visor muestra un error para ese archivo.',
          },
        },
      ],
    },
    {
      id: 'your-part',
      heading: { en: 'Your part', es: 'Tu parte' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: '**Import only what each component uses.** Every export is a standalone symbol and the package declares `sideEffects: false`, so unused components are dropped. Do not re-export the library through a shared “UI module”.',
              es: '**Importa solo lo que usa cada componente.** Cada export es un símbolo independiente y el paquete declara `sideEffects: false`, así que los componentes que no usas se descartan. No reexportes la librería a través de un “módulo de UI” compartido.',
            },
            {
              en: '**Lazy-load heavy routes.** The document viewer, PDF viewer and rich editor carry real code. Put them behind `loadComponent` routes or `@defer` blocks.',
              es: '**Usa carga diferida en las rutas pesadas.** El visor de documentos, el visor de PDF y el editor enriquecido traen bastante código. Ponlos detrás de rutas con `loadComponent` o de bloques `@defer`.',
            },
            {
              en: '**Register only the icons you use.** See below.',
              es: '**Registra solo los iconos que usas.** Más abajo te explicamos cómo.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.routes.ts',
          code: `import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'files/:id',
    loadComponent: () => import('./files/file-page.component').then((m) => m.FilePageComponent),
  },
];`,
        },
      ],
    },
    {
      id: 'icons',
      heading: { en: 'Icons', es: 'Iconos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Icons come from `@lucide/angular`. When you refer to an icon by name (for example `icon: \'house\'` in a menu item, or `lucideIcon="star"` in a template), that name must be registered with `provideLucideIcons`. Registering the whole Lucide set (about 1,700 icons) added roughly 1.2 MB to this docs site’s initial bundle, because a name map cannot be tree-shaken; register only the icons you reference by name.',
            es: 'Los iconos vienen de `@lucide/angular`. Cuando te refieres a un icono por nombre (por ejemplo `icon: \'house\'` en un ítem de menú, o `lucideIcon="star"` en una plantilla), ese nombre debe estar registrado con `provideLucideIcons`. Registrar todo el set de Lucide (unos 1,700 iconos) añadía cerca de 1.2 MB al bundle inicial de este sitio de documentación, porque un mapa de nombres no admite tree-shaking; registra solo los iconos que usas por nombre.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { LucideFileText, LucideHouse, LucideSettings, provideLucideIcons } from '@lucide/angular';

export const appConfig: ApplicationConfig = {
  providers: [provideLucideIcons(LucideHouse, LucideSettings, LucideFileText)],
};`,
        },
        {
          kind: 'p',
          text: {
            en: 'Where an API accepts icon data (menu items, table actions and tab panels accept `LucideHouse.icon`), passing it directly avoids the name lookup altogether.',
            es: 'Cuando una API acepta los datos del icono (los ítems de menú, las acciones de tabla y los paneles de pestañas aceptan `LucideHouse.icon`), pasarlos directamente evita por completo la búsqueda por nombre.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'A table bulk action of type `export` shows default options with the icon names `sheet`, `file-spreadsheet`, `file-text` and `braces`. Register those icons, or pass your own `dropdownOptions`, if you use it.',
            es: 'Una acción masiva de tabla de tipo `export` muestra opciones por defecto con los nombres de icono `sheet`, `file-spreadsheet`, `file-text` y `braces`. Si la usas, registra esos iconos o pasa tus propias `dropdownOptions`.',
          },
        },
      ],
    },
    {
      id: 'self-host-wasm',
      heading: { en: 'Serving WASM as separate files', es: 'Servir el WASM como archivos separados' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Base64 embedding is about a third larger than the raw binary and is cached with its JavaScript chunk. If you prefer the `.wasm` as its own long-cached asset, build it with `npm run engine:build` in the ng-daisyui repository (the package ships only the inlined copies, with no `wasm/` folder), serve it from your app and point the library at it with [provideTableEngineWasmUrl](/api/provideTableEngineWasmUrl), [provideDocumentEngineWasmUrl](/api/provideDocumentEngineWasmUrl) or [provideImageEngineWasmUrl](/api/provideImageEngineWasmUrl). The `.js` glue and its `_bg.wasm` must sit in the same folder. Details in [WASM engines](/systems/wasm-engines).',
            es: 'Incrustado en base64, el binario ocupa cerca de un tercio más y se cachea junto con su chunk de JavaScript. Si prefieres el `.wasm` como asset propio con caché de larga duración, genéralo con `npm run engine:build` en el repositorio de ng-daisyui (el paquete solo incluye las copias incrustadas, sin carpeta `wasm/`), sírvelo desde tu app y apunta la librería a él con [provideTableEngineWasmUrl](/api/provideTableEngineWasmUrl), [provideDocumentEngineWasmUrl](/api/provideDocumentEngineWasmUrl) o [provideImageEngineWasmUrl](/api/provideImageEngineWasmUrl). El glue `.js` y su `_bg.wasm` deben estar en la misma carpeta. Detalles en [Motores WASM](/systems/wasm-engines).',
          },
        },
      ],
    },
    {
      id: 'measure',
      heading: { en: 'Measure it', es: 'Mídelo' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'In your app, `ng build` prints the initial and lazy chunk sizes; set `budgets` in `angular.json` to fail the build when the initial bundle grows. In this repository, `npm run size` (size-limit) is a growth guard on the whole-library FESM file (700 kB gzip), which is not what consumers ship; `npm run test:consumer` installs the packed library into a clean app and fails if its initial JS goes over 240 kB gzip.',
            es: 'En tu app, `ng build` muestra los tamaños de los chunks iniciales y diferidos; define `budgets` en `angular.json` para que el build falle si crece el bundle inicial. En este repositorio, `npm run size` (size-limit) vigila el crecimiento del archivo FESM de toda la librería (700 kB gzip), que no es lo que reciben las apps; `npm run test:consumer` instala la librería empaquetada en una app limpia y falla si su JS inicial pasa de 240 kB gzip.',
          },
        },
        {
          kind: 'code',
          lang: 'bash',
          title: 'Library repository',
          code: `npm run build
npm run size
npm run test:consumer`,
        },
      ],
    },
  ],
  related: [
    { id: 'wasm-engines', note: { en: 'What each engine does.', es: 'Qué hace cada motor.' } },
    { id: 'icons', note: { en: 'Registering and using Lucide icons.', es: 'Registrar y usar iconos de Lucide.' } },
    {
      id: 'guide-document-viewer-integration',
      note: { en: 'Keeping the viewer off pages that do not need it.', es: 'Dejar el visor fuera de páginas que no lo necesitan.' },
    },
  ],
};

export default content;
