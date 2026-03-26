import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import { ConditionalLogic, FormFieldConfig } from './dynamic-form.types';

export class FormUtils {
  private static readonly validatorCache = new Map<string, ValidatorFn[]>();
  private static readonly groupCache = new Map<string, Map<string, readonly FormFieldConfig[]>>();

  private static readonly EMPTY_VALIDATORS: ValidatorFn[] = Object.freeze([]) as unknown as ValidatorFn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static readonly EMPTY_ARRAY: readonly any[] = Object.freeze([]);

  private static readonly MAX_VALIDATOR_CACHE_SIZE = 500;
  private static readonly MAX_GROUP_CACHE_SIZE = 100;

  private static readonly DEFAULT_VALUES: Readonly<Record<string, unknown>> = {
    number: 0,
    range: 0,
    checkbox: false,
    toggle: false,
    multiselect: [],
    date: null,
    'datetime-local': null,
    time: null,
  };

  private static readonly REQUIRES_CHOICES = new Set(['select', 'multiselect', 'radio']);

  /**
   * Creates Angular validators from a field config's flattened validation properties
   */
  static createValidators(field: FormFieldConfig): ValidatorFn[] {
    if (!field.required && !field.minLength && !field.maxLength && !field.min && field.max == null && !field.email && !field.pattern && !field.customValidators?.length) {
      return this.EMPTY_VALIDATORS;
    }

    const cacheKey = this.getValidationCacheKey(field);

    const cached = this.validatorCache.get(cacheKey);
    if (cached) return cached;

    if (this.validatorCache.size >= this.MAX_VALIDATOR_CACHE_SIZE) {
      this.validatorCache.clear();
    }

    const validators = this.buildValidators(field, true);
    this.validatorCache.set(cacheKey, validators);
    return validators;
  }

  /**
   * Creates validators with conditional required logic
   */
  static createValidatorsWithConditionalRequired(field: FormFieldConfig, isRequired: boolean): ValidatorFn[] {
    const hasBase = field.minLength || field.maxLength || field.min != null || field.max != null || field.email || field.pattern || field.customValidators?.length;

    if (!hasBase && !isRequired) return this.EMPTY_VALIDATORS;

    if (!hasBase) {
      return isRequired ? [Validators.required] : this.EMPTY_VALIDATORS;
    }

    const validators: ValidatorFn[] = [];

    if (isRequired) {
      validators.push(Validators.required);
    }

    const baseValidators = this.buildValidators(field, false);
    if (baseValidators.length > 0) {
      validators.push(...baseValidators);
    }

    return validators;
  }

