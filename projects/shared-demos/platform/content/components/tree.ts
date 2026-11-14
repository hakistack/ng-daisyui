import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'The Tree shows nested information as a list you can open and close, like the folders in a file explorer. People can expand a branch, pick one or many items, tick checkboxes, search by name and drag items to a new place.',
      es: 'El Árbol muestra información anidada como una lista que se abre y se cierra, como las carpetas de un explorador de archivos. Los usuarios pueden abrir una rama, escoger uno o varios elementos, marcar casillas, buscar por nombre y arrastrar elementos a otro lugar.',
    },
    {
      en: 'Your data is an array of [TreeNode](/api/TreeNode) objects (`label`, optional `children`, `icon`, `data`). `createTree()` puts the nodes and the options together and makes sure every node has a `key`; the `node.*` helpers (`node.folder`, `node.file`, `node.lazy`, `node.fromData`) and `buildTree()` save typing when your data comes from an API.',
      es: 'Tus datos son un arreglo de objetos [TreeNode](/api/TreeNode) (`label`, `children` opcional, `icon`, `data`). `createTree()` junta los nodos con las opciones y se asegura de que cada nodo tenga una `key`; los helpers `node.*` (`node.folder`, `node.file`, `node.lazy`, `node.fromData`) y `buildTree()` te ahorran trabajo cuando los datos vienen de una API.',
    },
  ],
  whenToUse: [
    {
      en: 'Navigating or picking from a hierarchy: folders, categories, permissions, org units.',
      es: 'Navegar o escoger dentro de una jerarquía: carpetas, categorías, permisos, unidades de una organización.',
    },
    {
      en: 'Checkbox trees where a parent reflects its children (three-state checkboxes).',
      es: 'Árboles con casillas donde el padre refleja a sus hijos (casillas de tres estados).',
    },
    {
      en: 'Children that come from the server only when a branch is opened (`node.lazy()` + `(lazyLoad)`).',
      es: 'Hijos que llegan del servidor solo cuando se abre una rama (`node.lazy()` + `(lazyLoad)`).',
    },
    {
      en: 'Letting users reorganize the structure with drag and drop.',
      es: 'Permitir que los usuarios reorganicen la estructura arrastrando y soltando.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Each item needs several columns (owner, size, date): use the [Tree Table](/tree-table).',
      es: 'Cada elemento necesita varias columnas (responsable, tamaño, fecha): usa la [Tabla en árbol](/tree-table).',
    },
    {
      en: 'Site or app navigation with links: use the [Menu](/menu).',
      es: 'Navegación de un sitio o app con enlaces: usa el [Menú](/menu).',
    },
    {
      en: 'A flat, very long list: use the [Virtual Scroller](/virtual-scroller).',
      es: 'Una lista plana y muy larga: usa el [Virtual Scroller](/virtual-scroller).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createTree, TreeComponent, TreeNode } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-project-tree',
  imports: [TreeComponent],
  template: \`
    <hk-tree [tree]="tree" (selectionChange)="onSelect($event)" />
    <p class="mt-2 text-sm">Selected: {{ selected() }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectTreeComponent {
  readonly selected = signal('none');

  readonly tree = createTree({
    nodes: [
      {
        label: 'src',
        expanded: true,
        children: [{ label: 'main.ts' }, { label: 'app.component.ts' }],
      },
      { label: 'package.json' },
    ],
    selectionMode: 'single',
    filterable: true,
    ariaLabel: 'Project files',
  });

  onSelect(selection: TreeNode | TreeNode[] | null): void {
    const node = Array.isArray(selection) ? selection[0] : selection;
    this.selected.set(node?.label ?? 'none');
  }
}
`,
    note: {
      en: "`node.folder()` and `node.lazy()` set `icon: 'folder'` / `expandedIcon: 'folder-open'`. Icons are Lucide names, so register the ones you use (see [Icons](/icons)).",
      es: "`node.folder()` y `node.lazy()` ponen `icon: 'folder'` / `expandedIcon: 'folder-open'`. Los iconos son nombres de Lucide, así que registra los que uses (consulta [Iconos](/icons)).",
    },
  },
  technical: [
    {
      id: 'rendering-model',
      heading: { en: 'Rendering model', es: 'Modelo de renderizado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The component keeps expansion, selection, partial selection and loading as sets of node keys, and renders one flat list (`FlatTreeNode[]`) computed from the nodes, those sets and the filter. Drag, drop and focus state are kept out of that computation so dragging does not rebuild the list.',
            es: 'El componente guarda la expansión, la selección, la selección parcial y la carga como conjuntos de claves de nodo, y renderiza una sola lista plana (`FlatTreeNode[]`) calculada a partir de los nodos, esos conjuntos y el filtro. El estado de arrastre, de soltar y de foco queda fuera de ese cálculo para que arrastrar no reconstruya la lista.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Nodes', es: 'Nodos' },
              detail: { en: '`[tree]` or `[nodes]` + `[config]`.', es: '`[tree]` o `[nodes]` + `[config]`.' },
            },
            {
              label: { en: 'Filter', es: 'Filtro' },
              detail: {
                en: 'Case-insensitive match on `label`; `lenient` keeps ancestors of matches, `strict` keeps only matches.',
                es: 'Coincidencia sin distinguir mayúsculas en `label`; `lenient` conserva los ancestros, `strict` solo las coincidencias.',
              },
            },
            {
              label: { en: 'Flatten', es: 'Aplanar' },
              detail: { en: 'Only children of expanded nodes.', es: 'Solo los hijos de nodos expandidos.' },
            },
            {
              label: { en: 'Render rows', es: 'Mostrar filas' },
              detail: { en: 'One `treeitem` per visible node.', es: 'Un `treeitem` por nodo visible.' },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Initial expansion comes from `expandAll` or from nodes with `expanded: true`, and is only reset when the nodes array reference changes, so re-emitting the same array keeps what the user opened.',
            es: 'La expansión inicial sale de `expandAll` o de los nodos con `expanded: true`, y solo se reinicia cuando cambia la referencia del arreglo de nodos; si vuelves a emitir el mismo arreglo, se conserva lo que el usuario abrió.',
          },
        },
      ],
    },
    {
      id: 'wasm-engine',
      heading: { en: 'WASM tree engine', es: 'Motor WASM del árbol' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When the tree has nodes, it builds an index (labels and depths) and loads it into the shared Rust/WASM engine through [TreeEngineService](/api/TreeEngineService). Once loaded, the label filter, the flatten step, descendant collection for checkbox cascades and the upward tri-state cascade run in WASM. Until then — or if the module fails to load — the same operations run in TypeScript.',
            es: 'Cuando el árbol tiene nodos, construye un índice (etiquetas y profundidades) y lo carga en el motor Rust/WASM compartido mediante [TreeEngineService](/api/TreeEngineService). Una vez cargado, el filtro por etiqueta, el aplanado, la recolección de descendientes para las casillas en cascada y la cascada de tres estados hacia arriba se ejecutan en WASM. Mientras tanto, o si el módulo no carga, las mismas operaciones se ejecutan en TypeScript.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'The engine is the same lazily loaded bundle used by [Table](/table), so it is downloaded once per app. See [WASM engines](/systems/wasm-engines).',
            es: 'El motor es el mismo bundle de carga diferida que usa [Table](/table), así que se descarga una sola vez por app. Consulta [Motores WASM](/systems/wasm-engines).',
          },
        },
      ],
    },
    {
      id: 'interaction',
      heading: { en: 'Selection, lazy loading and drag & drop', es: 'Selección, carga diferida y arrastrar y soltar' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: "`selectionMode`: `'single'`, `'multiple'` (click toggles) or `'checkbox'`. In checkbox mode `propagateSelectionDown` and `propagateSelectionUp` (both on by default) give three-state checkboxes. Set `selectable: false` on a node to lock it, and `selectionAllowParents: false` to allow only leaf nodes in `'single'` / `'multiple'` mode.",
              es: "`selectionMode`: `'single'`, `'multiple'` (cada clic alterna) o `'checkbox'`. En modo casillas, `propagateSelectionDown` y `propagateSelectionUp` (activos por defecto) dan casillas de tres estados. Pon `selectable: false` en un nodo para bloquearlo, y `selectionAllowParents: false` para permitir solo nodos hoja en modo `'single'` / `'multiple'`.",
            },
            {
              en: 'Bind `[selection]` to set the selection from outside; `(selectionChange)` emits a node, an array or `null`.',
              es: 'Enlaza `[selection]` para fijar la selección desde fuera; `(selectionChange)` emite un nodo, un arreglo o `null`.',
            },
            {
              en: 'Drag & drop (`dragDrop: true`) only reports the move: `(nodeDrop)` gives the dragged node, the target, the old and new parent, `before` / `after` / `inside` and the indices. Your handler moves the node in your data. `dragDropSameLevel` and `droppable: false` restrict targets.',
              es: 'Arrastrar y soltar (`dragDrop: true`) solo notifica el movimiento: `(nodeDrop)` trae el nodo arrastrado, el destino, el padre anterior y el nuevo, `before` / `after` / `inside` y los índices. Tu manejador mueve el nodo en tus datos. `dragDropSameLevel` y `droppable: false` limitan dónde se puede soltar.',
            },
            {
              en: 'Custom rows: project `<ng-template #nodeTemplate let-node let-level="level">` inside `<hk-tree>`; the context also has `expanded`, `selected`, `partialSelected`, `first`, `last` and `index`. A `nodeTemplate` in the config works too; the projected template wins.',
              es: 'Filas personalizadas: proyecta `<ng-template #nodeTemplate let-node let-level="level">` dentro de `<hk-tree>`; el contexto también trae `expanded`, `selected`, `partialSelected`, `first`, `last` e `index`. También sirve un `nodeTemplate` en la configuración; la plantilla proyectada tiene prioridad.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Lazy loading',
          code: `// nodes: [node.lazy('Archive')]   (leaf: false, no children yet)
// <hk-tree #tree [tree]="setup" (lazyLoad)="load($event)" />
readonly treeRef = viewChild.required<TreeComponent>('tree');

async load({ node }: TreeLazyLoadEvent): Promise<void> {
  node.children = await this.api.children(node.key!);
  this.treeRef().completeLoading(node); // removes the spinner and expands the node
}`,
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      { keys: 'Down / Up', action: { en: 'Next or previous visible node', es: 'Nodo visible siguiente o anterior' } },
      {
        keys: 'Right',
        action: { en: 'Expand a closed parent (loads lazy children)', es: 'Abre un padre cerrado (carga los hijos diferidos)' },
      },
      {
        keys: 'Left',
        action: { en: 'Collapse an open parent, or move to the parent node', es: 'Cierra un padre abierto, o va al nodo padre' },
      },
      { keys: 'Home / End', action: { en: 'First or last visible node', es: 'Primer o último nodo visible' } },
      {
        keys: 'Enter / Space',
        action: {
          en: 'Select or tick the focused node (when `selectionMode` is set)',
          es: 'Selecciona o marca el nodo enfocado (cuando hay `selectionMode`)',
        },
      },
    ],
    notes: [
      {
        en: 'The node container has `role="tree"` (the filter input stays outside it) with `aria-label` / `aria-labelledby` from the config and `aria-multiselectable` in `multiple` and `checkbox` modes. Each row is a `treeitem` with `aria-level`, `aria-setsize`, `aria-posinset` and, for parents, `aria-expanded`; it has `aria-selected` in `single` / `multiple` mode and `aria-checked` (`true`, `false` or `mixed`) in `checkbox` mode. Focus is roving: only one row has `tabindex="0"`, and moving with the arrows moves real DOM focus.',
        es: 'El contenedor de nodos tiene `role="tree"` (el campo de filtro queda fuera) con `aria-label` / `aria-labelledby` de la configuración y `aria-multiselectable` en los modos `multiple` y `checkbox`. Cada fila es un `treeitem` con `aria-level`, `aria-setsize`, `aria-posinset` y, si es padre, `aria-expanded`; lleva `aria-selected` en modo `single` / `multiple` y `aria-checked` (`true`, `false` o `mixed`) en modo `checkbox`. El foco es itinerante: solo una fila tiene `tabindex="0"`, y al moverte con las flechas se mueve el foco real del DOM.',
      },
      {
        en: 'The tree is one Tab stop: the last focused row, or the first row before any has been focused. The expand buttons and checkboxes inside rows are out of the Tab order; use the arrow keys and Enter / Space instead. Keyboard handling is on by default (`keyboardNavigation: false` turns it off).',
        es: 'El árbol es una sola parada de Tab: la última fila enfocada o, si todavía no se ha enfocado ninguna, la primera. Los botones de expandir y las casillas dentro de las filas quedan fuera del orden de Tab; usa las flechas y Enter / Espacio. El manejo de teclado está activo por defecto (`keyboardNavigation: false` lo desactiva).',
      },
      {
        en: 'Drag & drop uses native drag events and has no keyboard equivalent. If reordering matters, offer another way to move items (for example "Move up" / "Move to…" actions).',
        es: 'Arrastrar y soltar usa los eventos nativos de arrastre del mouse y no tiene equivalente con teclado. Si reordenar es importante, ofrece otra forma de mover elementos (por ejemplo, acciones "Subir" / "Mover a…").',
      },
      {
        en: 'Common mistake: no `ariaLabel` or `ariaLabelledBy`. Give the tree a name, and translate the toggle and clear-filter labels with `labels`.',
        es: 'Error común: no definir `ariaLabel` ni `ariaLabelledBy`. Ponle nombre al árbol y traduce los textos de los botones de expandir/contraer y de limpiar el filtro con `labels`.',
      },
    ],
  },
  performance: [
    {
      en: 'Only expanded branches are flattened and rendered; collapsed subtrees cost nothing in the DOM. With lazy nodes, children are not even in memory until opened.',
      es: 'Solo se aplanan y renderizan las ramas abiertas; los subárboles cerrados no cuestan nada en el DOM. Con nodos diferidos, los hijos ni siquiera están en memoria hasta que se abren.',
    },
    {
      en: 'Filtering and cascades run in WASM once the engine is ready; the index is rebuilt when the nodes array reference changes and the old handle is disposed.',
      es: 'El filtrado y las cascadas se ejecutan en WASM cuando el motor está listo; el índice se reconstruye cuando cambia la referencia del arreglo de nodos y el handle anterior se libera.',
    },
    {
      en: '`TreeConfig` reserves `virtualScroll` and `virtualScrollItemHeight`, but they have no effect yet: the component renders every visible node. For very large trees, keep branches collapsed or load them lazily.',
      es: '`TreeConfig` reserva `virtualScroll` y `virtualScrollItemHeight`, pero todavía no tienen efecto: el componente renderiza todos los nodos visibles. Para árboles muy grandes, mantén las ramas cerradas o cárgalas de forma diferida.',
    },
  ],
  related: [
    { id: 'tree-table', note: { en: 'Hierarchy with columns, sorting and paging.', es: 'Jerarquía con columnas, orden y paginación.' } },
    { id: 'menu', note: { en: 'Navigation menus with links and submenus.', es: 'Menús de navegación con enlaces y submenús.' } },
    { id: 'virtual-scroller', note: { en: 'Flat lists of any length.', es: 'Listas planas de cualquier tamaño.' } },
  ],
};

export default content;
