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
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box">
          <input type="radio" name="wizard_api_tabs" role="tab" class="tab" aria-label="Stepper Component"
            [checked]="apiTab() === 'stepper-component'" (change)="apiTab.set('stepper-component')" />
          <input type="radio" name="wizard_api_tabs" role="tab" class="tab" aria-label="Step Builder"
            [checked]="apiTab() === 'step-builder'" (change)="apiTab.set('step-builder')" />
          <input type="radio" name="wizard_api_tabs" role="tab" class="tab" aria-label="Configuration"
            [checked]="apiTab() === 'configuration'" (change)="apiTab.set('configuration')" />
          <input type="radio" name="wizard_api_tabs" role="tab" class="tab" aria-label="Types"
            [checked]="apiTab() === 'types'" (change)="apiTab.set('types')" />
        </div>

        <!-- Stepper Component sub-tab -->
        @if (apiTab() === 'stepper-component') {
          <div class="space-y-6">
            <app-api-table title="Stepper Inputs" [entries]="stepperInputDocs" />
            <app-api-table title="Stepper Outputs" [entries]="stepperOutputDocs" />
            <app-api-table title="Stepper Methods" [entries]="stepperMethodDocs" />
          </div>
        }

        <!-- Step Builder sub-tab -->
        @if (apiTab() === 'step-builder') {
          <div class="space-y-6">
            <app-api-table title="step.* Builder Functions" [entries]="stepBuilderDocs" />

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Builder Usage</h3>
                <p class="text-sm text-base-content/70">
                  The <code>step.create()</code> and <code>step.review()</code> helpers create step definitions for use inside <code>createForm({{ '{' }} steps: [...] {{ '}' }})</code>. Each step groups related fields together and supports an optional description and optional flag.
                </p>
                <app-code-block [code]="builderCode" />
              </div>
            </div>
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="stepperConfig Options" [entries]="stepperConfigDocs" />
            <app-api-table title="Step Options (3rd argument to step.create)" [entries]="stepOptionsDocs" />
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">StepChangeEvent</h3>
                <p class="text-sm text-base-content/70">
                  Emitted by the <code>(stepChange)</code> output whenever the active step changes. Contains both the previous and current step indices.
                </p>
                <app-code-block [code]="typeStepChangeEvent" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">StepDefinition</h3>
                <p class="text-sm text-base-content/70">
                  Describes a single step in the wizard. Created internally by the <code>step.create()</code> and <code>step.review()</code> builder functions and consumed by the stepper component.
                </p>
                <app-code-block [code]="typeStepDefinition" />
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class WizardDemoComponent {
  private toast = inject(ToastService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<WizardTab>('linear');
  apiTab = signal<'stepper-component' | 'step-builder' | 'configuration' | 'types'>('stepper-component');
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
          field.select('gender', 'Gender', { choices: ['Male', 'Female', 'Other', 'Prefer not to say'] }),
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
          field.select('country', 'Country', {
            choices: ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France'],
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
          field.select('contactMethod', 'Preferred Contact Method', {
            choices: [
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'sms', label: 'SMS' },
            ],
          }),
          field.select('frequency', 'Communication Frequency', {
            choices: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ],
          }),
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
        field.select('visibility', 'Visibility', { choices: ['Everyone', 'Team only', 'Private'] }),
      ]),
      step.create('team', 'Team', [
        field.multiSelect('members', 'Team Members', { choices: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'] }),
        field.select('lead', 'Project Lead', { choices: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'] }),
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
    { name: 'goToStep(index)', type: 'void', description: 'Navigate to a specific step by its zero-based index. In linear mode, only allows navigation to completed steps or the next incomplete step.' },
    { name: 'onNext()', type: 'void', description: 'Navigate to the next step. When validateStepOnNext is enabled, validates the current step before allowing navigation.' },
    { name: 'onPrevious()', type: 'void', description: 'Navigate to the previous step. Always allowed regardless of linear mode or validation settings.' },
    { name: 'onComplete()', type: 'void', description: 'Mark the stepper as complete and trigger the form onSubmit callback with all collected data from every step.' },
    { name: 'isStepCompleted(index)', type: 'boolean', description: 'Returns whether the step at the given index has been completed (all its fields pass validation).' },
    { name: 'isStepActive(index)', type: 'boolean', description: 'Returns whether the step at the given index is currently visible and active.' },
    { name: 'canNavigateToStep(index)', type: 'boolean', description: 'Returns whether navigation to the given step index is permitted based on the current linear mode and step completion state.' },
  ];

  stepBuilderDocs: ApiDocEntry[] = [
    { name: 'step.create(key, label, fields, opts?)', type: 'StepDefinition', description: 'Create a standard wizard step with a unique key, display label, array of field definitions, and optional configuration. Fields are validated as a group when the user navigates forward.' },
    { name: 'step.review(key, label)', type: 'StepDefinition', description: 'Create a review step that auto-generates a summary of all previously entered data. Typically placed as the last step so users can verify their inputs before submitting.' },
  ];

  stepperConfigDocs: ApiDocEntry[] = [
    { name: 'linear', type: 'boolean', default: 'true', description: 'Enforce sequential step completion. When true, users must complete each step before advancing. When false, users can jump freely between steps.' },
    { name: 'validateStepOnNext', type: 'boolean', default: 'true', description: 'Run field validation on the current step when the user clicks Next. Invalid fields are highlighted and navigation is blocked until errors are resolved.' },
    { name: 'showStepSummary', type: 'boolean', default: 'true', description: 'Display a summary of completed step values in the review step. Each step renders its label and the values the user entered.' },
  ];

  stepOptionsDocs: ApiDocEntry[] = [
    { name: 'description', type: 'string', default: '-', description: 'Optional description text displayed below the step label in the stepper indicator. Provides context about what the step covers.' },
    { name: 'optional', type: 'boolean', default: 'false', description: 'Mark the step as optional. Optional steps can be skipped without completing their fields, and the stepper indicator shows an "Optional" badge.' },
  ];

  typeStepChangeEvent = `interface StepChangeEvent {
  previousIndex: number;
  currentIndex: number;
}`;

  typeStepDefinition = `interface StepDefinition {
  key: string;
  label: string;
  fields: FieldConfig[];
  description?: string;
  optional?: boolean;
  isReview?: boolean;
}`;
}
