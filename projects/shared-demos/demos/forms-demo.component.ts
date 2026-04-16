import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { JsonPipe } from '@angular/common';
import {
  DynamicFormComponent,
  createForm,
  field,
  layout,
  validation,
  ToastService,
  FormStateService,
  FormSubmissionData,
  FormSelectOption,
} from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { DemoPageComponent } from '../shared/demo-page.component';
import { ApiDocEntry } from '../shared/api-table.types';

type FormTab = 'layouts' | 'fields' | 'conditional' | 'dependent' | 'autosave';
type ApiSubTab = 'component' | 'field-builders' | 'options' | 'conditional-logic' | 'layout-validation' | 'types';

@Component({
  selector: 'app-forms-demo',
  imports: [DynamicFormComponent, JsonPipe, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Dynamic Forms"
      description="Build complex forms with validation, conditional logic, and multiple layouts"
      icon="FileInput"
      category="Forms"
      importName="DynamicFormComponent, createForm, field"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'layouts') {
          <div class="space-y-6">
            <app-doc-section title="Vertical Layout (Default)" description="Standard stacked form layout" [codeExample]="verticalCode">
              <hk-dynamic-form [config]="verticalForm.config()" />
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost" (click)="verticalForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="verticalForm.submit()">Submit</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Horizontal Layout" description="Labels alongside inputs" [codeExample]="horizontalCode">
              <hk-dynamic-form [config]="horizontalForm.config()" />
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost" (click)="horizontalForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="horizontalForm.submit()">Submit</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Grid Layout" description="Responsive multi-column grid with colSpan control" [codeExample]="gridCode">
              <hk-dynamic-form [config]="gridForm.config()" />
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost" (click)="gridForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="gridForm.submit()">Submit</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'fields') {
          <app-doc-section title="All Field Types" description="Showcase of available field types" [codeExample]="fieldTypesCode">
            <hk-dynamic-form [config]="allFieldsForm.config()" />
            <div class="card-actions justify-end mt-4">
              <button class="btn btn-ghost" (click)="allFieldsForm.reset()">Reset</button>
              <button class="btn btn-primary" (click)="allFieldsForm.submit()">Submit</button>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'conditional') {
          <app-doc-section
            title="Conditional Logic"
            description="Fields that show/hide/require based on other values"
            [codeExample]="conditionalCode"
          >
            <hk-dynamic-form [config]="conditionalForm.config()" />
            <div class="card-actions justify-end mt-4">
              <button class="btn btn-ghost" (click)="conditionalForm.reset()">Reset</button>
              <button class="btn btn-primary" (click)="conditionalForm.submit()">Submit</button>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'dependent') {
          <app-doc-section
            title="Dependent Field Options"
            description="Select fields that load options based on another field's value"
            [codeExample]="dependentCode"
          >
            <hk-dynamic-form [config]="dependentForm.config()" />
            <div class="card-actions justify-end mt-4">
              <button class="btn btn-ghost" (click)="dependentForm.reset()">Reset</button>
              <button class="btn btn-primary" (click)="dependentForm.submit()">Submit</button>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'autosave') {
          <app-doc-section
            title="Auto-Save to LocalStorage"
            description="Form data is automatically saved as you type and restored on page reload. Try filling in some fields, then refresh the page."
            [codeExample]="autoSaveCode"
          >
            <hk-dynamic-form [config]="autoSaveForm.config()" (formRestored)="onFormRestored($event)" />
            <div class="card-actions justify-between mt-4">
              <div>
                @if (draftRestoredMessage()) {
                  <div class="badge badge-info gap-2">
                    <span>Draft restored</span>
                  </div>
                }
              </div>
              <div class="flex gap-2">
                <button class="btn btn-ghost" (click)="clearAutoSave()">Clear Saved Draft</button>
                <button class="btn btn-ghost" (click)="autoSaveForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="autoSaveForm.submit()">Submit</button>
              </div>
            </div>
          </app-doc-section>
        }

        @if (lastSubmission()) {
          <div class="card card-border card-bordered bg-base-100">
            <div class="card-body gap-3">
              <h2 class="card-title">Last Submission</h2>
              <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ lastSubmission() | json }}</pre>
            </div>
          </div>
        }
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'field-builders'" (click)="apiTab.set('field-builders')">
            Field Builders
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'options'" (click)="apiTab.set('options')">Options</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'conditional-logic'" (click)="apiTab.set('conditional-logic')">
            Conditional Logic
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'layout-validation'" (click)="apiTab.set('layout-validation')">
            Layout & Validation
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="hk-dynamic-form Inputs" [entries]="componentInputDocs" />
            <app-api-table title="Outputs" [entries]="componentOutputDocs" />
            <app-api-table title="Methods" [entries]="componentMethodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FormController (createForm return value)</h3>
                <p class="text-sm text-base-content/70">
                  The <code>createForm()</code> helper returns a <code>FormController</code> object that gives you external control over the
                  form without needing a template reference. This is the recommended way to interact with forms programmatically.
                </p>
                <app-code-block [code]="formControllerCode" />
              </div>
            </div>
          </div>
        }

        <!-- Field Builders sub-tab -->
        @if (apiTab() === 'field-builders') {
          <div class="space-y-6">
            <app-api-table title="field.* Builders" [entries]="fieldBuilderDocs" />
          </div>
        }

        <!-- Options sub-tab -->
        @if (apiTab() === 'options') {
          <div class="space-y-6">
            <app-api-table title="BaseFieldOptions (available on every field type)" [entries]="baseFieldOptionsDocs" />
            <app-api-table title="TextFieldOptions (extends BaseFieldOptions)" [entries]="textFieldOptionsDocs" />
            <app-api-table title="NumberFieldOptions / RangeFieldOptions (extends BaseFieldOptions)" [entries]="numberFieldOptionsDocs" />
            <app-api-table title="SelectFieldOptions (extends BaseFieldOptions)" [entries]="selectFieldOptionsDocs" />
            <app-api-table title="MultiSelectFieldOptions (extends BaseFieldOptions)" [entries]="multiSelectFieldOptionsDocs" />
            <app-api-table title="RadioFieldOptions (extends BaseFieldOptions)" [entries]="radioFieldOptionsDocs" />
            <app-api-table title="TextareaFieldOptions (extends BaseFieldOptions)" [entries]="textareaFieldOptionsDocs" />
            <app-api-table title="FileFieldOptions (extends BaseFieldOptions)" [entries]="fileFieldOptionsDocs" />
            <app-api-table title="DateFieldOptions (extends BaseFieldOptions)" [entries]="dateFieldOptionsDocs" />
            <app-api-table title="HiddenFieldOptions" [entries]="hiddenFieldOptionsDocs" />
            <app-api-table title="OptionsFromConfig" [entries]="optionsFromConfigDocs" />
          </div>
        }

        <!-- Conditional Logic sub-tab -->
        @if (apiTab() === 'conditional-logic') {
          <div class="space-y-6">
            <app-api-table title="Condition Shorthand Formats" [entries]="conditionShorthandDocs" />
            <app-api-table title="ConditionalLogic Operators" [entries]="conditionalOperatorDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Conditional Logic Examples</h3>
                <p class="text-sm text-base-content/70">
                  Use <code>showWhen</code>, <code>hideWhen</code>, <code>requiredWhen</code>, and <code>disabledWhen</code> to control
                  field visibility, requirements, and disabled state based on other field values.
                </p>
                <app-code-block [code]="conditionalLogicExampleCode" />
              </div>
            </div>
          </div>
        }

        <!-- Layout & Validation sub-tab -->
        @if (apiTab() === 'layout-validation') {
          <div class="space-y-6">
            <app-api-table title="createForm() Config (CreateFormInput)" [entries]="createFormInputDocs" />
            <app-api-table title="layout.* Helpers" [entries]="layoutHelperDocs" />
            <app-api-table title="validation.* Helpers" [entries]="validationHelperDocs" />
            <app-api-table title="Layout Options Reference" [entries]="layoutOptionsDocs" />
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FormSubmissionData</h3>
                <app-code-block [code]="typeFormSubmissionData" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FormSelectOption</h3>
                <app-code-block [code]="typeFormSelectOption" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">OptionsFromConfig</h3>
                <app-code-block [code]="typeOptionsFromConfig" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">BaseFieldOptions</h3>
                <app-code-block [code]="typeBaseFieldOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">SelectFieldOptions</h3>
                <app-code-block [code]="typeSelectFieldOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ConditionalLogic</h3>
                <app-code-block [code]="typeConditionalLogic" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ResponsiveColSpan</h3>
                <app-code-block [code]="typeResponsiveColSpan" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FieldWidth</h3>
                <app-code-block [code]="typeFieldWidth" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">AutoSaveConfig</h3>
                <app-code-block [code]="typeAutoSaveConfig" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FormController</h3>
                <app-code-block [code]="typeFormController" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">StepChangeEvent</h3>
                <app-code-block [code]="typeStepChangeEvent" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class FormsDemoComponent {
  private toast = inject(ToastService);
  private formState = inject(FormStateService);
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'layouts') as FormTab);
  apiTab = signal<ApiSubTab>('component');
  lastSubmission = signal<FormSubmissionData | null>(null);

  verticalForm = createForm({
    layout: 'vertical',
    gap: 'md',
    fields: [
      field.text('name', 'Full Name', { required: true, placeholder: 'John Doe' }),
      field.email('email', 'Email Address', { required: true }),
      field.password('password', 'Password', { ...validation.password(8) }),
    ],
    onSubmit: (data) => this.handleSubmit('Vertical Form', data),
  });

  horizontalForm = createForm({
    ...layout.horizontal({ labelWidth: 'md', gap: 'md' }),
    fields: [
      field.text('username', 'Username', { required: true }),
      field.email('email', 'Email', { required: true }),
      field.text('phone', 'Phone Number', { placeholder: '(555) 123-4567' }),
    ],
    onSubmit: (data) => this.handleSubmit('Horizontal Form', data),
  });

  gridForm = createForm({
    ...layout.grid(12, { gap: 'md' }),
    fields: [
      field.text('firstName', 'First Name', { required: true, colSpan: 6 }),
      field.text('lastName', 'Last Name', { required: true, colSpan: 6 }),
      field.email('email', 'Email', { colSpan: { default: 12, md: 8 } }),
      field.text('phone', 'Phone', { colSpan: { default: 12, md: 4 }, placeholder: '(555) 123-4567' }),
      field.textarea('address', 'Address', { colSpan: 12 }),
      field.text('city', 'City', { colSpan: { default: 12, md: 4 } }),
      field.text('state', 'State', { colSpan: { default: 6, md: 4 } }),
      field.text('zip', 'ZIP Code', { colSpan: { default: 6, md: 4 } }),
    ],
    onSubmit: (data) => this.handleSubmit('Grid Form', data),
  });

  allFieldsForm = createForm({
    ...layout.grid(12, { gap: 'md' }),
    fields: [
      field.text('text', 'Text Input', { colSpan: 6, placeholder: 'Enter text...' }),
      field.email('email', 'Email Input', { colSpan: 6 }),
      field.password('password', 'Password', { colSpan: 6 }),
      field.number('age', 'Age (Number)', { colSpan: 6, ...validation.number(18, 120) }),
      field.tel('phone', 'Phone', { colSpan: 6, placeholder: '(555) 123-4567' }),
      field.url('website', 'Website URL', { colSpan: 6, placeholder: 'https://example.com' }),
      field.textarea('bio', 'Biography (Textarea)', { colSpan: 12 }),
      field.select('country', 'Country', { colSpan: 6, choices: ['USA', 'Canada', 'UK', 'Germany', 'France'] }),
      field.multiSelect('languages', 'Languages Spoken', {
        colSpan: 6,
        choices: ['English', 'Spanish', 'French', 'German', 'Chinese'],
      }),
      field.radio('gender', 'Gender', { colSpan: 6, choices: ['Male', 'Female', 'Other', 'Prefer not to say'] }),
      field.checkbox('newsletter', 'Subscribe to newsletter', { colSpan: 6 }),
      field.toggle('notifications', 'Enable notifications', { colSpan: 6 }),
      field.date('birthdate', 'Birth Date', { colSpan: 6 }),
      field.time('meetingTime', 'Meeting Time', { colSpan: 6 }),
      field.datetime('appointment', 'Appointment', { colSpan: 6 }),
      field.color('favoriteColor', 'Favorite Color', { colSpan: 6 }),
      field.range('satisfaction', 'Satisfaction (1-10)', { colSpan: 6, min: 1, max: 10, defaultValue: 5 }),
    ],
    onSubmit: (data) => this.handleSubmit('All Fields Form', data),
  });

  // Fake data for dependent fields demo
  private readonly statesByCountry: Record<string, FormSelectOption[]> = {
    US: [
      { value: 'CA', label: 'California' },
      { value: 'NY', label: 'New York' },
      { value: 'TX', label: 'Texas' },
      { value: 'FL', label: 'Florida' },
    ],
    CA: [
      { value: 'ON', label: 'Ontario' },
      { value: 'QC', label: 'Quebec' },
      { value: 'BC', label: 'British Columbia' },
    ],
    MX: [
      { value: 'CDMX', label: 'Ciudad de Mexico' },
      { value: 'JAL', label: 'Jalisco' },
      { value: 'NL', label: 'Nuevo Leon' },
    ],
  };

  private readonly citiesByState: Record<string, FormSelectOption[]> = {
    CA: [
      { value: 'la', label: 'Los Angeles' },
      { value: 'sf', label: 'San Francisco' },
      { value: 'sd', label: 'San Diego' },
    ],
    NY: [
      { value: 'nyc', label: 'New York City' },
      { value: 'buf', label: 'Buffalo' },
    ],
    TX: [
      { value: 'hou', label: 'Houston' },
      { value: 'dal', label: 'Dallas' },
      { value: 'aus', label: 'Austin' },
    ],
    FL: [
      { value: 'mia', label: 'Miami' },
      { value: 'orl', label: 'Orlando' },
    ],
    ON: [
      { value: 'tor', label: 'Toronto' },
      { value: 'ott', label: 'Ottawa' },
    ],
    QC: [
      { value: 'mtl', label: 'Montreal' },
      { value: 'qc', label: 'Quebec City' },
    ],
    BC: [
      { value: 'van', label: 'Vancouver' },
      { value: 'vic', label: 'Victoria' },
    ],
    CDMX: [{ value: 'cdmx', label: 'Mexico City' }],
    JAL: [{ value: 'gdl', label: 'Guadalajara' }],
    NL: [{ value: 'mty', label: 'Monterrey' }],
  };

  dependentForm = createForm({
    ...layout.vertical({ gap: 'md' }),
    fields: [
      field.select('country', 'Country', {
        required: true,
        choices: [
          { value: 'US', label: 'United States' },
          { value: 'CA', label: 'Canada' },
          { value: 'MX', label: 'Mexico' },
        ],
      }),
      field.select('state', 'State / Province', {
        required: true,
        optionsFrom: {
          field: 'country',
          loadFn: (country: unknown) => {
            return new Promise<FormSelectOption[]>((resolve) => {
              setTimeout(() => resolve(this.statesByCountry[country as string] || []), 600);
            });
          },
          loadingPlaceholder: 'Loading states...',
        },
      }),
      field.select('city', 'City', {
        optionsFrom: {
          field: 'state',
          loadFn: (state: unknown) => {
            return new Promise<FormSelectOption[]>((resolve) => {
              setTimeout(() => resolve(this.citiesByState[state as string] || []), 400);
            });
          },
          loadingPlaceholder: 'Loading cities...',
        },
      }),
    ],
    onSubmit: (data) => this.handleSubmit('Dependent Form', data),
  });

  conditionalForm = createForm({
    ...layout.vertical({ gap: 'md' }),
    fields: [
      field.select('accountType', 'Account Type', { required: true, choices: ['personal', 'business'] }),
      field.text('companyName', 'Company Name', {
        showWhen: ['accountType', 'business'],
        requiredWhen: ['accountType', 'business'],
      }),
      field.text('taxId', 'Tax ID', {
        showWhen: ['accountType', 'business'],
      }),
      field.checkbox('hasReferral', 'I have a referral code'),
      field.text('referralCode', 'Referral Code', {
        showWhen: ['hasReferral', true],
        requiredWhen: ['hasReferral', true],
      }),
      field.select('contactMethod', 'Preferred Contact Method', {
        choices: [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' },
          { value: 'mail', label: 'Postal Mail' },
        ],
      }),
      field.email('contactEmail', 'Contact Email', {
        showWhen: ['contactMethod', 'email'],
        requiredWhen: ['contactMethod', 'email'],
      }),
      field.text('contactPhone', 'Contact Phone', {
        showWhen: ['contactMethod', 'phone'],
        requiredWhen: ['contactMethod', 'phone'],
        placeholder: '(555) 123-4567',
      }),
      field.textarea('mailingAddress', 'Mailing Address', {
        showWhen: ['contactMethod', 'mail'],
        requiredWhen: ['contactMethod', 'mail'],
      }),
    ],
    onSubmit: (data) => this.handleSubmit('Conditional Form', data),
  });

  // --- Auto-Save Form ---
  draftRestoredMessage = signal('');

  autoSaveForm = createForm({
    layout: 'grid',
    gridColumns: 2,
    gap: 'md',
    fields: [
      field.text('firstName', 'First Name', { required: true, placeholder: 'John' }),
      field.text('lastName', 'Last Name', { required: true, placeholder: 'Doe' }),
      field.email('email', 'Email', { required: true, colSpan: 2, placeholder: 'john@example.com' }),
      field.select('role', 'Role', { choices: ['Developer', 'Designer', 'Manager', 'QA Engineer'] }),
      field.select('department', 'Department', { choices: ['Engineering', 'Marketing', 'Sales', 'HR'] }),
      field.textarea('notes', 'Notes', { colSpan: 2, placeholder: 'Type something, then refresh the page...' }),
    ],
    autoSave: {
      enabled: true,
      formId: 'demo-autosave-form',
      debounceMs: 800,
      clearOnSubmit: true,
      storage: 'localStorage',
    },
    onSubmit: (data) => this.handleSubmit('Auto-Save Form', data),
  });

  onFormRestored(values: Record<string, unknown>) {
    const fieldCount = Object.values(values).filter((v) => v != null && v !== '').length;
    if (fieldCount > 0) {
      this.draftRestoredMessage.set(`Draft restored (${fieldCount} fields)`);
      this.toast.info('Draft Restored', 'Your previously saved form data has been restored.');
      setTimeout(() => this.draftRestoredMessage.set(''), 5000);
    }
  }

  clearAutoSave() {
    this.formState.clear('demo-autosave-form').subscribe(() => {
      this.autoSaveForm.reset();
      this.toast.success('Draft Cleared', 'Saved form data has been removed.');
    });
  }

  private handleSubmit(formName: string, data: FormSubmissionData) {
    this.lastSubmission.set(data);
    this.toast.success(`${formName} submitted!`, 'Check console for data');
    console.log(`[${formName}]`, data);
  }

  // --- Code examples ---
  verticalCode = `const form = createForm({
  ...layout.vertical({ gap: 'md' }),
  fields: [
    field.text('name', 'Full Name', { required: true }),
    field.email('email', 'Email Address', { required: true }),
    field.password('password', 'Password', { ...validation.password(8) }),
  ],
  onSubmit: (data) => console.log(data),
});

<hk-dynamic-form [config]="form.config()" />
<button (click)="form.submit()">Submit</button>
<button (click)="form.reset()">Reset</button>`;

  horizontalCode = `const form = createForm({
  ...layout.horizontal({ labelWidth: 'md', gap: 'md' }),
  fields: [
    field.text('username', 'Username', { required: true }),
    field.email('email', 'Email', { required: true }),
  ],
  onSubmit: (data) => console.log(data),
});`;

  gridCode = `const form = createForm({
  ...layout.grid(12, { gap: 'md' }),
  fields: [
    field.text('firstName', 'First Name', { required: true, colSpan: 6 }),
    field.text('lastName', 'Last Name', { required: true, colSpan: 6 }),
    field.email('email', 'Email', { colSpan: { default: 12, md: 8 } }),
    field.text('phone', 'Phone', { colSpan: { default: 12, md: 4 } }),
    field.textarea('address', 'Address', { colSpan: 12 }),
  ],
  onSubmit: (data) => console.log(data),
});`;

  fieldTypesCode = `field.text('name', 'Text Input')
field.email('email', 'Email')
field.password('pw', 'Password', { ...validation.password(8) })
field.number('age', 'Age', { ...validation.number(18, 120) })
field.tel('phone', 'Phone')
field.url('website', 'Website')
field.textarea('bio', 'Biography')
field.select('country', 'Country', { choices: ['USA', 'Canada'] })
field.multiSelect('langs', 'Languages', { choices: ['English', 'Spanish'] })
field.radio('gender', 'Gender', { choices: ['Male', 'Female'] })
field.checkbox('agree', 'I agree')
field.toggle('notify', 'Enable notifications')
field.date('dob', 'Date of Birth')
field.time('meeting', 'Meeting Time')
field.datetime('appt', 'Appointment')         // calendar + time picker
field.color('accent', 'Accent Color')
field.range('score', 'Score', { min: 1, max: 10, defaultValue: 5 })`;

  dependentCode = `// Country -> State -> City cascading selects
field.select('country', 'Country', {
  choices: [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
  ],
}),

field.select('state', 'State', {
  optionsFrom: {
    field: 'country',
    loadFn: (country) => this.api.getStates(country),
    loadingPlaceholder: 'Loading states...',
    clearOnChange: true,  // default: clears value when parent changes
  },
}),

field.select('city', 'City', {
  optionsFrom: {
    field: 'state',
    loadFn: (state) => this.api.getCities(state),
  },
}),`;

  autoSaveCode = `import { createForm, field, provideFormState } from '@hakistack/ng-daisyui';

// In app.config.ts providers:
provideFormState({ mode: 'localStorage' })

// Form config:
const form = createForm({
  layout: 'grid',
  gridColumns: 2,
  fields: [
    field.text('firstName', 'First Name', { required: true }),
    field.text('lastName', 'Last Name', { required: true }),
    field.email('email', 'Email', { required: true, colSpan: 2 }),
    field.select('role', 'Role', { choices: ['Developer', 'Designer', 'Manager'] }),
    field.select('department', 'Department', { choices: ['Engineering', 'Marketing'] }),
    field.textarea('notes', 'Notes', { colSpan: 2 }),
  ],
  autoSave: {
    enabled: true,
    formId: 'demo-autosave-form',  // Unique ID for storage key
    debounceMs: 800,               // Save after 800ms of inactivity
    clearOnSubmit: true,           // Remove saved data on successful submit
    storage: 'localStorage',      // 'localStorage' or 'api'
  },
  onSubmit: (data) => console.log(data),
});

// Template:
<hk-dynamic-form
  [config]="form.config()"
  (formRestored)="onDraftRestored($event)" />
<button (click)="form.submit()">Submit</button>`;

  conditionalCode = `field.select('type', 'Account Type', { choices: ['personal', 'business'] }),
field.text('company', 'Company Name', {
  showWhen: ['type', 'business'],
  requiredWhen: ['type', 'business'],
}),
field.checkbox('hasCode', 'I have a referral code'),
field.text('code', 'Referral Code', {
  showWhen: ['hasCode', true],
  requiredWhen: ['hasCode', true],
}),`;

  builderCode = `import { createForm, field, layout, validation, step } from '@hakistack/ng-daisyui';

// Every field: field.*(key, label?, options?)
const form = createForm({
  ...layout.grid(12),
  fields: [
    field.text('name', 'Name', { required: true, colSpan: 6 }),
    field.email('email', 'Email', { colSpan: 6 }),
    field.select('role', 'Role', { choices: ['Admin', 'User'] }),
    field.range('score', 'Score', { min: 1, max: 10 }),
  ],
  onSubmit: (data) => console.log(data),
});

// External control
form.config()    // Signal<FormConfig> - pass to [config]
form.submit()    // Trigger submission
form.reset()     // Reset form values`;

  // --- API tab: Component sub-tab ---
  componentInputDocs: ApiDocEntry[] = [
    {
      name: 'config',
      type: 'FormConfig',
      description:
        'The form configuration object, typically produced by createForm(). Contains field definitions, layout settings, stepper configuration, callbacks, and internal trigger signals. Pass the signal value: [config]="form.config()".',
    },
    {
      name: 'initialValues',
      type: 'Record<string, unknown>',
      default: '{}',
      description:
        'A record of key-value pairs used to pre-populate form fields when the component initializes. Keys must match field keys defined in the config. Useful for edit forms where you load existing data from an API.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description:
        'When set to true, disables every field in the form and prevents submission. The entire form group becomes read-only. Useful for showing form data in a non-editable preview state.',
    },
  ];

  componentOutputDocs: ApiDocEntry[] = [
    {
      name: 'formSubmit',
      type: 'FormSubmissionData',
      description:
        'Emitted when the form is submitted (either programmatically via FormController.submit() or the internal onSubmit() method). The payload includes the current values, whether the form is valid, a record of validation errors keyed by field, and step-related metadata if in wizard mode.',
    },
    {
      name: 'formChange',
      type: 'Record<string, unknown>',
      description:
        'Emitted every time any form value changes. The payload is the entire form values object. This fires on every keystroke, selection change, or toggle, so use debouncing if performing expensive operations in the handler.',
    },
    {
      name: 'formReset',
      type: 'void',
      description:
        'Emitted when the form is reset (either programmatically via FormController.reset() or the internal onReset() method). No payload is emitted. Use this to clear related UI state like submission confirmations or error banners.',
    },
    {
      name: 'fieldChange',
      type: '{ field: string; value: unknown; formValues: Record<string, unknown> }',
      description:
        'Emitted when a single field changes. The payload includes the field key that changed, its new value, and a snapshot of all current form values. More granular than formChange and useful for reacting to specific field updates without checking which field changed.',
    },
    {
      name: 'formRestored',
      type: 'Record<string, unknown>',
      description:
        'Emitted when auto-saved form data is restored from storage (localStorage or API). The payload is the restored values record. Only fires when autoSave is configured and previously saved data exists. Use this to show a "draft restored" notification to the user.',
    },
    {
      name: 'stepChange',
      type: 'StepChangeEvent',
      description:
        'Emitted when the active wizard step changes in stepper mode. The payload includes the previous step name (null on initial load), the current step name, the new step index, and a snapshot of all form values at the time of the transition.',
    },
  ];

  componentMethodDocs: ApiDocEntry[] = [
    {
      name: 'onSubmit()',
      type: 'void',
      description:
        'Programmatically triggers form submission. Validates all fields (or the current step in wizard mode), collects values, and emits the formSubmit output. Also calls the onSubmit callback if one was provided in the config. Prefer using FormController.submit() for external calls.',
    },
    {
      name: 'onReset()',
      type: 'void',
      description:
        'Resets all form controls to their default values and marks them as pristine and untouched. Emits the formReset output and calls the onReset callback if configured. In wizard mode, also resets the stepper to the first step.',
    },
    {
      name: 'nextStep()',
      type: 'void',
      description:
        'Advances to the next wizard step. If stepperConfig.validateStepOnNext is true (default), it first validates all fields in the current step and only advances if they pass. Does nothing if already on the last step.',
    },
    {
      name: 'previousStep()',
      type: 'void',
      description:
        'Moves back to the previous wizard step. Does not perform validation since the user is going backward. Does nothing if already on the first step.',
    },
    {
      name: 'goToStep(index)',
      type: 'void',
      description:
        'Navigates directly to a specific step by its zero-based index. Only works if stepperConfig.allowStepNavigation is true or the step has already been completed. Validates the current step before jumping if validateStepOnNext is enabled.',
    },
    {
      name: 'isStepValid(index)',
      type: 'boolean',
      description:
        'Returns whether all fields in the specified step (by zero-based index) are currently valid. Empty steps (like a review step with no fields) always return true. Useful for conditionally styling step indicators.',
    },
    {
      name: 'getFieldValue(key)',
      type: 'unknown',
      description:
        'Returns the current value of a specific form field by its key. Returns undefined if the field does not exist in the form group. Useful for reading individual field values in custom logic outside the form.',
    },
    {
      name: 'getFieldErrors(key)',
      type: 'string[]',
      description:
        'Returns an array of human-readable validation error messages for the specified field. Returns an empty array if the field is valid or does not exist. Error messages are automatically generated from Angular validator metadata (e.g., "Minimum length is 8").',
    },
    {
      name: 'isFieldRequired(field)',
      type: 'boolean',
      description:
        'Returns whether the given field is currently required, taking into account both static required configuration and dynamic requiredWhen conditions. Use this to show required indicators in custom templates.',
    },
    {
      name: 'shouldShowField(field, values?)',
      type: 'boolean',
      description:
        'Evaluates showWhen and hideWhen conditions for the given field to determine if it should be visible. Accepts an optional form values snapshot; if omitted, reads from the current form group. The component calls this internally to toggle field visibility.',
    },
    {
      name: 'getFieldOptions(field)',
      type: 'FormSelectOption[]',
      description:
        'Returns the current resolved options array for a select, multiselect, or radio field. For fields using optionsFrom, returns the dynamically loaded options (or an empty array while loading). Useful for accessing the resolved options list programmatically.',
    },
  ];

  formControllerCode = `import { createForm, field } from '@hakistack/ng-daisyui';

// createForm() returns a FormController
const form = createForm({
  fields: [
    field.text('name', 'Name', { required: true }),
    field.email('email', 'Email'),
  ],
  onSubmit: (data) => {
    if (data.valid) saveUser(data.values);
  },
});

// FormController interface:
// {
//   config: Signal<FormConfig>   -- pass to [config] input
//   submit: () => void           -- trigger form submission externally
//   reset: () => void            -- reset all form values externally
// }

// Template usage:
// <hk-dynamic-form [config]="form.config()" />
// <button (click)="form.submit()">Submit</button>
// <button (click)="form.reset()">Reset</button>`;

  // --- API tab: Field Builders sub-tab ---
  fieldBuilderDocs: ApiDocEntry[] = [
    {
      name: 'field.text()',
      type: '(key, label?, options?: TextFieldOptions)',
      description:
        'Renders a standard text input. Auto-generates a placeholder from the label ("Enter [label]"). Supports minLength, maxLength, and pattern validation via TextFieldOptions. The most common field type for free-form string input.',
    },
    {
      name: 'field.email()',
      type: '(key, label?, options?: EmailFieldOptions)',
      description:
        'Renders an email input with type="email". Automatically adds Angular\'s built-in email validator. Default placeholder: "Enter [label]". Extends BaseFieldOptions with minLength and maxLength.',
    },
    {
      name: 'field.password()',
      type: '(key, label?, options?: PasswordFieldOptions)',
      description:
        'Renders a password input with masked characters. Default placeholder: "Enter [label]". Supports minLength, maxLength, and pattern for custom strength rules. Use the validation.password() helper for common presets.',
    },
    {
      name: 'field.tel()',
      type: '(key, label?, options?: TelFieldOptions)',
      description:
        'Renders a telephone input with type="tel". Supports minLength, maxLength, and pattern validation. Mobile browsers may show a numeric keypad. No built-in phone format validation -- use pattern for custom formats.',
    },
    {
      name: 'field.url()',
      type: '(key, label?, options?: UrlFieldOptions)',
      description:
        'Renders a URL input with type="url". Supports minLength, maxLength, and pattern validation. Browsers provide basic URL format validation natively. Add a placeholder like "https://example.com" for user guidance.',
    },
    {
      name: 'field.textarea()',
      type: '(key, label?, options?: TextareaFieldOptions)',
      description:
        'Renders a multi-line textarea. Defaults to 3 rows. Default placeholder: "Enter [label]...". Supports rows, cols, minLength, and maxLength options for controlling the textarea dimensions and content limits.',
    },
    {
      name: 'field.number()',
      type: '(key, label?, options?: NumberFieldOptions)',
      description:
        'Renders a numeric input with type="number". Supports min, max, and step options. The browser provides native up/down arrows. Use the validation.number() helper for convenient min/max/required presets.',
    },
    {
      name: 'field.range()',
      type: '(key, label?, options?: RangeFieldOptions)',
      description:
        'Renders a range slider input. Defaults to min=0, max=100 with the defaultValue set to the min value. Supports min, max, and step options. Displays the current value alongside the slider.',
    },
    {
      name: 'field.select()',
      type: '(key, label?, options?: SelectFieldOptions)',
      description:
        'Renders a dropdown select using the enhanced hk-select component. Default placeholder: "Select [label]". Accepts choices as string[], FormSelectOption[], or Observable. Supports optionsFrom for dependent dynamic loading and enableSearch for filtering long lists.',
    },
    {
      name: 'field.multiSelect()',
      type: '(key, label?, options?: MultiSelectFieldOptions)',
      description:
        'Renders a multi-select dropdown that allows choosing multiple values. Default value is an empty array. Default placeholder: "Select [label]". Supports the same choices, optionsFrom, and enableSearch options as field.select().',
    },
    {
      name: 'field.radio()',
      type: '(key, label?, options?: RadioFieldOptions)',
      description:
        'Renders a group of radio buttons for single-selection from a list of choices. Accepts choices as string[], FormSelectOption[], or Observable. Supports optionsFrom for dynamic loading and orientation ("horizontal" or "vertical") for layout control.',
    },
    {
      name: 'field.checkbox()',
      type: '(key, label?, options?: CheckboxFieldOptions)',
      description:
        'Renders a single checkbox for boolean values. Default value is false. The label appears next to the checkbox. Commonly used for "I agree" toggles, opt-ins, and boolean flags. Extends BaseFieldOptions only.',
    },
    {
      name: 'field.toggle()',
      type: '(key, label?, options?: ToggleFieldOptions)',
      description:
        'Renders a DaisyUI toggle switch for boolean values. Default value is false. Visually distinct from checkbox -- use for on/off settings like "Enable notifications". Functionally identical to checkbox but styled as a switch.',
    },
    {
      name: 'field.date()',
      type: '(key, label?, options?: DateFieldOptions)',
      description:
        'Renders the hk-datepicker component with calendar UI and keyboard navigation. Supports the isRange option to enable date range selection (start + end date). Integrates with the form group as a standard date string value.',
    },
    {
      name: 'field.time()',
      type: '(key, label?, options?: TimeFieldOptions)',
      description:
        'Renders a time picker component for selecting hours and minutes. The value is stored as a time string (e.g., "14:30"). Extends BaseFieldOptions only -- no time-specific options beyond the base set.',
    },
    {
      name: 'field.datetime()',
      type: '(key, label?, options?: DatetimeFieldOptions)',
      description:
        'Renders a combined date and time picker (maps to type="datetime-local" internally). Allows selecting both a calendar date and a time in a single field. Extends BaseFieldOptions only.',
    },
    {
      name: 'field.color()',
      type: '(key, label?, options?: ColorFieldOptions)',
      description:
        'Renders a native color picker input. The value is stored as a hex color string (e.g., "#ff6600"). Extends BaseFieldOptions only. Useful for theme customization or user preference forms.',
    },
    {
      name: 'field.file()',
      type: '(key, label?, options?: FileFieldOptions)',
      description:
        'Renders a file upload input. Defaults to accept="*/*" (all file types). Supports accept (MIME filter, e.g., "image/*") and multiple (allow multi-file selection) options. The value is a FileList object.',
    },
    {
      name: 'field.hidden()',
      type: '(key, options?: HiddenFieldOptions)',
      description:
        'Creates a hidden form field that is not rendered in the UI but participates in form submission. No label parameter -- the field is invisible. Only accepts defaultValue as an option. Useful for passing metadata like IDs or tokens through the form.',
    },
  ];

  // --- API tab: Options sub-tab ---
  baseFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'placeholder',
      type: 'string',
      default: '"Enter [label]"',
      description:
        'Placeholder text shown inside the input when it is empty. Auto-generated from the field label if not provided. Set explicitly to override the default or pass an empty string to show no placeholder.',
    },
    {
      name: 'defaultValue',
      type: 'any',
      default: 'undefined',
      description:
        'The initial value for the field when the form loads and after reset. For checkboxes and toggles, defaults to false. For multiselect, defaults to []. For other fields, defaults to undefined (empty).',
    },
    {
      name: 'helpText',
      type: 'string',
      default: 'undefined',
      description:
        'Descriptive text displayed below the input field. Use this for hints, format guidance, or additional context (e.g., "Password must be at least 8 characters"). Rendered as a small label under the field.',
    },
    {
      name: 'colSpan',
      type: 'number | ResponsiveColSpan',
      default: 'undefined',
      description:
        'Controls how many grid columns this field spans in grid layout mode (1-12). Can be a fixed number or a responsive object like { default: 12, md: 6, lg: 4 } for breakpoint-specific widths. Ignored in vertical and horizontal layouts.',
    },
    {
      name: 'width',
      type: 'FieldWidth',
      default: 'undefined',
      description:
        'Controls the field width in non-grid layouts (vertical and horizontal). Accepts "full", "1/2", "1/3", "1/4", "2/3", "3/4", or "auto". Ignored when layout is set to "grid" -- use colSpan instead.',
    },
    {
      name: 'cssClass',
      type: 'string',
      default: '""',
      description:
        'CSS class(es) applied directly to the input element itself. Use this for fine-grained input styling such as custom sizes or colors. Multiple classes can be space-separated.',
    },
    {
      name: 'containerClass',
      type: 'string',
      default: 'undefined',
      description:
        "CSS class(es) applied to the field's outer container div (which wraps the label, input, and help text). Useful for adding margins, padding, or background styles to the entire field group.",
    },
    {
      name: 'hidden',
      type: 'boolean',
      default: 'false',
      description:
        'When true, the field is rendered as type="hidden" and not visible in the UI, but its value still participates in form submission. Different from showWhen/hideWhen which dynamically toggle visibility based on conditions.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description:
        'When true, the field is rendered in a disabled (read-only) state. Disabled fields are excluded from validation but their values are still included in submission data. For dynamic disabling, use disabledWhen instead.',
    },
    {
      name: 'required',
      type: 'boolean',
      default: 'false',
      description:
        "When true, adds Angular's required validator to the field. The field will show validation errors if left empty on submission. For conditional requirements, use requiredWhen instead.",
    },
    {
      name: 'prefix',
      type: 'string',
      default: 'undefined',
      description:
        'Text or symbol displayed before the input (e.g., "$" for currency, "https://" for URLs). Rendered inside the input group as a visual prefix. Does not affect the submitted value.',
    },
    {
      name: 'suffix',
      type: 'string',
      default: 'undefined',
      description:
        'Text or symbol displayed after the input (e.g., "kg", "%", ".com"). Rendered inside the input group as a visual suffix. Does not affect the submitted value.',
    },
    {
      name: 'order',
      type: 'number',
      default: '1',
      description:
        'Controls the rendering order of fields within the form. Lower numbers render first. Fields with the same order value render in array order. Useful when you want to reorder fields without changing the array position.',
    },
    {
      name: 'group',
      type: 'string',
      default: 'undefined',
      description:
        'Groups fields under a named section heading. Fields with the same group string are visually grouped together. The group name is rendered as a section title above the grouped fields.',
    },
    {
      name: 'focusOnLoad',
      type: 'boolean',
      default: 'undefined',
      description:
        'When set to true, this field receives keyboard focus when the form first renders. Only one field should have this set to true. Useful for directing user attention to the first input in a form or wizard step.',
    },
    {
      name: 'showWhen',
      type: 'ConditionShorthand',
      default: 'undefined',
      description:
        'A condition that determines when this field is visible. When the condition is falsy, the field is hidden and excluded from validation. Accepts a field key string (truthy check), a [key, value] tuple (equality check), or a [key, fn] tuple (custom function).',
    },
    {
      name: 'hideWhen',
      type: 'ConditionShorthand',
      default: 'undefined',
      description:
        'The inverse of showWhen. When the condition is truthy, the field is hidden and excluded from validation. Useful when you want to hide a field under a specific condition rather than listing all the conditions where it should show.',
    },
    {
      name: 'requiredWhen',
      type: 'ConditionShorthand',
      default: 'undefined',
      description:
        'Dynamically adds or removes the required validator based on a condition. When the condition is truthy, the field becomes required; when falsy, the required constraint is removed. Commonly paired with showWhen for conditional required fields.',
    },
    {
      name: 'disabledWhen',
      type: 'ConditionShorthand',
      default: 'undefined',
      description:
        'Dynamically enables or disables the field based on a condition. When the condition is truthy, the field becomes disabled. Useful for fields that should only be editable when a prerequisite condition is met.',
    },
    {
      name: 'customValidators',
      type: 'ValidatorFn[]',
      default: 'undefined',
      description:
        "An array of custom Angular ValidatorFn functions applied to the field's form control. Use this for validation logic not covered by the built-in options (e.g., cross-field validation, async validators, custom regex with specific error messages).",
    },
  ];

  textFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'minLength',
      type: 'number',
      default: 'undefined',
      description:
        "Minimum number of characters required. Adds Angular's minLength validator. The validation error message automatically includes the required length.",
    },
    {
      name: 'maxLength',
      type: 'number',
      default: 'undefined',
      description:
        "Maximum number of characters allowed. Adds Angular's maxLength validator. The browser may also enforce this natively by preventing further input.",
    },
    {
      name: 'pattern',
      type: 'string | RegExp',
      default: 'undefined',
      description:
        "A regular expression pattern that the field value must match. Adds Angular's pattern validator. Can be a string or RegExp. Use for custom formats like phone numbers or postal codes.",
    },
  ];

  numberFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'min',
      type: 'number',
      default: 'undefined (range: 0)',
      description:
        "Minimum allowed numeric value. Adds Angular's min validator. For range fields, defaults to 0 if not specified. The browser also enforces this on the native number/range input.",
    },
    {
      name: 'max',
      type: 'number',
      default: 'undefined (range: 100)',
      description:
        "Maximum allowed numeric value. Adds Angular's max validator. For range fields, defaults to 100 if not specified. The browser also enforces this on the native number/range input.",
    },
    {
      name: 'step',
      type: 'number',
      default: 'undefined',
      description:
        'The step increment for the number or range input. Controls the granularity of allowed values (e.g., step=0.01 for currency, step=5 for a coarse slider). The browser up/down arrows use this increment.',
    },
  ];

  selectFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'choices',
      type: 'string[] | FormSelectOption[] | Observable<FormSelectOption[]>',
      default: 'undefined',
      description:
        'The list of options to display in the dropdown. Can be a simple string array (auto-mapped to { value, label } pairs), an array of FormSelectOption objects for full control, or an Observable that emits options asynchronously.',
    },
    {
      name: 'optionsFrom',
      type: 'OptionsFromConfig',
      default: 'undefined',
      description:
        "Configuration for loading options dynamically based on another field's value. When the watched field changes, the loadFn is called to produce new options. Mutually exclusive with static choices -- use one or the other.",
    },
    {
      name: 'enableSearch',
      type: 'boolean',
      default: 'undefined',
      description:
        'When true, enables a search/filter input inside the dropdown for filtering through long option lists. Useful when the select has more than 10-15 options. Uses Fuse.js for fuzzy matching.',
    },
  ];

  multiSelectFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'choices',
      type: 'string[] | FormSelectOption[] | Observable<FormSelectOption[]>',
      default: 'undefined',
      description:
        'The list of options available for multi-selection. Same format as SelectFieldOptions.choices. String arrays are auto-converted to FormSelectOption objects. Selected values are stored as an array.',
    },
    {
      name: 'optionsFrom',
      type: 'OptionsFromConfig',
      default: 'undefined',
      description:
        "Dynamic option loading configuration, identical to SelectFieldOptions.optionsFrom. The loadFn receives the watched field's value and returns options. Previously selected values are cleared when the watched field changes (unless clearOnChange is false).",
    },
    {
      name: 'enableSearch',
      type: 'boolean',
      default: 'undefined',
      description:
        'Enables a search/filter input inside the multi-select dropdown. Works the same as in single select mode. Particularly useful for multi-selects with many options.',
    },
  ];

  radioFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'choices',
      type: 'string[] | FormSelectOption[] | Observable<FormSelectOption[]>',
      default: 'undefined',
      description:
        'The list of radio button options. Each choice renders as an individual radio button in the group. String arrays are auto-converted to FormSelectOption objects with matching value and label.',
    },
    {
      name: 'optionsFrom',
      type: 'OptionsFromConfig',
      default: 'undefined',
      description:
        "Dynamic option loading for radio buttons, identical to select field's optionsFrom. The radio group re-renders when new options are loaded from the watched field.",
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      default: 'undefined',
      description:
        'Controls whether radio buttons are laid out in a horizontal row or a vertical stack. Defaults to the component\'s built-in layout. Use "horizontal" for short lists (2-4 items) and "vertical" for longer ones.',
    },
  ];

  textareaFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'rows',
      type: 'number',
      default: '3',
      description:
        'The number of visible text rows in the textarea. Controls the initial height of the textarea element. Users can typically resize the textarea beyond this initial size.',
    },
    {
      name: 'cols',
      type: 'number',
      default: 'undefined',
      description:
        'The number of visible character columns in the textarea. Controls the initial width. In most cases, the textarea width is controlled by CSS (colSpan or width) rather than this attribute.',
    },
    {
      name: 'minLength',
      type: 'number',
      default: 'undefined',
      description: "Minimum number of characters required. Adds Angular's minLength validator, same behavior as in TextFieldOptions.",
    },
    {
      name: 'maxLength',
      type: 'number',
      default: 'undefined',
      description: "Maximum number of characters allowed. Adds Angular's maxLength validator. The browser may also enforce this natively.",
    },
  ];

  fileFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'accept',
      type: 'string',
      default: '"*/*"',
      description:
        'A comma-separated list of MIME types or file extensions that the file input accepts (e.g., "image/*", ".pdf,.doc", "application/json"). Controls the file picker filter. Defaults to accepting all file types.',
    },
    {
      name: 'multiple',
      type: 'boolean',
      default: 'undefined',
      description:
        'When true, allows selecting multiple files at once. The form value becomes a FileList containing all selected files instead of a single file.',
    },
  ];

  dateFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'isRange',
      type: 'boolean',
      default: 'undefined',
      description:
        'When true, enables date range selection mode in the datepicker. The user picks a start date and end date. The form value becomes an object with start and end properties instead of a single date string.',
    },
  ];

  hiddenFieldOptionsDocs: ApiDocEntry[] = [
    {
      name: 'defaultValue',
      type: 'any',
      default: 'undefined',
      description:
        'The value for the hidden field. Since hidden fields have no user input, defaultValue is the only way to set their value. Commonly used for record IDs, CSRF tokens, or other metadata that needs to be included in form submission.',
    },
  ];

  optionsFromConfigDocs: ApiDocEntry[] = [
    {
      name: 'field',
      type: 'string',
      description:
        "The key of the parent field to watch. When this field's value changes, the loadFn is called with the new value. For cascading selects, this creates a parent-child dependency chain (e.g., country -> state -> city).",
    },
    {
      name: 'loadFn',
      type: '(value: T, formValues: Record<string, any>) => FormSelectOption[] | Promise<...> | Observable<...>',
      description:
        "The function called when the watched field changes. Receives the watched field's new value and all current form values. Can return options synchronously, as a Promise (for API calls), or as an Observable. The field shows a loading state while the Promise/Observable resolves.",
    },
    {
      name: 'loadingPlaceholder',
      type: 'string',
      default: 'undefined',
      description:
        'Placeholder text displayed in the select dropdown while the loadFn Promise or Observable is resolving. Use this to give users feedback like "Loading states..." during async option loading.',
    },
    {
      name: 'clearOnChange',
      type: 'boolean',
      default: 'true',
      description:
        'Whether to clear the field\'s current value when the watched parent field changes. Defaults to true, which prevents stale selections (e.g., selecting "California" then changing country from "US" to "Canada"). Set to false to preserve the current value.',
    },
  ];

  // --- API tab: Conditional Logic sub-tab ---
  conditionShorthandDocs: ApiDocEntry[] = [
    {
      name: "'fieldKey'",
      type: 'string',
      description:
        'The simplest shorthand: just a field key string. Checks if the referenced field has a truthy value (not null, undefined, false, 0, or empty string). Example: showWhen: "hasAddress" shows the field when the "hasAddress" checkbox is checked.',
    },
    {
      name: "['fieldKey', value]",
      type: '[string, any]',
      description:
        'A tuple that checks if the referenced field equals the given value using strict equality. Example: showWhen: ["accountType", "business"] shows the field only when accountType equals "business". Works with strings, numbers, booleans, and null.',
    },
    {
      name: "['fieldKey', (val, formValues?) => boolean]",
      type: '[string, Function]',
      description:
        'A tuple with a custom predicate function for advanced conditions. The function receives the watched field\'s value and optionally all form values. Return true to satisfy the condition. Example: showWhen: ["age", (age) => age >= 18] shows the field only when age is 18 or older.',
    },
  ];

  conditionalOperatorDocs: ApiDocEntry[] = [
    {
      name: 'equals',
      type: "'equals'",
      description:
        'Checks if the field value strictly equals the condition value. This is the default operator used by the [key, value] shorthand. Example: { field: "type", operator: "equals", value: "business" }.',
    },
    {
      name: 'not-equals',
      type: "'not-equals'",
      description:
        'Checks if the field value does NOT equal the condition value. The inverse of "equals". Example: { field: "role", operator: "not-equals", value: "guest" } matches all roles except "guest".',
    },
    {
      name: 'contains',
      type: "'contains'",
      description:
        'Checks if the field value (string or array) contains the condition value. For strings, performs a substring check. For arrays (multiselect), checks if the value is in the array. Example: { field: "tags", operator: "contains", value: "urgent" }.',
    },
    {
      name: 'greater-than',
      type: "'greater-than'",
      description:
        'Checks if the field value is numerically greater than the condition value. Use with number or range fields. Example: { field: "quantity", operator: "greater-than", value: 10 } matches when quantity > 10.',
    },
    {
      name: 'less-than',
      type: "'less-than'",
      description:
        'Checks if the field value is numerically less than the condition value. Use with number or range fields. Example: { field: "age", operator: "less-than", value: 18 } matches when age < 18.',
    },
    {
      name: 'in',
      type: "'in'",
      description:
        'Checks if the field value is included in an array of allowed values. Example: { field: "country", operator: "in", value: ["US", "CA", "MX"] } matches any of those three countries.',
    },
    {
      name: 'not-in',
      type: "'not-in'",
      description:
        'Checks if the field value is NOT in an array of values. The inverse of "in". Example: { field: "status", operator: "not-in", value: ["archived", "deleted"] } matches all statuses except those two.',
    },
    {
      name: 'function',
      type: "'function'",
      description:
        'Delegates evaluation to a custom function provided as the condition value. The function receives (fieldValue, formValues, formGroup?) and returns a boolean. This is the most flexible operator for complex multi-field logic.',
    },
  ];

  conditionalLogicExampleCode = `// Show a field when another field has a specific value
field.text('companyName', 'Company Name', {
  showWhen: ['accountType', 'business'],
  requiredWhen: ['accountType', 'business'],
}),

// Show a field when a checkbox is checked (truthy shorthand)
field.text('referralCode', 'Referral Code', {
  showWhen: ['hasReferral', true],
  requiredWhen: ['hasReferral', true],
}),

// Hide a field under a condition
field.text('internalNotes', 'Internal Notes', {
  hideWhen: ['role', 'guest'],
}),

// Disable a field based on another value
field.email('backupEmail', 'Backup Email', {
  disabledWhen: ['contactMethod', 'phone'],
}),

// Custom function condition
field.number('discount', 'Discount %', {
  showWhen: ['totalAmount', (amount) => amount > 1000],
}),

// Custom function with access to all form values
field.text('specialField', 'Special Field', {
  showWhen: ['category', (cat, formValues) => {
    return cat === 'premium' && formValues?.['tier'] === 'gold';
  }],
}),`;

  // --- API tab: Layout & Validation sub-tab ---
  createFormInputDocs: ApiDocEntry[] = [
    {
      name: 'title',
      type: 'string',
      default: 'undefined',
      description:
        'Optional title displayed above the form. Rendered as a heading element. Useful for labeling standalone forms or wizard sections.',
    },
    {
      name: 'description',
      type: 'string',
      default: 'undefined',
      description:
        'Optional description text displayed below the title and above the form fields. Provides context or instructions for the user.',
    },
    {
      name: 'layout',
      type: "'vertical' | 'horizontal' | 'grid'",
      default: "'vertical'",
      description:
        'The form layout mode. "vertical" stacks labels above inputs (default). "horizontal" places labels to the left of inputs. "grid" uses a CSS grid with configurable columns and colSpan per field. Use the layout.* helpers to set this.',
    },
    {
      name: 'gridColumns',
      type: 'number',
      default: 'undefined',
      description:
        'Number of grid columns (1-12) when layout is "grid". Each field\'s colSpan determines how many of these columns it occupies. Common value is 12 for a flexible 12-column grid. Ignored for vertical and horizontal layouts.',
    },
    {
      name: 'gap',
      type: "'sm' | 'md' | 'lg'",
      default: 'undefined',
      description:
        'Controls the spacing between form fields. "sm" applies tight spacing, "md" is balanced, and "lg" adds generous spacing. Applies to all layout modes.',
    },
    {
      name: 'labelWidth',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      default: 'undefined',
      description:
        'Controls the width of labels in horizontal layout mode. "sm" is narrow, "xl" is wide. Has no effect in vertical or grid layouts. Set via layout.horizontal({ labelWidth: "md" }).',
    },
    {
      name: 'autoSave',
      type: 'boolean | AutoSaveConfig',
      default: 'undefined',
      description:
        'Enables auto-saving of form data to localStorage or an API backend. Pass true for defaults or an AutoSaveConfig object for fine-grained control (debounce, storage type, clear on submit). Requires provideFormState() in app providers.',
    },
    {
      name: 'fields',
      type: 'FormFieldConfig[]',
      default: 'undefined',
      description:
        'Array of field configurations for a flat (non-wizard) form. Created using field.* builder functions. Either fields or steps must be provided, not both.',
    },
    {
      name: 'steps',
      type: 'FormStep[]',
      default: 'undefined',
      description:
        'Array of step definitions for wizard/stepper mode. Each step contains its own fields array. Created using the step.create() and step.review() helpers. Either steps or fields must be provided, not both.',
    },
    {
      name: 'stepperConfig',
      type: 'Partial<StepperConfig>',
      default: 'undefined',
      description:
        'Configuration for the stepper UI when using wizard mode (steps). Controls linear navigation, step validation, step numbers, and button text. Only used when steps are provided. Defaults include linear=true, validateStepOnNext=true, showStepSummary=true.',
    },
    {
      name: 'onSubmit',
      type: '(data: FormSubmissionData) => void',
      default: 'undefined',
      description:
        'Callback invoked when the form is submitted. Receives a FormSubmissionData object containing all form values, validation status, errors, and step metadata. Called in addition to the formSubmit output event.',
    },
    {
      name: 'onReset',
      type: '() => void',
      default: 'undefined',
      description:
        'Callback invoked when the form is reset. Takes no arguments. Called in addition to the formReset output event. Use for side effects like clearing related component state.',
    },
    {
      name: 'onChange',
      type: '(values: Record<string, unknown>) => void',
      default: 'undefined',
      description:
        'Callback invoked every time any form value changes. Receives the entire form values object. Called in addition to the formChange output event. Fires on every keystroke, so debounce expensive operations.',
    },
  ];

  layoutHelperDocs: ApiDocEntry[] = [
    {
      name: 'layout.vertical()',
      type: '(options?: { gap?: "sm" | "md" | "lg" }) => { layout, gap }',
      description:
        'Returns a config partial for vertical layout where labels appear above inputs and fields are stacked. This is the default layout. Spread into createForm(): ...layout.vertical({ gap: "md" }).',
    },
    {
      name: 'layout.horizontal()',
      type: '(options?: { gap?, labelWidth? }) => { layout, gap, labelWidth }',
      description:
        'Returns a config partial for horizontal layout where labels appear to the left of inputs. Supports labelWidth ("sm" | "md" | "lg" | "xl") to control label column width. Spread into createForm(): ...layout.horizontal({ labelWidth: "md" }).',
    },
    {
      name: 'layout.grid()',
      type: '(columns?: number, options?: { gap? }) => { layout, gridColumns, gap }',
      description:
        'Returns a config partial for CSS grid layout. The columns parameter (default: 2) sets the grid column count. Fields use colSpan to control their width within the grid. Spread into createForm(): ...layout.grid(12, { gap: "md" }).',
    },
  ];

  validationHelperDocs: ApiDocEntry[] = [
    {
      name: 'validation.required()',
      type: '(min?: number, max?: number) => { required, minLength?, maxLength? }',
      description:
        'Returns a spreadable options object that sets required=true along with optional minLength and maxLength constraints. Usage: field.text("name", "Name", { ...validation.required(2, 50) }).',
    },
    {
      name: 'validation.email()',
      type: '(required?: boolean) => { required, email }',
      description:
        'Returns a spreadable options object that enables email validation. The required parameter defaults to true. Usage: field.email("email", "Email", { ...validation.email() }).',
    },
    {
      name: 'validation.password()',
      type: '(minLength?: number, strongPassword?: boolean) => { required, minLength, pattern? }',
      description:
        'Returns a spreadable options object for password fields. Sets required=true and configurable minLength (default: 8). When strongPassword=true, adds a pattern requiring uppercase, lowercase, digits, and special characters.',
    },
    {
      name: 'validation.number()',
      type: '(min?: number, max?: number, required?: boolean) => { required, min?, max? }',
      description:
        'Returns a spreadable options object for numeric fields. Sets min/max bounds and required (default: true). Usage: field.number("age", "Age", { ...validation.number(18, 120) }).',
    },
    {
      name: 'validation.custom()',
      type: '(...validators: ValidatorFn[]) => { customValidators }',
      description:
        'Returns a spreadable options object containing an array of custom Angular ValidatorFn functions. Usage: field.text("code", "Code", { ...validation.custom(myValidator, anotherValidator) }).',
    },
  ];

  layoutOptionsDocs: ApiDocEntry[] = [
    {
      name: 'gap',
      type: "'sm' | 'md' | 'lg'",
      default: 'undefined',
      description:
        'Spacing between form fields. "sm" applies minimal gap, "md" is a balanced default, and "lg" creates generous spacing. Applied via CSS gap utility classes on the form container.',
    },
    {
      name: 'labelWidth',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      default: 'undefined',
      description:
        'Width of labels in horizontal layout. Maps to CSS width classes. "sm" is approximately 80px, "md" is 120px, "lg" is 160px, "xl" is 200px. Only applies in horizontal layout mode.',
    },
    {
      name: 'gridColumns',
      type: 'number (1-12)',
      default: '2',
      description:
        'Number of columns in the CSS grid. Set via layout.grid(columns). A 12-column grid offers the most flexibility (fields can span 1-12 columns). Only applies in grid layout mode.',
    },
    {
      name: 'colSpan',
      type: 'number | ResponsiveColSpan',
      default: 'undefined',
      description:
        'Per-field grid column span. A number (1-12) for fixed width, or a ResponsiveColSpan object { default, sm, md, lg, xl, 2xl } for breakpoint-specific widths. Example: { default: 12, md: 6 } means full-width on mobile, half-width on medium screens.',
    },
    {
      name: 'width',
      type: 'FieldWidth',
      default: 'undefined',
      description:
        'Per-field width for non-grid layouts. Accepts "full" (100%), "1/2" (50%), "1/3" (33%), "1/4" (25%), "2/3" (67%), "3/4" (75%), or "auto". Only applies in vertical and horizontal layouts.',
    },
    {
      name: 'ResponsiveColSpan',
      type: '{ default?, sm?, md?, lg?, xl?, 2xl? }',
      default: '-',
      description:
        'Object defining column span at different breakpoints. Each key maps to a Tailwind breakpoint. The "default" key applies below the smallest specified breakpoint. Values are column counts (1-12).',
    },
  ];

  // --- API tab: Types sub-tab ---
  typeFormSubmissionData = `interface FormSubmissionData {
  readonly values: Record<string, any>;   // All form values keyed by field key
  readonly valid: boolean;                // Whether the entire form passed validation
  readonly errors: Record<string, string[]>; // Validation errors keyed by field key
  readonly completedSteps?: string[];     // Completed step names (wizard mode only)
  readonly currentStep?: string;          // Current step name (wizard mode only)
}`;

  typeFormSelectOption = `interface FormSelectOption<T = any> {
  readonly value: T;          // The value submitted when this option is selected
  readonly label: string;     // The display text shown in the dropdown
  readonly disabled?: boolean; // Whether this option is non-selectable
  readonly group?: string;    // Optional group name for grouped option lists
}`;

  typeOptionsFromConfig = `interface OptionsFromConfig<T = any> {
  readonly field: string;     // Key of the parent field to watch
  readonly loadFn: (
    value: T,
    formValues: Record<string, any>
  ) => FormSelectOption[]      // Sync return
   | Promise<FormSelectOption[]>  // Async return
   | Observable<FormSelectOption[]>; // Observable return
  readonly loadingPlaceholder?: string; // Text shown while loading
  readonly clearOnChange?: boolean;     // Clear value on parent change (default: true)
}`;

  typeBaseFieldOptions = `interface BaseFieldOptions {
  placeholder?: string;
  defaultValue?: any;
  helpText?: string;
  colSpan?: number | ResponsiveColSpan;
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
  focusOnLoad?: boolean;
  showWhen?: ConditionShorthand;
  hideWhen?: ConditionShorthand;
  requiredWhen?: ConditionShorthand;
  disabledWhen?: ConditionShorthand;
  customValidators?: ValidatorFn[];
}

// ConditionShorthand =
//   | string                              // truthy check
//   | [string, any]                       // equality check
//   | [string, (val, formValues?) => boolean]  // custom function`;

  typeSelectFieldOptions = `interface SelectFieldOptions extends BaseFieldOptions {
  choices?: string[]                     // Auto-converted to { value, label }
         | FormSelectOption[]            // Full control over value/label
         | Observable<FormSelectOption[]>; // Async options
  optionsFrom?: OptionsFromConfig; // Dynamic loading from parent field
  enableSearch?: boolean;          // Enable search/filter in dropdown
}`;

  typeConditionalLogic = `interface ConditionalLogic {
  readonly field: string;    // The field key to evaluate
  readonly operator:
    | 'equals'       // field === value
    | 'not-equals'   // field !== value
    | 'contains'     // field includes value (string/array)
    | 'greater-than' // field > value
    | 'less-than'    // field < value
    | 'in'           // value.includes(field)
    | 'not-in'       // !value.includes(field)
    | 'function';    // value(fieldValue, formValues) => boolean
  readonly value: any | ((fieldValue: any, formValues: Record<string, any>) => boolean);
}`;

  typeResponsiveColSpan = `interface ResponsiveColSpan {
  readonly default?: number; // Base column span (below smallest breakpoint)
  readonly sm?: number;      // >= 640px
  readonly md?: number;      // >= 768px
  readonly lg?: number;      // >= 1024px
  readonly xl?: number;      // >= 1280px
  readonly '2xl'?: number;   // >= 1536px
}

// Example: { default: 12, md: 6, lg: 4 }
// Mobile: full-width, Tablet: half-width, Desktop: one-third`;

  typeFieldWidth = `type FieldWidth =
  | 'full'  // 100% width
  | '1/2'   // 50% width
  | '1/3'   // 33.33% width
  | '1/4'   // 25% width
  | '2/3'   // 66.67% width
  | '3/4'   // 75% width
  | 'auto'; // Automatic width based on content`;

  typeAutoSaveConfig = `interface AutoSaveConfig {
  readonly enabled: boolean;         // Must be true to activate auto-save
  readonly formId: string;           // Unique ID for storage key (must be unique per form)
  readonly debounceMs?: number;      // Debounce delay in ms before saving (default varies)
  readonly clearOnSubmit?: boolean;  // Clear saved data after successful submit
  readonly storage?: 'api' | 'localStorage'; // Storage backend (default: 'localStorage')
}

// Requires provideFormState() in application providers.
// Simple usage: autoSave: true (uses defaults)
// Full usage:   autoSave: { enabled: true, formId: 'my-form', debounceMs: 1000 }`;

  typeFormController = `interface FormController {
  readonly config: Signal<FormConfig>; // Reactive config signal - pass to [config] input
  readonly submit: () => void;         // Trigger form submission from outside the component
  readonly reset: () => void;          // Reset all form values from outside the component
}

// Usage:
// const form = createForm({ ... });
// form.config()   // Read the signal value for the template
// form.submit()   // Call in button click handlers
// form.reset()    // Call to clear the form`;

  typeStepChangeEvent = `interface StepChangeEvent {
  readonly previousStep: string | null;          // Name of the previous step (null on initial)
  readonly currentStep: string;                  // Name of the newly active step
  readonly stepIndex: number;                    // Zero-based index of the new step
  readonly formValues: Record<string, any>;      // Snapshot of all form values at transition
}`;
}
