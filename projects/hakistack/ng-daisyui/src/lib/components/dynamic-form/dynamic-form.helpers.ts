import { computed, signal } from '@angular/core';
import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

import { generateUniqueId } from '../../utils/generate-uuid';
import {
  BaseFieldOptions,
  CheckboxFieldOptions,
  ColorFieldOptions,
  ConditionalLogic,
  ConditionShorthand,
  CreateFormInput,
  DateFieldOptions,
  DatetimeFieldOptions,
  EditorFieldOptions,
  EmailFieldOptions,
  FieldType,
  FileFieldOptions,
  FormConfig,
  FormController,
  FormFieldConfig,
  FormSelectOption,
  FormStep,
  HiddenFieldOptions,
  MultiSelectFieldOptions,
  NumberFieldOptions,
  OptionsFromConfig,
  PasswordFieldOptions,
  RadioFieldOptions,
  RangeFieldOptions,
  SelectFieldOptions,
  TelFieldOptions,
  TextareaFieldOptions,
  TextFieldOptions,
  TimeFieldOptions,
  ToggleFieldOptions,
  UrlFieldOptions,
} from './dynamic-form.types';
import {
  CheckboxFieldDef,
  DateFieldDef,
  DeclarativeFormConfig,
  EmailFieldDef,
  FieldDefinition,
  FieldsMap,
  InferFormValues,
  NumberFieldDef,
  PasswordFieldDef,
  PasswordStrength,
  SelectFieldDef,
  TextareaFieldDef,
  TextFieldDef,
} from './dynamic-form.schema';

// ── createForm ──────────────────────────────────────────────────────────────

/**
 * The DSL toolkit handed to the `createForm` callback form. Lets you build a form
 * without importing `field` / `layout` / `validation` / `step` separately — they
 * arrive fully typed (and autocompletable) as the callback's single argument.
 *
 * The members are the very same objects exported from this module, so the type is
 * derived with `typeof` — no parallel typing, no `any`, identical IntelliSense.
 *
 * @example
 * createForm(({ field, layout, validation, step }) => ({ ... }));
 */
export interface FormDsl {
  /** Field builders — `field.text`, `field.email`, `field.select`, … */
  readonly field: typeof field;
  /** Layout bundles — `layout.vertical`, `layout.horizontal`, `layout.grid`. */
  readonly layout: typeof layout;
  /** Validation bundles — `validation.required`, `validation.password`, … */
  readonly validation: typeof validation;
  /** Step builders for wizard mode — `step.create`, `step.review`. */
  readonly step: typeof step;
}

/**
 * Singleton DSL toolkit passed to the `createForm` callback form. Uses getters so
 * the bindings resolve at call time — `createForm` is declared above the `field`/
 * `layout`/`validation`/`step` consts, and the callback only runs after module init.
 */
const formDsl: FormDsl = {
  get field() {
    return field;
  },
  get layout() {
    return layout;
  },
  get validation() {
    return validation;
  },
  get step() {
    return step;
  },
};

/**
 * Create a form configuration with external control capabilities.
 * Returns a FormController with config signal and submit/reset methods.
 *
 * Accepts either a plain `CreateFormInput` object, or a **callback** that receives
 * a typed `{ field, layout, validation, step }` DSL — so consumers only need to
 * import `createForm` and get the builders inline with full autocomplete.
 *
 * @example Object form (classic)
 * ```typescript
 * import { createForm, field } from '@hakistack/ng-daisyui';
 *
 * const form = createForm({
 *   fields: [
 *     field.text('name', 'Name', { required: true }),
 *     field.email('email', 'Email'),
 *   ],
 *   onSubmit: (data) => {
 *     if (data.valid) saveUser(data.values);
 *   },
 * });
 * ```
 *
 * @example Callback form (only import `createForm`)
 * ```typescript
 * import { createForm } from '@hakistack/ng-daisyui';
 *
 * const form = createForm(({ field, layout, validation }) => ({
 *   ...layout.vertical({ gap: 'md' }),
 *   fields: [
 *     field.text('name', 'Full Name', { required: true }),
 *     field.email('email', 'Email Address', { required: true }),
 *     field.password('password', 'Password', validation.password(8)),
 *   ],
 *   onSubmit: (data) => console.log(data),
 * }));
 * ```
 *
 * ```html
 * <!-- In template -->
 * <hk-dynamic-form [config]="form.config()" />
 * <button (click)="form.submit()">Submit</button>
 * <button (click)="form.reset()">Reset</button>
 * ```
 */
