import { Component, inject, signal } from '@angular/core';
import { ToastService, LucideIconComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

type ToastTab = 'basic' | 'features' | 'styles' | 'advanced';
type ToastApiTab = 'methods' | 'configuration' | 'provider' | 'types';

@Component({
  selector: 'app-toast-demo',
  imports: [LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Toast Notifications"
      description="Non-blocking notifications with actions and progress"
      icon="Bell"
      category="Feedback"
      importName="ToastService"
    >
      <div examples>
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'features'" (click)="activeTab.set('features')">
            Features
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'styles'" (click)="activeTab.set('styles')">Styles</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'advanced'" (click)="activeTab.set('advanced')">
            Advanced
          </button>
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section
              title="Severity Levels"
              description="Different severity levels for various contexts"
              [codeExample]="severityCode"
            >
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
      </div>

      <div api>
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'methods'" (click)="apiTab.set('methods')">
            Service Methods
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'configuration'" (click)="apiTab.set('configuration')">
            Configuration
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'provider'" (click)="apiTab.set('provider')">
            Provider Setup
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Service Methods sub-tab -->
        @if (apiTab() === 'methods') {
          <div class="space-y-6">
            <app-api-table title="ToastService Methods" [entries]="methodDocs" />

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Usage</h3>
                <p class="text-sm text-base-content/70">
                  Inject <code>ToastService</code> and call convenience methods for common severities, or use <code>show()</code> for full
                  control. All methods return the toast ID as a <code>string</code>, which can be used with <code>dismiss()</code> and
                  <code>pauseAutoDismiss()</code>/<code>resumeAutoDismiss()</code>.
                </p>
                <app-code-block [code]="usageCode" />
              </div>
            </div>
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="ToastOptions" [entries]="optionDocs" />
            <app-api-table title="ToastAction" [entries]="actionDocs" />
          </div>
        }

        <!-- Provider Setup sub-tab -->
        @if (apiTab() === 'provider') {
          <div class="space-y-6">
            <app-api-table title="ToastGlobalConfig (provideToast)" [entries]="globalConfigDocs" />

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Provider Setup</h3>
                <p class="text-sm text-base-content/70">
                  Use <code>provideToast()</code> in your application config to set global defaults for all toasts. Alternatively, use the
                  <code>TOAST_CONFIG</code> injection token directly for more control. Without configuration, the service uses sensible
                  defaults (bottom-end position, 5s duration, max 5 toasts).
                </p>
                <app-code-block [code]="providerCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ToastSeverity</h3>
                <app-code-block [code]="typeToastSeverity" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ToastPosition</h3>
                <app-code-block [code]="typeToastPosition" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ToastOptions</h3>
                <p class="text-sm text-base-content/70">
                  Full options object passed to <code>show()</code>. Convenience methods like <code>success()</code> set the severity
                  automatically.
                </p>
                <app-code-block [code]="typeToastOptions" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ToastAction</h3>
                <p class="text-sm text-base-content/70">
                  Action button configuration for interactive toasts. Max 2 actions recommended for visual clarity.
                </p>
                <app-code-block [code]="typeToastAction" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ToastGlobalConfig</h3>
                <p class="text-sm text-base-content/70">
                  Global configuration passed to <code>provideToast()</code> or provided via <code>TOAST_CONFIG</code> injection token.
                </p>
                <app-code-block [code]="typeToastGlobalConfig" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class ToastDemoComponent {
  private toast = inject(ToastService);
  activeTab = signal<ToastTab>('basic');
  apiTab = signal<ToastApiTab>('methods');

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
      'The system will undergo scheduled maintenance on Saturday from 2:00 AM to 6:00 AM EST. Please save your work before this time.',
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

  providerCode = `import { provideToast } from '@hakistack/ng-daisyui';

// In app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideToast({
      position: 'top-end',
      maxToasts: 3,
      defaultLife: 4000,
      preventDuplicates: true,
    })
  ]
};

// Or use the injection token directly
import { TOAST_CONFIG, ToastGlobalConfig } from '@hakistack/ng-daisyui';

providers: [
  {
    provide: TOAST_CONFIG,
    useValue: {
      maxToasts: 3,
      position: 'top-end',
    } as Partial<ToastGlobalConfig>
  }
]`;

  // --- API docs ---
  methodDocs: ApiDocEntry[] = [
    { name: 'show(options)', type: 'string', description: 'Show a toast with full ToastOptions. Returns the toast ID' },
    { name: 'success(summary, detail?, options?)', type: 'string', description: 'Show a success toast. Returns the toast ID' },
    { name: 'error(summary, detail?, options?)', type: 'string', description: 'Show an error toast. Returns the toast ID' },
    { name: 'warning(summary, detail?, options?)', type: 'string', description: 'Show a warning toast. Returns the toast ID' },
    { name: 'info(summary, detail?, options?)', type: 'string', description: 'Show an info toast. Returns the toast ID' },
    { name: 'networkStatus(status)', type: 'string', description: "Show online/offline status toast. Pass 'online' or 'offline'" },
    { name: 'dismiss(id)', type: 'void', description: 'Dismiss a specific toast by its ID (with exit animation)' },
    { name: 'clear()', type: 'void', description: 'Remove all active toasts immediately' },
    { name: 'pauseAutoDismiss(id)', type: 'void', description: 'Pause the auto-dismiss timer for a toast (used on hover)' },
    { name: 'resumeAutoDismiss(id)', type: 'void', description: 'Resume the auto-dismiss timer for a toast (used on hover end)' },
    { name: 'handleToastClick(id)', type: 'void', description: 'Handle toast body click (calls onTap, dismisses if tapToDismiss)' },
    {
      name: 'handleActionClick(id, action)',
      type: 'void',
      description: 'Handle action button click (calls onClick, dismisses unless dismissOnClick is false)',
    },
  ];

  optionDocs: ApiDocEntry[] = [
    { name: 'severity', type: 'ToastSeverity', description: "Toast severity: 'success' | 'error' | 'warning' | 'info' (required)" },
    { name: 'summary', type: 'string', description: 'Main toast message text (required)' },
    { name: 'detail', type: 'string', default: '-', description: 'Optional detailed message shown below summary' },
    { name: 'life', type: 'number', default: '5000', description: 'Duration in ms before auto-dismiss' },
    { name: 'sticky', type: 'boolean', default: 'false', description: "If true, toast won't auto-dismiss (must be closed manually)" },
    { name: 'soft', type: 'boolean', default: 'false', description: 'Use soft/muted styling variant' },
    { name: 'progressBar', type: 'boolean', default: 'true (from config)', description: 'Show countdown progress bar indicator' },
    { name: 'pauseOnHover', type: 'boolean', default: 'true (from config)', description: 'Pause auto-dismiss timer when hovering' },
    { name: 'tapToDismiss', type: 'boolean', default: 'false (from config)', description: 'Allow clicking anywhere on toast to dismiss' },
    { name: 'onTap', type: '() => void', default: '-', description: 'Callback when toast body is clicked' },
    { name: 'actions', type: 'ToastAction[]', default: '-', description: 'Action buttons to display (max 2 recommended)' },
  ];

  actionDocs: ApiDocEntry[] = [
    { name: 'label', type: 'string', description: 'Button label text (required)' },
    { name: 'onClick', type: '() => void', description: 'Click handler callback (required)' },
    { name: 'dismissOnClick', type: 'boolean', default: 'true', description: 'Whether to dismiss the toast after action click' },
    { name: 'style', type: "'default' | 'primary' | 'ghost'", default: "'default'", description: 'Button style variant' },
  ];

  globalConfigDocs: ApiDocEntry[] = [
    { name: 'maxToasts', type: 'number', default: '5', description: 'Maximum number of toasts displayed simultaneously (0 = unlimited)' },
    { name: 'defaultLife', type: 'number', default: '5000', description: 'Default duration in ms before auto-dismiss' },
    { name: 'exitDuration', type: 'number', default: '300', description: 'Duration of exit animation in milliseconds' },
    { name: 'position', type: 'ToastPosition', default: "'bottom-end'", description: 'Default position for toast container' },
    {
      name: 'preventDuplicates',
      type: 'boolean',
      default: 'true',
      description: 'Prevent showing duplicate toasts with same severity and summary',
    },
    { name: 'progressBar', type: 'boolean', default: 'true', description: 'Show progress bar countdown indicator on all toasts' },
    { name: 'pauseOnHover', type: 'boolean', default: 'true', description: 'Pause auto-dismiss timer when hovering over any toast' },
    { name: 'extendedTimeOut', type: 'number', default: '1000', description: 'Additional time (ms) after hover ends before auto-dismiss' },
    {
      name: 'tapToDismiss',
      type: 'boolean',
      default: 'false',
      description: 'Allow clicking anywhere on toast to dismiss (global default)',
    },
    {
      name: 'autoDismiss',
      type: 'boolean',
      default: 'true',
      description: 'Automatically dismiss oldest toast when maxToasts limit is reached',
    },
  ];

  severityTypeDocs: ApiDocEntry[] = [
    { name: "'success'", type: 'ToastSeverity', description: 'Green success notification' },
    { name: "'error'", type: 'ToastSeverity', description: 'Red error notification' },
    { name: "'warning'", type: 'ToastSeverity', description: 'Yellow/amber warning notification' },
    { name: "'info'", type: 'ToastSeverity', description: 'Blue informational notification' },
  ];

  positionTypeDocs: ApiDocEntry[] = [
    { name: "'top-start'", type: 'ToastPosition', description: 'Top-left corner' },
    { name: "'top-center'", type: 'ToastPosition', description: 'Top center' },
    { name: "'top-end'", type: 'ToastPosition', description: 'Top-right corner' },
    { name: "'bottom-start'", type: 'ToastPosition', description: 'Bottom-left corner' },
    { name: "'bottom-center'", type: 'ToastPosition', description: 'Bottom center' },
    { name: "'bottom-end'", type: 'ToastPosition', description: 'Bottom-right corner (default)' },
  ];

  // --- Type code blocks ---
  typeToastSeverity = `type ToastSeverity = 'success' | 'info' | 'warning' | 'error';`;

  typeToastPosition = `type ToastPosition =
  | 'top-start'      // Top-left corner
  | 'top-center'     // Top center
  | 'top-end'        // Top-right corner
  | 'bottom-start'   // Bottom-left corner
  | 'bottom-center'  // Bottom center
  | 'bottom-end';    // Bottom-right corner (default)`;

  typeToastOptions = `interface ToastOptions {
  /** Toast severity/type (required) */
  severity: ToastSeverity;

  /** Main toast message (required) */
  summary: string;

  /** Optional detailed message shown below summary */
  detail?: string;

  /** Duration in ms before auto-dismiss (default: 5000) */
  life?: number;

  /** If true, toast won't auto-dismiss (default: false) */
  sticky?: boolean;

  /** Use soft/muted styling variant (default: false) */
  soft?: boolean;

  /** Show countdown progress bar (default: true from config) */
  progressBar?: boolean;

  /** Pause auto-dismiss on hover (default: true from config) */
  pauseOnHover?: boolean;

  /** Click anywhere on toast to dismiss (default: false from config) */
  tapToDismiss?: boolean;

  /** Callback when toast body is clicked */
  onTap?: () => void;

  /** Action buttons to display (max 2 recommended) */
  actions?: ToastAction[];
}`;

  typeToastAction = `interface ToastAction {
  /** Button label text (required) */
  label: string;

  /** Click handler callback (required) */
  onClick: () => void;

  /** Dismiss toast after action click (default: true) */
  dismissOnClick?: boolean;

  /** Button style variant (default: 'default') */
  style?: 'default' | 'primary' | 'ghost';
}`;

  typeToastGlobalConfig = `interface ToastGlobalConfig {
  /** Max toasts displayed simultaneously, 0 = unlimited (default: 5) */
  maxToasts: number;

  /** Default duration in ms before auto-dismiss (default: 5000) */
  defaultLife: number;

  /** Exit animation duration in ms (default: 300) */
  exitDuration: number;

  /** Default position for toast container (default: 'bottom-end') */
  position: ToastPosition;

  /** Prevent duplicate toasts with same severity+summary (default: true) */
  preventDuplicates: boolean;

  /** Show progress bar countdown on all toasts (default: true) */
  progressBar: boolean;

  /** Pause auto-dismiss on hover for all toasts (default: true) */
  pauseOnHover: boolean;

  /** Additional time in ms after hover ends (default: 1000) */
  extendedTimeOut: number;

  /** Allow clicking anywhere on toast to dismiss (default: false) */
  tapToDismiss: boolean;

  /** Auto-dismiss oldest when maxToasts reached (default: true) */
  autoDismiss: boolean;
}`;
}
