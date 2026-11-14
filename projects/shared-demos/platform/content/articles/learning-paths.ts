import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: always know what to read next. Below are three reading lists in order. Each step says why it matters and links to the page. Skip what you already know, and switch paths whenever your work needs it.',
      es: 'Objetivo: saber siempre qué leer después. Abajo hay tres listas de lectura en orden. Cada paso dice por qué importa y enlaza a la página. Sáltate lo que ya sabes y cambia de ruta cuando tu trabajo lo pida.',
    },
  ],
  sections: [
    {
      id: 'choose',
      heading: { en: 'Which path is yours', es: 'Cuál ruta es la tuya' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Path', es: 'Ruta' },
            { en: 'Start here if…', es: 'Empieza aquí si…' },
          ],
          rows: [
            [
              { en: '**Beginner**', es: '**Principiante**' },
              {
                en: 'You have not installed the library yet, or you have only used one or two components.',
                es: 'Todavía no has instalado la librería, o solo has usado uno o dos componentes.',
              },
            ],
            [
              { en: '**Intermediate**', es: '**Intermedio**' },
              {
                en: 'You ship screens with forms and tables and now need consistent visuals, translations, validation and app layout.',
                es: 'Ya publicas pantallas con formularios y tablas y ahora necesitas visuales consistentes, traducciones, validación y la estructura de la app.',
              },
            ],
            [
              { en: '**Advanced**', es: '**Avanzado**' },
              {
                en: 'You handle large or server-side data, documents, bundle budgets, or you want to extend or contribute to the library.',
                es: 'Manejas datos grandes o del servidor, documentos, límites de tamaño del bundle, o quieres extender la librería o contribuir a ella.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'beginner',
      heading: { en: 'Beginner', es: 'Principiante' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: '[Introduction](/getting-started): what the library gives you and what it does not, before you commit to it.',
              es: '[Introducción](/getting-started): qué te da la librería y qué no, antes de decidirte.',
            },
            {
              en: '[Installation](/installation): get the package, Tailwind CSS and daisyUI working, and confirm components render with styles.',
              es: '[Instalación](/installation): pon a funcionar el paquete, Tailwind CSS y daisyUI, y confirma que los componentes salen con estilos.',
            },
            {
              en: '[Key patterns](/key-patterns): builders, controllers, signals and providers; once you know them, every component page reads the same way.',
              es: '[Patrones clave](/key-patterns): builders, controladores, signals y proveedores; cuando los conoces, todas las páginas de componentes se leen igual.',
            },
            {
              en: '[Design principles](/foundations/design-principles): why components use daisyUI tokens and configuration objects, so their behavior does not surprise you.',
              es: '[Principios de diseño](/foundations/design-principles): por qué los componentes usan tokens de daisyUI y objetos de configuración, para que su comportamiento no te sorprenda.',
            },
            {
              en: '[Theming](/foundations/theming): pick or create a theme so the components match your brand from day one.',
              es: '[Temas](/foundations/theming): escoge o crea un tema para que los componentes combinen con tu marca desde el primer día.',
            },
            {
              en: '[Dynamic Form](/forms): the component you will use most; read the overview and try the examples.',
              es: '[Formulario dinámico](/forms): el componente que más vas a usar; lee el resumen y prueba los ejemplos.',
            },
            {
              en: '[Build a complete form](/guides/build-a-form): a step-by-step sign-up form with validation, conditional fields and your own buttons.',
              es: '[Construye un formulario completo](/guides/build-a-form): un formulario de registro paso a paso con validación, campos condicionales y tus propios botones.',
            },
            {
              en: '[Create a searchable table](/guides/searchable-table): show a list of records with search, sorting and pagination.',
              es: '[Crea una tabla con búsqueda](/guides/searchable-table): muestra una lista de registros con búsqueda, ordenamiento y paginación.',
            },
            {
              en: '[Configure notifications](/guides/notifications): choose between toast, notification, alert and dialog so users get the right feedback.',
              es: '[Configura notificaciones](/guides/notifications): escoge entre toast, notification, alert y dialog para que el usuario reciba el aviso correcto.',
            },
            {
              en: '[Troubleshooting](/guides/troubleshooting): bookmark it; most first-week problems (unstyled components, NG0203, blank icons) are here.',
              es: '[Solución de problemas](/guides/troubleshooting): guárdala; la mayoría de los problemas de la primera semana (componentes sin estilos, NG0203, iconos en blanco) están aquí.',
            },
          ],
        },
      ],
    },
    {
      id: 'intermediate',
      heading: { en: 'Intermediate', es: 'Intermedio' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: '[Colors](/foundations/colors): use semantic colors so screens stay readable in every theme, light and dark.',
              es: '[Colores](/foundations/colors): usa colores semánticos para que las pantallas sigan legibles en todos los temas, claros y oscuros.',
            },
            {
              en: '[Typography](/foundations/typography): keep text sizes and weights consistent with the components.',
              es: '[Tipografía](/foundations/typography): mantén los tamaños y pesos de texto consistentes con los componentes.',
            },
            {
              en: '[Sizes & variants](/foundations/sizes-and-variants): the shared size scale and color variants, so controls line up across a form.',
              es: '[Tamaños y variantes](/foundations/sizes-and-variants): la escala de tamaños y las variantes de color compartidas, para que los controles se alineen en un formulario.',
            },
            {
              en: '[Responsive behavior](/foundations/responsive): how components adapt to small screens and touch.',
              es: '[Comportamiento responsive](/foundations/responsive): cómo se adaptan los componentes a pantallas pequeñas y táctiles.',
            },
            {
              en: '[Accessibility](/foundations/accessibility): what the components already handle and what you still owe your users.',
              es: '[Accesibilidad](/foundations/accessibility): qué manejan ya los componentes y qué todavía les debes a tus usuarios.',
            },
            {
              en: '[Internationalization](/foundations/i18n): replace every built-in string, at startup or at runtime.',
              es: '[Internacionalización](/foundations/i18n): reemplaza cada texto integrado, al iniciar o en tiempo de ejecución.',
            },
            {
              en: '[Builders and controllers](/systems/builders): what each `create*()` returns and the rules that avoid NG0203 and stale controllers.',
              es: '[Builders y controladores](/systems/builders): qué devuelve cada `create*()` y las reglas que evitan NG0203 y controladores viejos.',
            },
            {
              en: '[Custom validators](/guides/custom-validators): add your own rules per field, across fields and async.',
              es: '[Validadores personalizados](/guides/custom-validators): añade tus propias reglas por campo, entre campos y asíncronas.',
            },
            {
              en: '[Form wizard](/wizard) and [Form state and auto-save](/systems/form-state): split long forms into steps and keep half-filled data safe.',
              es: '[Asistente y stepper](/wizard) y [Estado de formularios y autoguardado](/systems/form-state): divide formularios largos en pasos y guarda los datos a medio llenar.',
            },
            {
              en: '[Dynamic forms from schemas](/guides/schema-forms): build forms from typed objects or data loaded at runtime.',
              es: '[Formularios dinámicos desde esquemas](/guides/schema-forms): construye formularios con objetos tipados o datos cargados en tiempo de ejecución.',
            },
            {
              en: '[Formatters and pipes](/systems/formatters): show dates, money and numbers the same way in every table.',
              es: '[Formateadores y pipes](/systems/formatters): muestra fechas, dinero y números de la misma forma en todas las tablas.',
            },
            {
              en: '[Navbar and app shell](/app-shell) and [Menu](/menu): the frame of your app, with a sidebar that folds on small screens.',
              es: '[Navbar y app shell](/app-shell) y [Menú](/menu): el marco de tu app, con una barra lateral que se pliega en pantallas pequeñas.',
            },
            {
              en: '[DataGrid](/datagrid) and [Customize DataGrid columns](/guides/datagrid-columns): move from the basic table to the grid when data grows or users need more control.',
              es: '[DataGrid](/datagrid) y [Personaliza las columnas del DataGrid](/guides/datagrid-columns): pasa de la tabla básica al grid cuando los datos crecen o el usuario necesita más control.',
            },
          ],
        },
      ],
    },
    {
      id: 'advanced',
      heading: { en: 'Advanced', es: 'Avanzado' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: '[Handle large datasets](/guides/large-datasets): pick the right component for 1k, 100k or millions of records.',
              es: '[Maneja grandes volúmenes de datos](/guides/large-datasets): escoge el componente correcto para 1k, 100k o millones de registros.',
            },
            {
              en: '[Server-side pagination](/guides/server-side-data): let your API sort, filter and page, and keep the grid in sync.',
              es: '[Paginación en el servidor](/guides/server-side-data): deja que tu API ordene, filtre y pagine, y mantén el grid sincronizado.',
            },
            {
              en: '[Rust/WASM engines](/systems/wasm-engines): which features run in WebAssembly, when each engine loads, and how to self-host the binaries.',
              es: '[Motores Rust/WASM](/systems/wasm-engines): qué funciones corren en WebAssembly, cuándo carga cada motor y cómo servir tú mismo los binarios.',
            },
            {
              en: '[Optimize bundle size](/guides/bundle-size): keep the initial bundle small and check the result.',
              es: '[Optimiza el tamaño del bundle](/guides/bundle-size): mantén pequeño el bundle inicial y verifica el resultado.',
            },
            {
              en: '[Integrate a document viewer](/guides/document-viewer-integration): preview user files of many formats and handle errors.',
              es: '[Integra un visor de documentos](/guides/document-viewer-integration): previsualiza archivos del usuario en muchos formatos y maneja los errores.',
            },
            {
              en: '[PDF Viewer](/pdf-viewer) and [Document Editor](/document-editor): annotate and sign PDFs, and edit plain text, Markdown and CSV.',
              es: '[Visor de PDF](/pdf-viewer) y [Editor de documentos](/document-editor): anota y firma PDFs, y edita texto plano, Markdown y CSV.',
            },
            {
              en: '[Extend components](/guides/extend-components): the supported extension points, so you customize without forking.',
              es: '[Extiende los componentes](/guides/extend-components): los puntos de extensión soportados, para personalizar sin copiar el código.',
            },
            {
              en: '[Library architecture](/architecture/library) and [Data pipeline](/architecture/data-pipeline): how the package is organized and how rows become what you see.',
              es: '[Arquitectura de la librería](/architecture/library) y [Pipeline de datos](/architecture/data-pipeline): cómo está organizado el paquete y cómo las filas se convierten en lo que ves.',
            },
            {
              en: '[Migration guide](/contributing/migration): breaking changes and upgrade steps between versions.',
              es: '[Guía de migración](/contributing/migration): cambios incompatibles y pasos para actualizar entre versiones.',
            },
            {
              en: '[Contributing](/contributing): set up the repository and add a component together with its docs.',
              es: '[Contribuir](/contributing): prepara el repositorio y añade un componente junto con su documentación.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'introduction', note: { en: 'Start from the beginning.', es: 'Empieza desde el principio.' } },
    { id: 'api', note: { en: 'Look up any exported symbol.', es: 'Busca cualquier símbolo exportado.' } },
  ],
};

export default content;
