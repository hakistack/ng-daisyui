import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'Breadcrumbs show the path to the current page, like "Home / Documents / Add document". Each step except the last is a link back up; the last step is the page you are on, shown as plain text.',
      es: 'Las migas de pan muestran el camino hasta la página actual, por ejemplo "Inicio / Documentos / Agregar documento". Cada paso, menos el último, es un enlace para regresar; el último es la página donde estás y se muestra como texto.',
    },
    {
      en: "`hk-breadcrumbs` works in two ways. You can pass the list yourself with `[items]`, or turn on `auto` and let it build the list from your Angular routes: you write a `breadcrumb` label in each route's `data` once, and the trail updates on every navigation.",
      es: '`hk-breadcrumbs` funciona de dos formas. Puedes pasar la lista tú mismo con `[items]`, o activar `auto` y dejar que la arme desde tus rutas de Angular: escribes una etiqueta `breadcrumb` en el `data` de cada ruta una sola vez, y el rastro se actualiza en cada navegación.',
    },
  ],
  whenToUse: [
    {
      en: 'Apps with three or more levels of depth (Settings / Users / Jane Doe) where users need a quick way back up.',
      es: 'Apps con tres o más niveles de profundidad (Ajustes / Usuarios / Jane Doe) donde el usuario necesita una forma rápida de subir.',
    },
    {
      en: 'Router-based apps: declare labels once in the route config and use `auto`.',
      es: 'Apps basadas en el router: declara las etiquetas una vez en la configuración de rutas y usa `auto`.',
    },
    {
      en: 'Labels that depend on the URL or loaded data (a record name): use the function form of the route `breadcrumb`.',
      es: 'Etiquetas que dependen de la URL o de datos cargados (el nombre de un registro): usa la forma de función del `breadcrumb` de la ruta.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Flat apps with one or two levels: the active item in the [Menu](/menu) already tells the user where they are.',
      es: 'Apps planas de uno o dos niveles: el item activo del [Menu](/menu) ya le dice al usuario dónde está.',
    },
    {
      en: 'Primary navigation between sections: use [Menu](/menu) or the [App shell](/app-shell).',
      es: 'Navegación principal entre secciones: usa [Menu](/menu) o el [App shell](/app-shell).',
    },
    {
      en: 'Progress through the steps of a process: use the [Wizard](/wizard), which tracks completed and pending steps.',
      es: 'Avance por los pasos de un proceso: usa el [Wizard](/wizard), que lleva cuenta de los pasos completados y pendientes.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BreadcrumbItem, BreadcrumbsComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-document-header',
  imports: [BreadcrumbsComponent],
  template: \`<hk-breadcrumbs [items]="trail" size="sm" ariaLabel="Breadcrumb" />\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentHeaderComponent {
  readonly trail: BreadcrumbItem[] = [
    { label: 'Home', routerLink: '/', icon: 'house' },
    { label: 'Documents', routerLink: '/documents' },
    { label: 'Add document' },
  ];
}
`,
    note: {
      en: 'Crumbs with `routerLink` need `provideRouter(...)`. Icon names must be registered with `provideLucideIcons(...)`. For router-derived trails, replace `[items]` with `auto` (see below).',
      es: 'Las migas con `routerLink` necesitan `provideRouter(...)`. Los nombres de iconos deben registrarse con `provideLucideIcons(...)`. Para rastros derivados del router, cambia `[items]` por `auto` (ver abajo).',
    },
  },
  technical: [
    {
      id: 'auto-mode',
      heading: { en: 'Automatic trails from the router', es: 'Rastros automáticos desde el router' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`BreadcrumbService` walks the activated route snapshot from the root down the `firstChild` chain, accumulating URL segments. Every route whose `data[key]` is set produces a crumb whose `routerLink` is the URL accumulated so far; the last crumb is flagged `current`. The trail is rebuilt on each `NavigationEnd`. `[home]` prepends a fixed crumb and `routeDataKey` changes the key (default `breadcrumb`).',
            es: '`BreadcrumbService` recorre el snapshot de la ruta activa desde la raíz bajando por `firstChild`, acumulando los segmentos de URL. Cada ruta con `data[key]` definido genera una miga cuyo `routerLink` es la URL acumulada hasta ahí; la última queda marcada como `current`. El rastro se reconstruye en cada `NavigationEnd`. `[home]` agrega una miga fija al inicio y `routeDataKey` cambia la clave (por defecto `breadcrumb`).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.routes.ts',
          code: `export const routes: Routes = [
  {
    path: 'documents',
    data: { breadcrumb: 'Documents' },
    children: [
      // Empty-path children inherit the parent's data; null skips the duplicate crumb.
      { path: '', component: DocumentListComponent, data: { breadcrumb: null } },
      { path: 'new', component: AddDocumentComponent, data: { breadcrumb: { label: 'Add document', icon: 'file-plus' } } },
      {
        path: ':id',
        component: DocumentComponent,
        data: { breadcrumb: (ctx: BreadcrumbRouteContext) => 'Document ' + ctx.params['id'] },
      },
    ],
  },
];

// Template:
// <hk-breadcrumbs auto [home]="{ label: 'Home', routerLink: '/', icon: 'house' }" />`,
        },
        {
          kind: 'p',
          text: {
            en: 'A `breadcrumb` value can be a string, a partial item (label, icon, `ariaLabel`, `class`…) or a function that receives `{ data, params, url }` and returns either. `routerLink` and `current` are always computed by the service.',
            es: 'Un valor `breadcrumb` puede ser un string, un item parcial (label, icon, `ariaLabel`, `class`…) o una función que recibe `{ data, params, url }` y devuelve cualquiera de los dos. `routerLink` y `current` siempre los calcula el servicio.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: "Angular copies a parent's `data` into empty-path children and into children of component-less routes. A child without its own `breadcrumb` therefore repeats the parent's crumb. Give it its own value, or `breadcrumb: null` to skip it — the service ignores null values.",
            es: 'Angular copia el `data` del padre a los hijos con path vacío y a los hijos de rutas sin componente. Por eso un hijo sin su propio `breadcrumb` repite la miga del padre. Dale su propio valor, o `breadcrumb: null` para omitirlo; el servicio ignora los valores null.',
          },
        },
      ],
    },
    {
      id: 'manual-mode',
      heading: { en: 'Manual items and rendering', es: 'Items manuales y cómo se dibujan' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'The last item becomes the current page unless another item sets `current: true`. The current crumb is a `<span>`, never a link.',
              es: 'El último item pasa a ser la página actual, a menos que otro tenga `current: true`. La miga actual es un `<span>`, nunca un enlace.',
            },
            {
              en: 'Other crumbs render as `<a href>` (with `rel="noopener noreferrer"` for `target: \'_blank\'`), `<a routerLink>`, a `<button>` when only `action` is set, or a plain `<span>` when disabled.',
              es: 'Las demás migas se dibujan como `<a href>` (con `rel="noopener noreferrer"` si `target` es `\'_blank\'`), `<a routerLink>`, un `<button>` si solo tienen `action`, o un `<span>` simple si están deshabilitadas.',
            },
            {
              en: 'Activating a crumb runs its `action` and emits `(itemSelect)`. `size` maps to `text-xs` … `text-lg`; `maxWidth` limits the width so long trails scroll horizontally.',
              es: 'Activar una miga ejecuta su `action` y emite `(itemSelect)`. `size` se traduce a `text-xs` … `text-lg`; `maxWidth` limita el ancho para que los rastros largos se desplacen horizontalmente.',
            },
            {
              en: '`BreadcrumbService` injects the Router as optional, so the component also works in apps without a router; `auto` then yields an empty trail. Inject the service directly if you only need its `trail` signal.',
              es: '`BreadcrumbService` inyecta el Router como opcional, así que el componente también funciona en apps sin router; en ese caso `auto` da un rastro vacío. Inyecta el servicio directamente si solo necesitas su señal `trail`.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab / Shift+Tab',
        action: {
          en: 'Move between link and action crumbs (current and disabled crumbs are not focusable)',
          es: 'Recorre las migas con enlace o acción (la actual y las deshabilitadas no reciben foco)',
        },
      },
      {
        keys: 'Enter',
        action: {
          en: 'Follow the focused link or run the focused action crumb',
          es: 'Sigue el enlace enfocado o ejecuta la miga de acción enfocada',
        },
      },
      {
        keys: 'Space',
        action: { en: 'Run an action crumb (rendered as a native button)', es: 'Ejecuta una miga de acción (es un botón nativo)' },
      },
    ],
    notes: [
      {
        en: 'The trail is a `<nav>` labelled by `ariaLabel` (default "Breadcrumb") containing an ordered list. Translate the label for non-English apps.',
        es: 'El rastro es un `<nav>` etiquetado con `ariaLabel` (por defecto "Breadcrumb") que contiene una lista ordenada. Traduce la etiqueta si tu app no está en inglés.',
      },
      {
        en: 'The current page carries `aria-current="page"`; disabled crumbs carry `aria-disabled`.',
        es: 'La página actual lleva `aria-current="page"`; las migas deshabilitadas llevan `aria-disabled`.',
      },
      {
        en: 'An icon-only crumb (for example a house icon with no visible text) needs `ariaLabel` so it has an accessible name.',
        es: 'Una miga de solo icono (por ejemplo una casita sin texto visible) necesita `ariaLabel` para tener un nombre accesible.',
      },
    ],
  },
  performance: [
    {
      en: 'In `auto` mode the trail is a `computed()` that depends on a navigation signal, so it rebuilds once per completed navigation, not on every change-detection pass.',
      es: 'En modo `auto` el rastro es un `computed()` que depende de una señal de navegación, así que se reconstruye una vez por navegación completada, no en cada ciclo de detección de cambios.',
    },
    {
      en: 'Function-form labels run on every navigation. Keep them cheap: read resolved route data instead of fetching inside them.',
      es: 'Las etiquetas en forma de función corren en cada navegación. Mantenlas livianas: lee datos ya resueltos de la ruta en vez de hacer peticiones dentro de ellas.',
    },
  ],
  related: [
    {
      id: 'menu',
      note: {
        en: 'Lists where the user can go; breadcrumbs show where they are.',
        es: 'Lista a dónde puede ir el usuario; las migas muestran dónde está.',
      },
    },
    {
      id: 'app-shell',
      note: {
        en: 'Page frame where the trail usually sits above the content.',
        es: 'Marco de la página donde el rastro suele ir arriba del contenido.',
      },
    },
    {
      id: 'wizard',
      note: {
        en: 'For steps of a process rather than levels of a hierarchy.',
        es: 'Para pasos de un proceso en vez de niveles de una jerarquía.',
      },
    },
  ],
};

export default content;
