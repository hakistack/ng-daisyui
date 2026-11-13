import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SelectColor, SelectComponent, SelectOption, SelectSize } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { SELECT_PLAYGROUND, SelectPgState } from '../playground-specs';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-select-playground',
  imports: [PlaygroundComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-select
          [options]="options"
          [placeholder]="s.placeholder"
          [enableSearch]="s.enableSearch"
          [multiple]="s.multiple"
          [maxChipsVisible]="s.maxChipsVisible"
          [allowClear]="s.allowClear"
          [disabled]="s.disabled"
          [size]="s.size"
          [color]="s.color"
          (selectionChange)="log('selectionChange', $event)"
          (searchChange)="log('searchChange', $event)"
          (dropdownToggle)="log('dropdownToggle', $event)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class SelectPlaygroundComponent {
  protected readonly spec = SELECT_PLAYGROUND;
  // Same list as SELECT_OPTIONS_SOURCE in the generated code.
  protected readonly options: SelectOption<string>[] = [
    { label: 'Angular', value: 'angular' },
    { label: 'React', value: 'react' },
    { label: 'Vue', value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
    { label: 'Solid', value: 'solid' },
  ];
  protected view(raw: PlaygroundState) {
    const s = raw as SelectPgState;
    return { ...s, size: s.size as SelectSize, color: (s.color || null) as SelectColor | null };
  }
}
