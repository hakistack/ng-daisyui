import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: get from a symptom to the fix quickly. Each entry below is a problem people have actually run into, the reason behind it, and what to change.',
      es: 'Meta: pasar rápido del síntoma a la solución. Cada entrada de abajo es un problema real que la gente ha encontrado, la razón detrás y qué cambiar.',
    },
  ],
  sections: [
    {
      id: 'unstyled',
      heading: { en: 'Components look unstyled or half-styled', es: 'Los componentes salen sin estilos o a medias' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Tailwind v4 does not scan `node_modules`, so it only generates the library’s classes if something tells it to. Importing the package root does: its stylesheet contains an `@source` rule pointing at the compiled bundle.',
            es: 'Tailwind v4 no escanea `node_modules`, así que solo genera las clases de la librería si algo se lo indica. Importar la raíz del paquete lo hace: su hoja de estilos contiene una regla `@source` que apunta al bundle compilado.',
          },
        },
        {
          kind: 'code',
          lang: 'css',
          title: 'src/styles.css',
          code: `@import "tailwindcss";
@plugin "daisyui";
@import "@hakistack/ng-daisyui";`,
        },
        {
          kind: 'list',
          items: [
            {
              en: "On Tailwind 3 / daisyUI 4, import `@hakistack/ng-daisyui/styles-v4.css` instead and register `provideHkTheme('daisyui-v4')`.",
              es: "En Tailwind 3 / daisyUI 4, importa `@hakistack/ng-daisyui/styles-v4.css` en su lugar y registra `provideHkTheme('daisyui-v4')`.",
            },
            {
              en: 'Tabs or menus look wrong but everything else is fine: the daisyUI major version and `provideHkTheme` do not match. See [Theming](/foundations/theming).',
              es: 'Los tabs o menús se ven mal pero todo lo demás bien: la versión mayor de daisyUI y `provideHkTheme` no coinciden. Mira [Temas](/foundations/theming).',
            },
            {
              en: 'Do not “fix” missing classes with safelists; fix the import instead.',
              es: 'No “arregles” clases faltantes con safelists; arregla el import.',
            },
          ],
        },
      ],
    },
    {
      id: 'ng0203',
      heading: {
        en: 'NG0203: inject() must be called from an injection context',
        es: 'NG0203: inject() must be called from an injection context',
      },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '[createTable](/api/createTable) calls `inject()` internally. It works in a field initializer or constructor, but not inside `computed()`, `effect()`, a subscription or an `async` callback. When the table config must be rebuilt from changing data (for example, different columns per sheet), capture the injector and wrap the call. `createForm` and `createDataGrid` do not need an injection context.',
            es: '[createTable](/api/createTable) llama `inject()` internamente. Funciona en un inicializador de campo o en el constructor, pero no dentro de `computed()`, `effect()`, una suscripción o un callback `async`. Cuando la configuración de la tabla debe reconstruirse con datos que cambian (por ejemplo, columnas distintas por hoja), captura el injector y envuelve la llamada. `createForm` y `createDataGrid` no necesitan contexto de inyección.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `import { computed, Directive, inject, Injector, runInInjectionContext, signal } from '@angular/core';
import { ColumnsMap, createTable } from '@hakistack/ng-daisyui';

type Row = Record<string, string>;

@Directive()
export abstract class SheetTableBase {
  private readonly injector = inject(Injector);
  protected readonly columnsForSheet = signal<ColumnsMap<Row>>({});

  readonly table = computed(() => {
    const columns = this.columnsForSheet();
    return runInInjectionContext(this.injector, () => createTable<Row>({ columns }));
  });
}`,
        },
      ],
    },
    {
      id: 'select-toggles',
      heading: { en: 'hk-select opens and closes immediately', es: 'hk-select se abre y se cierra de inmediato' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The select is wrapped in a `<label>`. The label forwards the click to the control, so one click toggles twice. Use a label that does not wrap the control.',
            es: 'El select está envuelto en un `<label>`. El label reenvía el clic al control, así que un solo clic alterna dos veces. Usa un label que no envuelva el control.',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<!-- Avoid -->
<label>Country <hk-select [options]="countries" /></label>

<!-- Use -->
<span class="label">Country</span>
<hk-select [options]="countries" />`,
        },
      ],
    },
    {
      id: 'icons',
      heading: { en: '“Unable to resolve icon”, or icons are blank', es: '“Unable to resolve icon”, o los iconos salen en blanco' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'An icon was referenced by name but never registered. Names are kebab-case (`file-text`, not `FileText`). Register the icons with `provideLucideIcons(...)` from `@lucide/angular`, or pass icon components / icon data where the API accepts them. The table’s default export options use `sheet`, `file-spreadsheet`, `file-text` and `braces`. See [Optimize bundle size](/guides/bundle-size).',
            es: 'Se usó un icono por nombre que nunca se registró. Los nombres van en kebab-case (`file-text`, no `FileText`). Registra los iconos con `provideLucideIcons(...)` de `@lucide/angular`, o pasa componentes / datos del icono donde la API los acepte. Las opciones de exportación por defecto de la tabla usan `sheet`, `file-spreadsheet`, `file-text` y `braces`. Mira [Optimiza el tamaño del bundle](/guides/bundle-size).',
          },
        },
      ],
    },
    {
      id: 'null-injector',
      heading: { en: 'NullInjectorError: No provider for …', es: 'NullInjectorError: No provider for …' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Missing provider', es: 'Proveedor que falta' },
            { en: 'Cause and fix', es: 'Causa y solución' },
          ],
          rows: [
            [
              { en: '`CurrencyPipe`, `DatePipe`, …', es: '`CurrencyPipe`, `DatePipe`, …' },
              {
                en: 'A column uses `fmt.*`. Add [providePipes](/api/providePipes) to the app config.',
                es: 'Una columna usa `fmt.*`. Añade [providePipes](/api/providePipes) a la configuración de la app.',
              },
            ],
            [
              { en: '`Router`', es: '`Router`' },
              {
                en: '[DialogService](/api/DialogService) closes dialogs on navigation and needs the router. Add `provideRouter(routes)`.',
                es: '[DialogService](/api/DialogService) cierra los diálogos al navegar y necesita el router. Añade `provideRouter(routes)`.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'wasm-404',
      heading: { en: 'WASM files return 404', es: 'Los archivos WASM devuelven 404' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'By default no WASM file is fetched at all: binaries are embedded in lazy chunks. A 404 means a URL override is active (`provideTableEngineWasmUrl`, `provideDocumentEngineWasmUrl` or `provideImageEngineWasmUrl`) and the files are not served at that path. Either copy the glue `.js` and its `_bg.wasm` side by side to that URL, or remove the provider to go back to the embedded binaries.',
            es: 'Por defecto no se descarga ningún archivo WASM: los binarios van incrustados en chunks diferidos. Un 404 significa que hay una URL personalizada activa (`provideTableEngineWasmUrl`, `provideDocumentEngineWasmUrl` o `provideImageEngineWasmUrl`) y los archivos no se sirven en esa ruta. Copia el glue `.js` y su `_bg.wasm` juntos en esa URL, o quita el proveedor para volver a los binarios incrustados.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Engine-backed features fall back to TypeScript when the module fails to load, so a 404 shows up as slower behavior and a console message, not a broken screen.',
            es: 'Las funciones con motor vuelven a TypeScript cuando el módulo no carga, así que un 404 se nota como un comportamiento más lento y un mensaje en la consola, no como una pantalla rota.',
          },
        },
      ],
    },
    {
      id: 'pdf-csp',
      heading: { en: 'PDFs never finish loading under a strict CSP', es: 'Los PDF nunca terminan de cargar con una CSP estricta' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The PDFium renderer runs in a Web Worker created from a `blob:` URL. Allow it in your Content Security Policy with `worker-src blob:`.',
            es: 'El renderizador de PDFium corre en un Web Worker creado desde una URL `blob:`. Permítelo en tu Content Security Policy con `worker-src blob:`.',
          },
        },
      ],
    },
    {
      id: 'documents',
      heading: {
        en: 'The document viewer says “Unsupported document format”',
        es: 'El visor de documentos dice “Unsupported document format”',
      },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'The URL has no extension: pass `config.filename` or `config.mimeType`.',
              es: 'La URL no tiene extensión: pasa `config.filename` o `config.mimeType`.',
            },
            {
              en: 'The format is recognized but has no renderer yet (`.doc`, `.odt`, presentations).',
              es: 'El formato se reconoce pero aún no tiene renderizador (`.doc`, `.odt`, presentaciones).',
            },
            {
              en: 'An error that names a package instead (for example `docx-preview`) means an optional peer is missing: install it.',
              es: 'Si en cambio sale un error que nombra un paquete (por ejemplo `docx-preview`), falta un peer opcional: instálalo.',
            },
          ],
        },
      ],
    },
    {
      id: 'forms',
      heading: { en: 'A form stays invalid with nothing visible to fix', es: 'Un formulario sigue inválido sin nada visible que corregir' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A hidden field still has `required: true`. `showWhen` hides a field but keeps its validators. Replace `required` with a `requiredWhen` that matches the `showWhen`. See [Build a complete form](/guides/build-a-form).',
            es: 'Un campo oculto todavía tiene `required: true`. `showWhen` oculta el campo pero mantiene sus validadores. Reemplaza `required` por un `requiredWhen` igual al `showWhen`. Mira [Construye un formulario completo](/guides/build-a-form).',
          },
        },
      ],
    },
    {
      id: 'feedback',
      heading: { en: 'Feedback services do nothing, or too much', es: 'Los servicios de aviso no hacen nada, o hacen de más' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Notifications never appear: mount `<hk-notification-host />` once in the app shell.',
              es: 'Las notificaciones nunca aparecen: monta `<hk-notification-host />` una vez en el shell de la app.',
            },
            {
              en: 'Every toast shows twice: remove the `<hk-toast>` you added; the service mounts its own.',
              es: 'Cada toast sale dos veces: quita el `<hk-toast>` que añadiste; el servicio monta el suyo.',
            },
            {
              en: 'A confirm always proceeds: alert methods return an `AlertResult`; check `result.isConfirmed`.',
              es: 'Un confirm siempre continúa: los métodos de alert devuelven un `AlertResult`; revisa `result.isConfirmed`.',
            },
          ],
        },
      ],
    },
    {
      id: 'ng0103',
      heading: { en: 'NG0103 or endless change detection', es: 'NG0103 o detección de cambios sin fin' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A template binds a method that returns a new object, array or `Date` on every call, for example `[ngModel]="range()"` on a datepicker or `[config]="buildConfig()"`. Each check produces a “new” value, which the child writes back. Move the value into a `computed()` so the reference only changes when its inputs do.',
            es: 'Una plantilla enlaza un método que devuelve un objeto, arreglo o `Date` nuevo en cada llamada, por ejemplo `[ngModel]="range()"` en un datepicker o `[config]="buildConfig()"`. Cada verificación produce un valor “nuevo”, que el hijo vuelve a escribir. Pasa el valor a un `computed()` para que la referencia solo cambie cuando cambian sus entradas.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'installation', note: { en: 'The reference setup.', es: 'La configuración de referencia.' } },
    { id: 'theming', note: { en: 'Stylesheet and theme bridge.', es: 'Hoja de estilos y puente de tema.' } },
    { id: 'guide-bundle-size', note: { en: 'Icons and WASM loading.', es: 'Iconos y carga de WASM.' } },
  ],
};

export default content;
