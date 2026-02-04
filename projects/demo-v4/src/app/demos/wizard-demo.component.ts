import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { DynamicFormComponent, createForm, field, step, ToastService, FormSubmissionData } from '@hakistack/ng-daisyui-v4';

@Component({
  selector: 'app-wizard-demo',
  imports: [DynamicFormComponent, JsonPipe],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Form Wizard</h1>
        <p class="text-base-content/70 mt-2">Multi-step forms with validation, navigation, and review</p>
      </div>

      <!-- Basic Wizard -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">User Registration Wizard</h2>
          <p class="text-sm text-base-content/60 mb-4">Step-by-step registration with validation</p>

          <app-dynamic-form [config]="registrationWizard.config()" (stepChange)="onStepChange($event)" />
        </div>
      </div>

      <!-- Non-linear Wizard -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Non-linear Wizard</h2>
          <p class="text-sm text-base-content/60 mb-4">Jump to any step without completing previous steps</p>

          <app-dynamic-form [config]="nonLinearWizard.config()" />
        </div>
      </div>

      <!-- Form Output -->
      @if (lastSubmission()) {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Wizard Submission</h2>
            <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ lastSubmission() | json }}</pre>
          </div>
        </div>
      }

      <!-- Step Info -->
      @if (currentStep()) {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Step Change Event</h2>
            <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ currentStep() | json }}</pre>
          </div>
        </div>
      }
    </div>
  `,
})
export class WizardDemoComponent {
  private toast = inject(ToastService);
  lastSubmission = signal<FormSubmissionData | null>(null);
  currentStep = signal<unknown>(null);

  // Registration wizard
  registrationWizard = createForm({
    steps: [
      step.create(
        'account',
        'Account Info',
        [
          field.email('email', 'Email Address', { required: true }),
          field.password('password', 'Password', { required: true, helpText: 'At least 8 characters' }),
          field.password('confirmPassword', 'Confirm Password', { required: true }),
        ],
        { description: 'Create your account credentials' }
      ),
      step.create(
        'personal',
        'Personal Info',
        [
          field.text('firstName', 'First Name', { required: true }),
          field.text('lastName', 'Last Name', { required: true }),
          field.date('birthdate', 'Date of Birth'),
          field.select('gender', ['Male', 'Female', 'Other', 'Prefer not to say'], 'Gender'),
        ],
        { description: 'Tell us about yourself' }
      ),
      step.create(
        'address',
        'Address',
        [
          field.textarea('street', 'Street Address', { required: true }),
          field.text('city', 'City', { required: true }),
          field.text('state', 'State/Province', { required: true }),
          field.text('postalCode', 'Postal Code', { required: true }),
          field.select('country', ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France'], 'Country', {
            required: true,
          }),
        ],
        { description: 'Where should we ship to?' }
      ),
      step.create(
        'preferences',
        'Preferences',
        [
          field.checkbox('newsletter', 'Subscribe to newsletter'),
          field.checkbox('marketing', 'Receive marketing communications'),
          field.select(
            'contactMethod',
            [
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'sms', label: 'SMS' },
            ],
            'Preferred Contact Method'
          ),
        ],
        { description: 'Set your communication preferences', optional: true }
      ),
      step.review('review', 'Review & Submit'),
    ],
    stepperConfig: {
      linear: true,
      validateStepOnNext: true,
      showStepSummary: true,
    },
    onSubmit: (data) => {
      this.lastSubmission.set(data);
      this.toast.success('Registration complete!', 'Welcome aboard!');
      console.log('Registration data:', data);
    },
  });

  // Non-linear wizard
  nonLinearWizard = createForm({
    steps: [
      step.create('basics', 'Basic Info', [
        field.text('projectName', 'Project Name', { required: true }),
        field.textarea('description', 'Description'),
      ]),
      step.create('settings', 'Settings', [
        field.toggle('isPublic', 'Make project public'),
        field.toggle('enableComments', 'Enable comments'),
        field.select('visibility', ['Everyone', 'Team only', 'Private'], 'Visibility'),
      ]),
      step.create('team', 'Team', [field.select('lead', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'], 'Project Lead')]),
    ],
    stepperConfig: {
      linear: false,
      validateStepOnNext: false,
    },
    onSubmit: (data) => {
      this.lastSubmission.set(data);
      this.toast.success('Project created!');
      console.log('Project data:', data);
    },
  });

  onStepChange(event: unknown) {
    this.currentStep.set(event);
  }
}
