import { Component, inject, signal } from '@angular/core';
import { AlertService, LucideIconComponent } from '@hakistack/ng-daisyui-v4';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type AlertTab = 'basic' | 'confirm' | 'loading' | 'advanced';

@Component({
  selector: 'app-alert-demo',
  imports: [LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Alert Dialogs</h1>
        <p class="text-base-content/70 mt-2">Modal dialogs for confirmations, warnings, and notifications</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} AlertService {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-bordered">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-boxed">
          <input type="radio" name="alert_tabs" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="alert_tabs" role="tab" class="tab" aria-label="Confirmations"
            [checked]="activeTab() === 'confirm'" (change)="activeTab.set('confirm')" />
          <input type="radio" name="alert_tabs" role="tab" class="tab" aria-label="Loading"
            [checked]="activeTab() === 'loading'" (change)="activeTab.set('loading')" />
          <input type="radio" name="alert_tabs" role="tab" class="tab" aria-label="Advanced"
            [checked]="activeTab() === 'advanced'" (change)="activeTab.set('advanced')" />
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Severity Levels" description="Different severity levels for various contexts" [codeExample]="severityCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-success" (click)="showSuccess()">
                  <hk-lucide-icon name="CircleCheck" [size]="18" />
                  Success
                </button>
                <button class="btn btn-error" (click)="showError()">
                  <hk-lucide-icon name="CircleX" [size]="18" />
                  Error
                </button>
                <button class="btn btn-warning" (click)="showWarning()">
                  <hk-lucide-icon name="TriangleAlert" [size]="18" />
                  Warning
                </button>
                <button class="btn btn-info" (click)="showInfo()">
                  <hk-lucide-icon name="Info" [size]="18" />
                  Info
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="With Description" description="Include additional context" [codeExample]="descriptionCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showWithDescription()">Success with Description</button>
                <button class="btn btn-outline" (click)="showErrorWithDescription()">Error with Description</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'confirm') {
          <div class="space-y-6">
            <app-doc-section title="Confirmation Dialogs" description="Ask user for confirmation before actions" [codeExample]="confirmCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showConfirm()">Basic Confirm</button>
                <button class="btn btn-outline" (click)="showQuestion()">Yes/No Question</button>
                <button class="btn btn-outline btn-error" (click)="showDeleteConfirm()">Delete Confirmation</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Delete with Item Name" description="Show the item being deleted" [codeExample]="deleteCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline btn-error" (click)="showDeleteWithItem()">
                  <hk-lucide-icon name="Trash2" [size]="18" />
                  Delete "Project Alpha"
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="Custom Confirm Styles" description="Different button styles for confirmations">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-primary" (click)="showPrimaryConfirm()">Primary Style</button>
                <button class="btn btn-success" (click)="showSuccessConfirm()">Success Style</button>
                <button class="btn btn-warning" (click)="showWarningConfirm()">Warning Style</button>
                <button class="btn btn-error" (click)="showErrorConfirm()">Error Style</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'loading') {
          <div class="space-y-6">
            <app-doc-section title="Loading State" description="Show loading indicator during async operations" [codeExample]="loadingCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showLoading()">
                  <hk-lucide-icon name="Loader" [size]="18" />
                  Show Loading (3s)
                </button>
                <button class="btn btn-outline" (click)="showLoadingWithUpdate()">Loading with Update</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Auto-close Timer" description="Alert that closes automatically">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showWithTimer()">Auto-close (3s)</button>
                <button class="btn btn-outline" (click)="showWithTimerProgress()">With Progress Bar</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Live Countdown" description="Countdown with live seconds display (e.g., session timeout)" [codeExample]="countdownCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-warning" (click)="showCountdown()">
                  <hk-lucide-icon name="Clock" [size]="18" />
                  Session Timeout Warning
                </button>
                <button class="btn btn-outline" (click)="showCountdownCustom()">Custom Countdown</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'advanced') {
          <div class="space-y-6">
            <app-doc-section title="Custom Alert (Advanced)" description="Using fire() for advanced customization" [codeExample]="fireCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showCustomAlert()">Custom HTML Content</button>
                <button class="btn btn-outline" (click)="showWithFooter()">With Footer</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Result Handling" description="Handle user responses (check console)" [codeExample]="resultCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showWithResultHandling()">Confirm with Result</button>
              </div>

              @if (lastResult) {
                <div class="mt-4 p-4 bg-base-200 rounded-lg">
                  <p class="font-mono text-sm">
                    <strong>Last Result:</strong><br />
                    isConfirmed: {{ lastResult.isConfirmed }}<br />
                    isDismissed: {{ lastResult.isDismissed }}<br />
                    isCancelled: {{ lastResult.isCancelled }}<br />
                    dismissReason: {{ lastResult.dismissReason ?? 'N/A' }}
                  </p>
                </div>
              }
            </app-doc-section>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="AlertService Methods" [entries]="methodDocs" />
          <app-api-table title="ConfirmOptions" [entries]="confirmOptionDocs" />
          <app-api-table title="CountdownOptions" [entries]="countdownOptionDocs" />
          <app-api-table title="AlertResult" [entries]="resultDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Usage</h3>
            <app-code-block [code]="usageCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class AlertDemoComponent {
  private alert = inject(AlertService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<AlertTab>('basic');
  lastResult: { isConfirmed: boolean; isDismissed: boolean; isCancelled: boolean; dismissReason?: string } | null = null;

  // Basic Alerts
  showSuccess() {
    this.alert.success('Operation Successful!');
  }

  showError() {
    this.alert.error('Something went wrong!');
  }

  showWarning() {
    this.alert.warning('Please review your input');
  }

  showInfo() {
    this.alert.info('New updates available');
  }

  // With Description
  showWithDescription() {
    this.alert.success('File Uploaded', 'Your document has been successfully uploaded to the server.');
  }

  showErrorWithDescription() {
    this.alert.error('Upload Failed', 'The file could not be uploaded. Please check your connection and try again.');
  }

  // Confirmation Dialogs
  async showConfirm() {
    const result = await this.alert.confirm({
      title: 'Confirm Action',
      text: 'Are you sure you want to proceed with this action?',
    });
    console.log('Confirm result:', result);
  }

  async showQuestion() {
    const result = await this.alert.question('Save Changes?', 'You have unsaved changes. Would you like to save them?');
    console.log('Question result:', result);
  }

  async showDeleteConfirm() {
    const result = await this.alert.confirmDelete();
    console.log('Delete confirm result:', result);
  }

  async showDeleteWithItem() {
    const result = await this.alert.confirmDelete({ itemName: 'Project Alpha' });
    console.log('Delete with item result:', result);
  }

  // Custom Confirm Styles
  async showPrimaryConfirm() {
    await this.alert.confirm({
      title: 'Primary Action',
      text: 'This uses the primary button style.',
      confirmStyle: 'primary',
      icon: 'info',
    });
  }

  async showSuccessConfirm() {
    await this.alert.confirm({
      title: 'Approve Request',
      text: 'This uses the success button style.',
      confirmStyle: 'success',
      confirmText: 'Approve',
    });
  }

  async showWarningConfirm() {
    await this.alert.confirm({
      title: 'Archive Item',
      text: 'This uses the warning button style.',
      confirmStyle: 'warning',
      confirmText: 'Archive',
    });
  }

  async showErrorConfirm() {
    await this.alert.confirm({
      title: 'Destructive Action',
      text: 'This uses the error/danger button style.',
      confirmStyle: 'error',
      confirmText: 'Delete Forever',
    });
  }

  // Loading State
  showLoading() {
    this.alert.showLoading({ title: 'Processing...', text: 'Please wait while we process your request.' });
    setTimeout(() => {
      this.alert.hideLoading();
      this.alert.success('Done!', 'Processing completed successfully.');
    }, 3000);
  }

  showLoadingWithUpdate() {
    this.alert.showLoading({ title: 'Uploading...', text: 'Starting upload...' });

    setTimeout(() => this.alert.updateLoading('Uploading file (25%)...'), 1000);
    setTimeout(() => this.alert.updateLoading('Uploading file (50%)...'), 2000);
    setTimeout(() => this.alert.updateLoading('Uploading file (75%)...'), 3000);
    setTimeout(() => this.alert.updateLoading('Finalizing...'), 4000);
    setTimeout(() => {
      this.alert.hideLoading();
      this.alert.success('Upload Complete!');
    }, 5000);
  }

  // Auto-close Timer
  showWithTimer() {
    this.alert.countdown({
      title: 'Auto-close Alert',
      html: 'This alert will close in <kbd class="kbd">{seconds}</kbd> seconds.',
      icon: 'info',
      timer: 3000,
    });
  }

  showWithTimerProgress() {
    this.alert.show({
      title: 'Auto-close Alert',
      text: 'Watch the progress bar below.',
      icon: 'info',
      timer: 5000,
      timerProgressBar: true,
    });
  }

  // Live Countdown
  async showCountdown() {
    const result = await this.alert.countdown({
      title: 'Session Expiring',
      html: 'You will be logged out in <kbd class="kbd kbd-lg">{seconds}</kbd> seconds.',
      timer: 10000,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Stay Logged In',
      cancelButtonText: 'Logout Now',
    });

    if (result.isConfirmed) {
      this.alert.success('Session Extended', 'Your session has been refreshed.');
    } else if (result.dismissReason === 'timer') {
      this.alert.info('Session Expired', 'You have been logged out.');
    } else if (result.isCancelled) {
      this.alert.info('Logged Out', 'You chose to logout.');
    }
  }

  async showCountdownCustom() {
    await this.alert.countdown({
      title: 'Processing Request',
      html: `
        <div class="text-center">
          <p class="mb-4">Your request will be submitted automatically in:</p>
          <div class="font-mono text-4xl">
            <span class="countdown-value">{seconds}</span>
          </div>
          <p class="mt-2 text-sm opacity-70">seconds</p>
        </div>
      `,
      timer: 5000,
      countdownSelector: '.countdown-value',
      confirmButtonText: 'Submit Now',
      icon: 'info',
    });
  }

  // Custom Alert
  async showCustomAlert() {
    await this.alert.fire({
      title: 'Custom Content',
      html: `
        <div class="text-left">
          <p class="mb-2">You can use <strong>HTML</strong> content:</p>
          <ul class="list-disc list-inside text-sm">
            <li>Rich formatting</li>
            <li>Custom layouts</li>
            <li>Any HTML elements</li>
          </ul>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Got it!',
    });
  }

  async showWithFooter() {
    await this.alert.fire({
      title: 'Terms of Service',
      text: 'Please accept the terms of service to continue.',
      icon: 'info',
      footer: '<a href="#" class="link link-primary">Read full terms of service</a>',
      confirmButtonText: 'Accept',
      showCancelButton: true,
      cancelButtonText: 'Decline',
    });
  }

  // Result Handling
  async showWithResultHandling() {
    const result = await this.alert.confirm({
      title: 'Confirm Your Choice',
      text: 'Click Confirm, Cancel, or press Escape to see different results.',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
    });

    this.lastResult = result;
    console.log('Full result:', result);

    if (result.isConfirmed) {
      this.alert.success('Confirmed!', 'You clicked the confirm button.');
    } else if (result.isCancelled) {
      this.alert.info('Cancelled', 'You clicked the cancel button.');
    } else if (result.dismissReason === 'esc') {
      this.alert.info('Dismissed', 'You pressed the Escape key.');
    } else if (result.dismissReason === 'backdrop') {
      this.alert.info('Dismissed', 'You clicked outside the dialog.');
    }
  }

  // --- Code examples ---
  severityCode = `private alert = inject(AlertService);

this.alert.success('Operation Successful!');
this.alert.error('Something went wrong!');
this.alert.warning('Please review your input');
this.alert.info('New updates available');`;

  descriptionCode = `this.alert.success('File Uploaded', 'Your document has been uploaded.');`;

  confirmCode = `const result = await this.alert.confirm({
  title: 'Confirm Action',
  text: 'Are you sure you want to proceed?',
});
if (result.isConfirmed) { /* confirmed */ }`;

  deleteCode = `const result = await this.alert.confirmDelete({
  itemName: 'Project Alpha',
});`;

  loadingCode = `this.alert.showLoading({ title: 'Processing...', text: 'Please wait...' });
// ... async operation ...
this.alert.updateLoading('Almost done...');
this.alert.hideLoading();
this.alert.success('Done!');`;

  countdownCode = `const result = await this.alert.countdown({
  title: 'Session Expiring',
  html: 'Logging out in <kbd class="kbd">{seconds}</kbd> seconds.',
  timer: 10000,
  icon: 'warning',
  showCancelButton: true,
  confirmButtonText: 'Stay Logged In',
});`;

  fireCode = `await this.alert.fire({
  title: 'Custom Content',
  html: '<p>Rich <strong>HTML</strong> content</p>',
  icon: 'info',
  footer: '<a href="#">Link</a>',
  confirmButtonText: 'Got it!',
});`;

  resultCode = `const result = await this.alert.confirm({
  title: 'Confirm',
  text: 'Are you sure?',
});

// result.isConfirmed  - user clicked confirm
// result.isCancelled  - user clicked cancel
// result.isDismissed  - dismissed by backdrop/esc
// result.dismissReason - 'backdrop' | 'esc' | 'timer'`;

  usageCode = `import { AlertService } from '@hakistack/ng-daisyui-v4';

private alert = inject(AlertService);

// Quick methods
this.alert.success('Title', 'Description');
this.alert.error('Title', 'Description');
this.alert.warning('Title', 'Description');
this.alert.info('Title', 'Description');

// Confirmation
const result = await this.alert.confirm({
  title: 'Confirm',
  text: 'Are you sure?',
  confirmStyle: 'primary',  // 'primary' | 'success' | 'warning' | 'error'
  confirmText: 'Yes',
  cancelText: 'No',
  icon: 'warning',           // 'success' | 'error' | 'warning' | 'info' | 'question'
});

// Delete confirmation
await this.alert.confirmDelete({ itemName: 'Item' });

// Question (Yes/No)
await this.alert.question('Title', 'Description');

// Loading state
this.alert.showLoading({ title: 'Loading...', text: 'Please wait' });
this.alert.updateLoading('Still working...');
this.alert.hideLoading();

// Countdown
await this.alert.countdown({
  title: 'Countdown',
  html: 'Closing in {seconds} seconds.',
  timer: 5000,
});

// Advanced (direct SweetAlert2)
await this.alert.fire({ ...swalOptions });
await this.alert.show({ ...swalOptions });`;

  // --- API docs ---
  methodDocs: ApiDocEntry[] = [
    { name: 'success(title, text?)', type: 'Promise<AlertResult>', description: 'Show a success alert' },
    { name: 'error(title, text?)', type: 'Promise<AlertResult>', description: 'Show an error alert' },
    { name: 'warning(title, text?)', type: 'Promise<AlertResult>', description: 'Show a warning alert' },
    { name: 'info(title, text?)', type: 'Promise<AlertResult>', description: 'Show an info alert' },
    { name: 'confirm(options)', type: 'Promise<AlertResult>', description: 'Show a confirmation dialog' },
    { name: 'question(title, text?)', type: 'Promise<AlertResult>', description: 'Show a yes/no question dialog' },
    { name: 'confirmDelete(options?)', type: 'Promise<AlertResult>', description: 'Show a delete confirmation dialog' },
    { name: 'showLoading(options)', type: 'void', description: 'Show a loading dialog' },
    { name: 'updateLoading(text)', type: 'void', description: 'Update the loading dialog text' },
    { name: 'hideLoading()', type: 'void', description: 'Close the loading dialog' },
    { name: 'countdown(options)', type: 'Promise<AlertResult>', description: 'Show an alert with live countdown' },
    { name: 'fire(options)', type: 'Promise<SweetAlertResult>', description: 'Direct SweetAlert2 fire with DaisyUI theming' },
    { name: 'show(options)', type: 'Promise<SweetAlertResult>', description: 'Alias for fire()' },
  ];

  confirmOptionDocs: ApiDocEntry[] = [
    { name: 'title', type: 'string', description: 'Dialog title' },
    { name: 'text', type: 'string', default: '-', description: 'Dialog body text' },
    { name: 'icon', type: "'success' | 'error' | 'warning' | 'info' | 'question'", default: "'warning'", description: 'Alert icon' },
    { name: 'confirmText', type: 'string', default: "'Confirm'", description: 'Confirm button text' },
    { name: 'cancelText', type: 'string', default: "'Cancel'", description: 'Cancel button text' },
    { name: 'confirmStyle', type: "'primary' | 'success' | 'warning' | 'error'", default: "'primary'", description: 'Confirm button color style' },
  ];

  countdownOptionDocs: ApiDocEntry[] = [
    { name: 'title', type: 'string', description: 'Dialog title' },
    { name: 'html', type: 'string', description: 'HTML content with {seconds} placeholder' },
    { name: 'timer', type: 'number', description: 'Countdown duration in milliseconds' },
    { name: 'icon', type: 'SweetAlertIcon', default: '-', description: 'Alert icon' },
    { name: 'countdownSelector', type: 'string', default: '-', description: 'CSS selector for countdown element' },
    { name: 'showCancelButton', type: 'boolean', default: 'false', description: 'Show cancel button' },
    { name: 'confirmButtonText', type: 'string', default: '-', description: 'Confirm button text' },
    { name: 'cancelButtonText', type: 'string', default: '-', description: 'Cancel button text' },
  ];

  resultDocs: ApiDocEntry[] = [
    { name: 'isConfirmed', type: 'boolean', description: 'User clicked the confirm button' },
    { name: 'isCancelled', type: 'boolean', description: 'User clicked the cancel button' },
    { name: 'isDismissed', type: 'boolean', description: 'Dialog was dismissed (backdrop, ESC, timer)' },
    { name: 'dismissReason', type: "'backdrop' | 'esc' | 'timer'", default: '-', description: 'How the dialog was dismissed' },
  ];
}
