import { CommonModule } from '@angular/common';
import { CdkStepperModule } from '@angular/cdk/stepper';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, from, isObservable, Observable, of, startWith, switchMap } from 'rxjs';

import { FormStateMetadata, FormStateService } from '../../services/form-state.service';
import { DatepickerComponent } from '../datepicker/datepicker.component';
import { EditorComponent } from '../editor/editor.component';
import { SelectComponent } from '../select/select.component';
import { StepperComponent } from '../stepper/stepper.component';
import {
  AutoSaveConfig,
  DYNAMIC_FORM_LABELS,
  DynamicFormLabels,
  FormConfig,
  FormFieldConfig,
  FormSelectOption,
  FormStep,
  FormSubmissionData,
  ResponsiveColSpan,
  StepChangeEvent,
} from './dynamic-form.types';
import { FormUtils } from './dynamic-form.utils';
import { TimepickerComponent } from '../timepicker/timepicker.component';

@Component({
  selector: 'hk-dynamic-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CdkStepperModule,
    SelectComponent,
    DatepickerComponent,
    EditorComponent,
    StepperComponent,
    TimepickerComponent,
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly elementRef = inject(ElementRef);
  private readonly injectedLabels = inject<DynamicFormLabels | null>(DYNAMIC_FORM_LABELS, { optional: true });

  /** Resolved form-wide text with defaults. Use `formLabels().x` in the template. */
  readonly formLabels = computed<Required<DynamicFormLabels>>(() => ({
    previousButton: this.injectedLabels?.previousButton ?? 'Previous',
    nextButton: this.injectedLabels?.nextButton ?? 'Next',
    completeButton: this.injectedLabels?.completeButton ?? 'Submit',
    editorPlaceholder: this.injectedLabels?.editorPlaceholder ?? 'Write something...',
    loadingOptionsPlaceholder: this.injectedLabels?.loadingOptionsPlaceholder ?? 'Loading options...',
  }));
  private readonly formStateService = inject(FormStateService);

  // Inputs
  readonly config = input.required<FormConfig>();
  readonly initialValues = input<Record<string, unknown>>({});
  readonly disabled = input<boolean>(false);

  // Outputs
  readonly formSubmit = output<FormSubmissionData>();
  readonly formChange = output<Record<string, unknown>>();
  readonly formReset = output<void>();
  readonly fieldChange = output<{ field: string; value: unknown; formValues: Record<string, unknown> }>();
  readonly formRestored = output<Record<string, unknown>>();
  readonly stepChange = output<StepChangeEvent>();

  // Stepper signals
  readonly currentStepIndex = signal<number>(0);
  readonly completedSteps = signal<Set<string>>(new Set());

  // Stepper computed signals
  readonly isStepperMode = computed(() => !!this.config().steps?.length);

  readonly currentStep = computed((): FormStep | null => {
    const steps = this.config().steps;
    return steps?.[this.currentStepIndex()] ?? null;
  });

  readonly currentStepFields = computed((): readonly FormFieldConfig[] => {
    return this.currentStep()?.fields ?? [];
  });

  readonly isCurrentStepValid = computed(() => {
    const stepFields = this.currentStepFields();
    const form = this.formGroup();
    // Depend on formValues to trigger re-computation when form changes
    this.formValues();
    return stepFields.every((field) => {
      const control = form.get(field.key);
      return !control || control.valid;
    });
  });

  /** Check if a specific step's fields are all valid */
  isStepValid(stepIndex: number): boolean {
    const steps = this.config().steps;
    if (!steps || !steps[stepIndex]) return true;

    const stepFields = steps[stepIndex].fields;
    const form = this.formGroup();

    // Empty steps (like review) are always valid
    if (stepFields.length === 0) return true;

    return stepFields.every((field) => {
      const control = form.get(field.key);
      return !control || control.valid;
    });
  }

  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);

  readonly isLastStep = computed(() => {
    const steps = this.config().steps;
    return steps ? this.currentStepIndex() === steps.length - 1 : true;
  });

  /**
   * Form values enriched with step context for conditional logic.
   * Available properties:
   * - `__stepIndex`: Current step index (0-based)
   * - `__stepName`: Current step name
   * - `__isFirstStep`: Whether on first step
   * - `__isLastStep`: Whether on last step
   * - `__completedSteps`: Array of completed step names
   */
  readonly formValuesWithContext = computed(() => {
    const values = this.formValues();
    if (!this.isStepperMode()) return values;

    return {
      ...values,
      __stepIndex: this.currentStepIndex(),
      __stepName: this.currentStep()?.name ?? null,
      __isFirstStep: this.isFirstStep(),
      __isLastStep: this.isLastStep(),
      __completedSteps: [...this.completedSteps()],
    };
  });

  // Form summary for review step
  readonly formSummary = computed(() => {
    const steps = this.config().steps;
    if (!steps) return [];

    return steps.map((step) => ({
      stepName: step.name,
      stepLabel: step.label,
      fields: step.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: this.formGroup().get(field.key)?.value,
        displayValue: this.getDisplayValue(field),
      })),
    }));
  });

  // Internal signals
  readonly formGroup = signal<FormGroup>(new FormGroup({}));
  readonly formValues = signal<Record<string, unknown>>({});
  readonly fieldOptions = signal<Map<string, FormSelectOption[]>>(new Map());
  /** Tracks which fields are currently loading dependent options */
  readonly fieldOptionsLoading = signal<Set<string>>(new Set());

  // Auto-save signals
  private readonly autoSaveFormId = signal<string | null>(null);
  private readonly pendingSave = signal<{ formId: string; values: Record<string, unknown>; metadata?: FormStateMetadata } | null>(null);
  private readonly restorationComplete = signal<boolean>(false);
  // Track the step index to restore (used to sync with stepper after render)
  private readonly pendingStepRestore = signal<number | null>(null);

  // Stepper reference for programmatic control
  private readonly stepperRef = viewChild<StepperComponent>('stepper');

  // rxResource for LOADING saved form state
  readonly savedStateResource = rxResource({
    params: () => this.autoSaveFormId(),
    stream: ({ params: formId }) => {
      if (!formId || !this.formStateService.isConfigured) {
        return of(null);
      }
      const storageMode = this.getAutoSaveConfig()?.storage;
      return this.formStateService.load(formId, storageMode).pipe(catchError(() => of(null)));
    },
  });

  // rxResource for SAVING form state (debounced)
  readonly saveResource = rxResource({
    params: () => this.pendingSave(),
    stream: ({ params: pending }) => {
      if (!pending || !this.formStateService.isConfigured) {
        return of(null);
      }
      const autoSaveConfig = this.getAutoSaveConfig();
      const storageMode = autoSaveConfig?.storage;
      return of(pending).pipe(
        debounceTime(autoSaveConfig?.debounceMs ?? 1000),
        switchMap(({ formId, values, metadata }) => this.formStateService.save(formId, values, metadata, storageMode)),
        catchError(() => {
          return of(null);
        }),
      );
    },
  });

  // Computed status from rxResource
  readonly autoSaveStatus = computed(() => {
    if (this.saveResource.isLoading()) return 'saving' as const;
    if (this.saveResource.error()) return 'error' as const;
    if (this.saveResource.hasValue() && this.pendingSave()) return 'saved' as const;
    return 'idle' as const;
  });

  // Whether saved state exists and was loaded
  readonly hasSavedState = computed(() => {
    return this.savedStateResource.hasValue() && this.savedStateResource.value() !== null;
  });

  // Optimized field visibility tracking without signal updates in computed
  private visibilityCache = new Map<string, boolean>();
  private lastFormValuesHash = '';

  // Computed signals with optimized calculations
  readonly visibleFields = computed(() => {
    const fields = this.config().fields ?? [];
    // Use context-enriched values for conditional logic (includes step info)
    const values = this.formValuesWithContext();
    const currentHash = this.getFormValuesHash(values);

    // Clear cache when form values change
    if (this.lastFormValuesHash !== currentHash) {
      this.visibilityCache.clear();
      this.lastFormValuesHash = currentHash;
    }

    const visibleFields: FormFieldConfig[] = [];

    for (const field of fields) {
      const cacheKey = `${field.key}-${currentHash}`;
      let isVisible = this.visibilityCache.get(cacheKey);

      if (isVisible === undefined) {
        isVisible = this.shouldShowField(field, values);
        this.visibilityCache.set(cacheKey, isVisible);
      }

      if (isVisible) {
        visibleFields.push(field);
      }
    }

    return visibleFields;
  });

  readonly groupedFields = computed(() => {
    return FormUtils.groupFields(this.visibleFields());
  });

  readonly formClasses = computed(() => {
    const config = this.config();
    const layout = config.layout === 'horizontal' ? 'form-horizontal' : 'form-vertical';
    const disabled = this.disabled() ? 'form-disabled' : '';

    return `dynamic-form space-y-6 ${layout} ${disabled}`.trim();
  });

  readonly isSubmitDisabled = computed(() => {
    return this.disabled() || this.formGroup().invalid;
  });

  readonly layoutClasses = computed(() => {
    const config = this.config();
    const layout = config.layout || 'vertical';
    const gapClass = this.getGapClass(config.gap);

    if (layout === 'grid') {
      const columns = config.gridColumns || 2;
      return `grid ${gapClass} ${this.getGridColumns(columns)}`;
    }

    if (layout === 'horizontal') {
      // Horizontal layout uses flex with wrapping for field widths
      return `flex flex-wrap ${gapClass}`;
    }

    // Vertical layout
    return `flex flex-col ${gapClass}`;
  });

  readonly isHorizontalLayout = computed(() => this.config().layout === 'horizontal');

  readonly labelWidthClass = computed(() => {
    const width = this.config().labelWidth || 'md';
    return DynamicFormComponent.LABEL_WIDTH_CLASSES.get(width) || 'w-1/4';
  });

  constructor() {
    this.setupFormReactivity();
    this.setupExternalTriggers();
    this.setupFocusOnLoad();
  }

  /** Focus on field with focusOnLoad: true after the form renders */
  private setupFocusOnLoad(): void {
    afterNextRender(
      () => {
        const config = this.config();
        const allFields = config.steps ? config.steps.flatMap((step) => [...step.fields]) : (config.fields ?? []);
        const focusField = allFields.find((f) => f.focusOnLoad);

        if (focusField) {
          this.focusField(focusField.id);
        }
      },
      { injector: this.injector },
    );
  }

  /** Focus on a specific field by its id */
  private focusField(fieldId: string): void {
    const formElement = this.elementRef.nativeElement as HTMLElement;
    // Use attribute selector since IDs starting with numbers break #id selectors
    const input = formElement.querySelector<HTMLElement>(`[id="${fieldId}"]`);
    input?.focus();
  }

  /** Watch for external submit/reset triggers from FormController */
  private setupExternalTriggers(): void {
    let lastSubmitTrigger = 0;
    let lastResetTrigger = 0;

    // Watch submit trigger — use untracked to prevent onSubmit's signal reads
    // from becoming dependencies of this effect
    effect(
      () => {
        const trigger = this.config()._submitTrigger?.() ?? 0;
        if (trigger > lastSubmitTrigger) {
          lastSubmitTrigger = trigger;
          untracked(() => this.onSubmit());
        } else {
          lastSubmitTrigger = trigger;
        }
      },
      { injector: this.injector },
    );

    // Watch reset trigger
    effect(
      () => {
        const trigger = this.config()._resetTrigger?.() ?? 0;
        if (trigger > lastResetTrigger) {
          lastResetTrigger = trigger;
          untracked(() => this.onReset());
        } else {
          lastResetTrigger = trigger;
        }
      },
      { injector: this.injector },
    );
  }

  // Public methods
  onSubmit(): void {
    const form = this.formGroup();
    form.markAllAsTouched();

    const submissionData: FormSubmissionData = {
      values: form.value,
      valid: form.valid,
      errors: form.valid ? {} : this.getAllErrors(),
      // Include stepper info if in stepper mode
      completedSteps: this.isStepperMode() ? [...this.completedSteps()] : undefined,
      currentStep: this.currentStep()?.name,
    };

    this.formSubmit.emit(submissionData);

    // Call config callback if provided
    this.config().onSubmit?.(submissionData);

    // Clear saved state on successful submit if configured
    const autoSaveConfig = this.getAutoSaveConfig();
    if (submissionData.valid && autoSaveConfig?.clearOnSubmit !== false) {
      const formId = this.autoSaveFormId();
      if (formId && this.formStateService.isConfigured) {
        this.formStateService.clear(formId, autoSaveConfig?.storage).subscribe();
        this.pendingSave.set(null);
      }
    }
  }

  onReset(): void {
    this.formGroup().reset();
    this.initializeFormValues();
    // Reset stepper state
    if (this.isStepperMode()) {
      this.currentStepIndex.set(0);
      this.completedSteps.set(new Set());
    }

    this.formReset.emit();

    // Call config callback if provided
    this.config().onReset?.();
  }

  // Stepper navigation methods
  nextStep(): void {
    const config = this.config();
    if (!config.steps) return;

    // Validate current step if required
    if (config.stepperConfig?.validateStepOnNext) {
      this.validateCurrentStep();
      if (!this.isCurrentStepValid()) return;
    }

    // Mark current step as completed
    const currentStep = this.currentStep();
    if (currentStep) {
      this.completedSteps.update((set) => new Set([...set, currentStep.name]));
    }

    // Move to next step
    const nextIndex = this.currentStepIndex() + 1;
    if (nextIndex < config.steps.length) {
      const previousStep = this.currentStep()?.name ?? null;
      this.currentStepIndex.set(nextIndex);
      this.emitStepChange(previousStep);
    }
  }

  previousStep(): void {
    const prevIndex = this.currentStepIndex() - 1;
    if (prevIndex >= 0) {
      const previousStep = this.currentStep()?.name ?? null;
      this.currentStepIndex.set(prevIndex);
      this.emitStepChange(previousStep);
    }
  }

  goToStep(index: number): void {
    const config = this.config();
    if (!config.steps) return;

    const stepperConfig = config.stepperConfig;

    // In linear mode, can only go to completed steps or current step
    if (stepperConfig?.linear) {
      const targetStepName = config.steps[index]?.name;
      const isCompleted = this.completedSteps().has(targetStepName);
      const isCurrent = index === this.currentStepIndex();
      const isPrevious = index < this.currentStepIndex();

      if (!isCompleted && !isCurrent && !isPrevious) {
        return;
      }
    }

    if (index >= 0 && index < config.steps.length) {
      const previousStep = this.currentStep()?.name ?? null;
      this.currentStepIndex.set(index);
      this.emitStepChange(previousStep);
    }
  }

  canNavigateToStep(index: number): boolean {
    const config = this.config();
    if (!config.steps) return false;

    const stepperConfig = config.stepperConfig;

    // Non-linear mode allows navigation to any step
    if (!stepperConfig?.linear) return true;

    // In linear mode, can navigate to completed steps, current, or previous
    const targetStepName = config.steps[index]?.name;
    const isCompleted = this.completedSteps().has(targetStepName);
    const isCurrent = index === this.currentStepIndex();
    const isPrevious = index < this.currentStepIndex();

    return isCompleted || isCurrent || isPrevious;
  }

  private validateCurrentStep(): void {
    const stepFields = this.currentStepFields();
    const form = this.formGroup();
    stepFields.forEach((field) => {
      form.get(field.key)?.markAsTouched();
    });
  }

  private emitStepChange(previousStep: string | null): void {
    const currentStep = this.currentStep();
    if (currentStep) {
      this.stepChange.emit({
        previousStep,
        currentStep: currentStep.name,
        stepIndex: this.currentStepIndex(),
        formValues: this.formGroup().value,
      });
    }
  }

  /** Handle step changes from the StepperComponent */
  onStepperStepChange(event: { previousIndex: number; currentIndex: number }): void {
    const steps = this.config().steps;
    if (!steps) return;

    // Mark previous step as completed if moving forward
    if (event.currentIndex > event.previousIndex) {
      const prevStepName = steps[event.previousIndex]?.name;
      if (prevStepName) {
        this.completedSteps.update((set) => new Set([...set, prevStepName]));
      }
    }

    // Update current step index
    this.currentStepIndex.set(event.currentIndex);

    const previousStepName = steps[event.previousIndex]?.name ?? null;
    this.emitStepChange(previousStepName);
  }

  // Helper to format display values for review step
  private getDisplayValue(field: FormFieldConfig): string {
    const value = this.formGroup().get(field.key)?.value;
    if (value === null || value === undefined || value === '') return '—';

    // For select fields, show label instead of value
    if ((field.type === 'select' || field.type === 'radio') && Array.isArray(field.choices)) {
      const option = (field.choices as FormSelectOption[]).find((o) => o.value === value);
      return option?.label ?? String(value);
    }

    // Format booleans
    if (field.type === 'checkbox' || field.type === 'toggle') {
      return value ? 'Yes' : 'No';
    }

    // Format dates
    if (field.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }

    return String(value);
  }

  // Field helper methods
  shouldShowField(field: FormFieldConfig, values?: Record<string, unknown>): boolean {
    if (field.hidden) return false;

    // Use context-enriched values for conditional logic (includes step info)
    const currentValues = values || this.formValuesWithContext();
    const form = this.formGroup();

    // Check hideWhen conditions first (early exit)
    if (field.hideWhen?.length && FormUtils.evaluateConditions(field.hideWhen, currentValues, form)) {
      return false;
    }

    // Check showWhen conditions
    if (field.showWhen?.length) {
      return FormUtils.evaluateConditions(field.showWhen, currentValues, form);
    }

    return true;
  }

  shouldShowLabel(field: FormFieldConfig): boolean {
    const hiddenLabelTypes = new Set(['checkbox', 'toggle', 'hidden']);
    return !hiddenLabelTypes.has(field.type);
  }

  isFieldRequired(field: FormFieldConfig): boolean {
    // Use context-enriched values for conditional logic (includes step info)
    const values = this.formValuesWithContext();
    const form = this.formGroup();

    // Check base validation first
    if (field.required) return true;

    // Check conditional requirements
    return field.requiredWhen?.length ? FormUtils.evaluateConditions(field.requiredWhen, values, form) : false;
  }

  getFieldValue(fieldKey: string): unknown {
    return this.formGroup().get(fieldKey)?.value;
  }

  getFieldErrors(fieldKey: string): string[] {
    const control = this.formGroup().get(fieldKey);
    const config = this.config();
    const allFields = config.steps ? config.steps.flatMap((step) => [...step.fields]) : (config.fields ?? []);
    const field = allFields.find((f) => f.key === fieldKey);

    if (!control?.errors || !control.touched || !field) {
      return [];
    }

    return [FormUtils.getErrorMessage(field, control.errors)];
  }

  getFieldOptions(field: FormFieldConfig): FormSelectOption[] {
    // Dynamic options from optionsFrom take precedence
    const dynamicOptions = this.fieldOptions().get(field.key);
    if (field.optionsFrom) {
      return dynamicOptions || [];
    }

    if (Array.isArray(field.choices)) {
      return field.choices as FormSelectOption[];
    }

    return dynamicOptions || [];
  }

  /** Whether a field's dependent options are currently loading */
  isFieldOptionsLoading(field: FormFieldConfig): boolean {
    return this.fieldOptionsLoading().has(field.key);
  }

  getFieldContainerClasses(field: FormFieldConfig): string {
    const layout = this.config().layout || 'vertical';
    const classes: string[] = [];

    if (layout === 'grid') {
      // Grid layout: use colSpan
      classes.push(this.getColSpanClasses(field.colSpan));
    } else if (layout === 'horizontal' || layout === 'vertical') {
      // Flex layouts: use width property
      const widthClass = field.width ? DynamicFormComponent.FIELD_WIDTH_CLASSES.get(field.width) || 'w-full' : 'w-full';
      classes.push(widthClass);
    }

    if (field.containerClass) {
      classes.push(field.containerClass);
    }

    return classes.filter(Boolean).join(' ');
  }

  /** Get colSpan classes for grid layout (supports responsive values) */
  private getColSpanClasses(colSpan?: number | ResponsiveColSpan): string {
    if (!colSpan) return 'col-span-full';

    if (typeof colSpan === 'number') {
      return DynamicFormComponent.COL_SPAN_CLASSES.get(colSpan) || 'col-span-full';
    }

    // Responsive colSpan object
    const classes: string[] = [];

    // Default/base span
    if (colSpan.default) {
      classes.push(DynamicFormComponent.COL_SPAN_CLASSES.get(colSpan.default) || '');
    }

    // Responsive breakpoints
    const breakpoints: (keyof ResponsiveColSpan)[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    for (const bp of breakpoints) {
      const span = colSpan[bp];
      if (span) {
        const bpClasses = DynamicFormComponent.RESPONSIVE_COL_SPAN_CLASSES.get(bp);
        if (bpClasses) {
          classes.push(bpClasses.get(span) || '');
        }
      }
    }

    return classes.filter(Boolean).join(' ') || 'col-span-full';
  }

  /** Get gap class from config */
  private getGapClass(gap?: 'sm' | 'md' | 'lg'): string {
    return DynamicFormComponent.GAP_CLASSES.get(gap || 'lg') || 'gap-6';
  }

  getInputClasses(field: FormFieldConfig, inputType?: string): string {
    const control = this.formGroup().get(field.key);
    const hasError = control?.errors && control?.touched;

    const classes = [
      this.getBaseInputClasses(inputType),
      hasError ? 'input-error' : '',
      field.prefix ? 'pl-10' : '',
      field.suffix ? 'pr-10' : '',
    ];

    return classes.filter(Boolean).join(' ');
  }

  // Static input type classes for better performance
  private static readonly INPUT_TYPE_CLASSES = new Map<string, string>([
    ['range', 'range range-primary w-full'],
    ['file', 'file-input file-input-primary w-full'],
    ['select', 'select w-full'],
    ['textarea', 'textarea w-full'],
  ]);

  // Static colSpan classes for Tailwind JIT compatibility
  private static readonly COL_SPAN_CLASSES = new Map<number, string>([
    [1, 'col-span-1'],
    [2, 'col-span-2'],
    [3, 'col-span-3'],
    [4, 'col-span-4'],
    [5, 'col-span-5'],
    [6, 'col-span-6'],
    [7, 'col-span-7'],
    [8, 'col-span-8'],
    [9, 'col-span-9'],
    [10, 'col-span-10'],
    [11, 'col-span-11'],
    [12, 'col-span-12'],
  ]);

  // Responsive colSpan prefix classes
  private static readonly RESPONSIVE_COL_SPAN_CLASSES = new Map<string, Map<number, string>>([
    [
      'sm',
      new Map([
        [1, 'sm:col-span-1'],
        [2, 'sm:col-span-2'],
        [3, 'sm:col-span-3'],
        [4, 'sm:col-span-4'],
        [5, 'sm:col-span-5'],
        [6, 'sm:col-span-6'],
        [7, 'sm:col-span-7'],
        [8, 'sm:col-span-8'],
        [9, 'sm:col-span-9'],
        [10, 'sm:col-span-10'],
        [11, 'sm:col-span-11'],
        [12, 'sm:col-span-12'],
      ]),
    ],
    [
      'md',
      new Map([
        [1, 'md:col-span-1'],
        [2, 'md:col-span-2'],
        [3, 'md:col-span-3'],
        [4, 'md:col-span-4'],
        [5, 'md:col-span-5'],
        [6, 'md:col-span-6'],
        [7, 'md:col-span-7'],
        [8, 'md:col-span-8'],
        [9, 'md:col-span-9'],
        [10, 'md:col-span-10'],
        [11, 'md:col-span-11'],
        [12, 'md:col-span-12'],
      ]),
    ],
    [
      'lg',
      new Map([
        [1, 'lg:col-span-1'],
        [2, 'lg:col-span-2'],
        [3, 'lg:col-span-3'],
        [4, 'lg:col-span-4'],
        [5, 'lg:col-span-5'],
        [6, 'lg:col-span-6'],
        [7, 'lg:col-span-7'],
        [8, 'lg:col-span-8'],
        [9, 'lg:col-span-9'],
        [10, 'lg:col-span-10'],
        [11, 'lg:col-span-11'],
        [12, 'lg:col-span-12'],
      ]),
    ],
    [
      'xl',
      new Map([
        [1, 'xl:col-span-1'],
        [2, 'xl:col-span-2'],
        [3, 'xl:col-span-3'],
        [4, 'xl:col-span-4'],
        [5, 'xl:col-span-5'],
        [6, 'xl:col-span-6'],
        [7, 'xl:col-span-7'],
        [8, 'xl:col-span-8'],
        [9, 'xl:col-span-9'],
        [10, 'xl:col-span-10'],
        [11, 'xl:col-span-11'],
        [12, 'xl:col-span-12'],
      ]),
    ],
    [
      '2xl',
      new Map([
        [1, '2xl:col-span-1'],
        [2, '2xl:col-span-2'],
        [3, '2xl:col-span-3'],
        [4, '2xl:col-span-4'],
        [5, '2xl:col-span-5'],
        [6, '2xl:col-span-6'],
        [7, '2xl:col-span-7'],
        [8, '2xl:col-span-8'],
        [9, '2xl:col-span-9'],
        [10, '2xl:col-span-10'],
        [11, '2xl:col-span-11'],
        [12, '2xl:col-span-12'],
      ]),
    ],
  ]);

  // Field width classes for non-grid layouts
  private static readonly FIELD_WIDTH_CLASSES = new Map<string, string>([
    ['full', 'w-full'],
    ['1/2', 'w-full md:w-[calc(50%-0.75rem)]'],
    ['1/3', 'w-full md:w-[calc(33.333%-0.75rem)]'],
    ['1/4', 'w-full md:w-[calc(25%-0.75rem)]'],
    ['2/3', 'w-full md:w-[calc(66.666%-0.75rem)]'],
    ['3/4', 'w-full md:w-[calc(75%-0.75rem)]'],
    ['auto', 'w-auto flex-shrink-0'],
  ]);

  // Gap classes
  private static readonly GAP_CLASSES = new Map<string, string>([
    ['sm', 'gap-2'],
    ['md', 'gap-4'],
    ['lg', 'gap-6'],
  ]);

  // Label width classes for horizontal layout
  private static readonly LABEL_WIDTH_CLASSES = new Map<string, string>([
    ['sm', 'w-1/6'],
    ['md', 'w-1/4'],
    ['lg', 'w-1/3'],
    ['xl', 'w-2/5'],
  ]);

  getBaseInputClasses(inputType?: string): string {
    return inputType ? DynamicFormComponent.INPUT_TYPE_CLASSES.get(inputType) || 'input w-full' : 'input w-full';
  }

  // Static grid classes cache for better performance
  private static readonly GRID_CLASSES = new Map<number, string>([
    [1, 'grid-cols-1'],
    [2, 'grid-cols-1 md:grid-cols-2'],
    [3, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'],
    [4, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'],
    [5, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'],
    [6, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'],
    [7, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'],
    [8, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8'],
    [9, 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9'],
    [10, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10'],
    [11, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-11'],
    [12, 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12'],
  ]);

  private getGridColumns(columns: number): string {
    return DynamicFormComponent.GRID_CLASSES.get(columns) || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  }

  // Private helper methods
  private getFormValuesHash(values: Record<string, unknown>): string {
    const keys = Object.keys(values).sort();
    let hash = '';
    for (const key of keys) {
      const value = values[key];
      hash += `${key}:${value === null || value === undefined ? 'null' : String(value)};`;
    }
    return hash;
  }

  // Private methods
  private setupFormReactivity(): void {
    effect(() => {
      const config = this.config();
      // Support both fields and steps mode
      const hasFields = (config?.fields?.length ?? 0) > 0;
      const hasSteps = (config?.steps?.length ?? 0) > 0;
      if (hasFields || hasSteps) {
        untracked(() => this.initializeForm(config));
      }
    });

    effect(() => {
      const autoSaveConfig = this.getAutoSaveConfig();
      this.autoSaveFormId.set(autoSaveConfig?.enabled && autoSaveConfig.formId ? autoSaveConfig.formId : null);
    });

    // Restore form when saved state is loaded
    effect(() => {
      // Wait for loading to complete
      if (this.savedStateResource.isLoading()) {
        return;
      }

      const savedState = this.savedStateResource.value();
      untracked(() => {
        if (savedState?.values && Object.keys(savedState.values).length > 0) {
          this.formGroup().patchValue(savedState.values, { emitEvent: false });

          // Restore stepper state from metadata if in stepper mode
          const metadata = savedState.metadata;
          if (metadata && this.isStepperMode()) {
            if (typeof metadata.currentStep === 'number' && metadata.currentStep > 0) {
              this.currentStepIndex.set(metadata.currentStep);
              // Store pending step to restore after stepper renders
              this.pendingStepRestore.set(metadata.currentStep);
            }
            if (Array.isArray(metadata.completedSteps)) {
              this.completedSteps.set(new Set(metadata.completedSteps));
            }
          }

          this.formRestored.emit(savedState.values);
        }

        // Mark restoration as complete (even if no saved state found)
        this.restorationComplete.set(true);
      });
    });

    // Apply pending step restore after stepper is rendered
    effect(() => {
      const pendingStep = this.pendingStepRestore();
      if (pendingStep === null) return;

      // Use afterNextRender to ensure the stepper is rendered
      afterNextRender(
        () => {
          const stepper = this.stepperRef();
          if (stepper && pendingStep !== null) {
            stepper.selectedIndex = pendingStep;
            this.pendingStepRestore.set(null);
          }
        },
        { injector: this.injector },
      );
    });

    // Update form values and disabled state when inputs change
    effect(() => {
      const form = this.formGroup();
      const initialValues = this.initialValues();
      const isDisabled = this.disabled();

      if (Object.keys(initialValues).length > 0) {
        form.patchValue(initialValues);
      }

      if (isDisabled && form.enabled) {
        form.disable();
      } else if (!isDisabled && form.disabled) {
        form.enable();
      }
    });

    // Auto-save when stepper state changes (step navigation)
    effect(() => {
      // Track step changes
      const currentStep = this.currentStepIndex();
      const completedSteps = this.completedSteps();

      // Don't save until restoration is complete (prevents overwriting saved state on init)
      if (!this.restorationComplete()) {
        return;
      }

      // Only save if auto-save is enabled and we're in stepper mode
      const autoSaveConfig = this.getAutoSaveConfig();
      const formId = this.autoSaveFormId();
      if (autoSaveConfig?.enabled && formId && this.isStepperMode() && this.formStateService.isConfigured) {
        this.pendingSave.set({
          formId,
          values: this.formGroup().value,
          metadata: {
            currentStep,
            completedSteps: [...completedSteps],
          },
        });
      }
    });
  }

  /** Get normalized auto-save config */
  private getAutoSaveConfig(): AutoSaveConfig | null {
    const config = this.config();
    if (!config.autoSave) return null;

    // Handle boolean shorthand (legacy support)
    if (typeof config.autoSave === 'boolean') {
      return null; // Boolean alone is not enough - need formId
    }

    return config.autoSave;
  }

  private initializeForm(config: FormConfig): void {
    // Collect all fields (from steps or direct fields)
    const allFields = config.steps ? config.steps.flatMap((step) => [...step.fields]) : (config.fields ?? []);

    const form = FormUtils.createFormGroup(allFields);
    this.formGroup.set(form);
    this.initializeFormValues();

    // Reset stepper state when config changes, but only if we're not expecting a restoration
    // (auto-save is not enabled or restoration already completed with no saved data)
    const autoSaveConfig = this.getAutoSaveConfig();
    const shouldResetStepper = config.steps && (!autoSaveConfig?.enabled || (this.restorationComplete() && !this.hasSavedState()));

    if (shouldResetStepper) {
      this.currentStepIndex.set(0);
      this.completedSteps.set(new Set());
    }

    this.setupFormSubscriptions(config);
  }

  private initializeFormValues(): void {
    this.formValues.set(this.formGroup().value);
  }

  private setupFormSubscriptions(config: FormConfig): void {
    const form = this.formGroup();
    const debounceMs = config.autoSave ? 300 : 100;
    let lastFormHash = '';

    // Optimized form value changes subscription with hash comparison
    form.valueChanges
      .pipe(
        startWith(form.value),
        debounceTime(debounceMs),
        distinctUntilChanged((_prev, curr) => {
          const currentHash = this.getFormValuesHash(curr);
          if (lastFormHash === currentHash) return true;
          lastFormHash = currentHash;
          return false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((values) => {
        this.formValues.set(values);

        this.formChange.emit(values);

        // Call config callback if provided
        this.config().onChange?.(values);

        this.updateConditionalValidation(values);

        // Trigger auto-save if enabled (only after restoration is complete)
        const autoSaveConfig = this.getAutoSaveConfig();
        const formId = this.autoSaveFormId();
        if (autoSaveConfig?.enabled && formId && this.formStateService.isConfigured && this.restorationComplete()) {
          this.pendingSave.set({
            formId,
            values,
            // Include stepper state in metadata for restoration
            metadata: this.isStepperMode()
              ? {
                  currentStep: this.currentStepIndex(),
                  completedSteps: [...this.completedSteps()],
                }
              : undefined,
          });
        }
      });

    // Get all fields (from steps or direct)
    const allFields = config.steps ? config.steps.flatMap((step) => [...step.fields]) : (config.fields ?? []);

    // Setup subscriptions for fields with conditions only
    this.setupFieldChangeSubscriptions(allFields, form);

    // Load async options
    this.loadAsyncOptions(allFields);

    // Setup dependent options (optionsFrom)
    this.setupDependentOptions(allFields, form);
  }

  private setupFieldChangeSubscriptions(fields: readonly FormFieldConfig[], form: FormGroup): void {
    const fieldsWithConditions = fields.filter(
      (field) => field.requiredWhen?.length || field.disabledWhen?.length || field.showWhen?.length || field.hideWhen?.length,
    );

    if (fieldsWithConditions.length === 0) return;

    for (const fieldConfig of fieldsWithConditions) {
      const control = form.get(fieldConfig.key);
      if (control) {
        control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
          this.fieldChange.emit({
            field: fieldConfig.key,
            value,
            formValues: form.value,
          });
        });
      }
    }
  }

  private updateConditionalValidation(formValues: Record<string, unknown>): void {
    const form = this.formGroup();
    const config = this.config();
    const fields = config.steps ? config.steps.flatMap((step) => [...step.fields]) : (config.fields ?? []);

    // Pre-filter fields that need conditional validation
    const fieldsWithConditionalValidation = fields.filter((field) => field.requiredWhen?.length || field.disabledWhen?.length);
    if (fieldsWithConditionalValidation.length === 0) return;

    // Enrich form values with step context for conditional logic
    const valuesWithContext = this.isStepperMode()
      ? {
          ...formValues,
          __stepIndex: this.currentStepIndex(),
          __stepName: this.currentStep()?.name ?? null,
          __isFirstStep: this.isFirstStep(),
          __isLastStep: this.isLastStep(),
          __completedSteps: [...this.completedSteps()],
        }
      : formValues;

    // Batch validation and state updates
    const validationUpdates: { control: AbstractControl; validators: ValidatorFn[] }[] = [];
    const stateUpdates: { control: AbstractControl; shouldDisable: boolean }[] = [];

    for (const field of fieldsWithConditionalValidation) {
      const control = form.get(field.key);
      if (!control) continue;

      // Handle conditional required validation
      if (field.requiredWhen?.length) {
        const shouldBeRequired = FormUtils.evaluateConditions(field.requiredWhen, valuesWithContext, form);
        const newValidators = FormUtils.createValidatorsWithConditionalRequired(field, shouldBeRequired);
        validationUpdates.push({ control, validators: newValidators });
      }

      // Handle conditional disabled state
      if (field.disabledWhen?.length) {
        const shouldBeDisabled = FormUtils.evaluateConditions(field.disabledWhen, valuesWithContext, form);
        if (shouldBeDisabled !== control.disabled) {
          stateUpdates.push({ control, shouldDisable: shouldBeDisabled });
        }
      }
    }

    // Apply all state updates first
    stateUpdates.forEach(({ control, shouldDisable }) => {
      if (shouldDisable) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });

    // Apply all validation updates
    validationUpdates.forEach(({ control, validators }) => {
      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private setupDependentOptions(fields: readonly FormFieldConfig[], form: FormGroup): void {
    const dependentFields = fields.filter((f) => f.optionsFrom);
    if (dependentFields.length === 0) return;

    for (const fieldConfig of dependentFields) {
      const config = fieldConfig.optionsFrom!;
      const watchedControl = form.get(config.field);
      const targetControl = form.get(fieldConfig.key);
      if (!watchedControl) continue;

      const clearOnChange = config.clearOnChange !== false;

      watchedControl.valueChanges
        .pipe(
          startWith(watchedControl.value),
          distinctUntilChanged(),
          switchMap((watchedValue) => {
            // Skip loading when watched value is empty/null
            if (watchedValue === null || watchedValue === undefined || watchedValue === '') {
              // Clear options and value
              this.fieldOptions.update((map) => {
                const newMap = new Map(map);
                newMap.set(fieldConfig.key, []);
                return newMap;
              });
              if (clearOnChange && targetControl) {
                targetControl.setValue(null, { emitEvent: false });
              }
              return of([]);
            }

            // Set loading state
            this.fieldOptionsLoading.update((set) => new Set([...set, fieldConfig.key]));

            // Clear current value when parent changes
            if (clearOnChange && targetControl) {
              targetControl.setValue(null, { emitEvent: false });
            }

            const result = config.loadFn(watchedValue, form.value);

            // Normalize to Observable
            let result$: Observable<FormSelectOption[]>;
            if (Array.isArray(result)) {
              result$ = of(result);
            } else if (isObservable(result)) {
              result$ = result;
            } else {
              // Promise
              result$ = from(result);
            }

            return result$.pipe(catchError(() => of([] as FormSelectOption[])));
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((options) => {
          this.fieldOptions.update((map) => {
            const newMap = new Map(map);
            newMap.set(fieldConfig.key, options);
            return newMap;
          });
          // Clear loading state
          this.fieldOptionsLoading.update((set) => {
            const newSet = new Set(set);
            newSet.delete(fieldConfig.key);
            return newSet;
          });
        });
    }
  }

  private loadAsyncOptions(fields: readonly FormFieldConfig[]): void {
    const asyncFields = fields.filter((field) => field.choices && !Array.isArray(field.choices));

    for (const field of asyncFields) {
      const options$ = field.choices as Observable<readonly FormSelectOption[]>;

      options$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((options) => {
        this.fieldOptions.update((map) => {
          const newMap = new Map(map);
          newMap.set(field.key, [...options]);
          return newMap;
        });
      });
    }
  }

  private getAllErrors(): Record<string, string[]> {
    const form = this.formGroup();
    const errors: Record<string, string[]> = {};
    const config = this.config();
    const fields = config.steps ? config.steps.flatMap((step) => [...step.fields]) : (config.fields ?? []);

    for (const field of fields) {
      const control = form.get(field.key);
      if (control?.errors) {
        errors[field.key] = [FormUtils.getErrorMessage(field, control.errors)];
      }
    }

    return errors;
  }
}
