import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: keep the rows on your server and let your API sort, filter, search and page them. The DataGrid sends its current state as a request, your API answers with one page and a total, and the grid stays in sync as the user interacts. You write one function: the `dataSource`.',
      es: 'Objetivo: dejar las filas en tu servidor y que tu API las ordene, filtre, busque y pagine. El DataGrid envía su estado actual como una petición, tu API responde con una página y un total, y el grid se mantiene sincronizado mientras el usuario interactúa. Escribes una sola función: el `dataSource`.',
    },
  ],
  sections: [
    {
      id: 'step-1-contract',
      heading: { en: '1. The contract', es: '1. El contrato' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The grid calls your function with a [DataGridRequest](/api/DataGridRequest) and expects a [DataGridPage](/api/DataGridPage) back, as a Promise or an Observable.',
            es: 'El grid llama a tu función con un [DataGridRequest](/api/DataGridRequest) y espera de vuelta un [DataGridPage](/api/DataGridPage), como Promise u Observable.',
          },
        },
        {
          kind: 'code',
          lang: 'json',
          title: 'Request body (example)',
          code: `{
  "sort": [{ "field": "due", "direction": "asc" }, { "field": "amount", "direction": "desc" }],
  "filters": [
    { "field": "status", "operator": "equals", "value": "overdue" },
    { "field": "amount", "operator": "between", "value": [1000, 5000] }
  ],
  "search": "acme",
  "page": { "index": 0, "size": 50 }
}`,
        },
        {
          kind: 'code',
          lang: 'json',
          title: 'Response body',
          code: `{
  "rows": [{ "id": 1, "number": "INV-0001", "customer": "Acme Corp", "amount": 1200, "due": "2025-03-01", "status": "overdue" }],
  "total": 1834
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '`sort` is in priority order (first = primary). `filters` combine with AND.',
              es: '`sort` va en orden de prioridad (el primero es el principal). `filters` se combinan con AND.',
            },
            {
              en: '`page.index` is zero-based. `total` is the count after filters and search, across all pages.',
              es: '`page.index` empieza en cero. `total` es la cantidad después de filtros y búsqueda, sumando todas las páginas.',
            },
            {
              en: 'Filter values are already coerced to the column type: numbers for `number` columns; for `date` columns, `Date` objects arrive as ISO strings while date strings and timestamps pass through as given; `[min, max]` for `between`, arrays for `in` / `notIn`, and no value for `isEmpty` / `isNotEmpty`.',
              es: 'Los valores de los filtros ya vienen convertidos al tipo de la columna: números para columnas `number`; en columnas `date`, los objetos `Date` llegan como strings ISO y los strings de fecha o timestamps pasan tal cual; `[min, max]` para `between`, arreglos para `in` / `notIn` y sin valor para `isEmpty` / `isNotEmpty`.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Validate the request on the server like any other input. Map `field` and `operator` through an allow-list; never paste them into SQL.',
            es: 'Valida la petición en el servidor como cualquier otra entrada. Valida `field` y `operator` contra una lista de valores permitidos; nunca los insertes directamente en SQL.',
          },
        },
      ],
    },
    {
      id: 'step-2-grid',
      heading: { en: '2. Create the grid', es: '2. Crea el grid' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Setting `dataSource` switches [createDataGrid](/api/createDataGrid) to server mode. Always set `pageSize`; without it the grid asks for every row at once (and warns in dev mode).',
            es: 'Al poner `dataSource`, [createDataGrid](/api/createDataGrid) pasa a modo servidor. Define siempre `pageSize`; sin él, el grid pide todas las filas de una vez (y lo advierte en modo desarrollo).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'invoices.component.ts',
          code: `import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { createDataGrid, DataGridComponent, DataGridPage } from '@hakistack/ng-daisyui';

interface Invoice {
  id: number;
  number: string;
  customer: string;
  amount: number;
  due: string;
  status: 'open' | 'paid' | 'overdue';
}

@Component({
  selector: 'app-invoices',
  imports: [DataGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<hk-datagrid [controller]="grid" height="520px" />',
})
export class InvoicesComponent {
  private readonly http = inject(HttpClient);

  readonly grid = createDataGrid<Invoice>({
    columns: [
      { field: 'number', header: 'Invoice' },
      { field: 'customer', header: 'Customer' },
      { field: 'amount', header: 'Amount', type: 'number' },
      { field: 'due', header: 'Due', type: 'date' },
      { field: 'status', header: 'Status' },
    ],
    pageSize: 50,
    search: true,
    ariaLabel: 'Invoices',
    dataSource: (request) => this.http.post<DataGridPage<Invoice>>('/api/invoices/query', request),
  });
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'With `fetch`, forward the abort signal the grid gives you so superseded requests are cancelled:',
            es: 'Con `fetch`, reenvía la señal de cancelación (`AbortSignal`) que te da el grid para que se cancelen las peticiones reemplazadas:',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `dataSource: (request, { signal }) =>
  fetch('/api/invoices/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  }).then((res) => res.json() as Promise<DataGridPage<Invoice>>),`,
        },
      ],
    },
    {
      id: 'step-3-behavior',
      heading: { en: '3. What the grid handles for you', es: '3. Lo que el grid hace por ti' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'User changes the view', es: 'El usuario cambia la vista' },
              detail: { en: 'Sort, filter, search (debounced) or page.', es: 'Ordena, filtra, busca (con debounce) o pagina.' },
            },
            {
              label: { en: 'State updates', es: 'Se actualiza el estado' },
              detail: {
                en: 'Changing sort, filters or search resets to page 0.',
                es: 'Cambiar orden, filtros o búsqueda vuelve a la página 0.',
              },
            },
            {
              label: { en: 'Request is compared by value', es: 'La petición se compara por valor' },
              detail: {
                en: 'Resizing, hiding or reordering columns does not refetch.',
                es: 'Cambiar el ancho, ocultar o reordenar columnas no vuelve a pedir datos.',
              },
            },
            {
              label: { en: 'Previous request is aborted', es: 'Se cancela la petición anterior' },
              detail: {
                en: 'A slow response never overwrites a newer one.',
                es: 'Una respuesta lenta nunca sobrescribe una más reciente.',
              },
            },
            {
              label: { en: 'Page rendered', es: 'Se renderiza la página' },
              detail: {
                en: 'If the page index is past the last page for the new `total`, the grid moves to the last page.',
                es: 'Si el índice de página supera la última página según el nuevo `total`, el grid pasa a la última página.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The controller exposes `loading()` and `error()` signals, and the grid shows its own loading and error states (with a retry action). Call `grid.refresh()` to re-run the current request, for example after saving a row.',
            es: 'El controlador expone los signals `loading()` y `error()`, y el grid muestra sus propios estados de carga y de error (con un botón para reintentar). Llama a `grid.refresh()` para repetir la petición actual, por ejemplo después de guardar una fila.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Selection survives page changes in server mode: selected rows are kept by key. Provide `rowKey` if your rows have no `id`. “Select all” selects the current page only.',
            es: 'En modo servidor la selección sobrevive a los cambios de página: las filas seleccionadas se guardan por clave. Pasa `rowKey` si tus filas no tienen `id`. “Seleccionar todo” selecciona solo la página actual.',
          },
        },
      ],
    },
    {
      id: 'step-4-saved-views',
      heading: { en: '4. Saved views and URLs', es: '4. Vistas guardadas y URLs' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The request is a subset of [DataGridState](/api/DataGridState). Persist `grid.getState()` and restore it with `grid.setState(saved)`, or pass it as `initialState`. `setState` never throws: invalid entries are dropped and returned as `issues`.',
            es: 'La petición es un subconjunto de [DataGridState](/api/DataGridState). Guarda `grid.getState()` y restáuralo con `grid.setState(saved)`, o pásalo como `initialState`. `setState` nunca lanza errores: las entradas inválidas se descartan y se devuelven como `issues`.',
          },
        },
      ],
    },
    {
      id: 'table-alternative',
      heading: { en: 'Using hk-table instead', es: 'Usar hk-table en su lugar' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "hk-table also supports server paging, with more manual wiring: set `pagination: { mode: 'offset', serverSide: true, pageSize }`, pass only the current page as `[data]`, fetch on `(pageChange)`, and report the total with `table.setPagination({ totalItems })`. Selection is page-local and footers aggregate only the current page. For new screens, prefer the DataGrid.",
            es: "hk-table también admite paginación en el servidor, con más trabajo manual: define `pagination: { mode: 'offset', serverSide: true, pageSize }`, pasa solo la página actual en `[data]`, pide datos en `(pageChange)` e informa el total con `table.setPagination({ totalItems })`. La selección es por página y los totales del pie solo cubren la página actual. Para pantallas nuevas, prefiere el DataGrid.",
          },
        },
      ],
    },
  ],
  related: [
    { id: 'datagrid', note: { en: 'Live server example and full API.', es: 'Ejemplo en vivo con servidor y API completa.' } },
    { id: 'architecture-data-pipeline', note: { en: 'How state flows through the grid.', es: 'Cómo fluye el estado por el grid.' } },
    {
      id: 'guide-large-datasets',
      note: { en: 'When client-side is still the right call.', es: 'Cuándo procesar en el cliente sigue siendo la mejor opción.' },
    },
  ],
};

export default content;
