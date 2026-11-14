import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'These are the rules the library’s code actually follows, written down so you can predict how a component behaves before you open its page. Each principle ends with what it means for your app.',
      es: 'Estas son las reglas que el código de la librería sigue de verdad, escritas para que puedas predecir cómo se comporta un componente antes de abrir su página. Cada principio termina con lo que significa para tu app.',
    },
  ],
  sections: [
    {
      id: 'semantic-tokens',
      heading: { en: 'Paint with daisyUI semantic tokens', es: 'Pintar con los tokens semánticos de daisyUI' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Templates use daisyUI classes and tokens (`bg-base-100`, `text-base-content/70`, `btn-primary`, `alert-error`) instead of fixed colors such as hex values or `bg-gray-*`. The few tints Tailwind classes cannot express come from `--hk-*` variables that are themselves derived from the active daisyUI variables.',
            es: 'Las plantillas usan clases y tokens de daisyUI (`bg-base-100`, `text-base-content/70`, `btn-primary`, `alert-error`) en lugar de colores fijos como valores hex o `bg-gray-*`. Los pocos tonos que las clases de Tailwind no expresan vienen de variables `--hk-*` que a su vez se derivan de las variables activas de daisyUI.',
          },
        },
        {
          kind: 'p',
          text: {
            en: '**For you:** switching or writing a theme restyles every component; you never override component colors one by one. When you add CSS around a component, use the same tokens so it keeps up with theme changes. See [Colors](/foundations/colors) and [Theming](/foundations/theming).',
            es: '**Para ti:** cambiar o escribir un tema cambia el estilo de todos los componentes; nunca sobrescribes colores componente por componente. Cuando añadas CSS alrededor de un componente, usa los mismos tokens para que siga los cambios de tema. Mira [Colores](/foundations/colors) y [Temas](/foundations/theming).',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Known exception: document and PDF pages are drawn on `bg-white` because document content assumes white paper. The table’s default `delete` action is a plain `btn-error`, so its text color comes from the theme’s `error-content`.',
            es: 'Excepción conocida: las páginas de documentos y PDF se dibujan sobre `bg-white` porque el contenido del documento asume papel blanco. La acción `delete` por defecto de la tabla es un `btn-error` simple, así que su color de texto viene del `error-content` del tema.',
          },
        },
      ],
    },
    {
      id: 'literal-classes',
      heading: { en: 'Class names written out in full', es: 'Nombres de clase escritos completos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Tailwind CSS v4 only generates classes it finds as text when it scans the compiled package. Components therefore map dynamic values through lookup tables of complete class names (`xs` → `input-xs`, `lg` → `lg:drawer-open`) rather than building `input-${size}` at runtime.',
            es: 'Tailwind CSS v4 solo genera las clases que encuentra como texto cuando escanea el paquete compilado. Por eso los componentes traducen valores dinámicos con tablas de nombres de clase completos (`xs` → `input-xs`, `lg` → `lg:drawer-open`) en lugar de construir `input-${size}` en tiempo de ejecución.',
          },
        },
        {
          kind: 'p',
          text: {
            en: "**For you:** importing the package stylesheet is enough; you do not keep a safelist. The same rule applies to your own templates: write `btn-primary`, not `'btn-' + color`.",
            es: "**Para ti:** importar la hoja de estilos del paquete basta; no mantienes un safelist. La misma regla aplica a tus propias plantillas: escribe `btn-primary`, no `'btn-' + color`.",
          },
        },
      ],
    },
    {
      id: 'angular-patterns',
      heading: { en: 'Standalone, OnPush and signals', es: 'Standalone, OnPush y signals' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every component is standalone and uses `ChangeDetectionStrategy.OnPush`. Inputs are signal inputs (`input()`, `model()`), derived state lives in `computed()`, and form controls implement `ControlValueAccessor` so the form owns the value and the disabled state.',
            es: 'Todos los componentes son standalone y usan `ChangeDetectionStrategy.OnPush`. Los inputs son signal inputs (`input()`, `model()`), el estado derivado vive en `computed()` y los controles de formulario implementan `ControlValueAccessor`, así que el formulario es dueño del valor y del estado deshabilitado.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '**Import what you use.** Add the component class to your component’s `imports`; there is no module to register.',
              es: '**Importa lo que usas.** Añade la clase del componente a los `imports` de tu componente; no hay módulo que registrar.',
            },
            {
              en: '**Replace, do not mutate.** A component sees a change only when the bound reference changes. Pushing into an array you already passed does nothing; `rows.update((r) => [...r, row])` does.',
              es: '**Reemplaza, no mutes.** Un componente ve un cambio solo cuando cambia la referencia que le pasas. Hacer `push` en un arreglo que ya pasaste no hace nada; `rows.update((r) => [...r, row])` sí.',
            },
            {
              en: '**Use reactive forms.** `hk-input`, `hk-select`, the pickers and the editor work with `formControlName` and `[formControl]`; disabling the control disables the component.',
              es: '**Usa formularios reactivos.** `hk-input`, `hk-select`, los pickers y el editor funcionan con `formControlName` y `[formControl]`; deshabilitar el control deshabilita el componente.',
            },
          ],
        },
      ],
    },
    {
      id: 'builders-and-controllers',
      heading: { en: 'Configuration objects and controllers', es: 'Objetos de configuración y controladores' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Complex components take one typed configuration instead of dozens of inputs. Builder functions (`createForm`, `createTable`, `createDataGrid`, `createMenu`, `createTree`, `createPdfViewer`, `createCommandPalette`, `createDocumentEditor`) return a controller: the config to bind plus methods such as `submit()`, `reset()` or `setState()` to drive the component from your code.',
            es: 'Los componentes complejos reciben una sola configuración tipada en lugar de decenas de inputs. Las funciones builder (`createForm`, `createTable`, `createDataGrid`, `createMenu`, `createTree`, `createPdfViewer`, `createCommandPalette`, `createDocumentEditor`) devuelven un controlador: la configuración que enlazas más métodos como `submit()`, `reset()` o `setState()` para manejar el componente desde tu código.',
          },
        },
        {
          kind: 'p',
          text: {
            en: '**For you:** create controllers in a field initializer or the constructor (some, like `createTable`, call `inject()` and need an injection context). Simple items stay plain object literals, for example a menu item `{ label, routerLink, icon }`. See [Builders](/systems/builders).',
            es: '**Para ti:** crea los controladores en un inicializador de campo o en el constructor (algunos, como `createTable`, llaman `inject()` y necesitan un contexto de inyección). Los ítems simples siguen siendo objetos literales, por ejemplo un ítem de menú `{ label, routerLink, icon }`. Mira [Builders](/systems/builders).',
          },
        },
      ],
    },
    {
      id: 'providers',
      heading: { en: 'App-wide settings through provider functions', es: 'Ajustes globales con funciones provider' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Defaults that apply across the app are set once with a `provide*()` function in your application config: `provideToast`, `provideAlert`, `provideNotification`, `providePipes`, `provideFormState`, `provideHkTheme`, the labels providers (`provideDynamicFormLabels`, `provideHkDataGridLabels`, `provideHkPdfLabels`…) and the WASM URL providers. The injection tokens behind them stay internal unless the API reference lists them.',
            es: 'Los valores por defecto para toda la app se definen una vez con una función `provide*()` en la configuración de tu aplicación: `provideToast`, `provideAlert`, `provideNotification`, `providePipes`, `provideFormState`, `provideHkTheme`, los providers de labels (`provideDynamicFormLabels`, `provideHkDataGridLabels`, `provideHkPdfLabels`…) y los providers de URLs de WASM. Los tokens de inyección detrás de ellos son internos salvo que la referencia de API los liste.',
          },
        },
        {
          kind: 'p',
          text: {
            en: '**For you:** most features need no provider at all; add one only to change a default. Per-instance inputs (such as a component’s `labels` input) override the app-wide value.',
            es: '**Para ti:** la mayoría de las funciones no necesita provider; añade uno solo para cambiar un valor por defecto. Los inputs por instancia (como el input `labels` de un componente) tienen prioridad sobre el valor global.',
          },
        },
      ],
    },
    {
      id: 'lazy-heavy-features',
      heading: { en: 'Heavy features load when used', es: 'Lo pesado se carga cuando se usa' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The package declares `sideEffects: false` and keeps expensive code behind dynamic `import()`: the Tiptap editor, phone-number parsing, document parsers (`docx-preview`, `@kenjiuno/msgreader`, `postal-mime`, `dompurify`), the `@anthropic-ai/sdk` client and the Rust/WASM engines (table, fuzzy search, forms, PDF, documents, images).',
            es: 'El paquete declara `sideEffects: false` y deja el código costoso detrás de `import()` dinámicos: el editor Tiptap, el análisis de números telefónicos, los parsers de documentos (`docx-preview`, `@kenjiuno/msgreader`, `postal-mime`, `dompurify`), el cliente `@anthropic-ai/sdk` y los motores Rust/WASM (tabla, búsqueda difusa, formularios, PDF, documentos, imágenes).',
          },
        },
        {
          kind: 'p',
          text: {
            en: '**For you:** a page that does not use a feature does not download it. Install optional peers only for the features you use, and expect a short loading step the first time a heavy feature runs. See [Optimize bundle size](/guides/bundle-size) and [WASM engines](/systems/wasm-engines).',
            es: '**Para ti:** una página que no usa una función no la descarga. Instala las dependencias peer opcionales solo para las funciones que usas, y cuenta con un paso de carga breve la primera vez que corre una función pesada. Mira [Optimiza el tamaño del bundle](/guides/bundle-size) y [Motores WASM](/systems/wasm-engines).',
          },
        },
      ],
    },
    {
      id: 'browser-only-work',
      heading: { en: 'Browser-only work is guarded', es: 'El trabajo exclusivo del navegador está protegido' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Code that needs `window`, `matchMedia`, `ResizeObserver` or the DOM checks the platform first. On the server `ToastService.show()` returns an empty id, size observers are not created, and the motion directives skip their browser-only setup.',
            es: 'El código que necesita `window`, `matchMedia`, `ResizeObserver` o el DOM revisa la plataforma primero. En el servidor `ToastService.show()` devuelve un id vacío, no se crean observadores de tamaño y las directivas de animación omiten su configuración exclusiva del navegador.',
          },
        },
        {
          kind: 'p',
          text: {
            en: '**For you:** server-side rendering does not crash on these components, but what they compute from measurements (virtualized rows, folded panels) appears only after hydration in the browser.',
            es: '**Para ti:** el renderizado en el servidor no falla con estos componentes, pero lo que calculan a partir de medidas (filas virtualizadas, paneles plegados) aparece solo después de la hidratación en el navegador.',
          },
        },
      ],
    },
    {
      id: 'accessibility-requirement',
      heading: { en: 'Accessibility is part of the contract', es: 'La accesibilidad es parte del contrato' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Interactive components implement a named WAI-ARIA pattern with its keyboard model, use per-instance ids for ARIA relationships, move and return focus around overlays, and respect `prefers-reduced-motion`. Built-in strings, including many `aria-label` defaults, come from labels interfaces with English defaults.',
            es: 'Los componentes interactivos implementan un patrón WAI-ARIA concreto con su modelo de teclado, usan ids únicos por instancia para las relaciones ARIA, mueven y devuelven el foco alrededor de los overlays y respetan `prefers-reduced-motion`. Los textos integrados, incluidos muchos `aria-label` por defecto, vienen de interfaces de labels con valores en inglés.',
          },
        },
        {
          kind: 'p',
          text: {
            en: '**For you:** you still name things (grids, icon-only buttons, inputs), translate the labels, and own your theme’s contrast. See [Accessibility](/foundations/accessibility) and [Internationalization](/foundations/i18n).',
            es: '**Para ti:** todavía te toca nombrar las cosas (grids, botones de solo icono, inputs), traducir los labels y responder por el contraste de tu tema. Mira [Accesibilidad](/foundations/accessibility) e [Internacionalización](/foundations/i18n).',
          },
        },
      ],
    },
    {
      id: 'summary',
      heading: { en: 'At a glance', es: 'En resumen' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Principle', es: 'Principio' },
            { en: 'What you do', es: 'Lo que haces tú' },
          ],
          rows: [
            [
              { en: 'Semantic tokens', es: 'Tokens semánticos' },
              { en: 'Change the theme, not the components', es: 'Cambia el tema, no los componentes' },
            ],
            [
              { en: 'Complete class literals', es: 'Clases literales completas' },
              { en: 'Import the package stylesheet; no safelist', es: 'Importa la hoja de estilos del paquete; sin safelist' },
            ],
            [
              { en: 'OnPush + signals', es: 'OnPush + signals' },
              { en: 'Pass new references instead of mutating', es: 'Pasa referencias nuevas en lugar de mutar' },
            ],
            [
              { en: 'Builders and controllers', es: 'Builders y controladores' },
              { en: 'Create them in an injection context; bind `config`', es: 'Créalos en un contexto de inyección; enlaza `config`' },
            ],
            [
              { en: 'Provider functions', es: 'Funciones provider' },
              { en: 'Add one only to change a default', es: 'Añade uno solo para cambiar un valor por defecto' },
            ],
            [
              { en: 'Lazy heavy features', es: 'Lo pesado, diferido' },
              { en: 'Install optional peers for the features you use', es: 'Instala los peers opcionales de las funciones que usas' },
            ],
            [
              { en: 'Accessibility', es: 'Accesibilidad' },
              { en: 'Name controls, translate labels, check contrast', es: 'Nombra controles, traduce labels, revisa el contraste' },
            ],
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'key-patterns', note: { en: 'The same ideas, shown in code.', es: 'Las mismas ideas, en código.' } },
    {
      id: 'architecture-library',
      note: { en: 'How the package is organized internally.', es: 'Cómo está organizado el paquete por dentro.' },
    },
    { id: 'colors', note: { en: 'Which tokens components use.', es: 'Qué tokens usan los componentes.' } },
    { id: 'guide-bundle-size', note: { en: 'What is lazy and what is on you.', es: 'Qué es diferido y qué te toca a ti.' } },
  ],
};

export default content;
