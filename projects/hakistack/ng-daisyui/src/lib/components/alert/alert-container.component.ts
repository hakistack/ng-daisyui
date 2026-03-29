import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';

import { AlertOverlayComponent } from './alert-overlay.component';
import type { AlertInternalConfig } from '../../services/alert/alert.types';

@Component({
  selector: 'hk-alert-container',
  template: `
    @for (overlay of overlays(); track overlay.id) {
      <hk-alert-overlay [config]="overlay" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [AlertOverlayComponent],
})
export class AlertContainerComponent {
  readonly overlays = signal<AlertInternalConfig[]>([]);
}
