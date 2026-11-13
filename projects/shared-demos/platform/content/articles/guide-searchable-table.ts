import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: a client-side table of employees where people can type to search across columns, filter by department and salary, sort by clicking a header, and page through the results. Everything is declared once with [createTable](/api/createTable); the data stays a normal input.',
      es: 'Meta: una tabla de empleados del lado del cliente donde se pueda escribir para buscar en todas las columnas, filtrar por departamento y salario, ordenar con un clic en el encabezado y paginar los resultados. Todo se declara una vez con [createTable](/api/createTable); los datos siguen siendo un input normal.',
    },
  ],
  sections: [
    {
      id: 'step-1-providers',
      heading: { en: '1. Register the formatters', es: '1. Registra los formateadores' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Columns can format values with Angular’s built-in pipes through [fmt](/api/fmt). Those pipes are resolved from DI, so add [providePipes](/api/providePipes) once.',
            es: 'Las columnas pueden formatear valores con los pipes integrados de Angular a través de [fmt](/api/fmt). Esos pipes se resuelven por DI, así que añade [providePipes](/api/providePipes) una vez.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { providePipes } from '@hakistack/ng-daisyui';

export const appConfig: ApplicationConfig = {
  providers: [providePipes()],
};`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Without `providePipes()`, the first `fmt.*` column throws a `NullInjectorError` for the pipe (for example `CurrencyPipe`).',
            es: 'Sin `providePipes()`, la primera columna con `fmt.*` lanza un `NullInjectorError` del pipe (por ejemplo `CurrencyPipe`).',
          },
        },
      ],
    },
    {
      id: 'step-2-config',
      heading: { en: '2. Declare columns, search, filters and paging', es: '2. Declara columnas, búsqueda, filtros y paginación' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The `columns` map is keyed by row property, so `format` receives the typed value of that column. Call `createTable` in a field initializer or constructor: it uses `inject()` internally.',
            es: 'El mapa `columns` usa como clave la propiedad de la fila, así que `format` recibe el valor tipado de esa columna. Llama a `createTable` en un inicializador de campo o en el constructor: usa `inject()` internamente.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'employees.component.ts',
          code: `import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { createTable, fmt, TableComponent } from '@hakistack/ng-daisyui';

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  hiredAt: string;
}

@Component({
  selector: 'app-employees',
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<hk-table [data]="employees()" [config]="table" />',
})
export class EmployeesComponent {
  readonly employees = input.required<Employee[]>();

  readonly table = createTable<Employee>({
    columns: {
      name: { header: 'Name' },
      email: { header: 'Email' },
      department: { header: 'Department' },
      salary: { header: 'Salary', format: fmt.currency('USD') },
      hiredAt: { header: 'Hired', format: fmt.date('mediumDate') },
    },
    globalSearch: {
      enabled: true,
      mode: 'contains',
      placeholder: 'Search employees…',
      debounceTime: 300,
      excludeFields: ['id'],
    },
    filters: [
      {
        field: 'department',
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Sales', value: 'Sales' },
          { label: 'Finance', value: 'Finance' },
        ],
      },
      { field: 'salary', type: 'numberRange' },
      { field: 'hiredAt', type: 'dateRange' },
    ],
    pagination: { mode: 'offset', pageSize: 10, pageSizeOptions: [10, 25, 50] },
  });
}`,
        },
        {
          kind: 'table',
          head: [
            { en: 'Option', es: 'Opción' },
            { en: 'What it does', es: 'Qué hace' },
          ],
          rows: [
            [
              { en: '`globalSearch`', es: '`globalSearch`' },
              {
                en: 'Adds the search box. Modes: `contains`, `startsWith`, `exact`, `fuzzy` (Fuse.js). See [GlobalSearchConfig](/api/GlobalSearchConfig).',
                es: 'Añade la caja de búsqueda. Modos: `contains`, `startsWith`, `exact`, `fuzzy` (Fuse.js). Mira [GlobalSearchConfig](/api/GlobalSearchConfig).',
              },
            ],
            [
              { en: '`filters`', es: '`filters`' },
              {
                en: 'A filter icon on each listed column header. Types: `text`, `number`, `date`, `select`, `multiselect`, `boolean`, `dateRange`, `numberRange`. See [ColumnFilter](/api/ColumnFilter).',
                es: 'Un icono de filtro en el encabezado de cada columna listada. Tipos: `text`, `number`, `date`, `select`, `multiselect`, `boolean`, `dateRange`, `numberRange`. Mira [ColumnFilter](/api/ColumnFilter).',
              },
            ],
            [
              { en: '`pagination`', es: '`pagination`' },
              {
                en: 'Client-side slicing in `offset` mode. See [PaginationOptions](/api/PaginationOptions).',
                es: 'Paginación del lado del cliente en modo `offset`. Mira [PaginationOptions](/api/PaginationOptions).',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'step-3-sorting',
      heading: { en: '3. Sorting', es: '3. Ordenamiento' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Sorting needs no configuration: clicking a header cycles ascending, descending and unsorted on that column. hk-table sorts by one column at a time; if you need multi-column sort, use the [DataGrid](/datagrid).',
            es: 'El ordenamiento no necesita configuración: un clic en el encabezado alterna ascendente, descendente y sin orden en esa columna. hk-table ordena por una columna a la vez; si necesitas ordenar por varias columnas, usa el [DataGrid](/datagrid).',
          },
        },
      ],
    },
    {
      id: 'step-4-drive-from-code',
      heading: { en: '4. Drive it from your own controls', es: '4. Contrólala desde tus propios controles' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The object returned by `createTable` is also a controller ([TableController](/api/TableController)). Use it to build a filter bar above the table or a “clear all” button, without `viewChild`. Set `enableFiltering: false` to hide the header icons while keeping the filters usable from code.',
            es: 'El objeto que devuelve `createTable` también es un controlador ([TableController](/api/TableController)). Úsalo para construir una barra de filtros encima de la tabla o un botón de “limpiar todo”, sin `viewChild`. Pon `enableFiltering: false` para ocultar los iconos del encabezado y seguir usando los filtros desde código.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `onlyEngineering(): void {
  this.table.applyColumnFilter('department', 'Engineering', 'equals');
}

resetView(): void {
  this.table.clearAllFilters();
  this.table.clearGlobalSearch();
  this.table.firstPage();
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'To react to what the user does (analytics, URL sync), listen to the `(globalSearchChange)`, `(filterChange)`, `(sortChange)` and `(pageChange)` outputs.',
            es: 'Para reaccionar a lo que hace el usuario (analítica, sincronizar la URL), escucha los outputs `(globalSearchChange)`, `(filterChange)`, `(sortChange)` y `(pageChange)`.',
          },
        },
      ],
    },
    {
      id: 'step-5-next',
      heading: { en: '5. Next steps', es: '5. Próximos pasos' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Data lives on a server? Read [Server-side pagination](/guides/server-side-data).',
              es: '¿Los datos viven en un servidor? Lee [Paginación en el servidor](/guides/server-side-data).',
            },
            {
              en: 'Tens of thousands of rows? Read [Handle large datasets](/guides/large-datasets).',
              es: '¿Decenas de miles de filas? Lee [Maneja grandes volúmenes de datos](/guides/large-datasets).',
            },
            {
              en: 'Translate the search, filter and pagination text with the `labels` options described in [Internationalization](/foundations/i18n).',
              es: 'Traduce los textos de búsqueda, filtros y paginación con las opciones `labels` descritas en [Internacionalización](/foundations/i18n).',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'table', note: { en: 'Every table feature with live examples.', es: 'Todas las funciones de la tabla con ejemplos en vivo.' } },
    { id: 'formatters', note: { en: 'How `fmt.*` and custom pipes work.', es: 'Cómo funcionan `fmt.*` y los pipes personalizados.' } },
    {
      id: 'datagrid',
      note: { en: 'Multi-sort, saved views and server data.', es: 'Orden múltiple, vistas guardadas y datos del servidor.' },
    },
  ],
};

export default content;
