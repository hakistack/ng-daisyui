import { Component, inject } from '@angular/core';
import { AlertService, LucideIconComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-alert-demo',
  imports: [LucideIconComponent],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Alert Dialogs</h1>
        <p class="text-base-content/70 mt-2">Modal dialogs for confirmations, warnings, and notifications</p>
      </div>

      <!-- Basic Alerts -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Basic Alerts</h2>
          <p class="text-sm text-base-content/60 mb-4">Different severity levels</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-success" (click)="showSuccess()">
              <app-lucide-icon name="CircleCheck" [size]="18" />
              Success
            </button>
            <button class="btn btn-error" (click)="showError()">
              <app-lucide-icon name="CircleX" [size]="18" />
              Error
            </button>
            <button class="btn btn-warning" (click)="showWarning()">
              <app-lucide-icon name="TriangleAlert" [size]="18" />
              Warning
            </button>
            <button class="btn btn-info" (click)="showInfo()">
              <app-lucide-icon name="Info" [size]="18" />
              Info
            </button>
          </div>
        </div>
      </div>

      <!-- With Description -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">With Description</h2>
          <p class="text-sm text-base-content/60 mb-4">Include additional context</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showWithDescription()">Success with Description</button>
            <button class="btn btn-outline" (click)="showErrorWithDescription()">Error with Description</button>
          </div>
        </div>
      </div>

      <!-- Confirmation Dialogs -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Confirmation Dialogs</h2>
          <p class="text-sm text-base-content/60 mb-4">Ask user for confirmation before actions</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showConfirm()">Basic Confirm</button>
            <button class="btn btn-outline" (click)="showQuestion()">Yes/No Question</button>
            <button class="btn btn-outline btn-error" (click)="showDeleteConfirm()">Delete Confirmation</button>
          </div>
        </div>
      </div>

      <!-- Delete with Item Name -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Delete with Item Name</h2>
          <p class="text-sm text-base-content/60 mb-4">Show the item being deleted</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline btn-error" (click)="showDeleteWithItem()">
              <app-lucide-icon name="Trash2" [size]="18" />
              Delete "Project Alpha"
            </button>
          </div>
        </div>
      </div>

      <!-- Custom Confirm Styles -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Custom Confirm Styles</h2>
          <p class="text-sm text-base-content/60 mb-4">Different button styles for confirmations</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-primary" (click)="showPrimaryConfirm()">Primary Style</button>
            <button class="btn btn-success" (click)="showSuccessConfirm()">Success Style</button>
            <button class="btn btn-warning" (click)="showWarningConfirm()">Warning Style</button>
            <button class="btn btn-error" (click)="showErrorConfirm()">Error Style</button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Loading State</h2>
          <p class="text-sm text-base-content/60 mb-4">Show loading indicator during async operations</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showLoading()">
              <app-lucide-icon name="Loader" [size]="18" />
              Show Loading (3s)
            </button>
            <button class="btn btn-outline" (click)="showLoadingWithUpdate()">Loading with Update</button>
          </div>
        </div>
      </div>

      <!-- Auto-close Timer -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Auto-close Timer</h2>
          <p class="text-sm text-base-content/60 mb-4">Alert that closes automatically</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showWithTimer()">Auto-close (3s)</button>
            <button class="btn btn-outline" (click)="showWithTimerProgress()">With Progress Bar</button>
          </div>
        </div>
      </div>

      <!-- Live Countdown -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Live Countdown</h2>
          <p class="text-sm text-base-content/60 mb-4">Countdown with live seconds display (e.g., session timeout)</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-warning" (click)="showCountdown()">
              <app-lucide-icon name="Clock" [size]="18" />
              Session Timeout Warning
            </button>
            <button class="btn btn-outline" (click)="showCountdownCustom()">Custom Countdown</button>
          </div>
        </div>
      </div>

      <!-- Custom Alert -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Custom Alert (Advanced)</h2>
          <p class="text-sm text-base-content/60 mb-4">Using fire() for advanced customization</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showCustomAlert()">Custom HTML Content</button>
            <button class="btn btn-outline" (click)="showWithFooter()">With Footer</button>
          </div>
        </div>
      </div>

      <!-- Result Handling -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Result Handling</h2>
          <p class="text-sm text-base-content/60 mb-4">Handle user responses (check console)</p>

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
        </div>
      </div>
    </div>
  `,
})
export class AlertDemoComponent {
  private alert = inject(AlertService);
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
}
