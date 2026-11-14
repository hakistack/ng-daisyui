import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: an invoices grid whose columns sort and filter by the right kind of value, read nested data, show money and dates the way your users expect, render the status as a badge, hide internal columns until someone needs them, and remember the column layout between visits. Everything here is a [DataGridColumn](/api/DataGridColumn) option or a controller call; the grid itself is introduced on the [DataGrid](/datagrid) page.',
      es: 'Objetivo: un grid de facturas cuyas columnas ordenan y filtran por el tipo de valor correcto, leen datos anidados, muestran dinero y fechas como esperan tus usuarios, dibujan el estado como un badge, esconden columnas internas hasta que alguien las necesite y recuerdan el diseño de columnas entre visitas. Todo aquí es una opción de [DataGridColumn](/api/DataGridColumn) o una llamada al controlador; el grid en sí se presenta en la página de [DataGrid](/datagrid).',
    },
  ],
  sections: [
    {
      id: 'step-1-columns',
      heading: { en: '1. Define the columns', es: '1. Define las columnas' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'invoice-grid.component.ts',
          code: `import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { createDataGrid, DataGridComponent, HkDataGridCellDirective, type DataGridColumn } from '@hakistack/ng-daisyui';

interface Invoice {
  id: number;
  number: string;
  customer: { name: string; country: string };
  amount: number;
  issuedAt: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  internalNotes: string;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

const columns: DataGridColumn<Invoice>[] = [
  { field: 'number', header: 'Invoice', width: 120, minWidth: 96 },
  {
    field: 'customer',
    header: 'Customer',
    value: (row) => row.customer.name,
    width: 220,
    description: 'Company the invoice was issued to.',
  },
  { field: 'country', header: 'Country', value: (row) => row.customer.country, width: 110, searchable: false },
  {
    field: 'amount',
    header: 'Amount',
    type: 'number',
    format: (value) => usd.format(Number(value)),
    description: 'Invoice total in USD, taxes included.',
  },
  { field: 'issuedAt', header: 'Issued', type: 'date', format: (value) => day.format(value as Date) },
  {
    field: 'dueDate',
    header: 'Due',
    type: 'date',
    format: (value) => day.format(value as Date),
    description: 'Payment deadline. An unpaid invoice past this date is overdue.',
  },
  { field: 'status', header: 'Status', width: 120, align: 'center', description: 'One of: draft, sent, paid, overdue.' },
  { field: 'internalNotes', header: 'Notes', hidden: true, sortable: false, filterable: false },
];

@Component({
  selector: 'app-invoice-grid',
  imports: [DataGridComponent, HkDataGridCellDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-datagrid [controller]="grid" [data]="invoices()" height="520px">
      <ng-template hkDataGridCell="status" let-value>
        <span class="badge badge-sm" [class]="statusClass(value)">{{ value }}</span>
      </ng-template>
    </hk-datagrid>
  \`,
})
export class InvoiceGridComponent {
  readonly invoices = input.required<readonly Invoice[]>();

  readonly grid = createDataGrid<Invoice>({
    columns,
    search: true,
    pageSize: 50,
    ariaLabel: 'Invoices',
    initialState: { sort: [{ field: 'dueDate', direction: 'asc' }] },
  });

  statusClass(status: unknown): string {
    switch (status) {
      case 'paid':
        return 'bg-success/10 border-success/20 text-success';
      case 'overdue':
        return 'bg-error/10 border-error/20 text-error';
      default:
        return 'badge-ghost';
    }
  }
}`,
        },
        {
          kind: 'table',
          head: [
            { en: 'Option', es: 'Opción' },
            { en: 'Default', es: 'Por defecto' },
            { en: 'What it does', es: 'Qué hace' },
          ],
          rows: [
            [
              { en: '`field`', es: '`field`' },
              { en: 'required', es: 'obligatorio' },
              {
                en: 'Stable id of the column (state, filters, AI) and the default accessor `row[field]`. Keep it unique.',
                es: 'Id estable de la columna (estado, filtros, IA) y el accesor por defecto `row[field]`. Debe ser único.',
              },
            ],
            [
              { en: '`header`', es: '`header`' },
              { en: 'required', es: 'obligatorio' },
              { en: 'Header text. Translate it yourself.', es: 'Texto del encabezado. Lo traduces tú.' },
            ],
            [
              { en: '`type`', es: '`type`' },
              { en: "`'text'`", es: "`'text'`" },
              { en: '`text`, `number`, `date` or `boolean`. See step 2.', es: '`text`, `number`, `date` o `boolean`. Mira el paso 2.' },
            ],
            [
              { en: '`value`', es: '`value`' },
              { en: '`row[field]`', es: '`row[field]`' },
              {
                en: 'Accessor for nested or computed values. Its result is what sorting and filtering use.',
                es: 'Accesor para valores anidados o calculados. Su resultado es lo que usan el orden y los filtros.',
              },
            ],
            [
              { en: '`format`', es: '`format`' },
              { en: 'none', es: 'ninguno' },
              { en: 'Display text. See step 3.', es: 'Texto que se muestra. Mira el paso 3.' },
            ],
            [
              { en: '`width` / `minWidth`', es: '`width` / `minWidth`' },
              {
                en: '160 px (120 for `number` and `boolean`) / 48 px',
                es: '160 px (120 para `number` y `boolean`) / 48 px',
              },
              {
                en: 'Initial width and the lower bound for any resize. See step 5.',
                es: 'Ancho inicial y límite inferior de cualquier cambio de tamaño. Mira el paso 5.',
              },
            ],
            [
              { en: '`align`', es: '`align`' },
              { en: "`'end'` for numbers, else `'start'`", es: "`'end'` para números, si no `'start'`" },
              { en: 'Cell alignment.', es: 'Alineación de la celda.' },
            ],
            [
              { en: '`sortable` / `filterable`', es: '`sortable` / `filterable`' },
              { en: '`true`', es: '`true`' },
              { en: 'See step 6.', es: 'Mira el paso 6.' },
            ],
            [
              { en: '`searchable`', es: '`searchable`' },
              { en: '`true` for `text` columns only', es: '`true` solo para columnas `text`' },
              { en: 'Include the column in the quick search.', es: 'Incluir la columna en la búsqueda rápida.' },
            ],
            [
              { en: '`hidden`', es: '`hidden`' },
              { en: '`false`', es: '`false`' },
              { en: 'Start hidden. See step 6.', es: 'Empieza oculta. Mira el paso 6.' },
            ],
            [
              { en: '`description`', es: '`description`' },
              { en: 'none', es: 'ninguno' },
              { en: 'Header tooltip and AI hint. See step 7.', es: 'Tooltip del encabezado y pista para la IA. Mira el paso 7.' },
            ],
          ],
        },
      ],
    },
    {
      id: 'step-2-types',
      heading: { en: '2. Pick the column type', es: '2. Elige el tipo de columna' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The `type` decides how values compare when sorting, which filter operators the column menu offers (and `setState` accepts), how filter values are coerced (`"5"` becomes `5` on a number column), the default alignment and width, and what the state JSON Schema allows. The operators per type are exported as [DATAGRID_OPERATORS](/api/DATAGRID_OPERATORS).',
            es: 'El `type` decide cómo se comparan los valores al ordenar, qué operadores de filtro ofrece el menú de la columna (y acepta `setState`), cómo se convierten los valores de filtro (`"5"` se vuelve `5` en una columna numérica), la alineación y el ancho por defecto, y lo que permite el JSON Schema del estado. Los operadores por tipo se exportan como [DATAGRID_OPERATORS](/api/DATAGRID_OPERATORS).',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Declare `number` and `date` explicitly. Left as `text`, amounts sort as strings (`"100"` before `"20"`) and lose `between`, `gt` and `lte`.',
              es: 'Declara `number` y `date` de forma explícita. Si quedan como `text`, los montos se ordenan como texto (`"100"` antes de `"20"`) y pierden `between`, `gt` y `lte`.',
            },
            {
              en: 'A `date` column works with `Date` objects or ISO strings. Without `format`, a `Date` is shown with `toLocaleDateString()` and a string as it comes.',
              es: 'Una columna `date` funciona con objetos `Date` o textos ISO. Sin `format`, un `Date` se muestra con `toLocaleDateString()` y un texto tal como llega.',
            },
            {
              en: 'In server mode the type still matters: it shapes the filters your `dataSource` receives and the column menu’s inputs.',
              es: 'En modo servidor el tipo sigue importando: define los filtros que recibe tu `dataSource` y los inputs del menú de la columna.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-3-value-format',
      heading: { en: '3. Raw value versus displayed text', es: '3. Valor crudo versus texto mostrado' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Feature', es: 'Función' },
            { en: 'Uses', es: 'Usa' },
          ],
          rows: [
            [
              { en: 'Sort, filters, AI sample values', es: 'Orden, filtros, valores de muestra para la IA' },
              { en: '`value(row)` (or `row[field]`)', es: '`value(row)` (o `row[field]`)' },
            ],
            [
              {
                en: 'Cell text, quick search, copy to clipboard, double-click auto-size',
                es: 'Texto de la celda, búsqueda rápida, copiar al portapapeles, autoajuste con doble clic',
              },
              {
                en: '`format(value, row)` when set, else the raw value as text',
                es: '`format(value, row)` si existe; si no, el valor crudo como texto',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'So a quick search for “$1,200” matches the formatted amount, while a filter `amount gte 1000` compares numbers. `format` must return a string and should be cheap: it runs for every visible cell. Create `Intl` formatters once, outside the function, as above. To reuse the library’s pipe-based formatters, inject [PipeRegistryService](/api/PipeRegistryService) in the component and call it inside `format`; see [Formatters](/systems/formatters).',
            es: 'Así, una búsqueda rápida de “$1,200” encuentra el monto formateado, mientras que un filtro `amount gte 1000` compara números. `format` debe devolver un texto y debe ser rápido: corre para cada celda visible. Crea los formateadores de `Intl` una sola vez, fuera de la función, como arriba. Para reutilizar los formateadores con pipes de la librería, inyecta [PipeRegistryService](/api/PipeRegistryService) en el componente y llámalo dentro de `format`; mira [Formateadores](/systems/formatters).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `private readonly pipes = inject(PipeRegistryService);

readonly grid = createDataGrid<Invoice>({
  columns: [
    { field: 'amount', header: 'Amount', type: 'number', format: (v) => this.pipes.apply(v, fmt.currency('USD')) },
  ],
});`,
        },
      ],
    },
    {
      id: 'step-4-cell-templates',
      heading: { en: '4. Custom cell templates', es: '4. Plantillas de celda propias' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When text is not enough (a badge, an icon, a progress bar), project an `<ng-template hkDataGridCell="field">` inside `<hk-datagrid>` and import [HkDataGridCellDirective](/api/HkDataGridCellDirective). The context ([DataGridCellContext](/api/DataGridCellContext)) has the raw value as `$implicit`, plus `row`, `column` and `rowIndex` (the index in the current view).',
            es: 'Cuando el texto no alcanza (un badge, un icono, una barra de progreso), proyecta un `<ng-template hkDataGridCell="campo">` dentro de `<hk-datagrid>` e importa [HkDataGridCellDirective](/api/HkDataGridCellDirective). El contexto ([DataGridCellContext](/api/DataGridCellContext)) trae el valor crudo como `$implicit`, además de `row`, `column` y `rowIndex` (el índice en la vista actual).',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'In strict templates `value` and `row` are typed `unknown` (the directive cannot infer your row type). Pass them to a component method that narrows them, like `statusClass(value)`. For row fields, a method such as `invoice(row: unknown) { return row as Invoice; }` keeps the template readable.',
              es: 'En plantillas estrictas, `value` y `row` tienen tipo `unknown` (la directiva no puede inferir el tipo de tus filas). Pásalos a un método del componente que los acote, como `statusClass(value)`. Para campos de la fila, un método como `invoice(row: unknown) { return row as Invoice; }` mantiene la plantilla legible.',
            },
            {
              en: 'The template replaces only what is drawn. Search, copy and auto-size keep using `format` (or the raw value), so give templated columns a sensible `format` too.',
              es: 'La plantilla reemplaza solo lo que se dibuja. La búsqueda, la copia y el autoajuste siguen usando `format` (o el valor crudo), así que dale también un `format` razonable a las columnas con plantilla.',
            },
            {
              en: 'Keep templates presentational. Focus stays on the grid (`aria-activedescendant`), so buttons or inputs inside a cell are outside its keyboard model. For row actions, use `selection` and a toolbar outside the grid.',
              es: 'Mantén las plantillas solo para presentar. El foco se queda en el grid (`aria-activedescendant`), así que los botones o inputs dentro de una celda quedan fuera de su modelo de teclado. Para acciones por fila, usa `selection` y una barra de herramientas fuera del grid.',
            },
            {
              en: 'Rows have a fixed height (`rowHeight`, default 36 px). Content taller than that is clipped.',
              es: 'Las filas tienen una altura fija (`rowHeight`, 36 px por defecto). El contenido más alto se recorta.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-5-widths',
      heading: { en: '5. Widths and resizing', es: '5. Anchos y cambio de tamaño' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Users resize by dragging the header edge, double-click it to fit the visible content (up to 600 px), or press Alt+←/→ on the active column (16 px per step). `resizable: false` on the grid config turns all three off.',
              es: 'Los usuarios cambian el ancho arrastrando el borde del encabezado, hacen doble clic ahí para ajustarlo al contenido visible (hasta 600 px) o presionan Alt+←/→ en la columna activa (16 px por paso). `resizable: false` en la configuración del grid desactiva las tres cosas.',
            },
            {
              en: '`minWidth` is enforced for drags, keyboard, `setColumnWidth(field, px)` and widths that arrive through `setState`.',
              es: '`minWidth` se respeta al arrastrar, con el teclado, con `setColumnWidth(field, px)` y con los anchos que llegan por `setState`.',
            },
            {
              en: 'There is no `maxWidth` and no per-column resize switch. Columns cannot be pinned either: the only pinned column is the selection checkbox column that `selection` adds.',
              es: 'No hay `maxWidth` ni un interruptor de cambio de tamaño por columna. Tampoco se pueden fijar columnas: la única columna fija es la de checkboxes que añade `selection`.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-6-flags',
      heading: { en: '6. Visibility, sorting and filtering flags', es: '6. Visibilidad, orden y filtros' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '`hidden: true` only sets the starting state. Users show the column again from the “Columns” list in any column menu, and code can call `grid.setColumnVisible(field, true)`. The last visible column cannot be hidden.',
              es: '`hidden: true` solo define el estado inicial. Los usuarios vuelven a mostrar la columna desde la lista “Columns” de cualquier menú de columna, y el código puede llamar `grid.setColumnVisible(field, true)`. La última columna visible no se puede ocultar.',
            },
            {
              en: 'With `columnMenu: false` there is no built-in way for users to show hidden columns; provide your own control that calls `setColumnVisible`.',
              es: 'Con `columnMenu: false` no hay una forma integrada para que los usuarios muestren columnas ocultas; ofrece tu propio control que llame `setColumnVisible`.',
            },
            {
              en: '`sortable: false` and `filterable: false` apply everywhere: the header click and menu, `setState` (the entry is dropped and reported as an issue) and the AI schema (the field is left out of the allowed values).',
              es: '`sortable: false` y `filterable: false` aplican en todas partes: el clic en el encabezado y el menú, `setState` (la entrada se descarta y se reporta como issue) y el esquema de la IA (el campo queda fuera de los valores permitidos).',
            },
            {
              en: 'The quick search only looks at visible columns that are `searchable`. Turn it on for a number column (`searchable: true`) if people search amounts as text.',
              es: 'La búsqueda rápida solo mira columnas visibles que sean `searchable`. Actívala en una columna numérica (`searchable: true`) si la gente busca montos como texto.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-7-description',
      heading: { en: '7. Describe columns for people and for the AI', es: '7. Describe las columnas para las personas y para la IA' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`description` is shown as the header tooltip and embedded in `grid.stateSchema()`, which is what `ask()` sends to Claude. Say what the column means in business terms, the unit, and the values it can take: “Payment deadline. An unpaid invoice past this date is overdue.” lets a request like “overdue invoices” map to a `dueDate` filter. Without descriptions, the model only sees the field, type and header.',
            es: '`description` se muestra como tooltip del encabezado y se incluye en `grid.stateSchema()`, que es lo que `ask()` le envía a Claude. Di qué significa la columna en términos del negocio, la unidad y los valores posibles: “Payment deadline. An unpaid invoice past this date is overdue.” permite que una petición como “facturas vencidas” se convierta en un filtro sobre `dueDate`. Sin descripciones, el modelo solo ve el campo, el tipo y el encabezado.',
          },
        },
      ],
    },
    {
      id: 'step-8-layout-state',
      heading: { en: '8. Remember the column layout', es: '8. Recuerda el diseño de columnas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Column order, visibility and width live in `state.columns` as [DataGridColumnState](/api/DataGridColumnState) entries. Save them from `onStateChange` and pass them back through `initialState`. Saved entries for columns that no longer exist are dropped (with a console warning in dev mode), and new columns keep their defaults, so the saved layout survives schema changes.',
            es: 'El orden, la visibilidad y el ancho de las columnas viven en `state.columns` como entradas [DataGridColumnState](/api/DataGridColumnState). Guárdalas desde `onStateChange` y devuélvelas por `initialState`. Las entradas guardadas de columnas que ya no existen se descartan (con un aviso en consola en modo desarrollo), y las columnas nuevas conservan sus valores por defecto, así que el diseño guardado sobrevive a cambios en las columnas.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `const LAYOUT_KEY = 'invoices.columns';

function loadLayout(): DataGridColumnState[] | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? (JSON.parse(raw) as DataGridColumnState[]) : undefined;
  } catch {
    return undefined;
  }
}

const savedLayout = loadLayout();

readonly grid = createDataGrid<Invoice>({
  columns,
  // Leave columns out entirely when nothing is saved: \`columns: undefined\` is reported as invalid.
  initialState: savedLayout ? { columns: savedLayout } : undefined,
  onStateChange: (state) => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.columns));
    } catch {
      // storage unavailable: the layout is just not remembered
    }
  },
});

