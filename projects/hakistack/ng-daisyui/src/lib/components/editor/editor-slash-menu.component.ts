import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { TOOLBAR_ICON_COMPONENTS } from './editor.defaults';
import type { EditorSlashCommand } from './editor.types';

/**
 * Notion-style slash-command popup. Renders the filtered command list as a
 * DaisyUI `menu`, supports keyboard navigation (Up / Down / Enter / Escape),
 * and emits `commit` when the user picks an item. The host editor owns the
 * filter state — this component is purely presentational.
 *
 * Positioning is driven by the editor (via inline `top` / `left` styles on
 * the host) so this component doesn't need floating-ui.
 */
@Component({
  selector: 'hk-editor-slash-menu',
  imports: [LucideDynamicIcon, ...TOOLBAR_ICON_COMPONENTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `fixed` (not `absolute`) so the popup escapes any `overflow:hidden`
    // ancestor — notably the outer `.hk-editor` card that clips its rounded
    // corners. Coords are viewport-relative (set by the parent component).
    class: 'hk-editor-slash-menu fixed z-50 w-72 max-h-80 overflow-y-auto rounded-md border border-base-content/15 bg-base-100 shadow-lg',
    role: 'listbox',
    '[attr.aria-label]': '"Slash commands"',
  },
  template: `
    @if (groupedItems(); as groups) {
      @if (items().length === 0) {
        <div class="px-3 py-4 text-xs text-base-content/60 text-center">No matching commands</div>
      }
      <ul class="menu menu-sm w-full p-1 flex-nowrap">
        @for (group of groups; track group.name) {
          @if (group.name) {
            <li class="menu-title text-xs">{{ group.name }}</li>
          }
          @for (item of group.items; track item.id) {
            <li>
              <button
                type="button"
                role="option"
                [id]="'hk-slash-opt-' + item.id"
                [attr.aria-selected]="item.id === activeId()"
                [class.menu-active]="item.id === activeId()"
                class="flex items-start gap-3 py-2"
                (click)="commit.emit(item)"
                (mousemove)="hoverId.emit(item.id)"
              >
                @if (item.icon; as icon) {
                  <svg [lucideIcon]="icon" [size]="16" [strokeWidth]="2" class="mt-0.5 shrink-0 text-base-content/70"></svg>
                }
                <span class="flex flex-col items-start min-w-0">
                  <span class="font-medium truncate">{{ item.label }}</span>
                  @if (item.description) {
                    <span class="text-xs text-base-content/60 truncate">{{ item.description }}</span>
                  }
                </span>
              </button>
            </li>
          }
        }
      </ul>
    }
  `,
})
export class EditorSlashMenuComponent {
  readonly items = input.required<readonly EditorSlashCommand[]>();
  readonly activeId = input<string | null>(null);

  readonly commit = output<EditorSlashCommand>();
  readonly hoverId = output<string>();

  /** Group items by their `group` field; keep first-occurrence order. */
  readonly groupedItems = computed(() => {
    const map = new Map<string, EditorSlashCommand[]>();
    for (const item of this.items()) {
      const key = item.group ?? '';
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map, ([name, items]) => ({ name, items }));
  });

  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef);

  /**
   * Scroll the active row into view when it changes — guards keyboard nav so
   * the user never loses sight of the highlighted item in a long list.
   */
  scrollActiveIntoView(): void {
    const id = this.activeId();
    if (!id) return;
    const row = this.hostRef.nativeElement.querySelector<HTMLElement>(`#hk-slash-opt-${CSS.escape(id)}`);
    row?.scrollIntoView({ block: 'nearest' });
  }
}
