import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DatepickerComponent, DatepickerPosition } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { DATEPICKER_PLAYGROUND, DatepickerPgState } from '../playground-specs';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-datepicker-playground',
  imports: [PlaygroundComponent, DatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-datepicker
          [range]="s.range"
          [showTime]="s.showTime"
          [use24Hour]="s.use24Hour"
          [placeholder]="s.placeholder"
          [disabled]="s.disabled"
          [locale]="s.locale"
          [showWeekNumbers]="s.showWeekNumbers"
          [firstDayOfWeek]="s.firstDayOfWeek"
          [closeOnSelect]="s.closeOnSelect"
          [showClearButton]="s.showClearButton"
          [showTodayButton]="s.showTodayButton"
          [dropdownPosition]="s.dropdownPosition"
          (selectionChange)="log('selectionChange', $event)"
          (pickerOpened)="log('pickerOpened', $event)"
          (pickerClosed)="log('pickerClosed', $event)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class DatepickerPlaygroundComponent {
  protected readonly spec = DATEPICKER_PLAYGROUND;
  protected view(raw: PlaygroundState) {
    const s = raw as DatepickerPgState;
    return { ...s, dropdownPosition: s.dropdownPosition as DatepickerPosition };
  }
}
