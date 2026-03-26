import { Signal } from '@angular/core';
import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

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
  | 'hidden';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FormSelectOption<T = any> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  readonly group?: string;
}

export interface ConditionalLogic {
  readonly field: string;
  readonly operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'not-in' | 'function';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly value: any | ((fieldValue: any, formValues: Record<string, any>, formGroup?: any) => boolean);
}

/**
 * Configuration for loading options dynamically based on another field's value.
 * When the watched field changes, loadFn is called to produce new options.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OptionsFromConfig<T = any> {
  /** The key of the field to watch */
  readonly field: string;
  /** Function called with the watched field's value. Returns options synchronously, as a Promise, or as an Observable. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly loadFn: (value: T, formValues: Record<string, any>) => FormSelectOption[] | Promise<FormSelectOption[]> | Observable<FormSelectOption[]>;
  /** Placeholder text shown while options are loading */
  readonly loadingPlaceholder?: string;
  /** Whether to clear the field's value when the watched field changes (default: true) */
  readonly clearOnChange?: boolean;
}

// ── User-facing field option interfaces ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConditionShorthand = string | [string, any] | [string, (value: any, formValues?: Record<string, any>) => boolean];

/** Shared options available on every field type */
export interface BaseFieldOptions {
  placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any;
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

export interface CheckboxFieldOptions extends BaseFieldOptions {}

export interface ToggleFieldOptions extends BaseFieldOptions {}

export interface DateFieldOptions extends BaseFieldOptions {
  isRange?: boolean;
}

export interface TimeFieldOptions extends BaseFieldOptions {}

export interface DatetimeFieldOptions extends BaseFieldOptions {}

export interface ColorFieldOptions extends BaseFieldOptions {}

export interface FileFieldOptions extends BaseFieldOptions {
  accept?: string;
  multiple?: boolean;
}

export interface HiddenFieldOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any;
}

// ── Internal field config (consumed by the component) ───────────────────────

export interface FormFieldConfig {
  readonly id: string;
  readonly key: string;
  readonly type: FieldType;
  readonly label: string;
  readonly placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly defaultValue?: any;
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

/** Input configuration for createForm helper */
export interface CreateFormInput {
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
  readonly onSubmit?: (data: FormSubmissionData) => void;
  readonly onReset?: () => void;
  readonly onChange?: (values: Record<string, unknown>) => void;
}

export interface FormConfig {
  readonly title?: string;
  readonly description?: string;
  readonly fields?: readonly FormFieldConfig[];
  readonly layout?: 'vertical' | 'horizontal' | 'grid';
  readonly gridColumns?: number;
  readonly gap?: 'sm' | 'md' | 'lg';
  readonly labelWidth?: 'sm' | 'md' | 'lg' | 'xl';
  readonly autoSave?: boolean | AutoSaveConfig;
  readonly validateOnChange?: boolean;
  readonly validateOnBlur?: boolean;
  readonly stepperConfig?: StepperConfig;
  readonly steps?: readonly FormStep[];
  readonly onSubmit?: (data: FormSubmissionData) => void;
  readonly onReset?: () => void;
  readonly onChange?: (values: Record<string, unknown>) => void;
  /** @internal Trigger signal for external submit calls */
  readonly _submitTrigger?: () => number;
  /** @internal Trigger signal for external reset calls */
  readonly _resetTrigger?: () => number;
}

export interface FormSubmissionData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly values: Record<string, any>;
  readonly valid: boolean;
  readonly errors: Record<string, string[]>;
  readonly completedSteps?: string[];
  readonly currentStep?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValues<T extends readonly FormFieldConfig[]> = Record<T[number]['key'], any>;

export interface StepChangeEvent {
  readonly previousStep: string | null;
  readonly currentStep: string;
  readonly stepIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly formValues: Record<string, any>;
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
 * Controller object returned by createForm.
 */
export interface FormController {
  readonly config: Signal<FormConfig>;
  readonly submit: () => void;
  readonly reset: () => void;
}
