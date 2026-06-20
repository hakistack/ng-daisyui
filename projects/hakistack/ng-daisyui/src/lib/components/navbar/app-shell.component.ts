import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';
import { drawerOpenAtBreakpoint } from './navbar.helpers';
import { NavbarConfig, ShellBreakpoint, ShellConfig, ShellMode, SidebarConfig, SidebarSide } from './navbar.types';
import { generateUniqueId } from '../../utils/generate-uuid';

/**
 * `<hk-app-shell>` — the DaisyUI **drawer** scaffold that composes an
 * {@link NavbarComponent}, a {@link SidebarComponent}, and the page content into
 * an app layout. The sidebar is permanent from `responsiveBreakpoint` up and
 * overlays the content below it (`mode: 'push'`), or always overlays
 * (`mode: 'overlay'`).
 *
 * The shared `drawerOpen` state replaces the starter template's manual
 * `<input>`/`<label>` checkbox juggling; the navbar hamburger toggles it and the
 * drawer auto-closes after navigation.
 *
 * Projection slots: `[hk-brand]`, `[hk-navbar-center]`, `[hk-navbar-end]`,
 * `[hk-sidebar-header]`, `[hk-sidebar-footer]`, `[hk-footer]`, and the default
 * slot for page content (e.g. `<router-outlet>`).
 *
 * @example
 * <hk-app-shell [navbar]="{ sticky: true }" [sidebar]="{ collapsible: true, menu: sideMenu }">
 *   <span hk-brand class="text-xl font-bold px-2">Acme</span>
 *   <button hk-navbar-end class="btn btn-ghost btn-circle">…</button>
 *   <div hk-sidebar-header class="p-4">…user card…</div>
 *   <router-outlet />
 * </hk-app-shell>
 */
@Component({
  selector: 'hk-app-shell',
  imports: [NavbarComponent, SidebarComponent, CdkTrapFocus],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(keydown.escape)': 'onEscape()',
  },
})
export class AppShellComponent {
  /** Whole-config input; individual inputs override it. */
  readonly config = input<ShellConfig | null>(null);
  readonly navbar = input<NavbarConfig | null>(null);
  readonly sidebar = input<SidebarConfig | null>(null);
  readonly responsiveBreakpoint = input<ShellBreakpoint | undefined>(undefined);
  readonly mode = input<ShellMode | undefined>(undefined);

  /** Drawer open state (overlay/mobile). Two-way bindable. */
  readonly drawerOpen = model<boolean>(false);
  /** Sidebar icon-rail collapsed state. Two-way bindable. */
  readonly collapsed = model<boolean>(false);

  /** Unique id linking the drawer toggle checkbox and its overlay label. */
  readonly drawerId = `hk-drawer-${generateUniqueId()}`;

  private readonly cfg = computed(() => {
    const c = this.config() ?? {};
    return {
      navbar: this.navbar() ?? c.navbar ?? null,
      sidebar: this.sidebar() ?? c.sidebar ?? null,
      bp: this.responsiveBreakpoint() ?? c.responsiveBreakpoint ?? ('lg' as ShellBreakpoint),
      mode: this.mode() ?? c.mode ?? ('push' as ShellMode),
    };
  });

  readonly navbarConfig = computed(() => this.cfg().navbar);
  readonly sidebarConfig = computed(() => this.cfg().sidebar);
  readonly isOverlay = computed(() => this.cfg().mode === 'overlay');
  readonly sidebarSide = computed<SidebarSide>(() => this.sidebarConfig()?.side ?? 'start');

  readonly drawerClass = computed(() => {
    const c = this.cfg();
    const obj: Record<string, boolean> = { 'drawer-end': this.sidebarSide() === 'end' };
    if (c.mode === 'push') Object.assign(obj, drawerOpenAtBreakpoint(c.bp));
    return obj;
  });

  /** Hide the hamburger at the breakpoint (push) or never (overlay = always shown). */
  readonly toggleBreakpoint = computed<ShellBreakpoint | 'never'>(() => (this.isOverlay() ? 'never' : this.cfg().bp));

  /** Trap focus inside the drawer only while it's an open overlay. */
  readonly trapActive = computed(() => this.isOverlay() && this.drawerOpen());

  onToggleChange(checked: boolean): void {
    this.drawerOpen.set(checked);
  }

  toggleDrawer(): void {
    this.drawerOpen.set(!this.drawerOpen());
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  onEscape(): void {
    if (this.drawerOpen()) this.closeDrawer();
  }

  /** Close the overlay drawer after navigation (no-op visually when permanent). */
  onItemSelect(): void {
    this.closeDrawer();
  }
}
