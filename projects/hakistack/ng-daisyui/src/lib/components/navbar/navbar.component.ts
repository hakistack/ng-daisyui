import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon, LucideMenu } from '@lucide/angular';
import { MenuComponent } from '../menu/menu.component';
import { MenuConfig } from '../menu/menu.types';
import { hideAtBreakpoint, showFlexAtBreakpoint } from './navbar.helpers';
import { NavbarConfig, ShellBreakpoint } from './navbar.types';

/**
 * `<hk-navbar>` — a DaisyUI navbar with `start` / `center` / `end` projection
 * slots, an optional embedded horizontal {@link MenuComponent}, and an optional
 * responsive hamburger that emits `(menuToggle)`.
 *
 * Everything app-specific (brand, avatar, theme toggle) is projected — the
 * library ships no auth/i18n dependencies.
 *
 * @example
 * <hk-navbar [sticky]="true" [menu]="navMenu">
 *   <span hk-navbar-start class="text-xl font-bold">Acme</span>
 *   <button hk-navbar-end class="btn btn-ghost btn-circle">…</button>
 * </hk-navbar>
 */
@Component({
  selector: 'hk-navbar',
  imports: [MenuComponent, LucideDynamicIcon],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  /** Whole-config input (used by `hk-app-shell`); individual inputs override it. */
  readonly config = input<NavbarConfig | null>(null);

  readonly sticky = input<boolean | undefined>(undefined);
  readonly shadow = input<boolean | undefined>(undefined);
  /** Optional embedded menu (rendered in the centre, forced horizontal). */
  readonly menu = input<MenuConfig | null>(null);
  readonly showMenuToggle = input<boolean | undefined>(undefined);
  readonly menuToggleBreakpoint = input<ShellBreakpoint | 'never' | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Emitted when the hamburger is clicked. */
  readonly menuToggle = output<void>();

  /** Built-in hamburger icon (bound as data so apps needn't register it). */
  protected readonly menuIcon = LucideMenu;

  private readonly cfg = computed(() => {
    const c = this.config() ?? {};
    return {
      sticky: this.sticky() ?? c.sticky ?? false,
      shadow: this.shadow() ?? c.shadow ?? true,
      menu: this.menu() ?? c.menu ?? null,
      showMenuToggle: this.showMenuToggle() ?? c.showMenuToggle ?? false,
      menuToggleBreakpoint: this.menuToggleBreakpoint() ?? c.menuToggleBreakpoint ?? 'lg',
      ariaLabel: this.ariaLabel() ?? c.ariaLabel ?? 'Main',
    };
  });

  readonly resolvedMenu = computed(() => this.cfg().menu);
  readonly resolvedAriaLabel = computed(() => this.cfg().ariaLabel);
  readonly resolvedShowToggle = computed(() => this.cfg().showMenuToggle);

  readonly navClass = computed(() => {
    const c = this.cfg();
    const classes = ['bg-base-100'];
    if (c.sticky) classes.push('sticky', 'top-0', 'z-30');
    if (c.shadow) classes.push('shadow-sm');
    return classes.join(' ');
  });

  /** Hide the hamburger at/above the breakpoint. */
  readonly toggleHideClass = computed(() => hideAtBreakpoint(this.cfg().menuToggleBreakpoint));
  /** Reveal the centre menu at/above the breakpoint (paired with a base `hidden`). */
  readonly centerShowClass = computed(() => showFlexAtBreakpoint(this.cfg().menuToggleBreakpoint));
}
