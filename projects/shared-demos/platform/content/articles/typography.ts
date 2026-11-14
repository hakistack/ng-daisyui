import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'The library does not choose your fonts. It ships no font files and no `@font-face` rules, and its stylesheet does not set a `font-family` on the page. Components inherit the typeface from the page around them, so they look like the rest of your app.',
      es: 'La librería no escoge tus fuentes. No trae archivos de fuente ni reglas `@font-face`, y su hoja de estilos no define un `font-family` para la página. Los componentes heredan la tipografía de la página que los rodea, así que se ven como el resto de tu app.',
    },
  ],
  sections: [
    {
      id: 'set-your-font',
      heading: { en: 'Setting the app font', es: 'Definir la fuente de la app' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'With Tailwind CSS v4, the page font comes from the `--font-sans` theme variable (Tailwind’s base styles apply it to `html`), and the `font-mono` utility reads `--font-mono`. Override them in `@theme` and load the font files yourself. This docs site does exactly that:',
            es: 'Con Tailwind CSS v4, la fuente de la página viene de la variable de tema `--font-sans` (los estilos base de Tailwind la aplican a `html`), y la utilidad `font-mono` lee `--font-mono`. Sobrescríbelas en `@theme` y carga tú los archivos de fuente. Este sitio de documentación hace exactamente eso:',
          },
        },
        {
          kind: 'code',
          lang: 'css',
          title: 'src/styles.css',
          code: `@import "tailwindcss";
@plugin "daisyui";
@import "@hakistack/ng-daisyui";

@theme {
  --font-sans: 'Outfit', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'The font files themselves (here from Google Fonts, linked in `index.html`) are your app’s choice and your app’s download. If you set nothing, components use Tailwind’s default system font stack.',
            es: 'Los archivos de fuente (aquí desde Google Fonts, enlazados en `index.html`) son decisión de tu app y descarga de tu app. Si no defines nada, los componentes usan la pila de fuentes del sistema que Tailwind trae por defecto.',
          },
        },
      ],
    },
    {
      id: 'sizes-inherit',
      heading: { en: 'Text sizes', es: 'Tamaños de texto' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Components size text with Tailwind’s `rem`-based scale (`text-xs`, `text-sm`, `text-base`, `text-lg`) and daisyUI’s component sizes. Both follow the root font size, so browser zoom and the user’s default font-size setting scale the components with the rest of the page. Avoid setting a fixed pixel `font-size` on `html`.',
            es: 'Los componentes dimensionan el texto con la escala de Tailwind basada en `rem` (`text-xs`, `text-sm`, `text-base`, `text-lg`) y los tamaños de componente de daisyUI. Ambos siguen el tamaño de fuente raíz, así que el zoom del navegador y el tamaño de letra que el usuario configuró escalan los componentes junto con el resto de la página. Evita fijar un `font-size` en píxeles en `html`.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Controls with a `size` input (input, select, menu, breadcrumbs) change their text size with it; see [Sizes & variants](/foundations/sizes-and-variants).',
              es: 'Los controles con input `size` (input, select, menu, breadcrumbs) cambian su tamaño de texto con él; mira [Tamaños y variantes](/foundations/sizes-and-variants).',
            },
            {
              en: 'Toasts render the summary at weight 500 and the detail at `0.875rem`, cut to two lines. Put the essential words in the summary.',
              es: 'Los toasts muestran el resumen con peso 500 y el detalle a `0.875rem`, cortado a dos líneas. Pon las palabras esenciales en el resumen.',
            },
            {
              en: 'Outside the rich-text editor, the library does not style headings or body copy. Your page headings keep whatever your app defines.',
              es: 'Fuera del editor de texto enriquecido, la librería no da estilo a títulos ni al texto corrido. Los títulos de tu página conservan lo que tu app defina.',
            },
          ],
        },
      ],
    },
    {
      id: 'editor-content',
      heading: { en: 'Rich-text editor content', es: 'Contenido del editor de texto enriquecido' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The [Editor](/editor) is the one component that styles written content. Its headings are sized in `em` relative to the editor text (H1 `1.75em`, H2 `1.35em`, H3 `1.15em`), so they scale with whatever font size the editor inherits.',
            es: 'El [Editor](/editor) es el único componente que da estilo a contenido escrito. Sus títulos se dimensionan en `em` respecto al texto del editor (H1 `1.75em`, H2 `1.35em`, H3 `1.15em`), así que escalan con el tamaño de fuente que el editor herede.',
          },
        },
      ],
    },
    {
      id: 'monospace',
      heading: { en: 'Monospace and numbers', es: 'Monoespaciada y números' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Numbers that change in place — page positions and page numbers in the PDF and document workspaces, zoom values — use `font-mono` with `tabular-nums` so digits keep the same width and the layout does not jump. The timepicker’s text field, plain-text and email bodies in the document viewer, and the plain-text and Markdown editors also use `font-mono`. All of these follow your `--font-mono`.',
            es: 'Los números que cambian en sitio —posiciones y números de página en los workspaces de PDF y documentos, valores de zoom— usan `font-mono` con `tabular-nums` para que los dígitos mantengan el mismo ancho y el diseño no salte. El campo de texto del timepicker, los cuerpos de texto plano y correo en el visor de documentos, y los editores de texto plano y Markdown también usan `font-mono`. Todos siguen tu `--font-mono`.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'A few component stylesheets name a font stack directly and therefore do not follow your theme variables:',
            es: 'Algunas hojas de estilo de componentes nombran una pila de fuentes directamente y por eso no siguen tus variables de tema:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Where', es: 'Dónde' },
            { en: 'Font stack', es: 'Pila de fuentes' },
          ],
          rows: [
            [
              {
                en: '[Timepicker](/timepicker) hour/minute segments and separators',
                es: 'Segmentos y separadores de hora/minuto del [Timepicker](/timepicker)',
              },
              { en: "`ui-monospace, 'SF Mono', Menlo, monospace`", es: "`ui-monospace, 'SF Mono', Menlo, monospace`" },
            ],
            [
              { en: 'Timepicker clock-face numbers', es: 'Números de la carátula del reloj del Timepicker' },
              { en: '`ui-sans-serif, system-ui, sans-serif`', es: '`ui-sans-serif, system-ui, sans-serif`' },
            ],
            [
              { en: 'Editor inline code and code blocks', es: 'Código en línea y bloques de código del Editor' },
              { en: '`ui-monospace, SFMono-Regular, Menlo, monospace`', es: '`ui-monospace, SFMono-Regular, Menlo, monospace`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'To align those with your fonts, target the element in your global stylesheet; there is no input or variable for them.',
            es: 'Para alinearlos con tus fuentes, apunta al elemento desde tu hoja de estilos global; no hay input ni variable para ellos.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Tailwind 3 / daisyUI 4 stack: the precompiled `styles-v4.css` defines `.font-mono` with Tailwind’s default monospace stack. If you customize `fontFamily.mono`, load your own Tailwind output after the package stylesheet so your rule wins.',
            es: 'Stack Tailwind 3 / daisyUI 4: el archivo precompilado `styles-v4.css` define `.font-mono` con la pila monoespaciada por defecto de Tailwind. Si personalizas `fontFamily.mono`, carga tu propio CSS de Tailwind después de la hoja de estilos del paquete para que tu regla gane.',
          },
        },
      ],
    },
    {
      id: 'document-text',
      heading: { en: 'Text inside documents', es: 'Texto dentro de documentos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Rendered document pages keep their own typography: a PDF page is drawn from the fonts in the file, and DOCX or HTML content brings its own styles. Text you add to a PDF (free-text annotations, typed signatures) uses the font picked in that tool, because it is written into the file rather than styled by your app.',
            es: 'Las páginas de documentos renderizadas conservan su propia tipografía: una página PDF se dibuja con las fuentes del archivo, y el contenido DOCX o HTML trae sus propios estilos. El texto que añades a un PDF (anotaciones de texto libre, firmas escritas) usa la fuente escogida en esa herramienta, porque se escribe en el archivo y no lo estiliza tu app.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'theming', note: { en: 'Where the rest of the look comes from.', es: 'De dónde sale el resto del aspecto.' } },
    { id: 'sizes-and-variants', note: { en: 'Size inputs and what they change.', es: 'Inputs de tamaño y qué cambian.' } },
    { id: 'editor', note: { en: 'The component that styles written content.', es: 'El componente que da estilo al contenido escrito.' } },
  ],
};

export default content;
