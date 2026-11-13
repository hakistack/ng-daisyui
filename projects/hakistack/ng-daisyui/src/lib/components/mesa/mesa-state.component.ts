import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideInfo, LucideTriangleAlert } from '@lucide/angular';

/** Which state a {@link MesaStateComponent} shows. */
export type MesaStateKind = 'loading' | 'error' | 'blocked' | 'empty';

/**
 * Loading, error, blocked and empty states with their ARIA (docs/design/mesa-style-guide.md §6):
 * a polite status for loading and blocked, an alert for errors, centered and
 * at most `max-w-md` wide. Projected content (e.g. a Retry button) goes under
 * the message.
 */
@Component({
  selector: 'hk-mesa-state',
  imports: [LucideTriangleAlert, LucideInfo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @switch (kind()) {
      @case ('loading') {
        <div class="text-base-content/70 flex items-center justify-center gap-3 py-16 text-sm" role="status">
          <span class="loading loading-dots loading-md" aria-hidden="true"></span>
          {{ message() }}
        </div>
      }
      @case ('error') {
        <div role="alert" class="alert alert-error mx-auto mt-10 max-w-md">
          <svg lucideTriangleAlert [size]="16" aria-hidden="true"></svg>
          <div class="flex min-w-0 flex-col gap-1">
            @if (heading()) {
              <span class="font-medium">{{ heading() }}</span>
            }
            <span class="text-sm break-words">{{ message() }}</span>
          </div>
          <ng-content />
        </div>
      }
      @case ('blocked') {
        <div role="status" class="alert mx-auto mt-10 max-w-md">
          <svg lucideInfo [size]="16" aria-hidden="true"></svg>
          <span>{{ message() }}</span>
          <ng-content />
        </div>
      }
      @default {
        @if (heading()) {
          <div class="bg-base-100 rounded-box ring-base-content/45 mx-auto mt-10 max-w-md p-8 shadow-lg ring-1">
            <h2 class="mb-2 text-base font-semibold">{{ heading() }}</h2>
            <p class="text-base-content/70 text-sm leading-relaxed">{{ message() }}</p>
          </div>
        } @else {
          <p class="text-base-content/70 mx-auto max-w-md px-4 py-7 text-center text-sm">{{ message() }}</p>
        }
      }
    }
  `,
})
export class MesaStateComponent {
  readonly kind = input.required<MesaStateKind>();
  readonly message = input('');
  /** Optional title (errors and empty states). */
  readonly heading = input('');
}
