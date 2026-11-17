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
            es: 'Los componentes interactivos siguen el patrón WAI-ARIA correspondiente, para que las tecnologías de asistencia sepan qué es el widget y cómo operarlo.',
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
                en: '`grid` with `row` / `columnheader` / `gridcell`, `aria-sort`, `aria-rowcount` / `aria-colcount`, focus kept on the grid with `aria-activedescendant`',
                es: '`grid` con `row` / `columnheader` / `gridcell`, `aria-sort`, `aria-rowcount` / `aria-colcount`, el foco se queda en el grid con `aria-activedescendant`',
              },
            ],
            [
              { en: '[Tabs](/tabs)', es: '[Tabs](/tabs)' },
              {
                en: 'Built on `@angular/aria` tabs: `tablist`, `tab`, `tabpanel`',
                es: 'Construido sobre las pestañas de `@angular/aria`: `tablist`, `tab`, `tabpanel`',
              },
            ],
            [
              { en: '[Tree](/tree)', es: '[Tree](/tree)' },
              {
                en: '`tree` / `treeitem` with `aria-level`, `aria-expanded` and `aria-selected`; arrow keys, Home and End',
                es: '`tree` / `treeitem` con `aria-level`, `aria-expanded` y `aria-selected`; flechas, Home y End',
              },
            ],
            [
              { en: '[Menu](/menu)', es: '[Menu](/menu)' },
              {
                en: 'Links-only menus are navigation lists (Tab between links, `aria-current="page"`); menus with actions are `menu` / `menubar` with `menuitem`, one Tab stop and arrow keys, and `aria-haspopup` / `aria-expanded` on submenus',
                es: 'Los menús de solo enlaces son listas de navegación (Tab entre enlaces, `aria-current="page"`); los menús con acciones son `menu` / `menubar` con `menuitem`, una sola parada de Tab y flechas, y `aria-haspopup` / `aria-expanded` en los submenús',
              },
            ],
            [
              { en: '[Datepicker](/datepicker), [Timepicker](/timepicker)', es: '[Datepicker](/datepicker), [Timepicker](/timepicker)' },
              {
                en: 'Popup as a modal `dialog`; calendar as `grid`; time choices as `radiogroup` / `radio`',
                es: 'Ventana emergente como `dialog` modal; calendario como `grid`; opciones de hora como `radiogroup` / `radio`',
              },
            ],
            [
              { en: '[Toast](/toast), [Notification](/notification)', es: '[Toast](/toast), [Notification](/notification)' },
              {
                en: 'Toasts are announced through the CDK `LiveAnnouncer` (errors `assertive`, the rest `polite`) with a severity word first; the notification host is a single `polite` region',
                es: 'Los toasts se anuncian con el `LiveAnnouncer` de la CDK (los errores como `assertive`, el resto como `polite`) con una palabra de severidad delante; el host de notificaciones es una única región `polite`',
              },
            ],
            [
              { en: '[Alert](/alert)', es: '[Alert](/alert)' },
              {
                en: '`dialog` with `aria-modal`; loading state marked `aria-busy`',
                es: '`dialog` con `aria-modal`; el estado de carga se marca con `aria-busy`',
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
              en: '**Modal surfaces trap focus.** The Alert overlay, the DataGrid column menu and the app-shell drawer (while it is open over the page: `overlay` mode, or `push` mode below the breakpoint) use the CDK focus trap. Dialogs opened with [DialogService](/api/DialogService) use the CDK dialog, which traps focus too.',
              es: '**Las superficies modales atrapan el foco.** El overlay de Alert, el menú de columna del DataGrid y el drawer del app shell (mientras está abierto sobre la página: modo `overlay`, o modo `push` por debajo del breakpoint) usan la trampa de foco del CDK. Los diálogos abiertos con [DialogService](/api/DialogService) usan el diálogo del CDK, que también atrapa el foco.',
            },
            {
              en: '**Focus returns where it came from.** The Alert overlay restores focus to the previously focused element when it closes; the Datepicker returns focus to its input.',
              es: '**El foco vuelve a donde estaba.** El overlay de Alert devuelve el foco al elemento que lo tenía antes al cerrarse; el Datepicker lo devuelve a su input.',
            },
            {
              en: '**Form fields describe their own state.** [Dynamic forms](/forms) set `aria-invalid` on a touched invalid field, point `aria-describedby` at its help text and error messages, render errors in a polite live region, and group radio options in a labelled `radiogroup`.',
              es: '**Los campos de formulario describen su propio estado.** Los [formularios dinámicos](/forms) ponen `aria-invalid` en un campo inválido que ya se tocó, apuntan `aria-describedby` a su texto de ayuda y a sus mensajes de error, muestran los errores en una región viva `polite` y agrupan las opciones de radio en un `radiogroup` con etiqueta.',
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
            es: 'La página de cada componente lista sus teclas. Como ejemplo del nivel de detalle, el modelo de teclado del DataGrid:',
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
              { en: 'Move the active cell (Ctrl/Cmd jumps to the edge)', es: 'Mueven la celda activa (con Ctrl/Cmd, salta al borde)' },
            ],
            [
              { en: 'Home / End, PageUp / PageDown', es: 'Home / End, PageUp / PageDown' },
              {
                en: 'First / last column (Ctrl/Cmd: first / last cell); one screen up or down',
                es: 'Primera / última columna (con Ctrl/Cmd: primera / última celda); una pantalla arriba o abajo',
              },
            ],
            [
              { en: 'Shift + arrows, Ctrl/Cmd + A, Escape', es: 'Shift + flechas, Ctrl/Cmd + A, Escape' },
              { en: 'Extend, select all, or clear a cell range', es: 'Extienden, seleccionan todo o quitan un rango de celdas' },
            ],
            [
              { en: 'Enter / Space on a header', es: 'Enter / Espacio en un encabezado' },
              { en: 'Sort (Shift adds a sort key)', es: 'Ordena (con Shift, añade una clave de orden)' },
            ],
            [
              { en: 'Space on a row', es: 'Espacio en una fila' },
              { en: 'Toggle selection when selection is enabled', es: 'Marca o desmarca la fila si la selección está habilitada' },
            ],
            [
              { en: 'Alt + ArrowDown, Shift + F10, ContextMenu', es: 'Alt + Flecha abajo, Shift + F10, ContextMenu' },
              { en: 'Open the column menu', es: 'Abre el menú de columna' },
            ],
            [
              { en: 'Alt + ArrowLeft / ArrowRight', es: 'Alt + Flecha izquierda / derecha' },
              { en: 'Resize the column (when resizable)', es: 'Cambia el ancho de la columna (si es redimensionable)' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'hk-table keyboard navigation is opt-in: set `enableKeyboardNavigation: true` in [createTable](/api/createTable).',
            es: 'En hk-table, la navegación con teclado hay que activarla: pon `enableKeyboardNavigation: true` en [createTable](/api/createTable).',
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
            en: 'When the user enables `prefers-reduced-motion`, the [motion directives](/motion) step aside: hover, press and scroll-linked animations are skipped (their outputs still report hovers, presses and scroll progress), `hkAnimate` sets only its final `opacity` instantly (transforms are not applied), and `animateSequence` jumps to its final state. The stylesheets of toast, notification, alert, select, stepper, menu, command palette, app shell, sidebar and DataGrid also tone down their transitions under the same media query.',
            es: 'Cuando el usuario activa `prefers-reduced-motion`, las [directivas de animación](/motion) se hacen a un lado: se omiten las animaciones de hover, pulsación y las ligadas al desplazamiento (sus salidas siguen reportando el hover, la pulsación y el progreso del scroll), `hkAnimate` aplica al instante solo su `opacity` final (las transformaciones no se aplican) y `animateSequence` salta a su estado final. Las hojas de estilo de toast, notificación, alert, select, stepper, menú, command palette, app shell, sidebar y DataGrid también reducen sus transiciones con la misma media query.',
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
              es: '**Nombres accesibles.** Dale nombre a los grids y tablas (`ariaLabel` en [createDataGrid](/api/createDataGrid)), ponle `aria-label` a los botones que solo tienen icono y una etiqueta visible a cada input. [InputComponent](/api/InputComponent) acepta `ariaLabel` cuando no es posible una etiqueta visible.',
            },
            {
              en: '**Associate external labels.** [Datepicker](/datepicker) and [Timepicker](/timepicker) take a `controlId` input that becomes the id of their inner input, so `<label for="…">` names it instead of the placeholder.',
              es: '**Asocia las etiquetas externas.** [Datepicker](/datepicker) y [Timepicker](/timepicker) aceptan un input `controlId` que se convierte en el id de su input interno, así `<label for="…">` le da nombre en lugar del placeholder.',
            },
            {
              en: '**Contrast.** Components use theme tokens; if your custom theme pairs a color with a low-contrast `*-content`, the components inherit the problem.',
              es: '**Contraste.** Los componentes usan los tokens del tema; si tu tema personalizado combina un color con un `*-content` de bajo contraste, los componentes heredan el problema.',
            },
            {
              en: '**Do not wrap `hk-select` in a `<label>`.** The label forwards the click to the control, so one click toggles the dropdown open and closed. Use a non-wrapping label or a heading.',
              es: '**No envuelvas `hk-select` en un `<label>`.** El label reenvía el clic al control, así que un solo clic abre y cierra el desplegable. Usa un label que no lo envuelva o un encabezado.',
            },
            {
              en: '**Translate the hidden strings too.** Several `aria-label` defaults are English. Override them through the labels providers described in [Internationalization](/foundations/i18n).',
              es: '**Traduce también los textos ocultos.** Varios `aria-label` por defecto están en inglés. Reemplázalos con los proveedores de etiquetas descritos en [Internacionalización](/foundations/i18n).',
            },
            {
              en: '**HTML in cell formatters.** If a table `format` function returns markup, make sure that markup is accessible (for example, do not convey status with color alone).',
              es: '**HTML en formateadores de celdas.** Si una función `format` de la tabla devuelve HTML, asegúrate de que sea accesible (por ejemplo, no comuniques el estado solo con color).',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Run axe on your own pages. The repository runs `@axe-core/playwright` in its end-to-end tests (docs site, document and PDF workspaces); the same tool works for your app.',
            es: 'Corre axe en tus propias páginas. El repositorio usa `@axe-core/playwright` en sus pruebas end-to-end (sitio de documentación, workspaces de documentos y PDF); la misma herramienta sirve para tu app.',
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