// Reorder from code: listed columns go first, the rest keep their state and follow.
moveAmountFirst(): void {
  const issues = this.grid.setState({ columns: [{ field: 'amount', width: 180 }] });
  if (issues.length) console.warn(issues);
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Reordering is done through `setState({ columns })`; the grid has no drag-to-reorder for headers.',
              es: 'El reordenamiento se hace con `setState({ columns })`; el grid no permite arrastrar encabezados para reordenarlos.',
            },
            {
              en: '`resetState()` restores everything from `columns` and `initialState`, including sort, filters and search, not only the layout.',
              es: '`resetState()` restaura todo a partir de `columns` e `initialState`, incluidos el orden, los filtros y la búsqueda, no solo el diseño.',
            },
            {
              en: 'Width or visibility changes never trigger a new server request in `dataSource` mode; only sort, filters, search and page do.',
              es: 'Los cambios de ancho o visibilidad nunca disparan una nueva petición al servidor en modo `dataSource`; solo lo hacen el orden, los filtros, la búsqueda y la página.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-9-labels',
      heading: { en: '9. Labels', es: '9. Textos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Headers and descriptions are yours. Everything the grid writes itself (menu items, operator names, “Columns”, pagination, announcements) comes from [DataGridLabels](/api/DataGridLabels): set it app-wide with [provideHkDataGridLabels](/api/provideHkDataGridLabels) or per grid with the `labels` input. Omitted keys fall back to English; `operators` is merged key by key. See [Internationalization](/foundations/i18n).',
            es: 'Los encabezados y las descripciones son tuyos. Todo lo que escribe el grid por su cuenta (opciones del menú, nombres de operadores, “Columns”, paginación, anuncios) viene de [DataGridLabels](/api/DataGridLabels): defínelo para toda la aplicación con [provideHkDataGridLabels](/api/provideHkDataGridLabels) o por grid con el input `labels`. Las claves que omitas usan el inglés; `operators` se combina clave por clave. Mira [Internacionalización](/foundations/i18n).',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<hk-datagrid
  [controller]="grid"
  [labels]="{ columns: 'Columnas', hideColumn: 'Ocultar columna', operators: { contains: 'contiene' } }"
/>`,
        },
      ],
    },
    {
      id: 'next',
      heading: { en: 'What to read next', es: 'Qué leer después' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '[Server-side pagination](/guides/server-side-data): what your API receives from these columns.',
              es: '[Paginación en el servidor](/guides/server-side-data): lo que tu API recibe a partir de estas columnas.',
            },
            {
              en: '[DataGrid](/datagrid): the state model, the data pipeline and the AI layer.',
              es: '[DataGrid](/datagrid): el modelo de estado, el pipeline de datos y la capa de IA.',
            },
            {
              en: '[Extend components](/guides/extend-components): every template slot and provider in the library.',
              es: '[Extiende los componentes](/guides/extend-components): todas las plantillas y proveedores de la librería.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'datagrid', note: { en: 'Component reference and live examples.', es: 'Referencia del componente y ejemplos en vivo.' } },
    { id: 'guide-server-side-data', note: { en: 'Connect the grid to your API.', es: 'Conecta el grid con tu API.' } },
    { id: 'formatters', note: { en: 'Pipe-based formatting.', es: 'Formato basado en pipes.' } },
  ],
};

export default content;
