import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { type LucideIconData, LucideAngularModule } from 'lucide-angular';

import { ICON_REGISTRY } from './icon-registry';

/**
 * Accepts any string so consumers aren't constrained to the exact
 * lucide-angular version the library was compiled against.
 */
export type IconName = string;
export type LowerCaseIconName = Lowercase<string> & string;

/**
 * Wrapper component for rendering Lucide icons.
 *
 * Provides a simplified API over `lucide-angular` with sensible defaults
 * for size, color, and stroke width.
 *
 * Icons are resolved from the `ICON_REGISTRY` injection token. Library-internal
 * icons are always available. Consumers register additional icons via `provideIcons()`.
 *
 * ```html
 * <hk-lucide-icon name="Search" [size]="24" />
 * ```
 */
@Component({
  selector: 'hk-lucide-icon',
  imports: [LucideAngularModule],
  templateUrl: './lucide-icon.component.html',
  styleUrl: './lucide-icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LucideIconComponent {
  private readonly registry = inject(ICON_REGISTRY);

  readonly name = input.required<IconName>();
  readonly iconData = input<LucideIconData>();
  readonly size = input<number>(20);
  readonly color = input<string>('currentColor');
  readonly strokeWidth = input<number>(2);
  readonly absoluteStrokeWidth = input<boolean>(false);
  readonly class = input<string>('');

  readonly icon = computed(() => this.iconData() ?? this.registry[this.name()]);
}
