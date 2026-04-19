import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AlertService, type AlertSize } from '@hakistack/ng-daisyui';
import { LucideAngularModule, CircleCheck, CircleX, TriangleAlert, Info, Trash2, Loader, Clock, FileText, Globe } from 'lucide-angular';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

type AlertTab = 'basic' | 'confirm' | 'loading' | 'advanced';
type AlertApiTab = 'methods' | 'configuration' | 'provider' | 'types';

@Component({
  selector: 'app-alert-demo',
  imports: [LucideAngularModule, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Alert Dialogs"
      description="Modal alerts and confirmations with rich content support"
      icon="MessageSquareWarning"
      category="Feedback"
      importName="AlertService"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section
              title="Severity Levels"
              description="Different severity levels for various contexts"
              [codeExample]="severityCode"
            >
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-success" (click)="showSuccess()">
                  <lucide-icon [img]="circleCheckIcon" [size]="18" />
                  Success
                </button>
                <button class="btn btn-error" (click)="showError()">
                  <lucide-icon [img]="circleXIcon" [size]="18" />
                  Error
                </button>
                <button class="btn btn-warning" (click)="showWarning()">
                  <lucide-icon [img]="triangleAlertIcon" [size]="18" />
                  Warning
                </button>
                <button class="btn btn-info" (click)="showInfo()">
                  <lucide-icon [img]="infoIcon" [size]="18" />
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
            <app-doc-section
              title="Confirmation Dialogs"
              description="Ask user for confirmation before actions"
              [codeExample]="confirmCode"
            >
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showConfirm()">Basic Confirm</button>
                <button class="btn btn-outline" (click)="showQuestion()">Yes/No Question</button>
                <button class="btn btn-outline btn-error" (click)="showDeleteConfirm()">Delete Confirmation</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Delete with Item Name" description="Show the item being deleted" [codeExample]="deleteCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline btn-error" (click)="showDeleteWithItem()">
                  <lucide-icon [img]="trash2Icon" [size]="18" />
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
                  <lucide-icon [img]="loaderIcon" [size]="18" />
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

            <app-doc-section
              title="Live Countdown"
              description="Countdown with live seconds display (e.g., session timeout)"
              [codeExample]="countdownCode"
            >
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-warning" (click)="showCountdown()">
                  <lucide-icon [img]="clockIcon" [size]="18" />
                  Session Timeout Warning
                </button>
                <button class="btn btn-outline" (click)="showCountdownCustom()">Custom Countdown</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'advanced') {
          <div class="space-y-6">
            <app-doc-section
              title="Custom Alert (Advanced)"
              description="Using show() with HTML content and footer"
              [codeExample]="fireCode"
            >
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showCustomAlert()">Custom HTML Content</button>
                <button class="btn btn-outline" (click)="showWithFooter()">With Footer</button>
              </div>
            </app-doc-section>

            <app-doc-section
              title="HTML from URL"
              description="Load alert body from an external HTML file instead of inline strings"
              [codeExample]="htmlUrlCode"
            >
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-outline" (click)="showHtmlUrlTerms()">
                  <lucide-icon [img]="fileTextIcon" [size]="18" />
                  Terms (from file)
                </button>
                <button class="btn btn-outline" (click)="showHtmlUrlReleaseNotes()">
                  <lucide-icon [img]="fileTextIcon" [size]="18" />
                  Release Notes (from file)
                </button>
                <button class="btn btn-outline" (click)="showHtmlUrlRemote()">
                  <lucide-icon [img]="globeIcon" [size]="18" />
                  Remote URL (httpbin)
                </button>
                <button class="btn btn-outline" (click)="showHtmlUrlNotFound()">
                  <lucide-icon [img]="triangleAlertIcon" [size]="18" />
                  Bad URL (error fallback)
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="Preset Sizes" description="Modal width presets from sm to full-screen" [codeExample]="sizeCode">
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-sm btn-outline" (click)="showSize('sm')">Small</button>
                <button class="btn btn-sm btn-outline" (click)="showSize('md')">Medium (default)</button>
                <button class="btn btn-sm btn-outline" (click)="showSize('lg')">Large</button>
                <button class="btn btn-sm btn-outline" (click)="showSize('xl')">XL</button>
                <button class="btn btn-sm btn-outline" (click)="showSize('2xl')">2XL</button>
                <button class="btn btn-sm btn-outline" (click)="showSize('4xl')">4XL</button>
                <button class="btn btn-sm btn-outline" (click)="showSize('full')">Full</button>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Custom Dimensions"
              description="Set exact width and max-width via CSS values"
              [codeExample]="customSizeCode"
            >
              <div class="flex flex-wrap gap-3">
                <button class="btn btn-sm btn-outline" (click)="showCustomWidth()">width: 600px</button>
                <button class="btn btn-sm btn-outline" (click)="showViewportWidth()">width: 80vw, max: 900px</button>
                <button class="btn btn-sm btn-outline" (click)="showCustomHeight()">height: 400px</button>
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
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
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
            <app-api-table title="AlertService Methods" [entries]="methodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Usage</h3>
                <p class="text-sm text-base-content/70">
                  Inject <code>AlertService</code> and call methods directly. All methods return a
                  <code>Promise&lt;AlertResult&gt;</code> except <code>showLoading()</code>, <code>updateLoading()</code>, and
                  <code>hideLoading()</code> which are synchronous.
                </p>
                <app-code-block [code]="usageCode" />
              </div>
            </div>
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="AlertOptions" [entries]="alertOptionDocs" />
            <app-api-table title="ConfirmOptions" [entries]="confirmOptionDocs" />
            <app-api-table title="DeleteConfirmOptions" [entries]="deleteConfirmOptionDocs" />
            <app-api-table title="CountdownOptions" [entries]="countdownOptionDocs" />
            <app-api-table title="LoadingOptions" [entries]="loadingOptionDocs" />
          </div>
        }

        <!-- Provider Setup sub-tab -->
        @if (apiTab() === 'provider') {
          <div class="space-y-6">
            <app-api-table title="AlertConfig (provideAlert)" [entries]="alertConfigDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Provider Setup</h3>
                <p class="text-sm text-base-content/70">
                  Use <code>provideAlert()</code> in your application config to customize button translations, language change handling, and
                  theme detection. Without configuration, the service uses English fallbacks and auto-detects the DaisyUI theme.
                </p>
                <app-code-block [code]="providerCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">AlertResult</h3>
                <p class="text-sm text-base-content/70">
                  Returned by all dialog methods. Use <code>isConfirmed</code>, <code>isCancelled</code>, and <code>dismissReason</code> to
                  determine how the user interacted with the alert.
                </p>
                <app-code-block [code]="typeAlertResult" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">AlertOptions</h3>
                <app-code-block [code]="typeAlertOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ConfirmOptions</h3>
                <app-code-block [code]="typeConfirmOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DeleteConfirmOptions</h3>
                <app-code-block [code]="typeDeleteConfirmOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">CountdownOptions</h3>
                <app-code-block [code]="typeCountdownOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">LoadingOptions</h3>
                <app-code-block [code]="typeLoadingOptions" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">AlertConfig</h3>
                <p class="text-sm text-base-content/70">
                  Configuration object passed to <code>provideAlert()</code> for global service customization.
                </p>
                <app-code-block [code]="typeAlertConfig" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class AlertDemoComponent {
  readonly circleCheckIcon = CircleCheck;
  readonly circleXIcon = CircleX;
  readonly triangleAlertIcon = TriangleAlert;
  readonly infoIcon = Info;
  readonly trash2Icon = Trash2;
  readonly loaderIcon = Loader;
  readonly clockIcon = Clock;
  readonly fileTextIcon = FileText;
  readonly globeIcon = Globe;
  private route = inject(ActivatedRoute);
  private alert = inject(AlertService);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as AlertTab);

  apiTab = signal<AlertApiTab>('methods');
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
    await this.alert.show({
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
    await this.alert.show({
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

  // HTML URL demos
  async showHtmlUrlTerms() {
    await this.alert.show({
      title: 'Terms of Service',
      htmlUrl: '/alerts/terms.html',
      icon: 'info',
      size: 'lg',
      showCancelButton: true,
      confirmButtonText: 'Accept',
      cancelButtonText: 'Decline',
    });
  }

  async showHtmlUrlReleaseNotes() {
    await this.alert.show({
      title: 'Release Notes',
      htmlUrl: '/alerts/release-notes.html',
      icon: 'success',
      size: 'lg',
    });
  }

  async showHtmlUrlRemote() {
    await this.alert.show({
      title: 'Remote HTML Content',
      htmlUrl: 'https://httpbin.org/html',
      icon: 'info',
      size: 'xl',
    });
  }

  async showHtmlUrlNotFound() {
    await this.alert.show({
      title: 'Error Demo',
      htmlUrl: '/alerts/does-not-exist.html',
      icon: 'error',
    });
  }

  // Size demos
  async showSize(size: AlertSize) {
    await this.alert.show({
      title: `Size: ${size}`,
      text: `This alert uses the "${size}" preset size.`,
      icon: 'info',
      size,
    });
  }

  async showCustomWidth() {
    await this.alert.show({
      title: 'Custom Width',
      text: 'This alert has a fixed width of 600px.',
      icon: 'info',
      width: '600px',
    });
  }

  async showCustomHeight() {
    await this.alert.show({
      title: 'Custom Height',
      html: `
        <div class="text-left">
          <p>This alert has a fixed height of 400px.</p>
          <p class="mt-2 text-sm text-base-content/50">The content area will scroll if needed.</p>
        </div>
      `,
      icon: 'info',
      height: '400px',
    });
  }

  async showViewportWidth() {
    await this.alert.show({
      title: 'Viewport-Relative Width',
      html: `
        <div class="text-left">
          <p class="mb-2">This alert uses viewport-relative sizing:</p>
          <ul class="list-disc list-inside text-sm">
            <li><code>width: 80vw</code></li>
            <li><code>maxWidth: 900px</code></li>
          </ul>
          <p class="mt-2 text-sm">Resize your browser to see it adapt.</p>
        </div>
      `,
      icon: 'info',
      width: '80vw',
      maxWidth: '900px',
    });
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

  fireCode = `await this.alert.show({
  title: 'Custom Content',
  html: '<p>Rich <strong>HTML</strong> content</p>',
  icon: 'info',
  footer: '<a href="#">Link</a>',
  confirmButtonText: 'Got it!',
});`;

  htmlUrlCode = `// Load from a local asset file
await this.alert.show({
  title: 'Terms of Service',
  htmlUrl: '/assets/alerts/terms.html',
  size: 'lg',
  showCancelButton: true,
  confirmButtonText: 'Accept',
});

// Load from an API endpoint
await this.alert.show({
  title: 'Release Notes',
  htmlUrl: 'https://api.example.com/release-notes',
});

// If the fetch fails, a fallback error message is shown automatically`;

  sizeCode = `// Preset sizes: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full'
await this.alert.show({
  title: 'Large Alert',
  text: 'This uses the lg preset.',
  size: 'lg',
});

// Near full-screen (w-11/12 max-w-5xl)
await this.alert.show({
  title: 'Full Width',
  text: 'Takes most of the screen.',
  size: 'full',
});`;

  customSizeCode = `// Fixed pixel width
await this.alert.show({
  title: 'Custom Width',
  text: 'Exactly 600px wide.',
  width: '600px',
});

// Viewport-relative with cap
await this.alert.show({
  title: 'Responsive',
  text: '80% of viewport, max 900px.',
  width: '80vw',
  maxWidth: '900px',
});

// Custom height
await this.alert.show({
  title: 'Tall Alert',
  text: 'Fixed height of 400px.',
  height: '400px',
});`;

  resultCode = `const result = await this.alert.confirm({
  title: 'Confirm',
  text: 'Are you sure?',
});

// result.isConfirmed  - user clicked confirm
// result.isCancelled  - user clicked cancel
// result.isDismissed  - dismissed by backdrop/esc
// result.dismissReason - 'backdrop' | 'esc' | 'timer'`;

  usageCode = `import { AlertService } from '@hakistack/ng-daisyui';

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

// Advanced (HTML content + footer)
await this.alert.show({ title: 'Custom', html: '<p>HTML content</p>', footer: '<a href="#">Link</a>' });`;

  // --- API docs ---
  methodDocs: ApiDocEntry[] = [
    { name: 'show(options)', type: 'Promise<AlertResult>', description: 'Show a basic alert dialog with full AlertOptions' },
    { name: 'success(title, text?)', type: 'Promise<AlertResult>', description: 'Show a success alert with optional description' },
    { name: 'error(title, text?)', type: 'Promise<AlertResult>', description: 'Show an error alert (outside click disabled by default)' },
    { name: 'warning(title, text?)', type: 'Promise<AlertResult>', description: 'Show a warning alert with optional description' },
    { name: 'info(title, text?)', type: 'Promise<AlertResult>', description: 'Show an info alert with optional description' },
    { name: 'confirm(options)', type: 'Promise<AlertResult>', description: 'Show a confirmation dialog with confirm/cancel buttons' },
    {
      name: 'question(title, text?)',
      type: 'Promise<AlertResult>',
      description: 'Show a yes/no question dialog (uses confirm internally)',
    },
    {
      name: 'confirmDelete(options?)',
      type: 'Promise<AlertResult>',
      description: 'Show a delete confirmation with error-styled confirm button',
    },
    { name: 'countdown(options)', type: 'Promise<AlertResult>', description: 'Show a timed alert with live countdown seconds display' },
    { name: 'showLoading(options?)', type: 'void', description: 'Show a loading dialog with spinner (non-closable by default)' },
    { name: 'updateLoading(text)', type: 'void', description: 'Update the loading dialog body text' },
    { name: 'hideLoading()', type: 'void', description: 'Close the loading dialog' },
  ];

  alertOptionDocs: ApiDocEntry[] = [
    { name: 'title', type: 'string', description: 'Alert title (required)' },
    { name: 'text', type: 'string', default: '-', description: 'Alert message body text' },
    { name: 'html', type: 'string', default: '-', description: 'HTML content (alternative to text)' },
    {
      name: 'htmlUrl',
      type: 'string',
      default: '-',
      description: 'URL to fetch HTML content from (alternative to html). Loaded via fetch() at runtime',
    },
    { name: 'icon', type: "'success' | 'error' | 'warning' | 'info' | 'question'", default: '-', description: 'Alert icon type' },
    { name: 'confirmButtonText', type: 'string', default: "'OK'", description: 'Confirm button text' },
    { name: 'showCancelButton', type: 'boolean', default: 'false', description: 'Show cancel button' },
    { name: 'cancelButtonText', type: 'string', default: "'Cancel'", description: 'Cancel button text' },
    { name: 'focusCancel', type: 'boolean', default: 'false', description: 'Focus cancel button by default' },
    { name: 'allowOutsideClick', type: 'boolean', default: 'true', description: 'Allow clicking outside to close' },
    { name: 'timer', type: 'number', default: '-', description: 'Auto-close after milliseconds (0 = disabled)' },
    { name: 'timerProgressBar', type: 'boolean', default: 'false', description: 'Show timer progress bar' },
    { name: 'footer', type: 'string', default: '-', description: 'Optional footer HTML content' },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full'",
      default: "'md'",
      description: 'Preset modal width (maps to DaisyUI max-w-* classes)',
    },
    { name: 'width', type: 'string', default: '-', description: 'Custom CSS width value (overrides size preset)' },
    { name: 'maxWidth', type: 'string', default: '-', description: 'Custom CSS max-width value (overrides size preset)' },
    { name: 'height', type: 'string', default: '-', description: 'Custom CSS height value' },
    { name: 'maxHeight', type: 'string', default: '-', description: 'Custom CSS max-height value' },
  ];

  confirmOptionDocs: ApiDocEntry[] = [
    { name: 'title', type: 'string', description: 'Dialog title (required)' },
    { name: 'text', type: 'string', default: '-', description: 'Dialog body text' },
    { name: 'icon', type: "'success' | 'error' | 'warning' | 'info' | 'question'", default: "'warning'", description: 'Alert icon type' },
    { name: 'confirmText', type: 'string', default: "'Confirm'", description: 'Confirm button text' },
    { name: 'cancelText', type: 'string', default: "'Cancel'", description: 'Cancel button text' },
    { name: 'focusCancel', type: 'boolean', default: 'false', description: 'Focus the cancel button by default' },
    {
      name: 'confirmStyle',
      type: "'primary' | 'success' | 'error' | 'warning'",
      default: "'success'",
      description: 'Confirm button DaisyUI color style',
    },
  ];

  deleteConfirmOptionDocs: ApiDocEntry[] = [
    { name: 'itemName', type: 'string', default: '-', description: 'Item name to display in the confirmation message' },
    { name: 'title', type: 'string', default: "'Delete Confirmation'", description: 'Custom dialog title' },
    { name: 'text', type: 'string', default: '-', description: 'Custom message (overrides itemName message)' },
    { name: 'confirmText', type: 'string', default: "'Delete'", description: 'Confirm button text' },
    { name: 'cancelText', type: 'string', default: "'Cancel'", description: 'Cancel button text' },
  ];

  countdownOptionDocs: ApiDocEntry[] = [
    { name: 'title', type: 'string', description: 'Dialog title (required)' },
    { name: 'html', type: 'string', description: 'HTML content with {seconds} placeholder for initial value (required)' },
    { name: 'timer', type: 'number', description: 'Countdown duration in milliseconds (required)' },
    { name: 'icon', type: "'success' | 'error' | 'warning' | 'info' | 'question'", default: "'warning'", description: 'Alert icon type' },
    { name: 'timerProgressBar', type: 'boolean', default: 'true', description: 'Show timer progress bar' },
    {
      name: 'countdownSelector',
      type: 'string',
      default: "'.countdown, kbd'",
      description: 'CSS selector for the element whose textContent is updated with remaining seconds',
    },
    { name: 'confirmButtonText', type: 'string', default: "'OK'", description: 'Confirm button text' },
    { name: 'showCancelButton', type: 'boolean', default: 'false', description: 'Show cancel button' },
    { name: 'cancelButtonText', type: 'string', default: "'Cancel'", description: 'Cancel button text' },
    { name: 'allowOutsideClick', type: 'boolean', default: 'false', description: 'Allow clicking outside to close' },
  ];

  loadingOptionDocs: ApiDocEntry[] = [
    { name: 'title', type: 'string', default: "'Loading...'", description: 'Loading dialog title' },
    { name: 'text', type: 'string', default: '-', description: 'Loading dialog message' },
    { name: 'allowClose', type: 'boolean', default: 'false', description: 'Allow closing via ESC or backdrop click' },
  ];

  resultDocs: ApiDocEntry[] = [
    { name: 'isConfirmed', type: 'boolean', description: 'True when user clicked the confirm button' },
    { name: 'isDismissed', type: 'boolean', description: 'True when dialog was cancelled or dismissed' },
    { name: 'isCancelled', type: 'boolean', description: 'True when user clicked the cancel button specifically' },
    {
      name: 'dismissReason',
      type: "'cancel' | 'backdrop' | 'close' | 'esc' | 'timer'",
      default: '-',
      description: 'How the dialog was dismissed',
    },
  ];

  alertConfigDocs: ApiDocEntry[] = [
    {
      name: 'translate',
      type: '(key, fallback, params?) => string',
      default: '-',
      description: 'Custom translation function for button labels (e.g. Transloco integration)',
    },
    {
      name: 'langChange$',
      type: 'Observable<unknown>',
      default: '-',
      description: 'Observable that emits on language change to invalidate cached button translations',
    },
    { name: 'useSystemTheme', type: 'boolean', default: 'false', description: 'Use prefers-color-scheme for dark/light theme detection' },
    { name: 'theme', type: "() => 'light' | 'dark'", default: '-', description: 'Custom theme function (overrides useSystemTheme)' },
  ];

  providerCode = `import { provideAlert } from '@hakistack/ng-daisyui';

// Basic usage (English fallbacks, auto-detects DaisyUI theme)
provideAlert()

// With system theme detection
provideAlert({ useSystemTheme: true })

// With Transloco and custom theme
provideAlert({
  translate: (key, fallback, params) =>
    transloco.translate(key, params) || fallback,
  langChange$: transloco.langChanges$,
  theme: () => themeService.isDarkMode() ? 'dark' : 'light',
})`;

  // --- Type code blocks ---
  typeAlertResult = `interface AlertResult {
  /** True when user clicked the confirm button */
  isConfirmed: boolean;

  /** True when dialog was cancelled or dismissed */
  isDismissed: boolean;

  /** True when user clicked the cancel button specifically */
  isCancelled: boolean;

  /** How the dialog was dismissed */
  dismissReason?: 'cancel' | 'backdrop' | 'close' | 'esc' | 'timer';
}`;

  typeAlertOptions = `interface AlertOptions {
  title: string;              // Alert title (required)
  text?: string;              // Alert message body text
  html?: string;              // HTML content (alternative to text)
  icon?: AlertIcon;           // 'success' | 'error' | 'warning' | 'info' | 'question'
  confirmButtonText?: string; // Confirm button text (default: 'OK')
  showCancelButton?: boolean; // Show cancel button (default: false)
  cancelButtonText?: string;  // Cancel button text (default: 'Cancel')
  focusCancel?: boolean;      // Focus cancel button by default
  allowOutsideClick?: boolean;// Allow clicking outside to close (default: true)
  timer?: number;             // Auto-close after ms (0 = disabled)
  timerProgressBar?: boolean; // Show timer progress bar
}`;

  typeConfirmOptions = `interface ConfirmOptions {
  title: string;                                        // Dialog title (required)
  text?: string;                                        // Dialog body text
  icon?: AlertIcon;                                     // Icon type (default: 'warning')
  confirmText?: string;                                 // Confirm button text (default: 'Confirm')
  cancelText?: string;                                  // Cancel button text (default: 'Cancel')
  focusCancel?: boolean;                                // Focus cancel button (default: false)
  confirmStyle?: 'primary' | 'success' | 'error' | 'warning'; // Confirm button style
}`;

  typeDeleteConfirmOptions = `interface DeleteConfirmOptions {
  itemName?: string;    // Item name to display in confirmation message
  title?: string;       // Custom dialog title (default: 'Delete Confirmation')
  text?: string;        // Custom message (overrides itemName message)
  confirmText?: string; // Confirm button text (default: 'Delete')
  cancelText?: string;  // Cancel button text (default: 'Cancel')
}`;

  typeCountdownOptions = `interface CountdownOptions {
  title: string;                // Alert title (required)
  html: string;                 // HTML with {seconds} placeholder (required)
  timer: number;                // Countdown duration in ms (required)
  icon?: AlertIcon;             // Icon type (default: 'warning')
  timerProgressBar?: boolean;   // Show progress bar (default: true)
  countdownSelector?: string;   // CSS selector for countdown element (default: '.countdown, kbd')
  confirmButtonText?: string;   // Confirm button text
  showCancelButton?: boolean;   // Show cancel button
  cancelButtonText?: string;    // Cancel button text
  allowOutsideClick?: boolean;  // Allow outside click (default: false)
}`;

  typeLoadingOptions = `interface LoadingOptions {
  title?: string;    // Loading dialog title (default: 'Loading...')
  text?: string;     // Loading dialog message
  allowClose?: boolean; // Allow closing via ESC or backdrop (default: false)
}`;

  typeAlertConfig = `interface AlertConfig {
  /** Custom translation function for button labels */
  translate?: (key: string, fallback: string, params?: Record<string, unknown>) => string;

  /** Observable that emits on language change to invalidate cached translations */
  langChange$?: Observable<unknown>;

  /** Use prefers-color-scheme for theme detection (default: false) */
  useSystemTheme?: boolean;

  /** Custom theme function (overrides useSystemTheme) */
  theme?: () => 'light' | 'dark';
}`;
}
