import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: a sign-up form with validation, a field that only appears for business accounts, a password confirmation check, and your own Submit and Reset buttons. You describe the fields once with [createForm](/api/createForm) and [field](/api/field); the form renders, validates and reports back through a controller.',
      es: 'Objetivo: un formulario de registro con validación, un campo que solo aparece para cuentas de empresa, una verificación de confirmación de contraseña y tus propios botones de Enviar y Restablecer. Describes los campos una vez con [createForm](/api/createForm) y [field](/api/field); el formulario se renderiza, se valida y te responde a través de un controlador.',
    },
  ],
  sections: [
    {
      id: 'step-1-fields',
      heading: { en: '1. Describe the fields', es: '1. Describe los campos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every builder has the same shape: `field.type(key, label?, options?)`. Validation rules are plain options (`required`, `minLength`, `pattern`, …); [validation](/api/validation) has shortcuts for common combinations. Typing `createForm<T>` makes `values` typed in the callbacks.',
            es: 'Todos los builders tienen la misma forma: `field.tipo(key, label?, options?)`. Las reglas de validación son opciones simples (`required`, `minLength`, `pattern`, …); [validation](/api/validation) tiene atajos para combinaciones comunes. Tipar `createForm<T>` hace que `values` esté tipado en los callbacks.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'sign-up.component.ts',
          code: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createForm, DynamicFormComponent, field, layout, validation } from '@hakistack/ng-daisyui';

interface SignUp {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: 'personal' | 'business';
  company?: string;
  acceptTerms: boolean;
}

@Component({
  selector: 'app-sign-up',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {
  readonly form = createForm<SignUp>({
    ...layout.grid(2, { gap: 'md' }),
    fields: [
      field.text('name', 'Full name', { ...validation.required(2, 60) }),
      field.email('email', 'Email', { required: true }),
      field.password('password', 'Password', { ...validation.password(8, true) }),
      field.password('confirmPassword', 'Confirm password', { required: true }),
      field.select('accountType', 'Account type', {
        choices: [
          { value: 'personal', label: 'Personal' },
          { value: 'business', label: 'Business' },
        ],
        defaultValue: 'personal',
      }),
      field.text('company', 'Company', {
        showWhen: ['accountType', 'business'],
        requiredWhen: ['accountType', 'business'],
      }),
      field.checkbox('acceptTerms', 'I accept the terms', { required: true }),
    ],
    validate: (values) =>
      values.password === values.confirmPassword ? null : { confirmPassword: 'Passwords do not match' },
    onSubmit: ({ valid, values, errors }) => {
      if (!valid) {
        console.warn(errors);
        return;
      }
      this.register(values);
    },
  });

  private register(values: SignUp): void {
    // call your API
  }
}`,
        },
      ],
    },
    {
      id: 'step-2-render',
      heading: { en: '2. Render it and add your buttons', es: '2. Renderízalo y añade tus botones' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The form has no built-in buttons. Bind `form.config()` and call the controller from wherever your buttons live: under the form, in a dialog footer, or in a toolbar.',
            es: 'El formulario no trae botones. Enlaza `form.config()` y llama al controlador desde donde estén tus botones: debajo del formulario, en el pie de un diálogo o en una barra de herramientas.',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'sign-up.component.html',
          code: `<hk-dynamic-form [config]="form.config()" />

<div class="mt-4 flex justify-end gap-2">
  <button type="button" class="btn btn-ghost" (click)="form.reset()">Reset</button>
  <button type="button" class="btn btn-primary" (click)="form.submit()">Create account</button>
</div>`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: '`submit()` always calls `onSubmit`, valid or not. It marks every field as touched so errors become visible, and passes `valid` and `errors` so you decide what happens.',
            es: '`submit()` siempre llama a `onSubmit`, sea válido o no. Marca todos los campos como tocados para que los errores se vean y te pasa `valid` y `errors` para que decidas qué hacer.',
          },
        },
      ],
    },
    {
      id: 'step-3-conditions',
      heading: { en: '3. Conditional fields', es: '3. Campos condicionales' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`showWhen`, `hideWhen`, `requiredWhen` and `disabledWhen` accept the same shorthand: a field key (truthy check), a `[key, value]` pair, a `[key, predicate]` pair, a function, or an Angular signal passed without parentheses so it stays reactive.',
            es: '`showWhen`, `hideWhen`, `requiredWhen` y `disabledWhen` aceptan la misma forma abreviada: una clave de campo (comprueba que su valor sea verdadero), un par `[key, value]`, un par `[key, predicado]`, una función o un signal de Angular pasado sin paréntesis para que siga siendo reactivo.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'A field hidden by `showWhen` / `hideWhen` is disabled while hidden: it does not block submit (`valid` ignores it) and it is left out of `values`. Its value is kept and comes back when the field is shown again. `requiredWhen` on the `company` field makes the rule explicit, but a plain `required: true` would no longer block the form while the field is hidden.',
            es: 'Un campo oculto por `showWhen` / `hideWhen` se deshabilita mientras está oculto: no bloquea el envío (`valid` lo ignora) y queda fuera de `values`. Su valor se conserva y vuelve cuando el campo se muestra de nuevo. El `requiredWhen` del campo `company` deja la regla explícita, pero un simple `required: true` ya no bloquearía el formulario mientras el campo está oculto.',
          },
        },
      ],
    },
    {
      id: 'step-4-custom-validation',
      heading: { en: '4. Custom validation', es: '4. Validación personalizada' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'There are two levels, and they behave differently:',
            es: 'Hay dos niveles y se comportan distinto:',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '**Per field:** `customValidators` (or `validation.custom(...)`) takes any Angular `ValidatorFn`. The error message is generic (“<Label> is invalid (errorKey)”) unless the error key is one the form knows: `required`, `minlength`, `maxlength`, `min`, `max`, `email` or `pattern`.',
              es: '**Por campo:** `customValidators` (o `validation.custom(...)`) acepta cualquier `ValidatorFn` de Angular. El mensaje de error es genérico (“<Label> is invalid (errorKey)”) a menos que la clave sea una que el formulario conoce: `required`, `minlength`, `maxlength`, `min`, `max`, `email` o `pattern`.',
            },
            {
              en: '**Per form:** `validate(values)` returns `{ fieldKey: message }` or `null`. Use it for cross-field rules and whenever you need your own message text. It re-runs on every value change and again on submit.',
              es: '**Por formulario:** `validate(values)` devuelve `{ fieldKey: mensaje }` o `null`. Úsalo para reglas entre campos y siempre que necesites tu propio texto de mensaje. Se vuelve a ejecutar con cada cambio de valor y otra vez al enviar.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: '`required: true` on a checkbox or toggle means “must be checked”, as on `acceptTerms`: the form uses Angular’s `requiredTrue` for boolean fields. It reports the `required` key, so the standard “is required” message appears.',
            es: '`required: true` en una casilla o un toggle significa “debe estar marcada”, como en `acceptTerms`: el formulario usa `requiredTrue` de Angular en los campos booleanos. Reporta la clave `required`, así que aparece el mensaje estándar “is required”.',
          },
        },
      ],
    },
    {
      id: 'step-5-next',
      heading: { en: '5. Where to go from here', es: '5. Qué sigue' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Split long forms into steps with `steps` and `step.create(...)`: see [Wizard](/wizard).',
              es: 'Divide formularios largos en pasos con `steps` y `step.create(...)`: mira [Asistente](/wizard).',
            },
            {
              en: 'Keep drafts across reloads with `autoSave` and `provideFormState()`: see [Form state](/systems/form-state).',
              es: 'Conserva borradores entre recargas con `autoSave` y `provideFormState()`: mira [Estado del formulario](/systems/form-state).',
            },
            {
              en: 'The full list of field types and options lives in [FormFieldConfig](/api/FormFieldConfig) and the `*FieldOptions` types.',
              es: 'La lista completa de tipos de campo y opciones está en [FormFieldConfig](/api/FormFieldConfig) y los tipos `*FieldOptions`.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'forms', note: { en: 'Component reference and live examples.', es: 'Referencia del componente y ejemplos en vivo.' } },
    { id: 'wizard', note: { en: 'Multi-step forms.', es: 'Formularios de varios pasos.' } },
    { id: 'i18n', note: { en: 'Localize buttons and messages.', es: 'Localiza botones y mensajes.' } },
  ],
};

export default content;
