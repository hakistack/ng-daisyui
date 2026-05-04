import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { NotificationService } from '@hakistack/ng-daisyui';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';

type NotificationTab = 'basic' | 'variants' | 'interactions';

@Component({
  selector: 'app-notification-demo',
  imports: [DocSectionComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Notification"
      description="Overlay notifications richer than toast — persistent until dismissed, with avatars, multiple actions, and three layout variants. Sits alongside <hk-toast> in the Feedback category."
      icon="bell"
      category="Feedback"
      importName="NotificationService, provideNotification"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="grid gap-6">
            <app-doc-section
              title="Severity shortcuts"
              description="Built-in convenience methods for the four severity tiers. Each renders the matching daisyUI semantic icon color."
              [codeExample]="severityCode"
            >
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-info btn-sm" (click)="showInfo()">Info</button>
                <button class="btn btn-success btn-sm" (click)="showSuccess()">Success</button>
                <button class="btn btn-warning btn-sm" (click)="showWarning()">Warning</button>
                <button class="btn btn-error btn-sm" (click)="showError()">Error</button>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Auto-dismiss with pause-on-hover"
              description="Pass a duration (ms) for transient messages. Hovering the panel pauses the timer; mouseleave resumes."
              [codeExample]="autoDismissCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showAutoDismiss()">Show 5s timer</button>
            </app-doc-section>

            <app-doc-section
              title="Stack management"
              description="provideNotification({ maxStack: 5 }) caps the stack — overflow drops the oldest with reason 'overflow'."
            >
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-sm" (click)="spamFive()">Show 5 at once</button>
                <button class="btn btn-sm btn-ghost" (click)="dismissAll()">Dismiss all</button>
              </div>
              <p class="mt-3 text-xs text-base-content/60">Active count: {{ count() }}</p>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'variants') {
          <div class="grid gap-6">
            <app-doc-section
              title="default — title + body + close"
              description="Auto-inferred when actions.length === 0. The simplest layout."
              [codeExample]="defaultCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showDefault()">Show default</button>
            </app-doc-section>

            <app-doc-section
              title="default with inline actions"
              description="Actions render as a button row below the message. Useful for Undo / Dismiss-style pairs."
              [codeExample]="inlineActionsCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showInlineActions()">Show inline actions</button>
            </app-doc-section>

            <app-doc-section
              title="side-action — single action on the right"
              description="Auto-inferred when actions.length === 1. Vertical divider + full-height button. Good for Reply-style flows."
              [codeExample]="sideActionCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showSideAction()">Show side-action</button>
            </app-doc-section>

            <app-doc-section
              title="stacked-action — stacked actions on the right"
              description="Auto-inferred when actions.length >= 2 (override with layout: 'default' if you prefer inline). Good for Reply / Don't allow pairs."
              [codeExample]="stackedActionCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showStackedAction()">Show stacked-action</button>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'interactions') {
          <div class="grid gap-6">
            <app-doc-section
              title="Avatar — user message"
              description="Pass an avatar URL to replace the severity icon. Typical for user-generated events."
              [codeExample]="avatarCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showMessage()">Receive message</button>
            </app-doc-section>

            <app-doc-section
              title="Connection invite — Accept / Decline"
              description="Two-action notification with primary + outline variants. Auto-infers stacked-action layout."
              [codeExample]="inviteCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showInvite()">Show invite</button>
            </app-doc-section>

            <app-doc-section
              title="Programmatic update — Saving... → Saved"
              description="Show a notification, then update its title / message / severity later via the returned NotificationRef."
              [codeExample]="updateCode"
            >
              <button class="btn btn-primary btn-sm" (click)="showSavingFlow()">Save with progress</button>
            </app-doc-section>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class NotificationDemoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  readonly featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  readonly activeTab = computed(() => (this.featureParam() ?? 'basic') as NotificationTab);
  readonly count = this.notifications.count;

  // ── Basic tab ──────────────────────────────────────────────────────────

  showInfo(): void {
    this.notifications.info({ title: 'Information', message: 'Just so you know.' });
  }

  showSuccess(): void {
    this.notifications.success({ title: 'Successfully saved!', message: 'Anyone with a link can now view this file.' });
  }

  showWarning(): void {
    this.notifications.warning({ title: 'Heads up', message: 'Your subscription expires in 3 days.' });
  }

  showError(): void {
    this.notifications.error({ title: 'Failed to upload', message: 'The connection timed out. Please retry.' });
  }

  showAutoDismiss(): void {
    this.notifications.info({
      title: 'Closing in 5 seconds',
      message: 'Hover me to pause the timer.',
      duration: 5000,
    });
  }

  spamFive(): void {
    for (let i = 0; i < 7; i++) {
      this.notifications.info({ title: `Notification #${i + 1}`, message: 'Stack capped at 5; first two should drop.' });
    }
  }

  dismissAll(): void {
    this.notifications.dismissAll();
  }

  // ── Variants tab ───────────────────────────────────────────────────────

  showDefault(): void {
    this.notifications.show({
      title: 'Discussion archived',
      message: 'It will appear in your archive folder.',
      severity: 'info',
    });
  }

  showInlineActions(): void {
    this.notifications.show({
      title: 'Discussion moved',
      message: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
      layout: 'default',
      actions: [
        { label: 'Undo', variant: 'primary', onClick: () => 'dismiss' },
        { label: 'Dismiss', variant: 'ghost', onClick: () => 'dismiss' },
      ],
    });
  }

  showSideAction(): void {
    this.notifications.show({
      title: 'Emilia Gates',
      message: 'Sure! 8:30pm works great!',
      avatar: 'https://i.pravatar.cc/64?img=49',
      actions: [{ label: 'Reply', variant: 'primary', onClick: () => 'dismiss' }],
    });
  }

  showStackedAction(): void {
    this.notifications.show({
      title: 'Receive notifications',
      message: 'Notifications may include alerts, sounds, and badges.',
      actions: [
        { label: 'Reply', variant: 'primary', onClick: () => 'dismiss' },
        { label: "Don't allow", variant: 'ghost', onClick: () => 'dismiss' },
      ],
    });
  }

  // ── Interactions tab ───────────────────────────────────────────────────

  showMessage(): void {
    this.notifications.show({
      title: 'Emilia Gates',
      message: 'Sent you an invite to connect.',
      avatar: 'https://i.pravatar.cc/64?img=49',
      layout: 'default',
      actions: [
        { label: 'Accept', variant: 'primary', onClick: () => 'dismiss' },
        { label: 'Decline', variant: 'outline', onClick: () => 'dismiss' },
      ],
    });
  }

  showInvite(): void {
    this.notifications.show({
      title: 'Build #2389 finished',
      message: 'CI passed in 4m 12s. Ready to deploy.',
      severity: 'success',
      actions: [
        { label: 'Deploy', variant: 'primary', onClick: () => 'dismiss' },
        { label: 'View logs', variant: 'ghost', onClick: () => 'dismiss' },
      ],
    });
  }

  showSavingFlow(): void {
    const ref = this.notifications.show({
      title: 'Saving…',
      message: 'Just a moment.',
      severity: 'info',
    });
    setTimeout(() => {
      ref.update({
        title: 'Saved',
        message: 'Anyone with a link can now view this file.',
        severity: 'success',
        duration: 3000,
      });
    }, 1500);
  }

  // ── Code samples ───────────────────────────────────────────────────────

  readonly severityCode = `notifications = inject(NotificationService);

this.notifications.info({ title: 'Information', message: 'Just so you know.' });
this.notifications.success({ title: 'Saved!', message: 'Anyone with a link can view this file.' });
this.notifications.warning({ title: 'Heads up', message: 'Your subscription expires in 3 days.' });
this.notifications.error({ title: 'Failed', message: 'The connection timed out.' });`;

  readonly autoDismissCode = `this.notifications.info({
  title: 'Closing in 5 seconds',
  message: 'Hover me to pause the timer.',
  duration: 5000, // ms — undefined means persistent
});`;

  readonly defaultCode = `this.notifications.show({
  title: 'Discussion archived',
  message: 'It will appear in your archive folder.',
  severity: 'info',
});`;

  readonly inlineActionsCode = `this.notifications.show({
  title: 'Discussion moved',
  message: 'Lorem ipsum dolor sit amet.',
  layout: 'default',  // explicit; otherwise auto-infers stacked-action for >=2 actions
  actions: [
    { label: 'Undo', variant: 'primary', onClick: () => 'dismiss' },
    { label: 'Dismiss', variant: 'ghost', onClick: () => 'dismiss' },
  ],
});`;

  readonly sideActionCode = `this.notifications.show({
  title: 'Emilia Gates',
  message: 'Sure! 8:30pm works great!',
  avatar: '/leslie.jpg',
  // 1 action → auto-infers 'side-action' layout
  actions: [{ label: 'Reply', variant: 'primary', onClick: () => goToChat() }],
});`;

  readonly stackedActionCode = `this.notifications.show({
  title: 'Receive notifications',
  message: 'Notifications may include alerts, sounds, and badges.',
  // 2+ actions → auto-infers 'stacked-action' layout
  actions: [
    { label: 'Reply', variant: 'primary', onClick: () => 'dismiss' },
    { label: "Don't allow", variant: 'ghost', onClick: () => 'dismiss' },
  ],
});`;

  readonly avatarCode = `this.notifications.show({
  title: 'Emilia Gates',
  message: 'Sent you an invite to connect.',
  avatar: 'https://i.pravatar.cc/64?img=49',
  layout: 'default', // override auto-inference for inline buttons under the body
  actions: [
    { label: 'Accept', variant: 'primary', onClick: () => 'dismiss' },
    { label: 'Decline', variant: 'outline', onClick: () => 'dismiss' },
  ],
});`;

  readonly inviteCode = `this.notifications.show({
  title: 'Build #2389 finished',
  message: 'CI passed in 4m 12s. Ready to deploy.',
  severity: 'success',
  actions: [
    { label: 'Deploy', variant: 'primary', onClick: () => deployNow() },
    { label: 'View logs', variant: 'ghost', onClick: () => openLogs() },
  ],
});`;

  readonly updateCode = `// 1. Show with progress state.
const ref = this.notifications.show({
  title: 'Saving…',
  severity: 'info',
});

// 2. Mutate later — title, message, severity, duration all live-updateable.
setTimeout(() => {
  ref.update({
    title: 'Saved',
    message: 'Anyone with a link can now view this file.',
    severity: 'success',
    duration: 3000, // auto-dismiss after the update
  });
}, 1500);`;
}
