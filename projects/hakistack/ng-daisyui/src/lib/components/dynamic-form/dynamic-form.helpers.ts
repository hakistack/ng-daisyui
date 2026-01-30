import { computed, signal } from '@angular/core';
import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

import { generateUniqueId } from '../../utils/generate-uuid';
import { ConditionalLogic, CreateFormInput, FieldType, FieldValidation, FormConfig, FormController, FormFieldConfig, FormSelectOption, FormStep } from './dynamic-form.types';

// Simplified field options interface
interface FieldOptions {
  placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any;
  helpText?: string;
  colSpan?: number;
  cssClass?: string;
  containerClass?: string;
  hidden?: boolean;
  disabled?: boolean;
  required?: boolean;
  validation?: Partial<FieldValidation>;
  options?: FormSelectOption[] | Observable<FormSelectOption[]>;
  rows?: number;
  accept?: string;
  prefix?: string;
  suffix?: string;
  multiple?: boolean;
  orientation?: 'horizontal' | 'vertical';
  enableSearch?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showWhen?: string | [string, any] | [string, (value: any, formValues?: Record<string, any>) => boolean];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hideWhen?: string | [string, any] | [string, (value: any, formValues?: Record<string, any>) => boolean];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requiredWhen?: string | [string, any] | [string, (value: any, formValues?: Record<string, any>) => boolean];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disabledWhen?: string | [string, any] | [string, (value: any, formValues?: Record<string, any>) => boolean];
}

/**
 * Create a form configuration with external control capabilities.
 * Returns a FormController with config signal and submit/reset methods.
 *
 * @example
 * ```typescript
 * const form = createForm({
 *   fields: [
 *     field.text('name', 'Name', { required: true }),
 *     field.email('email', 'Email'),
 *   ],
 *   onSubmit: (data) => {
 *     if (data.valid) saveUser(data.values);
 *   },
 * });
 *
 * // In template
 * <app-dynamic-form [config]="form.config()" />
 * <button (click)="form.submit()">Submit</button>
 * <button (click)="form.reset()">Reset</button>
 * ```
 */
export function createForm(input: CreateFormInput): FormController {
  // Trigger signals - increment to trigger action in component
  const submitTrigger = signal(0);
  const resetTrigger = signal(0);

  const config = computed<FormConfig>(() => ({
    title: input.title,
    description: input.description,
    layout: input.layout || 'vertical',
    gridColumns: input.gridColumns,
    autoSave: input.autoSave,
    // Regular form
    fields: input.fields,
    // Wizard/stepper
    steps: input.steps,
    stepperConfig: input.steps
      ? {
          linear: true,
          validateStepOnNext: true,
          showStepSummary: true,
          ...input.stepperConfig,
        }
      : undefined,
    // Callbacks
    onSubmit: input.onSubmit,
    onReset: input.onReset,
    onChange: input.onChange,
    // Internal triggers for external control
    _submitTrigger: submitTrigger.asReadonly(),
    _resetTrigger: resetTrigger.asReadonly(),
  }));

  return {
    config,
    submit: () => submitTrigger.update(v => v + 1),
    reset: () => resetTrigger.update(v => v + 1),
  };
}

// Base field creation with smart defaults
function createField(key: string, type: FieldType, label?: string, options: FieldOptions = {}): FormFieldConfig {
  const autoLabel =
    label ||
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();

  return {
    id: generateUniqueId(),
    key,
    type,
    label: autoLabel,
    placeholder: options.placeholder || `Enter ${autoLabel.toLowerCase()}`,
    validation: {
      required: options.required || false,
      ...options.validation,
    },
    defaultValue: options.defaultValue,
    helpText: options.helpText,
    order: 1,
    colSpan: options.colSpan || 1,
    cssClass: options.cssClass || 'form-control',
    containerClass: options.containerClass || 'form-group',
    hidden: options.hidden || false,
    disabled: options.disabled || false,
    showWhen: parseCondition(options.showWhen),
    hideWhen: parseCondition(options.hideWhen),
    requiredWhen: parseCondition(options.requiredWhen),
    disabledWhen: parseCondition(options.disabledWhen),
    options: options.options,
    rows: options.rows,
    accept: options.accept,
    prefix: options.prefix,
    suffix: options.suffix,
    multiple: options.multiple,
    orientation: options.orientation,
    isSelectSearchable: options.enableSearch,
  };
}

// Helper to parse conditions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCondition(condition?: string | [string, any]): ConditionalLogic[] {
  if (!condition) return [];

  if (typeof condition === 'string') {
    // Simple boolean check: showWhen: 'isAdmin'
    return [{ field: condition, operator: 'equals', value: true }];
  }

  // Tuple format: showWhen: ['role', 'admin'] or ['firstName', (val) => val.length > 0]
  const [field, value] = condition;

  // Check if value is a function
  if (typeof value === 'function') {
    return [{ field, operator: 'function', value }];
  }

  // Standard value comparison
  return [{ field, operator: 'equals', value }];
}

