import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'This page gets you from a fresh clone to a merged change: running the demo, the standards code is reviewed against, the test suites, and the checklist for adding a component together with its documentation. A component is not done until its docs page, API reference and demo exist.',
      es: 'Esta página te lleva de un clon nuevo a un cambio integrado: correr la demo, los estándares con los que se revisa el código, las suites de pruebas y la lista para añadir un componente junto con su documentación. Un componente no está terminado hasta que existen su página de documentación, su referencia de API y su demo.',
    },
  ],
  sections: [
    {
      id: 'setup',
      heading: { en: 'Development setup', es: 'Preparar el entorno' },
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `npm install
npm start            # demo + docs at http://localhost:58790 (imports the library source directly)

# Optional: the same demos on Tailwind 3 / daisyUI 4
npm run install:v4
npm run demo:v4      # http://localhost:58791`,
        },
        {
          kind: 'p',
          text: {
            en: 'You only need a Rust toolchain to change the WASM engines (`npm run engine:build`); their generated output is consumed by the TypeScript build. Repository layout and dependency rules are described in [Library architecture](/architecture/library).',
            es: 'Solo necesitas un toolchain de Rust para cambiar los motores WASM (`npm run engine:build`); el build de TypeScript consume lo que generan. La estructura del repositorio y las reglas de dependencias están en [Arquitectura de la librería](/architecture/library).',
          },
        },
      ],
    },
    {
      id: 'standards',
      heading: { en: 'Coding standards', es: 'Estándares de código' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The full list lives in `CLAUDE.md` at the repository root. The points reviews check most often:',
            es: 'La lista completa está en `CLAUDE.md` en la raíz del repositorio. Los puntos que más se revisan:',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Strict TypeScript; no `any` (use `unknown`).',
              es: 'TypeScript estricto; nada de `any` (usa `unknown`).',
            },
            {
              en: 'Standalone components without `standalone: true`, `ChangeDetectionStrategy.OnPush`, `input()` / `output()`, signals and `computed()` for derived state; `update` or `set`, never `mutate`.',
              es: 'Componentes standalone sin `standalone: true`, `ChangeDetectionStrategy.OnPush`, `input()` / `output()`, signals y `computed()` para estado derivado; `update` o `set`, nunca `mutate`.',
            },
            {
              en: 'Host bindings in the `host` object; native control flow; `[class]` and `[style]` bindings instead of `ngClass` / `ngStyle`; no arrow functions in templates; `inject()` instead of constructor injection.',
              es: 'Bindings del host en el objeto `host`; control flow nativo; bindings `[class]` y `[style]` en lugar de `ngClass` / `ngStyle`; sin funciones flecha en plantillas; `inject()` en lugar de inyección por constructor.',
            },
            {
              en: 'Accessibility is a requirement: pass axe checks and WCAG AA (focus management, contrast, ARIA).',
              es: 'La accesibilidad es un requisito: pasar las verificaciones de axe y WCAG AA (manejo del foco, contraste, ARIA).',
            },
            {
              en: 'Prettier: 2 spaces, single quotes, 140 columns. A Husky pre-commit hook runs Prettier on staged `.ts` and `.html` files; run `npm run lint` before pushing.',
              es: 'Prettier: 2 espacios, comillas simples, 140 columnas. Un hook pre-commit de Husky corre Prettier sobre los archivos `.ts` y `.html` en stage; corre `npm run lint` antes de hacer push.',
            },
          ],
        },
      ],
    },
    {
      id: 'tests',
      heading: { en: 'Tests', es: 'Pruebas' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Command', es: 'Comando' },
            { en: 'Runs', es: 'Ejecuta' },
          ],
          rows: [
            [
              { en: '`npm test`', es: '`npm test`' },
              {
                en: 'Unit tests with Vitest through `ng test` (`*.spec.ts` next to the code).',
                es: 'Pruebas unitarias con Vitest vía `ng test` (`*.spec.ts` junto al código).',
              },
            ],
            [
              { en: '`npm run test:coverage`', es: '`npm run test:coverage`' },
              { en: 'The same, with coverage.', es: 'Lo mismo, con cobertura.' },
            ],
            [
              { en: '`npm run test:schematics`', es: '`npm run test:schematics`' },
              { en: 'Schematic tests (separate Vitest config).', es: 'Pruebas de los schematics (configuración de Vitest aparte).' },
            ],
            [
              { en: '`npm run e2e`', es: '`npm run e2e`' },
              {
                en: 'Playwright tests in `e2e/`; starts the demo server on port 58790 if it is not running.',
                es: 'Pruebas de Playwright en `e2e/`; inicia el servidor de la demo en el puerto 58790 si no está corriendo.',
              },
            ],
            [
              { en: '`npm run engine:test`', es: '`npm run engine:test`' },
              {
                en: '`cargo test` across the Rust workspace (`engine:check` for a quick compile check).',
                es: '`cargo test` en todo el workspace de Rust (`engine:check` para una verificación rápida de compilación).',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'new-component',
      heading: { en: 'Adding a component: checklist', es: 'Añadir un componente: lista de verificación' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: 'Create `src/lib/components/<name>/` with `<name>.component.ts`, co-located `.types.ts` / `.helpers.ts`, and specs. Grid logic that both tables could use goes in `grid-core/` instead.',
              es: 'Crea `src/lib/components/<name>/` con `<name>.component.ts`, `.types.ts` / `.helpers.ts` al lado y sus specs. La lógica de grillas que puedan usar ambas tablas va en `grid-core/`.',
            },
            {
              en: 'Give user-visible strings a labels interface with English defaults (a `provideHk*Labels()` provider or a `labels` input).',
              es: 'Dale a los textos visibles una interfaz de labels con valores por defecto en inglés (un proveedor `provideHk*Labels()` o un input `labels`).',
            },
            {
              en: 'Export the public symbols from `src/public-api.ts`.',
              es: 'Exporta los símbolos públicos desde `src/public-api.ts`.',
            },
            {
              en: 'Run `npm run extract-api-docs` to regenerate the API manifest (`--check` fails if it is stale).',
              es: 'Corre `npm run extract-api-docs` para regenerar el manifiesto de API (`--check` falla si está desactualizado).',
            },
            {
              en: 'Add the page to `projects/shared-demos/platform/catalog/pages.ts`, with `areas` matching the component folder name and `hasContent: true`.',
              es: 'Añade la página a `projects/shared-demos/platform/catalog/pages.ts`, con `areas` igual al nombre de la carpeta del componente y `hasContent: true`.',
            },
            {
              en: 'Write the content file in `projects/shared-demos/platform/content/components/<id>.ts` (English and Spanish) and register it in `content/index.ts`.',
              es: 'Escribe el archivo de contenido en `projects/shared-demos/platform/content/components/<id>.ts` (inglés y español) y regístralo en `content/index.ts`.',
            },
            {
              en: 'Add the demo page in `projects/shared-demos/demos/` and its route in `projects/demo/src/app/app.routes.ts`. Shared demos also render under daisyUI v4, so keep both class spellings where they differ.',
              es: 'Añade la página de demo en `projects/shared-demos/demos/` y su ruta en `projects/demo/src/app/app.routes.ts`. Las demos compartidas también se dibujan con daisyUI v4, así que conserva ambas formas de las clases donde difieren.',
            },
            {
              en: 'Run `npm run docs:check`, the documentation coverage check: every public symbol must belong to a page and every page must have its content.',
              es: 'Corre `npm run docs:check`, la verificación de cobertura de la documentación: cada símbolo público debe pertenecer a una página y cada página debe tener su contenido.',
            },
          ],
        },
      ],
    },
    {
      id: 'build-release',
      heading: { en: 'Build, publish and release', es: 'Build, publicación y release' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Command', es: 'Comando' },
            { en: 'What it does', es: 'Qué hace' },
          ],
          rows: [
            [
              { en: '`npm run build`', es: '`npm run build`' },
              {
                en: 'Production build into `dist/hakistack/ng-daisyui` (worker, ng-packagr, v4 CSS, exports, schematics).',
                es: 'Build de producción en `dist/hakistack/ng-daisyui` (worker, ng-packagr, CSS v4, exports, schematics).',
              },
            ],
            [
              { en: '`npm run build:watch`', es: '`npm run build:watch`' },
              { en: 'Rebuild the library on change.', es: 'Reconstruye la librería al cambiar algo.' },
            ],
            [
              { en: '`npm run size`', es: '`npm run size`' },
              { en: 'size-limit on the built main FESM file.', es: 'size-limit sobre el archivo FESM principal ya construido.' },
            ],
            [
              { en: '`npm run publish:local`', es: '`npm run publish:local`' },
              {
                en: '`npm link` from `dist` to try the build in another app.',
                es: '`npm link` desde `dist` para probar el build en otra app.',
              },
            ],
            [
              { en: '`npm run release:patch` / `:minor` / `:major`', es: '`npm run release:patch` / `:minor` / `:major`' },
              {
                en: 'Bumps the library version, commits and tags from the repository root, then builds. Refuses to run with unrelated uncommitted changes.',
                es: 'Sube la versión de la librería, hace commit y tag desde la raíz del repositorio y luego construye. No corre si hay otros cambios sin commit.',
              },
            ],
            [
              { en: '`npm run publish:npm`', es: '`npm run publish:npm`' },
              {
                en: 'Publishes `dist/hakistack/ng-daisyui` to npm as a public package.',
                es: 'Publica `dist/hakistack/ng-daisyui` en npm como paquete público.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The companion `@hakistack/i18n` package has its own `npm run build:i18n` and `npm run publish:i18n:npm`.',
            es: 'El paquete complementario `@hakistack/i18n` tiene sus propios `npm run build:i18n` y `npm run publish:i18n:npm`.',
          },
        },
      ],
    },
    {
      id: 'breaking-changes',
      heading: { en: 'Breaking changes and migrations', es: 'Cambios incompatibles y migraciones' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When a public API changes shape, document the before and after in `MIGRATION.md` at the repository root (it already covers the dynamic form API changes). If the rewrite is mechanical, consider a schematic, as `migrate-table-columns` does for legacy `createTable` configs.',
            es: 'Cuando una API pública cambia de forma, documenta el antes y el después en `MIGRATION.md` en la raíz del repositorio (ya cubre los cambios de la API de formularios dinámicos). Si la reescritura es mecánica, considera un schematic, como hace `migrate-table-columns` con las configuraciones antiguas de `createTable`.',
          },
        },
      ],
    },
  ],
  related: [
    {
      id: 'architecture-library',
      note: { en: 'Folders, dependency rules and the build.', es: 'Carpetas, reglas de dependencias y el build.' },
    },
    {
      id: 'architecture-data-pipeline',
      note: { en: 'Read before touching tables or grids.', es: 'Léelo antes de tocar tablas o grillas.' },
    },
    { id: 'accessibility', note: { en: 'What every component must provide.', es: 'Lo que todo componente debe ofrecer.' } },
  ],
};

export default content;
