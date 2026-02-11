// form-field.types.ts
import { Signal } from '@angular/core';
import { ValidatorFn, Validators } from '@angular/forms';
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

// Grab all the static validator keys, e.g. "required" | "minLength" | "max" | …
type ValidatorKeys = keyof typeof Validators;

// Filter only function validators and extract their parameter types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ValidatorParam<K extends ValidatorKeys> = (typeof Validators)[K] extends (...args: unknown[]) => unknown
  ? Parameters<(typeof Validators)[K]> extends [infer P, ...unknown[]]
    ? P // if it takes at least one arg, use that arg type
    : boolean // otherwise (e.g. Validators.required()), use boolean
  : never; // exclude non-function properties

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  email?: boolean;
  pattern?: string | RegExp;
  custom?: ValidatorFn[];
}

export interface FormFieldConfig {
  readonly id: string;
  readonly key: string;
  readonly type: FieldType;
  readonly label: string;
  readonly placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly defaultValue?: any;
  readonly validation?: FieldValidation;
  readonly options?: readonly FormSelectOption[] | Observable<readonly FormSelectOption[]>;
  readonly multiple?: boolean;
  readonly rows?: number; // for textarea
  readonly cols?: number; // for textarea
  readonly accept?: string; // for file input
  readonly step?: number; // for number/range inputs
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
  readonly isSelectSearchable?: boolean;
  readonly isRangeDate?: boolean;
  readonly orientation?: 'horizontal' | 'vertical'; // For radio buttons and checkboxes
  // Layout properties
  /** Grid column span (1-12). Can be responsive: { default: 12, md: 6, lg: 4 } */
  readonly colSpan?: number | ResponsiveColSpan;
  /** Field width for non-grid layouts */
  readonly width?: FieldWidth;
  readonly order?: number; // Field order
  readonly group?: string; // Group fields together
  /** Focus this field when the form loads */
  readonly focusOnLoad?: boolean;
}

/** Responsive column span configuration */
export interface ResponsiveColSpan {
  readonly default?: number; // Base column span (1-12)
  readonly sm?: number; // sm: breakpoint
  readonly md?: number; // md: breakpoint
  readonly lg?: number; // lg: breakpoint
  readonly xl?: number; // xl: breakpoint
  readonly '2xl'?: number; // 2xl: breakpoint
}

/** Field width options for non-grid layouts */
export type FieldWidth = 'full' | '1/2' | '1/3' | '1/4' | '2/3' | '3/4' | 'auto';

// Extended interfaces for stepper support
export interface FormStep {
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly order?: number;
  readonly optional?: boolean;
  readonly completed?: boolean;
  readonly editable?: boolean;
  readonly fields: readonly FormFieldConfig[];
  // Per-step button text overrides
  readonly nextText?: string; // Override next button text for this step
  readonly previousText?: string; // Override previous button text for this step
}

export interface StepperConfig {
  readonly linear?: boolean; // Whether steps must be completed in order
  readonly showStepNumbers?: boolean;
  readonly allowStepNavigation?: boolean; // Whether users can click on step headers
  readonly validateStepOnNext?: boolean; // Validate current step before proceeding
  readonly showStepSummary?: boolean; // Show summary of completed steps
  readonly showStepIndicator?: boolean; // Show "Step X of Y" indicator (default: true)
  // Button text defaults
  readonly previousText?: string; // Default text for Previous button
  readonly nextText?: string; // Default text for Next button
  readonly completeText?: string; // Text for final step's submit button (overrides submitText)
}

/**
 * Configuration for form auto-save functionality.
 * Requires `provideFormState()` to be configured in app providers.
 */
export interface AutoSaveConfig {
  /** Enable auto-save functionality */
  readonly enabled: boolean;
  /** Unique ID to identify this form (e.g., 'user-create', 'role-edit') */
  readonly formId: string;
  /** Debounce time in ms before saving (default: 1000) */
  readonly debounceMs?: number;
  /** Clear saved state after successful submit (default: true) */
  readonly clearOnSubmit?: boolean;
  /**
   * Override the global storage mode for this specific form.
   * If not set, uses the mode from provideFormState().
   */
  readonly storage?: 'api' | 'localStorage';
}

