import { Component, inject } from '@angular/core';
import { ToastService, LucideIconComponent } from '@hakistack/ng-daisyui-v4';

@Component({
  selector: 'app-toast-demo',
  imports: [LucideIconComponent],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Toast Notifications</h1>
        <p class="text-base-content/70 mt-2">Non-blocking notifications with actions and progress</p>
      </div>

      <!-- Basic Toasts -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Basic Toasts</h2>
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

      <!-- With Details -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">With Details</h2>
          <p class="text-sm text-base-content/60 mb-4">Include additional context</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showWithDetail()">Show with Detail</button>
            <button class="btn btn-outline" (click)="showLongMessage()">Long Message</button>
          </div>
        </div>
      </div>

      <!-- With Actions -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">With Actions</h2>
          <p class="text-sm text-base-content/60 mb-4">Interactive toast with buttons</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showWithAction()">Single Action</button>
            <button class="btn btn-outline" (click)="showUndoAction()">Undo Action</button>
          </div>
        </div>
      </div>

      <!-- Sticky Toast -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Sticky Toast</h2>
          <p class="text-sm text-base-content/60 mb-4">Won't auto-dismiss until closed manually</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showSticky()">Show Sticky Toast</button>
          </div>
        </div>
      </div>

      <!-- Custom Duration -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Custom Duration</h2>
          <p class="text-sm text-base-content/60 mb-4">Control how long the toast is visible</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showShort()">Short (2s)</button>
            <button class="btn btn-outline" (click)="showMedium()">Medium (5s)</button>
            <button class="btn btn-outline" (click)="showLong()">Long (10s)</button>
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Progress Bar</h2>
          <p class="text-sm text-base-content/60 mb-4">Show remaining time visually</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline" (click)="showWithProgress()">With Progress Bar</button>
          </div>
        </div>
      </div>

      <!-- Network Status -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Network Status</h2>
          <p class="text-sm text-base-content/60 mb-4">Built-in online/offline notifications</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-outline btn-success" (click)="showOnline()">
              <app-lucide-icon name="Wifi" [size]="18" />
              Online
            </button>
            <button class="btn btn-outline btn-error" (click)="showOffline()">
              <app-lucide-icon name="WifiOff" [size]="18" />
              Offline
            </button>
          </div>
        </div>
      </div>

      <!-- Clear All -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Bulk Operations</h2>
          <p class="text-sm text-base-content/60 mb-4">Manage multiple toasts</p>

          <div class="flex flex-wrap gap-3">
            <button class="btn btn-primary" (click)="showMultiple()">Show 3 Toasts</button>
            <button class="btn btn-ghost" (click)="clearAll()">Clear All</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ToastDemoComponent {
  private toast = inject(ToastService);

  showSuccess() {
    this.toast.success('Operation successful!');
  }

  showError() {
    this.toast.error('Something went wrong!');
  }

  showWarning() {
    this.toast.warning('Please review your input');
  }

  showInfo() {
    this.toast.info('New updates available');
  }

  showWithDetail() {
    this.toast.success('File uploaded', 'Your document has been successfully uploaded to the server.');
  }

  showLongMessage() {
    this.toast.info('System Maintenance', 'The system will undergo scheduled maintenance on Saturday from 2:00 AM to 6:00 AM EST.');
  }

  showWithAction() {
    this.toast.show({
      severity: 'info',
      summary: 'New message received',
      detail: 'You have 1 unread message',
      actions: [{ label: 'View', onClick: () => console.log('View clicked'), style: 'primary' }],
    });
  }

  showUndoAction() {
    this.toast.show({
      severity: 'success',
      summary: 'Item deleted',
      detail: 'The item has been moved to trash.',
      life: 8000,
      actions: [{ label: 'Undo', onClick: () => this.toast.info('Undo successful', 'Item restored'), style: 'primary' }],
    });
  }

  showSticky() {
    this.toast.show({
      severity: 'warning',
      summary: 'Important Notice',
      detail: 'This toast will not auto-dismiss. You must close it manually.',
      sticky: true,
    });
  }

  showShort() {
    this.toast.show({ severity: 'info', summary: 'Quick notification', life: 2000 });
  }

  showMedium() {
    this.toast.show({ severity: 'info', summary: 'Medium notification', life: 5000 });
  }

  showLong() {
    this.toast.show({ severity: 'info', summary: 'Long notification', detail: 'This will stay visible for 10 seconds.', life: 10000 });
  }

  showWithProgress() {
    this.toast.show({ severity: 'info', summary: 'With progress bar', detail: 'Watch the progress indicator', progressBar: true, life: 5000 });
  }

  showOnline() {
    this.toast.networkStatus('online');
  }

  showOffline() {
    this.toast.networkStatus('offline');
  }

  showMultiple() {
    this.toast.success('First toast');
    setTimeout(() => this.toast.info('Second toast'), 300);
    setTimeout(() => this.toast.warning('Third toast'), 600);
  }

  clearAll() {
    this.toast.clear();
  }
}
