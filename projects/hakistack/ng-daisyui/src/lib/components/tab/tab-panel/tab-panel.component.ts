import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef } from '@angular/core';
import type { LucideIconData } from '@lucide/angular';

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

  /**
   * Optional icon shown before the label: a Lucide icon name registered with `provideLucideIcons(...)`
   * (kebab-case `'credit-card'`; PascalCase `'CreditCard'` is normalised), or icon data (`LucideHouse.icon`).
   * Unregistered names render nothing (with a dev-mode warning) instead of throwing.
   */
  icon = input<string | LucideIconData | undefined>(undefined);

  /** Whether the tab is disabled */
  disabled = input(false);

  readonly contentTemplateRef = contentChild.required(TemplateRef);
}
