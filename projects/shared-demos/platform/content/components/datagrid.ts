import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'The DataGrid is an advanced table for working with large amounts of information. You can search, sort, filter and organize the data without building any of those features yourself.',
      es: 'El DataGrid es una tabla avanzada para trabajar con grandes cantidades de información. Puedes buscar, ordenar, filtrar y organizar los datos sin tener que construir todas esas funciones por tu cuenta.',
    },
    {
      en: 'Everything the grid shows — sort order, filters, search text, page and column layout — lives in one plain object, the `DataGridState`. You can save it, send it to your server, restore it later, or let Claude produce it from a sentence like "overdue invoices over 10k, newest first".',
      es: 'Todo lo que muestra el grid (el orden, los filtros, el texto de búsqueda, la página y las columnas) vive en un solo objeto, el `DataGridState`. Puedes guardarlo, mandarlo a tu servidor, restaurarlo después o dejar que Claude lo genere a partir de una frase como "facturas vencidas de más de 10k, las más recientes primero".',
    },
    {
      en: 'You create it with `createDataGrid()` and render it with `<hk-datagrid [controller]="grid" />`. Data can live in the browser (`data`) or come one page at a time from your API (`dataSource`). New grid features are added here, not to [Table](/table).',
      es: 'Lo creas con `createDataGrid()` y lo muestras con `<hk-datagrid [controller]="grid" />`. Los datos pueden estar en el navegador (`data`) o llegar página por página desde tu API (`dataSource`). Las funciones nuevas de grid se añaden aquí, no a [Table](/table).',
    },
  ],
  whenToUse: [
    {
      en: 'Tens or hundreds of thousands of rows, or many columns: rows and columns are both virtualized, so the DOM stays small.',
      es: 'Decenas o cientos de miles de filas, o muchas columnas: se virtualizan tanto las filas como las columnas, así que el DOM se mantiene pequeño.',
    },
    {
      en: 'Your API already sorts, filters and pages: pass a `dataSource` and the grid sends it a `DataGridRequest` every time the view changes.',
      es: 'Tu API ya ordena, filtra y pagina: pasa un `dataSource` y el grid le envía un `DataGridRequest` cada vez que cambia la vista.',
    },
    {
      en: 'You need saved views, shareable URLs or natural-language queries: `getState()`, `setState()` and `stateSchema()` give you a validated JSON contract.',
      es: 'Necesitas vistas guardadas, URLs que se puedan compartir o consultas en lenguaje natural: `getState()`, `setState()` y `stateSchema()` te dan un contrato JSON validado.',
    },
    {
      en: 'Spreadsheet-style work: multi-column sort, cell ranges with copy to the clipboard, and a full keyboard model.',
      es: 'Trabajo tipo hoja de cálculo: orden por varias columnas, rangos de celdas que se copian al portapapeles y un modelo de teclado completo.',
    },
  ],
  whenNotToUse: [
    {
      en: 'You need row actions, inline editing, footers with totals, grouping, master-detail or row reordering today: those exist in [Table](/table), not in the DataGrid yet.',
      es: 'Necesitas hoy acciones por fila, edición en línea, pies con totales, agrupación, maestro-detalle o reordenar filas: eso existe en [Table](/table), todavía no en el DataGrid.',
    },
    {
      en: 'Rows have children (folders, org charts): use [Tree Table](/tree-table). The DataGrid has no hierarchy.',
      es: 'Las filas tienen hijos (carpetas, organigramas): usa [Tree Table](/tree-table). El DataGrid no maneja jerarquías.',
    },
    {
      en: 'Rows have different heights or are not tabular (cards, chat messages): use [Virtual Scroller](/virtual-scroller). The DataGrid needs one fixed `rowHeight`.',
      es: 'Las filas tienen alturas distintas o no son tabulares (tarjetas, mensajes de chat): usa [Virtual Scroller](/virtual-scroller). El DataGrid necesita un `rowHeight` fijo.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createDataGrid, DataGridComponent } from '@hakistack/ng-daisyui';

interface Invoice {
  id: number;
  customer: string;
  amount: number;
  dueDate: Date;
  paid: boolean;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

@Component({
  selector: 'app-invoices',
  imports: [DataGridComponent],
  template: \`<hk-datagrid [controller]="grid" height="480px" />\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesComponent {
  // createDataGrid() does not need an injection context.
  readonly grid = createDataGrid<Invoice>({
    columns: [
      { field: 'customer', header: 'Customer' },
      { field: 'amount', header: 'Amount', type: 'number', format: (value) => usd.format(Number(value)) },
      { field: 'dueDate', header: 'Due', type: 'date' },
      { field: 'paid', header: 'Paid', type: 'boolean', format: (value) => (value ? 'Yes' : 'No') },
    ],
    data: [
      { id: 1, customer: 'Acme Corp', amount: 12500, dueDate: new Date(2025, 2, 1), paid: false },
      { id: 2, customer: 'Globex', amount: 830, dueDate: new Date(2025, 0, 15), paid: true },
      { id: 3, customer: 'Initech', amount: 4200, dueDate: new Date(2025, 1, 20), paid: false },
    ],
    search: true,
    pageSize: 25,
    ariaLabel: 'Invoices',
  });
}
`,
    note: {
      en: 'Omit `pageSize` to virtualize every row instead of paging. `data` also accepts a signal, or bind `[data]` on the component.',
      es: 'Quita `pageSize` para virtualizar todas las filas en lugar de paginar. `data` también acepta un signal, o puedes enlazar `[data]` en el componente.',
    },
  },
  technical: [
    {
      id: 'state-model',
      heading: { en: 'State model', es: 'Modelo de estado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The controller holds one signal of type [DataGridState](/api/DataGridState): `sort` (keys in priority order), `filters` (combined with AND), `search`, `page` (`null` when unpaginated) and `columns` (order, visibility, width). Every UI action goes through it, so the same calls work from code, a saved view or an LLM. Row selection is kept outside the state on purpose: it is data, not view.',
            es: 'El controlador guarda un solo signal de tipo [DataGridState](/api/DataGridState): `sort` (claves en orden de prioridad), `filters` (combinados con AND), `search`, `page` (`null` si no hay paginación) y `columns` (orden, visibilidad y ancho). Toda acción de la interfaz pasa por ahí, así que las mismas llamadas sirven desde código, desde una vista guardada o desde un LLM. La selección de filas queda fuera del estado a propósito: es dato, no vista.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `const issues = grid.setState({
  sort: [{ field: 'amount', direction: 'desc' }],
  filters: [{ field: 'paid', operator: 'equals', value: false }],
  columns: [{ field: 'customer', width: 220 }],
});
// issues: [] when everything was valid; otherwise { path, message } per dropped part

localStorage.setItem('invoices-view', JSON.stringify(grid.getState()));
grid.stateSchema(); // JSON Schema (2020-12) of a valid state for these columns`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '`setState(patch)` never throws. Unknown fields, operators that do not fit the column type and out-of-range page sizes (max 1000) are dropped and returned as `DataGridStateIssue[]`; values are coerced to the column type.',
              es: '`setState(patch)` nunca lanza errores. Los campos desconocidos, los operadores que no corresponden al tipo de columna y los tamaños de página fuera de rango (máx. 1000) se descartan y se devuelven como `DataGridStateIssue[]`; los valores se convierten al tipo de la columna.',
            },
            {
              en: 'Column patches only need `field`. Columns you do not list keep their state and move after the listed ones.',
              es: 'Los parches de columnas solo necesitan `field`. Las columnas que no incluyes conservan su estado y pasan después de las que sí incluyes.',
            },
            {
              en: '`initialState` is merged over the defaults derived from `columns`; `resetState()` goes back to that. `onStateChange` fires after every change, user or programmatic.',
              es: '`initialState` se combina con los valores por defecto que salen de `columns`; `resetState()` vuelve a ese punto. `onStateChange` se dispara después de cada cambio, del usuario o por código.',
            },
            {
              en: 'Valid operators per column type are exported as `DATAGRID_OPERATORS` (for example `between`, `gt` and `lte` exist for `number` and `date`, not for `text`).',
              es: 'Los operadores válidos por tipo de columna se exportan como `DATAGRID_OPERATORS` (por ejemplo, `between`, `gt` y `lte` existen para `number` y `date`, no para `text`).',
            },
          ],
        },
      ],
    },
    {
      id: 'data-pipeline',
      heading: { en: 'Data pipeline', es: 'Pipeline de datos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'In client mode the view is a pure function of the data and the state, memoized in a `computed()`. It runs in TypeScript; the WASM table engine is used by [Table](/table), not by the DataGrid.',
            es: 'En modo cliente la vista es una función pura de los datos y el estado, memorizada en un `computed()`. Corre en TypeScript; el motor WASM de tablas lo usa [Table](/table), no el DataGrid.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Filters', es: 'Filtros' },
              detail: {
                en: 'Every filter must match (AND), on the raw value.',
                es: 'Todos los filtros deben cumplirse (AND), sobre el valor original.',
              },
            },
            {
              label: { en: 'Quick search', es: 'Búsqueda rápida' },
              detail: {
                en: 'Case-insensitive substring over visible, searchable columns, on the formatted text.',
                es: 'Subcadena sin distinguir mayúsculas en las columnas visibles y buscables, sobre el texto formateado.',
              },
            },
            {
              label: { en: 'Multi-key sort', es: 'Orden por varias claves' },
              detail: {
                en: 'Stable; each accessor runs once per row, not per comparison.',
                es: 'Estable; cada accessor corre una vez por fila, no por comparación.',
              },
            },
            {
              label: { en: 'Page slice', es: 'Corte de página' },
              detail: {
                en: 'Only when `page` is set; the index is clamped if the data shrank.',
                es: 'Solo si hay `page`; el índice se ajusta si los datos se redujeron.',
              },
            },
            {
              label: { en: 'Render window', es: 'Ventana de render' },
              detail: { en: 'Visible rows and columns plus overscan.', es: 'Filas y columnas visibles más un margen extra.' },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'With a `dataSource`, the grid sends `{ sort, filters, search, page }` plus an `AbortSignal` and expects `{ rows, total }` back, as a Promise or an Observable. Requests are compared by value, so resizing or hiding a column does not refetch, and a superseded request is aborted so a slow answer never overwrites a newer one. `refresh()` re-runs the current request. See [Server-side pagination](/guides/server-side-data).',
            es: 'Con un `dataSource`, el grid envía `{ sort, filters, search, page }` junto con un `AbortSignal` y espera `{ rows, total }` de vuelta, como Promise u Observable. Las peticiones se comparan por valor, así que cambiar el ancho u ocultar una columna no vuelve a pedir datos, y una petición reemplazada se cancela para que una respuesta lenta nunca pise una más nueva. `refresh()` repite la petición actual. Mira [Paginación en el servidor](/guides/server-side-data).',
          },
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: '`format` only changes what is displayed (and what quick search matches). Sorting and filters always use the raw value from `value(row)` or `row[field]`.',
            es: '`format` solo cambia lo que se muestra (y lo que encuentra la búsqueda rápida). El orden y los filtros siempre usan el valor original de `value(row)` o `row[field]`.',
          },
        },
      ],
    },
    {
      id: 'virtualization-and-rendering',
      heading: { en: 'Virtualization and rendering', es: 'Virtualización y renderizado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'There is one render pipeline for every mode. Rows use fixed-height math: the window is the rows that intersect the viewport plus 6 on each side. Columns use prefix-sum offsets and a binary search: the window is the columns in view plus 2 on each side. The header is sticky and the selection checkbox column is pinned. Because of this, the grid needs a bounded `height` (default `480px`) and every row must fit `rowHeight` (default 36px).',
            es: 'Hay un solo pipeline de render para todos los modos. Las filas usan cálculo de altura fija: la ventana son las filas que tocan el viewport más 6 por cada lado. Las columnas usan offsets acumulados y búsqueda binaria: la ventana son las columnas visibles más 2 por cada lado. El encabezado queda fijo y la columna de casillas de selección queda anclada. Por eso el grid necesita un `height` acotado (por defecto `480px`) y cada fila debe caber en `rowHeight` (por defecto 36px).',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<hk-datagrid [controller]="grid" height="600px">
  <ng-template hkDataGridCell="status" let-value let-row="row">
    <span class="badge badge-sm">{{ value }}</span>
  </ng-template>
</hk-datagrid>`,
        },
        {
          kind: 'list',
          items: [
            {
              en: "[HkDataGridCellDirective](/api/HkDataGridCellDirective) replaces one column's cell content. The context gives the raw value, `row`, `column` and `rowIndex`.",
              es: '[HkDataGridCellDirective](/api/HkDataGridCellDirective) reemplaza el contenido de las celdas de una columna. El contexto trae el valor original, `row`, `column` y `rowIndex`.',
            },
            {
              en: 'All UI text can be changed per instance with the `labels` input or app-wide with [provideHkDataGridLabels](/api/provideHkDataGridLabels).',
              es: 'Todo el texto de la interfaz se puede cambiar por instancia con el input `labels` o para toda la app con [provideHkDataGridLabels](/api/provideHkDataGridLabels).',
            },
            {
              en: 'Default row identity is `row.id`, else the row object. Pass `rowKey` when rows are replaced with new objects and selection must survive.',
              es: 'La identidad de fila por defecto es `row.id`, o si no el propio objeto. Pasa `rowKey` cuando las filas se reemplazan por objetos nuevos y la selección debe mantenerse.',
            },
          ],
        },
      ],
    },
    {
      id: 'ai-layer',
      heading: { en: 'Natural-language views (AI)', es: 'Vistas en lenguaje natural (IA)' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Pass `ai: { apiKey }` (usually from your app environment) and the grid shows an AI box and enables `controller.ask(query)`. The grid sends Claude the column catalog, the valid operators, the current view and the request, with a JSON Schema for structured output. The reply goes through the same `setState()` validation as any other input, so an invalid answer can only be dropped, never applied.',
            es: 'Pasa `ai: { apiKey }` (normalmente desde el environment de tu app) y el grid muestra una caja de IA y habilita `controller.ask(query)`. El grid le envía a Claude el catálogo de columnas, los operadores válidos, la vista actual y la petición, con un JSON Schema para la salida estructurada. La respuesta pasa por la misma validación de `setState()` que cualquier otra entrada, así que una respuesta inválida solo se descarta, nunca se aplica.',
          },
        },
        {
          kind: 'code',
          lang: 'bash',
          code: 'npm install @anthropic-ai/sdk',
          title: 'Optional peer dependency',
        },
        {
          kind: 'list',
          items: [
            {
              en: '`ask()` never rejects: it resolves to `applied` (with a one-sentence `explanation` and any `issues`), `error` or `cancelled`. A new call cancels the one in flight; `undoAsk()` restores the previous view while the answer is still on screen.',
              es: '`ask()` nunca rechaza: resuelve como `applied` (con una `explanation` de una oración y los `issues` que haya), `error` o `cancelled`. Una llamada nueva cancela la que está en curso; `undoAsk()` restaura la vista anterior mientras la respuesta siga en pantalla.',
            },
            {
              en: '`@anthropic-ai/sdk` is loaded with a dynamic import on the first request, so apps that never ask do not ship it. Default model: `claude-opus-5-5` (override with `ai.model`).',
              es: '`@anthropic-ai/sdk` se carga con un import dinámico en la primera petición, así que las apps que nunca preguntan no lo incluyen. Modelo por defecto: `claude-opus-5-5` (cámbialo con `ai.model`).',
            },
            {
              en: 'No row data is sent by default. `sampleValues: n` (client mode only) shares up to n frequent values per text column and min/max for number and date columns, so the model can match names exactly.',
              es: 'Por defecto no se envía ningún dato de las filas. `sampleValues: n` (solo en modo cliente) comparte hasta n valores frecuentes por columna de texto y el mínimo/máximo de las columnas de número y fecha, para que el modelo pueda emparejar nombres exactos.',
            },
            {
              en: 'Column `description` text is included in the prompt and in `stateSchema()`; it is the best way to map business words ("overdue") to fields.',
              es: 'El texto de `description` de cada columna va en el prompt y en `stateSchema()`; es la mejor forma de conectar palabras del negocio ("vencida") con los campos.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'With `apiKey` the call is made from the browser, so anyone who can open the app can read the key. For public apps, use `ai.complete` to send the request through your own endpoint instead.',
            es: 'Con `apiKey` la llamada se hace desde el navegador, así que cualquiera que pueda abrir la app puede leer la clave. En apps públicas, usa `ai.complete` para enviar la petición por tu propio endpoint.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab',
        action: { en: 'Moves focus into or out of the grid (one tab stop)', es: 'Entra o sale del grid (una sola parada de Tab)' },
      },
      {
        keys: 'Arrow keys',
        action: {
          en: 'Move the active cell; Up from the first row reaches the header',
          es: 'Mueven la celda activa; Arriba desde la primera fila llega al encabezado',
        },
      },
      { keys: 'Shift + Arrow keys', action: { en: 'Extend the cell range', es: 'Extienden el rango de celdas' } },
      {
        keys: 'Ctrl/Cmd + Arrow keys',
        action: { en: 'Jump to the first or last row or column', es: 'Saltan a la primera o última fila o columna' },
      },
      {
        keys: 'Home / End',
        action: {
          en: 'First or last cell of the row (with Ctrl: of the grid)',
          es: 'Primera o última celda de la fila (con Ctrl: del grid)',
        },
      },
      { keys: 'Page Up / Page Down', action: { en: 'Move one viewport of rows', es: 'Mueven una pantalla de filas' } },
      { keys: 'Ctrl/Cmd + A', action: { en: 'Select every cell', es: 'Selecciona todas las celdas' } },
      {
        keys: 'Ctrl/Cmd + C',
        action: {
          en: 'Copy the range (or active cell) as tab-separated text',
          es: 'Copia el rango (o la celda activa) como texto separado por tabulaciones',
        },
      },
      {
        keys: 'Escape',
        action: {
          en: 'Collapse the range; in the column menu, close it and return to the grid',
          es: 'Reduce el rango; en el menú de columna, lo cierra y vuelve al grid',
        },
      },
      {
        keys: 'Enter / Space (header)',
        action: {
          en: 'Sort the column; with Shift, add it as another sort level',
          es: 'Ordena la columna; con Shift, la añade como otro nivel de orden',
        },
      },
      {
        keys: 'Space (row)',
        action: { en: 'Toggle row selection when `selection` is set', es: 'Marca o desmarca la fila cuando hay `selection`' },
      },
      { keys: 'Alt + Down, Shift + F10, Menu key', action: { en: 'Open the column menu', es: 'Abre el menú de la columna' } },
      {
        keys: 'Alt + Left / Right',
        action: { en: 'Resize the active column by 16px', es: 'Cambia el ancho de la columna activa en 16px' },
      },
    ],
    notes: [
      {
        en: 'The scroll viewport is the `role="grid"` element and keeps focus. The active cell is exposed with `aria-activedescendant`, so focus is never lost when virtualization removes rows; moving with the keyboard scrolls the cell into view first.',
        es: 'El viewport con scroll es el elemento `role="grid"` y mantiene el foco. La celda activa se expone con `aria-activedescendant`, así que el foco nunca se pierde cuando la virtualización quita filas; al moverte con el teclado, primero se hace scroll hasta la celda.',
      },
      {
        en: 'Rendered rows and cells carry `aria-rowindex` / `aria-colindex`, and the grid sets `aria-rowcount` / `aria-colcount`, so screen readers report positions correctly. The primary sort column has `aria-sort`; rows have `aria-selected` when selection is on; `aria-busy` is set while loading.',
        es: 'Las filas y celdas renderizadas llevan `aria-rowindex` / `aria-colindex`, y el grid define `aria-rowcount` / `aria-colcount`, así que los lectores de pantalla anuncian bien la posición. La columna principal de orden tiene `aria-sort`; las filas tienen `aria-selected` cuando hay selección; `aria-busy` se activa mientras carga.',
      },
      {
        en: 'A polite live region announces the row count after each change (or the loading message); AI answers are announced through a `role="status"` region and errors use `role="alert"`.',
        es: 'Una región en vivo educada anuncia la cantidad de filas después de cada cambio (o el mensaje de carga); las respuestas de la IA se anuncian en una región `role="status"` y los errores usan `role="alert"`.',
      },
      {
        en: 'Common mistake: forgetting `ariaLabel`. The grid has no other accessible name.',
        es: 'Error común: olvidar `ariaLabel`. El grid no tiene otro nombre accesible.',
      },
      {
        en: 'Keys are handled only while focus is on the grid element. A button inside a cell template does not take part in grid navigation, so keep cell templates for display and put row actions elsewhere.',
        es: 'Las teclas solo se procesan mientras el foco está en el elemento grid. Un botón dentro de una plantilla de celda no participa en la navegación del grid, así que usa las plantillas de celda para mostrar contenido y pon las acciones de fila en otro lugar.',
      },
    ],
  },
  performance: [
    {
      en: 'DOM size depends on the viewport, not on the data: only visible rows and columns plus a small overscan are rendered. The "100k rows" example keeps 100,000 generated invoices in the browser with search, multi-sort and selection.',
      es: 'El tamaño del DOM depende del viewport, no de los datos: solo se renderizan las filas y columnas visibles más un pequeño margen. El ejemplo "100k filas" mantiene 100,000 facturas generadas en el navegador con búsqueda, orden múltiple y selección.',
    },
    {
      en: 'State, view and render windows are signals and `computed()` values under OnPush; scrolling only recomputes the window, not the filtered and sorted view. The search box is debounced by 250 ms.',
      es: 'El estado, la vista y las ventanas de render son signals y valores `computed()` con OnPush; el scroll solo recalcula la ventana, no la vista filtrada y ordenada. La caja de búsqueda tiene un debounce de 250 ms.',
    },
    {
      en: 'In server mode only one page is held in memory; selection is kept by key so rows stay selected on pages that are no longer loaded.',
      es: 'En modo servidor solo se guarda una página en memoria; la selección se guarda por clave, así que las filas siguen seleccionadas en páginas que ya no están cargadas.',
    },
    {
      en: 'Copying is capped at 500,000 cells so a huge range cannot freeze the tab.',
      es: 'La copia está limitada a 500,000 celdas para que un rango enorme no congele la pestaña.',
    },
  ],
  related: [
    {
      id: 'table',
      note: {
        en: 'Feature-rich table for CRUD screens: actions, inline editing, footers, grouping, master-detail. Single-column sort, no column virtualization.',
        es: 'Tabla con muchas funciones para pantallas CRUD: acciones, edición en línea, pies, agrupación, maestro-detalle. Orden por una sola columna, sin virtualizar columnas.',
      },
    },
    {
      id: 'tree-table',
      note: { en: 'When rows have child rows.', es: 'Cuando las filas tienen filas hijas.' },
    },
    {
      id: 'virtual-scroller',
      note: {
        en: 'Virtualized list or card grid without columns, sorting or state.',
        es: 'Lista o cuadrícula de tarjetas virtualizada, sin columnas, orden ni estado.',
      },
    },
    {
      id: 'guide-server-side-data',
      note: { en: 'Step by step: wiring `dataSource` to your API.', es: 'Paso a paso: conectar `dataSource` a tu API.' },
    },
  ],
};

export default content;
