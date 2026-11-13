import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'The Virtual Scroller shows very long lists without slowing the page down. Instead of drawing ten thousand items, it only draws the few that fit on screen (plus a small buffer) and swaps them as you scroll. To the user it looks like one long list.',
      es: 'El Virtual Scroller muestra listas muy largas sin poner lenta la página. En lugar de dibujar diez mil elementos, solo dibuja los pocos que caben en pantalla (más un pequeño margen) y los va cambiando mientras haces scroll. Para el usuario se ve como una sola lista larga.',
    },
    {
      en: 'You give it the array and a template for one item; it does the rest. It can also lay items out in several columns (a grid of cards) and ask you for data only when an empty part of the list comes into view.',
      es: 'Le das el arreglo y una plantilla para un elemento; él hace el resto. También puede acomodar los elementos en varias columnas (una cuadrícula de tarjetas) y pedirte datos solo cuando una parte vacía de la lista aparece en pantalla.',
    },
    {
      en: 'It is a thin layer over the Angular CDK virtual scroll viewport, with templates, grid mode and lazy loading built in.',
      es: 'Es una capa delgada sobre el viewport de scroll virtual del Angular CDK, con plantillas, modo cuadrícula y carga diferida ya incluidos.',
    },
  ],
  whenToUse: [
    {
      en: 'Long feeds, logs, contact lists or search results where every item has the same height.',
      es: 'Feeds largos, logs, listas de contactos o resultados de búsqueda donde todos los elementos tienen la misma altura.',
    },
    {
      en: 'Image or card galleries with a fixed row height (`numColumns > 1`).',
      es: 'Galerías de imágenes o tarjetas con una altura de fila fija (`numColumns > 1`).',
    },
    {
      en: 'Lists whose total size you know but whose items arrive page by page from an API (`lazy` mode).',
      es: 'Listas de las que sabes el tamaño total pero cuyos elementos llegan página por página desde una API (modo `lazy`).',
    },
  ],
  whenNotToUse: [
    {
      en: 'Data with columns, sorting or filtering: use the [DataGrid](/datagrid) (or [Table](/table) with `virtualScroll`).',
      es: 'Datos con columnas, orden o filtros: usa el [DataGrid](/datagrid) (o [Table](/table) con `virtualScroll`).',
    },
    {
      en: 'Nested data: use the [Tree](/tree) or [Tree Table](/tree-table).',
      es: 'Datos anidados: usa el [Árbol](/tree) o la [Tabla en árbol](/tree-table).',
    },
    {
      en: 'Items whose height changes with content (chat messages, expandable cards): the scroller needs one fixed `itemSize`.',
      es: 'Elementos cuya altura cambia según el contenido (mensajes de chat, tarjetas que se expanden): el scroller necesita un `itemSize` fijo.',
    },
    {
      en: 'A few hundred simple items: a plain `@for` is simpler and keeps everything in the DOM for find-in-page and screen readers.',
      es: 'Unos cientos de elementos simples: un `@for` normal es más sencillo y deja todo en el DOM para la búsqueda del navegador y los lectores de pantalla.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal, TrackByFunction } from '@angular/core';
import { VirtualScrollerComponent } from '@hakistack/ng-daisyui';

interface Contact {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-contact-list',
  imports: [VirtualScrollerComponent],
  template: \`
    <hk-virtual-scroller [items]="contacts()" [itemSize]="56" [trackByFn]="trackById" viewportHeight="480px">
      <ng-template #item let-contact let-i="index">
        <div class="flex h-14 flex-col justify-center border-b border-base-300 px-3">
          <span class="font-medium">{{ i + 1 }}. {{ contact.name }}</span>
          <span class="text-sm opacity-70">{{ contact.email }}</span>
        </div>
      </ng-template>
    </hk-virtual-scroller>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactListComponent {
  readonly contacts = signal<Contact[]>(
    Array.from({ length: 10_000 }, (_, i) => ({ id: i, name: \`Contact \${i + 1}\`, email: \`contact\${i + 1}@example.com\` })),
  );

  readonly trackById: TrackByFunction<Contact> = (_index, contact) => contact.id;
}
`,
    note: {
      en: 'The rendered item must be exactly `itemSize` pixels tall (here `h-14` = 56px). If it is not, scroll position and the visible range drift.',
      es: 'El elemento renderizado debe medir exactamente `itemSize` píxeles de alto (aquí `h-14` = 56px). Si no, la posición del scroll y el rango visible se desfasan.',
    },
  },
  technical: [
    {
      id: 'how-it-renders',
      heading: { en: 'How it renders', es: 'Cómo renderiza' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The component wraps `cdk-virtual-scroll-viewport` with a fixed-size strategy (`itemSize`). The CDK keeps between `minBufferPx` (default 100) and `maxBufferPx` (default 200) pixels of items rendered beyond the viewport and recycles the rest. There is no WASM here: the per-frame work is the CDK range math plus your item template.',
            es: 'El componente envuelve `cdk-virtual-scroll-viewport` con una estrategia de tamaño fijo (`itemSize`). El CDK mantiene entre `minBufferPx` (por defecto 100) y `maxBufferPx` (por defecto 200) píxeles de elementos renderizados fuera del viewport y recicla el resto. Aquí no hay WASM: el trabajo por frame es el cálculo de rango del CDK más tu plantilla.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Template', es: 'Plantilla' },
            { en: 'Purpose', es: 'Uso' },
          ],
          rows: [
            [
              { en: '`#item`', es: '`#item`' },
              {
                en: 'Required. Context: `$implicit`, `index`, `count`, `first`, `last`, `even`, `odd`.',
                es: 'Obligatoria. Contexto: `$implicit`, `index`, `count`, `first`, `last`, `even`, `odd`.',
              },
            ],
            [
              { en: '`#loader`', es: '`#loader`' },
              {
                en: 'Shown for `null` slots; without it a daisyUI `skeleton` of `itemSize` height is used.',
                es: 'Se muestra en los espacios `null`; sin ella se usa un `skeleton` de daisyUI con la altura de `itemSize`.',
              },
            ],
            [
              { en: '`#header` / `#footer`', es: '`#header` / `#footer`' },
              {
                en: 'Rendered above and below the viewport, outside the scrolling area.',
                es: 'Se muestran arriba y abajo del viewport, fuera del área con scroll.',
              },
            ],
          ],
        },
        {
          kind: 'list',
          items: [
            {
              en: "`orientation`: `'vertical'` (default) or `'horizontal'`, where `itemSize` is the item width. `'both'` is treated as vertical.",
              es: "`orientation`: `'vertical'` (por defecto) o `'horizontal'`, donde `itemSize` es el ancho del elemento. `'both'` se trata como vertical.",
            },
            {
              en: 'Grid mode (`numColumns > 1`) chunks the array into rows and virtualizes rows; `itemSize` is the row height and each item gets `100% / numColumns` width. In this mode the `index` in the item context is the position inside the row.',
              es: 'El modo cuadrícula (`numColumns > 1`) divide el arreglo en filas y virtualiza las filas; `itemSize` es la altura de la fila y cada elemento recibe `100% / numColumns` de ancho. En este modo el `index` del contexto es la posición dentro de la fila.',
            },
            {
              en: '`scrollToIndex(index, behavior)` jumps to an item (converted to its row in grid mode). Outputs: `(scrolled)` with `{ first, last }`, `(scrollIndexChange)` with the first rendered index; `scrollDelay` debounces both.',
              es: '`scrollToIndex(index, behavior)` salta a un elemento (convertido a su fila en modo cuadrícula). Salidas: `(scrolled)` con `{ first, last }`, `(scrollIndexChange)` con el primer índice renderizado; `scrollDelay` aplica debounce a ambas.',
            },
          ],
        },
      ],
    },
    {
      id: 'lazy-loading',
      heading: { en: 'Lazy loading', es: 'Carga diferida' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Seed placeholders', es: 'Crear espacios vacíos' },
              detail: {
                en: 'Fill `items` with `null` for every row you know exists.',
                es: 'Llena `items` con `null` para cada fila que sabes que existe.',
              },
            },
            {
              label: { en: 'User scrolls', es: 'El usuario hace scroll' },
              detail: {
                en: 'The scroller checks the visible range plus a buffer for `null` slots.',
                es: 'El scroller revisa el rango visible más un margen buscando espacios `null`.',
              },
            },
            {
              label: { en: '`(lazyLoad)` fires', es: 'Se dispara `(lazyLoad)`' },
              detail: {
                en: 'With `{ first, rows }`; the same range is not emitted twice.',
                es: 'Con `{ first, rows }`; el mismo rango no se emite dos veces.',
              },
            },
            {
              label: { en: 'Patch the slots', es: 'Llenar los espacios' },
              detail: {
                en: 'Replace those `null`s with real items (new array).',
                es: 'Reemplaza esos `null` por elementos reales (arreglo nuevo).',
              },
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `readonly items = signal<(Photo | null)[]>(new Array(5000).fill(null));

async load({ first, rows }: VirtualScrollerLazyLoadEvent): Promise<void> {
  const page = await this.api.photos(first, rows);
  this.items.update((list) => {
    const next = [...list];
    page.forEach((photo, i) => (next[first + i] = photo));
    return next;
  });
}
// <hk-virtual-scroller [items]="items()" [itemSize]="140" [numColumns]="4" [lazy]="true" (lazyLoad)="load($event)">`,
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab',
        action: {
          en: 'Moves through focusable elements inside the rendered items',
          es: 'Recorre los elementos enfocables dentro de los elementos renderizados',
        },
      },
      {
        keys: 'Arrow keys, Page Up / Down',
        action: {
          en: 'Scroll the viewport natively when it (or an item in it) has focus',
          es: 'Hacen scroll del viewport de forma nativa cuando él (o un elemento dentro) tiene el foco',
        },
      },
    ],
    notes: [
      {
        en: 'The component adds no roles, labels or key handlers: semantics come from your item template. If items are actions, make them real `<button>` or `<a>` elements; if they are a list, give the template content list semantics yourself.',
        es: 'El componente no añade roles, etiquetas ni manejo de teclas: la semántica sale de tu plantilla de elemento. Si los elementos son acciones, que sean `<button>` o `<a>` reales; si son una lista, dale tú la semántica de lista al contenido de la plantilla.',
      },
      {
        en: 'Only rendered items exist in the DOM, so screen readers and find-in-page cannot see the rest. Show the total count (for example in the `#header` template) so people know how long the list is.',
        es: 'Solo los elementos renderizados existen en el DOM, así que los lectores de pantalla y la búsqueda del navegador no ven el resto. Muestra el total (por ejemplo en la plantilla `#header`) para que la gente sepa qué tan larga es la lista.',
      },
      {
        en: 'An item that scrolls far out of view is destroyed, and focus inside it is lost. Avoid keeping important focus (an open inline editor, for instance) inside list items.',
        es: 'Un elemento que sale lejos de la vista se destruye, y el foco dentro de él se pierde. Evita dejar un foco importante (por ejemplo, un editor abierto) dentro de los elementos de la lista.',
      },
      {
        en: 'Common mistake: items with no focusable content. Then keyboard users cannot scroll the viewport and axe reports `scrollable-region-focusable`; add a focusable element per item or make the region reachable.',
        es: 'Error común: elementos sin contenido enfocable. Así, quien usa teclado no puede hacer scroll en el viewport y axe reporta `scrollable-region-focusable`; añade un elemento enfocable por elemento o haz que la región sea alcanzable.',
      },
    ],
  },
  performance: [
    {
      en: 'DOM size depends on viewport height and buffer, not on the number of items. The demo scrolls a list of 10,000 products and a lazy list of 5,000 slots with only a screenful rendered.',
      es: 'El tamaño del DOM depende de la altura del viewport y del margen, no de la cantidad de elementos. El demo recorre una lista de 10,000 productos y una lista diferida de 5,000 espacios con solo una pantalla renderizada.',
    },
    {
      en: 'Pass `trackByFn` when items are objects. Without it rows are tracked by index, and replacing the array with new objects re-creates the DOM for visible items.',
      es: 'Pasa `trackByFn` cuando los elementos son objetos. Sin él, las filas se rastrean por índice, y reemplazar el arreglo con objetos nuevos vuelve a crear el DOM de los elementos visibles.',
    },
    {
      en: 'Keep the item template cheap: it runs for every row the CDK recycles while scrolling. Precompute display values instead of calling formatting methods in the template.',
      es: 'Mantén la plantilla del elemento liviana: se ejecuta en cada fila que el CDK recicla mientras haces scroll. Calcula de antemano los valores a mostrar en lugar de llamar métodos de formato en la plantilla.',
    },
    {
      en: 'Grid mode rebuilds the row chunks when `items` or `numColumns` change; update `items` in batches rather than one slot at a time.',
      es: 'El modo cuadrícula reconstruye los grupos de filas cuando cambian `items` o `numColumns`; actualiza `items` por lotes en lugar de un espacio a la vez.',
    },
  ],
  related: [
    {
      id: 'datagrid',
      note: {
        en: 'Virtualizes rows and columns of tabular data, with sorting, filters and state.',
        es: 'Virtualiza filas y columnas de datos tabulares, con orden, filtros y estado.',
      },
    },
    {
      id: 'table',
      note: { en: 'Has its own `virtualScroll` option for long tables.', es: 'Tiene su propia opción `virtualScroll` para tablas largas.' },
    },
    {
      id: 'guide-large-datasets',
      note: {
        en: 'Which component to pick for 1k, 100k or millions of records.',
        es: 'Qué componente elegir para 1k, 100k o millones de registros.',
      },
    },
  ],
};

export default content;
