import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef } from '@angular/core';

@Component({
  selector: 'hk-tab-panel',
  imports: [],
  templateUrl: './tab-panel.component.html',
  styleUrl: './tab-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabPanelComponent {
  /** Unique value identifier for this tab panel */
  value = input.required<string>();

  /** Label displayed on the tab button */
  label = input('');

  /** Optional icon (reserved for future custom icon support) */
  icon = input<string | undefined>(undefined);

  /** Whether the tab is disabled */
  disabled = input(false);

  readonly contentTemplateRef = contentChild.required(TemplateRef);
}
