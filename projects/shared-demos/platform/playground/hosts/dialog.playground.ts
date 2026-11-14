import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef, DialogRole } from '@angular/cdk/dialog';
import { DialogService } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { DIALOG_PLAYGROUND, DialogPgState } from '../specs/dialog';
import type { PlaygroundState } from '../playground.types';

type Log = (name: string, payload: unknown) => void;

/** Sample dialog content — the same component the generated code declares. */
@Component({
  selector: 'app-playground-upgrade-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">Upgrade your plan</h2>
        <p>{{ data.message }}</p>
        <div class="card-actions justify-end">
          <button type="button" class="btn btn-ghost" (click)="ref.close('later')">Not now</button>
          <button type="button" class="btn btn-primary" (click)="ref.close('upgrade')">Upgrade</button>
        </div>
      </div>
    </div>
  `,
})
export class PlaygroundUpgradeDialogComponent {
  protected readonly data = inject<{ message: string }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
}

@Component({
  selector: 'app-dialog-playground',
  imports: [PlaygroundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <div class="flex justify-center">
          <button type="button" class="btn btn-primary" (click)="open(raw, log)">Open dialog</button>
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class DialogPlaygroundComponent {
  protected readonly spec = DIALOG_PLAYGROUND;
  private readonly dialog = inject(DialogService);

  /** Opens the sample component through the real service and logs the close result. */
  protected open(raw: PlaygroundState, log: Log): void {
    const s = raw as DialogPgState;
    const ref = this.dialog.open(PlaygroundUpgradeDialogComponent, {
      data: { message: s.data },
      width: s.width,
      maxWidth: s.maxWidth,
      disableClose: s.disableClose,
      hasBackdrop: s.hasBackdrop,
      role: s.role as DialogRole,
      autoFocus: s.autoFocus,
      restoreFocus: s.restoreFocus,
    });
    ref.closed.subscribe((result) => log('closed', result ?? null));
  }
}
