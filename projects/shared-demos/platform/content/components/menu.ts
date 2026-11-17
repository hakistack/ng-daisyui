import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-menu` renders a list of links and actions from plain data. You describe each entry as an object (a label, an icon, where it goes) and the component renders the DaisyUI menu for you: groups that open and close, badges, keyboard hints, section titles and dividers. The same list works as a vertical sidebar menu or as a horizontal top bar.',
      es: '`hk-menu` renderiza una lista de enlaces y acciones a partir de datos simples. Describes cada entrada como un objeto (una etiqueta, un icono, a dónde lleva) y el componente arma el menú de DaisyUI: grupos que se abren y se cierran, badges, indicaciones de atajos de teclado, títulos de sección y separadores. La misma lista sirve como menú vertical de una barra lateral o como barra horizontal superior.',
    },
    {
      en: 'Pass the items straight to `[items]`, or wrap the whole configuration with `createMenu()` to get a controller. The controller lets your component code open or close groups and collapse the menu into an icon-only rail, without `@ViewChild`.',
      es: 'Puedes pasar los elementos directamente a `[items]`, o envolver la configuración con `createMenu()` para obtener un controlador. Con el controlador, el código de tu componente puede abrir o cerrar grupos y plegar el menú a un riel de solo iconos, sin `@ViewChild`.',
    },
    {
      en: 'The library knows nothing about your users or your translations. Labels are already-translated strings, and you hide entries with a `visible` flag or function — for example a role check from your own auth service.',
      es: 'La librería no sabe nada de tus usuarios ni de tus traducciones. Las etiquetas llegan ya traducidas, y ocultas entradas con `visible` (booleano o función), por ejemplo una verificación de roles de tu propio servicio de autenticación.',
    },
  ],
  whenToUse: [
    {
      en: 'Sidebar or top-bar navigation built from a list of routes, especially when parts of it depend on roles or feature flags.',
      es: 'Navegación de barra lateral o barra superior construida a partir de una lista de rutas, sobre todo si partes dependen de roles o feature flags.',
    },
    {
      en: 'Nested sections that should expand and collapse, optionally one at a time (`accordion`).',
      es: 'Secciones anidadas que deben expandirse y contraerse, opcionalmente una a la vez (`accordion`).',
    },
    {
      en: 'A sidebar that folds into an icon rail with tooltips and hover flyouts for its groups.',
      es: 'Una barra lateral que se pliega a un riel de iconos con tooltips y paneles flotantes para sus grupos.',
    },
    {
      en: 'A short list of actions (sign out, export, settings) where each entry runs a callback.',
      es: 'Una lista corta de acciones (cerrar sesión, exportar, ajustes) donde cada entrada ejecuta un callback.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Switching between panels of content on the same page: use [Tabs](/tabs).',
      es: 'Para cambiar entre paneles de contenido en la misma página: usa [Pestañas](/tabs).',
    },
    {
      en: 'Jumping to any of hundreds of destinations by typing: use the [Command Palette](/command-palette), and keep the menu for the main sections.',
      es: 'Para saltar a cualquiera de cientos de destinos escribiendo: usa la [Paleta de comandos](/command-palette) y deja el menú para las secciones principales.',
    },
    {
      en: 'Showing where the user is inside a hierarchy: use [Breadcrumbs](/breadcrumbs).',
      es: 'Para mostrar dónde está el usuario dentro de una jerarquía: usa [Migas de pan](/breadcrumbs).',
    },
    {
      en: 'A full app frame with a responsive drawer: use [App shell](/app-shell), which already embeds `hk-menu` in its navbar and sidebar.',
      es: 'Para el marco completo de una app con drawer responsivo: usa [App shell](/app-shell), que ya incluye `hk-menu` en su navbar y su barra lateral.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MenuComponent, MenuItem, createMenu } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-side-menu',
  imports: [MenuComponent],
  template: \`
    <hk-menu [config]="menu.config()" (itemSelect)="onSelect($event)" />
    <button type="button" class="btn btn-sm mt-2" (click)="menu.toggle('settings')">Toggle settings</button>
    <p class="text-sm mt-2">Last selected: {{ lastSelected() }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuComponent {
  readonly lastSelected = signal('');

  readonly menu = createMenu({
    ariaLabel: 'Main navigation',
    items: [
      { kind: 'title', label: 'Workspace' },
      { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        children: [
          { label: 'Account', routerLink: '/settings/account' },
          { label: 'Security', routerLink: '/settings/security', badge: 'New', badgeClass: 'badge-primary' },
        ],
      },
      { kind: 'divider' },
      { label: 'Sign out', icon: 'log-out' },
    ],
  });

  onSelect(item: MenuItem): void {
    this.lastSelected.set(item.label ?? '');
  }
}
`,
    note: {
      en: "Items with `routerLink` need `provideRouter(...)` in your app config. Icons given as names (`'house'`) must be registered with `provideLucideIcons(...)` from `@lucide/angular`; you can also pass icon data instead of a name (`icon: LucideHouse.icon`, not the `LucideHouse` class itself). Give an explicit `id` to every group you want to drive from the controller.",
      es: "Los elementos con `routerLink` necesitan `provideRouter(...)` en la configuración de tu app. Los iconos que pasas por nombre (`'house'`) deben estar registrados con `provideLucideIcons(...)` de `@lucide/angular`; también puedes pasar los datos del icono en lugar del nombre (`icon: LucideHouse.icon`, no la clase `LucideHouse` en sí). Ponle un `id` explícito a cada grupo que quieras controlar desde el controlador.",
    },
  },
  technical: [
    {
      id: 'item-model',
      heading: { en: 'Item model and kind inference', es: 'Modelo de elemento e inferencia del tipo' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every entry is a plain `MenuItem`. When `kind` is omitted it is inferred in this order:',
            es: 'Cada entrada es un `MenuItem` simple. Si omites `kind`, se infiere en este orden:',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Fields present', es: 'Campos presentes' },
            { en: 'Rendered as', es: 'Se muestra como' },
          ],
          rows: [
            [
              { en: '`children` (non-empty)', es: '`children` (no vacío)' },
              { en: '`group` — native `<details>`/`<summary>`', es: '`group` — `<details>`/`<summary>` nativo' },
            ],
            [
              { en: 'no `label`, `routerLink`, `href` or `action`', es: 'sin `label`, `routerLink`, `href` ni `action`' },
              { en: '`divider`', es: '`divider`' },
            ],
            [
              { en: '`routerLink` or `href`', es: '`routerLink` o `href`' },
              { en: '`link` — `<a>`', es: '`link` — `<a>`' },
            ],
            [
              { en: 'anything else', es: 'cualquier otro caso' },
              { en: '`action` — `<button>`', es: '`action` — `<button>`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: "Section headings need `kind: 'title'`. The `item.link()`, `item.external()`, `item.group()`, `item.action()`, `item.title()` and `item.divider()` builders exist as optional sugar; object literals are the recommended style.",
            es: "Los títulos de sección necesitan `kind: 'title'`. Los builders `item.link()`, `item.external()`, `item.group()`, `item.action()`, `item.title()` e `item.divider()` existen como atajo opcional; los objetos literales son el estilo recomendado.",
          },
        },
        {
          kind: 'p',
          text: {
            en: "Visibility is resolved by `processMenuItems()` inside a `computed()`: a falsy `visible` hides the item and its subtree, and a group whose children are all hidden is dropped. Because the predicate runs inside the computed, a `visible` function that reads a signal (for example the current user's roles) re-evaluates when that signal changes.",
            es: 'La visibilidad la resuelve `processMenuItems()` dentro de un `computed()`: un `visible` falso oculta el elemento y todo lo que cuelga de él, y un grupo cuyos hijos están todos ocultos se elimina. Como la función se ejecuta dentro del `computed()`, un `visible` que lee un signal (por ejemplo, los roles del usuario actual) se vuelve a evaluar cuando ese signal cambia.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Items without an `id` get a generated one that is remembered per item object. Re-processing the same objects (a `visible` signal changes, the config updates) keeps those ids, so groups stay open or closed. Open/closed state is keyed by id: a new array of new item objects gets new ids and falls back to each group’s `expanded` flag, and controller calls like `expand(id)` can only target ids you set yourself.',
            es: 'Los elementos sin `id` reciben uno generado que se recuerda por cada objeto de elemento. Al reprocesar los mismos objetos (cambia un signal de `visible`, se actualiza la configuración) esos ids se mantienen, así que los grupos siguen abiertos o cerrados. El estado abierto/cerrado se guarda por id: un arreglo nuevo con objetos nuevos recibe ids nuevos y vuelve al `expanded` de cada grupo, y llamadas como `expand(id)` solo funcionan con ids que tú definas.',
          },
        },
      ],
    },
    {
      id: 'controller',
      heading: { en: 'The createMenu() controller', es: 'El controlador de createMenu()' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`createMenu()` returns a `MenuController`: a `config` signal with defaults applied, a `collapsed` signal, and the methods `expand`, `collapse`, `toggle`, `expandAll`, `collapseAll`, `setCollapsed` and `find`. The component binds itself to the controller through an internal bridge when it mounts; calls made before that are safe no-ops.',
            es: '`createMenu()` devuelve un `MenuController`: un signal `config` con los valores por defecto aplicados, un signal `collapsed` y los métodos `expand`, `collapse`, `toggle`, `expandAll`, `collapseAll`, `setCollapsed` y `find`. El componente se conecta al controlador mediante un puente interno al montarse; las llamadas hechas antes de eso no hacen nada y no fallan.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Option', es: 'Opción' },
            { en: 'Default', es: 'Valor por defecto' },
          ],
          rows: [
            [
              { en: '`orientation`', es: '`orientation`' },
              { en: "`'vertical'`", es: "`'vertical'`" },
            ],
            [
              { en: '`size`', es: '`size`' },
              { en: "`'md'` (`menu-md`)", es: "`'md'` (`menu-md`)" },
            ],
            [
              { en: '`accordion`, `closeOnOutsideClick`', es: '`accordion`, `closeOnOutsideClick`' },
              { en: '`true` for horizontal menus, `false` for vertical', es: '`true` en menús horizontales, `false` en verticales' },
            ],
            [
              { en: '`submenuMode`', es: '`submenuMode`' },
              {
                en: "`'inline'` (`<details>`). `'dropdown'` is reserved and still renders inline; for hover flyouts use `collapsed: true` on a vertical menu (icon rail).",
                es: "`'inline'` (`<details>`). `'dropdown'` está reservado y todavía se muestra en línea; para paneles flotantes al pasar el mouse usa `collapsed: true` en un menú vertical (riel de iconos).",
              },
            ],
            [
              { en: '`rounded`, `background`', es: '`rounded`, `background`' },
              { en: '`true` (`rounded-box`, `bg-base-200`)', es: '`true` (`rounded-box`, `bg-base-200`)' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The component inputs `orientation`, `size`, `background`, `rounded` and the two-way `collapsed` model override the matching config fields, which is how `hk-sidebar` and `hk-navbar` reuse one config inside their own chrome.',
            es: 'Los inputs del componente `orientation`, `size`, `background`, `rounded` y el modelo bidireccional `collapsed` tienen prioridad sobre los campos correspondientes de la configuración; así es como `hk-sidebar` y `hk-navbar` reutilizan una misma configuración dentro de su propio marco.',
          },
        },
      ],
    },
    {
      id: 'rendering',
      heading: { en: 'Router links, rail and flyouts', es: 'Enlaces del router, riel y paneles flotantes' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '`routerLink` items render `<a routerLink>` with `routerLinkActive="menu-active"`; `href` items render a plain `<a>` and add `rel="noopener noreferrer"` when `target` is `_blank`.',
              es: 'Los elementos con `routerLink` generan `<a routerLink>` con `routerLinkActive="menu-active"`; los de `href` generan un `<a>` normal y añaden `rel="noopener noreferrer"` cuando `target` es `_blank`.',
            },
            {
              en: 'A leaf item fires its own `action` (if any) and then the `(itemSelect)` output. Disabled items do neither.',
              es: 'Un elemento final ejecuta su propio `action` (si lo tiene) y luego emite `(itemSelect)`. Los elementos deshabilitados no hacen ninguna de las dos cosas.',
            },
            {
              en: 'With `accordion`, opening a group closes its siblings at the same depth. With `closeOnOutsideClick`, a document click outside the menu collapses every group.',
              es: 'Con `accordion`, abrir un grupo cierra sus hermanos del mismo nivel. Con `closeOnOutsideClick`, un clic fuera del menú contrae todos los grupos.',
            },
            {
              en: "Rail mode (`collapsed`, vertical only) hides labels and shows them as tooltips. Group children open in a flyout rendered through a CDK connected overlay, so it escapes the sidebar's overflow clipping; it opens to the right, flips left when there is no room, and closes 120 ms after the pointer leaves.",
              es: 'El modo riel (`collapsed`, solo vertical) oculta las etiquetas y las muestra como tooltips. Los hijos de un grupo se abren en un panel flotante dentro de un overlay conectado del CDK, así escapa del recorte por `overflow` de la barra lateral; se abre hacia la derecha, cambia a la izquierda si no hay espacio y se cierra 120 ms después de que el puntero sale.',
            },
            {
              en: 'Content projected with the `hk-menu-header` and `hk-menu-footer` attributes renders above and below the list.',
              es: 'El contenido proyectado con los atributos `hk-menu-header` y `hk-menu-footer` aparece arriba y abajo de la lista.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab',
        action: {
          en: 'Navigation menu (links only): move from link to link. Action menu: enter or leave the menu (it is a single Tab stop)',
          es: 'Menú de navegación (solo enlaces): pasa de enlace en enlace. Menú de acciones: entra o sale del menú (es una sola parada de Tab)',
        },
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: {
          en: 'Vertical action menu: move to the next / previous visible, enabled item. Menubar: on a top-level item, open its group on the first / last item; inside a submenu, move through it',
          es: 'Menú de acciones vertical: pasa al elemento visible y habilitado siguiente / anterior. Menubar: en un elemento de primer nivel, abre su grupo en el primer / último elemento; dentro de un submenú, se mueve por él',
        },
      },
      {
        keys: 'Home / End',
        action: { en: 'Action menu: focus the first / last item', es: 'Menú de acciones: mueve el foco al primer / último elemento' },
      },
      {
        keys: 'ArrowRight / ArrowLeft',
        action: {
          en: 'Vertical action menu: → opens the focused group and enters it, ← closes the current group. Menubar: move between top-level items, also from inside a submenu',
          es: 'Menú de acciones vertical: → abre el grupo enfocado y entra en él, ← cierra el grupo actual. Menubar: pasa entre los elementos de primer nivel, también desde dentro de un submenú',
        },
      },
      {
        keys: 'Escape',
        action: {
          en: 'Close the open group and return focus to its header (in a menubar, to the parent item); also closes the rail flyout',
          es: 'Cierra el grupo abierto y devuelve el foco a su encabezado (en un menubar, al elemento padre); también cierra el panel flotante del riel',
        },
      },
      {
        keys: 'Enter / Space',
        action: {
          en: 'Activate the focused link, button or group header (native behavior)',
          es: 'Activa el enlace, botón o encabezado de grupo enfocado (comportamiento nativo)',
        },
      },
    ],
    notes: [
      {
        en: '`semantics` (`MenuSemantics`) picks the ARIA pattern. With `\'auto\'` (default), a menu whose items are all links (`routerLink` / `href`) renders as navigation: a plain list with no menu roles, Tab between links, and `aria-current="page"` on the active route. Put it inside a `<nav>`; `hk-navbar` and `hk-sidebar` already do.',
        es: '`semantics` (`MenuSemantics`) elige el patrón ARIA. Con `\'auto\'` (por defecto), un menú cuyos elementos son todos enlaces (`routerLink` / `href`) se renderiza como navegación: una lista normal sin roles de menú, Tab entre enlaces y `aria-current="page"` en la ruta activa. Ponlo dentro de un `<nav>`; `hk-navbar` y `hk-sidebar` ya lo hacen.',
      },
      {
        en: 'As soon as one item is an action, or with `semantics: \'menu\'`, the root list is `role="menu"` (vertical) or `role="menubar"` (horizontal) with `aria-orientation`; entries are `menuitem`s inside `<li role="none">`, dividers are `separator`s, and only one item is in the Tab order (roving tabindex). Group headers expose `aria-haspopup="menu"` and `aria-expanded`.',
        es: 'En cuanto un elemento es una acción, o con `semantics: \'menu\'`, la lista raíz es `role="menu"` (vertical) o `role="menubar"` (horizontal) con `aria-orientation`; las entradas son `menuitem` dentro de `<li role="none">`, los separadores son `separator` y solo un elemento está en el orden de Tab (tabindex itinerante). Los encabezados de grupo exponen `aria-haspopup="menu"` y `aria-expanded`.',
      },
      {
        en: 'Set `ariaLabel` when a page has more than one menu, so screen reader users can tell them apart. In rail mode each item gets its `label` as `aria-label`, so never leave labels empty even if only icons are visible.',
        es: 'Define `ariaLabel` cuando la página tenga más de un menú, para que quien usa lector de pantalla pueda distinguirlos. En modo riel cada elemento usa su `label` como `aria-label`, así que nunca dejes etiquetas vacías aunque solo se vean iconos.',
      },
      {
        en: 'Arrow navigation is the same for horizontal menus: ArrowDown/ArrowUp move between items, ArrowRight/ArrowLeft open and close groups. Disabled items stay visible but are skipped and marked with `aria-disabled` or `disabled`.',
        es: 'La navegación con flechas es la misma en menús horizontales: ArrowDown/ArrowUp se mueven entre elementos y ArrowRight/ArrowLeft abren y cierran grupos. Los elementos deshabilitados siguen visibles, pero se saltan y quedan marcados con `aria-disabled` o `disabled`.',
      },
    ],
  },
  performance: [
    {
      en: 'The visible tree is computed once per change of the config, the `items` input or a signal read inside a `visible` function — not on every change-detection pass.',
      es: 'El árbol visible se calcula una vez por cada cambio de la configuración, del input `items` o de un signal leído dentro de un `visible`; no en cada ciclo de detección de cambios.',
    },
    {
      en: 'Keep items in a field or a `computed()`. Building fresh item objects in a template method re-processes the tree on every call and, for items without an `id`, generates new ids and resets their open state.',
      es: 'Guarda los elementos en un campo o en un `computed()`. Crear objetos de elemento nuevos desde un método de la plantilla reprocesa el árbol en cada llamada y, en los elementos sin `id`, genera ids nuevos y reinicia su estado abierto.',
    },
    {
      en: 'The rail uses a single shared CDK overlay for all group flyouts instead of one per group.',
      es: 'El riel usa un solo overlay del CDK compartido para todos los paneles flotantes, en vez de uno por grupo.',
    },
  ],
  related: [
    {
      id: 'app-shell',
      note: { en: 'Navbar, sidebar and drawer that embed hk-menu for you.', es: 'Navbar, barra lateral y drawer que ya incluyen hk-menu.' },
    },
    {
      id: 'breadcrumbs',
      note: {
        en: 'Shows the current location instead of the available destinations.',
        es: 'Muestra la ubicación actual en vez de los destinos disponibles.',
      },
    },
    {
      id: 'command-palette',
      note: {
        en: 'Search-driven launcher for many destinations and actions.',
        es: 'Buscador para muchos destinos y acciones desde el teclado.',
      },
    },
    {
      id: 'tabs',
      note: {
        en: 'Switches panels within one page rather than navigating.',
        es: 'Cambia paneles dentro de una página en lugar de navegar.',
      },
    },
  ],
};

export default content;
