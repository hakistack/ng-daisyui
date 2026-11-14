import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AlertIcon, AlertService, AlertSize } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { ALERT_PLAYGROUND, AlertPgState } from '../specs/alert';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-alert-playground',
  imports: [PlaygroundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <div class="flex justify-center">
          <button type="button" class="btn btn-primary" (click)="open(raw, log)">Open alert</button>
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class AlertPlaygroundComponent {
  protected readonly spec = ALERT_PLAYGROUND;
  private readonly alert = inject(AlertService);

  /** Calls the real service and logs the resolved AlertResult. */
  protected async open(raw: PlaygroundState, log: (name: string, payload: unknown) => void): Promise<void> {
    const s = raw as AlertPgState;
    const result = await this.alert.show({
      title: s.title,
      text: s.text,
      icon: s.icon as AlertIcon,
      confirmButtonText: s.confirmButtonText,
      showCancelButton: s.showCancelButton,
      cancelButtonText: s.cancelButtonText,
      allowOutsideClick: s.allowOutsideClick,
      size: s.size as AlertSize,
    });
    log('result', result);
  }
}
