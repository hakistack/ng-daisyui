import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: configure a component in plain TypeScript, keep it typed, and control it from your class without `@ViewChild`. Most complex components in the library are set up with a `create*()` function that returns either a ready-made config or a **controller**: an object with a `config` you pass to the template and methods you call from anywhere.',
      es: 'Objetivo: configurar un componente en TypeScript simple, con tipos, y controlarlo desde tu clase sin `@ViewChild`. La mayoría de los componentes complejos de la librería se preparan con una función `create*()` que devuelve una configuración lista o un **controlador**: un objeto con un `config` que pasas a la plantilla y métodos que llamas desde cualquier parte.',
    },
    {
      en: 'The builders are not all identical. This page lists what each one returns, how the controller reaches the component, and the two rules that trip people up: injection context and calls made before the view mounts.',
      es: 'Los builders no son todos idénticos. Esta página lista qué devuelve cada uno, cómo el controlador llega al componente y las dos reglas que más confunden: el contexto de inyección y las llamadas hechas antes de que la vista se monte.',
    },
  ],
  sections: [
    {
      id: 'catalog',
      heading: { en: 'The builders at a glance', es: 'Los builders de un vistazo' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Builder', es: 'Builder' },
            { en: 'Returns', es: 'Devuelve' },
            { en: 'Template binding', es: 'Enlace en la plantilla' },
          ],
          rows: [
            [
              { en: '[createForm](/api/createForm)', es: '[createForm](/api/createForm)' },
              {
                en: '`FormController`: `config` signal, `submit()`, `reset()`',
                es: '`FormController`: signal `config`, `submit()`, `reset()`',
              },
              { en: '`<hk-dynamic-form [config]="form.config()" />`', es: '`<hk-dynamic-form [config]="form.config()" />`' },
            ],
            [
              { en: '[createTable](/api/createTable)', es: '[createTable](/api/createTable)' },
              {
                en: '`FieldConfiguration`: resolved columns plus forwarding methods (`sort`, `gotoPage`, `clearAllFilters`…)',
                es: '`FieldConfiguration`: columnas resueltas más métodos que reenvían (`sort`, `gotoPage`, `clearAllFilters`…)',
              },
              { en: '`<hk-table [config]="table" [data]="rows()" />`', es: '`<hk-table [config]="table" [data]="rows()" />`' },
            ],
            [
              { en: '[createTree](/api/createTree)', es: '[createTree](/api/createTree)' },
              {
                en: '`TreeSetup`: `{ config, nodes }` with defaults and keys applied (no methods)',
                es: '`TreeSetup`: `{ config, nodes }` con valores por defecto y claves (sin métodos)',
              },
              { en: '`<hk-tree [tree]="tree" />`', es: '`<hk-tree [tree]="tree" />`' },
            ],
            [
              { en: '[createMenu](/api/createMenu)', es: '[createMenu](/api/createMenu)' },
              {
                en: '`MenuController`: `config`, `collapsed`, `expand()`, `toggle()`, `setCollapsed()`, `find()`',
                es: '`MenuController`: `config`, `collapsed`, `expand()`, `toggle()`, `setCollapsed()`, `find()`',
              },
              { en: '`<hk-menu [config]="menu.config()" />`', es: '`<hk-menu [config]="menu.config()" />`' },
            ],
            [
              { en: '[createCommandPalette](/api/createCommandPalette)', es: '[createCommandPalette](/api/createCommandPalette)' },
              {
                en: '`CommandPaletteController`: `config`, `state`, `open()`, `close()`, `setQuery()`',
                es: '`CommandPaletteController`: `config`, `state`, `open()`, `close()`, `setQuery()`',
              },
              { en: '`<hk-command-palette [config]="palette.config()" />`', es: '`<hk-command-palette [config]="palette.config()" />`' },
            ],
            [
              { en: '[createPdfViewer](/api/createPdfViewer)', es: '[createPdfViewer](/api/createPdfViewer)' },
              {
                en: '`PdfViewerController`: `config`, `state`, navigation, zoom, search, save, annotations, pages, signing',
                es: '`PdfViewerController`: `config`, `state`, navegación, zoom, búsqueda, guardar, anotaciones, páginas, firma',
              },
              {
                en: '`<hk-pdf-viewer [src]="src()" [config]="viewer.config()" />`',
                es: '`<hk-pdf-viewer [src]="src()" [config]="viewer.config()" />`',
              },
            ],
            [
              { en: '[createDataGrid](/api/createDataGrid)', es: '[createDataGrid](/api/createDataGrid)' },
              {
                en: '`DataGridController`: owns `DataGridState`, `rows`, `total`, `setState()`, selection',
                es: '`DataGridController`: dueño de `DataGridState`, `rows`, `total`, `setState()`, selección',
              },
              { en: '`<hk-datagrid [controller]="grid" />`', es: '`<hk-datagrid [controller]="grid" />`' },
            ],
            [
              { en: '[createDocumentEditor](/api/createDocumentEditor)', es: '[createDocumentEditor](/api/createDocumentEditor)' },
              {
                en: '`DocumentEditorController`: `content`, `isDirty`, `undo()`, `save()`, `exportAs()`',
                es: '`DocumentEditorController`: `content`, `isDirty`, `undo()`, `save()`, `exportAs()`',
              },
              {
                en: '`<hk-document-viewer mode="edit" [editor]="editor" />`',
                es: '`<hk-document-viewer mode="edit" [editor]="editor" />`',
              },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Note the three binding shapes: most take `config()` (a signal read), `hk-table` takes the object itself, and `hk-datagrid` and the document editor take the whole controller.',
            es: 'Fíjate en las tres formas de enlace: la mayoría recibe `config()` (lectura de un signal), `hk-table` recibe el objeto tal cual, y `hk-datagrid` y el editor de documentos reciben el controlador completo.',
          },
        },
      ],
    },
    {
      id: 'mechanics',
      heading: { en: 'How a controller reaches its component', es: 'Cómo un controlador llega a su componente' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The library uses a few mechanisms, each a closure created by the builder:',
            es: 'La librería usa varios mecanismos, cada uno un closure creado por el builder:',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '**Trigger signals** (`createForm`): `submit()` and `reset()` increment hidden counter signals inside `config()`; the form reacts with an effect.',
              es: '**Signals disparadores** (`createForm`): `submit()` y `reset()` incrementan signals contadores ocultos dentro de `config()`; el formulario reacciona con un effect.',
            },
            {
              en: '**Handler binding** (`createPdfViewer`, `createMenu`, `createCommandPalette`, `createDocumentEditor`): `config()` carries an internal channel. When the component mounts it calls `bind(handlers)`, and controller methods dispatch to those handlers. Unmounting unbinds them.',
              es: '**Enlace de handlers** (`createPdfViewer`, `createMenu`, `createCommandPalette`, `createDocumentEditor`): `config()` lleva un canal interno. Al montarse, el componente llama `bind(handlers)` y los métodos del controlador despachan a esos handlers. Al desmontarse se desenlazan.',
            },
            {
              en: '**Instance forwarding** (`createTable`): the table registers itself with the configuration; methods forward to the first registered instance and warn when none is attached. `get(id)` returns a named instance.',
              es: '**Reenvío a la instancia** (`createTable`): la tabla se registra en la configuración; los métodos reenvían a la primera instancia registrada y avisan si no hay ninguna. `get(id)` devuelve una instancia con nombre.',
            },
            {
              en: '**State owner** (`createDataGrid`): the controller holds the state and computes rows itself; the component only renders. The same calls work from code, a saved view or the AI layer.',
              es: '**Dueño del estado** (`createDataGrid`): el controlador guarda el estado y calcula las filas; el componente solo pinta. Las mismas llamadas funcionan desde código, una vista guardada o la capa de IA.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Calling a controller from the class',
          code: `readonly menu = createMenu({
  items: [
    { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
    { id: 'settings', label: 'Settings', children: [{ label: 'Account', routerLink: '/settings/account' }] },
  ],
});

openSettings(): void {
  this.menu.expand('settings'); // no @ViewChild
}`,
        },
      ],
    },
    {
      id: 'rules',
      heading: { en: 'Rules that matter', es: 'Reglas importantes' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Create once.** Call builders in a field initializer or constructor, not inside a template method or a `computed()`: each call creates a new controller and a new internal channel.',
              es: '**Crea una vez.** Llama los builders en un inicializador de campo o en el constructor, no dentro de un método de plantilla ni de un `computed()`: cada llamada crea un controlador y un canal interno nuevos.',
            },
            {
              en: '**Injection context.** `createTable()` calls `inject(PipeRegistryService)` internally, so it must run in an injection context (field initializer, constructor, or `runInInjectionContext`). Calling it from `computed()` or `effect()` throws NG0203. `createDataGrid()` does not need one.',
              es: '**Contexto de inyección.** `createTable()` llama `inject(PipeRegistryService)` por dentro, así que debe correr en un contexto de inyección (inicializador de campo, constructor o `runInInjectionContext`). Llamarlo desde `computed()` o `effect()` lanza NG0203. `createDataGrid()` no lo necesita.',
            },
            {
              en: '**Before mount.** Handler-bound controllers are safe before the view exists: void methods do nothing, and some promise methods of the PDF viewer reject with "Viewer not mounted". Call them again after the component is on screen.',
              es: '**Antes de montar.** Los controladores con handlers son seguros antes de que exista la vista: los métodos sin retorno no hacen nada, y algunos métodos con promesa del visor PDF se rechazan con "Viewer not mounted". Vuelve a llamarlos cuando el componente esté en pantalla.',
            },
            {
              en: '**Volatile data stays on inputs.** The PDF source (`[src]`), table rows (`[data]`) and document files stay as inputs so routes and uploads drive them naturally; the builder holds the stable options.',
              es: '**Los datos volátiles van en inputs.** La fuente del PDF (`[src]`), las filas de la tabla (`[data]`) y los archivos de documentos se quedan como inputs para que las rutas y las subidas los manejen con naturalidad; el builder guarda las opciones estables.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'createTable from a reactive context',
          code: `private readonly injector = inject(Injector);

readonly table = computed(() =>
  runInInjectionContext(this.injector, () => createTable<User>({ columns: this.columns() })),
);`,
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Small, static configs do not need a builder. Menu items, for example, are plain objects (`{ label, routerLink, icon }`); the `item.*` and `field.*` helpers are optional sugar.',
            es: 'Las configuraciones pequeñas y estáticas no necesitan builder. Los ítems del menú, por ejemplo, son objetos simples (`{ label, routerLink, icon }`); los helpers `item.*` y `field.*` son azúcar opcional.',
          },
        },
      ],
    },
  ],
  related: [
    {
      id: 'key-patterns',
      note: {
        en: 'Signals, OnPush and the other library-wide conventions.',
        es: 'Signals, OnPush y las demás convenciones de la librería.',
      },
    },
    { id: 'forms', note: { en: 'createForm in depth.', es: 'createForm en detalle.' } },
    { id: 'datagrid', note: { en: 'The state-owning controller.', es: 'El controlador dueño del estado.' } },
    { id: 'pdf-viewer', note: { en: 'The largest handler-bound controller.', es: 'El controlador con handlers más grande.' } },
  ],
};

export default content;
