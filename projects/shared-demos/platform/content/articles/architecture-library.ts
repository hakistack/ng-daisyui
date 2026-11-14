import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'This page explains how `@hakistack/ng-daisyui` is organized: where code lives, which way dependencies are allowed to point, what counts as public API, and how the published package is assembled. Read it before adding a component or moving code between folders.',
      es: 'Esta página explica cómo está organizado `@hakistack/ng-daisyui`: dónde vive el código, hacia dónde pueden apuntar las dependencias, qué cuenta como API pública y cómo se arma el paquete publicado. Léela antes de añadir un componente o mover código entre carpetas.',
    },
  ],
  sections: [
    {
      id: 'layout',
      heading: { en: 'Source layout', es: 'Estructura del código' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Everything lives under `projects/hakistack/ng-daisyui/src/lib/`:',
            es: 'Todo vive bajo `projects/hakistack/ng-daisyui/src/lib/`:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Folder', es: 'Carpeta' },
            { en: 'Contents', es: 'Contenido' },
          ],
          rows: [
            [
              { en: '`components/`', es: '`components/`' },
              {
                en: 'One folder per component family: `name.component.ts` with co-located `.types.ts`, `.helpers.ts` (builders such as `createTable`), `.labels.ts` and specs.',
                es: 'Una carpeta por familia de componentes: `name.component.ts` junto a sus `.types.ts`, `.helpers.ts` (builders como `createTable`), `.labels.ts` y specs.',
              },
            ],
            [
              { en: '`grid-core/`', es: '`grid-core/`' },
              {
                en: 'Render-agnostic data logic shared by hk-table and hk-datagrid: controllers, predicates, aggregates, helpers, types, and the WASM table-engine bridge.',
                es: 'Lógica de datos independiente del renderizado, compartida por hk-table y hk-datagrid: controladores, predicados, agregados, helpers, tipos y el puente al motor WASM de tablas.',
              },
            ],
            [
              { en: '`directives/`', es: '`directives/`' },
              { en: 'Motion directives, auto-focus and input mask.', es: 'Directivas de animación, autofoco y máscara de entrada.' },
            ],
            [
              { en: '`services/`', es: '`services/`' },
              {
                en: 'App-wide services: form state, pipe registry, dialog, and the lazy engine façades (fuzzy, form, PDF search, document, image).',
                es: 'Servicios globales: estado de formularios, registro de pipes, diálogo y las fachadas de los motores de carga diferida (búsqueda difusa, formularios, búsqueda en PDF, documentos, imágenes).',
              },
            ],
            [
              { en: '`theme/`', es: '`theme/`' },
              {
                en: '`HK_THEME` and `provideHkTheme`: the daisyUI v4/v5 class-name bridge.',
                es: '`HK_THEME` y `provideHkTheme`: el puente de nombres de clase daisyUI v4/v5.',
              },
            ],
            [
              { en: '`types/`, `api/`, `utils/`', es: '`types/`, `api/`, `utils/`' },
              {
                en: 'Shared types (pipes, currencies, tree nodes) and internal utilities such as the engine loaders and `claude-json.ts`.',
                es: 'Tipos compartidos (pipes, monedas, nodos de árbol) y utilidades internas como los cargadores de motores y `claude-json.ts`.',
              },
            ],
            [
              { en: '`wasm/`', es: '`wasm/`' },
              {
                en: 'Generated wasm-bindgen glue and base64-inlined binaries, produced by `npm run engine:build`. Never edited by hand.',
                es: 'Glue de wasm-bindgen y binarios en base64 generados por `npm run engine:build`. Nunca se edita a mano.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Next to the library: `projects/demo` (the docs and demo app, which imports the library source directly), `projects/demo-v4` (the same demos on Tailwind 3 / daisyUI 4), `projects/shared-demos` (demo pages and this documentation, shared by both apps), `projects/hakistack/i18n` (the companion i18n package) and `hakistack-engine/` (the Rust workspace).',
            es: 'Junto a la librería: `projects/demo` (la app de documentación y demos, que importa el código fuente directamente), `projects/demo-v4` (las mismas demos en Tailwind 3 / daisyUI 4), `projects/shared-demos` (páginas de demo y esta documentación, compartidas por ambas apps), `projects/hakistack/i18n` (el paquete complementario de i18n) y `hakistack-engine/` (el workspace de Rust).',
          },
        },
      ],
    },
    {
      id: 'dependency-rules',
      heading: { en: 'Dependency rules', es: 'Reglas de dependencias' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'components/', es: 'components/' },
              detail: { en: 'May import anything below.', es: 'Puede importar todo lo de abajo.' },
            },
            {
              label: { en: 'grid-core/', es: 'grid-core/' },
              detail: { en: 'Must not import from `components/`.', es: 'No puede importar de `components/`.' },
            },
            { label: { en: 'types/, utils/, wasm/', es: 'types/, utils/, wasm/' }, detail: { en: 'Leaf modules.', es: 'Módulos hoja.' } },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The grid-core rule is enforced in `eslint.config.mjs` with `no-restricted-imports` on `projects/hakistack/ng-daisyui/src/lib/grid-core/**`: any import matching `**/components/**` fails lint. When grid-core needs something a component owns, the component passes it in through the controller’s `Deps` interface.',
            es: 'La regla de grid-core se aplica en `eslint.config.mjs` con `no-restricted-imports` sobre `projects/hakistack/ng-daisyui/src/lib/grid-core/**`: cualquier import que coincida con `**/components/**` hace fallar el lint. Cuando grid-core necesita algo que pertenece a un componente, el componente se lo pasa a través de la interfaz `Deps` del controlador.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'ESLint also requires the `hk` or `app` prefix on selectors (kebab-case elements, camelCase attribute directives), errors on non-standalone components, and runs the Angular template accessibility rules on every `.html` file.',
            es: 'ESLint también exige el prefijo `hk` o `app` en los selectores (elementos en kebab-case, directivas de atributo en camelCase), marca como error los componentes que no son standalone y aplica las reglas de accesibilidad de plantillas de Angular a cada archivo `.html`.',
          },
        },
      ],
    },
    {
      id: 'public-api',
      heading: { en: 'What is public', es: 'Qué es público' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'The only TypeScript entry point is the package root, built from `src/public-api.ts`. Anything not exported there is internal, even if it is reachable in `dist/`.',
              es: 'El único punto de entrada de TypeScript es la raíz del paquete, generada desde `src/public-api.ts`. Lo que no se exporta ahí es interno, aunque se pueda acceder a ello en `dist/`.',
            },
            {
              en: 'The other subpath exports are stylesheets (`./styles`, `./styles-v4`, `./themes/*`) plus `./plugin` (kept for backward compatibility).',
              es: 'Las demás exportaciones por subruta son hojas de estilo (`./styles`, `./styles-v4`, `./themes/*`) más `./plugin` (se mantiene por compatibilidad).',
            },
            {
              en: 'The grid-core barrel is internal and is not re-exported wholesale. Engine types whose names clash with table types are exported with an `Engine` prefix (`EngineSortDirection`, `EngineFilterDef`, …).',
              es: 'El barrel de grid-core es interno y no se reexporta completo. Los tipos del motor cuyo nombre choca con tipos de la tabla se exportan con el prefijo `Engine` (`EngineSortDirection`, `EngineFilterDef`, …).',
            },
            {
              en: 'The API reference of these docs is generated from `public-api.ts` by `npm run extract-api-docs`.',
              es: 'La referencia de API de esta documentación se genera desde `public-api.ts` con `npm run extract-api-docs`.',
            },
          ],
        },
      ],
    },
    {
      id: 'build',
      heading: { en: 'How the package is built', es: 'Cómo se construye el paquete' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`npm run build` chains five steps; the output lands in `dist/hakistack/ng-daisyui`.',
            es: '`npm run build` encadena cinco pasos; el resultado queda en `dist/hakistack/ng-daisyui`.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'build-pdfium-worker', es: 'build-pdfium-worker' },
              detail: {
                en: 'esbuild bundles the PDFium worker with both `.wasm` binaries and writes it as a string into `pdfium_worker_inline.ts`, so ng-packagr can include it.',
                es: 'esbuild empaqueta el worker de PDFium con ambos binarios `.wasm` y lo escribe como string en `pdfium_worker_inline.ts`, para que ng-packagr lo incluya.',
              },
            },
            {
              label: { en: 'ng build (ng-packagr)', es: 'ng build (ng-packagr)' },
              detail: {
                en: 'Compiles `public-api.ts` to FESM with inlined component CSS, and copies `themes/`, `styles.css` and the plugin files. Dynamic imports become separate lazy chunks.',
                es: 'Compila `public-api.ts` a FESM con el CSS de los componentes incrustado y copia `themes/`, `styles.css` y los archivos del plugin. Los imports dinámicos se vuelven chunks diferidos.',
              },
            },
            {
              label: { en: 'build-lib-css', es: 'build-lib-css' },
              detail: {
                en: 'Runs Tailwind 3 + daisyUI 4 (from `projects/demo-v4/node_modules`) over the FESM to emit `styles-v4.css` for legacy consumers.',
                es: 'Corre Tailwind 3 + daisyUI 4 (desde `projects/demo-v4/node_modules`) sobre el FESM para generar `styles-v4.css` para las apps que siguen en esa versión.',
              },
            },
            {
              label: { en: 'fix-exports', es: 'fix-exports' },
              detail: {
                en: 'Rewrites the root export conditions (`types`, `browser`, `style`, `default`) so bundlers get code and Tailwind gets the stylesheet, and adds the `./styles` and `./styles-v4` entries.',
                es: 'Reescribe las condiciones del export raíz (`types`, `browser`, `style`, `default`) para que los bundlers reciban código y Tailwind la hoja de estilos, y añade las entradas `./styles` y `./styles-v4`.',
              },
            },
            {
              label: { en: 'build-schematics', es: 'build-schematics' },
              detail: {
                en: 'Compiles the schematics with `tsc` and copies their JSON.',
                es: 'Compila los schematics con `tsc` y copia su JSON.',
              },
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Rust/WASM is built separately with `npm run engine:build` (see [Rust/WASM architecture](/architecture/wasm)). Under `src/lib/wasm/`, only the shared engine’s `engine_wasm_glue.ts` and `engine_wasm_inline.ts` are committed; the other generated outputs there are git-ignored.',
            es: 'Rust/WASM se construye aparte con `npm run engine:build` (mira [Arquitectura Rust/WASM](/architecture/wasm)). Dentro de `src/lib/wasm/` solo se versionan `engine_wasm_glue.ts` y `engine_wasm_inline.ts` del motor compartido; las demás salidas generadas ahí las ignora git.',
          },
        },
      ],
    },
    {
      id: 'dependencies',
      heading: { en: 'Dependencies', es: 'Dependencias' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Kind', es: 'Tipo' },
            { en: 'Packages', es: 'Paquetes' },
          ],
          rows: [
            [
              { en: 'Peer (required)', es: 'Dependencias peer (obligatorias)' },
              {
                en: 'Angular ^21 (`core`, `common`, `forms`, `router`, `cdk`, `aria`), `rxjs` ^7.8, `tailwindcss` ^4, `daisyui` ^5',
                es: 'Angular ^21 (`core`, `common`, `forms`, `router`, `cdk`, `aria`), `rxjs` ^7.8, `tailwindcss` ^4, `daisyui` ^5',
              },
            ],
            [
              { en: 'Peer (optional)', es: 'Dependencias peer (opcionales)' },
              {
                en: 'Document-format peers (`docx-preview`, `dompurify`, `postal-mime`, `@kenjiuno/msgreader`, `foliate-js`, `heic2any`), `@tiptap/*` (`hk-editor`), `@anthropic-ai/sdk` (DataGrid AI), `ts-morph` (the table migration schematic)',
                es: 'Dependencias peer de formatos de documento (`docx-preview`, `dompurify`, `postal-mime`, `@kenjiuno/msgreader`, `foliate-js`, `heic2any`), `@tiptap/*` (`hk-editor`), `@anthropic-ai/sdk` (IA del DataGrid), `ts-morph` (el schematic de migración de tablas)',
              },
            ],
            [
              { en: 'Bundled dependencies', es: 'Dependencias incluidas' },
              {
                en: '`@lucide/angular`, `fuse.js`, `motion`, `libphonenumber-js` (loaded on demand by the phone input), `uuid`, `tslib`',
                es: '`@lucide/angular`, `fuse.js`, `motion`, `libphonenumber-js` (el input de teléfono lo carga bajo demanda), `uuid`, `tslib`',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Optional peers are only reached through dynamic `import()`, so an app that does not install them still builds; the feature that needs one reports the missing package at runtime. `hk-editor`, for example, logs the `npm i` command for the `@tiptap/*` packages and shows an error in place of the editor.',
            es: 'Las dependencias peer opcionales solo se alcanzan con `import()` dinámico, así que una app que no las instala compila igual; la funcionalidad que necesita una reporta el paquete que falta en tiempo de ejecución. `hk-editor`, por ejemplo, muestra en la consola el comando `npm i` para los paquetes `@tiptap/*` y un error en lugar del editor.',
          },
        },
      ],
    },
    {
      id: 'schematics',
      heading: { en: 'Schematics', es: 'Schematics' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '`ng add @hakistack/ng-daisyui` installs peers and wires the stylesheet. Options: `target` (`v5` or `v4-legacy`), `project`, `skipInstall`, `skipStyleImport`.',
              es: '`ng add @hakistack/ng-daisyui` instala las dependencias peer y conecta la hoja de estilos. Opciones: `target` (`v5` o `v4-legacy`), `project`, `skipInstall`, `skipStyleImport`.',
            },
            {
              en: '`migrate-table-columns` rewrites legacy `createTable` projection configs (`visible` plus parallel maps) to the declarative `columns` map.',
              es: '`migrate-table-columns` reescribe configuraciones antiguas de `createTable` por proyección (`visible` más mapas paralelos) al mapa declarativo `columns`.',
            },
          ],
        },
      ],
    },
    {
      id: 'conventions',
      heading: { en: 'Component conventions', es: 'Convenciones de componentes' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Standalone components (no `standalone: true`, it is the default), `ChangeDetectionStrategy.OnPush`, `input()` / `output()` / `computed()` / `signal()`.',
              es: 'Componentes standalone (sin `standalone: true`, que ya es el valor por defecto), `ChangeDetectionStrategy.OnPush`, `input()` / `output()` / `computed()` / `signal()`.',
            },
            {
              en: 'Host bindings in the `host` object, never `@HostBinding` / `@HostListener`. Native control flow and `[class]` / `[style]` bindings in templates.',
              es: 'Bindings del host en el objeto `host`, nunca `@HostBinding` / `@HostListener`. Control flow nativo y bindings `[class]` / `[style]` en las plantillas.',
            },
            {
              en: 'Complex components are configured through a builder that returns a controller (`createForm`, `createTable`, `createDataGrid`, …): the same object configures the component and drives it from outside.',
              es: 'Los componentes complejos se configuran con un builder que devuelve un controlador (`createForm`, `createTable`, `createDataGrid`, …): el mismo objeto configura el componente y lo controla desde fuera.',
            },
            {
              en: 'App-wide configuration uses `provide*()` functions over injection tokens; there are no NgModules or `forRoot()`.',
              es: 'La configuración global usa funciones `provide*()` sobre tokens de inyección; no hay NgModules ni `forRoot()`.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'architecture-data-pipeline', note: { en: 'Inside grid-core.', es: 'Por dentro de grid-core.' } },
    { id: 'architecture-wasm', note: { en: 'The Rust workspace and WASM loading.', es: 'El workspace de Rust y la carga de WASM.' } },
    { id: 'contributing', note: { en: 'Adding a component end to end.', es: 'Añadir un componente de principio a fin.' } },
  ],
};

export default content;
