import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Components never pick a color themselves. They ask for a role — “the page surface”, “the main action”, “an error” — using daisyUI’s semantic color names, and the active theme answers with the actual color.',
      es: 'Los componentes nunca escogen un color por su cuenta. Piden un rol —“la superficie de la página”, “la acción principal”, “un error”— con los nombres de color semánticos de daisyUI, y el tema activo responde con el color real.',
    },
    {
      en: 'This page lists the roles the library uses, which components let you choose a color, and what to check so the result stays readable. How to install or write a theme is covered in [Theming](/foundations/theming).',
      es: 'Esta página lista los roles que usa la librería, qué componentes te dejan escoger un color y qué revisar para que el resultado siga siendo legible. Cómo instalar o escribir un tema está en [Temas](/foundations/theming).',
    },
  ],
  sections: [
    {
      id: 'roles',
      heading: { en: 'The color roles', es: 'Los roles de color' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every color comes in a pair: the color itself and a `-content` color meant for text and icons drawn on top of it.',
            es: 'Cada color viene en pareja: el color en sí y un color `-content` pensado para el texto y los iconos que se dibujan encima.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Token', es: 'Token' },
            { en: 'Role', es: 'Rol' },
            { en: 'Where components use it', es: 'Dónde lo usan los componentes' },
          ],
          rows: [
            [
              { en: '`base-100` / `base-content`', es: '`base-100` / `base-content`' },
              { en: 'Main surface and its text', es: 'Superficie principal y su texto' },
              {
                en: 'Panels, dropdowns, dialogs, cards, table rows',
                es: 'Paneles, desplegables, diálogos, tarjetas, filas de tabla',
              },
            ],
            [
              { en: '`base-200`', es: '`base-200`' },
              { en: 'Recessed surface', es: 'Superficie hundida' },
              {
                en: 'DataGrid header, table toolbar, viewer backgrounds, hover states',
                es: 'Encabezado del DataGrid, barra de la tabla, fondos de visores, estados hover',
              },
            ],
            [
              { en: '`base-300`', es: '`base-300`' },
              { en: 'Lines', es: 'Líneas' },
              { en: 'Borders and dividers (`border-base-300`)', es: 'Bordes y separadores (`border-base-300`)' },
            ],
            [
              { en: '`primary`', es: '`primary`' },
              { en: 'Main action, selection, focus', es: 'Acción principal, selección, foco' },
              {
                en: 'Selected dates and options, active steps, focus rings, progress',
                es: 'Fechas y opciones seleccionadas, pasos activos, anillos de foco, progreso',
              },
            ],
            [
              { en: '`secondary`, `accent`', es: '`secondary`, `accent`' },
              { en: 'Supporting brand colors', es: 'Colores de marca secundarios' },
              {
                en: 'Default `view` / `print` (secondary) and `edit` (accent) table actions',
                es: 'Acciones de tabla por defecto `view` / `print` (secondary) y `edit` (accent)',
              },
            ],
            [
              { en: '`neutral`', es: '`neutral`' },
              { en: 'Dark, brand-free emphasis', es: 'Énfasis oscuro y sin marca' },
              {
                en: 'Current-page ring and overlays in the document and PDF workspaces',
                es: 'Anillo de página actual y overlays en los workspaces de documentos y PDF',
              },
            ],
            [
              { en: '`info`, `success`, `warning`, `error`', es: '`info`, `success`, `warning`, `error`' },
              { en: 'Status', es: 'Estado' },
              {
                en: 'Toast and notification severities, alert icons, validation errors',
                es: 'Severidades de toast y notification, iconos de alert, errores de validación',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Secondary text is the base text color at reduced opacity, most often `text-base-content/70`. Some component stylesheets need tints that utility classes cannot express; those read `--hk-*` variables (for example `--hk-color-primary-20`) computed from the same daisyUI variables, so they follow the theme too.',
            es: 'El texto secundario es el color de texto base con menos opacidad, casi siempre `text-base-content/70`. Algunas hojas de estilo de componentes necesitan tonos que las clases utilitarias no expresan; esas leen variables `--hk-*` (por ejemplo `--hk-color-primary-20`) calculadas a partir de las mismas variables de daisyUI, así que también siguen el tema.',
          },
        },
      ],
    },
    {
      id: 'color-inputs',
      heading: { en: 'Components with a color option', es: 'Componentes con opción de color' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Two form controls accept a `color` input. Both use the same union and add the matching daisyUI input class; the default `null` adds none, so the control uses the theme’s neutral border.',
            es: 'Dos controles de formulario aceptan un input `color`. Ambos usan la misma unión y añaden la clase de input de daisyUI correspondiente; el valor por defecto `null` no añade ninguna, así que el control usa el borde neutro del tema.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Component', es: 'Componente' },
            { en: 'Input and type', es: 'Input y tipo' },
            { en: 'Values', es: 'Valores' },
          ],
          rows: [
            [
              { en: '[Input](/input) (`hk-input`)', es: '[Input](/input) (`hk-input`)' },
              { en: '`color`: [InputColor](/api/InputColor) `| null`', es: '`color`: [InputColor](/api/InputColor) `| null`' },
              {
                en: '`neutral`, `primary`, `secondary`, `accent`, `info`, `success`, `warning`, `error` → `input-<color>`',
                es: '`neutral`, `primary`, `secondary`, `accent`, `info`, `success`, `warning`, `error` → `input-<color>`',
              },
            ],
            [
              { en: '[Select](/select) (`hk-select`)', es: '[Select](/select) (`hk-select`)' },
              { en: '`color`: [SelectColor](/api/SelectColor) `| null`', es: '`color`: [SelectColor](/api/SelectColor) `| null`' },
              { en: 'Same eight values and classes', es: 'Los mismos ocho valores y clases' },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<hk-input color="success" placeholder="Verified email" />
<hk-select color="error" [options]="countries" />`,
        },
        {
          kind: 'p',
          text: {
            en: 'Other components take color as part of a meaning rather than a free choice:',
            es: 'Otros componentes reciben el color como parte de un significado, no como una elección libre:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Where', es: 'Dónde' },
            { en: 'Option', es: 'Opción' },
            { en: 'Result', es: 'Resultado' },
          ],
          rows: [
            [
              { en: '[Toast](/toast)', es: '[Toast](/toast)' },
              {
                en: '`severity`, `soft` in [ToastOptions](/api/ToastOptions)',
                es: '`severity`, `soft` en [ToastOptions](/api/ToastOptions)',
              },
              {
                en: '`alert-success` / `-info` / `-warning` / `-error`; `soft: true` adds `alert-soft`',
                es: '`alert-success` / `-info` / `-warning` / `-error`; `soft: true` añade `alert-soft`',
              },
            ],
            [
              { en: 'Toast actions', es: 'Acciones del toast' },
              { en: '`style`: `default` · `primary` · `ghost`', es: '`style`: `default` · `primary` · `ghost`' },
              { en: '`default` renders `btn-outline`', es: '`default` dibuja `btn-outline`' },
            ],
            [
              { en: '[Notification](/notification)', es: '[Notification](/notification)' },
              {
                en: '`severity`; action `variant`: `primary` · `ghost` · `outline` · `soft`',
                es: '`severity`; `variant` de la acción: `primary` · `ghost` · `outline` · `soft`',
              },
              {
                en: 'Severity panels use `alert-soft alert-<severity>` (daisyUI v5); actions default to `ghost`',
                es: 'Los paneles por severidad usan `alert-soft alert-<severidad>` (daisyUI v5); las acciones son `ghost` por defecto',
              },
            ],
            [
              { en: '[Alert](/alert)', es: '[Alert](/alert)' },
              {
                en: '`confirmStyle` in [ConfirmOptions](/api/ConfirmOptions): `primary` · `success` · `error` · `warning`',
                es: '`confirmStyle` en [ConfirmOptions](/api/ConfirmOptions): `primary` · `success` · `error` · `warning`',
              },
              { en: 'Color of the confirm button', es: 'Color del botón de confirmar' },
            ],
            [
              { en: '[Table](/table) actions', es: 'Acciones de [Table](/table)' },
              { en: 'action `type`, plus `buttonClass`', es: '`type` de la acción, más `buttonClass`' },
              {
                en: '`view`/`print` secondary, `edit` accent, `delete` error, `upload`/`export` info, `download` success, others ghost',
                es: '`view`/`print` secondary, `edit` accent, `delete` error, `upload`/`export` info, `download` success, el resto ghost',
              },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'A table action’s `buttonClass` is added next to the default classes, not instead of them. Another `btn-<color>` class then competes with the default one, so prefer an action `type` with no default color (any custom string renders `btn-ghost`) when you want full control.',
            es: 'El `buttonClass` de una acción de tabla se añade junto a las clases por defecto, no en su lugar. Otra clase `btn-<color>` compite entonces con la de por defecto, así que usa un `type` de acción sin color por defecto (cualquier texto propio dibuja `btn-ghost`) cuando quieras control total.',
          },
        },
      ],
    },
    {
      id: 'themes',
      heading: { en: 'How themes change them', es: 'Cómo los cambia el tema' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A daisyUI theme is a set of CSS variables (`--color-primary`, `--color-base-100`, …). Components reference the roles, so changing `data-theme` or loading a different theme swaps every color at once, including the `--hk-*` tints and panels rendered in a CDK overlay. Nothing in Angular re-renders.',
            es: 'Un tema de daisyUI es un conjunto de variables CSS (`--color-primary`, `--color-base-100`, …). Los componentes hacen referencia a los roles, así que cambiar `data-theme` o cargar otro tema cambia todos los colores de una vez, incluidos los tonos `--hk-*` y los paneles que se dibujan en un overlay de CDK. Angular no vuelve a renderizar nada.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Dark themes need no extra work: the same tokens resolve to dark values.',
              es: 'Los temas oscuros no requieren trabajo adicional: los mismos tokens se resuelven a valores oscuros.',
            },
            {
              en: 'Document content is the exception. Rendered PDF, DOCX, HTML and email pages sit on a white sheet in every theme, because their own colors assume paper; the frame around the sheet follows the theme.',
              es: 'El contenido de documentos es la excepción. Las páginas renderizadas de PDF, DOCX, HTML y correo van sobre una hoja blanca en todos los temas, porque sus propios colores asumen papel; el marco alrededor de la hoja sigue el tema.',
            },
            {
              en: '`input-neutral` and `input-xl` are daisyUI v5 classes. On the daisyUI v4 stack, `color="neutral"` leaves the control with its default look.',
              es: '`input-neutral` e `input-xl` son clases de daisyUI v5. En el stack de daisyUI v4, `color="neutral"` deja el control con su aspecto por defecto.',
            },
          ],
        },
      ],
    },
    {
      id: 'contrast',
      heading: { en: 'Contrast: what to check', es: 'Contraste: qué revisar' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The library cannot guarantee contrast, because the colors are your theme’s. It uses each color with its own `-content` pair, which is the pairing daisyUI designs for, but a theme’s pairs are not all guaranteed to reach the WCAG AA ratio of 4.5:1 for normal text. That applies to built-in daisyUI themes as well as custom ones.',
            es: 'La librería no puede garantizar el contraste, porque los colores son de tu tema. Usa cada color con su propia pareja `-content`, que es la combinación que daisyUI diseña, pero no todas las parejas de un tema están garantizadas para llegar a la proporción WCAG AA de 4.5:1 para texto normal. Eso aplica tanto a los temas integrados de daisyUI como a los propios.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '**Check each pair you rely on:** `primary`/`primary-content`, the four status colors with their `-content`, and `base-content` on `base-100` and `base-200`.',
              es: '**Revisa cada pareja que usas:** `primary`/`primary-content`, los cuatro colores de estado con su `-content`, y `base-content` sobre `base-100` y `base-200`.',
            },
            {
              en: '**Watch muted text.** Secondary text is drawn with opacity. `/70` is the usual level, but some components still render hints and placeholders at `/50` or `/60` (for example the prefix and suffix text in `hk-input`), which can fall below 4.5:1 depending on the theme.',
              es: '**Ojo con el texto atenuado.** El texto secundario se dibuja con opacidad. `/70` es el nivel habitual, pero algunos componentes todavía muestran ayudas y placeholders con `/50` o `/60` (por ejemplo el texto de prefijo y sufijo en `hk-input`), que puede quedar por debajo de 4.5:1 según el tema.',
            },
            {
              en: '**Status colors as text.** Using `text-error` or `text-warning` directly on `base-100` is a different pair from `error`/`error-content`; light warning colors in particular tend to fail on light surfaces.',
              es: '**Colores de estado como texto.** Usar `text-error` o `text-warning` directamente sobre `base-100` es una pareja distinta a `error`/`error-content`; los colores de advertencia claros en particular suelen fallar sobre superficies claras.',
            },
            {
              en: '**Do not rely on color alone.** Components pair status colors with icons and text; keep doing that in your own cell formatters and badges.',
              es: '**No dependas solo del color.** Los componentes combinan los colores de estado con iconos y texto; haz lo mismo en tus formateadores de celdas y badges.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Run an automated checker (axe, Lighthouse) with each theme you ship, light and dark. A page can pass in one theme and fail in another with the same markup.',
            es: 'Corre un verificador automático (axe, Lighthouse) con cada tema que publiques, claro y oscuro. Una página puede pasar con un tema y fallar con otro con el mismo markup.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'theming', note: { en: 'Install, switch and write themes.', es: 'Instala, cambia y escribe temas.' } },
    { id: 'accessibility', note: { en: 'What else stays on you.', es: 'Qué más sigue siendo tu responsabilidad.' } },
    {
      id: 'sizes-and-variants',
      note: { en: 'Sizes and soft / outline variants.', es: 'Tamaños y variantes soft / outline.' },
    },
  ],
};

export default content;
