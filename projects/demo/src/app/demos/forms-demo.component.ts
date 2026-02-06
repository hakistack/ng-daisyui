import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { DynamicFormComponent, createForm, field, layout, validation, ToastService, FormSubmissionData } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type FormTab = 'layouts' | 'fields' | 'conditional';

@Component({
  selector: 'app-forms-demo',
  imports: [DynamicFormComponent, JsonPipe, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Dynamic Forms</h1>
        <p class="text-base-content/70 mt-2">Build forms declaratively with automatic validation and layout</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} DynamicFormComponent, createForm, field {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-border">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box">
          <input type="radio" name="forms_tabs" role="tab" class="tab" aria-label="Layouts"
            [checked]="activeTab() === 'layouts'" (change)="activeTab.set('layouts')" />
          <input type="radio" name="forms_tabs" role="tab" class="tab" aria-label="Field Types"
            [checked]="activeTab() === 'fields'" (change)="activeTab.set('fields')" />
          <input type="radio" name="forms_tabs" role="tab" class="tab" aria-label="Conditional Logic"
            [checked]="activeTab() === 'conditional'" (change)="activeTab.set('conditional')" />
        </div>

        @if (activeTab() === 'layouts') {
          <div class="space-y-6">
            <app-doc-section title="Vertical Layout (Default)" description="Standard stacked form layout" [codeExample]="verticalCode">
              <app-dynamic-form [config]="verticalForm.config()" />
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost" (click)="verticalForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="verticalForm.submit()">Submit</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Horizontal Layout" description="Labels alongside inputs" [codeExample]="horizontalCode">
              <app-dynamic-form [config]="horizontalForm.config()" />
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost" (click)="horizontalForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="horizontalForm.submit()">Submit</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Grid Layout" description="Responsive multi-column grid with colSpan control" [codeExample]="gridCode">
              <app-dynamic-form [config]="gridForm.config()" />
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost" (click)="gridForm.reset()">Reset</button>
                <button class="btn btn-primary" (click)="gridForm.submit()">Submit</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'fields') {
          <app-doc-section title="All Field Types" description="Showcase of available field types" [codeExample]="fieldTypesCode">
            <app-dynamic-form [config]="allFieldsForm.config()" />
            <div class="card-actions justify-end mt-4">
              <button class="btn btn-ghost" (click)="allFieldsForm.reset()">Reset</button>
              <button class="btn btn-primary" (click)="allFieldsForm.submit()">Submit</button>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'conditional') {
          <app-doc-section title="Conditional Logic" description="Fields that show/hide/require based on other values" [codeExample]="conditionalCode">
            <app-dynamic-form [config]="conditionalForm.config()" />
            <div class="card-actions justify-end mt-4">
              <button class="btn btn-ghost" (click)="conditionalForm.reset()">Reset</button>
              <button class="btn btn-primary" (click)="conditionalForm.submit()">Submit</button>
            </div>
          </app-doc-section>
        }

        @if (lastSubmission()) {
          <div class="card card-border bg-base-100">
            <div class="card-body gap-3">
              <h2 class="card-title">Last Submission</h2>
              <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ lastSubmission() | json }}</pre>
            </div>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Inputs" [entries]="inputDocs" />
          <app-api-table title="Outputs" [entries]="outputDocs" />
          <app-api-table title="Methods" [entries]="methodDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Builder: createForm() + field.*() helpers</h3>
            <app-code-block [code]="builderCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class FormsDemoComponent {
  private toast = inject(ToastService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<FormTab>('layouts');
  lastSubmission = signal<FormSubmissionData | null>(null);

  verticalForm = createForm({
    ...layout.vertical({ gap: 'md' }),
    fields: [
      field.text('name', 'Full Name', { required: true, placeholder: 'John Doe' }),
      field.email('email', 'Email Address', { required: true }),
      field.password('password', 'Password', { validation: validation.password(8) }),
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
      field.number('age', 'Age (Number)', { colSpan: 6, validation: validation.number(18, 120) }),
      field.text('phone', 'Phone', { colSpan: 6, placeholder: '(555) 123-4567' }),
      field.text('website', 'Website URL', { colSpan: 6, placeholder: 'https://example.com' }),
      field.textarea('bio', 'Biography (Textarea)', { colSpan: 12 }),
      field.select('country', ['USA', 'Canada', 'UK', 'Germany', 'France'], 'Country', { colSpan: 6 }),
      field.multiSelect(
        'languages',
        ['English', 'Spanish', 'French', 'German', 'Chinese'],
        'Languages Spoken',
        { colSpan: 6 }
      ),
      field.radio('gender', ['Male', 'Female', 'Other', 'Prefer not to say'], 'Gender', { colSpan: 6 }),
      field.checkbox('newsletter', 'Subscribe to newsletter', { colSpan: 6 }),
      field.toggle('notifications', 'Enable notifications', { colSpan: 6 }),
      field.date('birthdate', 'Birth Date', { colSpan: 6 }),
      field.range('satisfaction', 1, 10, 'Satisfaction (1-10)', { colSpan: 6, defaultValue: 5 }),
    ],
    onSubmit: (data) => this.handleSubmit('All Fields Form', data),
  });

  conditionalForm = createForm({
    ...layout.vertical({ gap: 'md' }),
    fields: [
      field.select('accountType', ['personal', 'business'], 'Account Type', { required: true }),
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
      field.select(
        'contactMethod',
        [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' },
          { value: 'mail', label: 'Postal Mail' },
        ],
        'Preferred Contact Method'
      ),
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
    field.password('password', 'Password', { validation: validation.password(8) }),
  ],
  onSubmit: (data) => console.log(data),
});

<app-dynamic-form [config]="form.config()" />
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
field.password('pw', 'Password', { validation: validation.password(8) })
field.number('age', 'Age', { validation: validation.number(18, 120) })
field.textarea('bio', 'Biography')
field.select('country', ['USA', 'Canada'], 'Country')
field.multiSelect('langs', ['English', 'Spanish'], 'Languages')
field.radio('gender', ['Male', 'Female'], 'Gender')
field.checkbox('agree', 'I agree')
field.toggle('notify', 'Enable notifications')
field.date('dob', 'Date of Birth')
field.range('score', 1, 10, 'Score', { defaultValue: 5 })`;

  conditionalCode = `field.select('type', ['personal', 'business'], 'Account Type'),
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

// Form controller returned by createForm()
const form = createForm({
  ...layout.grid(12),
  fields: [
    field.text('name', 'Name', { required: true, colSpan: 6 }),
    field.email('email', 'Email', { colSpan: 6 }),
  ],
  onSubmit: (data) => console.log(data),
});

// External control
form.config()    // Signal<FormConfig> - pass to [config]
form.submit()    // Trigger submission
form.reset()     // Reset form values`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    { name: 'config', type: 'FormConfig', description: 'Form configuration from createForm()' },
    { name: 'initialValues', type: 'Record<string, unknown>', default: '{}', description: 'Initial form values' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the entire form' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'formSubmit', type: 'FormSubmissionData', description: 'Emitted when form is submitted' },
    { name: 'formChange', type: 'Record<string, unknown>', description: 'Emitted when any form value changes' },
    { name: 'formReset', type: 'void', description: 'Emitted when form is reset' },
    { name: 'fieldChange', type: '{ field, value, formValues }', description: 'Emitted when a single field changes' },
    { name: 'formRestored', type: 'Record<string, unknown>', description: 'Emitted when auto-saved form is restored' },
    { name: 'stepChange', type: 'StepChangeEvent', description: 'Emitted when wizard step changes' },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'onSubmit()', type: 'void', description: 'Programmatically submit the form' },
    { name: 'onReset()', type: 'void', description: 'Reset all form values' },
    { name: 'nextStep()', type: 'void', description: 'Move to next wizard step' },
    { name: 'previousStep()', type: 'void', description: 'Move to previous wizard step' },
    { name: 'goToStep(index)', type: 'void', description: 'Navigate to a specific step' },
    { name: 'isStepValid(index)', type: 'boolean', description: 'Check if a step is valid' },
    { name: 'getFieldValue(key)', type: 'unknown', description: 'Get a field value by key' },
    { name: 'getFieldErrors(key)', type: 'string[]', description: 'Get validation errors for a field' },
  ];
}
