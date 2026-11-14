import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: a “create workspace” form with a rule of your own on one field, a rule that compares two fields, a check against your server, and a field that becomes required depending on another. Along the way you will see exactly where each message comes from and what the form can and cannot customize today. The basics (`validate`, `required` on checkboxes) are introduced in [Build a complete form](/guides/build-a-form); this guide goes deeper.',
      es: 'Objetivo: un formulario de “crear espacio de trabajo” con una regla propia en un campo, una regla que compara dos campos, una verificación contra tu servidor y un campo que se vuelve obligatorio según otro. En el camino verás exactamente de dónde sale cada mensaje y qué puede y qué no puede personalizar hoy el formulario. Lo básico (`validate`, `required` en las casillas) se presenta en [Construye un formulario completo](/guides/build-a-form); esta guía va más a fondo.',
    },
  ],
  sections: [
    {
      id: 'levels',
      heading: { en: 'The validation levels', es: 'Los niveles de validación' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Level', es: 'Nivel' },
            { en: 'How', es: 'Cómo' },
            { en: 'Message shown', es: 'Mensaje que se muestra' },
          ],
          rows: [
            [
              { en: 'Built-in rules', es: 'Reglas integradas' },
              {
                en: '`required`, `minLength`, `maxLength`, `min`, `max`, `email`, `pattern` on the field options',
                es: '`required`, `minLength`, `maxLength`, `min`, `max`, `email`, `pattern` en las opciones del campo',
              },
              {
                en: 'A fixed English sentence per rule, e.g. “Workspace URL is required”',
                es: 'Una oración fija en inglés por regla, p. ej. “Workspace URL is required”',
              },
            ],
            [
              { en: 'Custom field validator', es: 'Validador propio del campo' },
              {
                en: '`customValidators: [fn]` or `...validation.custom(fn)` with any Angular `ValidatorFn`',
                es: '`customValidators: [fn]` o `...validation.custom(fn)` con cualquier `ValidatorFn` de Angular',
              },
              {
                en: '“<Label> is invalid (<errorKey>)”, unless the key is one of the built-in ones',
                es: '“<Label> is invalid (<errorKey>)”, salvo que la clave sea una de las integradas',
              },
            ],
            [
              { en: 'Conditional required', es: 'Obligatorio condicional' },
              { en: '`requiredWhen` with the condition shorthand', es: '`requiredWhen` con el atajo de condiciones' },
              { en: 'The built-in “is required”', es: 'El “is required” integrado' },
            ],
            [
              { en: 'Form-level rule', es: 'Regla del formulario' },
              {
                en: '`validate(values)` returns `{ fieldKey: message }` or `null`',
                es: '`validate(values)` devuelve `{ fieldKey: mensaje }` o `null`',
              },
              { en: 'Your own text, under that field', es: 'Tu propio texto, debajo de ese campo' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Everything is synchronous. The form builds plain Angular `FormControl`s with sync validators only; there is no option for async validators. Server checks go through `validate()` with a signal, shown in step 3.',
            es: 'Todo es síncrono. El formulario crea `FormControl` normales de Angular solo con validadores síncronos; no hay opción para validadores asíncronos. Las verificaciones en el servidor pasan por `validate()` con un signal, como se muestra en el paso 3.',
          },
        },
      ],
    },
    {
      id: 'step-1-field-validator',
      heading: { en: '1. A validator for one field', es: '1. Un validador para un campo' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A custom validator is a standard Angular `ValidatorFn`: return `null` when the value is fine, or an error object. It runs after the built-in rules of the same field. Here, `notReserved` blocks a few names the app uses itself.',
            es: 'Un validador propio es un `ValidatorFn` estándar de Angular: devuelve `null` cuando el valor está bien, o un objeto de error. Corre después de las reglas integradas del mismo campo. Aquí, `notReserved` bloquea algunos nombres que usa la propia aplicación.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'not-reserved.validator.ts',
          code: `import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const RESERVED = new Set(['admin', 'api', 'www']);

/** Fails for reserved names. Error key: \`reserved\`. */
export const notReserved: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && RESERVED.has(control.value.toLowerCase()) ? { reserved: true } : null;`,
        },
        {
          kind: 'p',
          text: {
            en: 'Only the **first** error of a field is shown, and its text depends on the error key: `required`, `minlength`, `maxlength`, `min`, `max`, `email` and `pattern` have a sentence; any other key, like `reserved`, shows “Workspace URL is invalid (reserved)”. There is no per-field option for custom message text, and [provideDynamicFormLabels](/api/provideDynamicFormLabels) only covers the wizard buttons and two placeholders, not validation messages. When the wording matters, express the rule in `validate()` instead (step 2): there the message is yours.',
            es: 'Solo se muestra el **primer** error de un campo, y su texto depende de la clave del error: `required`, `minlength`, `maxlength`, `min`, `max`, `email` y `pattern` tienen una oración; cualquier otra clave, como `reserved`, muestra “Workspace URL is invalid (reserved)”. No hay una opción por campo para personalizar el texto del mensaje, y [provideDynamicFormLabels](/api/provideDynamicFormLabels) solo cubre los botones del asistente y dos placeholders, no los mensajes de validación. Cuando la redacción importa, expresa la regla en `validate()` (paso 2): ahí el mensaje es tuyo.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Each field with `customValidators` gets its own validator list, built from its own functions. Only fields with built-in rules alone share a cached list, so two fields with the same rules but different custom validators never mix them up.',
            es: 'Cada campo con `customValidators` recibe su propia lista de validadores, armada con sus propias funciones. Solo los campos que usan únicamente reglas integradas comparten una lista en caché, así que dos campos con las mismas reglas pero validadores propios distintos nunca se confunden.',
          },
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: '`validation.custom(...)` returns `{ customValidators: [...] }`. Spreading it and also writing `customValidators` in the same options overwrites one with the other; put every function in one list.',
            es: '`validation.custom(...)` devuelve `{ customValidators: [...] }`. Si lo expandes y además escribes `customValidators` en las mismas opciones, uno sobrescribe al otro; pon todas las funciones en una sola lista.',
          },
        },
      ],
    },
    {
      id: 'step-2-the-form',
      heading: {
        en: '2. Cross-field rules, conditional required and the server check',
        es: '2. Reglas entre campos, obligatorio condicional y la verificación en el servidor',
      },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The whole form below. `validate()` compares the two budgets and reads a signal of slugs the server rejected; `requiredWhen` makes the PO number required only for invoice billing; `showWhen` adds the VAT ID for companies.',
            es: 'El formulario completo. `validate()` compara los dos presupuestos y lee un signal con los slugs que el servidor rechazó; `requiredWhen` hace obligatorio el número de orden de compra solo con facturación por factura; `showWhen` añade el VAT ID para empresas.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'workspace-form.component.ts',
          code: `import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { createForm, DynamicFormComponent, field, validation } from '@hakistack/ng-daisyui';
import { notReserved } from './not-reserved.validator';

@Injectable({ providedIn: 'root' })
export class WorkspaceApi {
  async isSlugTaken(slug: string): Promise<boolean> {
    const response = await fetch(\`/api/workspaces/\${encodeURIComponent(slug)}\`, { method: 'HEAD' });
    return response.ok;
  }
}

interface Workspace {
  slug: string;
  minBudget: number;
  maxBudget: number;
  billing: 'card' | 'invoice';
  poNumber: string;
  isCompany: boolean;
  vatId: string;
  terms: boolean;
}

@Component({
  selector: 'app-workspace-form',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <button type="button" class="btn btn-primary mt-4" (click)="form.submit()">Create workspace</button>
  \`,
})
export class WorkspaceFormComponent {
  private readonly api = inject(WorkspaceApi);
  /** Slugs the server reported as taken. Read inside validate(), so the message updates by itself. */
  private readonly takenSlugs = signal<ReadonlySet<string>>(new Set());
  private lastChecked = '';

  readonly form = createForm<Workspace>({
    fields: [
      field.text('slug', 'Workspace URL', {
        required: true,
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-z0-9-]+$/,
        helpText: 'Lowercase letters, numbers and dashes.',
        ...validation.custom(notReserved),
      }),
      field.number('minBudget', 'Minimum budget', { min: 0 }),
      field.number('maxBudget', 'Maximum budget', { min: 0 }),
      field.select('billing', 'Billing', { choices: ['card', 'invoice'], defaultValue: 'card' }),
      field.text('poNumber', 'PO number', { requiredWhen: ['billing', 'invoice'] }),
      field.toggle('isCompany', 'I am buying for a company'),
      field.text('vatId', 'VAT ID', { required: true, showWhen: 'isCompany' }),
      field.checkbox('terms', 'I accept the terms', { required: true }),
    ],
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (this.takenSlugs().has(values.slug)) errors['slug'] = 'That URL is already taken';
      if (values.maxBudget < values.minBudget) errors['maxBudget'] = 'Must be at least the minimum budget';
      return Object.keys(errors).length ? errors : null;
    },
    onChange: (values) => void this.checkSlug(values.slug),
    onSubmit: async ({ valid, values }) => {
      if (!valid) return;
      // The check started from onChange may not have finished: confirm before saving.
      if (await this.api.isSlugTaken(values.slug)) {
        this.takenSlugs.update((taken) => new Set(taken).add(values.slug));
        return;
      }
      this.create(values);
    },
  });

  private async checkSlug(slug: string): Promise<void> {
    if (slug.length < 3 || slug === this.lastChecked) return;
    this.lastChecked = slug;
    if (await this.api.isSlugTaken(slug)) {
      this.takenSlugs.update((taken) => new Set(taken).add(slug));
    }
  }

  private create(workspace: Workspace): void {
    // call your API
  }
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '**`validate(values)`** runs whenever the values change (debounced about 100 ms) and again, synchronously, on submit. A key in the result blocks submission and shows the message under that field once it has been touched. Return `null` (or an empty object) when everything is fine.',
              es: '**`validate(values)`** corre cada vez que cambian los valores (con un retardo de unos 100 ms) y otra vez, de forma síncrona, al enviar. Una clave en el resultado bloquea el envío y muestra el mensaje debajo de ese campo una vez que fue tocado. Devuelve `null` (o un objeto vacío) cuando todo está bien.',
            },
            {
              en: '**Use field keys only.** A message for a key that has no visible field still makes the form invalid, but nobody sees why.',
              es: '**Usa solo claves de campos.** Un mensaje para una clave que no tiene un campo visible igual deja el formulario inválido, pero nadie ve por qué.',
            },
            {
              en: '**`requiredWhen`** switches the `required` validator on and off while keeping the field’s other rules. A field with `required: true` is always required: the baseline wins over the condition. The asterisk next to the label follows the current state.',
              es: '**`requiredWhen`** activa y desactiva el validador `required` sin quitar las demás reglas del campo. Un campo con `required: true` siempre es obligatorio: la base gana sobre la condición. El asterisco junto a la etiqueta sigue el estado actual.',
            },
            {
              en: '**Hidden means excluded.** `vatId` is `required: true`, yet it does not block the form for individuals: a field hidden by `showWhen`/`hideWhen` is disabled, so it leaves validity and the submitted values. The same applies to `disabledWhen`. Because of that, `validate()` must tolerate a missing value for any field that can be hidden or disabled.',
              es: '**Oculto significa excluido.** `vatId` tiene `required: true` y aun así no bloquea el formulario para personas: un campo ocultado por `showWhen`/`hideWhen` queda deshabilitado, así que sale de la validez y de los valores enviados. Lo mismo pasa con `disabledWhen`. Por eso, `validate()` debe tolerar que falte el valor de cualquier campo que pueda ocultarse o deshabilitarse.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-3-server-checks',
      heading: { en: '3. Checks against your server', es: '3. Verificaciones contra tu servidor' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Since there are no async validators, the example keeps the server’s answer in a signal and lets `validate()` read it. The form evaluates `validate()` inside a `computed()`, so a signal read there is tracked: when `takenSlugs` changes, the message appears without any other wiring.',
            es: 'Como no hay validadores asíncronos, el ejemplo guarda la respuesta del servidor en un signal y deja que `validate()` lo lea. El formulario evalúa `validate()` dentro de un `computed()`, así que un signal que se lea ahí queda registrado: cuando `takenSlugs` cambia, el mensaje aparece sin más conexiones.',
          },
        },
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'User types', es: 'El usuario escribe' },
              detail: {
                en: '`onChange` fires with the debounced values and starts `checkSlug`.',
                es: '`onChange` se dispara con los valores (con retardo) e inicia `checkSlug`.',
              },
            },
            {
              label: { en: 'Server answers', es: 'El servidor responde' },
              detail: {
                en: 'A taken slug is added to the `takenSlugs` signal.',
                es: 'Un slug ocupado se añade al signal `takenSlugs`.',
              },
            },
            {
              label: { en: 'Message appears', es: 'Aparece el mensaje' },
              detail: {
                en: "`validate()` re-runs because it read the signal and returns `{ slug: 'That URL is already taken' }`.",
                es: "`validate()` vuelve a correr porque leyó el signal y devuelve `{ slug: 'That URL is already taken' }`.",
              },
            },
            {
              label: { en: 'Submit', es: 'Envío' },
              detail: {
                en: '`onSubmit` checks once more before saving, because the last check may still be in flight.',
                es: '`onSubmit` verifica una vez más antes de guardar, porque la última verificación puede seguir en curso.',
              },
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'The form does not show a “checking…” state for you. If you need one, keep a `checking` signal next to `takenSlugs` and render it near the form.',
            es: 'El formulario no muestra un estado de “verificando…” por ti. Si lo necesitas, guarda un signal `checking` junto a `takenSlugs` y muéstralo cerca del formulario.',
          },
        },
      ],
    },
    {
      id: 'step-4-messages',
      heading: { en: '4. When and how messages appear', es: '4. Cuándo y cómo aparecen los mensajes' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Messages appear once a field is touched (focused and left). `form.submit()` marks every field as touched, so all current errors become visible at once.',
              es: 'Los mensajes aparecen cuando un campo fue tocado (recibió el foco y lo perdió). `form.submit()` marca todos los campos como tocados, así que todos los errores actuales se ven a la vez.',
            },
            {
              en: 'A field can show two lines: the first error of its validators and, below it, the `validate()` message for its key.',
              es: 'Un campo puede mostrar dos líneas: el primer error de sus validadores y, debajo, el mensaje de `validate()` para su clave.',
            },
            {
              en: 'Messages live in an `aria-live="polite"` region linked to the input with `aria-describedby`, and the input gets `aria-invalid` when its own validators fail after it was touched. Screen readers announce them without extra work.',
              es: 'Los mensajes viven en una región `aria-live="polite"` enlazada al input con `aria-describedby`, y el input recibe `aria-invalid` cuando fallan sus propios validadores después de tocarlo. Los lectores de pantalla los anuncian sin trabajo adicional.',
            },
            {
              en: 'With builders, `onSubmit` always runs and receives `errors`: an object of message arrays per field key, the same texts the user sees. With the schema style, `onSubmit` only runs when valid.',
              es: 'Con builders, `onSubmit` siempre corre y recibe `errors`: un objeto con arreglos de mensajes por clave de campo, los mismos textos que ve el usuario. Con el estilo de esquema, `onSubmit` solo corre cuando es válido.',
            },
            {
              en: 'Built-in messages are English sentences generated from the field label. In a non-English app, write the important rules in `validate()` so you control the language.',
              es: 'Los mensajes integrados son oraciones en inglés generadas a partir de la etiqueta del campo. En una aplicación que no está en inglés, escribe las reglas importantes en `validate()` para controlar el idioma.',
            },
          ],
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
              en: '[Dynamic forms from schemas](/guides/schema-forms): the same rules on a typed field map, and forms built from runtime data.',
              es: '[Formularios dinámicos desde esquemas](/guides/schema-forms): las mismas reglas sobre un mapa de campos con tipos, y formularios construidos con datos en tiempo de ejecución.',
            },
            {
              en: '[Internationalization](/foundations/i18n): what each `provide*Labels()` covers.',
              es: '[Internacionalización](/foundations/i18n): qué cubre cada `provide*Labels()`.',
            },
            {
              en: 'The option types are in the API reference: [BaseFieldOptions](/api/BaseFieldOptions), [ConditionShorthand](/api/ConditionShorthand), [FormSubmissionData](/api/FormSubmissionData).',
              es: 'Los tipos de opciones están en la referencia de API: [BaseFieldOptions](/api/BaseFieldOptions), [ConditionShorthand](/api/ConditionShorthand), [FormSubmissionData](/api/FormSubmissionData).',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'forms', note: { en: 'Component reference and live examples.', es: 'Referencia del componente y ejemplos en vivo.' } },
    { id: 'guide-build-a-form', note: { en: 'A complete form, step by step.', es: 'Un formulario completo, paso a paso.' } },
    {
      id: 'guide-schema-forms',
      note: { en: 'Typed schemas and runtime definitions.', es: 'Esquemas con tipos y definiciones en tiempo de ejecución.' },
    },
  ],
};

export default content;
