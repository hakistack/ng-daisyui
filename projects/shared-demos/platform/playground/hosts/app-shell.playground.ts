import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShellComponent, MenuItem, ShellBreakpoint, ShellConfig, ShellMode, SidebarSide } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { APP_SHELL_PLAYGROUND, AppShellPgState } from '../specs/app-shell';
import type { PlaygroundState } from '../playground.types';

/** Same entries as the generated code, without `routerLink` so clicks stay on the docs page. */
const ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'house' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

@Component({
  selector: 'app-app-shell-playground',
  imports: [PlaygroundComponent, AppShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <!-- Bounded box: the transform makes it the containing block for the drawer's
             fixed-position panel, so the shell never covers the docs page. -->
        <div class="h-96 rounded-box border border-base-300 overflow-auto" style="transform: translateZ(0)">
          <hk-app-shell
            [config]="config(raw)"
            [collapsed]="collapsed(raw)"
            (drawerOpenChange)="log('drawerOpenChange', $event)"
            (collapsedChange)="log('collapsedChange', $event)"
          >
            <span hk-brand class="text-lg font-bold px-2">Acme</span>
            <div class="p-6">
              <h3 class="text-lg font-semibold">Dashboard</h3>
            </div>
          </hk-app-shell>
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class AppShellPlaygroundComponent {
  protected readonly spec = APP_SHELL_PLAYGROUND;
  private cache: { raw: PlaygroundState; config: ShellConfig } | null = null;

  protected collapsed(raw: PlaygroundState): boolean {
    return (raw as AppShellPgState).collapsed;
  }

  /** One config object per playground state, so the shell's computeds stay stable between change detections. */
  protected config(raw: PlaygroundState): ShellConfig {
    if (this.cache?.raw !== raw) {
      const s = raw as AppShellPgState;
      this.cache = {
        raw,
        config: {
          responsiveBreakpoint: s.responsiveBreakpoint as ShellBreakpoint,
          mode: s.mode as ShellMode,
          navbar: { shadow: s['navbar.shadow'] },
          sidebar: {
            collapsible: s['sidebar.collapsible'],
            side: s['sidebar.side'] as SidebarSide,
            width: s['sidebar.width'],
            menu: { items: ITEMS },
          },
        },
      };
    }
    return this.cache.config;
  }
}
