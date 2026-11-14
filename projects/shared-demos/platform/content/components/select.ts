import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-select` is a dropdown: the user clicks the field, a list of options opens, and they pick one (or several, with `multiple`). You pass the options as a plain array of `{ label, value }` objects; the component handles opening, closing, keyboard navigation and showing what was picked.',
      es: '`hk-select` es un desplegable: la persona hace clic en el campo, se abre una lista de opciones y elige una (o varias, con `multiple`). Le pasas las opciones como un arreglo simple de objetos `{ label, value }`; el componente se encarga de abrir, cerrar, navegar con teclado y mostrar lo que se eligió.',
    },
    {
      en: 'It grows with your data: turn on `enableSearch` to filter with fuzzy matching (typos are forgiven), add a `group` to options to show section headings, and turn on `virtualScroll` so lists with thousands of options stay smooth.',
      es: 'Crece con tus datos: activa `enableSearch` para filtrar con búsqueda difusa (tolera errores de escritura), añade `group` a las opciones para mostrar títulos de sección y activa `virtualScroll` para que listas con miles de opciones se mantengan fluidas.',
    },
  ],
  whenToUse: [
    {
      en: 'Choosing one value from a list that is too long for radio buttons (countries, departments, products).',
      es: 'Elegir un valor de una lista demasiado larga para botones de radio (países, departamentos, productos).',
    },
    {
      en: 'Choosing several values, shown as removable chips, optionally capped with `maxSelectedItems`.',
      es: 'Elegir varios valores, mostrados como chips que se pueden quitar, con un límite opcional usando `maxSelectedItems`.',
    },
    {
      en: 'Large option lists where the user needs to search instead of scroll.',
      es: 'Listas de opciones grandes donde la persona necesita buscar en vez de desplazarse.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Two to four options that should all be visible at once: use a `radio` field in a [Dynamic Form](/forms).',
      es: 'Entre dos y cuatro opciones que deben verse todas a la vez: usa un campo `radio` en un [Formulario dinámico](/forms).',
    },
    {
      en: 'Free text the user types themselves: use [Input](/input).',
      es: 'Texto libre que la persona escribe: usa [Input](/input).',
    },
    {
      en: 'Running app-wide actions or jumping between pages from a search box: use the [Command Palette](/command-palette).',
      es: 'Ejecutar acciones de la app o saltar entre páginas desde un cuadro de búsqueda: usa la [Paleta de comandos](/command-palette).',
    },
    {
      en: 'Picking items from a hierarchy: use the [Tree](/tree) with selection.',
      es: 'Elegir elementos de una jerarquía: usa el [Tree](/tree) con selección.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SelectComponent, type SelectOption } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-select-quick-start',
  imports: [SelectComponent],
  template: \`
    <label for="fruit" class="label">Favorite fruit</label>
    <hk-select
      [id]="'fruit'"
      placeholder="Favorite fruit"
      [options]="fruits"
      [enableSearch]="true"
      (selectionChange)="picked.set($event)"
    />
    <p>Selection: {{ label() }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectQuickStartComponent {
  readonly fruits: SelectOption[] = [
    { label: 'Apple', value: 'apple' },
    { label: 'Mango', value: 'mango' },
    { label: 'Pineapple', value: 'pineapple' },
    { label: 'Guava', value: 'guava', disabled: true },
  ];

  readonly picked = signal<SelectOption | SelectOption[] | null>(null);

  readonly label = computed(() => {
    const value = this.picked();
    if (!value) return 'none';
    return Array.isArray(value) ? value.map((o) => o.label).join(', ') : value.label;
  });
}`,
    note: {
      en: 'With Angular forms, bind `[formControl]` instead: the control receives the option `value` (a `string`, or a `string[]` when `multiple` is on).',
      es: 'Con los formularios de Angular, usa `[formControl]`: el control recibe el `value` de la opción (un `string`, o un `string[]` cuando `multiple` está activo).',
    },
  },
  technical: [
    {
      id: 'state-and-forms',
      heading: { en: 'State, outputs and forms', es: 'Estado, outputs y formularios' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Selection lives in two signals (`selectedOption` for single mode, `selectedOptions` for multiple). Everything the template shows — filtered list, groups, chips, the "+N" counter, select-all state — is a `computed()` over those signals and the inputs.',
            es: 'La selección vive en dos signals (`selectedOption` en modo simple, `selectedOptions` en modo múltiple). Todo lo que muestra la plantilla —lista filtrada, grupos, chips, el contador "+N", el estado de seleccionar todo— es un `computed()` sobre esos signals y los inputs.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Channel', es: 'Canal' },
            { en: 'What it carries', es: 'Qué lleva' },
          ],
          rows: [
            [
              { en: '`ControlValueAccessor`', es: '`ControlValueAccessor`' },
              {
                en: 'Writes the option `value` (or an array of values). `writeValue` accepts values or whole option objects.',
                es: 'Escribe el `value` de la opción (o un arreglo de valores). `writeValue` acepta valores u objetos de opción completos.',
              },
            ],
            [
              { en: '`selectionChange`', es: '`selectionChange`' },
              {
                en: 'The full option, an array of options, or `null` when cleared.',
                es: 'La opción completa, un arreglo de opciones o `null` al limpiar.',
              },
            ],
            [
              { en: '`searchChange`', es: '`searchChange`' },
              {
                en: 'The search text on every keystroke (empty string when the panel opens).',
                es: 'El texto de búsqueda en cada tecla (cadena vacía al abrir el panel).',
              },
            ],
            [
              { en: '`dropdownToggle`', es: '`dropdownToggle`' },
              {
                en: '`true` when the panel opens, `false` when it closes.',
                es: '`true` cuando se abre el panel, `false` cuando se cierra.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'All visible strings (`placeholder`, `searchPlaceholder`, `selectAllLabel`, `clearAllLabel`, `selectedSuffix`, `noOptionsFoundLabel`, `clearSearchLabel`, `noOptionsAvailableLabel`) are inputs, so you can translate them per instance.',
            es: 'Todos los textos visibles (`placeholder`, `searchPlaceholder`, `selectAllLabel`, `clearAllLabel`, `selectedSuffix`, `noOptionsFoundLabel`, `clearSearchLabel`, `noOptionsAvailableLabel`) son inputs, así que puedes traducirlos en cada instancia.',
          },
        },
      ],
    },
    {
      id: 'search-pipeline',
      heading: { en: 'How search works', es: 'Cómo funciona la búsqueda' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Index', es: 'Índice' },
              detail: {
                en: 'With `enableSearch` on, once the user has typed a first query and the list has at least 200 options, an effect builds a fuzzy index over `label` and `value` in the shared Rust/WASM engine. It disposes the previous index when `options` changes.',
                es: 'Con `enableSearch` activo, cuando la persona ya escribió una primera búsqueda y la lista tiene al menos 200 opciones, un effect construye un índice difuso sobre `label` y `value` en el motor Rust/WASM compartido. Libera el índice anterior cuando cambia `options`.',
              },
            },
            {
              label: { en: 'Query', es: 'Consulta' },
              detail: {
                en: 'Each keystroke updates `searchTerm`; `filteredOptions` returns matches in score order from the WASM index.',
                es: 'Cada tecla actualiza `searchTerm`; `filteredOptions` devuelve las coincidencias ordenadas por puntuación desde el índice WASM.',
              },
            },
            {
              label: { en: 'Fallback', es: 'Alternativa' },
              detail: {
                en: 'Lists under 200 options are always searched with a cached Fuse.js index, so the WASM chunk is never downloaded for them. Larger lists use the same Fuse.js index until the WASM index is ready (first query, SSR, tests), so search works immediately.',
                es: 'Las listas de menos de 200 opciones siempre se buscan con un índice de Fuse.js en caché, así que nunca descargan el chunk WASM. Las listas más grandes usan ese mismo índice de Fuse.js hasta que el índice WASM está listo (primera búsqueda, SSR, pruebas), así que la búsqueda funciona de inmediato.',
              },
            },
            {
              label: { en: 'Highlight', es: 'Resaltado' },
              detail: {
                en: 'Matching text is wrapped in a `<mark>` tinted with the theme `warning` color.',
                es: 'El texto que coincide se envuelve en un `<mark>` con un tono del color `warning` del tema.',
              },
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'The engine shares its WASM bundle with the table engine. See [Rust/WASM engines](/systems/wasm-engines) to configure where the file is served from.',
            es: 'El motor comparte su bundle WASM con el motor de tablas. Mira [Motores Rust/WASM](/systems/wasm-engines) para configurar desde dónde se sirve el archivo.',
          },
        },
      ],
    },
    {
      id: 'overlay',
      heading: { en: 'The dropdown panel', es: 'El panel desplegable' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The panel is a CDK connected overlay: it is moved to the overlay container at the end of `<body>`, opens below the field and flips above when there is no room, follows the field while the page scrolls, and takes the field width. Because it leaves the component tree, style it through global CSS and theme variables rather than `:host` styles.',
            es: 'El panel es un overlay conectado de CDK: se mueve al contenedor de overlays al final de `<body>`, se abre debajo del campo y pasa arriba si no hay espacio, sigue al campo cuando la página se desplaza y toma su ancho. Como sale del árbol del componente, dale estilo con CSS global y variables del tema, no con estilos de `:host`.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Options with a `group` are rendered under `menu-title` headings in first-seen order. In multiple mode a Select all / Clear all bar applies to the currently filtered options and respects `maxSelectedItems`.',
            es: 'Las opciones con `group` se renderizan bajo títulos `menu-title` en el orden en que aparecen por primera vez. En modo múltiple, una barra Seleccionar todo / Limpiar todo aplica a las opciones filtradas y respeta `maxSelectedItems`.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      { keys: 'Enter / Space', action: { en: 'On the field: open or close the list.', es: 'En el campo: abre o cierra la lista.' } },
      {
        keys: 'ArrowDown / ArrowUp',
        action: { en: 'Move the highlight through the options.', es: 'Mueve el resaltado entre las opciones.' },
      },
      { keys: 'Home / End', action: { en: 'Highlight the first / last option.', es: 'Resalta la primera / última opción.' } },
      {
        keys: 'Enter',
        action: { en: 'With the list open: choose the highlighted option.', es: 'Con la lista abierta: elige la opción resaltada.' },
      },
      {
        keys: 'Space',
        action: {
          en: 'In multiple mode: toggle the highlighted option without closing.',
          es: 'En modo múltiple: marca o desmarca la opción resaltada sin cerrar.',
        },
      },
      {
        keys: 'Escape',
        action: {
          en: 'In the search box: clear the search. Elsewhere: close the list.',
          es: 'En el cuadro de búsqueda: limpia la búsqueda. En otro lugar: cierra la lista.',
        },
      },
    ],
    notes: [
      {
        en: 'The field is a read-only `<input role="combobox">` with `aria-expanded`, `aria-controls` and `aria-activedescendant` pointing at the highlighted `role="option"`. The list is `role="listbox"` with `aria-multiselectable` in multiple mode.',
        es: 'El campo es un `<input role="combobox">` de solo lectura con `aria-expanded`, `aria-controls` y `aria-activedescendant` apuntando a la `role="option"` resaltada. La lista es `role="listbox"` con `aria-multiselectable` en modo múltiple.',
      },
      {
        en: 'The `id` input is placed on the inner field, so a visible `<label for="...">` names it. When `id` is set the field gets no `aria-label`, and the label is the accessible name; without `id`, the `placeholder` becomes the `aria-label`, so write it as a meaningful name ("Favorite fruit", not "Select..."). Bind `id` as a property (`[id]`, as in the quick start): a plain `id="fruit"` attribute would also stay on the `hk-select` host and duplicate the id.',
        es: 'El input `id` se coloca en el campo interno, así que un `<label for="...">` visible le da nombre. Cuando hay `id`, el campo no lleva `aria-label` y la etiqueta es el nombre accesible; sin `id`, el `placeholder` se usa como `aria-label`, así que escríbelo como un nombre con sentido ("Fruta favorita", no "Selecciona..."). Enlaza `id` como propiedad (`[id]`, como en el inicio rápido): un atributo `id="fruit"` simple también se queda en el host `hk-select` y duplica el id.',
      },
      {
        en: 'Do not wrap `hk-select` inside a `<label>` element: the label forwards the click, the panel opens and immediately closes. Put the label next to it and use `id` instead.',
        es: 'No envuelvas `hk-select` dentro de un elemento `<label>`: la etiqueta reenvía el clic y el panel se abre y se cierra al instante. Pon la etiqueta al lado y usa `id`.',
      },
      {
        en: 'Each chip has a remove button labelled "Remove {label}", and options that cannot be picked get `aria-disabled`.',
        es: 'Cada chip tiene un botón de quitar con la etiqueta "Remove {label}", y las opciones que no se pueden elegir llevan `aria-disabled`.',
      },
    ],
  },
  performance: [
    {
      en: 'Virtual scrolling is opt-in: with `virtualScroll` on, a CDK virtual viewport is used only once the filtered list has more than 100 options; shorter lists render normally. Grouped headings are not shown in the virtualized list.',
      es: 'El desplazamiento virtual es opcional: con `virtualScroll` activo, se usa un viewport virtual de CDK solo cuando la lista filtrada pasa de 100 opciones; las listas más cortas se renderizan de forma normal. Los títulos de grupo no se muestran en la lista virtualizada.',
    },
    {
      en: 'The WASM search engine is only downloaded when a searchable list with 200 or more options receives its first query; smaller lists never load it.',
      es: 'El motor de búsqueda WASM solo se descarga cuando una lista con búsqueda y 200 opciones o más recibe su primera consulta; las listas más pequeñas nunca lo cargan.',
    },
    {
      en: 'The fuzzy index is built once per `options` reference, not per keystroke. Replace the array (do not mutate it) when options change so the index is rebuilt.',
      es: 'El índice difuso se construye una vez por cada referencia de `options`, no en cada tecla. Reemplaza el arreglo (no lo mutes) cuando cambien las opciones para que el índice se reconstruya.',
    },
    {
      en: 'The WASM index is disposed when search is turned off, when options change and when the component is destroyed; the keyboard listener on `document` only exists while the panel is open.',
      es: 'El índice WASM se libera al desactivar la búsqueda, al cambiar las opciones y al destruir el componente; el listener de teclado en `document` solo existe mientras el panel está abierto.',
    },
  ],
  related: [
    {
      id: 'forms',
      note: {
        en: '`select` fields in a Dynamic Form render an `hk-select` for you.',
        es: 'Los campos `select` de un Formulario dinámico renderizan un `hk-select` por ti.',
      },
    },
    {
      id: 'command-palette',
      note: {
        en: 'Same fuzzy engine, but for running commands instead of filling a field.',
        es: 'El mismo motor difuso, pero para ejecutar comandos en vez de llenar un campo.',
      },
    },
    {
      id: 'input',
      note: { en: 'For free text instead of a fixed set of options.', es: 'Para texto libre en vez de un conjunto fijo de opciones.' },
    },
    {
      id: 'wasm-engines',
      note: { en: 'How the shared WASM bundle is loaded and configured.', es: 'Cómo se carga y configura el bundle WASM compartido.' },
    },
  ],
};

export default content;
