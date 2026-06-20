import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { LucideDynamicIcon, LucidePanelLeft } from '@lucide/angular';
import { MenuComponent } from '../menu/menu.component';
import { MenuConfig, MenuItem } from '../menu/menu.types';
import { SidebarConfig, SidebarSide } from './navbar.types';

/**
 * `<hk-sidebar>` — the sidebar **panel**: a header slot, an embedded vertical
 * {@link MenuComponent}, an optional collapse-to-rail toggle, and a footer slot.
 *
 * It renders just the `<aside>`; the drawer open/overlay scaffolding lives on
 * `<hk-app-shell>`. Use it standalone inside your own `drawer-side`, or let the
 * shell compose it for you.
 *
 * @example
 * <hk-sidebar [menu]="sideMenu" [collapsible]="true" [(collapsed)]="railed">
 *   <div hk-sidebar-header class="p-4">…user card…</div>
 *   <button hk-sidebar-footer class="btn btn-ghost m-2">Sign out</button>
 * </hk-sidebar>
 */
@Component({
  selector: 'hk-sidebar',
  imports: [MenuComponent, LucideDynamicIcon],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent<T = unknown> {
  /** Whole-config input (used by `hk-app-shell`); individual inputs override it. */
  readonly config = input<SidebarConfig | null>(null);

  /** Vertical menu rendered in the panel. */
  readonly menu = input<MenuConfig<T> | null>(null);
  readonly collapsible = input<boolean | undefined>(undefined);
  readonly side = input<SidebarSide | undefined>(undefined);
  /** Expanded width as a CSS length. */
  readonly width = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Icon-rail collapsed state. Two-way bindable; forwarded to the inner menu. */
  readonly collapsed = model<boolean>(false);

  /** Re-emitted from the inner menu when a leaf item is activated. */
  readonly itemSelect = output<MenuItem<T>>();

  /** Built-in collapse-toggle icon (bound as data so apps needn't register it). */
  protected readonly panelIcon = LucidePanelLeft;

  private readonly cfg = computed(() => {
    const c = this.config() ?? {};
    return {
      menu: this.menu() ?? (c.menu as MenuConfig<T> | undefined) ?? null,
      collapsible: this.collapsible() ?? c.collapsible ?? false,
      side: this.side() ?? c.side ?? ('start' as SidebarSide),
      width: this.width() ?? c.width ?? '18rem',
      ariaLabel: this.ariaLabel() ?? c.ariaLabel ?? 'Sidebar',
    };
  });

  readonly resolvedMenu = computed(() => this.cfg().menu);
  readonly resolvedCollapsible = computed(() => this.cfg().collapsible);
  readonly resolvedAriaLabel = computed(() => this.cfg().ariaLabel);

  /** Border on the inner edge so the panel reads as separated from content. */
  readonly borderClass = computed(() =>
    this.cfg().side === 'end' ? 'border-l border-base-content/10' : 'border-r border-base-content/10',
  );

  /** Inline width — narrow rail when collapsed, configured width otherwise. */
  readonly asideWidth = computed(() => (this.collapsed() ? '4rem' : this.cfg().width));

  toggleCollapsed(): void {
    this.collapsed.set(!this.collapsed());
  }
}
