import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Hakistack is a family of open-source building blocks for Angular applications. Each product is its own npm package: you install only what you need, and each one has its own version and release notes.',
      es: 'Hakistack es una familia de piezas de código abierto para aplicaciones Angular. Cada producto es su propio paquete de npm: instalas solo lo que necesitas, y cada uno tiene su propia versión y sus propias notas de versión.',
    },
    {
      en: 'This site documents all of them. The sidebar groups the pages by package; this page explains what each package does and how they relate.',
      es: 'Este sitio los documenta todos. La barra lateral agrupa las páginas por paquete; esta página explica qué hace cada paquete y cómo se relacionan.',
    },
  ],
  sections: [
    {
      id: 'products',
      heading: { en: 'The products', es: 'Los productos' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Package', es: 'Paquete' },
            { en: 'What it is for', es: 'Para qué sirve' },
            { en: 'Start here', es: 'Empieza aquí' },
          ],
          rows: [
            [
              { en: '`@hakistack/ng-daisyui`', es: '`@hakistack/ng-daisyui`' },
              {
                en: 'Angular components on daisyUI 5 and Tailwind CSS 4: dynamic forms, data grid and table, pickers, menus, notifications, rich text editor, document and PDF viewers.',
                es: 'Componentes de Angular sobre daisyUI 5 y Tailwind CSS 4: formularios dinámicos, data grid y tabla, selectores, menús, avisos, editor de texto enriquecido, visores de documentos y de PDF.',
              },
              {
                en: '[Introduction](/getting-started) · [Installation](/installation)',
                es: '[Introducción](/getting-started) · [Instalación](/installation)',
              },
            ],
            [
              { en: '`@hakistack/i18n`', es: '`@hakistack/i18n`' },
              {
                en: 'Type-safe translations for Angular on top of Transloco. You write translations in `.ts` files; a CLI generates typed keys and the JSON files.',
                es: 'Traducciones con tipos para Angular sobre Transloco. Escribes las traducciones en archivos `.ts`; un CLI genera las claves con tipos y los archivos JSON.',
              },
              {
                en: '[Getting started](/i18n) · [API](/api/i18n)',
                es: '[Primeros pasos](/i18n) · [API](/api/i18n)',
              },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'bash',
          title: 'npm',
          code: `npm i @hakistack/ng-daisyui            # UI components (or: ng add @hakistack/ng-daisyui)
npm i @hakistack/i18n @jsverse/transloco  # translations`,
        },
      ],
    },
    {
      id: 'how-they-relate',
      heading: { en: 'How they relate', es: 'Cómo se relacionan' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The packages are **independent**. `@hakistack/i18n` works in any Angular app without the UI library, and `@hakistack/ng-daisyui` does not need `@hakistack/i18n`: it has its own label system for the text its components show (see [Internationalization](/foundations/i18n)).',
            es: 'Los paquetes son **independientes**. `@hakistack/i18n` funciona en cualquier app Angular sin la librería de UI, y `@hakistack/ng-daisyui` no necesita `@hakistack/i18n`: tiene su propio sistema de etiquetas para los textos que muestran sus componentes (ver [Internacionalización](/foundations/i18n)).',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'They work well together: an app can translate its own screens with `@hakistack/i18n` and feed the same language to the components’ labels.',
            es: 'Funcionan bien juntos: una app puede traducir sus propias pantallas con `@hakistack/i18n` y pasar el mismo idioma a las etiquetas de los componentes.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Some components run computations in WebAssembly engines written in Rust. Those engines are internal: they ship inside `@hakistack/ng-daisyui` and you never install them yourself ([Rust/WASM architecture](/architecture/wasm)).',
            es: 'Algunos componentes hacen cálculos en motores de WebAssembly escritos en Rust. Esos motores son internos: vienen dentro de `@hakistack/ng-daisyui` y nunca los instalas tú ([Arquitectura Rust/WASM](/architecture/wasm)).',
          },
        },
      ],
    },
    {
      id: 'versions',
      heading: { en: 'Versions and releases', es: 'Versiones y publicaciones' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Each package follows SemVer on its own. A new version of one never forces an update of the other.',
              es: 'Cada paquete sigue SemVer por su cuenta. Una versión nueva de uno nunca obliga a actualizar el otro.',
            },
            {
              en: 'Release tags name the package: `@hakistack/ng-daisyui@0.4.0`, `@hakistack/i18n@0.2.0`.',
              es: 'Los tags de versión llevan el nombre del paquete: `@hakistack/ng-daisyui@0.4.0`, `@hakistack/i18n@0.2.0`.',
            },
            {
              en: 'What changed in the UI library: [Changelog](/contributing/changelog). Breaking changes and upgrades: [Migration guide](/contributing/migration).',
              es: 'Qué cambió en la librería de UI: [Registro de cambios](/contributing/changelog). Cambios incompatibles y cómo actualizar: [Guía de migración](/contributing/migration).',
            },
          ],
        },
      ],
    },
    {
      id: 'repository',
      heading: { en: 'One repository', es: 'Un solo repositorio' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'All products live in one monorepo with shared tooling (Angular CLI, Cargo, one CI). Each package builds, tests and installs on its own, and the checks make sure a package only uses what it declares. To work on any of them, start with [Contributing](/contributing).',
            es: 'Todos los productos viven en un monorepo con herramientas compartidas (Angular CLI, Cargo, un solo CI). Cada paquete se construye, se prueba y se instala por su cuenta, y las verificaciones aseguran que un paquete solo usa lo que declara. Para trabajar en cualquiera de ellos, empieza por [Contribuir](/contributing).',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'introduction', note: { en: 'Start with the UI library', es: 'Empieza por la librería de UI' } },
    { id: 'i18n', note: { en: 'Labels of the UI components in your language', es: 'Las etiquetas de los componentes en tu idioma' } },
    {
      id: 'i18n-getting-started',
      note: { en: 'Translate your own screens with typed keys', es: 'Traduce tus propias pantallas con claves tipadas' },
    },
    { id: 'contributing', note: { en: 'Set up the repository', es: 'Prepara el repositorio' } },
  ],
};

export default content;
