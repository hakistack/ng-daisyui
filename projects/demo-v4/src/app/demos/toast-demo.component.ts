import { Component, inject, signal } from '@angular/core';
import { ToastService, LucideIconComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type ToastTab = 'basic' | 'features' | 'styles' | 'advanced';

@Component({
  selector: 'app-toast-demo',
  imports: [LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Toast Notifications</h1>
        <p class="text-base-content/70 mt-2">Non-blocking notifications with actions and progress</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} ToastService {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
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
          <input type="radio" name="toast_tabs" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="toast_tabs" role="tab" class="tab" aria-label="Features"
            [checked]="activeTab() === 'features'" (change)="activeTab.set('features')" />
          <input type="radio" name="toast_tabs" role="tab" class="tab" aria-label="Styles"
            [checked]="activeTab() === 'styles'" (change)="activeTab.set('styles')" />
          <input type="radio" name="toast_tabs" role="tab" class="tab" aria-label="Advanced"
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

            <app-doc-section title="With Details" description="Include additional context" [codeExample]="detailCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showWithDetail()">Show with Detail</button>
                <button class="btn btn-outline" (click)="showLongMessage()">Long Message</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'features') {
          <div class="space-y-6">
            <app-doc-section title="With Actions" description="Interactive toast with buttons" [codeExample]="actionCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showWithAction()">Single Action</button>
                <button class="btn btn-outline" (click)="showWithMultipleActions()">Multiple Actions</button>
                <button class="btn btn-outline" (click)="showUndoAction()">Undo Action</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Custom Duration" description="Control how long the toast is visible">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showShort()">Short (2s)</button>
                <button class="btn btn-outline" (click)="showMedium()">Medium (5s)</button>
                <button class="btn btn-outline" (click)="showLong()">Long (10s)</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Progress Bar" description="Show remaining time visually">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showWithProgress()">With Progress Bar</button>
                <button class="btn btn-outline" (click)="showWithoutProgress()">Without Progress Bar</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Sticky Toast" description="Won't auto-dismiss until closed manually" [codeExample]="stickyCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showSticky()">Show Sticky Toast</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'styles') {
          <div class="space-y-6">
            <app-doc-section title="Soft Style" description="Muted, less prominent styling" [codeExample]="softCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline btn-success" (click)="showSoftSuccess()">Soft Success</button>
                <button class="btn btn-outline btn-error" (click)="showSoftError()">Soft Error</button>
                <button class="btn btn-outline btn-warning" (click)="showSoftWarning()">Soft Warning</button>
                <button class="btn btn-outline btn-info" (click)="showSoftInfo()">Soft Info</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Tap to Dismiss" description="Click anywhere on toast to close">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showTapToDismiss()">Tap to Dismiss</button>
                <button class="btn btn-outline" (click)="showNoTapToDismiss()">No Tap to Dismiss</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'advanced') {
          <div class="space-y-6">
            <app-doc-section title="Network Status" description="Built-in online/offline notifications" [codeExample]="networkCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline btn-success" (click)="showOnline()">
                  <hk-lucide-icon name="Wifi" [size]="18" />
                  Online
                </button>
                <button class="btn btn-outline btn-error" (click)="showOffline()">
                  <hk-lucide-icon name="WifiOff" [size]="18" />
                  Offline
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="Bulk Operations" description="Manage multiple toasts">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-primary" (click)="showMultiple()">Show 3 Toasts</button>
                <button class="btn btn-ghost" (click)="clearAll()">Clear All</button>
              </div>
            </app-doc-section>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="ToastService Methods" [entries]="methodDocs" />
          <app-api-table title="ToastMessage Options" [entries]="optionDocs" />
          <app-api-table title="ToastAction Properties" [entries]="actionDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Usage</h3>
            <app-code-block [code]="usageCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastDemoComponent {
  private toast = inject(ToastService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<ToastTab>('basic');

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
    this.toast.info(
      'System Maintenance',
      'The system will undergo scheduled maintenance on Saturday from 2:00 AM to 6:00 AM EST. Please save your work before this time.'
    );
  }

  showWithAction() {
    this.toast.show({
      severity: 'info',
      summary: 'New message received',
      detail: 'You have 1 unread message',
      actions: [
        {
          label: 'View',
          onClick: () => console.log('View clicked'),
          style: 'primary',
        },
      ],
    });
  }

  showWithMultipleActions() {
    this.toast.show({
      severity: 'warning',
      summary: 'Unsaved changes',
      detail: 'You have unsaved changes that will be lost.',
      actions: [
        {
          label: 'Discard',
          onClick: () => console.log('Discard clicked'),
          style: 'ghost',
        },
        {
          label: 'Save',
          onClick: () => console.log('Save clicked'),
          style: 'primary',
        },
      ],
    });
  }

  showUndoAction() {
    this.toast.show({
      severity: 'success',
      summary: 'Item deleted',
      detail: 'The item has been moved to trash.',
      life: 8000,
      actions: [
        {
          label: 'Undo',
          onClick: () => this.toast.info('Undo successful', 'Item restored'),
          style: 'primary',
        },
      ],
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
    this.toast.show({
      severity: 'info',
      summary: 'Quick notification',
      life: 2000,
    });
  }

  showMedium() {
    this.toast.show({
      severity: 'info',
      summary: 'Medium notification',
      life: 5000,
    });
  }

  showLong() {
    this.toast.show({
      severity: 'info',
      summary: 'Long notification',
      detail: 'This will stay visible for 10 seconds.',
      life: 10000,
    });
  }

  showWithProgress() {
    this.toast.show({
      severity: 'info',
      summary: 'With progress bar',
      detail: 'Watch the progress indicator',
      progressBar: true,
      life: 5000,
    });
  }

  showWithoutProgress() {
    this.toast.show({
      severity: 'info',
      summary: 'Without progress bar',
      progressBar: false,
      life: 5000,
    });
  }

  showSoftSuccess() {
    this.toast.show({ severity: 'success', summary: 'Soft success', soft: true });
  }

  showSoftError() {
    this.toast.show({ severity: 'error', summary: 'Soft error', soft: true });
  }

  showSoftWarning() {
    this.toast.show({ severity: 'warning', summary: 'Soft warning', soft: true });
  }

  showSoftInfo() {
    this.toast.show({ severity: 'info', summary: 'Soft info', soft: true });
  }

  showOnline() {
    this.toast.networkStatus('online');
  }

  showOffline() {
    this.toast.networkStatus('offline');
  }

  showTapToDismiss() {
    this.toast.show({
      severity: 'info',
      summary: 'Tap anywhere to dismiss',
      tapToDismiss: true,
      life: 10000,
    });
  }

  showNoTapToDismiss() {
    this.toast.show({
      severity: 'info',
      summary: 'Use X button to dismiss',
      tapToDismiss: false,
      life: 10000,
    });
  }

  showMultiple() {
    this.toast.success('First toast');
    setTimeout(() => this.toast.info('Second toast'), 300);
    setTimeout(() => this.toast.warning('Third toast'), 600);
  }

  clearAll() {
    this.toast.clear();
  }

  // --- Code examples ---
  severityCode = `private toast = inject(ToastService);

this.toast.success('Operation successful!');
this.toast.error('Something went wrong!');
this.toast.warning('Please review your input');
this.toast.info('New updates available');`;

  detailCode = `this.toast.success('File uploaded', 'Your document has been successfully uploaded.');`;

  actionCode = `this.toast.show({
  severity: 'info',
  summary: 'New message received',
  detail: 'You have 1 unread message',
  actions: [
    {
      label: 'View',
      onClick: () => console.log('View clicked'),
      style: 'primary',
    },
  ],
});`;

  stickyCode = `this.toast.show({
  severity: 'warning',
  summary: 'Important Notice',
  detail: 'This toast will not auto-dismiss.',
  sticky: true,
});`;

  softCode = `this.toast.show({
  severity: 'success',
  summary: 'Soft success',
  soft: true,
});`;

  networkCode = `this.toast.networkStatus('online');
this.toast.networkStatus('offline');`;

  usageCode = `import { ToastService } from '@hakistack/ng-daisyui';

// Inject the service
private toast = inject(ToastService);

// Quick methods
this.toast.success('Title', 'Optional detail');
this.toast.error('Title', 'Optional detail');
this.toast.warning('Title', 'Optional detail');
this.toast.info('Title', 'Optional detail');

// Full options
this.toast.show({
  severity: 'info',
  summary: 'Title',
  detail: 'Detail text',
  life: 5000,
  sticky: false,
  progressBar: true,
  tapToDismiss: true,
  soft: false,
  actions: [
    { label: 'Undo', onClick: () => {}, style: 'primary' },
  ],
});

// Utilities
this.toast.networkStatus('online');
this.toast.clear();`;

  // --- API docs ---
  methodDocs: ApiDocEntry[] = [
    { name: 'success(summary, detail?)', type: 'void', description: 'Show a success toast' },
    { name: 'error(summary, detail?)', type: 'void', description: 'Show an error toast' },
    { name: 'warning(summary, detail?)', type: 'void', description: 'Show a warning toast' },
    { name: 'info(summary, detail?)', type: 'void', description: 'Show an info toast' },
    { name: 'show(message)', type: 'void', description: 'Show toast with full ToastMessage options' },
    { name: 'networkStatus(status)', type: 'void', description: 'Show online/offline status toast' },
    { name: 'clear()', type: 'void', description: 'Remove all active toasts' },
  ];

  optionDocs: ApiDocEntry[] = [
    { name: 'severity', type: "'success' | 'error' | 'warning' | 'info'", description: 'Toast severity level' },
    { name: 'summary', type: 'string', description: 'Toast title text' },
    { name: 'detail', type: 'string', default: '-', description: 'Additional detail text' },
    { name: 'life', type: 'number', default: '4000', description: 'Auto-dismiss duration in milliseconds' },
    { name: 'sticky', type: 'boolean', default: 'false', description: 'Prevent auto-dismiss' },
    { name: 'progressBar', type: 'boolean', default: 'true', description: 'Show countdown progress bar' },
    { name: 'tapToDismiss', type: 'boolean', default: 'true', description: 'Click anywhere on toast to dismiss' },
    { name: 'soft', type: 'boolean', default: 'false', description: 'Use muted/soft styling' },
    { name: 'actions', type: 'ToastAction[]', default: '[]', description: 'Action buttons to display' },
  ];

  actionDocs: ApiDocEntry[] = [
    { name: 'label', type: 'string', description: 'Button text' },
    { name: 'onClick', type: '() => void', description: 'Click handler' },
    { name: 'style', type: "'primary' | 'ghost' | 'error' | 'warning'", default: "'ghost'", description: 'Button style' },
  ];
}
