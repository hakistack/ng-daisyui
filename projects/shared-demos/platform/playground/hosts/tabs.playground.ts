import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { TABS_PANELS, TABS_PLAYGROUND, TabsPgState } from '../specs/tabs';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-tabs-playground',
  imports: [PlaygroundComponent, TabGroupComponent, TabPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-tab-group
          [variant]="s.variant"
          [orientation]="s.orientation"
          [selectionMode]="s.selectionMode"
          [wrap]="s.wrap"
          [activeIndex]="s.activeIndex"
          (selectedTabChange)="log('selectedTabChange', $event)"
        >
          @for (p of panels; track p.value) {
            <hk-tab-panel [value]="p.value" [label]="p.label">
              <ng-template
                ><p class="text-sm">{{ p.text }}</p></ng-template
              >
            </hk-tab-panel>
          }
        </hk-tab-group>
      </ng-template>
    </app-playground>
  `,
})
export class TabsPlaygroundComponent {
  protected readonly spec = TABS_PLAYGROUND;
  protected readonly panels = TABS_PANELS;

  protected view(raw: PlaygroundState) {
    const s = raw as TabsPgState;
    return {
      variant: s.variant as 'lift' | 'box' | 'border',
      orientation: s.orientation as 'horizontal' | 'vertical',
      selectionMode: s.selectionMode as 'follow' | 'explicit',
      wrap: s.wrap,
      activeIndex: s.activeIndex,
    };
  }
}
