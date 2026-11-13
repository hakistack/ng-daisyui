import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'The dynamic form turns a list of fields written in TypeScript into a complete form on screen. Instead of writing an `<input>`, a label, validators and error messages for every field, you describe each one ("a required email", "a number between 18 and 99") and `<hk-dynamic-form>` renders it, validates it and tells you when the user submits.',
      es: 'El formulario dinámico convierte una lista de campos escrita en TypeScript en un formulario completo en pantalla. En vez de escribir un `<input>`, una etiqueta, validadores y mensajes de error para cada campo, describes cada uno ("un email obligatorio", "un número entre 18 y 99") y `<hk-dynamic-form>` lo dibuja, lo valida y te avisa cuando la persona lo envía.',
    },
    {
      en: 'You build it with `createForm()`, which returns a small controller: `config` (what you pass to the component), `submit()` and `reset()`. The form has no buttons of its own, so you place your Save or Cancel buttons wherever your design needs them. Fields can appear, become required or become disabled based on other answers, load their options from another field, and be saved as a draft while the user types.',
      es: 'Lo construyes con `createForm()`, que devuelve un pequeño controlador: `config` (lo que le pasas al componente), `submit()` y `reset()`. El formulario no trae botones propios, así que pones tus botones de Guardar o Cancelar donde tu diseño los necesite. Los campos pueden aparecer, volverse obligatorios o deshabilitarse según otras respuestas, cargar sus opciones desde otro campo y guardarse como borrador mientras la persona escribe.',
    },
  ],
  whenToUse: [
    {
      en: 'Data-entry screens with many ordinary fields (profiles, settings, registrations, admin CRUD).',
      es: 'Pantallas de captura con muchos campos comunes (perfiles, configuración, registros, CRUD administrativo).',
    },
    {
      en: 'Forms whose fields depend on each other: "show Company name only when Account type is Business".',
      es: 'Formularios cuyos campos dependen entre sí: "muestra Nombre de la empresa solo cuando Tipo de cuenta es Empresa".',
    },
    {
      en: 'Forms generated from data (a configuration from your API) rather than hand-written markup.',
      es: 'Formularios generados a partir de datos (una configuración de tu API) en vez de markup escrito a mano.',
    },
    {
      en: 'Long forms that should survive a page refresh, with auto-save.',
      es: 'Formularios largos que deben sobrevivir una recarga de la página, con autoguardado.',
    },
  ],
  whenNotToUse: [
    {
      en: 'A single search box or one or two controls: use [Input](/input) or [Select](/select) directly.',
      es: 'Una sola caja de búsqueda o uno o dos controles: usa [Input](/input) o [Select](/select) directamente.',
    },
    {
      en: 'Highly custom layouts where each field has unique markup around it: build a Reactive Form by hand and use the individual components.',
      es: 'Layouts muy personalizados donde cada campo tiene markup único alrededor: arma un Reactive Form a mano y usa los componentes individuales.',
    },
    {
      en: 'Editing many rows of tabular data at once: use the [DataGrid](/datagrid).',
      es: 'Editar muchas filas de datos tabulares a la vez: usa el [DataGrid](/datagrid).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DynamicFormComponent, createForm } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-forms-quick-start',
  imports: [DynamicFormComponent],
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <div class="mt-4 flex gap-2">
      <button type="button" class="btn btn-primary" (click)="form.submit()">Save</button>
      <button type="button" class="btn btn-ghost" (click)="form.reset()">Reset</button>
    </div>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormsQuickStartComponent {
  readonly form = createForm({
    layout: { type: 'grid', columns: 2, gap: 'md' },
    fields: {
      name: { type: 'text', label: 'Full name', validation: { required: true, minLength: 2 } },
      email: { type: 'email', label: 'Email', validation: { required: true } },
      age: { type: 'number', label: 'Age', validation: { min: 18 } },
      role: { type: 'select', label: 'Role', options: ['Admin', 'Editor', 'Viewer'] },
      terms: { type: 'checkbox', label: 'I accept the terms', validation: { required: true } },
    },
    onSubmit: (data) => console.log(data.name, data.age),
  });
}`,
    note: {
      en: '`createForm` does not need an injection context, so it can run in a field initializer like above. `onSubmit` in this declarative style only runs when the form is valid, and `data` is typed from the field map.',
      es: '`createForm` no necesita contexto de inyección, así que puede ir en un inicializador de campo como arriba. En este estilo declarativo, `onSubmit` solo corre cuando el formulario es válido, y `data` tiene tipos inferidos del mapa de campos.',
    },
  },
  technical: [
    {
      id: 'three-styles',
      heading: { en: 'Three ways to describe a form', es: 'Tres formas de describir un formulario' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Style', es: 'Estilo' },
            { en: 'Shape', es: 'Forma' },
            { en: 'Best for', es: 'Ideal para' },
          ],
          rows: [
            [
              { en: 'Declarative schema', es: 'Esquema declarativo' },
              {
                en: '`fields` is a map `{ name: { type, label, validation } }`',
                es: '`fields` es un mapa `{ name: { type, label, validation } }`',
              },
              {
                en: 'Typed values with no generics. Supports `text`, `email`, `password`, `number`, `checkbox`, `textarea`, `select`, `date`.',
                es: 'Valores con tipos sin genéricos. Soporta `text`, `email`, `password`, `number`, `checkbox`, `textarea`, `select`, `date`.',
              },
            ],
            [
              { en: 'Builders', es: 'Builders' },
              { en: '`fields: [field.text(...), field.select(...)]`', es: '`fields: [field.text(...), field.select(...)]`' },
              {
                en: 'Every field type, conditional logic (`showWhen`, `requiredWhen`...), `optionsFrom`, wizard `steps`.',
                es: 'Todos los tipos de campo, lógica condicional (`showWhen`, `requiredWhen`...), `optionsFrom`, `steps` de asistente.',
              },
            ],
            [
              { en: 'Callback DSL', es: 'DSL con callback' },
              {
                en: '`createForm(({ field, layout, validation, step }) => ({ ... }))`',
                es: '`createForm(({ field, layout, validation, step }) => ({ ... }))`',
              },
              { en: 'Same as builders, importing only `createForm`.', es: 'Igual que los builders, importando solo `createForm`.' },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Builders with conditional logic',
          code: `import { createForm, field, layout, validation } from '@hakistack/ng-daisyui';

readonly form = createForm({
  ...layout.horizontal({ labelWidth: 'md' }),
  fields: [
    field.select('accountType', 'Account type', { choices: ['personal', 'business'], required: true }),
    field.text('company', 'Company name', { showWhen: ['accountType', 'business'], requiredWhen: ['accountType', 'business'] }),
    field.password('password', 'Password', validation.password(8, true)),
    field.toggle('newsletter', 'Send me news'),
  ],
  validate: (values) => (values['company'] === 'ACME' ? { company: 'That name is taken' } : null),
  onSubmit: ({ values, valid, errors }) => console.log(values, valid, errors),
});`,
        },
        {
          kind: 'p',
          text: {
            en: "Conditions accept several shapes: a field name (`'hasReferral'`, truthy), `[field, value]`, `[field, (value, values) => boolean]`, a `Signal<boolean>` or a function that reads signals. Pass the signal itself, without parentheses: `showWhen: this.isEditMode()` is evaluated once, `showWhen: this.isEditMode` stays reactive.",
            es: "Las condiciones aceptan varias formas: un nombre de campo (`'hasReferral'`, verdadero), `[campo, valor]`, `[campo, (valor, valores) => boolean]`, un `Signal<boolean>` o una función que lee signals. Pasa la signal sin paréntesis: `showWhen: this.isEditMode()` se evalúa una sola vez, `showWhen: this.isEditMode` se mantiene reactiva.",
          },
        },
      ],
    },
    {
      id: 'pipeline',
      heading: { en: 'From config to Reactive Form', es: 'De la configuración al Reactive Form' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'createForm', es: 'createForm' },
              detail: {
                en: 'Normalizes any of the three styles into one `FormConfig` exposed as a `computed()` signal. `submit()` and `reset()` bump trigger signals the component watches.',
                es: 'Normaliza cualquiera de los tres estilos en un solo `FormConfig` expuesto como signal `computed()`. `submit()` y `reset()` incrementan signals disparadoras que el componente observa.',
              },
            },
            {
              label: { en: 'FormGroup', es: 'FormGroup' },
              detail: {
                en: 'The component builds an Angular `FormGroup` with validators per field (validator lists are cached). Built-in controls are native inputs plus `hk-select`, `hk-datepicker`, `hk-timepicker` and `hk-editor`.',
                es: 'El componente construye un `FormGroup` de Angular con validadores por campo (las listas de validadores se guardan en caché). Los controles incluidos son inputs nativos más `hk-select`, `hk-datepicker`, `hk-timepicker` y `hk-editor`.',
              },
            },
            {
              label: { en: 'Conditions', es: 'Condiciones' },
              detail: {
                en: 'A Rust/WASM form engine tracks which fields depend on which, so a change only re-evaluates affected fields. Until it loads (or on the server) a TypeScript `ConditionEngine` with the same dependency graph does the work.',
                es: 'Un motor de formularios en Rust/WASM sabe qué campos dependen de cuáles, así que un cambio solo vuelve a evaluar los campos afectados. Mientras carga (o en el servidor) un `ConditionEngine` en TypeScript con el mismo grafo de dependencias hace el trabajo.',
              },
            },
            {
              label: { en: 'Submit', es: 'Envío' },
              detail: {
                en: 'All controls are marked touched, the form-level `validate` runs, and `onSubmit` / `formSubmit` receive `{ values, valid, errors }`.',
                es: 'Todos los controles se marcan como tocados, corre el `validate` del formulario, y `onSubmit` / `formSubmit` reciben `{ values, valid, errors }`.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Besides the controller callbacks, the component emits `formSubmit`, `formChange`, `fieldChange`, `formReset`, `formRestored` and `stepChange`, and accepts `initialValues` and `disabled` inputs.',
            es: 'Además de los callbacks del controlador, el componente emite `formSubmit`, `formChange`, `fieldChange`, `formReset`, `formRestored` y `stepChange`, y acepta los inputs `initialValues` y `disabled`.',
          },
        },
      ],
    },
    {
      id: 'layout-and-options',
      heading: { en: 'Layout, dependent options and auto-save', es: 'Layout, opciones dependientes y autoguardado' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '`layout`: `vertical` (default), `horizontal` with `labelWidth`, or `grid` with `gridColumns`. Per field, `colSpan` accepts a number or a responsive object (`{ default: 12, md: 6 }`); outside the grid use `width` (`1/2`, `1/3`...).',
              es: '`layout`: `vertical` (por defecto), `horizontal` con `labelWidth`, o `grid` con `gridColumns`. Por campo, `colSpan` acepta un número o un objeto responsive (`{ default: 12, md: 6 }`); fuera de la cuadrícula usa `width` (`1/2`, `1/3`...).',
            },
            {
              en: '`optionsFrom: { field, loadFn }` reloads a select or radio list when another field changes; `loadFn` may return an array, a Promise or an Observable, and the old value is cleared unless `clearOnChange` is `false`.',
              es: '`optionsFrom: { field, loadFn }` recarga una lista de select o radio cuando cambia otro campo; `loadFn` puede devolver un arreglo, una Promise o un Observable, y el valor anterior se limpia salvo que `clearOnChange` sea `false`.',
            },
            {
              en: '`autoSave: { enabled: true, formId }` saves drafts through `FormStateService` and restores them on the next visit. It requires `provideFormState()`; see [Form state & auto-save](/systems/form-state).',
              es: '`autoSave: { enabled: true, formId }` guarda borradores con `FormStateService` y los restaura en la próxima visita. Requiere `provideFormState()`; mira [Estado de formularios y autoguardado](/systems/form-state).',
            },
            {
              en: '`provideDynamicFormLabels()` sets app-wide text for the wizard buttons and loading placeholders.',
              es: '`provideDynamicFormLabels()` define los textos de toda la app para los botones del asistente y los placeholders de carga.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Field validation messages ("Name is required") are generated in English today and are not covered by `provideDynamicFormLabels()`. Return your own text from the form-level `validate` if you need translated messages.',
            es: 'Los mensajes de validación de campo ("Name is required") se generan en inglés por ahora y `provideDynamicFormLabels()` no los cubre. Devuelve tus propios textos desde el `validate` del formulario si necesitas mensajes traducidos.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [],
    notes: [
      {
        en: 'The form is a real `<form>`, and every visible field gets a `<label for>` tied to its control id, so clicking the label focuses the field and screen readers announce it.',
        es: 'El formulario es un `<form>` real, y cada campo visible tiene un `<label for>` atado al id de su control, así que al hacer clic en la etiqueta se enfoca el campo y los lectores de pantalla lo anuncian.',
      },
      {
        en: 'Required fields show a visual asterisk; error messages and `helpText` are rendered under the field but are not linked with `aria-describedby`, and the native inputs do not set `aria-invalid`. Keep error text short and specific.',
        es: 'Los campos obligatorios muestran un asterisco visual; los mensajes de error y el `helpText` se muestran debajo del campo pero no se enlazan con `aria-describedby`, y los inputs nativos no ponen `aria-invalid`. Mantén los mensajes de error cortos y específicos.',
      },
      {
        en: 'Use `focusOnLoad: true` on one field to move focus there when the form first renders, for example the first field of a dialog.',
        es: 'Usa `focusOnLoad: true` en un campo para mover el foco allí cuando el formulario se dibuja por primera vez, por ejemplo el primer campo de un diálogo.',
      },
      {
        en: 'Your Submit and Reset buttons live outside the component: give them `type="button"` and clear text, and keep them in a logical tab order after the fields.',
        es: 'Tus botones de Enviar y Restablecer viven fuera del componente: dales `type="button"` y un texto claro, y mantenlos en un orden de tabulación lógico después de los campos.',
      },
    ],
  },
  performance: [
    {
      en: '`OnPush` everywhere; the config is a `computed()` signal, so passing `form.config()` in the template does not rebuild the form on every change detection.',
      es: '`OnPush` en todo; la configuración es una signal `computed()`, así que pasar `form.config()` en la plantilla no reconstruye el formulario en cada detección de cambios.',
    },
    {
      en: 'Conditional logic is incremental: only fields that depend on the changed field are re-evaluated, through the WASM engine when available and the TypeScript dependency graph otherwise.',
      es: 'La lógica condicional es incremental: solo se vuelven a evaluar los campos que dependen del campo cambiado, con el motor WASM si está disponible y con el grafo de dependencias en TypeScript si no.',
    },
    {
      en: 'Value change processing is debounced (100 ms, or 300 ms with auto-save) and auto-save writes are debounced again by `debounceMs` (default 1000 ms).',
      es: 'El procesamiento de cambios de valor tiene debounce (100 ms, o 300 ms con autoguardado) y las escrituras del autoguardado tienen otro debounce de `debounceMs` (1000 ms por defecto).',
    },
    {
      en: 'The WASM engine handle is disposed and rebuilt when the config changes; stale builds that finish after a config swap are discarded.',
      es: 'El handle del motor WASM se libera y se reconstruye cuando cambia la configuración; las construcciones que terminan después de un cambio de configuración se descartan.',
    },
  ],
  related: [
    {
      id: 'wizard',
      note: {
        en: 'The same form split into validated steps with `steps` and `step.create()`.',
        es: 'El mismo formulario dividido en pasos validados con `steps` y `step.create()`.',
      },
    },
    {
      id: 'form-state',
      note: { en: 'How drafts are stored in localStorage or your API.', es: 'Cómo se guardan los borradores en localStorage o en tu API.' },
    },
    {
      id: 'builders',
      note: {
        en: 'The controller pattern shared by `createForm`, `createTable` and others.',
        es: 'El patrón de controlador que comparten `createForm`, `createTable` y otros.',
      },
    },
    {
      id: 'guide-build-a-form',
      note: {
        en: 'A step-by-step walkthrough of a complete sign-up form.',
        es: 'Un recorrido paso a paso de un formulario de registro completo.',
      },
    },
  ],
};

export default content;