/** Input configuration for createForm helper */
export interface CreateFormInput {
  readonly title?: string;
  readonly description?: string;
  readonly layout?: 'vertical' | 'horizontal' | 'grid';
  readonly gridColumns?: number;
  /** Gap between fields: 'sm' (gap-2), 'md' (gap-4), 'lg' (gap-6). Default: 'lg' */
  readonly gap?: 'sm' | 'md' | 'lg';
  /** Label width for horizontal layout. Default: '1/3' */
  readonly labelWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Auto-save configuration. Set to true for simple enable or provide AutoSaveConfig for full control. */
  readonly autoSave?: boolean | AutoSaveConfig;
  /** Form fields for regular mode. Required unless using steps. */
  readonly fields?: FormFieldConfig[];
  /** Form steps for wizard/stepper mode. Alternative to fields. */
  readonly steps?: FormStep[];
  readonly stepperConfig?: Partial<StepperConfig>;
  /** Callback fired on form submission. Alternative to using (formSubmit) output binding. */
  readonly onSubmit?: (data: FormSubmissionData) => void;
  /** Callback fired on form reset. Alternative to using (formReset) output binding. */
  readonly onReset?: () => void;
  /** Callback fired on form value changes. Alternative to using (formChange) output binding. */
  readonly onChange?: (values: Record<string, unknown>) => void;
}

export interface FormConfig {
  readonly title?: string;
  readonly description?: string;
  /** Form fields for regular mode. Required unless using steps. */
  readonly fields?: readonly FormFieldConfig[];
  readonly layout?: 'vertical' | 'horizontal' | 'grid';
  readonly gridColumns?: number;
  /** Gap between fields: 'sm' (gap-2), 'md' (gap-4), 'lg' (gap-6). Default: 'lg' */
  readonly gap?: 'sm' | 'md' | 'lg';
  /** Label width for horizontal layout. Default: '1/3' */
  readonly labelWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Auto-save configuration. Set to true for simple enable or provide AutoSaveConfig for full control. */
  readonly autoSave?: boolean | AutoSaveConfig;
  readonly validateOnChange?: boolean;
  readonly validateOnBlur?: boolean;
  // Stepper-specific configuration
  readonly stepperConfig?: StepperConfig;
  /** Form steps for wizard/stepper mode. Alternative to fields. */
  readonly steps?: readonly FormStep[];
  /** Callback fired on form submission. Alternative to using (formSubmit) output binding. */
  readonly onSubmit?: (data: FormSubmissionData) => void;
  /** Callback fired on form reset. Alternative to using (formReset) output binding. */
  readonly onReset?: () => void;
  /** Callback fired on form value changes. Alternative to using (formChange) output binding. */
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
  readonly completedSteps?: string[]; // For stepper forms
  readonly currentStep?: string; // For stepper forms
}

// Utility type for strongly typed form values
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValues<T extends readonly FormFieldConfig[]> = Record<T[number]['key'], any>;

// Stepper-specific events
export interface StepChangeEvent {
  readonly previousStep: string | null;
  readonly currentStep: string;
  readonly stepIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly formValues: Record<string, any>;
}

/**
 * Step context available in conditional logic functions.
 * These properties are automatically added to formValues when in stepper mode.
 *
 * @example
 * ```typescript
 * // Show field only on the 'address' step
 * field.text('zipCode', 'ZIP Code', {
 *   showWhen: ['firstName', (_, formValues) => formValues.__stepName === 'address']
 * })
 *
 * // Show field only on step index 2
 * field.text('notes', 'Notes', {
 *   showWhen: ['firstName', (_, formValues) => formValues.__stepIndex === 2]
 * })
 *
 * // Show field only on last step
 * field.checkbox('terms', 'Accept Terms', {
 *   showWhen: ['firstName', (_, formValues) => formValues.__isLastStep]
 * })
 * ```
 */
export interface StepContext {
  /** Current step index (0-based) */
  readonly __stepIndex: number;
  /** Current step name */
  readonly __stepName: string | null;
  /** Whether currently on the first step */
  readonly __isFirstStep: boolean;
  /** Whether currently on the last step */
  readonly __isLastStep: boolean;
  /** Array of completed step names */
  readonly __completedSteps: string[];
}

export interface StepValidationResult {
  readonly stepName: string;
  readonly valid: boolean;
  readonly errors: Record<string, string[]>;
}

/**
 * Controller object returned by createForm.
 * Provides both the config signal and methods to control the form externally.
 *
 * @example
 * ```typescript
 * const form = createForm({
 *   showSubmit: false,
 *   fields: [field.text('name', 'Name')],
 *   onSubmit: (data) => console.log(data),
 * });
 *
 * // In template
 * <app-dynamic-form [config]="form.config()" />
 * <button (click)="form.submit()">Custom Submit</button>
 * ```
 */
export interface FormController {
  /** Signal containing the form configuration. Pass to DynamicFormComponent's config input. */
  readonly config: Signal<FormConfig>;
  /** Trigger form submission externally */
  readonly submit: () => void;
  /** Trigger form reset externally */
  readonly reset: () => void;
}
