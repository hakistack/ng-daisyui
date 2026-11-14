import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'These are the three pieces that frame an app. `hk-navbar` is the top bar, with slots for your logo, links and buttons. `hk-sidebar` is the side panel, with a vertical menu, a header, a footer and an optional button that shrinks it to icons only. `hk-app-shell` puts both together with your page in the middle.',
      es: 'Son las tres piezas que forman el marco de una app. `hk-navbar` es la barra superior, con espacios para tu logo, enlaces y botones. `hk-sidebar` es el panel lateral, con un menú vertical, un encabezado, un pie y un botón opcional que lo reduce a solo iconos. `hk-app-shell` junta las dos con tu página en el centro.',
    },
    {
      en: 'On large screens the shell keeps the sidebar always visible; on small screens it hides it and shows a hamburger button that slides it over the page. Picking a menu item or pressing Escape closes it again. Everything app-specific (brand, avatar, theme switch) is your own markup, projected into named slots.',
      es: 'En pantallas grandes el shell deja la barra lateral siempre visible; en pantallas pequeñas la oculta y muestra un botón de hamburguesa que la desliza sobre la página. Elegir un elemento del menú o pulsar Escape la vuelve a cerrar. Todo lo propio de tu app (marca, avatar, selector de tema) es tu propio HTML, proyectado en slots con nombre.',
    },
  ],
  whenToUse: [
    {
      en: 'Admin panels and dashboards with a permanent sidebar on desktop and a drawer on mobile: use `hk-app-shell`.',
      es: 'Paneles de administración y dashboards con barra lateral fija en escritorio y drawer en móvil: usa `hk-app-shell`.',
    },
    {
      en: 'Simple sites that only need a top bar with a horizontal menu and a hamburger: use `hk-navbar` alone.',
      es: 'Sitios sencillos que solo necesitan una barra superior con menú horizontal y hamburguesa: usa solo `hk-navbar`.',
    },
    {
      en: 'Your own layout that just needs the sidebar panel: `hk-sidebar` renders only the `<aside>`, so you can place it inside your own drawer.',
      es: 'Un layout propio que solo necesita el panel lateral: `hk-sidebar` genera únicamente el `<aside>`, así que puedes colocarlo dentro de tu propio drawer.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Only a list of links without the surrounding chrome: use [Menu](/menu) directly.',
      es: 'Si solo necesitas una lista de enlaces sin el marco alrededor: usa [Menú](/menu) directamente.',
    },
    {
      en: 'Switching sections inside one page: use [Tabs](/tabs).',
      es: 'Para cambiar de sección dentro de una página: usa [Pestañas](/tabs).',
    },
    {
      en: 'Layouts with two sidebars: the shell manages a single sidebar, on the start or the end side.',
      es: 'Layouts con dos barras laterales: el shell maneja una sola, del lado inicial o del final.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, SidebarConfig } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent, RouterOutlet],
  template: \`
    <hk-app-shell [navbar]="{ sticky: true }" [sidebar]="sidebar">
      <span hk-brand class="text-xl font-bold px-2">Acme</span>
      <button hk-navbar-end type="button" class="btn btn-ghost btn-sm">Profile</button>
      <div hk-sidebar-header class="p-4 font-semibold">Workspace</div>
      <div class="p-6">
        <router-outlet />
      </div>
    </hk-app-shell>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly sidebar: SidebarConfig = {
    collapsible: true,
    menu: {
      ariaLabel: 'Main menu',
      items: [
        { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
        { label: 'Reports', routerLink: '/reports', icon: 'chart-line' },
      ],
    },
  };
}
`,
    note: {
      en: 'Requires `provideRouter(...)` for the `routerLink` items and the outlet. Icon names must be registered with `provideLucideIcons(...)`; the hamburger and collapse icons are bundled by the library and need no registration.',
      es: 'Requiere `provideRouter(...)` para los elementos con `routerLink` y el outlet. Los nombres de iconos deben registrarse con `provideLucideIcons(...)`; los iconos de la hamburguesa y del botón de plegar vienen incluidos en la librería y no hay que registrarlos.',
    },
  },
  technical: [
    {
      id: 'composition',
      heading: { en: 'How the pieces fit together', es: 'Cómo encajan las piezas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`hk-app-shell` renders a DaisyUI `drawer`. A hidden `drawer-toggle` checkbox is bound to the `drawerOpen` model; the content side holds an `hk-navbar` (hamburger always enabled, `sticky` defaulting to `true`), a `<main>` with the default slot and an `[hk-footer]` slot; the side holds the overlay and an `hk-sidebar`. Both inner components also take a whole-config input, and any individual input overrides the matching config field.',
            es: '`hk-app-shell` genera un `drawer` de DaisyUI. Una casilla `drawer-toggle` oculta está enlazada al modelo `drawerOpen`; el lado del contenido tiene un `hk-navbar` (con la hamburguesa siempre habilitada y `sticky` en `true` por defecto), un `<main>` con el slot por defecto y un slot `[hk-footer]`; el lado lateral tiene el overlay y un `hk-sidebar`. Ambos componentes internos aceptan también un input con la configuración completa, y cualquier input individual tiene prioridad sobre el campo equivalente de la configuración.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Slot attribute', es: 'Atributo del slot' },
            { en: 'Where it renders', es: 'Dónde aparece' },
          ],
          rows: [
            [
              { en: '`hk-brand`', es: '`hk-brand`' },
              { en: 'Navbar start, after the hamburger', es: 'Inicio del navbar, después de la hamburguesa' },
            ],
            [
              { en: '`hk-navbar-center` / `hk-navbar-end`', es: '`hk-navbar-center` / `hk-navbar-end`' },
              { en: 'Navbar center / end', es: 'Centro / final del navbar' },
            ],
            [
              { en: '`hk-sidebar-header` / `hk-sidebar-footer`', es: '`hk-sidebar-header` / `hk-sidebar-footer`' },
              { en: 'Above / below the sidebar menu', es: 'Arriba / abajo del menú lateral' },
            ],
            [
              { en: '`hk-footer`', es: '`hk-footer`' },
              { en: 'Below `<main>`', es: 'Debajo de `<main>`' },
            ],
            [
              { en: '(default)', es: '(por defecto)' },
              { en: 'Inside `<main>`; usually your `<router-outlet>`', es: 'Dentro de `<main>`; normalmente, tu `<router-outlet>`' },
            ],
          ],
        },
      ],
    },
    {
      id: 'responsive',
      heading: { en: 'Push vs overlay, and breakpoints', es: 'Push frente a overlay, y breakpoints' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: "`mode: 'push'` (default) adds `{bp}:drawer-open`, so the sidebar is permanent from `responsiveBreakpoint` (default `'lg'`) up and the hamburger is hidden at that same breakpoint.",
              es: "`mode: 'push'` (por defecto) añade `{bp}:drawer-open`, así la barra lateral queda fija desde `responsiveBreakpoint` (por defecto `'lg'`) hacia arriba y la hamburguesa se oculta en ese mismo breakpoint.",
            },
            {
              en: "`mode: 'overlay'` never makes the sidebar permanent; the hamburger is visible at every width.",
              es: "`mode: 'overlay'` nunca deja la barra lateral fija; la hamburguesa se ve en todos los anchos.",
            },
            {
              en: "`side: 'end'` on the sidebar config maps to DaisyUI `drawer-end` and moves the border to the inner edge.",
              es: "`side: 'end'` en la configuración de la barra lateral se traduce a `drawer-end` de DaisyUI y mueve el borde al lado interior.",
            },
            {
              en: "Standalone `hk-navbar` uses `menuToggleBreakpoint` the same way: at that breakpoint the hamburger hides and the centre menu appears; `'never'` keeps the hamburger at all sizes.",
              es: "`hk-navbar` por separado usa `menuToggleBreakpoint` de la misma forma: en ese breakpoint la hamburguesa se oculta y aparece el menú central; `'never'` mantiene la hamburguesa en todos los tamaños.",
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: "Breakpoint classes come from maps with literal keys such as `'lg:drawer-open'`, so Tailwind's source scanning finds them. Switching between permanent and overlay is pure CSS; the only breakpoint check in code is a CDK `BreakpointObserver` (a media query, not a resize listener) that turns the focus trap on below the breakpoint in `push` mode.",
            es: "Las clases de breakpoint salen de mapas con claves literales como `'lg:drawer-open'`, para que el escaneo de Tailwind las encuentre. El cambio entre fijo y overlay es solo CSS; la única verificación de breakpoint en código es un `BreakpointObserver` del CDK (una media query, no un listener de `resize`) que activa la trampa de foco por debajo del breakpoint en modo `push`.",
          },
        },
      ],
    },
    {
      id: 'state',
      heading: { en: 'State and defaults', es: 'Estado y valores por defecto' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`[(drawerOpen)]` and `[(collapsed)]` are two-way models on the shell. Selecting a leaf menu item closes the drawer; `collapsed` is forwarded to the sidebar, which narrows to `4rem` and puts its `hk-menu` in rail mode.',
            es: '`[(drawerOpen)]` y `[(collapsed)]` son modelos bidireccionales del shell. Elegir un elemento final del menú cierra el drawer; `collapsed` pasa a la barra lateral, que se reduce a `4rem` y pone su `hk-menu` en modo riel.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Config', es: 'Config' },
            { en: 'Defaults', es: 'Valores por defecto' },
          ],
          rows: [
            [
              { en: '`NavbarConfig`', es: '`NavbarConfig`' },
              {
                en: "`sticky: false` (`true` inside the shell), `shadow: true`, `showMenuToggle: false`, `menuToggleBreakpoint: 'lg'`, `ariaLabel: 'Main'`",
                es: "`sticky: false` (`true` dentro del shell), `shadow: true`, `showMenuToggle: false`, `menuToggleBreakpoint: 'lg'`, `ariaLabel: 'Main'`",
              },
            ],
            [
              { en: '`SidebarConfig`', es: '`SidebarConfig`' },
              {
                en: "`collapsible: false`, `side: 'start'`, `width: '18rem'`, `ariaLabel: 'Sidebar'`",
                es: "`collapsible: false`, `side: 'start'`, `width: '18rem'`, `ariaLabel: 'Sidebar'`",
              },
            ],
            [
              { en: '`ShellConfig`', es: '`ShellConfig`' },
              { en: "`responsiveBreakpoint: 'lg'`, `mode: 'push'`", es: "`responsiveBreakpoint: 'lg'`, `mode: 'push'`" },
            ],
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      { keys: 'Escape', action: { en: 'Close the open drawer', es: 'Cierra el drawer abierto' } },
      {
        keys: 'Tab / Shift+Tab',
        action: {
          en: "While the drawer is open over the page (`mode: 'overlay'`, or `push` below the breakpoint), focus is trapped inside the sidebar",
          es: "Mientras el drawer está abierto sobre la página (`mode: 'overlay'`, o `push` por debajo del breakpoint), el foco queda atrapado dentro de la barra lateral",
        },
      },
      {
        keys: 'Arrow keys, Home, End',
        action: { en: 'Navigate the embedded menus (see Menu)', es: 'Navegan por los menús incluidos (consulta Menú)' },
      },
    ],
    notes: [
      {
        en: 'The navbar is a `<nav>` labelled by `ariaLabel` (default "Main"); the sidebar is an `<aside>` labelled by its own `ariaLabel` (default "Sidebar") that wraps a `<nav>`. Give them distinct, translated labels.',
        es: 'El navbar es un `<nav>` con la etiqueta de `ariaLabel` (por defecto "Main"); la barra lateral es un `<aside>` con la etiqueta de su propio `ariaLabel` (por defecto "Sidebar") que envuelve un `<nav>`. Ponles etiquetas distintas y traducidas.',
      },
      {
        en: 'The focus trap is active whenever the drawer is open as an overlay: always in `overlay` mode, and in the default `push` mode below `responsiveBreakpoint`, where the drawer slides in over the page. From the breakpoint up, the permanent `push` sidebar is part of the page and does not trap focus.',
        es: 'La trampa de foco se activa siempre que el drawer está abierto como overlay: siempre en modo `overlay`, y en el modo `push` por defecto por debajo de `responsiveBreakpoint`, donde el drawer aparece sobre la página. Desde el breakpoint hacia arriba, la barra lateral fija de `push` forma parte de la página y no atrapa el foco.',
      },
      {
        en: 'Built-in control labels are fixed English strings: "Toggle navigation" on the hamburger, "Close sidebar" on the overlay, and "Collapse sidebar" / "Expand sidebar" on the rail button (which also sets `aria-pressed`). Inside the shell the hamburger also has `aria-expanded` (the drawer’s open state) and `aria-controls` (the drawer panel’s id). A standalone `hk-navbar` sets them only when you pass its `menuExpanded` and `menuControls` inputs.',
        es: 'Las etiquetas de los controles integrados son textos fijos en inglés: "Toggle navigation" en la hamburguesa, "Close sidebar" en el overlay y "Collapse sidebar" / "Expand sidebar" en el botón del riel (que además usa `aria-pressed`). Dentro del shell, la hamburguesa también tiene `aria-expanded` (si el drawer está abierto) y `aria-controls` (el id del panel del drawer). Un `hk-navbar` independiente los define solo cuando le pasas sus inputs `menuExpanded` y `menuControls`.',
      },
    ],
  },
  performance: [
    {
      en: 'Layout changes are CSS only (DaisyUI drawer plus Tailwind breakpoint classes). One CDK `BreakpointObserver` media query decides whether the `push` drawer traps focus; no resize handlers run.',
      es: 'Los cambios de diseño son solo CSS (drawer de DaisyUI más clases de breakpoint de Tailwind). Una media query del `BreakpointObserver` del CDK decide si el drawer en modo `push` atrapa el foco; no se ejecuta ningún manejador de `resize`.',
    },
    {
      en: 'Keep `menu` and sidebar configs in fields so their references stay stable; a new object on every change-detection pass makes the embedded menu re-process its items.',
      es: 'Guarda las configuraciones del `menu` y de la barra lateral en campos para que su referencia se mantenga estable; un objeto nuevo en cada ciclo de detección de cambios obliga al menú a reprocesar sus elementos.',
    },
  ],
  related: [
    {
      id: 'menu',
      note: {
        en: 'The menu rendered inside the navbar and sidebar.',
        es: 'El menú que se renderiza dentro del navbar y de la barra lateral.',
      },
    },
    {
      id: 'breadcrumbs',
      note: {
        en: 'Location trail to place at the top of the page content.',
        es: 'Rastro de ubicación para poner arriba del contenido de la página.',
      },
    },
    {
      id: 'command-palette',
      note: {
        en: 'Keyboard launcher that complements the sidebar navigation.',
        es: 'Buscador controlado con el teclado que complementa la navegación lateral.',
      },
    },
  ],
};

export default content;