  /**
   * Creates a FormGroup from field configurations
   */
  static createFormGroup(fields: readonly FormFieldConfig[]): FormGroup {
    const controls: Record<string, FormControl> = {};

    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];
      controls[field.key] = new FormControl(
        {
          value: field.defaultValue ?? this.getDefaultValueForType(field.type),
          disabled: field.disabled ?? false,
        },
        this.createValidators(field),
      );
    }

    return new FormGroup(controls);
  }

  /**
   * Optimized condition evaluation with early exits
   */
  static evaluateCondition(condition: ConditionalLogic, formValues: Record<string, unknown>, formGroup?: FormGroup): boolean {
    const fieldValue = formValues[condition.field];
    const conditionValue = condition.value;

    if (condition.operator === 'function') {
      if (typeof conditionValue !== 'function') return false;
      try {
        return conditionValue(fieldValue, formValues, formGroup);
      } catch {
        return false;
      }
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not-equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return typeof fieldValue === 'string' && typeof conditionValue === 'string' && fieldValue.includes(conditionValue);
      case 'greater-than':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' && fieldValue > conditionValue;
      case 'less-than':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' && fieldValue < conditionValue;
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not-in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Evaluates multiple conditions with AND logic
   */
  static evaluateConditions(conditions: readonly ConditionalLogic[], formValues: Record<string, unknown>, formGroup?: FormGroup): boolean {
    if (conditions.length === 0) return true;

    for (let i = 0, len = conditions.length; i < len; i++) {
      if (!this.evaluateCondition(conditions[i], formValues, formGroup)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Optimized field grouping with memoization
   */
  static groupFields(fields: readonly FormFieldConfig[]): Map<string, readonly FormFieldConfig[]> {
    if (fields.length === 0) {
      return new Map([['default', this.EMPTY_ARRAY as readonly FormFieldConfig[]]]);
    }

    const cacheKey = this.getFieldsCacheKey(fields);

    const cached = this.groupCache.get(cacheKey);
    if (cached) return cached;

    if (this.groupCache.size >= this.MAX_GROUP_CACHE_SIZE) {
      this.groupCache.clear();
    }

    const groups = new Map<string, FormFieldConfig[]>();

    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];
      const groupName = field.group || 'default';

      const group = groups.get(groupName);
      if (group) {
        group.push(field);
      } else {
        groups.set(groupName, [field]);
      }
    }

    const sortedGroups = new Map<string, readonly FormFieldConfig[]>();
    for (const [groupName, groupFields] of groups) {
      groupFields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      sortedGroups.set(groupName, groupFields);
    }

    this.groupCache.set(cacheKey, sortedGroups);
    return sortedGroups;
  }

  /**
   * Error message generation
   */
  static getErrorMessage(fieldConfig: FormFieldConfig, errors: Record<string, unknown> | null): string {
    if (!errors) return '';

    const label = fieldConfig.label || fieldConfig.key;
    const firstErrorKey = Object.keys(errors)[0];

    switch (firstErrorKey) {
      case 'required':
        return `${label} is required`;
      case 'minlength': {
        const err = errors['minlength'] as { requiredLength?: number };
        return `${label} must be at least ${fieldConfig.minLength ?? err?.requiredLength} characters`;
      }
      case 'maxlength': {
        const err = errors['maxlength'] as { requiredLength?: number };
        return `${label} cannot exceed ${fieldConfig.maxLength ?? err?.requiredLength} characters`;
      }
      case 'min': {
        const err = errors['min'] as { min?: number };
        return `${label} must be at least ${fieldConfig.min ?? err?.min}`;
      }
      case 'max': {
        const err = errors['max'] as { max?: number };
        return `${label} cannot exceed ${fieldConfig.max ?? err?.max}`;
      }
      case 'email':
        return `${label} must be a valid email address`;
      case 'pattern':
        return `${label} format is invalid`;
      default:
        return `${label} is invalid (${firstErrorKey})`;
    }
  }

  /**
   * Form configuration validation
   */
  static validateFormConfig(fields: readonly FormFieldConfig[]): string[] {
    const errors: string[] = [];
    const keys = new Set<string>();

    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];

      if (keys.has(field.key)) {
        errors.push(`Duplicate field key: ${field.key}`);
        continue;
      }
      keys.add(field.key);

      if (!field.type) {
        errors.push(`Field ${field.key} is missing type`);
      }

      if (this.REQUIRES_CHOICES.has(field.type) && !field.choices && !field.optionsFrom) {
        errors.push(`Field ${field.key} of type ${field.type} requires choices or optionsFrom`);
      }

      this.validateConditionalReferences(field, keys, errors);
    }

    return errors;
  }

  /**
   * Clears all caches
   */
  static clearCaches(): void {
    this.validatorCache.clear();
    this.groupCache.clear();
  }

  // Private methods

  private static buildValidators(field: FormFieldConfig, includeRequired: boolean): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (includeRequired && field.required) {
      validators.push(Validators.required);
    }
    if (field.minLength != null) {
      validators.push(Validators.minLength(field.minLength));
    }
    if (field.maxLength != null) {
      validators.push(Validators.maxLength(field.maxLength));
    }
    if (field.min != null) {
      validators.push(Validators.min(field.min));
    }
    if (field.max != null) {
      validators.push(Validators.max(field.max));
    }
    if (field.email) {
      validators.push(Validators.email);
    }
    if (field.pattern) {
      validators.push(Validators.pattern(field.pattern));
    }
    if (field.customValidators && field.customValidators.length > 0) {
      validators.push(...field.customValidators);
    }

    return validators;
  }

  private static getValidationCacheKey(field: FormFieldConfig): string {
    let flags = 0;
    if (field.required) flags |= 1;
    if (field.email) flags |= 2;

    const customLen = field.customValidators?.length ?? 0;
    const pattern = field.pattern?.toString() ?? '';

    return `${flags}|${field.minLength ?? ''}|${field.maxLength ?? ''}|${field.min ?? ''}|${field.max ?? ''}|${pattern}|${customLen}`;
  }

  private static getFieldsCacheKey(fields: readonly FormFieldConfig[]): string {
    const parts: string[] = [];
    for (let i = 0, len = fields.length; i < len; i++) {
      const f = fields[i];
      parts.push(`${f.key}:${f.group ?? 'd'}:${f.order ?? 0}`);
    }
    return parts.join('|');
  }

  private static getDefaultValueForType(type: string): unknown {
    return this.DEFAULT_VALUES[type] ?? '';
  }

  private static validateConditionalReferences(field: FormFieldConfig, keys: Set<string>, errors: string[]): void {
    const conditions = [field.showWhen, field.hideWhen, field.requiredWhen, field.disabledWhen];

    for (let i = 0; i < 4; i++) {
      const conditionArray = conditions[i];
      if (!conditionArray) continue;

      for (let j = 0, len = conditionArray.length; j < len; j++) {
        const condition = conditionArray[j];
        if (!keys.has(condition.field) && condition.field !== field.key) {
          errors.push(`Field ${field.key} references unknown field in condition: ${condition.field}`);
        }
      }
    }
  }
}
