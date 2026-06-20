import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

import { AutoSaveConfig, FieldWidth, FormSelectOption, ResponsiveColSpan } from './dynamic-form.types';

/**
 * Declarative forms API — schema-first type definitions.
 *
 * This is the **recommended** way to build a form: pass a single object to
 * `createForm` where `fields` is a *map* (the property name becomes the field
 * name) and each field carries its own `validation`. The value shape is then
 * **inferred** from the field types, so `onSubmit(data)` and `validate(data)`
 * receive a fully-typed object — no separate `field`/`layout`/`validation`
 * imports, no generic to pass by hand.
 *
 * @example
 * const form = createForm({
 *   layout: { type: 'vertical', gap: 'md' },
 *   fields: {
 *     name: { type: 'text', label: 'Full Name', validation: { required: true, minLength: 2 } },
 *     age: { type: 'number', label: 'Age', validation: { min: 18 } },
 *     active: { type: 'checkbox', label: 'Active' },
 *   },
 *   validate: (data) => (data.age < 18 ? { age: 'Must be 18+' } : null),
 *   onSubmit: (data) => {
 *     data.name;   // string
 *     data.age;    // number
 *     data.active; // boolean
 *   },
 * });
 */

// ── Field types & shared option bags ─────────────────────────────────────────

/** Field types supported by the declarative `createForm({ fields })` API. */
export type DeclarativeFieldType = 'text' | 'email' | 'password' | 'number' | 'checkbox' | 'textarea' | 'select' | 'date';

/** Password strength presets that expand to a built-in validation pattern. */
export type PasswordStrength = 'low' | 'medium' | 'high';

/** Validation bag for text-like fields (`text` / `textarea`). */
export interface TextValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

/** Validation bag for `email` fields. */
export interface EmailValidation {
  required?: boolean;
  /** Apply the email-format check. Defaults to `true` for `email` fields. */
  email?: boolean;
}

/** Validation bag for `password` fields. */
export interface PasswordValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  /** Convenience preset that expands to a strength `pattern` when no explicit pattern is given. */
  passwordStrength?: PasswordStrength;
}

/** Validation bag for `number` fields. */
export interface NumberValidation {
  required?: boolean;
  min?: number;
  max?: number;
}

/** Validation bag for `checkbox` fields. */
export interface CheckboxValidation {
  required?: boolean;
}

/** Validation bag for `select` fields. */
export interface SelectValidation {
  required?: boolean;
}

/** Validation bag for `date` fields. */
export interface DateValidation {
  required?: boolean;
}

/** Layout/behaviour options shared by every declarative field definition. */
interface DeclarativeFieldBase {
  /** Display label. Falls back to a humanized version of the field name when omitted. */
  label?: string;
  helpText?: string;
  disabled?: boolean;
  hidden?: boolean;
  /** Grid column span (1-12). Supports responsive: `{ default: 12, md: 6 }`. */
  colSpan?: number | ResponsiveColSpan;
  /** Field width for non-grid layouts. */
  width?: FieldWidth;
  order?: number;
  group?: string;
  /** Escape hatch — attach raw Angular validators in addition to `validation.*`. */
  customValidators?: ValidatorFn[];
}

// ── Per-type field definitions (discriminated on `type`) ─────────────────────

export interface TextFieldDef extends DeclarativeFieldBase {
  type: 'text';
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  validation?: TextValidation;
}

export interface EmailFieldDef extends DeclarativeFieldBase {
  type: 'email';
  placeholder?: string;
  defaultValue?: string;
  validation?: EmailValidation;
}

export interface PasswordFieldDef extends DeclarativeFieldBase {
  type: 'password';
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  validation?: PasswordValidation;
}

export interface TextareaFieldDef extends DeclarativeFieldBase {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  validation?: TextValidation;
}

export interface NumberFieldDef extends DeclarativeFieldBase {
  type: 'number';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  validation?: NumberValidation;
}

export interface CheckboxFieldDef extends DeclarativeFieldBase {
  type: 'checkbox';
  /** Initial checked state (alias of `defaultValue`). */
  value?: boolean;
  defaultValue?: boolean;
  validation?: CheckboxValidation;
}

