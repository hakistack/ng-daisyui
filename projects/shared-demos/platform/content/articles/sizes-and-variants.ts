import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Controls that come in sizes share one scale borrowed from daisyUI: `xs`, `sm`, `md`, `lg`, `xl`, with `md` as the default. Each value maps to a daisyUI class, so a `size="sm"` input matches a `btn-sm` button next to it.',
      es: 'Los controles que vienen en tamaños comparten una escala tomada de daisyUI: `xs`, `sm`, `md`, `lg`, `xl`, con `md` por defecto. Cada valor se traduce a una clase de daisyUI, así que un input con `size="sm"` combina con un botón `btn-sm` a su lado.',
    },
    {
      en: 'Not every component uses the full scale, and a few use their own options. The tables below come straight from the exported types.',
      es: 'No todos los componentes usan la escala completa, y algunos tienen opciones propias. Las tablas de abajo salen directamente de los tipos exportados.',
    },
  ],
  sections: [
    {
      id: 'size-scale',
      heading: { en: 'Size inputs', es: 'Inputs de tamaño' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Component', es: 'Componente' },
            { en: 'Input / type', es: 'Input / tipo' },
            { en: 'Values', es: 'Valores' },
            { en: 'Default', es: 'Por defecto' },
            { en: 'What it changes', es: 'Qué cambia' },
          ],
          rows: [
            [
              { en: '[Input](/input)', es: '[Input](/input)' },
              { en: '`size`: [InputSize](/api/InputSize)', es: '`size`: [InputSize](/api/InputSize)' },
              { en: '`xs` `sm` `md` `lg` `xl`', es: '`xs` `sm` `md` `lg` `xl`' },
              { en: '`md`', es: '`md`' },
              {
                en: '`input-xs` … `input-xl` (`md` adds no class)',
                es: '`input-xs` … `input-xl` (`md` no añade clase)',
              },
            ],
            [
              { en: '[Select](/select)', es: '[Select](/select)' },
              { en: '`size`: [SelectSize](/api/SelectSize)', es: '`size`: [SelectSize](/api/SelectSize)' },
              { en: '`xs` `sm` `md` `lg` `xl`', es: '`xs` `sm` `md` `lg` `xl`' },
              { en: '`md`', es: '`md`' },
              {
                en: 'Same input classes; option rows `h-6`, `h-8`, `h-10`, `h-12`, `h-14`',
                es: 'Las mismas clases de input; filas de opciones `h-6`, `h-8`, `h-10`, `h-12`, `h-14`',
              },
            ],
            [
              { en: '[Menu](/menu)', es: '[Menu](/menu)' },
              {
                en: '`size` or `config.size`: [MenuSize](/api/MenuSize)',
                es: '`size` o `config.size`: [MenuSize](/api/MenuSize)',
              },
              { en: '`xs` `sm` `md` `lg` `xl`', es: '`xs` `sm` `md` `lg` `xl`' },
              { en: '`md`', es: '`md`' },
              { en: '`menu-<size>`', es: '`menu-<size>`' },
            ],
            [
              { en: '[Breadcrumbs](/breadcrumbs)', es: '[Breadcrumbs](/breadcrumbs)' },
              { en: '`size`: [BreadcrumbSize](/api/BreadcrumbSize)', es: '`size`: [BreadcrumbSize](/api/BreadcrumbSize)' },
              { en: '`xs` `sm` `md` `lg`', es: '`xs` `sm` `md` `lg`' },
              { en: '`sm`', es: '`sm`' },
              { en: '`text-xs`, `text-sm`, `text-base`, `text-lg`', es: '`text-xs`, `text-sm`, `text-base`, `text-lg`' },
            ],
            [
              { en: '[Alert](/alert)', es: '[Alert](/alert)' },
              { en: '`size` option: [AlertSize](/api/AlertSize)', es: 'opción `size`: [AlertSize](/api/AlertSize)' },
              { en: '`sm` `md` `lg` `xl` `2xl` `4xl` `full`', es: '`sm` `md` `lg` `xl` `2xl` `4xl` `full`' },
              { en: '`md`', es: '`md`' },
              {
                en: 'Dialog `max-w-*`; `full` is `w-11/12 max-w-5xl`. `width` / `maxWidth` override it',
                es: '`max-w-*` del diálogo; `full` es `w-11/12 max-w-5xl`. `width` / `maxWidth` lo reemplazan',
              },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<hk-input size="sm" placeholder="Search" />
<hk-select size="lg" [options]="plans" />
<hk-breadcrumbs size="xs" [items]="trail" />`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Tailwind v4 only generates classes it finds written out in the scanned sources, so `hk-menu` spells every size class in full (`menu-xs` through `menu-xl`). All five menu sizes work without adding anything to your own source.',
            es: 'Tailwind v4 solo genera las clases que encuentra escritas en las fuentes que escanea, así que `hk-menu` escribe completa cada clase de tamaño (de `menu-xs` a `menu-xl`). Los cinco tamaños del menú funcionan sin agregar nada a tu propio código.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'On daisyUI v5, what `md` actually measures is decided by the theme: `--size-field` and `--size-selector` set the base size of inputs and small controls, and the `--radius-*` variables their corners. A denser or roomier theme resizes every control without changing a `size` input.',
            es: 'En daisyUI v5, cuánto mide realmente `md` lo decide el tema: `--size-field` y `--size-selector` definen el tamaño base de los inputs y los controles pequeños, y las variables `--radius-*` sus esquinas. Un tema más compacto o más holgado cambia el tamaño de todos los controles sin tocar ningún input `size`.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: '`input-xl` is a daisyUI v5 class. On the daisyUI v4 stack, `size="xl"` renders like `md`.',
            es: '`input-xl` es una clase de daisyUI v5. En el stack de daisyUI v4, `size="xl"` se ve como `md`.',
          },
        },
      ],
    },
    {
      id: 'dimensions',
      heading: { en: 'Dimensions that are not on the scale', es: 'Medidas que no están en la escala' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Component', es: 'Componente' },
            { en: 'Option', es: 'Opción' },
            { en: 'Default', es: 'Por defecto' },
          ],
          rows: [
            [
              { en: '[DataGrid](/datagrid)', es: '[DataGrid](/datagrid)' },
              {
                en: '`height` input (CSS length); `rowHeight` in [DataGridConfig](/api/DataGridConfig) (px)',
                es: 'input `height` (longitud CSS); `rowHeight` en [DataGridConfig](/api/DataGridConfig) (px)',
              },
              { en: '`480px`; `36`', es: '`480px`; `36`' },
            ],
            [
              { en: '[App shell](/app-shell) sidebar', es: 'Sidebar del [App shell](/app-shell)' },
              {
                en: '`width` in [SidebarConfig](/api/SidebarConfig) (CSS length)',
                es: '`width` en [SidebarConfig](/api/SidebarConfig) (longitud CSS)',
              },
              { en: '`18rem`; `4rem` when collapsed to a rail', es: '`18rem`; `4rem` al plegarse en riel' },
            ],
            [
              { en: '[Forms](/forms)', es: '[Forms](/forms)' },
              {
                en: '`gap`: `sm` `md` `lg` → `gap-2`, `gap-4`, `gap-6`; `labelWidth`: `sm` `md` `lg` `xl` → `w-1/6`, `w-1/4`, `w-1/3`, `w-2/5`',
                es: '`gap`: `sm` `md` `lg` → `gap-2`, `gap-4`, `gap-6`; `labelWidth`: `sm` `md` `lg` `xl` → `w-1/6`, `w-1/4`, `w-1/3`, `w-2/5`',
              },
              { en: '`md`; `md`', es: '`md`; `md`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Generated form controls have no size option; they render at the default daisyUI size. If a form must be compact, use `hk-input` and `hk-select` directly with a `size`.',
            es: 'Los controles que genera un formulario no tienen opción de tamaño; se ven con el tamaño por defecto de daisyUI. Si un formulario debe ser compacto, usa `hk-input` y `hk-select` directamente con un `size`.',
          },
        },
      ],
    },
    {
      id: 'variants',
      heading: { en: 'Visual variants', es: 'Variantes visuales' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Variants are limited on purpose. Where they exist, they map to daisyUI modifiers:',
            es: 'Las variantes son limitadas a propósito. Donde existen, se traducen a modificadores de daisyUI:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Where', es: 'Dónde' },
            { en: 'Option', es: 'Opción' },
            { en: 'Classes', es: 'Clases' },
          ],
          rows: [
            [
              { en: '[Tabs](/tabs) (`hk-tab-group`)', es: '[Tabs](/tabs) (`hk-tab-group`)' },
              { en: '`variant`: `lift` (default) · `box` · `border`', es: '`variant`: `lift` (por defecto) · `box` · `border`' },
              {
                en: '`tabs-lift` / `tabs-box` / `tabs-border` (v4 names through `provideHkTheme`); ignored when `orientation` is `vertical`',
                es: '`tabs-lift` / `tabs-box` / `tabs-border` (nombres v4 con `provideHkTheme`); se ignora cuando `orientation` es `vertical`',
              },
            ],
            [
              { en: '[Toast](/toast)', es: '[Toast](/toast)' },
              { en: '`soft: true`', es: '`soft: true`' },
              { en: '`alert-soft` on the toast', es: '`alert-soft` en el toast' },
            ],
            [
              { en: 'Toast actions', es: 'Acciones del toast' },
              { en: '`style`: `default` · `primary` · `ghost`', es: '`style`: `default` · `primary` · `ghost`' },
              {
                en: '`btn-outline` · `btn-primary` · `btn-ghost`, all `btn-xs`',
                es: '`btn-outline` · `btn-primary` · `btn-ghost`, todos `btn-xs`',
              },
            ],
            [
              { en: '[Notification](/notification)', es: '[Notification](/notification)' },
              { en: 'severity panel', es: 'panel por severidad' },
              {
                en: '`alert-soft alert-<severity>` on daisyUI v5; a neutral panel with a colored icon on v4, which has no `alert-soft`',
                es: '`alert-soft alert-<severidad>` en daisyUI v5; un panel neutro con icono de color en v4, que no tiene `alert-soft`',
              },
            ],
            [
              { en: 'Notification actions', es: 'Acciones de notification' },
              {
                en: '`variant`: `primary` · `ghost` (default) · `outline` · `soft`',
                es: '`variant`: `primary` · `ghost` (por defecto) · `outline` · `soft`',
              },
              {
                en: '`btn-primary` · `btn-ghost` · `btn-outline` · `btn-soft`',
                es: '`btn-primary` · `btn-ghost` · `btn-outline` · `btn-soft`',
              },
            ],
            [
              { en: '[Input](/input)', es: '[Input](/input)' },
              {
                en: '`variant`: `text` · `currency` · `phone` · `percentage` · `password`',
                es: '`variant`: `text` · `currency` · `phone` · `percentage` · `password`',
              },
              {
                en: 'Behavior, not looks: formatting, parsing and the right keyboard (`inputmode`)',
                es: 'Comportamiento, no aspecto: formato, interpretación del valor y el teclado correcto (`inputmode`)',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Soft (`*-soft`) is the muted style for things that sit inside a page without demanding attention: notifications, quiet toasts, secondary actions. Outline is used for secondary buttons that pair with a primary one, such as the toast’s default action button.',
            es: 'Soft (`*-soft`) es el estilo atenuado para cosas que viven dentro de la página sin pedir atención: notificaciones, toasts discretos, acciones secundarias. Outline se usa para botones secundarios que acompañan a uno principal, como el botón de acción por defecto del toast.',
          },
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Soft variants (`alert-soft`, `btn-soft`) exist only in daisyUI v5. If you build your own badges or chips next to library components, the tinted pattern `bg-<color>/10 border-<color>/20 text-<color>` reads as soft on both versions; check its contrast in each theme.',
            es: 'Las variantes soft (`alert-soft`, `btn-soft`) solo existen en daisyUI v5. Si haces tus propios badges o chips junto a componentes de la librería, el patrón teñido `bg-<color>/10 border-<color>/20 text-<color>` se ve soft en ambas versiones; revisa su contraste en cada tema.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'colors', note: { en: 'The `color` inputs and status colors.', es: 'Los inputs `color` y los colores de estado.' } },
    { id: 'input', note: { en: 'Size, color and variant in context.', es: 'Tamaño, color y variante en contexto.' } },
    { id: 'theming', note: { en: 'Theme variables that set the base size.', es: 'Variables de tema que definen el tamaño base.' } },
  ],
};

export default content;
