import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: '`@hakistack/ng-daisyui` is a set of ready-made Angular components for business apps: forms, data tables, pickers, menus, notifications and document viewers. They look like the rest of your app because they are styled with daisyUI v5 on Tailwind CSS v4, and they behave like modern Angular code: standalone components, signals and `OnPush`.',
      es: '`@hakistack/ng-daisyui` es un conjunto de componentes de Angular listos para usar en aplicaciones de negocio: formularios, tablas de datos, selectores, menús, avisos y visores de documentos. Se ven como el resto de tu app porque usan los estilos de daisyUI v5 sobre Tailwind CSS v4, y se comportan como código Angular moderno: componentes standalone, signals y `OnPush`.',
    },
    {
      en: 'You install one package, import the components you need, and describe the complex ones (a form, a table, a grid) in TypeScript. This page explains what you get, when the library is a good fit, and where to go next.',
      es: 'Instalas un paquete, importas los componentes que necesitas y describes los complejos (un formulario, una tabla, un grid) en TypeScript. Esta página explica qué obtienes, cuándo la librería te conviene y a dónde ir después.',
    },
  ],
  sections: [
    {
      id: 'what-you-get',
      heading: { en: 'What you get', es: 'Qué obtienes' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Family', es: 'Familia' },
            { en: 'Components', es: 'Componentes' },
          ],
          rows: [
            [
              { en: '**Forms and inputs**', es: '**Formularios y campos**' },
              {
                en: '[Dynamic forms](/forms), [wizards](/wizard), [input](/input), [select](/select), [datepicker](/datepicker), [timepicker](/timepicker), [rich text editor](/editor)',
                es: '[Formularios dinámicos](/forms), [wizards](/wizard), [input](/input), [select](/select), [datepicker](/datepicker), [timepicker](/timepicker), [editor de texto enriquecido](/editor)',
              },
            ],
            [
              { en: '**Data**', es: '**Datos**' },
              {
                en: '[Table](/table), [DataGrid](/datagrid), [tree table](/tree-table), [tree](/tree), [virtual scroller](/virtual-scroller)',
                es: '[Tabla](/table), [DataGrid](/datagrid), [tabla de árbol](/tree-table), [árbol](/tree), [virtual scroller](/virtual-scroller)',
              },
            ],
            [
              { en: '**Navigation**', es: '**Navegación**' },
              {
                en: '[Menu](/menu), [app shell](/app-shell), [breadcrumbs](/breadcrumbs), [tabs](/tabs), [command palette](/command-palette)',
                es: '[Menú](/menu), [app shell](/app-shell), [breadcrumbs](/breadcrumbs), [tabs](/tabs), [command palette](/command-palette)',
              },
            ],
            [
              { en: '**Feedback**', es: '**Avisos**' },
              {
                en: '[Toast](/toast), [notification](/notification), [alert](/alert), [dialog](/dialog)',
                es: '[Toast](/toast), [notification](/notification), [alert](/alert), [dialog](/dialog)',
              },
            ],
            [
              { en: '**Documents**', es: '**Documentos**' },
              {
                en: '[PDF viewer](/pdf-viewer), [document viewer](/document-viewer), [document editor](/document-editor)',
                es: '[Visor PDF](/pdf-viewer), [visor de documentos](/document-viewer), [editor de documentos](/document-editor)',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Around the components there are shared systems you can also use on their own: [builders and controllers](/systems/builders), [form state and auto-save](/systems/form-state), [formatters](/systems/formatters), [utility directives](/systems/directives) for animation and input masks, and [Rust/WASM engines](/systems/wasm-engines).',
            es: 'Alrededor de los componentes hay sistemas compartidos que también puedes usar por separado: [builders y controladores](/systems/builders), [estado de formularios y autoguardado](/systems/form-state), [formateadores](/systems/formatters), [directivas utilitarias](/systems/directives) para animaciones y máscaras de entrada, y [motores Rust/WASM](/systems/wasm-engines).',
          },
        },
      ],
    },
    {
      id: 'ideas',
      heading: { en: 'The ideas that run through it', es: 'Las ideas que lo recorren' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Configuration in TypeScript.** Complex components are set up with a `create*()` function such as [createForm](/api/createForm) or [createTable](/api/createTable). Most return a **controller**: a `config` you bind in the template plus methods you call from your class (`submit()`, `reset()`, `expand()`…). No `@ViewChild` needed.',
              es: '**Configuración en TypeScript.** Los componentes complejos se preparan con una función `create*()` como [createForm](/api/createForm) o [createTable](/api/createTable). La mayoría devuelve un **controlador**: un `config` que enlazas en la plantilla y métodos que llamas desde tu clase (`submit()`, `reset()`, `expand()`…). Sin `@ViewChild`.',
            },
            {
              en: '**Signals and OnPush.** Inputs are signal inputs, state is exposed as signals, and every component uses `OnPush` change detection. Your own components can use `OnPush` too.',
              es: '**Signals y OnPush.** Los inputs son signal inputs, el estado se expone como signals y todos los componentes usan detección de cambios `OnPush`. Tus propios componentes también pueden usar `OnPush`.',
            },
            {
              en: '**daisyUI theming.** Components use daisyUI semantic colors (`primary`, `base-100`, `error`…), so any daisyUI theme, including your own, restyles them. You switch themes with `data-theme`. See [Theming](/foundations/theming).',
              es: '**Temas de daisyUI.** Los componentes usan los colores semánticos de daisyUI (`primary`, `base-100`, `error`…), así que cualquier tema de daisyUI, incluido uno tuyo, les cambia el estilo. Cambias de tema con `data-theme`. Mira [Temas](/foundations/theming).',
            },
            {
              en: '**Built-in WASM engines, loaded on demand.** Heavy work (large tables, search, PDFs, some file formats) runs in Rust compiled to WebAssembly. Each engine ships inside the package and is downloaded only when a feature first needs it; most of them fall back to JavaScript if they cannot load. You configure nothing.',
              es: '**Motores WASM incluidos y cargados cuando hacen falta.** El trabajo pesado (tablas grandes, búsqueda, PDFs, algunos formatos de archivo) corre en Rust compilado a WebAssembly. Cada motor viene dentro del paquete y solo se descarga cuando una función lo necesita por primera vez; la mayoría vuelve a JavaScript si no puede cargar. No tienes que configurar nada.',
            },
            {
              en: '**Your language.** Every built-in string (buttons, placeholders, `aria-label`s) has an English default you can replace, usually with a `provide*Labels()` function in your app config. See [Internationalization](/foundations/i18n).',
              es: '**Tu idioma.** Cada texto integrado (botones, placeholders, `aria-label`s) tiene un valor por defecto en inglés que puedes reemplazar, casi siempre con una función `provide*Labels()` en la configuración de tu app. Mira [Internacionalización](/foundations/i18n).',
            },
            {
              en: '**Accessibility as a requirement.** Components handle keyboard navigation, focus and ARIA roles, and target WCAG AA. See [Accessibility](/foundations/accessibility) for what is covered and what is still on you.',
              es: '**La accesibilidad como requisito.** Los componentes manejan la navegación con teclado, el foco y los roles ARIA, y apuntan a WCAG AA. Mira [Accesibilidad](/foundations/accessibility) para saber qué está cubierto y qué te toca a ti.',
            },
          ],
        },
      ],
    },
    {
      id: 'first-component',
      heading: { en: 'A first component', es: 'Un primer componente' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Goal: a contact form with validation and your own Send button, and a confirmation message when it is sent. You list the fields once; the form draws them, validates them and hands you the values.',
            es: 'Objetivo: un formulario de contacto con validación y tu propio botón de Enviar, y un mensaje de confirmación al enviarlo. Listas los campos una vez; el formulario los dibuja, los valida y te entrega los valores.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'contact-form.component.ts',
          code: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { createForm, DynamicFormComponent, field, ToastService } from '@hakistack/ng-daisyui';

interface Contact {
  name: string;
  email: string;
  topic: string;
}

@Component({
  selector: 'app-contact-form',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <button type="button" class="btn btn-primary mt-4" (click)="form.submit()">Send</button>
  \`,
})
export class ContactFormComponent {
  private readonly toast = inject(ToastService);

  readonly form = createForm<Contact>({
    fields: [
      field.text('name', 'Name', { required: true, minLength: 2 }),
      field.email('email', 'Email', { required: true }),
      field.select('topic', 'Topic', { choices: ['Sales', 'Support', 'Other'] }),
    ],
    onSubmit: ({ valid, values }) => {
      if (valid) {
        this.toast.success('Message sent', \`Thanks, \${values.name}.\`);
      }
    },
  });
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The form has no buttons of its own. You place them where your layout needs them and call `form.submit()` or `form.reset()`.',
              es: 'El formulario no trae botones. Los pones donde tu diseño los necesite y llamas `form.submit()` o `form.reset()`.',
            },
            {
              en: 'The Send button is a plain daisyUI class (`btn btn-primary`). The library does not wrap simple elements like buttons, cards or badges; you use daisyUI for those.',
              es: 'El botón Enviar es una clase normal de daisyUI (`btn btn-primary`). La librería no envuelve elementos simples como botones, tarjetas o badges; para eso usas daisyUI.',
            },
            {
              en: '`ToastService` needs no setup: the first toast creates its own container.',
              es: '`ToastService` no necesita configuración: el primer toast crea su propio contenedor.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'This assumes the package is installed and your stylesheet is set up. If not, start with [Installation](/installation).',
            es: 'Esto supone que el paquete ya está instalado y tu hoja de estilos configurada. Si no, empieza por [Instalación](/installation).',
          },
        },
      ],
    },
    {
      id: 'when-to-use',
      heading: { en: 'When it is a good fit', es: 'Cuándo te conviene' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Your app is on Angular 21 and uses, or can use, Tailwind CSS v4 and daisyUI v5.',
              es: 'Tu app está en Angular 21 y usa, o puede usar, Tailwind CSS v4 y daisyUI v5.',
            },
            {
              en: 'You build data-heavy screens: long forms, wizards, tables and grids with many rows, file previews.',
              es: 'Construyes pantallas con muchos datos: formularios largos, wizards, tablas y grids con muchas filas, vistas previas de archivos.',
            },
            {
              en: 'You prefer describing components in typed TypeScript over long templates full of bindings.',
              es: 'Prefieres describir los componentes en TypeScript tipado en lugar de plantillas largas llenas de enlaces.',
            },
            {
              en: 'You want PDF viewing, document previews or a rich text editor without adding a large commercial suite.',
              es: 'Quieres ver PDFs, previsualizar documentos o tener un editor de texto enriquecido sin añadir una suite comercial grande.',
            },
          ],
        },
      ],
    },
    {
      id: 'what-it-is-not',
      heading: { en: 'What it is not', es: 'Qué no es' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Not a CSS framework.** Styling comes from Tailwind CSS and daisyUI, which you install in your app. Without them the components render unstyled.',
              es: '**No es un framework de CSS.** Los estilos vienen de Tailwind CSS y daisyUI, que instalas en tu app. Sin ellos los componentes salen sin estilos.',
            },
            {
              en: '**Not for older Angular.** The Angular peers are `^21`. There are no `NgModule`s; everything is standalone.',
              es: '**No es para versiones viejas de Angular.** Las dependencias de Angular piden `^21`. No hay `NgModule`s; todo es standalone.',
            },
            {
              en: '**Not a wrapper for every daisyUI class.** Buttons, cards, badges and layout stay plain HTML with daisyUI classes.',
              es: '**No envuelve cada clase de daisyUI.** Botones, tarjetas, badges y la maquetación siguen siendo HTML normal con clases de daisyUI.',
            },
            {
              en: '**Not a backend.** Server-side tables and grids call your API; the library defines the request shape, not the server.',
              es: '**No es un backend.** Las tablas y grids con datos del servidor llaman a tu API; la librería define la forma de la petición, no el servidor.',
            },
            {
              en: '**Not a translator of your content.** It translates its own built-in text through labels; your field labels, column headers and menu items are yours to translate.',
              es: '**No traduce tu contenido.** Traduce sus propios textos integrados mediante labels; las etiquetas de tus campos, los encabezados de columnas y los ítems de menú los traduces tú.',
            },
          ],
        },
      ],
    },
    {
      id: 'next-steps',
      heading: { en: 'Where to go next', es: 'A dónde ir después' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '[Installation](/installation): install the package and set up Tailwind CSS and daisyUI.',
              es: '[Instalación](/installation): instala el paquete y configura Tailwind CSS y daisyUI.',
            },
            {
              en: '[Key patterns](/key-patterns): builders, controllers, signals and providers, the ideas every component shares.',
              es: '[Patrones clave](/key-patterns): builders, controladores, signals y proveedores, las ideas que comparten todos los componentes.',
            },
            {
              en: '[Learning paths](/guides/learning-paths): an ordered reading list for beginners, intermediate and advanced users.',
              es: '[Rutas de aprendizaje](/guides/learning-paths): una lista de lectura en orden para principiantes, nivel intermedio y avanzado.',
            },
            {
              en: '[Build a complete form](/guides/build-a-form): a hands-on guide that goes further than the example above.',
              es: '[Construye un formulario completo](/guides/build-a-form): una guía práctica que va más allá del ejemplo de arriba.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'installation', note: { en: 'Set up the package in your app.', es: 'Configura el paquete en tu app.' } },
    {
      id: 'key-patterns',
      note: { en: 'The conventions every component follows.', es: 'Las convenciones que siguen todos los componentes.' },
    },
    { id: 'design-principles', note: { en: 'Why the library is built this way.', es: 'Por qué la librería está construida así.' } },
  ],
};

export default content;