// Overload signatures:
//  1-2) object form with a `fields` array (untyped / typed)
//  3-4) callback DSL form (untyped / typed)
//  5)   declarative schema form — `fields` is a map; value shape is inferred
export function createForm(input: CreateFormInput): FormController;
export function createForm<T>(input: CreateFormInput<T>): FormController<T>;
export function createForm(builder: (dsl: FormDsl) => CreateFormInput): FormController;
export function createForm<T>(builder: (dsl: FormDsl) => CreateFormInput<T>): FormController<T>;
export function createForm<TFields extends FieldsMap>(config: DeclarativeFormConfig<TFields>): FormController<InferFormValues<TFields>>;
export function createForm<T = Record<string, any>>(
  input: CreateFormInput<T> | ((dsl: FormDsl) => CreateFormInput<T>) | DeclarativeFormConfig<FieldsMap>,
): FormController<T> {
  const resolved: CreateFormInput<T> =
    typeof input === 'function'
      ? input(formDsl)
      : isDeclarativeConfig(input)
        ? (declarativeToInput(input) as CreateFormInput<T>)
        : (input as CreateFormInput<T>);

  const submitTrigger = signal(0);
  const resetTrigger = signal(0);

  const config = computed<FormConfig<T>>(() => ({
    title: resolved.title,
    description: resolved.description,
    layout: resolved.layout || 'vertical',
    gridColumns: resolved.gridColumns,
    gap: resolved.gap,
    labelWidth: resolved.labelWidth,
    autoSave: resolved.autoSave,
    fields: resolved.fields,
    steps: resolved.steps,
    stepperConfig: resolved.steps
      ? {
          linear: true,
          validateStepOnNext: true,
          showStepSummary: true,
          ...resolved.stepperConfig,
        }
      : undefined,
    validate: resolved.validate,
    onSubmit: resolved.onSubmit,
    onReset: resolved.onReset,
    onChange: resolved.onChange,
    _submitTrigger: submitTrigger.asReadonly(),
    _resetTrigger: resetTrigger.asReadonly(),
  }));

  return {
    config,
    submit: () => submitTrigger.update((v) => v + 1),
    reset: () => resetTrigger.update((v) => v + 1),
  };
}

// ── Declarative schema → CreateFormInput conversion ──────────────────────────

/** Built-in `passwordStrength` presets → regex pattern. */
const PASSWORD_STRENGTH_PATTERNS: Record<PasswordStrength, RegExp> = {
  low: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  medium: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
  high: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
};

/** A declarative config has a `fields` *map* (plain object), never an array. */
function isDeclarativeConfig(input: unknown): input is DeclarativeFormConfig<FieldsMap> {
  if (typeof input !== 'object' || input === null) return false;
  const fields = (input as { fields?: unknown }).fields;
  return typeof fields === 'object' && fields !== null && !Array.isArray(fields);
}

