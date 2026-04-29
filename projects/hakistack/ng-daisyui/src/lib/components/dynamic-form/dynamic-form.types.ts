import { EnvironmentProviders, InjectionToken, Signal, makeEnvironmentProviders } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

/**
 * App-wide default text for every `<hk-dynamic-form>`. Per-form `stepperConfig.*Text`
 * and per-field `placeholder` / `optionsFrom.loadingPlaceholder` still win when set.
 */
export interface DynamicFormLabels {
  /** Stepper "Previous" button text. Default: "Previous" */
  previousButton?: string;
  /** Stepper "Next" button text. Default: "Next" */
  nextButton?: string;
  /** Stepper "Submit" (final step) button text. Default: "Submit" */
  completeButton?: string;
  /** Fallback editor placeholder when a field omits `placeholder`. Default: "Write something..." */
  editorPlaceholder?: string;
  /** Fallback loading placeholder for async select/radio options. Default: "Loading options..." */
  loadingOptionsPlaceholder?: string;
}

export const DYNAMIC_FORM_LABELS = new InjectionToken<DynamicFormLabels>('DYNAMIC_FORM_LABELS');

/**
 * Register app-wide text defaults for `<hk-dynamic-form>`.
 *
 * @example
 * providers: [
 *   provideDynamicFormLabels({
 *     previousButton: 'Anterior',
 *     nextButton: 'Siguiente',
 *     completeButton: 'Enviar',
 *     editorPlaceholder: 'Escribe algo...',
 *     loadingOptionsPlaceholder: 'Cargando opciones...',
 *   }),
 * ]
 */
export function provideDynamicFormLabels(labels: DynamicFormLabels): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DYNAMIC_FORM_LABELS, useValue: labels }]);
}

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  | 'date'
  | 'datetime-local'
  | 'time'
  | 'range'
  | 'file'
  | 'color'
  | 'editor'
  | 'hidden';

export interface FormSelectOption<T = string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  readonly group?: string;
}

export interface ConditionalLogic {
  readonly field: string;
  readonly operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'not-in' | 'function';
  readonly value: unknown | ((fieldValue: unknown, formValues: Record<string, unknown>, formGroup?: FormGroup) => boolean);
}

/**
 * Configuration for loading options dynamically based on another field's value.
 * When the watched field changes, loadFn is called to produce new options.
 */
export interface OptionsFromConfig<T = unknown> {
  /** The key of the field to watch */
  readonly field: string;
  /** Function called with the watched field's value. Returns options synchronously, as a Promise, or as an Observable. */
  readonly loadFn: (
    value: T,
    formValues: Record<string, unknown>,
  ) => FormSelectOption[] | Promise<FormSelectOption[]> | Observable<FormSelectOption[]>;
  /** Placeholder text shown while options are loading */
  readonly loadingPlaceholder?: string;
  /** Whether to clear the field's value when the watched field changes (default: true) */
  readonly clearOnChange?: boolean;
}

// ── User-facing field option interfaces ─────────────────────────────────────

/**
 * Condition shorthand for `showWhen` / `hideWhen` / `requiredWhen` / `disabledWhen`.
 *
 * Forms (most reactive → most static):
 *
 * - `Signal<boolean>` — pass the signal itself, **no parens**. Re-evaluates whenever
 *   the signal changes. Best for external state (route mode, auth, feature flags).
 *   ```ts
 *   showWhen: this.isEditMode          // ✅ reactive
 *   ```
 *
 * - `() => boolean` — predicate called on every re-eval. Reads any signals inside
 *   the body; those reads auto-track. Equivalent to `Signal<boolean>` but lets you
 *   compose multiple signals or external sources.
 *   ```ts
 *   showWhen: () => this.isEditMode() && !this.isLocked()
 *   ```
 *
 * - `string` — shorthand for `[fieldKey, true]`. Show when the named form field is truthy.
 *   ```ts
 *   showWhen: 'hasReferral'
 *   ```
 *
 * - `[fieldKey, value]` — show when the named form field equals `value`.
 *   ```ts
 *   showWhen: ['accountType', 'business']
 *   ```
 *
 * - `[fieldKey, (value, formValues) => boolean]` — predicate over a specific form field.
 *
 * - `boolean` — **static**, evaluated once at form-build time. `true` is a no-op,
 *   `false` permanently disables. Note: `showWhen: this.isEditMode()` (with parens!)
 *   evaluates **once** — if you want reactivity, drop the parens to pass the signal.
 */
