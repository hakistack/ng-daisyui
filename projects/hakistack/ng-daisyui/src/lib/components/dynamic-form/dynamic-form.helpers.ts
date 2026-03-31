import { computed, signal } from '@angular/core';
import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

import { generateUniqueId } from '../../utils/generate-uuid';
import {
  BaseFieldOptions,
  CheckboxFieldOptions,
  ColorFieldOptions,
  ConditionalLogic,
  CreateFormInput,
  DateFieldOptions,
  DatetimeFieldOptions,
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

// ── createForm ──────────────────────────────────────────────────────────────

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
 * <hk-dynamic-form [config]="form.config()" />
 * <button (click)="form.submit()">Submit</button>
 * <button (click)="form.reset()">Reset</button>
 * ```
 */
export function createForm(input: CreateFormInput): FormController {
  const submitTrigger = signal(0);
  const resetTrigger = signal(0);

  const config = computed<FormConfig>(() => ({
    title: input.title,
    description: input.description,
    layout: input.layout || 'vertical',
    gridColumns: input.gridColumns,
    gap: input.gap,
    labelWidth: input.labelWidth,
    autoSave: input.autoSave,
    fields: input.fields,
    steps: input.steps,
    stepperConfig: input.steps
      ? {
          linear: true,
          validateStepOnNext: true,
          showStepSummary: true,
          ...input.stepperConfig,
        }
      : undefined,
    onSubmit: input.onSubmit,
    onReset: input.onReset,
    onChange: input.onChange,
    _submitTrigger: submitTrigger.asReadonly(),
    _resetTrigger: resetTrigger.asReadonly(),
  }));

  return {
    config,
    submit: () => submitTrigger.update((v) => v + 1),
    reset: () => resetTrigger.update((v) => v + 1),
  };
}

// ── Internal helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCondition(condition?: string | [string, any]): ConditionalLogic[] {
  if (!condition) return [];

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
  };
}

// ── field builders ──────────────────────────────────────────────────────────
// Every builder: field.*(key, label?, options?)

export const field = {
  // Text-like fields
  text: (key: string, label?: string, options?: TextFieldOptions) => createField(key, 'text', autoLabel(key, label), options),

  email: (key: string, label?: string, options?: EmailFieldOptions) =>
    createField(key, 'email', autoLabel(key, label), {
      email: true,
      placeholder: `Enter ${(label || 'email').toLowerCase()}`,
      ...options,
    }),

  password: (key: string, label?: string, options?: PasswordFieldOptions) =>
    createField(key, 'password', autoLabel(key, label), {
      placeholder: `Enter ${(label || 'password').toLowerCase()}`,
      ...options,
    }),

  tel: (key: string, label?: string, options?: TelFieldOptions) => createField(key, 'tel', autoLabel(key, label), options),

  url: (key: string, label?: string, options?: UrlFieldOptions) => createField(key, 'url', autoLabel(key, label), options),

  textarea: (key: string, label?: string, options?: TextareaFieldOptions) =>
    createField(key, 'textarea', autoLabel(key, label), {
      rows: 3,
      placeholder: `Enter ${(label || key).toLowerCase()}...`,
      ...options,
    }),

  // Number fields
  number: (key: string, label?: string, options?: NumberFieldOptions) => createField(key, 'number', autoLabel(key, label), options),

  range: (key: string, label?: string, options?: RangeFieldOptions) =>
    createField(key, 'range', autoLabel(key, label), {
      min: 0,
      max: 100,
      defaultValue: options?.min ?? 0,
      ...options,
    }),

  // Selection fields — choices go in options bag
  select: (key: string, label?: string, options?: SelectFieldOptions) =>
    createField(key, 'select', autoLabel(key, label), {
      placeholder: `Select ${(label || key).toLowerCase()}`,
      ...options,
    }),

  multiSelect: (key: string, label?: string, options?: MultiSelectFieldOptions) =>
    createField(key, 'multiselect', autoLabel(key, label), {
      defaultValue: [],
      placeholder: `Select ${(label || key).toLowerCase()}`,
      ...options,
    }),

  radio: (key: string, label?: string, options?: RadioFieldOptions) => createField(key, 'radio', autoLabel(key, label), options),

  // Boolean fields
  checkbox: (key: string, label?: string, options?: CheckboxFieldOptions) =>
    createField(key, 'checkbox', autoLabel(key, label), {
      defaultValue: false,
      ...options,
    }),

  toggle: (key: string, label?: string, options?: ToggleFieldOptions) =>
    createField(key, 'toggle', autoLabel(key, label), {
      defaultValue: false,
      ...options,
    }),

  // Date/time fields
  date: (key: string, label?: string, options?: DateFieldOptions) =>
    createField(key, 'date', autoLabel(key, label), {
      isRangeDate: options?.isRange,
      ...options,
    }),

  time: (key: string, label?: string, options?: TimeFieldOptions) => createField(key, 'time', autoLabel(key, label), options),

  datetime: (key: string, label?: string, options?: DatetimeFieldOptions) =>
    createField(key, 'datetime-local', autoLabel(key, label), options),

  // Other fields
  color: (key: string, label?: string, options?: ColorFieldOptions) => createField(key, 'color', autoLabel(key, label), options),

  file: (key: string, label?: string, options?: FileFieldOptions) =>
    createField(key, 'file', autoLabel(key, label), {
      accept: '*/*',
      ...options,
    }),

  hidden: (key: string, options?: HiddenFieldOptions) =>
    createField(key, 'hidden', '', {
      hidden: true,
      defaultValue: options?.defaultValue,
    }),
};

// ── Validation helpers ──────────────────────────────────────────────────────
// Return flat objects that spread into field options

export const validation = {
  required: (min?: number, max?: number) => ({
    required: true as const,
    minLength: min,
    maxLength: max,
  }),

  email: (required = true) => ({
    required,
    email: true as const,
  }),

  password: (minLength = 8, strongPassword = false) => ({
    required: true as const,
    minLength,
    pattern: strongPassword ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ : undefined,
  }),

  number: (min?: number, max?: number, required = true) => ({
    required,
    min,
    max,
  }),

  custom: (...validators: ValidatorFn[]) => ({
    customValidators: validators,
  }),
};

// ── Layout helpers ──────────────────────────────────────────────────────────

export const layout = {
  vertical: (options?: { gap?: 'sm' | 'md' | 'lg' }) => ({
    layout: 'vertical' as const,
    gap: options?.gap,
  }),
  horizontal: (options?: { gap?: 'sm' | 'md' | 'lg'; labelWidth?: 'sm' | 'md' | 'lg' | 'xl' }) => ({
    layout: 'horizontal' as const,
    gap: options?.gap,
    labelWidth: options?.labelWidth,
  }),
  grid: (columns = 2, options?: { gap?: 'sm' | 'md' | 'lg' }) => ({
    layout: 'grid' as const,
    gridColumns: columns,
    gap: options?.gap,
  }),
};

// ── Step helpers ────────────────────────────────────────────────────────────

export const step = {
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

  review: (name: string, label: string, description?: string): FormStep => ({
    name,
    label,
    description: description ?? 'Review your information before submitting',
    fields: [],
  }),
};

/** @deprecated Use createForm with steps instead */
export const createWizard = createForm;