/** Convert a single declarative field definition into the resolved `FormFieldConfig`. */
function declarativeFieldToConfig(key: string, def: FieldDefinition): FormFieldConfig {
  const label = autoLabel(key, def.label);
  const shared: InternalFieldInput = {
    helpText: def.helpText,
    disabled: def.disabled,
    hidden: def.hidden,
    colSpan: def.colSpan,
    width: def.width,
    order: def.order,
    group: def.group,
    customValidators: def.customValidators,
  };

  switch (def.type) {
    case 'text':
    case 'textarea': {
      const d = def as TextFieldDef | TextareaFieldDef;
      const v = d.validation ?? {};
      return createField(key, def.type, label, {
        ...shared,
        placeholder: d.placeholder,
        defaultValue: d.defaultValue,
        rows: def.type === 'textarea' ? (d as TextareaFieldDef).rows : undefined,
        required: v.required,
        minLength: v.minLength ?? d.minLength,
        maxLength: v.maxLength ?? d.maxLength,
        pattern: v.pattern,
      });
    }
    case 'email': {
      const d = def as EmailFieldDef;
      const v = d.validation ?? {};
      return createField(key, 'email', label, {
        ...shared,
        placeholder: d.placeholder,
        defaultValue: d.defaultValue,
        required: v.required,
        email: v.email ?? true,
      });
    }
    case 'password': {
      const d = def as PasswordFieldDef;
      const v = d.validation ?? {};
      const pattern = v.pattern ?? (v.passwordStrength ? PASSWORD_STRENGTH_PATTERNS[v.passwordStrength] : undefined);
      return createField(key, 'password', label, {
        ...shared,
        placeholder: d.placeholder,
        defaultValue: d.defaultValue,
        required: v.required,
        minLength: v.minLength ?? d.minLength,
        maxLength: v.maxLength ?? d.maxLength,
        pattern,
      });
    }
    case 'number': {
      const d = def as NumberFieldDef;
      const v = d.validation ?? {};
      return createField(key, 'number', label, {
        ...shared,
        placeholder: d.placeholder,
        defaultValue: d.defaultValue,
        required: v.required,
        min: v.min ?? d.min,
        max: v.max ?? d.max,
        step: d.step,
      });
    }
    case 'checkbox': {
      const d = def as CheckboxFieldDef;
      const v = d.validation ?? {};
      return createField(key, 'checkbox', label, {
        ...shared,
        defaultValue: d.value ?? d.defaultValue ?? false,
        required: v.required,
      });
    }
    case 'select': {
      const d = def as SelectFieldDef<unknown>;
      const v = d.validation ?? {};
      return createField(key, 'select', label, {
        ...shared,
        placeholder: d.placeholder,
        defaultValue: d.defaultValue,
        choices: d.options as InternalFieldInput['choices'],
        enableSearch: d.enableSearch,
        required: v.required,
      });
    }
    case 'date': {
      const d = def as DateFieldDef;
      const v = d.validation ?? {};
      return createField(key, 'date', label, {
        ...shared,
        defaultValue: d.defaultValue ?? null,
        required: v.required,
      });
    }
    default: {
      // Exhaustiveness guard — a new field type must be handled above.
      const _exhaustive: never = def;
      return _exhaustive;
    }
  }
}

/** Translate a declarative config into the internal `CreateFormInput` shape. */
function declarativeToInput(config: DeclarativeFormConfig<FieldsMap>): CreateFormInput {
  const fields = Object.entries(config.fields).map(([key, def]) => declarativeFieldToConfig(key, def));

  const declarativeOnSubmit = config.onSubmit;

  return {
    title: config.title,
    description: config.description,
    layout: config.layout?.type ?? 'vertical',
    gap: config.layout?.gap,
    gridColumns: config.layout?.columns,
    labelWidth: config.layout?.labelWidth,
    autoSave: config.autoSave,
    fields,
    // `validate` and `onChange` already operate on raw values — pass through.
    validate: config.validate as (values: Record<string, any>) => Record<string, string> | null | void,
    onChange: config.onChange as ((values: Record<string, any>) => void) | undefined,
    onReset: config.onReset,
    // Declarative `onSubmit` receives the values directly and only fires when valid.
    onSubmit: declarativeOnSubmit
      ? (submission) => {
          if (submission.valid) declarativeOnSubmit(submission.values as Record<string, any>);
        }
      : undefined,
  };
}

// ── Internal helpers ────────────────────────────────────────────────────────