export type ConditionShorthand =
  | boolean
  | (() => boolean)
  | Signal<boolean>
  | string
  | [string, unknown]
  | [string, (value: unknown, formValues?: Record<string, unknown>) => boolean];

/** Shared options available on every field type */
export interface BaseFieldOptions {
  placeholder?: string;
  defaultValue?: unknown;
  helpText?: string;
  /** Grid column span (1-12). Can be responsive: { default: 12, md: 6, lg: 4 } */
  colSpan?: number | ResponsiveColSpan;
  /** Field width for non-grid layouts */
  width?: FieldWidth;
  cssClass?: string;
  containerClass?: string;
  hidden?: boolean;
  disabled?: boolean;
  required?: boolean;
  prefix?: string;
  suffix?: string;
  order?: number;
  group?: string;
  /** Focus this field when the form loads */
  focusOnLoad?: boolean;
  showWhen?: ConditionShorthand;
  hideWhen?: ConditionShorthand;
  requiredWhen?: ConditionShorthand;
  disabledWhen?: ConditionShorthand;
  /** Custom Angular validators */
  customValidators?: ValidatorFn[];
}

export interface TextFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

export interface EmailFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
}

export interface PasswordFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

export interface TelFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

export interface UrlFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

export interface TextareaFieldOptions extends BaseFieldOptions {
  rows?: number;
  cols?: number;
  minLength?: number;
  maxLength?: number;
}

export interface NumberFieldOptions extends BaseFieldOptions {
  min?: number;
  max?: number;
  step?: number;
}

