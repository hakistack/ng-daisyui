import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { DynamicFormComponent, createForm, field, step, ToastService, FormSubmissionData } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type WizardTab = 'linear' | 'nonlinear';

@Component({
  selector: 'app-wizard-demo',
  imports: [DynamicFormComponent, JsonPipe, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Form Wizard</h1>
        <p class="text-base-content/70 mt-2">Multi-step forms with validation, navigation, and review</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} createForm, field, step {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
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
          <input type="radio" name="wizard_tabs" role="tab" class="tab" aria-label="Linear Wizard"
            [checked]="activeTab() === 'linear'" (change)="activeTab.set('linear')" />
          <input type="radio" name="wizard_tabs" role="tab" class="tab" aria-label="Non-linear Wizard"
            [checked]="activeTab() === 'nonlinear'" (change)="activeTab.set('nonlinear')" />
        </div>

        @if (activeTab() === 'linear') {
          <app-doc-section title="User Registration Wizard" description="Step-by-step registration with validation" [codeExample]="linearCode">
            <hk-dynamic-form [config]="registrationWizard.config()" (stepChange)="onStepChange($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'nonlinear') {
          <app-doc-section title="Non-linear Wizard" description="Jump to any step without completing previous steps" [codeExample]="nonLinearCode">
            <hk-dynamic-form [config]="nonLinearWizard.config()" />
          </app-doc-section>
        }

        @if (lastSubmission()) {
          <div class="card card-border bg-base-100">
            <div class="card-body gap-3">
              <h2 class="card-title">Wizard Submission</h2>
              <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ lastSubmission() | json }}</pre>
            </div>
          </div>
        }

        @if (currentStep()) {
          <div class="card card-border bg-base-100">
            <div class="card-body gap-3">
              <h2 class="card-title">Step Change Event</h2>
              <pre class="bg-base-200 p-4 rounded-lg text-sm overflow-auto">{{ currentStep() | json }}</pre>
            </div>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Stepper Inputs" [entries]="stepperInputDocs" />
          <app-api-table title="Stepper Outputs" [entries]="stepperOutputDocs" />
          <app-api-table title="Stepper Methods" [entries]="stepperMethodDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Builder: step.create() + step.review()</h3>
            <app-code-block [code]="builderCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class WizardDemoComponent {
  private toast = inject(ToastService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<WizardTab>('linear');
  lastSubmission = signal<FormSubmissionData | null>(null);
  currentStep = signal<unknown>(null);

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
          field.select(
            'frequency',
            [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ],
            'Communication Frequency'
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
      step.create('team', 'Team', [
        field.multiSelect('members', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'], 'Team Members'),
        field.select('lead', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'], 'Project Lead'),
      ]),
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

  // --- Code examples ---
  linearCode = `const wizard = createForm({
  steps: [
    step.create('account', 'Account Info', [
      field.email('email', 'Email', { required: true }),
      field.password('password', 'Password', { required: true }),
    ], { description: 'Create your account' }),
    step.create('personal', 'Personal Info', [
      field.text('firstName', 'First Name', { required: true }),
      field.text('lastName', 'Last Name', { required: true }),
    ]),
    step.review('review', 'Review & Submit'),
  ],
  stepperConfig: {
    linear: true,
    validateStepOnNext: true,
    showStepSummary: true,
  },
  onSubmit: (data) => console.log(data),
});

<hk-dynamic-form [config]="wizard.config()" (stepChange)="onStepChange($event)" />`;

  nonLinearCode = `const wizard = createForm({
  steps: [
    step.create('basics', 'Basic Info', [
      field.text('name', 'Project Name', { required: true }),
    ]),
    step.create('settings', 'Settings', [
      field.toggle('isPublic', 'Make project public'),
    ]),
  ],
  stepperConfig: {
    linear: false,         // Allow jumping between steps
    validateStepOnNext: false,
  },
  onSubmit: (data) => console.log(data),
});`;

  builderCode = `import { createForm, field, step } from '@hakistack/ng-daisyui';

// step.create(key, label, fields, options?)
step.create('info', 'Information', [
  field.text('name', 'Name', { required: true }),
], { description: 'Step description', optional: false })

// step.review(key, label) - auto-generates a review summary
step.review('review', 'Review & Submit')

// stepperConfig options
stepperConfig: {
  linear: true,              // Enforce step order
  validateStepOnNext: true,  // Validate before moving forward
  showStepSummary: true,     // Show summary in review step
}`;

  // --- API docs ---
  stepperInputDocs: ApiDocEntry[] = [
    { name: 'showStepNumbers', type: 'boolean', default: 'true', description: 'Show step numbers in the stepper' },
    { name: 'showStepIndicator', type: 'boolean', default: 'true', description: 'Show step indicator progress' },
    { name: 'showStateIcons', type: 'boolean', default: 'true', description: 'Show completion/error state icons' },
    { name: 'showCard', type: 'boolean', default: 'true', description: 'Wrap content in a card' },
    { name: 'animateContent', type: 'boolean', default: 'true', description: 'Animate content transitions between steps' },
    { name: 'previousButtonText', type: 'string', default: "'Previous'", description: 'Text for previous button' },
    { name: 'nextButtonText', type: 'string', default: "'Next'", description: 'Text for next button' },
    { name: 'completeButtonText', type: 'string', default: "'Complete'", description: 'Text for complete button' },
  ];

  stepperOutputDocs: ApiDocEntry[] = [
    { name: 'completed', type: 'void', description: 'Emitted when all steps are completed' },
    { name: 'stepChange', type: '{ previousIndex, currentIndex }', description: 'Emitted when step changes' },
  ];

  stepperMethodDocs: ApiDocEntry[] = [
    { name: 'goToStep(index)', type: 'void', description: 'Navigate to a specific step' },
    { name: 'onNext()', type: 'void', description: 'Navigate to next step' },
    { name: 'onPrevious()', type: 'void', description: 'Navigate to previous step' },
    { name: 'onComplete()', type: 'void', description: 'Complete the stepper' },
    { name: 'isStepCompleted(index)', type: 'boolean', description: 'Check if a step is completed' },
    { name: 'isStepActive(index)', type: 'boolean', description: 'Check if a step is active' },
    { name: 'canNavigateToStep(index)', type: 'boolean', description: 'Check if navigation to a step is allowed' },
  ];
}