function parseCondition(condition?: ConditionShorthand): ConditionalLogic[] {
  if (condition === undefined || condition === true) return [];

  if (condition === false) {
    return [{ field: '__predicate__', operator: 'function', value: () => false }];
  }

  if (typeof condition === 'function') {
    return [{ field: '__predicate__', operator: 'function', value: condition as () => boolean }];
  }

  if (typeof condition === 'string') {
    return [{ field: condition, operator: 'equals', value: true }];
  }

  const [fieldKey, value] = condition;

  if (typeof value === 'function') {
    return [{ field: fieldKey, operator: 'function', value }];
  }

  return [{ field: fieldKey, operator: 'equals', value }];
}

function normalizeChoices(
  choices?: string[] | FormSelectOption[] | Observable<FormSelectOption[]>,
): FormSelectOption[] | Observable<FormSelectOption[]> | undefined {
  if (!choices) return undefined;
  if (!Array.isArray(choices)) return choices; // Observable
  if (choices.length === 0) return [];
  if (typeof choices[0] === 'string') {
    return (choices as string[]).map((opt) => ({ label: opt, value: opt }));
  }
  return choices as FormSelectOption[];
}

function autoLabel(key: string, label?: string): string {
  return (
    label ||
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  );
}

interface InternalFieldInput extends BaseFieldOptions {
  // Validation (flattened)
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  email?: boolean;
  pattern?: string | RegExp;
  // Selection
  choices?: string[] | FormSelectOption[] | Observable<FormSelectOption[]>;
  optionsFrom?: OptionsFromConfig;
  enableSearch?: boolean;
  orientation?: 'horizontal' | 'vertical';
  // Field-specific
  rows?: number;
  cols?: number;
  accept?: string;
  multiple?: boolean;
  step?: number;
  isRangeDate?: boolean;
  // Editor
  editorHeight?: string;
  editorToolbar?: 'full' | 'basic' | 'minimal';
  editorOutputFormat?: 'html' | 'delta';
  editorFormats?: string[];
}

function createField(key: string, type: FieldType, label: string, input: InternalFieldInput = {}): FormFieldConfig {
  return {
    id: generateUniqueId(),
    key,
    type,
    label,
    placeholder: input.placeholder || `Enter ${label.toLowerCase()}`,
    defaultValue: input.defaultValue,
    // Flattened validation
    required: input.required || false,
    minLength: input.minLength,
    maxLength: input.maxLength,
    min: input.min,
    max: input.max,
    email: input.email,
    pattern: input.pattern,
    customValidators: input.customValidators,
    // Selection
    choices: normalizeChoices(input.choices),
    optionsFrom: input.optionsFrom,
    enableSearch: input.enableSearch,
    // Layout
    colSpan: input.colSpan,
    width: input.width,
    cssClass: input.cssClass || '',
    containerClass: input.containerClass,
    order: input.order ?? 1,
    group: input.group,
    // Behavior
    hidden: input.hidden || false,
    disabled: input.disabled || false,
    helpText: input.helpText,
    prefix: input.prefix,
    suffix: input.suffix,
    focusOnLoad: input.focusOnLoad,
    // Conditions
    showWhen: parseCondition(input.showWhen),
    hideWhen: parseCondition(input.hideWhen),
    requiredWhen: parseCondition(input.requiredWhen),
    disabledWhen: parseCondition(input.disabledWhen),
    // Field-specific
    rows: input.rows,
    cols: input.cols,
    accept: input.accept,
    multiple: input.multiple,
    step: input.step,
    orientation: input.orientation,
    isRangeDate: input.isRangeDate,
    // Editor
    editorHeight: input.editorHeight,
    editorToolbar: input.editorToolbar,
    editorOutputFormat: input.editorOutputFormat,
    editorFormats: input.editorFormats,
  };
}

// ── field builders ──────────────────────────────────────────────────────────
// Every builder: field.*(key, label?, options?)