export interface RangeFieldOptions extends BaseFieldOptions {
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldOptions extends BaseFieldOptions {
  choices?: string[] | FormSelectOption[] | Observable<FormSelectOption[]>;
  optionsFrom?: OptionsFromConfig;
  enableSearch?: boolean;
}

export interface MultiSelectFieldOptions extends BaseFieldOptions {
  choices?: string[] | FormSelectOption[] | Observable<FormSelectOption[]>;
  optionsFrom?: OptionsFromConfig;
  enableSearch?: boolean;
}

export interface RadioFieldOptions extends BaseFieldOptions {
  choices?: string[] | FormSelectOption[] | Observable<FormSelectOption[]>;
  optionsFrom?: OptionsFromConfig;
  orientation?: 'horizontal' | 'vertical';
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CheckboxFieldOptions extends BaseFieldOptions {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToggleFieldOptions extends BaseFieldOptions {}

export interface DateFieldOptions extends BaseFieldOptions {
  isRange?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TimeFieldOptions extends BaseFieldOptions {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DatetimeFieldOptions extends BaseFieldOptions {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ColorFieldOptions extends BaseFieldOptions {}

export interface FileFieldOptions extends BaseFieldOptions {
  accept?: string;
  multiple?: boolean;
}

export interface EditorFieldOptions extends BaseFieldOptions {
  editorHeight?: string;
  toolbar?: 'full' | 'basic' | 'minimal';
  outputFormat?: 'html' | 'delta';
  formats?: string[];
  minLength?: number;
  maxLength?: number;
}

export interface HiddenFieldOptions {
  defaultValue?: unknown;
}

// ── Internal field config (consumed by the component) ───────────────────────

/** Resolved field configuration consumed by `<hk-dynamic-form>`. */
export interface FormFieldConfig {
  readonly id: string;
  readonly key: string;
  readonly type: FieldType;
  readonly label: string;
  readonly placeholder?: string;
  readonly defaultValue?: unknown;
  // Flattened validation
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly email?: boolean;
  readonly pattern?: string | RegExp;
  readonly customValidators?: ValidatorFn[];
  // Selection
  readonly choices?: readonly FormSelectOption[] | Observable<readonly FormSelectOption[]>;
  readonly optionsFrom?: OptionsFromConfig;
  readonly multiple?: boolean;
  readonly rows?: number;
  readonly cols?: number;
  readonly accept?: string;
  readonly step?: number;
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly helpText?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly cssClass?: string;
  readonly containerClass?: string;
  readonly showWhen?: ConditionalLogic[];
  readonly hideWhen?: ConditionalLogic[];
  readonly requiredWhen?: ConditionalLogic[];
  readonly disabledWhen?: ConditionalLogic[];
  readonly enableSearch?: boolean;
  readonly isRangeDate?: boolean;
  // Editor
  readonly editorHeight?: string;
  readonly editorToolbar?: 'full' | 'basic' | 'minimal';
  readonly editorOutputFormat?: 'html' | 'delta';
  readonly editorFormats?: string[];
  readonly orientation?: 'horizontal' | 'vertical';
  /** Grid column span (1-12). Can be responsive: { default: 12, md: 6, lg: 4 } */
  readonly colSpan?: number | ResponsiveColSpan;
  /** Field width for non-grid layouts */
  readonly width?: FieldWidth;
  readonly order?: number;
  readonly group?: string;
  /** Focus this field when the form loads */
  readonly focusOnLoad?: boolean;
}

/** Responsive column span configuration */
export interface ResponsiveColSpan {
  readonly default?: number;
  readonly sm?: number;
  readonly md?: number;
  readonly lg?: number;
  readonly xl?: number;
  readonly '2xl'?: number;
}

/** Field width options for non-grid layouts */
export type FieldWidth = 'full' | '1/2' | '1/3' | '1/4' | '2/3' | '3/4' | 'auto';

// ── Stepper / Wizard types ──────────────────────────────────────────────────

export interface FormStep {
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly order?: number;
  readonly optional?: boolean;
  readonly completed?: boolean;
  readonly editable?: boolean;
  readonly fields: readonly FormFieldConfig[];
  readonly nextText?: string;
  readonly previousText?: string;
}

export interface StepperConfig {
  readonly linear?: boolean;
  readonly showStepNumbers?: boolean;
  readonly allowStepNavigation?: boolean;
  readonly validateStepOnNext?: boolean;
  readonly showStepSummary?: boolean;
  readonly showStepIndicator?: boolean;
  readonly previousText?: string;
  readonly nextText?: string;
  readonly completeText?: string;
}

// ── Auto-save ───────────────────────────────────────────────────────────────

/**
 * Configuration for form auto-save functionality.
 * Requires `provideFormState()` to be configured in app providers.
 */
export interface AutoSaveConfig {
  readonly enabled: boolean;
  readonly formId: string;
  readonly debounceMs?: number;
  readonly clearOnSubmit?: boolean;
  readonly storage?: 'api' | 'localStorage';
}

// ── Form config & controller ────────────────────────────────────────────────

/**
 * Input configuration for `createForm`. The `T` type parameter shapes the
 * `values` payload in `onSubmit` / `onChange` and defaults to `Record<string, any>`
 * so untyped usage works without casts. Pass `<MyShape>` via the
 * `createForm<MyShape>(...)` overload to get typed `values`.
 *
 * Note: `fields` and `steps` are intentionally NOT constrained against `T`.
 * Field-key safety would require parallel typing of every field-type/property-type
 * pair to be useful — the partial coverage isn't worth the complexity.
 */
export interface CreateFormInput<T = Record<string, any>> {
  readonly title?: string;
  readonly description?: string;
  readonly layout?: 'vertical' | 'horizontal' | 'grid';
  readonly gridColumns?: number;
  readonly gap?: 'sm' | 'md' | 'lg';
  readonly labelWidth?: 'sm' | 'md' | 'lg' | 'xl';
  readonly autoSave?: boolean | AutoSaveConfig;
  readonly fields?: FormFieldConfig[];
  readonly steps?: FormStep[];
  readonly stepperConfig?: Partial<StepperConfig>;
  readonly onSubmit?: (data: FormSubmissionData<T>) => void;
  readonly onReset?: () => void;
  readonly onChange?: (values: T) => void;
}

/**
 * Resolved configuration consumed by `<hk-dynamic-form>`. You normally don't
 * construct this directly — call `createForm(input)` and pass `form.config()`
 * to the component, which produces a `FormConfig` from a friendlier shape.
 *
 * Provide **either** `fields` (single page) **or** `steps` (wizard mode);
 * passing both is unsupported.
 *
 * `T` shapes the `values` type in `onSubmit` / `onChange`. Defaults to
 * `Record<string, any>` (no casts needed in untyped code). To type strictly,
 * use the `createForm<MyForm>(...)` overload.
 *
 * @example Untyped (default)
 * const form = createForm({
 *   fields: [
 *     field.text('name', 'Name', { required: true }),
 *     field.email('email'),
 *   ],
 *   onSubmit: ({ values, valid }) => valid && save(values['name']),
 * });
 *
 * @example Typed `values` end-to-end
 * interface UserForm { name: string; email: string }
 * const form = createForm<UserForm>({
 *   fields: [field.text('name'), field.email('email')],
 *   onSubmit: ({ values }) => save(values),  // values: UserForm — no cast
 * });
 */
export interface FormConfig<T = Record<string, any>> {
  /** Optional heading rendered above the form. */
  readonly title?: string;
  /** Optional supporting text rendered below the title. */
  readonly description?: string;
  /** Field definitions for a single-page form. Mutually exclusive with `steps`. */
  readonly fields?: readonly FormFieldConfig[];
  /**
   * Layout mode.
   * - `'vertical'` (default) — labels above inputs, one field per row.
   * - `'horizontal'` — labels left, inputs right; pair with `labelWidth`.
   * - `'grid'` — N-column grid; pair with `gridColumns`.
   */
  readonly layout?: 'vertical' | 'horizontal' | 'grid';
  /** Number of grid columns (1–12). Only applies when `layout === 'grid'`. Default: 12. */
  readonly gridColumns?: number;
  /** Spacing between fields. Default: `'md'`. */
  readonly gap?: 'sm' | 'md' | 'lg';
  /** Label column width. Only applies when `layout === 'horizontal'`. */
  readonly labelWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Persist form state to `FormStateService` and restore it on next mount.
   * Pass `true` for legacy boolean opt-in (requires `formId` on the config object form),
   * or pass an `AutoSaveConfig` with `enabled: true` and a stable `formId`.
   * Requires `provideFormState()` in app providers.
   */
  readonly autoSave?: boolean | AutoSaveConfig;
  /** Run validators on every value change. Default: true. */
  readonly validateOnChange?: boolean;
  /** Run validators when a field loses focus. Default: true. */
  readonly validateOnBlur?: boolean;
  /** Customize stepper UI (button text, indicator visibility, etc). Wizard mode only. */
  readonly stepperConfig?: StepperConfig;
  /** Step definitions for wizard mode. Mutually exclusive with `fields`. */
  readonly steps?: readonly FormStep[];
  /**
   * Called when the user submits a valid (or invalid) form.
   * Receives `{ values, valid, errors, completedSteps?, currentStep? }`.
   * Trigger externally via `form.submit()` from the `FormController`.
   */
  readonly onSubmit?: (data: FormSubmissionData<T>) => void;
  /** Called after `form.reset()` clears the form to defaults. */
  readonly onReset?: () => void;
  /** Called on every form value change (debounced). Receives the raw values map. */
  readonly onChange?: (values: T) => void;
  /** @internal Trigger signal for external submit calls */
  readonly _submitTrigger?: () => number;
  /** @internal Trigger signal for external reset calls */
  readonly _resetTrigger?: () => number;
}

export interface FormSubmissionData<T = Record<string, any>> {
  readonly values: T;
  readonly valid: boolean;
  readonly errors: Record<string, string[]>;
  readonly completedSteps?: string[];
  readonly currentStep?: string;
}

export type FormValues<T extends readonly FormFieldConfig[]> = Record<T[number]['key'], unknown>;

export interface StepChangeEvent {
  readonly previousStep: string | null;
  readonly currentStep: string;
  readonly stepIndex: number;
  readonly formValues: Record<string, unknown>;
}

/**
 * Step context available in conditional logic functions.
 * Automatically added to formValues in stepper mode.
 */
export interface StepContext {
  readonly __stepIndex: number;
  readonly __stepName: string | null;
  readonly __isFirstStep: boolean;
  readonly __isLastStep: boolean;
  readonly __completedSteps: string[];
}

export interface StepValidationResult {
  readonly stepName: string;
  readonly valid: boolean;
  readonly errors: Record<string, string[]>;
}

/**
 * Controller object returned by `createForm`. The `T` type parameter flows
 * from `createForm<T>(...)` so `config()` exposes a `FormConfig<T>` whose
 * `onSubmit` / `onChange` see typed `values`.
 */
export interface FormController<T = Record<string, any>> {
  readonly config: Signal<FormConfig<T>>;
  readonly submit: () => void;
  readonly reset: () => void;
}