export interface SelectFieldDef<V = string> extends DeclarativeFieldBase {
  type: 'select';
  placeholder?: string;
  /** Option list — `string[]`, `{ value, label }[]`, or an `Observable` of them. */
  options: readonly V[] | readonly FormSelectOption<V>[] | Observable<readonly FormSelectOption<V>[]>;
  enableSearch?: boolean;
  defaultValue?: V;
  validation?: SelectValidation;
}

export interface DateFieldDef extends DeclarativeFieldBase {
  type: 'date';
  min?: Date | string;
  max?: Date | string;
  defaultValue?: Date | null;
  validation?: DateValidation;
}

/** Union of every declarative field definition. */
export type FieldDefinition =
  | TextFieldDef
  | EmailFieldDef
  | PasswordFieldDef
  | TextareaFieldDef
  | NumberFieldDef
  | CheckboxFieldDef
  | SelectFieldDef<unknown>
  | DateFieldDef;

/** A `fields` map: keys are field names, values are field definitions. */
export type FieldsMap = Record<string, FieldDefinition>;

// ── Value-shape inference ────────────────────────────────────────────────────

/** Recover the value type of a single `select` option entry. */
type OptionItemValue<Item> = Item extends FormSelectOption<infer V> ? V : Item extends string ? Item : string;

/** Recover the selected value type from a `select` field's `options`. */
type InferOptionValue<O> =
  O extends Observable<infer Arr>
    ? Arr extends readonly (infer Item)[]
      ? OptionItemValue<Item>
      : string
    : O extends readonly (infer Item)[]
      ? OptionItemValue<Item>
      : string;

/**
 * Map a single field definition to the TypeScript type of its value.
 * `text`/`email`/`password`/`textarea` → string, `number` → number,
 * `checkbox` → boolean, `date` → `Date | null`, `select` → its option value type.
 */
export type InferFieldValue<F> = F extends { type: 'number' }
  ? number
  : F extends { type: 'checkbox' }
    ? boolean
    : F extends { type: 'date' }
      ? Date | null
      : F extends { type: 'select'; options: infer O }
        ? InferOptionValue<O>
        : F extends { type: 'text' | 'email' | 'password' | 'textarea' }
          ? string
          : unknown;

/** Map a whole `fields` map to the inferred form-values object. */
export type InferFormValues<TFields> = {
  [K in keyof TFields]: InferFieldValue<TFields[K]>;
};

// ── Declarative form config ──────────────────────────────────────────────────

/** Layout configuration for the declarative form (object form of the layout helpers). */
export interface FormLayoutConfig {
  type?: 'vertical' | 'horizontal' | 'grid';
  gap?: 'sm' | 'md' | 'lg';
  /** Number of columns (grid layout only). */
  columns?: number;
  /** Label column width (horizontal layout only). */
  labelWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Errors returned by the form-level `validate` callback: a map of `fieldName → message`.
 * Keys are constrained to the form's field names. Return `null` (or nothing) when valid.
 */
export type FormValidationErrors<TFields> = Partial<Record<keyof TFields, string>>;

/**
 * Configuration object for the declarative `createForm` API. The value shape
 * (`InferFormValues<TFields>`) flows into `validate` / `onSubmit` / `onChange`.
 */
export interface DeclarativeFormConfig<TFields extends FieldsMap> {
  title?: string;
  description?: string;
  layout?: FormLayoutConfig;
  /** Field map — the property name becomes the field's name. */
  fields: TFields;
  autoSave?: boolean | AutoSaveConfig;
  /**
   * Form-level (cross-field) validation. Receives the typed values and returns a
   * `{ fieldName: message }` map for any invalid fields, or `null` when everything checks out.
   */
  validate?: (data: InferFormValues<TFields>) => FormValidationErrors<TFields> | null | void;
  /** Called on a valid submit with the typed values (not wrapped in `FormSubmissionData`). */
  onSubmit?: (data: InferFormValues<TFields>) => void;
  /** Called on every (debounced) value change with the typed values. */
  onChange?: (data: InferFormValues<TFields>) => void;
  onReset?: () => void;
}
