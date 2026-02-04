import { Component, inject } from '@angular/core';
import { AlertService, LucideIconComponent } from '@hakistack/ng-daisyui-v3';

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

  showWithDescription() {
    this.alert.success('File Uploaded', 'Your document has been successfully uploaded to the server.');
  }

  showErrorWithDescription() {
    this.alert.error('Upload Failed', 'The file could not be uploaded. Please check your connection and try again.');
  }

  async showConfirm() {
    const result = await this.alert.confirm({ title: 'Confirm Action', text: 'Are you sure you want to proceed with this action?' });
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

  showLoading() {
    this.alert.showLoading({ title: 'Processing...', text: 'Please wait while we process your request.' });
    setTimeout(() => {
      this.alert.hideLoading();
      this.alert.success('Done!', 'Processing completed successfully.');
    }, 3000);
  }

  async showWithResultHandling() {
    const result = await this.alert.confirm({ title: 'Confirm Your Choice', text: 'Click Confirm, Cancel, or press Escape.', confirmText: 'Confirm', cancelText: 'Cancel' });

    this.lastResult = result;
    console.log('Full result:', result);

    if (result.isConfirmed) {
      this.alert.success('Confirmed!', 'You clicked the confirm button.');
    } else if (result.isCancelled) {
      this.alert.info('Cancelled', 'You clicked the cancel button.');
    } else if (result.dismissReason === 'esc') {
      this.alert.info('Dismissed', 'You pressed the Escape key.');
    }
  }
}
