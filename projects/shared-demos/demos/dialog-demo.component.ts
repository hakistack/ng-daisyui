import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { delay } from 'rxjs';
import { DialogService, LucideIconComponent, SelectComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { DemoPageComponent } from '../shared/demo-page.component';
import { ApiDocEntry } from '../shared/api-table.types';

// ============================================================================
// Sample Dialog Components
// ============================================================================

@Component({
  selector: 'app-simple-dialog',
  imports: [LucideIconComponent],
  template: `
    <div class="card bg-base-100 w-full">
      <div class="card-body">
        <div class="flex justify-between items-center">
          <h2 class="card-title">Simple Dialog</h2>
          <button class="btn btn-ghost btn-sm btn-circle" (click)="close()">
            <hk-lucide-icon name="X" [size]="18" />
          </button>
        </div>
        <p class="text-base-content/70">This is a simple dialog with minimal content.</p>
        <div class="card-actions justify-end mt-4">
          <button class="btn btn-ghost" (click)="close()">Cancel</button>
          <button class="btn btn-primary" (click)="close('confirmed')">Confirm</button>
        </div>
      </div>
    </div>
  `,
})
export class SimpleDialogComponent {
  private dialogRef = inject(DialogRef);

  close(result?: string) {
    this.dialogRef.close(result);
  }
}

@Component({
  selector: 'app-data-dialog',
  imports: [LucideIconComponent],
  template: `
    <div class="card bg-base-100 w-full">
      <div class="card-body">
        <div class="flex justify-between items-center">
          <h2 class="card-title">
            <hk-lucide-icon name="User" [size]="24" />
            User Details
          </h2>
          <button class="btn btn-ghost btn-sm btn-circle" (click)="close()">
            <hk-lucide-icon name="X" [size]="18" />
          </button>
        </div>

        <div class="divider my-2"></div>

        <div class="space-y-3">
          <div class="flex gap-2">
            <span class="font-semibold w-20">ID:</span>
            <span>{{ data.id }}</span>
          </div>
          <div class="flex gap-2">
            <span class="font-semibold w-20">Name:</span>
            <span>{{ data.name }}</span>
          </div>
          <div class="flex gap-2">
            <span class="font-semibold w-20">Email:</span>
            <span>{{ data.email }}</span>
          </div>
          <div class="flex gap-2">
            <span class="font-semibold w-20">Role:</span>
            <span class="badge badge-primary">{{ data.role }}</span>
          </div>
        </div>

        <div class="card-actions justify-end mt-4">
          <button class="btn btn-primary" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `,
})
export class DataDialogComponent {
  data = inject(DIALOG_DATA) as { id: number; name: string; email: string; role: string };
  private dialogRef = inject(DialogRef);

  close() {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-form-dialog',
  imports: [LucideIconComponent, FormsModule, SelectComponent],
  template: `
    <div class="card bg-base-100 w-full">
      <div class="card-body">
        <div class="flex justify-between items-center">
          <h2 class="card-title">
            <hk-lucide-icon name="UserPlus" [size]="24" />
            {{ data?.mode === 'edit' ? 'Edit User' : 'Create User' }}
          </h2>
          <button class="btn btn-ghost btn-sm btn-circle" (click)="close()">
            <hk-lucide-icon name="X" [size]="18" />
          </button>
        </div>

        <div class="divider my-2"></div>

        <form class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Name</span>
            </label>
            <input type="text" class="input input-bordered w-full" placeholder="Enter name" [(ngModel)]="formData.name" name="name" />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input type="email" class="input input-bordered w-full" placeholder="Enter email" [(ngModel)]="formData.email" name="email" />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Role</span>
            </label>
            <hk-select [options]="roles" [(ngModel)]="formData.role" name="role" placeholder="Select role" />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Country</span>
            </label>
            <hk-select
              [options]="countries"
              [(ngModel)]="formData.country"
              name="country"
              placeholder="Select country"
              [enableSearch]="true"
            />
          </div>
        </form>

        <div class="card-actions justify-end mt-4">
          <button class="btn btn-ghost" (click)="close()">Cancel</button>
          <button class="btn btn-primary" (click)="save()">
            <hk-lucide-icon name="Save" [size]="18" />
            Save
          </button>
        </div>
      </div>
    </div>
  `,
})
export class FormDialogComponent {
  data = inject(DIALOG_DATA) as { mode: 'create' | 'edit'; user?: any } | null;
  private dialogRef = inject(DialogRef);

  formData = {
    name: this.data?.user?.name ?? '',
    email: this.data?.user?.email ?? '',
    role: this.data?.user?.role ?? '',
    country: this.data?.user?.country ?? '',
  };

  roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'support', label: 'Support Staff' },
  ];

  countries = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'mx', label: 'Mexico' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'es', label: 'Spain' },
    { value: 'it', label: 'Italy' },
    { value: 'jp', label: 'Japan' },
    { value: 'cn', label: 'China' },
    { value: 'kr', label: 'South Korea' },
    { value: 'au', label: 'Australia' },
    { value: 'br', label: 'Brazil' },
    { value: 'ar', label: 'Argentina' },
    { value: 'in', label: 'India' },
  ];

  close() {
    this.dialogRef.close();
  }

  save() {
    this.dialogRef.close(this.formData);
  }
}