/**
 * Builders for every supported field type. Each returns a `FormFieldConfig`
 * to be passed into the `fields` array of `createForm()`.
 *
 * Common signature: `field.<type>(key, label?, options?)`
 * - `key` — form-control name (also used as default label if `label` is omitted; camelCase is humanized).
 * - `label` — display label. When omitted, `key` is humanized (`firstName` → `First Name`).
 * - `options` — type-specific options (validation, layout, conditional logic, etc).
 *   See the corresponding `*FieldOptions` interface for each type.
 *
 * @example
 * createForm({
 *   fields: [
 *     field.text('name', 'Name', { required: true, minLength: 2 }),
 *     field.email('email'),                              // label auto = "Email"
 *     field.select('role', 'Role', { choices: ['Admin', 'User'] }),
 *     field.checkbox('agree', 'Accept terms', { required: true }),
 *   ],
 *   onSubmit: (data) => console.log(data),
 * });
 */
export const field = {
  // Text-like fields

  /**
   * Text input. Single-line free-form string.
   * @see TextFieldOptions for `minLength` / `maxLength` / `pattern`.
   */
  text: (key: string, label?: string, options?: TextFieldOptions) => createField(key, 'text', autoLabel(key, label), options),

  /**
   * Email input. Auto-applies the email validator and a sensible placeholder.
   * @see EmailFieldOptions
   */
  email: (key: string, label?: string, options?: EmailFieldOptions) =>
    createField(key, 'email', autoLabel(key, label), {
      email: true,
      placeholder: `Enter ${(label || 'email').toLowerCase()}`,
      ...options,
    }),

  /**
   * Password input. Renders with a built-in show/hide toggle.
   * @see PasswordFieldOptions for `minLength` / `pattern`.
   */
  password: (key: string, label?: string, options?: PasswordFieldOptions) =>
    createField(key, 'password', autoLabel(key, label), {
      placeholder: `Enter ${(label || 'password').toLowerCase()}`,
      ...options,
    }),

  /** Telephone input. Use `pattern` in options to enforce a format. */
  tel: (key: string, label?: string, options?: TelFieldOptions) => createField(key, 'tel', autoLabel(key, label), options),

  /** URL input. Browsers apply native URL validation. */
  url: (key: string, label?: string, options?: UrlFieldOptions) => createField(key, 'url', autoLabel(key, label), options),

  /**
   * Multi-line text input. Defaults to 3 rows.
   * @see TextareaFieldOptions for `rows` / `cols` / `maxLength`.
   */
  textarea: (key: string, label?: string, options?: TextareaFieldOptions) =>
    createField(key, 'textarea', autoLabel(key, label), {
      rows: 3,
      placeholder: `Enter ${(label || key).toLowerCase()}...`,
      ...options,
    }),

  // Number fields

  /**
   * Numeric input. Use `min` / `max` / `step` in options for bounds.
   * @see NumberFieldOptions
   */
  number: (key: string, label?: string, options?: NumberFieldOptions) => createField(key, 'number', autoLabel(key, label), options),

  /**
   * Range slider. Defaults to `min: 0`, `max: 100`. Initial value defaults to `min`.
   * @see RangeFieldOptions
   */
  range: (key: string, label?: string, options?: RangeFieldOptions) =>
    createField(key, 'range', autoLabel(key, label), {
      min: 0,
      max: 100,
      defaultValue: options?.min ?? 0,
      ...options,
    }),

  // Selection fields — choices go in options bag

  /**
   * Single-select dropdown. Provide `choices` (string[] or `{value,label}[]`) or
   * `optionsFrom` to load options dynamically based on another field's value.
   * Set `enableSearch: true` for a searchable dropdown.
   *
   * @example
   * field.select('country', 'Country', { choices: ['US', 'CA'] })
   * field.select('city', 'City', {
   *   optionsFrom: { field: 'country', loadFn: (country) => fetchCities(country) },
   * })
   */
  select: (key: string, label?: string, options?: SelectFieldOptions) =>
    createField(key, 'select', autoLabel(key, label), {
      placeholder: `Select ${(label || key).toLowerCase()}`,
      ...options,
    }),

  /**
   * Multi-select dropdown. Value is `unknown[]` (defaults to `[]`).
   * Same `choices` / `optionsFrom` semantics as `select`.
   */
  multiSelect: (key: string, label?: string, options?: MultiSelectFieldOptions) =>
    createField(key, 'multiselect', autoLabel(key, label), {
      defaultValue: [],
      placeholder: `Select ${(label || key).toLowerCase()}`,
      ...options,
    }),

  /**
   * Radio group. Provide `choices` for the options.
   * Use `orientation: 'horizontal' | 'vertical'` to lay them out.
   */
  radio: (key: string, label?: string, options?: RadioFieldOptions) => createField(key, 'radio', autoLabel(key, label), options),

  // Boolean fields

  /** Checkbox. Defaults to `false`. */
  checkbox: (key: string, label?: string, options?: CheckboxFieldOptions) =>
    createField(key, 'checkbox', autoLabel(key, label), {
      defaultValue: false,
      ...options,
    }),

  /** Toggle switch. Visually different from checkbox; same boolean semantics. */
  toggle: (key: string, label?: string, options?: ToggleFieldOptions) =>
    createField(key, 'toggle', autoLabel(key, label), {
      defaultValue: false,
      ...options,
    }),

  // Date/time fields

  /**
   * Date picker. Pass `isRange: true` to get a date-range picker (value becomes `[start, end]`).
   * @see DateFieldOptions
   */
  date: (key: string, label?: string, options?: DateFieldOptions) =>
    createField(key, 'date', autoLabel(key, label), {
      isRangeDate: options?.isRange,
      ...options,
    }),

  /** Time picker (HH:mm). */
  time: (key: string, label?: string, options?: TimeFieldOptions) => createField(key, 'time', autoLabel(key, label), options),

  /** Combined date + time picker (`datetime-local` semantics). */
  datetime: (key: string, label?: string, options?: DatetimeFieldOptions) =>
    createField(key, 'datetime-local', autoLabel(key, label), options),

  // Other fields

  /** Color picker. Value is a hex string (e.g. `#ff0000`). */
  color: (key: string, label?: string, options?: ColorFieldOptions) => createField(key, 'color', autoLabel(key, label), options),

  /**
   * File upload. Defaults `accept` to all MIME types. Pass `multiple: true` for multi-file.
   * Value is `File | File[]` depending on `multiple`.
   */
  file: (key: string, label?: string, options?: FileFieldOptions) =>
    createField(key, 'file', autoLabel(key, label), {
      accept: '*/*',
      ...options,
    }),

  /**
   * Rich-text editor (TipTap). Loaded lazily on first render to keep the bundle small.
   * Configure `toolbar: 'full' | 'basic' | 'minimal'` and `outputFormat: 'html' | 'delta'`.
   * @see EditorFieldOptions
   */
  editor: (key: string, label?: string, options?: EditorFieldOptions) =>
    createField(key, 'editor', autoLabel(key, label), {
      placeholder: `Enter ${(label || key).toLowerCase()}...`,
      editorHeight: options?.editorHeight,
      editorToolbar: options?.toolbar,
      editorOutputFormat: options?.outputFormat,
      editorFormats: options?.formats,
      ...options,
    }),

  /**
   * Hidden field. Not rendered, but its `defaultValue` is included in form submissions.
   * Useful for carrying IDs, CSRF tokens, etc.
   *
   * @example
   * field.hidden('userId', { defaultValue: currentUser.id })
   */
  hidden: (key: string, options?: HiddenFieldOptions) =>
    createField(key, 'hidden', '', {
      hidden: true,
      defaultValue: options?.defaultValue,
    }),
};

