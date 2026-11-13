import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-menu` draws a list of links and actions from plain data. You describe each entry as an object — a label, an icon, where it goes — and the component renders the DaisyUI menu for you: groups that open and close, badges, keyboard hints, section titles and dividers. The same list works as a vertical sidebar menu or as a horizontal top bar.',
      es: '`hk-menu` dibuja una lista de enlaces y acciones a partir de datos simples. Describes cada entrada como un objeto — una etiqueta, un icono, a dónde lleva — y el componente arma el menú de DaisyUI: grupos que abren y cierran, badges, atajos de teclado, títulos de sección y separadores. La misma lista sirve como menú vertical de una barra lateral o como barra horizontal arriba.',
    },
    {
      en: 'Pass the items straight to `[items]`, or wrap the whole configuration with `createMenu()` to get a controller. The controller lets your component code open or close groups and collapse the menu into an icon-only rail, without `@ViewChild`.',
      es: 'Puedes pasar los items directo a `[items]`, o envolver la configuración con `createMenu()` para obtener un controlador. Con el controlador, el código de tu componente puede abrir o cerrar grupos y plegar el menú a un riel de solo iconos, sin `@ViewChild`.',
    },
    {
      en: 'The library knows nothing about your users or your translations. Labels are already-translated strings, and you hide entries with a `visible` flag or function — for example a role check from your own auth service.',
      es: 'La librería no sabe nada de tus usuarios ni de tus traducciones. Las etiquetas llegan ya traducidas, y ocultas entradas con un `visible` (booleano o función), por ejemplo una verificación de roles de tu propio servicio de autenticación.',
    },
  ],
  whenToUse: [
    {
      en: 'Sidebar or top-bar navigation built from a list of routes, especially when parts of it depend on roles or feature flags.',
      es: 'Navegación de barra lateral o barra superior construida a partir de una lista de rutas, sobre todo si partes dependen de roles o feature flags.',
    },
    {
      en: 'Nested sections that should expand and collapse, optionally one at a time (`accordion`).',
      es: 'Secciones anidadas que deben expandirse y colapsar, opcionalmente una a la vez (`accordion`).',
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
      es: 'Para cambiar entre paneles de contenido en la misma página: usa [Tabs](/tabs).',
    },
    {
      en: 'Jumping to any of hundreds of destinations by typing: use the [Command Palette](/command-palette), and keep the menu for the main sections.',
      es: 'Para saltar a cualquiera de cientos de destinos escribiendo: usa la [Paleta de comandos](/command-palette) y deja el menú para las secciones principales.',
    },
    {
      en: 'Showing where the user is inside a hierarchy: use [Breadcrumbs](/breadcrumbs).',
      es: 'Para mostrar dónde está el usuario dentro de una jerarquía: usa [Breadcrumbs](/breadcrumbs).',
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
      en: "Items with `routerLink` need `provideRouter(...)` in your app config. Icons given as names (`'house'`) must be registered with `provideLucideIcons(...)` from `@lucide/angular`; you can also pass an imported Lucide icon instead of a name. Give an explicit `id` to every group you want to drive from the controller.",
      es: "Los items con `routerLink` necesitan `provideRouter(...)` en la configuración de tu app. Los iconos que pasas por nombre (`'house'`) deben estar registrados con `provideLucideIcons(...)` de `@lucide/angular`; también puedes pasar el icono de Lucide importado en lugar del nombre. Ponle un `id` explícito a cada grupo que quieras controlar desde el controlador.",
    },
  },
  technical: [
    {
      id: 'item-model',
      heading: { en: 'Item model and kind inference', es: 'Modelo de item e inferencia del tipo' },
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
            en: "Section headings need `kind: 'title'`. The `item.link()`, `item.group()`, `item.action()`, `item.title()` and `item.divider()` builders exist as optional sugar; object literals are the recommended style.",
            es: "Los títulos de sección necesitan `kind: 'title'`. Los builders `item.link()`, `item.group()`, `item.action()`, `item.title()` e `item.divider()` existen como azúcar opcional; los objetos literales son el estilo recomendado.",
          },
        },
        {
          kind: 'p',
          text: {
            en: "Visibility is resolved by `processMenuItems()` inside a `computed()`: a falsy `visible` hides the item and its subtree, and a group whose children are all hidden is dropped. Because the predicate runs inside the computed, a `visible` function that reads a signal (for example the current user's roles) re-evaluates when that signal changes.",
            es: 'La visibilidad la resuelve `processMenuItems()` dentro de un `computed()`: un `visible` falso oculta el item y todo lo que cuelga de él, y un grupo cuyos hijos están todos ocultos se elimina. Como la función corre dentro del computed, un `visible` que lee una señal (por ejemplo, los roles del usuario actual) se vuelve a evaluar cuando esa señal cambia.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Items without an `id` get a generated one every time the tree is processed. Open/closed state is keyed by id, so groups without an explicit `id` fall back to their `expanded` flag whenever you pass a new items array, and controller calls like `expand(id)` can only target ids you set yourself.',
            es: 'Los items sin `id` reciben uno generado cada vez que se procesa el árbol. El estado abierto/cerrado se guarda por id, así que los grupos sin `id` explícito vuelven a su `expanded` inicial cada vez que pasas un arreglo nuevo, y llamadas como `expand(id)` solo funcionan con ids que tú definas.',
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
            es: '`createMenu()` devuelve un `MenuController`: una señal `config` con los valores por defecto aplicados, una señal `collapsed` y los métodos `expand`, `collapse`, `toggle`, `expandAll`, `collapseAll`, `setCollapsed` y `find`. El componente se conecta al controlador mediante un puente interno al montarse; las llamadas hechas antes de eso no hacen nada y no fallan.',
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
              { en: '`rounded`, `background`', es: '`rounded`, `background`' },
              { en: '`true` (`rounded-box`, `bg-base-200`)', es: '`true` (`rounded-box`, `bg-base-200`)' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The component inputs `orientation`, `size`, `background`, `rounded` and the two-way `collapsed` model override the matching config fields, which is how `hk-sidebar` and `hk-navbar` reuse one config inside their own chrome.',
            es: 'Los inputs del componente `orientation`, `size`, `background`, `rounded` y el modelo bidireccional `collapsed` tienen prioridad sobre los campos del config; así es como `hk-sidebar` y `hk-navbar` reutilizan un mismo config dentro de su propio marco.',
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
              es: 'Los items con `routerLink` generan `<a routerLink>` con `routerLinkActive="menu-active"`; los de `href` generan un `<a>` normal y añaden `rel="noopener noreferrer"` cuando `target` es `_blank`.',
            },
            {
              en: 'A leaf item fires its own `action` (if any) and then the `(itemSelect)` output. Disabled items do neither.',
              es: 'Un item final ejecuta su propio `action` (si lo tiene) y luego emite `(itemSelect)`. Los items deshabilitados no hacen ninguna de las dos cosas.',
            },
            {
              en: 'With `accordion`, opening a group closes its siblings at the same depth. With `closeOnOutsideClick`, a document click outside the menu collapses every group.',
              es: 'Con `accordion`, abrir un grupo cierra sus hermanos del mismo nivel. Con `closeOnOutsideClick`, un clic fuera del menú colapsa todos los grupos.',
            },
            {
              en: "Rail mode (`collapsed`, vertical only) hides labels and shows them as tooltips. Group children open in a flyout rendered through a CDK connected overlay, so it escapes the sidebar's overflow clipping; it opens to the right, flips left when there is no room, and closes 120 ms after the pointer leaves.",
              es: 'El modo riel (`collapsed`, solo vertical) oculta las etiquetas y las muestra como tooltips. Los hijos de un grupo se abren en un panel flotante dentro de un overlay conectado del CDK, así escapa del recorte por overflow de la barra lateral; abre hacia la derecha, cambia a la izquierda si no hay espacio y se cierra 120 ms después de que el puntero sale.',
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
        keys: 'ArrowDown / ArrowUp',
        action: {
          en: 'Move focus to the next / previous visible, enabled item (wraps around)',
          es: 'Mueve el foco al item visible y habilitado siguiente / anterior (da la vuelta)',
        },
      },
      { keys: 'Home / End', action: { en: 'Focus the first / last item', es: 'Enfoca el primer / último item' } },
      { keys: 'ArrowRight', action: { en: 'Open the focused group if it is closed', es: 'Abre el grupo enfocado si está cerrado' } },
      {
        keys: 'ArrowLeft / Escape',
        action: {
          en: 'Close the group that contains focus and return focus to its header; Escape also closes the rail flyout',
          es: 'Cierra el grupo que contiene el foco y devuelve el foco a su encabezado; Escape también cierra el panel flotante del riel',
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
        en: 'The root list has `role="menu"` (vertical) or `role="menubar"` (horizontal) plus `aria-orientation`; entries are `menuitem`s inside `<li role="none">`, dividers are `separator`s. Group headers expose `aria-haspopup="menu"` and `aria-expanded`.',
        es: 'La lista raíz tiene `role="menu"` (vertical) o `role="menubar"` (horizontal) y `aria-orientation`; las entradas son `menuitem` dentro de `<li role="none">` y los separadores son `separator`. Los encabezados de grupo exponen `aria-haspopup="menu"` y `aria-expanded`.',
      },
      {
        en: 'Set `ariaLabel` when a page has more than one menu, so screen reader users can tell them apart. In rail mode each item gets its `label` as `aria-label`, so never leave labels empty even if only icons are visible.',
        es: 'Define `ariaLabel` cuando la página tenga más de un menú, para que quien usa lector de pantalla pueda distinguirlos. En modo riel cada item usa su `label` como `aria-label`, así que nunca dejes etiquetas vacías aunque solo se vean iconos.',
      },
      {
        en: 'Arrow navigation is the same for horizontal menus: ArrowDown/ArrowUp move between items, ArrowRight/ArrowLeft open and close groups. Disabled items stay visible but are skipped and marked with `aria-disabled` or `disabled`.',
        es: 'La navegación con flechas es la misma en menús horizontales: ArrowDown/ArrowUp se mueven entre items y ArrowRight/ArrowLeft abren y cierran grupos. Los items deshabilitados siguen visibles, pero se saltan y quedan marcados con `aria-disabled` o `disabled`.',
      },
    ],
  },
  performance: [
    {
      en: 'The visible tree is computed once per change of the config, the `items` input or a signal read inside a `visible` function — not on every change-detection pass.',
      es: 'El árbol visible se calcula una vez por cada cambio del config, del input `items` o de una señal leída dentro de un `visible`; no en cada ciclo de detección de cambios.',
    },
    {
      en: 'Keep items in a field or a `computed()`. Building a fresh array in a template method re-processes the tree, regenerates ids for items without one and resets their open state.',
      es: 'Guarda los items en un campo o en un `computed()`. Construir un arreglo nuevo desde un método del template reprocesa el árbol, regenera los ids de los items que no tienen y reinicia su estado abierto.',
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