@Component({
  selector: 'app-long-content-dialog',
  imports: [LucideIconComponent],
  template: `
    <div class="card bg-base-100 w-full">
      <div class="card-body">
        <div class="flex justify-between items-center">
          <h2 class="card-title">
            <hk-lucide-icon name="FileText" [size]="24" />
            Terms of Service
          </h2>
          <button class="btn btn-ghost btn-sm btn-circle" (click)="close()">
            <hk-lucide-icon name="X" [size]="18" />
          </button>
        </div>

        <div class="divider my-2"></div>

        <div class="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto">
          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.
            Additionally, when using this service's particular services, you shall be subject to any posted guidelines or rules applicable
            to such services.
          </p>

          <h3>2. Description of Service</h3>
          <p>
            The Service provides users with access to a rich collection of resources, including various communications tools, forums,
            shopping services, personalized content, and branded programming through its network of properties.
          </p>

          <h3>3. Registration Obligations</h3>
          <p>
            In consideration of your use of the Service, you agree to: (a) provide true, accurate, current, and complete information about
            yourself as prompted by the Service's registration form and (b) maintain and promptly update the Registration Data to keep it
            true, accurate, current, and complete.
          </p>

          <h3>4. User Account, Password, and Security</h3>
          <p>
            You will receive a password and account designation upon completing the Service's registration process. You are responsible for
            maintaining the confidentiality of the password and account and are fully responsible for all activities that occur under your
            password or account.
          </p>

          <h3>5. User Conduct</h3>
          <p>
            You understand that all information, data, text, software, music, sound, photographs, graphics, video, messages, tags, or other
            materials, whether publicly posted or privately transmitted, are the sole responsibility of the person from whom such Content
            originated.
          </p>

          <h3>6. Content Submitted</h3>
          <p>
            The Service does not claim ownership of Content you submit or make available for inclusion on the Service. However, with respect
            to Content you submit or make available for inclusion on publicly accessible areas of the Service, you grant the following
            worldwide, royalty-free, and non-exclusive license(s).
          </p>

          <h3>7. Indemnity</h3>
          <p>
            You agree to indemnify and hold the Service and its subsidiaries, affiliates, officers, agents, employees, partners, and
            licensors harmless from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out
            of Content you submit, post, transmit, or otherwise make available through the Service.
          </p>

          <h3>8. Modifications to Service</h3>
          <p>
            The Service reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the
            Service (or any part thereof) with or without notice. You agree that the Service shall not be liable to you or to any third
            party for any modification, suspension, or discontinuance of the Service.
          </p>
        </div>

        <div class="card-actions justify-end mt-4">
          <button class="btn btn-ghost" (click)="close()">Decline</button>
          <button class="btn btn-primary" (click)="close('accepted')">
            <hk-lucide-icon name="Check" [size]="18" />
            Accept
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LongContentDialogComponent {
  private dialogRef = inject(DialogRef);

  close(result?: string) {
    this.dialogRef.close(result);
  }
}

// ============================================================================
// Demo Component
// ============================================================================

type DialogTab = 'basic' | 'forms' | 'options';
type DialogApiTab = 'service' | 'config' | 'ref' | 'types';

@Component({
  selector: 'app-dialog-demo',
  imports: [LucideIconComponent, JsonPipe, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Dialog Service"
      description="Programmatic dialogs with component injection and data passing"
      icon="PanelTopOpen"
      category="Feedback"
      importName="DialogService"
    >
      <div examples>
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'forms'" (click)="activeTab.set('forms')">Forms</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'options'" (click)="activeTab.set('options')">Options</button>
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Basic Dialog" description="Simple dialog with confirm/cancel buttons" [codeExample]="basicCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-primary" (click)="openSimpleDialog()">
                  <hk-lucide-icon name="Square" [size]="18" />
                  Open Simple Dialog
                </button>
              </div>

              @if (simpleResult) {
                <div class="alert alert-info mt-4">
                  <hk-lucide-icon name="Info" [size]="18" />
                  <span>Dialog result: {{ simpleResult }}</span>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Dialog with Data" description="Pass data to dialog component via DIALOG_DATA" [codeExample]="dataCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="openDataDialog()">
                  <hk-lucide-icon name="User" [size]="18" />
                  View User Details
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="Long Content Dialog" description="Dialog with scrollable content">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="openLongContentDialog()">
                  <hk-lucide-icon name="FileText" [size]="18" />
                  View Terms of Service
                </button>
              </div>

              @if (termsResult) {
                <div
                  class="alert mt-4"
                  [class.alert-success]="termsResult === 'accepted'"
                  [class.alert-warning]="termsResult !== 'accepted'"
                >
                  <hk-lucide-icon [name]="termsResult === 'accepted' ? 'Check' : 'X'" [size]="18" />
                  <span>Terms {{ termsResult === 'accepted' ? 'accepted' : 'declined' }}</span>
                </div>
              }
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'forms') {
          <app-doc-section
            title="Form Dialog"
            description="Dialog with form inputs and selects (test responsiveness)"
            [codeExample]="formCode"
          >
            <div class="flex flex-wrap gap-3">
              <button class="btn btn-outline btn-success" (click)="openFormDialog('create')">
                <hk-lucide-icon name="UserPlus" [size]="18" />
                Create User
              </button>
              <button class="btn btn-outline" (click)="openFormDialog('edit')">
                <hk-lucide-icon name="Pencil" [size]="18" />
                Edit User
              </button>
            </div>

            @if (formResult) {
              <div class="alert alert-success mt-4">
                <hk-lucide-icon name="Check" [size]="18" />
                <span>Saved: {{ formResult | json }}</span>
              </div>
            }
          </app-doc-section>
        }

        @if (activeTab() === 'options') {
          <div class="space-y-6">
            <app-doc-section title="Dialog Options" description="Control dialog behavior" [codeExample]="optionsCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="openNonClosableDialog()">
                  <hk-lucide-icon name="Lock" [size]="18" />
                  Non-closable (ESC/Backdrop disabled)
                </button>
              </div>
            </app-doc-section>
          </div>
        }
      </div>

      <div api>
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'service'" (click)="apiTab.set('service')">Service</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'config'" (click)="apiTab.set('config')">DialogConfig</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'ref'" (click)="apiTab.set('ref')">DialogRef</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Service sub-tab -->
        @if (apiTab() === 'service') {
          <div class="space-y-6">
            <app-api-table title="DialogService Methods" [entries]="methodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Usage</h3>
                <p class="text-sm text-base-content/70">
                  Inject <code>DialogService</code> and use <code>open()</code> to launch a modal dialog wrapped in a styled container, or
                  <code>openRaw()</code> for a plain CDK dialog without the wrapper. Both return a <code>DialogRef</code> for controlling
                  the dialog.
                </p>
                <app-code-block [code]="usageCode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Behavior</h3>
                <p class="text-sm text-base-content/70">
                  Important behavior details about dialog lifecycle, auto-close on navigation, and the wrapper component.
                </p>
                <app-code-block [code]="behaviorNotes" />
              </div>
            </div>
          </div>
        }

        <!-- DialogConfig sub-tab -->
        @if (apiTab() === 'config') {
          <div class="space-y-6">
            <app-api-table title="DialogConfig Options (CDK)" [entries]="configDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Dialog Component Pattern</h3>
                <p class="text-sm text-base-content/70">
                  Dialog components receive data via the <code>DIALOG_DATA</code> injection token and control closing via
                  <code>DialogRef</code>. Both are imported from <code>&#64;angular/cdk/dialog</code>.
                </p>
                <app-code-block [code]="componentCode" />
              </div>
            </div>
          </div>
        }

        <!-- DialogRef sub-tab -->
        @if (apiTab() === 'ref') {
          <div class="space-y-6">
            <app-api-table title="DialogRef Properties & Methods" [entries]="refDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Handling Dialog Results</h3>
                <p class="text-sm text-base-content/70">
                  Subscribe to <code>closed</code> to receive the result value passed to <code>close(result)</code>. Use
                  <code>outsideClicked</code> and <code>keydownEvents</code> for additional interaction handling.
                </p>
                <app-code-block [code]="refUsageCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DialogConfig</h3>
                <p class="text-sm text-base-content/70">
                  Configuration object passed as the second argument to <code>open()</code> or <code>openRaw()</code>. Extends CDK
                  <code>DialogConfig</code> with a typed <code>data</code> property.
                </p>
                <app-code-block [code]="typeDialogConfig" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DialogRef</h3>
                <p class="text-sm text-base-content/70">
                  Reference to an open dialog, returned by <code>open()</code> and <code>openRaw()</code>. Provides methods for closing and
                  observables for monitoring dialog events.
                </p>
                <app-code-block [code]="typeDialogRef" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DIALOG_DATA</h3>
                <p class="text-sm text-base-content/70">CDK injection token used inside dialog components to access the data payload.</p>
                <app-code-block [code]="typeDialogData" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class DialogDemoComponent {
  private dialogService = inject(DialogService);
  activeTab = signal<DialogTab>('basic');
  apiTab = signal<DialogApiTab>('service');

  simpleResult: string | null = null;
  formResult: any = null;
  termsResult: string | null = null;

  openSimpleDialog() {
    const ref = this.dialogService.open(SimpleDialogComponent);
    ref.closed.pipe(delay(0)).subscribe((result) => {
      this.simpleResult = result ? String(result) : 'cancelled';
    });
  }

  openDataDialog() {
    this.dialogService.open(DataDialogComponent, {
      data: {
        id: 42,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Administrator',
      },
    });
  }

  openFormDialog(mode: 'create' | 'edit') {
    const ref = this.dialogService.open(FormDialogComponent, {
      data: {
        mode,
        user: mode === 'edit' ? { name: 'Jane Smith', email: 'jane@example.com', role: 'editor', country: 'us' } : undefined,
        height: '90vh',
      },
    });
    ref.closed.pipe(delay(0)).subscribe((result) => {
      if (result) {
        this.formResult = result;
      }
    });
  }

  openLongContentDialog() {
    const ref = this.dialogService.open(LongContentDialogComponent);
    ref.closed.pipe(delay(0)).subscribe((result) => {
      this.termsResult = result ? String(result) : 'declined';
    });
  }

  openNonClosableDialog() {
    this.dialogService.open(SimpleDialogComponent, {
      disableClose: true,
    });
  }

  // --- Code examples ---
  basicCode = `const ref = this.dialogService.open(SimpleDialogComponent);
ref.closed.subscribe(result => {
  console.log('Dialog closed:', result);
});`;

  dataCode = `this.dialogService.open(DataDialogComponent, {
  data: {
    id: 42,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Administrator',
  },
});`;

  formCode = `const ref = this.dialogService.open(FormDialogComponent, {
  data: { mode: 'create' },
});
ref.closed.subscribe(result => {
  if (result) console.log('Saved:', result);
});`;

  optionsCode = `this.dialogService.open(MyComponent, {
  disableClose: true,  // Disable ESC and backdrop close
});`;

  usageCode = `import { DialogService } from '@hakistack/ng-daisyui';

private dialogService = inject(DialogService);

// Open a dialog
const ref = this.dialogService.open(MyDialogComponent, {
  data: { key: 'value' },     // Passed via DIALOG_DATA
  disableClose: false,         // Allow ESC/backdrop close
});

// Handle result
ref.closed.subscribe(result => {
  console.log('Dialog result:', result);
});`;

  componentCode = `import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({
  template: \`
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">{{ data.title }}</h2>
        <p>{{ data.message }}</p>
        <div class="card-actions justify-end">
          <button class="btn btn-ghost" (click)="close()">Cancel</button>
          <button class="btn btn-primary" (click)="close('ok')">OK</button>
        </div>
      </div>
    </div>
  \`,
})
export class MyDialogComponent {
  data = inject(DIALOG_DATA);
  private dialogRef = inject(DialogRef);

  close(result?: string) {
    this.dialogRef.close(result);
  }
}`;

  behaviorNotes = `// Auto-close on navigation
// All open dialogs are automatically closed when the
// Angular router navigates to a new route.

// DialogWrapper
// The open() method wraps your component inside a
// DialogWrapperComponent that provides consistent modal
// styling (modal-box, responsive sizing, backdrop).
// Your inner component receives DIALOG_DATA and DialogRef
// via standard CDK injection.

// Raw dialogs
// Use openRaw() to render your component directly
// without the wrapper (for custom styling).`;

  // --- API docs ---
  methodDocs: ApiDocEntry[] = [
    {
      name: 'open(component, options?)',
      type: 'DialogRef<DialogWrapperComponent>',
      description: 'Open a wrapped dialog that hosts your component inside a styled modal-box',
    },
    {
      name: 'openRaw(component, options?)',
      type: 'DialogRef<T>',
      description: 'Open a plain CDK dialog without the modal wrapper (for custom layouts)',
    },
  ];

  configDocs: ApiDocEntry[] = [
    { name: 'data', type: 'D', default: '-', description: 'Payload injected into the dialog component via DIALOG_DATA token' },
    { name: 'disableClose', type: 'boolean', default: 'false', description: 'Disable closing via ESC key and backdrop click' },
    { name: 'width', type: 'string', default: '-', description: "Dialog width (CSS value, e.g. '500px', '80vw')" },
    { name: 'height', type: 'string', default: '-', description: "Dialog height (CSS value, e.g. '90vh')" },
    { name: 'minWidth', type: 'string | number', default: '-', description: 'Minimum dialog width' },
    { name: 'minHeight', type: 'string | number', default: '-', description: 'Minimum dialog height' },
    { name: 'maxWidth', type: 'string | number', default: '-', description: 'Maximum dialog width' },
    { name: 'maxHeight', type: 'string | number', default: '-', description: 'Maximum dialog height' },
    { name: 'panelClass', type: 'string | string[]', default: '-', description: 'CSS class(es) applied to the overlay panel element' },
    { name: 'hasBackdrop', type: 'boolean', default: 'true', description: 'Whether to show a backdrop behind the dialog' },
    { name: 'backdropClass', type: 'string | string[]', default: '-', description: 'CSS class(es) applied to the backdrop element' },
    { name: 'ariaLabel', type: 'string', default: '-', description: 'Aria label for the dialog element' },
    { name: 'ariaLabelledBy', type: 'string', default: '-', description: 'ID of element that labels the dialog' },
    { name: 'ariaDescribedBy', type: 'string', default: '-', description: 'ID of element that describes the dialog' },
    {
      name: 'autoFocus',
      type: "boolean | string | 'first-tabbable' | 'first-heading'",
      default: "'first-tabbable'",
      description: 'Where to focus on open',
    },
    { name: 'restoreFocus', type: 'boolean', default: 'true', description: 'Whether to restore focus to the trigger element on close' },
  ];

  refDocs: ApiDocEntry[] = [
    { name: 'close(result?)', type: 'void', description: 'Close the dialog, optionally passing a result value' },
    { name: 'closed', type: 'Observable<R | undefined>', description: 'Observable that emits the result when the dialog closes' },
    { name: 'outsideClicked', type: 'Observable<MouseEvent>', description: 'Observable that emits when clicking outside the dialog' },
    { name: 'keydownEvents', type: 'Observable<KeyboardEvent>', description: 'Observable of all keydown events on the overlay' },
    { name: 'componentInstance', type: 'T | null', description: 'Reference to the component instance rendered inside the dialog' },
    { name: 'disableClose', type: 'boolean', description: 'Whether the dialog cannot be closed by user interaction (readable/writable)' },
  ];

  // --- Additional code blocks for sub-tabs ---
  refUsageCode = `const ref = this.dialogService.open(MyDialogComponent, {
  data: { id: 42 },
});

// Handle result when dialog closes
ref.closed.subscribe(result => {
  if (result) {
    console.log('Dialog returned:', result);
  }
});

// Listen for outside clicks (when disableClose is false)
ref.outsideClicked.subscribe(() => {
  console.log('User clicked outside the dialog');
});

// Listen for keydown events on the overlay
ref.keydownEvents.subscribe(event => {
  if (event.key === 'Escape') {
    console.log('Escape pressed');
  }
});

// Access the component instance
const instance = ref.componentInstance;

// Programmatically prevent close
ref.disableClose = true;`;

  // --- Type code blocks ---
  typeDialogConfig = `interface DialogConfig<D = unknown> {
  /** Payload injected via DIALOG_DATA token */
  data?: D;

  /** Disable closing via ESC key and backdrop click (default: false) */
  disableClose?: boolean;

  /** Dialog width (CSS value, e.g. '500px', '80vw') */
  width?: string;

  /** Dialog height (CSS value, e.g. '90vh') */
  height?: string;

  /** Minimum dialog width */
  minWidth?: string | number;

  /** Minimum dialog height */
  minHeight?: string | number;

  /** Maximum dialog width */
  maxWidth?: string | number;

  /** Maximum dialog height */
  maxHeight?: string | number;

  /** CSS class(es) for the overlay panel */
  panelClass?: string | string[];

  /** Show backdrop behind dialog (default: true) */
  hasBackdrop?: boolean;

  /** CSS class(es) for the backdrop */
  backdropClass?: string | string[];

  /** ARIA label for the dialog */
  ariaLabel?: string;

  /** ID of element that labels the dialog */
  ariaLabelledBy?: string;

  /** ID of element that describes the dialog */
  ariaDescribedBy?: string;

  /** Where to focus on open (default: 'first-tabbable') */
  autoFocus?: boolean | string | 'first-tabbable' | 'first-heading';

  /** Restore focus to trigger element on close (default: true) */
  restoreFocus?: boolean;
}`;

  typeDialogRef = `interface DialogRef<T = unknown, R = unknown> {
  /** Close the dialog with an optional result value */
  close(result?: R): void;

  /** Observable that emits the result when dialog closes */
  closed: Observable<R | undefined>;

  /** Observable for clicks outside the dialog */
  outsideClicked: Observable<MouseEvent>;

  /** Observable for keydown events on the overlay */
  keydownEvents: Observable<KeyboardEvent>;

  /** Reference to the rendered component instance */
  componentInstance: T | null;

  /** Whether user interaction can close the dialog */
  disableClose: boolean;
}`;

  typeDialogData = `import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({ ... })
export class MyDialogComponent {
  // Inject the data payload passed via config.data
  data = inject(DIALOG_DATA) as { id: number; name: string };

  // Inject DialogRef to close the dialog
  private dialogRef = inject(DialogRef);

  close(result?: string) {
    this.dialogRef.close(result);
  }
}`;
}
