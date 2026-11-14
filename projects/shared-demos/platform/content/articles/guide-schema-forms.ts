import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: describe a form as one plain object, let TypeScript infer the type of its values, and build the same kind of form from a definition your API sends at runtime. This is the declarative schema form of [createForm](/api/createForm): `fields` is a map where each key becomes the field name. If you have not built a form with this library yet, start with [Build a complete form](/guides/build-a-form).',
      es: 'Objetivo: describir un formulario como un solo objeto, dejar que TypeScript infiera el tipo de sus valores y construir el mismo tipo de formulario a partir de una definición que tu API envía en tiempo de ejecución. Esta es la forma declarativa (esquema) de [createForm](/api/createForm): `fields` es un mapa donde cada clave se convierte en el nombre del campo. Si todavía no has construido un formulario con esta librería, empieza por [Construye un formulario completo](/guides/build-a-form).',
    },
  ],
  sections: [
    {
      id: 'step-1-schema',
      heading: { en: '1. Write the schema', es: '1. Escribe el esquema' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each entry is a [FieldDefinition](/api/FieldDefinition): a `type`, an optional `label` (the key is humanized when you leave it out) and a `validation` bag whose options depend on the type. Declaring the map with `satisfies FieldsMap` checks it and keeps the literal `type` of every entry, so you can reuse it and name its value type with [InferFormValues](/api/InferFormValues).',
            es: 'Cada entrada es un [FieldDefinition](/api/FieldDefinition): un `type`, un `label` opcional (si lo omites, se usa la clave en formato legible) y una bolsa `validation` cuyas opciones dependen del tipo. Declarar el mapa con `satisfies FieldsMap` lo valida y conserva el `type` literal de cada entrada, así que puedes reutilizarlo y darle nombre al tipo de sus valores con [InferFormValues](/api/InferFormValues).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'profile.component.ts',
          code: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createForm, DynamicFormComponent, type FieldsMap, type InferFormValues } from '@hakistack/ng-daisyui';

const profileFields = {
  name: { type: 'text', label: 'Full name', validation: { required: true, minLength: 2 } },
  email: { type: 'email', label: 'Email', validation: { required: true } },
  age: { type: 'number', label: 'Age', validation: { required: true, min: 18 } },
  plan: {
    type: 'select',
    label: 'Plan',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
    ] as const,
    defaultValue: 'free',
  },
  birthday: { type: 'date', label: 'Birthday', min: '1900-01-01' },
  newsletter: { type: 'checkbox', label: 'Send me the newsletter' },
  terms: { type: 'checkbox', label: 'I accept the terms', validation: { required: true } },
} satisfies FieldsMap;

// { name: string; email: string; age: number; plan: 'free' | 'pro';
//   birthday: Date | null; newsletter: boolean; terms: boolean }
export type Profile = InferFormValues<typeof profileFields>;

@Component({
  selector: 'app-profile',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <button type="button" class="btn btn-primary mt-4" (click)="form.submit()">Save</button>
  \`,
})
export class ProfileComponent {
  readonly form = createForm({
    layout: { type: 'grid', columns: 2, gap: 'md' },
    fields: profileFields,
    validate: (data) => (data.plan === 'pro' && data.age < 21 ? { plan: 'Pro accounts start at 21' } : null),
    onSubmit: (data) => this.save(data),
  });

  private save(profile: Profile): void {
    // call your API
  }
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: '`layout` is an object here (`type`, `columns`, `gap`, `labelWidth`), not the `layout.*` helpers used with builders.',
              es: '`layout` aquí es un objeto (`type`, `columns`, `gap`, `labelWidth`), no los helpers `layout.*` que se usan con los builders.',
            },
            {
              en: '`validate(data)` and `onSubmit(data)` receive the inferred type. The object `validate` returns is typed with the field names as keys.',
              es: '`validate(data)` y `onSubmit(data)` reciben el tipo inferido. El objeto que devuelve `validate` tiene como tipo de claves los nombres de los campos.',
            },
            {
              en: 'Unlike the builder style, the schema `onSubmit` only runs when the form is valid and receives the values directly, not `{ values, valid, errors }`.',
              es: 'A diferencia del estilo con builders, el `onSubmit` del esquema solo corre cuando el formulario es válido y recibe los valores directamente, no `{ values, valid, errors }`.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-2-types',
      heading: { en: '2. What type each field produces', es: '2. Qué tipo produce cada campo' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Field `type`', es: '`type` del campo' },
            { en: 'Value type', es: 'Tipo del valor' },
            { en: 'Validation options', es: 'Opciones de validación' },
          ],
          rows: [
            [
              { en: '`text`, `textarea`', es: '`text`, `textarea`' },
              { en: '`string`', es: '`string`' },
              { en: '`required`, `minLength`, `maxLength`, `pattern`', es: '`required`, `minLength`, `maxLength`, `pattern`' },
            ],
            [
              { en: '`email`', es: '`email`' },
              { en: '`string`', es: '`string`' },
              {
                en: '`required`, `email` (format check, on by default)',
                es: '`required`, `email` (verificación de formato, activa por defecto)',
              },
            ],
            [
              { en: '`password`', es: '`password`' },
              { en: '`string`', es: '`string`' },
              {
                en: '`required`, `minLength`, `maxLength`, `pattern`, `passwordStrength` (`low`, `medium`, `high`)',
                es: '`required`, `minLength`, `maxLength`, `pattern`, `passwordStrength` (`low`, `medium`, `high`)',
              },
            ],
            [
              { en: '`number`', es: '`number`' },
              { en: '`number`', es: '`number`' },
              { en: '`required`, `min`, `max`', es: '`required`, `min`, `max`' },
            ],
            [
              { en: '`checkbox`', es: '`checkbox`' },
              { en: '`boolean`', es: '`boolean`' },
              { en: '`required`', es: '`required`' },
            ],
            [
              { en: '`select`', es: '`select`' },
              {
                en: 'The type of the option values (`string` for `string[]` options)',
                es: 'El tipo de los valores de las opciones (`string` si las opciones son `string[]`)',
              },
              { en: '`required`', es: '`required`' },
            ],
            [
              { en: '`date`', es: '`date`' },
              { en: '`Date | null`', es: '`Date | null`' },
              {
                en: '`required`; `min` / `max` on the entry itself (a `Date` or an ISO string)',
                es: '`required`; `min` / `max` en la propia entrada (un `Date` o un texto ISO)',
              },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: "TypeScript widens option values: `options: [{ value: 'free', ... }]` gives `string`. Add `as const` to the options array, as in the example, to get the union `'free' | 'pro'`. Numeric option values give `number`.",
            es: "TypeScript amplía los valores de las opciones: `options: [{ value: 'free', ... }]` da `string`. Añade `as const` al arreglo de opciones, como en el ejemplo, para obtener la unión `'free' | 'pro'`. Los valores numéricos dan `number`.",
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Every entry also accepts `helpText`, `disabled`, `hidden`, `colSpan`, `width`, `order`, `group` and `customValidators` (any Angular `ValidatorFn`, see [Custom validators](/guides/custom-validators)).',
              es: 'Toda entrada acepta también `helpText`, `disabled`, `hidden`, `colSpan`, `width`, `order`, `group` y `customValidators` (cualquier `ValidatorFn` de Angular, mira [Validadores personalizados](/guides/custom-validators)).',
            },
            {
              en: 'A checkbox (or toggle) with `validation: { required: true }` must be checked, like the `terms` field: the form uses Angular’s `requiredTrue` for boolean fields and reports it under the `required` key, so the standard “is required” message appears.',
              es: 'Una casilla (o un toggle) con `validation: { required: true }` debe quedar marcada, como el campo `terms`: el formulario usa `requiredTrue` de Angular en los campos booleanos y lo reporta con la clave `required`, así que aparece el mensaje estándar “is required”.',
            },
            {
              en: 'A string `pattern` is anchored by Angular (it must match the whole value); a `RegExp` is used as written.',
              es: 'Un `pattern` en texto lo ancla Angular (debe coincidir con todo el valor); un `RegExp` se usa tal como lo escribes.',
            },
          ],
        },
      ],
    },
    {
      id: 'step-3-runtime',
      heading: {
        en: '3. Build the form from data loaded at runtime',
        es: '3. Construye el formulario con datos cargados en tiempo de ejecución',
      },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When the definition comes from a server, map it to field definitions with a function you write. The map is the only place that knows your API’s format, and the `switch` keeps every case type-checked. Wrap `createForm` in a `computed()` so a new definition produces a new controller; `createForm` does not need an injection context, so this is safe.',
            es: 'Cuando la definición viene de un servidor, conviértela en definiciones de campo con una función tuya. Esa función es el único lugar que conoce el formato de tu API, y el `switch` mantiene cada caso verificado por TypeScript. Envuelve `createForm` en un `computed()` para que una definición nueva produzca un controlador nuevo; `createForm` no necesita contexto de inyección, así que es seguro.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'remote-form.component.ts',
          code: `import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { createForm, DynamicFormComponent, type FieldDefinition, type FieldsMap } from '@hakistack/ng-daisyui';

/** The shape your API returns. Yours will differ: what matters is the mapping. */
export interface RemoteField {
  name: string;
  kind: 'string' | 'longText' | 'integer' | 'boolean' | 'choice' | 'date';
  title: string;
  required?: boolean;
  maxLength?: number;
  choices?: string[];
}

function toFieldDefinition(f: RemoteField): FieldDefinition {
  const required = f.required ?? false;
  switch (f.kind) {
    case 'string':
      return { type: 'text', label: f.title, validation: { required, maxLength: f.maxLength } };
    case 'longText':
      return { type: 'textarea', label: f.title, rows: 4, validation: { required, maxLength: f.maxLength } };
    case 'integer':
      return { type: 'number', label: f.title, step: 1, validation: { required } };
    case 'boolean':
      return { type: 'checkbox', label: f.title };
    case 'choice':
      return { type: 'select', label: f.title, options: f.choices ?? [], validation: { required } };
    case 'date':
      return { type: 'date', label: f.title, validation: { required } };
  }
}

export function toFieldsMap(fields: readonly RemoteField[]): FieldsMap {
  return Object.fromEntries(fields.map((f) => [f.name, toFieldDefinition(f)]));
}

@Component({
  selector: 'app-remote-form',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-dynamic-form [config]="form().config()" />
    <button type="button" class="btn btn-primary mt-4" (click)="form().submit()">Send</button>
  \`,
})
export class RemoteFormComponent {
  /** Loaded by the parent (HttpClient, a route resolver, a resource…). */
  readonly definition = input.required<readonly RemoteField[]>();
  readonly submitted = output<Record<string, unknown>>();

  // A new definition builds a new controller; the form rebuilds itself.
  readonly form = computed(() =>
    createForm({
      fields: toFieldsMap(this.definition()),
      onSubmit: (data) => this.submitted.emit(data),
    }),
  );
}`,
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'Inference needs the field types at compile time. With a map built at runtime the values are `{ [key: string]: unknown }`: validate them (or cast to your own interface) where you use them. Treat the definition as data, not code: map only the kinds you support and let the `switch` reject the rest.',
            es: 'La inferencia necesita los tipos de los campos al compilar. Con un mapa construido en tiempo de ejecución, los valores son `{ [key: string]: unknown }`: valídalos (o conviértelos a tu propia interfaz) donde los uses. Trata la definición como datos, no como código: convierte solo los tipos que soportas y deja que el `switch` rechace el resto.',
          },
        },
      ],
    },
    {
      id: 'step-4-conditions',
      heading: { en: '4. Conditional logic', es: '4. Lógica condicional' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The schema form has no `showWhen`, `hideWhen`, `requiredWhen` or `disabledWhen`: its `hidden` and `disabled` are static. When fields depend on each other, map to the [field](/api/field) builders instead; they take the same conditions described in [Build a complete form](/guides/build-a-form). The mapping idea is identical, only the target changes.',
            es: 'La forma de esquema no tiene `showWhen`, `hideWhen`, `requiredWhen` ni `disabledWhen`: sus `hidden` y `disabled` son estáticos. Cuando unos campos dependen de otros, convierte la definición a los builders de [field](/api/field); aceptan las mismas condiciones que se explican en [Construye un formulario completo](/guides/build-a-form). La idea de la conversión es la misma, solo cambia el destino.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'remote-rules-form.component.ts',
          code: `import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { createForm, DynamicFormComponent, field, type ConditionShorthand, type FormFieldConfig } from '@hakistack/ng-daisyui';

export interface RemoteRuleField {
  name: string;
  kind: 'string' | 'email' | 'choice';
  title: string;
  required?: boolean;
  choices?: string[];
  /** Show this field only while another field has a given value. */
  visibleWhen?: { field: string; equals: unknown };
}

function toFieldConfig(f: RemoteRuleField): FormFieldConfig {
  const showWhen: ConditionShorthand | undefined = f.visibleWhen ? [f.visibleWhen.field, f.visibleWhen.equals] : undefined;
  const common = { required: f.required, showWhen };
  switch (f.kind) {
    case 'string':
      return field.text(f.name, f.title, common);
    case 'email':
      return field.email(f.name, f.title, common);
    case 'choice':
      return field.select(f.name, f.title, { ...common, choices: f.choices ?? [] });
  }
}

@Component({
  selector: 'app-remote-rules-form',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<hk-dynamic-form [config]="form().config()" />\`,
})
export class RemoteRulesFormComponent {
  readonly definition = input.required<readonly RemoteRuleField[]>();

  readonly form = computed(() =>
    createForm({
      fields: this.definition().map(toFieldConfig),
      onSubmit: ({ valid, values }) => {
        if (valid) console.log(values);
      },
    }),
  );
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'A field hidden by a condition is disabled: it leaves `valid` and the submitted values until it is shown again, so `required: true` together with `showWhen` does not block the form while the field is hidden. When it is shown again it comes back with the value it had.',
            es: 'Un campo que una condición oculta queda deshabilitado: sale de `valid` y de los valores enviados hasta que se vuelva a mostrar, así que `required: true` junto con `showWhen` no bloquea el formulario mientras el campo está oculto. Al mostrarse otra vez, vuelve con el valor que tenía.',
          },
        },
      ],
    },
    {
      id: 'step-5-callback-dsl',
      heading: { en: '5. The callback DSL', es: '5. El DSL con callback' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`createForm` also accepts a function that receives `{ field, layout, validation, step }` ([FormDsl](/api/FormDsl)). It produces exactly the builder style, so it supports conditions and wizard steps, but you only import `createForm`. Values are untyped (`Record<string, any>`) unless you call `createForm<YourType>(...)`.',
            es: '`createForm` también acepta una función que recibe `{ field, layout, validation, step }` ([FormDsl](/api/FormDsl)). Produce exactamente el estilo con builders, así que soporta condiciones y pasos de asistente, pero solo importas `createForm`. Los valores no tienen tipo (`Record<string, any>`) salvo que llames `createForm<TuTipo>(...)`.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `readonly form = createForm(({ field, layout }) => ({
  ...layout.grid(2, { gap: 'md' }),
  fields: [
    field.select('contact', 'Contact me by', { choices: ['email', 'phone'], defaultValue: 'email' }),
    field.email('email', 'Email', { required: true, showWhen: ['contact', 'email'] }),
    field.tel('phone', 'Phone', { required: true, showWhen: ['contact', 'phone'] }),
  ],
  onSubmit: ({ valid, values }) => {
    if (valid) console.log(values);
  },
}));`,
        },
        {
          kind: 'table',
          head: [
            { en: 'You need', es: 'Necesitas' },
            { en: 'Use', es: 'Usa' },
          ],
          rows: [
            [
              { en: 'Inferred value types, simple fields', es: 'Tipos inferidos, campos simples' },
              { en: 'Schema (`fields: { ... }`)', es: 'Esquema (`fields: { ... }`)' },
            ],
            [
              {
                en: 'Conditions, `optionsFrom`, radio, toggle, file, editor, time and other types',
                es: 'Condiciones, `optionsFrom`, radio, toggle, file, editor, time y otros tipos',
              },
              { en: 'Builders or the callback DSL', es: 'Builders o el DSL con callback' },
            ],
            [
              { en: 'A wizard with steps', es: 'Un asistente con pasos' },
              { en: 'Builders with `steps` (see [Wizard](/wizard))', es: 'Builders con `steps` (mira [Wizard](/wizard))' },
            ],
          ],
        },
      ],
    },
    {
      id: 'gotchas',
      heading: { en: 'Things to know', es: 'Detalles a tener en cuenta' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Disabled fields (`disabled: true`) and fields hidden by a condition are not in the values `validate`, `onChange` and `onSubmit` receive, even though the inferred type lists them. Check for `undefined` when a rule reads such a field.',
              es: 'Los campos deshabilitados (`disabled: true`) y los que oculta una condición no aparecen en los valores que reciben `validate`, `onChange` y `onSubmit`, aunque el tipo inferido los incluya. Verifica `undefined` cuando una regla lea uno de esos campos.',
            },
            {
              en: 'A static `hidden: true` field is different: it is not rendered but stays enabled, so its value is submitted and its validators still count. Do not mark it required unless it has a valid default.',
              es: 'Un campo con `hidden: true` estático es distinto: no se dibuja pero sigue habilitado, así que su valor se envía y sus validadores siguen contando. No lo marques como obligatorio a menos que tenga un valor por defecto válido.',
            },
            {
              en: 'A `date` entry’s `min` and `max` reach the datepicker as `minDate` / `maxDate`: days outside the range are disabled, and a value outside it fails with the `min` / `max` error key. An invalid date string is ignored.',
              es: 'Los `min` y `max` de una entrada `date` llegan al datepicker como `minDate` / `maxDate`: los días fuera del rango quedan deshabilitados y un valor fuera de él falla con la clave de error `min` / `max`. Un texto de fecha inválido se ignora.',
            },
            {
              en: 'Fields without a `placeholder` get `Enter <label>`; set `placeholder` when that does not read well (or when the form is not in English).',
              es: 'Los campos sin `placeholder` reciben `Enter <label>`; define `placeholder` cuando eso no se lea bien (o cuando el formulario no esté en inglés).',
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
              en: '[Custom validators](/guides/custom-validators): per-field validators, cross-field rules and server checks.',
              es: '[Validadores personalizados](/guides/custom-validators): validadores por campo, reglas entre campos y verificaciones en el servidor.',
            },
            {
              en: '[Builders](/systems/builders): how `createForm`, `createTable` and the other builders share one pattern.',
              es: '[Builders](/systems/builders): cómo `createForm`, `createTable` y los demás builders comparten un mismo patrón.',
            },
            {
              en: 'Every schema type is in the API reference: [DeclarativeFormConfig](/api/DeclarativeFormConfig), [FieldDefinition](/api/FieldDefinition), [InferFormValues](/api/InferFormValues).',
              es: 'Cada tipo del esquema está en la referencia de API: [DeclarativeFormConfig](/api/DeclarativeFormConfig), [FieldDefinition](/api/FieldDefinition), [InferFormValues](/api/InferFormValues).',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'forms', note: { en: 'Component reference and live examples.', es: 'Referencia del componente y ejemplos en vivo.' } },
    { id: 'guide-build-a-form', note: { en: 'The builder style, step by step.', es: 'El estilo con builders, paso a paso.' } },
    { id: 'guide-custom-validators', note: { en: 'Your own validation rules.', es: 'Tus propias reglas de validación.' } },
  ],
};

export default content;
