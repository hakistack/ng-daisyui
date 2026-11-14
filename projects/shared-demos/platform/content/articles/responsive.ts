import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Components adapt in three ways: some switch layout at Tailwind breakpoints (the app shell, forms), some react to their own width rather than the screen’s (the PDF and document workspaces), and data-heavy ones keep their size and scroll inside themselves (tables and grids).',
      es: 'Los componentes se adaptan de tres formas: algunos cambian de diseño en los breakpoints de Tailwind (el app shell, los formularios), otros reaccionan a su propio ancho y no al de la pantalla (los workspaces de PDF y documentos), y los que manejan muchos datos mantienen su tamaño y hacen scroll por dentro (tablas y grids).',
    },
    {
      en: 'This page lists what each one does on small screens and touch devices, and what is left to you.',
      es: 'Esta página lista qué hace cada uno en pantallas pequeñas y dispositivos táctiles, y qué queda de tu lado.',
    },
  ],
  sections: [
    {
      id: 'breakpoints',
      heading: { en: 'Breakpoints', es: 'Breakpoints' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Responsive classes inside components are plain Tailwind prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`). Your Tailwind build generates them, so they use your breakpoints: the defaults are `sm` 40rem (640px), `md` 48rem (768px), `lg` 64rem (1024px), `xl` 80rem (1280px) and `2xl` 96rem (1536px). If you redefine `--breakpoint-*` in `@theme`, the components follow.',
            es: 'Las clases responsive dentro de los componentes son prefijos normales de Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`). Las genera tu build de Tailwind, así que usan tus breakpoints: los valores por defecto son `sm` 40rem (640px), `md` 48rem (768px), `lg` 64rem (1024px), `xl` 80rem (1280px) y `2xl` 96rem (1536px). Si redefines `--breakpoint-*` en `@theme`, los componentes los siguen.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Component', es: 'Componente' },
            { en: 'Measures', es: 'Mide' },
            { en: 'What changes', es: 'Qué cambia' },
          ],
          rows: [
            [
              { en: '[App shell](/app-shell)', es: '[App shell](/app-shell)' },
              { en: 'Viewport; `responsiveBreakpoint` (default `lg`)', es: 'Viewport; `responsiveBreakpoint` (por defecto `lg`)' },
              {
                en: 'Sidebar permanent at and above it, drawer below it',
                es: 'Sidebar fijo desde ese punto, drawer por debajo',
              },
            ],
            [
              { en: 'Navbar (`hk-navbar`)', es: 'Navbar (`hk-navbar`)' },
              {
                en: 'Viewport; `menuToggleBreakpoint` (default `lg`, or `never`)',
                es: 'Viewport; `menuToggleBreakpoint` (por defecto `lg`, o `never`)',
              },
              {
                en: 'Hamburger below it; the center menu appears at and above it',
                es: 'Hamburguesa por debajo; el menú central aparece desde ese punto',
              },
            ],
            [
              { en: '[Forms](/forms)', es: '[Forms](/forms)' },
              { en: 'Viewport', es: 'Viewport' },
              {
                en: 'Grid columns collapse to one below `md`; field `width` fractions become full width below `md`',
                es: 'Las columnas del grid se reducen a una por debajo de `md`; las fracciones de `width` pasan a ancho completo por debajo de `md`',
              },
            ],
            [
              { en: '[Table](/table) pagination', es: 'Paginación de [Table](/table)' },
              { en: 'Viewport', es: 'Viewport' },
              { en: 'Summary and page buttons stack below `sm`', es: 'El resumen y los botones de página se apilan por debajo de `sm`' },
            ],
            [
              { en: '[PDF viewer](/pdf-viewer) toolbar', es: 'Barra del [PDF viewer](/pdf-viewer)' },
              { en: 'Its own width (container queries)', es: 'Su propio ancho (container queries)' },
              {
                en: 'Less-used buttons move into the ⋯ overflow menu as the toolbar narrows',
                es: 'Los botones menos usados pasan al menú ⋯ a medida que la barra se estrecha',
              },
            ],
            [
              {
                en: '[PDF](/pdf-viewer) and [document](/document-viewer) workspaces',
                es: 'Workspaces de [PDF](/pdf-viewer) y [documentos](/document-viewer)',
              },
              { en: 'Their own width (`ResizeObserver`)', es: 'Su propio ancho (`ResizeObserver`)' },
              {
                en: 'Below 1100px the details panel folds under the main column; below 720px the page rail folds into a disclosure above it',
                es: 'Por debajo de 1100px el panel de detalles se pliega debajo de la columna principal; por debajo de 720px el riel de páginas se pliega en un desplegable encima',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Measuring the component instead of the screen matters when a viewer sits in a side column of a wide page: it reflows for the space it actually has. Nothing is hidden in the folded modes; panels only move.',
            es: 'Medir el componente en lugar de la pantalla importa cuando un visor está en una columna lateral de una página ancha: se reacomoda según el espacio que realmente tiene. En los modos plegados no se oculta nada; los paneles solo se mueven.',
          },
        },
      ],
    },
    {
      id: 'shell-and-drawer',
      heading: { en: 'App shell and drawer on mobile', es: 'App shell y drawer en móvil' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '[AppShellComponent](/api/AppShellComponent) is a daisyUI drawer. In the default `push` mode the sidebar is part of the layout from `responsiveBreakpoint` up; below it the sidebar slides over the content and the navbar shows a hamburger button. In `overlay` mode the sidebar always slides over the content and the hamburger is always visible.',
            es: '[AppShellComponent](/api/AppShellComponent) es un drawer de daisyUI. En el modo `push` por defecto, el sidebar forma parte del diseño desde `responsiveBreakpoint` hacia arriba; por debajo, el sidebar se desliza sobre el contenido y la navbar muestra un botón de hamburguesa. En modo `overlay` el sidebar siempre se desliza sobre el contenido y la hamburguesa siempre está visible.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The open drawer closes on the backdrop, on `Escape`, and after a sidebar item is selected (so navigation does not leave it covering the new page).',
              es: 'El drawer abierto se cierra con el fondo, con `Escape` y después de seleccionar un ítem del sidebar (así la navegación no lo deja tapando la página nueva).',
            },
            {
              en: '`drawerOpen` is a two-way `model()`; bind `[(drawerOpen)]` to open it from your own button.',
              es: '`drawerOpen` es un `model()` bidireccional; enlaza `[(drawerOpen)]` para abrirlo desde tu propio botón.',
            },
            {
              en: 'While the drawer is open over the page, focus is trapped inside it: in `overlay` mode at every size, and in `push` mode below the breakpoint. The hamburger reports the state with `aria-expanded` and points at the drawer with `aria-controls`.',
              es: 'Mientras el drawer está abierto sobre la página, el foco queda atrapado dentro de él: en modo `overlay` en todos los tamaños, y en modo `push` por debajo del breakpoint. La hamburguesa informa el estado con `aria-expanded` y apunta al drawer con `aria-controls`.',
            },
            {
              en: 'The collapsed icon rail (`collapsible` in [SidebarConfig](/api/SidebarConfig), 4rem wide) is independent of the breakpoint.',
              es: 'El riel de iconos plegado (`collapsible` en [SidebarConfig](/api/SidebarConfig), 4rem de ancho) es independiente del breakpoint.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'shell config',
          code: `import { ShellConfig } from '@hakistack/ng-daisyui';

readonly shell: ShellConfig = {
  responsiveBreakpoint: 'md', // permanent sidebar from 768px up
  sidebar: { collapsible: true, menu: { items: this.items } },
};`,
        },
      ],
    },
    {
      id: 'forms',
      heading: { en: 'Forms on narrow screens', es: 'Formularios en pantallas estrechas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'In `grid` layout, `gridColumns` picks a responsive column set rather than a fixed count. For example `2` is one column below `md` and two from `md` up; `12` is one column, then 3 (`md`), 4 (`lg`), 6 (`xl`) and 12 (`2xl`). A field without `colSpan` spans the full row. `colSpan` classes are applied as given, so keep each span within the column count active at that breakpoint, using the responsive form ([ResponsiveColSpan](/api/ResponsiveColSpan)) when needed.',
            es: 'En el diseño `grid`, `gridColumns` escoge un conjunto de columnas responsive y no un número fijo. Por ejemplo `2` es una columna por debajo de `md` y dos desde `md`; `12` es una columna, luego 3 (`md`), 4 (`lg`), 6 (`xl`) y 12 (`2xl`). Un campo sin `colSpan` ocupa la fila completa. Las clases de `colSpan` se aplican tal cual, así que mantén cada span dentro del número de columnas activo en ese breakpoint, usando la forma responsive ([ResponsiveColSpan](/api/ResponsiveColSpan)) cuando haga falta.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'The `horizontal` layout keeps labels to the left at every width (`labelWidth` is a fixed fraction). On phones that squeezes the inputs; switch the form to `vertical` below a breakpoint of your choice.',
            es: 'El diseño `horizontal` mantiene las etiquetas a la izquierda en todos los anchos (`labelWidth` es una fracción fija). En teléfonos eso aprieta los inputs; cambia el formulario a `vertical` por debajo del breakpoint que prefieras.',
          },
        },
      ],
    },
    {
      id: 'tables-and-grids',
      heading: { en: 'Tables and grids', es: 'Tablas y grids' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Tabular data does not reflow into cards. Both table components keep their columns and scroll horizontally inside themselves when the screen is narrower than the columns.',
            es: 'Los datos tabulares no se reacomodan en tarjetas. Ambos componentes de tabla mantienen sus columnas y hacen scroll horizontal por dentro cuando la pantalla es más estrecha que las columnas.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Aspect', es: 'Aspecto' },
            { en: '[Table](/table)', es: '[Table](/table)' },
            { en: '[DataGrid](/datagrid)', es: '[DataGrid](/datagrid)' },
          ],
          rows: [
            [
              { en: 'Horizontal overflow', es: 'Desbordamiento horizontal' },
              { en: 'Wrapper with `overflow-x-auto`', es: 'Contenedor con `overflow-x-auto`' },
              {
                en: 'Own scroll viewport; header stays on top, selection column pinned left',
                es: 'Viewport de scroll propio; el encabezado queda arriba y la columna de selección fija a la izquierda',
              },
            ],
            [
              { en: 'Virtualization', es: 'Virtualización' },
              {
                en: 'Opt-in rows: `virtualScroll` ([VirtualScrollConfig](/api/VirtualScrollConfig)) with `itemHeight` and `viewportHeight`',
                es: 'Filas opcionales: `virtualScroll` ([VirtualScrollConfig](/api/VirtualScrollConfig)) con `itemHeight` y `viewportHeight`',
              },
              {
                en: 'Always on for rows and columns (6 extra rows and 2 extra columns rendered around the visible area)',
                es: 'Siempre activa para filas y columnas (se dibujan 6 filas y 2 columnas extra alrededor del área visible)',
              },
            ],
            [
              { en: 'Height', es: 'Altura' },
              { en: 'Grows with rows unless virtualized', es: 'Crece con las filas salvo que esté virtualizada' },
              {
                en: '`height` input, default `480px`; fixed `rowHeight` (default 36px)',
                es: 'Input `height`, por defecto `480px`; `rowHeight` fijo (por defecto 36px)',
              },
            ],
            [
              { en: 'Resizing the container', es: 'Cambiar el tamaño del contenedor' },
              { en: 'Native table layout', es: 'Diseño nativo de tabla' },
              {
                en: 'Re-measured with `ResizeObserver`; the visible range updates',
                es: 'Se vuelve a medir con `ResizeObserver`; el rango visible se actualiza',
              },
            ],
          ],
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Virtualization depends on a fixed row height. Keep cell content on one line (truncate) instead of letting it wrap on narrow screens.',
              es: 'La virtualización depende de una altura de fila fija. Mantén el contenido de las celdas en una línea (trúncalo) en vez de dejar que se parta en pantallas estrechas.',
            },
            {
              en: 'Give the DataGrid a height that fits a phone, for example a `vh` value, so the page itself does not need two scroll areas.',
              es: 'Dale al DataGrid una altura que quepa en un teléfono, por ejemplo un valor en `vh`, para que la página no necesite dos áreas de scroll.',
            },
            {
              en: 'On small screens, show fewer columns: hide the less important ones through the column menu or the grid state.',
              es: 'En pantallas pequeñas, muestra menos columnas: oculta las menos importantes con el menú de columnas o con el estado del grid.',
            },
          ],
        },
      ],
    },
    {
      id: 'overlays',
      heading: { en: 'Dropdowns, pickers and messages', es: 'Desplegables, pickers y mensajes' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '[Select](/select), [Datepicker](/datepicker) and [Timepicker](/timepicker) open in a CDK connected overlay that flips and pushes the panel to stay on screen. The select panel is capped at `25rem` high.',
              es: '[Select](/select), [Datepicker](/datepicker) y [Timepicker](/timepicker) se abren en un overlay conectado de CDK que voltea y empuja el panel para que quede en pantalla. El panel del select tiene un alto máximo de `25rem`.',
            },
            {
              en: 'Alerts are capped by their `size` (`max-w-*`); `full` is `w-11/12`, so they never touch the screen edges.',
              es: 'Los alerts están limitados por su `size` (`max-w-*`); `full` es `w-11/12`, así que nunca tocan los bordes de la pantalla.',
            },
            {
              en: 'Notifications stack in a column that is `w-full max-w-md`.',
              es: 'Las notificaciones se apilan en una columna `w-full max-w-md`.',
            },
            {
              en: 'Toasts sit 1rem from the screen edge with a `min-width` of `min(320px, 100vw - 2rem)`, so on phones narrower than about 336px they shrink to fit instead of overflowing.',
              es: 'Los toasts quedan a 1rem del borde de la pantalla con un `min-width` de `min(320px, 100vw - 2rem)`, así que en teléfonos de menos de unos 336px se encogen para caber en vez de desbordarse.',
            },
          ],
        },
      ],
    },
    {
      id: 'touch',
      heading: { en: 'Touch support', es: 'Soporte táctil' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Interactions are built on pointer events, so mouse, pen and touch share one code path. Where a gesture needs special handling:',
            es: 'Las interacciones están hechas con pointer events, así que mouse, lápiz y táctil comparten el mismo camino. Donde un gesto necesita manejo especial:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Where', es: 'Dónde' },
            { en: 'Behavior', es: 'Comportamiento' },
          ],
          rows: [
            [
              { en: '[PDF viewer](/pdf-viewer)', es: '[PDF viewer](/pdf-viewer)' },
              {
                en: 'Two-finger pinch zooms the document, not the page; one-finger panning stays native (`touch-action: pan-x pan-y`). The scroll area is capped at `75vh` outside fullscreen.',
                es: 'Pellizcar con dos dedos hace zoom en el documento, no en la página; el desplazamiento con un dedo sigue siendo nativo (`touch-action: pan-x pan-y`). El área de scroll tiene un máximo de `75vh` fuera de pantalla completa.',
              },
            ],
            [
              { en: '[Timepicker](/timepicker) clock', es: 'Reloj del [Timepicker](/timepicker)' },
              {
                en: 'Drag on the 256px dial to pick a value; the dial disables browser panning while you drag.',
                es: 'Arrastra sobre el dial de 256px para escoger un valor; el dial desactiva el desplazamiento del navegador mientras arrastras.',
              },
            ],
            [
              { en: '[DataGrid](/datagrid)', es: '[DataGrid](/datagrid)' },
              {
                en: 'Pointer drag selects a cell range. Column resize handles are 8px wide; `Alt + ArrowLeft / ArrowRight` resizes from the keyboard.',
                es: 'Arrastrar con el puntero selecciona un rango de celdas. Las asas para cambiar el ancho de columna miden 8px; `Alt + Flecha izquierda / derecha` lo cambia desde el teclado.',
              },
            ],
            [
              { en: '[Table](/table)', es: '[Table](/table)' },
              {
                en: 'With `enableColumnResizing`, the resize handles are 4px wide, which is hard to hit with a finger; on touch-first screens set `columnWidths` in the config instead.',
                es: 'Con `enableColumnResizing`, las asas para cambiar el ancho miden 4px, difíciles de tocar con el dedo; en pantallas pensadas para táctil define `columnWidths` en la configuración.',
              },
            ],
            [
              { en: '[Motion](/motion) directives', es: 'Directivas de [Motion](/motion)' },
              {
                en: '`hkHover` ignores touch pointers, so hover effects never fire on phones. `hkPress` works with touch.',
                es: '`hkHover` ignora los punteros táctiles, así que los efectos hover nunca se activan en teléfonos. `hkPress` funciona con táctil.',
              },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Do not put information or actions only behind hover. Anything revealed on hover must also be reachable by tap and by keyboard focus.',
            es: 'No pongas información ni acciones solo detrás de un hover. Todo lo que aparece con hover también debe poder alcanzarse con un toque y con el foco del teclado.',
          },
        },
      ],
    },
    {
      id: 'what-to-test',
      heading: { en: 'What to test', es: 'Qué probar' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**320px wide and 200% zoom.** WCAG reflow: content should not need two-way scrolling, except inside tables and grids.',
              es: '**320px de ancho y 200% de zoom.** Reflow de WCAG: el contenido no debe necesitar scroll en dos direcciones, salvo dentro de tablas y grids.',
            },
            {
              en: '**Just below and just above your shell breakpoint.** Open the drawer, navigate, press `Escape`, and check where focus lands.',
              es: '**Justo por debajo y justo por encima del breakpoint de tu shell.** Abre el drawer, navega, presiona `Escape` y revisa dónde queda el foco.',
            },
            {
              en: '**Viewers in their real container.** A workspace in a 700px column folds even on a wide monitor.',
              es: '**Los visores en su contenedor real.** Un workspace en una columna de 700px se pliega incluso en un monitor ancho.',
            },
            {
              en: '**A real touch device.** Pinch-zoom in the PDF viewer, drag the timepicker dial, scroll a grid sideways, open every dropdown near the screen edge.',
              es: '**Un dispositivo táctil real.** Haz zoom con pellizco en el PDF viewer, arrastra el dial del timepicker, desplaza un grid hacia el lado, abre cada desplegable cerca del borde de la pantalla.',
            },
            {
              en: '**Landscape phones.** Short viewports are where fixed heights (`480px` grids, `75vh` viewers) and overlays run out of room.',
              es: '**Teléfonos en horizontal.** Los viewports bajos son donde las alturas fijas (grids de `480px`, visores de `75vh`) y los overlays se quedan sin espacio.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'app-shell', note: { en: 'Navbar, sidebar and drawer in detail.', es: 'Navbar, sidebar y drawer en detalle.' } },
    { id: 'guide-large-datasets', note: { en: 'Which grid to pick and why.', es: 'Qué grid escoger y por qué.' } },
    { id: 'accessibility', note: { en: 'Keyboard and focus behavior.', es: 'Comportamiento de teclado y foco.' } },
    { id: 'motion', note: { en: 'Hover and press on touch screens.', es: 'Hover y press en pantallas táctiles.' } },
  ],
};

export default content;
