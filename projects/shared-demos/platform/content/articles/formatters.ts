import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: "Goal: say how a value should look (a date, money, a percentage) as data in your config, instead of writing a format function for every column. A formatter is a small tuple like `['currency', 'USD']` or `['date', 'short']`; the library resolves the name to an Angular pipe and runs it.",
      es: "Objetivo: decir cómo debe verse un valor (una fecha, dinero, un porcentaje) como datos en tu configuración, en vez de escribir una función de formato por columna. Un formateador es una tupla pequeña como `['currency', 'USD']` o `['date', 'short']`; la librería resuelve el nombre a un pipe de Angular y lo ejecuta.",
    },
    {
      en: 'Three pieces work together: [fmt](/api/fmt) builds typed tuples, [PipeRegistryService](/api/PipeRegistryService) maps names to pipes and applies them, and [providePipes](/api/providePipes) makes Angular common pipes injectable and registers your own.',
      es: 'Tres piezas trabajan juntas: [fmt](/api/fmt) construye tuplas con tipos, [PipeRegistryService](/api/PipeRegistryService) asocia nombres con pipes y los aplica, y [providePipes](/api/providePipes) hace inyectables los pipes comunes de Angular y registra los tuyos.',
    },
  ],
  sections: [
    {
      id: 'setup',
      heading: { en: 'Register the pipes once', es: 'Registra los pipes una vez' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { providePipes } from '@hakistack/ng-daisyui';
import { RolePipe } from './role.pipe';

export const appConfig: ApplicationConfig = {
  providers: [
    // Built-ins only: providePipes()
    providePipes({ role: RolePipe }),
  ],
};`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'The registry gets pipe instances from the injector. Angular pipes are not injectable by default, so without `providePipes()` a formatter like `fmt.date()` fails to resolve `DatePipe`. Call it once in your application providers.',
            es: 'El registro obtiene las instancias de los pipes desde el inyector. Los pipes de Angular no son inyectables por defecto, así que sin `providePipes()` un formateador como `fmt.date()` no puede resolver `DatePipe`. Llámalo una vez en los providers de tu aplicación.',
          },
        },
      ],
    },
    {
      id: 'builtins',
      heading: { en: 'Built-in formatters', es: 'Formateadores integrados' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`BUILTIN_PIPE_REGISTRY` maps nine names to Angular common pipes. Options are named objects (or a string shorthand) that the service turns into the pipe positional arguments.',
            es: '`BUILTIN_PIPE_REGISTRY` asocia nueve nombres con pipes comunes de Angular. Las opciones son objetos con nombre (o un atajo de texto) que el servicio convierte en los argumentos posicionales del pipe.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Name', es: 'Nombre' },
            { en: 'Pipe', es: 'Pipe' },
            { en: 'Options', es: 'Opciones' },
          ],
          rows: [
            [
              { en: '`date`', es: '`date`' },
              { en: '`DatePipe`', es: '`DatePipe`' },
              { en: 'Format string, or `{ format, timezone, locale }`', es: 'Texto de formato, o `{ format, timezone, locale }`' },
            ],
            [
              { en: '`currency`', es: '`currency`' },
              { en: '`CurrencyPipe`', es: '`CurrencyPipe`' },
              {
                en: 'Currency code, or `{ currencyCode, display, digitsInfo, locale }`',
                es: 'Código de moneda, o `{ currencyCode, display, digitsInfo, locale }`',
              },
            ],
            [
              { en: '`number`', es: '`number`' },
              { en: '`DecimalPipe`', es: '`DecimalPipe`' },
              { en: '`{ digitsInfo, locale }`', es: '`{ digitsInfo, locale }`' },
            ],
            [
              { en: '`percent`', es: '`percent`' },
              { en: '`PercentPipe`', es: '`PercentPipe`' },
              { en: '`{ digitsInfo, locale }`', es: '`{ digitsInfo, locale }`' },
            ],
            [
              { en: '`json`', es: '`json`' },
              { en: '`JsonPipe`', es: '`JsonPipe`' },
              { en: '`{ space }`', es: '`{ space }`' },
            ],
            [
              { en: '`keyvalue`', es: '`keyvalue`' },
              { en: '`KeyValuePipe`', es: '`KeyValuePipe`' },
              { en: '`{ compareFn }`', es: '`{ compareFn }`' },
            ],
            [
              { en: '`uppercase`, `lowercase`, `titlecase`', es: '`uppercase`, `lowercase`, `titlecase`' },
              { en: 'Case pipes', es: 'Pipes de mayúsculas/minúsculas' },
              { en: 'None', es: 'Ninguna' },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Formatters in a table',
          code: `readonly table = createTable<Invoice>({
  columns: {
    number: { header: 'Invoice' },
    issuedAt: { header: 'Issued', format: fmt.date('mediumDate') },
    amount: { header: 'Amount', format: fmt.currency({ currencyCode: 'USD', display: 'symbol' }) },
    discount: { header: 'Discount', format: fmt.percent({ digitsInfo: '1.0-1' }) },
    status: { header: 'Status', format: fmt.titlecase() },
  },
});`,
        },
        {
          kind: 'p',
          text: {
            en: 'Locale comes from Angular: pipes use your `LOCALE_ID` unless the options pass `locale`. Register locale data (for example `registerLocaleData(localeEs)`) as you would for template pipes.',
            es: 'El idioma lo pone Angular: los pipes usan tu `LOCALE_ID` salvo que las opciones pasen `locale`. Registra los datos de idioma (por ejemplo `registerLocaleData(localeEs)`) igual que para los pipes de plantilla.',
          },
        },
      ],
    },
    {
      id: 'where',
      heading: { en: 'Where formatters are used', es: 'Dónde se usan los formateadores' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '[Table](/table): a column `format` (or the legacy `formatters` map) accepts a tuple or a function. Tuples are resolved through the registry inside `createTable()`, which is why it needs an injection context.',
              es: '[Tabla](/table): el `format` de una columna (o el mapa heredado `formatters`) acepta una tupla o una función. Las tuplas se resuelven con el registro dentro de `createTable()`, y por eso necesita un contexto de inyección.',
            },
            {
              en: '[DataGrid](/datagrid): column `format` is a function `(value, row) => string`; call the registry yourself inside it if you want named pipes.',
              es: '[DataGrid](/datagrid): el `format` de la columna es una función `(value, row) => string`; llama tú el registro dentro de ella si quieres pipes con nombre.',
            },
            {
              en: 'Anywhere else: inject `PipeRegistryService` and call `transform()` or `apply()`.',
              es: 'En cualquier otro lugar: inyecta `PipeRegistryService` y llama `transform()` o `apply()`.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `private readonly pipes = inject(PipeRegistryService);

label(total: number, when: Date): string {
  const money = this.pipes.transform('currency', total, { currencyCode: 'EUR' });
  const date = this.pipes.apply(when, fmt.date('short'));
  return \`\${money} · \${date}\`;
}`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: "`null`, `undefined` and empty strings return `''`, and a pipe that throws (for example `currency` on text) also returns `''` instead of breaking the cell. An unregistered name does throw: \"Pipe ... is not registered\". Use `has(name)` to check first.",
            es: "`null`, `undefined` y el texto vacío devuelven `''`, y un pipe que lanza un error (por ejemplo `currency` sobre texto) también devuelve `''` en vez de romper la celda. Un nombre no registrado sí lanza: \"Pipe ... is not registered\". Usa `has(name)` para comprobar antes.",
          },
        },
      ],
    },
    {
      id: 'custom',
      heading: { en: 'Custom pipes', es: 'Pipes propios' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Any standalone pipe class can be registered by name with `providePipes({ name: PipeClass })`. Custom names win over built-ins with the same name. Options for custom pipes are passed as positional arguments: an object becomes its values in order, anything else becomes a single argument.',
            es: 'Cualquier clase de pipe standalone se puede registrar por nombre con `providePipes({ nombre: ClaseDelPipe })`. Los nombres propios ganan sobre los integrados con el mismo nombre. Las opciones de pipes propios se pasan como argumentos posicionales: un objeto se convierte en sus valores en orden, y cualquier otra cosa en un solo argumento.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'role.pipe.ts',
          code: `@Pipe({ name: 'role' })
export class RolePipe implements PipeTransform {
  transform(value: unknown): string {
    return value === 'admin' ? 'Administrator' : 'Member';
  }
}

// In a table column (custom names are typed as plain tuples):
// role: { header: 'Role', format: (value) => this.pipes.transform('role', value) }`,
        },
        {
          kind: 'p',
          text: {
            en: '`PipeFormatter` (the tuple type accepted by `format`) only covers built-in names. For custom pipes, either call the registry from a format function as above or describe your registry with the `PipeRegistry` type.',
            es: '`PipeFormatter` (el tipo de tupla que acepta `format`) solo cubre los nombres integrados. Para pipes propios, llama el registro desde una función de formato como arriba o describe tu registro con el tipo `PipeRegistry`.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'table', note: { en: 'Column formatters in practice.', es: 'Formateadores de columnas en la práctica.' } },
    {
      id: 'builders',
      note: { en: 'Why createTable needs an injection context.', es: 'Por qué createTable necesita un contexto de inyección.' },
    },
    { id: 'i18n', note: { en: 'Locales and translated labels.', es: 'Idiomas y etiquetas traducidas.' } },
  ],
};

export default content;
