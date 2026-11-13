import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideCheck } from '@lucide/angular';

/** What a {@link MesaSaveStatusComponent} reports. */
export type MesaSaveState = 'idle' | 'dirty' | 'saving' | 'saved';

/**
 * Inline save state for a toolbar (docs/design/mesa-style-guide.md §6):
 * unsaved changes, saving (xs spinner), saved (check). A polite status, so
 * screen readers hear each change; nothing at all while idle.
 */
@Component({
  selector: 'hk-mesa-save-status',
  imports: [LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'text-base-content/70 flex items-center gap-1.5 text-sm', role: 'status', 'aria-live': 'polite' },
  template: `
    @switch (state()) {
      @case ('dirty') {
        <span class="bg-base-content/70 inline-block size-2 rounded-full" aria-hidden="true"></span>
        {{ dirtyLabel() }}
      }
      @case ('saving') {
        <span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
        {{ savingLabel() }}
      }
      @case ('saved') {
        <svg lucideCheck [size]="14" aria-hidden="true"></svg>
        {{ savedLabel() }}
      }
    }
  `,
})
export class MesaSaveStatusComponent {
  readonly state = input.required<MesaSaveState>();
  readonly dirtyLabel = input('Unsaved changes');
  readonly savingLabel = input('Saving…');
  readonly savedLabel = input('Saved');
}
