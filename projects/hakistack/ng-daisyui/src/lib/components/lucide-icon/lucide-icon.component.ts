import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { icons, LucideAngularModule } from 'lucide-angular';

/**
 * Accepts any string so consumers aren't constrained to the exact
 * lucide-angular version the library was compiled against.
 * Known icon names still get autocomplete via the union with `keyof typeof icons`.
 */
export type IconName = keyof typeof icons | (string & {});
export type LowerCaseIconName = Lowercase<string> & string;

/**
 * Wrapper component for rendering Lucide icons.
 *
 * Provides a simplified API over `lucide-angular` with sensible defaults
 * for size, color, and stroke width.
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
  readonly name = input.required<IconName>();
  readonly size = input<number>(20);
  readonly color = input<string>('currentColor');
  readonly strokeWidth = input<number>(2);
  readonly absoluteStrokeWidth = input<boolean>(false);
  readonly class = input<string>('');

  readonly icon = computed(() => (icons as Record<string, (typeof icons)[keyof typeof icons]>)[this.name()]);
}
