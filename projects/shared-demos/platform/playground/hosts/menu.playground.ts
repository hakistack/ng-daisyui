import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuComponent, MenuController, MenuItem, MenuOrientation, MenuSize, createMenu } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { MENU_PLAYGROUND, MenuPgState } from '../specs/menu';
import type { PlaygroundState } from '../playground.types';

/**
 * Same tree as the generated code, minus `routerLink`: items without a link
 * render as buttons and still emit `(itemSelect)`, so clicking never leaves
 * the docs page. Explicit ids keep open/closed groups stable across renders.
 */
const ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'house' },
  { id: 'projects', label: 'Projects', icon: 'folder', badge: 3 },
  {
    id: 'team',
    label: 'Team',
    icon: 'users',
    children: [
      { id: 'members', label: 'Members' },
      { id: 'roles', label: 'Roles' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    children: [
      { id: 'profile', label: 'Profile' },
      { id: 'billing', label: 'Billing' },
    ],
  },
];

@Component({
  selector: 'app-menu-playground',
  imports: [PlaygroundComponent, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <div class="mx-auto" [class]="boxClass(raw)">
          <hk-menu
            [config]="menu(raw).config()"
            (itemSelect)="log('itemSelect', { id: $event.id, label: $event.label })"
            (expandedChange)="log('expandedChange', $event)"
          />
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class MenuPlaygroundComponent {
  protected readonly spec = MENU_PLAYGROUND;
  private cache: { raw: PlaygroundState; menu: MenuController } | null = null;

  /** Vertical menus fill a sidebar-like column; the rail and horizontal menus size to their content. */
  protected boxClass(raw: PlaygroundState): string {
    const s = raw as MenuPgState;
    return s.orientation === 'horizontal' || s.collapsed ? 'w-fit' : 'w-full max-w-xs';
  }

  /** One controller per playground state (the state object only changes when a control does). */
  protected menu(raw: PlaygroundState): MenuController {
    if (this.cache?.raw !== raw) {
      const s = raw as MenuPgState;
      this.cache = {
        raw,
        menu: createMenu({
          items: ITEMS,
          orientation: s.orientation as MenuOrientation,
          size: s.size as MenuSize,
          collapsed: s.collapsed,
          accordion: s.accordion,
          rounded: s.rounded,
          background: s.background,
          ariaLabel: 'Playground menu',
        }),
      };
    }
    return this.cache.menu;
  }
}