// ── Validation helpers ──────────────────────────────────────────────────────
// Return flat objects that spread into field options

/**
 * Pre-baked validation option bundles. Each helper returns a partial options
 * object that **spreads into** a field builder's options bag — combine with
 * the field's own options.
 *
 * @example
 * field.text('username', 'Username', {
 *   ...validation.required(3, 20),    // required + minLength 3, maxLength 20
 *   pattern: /^[a-z0-9_]+$/i,
 * })
 *
 * field.password('pwd', 'Password', validation.password(12, true))
 *      //                            └─ minLength 12 + strong pattern
 */
export const validation = {
  /** Mark required, with optional `minLength` / `maxLength`. */
  required: (min?: number, max?: number) => ({
    required: true as const,
    minLength: min,
    maxLength: max,
  }),

  /** Apply email format check. Pass `false` to make optional (still validates if filled). */
  email: (required = true) => ({
    required,
    email: true as const,
  }),

  /**
   * Required password with optional strength pattern.
   * @param minLength minimum length (default 8)
   * @param strongPassword if true, require lower + upper + digit + special char
   */
  password: (minLength = 8, strongPassword = false) => ({
    required: true as const,
    minLength,
    pattern: strongPassword ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ : undefined,
  }),

  /** Numeric range. Use for number, range, or any field where min/max apply. */
  number: (min?: number, max?: number, required = true) => ({
    required,
    min,
    max,
  }),

  /** Attach one or more `ValidatorFn`s to the field. */
  custom: (...validators: ValidatorFn[]) => ({
    customValidators: validators,
  }),
};