// Simplified field creators with smart defaults
export const field = {
  // Text fields
  text: (key: string, label?: string, options?: FieldOptions) => createField(key, 'text', label, options),

  email: (key: string, label?: string, options?: FieldOptions) =>
    createField(key, 'email', label, {
      validation: { email: true },
      placeholder: `Enter ${(label || 'email').toLowerCase()}`,
      ...options,
    }),

  password: (key: string, label?: string, options?: FieldOptions) =>
    createField(key, 'password', label, {
      placeholder: `Enter ${(label || 'password').toLowerCase()}`,
      ...options,
    }),

  textarea: (key: string, label?: string, options?: FieldOptions) =>
    createField(key, 'textarea', label, {
      rows: 3,
      placeholder: `Enter ${(label || key).toLowerCase()}...`,
      ...options,
    }),

  // Number fields
  number: (key: string, label?: string, options?: FieldOptions) => createField(key, 'number', label, options),

  range: (key: string, min = 0, max = 100, label?: string, options?: FieldOptions) =>
    createField(key, 'range', label, {
      validation: { min, max },
      defaultValue: min,
      ...options,
    }),

  // Selection fields
  select: (key: string, optionsArray: string[] | FormSelectOption[], label?: string, options?: FieldOptions) => {
    const selectOptions =
      Array.isArray(optionsArray) && typeof optionsArray[0] === 'string'
        ? (optionsArray as string[]).map(opt => ({ label: opt, value: opt }))
        : (optionsArray as FormSelectOption[]);

    return createField(key, 'select', label, {
      options: selectOptions,
      placeholder: `Select ${(label || key).toLowerCase()}`,
      ...options,
    });
  },

  multiSelect: (key: string, optionsArray: string[] | FormSelectOption[], label?: string, options?: FieldOptions) => {
    const selectOptions =
      Array.isArray(optionsArray) && typeof optionsArray[0] === 'string'
        ? (optionsArray as string[]).map(opt => ({ label: opt, value: opt }))
        : (optionsArray as FormSelectOption[]);

    return createField(key, 'multiselect', label, {
      options: selectOptions,
      defaultValue: [],
      placeholder: `Select ${(label || key).toLowerCase()}`,
      ...options,
    });
  },

  radio: (key: string, optionsArray: string[] | FormSelectOption[], label?: string, options?: FieldOptions) => {
    const radioOptions =
      Array.isArray(optionsArray) && typeof optionsArray[0] === 'string'
        ? (optionsArray as string[]).map(opt => ({ label: opt, value: opt }))
        : (optionsArray as FormSelectOption[]);

    return createField(key, 'radio', label, {
      options: radioOptions,
      ...options,
    });
  },

  // Boolean fields
  checkbox: (key: string, label?: string, options?: FieldOptions) =>
    createField(key, 'checkbox', label, {
      defaultValue: false,
      ...options,
    }),

  toggle: (key: string, label?: string, options?: FieldOptions) =>
    createField(key, 'toggle', label, {
      defaultValue: false,
      ...options,
    }),

  // Date/time fields
  date: (key: string, label?: string, options?: FieldOptions) => createField(key, 'date', label, options),

  // time: (key: string, label?: string, options?: FieldOptions) => createField(key, 'time', label, options),

  // datetime: (key: string, label?: string, options?: FieldOptions) => createField(key, 'datetime-local', label, options),

  // File field
  file: (key: string, label?: string, options?: FieldOptions) =>
    createField(key, 'file', label, {
      accept: '*/*',
      ...options,
    }),

  // Hidden field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hidden: (key: string, value: any, options?: FieldOptions) =>
    createField(key, 'hidden', '', {
      hidden: true,
      defaultValue: value,
      ...options,
    }),
};

// Validation helpers
export const validation = {
  required: (min?: number, max?: number): FieldValidation => ({
    required: true,
    minLength: min,
    maxLength: max,
  }),

  email: (required = true): FieldValidation => ({
    required,
    email: true,
  }),

  password: (minLength = 8, strongPassword = false): FieldValidation => ({
    required: true,
    minLength,
    pattern: strongPassword ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ : undefined,
  }),

  number: (min?: number, max?: number, required = true): FieldValidation => ({
    required,
    min,
    max,
  }),

  custom: (...validators: ValidatorFn[]): FieldValidation => ({
    custom: validators,
  }),
};

// Layout helpers
export const layout = {
  vertical: () => ({ layout: 'vertical' as const }),
  horizontal: () => ({ layout: 'horizontal' as const }),
  grid: (columns = 2) => ({ layout: 'grid' as const, gridColumns: columns }),
};

// Step helpers for wizard/stepper forms
export const step = {
  /**
   * Create a form step with fields
   */
  create: (
    name: string,
    label: string,
    fields: FormFieldConfig[],
    options?: {
      description?: string;
      optional?: boolean;
      nextText?: string; // Override next button text for this step
      previousText?: string; // Override previous button text for this step
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
   * Create a review step (empty fields, shows summary)
   */
  review: (name: string, label: string, description?: string): FormStep => ({
    name,
    label,
    description: description ?? 'Review your information before submitting',
    fields: [],
  }),
};

/**
 * @deprecated Use createForm with steps instead
 */
export const createWizard = createForm;
