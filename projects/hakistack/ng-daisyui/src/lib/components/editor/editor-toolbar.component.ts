import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { TOOLBAR_ICON_COMPONENTS, TOOLBAR_ICONS, TOOLBAR_LABELS, TOOLBAR_PRESETS } from './editor.defaults';
import type { EditorToolbarConfig, EditorToolbarItem } from './editor.types';

/**
 * Stateless editor toolbar. Knows nothing about TipTap or editor state — the
 * parent passes which items are active / runnable and handles command dispatch.
 * Swappable for a custom toolbar in the future without touching the editor core.
 *
 * Styling uses Tailwind + DaisyUI utility classes directly so the consumer's
 * Tailwind pipeline (which already scans library source) generates the classes.
 * Avoids issues with inline styles being suppressed by v4's CSS pipeline.
 */
@Component({
  selector: 'hk-editor-toolbar',
  imports: [LucideDynamicIcon, ...TOOLBAR_ICON_COMPONENTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="toolbar" aria-label="Formatting" class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-base-content/25">
      @for (item of resolvedItems(); track $index) {
        @if (item === 'divider') {
          <div class="inline-block w-px h-5 mx-1.5 bg-base-content/20 shrink-0" role="separator" aria-hidden="true"></div>
        } @else {
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            [class.btn-active]="isActive()(item)"
            [attr.aria-label]="labels[item]"
            [attr.aria-pressed]="isActive()(item) ? 'true' : null"
            [disabled]="disabled() || !canRun()(item)"
            (mousedown)="$event.preventDefault()"
            (click)="toolbarCommand.emit(item)"
          >
            <svg [lucideIcon]="icons[item]" [size]="16" [strokeWidth]="2"></svg>
          </button>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class EditorToolbarComponent {
  readonly config = input<EditorToolbarConfig>('basic');
  readonly isActive = input<(item: EditorToolbarItem) => boolean>(() => false);
  readonly canRun = input<(item: EditorToolbarItem) => boolean>(() => true);
  readonly disabled = input<boolean>(false);

  readonly toolbarCommand = output<EditorToolbarItem>();

  readonly icons = TOOLBAR_ICONS;
  readonly labels = TOOLBAR_LABELS;

  readonly resolvedItems = computed<readonly EditorToolbarItem[]>(() => {
    const cfg = this.config();
    return typeof cfg === 'string' ? TOOLBAR_PRESETS[cfg] : cfg;
  });
}
