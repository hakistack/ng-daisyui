import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'Icons come from Lucide through the `@lucide/angular` package, which the library installs for you. An icon is an inline `<svg>` whose stroke uses the current text color, so it picks up theme colors like any text.',
      es: 'Los iconos vienen de Lucide a través del paquete `@lucide/angular`, que la librería instala por ti. Un icono es un `<svg>` en línea cuyo trazo usa el color de texto actual, así que toma los colores del tema como cualquier texto.',
    },
    {
      en: "There are two ways to name an icon: by **import** (`LucideHouse`), which needs no setup, or by **string** (`'house'`), which only works if your app registered that icon. Library components accept both in most places.",
      es: "Hay dos formas de nombrar un icono: por **import** (`LucideHouse`), que no requiere configuración, o por **texto** (`'house'`), que solo funciona si tu app registró ese icono. Los componentes de la librería aceptan ambas en la mayoría de los lugares.",
    },
  ],
  whenToUse: [
    {
      en: 'Next to a text label, to make an action or a menu entry faster to recognize.',
      es: 'Junto a una etiqueta de texto, para que una acción o una entrada de menú se reconozca más rápido.',
    },
    {
      en: 'Icon-only buttons in dense toolbars, with an `aria-label` on the button.',
      es: 'Botones de solo icono en barras de herramientas densas, con un `aria-label` en el botón.',
    },
    {
      en: 'Icons chosen at runtime (from data or configuration), by name, when the set of names is known and registered.',
      es: 'Iconos que se escogen en tiempo de ejecución (desde datos o configuración), por nombre, cuando el conjunto de nombres es conocido y está registrado.',
    },
  ],
  whenNotToUse: [
    {
      en: 'As the only way to convey meaning (status, errors): pair the icon with text.',
      es: 'Como única forma de comunicar un significado (estado, errores): acompaña el icono con texto.',
    },
    {
      en: 'Logos and illustrations: Lucide is a stroke icon set; use an image or your own SVG.',
      es: 'Logos e ilustraciones: Lucide es un set de iconos de trazo; usa una imagen o tu propio SVG.',
    },
    {
      en: 'Arbitrary names typed by users or loaded from a backend you do not control: any unregistered name throws at runtime.',
      es: 'Nombres arbitrarios escritos por usuarios o cargados desde un backend que no controlas: cualquier nombre no registrado lanza un error en tiempo de ejecución.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideDynamicIcon, LucideHouse, LucideSettings, LucideTrash2 } from '@lucide/angular';
import { MenuComponent, type MenuItem } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-icon-examples',
  imports: [LucideDynamicIcon, LucideTrash2, MenuComponent],
  template: \`
    <!-- 1. Icon component by import: nothing to register -->
    <button type="button" class="btn btn-error btn-sm btn-square" aria-label="Delete">
      <svg lucideTrash2 [size]="16"></svg>
    </button>

    <!-- 2. Generic directive fed with an imported icon: nothing to register -->
    <svg [lucideIcon]="settingsIcon" class="text-primary" [size]="20"></svg>

    <!-- 3. Library component that accepts icon data -->
    <hk-menu [items]="items" />
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconExamplesComponent {
  readonly settingsIcon = LucideSettings;

  readonly items: MenuItem[] = [
    { label: 'Home', icon: LucideHouse.icon, action: () => this.go('home') },
    { label: 'Settings', icon: LucideSettings.icon, action: () => this.go('settings') },
  ];

  go(page: string): void {
    console.log('navigate to', page);
  }
}
`,
    note: {
      en: "This example passes imported icons everywhere, so it works without setup. To use names such as `icon: 'house'`, register those icons once in your app config: `provideLucideIcons(LucideHouse, LucideSettings)`.",
      es: "Este ejemplo pasa iconos importados en todos lados, así que funciona sin configuración. Para usar nombres como `icon: 'house'`, registra esos iconos una vez en la configuración de tu app: `provideLucideIcons(LucideHouse, LucideSettings)`.",
    },
  },
  technical: [
    {
      id: 'three-ways',
      heading: { en: 'Three ways to render an icon', es: 'Tres formas de mostrar un icono' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Form', es: 'Forma' },
            { en: 'Template', es: 'Plantilla' },
            { en: 'Registration', es: 'Registro' },
          ],
          rows: [
            [
              { en: 'Icon component', es: 'Componente del icono' },
              { en: '`<svg lucideHouse>` with `LucideHouse` in `imports`', es: '`<svg lucideHouse>` con `LucideHouse` en `imports`' },
              { en: 'None', es: 'Ninguno' },
            ],
            [
              { en: 'Generic directive + import', es: 'Directiva genérica + import' },
              {
                en: '`<svg [lucideIcon]="icon">` where `icon` is `LucideHouse` or `LucideHouse.icon`',
                es: '`<svg [lucideIcon]="icon">` donde `icon` es `LucideHouse` o `LucideHouse.icon`',
              },
              { en: 'None', es: 'Ninguno' },
            ],
            [
              { en: 'Generic directive + name', es: 'Directiva genérica + nombre' },
              { en: '`<svg lucideIcon="house">`', es: '`<svg lucideIcon="house">`' },
              { en: '`provideLucideIcons(LucideHouse)`', es: '`provideLucideIcons(LucideHouse)`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The generic directive is `LucideDynamicIcon` (selector `svg[lucideIcon]`). Every form shares the same inputs: `size` (default 24), `color` (default `currentColor`), `strokeWidth` (default 2), `absoluteStrokeWidth` and `title`.',
            es: 'La directiva genérica es `LucideDynamicIcon` (selector `svg[lucideIcon]`). Todas las formas comparten los mismos inputs: `size` (por defecto 24), `color` (por defecto `currentColor`), `strokeWidth` (por defecto 2), `absoluteStrokeWidth` y `title`.',
          },
        },
      ],
    },
    {
      id: 'registration',
      heading: { en: 'Registering icons by name', es: 'Registrar iconos por nombre' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { LucideFileText, LucideFolder, LucideFolderOpen, LucideHouse, provideLucideConfig, provideLucideIcons } from '@lucide/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLucideIcons(LucideHouse, LucideFolder, LucideFolderOpen, LucideFileText),
    provideLucideConfig({ strokeWidth: 1.75 }), // optional defaults
  ],
};`,
        },
        {
          kind: 'list',
          items: [
            {
              en: "Names are kebab-case (`file-text`, `trash-2`), plus each icon’s Lucide aliases. `'FileText'` does not resolve.",
              es: "Los nombres van en kebab-case (`file-text`, `trash-2`), más los alias de Lucide de cada icono. `'FileText'` no se resuelve.",
            },
            {
              en: "An unregistered name throws `Unable to resolve icon '<name>'` when the icon renders.",
              es: "Un nombre no registrado lanza `Unable to resolve icon '<name>'` cuando el icono se dibuja.",
            },
            {
              en: '`provideLucideIcons` is a single provider, not a list that adds up. A second call in a child injector (a route or component `providers`) **replaces** the whole map for that subtree, library components included. Register everything in one call at the app level; if a lazy route needs more icons, provide the full set there.',
              es: '`provideLucideIcons` es un solo provider, no una lista que se acumula. Una segunda llamada en un inyector hijo (los `providers` de una ruta o de un componente) **reemplaza** el mapa completo para ese subárbol, incluidos los componentes de la librería. Registra todo en una sola llamada a nivel de app; si una ruta lazy necesita más iconos, provee ahí el conjunto completo.',
            },
          ],
        },
      ],
    },
    {
      id: 'library-icon-inputs',
      heading: { en: 'Where library components take icons', es: 'Dónde reciben iconos los componentes de la librería' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Where', es: 'Dónde' },
            { en: 'Accepts', es: 'Acepta' },
            { en: 'Names you must register', es: 'Nombres que debes registrar' },
          ],
          rows: [
            [
              {
                en: '[Menu](/menu) items, [App shell](/app-shell) sidebar and navbar menus',
                es: 'Ítems de [Menu](/menu), menús del sidebar y la navbar del [App shell](/app-shell)',
              },
              { en: '[MenuIcon](/api/MenuIcon): icon data or a name', es: '[MenuIcon](/api/MenuIcon): datos del icono o un nombre' },
              { en: 'The names you use', es: 'Los nombres que uses' },
            ],
            [
              { en: '[Breadcrumbs](/breadcrumbs)', es: '[Breadcrumbs](/breadcrumbs)' },
              {
                en: '`icon` on items and in route `data.breadcrumb` (same type)',
                es: '`icon` en los ítems y en `data.breadcrumb` de la ruta (el mismo tipo)',
              },
              { en: 'The names you use', es: 'Los nombres que uses' },
            ],
            [
              { en: '[Table](/table) actions and bulk actions', es: 'Acciones y acciones masivas de [Table](/table)' },
              { en: '`icon`: data or a name', es: '`icon`: datos o un nombre' },
              {
                en: 'Yours, plus `sheet`, `file-spreadsheet`, `file-text`, `braces` if you use the default `export` options',
                es: 'Los tuyos, más `sheet`, `file-spreadsheet`, `file-text`, `braces` si usas las opciones de `export` por defecto',
              },
            ],
            [
              { en: '[Tree](/tree) nodes', es: 'Nodos de [Tree](/tree)' },
              { en: '`icon`, `expandedIcon`, `collapsedIcon`: names only', es: '`icon`, `expandedIcon`, `collapsedIcon`: solo nombres' },
              {
                en: 'Yours, plus `folder` and `folder-open` if you build nodes with `node.folder()` or `node.lazy()`',
                es: 'Los tuyos, más `folder` y `folder-open` si construyes nodos con `node.folder()` o `node.lazy()`',
              },
            ],
            [
              { en: '[Tabs](/tabs) panels', es: 'Paneles de [Tabs](/tabs)' },
              {
                en: '`icon` on `hk-tab-panel`: data or a name (PascalCase names are converted to kebab-case; an unregistered name shows no icon and warns in dev mode)',
                es: '`icon` en `hk-tab-panel`: datos o un nombre (los nombres en PascalCase se convierten a kebab-case; un nombre no registrado no muestra icono y avisa en modo desarrollo)',
              },
              { en: 'The names you use', es: 'Los nombres que uses' },
            ],
            [
              { en: '[Input](/input)', es: '[Input](/input)' },
              { en: '`prefixIcon`, `suffixIcon`: names only', es: '`prefixIcon`, `suffixIcon`: solo nombres' },
              { en: 'The names you use', es: 'Los nombres que uses' },
            ],
            [
              { en: '[Command palette](/command-palette) items', es: 'Ítems del [Command palette](/command-palette)' },
              {
                en: '`icon` is a CSS class hook, not a Lucide icon',
                es: '`icon` es un gancho de clase CSS, no un icono de Lucide',
              },
              { en: 'None', es: 'Ninguno' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Icons that components draw on their own — toast and alert severity icons, close buttons, the sidebar collapse toggle, viewer and editor toolbars — are imported inside the library and need no registration.',
            es: 'Los iconos que los componentes dibujan por su cuenta —iconos de severidad de toast y alert, botones de cerrar, el botón para plegar el sidebar, las barras de los visores y del editor— se importan dentro de la librería y no necesitan registro.',
          },
        },
      ],
    },
    {
      id: 'styling',
      heading: { en: 'Size, color and styling', es: 'Tamaño, color y estilo' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Color:** leave `color` alone and use text classes (`text-primary`, `text-error`, `text-base-content/70`) so icons follow the theme.',
              es: '**Color:** deja `color` tal cual y usa clases de texto (`text-primary`, `text-error`, `text-base-content/70`) para que los iconos sigan el tema.',
            },
            {
              en: '**Size:** `size` sets width and height in pixels. Inside `btn-sm` use 16, inside `btn-xs` 12–14.',
              es: '**Tamaño:** `size` define el ancho y el alto en píxeles. Dentro de `btn-sm` usa 16, dentro de `btn-xs` entre 12 y 14.',
            },
            {
              en: '**App-wide defaults:** `provideLucideConfig({ size, strokeWidth, color, absoluteStrokeWidth })` applies wherever an icon does not set the input itself. Many icons inside library components pass an explicit `size`, so the config mostly affects your own icons.',
              es: '**Valores globales:** `provideLucideConfig({ size, strokeWidth, color, absoluteStrokeWidth })` aplica donde un icono no define el input por sí mismo. Muchos iconos dentro de los componentes de la librería pasan un `size` explícito, así que la configuración afecta sobre todo a tus propios iconos.',
            },
            {
              en: '**CSS hooks:** every icon gets the classes `lucide` and `lucide-<name>` (plus one per alias).',
              es: '**Ganchos CSS:** cada icono recibe las clases `lucide` y `lucide-<name>` (más una por alias).',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [],
    notes: [
      {
        en: 'Icons are decorative by default: without a `title`, the `<svg>` gets `aria-hidden="true"`, so screen readers skip it.',
        es: 'Los iconos son decorativos por defecto: sin `title`, el `<svg>` recibe `aria-hidden="true"`, así que los lectores de pantalla lo saltan.',
      },
      {
        en: 'An icon-only button needs its name on the button (`aria-label`), not on the icon. Add a `title` input only when the icon stands alone and carries meaning; it renders an SVG `<title>`.',
        es: 'Un botón de solo icono necesita su nombre en el botón (`aria-label`), no en el icono. Usa el input `title` solo cuando el icono está solo y comunica algo; genera un `<title>` de SVG.',
      },
      {
        en: 'Status icons must not be the only signal. Library toasts and alerts pair them with text; do the same in table cells and badges.',
        es: 'Los iconos de estado no deben ser la única señal. Los toasts y alerts de la librería los acompañan con texto; haz lo mismo en celdas de tabla y badges.',
      },
      {
        en: 'Thin strokes on light colors can fail the 3:1 contrast WCAG asks for meaningful graphics; check icon colors against their background in each theme.',
        es: 'Los trazos finos en colores claros pueden no llegar al contraste 3:1 que WCAG pide para gráficos con significado; revisa el color de los iconos contra su fondo en cada tema.',
      },
    ],
  },
  performance: [
    {
      en: 'Imported icon components and icon data are tree-shaken: you only ship the icons you import.',
      es: 'Los componentes de icono y los datos de icono importados admiten tree-shaking: solo envías los iconos que importas.',
    },
    {
      en: 'A name registry cannot be tree-shaken. Registering the whole Lucide set (about 1,700 icons) added roughly 1.2 MB to this docs site’s initial bundle; it now registers only the names its code uses, from a generated list, and loads the full set only on the lazy Icons route.',
      es: 'Un registro por nombre no admite tree-shaking. Registrar todo el set de Lucide (unos 1,700 iconos) añadía cerca de 1.2 MB al bundle inicial de este sitio de documentación; ahora registra solo los nombres que usa su código, desde una lista generada, y carga el set completo solo en la ruta lazy de Iconos.',
    },
    {
      en: 'Prefer passing icon data (`LucideHouse.icon`) where a component accepts it; it removes both the registration and the lookup.',
      es: 'Prefiere pasar los datos del icono (`LucideHouse.icon`) donde un componente los acepte; elimina tanto el registro como la búsqueda.',
    },
  ],
  related: [
    {
      id: 'guide-bundle-size',
      note: { en: 'Keep the icon registry small.', es: 'Mantén pequeño el registro de iconos.' },
    },
    {
      id: 'guide-troubleshooting',
      note: { en: '“Unable to resolve icon” and blank icons.', es: '“Unable to resolve icon” e iconos en blanco.' },
    },
    { id: 'menu', note: { en: 'Menu items with icons.', es: 'Ítems de menú con iconos.' } },
    { id: 'tree', note: { en: 'Folder icons in tree nodes.', es: 'Iconos de carpeta en los nodos del árbol.' } },
  ],
};

export default content;
