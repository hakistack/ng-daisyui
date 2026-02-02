import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { DynamicFormComponent, createForm, field, layout, validation, ToastService, FormSubmissionData } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-forms-demo',
  imports: [DynamicFormComponent, JsonPipe],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Dynamic Forms</h1>
        <p class="text-base-content/70 mt-2">Build forms declaratively with automatic validation and layout</p>
      </div>

      <!-- Vertical Layout -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Vertical Layout (Default)</h2>
          <p class="text-sm text-base-content/60 mb-4">Standard stacked form layout</p>

          <app-dynamic-form [config]="verticalForm.config()" />

          <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost" (click)="verticalForm.reset()">Reset</button>
            <button class="btn btn-primary" (click)="verticalForm.submit()">Submit</button>
          </div>
        </div>
      </div>

      <!-- Horizontal Layout -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Horizontal Layout</h2>
          <p class="text-sm text-base-content/60 mb-4">Labels alongside inputs</p>

          <app-dynamic-form [config]="horizontalForm.config()" />

          <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost" (click)="horizontalForm.reset()">Reset</button>
            <button class="btn btn-primary" (click)="horizontalForm.submit()">Submit</button>
          </div>
        </div>
      </div>

      <!-- Grid Layout -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Grid Layout</h2>
          <p class="text-sm text-base-content/60 mb-4">Responsive multi-column grid with colSpan control</p>

          <app-dynamic-form [config]="gridForm.config()" />

          <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost" (click)="gridForm.reset()">Reset</button>
            <button class="btn btn-primary" (click)="gridForm.submit()">Submit</button>
          </div>
        </div>
      </div>

      <!-- All Field Types -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">All Field Types</h2>
          <p class="text-sm text-base-content/60 mb-4">Showcase of available field types</p>

          <app-dynamic-form [config]="allFieldsForm.config()" />

          <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost" (click)="allFieldsForm.reset()">Reset</button>
            <button class="btn btn-primary" (click)="allFieldsForm.submit()">Submit</button>
          </div>
        </div>
      </div>

      <!-- Conditional Logic -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Conditional Logic</h2>
          <p class="text-sm text-base-content/60 mb-4">Fields that show/hide/require based on other values</p>

          <app-dynamic-form [config]="conditionalForm.config()" />

          <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost" (click)="conditionalForm.reset()">Reset</button>
            <button class="btn btn-primary" (click)="conditionalForm.submit()">Submit</button>
          </div>
        </div>
      </div>

      <!-- Form Output -->
      @if (lastSubmission()) {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Last Submission</h2>
            <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ lastSubmission() | json }}</pre>
          </div>
        </div>
      }
    </div>
  `,
})
export class FormsDemoComponent {
  private toast = inject(ToastService);
  lastSubmission = signal<FormSubmissionData | null>(null);

  // Vertical layout form
  verticalForm = createForm({
    ...layout.vertical({ gap: 'md' }),
    fields: [
      field.text('name', 'Full Name', { required: true, placeholder: 'John Doe' }),
      field.email('email', 'Email Address', { required: true }),
      field.password('password', 'Password', { validation: validation.password(8) }),
    ],
    onSubmit: (data) => this.handleSubmit('Vertical Form', data),
  });

  // Horizontal layout form
  horizontalForm = createForm({
    ...layout.horizontal({ labelWidth: 'md', gap: 'md' }),
    fields: [
      field.text('username', 'Username', { required: true }),
      field.email('email', 'Email', { required: true }),
      field.text('phone', 'Phone Number', { placeholder: '(555) 123-4567' }),
    ],
    onSubmit: (data) => this.handleSubmit('Horizontal Form', data),
  });

  // Grid layout form
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

  // All field types
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

  // Conditional logic form
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
}
