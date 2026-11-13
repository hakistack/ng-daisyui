import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'The goal is that every component can be used with a keyboard alone, announces itself correctly to screen readers, and respects users who ask for less motion. The library targets WCAG 2.1 AA; this page explains what the components already do and what remains your responsibility.',
      es: 'La meta es que cada componente se pueda usar solo con el teclado, se anuncie correctamente a los lectores de pantalla y respete a quienes piden menos movimiento. La librería apunta a WCAG 2.1 AA; esta página explica lo que los componentes ya hacen y lo que sigue siendo tu responsabilidad.',
    },
  ],
  sections: [
    {
      id: 'roles-and-patterns',
      heading: { en: 'ARIA patterns by component', es: 'Patrones ARIA por componente' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Interactive components follow the matching WAI-ARIA pattern, so assistive technology knows what the widget is and how to operate it.',
            es: 'Los componentes interactivos siguen el patrón WAI-ARIA correspondiente, para que la tecnología asistiva sepa qué es el widget y cómo operarlo.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Component', es: 'Componente' },
            { en: 'Pattern', es: 'Patrón' },
          ],
          rows: [
            [
              { en: '[Select](/select)', es: '[Select](/select)' },
              {
                en: '`combobox` + `listbox`, active option exposed with `aria-activedescendant`, `aria-multiselectable` in multi mode',
                es: '`combobox` + `listbox`, opción activa expuesta con `aria-activedescendant`, `aria-multiselectable` en modo múltiple',
              },
            ],
            [
              { en: '[DataGrid](/datagrid)', es: '[DataGrid](/datagrid)' },
              {
                en: '`grid` with `row` / `columnheader` / `gridcell`, `aria-sort`, `aria-colcount`, focus kept on the grid with `aria-activedescendant`',
                es: '`grid` con `row` / `columnheader` / `gridcell`, `aria-sort`, `aria-colcount`, foco en la grilla con `aria-activedescendant`',
              },
            ],
            [
              { en: '[Tabs](/tabs)', es: '[Tabs](/tabs)' },
              {
                en: 'Built on `@angular/aria` tabs: `tablist`, `tab`, `tabpanel`',
                es: 'Construido sobre los tabs de `@angular/aria`: `tablist`, `tab`, `tabpanel`',
              },
            ],
            [
              { en: '[Tree](/tree)', es: '[Tree](/tree)' },
              {
                en: '`treeitem` with `aria-expanded` and `aria-selected`; arrow keys, Home and End',
                es: '`treeitem` con `aria-expanded` y `aria-selected`; flechas, Home y End',
              },
            ],
            [
              { en: '[Menu](/menu)', es: '[Menu](/menu)' },
              {
                en: '`menu` / `menubar` with `menuitem` and `aria-expanded` on submenus',
                es: '`menu` / `menubar` con `menuitem` y `aria-expanded` en submenús',
              },
            ],
            [
              { en: '[Datepicker](/datepicker), [Timepicker](/timepicker)', es: '[Datepicker](/datepicker), [Timepicker](/timepicker)' },
              {
                en: 'Popup as `dialog`; calendar as `grid`; time choices as `radiogroup`',
                es: 'Popup como `dialog`; calendario como `grid`; opciones de hora como `radiogroup`',
              },
            ],
            [
              { en: '[Toast](/toast), [Notification](/notification)', es: '[Toast](/toast), [Notification](/notification)' },
              {
                en: 'Live regions: auto-dismissing toasts are `assertive`, sticky toasts `polite`',
                es: 'Regiones live: los toasts que se cierran solos son `assertive`, los fijos `polite`',
              },
            ],
            [
              { en: '[Alert](/alert)', es: '[Alert](/alert)' },
              {
                en: '`dialog` with `aria-modal`; loading state marked `aria-busy`',
                es: '`dialog` con `aria-modal`; estado de carga marcado con `aria-busy`',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'focus',
      heading: { en: 'Focus management', es: 'Manejo del foco' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Modal surfaces trap focus.** The Alert overlay, the DataGrid column menu and the app-shell drawer (while open as an overlay) use the CDK focus trap. Dialogs opened with [DialogService](/api/DialogService) use the CDK dialog, which traps focus too.',
              es: '**Las superficies modales atrapan el foco.** El overlay de Alert, el menú de columna del DataGrid y el drawer del app shell (mientras está abierto como overlay) usan el focus trap de CDK. Los diálogos abiertos con [DialogService](/api/DialogService) usan el diálogo de CDK, que también atrapa el foco.',
            },
            {
              en: '**Focus returns where it came from.** The Alert overlay restores focus to the previously focused element when it closes; the Datepicker returns focus to its input.',
              es: '**El foco vuelve a donde estaba.** El overlay de Alert devuelve el foco al elemento que lo tenía antes al cerrarse; el Datepicker lo devuelve a su input.',
            },
            {
              en: '**Notifications do not steal focus.** A notification only focuses its first action when you pass `autoFocus: true`.',
              es: '**Las notificaciones no roban el foco.** Una notificación solo enfoca su primera acción si pasas `autoFocus: true`.',
            },
          ],
        },
      ],
    },
    {
      id: 'keyboard',
      heading: { en: 'Keyboard support', es: 'Soporte de teclado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each component page lists its keys. As an example of the depth involved, the DataGrid keyboard model:',
            es: 'Cada página de componente lista sus teclas. Como ejemplo del nivel de detalle, el modelo de teclado del DataGrid:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Keys', es: 'Teclas' },
            { en: 'Action', es: 'Acción' },
          ],
          rows: [
            [
              { en: 'Arrow keys', es: 'Flechas' },
              { en: 'Move the active cell (Ctrl/Cmd jumps to the edge)', es: 'Mueven la celda activa (Ctrl/Cmd salta al borde)' },
            ],
            [
              { en: 'Home / End, PageUp / PageDown', es: 'Home / End, PageUp / PageDown' },
              { en: 'First / last column; one screen up or down', es: 'Primera / última columna; una pantalla arriba o abajo' },
            ],
            [
              { en: 'Shift + arrows, Ctrl/Cmd + A, Escape', es: 'Shift + flechas, Ctrl/Cmd + A, Escape' },
              { en: 'Extend, select all, or clear a cell range', es: 'Extender, seleccionar todo o limpiar un rango de celdas' },
            ],
            [
              { en: 'Enter / Space on a header', es: 'Enter / Espacio en un encabezado' },
              { en: 'Sort (Shift adds a sort key)', es: 'Ordenar (Shift añade una clave de orden)' },
            ],
            [
              { en: 'Space on a row', es: 'Espacio en una fila' },
              { en: 'Toggle selection when selection is enabled', es: 'Alterna la selección cuando está habilitada' },
            ],
            [
              { en: 'Alt + ArrowDown, Shift + F10, ContextMenu', es: 'Alt + Flecha abajo, Shift + F10, ContextMenu' },
              { en: 'Open the column menu', es: 'Abre el menú de columna' },
            ],
            [
              { en: 'Alt + ArrowLeft / ArrowRight', es: 'Alt + Flecha izquierda / derecha' },
              { en: 'Resize the column', es: 'Cambia el ancho de la columna' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'hk-table keyboard navigation is opt-in: set `enableKeyboardNavigation: true` in [createTable](/api/createTable).',
            es: 'La navegación con teclado de hk-table es opcional: activa `enableKeyboardNavigation: true` en [createTable](/api/createTable).',
          },
        },
      ],
    },
    {
      id: 'reduced-motion',
      heading: { en: 'Reduced motion', es: 'Movimiento reducido' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When the user enables `prefers-reduced-motion`, the [motion directives](/motion) step aside: hover, press and scroll animations do nothing, and `hkAnimate` jumps straight to its final opacity. Toast, select, stepper, menu, command palette and DataGrid stylesheets also disable their transitions under the same media query.',
            es: 'Cuando el usuario activa `prefers-reduced-motion`, las [directivas de animación](/motion) se hacen a un lado: las animaciones de hover, pulsación y scroll no hacen nada, y `hkAnimate` salta directo a su opacidad final. Las hojas de estilo de toast, select, stepper, menú, command palette y DataGrid también desactivan sus transiciones con la misma media query.',
          },
        },
      ],
    },
    {
      id: 'your-part',
      heading: { en: 'What stays on you', es: 'Lo que sigue siendo tu responsabilidad' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Accessible names.** Give grids and tables a name (`ariaLabel` in [createDataGrid](/api/createDataGrid)), give icon-only buttons an `aria-label`, and give every input a visible label. [InputComponent](/api/InputComponent) accepts `ariaLabel` when a visible label is not possible.',
              es: '**Nombres accesibles.** Dale nombre a grillas y tablas (`ariaLabel` en [createDataGrid](/api/createDataGrid)), dale `aria-label` a los botones que solo tienen icono y ponle una etiqueta visible a cada input. [InputComponent](/api/InputComponent) acepta `ariaLabel` cuando no es posible una etiqueta visible.',
            },
            {
              en: '**Contrast.** Components use theme tokens; if your custom theme pairs a color with a low-contrast `*-content`, the components inherit the problem.',
              es: '**Contraste.** Los componentes usan los tokens del tema; si tu tema personalizado combina un color con un `*-content` de bajo contraste, los componentes heredan el problema.',
            },
            {
              en: '**Do not wrap `hk-select` in a `<label>`.** The label forwards the click to the control, so one click toggles the dropdown open and closed. Use a non-wrapping label or a heading.',
              es: '**No envuelvas `hk-select` en un `<label>`.** El label reenvía el clic al control, así que un clic abre y cierra el desplegable. Usa un label que no envuelva o un encabezado.',
            },
            {
              en: '**Translate the hidden strings too.** Several `aria-label` defaults are English. Override them through the labels providers described in [Internationalization](/foundations/i18n).',
              es: '**Traduce también los textos ocultos.** Varios `aria-label` por defecto están en inglés. Reemplázalos con los proveedores de labels descritos en [Internacionalización](/foundations/i18n).',
            },
            {
              en: '**HTML in cell formatters.** If a table `format` function returns markup, make sure that markup is accessible (for example, do not convey status with color alone).',
              es: '**HTML en formateadores de celdas.** Si una función `format` de la tabla devuelve markup, asegúrate de que sea accesible (por ejemplo, no comuniques el estado solo con color).',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Run axe on your own pages. The repository runs `@axe-core/playwright` in its end-to-end tests for the document and PDF workspaces; the same tool works for consumer apps.',
            es: 'Corre axe en tus propias páginas. El repositorio usa `@axe-core/playwright` en sus pruebas end-to-end de los workspaces de documentos y PDF; la misma herramienta sirve para apps consumidoras.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'i18n', note: { en: 'Translate visible text and aria-labels.', es: 'Traduce textos visibles y aria-labels.' } },
    { id: 'motion', note: { en: 'Directives that honor reduced motion.', es: 'Directivas que respetan el movimiento reducido.' } },
    { id: 'theming', note: { en: 'Contrast comes from your theme.', es: 'El contraste viene de tu tema.' } },
  ],
};

export default content;