// ── Layout helpers ──────────────────────────────────────────────────────────

/**
 * Layout option bundles. Spread the result into your `createForm` input.
 *
 * @example
 * createForm({
 *   ...layout.grid(3, { gap: 'md' }),    // 3-column grid, medium gap
 *   fields: [...],
 * });
 *
 * createForm({
 *   ...layout.horizontal({ labelWidth: 'md' }),
 *   fields: [...],
 * });
 */
export const layout = {
  /** Stack fields vertically (label above input). */
  vertical: (options?: { gap?: 'sm' | 'md' | 'lg' }) => ({
    layout: 'vertical' as const,
    gap: options?.gap,
  }),
  /** Place labels left of inputs. Use `labelWidth` to control the label column. */
  horizontal: (options?: { gap?: 'sm' | 'md' | 'lg'; labelWidth?: 'sm' | 'md' | 'lg' | 'xl' }) => ({
    layout: 'horizontal' as const,
    gap: options?.gap,
    labelWidth: options?.labelWidth,
  }),
  /** N-column responsive grid. Default: 2 columns. Use field-level `colSpan` to span rows. */
  grid: (columns = 2, options?: { gap?: 'sm' | 'md' | 'lg' }) => ({
    layout: 'grid' as const,
    gridColumns: columns,
    gap: options?.gap,
  }),
};

// ── Step helpers ────────────────────────────────────────────────────────────

/**
 * Builders for `FormStep`s used in wizard mode (`createForm({ steps: [...] })`).
 *
 * @example
 * createForm({
 *   steps: [
 *     step.create('details', 'Your Details', [
 *       field.text('name', 'Name', { required: true }),
 *       field.email('email'),
 *     ], { description: 'We use this to contact you.' }),
 *
 *     step.create('billing', 'Billing', [
 *       field.text('card', 'Card Number'),
 *     ], { optional: true, nextText: 'Skip for now' }),
 *
 *     step.review('review', 'Review'),   // empty fields — shows summary only
 *   ],
 * });
 */
export const step = {
  /**
   * Create a step with fields and optional metadata.
   *
   * @param name unique step id (used in stepper events).
   * @param label display label on the stepper indicator.
   * @param fields field configs for this step (use `field.*()`).
   * @param options `description`, `optional`, `nextText`, `previousText` overrides.
   */
  create: (
    name: string,
    label: string,
    fields: FormFieldConfig[],
    options?: {
      description?: string;
      optional?: boolean;
      nextText?: string;
      previousText?: string;
    },
  ): FormStep => ({
    name,
    label,
    description: options?.description,
    optional: options?.optional,
    nextText: options?.nextText,
    previousText: options?.previousText,
    fields,
  }),

  /**
   * Empty review step — typically the last step before submit. `fields` is `[]`,
   * so the form's review template renders a summary of prior steps.
   */
  review: (name: string, label: string, description?: string): FormStep => ({
    name,
    label,
    description: description ?? 'Review your information before submitting',
    fields: [],
  }),
};

/** @deprecated Use `createForm` with `steps` instead. Kept as an alias for compatibility. */
export const createWizard = createForm;
