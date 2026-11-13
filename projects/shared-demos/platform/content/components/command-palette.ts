import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'A command palette is a search box in a modal: the user presses Cmd+K (Ctrl+K on Windows and Linux), types a few letters and jumps to a page or runs an action without touching the mouse.',
      es: 'Una paleta de comandos es un buscador dentro de un modal: el usuario pulsa Cmd+K (Ctrl+K en Windows y Linux), escribe unas letras y salta a una página o ejecuta una acción sin tocar el mouse.',
    },
    {
      en: 'You describe the entries with `createCommandPalette({ items, groups, modes })` and drop `<hk-command-palette [config]="palette.config()" />` in a template. Each item has a label and an `onSelect` callback. Results are grouped, and mode prefixes such as `>` or `#` narrow the search to one group, while `?` can show a help text.',
      es: 'Describes las entradas con `createCommandPalette({ items, groups, modes })` y colocas `<hk-command-palette [config]="palette.config()" />` en un template. Cada item tiene una etiqueta y un callback `onSelect`. Los resultados salen agrupados, y prefijos de modo como `>` o `#` limitan la búsqueda a un grupo, mientras que `?` puede mostrar un texto de ayuda.',
    },
    {
      en: "Fuzzy matching runs in the library's WASM search engine (the same one `hk-select` uses), loaded on demand. Until it is ready, or if it fails to load, the palette falls back to Fuse.js, so results always appear.",
      es: 'La búsqueda difusa corre en el motor WASM de la librería (el mismo que usa `hk-select`), que se carga bajo demanda. Mientras no esté listo, o si falla al cargar, la paleta usa Fuse.js, así que siempre hay resultados.',
    },
  ],
  whenToUse: [
    {
      en: 'Apps with many pages, records or actions where frequent users want to move fast from the keyboard.',
      es: 'Apps con muchas páginas, registros o acciones donde los usuarios frecuentes quieren moverse rápido desde el teclado.',
    },
    {
      en: 'A global "jump to" across different kinds of things (projects, people, settings) shown in labelled groups.',
      es: 'Un "ir a" global entre distintos tipos de cosas (proyectos, personas, ajustes) mostradas en grupos con título.',
    },
    {
      en: 'Exposing actions (create invoice, switch theme) without adding a button for each one.',
      es: 'Exponer acciones (crear factura, cambiar tema) sin agregar un botón para cada una.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Picking a value for a form field: use [Select](/select), a searchable form control.',
      es: 'Para elegir el valor de un campo de formulario: usa [Select](/select), un control de formulario con búsqueda.',
    },
    {
      en: 'As the only navigation: it is hard to discover. Keep a [Menu](/menu) or [App shell](/app-shell) and add the palette as a shortcut.',
      es: 'Como única navegación: es difícil de descubrir. Mantén un [Menu](/menu) o un [App shell](/app-shell) y agrega la paleta como atajo.',
    },
    {
      en: 'Searching a server on every keystroke: the palette filters the `items` given to `createCommandPalette()`, and there is no built-in async source.',
      es: 'Para buscar en un servidor en cada tecla: la paleta filtra los `items` que pasas a `createCommandPalette()` y no trae una fuente asíncrona integrada.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommandPaletteComponent, createCommandPalette } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-launcher',
  imports: [CommandPaletteComponent],
  template: \`
    <button type="button" class="btn btn-sm" (click)="palette.open()">
      Search <kbd class="kbd kbd-xs">Ctrl K</kbd>
    </button>
    <hk-command-palette [config]="palette.config()" />
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LauncherComponent {
  private readonly router = inject(Router);

  readonly palette = createCommandPalette({
    groups: [
      { id: 'pages', label: 'Pages' },
      { id: 'actions', label: 'Actions' },
    ],
    items: [
      { id: 'dashboard', label: 'Dashboard', group: 'pages', onSelect: () => this.router.navigate(['/dashboard']) },
      {
        id: 'reports',
        label: 'Reports',
        description: 'Monthly numbers',
        keywords: ['stats', 'analytics'],
        group: 'pages',
        onSelect: () => this.router.navigate(['/reports']),
      },
      { id: 'new-invoice', label: 'Create invoice', group: 'actions', onSelect: () => this.router.navigate(['/invoices/new']) },
    ],
    modes: [
      { prefix: '>', filterGroups: ['actions'], indicatorLabel: 'Actions' },
      { prefix: '?', layout: 'help', helpText: 'Type > to search only actions.' },
    ],
  });
}
`,
    note: {
      en: 'This example navigates, so it needs `provideRouter(...)`; the palette itself needs no provider. Translate its built-in texts once with `provideHkCommandPaletteLabels({...})` in your app config.',
      es: 'Este ejemplo navega, así que necesita `provideRouter(...)`; la paleta en sí no necesita provider. Traduce sus textos integrados una sola vez con `provideHkCommandPaletteLabels({...})` en la configuración de tu app.',
    },
  },
  technical: [
    {
      id: 'controller',
      heading: { en: 'Controller and state', es: 'Controlador y estado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "`createCommandPalette()` returns a `CommandPaletteController` with a `config` signal (defaults: `filter: 'fuzzy'`, `hotkey: 'Mod+K'`, `closeOnSelect: true`), a read-only `state` signal (`open`, `query`, `mode`, `selectedIndex`, `filtered`) and the methods `open`, `close`, `toggle`, `setQuery` and `clear`. The component binds to the controller on init; calls before that are no-ops.",
            es: "`createCommandPalette()` devuelve un `CommandPaletteController` con una señal `config` (por defecto: `filter: 'fuzzy'`, `hotkey: 'Mod+K'`, `closeOnSelect: true`), una señal `state` de solo lectura (`open`, `query`, `mode`, `selectedIndex`, `filtered`) y los métodos `open`, `close`, `toggle`, `setQuery` y `clear`. El componente se conecta al controlador al iniciar; las llamadas anteriores no hacen nada.",
          },
        },
        {
          kind: 'p',
          text: {
            en: 'An item runs its own `onSelect(context)`; items without one fall back to the config-level `onSelect(item, context)`. `context` is any value you pass in the config. Lifecycle hooks: `onOpen`, `onClose` (Escape, backdrop or selection) and `onQueryChange(query, mode)`.',
            es: 'Un item ejecuta su propio `onSelect(context)`; los que no lo tienen usan el `onSelect(item, context)` del config. `context` es cualquier valor que pases en el config. Hooks de ciclo de vida: `onOpen`, `onClose` (Escape, fondo o selección) y `onQueryChange(query, mode)`.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'The config is built once from the object you pass; it does not track signals. To change the item list, create a new controller.',
            es: 'El config se arma una sola vez a partir del objeto que pasas; no sigue señales. Para cambiar la lista de items, crea un controlador nuevo.',
          },
        },
      ],
    },
    {
      id: 'search',
      heading: { en: 'Search pipeline', es: 'Flujo de búsqueda' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Detect mode', es: 'Detectar modo' },
              detail: {
                en: 'First mode whose `prefix` starts the query wins; the prefix is stripped.',
                es: 'Gana el primer modo cuyo `prefix` inicia la consulta; el prefijo se quita.',
              },
            },
            {
              label: { en: 'Scope', es: 'Acotar' },
              detail: {
                en: '`filterGroups` keeps only items of those groups. A `help` mode shows `helpText` instead of results.',
                es: '`filterGroups` deja solo los items de esos grupos. Un modo `help` muestra `helpText` en vez de resultados.',
              },
            },
            {
              label: { en: 'Filter', es: 'Filtrar' },
              detail: {
                en: '`fuzzy` (WASM engine, Fuse.js fallback), `substring` (case-insensitive contains) or your own function.',
                es: '`fuzzy` (motor WASM, Fuse.js de respaldo), `substring` (contiene, sin distinguir mayúsculas) o tu propia función.',
              },
            },
            {
              label: { en: 'Group', es: 'Agrupar' },
              detail: {
                en: 'Results follow the order of `groups`; empty groups are hidden and ungrouped items go last, without a heading.',
                es: 'Los resultados siguen el orden de `groups`; los grupos vacíos se ocultan y los items sin grupo van al final, sin título.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: "Searchable text is `label`, `description` and `keywords`. With an empty query and no mode, no results are shown; typing just a mode prefix lists every item in that mode's scope. The highlight resets to the first enabled result on each query change.",
            es: 'El texto buscable es `label`, `description` y `keywords`. Con la consulta vacía y sin modo no se muestran resultados; escribir solo un prefijo de modo lista todos los items de ese alcance. El resaltado vuelve al primer resultado habilitado en cada cambio de consulta.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: "An item's `icon` is applied as CSS classes on a `<span>`, not as a Lucide icon name. Use `avatar` for an image (rendered with an empty `alt`).",
            es: 'El `icon` de un item se aplica como clases CSS en un `<span>`, no como nombre de icono de Lucide. Usa `avatar` para una imagen (se dibuja con `alt` vacío).',
          },
        },
      ],
    },
    {
      id: 'hotkey',
      heading: { en: 'Global hotkey', es: 'Atajo global' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'In the browser, the component listens to `keydown` on `document` and toggles the palette when the event matches `hotkey`. `Mod`, `Cmd`, `Ctrl` and `Meta` all mean "Cmd or Ctrl"; `Shift` and `Alt`/`Option` are also parsed. The shortcut is ignored while the user is typing in an input, textarea, select or contenteditable outside the palette. Pass `hotkey: false` to disable it.',
            es: 'En el navegador, el componente escucha `keydown` en `document` y abre o cierra la paleta cuando el evento coincide con `hotkey`. `Mod`, `Cmd`, `Ctrl` y `Meta` significan todos "Cmd o Ctrl"; también se interpretan `Shift` y `Alt`/`Option`. El atajo se ignora mientras el usuario escribe en un input, textarea, select o contenteditable fuera de la paleta. Pasa `hotkey: false` para desactivarlo.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Mod+K',
        action: {
          en: 'Open or close the palette (Cmd on macOS, Ctrl elsewhere; configurable)',
          es: 'Abre o cierra la paleta (Cmd en macOS, Ctrl en los demás; configurable)',
        },
      },
      {
        keys: 'ArrowDown / ArrowUp',
        action: {
          en: 'Move the highlight, wrapping around and skipping disabled items',
          es: 'Mueve el resaltado, dando la vuelta y saltando items deshabilitados',
        },
      },
      { keys: 'Home / End', action: { en: 'Highlight the first / last result', es: 'Resalta el primer / último resultado' } },
      { keys: 'Enter', action: { en: 'Run the highlighted item', es: 'Ejecuta el item resaltado' } },
      { keys: 'Escape', action: { en: 'Close the palette', es: 'Cierra la paleta' } },
    ],
    notes: [
      {
        en: 'The palette is a native `<dialog>` opened with `showModal()`: the rest of the page becomes inert and focus moves to the search input on open. The backdrop button closes it.',
        es: 'La paleta es un `<dialog>` nativo abierto con `showModal()`: el resto de la página queda inerte y el foco pasa al buscador al abrir. El botón del fondo la cierra.',
      },
      {
        en: "The search input's `aria-label` and the close button label come from the labels provider (English by default); translate them with `provideHkCommandPaletteLabels`.",
        es: 'El `aria-label` del buscador y la etiqueta del botón de cerrar vienen del provider de etiquetas (en inglés por defecto); tradúcelos con `provideHkCommandPaletteLabels`.',
      },
      {
        en: 'Known gap: results are buttons marked with `aria-selected`, but the input has no combobox/listbox roles or `aria-activedescendant`, so screen readers do not announce the highlighted result while arrowing. Results are still reachable with Tab.',
        es: 'Limitación conocida: los resultados son botones marcados con `aria-selected`, pero el buscador no tiene roles combobox/listbox ni `aria-activedescendant`, así que los lectores de pantalla no anuncian el resultado resaltado al usar las flechas. Los resultados siguen siendo alcanzables con Tab.',
      },
    ],
  },
  performance: [
    {
      en: 'The WASM module is fetched lazily the first time an index is built and is shared with the other engine-backed features. See [WASM engines](/systems/wasm-engines).',
      es: 'El módulo WASM se descarga de forma diferida la primera vez que se construye un índice y se comparte con las demás funciones que usan el motor. Ver [Motores WASM](/systems/wasm-engines).',
    },
    {
      en: 'The index is built once per items array and disposed when it changes or the component is destroyed. Switching modes does not rebuild it; scoping is a set lookup over the engine results.',
      es: 'El índice se construye una vez por arreglo de items y se libera cuando cambia o cuando el componente se destruye. Cambiar de modo no lo reconstruye; el filtrado por modo es una búsqueda en un set sobre los resultados del motor.',
    },
    {
      en: 'Each keystroke only sends the query string to the engine; the items are not copied again.',
      es: 'Cada tecla solo envía el texto de búsqueda al motor; los items no se vuelven a copiar.',
    },
  ],
  related: [
    {
      id: 'select',
      note: { en: 'Searchable dropdown that stores a value in a form.', es: 'Dropdown con búsqueda que guarda un valor en un formulario.' },
    },
    {
      id: 'menu',
      note: {
        en: 'Visible, browsable navigation; the palette is the keyboard shortcut to it.',
        es: 'Navegación visible y explorable; la paleta es su atajo de teclado.',
      },
    },
    {
      id: 'wasm-engines',
      note: {
        en: 'How the shared fuzzy engine is loaded and released.',
        es: 'Cómo se carga y libera el motor de búsqueda difusa compartido.',
      },
    },
  ],
};

export default content;
