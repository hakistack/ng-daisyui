import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  NotificationAction,
  NotificationLayout,
  NotificationPosition,
  NotificationService,
  NotificationSeverity,
} from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { NOTIFICATION_PLAYGROUND, NOTIFICATION_SAMPLE_ACTIONS, NotificationPgState } from '../specs/notification';
import type { PlaygroundState } from '../playground.types';

type Log = (name: string, payload: unknown) => void;

/**
 * The docs shell already mounts `<hk-notification-host />` and calls
 * `provideNotification()`, so the real service renders into the page.
 */
@Component({
  selector: 'app-notification-playground',
  imports: [PlaygroundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <div class="flex flex-wrap items-center gap-3 justify-center">
          <button type="button" class="btn btn-primary" (click)="show(raw, log)">Show notification</button>
          <button type="button" class="btn btn-ghost" (click)="dismissAll(log)">Dismiss all</button>
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class NotificationPlaygroundComponent {
  protected readonly spec = NOTIFICATION_PLAYGROUND;
  private readonly notifications = inject(NotificationService);

  /** Calls the real service with the playground options and logs the ref lifecycle. */
  protected show(raw: PlaygroundState, log: Log): void {
    const s = raw as NotificationPgState;
    const actions: NotificationAction[] = NOTIFICATION_SAMPLE_ACTIONS.slice(0, s.actions).map((a) => ({
      label: a.label,
      variant: a.variant,
      onClick: () => {
        log('action', a.label);
        return 'dismiss';
      },
    }));
    const ref = this.notifications.show({
      title: s.title,
      message: s.message || undefined,
      severity: s.severity as NotificationSeverity,
      layout: s.layout as NotificationLayout,
      actions,
      duration: s.duration,
      closable: s.closable,
      autoFocus: s.autoFocus,
      position: s.position as NotificationPosition,
    });
    log('show', ref.id);
    ref.onDismiss((reason) => log('onDismiss', reason));
  }

  protected dismissAll(log: Log): void {
    this.notifications.dismissAll();
    log('dismissAll', null);
  }
}
