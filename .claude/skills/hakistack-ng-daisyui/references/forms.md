# Dynamic Forms & Wizards (`hk-dynamic-form`)

`createForm()` returns a `FormController`. Bind `controller.config()` to `<hk-dynamic-form [config]="...">`. Forms have **no built-in buttons** — call `controller.submit()` / `controller.reset()` yourself.

## createForm() & FormController

```typescript
createForm<T = Record<string, any>>(input: CreateFormInput<T>): FormController<T>

interface FormController<T> {
  readonly config: Signal<FormConfig<T>>;   // pass to [config]
  readonly submit: () => void;
  readonly reset: () => void;
}

interface CreateFormInput<T> {
  title?: string;
  description?: string;
  layout?: 'vertical' | 'horizontal' | 'grid';   // default 'vertical'
  gridColumns?: number;                            // grid only (1-12)
  gap?: 'sm' | 'md' | 'lg';
  labelWidth?: 'sm' | 'md' | 'lg' | 'xl';          // horizontal only
  autoSave?: boolean | AutoSaveConfig;
  fields?: FormFieldConfig[];                      // single-page (XOR steps)
  steps?: FormStep[];                              // wizard (XOR fields)
  stepperConfig?: Partial<StepperConfig>;
  onSubmit?: (data: FormSubmissionData<T>) => void;
  onReset?: () => void;
  onChange?: (values: T) => void;
}

interface FormSubmissionData<T> {
  values: T;
  valid: boolean;
  errors: Record<string, string[]>;
  completedSteps?: string[];   // wizard
  currentStep?: string;        // wizard
}
```

Template events: `(stepChange)`, `(formRestored)`.

## Field builders — `field.<type>(key, label?, options?)`

`key` is the control name (humanized into a default label if `label` omitted). Every builder accepts `BaseFieldOptions` plus type-specific options.

| Builder | Notable options |
|---|---|
| `field.text` | `minLength`, `maxLength`, `pattern` |
| `field.email` | auto email validator; `minLength`, `maxLength` |
| `field.password` | show/hide toggle; `minLength`, `maxLength`, `pattern` |
| `field.tel` / `field.url` | `pattern` |
| `field.number` | `min`, `max`, `step` |
| `field.range` | `min` (def 0), `max` (def 100), `step` |
| `field.textarea` | `rows` (def 3), `cols`, `minLength`, `maxLength` |
| `field.select` | `choices` (string[] \| FormSelectOption[] \| Observable) **or** `optionsFrom`; `enableSearch` |
| `field.multiSelect` | as select; value is array (def `[]`) |
| `field.radio` | `choices` / `optionsFrom`; `orientation: 'horizontal' \| 'vertical'` |
| `field.checkbox` | boolean (def false) |
| `field.toggle` | boolean (def false), DaisyUI switch |
| `field.date` | `isRange: true` → value `{ start, end }` |
| `field.time` / `field.datetime` | base options only |
| `field.color` | hex string |
| `field.file` | `accept`, `multiple`; value is FileList |
| `field.editor` | `toolbar: 'full'\|'basic'\|'minimal'`, `outputFormat: 'html'\|'delta'`, `editorHeight`, `minLength`, `maxLength` |
| `field.hidden` | `(key, options?)` — only `defaultValue` |

```typescript
field.select('country', 'Country', { choices: ['USA', 'Canada'], enableSearch: true });

// cascading / dynamic options
field.select('state', 'State', {
  optionsFrom: {
    field: 'country',                         // parent control to watch
    loadFn: (country) => fetchStates(country), // sync | Promise | Observable -> FormSelectOption[]
    loadingPlaceholder: 'Loading states...',
    clearOnChange: true,                       // default: clear value when parent changes
  },
});
```

## BaseFieldOptions (every field)

Layout: `colSpan` (number | `ResponsiveColSpan` `{default,sm,md,lg,xl,'2xl'}`), `width` (`'full'|'1/2'|'1/3'|'1/4'|'2/3'|'3/4'|'auto'`), `cssClass`, `containerClass`.
State/visibility: `hidden`, `disabled`, `required`, `showWhen`, `hideWhen`, `requiredWhen`, `disabledWhen`.
Content: `placeholder`, `helpText`, `prefix`, `suffix`, `defaultValue`.
Organization: `order`, `group`, `focusOnLoad`.
Validation: `customValidators?: ValidatorFn[]`.

## Conditional logic (`ConditionShorthand`)

```typescript
showWhen: this.isEditMode                       // Signal<boolean>
showWhen: () => this.a() && !this.b()           // predicate (auto-tracks signals)
showWhen: 'hasCompany'                           // field truthy
showWhen: ['accountType', 'business']            // field === value
showWhen: ['total', (amount) => amount > 1000]   // [field, (value, formValues?) => boolean]
showWhen: false                                  // static
```

`showWhen`/`hideWhen` control visibility (+ validation participation); `requiredWhen` toggles the required validator; `disabledWhen` disables. Example:

```typescript
field.select('accountType', 'Account Type', { required: true, choices: ['personal', 'business'] }),
field.text('companyName', 'Company Name', {
  showWhen: ['accountType', 'business'],
  requiredWhen: ['accountType', 'business'],
}),
```

## Validation & layout helper bundles (spread into options / config)

```typescript
field.text('username', 'Username', { ...validation.required(3, 20) });   // required + min/max length
field.email('email', 'Email', { ...validation.email() });                 // email(required=true)
field.password('p', 'Password', { ...validation.password(12, true) });    // minLength + strong pattern
field.number('age', 'Age', { ...validation.number(18, 120) });
field.text('code', 'Code', { ...validation.custom(myValidator) });

createForm({ ...layout.vertical({ gap: 'md' }), fields: [...] });
createForm({ ...layout.horizontal({ labelWidth: 'md' }), fields: [...] });
createForm({ ...layout.grid(12, { gap: 'md' }), fields: [
  field.text('first', 'First', { colSpan: 6 }),
  field.text('last', 'Last', { colSpan: { default: 12, md: 6 } }),
]});
```

## Auto-save

```typescript
autoSave: {
  enabled: true,
  formId: 'registration',      // unique storage key
  debounceMs: 1000,
  clearOnSubmit: true,
  storage: 'localStorage',     // or 'api'
}
// requires provideFormState(...) in app.config.ts; listen with (formRestored)="..."
```

## Wizard / steps

```typescript
step.create(name, label, fields, opts?: { description?; optional?; nextText?; previousText? }): FormStep
step.review(name, label, description?): FormStep   // auto-summary step (fields: [])

createForm({
  steps: [
    step.create('account', 'Account', [field.email('email', 'Email', { required: true })], { description: 'Login' }),
    step.create('profile', 'Profile', [field.text('firstName', 'First Name', { required: true })]),
    step.review('review', 'Review & Submit'),
  ],
  stepperConfig: { linear: true, validateStepOnNext: true, showStepSummary: true },
  onSubmit: (data) => { if (data.valid) save(data.values); },
});
```

`StepperConfig`: `linear`, `validateStepOnNext`, `showStepSummary`, `showStepNumbers`, `allowStepNavigation`, `showStepIndicator`, `previousText`, `nextText`, `completeText`.
`StepChangeEvent`: `{ previousStep, currentStep, stepIndex, formValues }`.
