import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastSeverity } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { TOAST_PLAYGROUND, ToastPgState } from '../playground-specs';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-toast-playground',
  imports: [PlaygroundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <div class="flex flex-wrap items-center gap-3 justify-center">
          <button type="button" class="btn btn-primary" (click)="log('show', show(raw))">Show toast</button>
          <button type="button" class="btn btn-ghost" (click)="clear(); log('clear', null)">Clear all</button>
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class ToastPlaygroundComponent {
  protected readonly spec = TOAST_PLAYGROUND;
  private readonly toast = inject(ToastService);

  /** Calls the real service with the playground options; returns the toast id. */
  protected show(raw: PlaygroundState): string {
    const s = raw as ToastPgState;
    return this.toast.show({
      severity: s.severity as ToastSeverity,
      summary: s.summary,
      detail: s.detail,
      life: s.life,
      sticky: s.sticky,
      soft: s.soft,
      progressBar: s.progressBar,
      pauseOnHover: s.pauseOnHover,
    });
  }
  protected clear(): void {
    this.toast.clear();
  }
}
