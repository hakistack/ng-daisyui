import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Components ship with English defaults for their built-in text: buttons, placeholders, empty states and `aria-label`s. The goal of this page is to make all of that speak your users’ language, either with fixed strings at startup or with a translation library that switches at runtime.',
      es: 'Los componentes traen sus textos integrados en inglés por defecto: botones, placeholders, estados vacíos y valores de `aria-label`. La meta de esta página es que todo eso hable el idioma de tus usuarios, ya sea con textos fijos al iniciar o con una librería de traducción que cambia en tiempo de ejecución.',
    },
    {
      en: 'Your own content (field labels, column headers, menu items) is never translated by the library: you pass it in, so you translate it.',
      es: 'Tu propio contenido (etiquetas de campos, encabezados de columnas, ítems de menú) nunca lo traduce la librería: tú lo pasas, así que tú lo traduces.',
    },
  ],
  sections: [
    {
      id: 'three-mechanisms',
      heading: { en: 'Three ways to override text', es: 'Tres formas de reemplazar textos' },
      blocks: [
        {
          kind: 'list',
          ordered: true,
          items: [
            {
              en: '**App-wide providers.** A `provide*Labels()` function registers an injection token once in `app.config.ts`. Every instance of that component uses it. It takes a labels object, a `Signal` of labels, or a function that returns either one ([HkLabelsSource](/api/HkLabelsSource)). A signal follows language switches.',
              es: '**Proveedores globales.** Una función `provide*Labels()` registra un token de inyección una sola vez en `app.config.ts`. Todas las instancias de ese componente lo usan. Acepta un objeto de etiquetas, un `Signal` de etiquetas o una función que devuelve cualquiera de los dos ([HkLabelsSource](/api/HkLabelsSource)). Un signal sigue los cambios de idioma.',
            },
            {
              en: '**Config objects.** Some builders take a `labels` property (tables, trees), and the toast and alert providers accept `labels` inside their global config.',
              es: '**Objetos de configuración.** Algunos builders reciben una propiedad `labels` (tablas, árboles), y los proveedores de toast y alert aceptan `labels` dentro de su configuración global.',
            },
            {
              en: '**Component inputs.** Some components expose a `labels` input or one input per string (Datepicker, DataGrid, Select). Inputs are reactive, so bind them to translation signals to follow language switches.',
              es: '**Inputs del componente.** Algunos componentes exponen un input `labels` o un input por texto (Datepicker, DataGrid, Select). Los inputs son reactivos: enlázalos a signals de traducción para seguir los cambios de idioma.',
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Every labels object is partial: any key you leave out falls back to the English default.',
            es: 'Todo objeto de etiquetas es parcial: cualquier clave que omitas usa el valor por defecto en inglés.',
          },
        },
      ],
    },
    {
      id: 'surfaces',
      heading: { en: 'Where each component takes its text', es: 'Dónde recibe sus textos cada componente' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Component', es: 'Componente' },
            { en: 'How to override', es: 'Cómo reemplazar' },
          ],
          rows: [
            [
              { en: 'Dynamic form', es: 'Formulario dinámico' },
              {
                en: '[provideHkDynamicFormLabels](/api/provideHkDynamicFormLabels) (also exported under its original name, `provideDynamicFormLabels`) — wizard buttons, editor and loading placeholders',
                es: '[provideHkDynamicFormLabels](/api/provideHkDynamicFormLabels) (también exportado con su nombre original, `provideDynamicFormLabels`) — botones del asistente, placeholders del editor y de carga',
              },
            ],
            [
              { en: 'DataGrid', es: 'DataGrid' },
              {
                en: '[provideHkDataGridLabels](/api/provideHkDataGridLabels) or the `labels` input',
                es: '[provideHkDataGridLabels](/api/provideHkDataGridLabels) o el input `labels`',
              },
            ],
            [
              { en: 'Notification', es: 'Notification' },
              {
                en: '[provideHkNotificationLabels](/api/provideHkNotificationLabels)',
                es: '[provideHkNotificationLabels](/api/provideHkNotificationLabels)',
              },
            ],
            [
              { en: 'Command palette', es: 'Command palette' },
              {
                en: '[provideHkCommandPaletteLabels](/api/provideHkCommandPaletteLabels)',
                es: '[provideHkCommandPaletteLabels](/api/provideHkCommandPaletteLabels)',
              },
            ],
            [
              { en: 'PDF viewer', es: 'Visor de PDF' },
              { en: '[provideHkPdfLabels](/api/provideHkPdfLabels)', es: '[provideHkPdfLabels](/api/provideHkPdfLabels)' },
            ],
            [
              { en: 'Document workspace', es: 'Workspace de documentos' },
              {
                en: '[provideHkDocumentWorkspaceLabels](/api/provideHkDocumentWorkspaceLabels)',
                es: '[provideHkDocumentWorkspaceLabels](/api/provideHkDocumentWorkspaceLabels)',
              },
            ],
            [
              { en: 'Alert', es: 'Alert' },
              {
                en: '[provideAlert](/api/provideAlert) with `labels` ([AlertLabels](/api/AlertLabels)) or a `translate` function',
                es: '[provideAlert](/api/provideAlert) con `labels` ([AlertLabels](/api/AlertLabels)) o una función `translate`',
              },
            ],
            [
              { en: 'Toast', es: 'Toast' },
              {
                en: '[provideToast](/api/provideToast) with `labels` ([ToastLabels](/api/ToastLabels)) — the online/offline messages',
                es: '[provideToast](/api/provideToast) con `labels` ([ToastLabels](/api/ToastLabels)) — los mensajes de conexión y desconexión',
              },
            ],
            [
              { en: 'Table', es: 'Tabla' },
              {
                en: '`labels`, `filterLabels`, and the `labels` of `pagination`, `globalSearch` and `columnVisibility` in [createTable](/api/createTable)',
                es: '`labels`, `filterLabels` y los `labels` de `pagination`, `globalSearch` y `columnVisibility` en [createTable](/api/createTable)',
              },
            ],
            [
              { en: 'Tree', es: 'Árbol' },
              {
                en: '`labels` in the tree config ([TreeLabels](/api/TreeLabels))',
                es: '`labels` en la configuración del árbol ([TreeLabels](/api/TreeLabels))',
              },
            ],
            [
              { en: 'Datepicker', es: 'Datepicker' },
              {
                en: '`labels` input ([DatepickerLabels](/api/DatepickerLabels)); month and weekday names come from the `locale` input via `Intl`',
                es: 'Input `labels` ([DatepickerLabels](/api/DatepickerLabels)); los nombres de meses y días salen del input `locale` mediante `Intl`',
              },
            ],
            [
              { en: 'Select', es: 'Select' },
              {
                en: 'One input per string: `placeholder`, `searchPlaceholder`, `selectAllLabel`, `noOptionsFoundLabel`, …',
                es: 'Un input por texto: `placeholder`, `searchPlaceholder`, `selectAllLabel`, `noOptionsFoundLabel`, …',
              },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { provideAlert, provideHkDataGridLabels, provideHkDynamicFormLabels, provideToast } from '@hakistack/ng-daisyui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHkDynamicFormLabels({ previousButton: 'Anterior', nextButton: 'Siguiente', completeButton: 'Enviar' }),
    provideAlert({ labels: { confirm: 'Confirmar', cancel: 'Cancelar', ok: 'Aceptar' } }),
    provideToast({ labels: { onlineMessage: '¡Conexión restablecida!', offlineMessage: 'Sin conexión' } }),
    provideHkDataGridLabels({
      searchPlaceholder: 'Buscar…',
      empty: 'Sin resultados',
      rowsPerPage: 'Filas por página',
      range: (start, end, total) => \`\${start}–\${end} de \${total}\`,
    }),
  ],
};`,
        },
      ],
    },
    {
      id: 'gaps',
      heading: { en: 'Known gaps', es: 'Limitaciones conocidas' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Form validation messages are English.** Messages such as “Email is required” are built from the field label and are not part of `DynamicFormLabels`. For localized messages, return them from the form-level `validate` function of [createForm](/api/createForm), which shows your text on the named field.',
              es: '**Los mensajes de validación del formulario están en inglés.** Mensajes como “Email is required” se construyen con la etiqueta del campo y no forman parte de `DynamicFormLabels`. Para mensajes localizados, devuélvelos desde la función `validate` a nivel de formulario en [createForm](/api/createForm), que muestra tu texto en el campo indicado.',
            },
            {
              en: '**Automatic placeholders.** Field builders without a `placeholder` generate an English one from the label (“Enter email”). Pass `placeholder` to replace it.',
              es: '**Placeholders automáticos.** Los builders de campos sin `placeholder` generan uno en inglés a partir de la etiqueta (“Enter email”). Pasa `placeholder` para reemplazarlo.',
            },
            {
              en: '**Toast, table and tree labels are read from config.** `provideToast({ labels })` is read once, and table and tree labels follow a switch only when you rebuild their config. Every `provide*Labels()` function, the component inputs and the alert `translate` + `langChange$` hooks do follow a switch.',
              es: '**Las etiquetas de toast, tabla y árbol se leen de la configuración.** `provideToast({ labels })` se lee una vez, y las de tabla y árbol siguen un cambio solo si reconstruyes su configuración. Todas las funciones `provide*Labels()`, los inputs de los componentes y los hooks `translate` + `langChange$` del alert sí siguen un cambio.',
            },
          ],
        },
      ],
    },
    {
      id: 'hakistack-i18n',
      heading: { en: 'Runtime switching with @hakistack/i18n', es: 'Cambio en tiempo de ejecución con @hakistack/i18n' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`@hakistack/i18n` is a companion package on top of Transloco: you author translations in `.ts` files and a codegen produces typed keys (`TK`) and JSON. It is independent of `@hakistack/ng-daisyui`; the two connect through the mechanisms above.',
            es: '`@hakistack/i18n` es un paquete complementario sobre Transloco: escribes las traducciones en archivos `.ts` y un codegen produce claves tipadas (`TK`) y JSON. Es independiente de `@hakistack/ng-daisyui`; los dos se conectan mediante los mecanismos de arriba.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'For app-wide providers, pass a function. It runs once, in an injection context, so it can call `translateSignal`. Return a `computed()` over those signals: when the language changes, every instance re-renders with the new text.',
            es: 'Para los proveedores globales, pasa una función. Se ejecuta una vez, en un contexto de inyección, así que puede llamar a `translateSignal`. Devuelve un `computed()` sobre esos signals: cuando cambia el idioma, todas las instancias se vuelven a pintar con el texto nuevo.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig, computed } from '@angular/core';
import { translateSignal } from '@hakistack/i18n';
import { provideHkDataGridLabels, provideHkDynamicFormLabels } from '@hakistack/ng-daisyui';
import { TK } from './i18n/definitions/keys.generated';

export const appConfig: ApplicationConfig = {
  providers: [
    // provideI18n({ ... }) from @hakistack/i18n goes here too
    provideHkDynamicFormLabels(() => {
      const previous = translateSignal(TK.wizard.previous);
      const next = translateSignal(TK.wizard.next);
      const submit = translateSignal(TK.wizard.submit);
      return computed(() => ({ previousButton: previous(), nextButton: next(), completeButton: submit() }));
    }),
    provideHkDataGridLabels(() => {
      const empty = translateSignal(TK.grid.empty);
      const search = translateSignal(TK.grid.search);
      return computed(() => ({ empty: empty(), searchPlaceholder: search() }));
    }),
  ],
};`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Create the translation signals in the function body, not inside the `computed()`: `translateSignal` uses `toSignal`, which cannot run inside a reactive context. The same code works with `translateSignal` from `@jsverse/transloco`. Without a translation library, pass a `signal()` you own and `set()` it when the language changes.',
            es: 'Crea los signals de traducción en el cuerpo de la función, no dentro del `computed()`: `translateSignal` usa `toSignal`, que no puede ejecutarse dentro de un contexto reactivo. El mismo código funciona con `translateSignal` de `@jsverse/transloco`. Sin librería de traducción, pasa un `signal()` propio y llama a `set()` cuando cambie el idioma.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'For components with inputs, derive the labels object from translation signals. When the language changes, the signals update and so does the component.',
            es: 'Para componentes con inputs, deriva el objeto de etiquetas de signals de traducción. Cuando cambia el idioma, los signals se actualizan y el componente también.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'booking.component.ts',
          code: `import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { translateSignal } from '@hakistack/i18n';
import { DatepickerComponent, DatepickerLabels } from '@hakistack/ng-daisyui';
import { TK } from '../i18n/definitions/keys.generated';

@Component({
  selector: 'app-booking',
  imports: [DatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<hk-datepicker [labels]="datepickerLabels()" />',
})
export class BookingComponent {
  private readonly today = translateSignal(TK.datepicker.today);
  private readonly clear = translateSignal(TK.datepicker.clear);

  readonly datepickerLabels = computed<DatepickerLabels>(() => ({
    todayLabel: this.today(),
    clearLabel: this.clear(),
  }));
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'For the Alert service, hand it Transloco’s translate function and language stream so cached button texts refresh on every switch. The keys it asks for are its own (for example `common.dialogs.deleteConfirm.title`); the fallback text is used when the key is missing.',
            es: 'Para el servicio Alert, pásale la función de traducción de Transloco y su stream de idioma para que los textos de los botones se actualicen en cada cambio. Las claves que pide son suyas (por ejemplo `common.dialogs.deleteConfirm.title`); el texto de respaldo se usa cuando falta la clave.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { provideAlert } from '@hakistack/ng-daisyui';
import { Subject } from 'rxjs';

let transloco: TranslocoService | undefined;
const alertLangChange$ = new Subject<string>();

export const appConfig: ApplicationConfig = {
  providers: [
    // provideI18n({ ... }) from @hakistack/i18n goes here too
    provideAlert({
      translate: (key, fallback, params) => {
        const text = transloco?.translate(key, params);
        // A missing key comes back empty, as the key itself, or as "[key]" (@hakistack/i18n in dev mode).
        return text && text !== key && text !== \`[\${key}]\` ? text : fallback;
      },
      langChange$: alertLangChange$,
    }),
    provideAppInitializer(() => {
      transloco = inject(TranslocoService);
      transloco.langChanges$.subscribe(alertLangChange$);
    }),
  ],
};`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: '`provideAlert` takes a plain object and does not inject Transloco for you. The bridge above keeps the `TranslocoService` the app initializer injects and forwards its language stream. It avoids Transloco’s global `translate()`, which Transloco v9 only enables with `provideGlobalTranslateFn()`.',
            es: '`provideAlert` recibe un objeto simple y no inyecta Transloco por ti. El puente de arriba guarda el `TranslocoService` que inyecta el inicializador de la app y reenvía su stream de idioma. Evita el `translate()` global de Transloco, que Transloco v9 solo habilita con `provideGlobalTranslateFn()`.',
          },
        },
      ],
    },
  ],
  related: [
    {
      id: 'accessibility',
      note: {
        en: 'Translated aria-labels matter as much as visible text.',
        es: 'Los aria-labels traducidos importan tanto como el texto visible.',
      },
    },
    { id: 'forms', note: { en: 'Field labels, placeholders and validation.', es: 'Etiquetas, placeholders y validación de campos.' } },
    { id: 'datepicker', note: { en: 'The `locale` input formats dates.', es: 'El input `locale` formatea las fechas.' } },
  ],
};

export default content;
