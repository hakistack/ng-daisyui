import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimepickerComponent, TimepickerPosition } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { TIMEPICKER_PLAYGROUND, TimepickerPgState } from '../specs/timepicker';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-timepicker-playground',
  imports: [PlaygroundComponent, TimepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-timepicker
          [use24Hour]="s.use24Hour"
          [showSeconds]="s.showSeconds"
          [clockFace]="s.clockFace"
          [minuteStep]="s.minuteStep"
          [placeholder]="s.placeholder"
          [disabled]="s.disabled"
          [closeOnSelect]="s.closeOnSelect"
          [showClearButton]="s.showClearButton"
          [showNowButton]="s.showNowButton"
          [dropdownPosition]="s.dropdownPosition"
          (timeChange)="log('timeChange', $event)"
          (pickerOpened)="log('pickerOpened', $event)"
          (pickerClosed)="log('pickerClosed', $event)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class TimepickerPlaygroundComponent {
  protected readonly spec = TIMEPICKER_PLAYGROUND;
  protected view(raw: PlaygroundState) {
    const s = raw as TimepickerPgState;
    return { ...s, dropdownPosition: s.dropdownPosition as TimepickerPosition };
  }
}
