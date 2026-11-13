import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InputColor, InputComponent, InputSize, InputVariant } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { INPUT_PLAYGROUND, InputPgState } from '../playground-specs';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-input-playground',
  imports: [PlaygroundComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-input
          [variant]="s.variant"
          [size]="s.size"
          [color]="s.color"
          [placeholder]="s.placeholder"
          [disabled]="s.disabled"
          [readonly]="s.readonly"
          [prefixText]="s.prefixText"
          [suffixText]="s.suffixText"
          ariaLabel="Playground input"
          (valueChange)="log('valueChange', $event)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class InputPlaygroundComponent {
  protected readonly spec = INPUT_PLAYGROUND;
  protected view(raw: PlaygroundState) {
    const s = raw as InputPgState;
    return { ...s, variant: s.variant as InputVariant, size: s.size as InputSize, color: (s.color || null) as InputColor | null };
  }
}
