import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AppShellComponent, MenuConfig, NavbarComponent, SidebarComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { DemoPageComponent } from '../shared/demo-page.component';

type DemoTab = 'navbar' | 'sidebar' | 'shell';

@Component({
  selector: 'app-app-shell-demo',
  imports: [NavbarComponent, SidebarComponent, AppShellComponent, DocSectionComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Navbar & Sidebar"
      description="Composable app-layout chrome — hk-navbar, hk-sidebar, and the hk-app-shell drawer that wires them together. Navigation is rendered by hk-menu."
      icon="layout-grid"
      category="Navigation"
      importName="NavbarComponent, SidebarComponent, AppShellComponent"
    >
      <div examples class="space-y-6">
        <!-- Navbar -->
        @if (activeTab() === 'navbar') {
          <app-doc-section
            title="Navbar"
            description="start / center / end projection slots, an optional embedded horizontal menu, and a responsive hamburger that emits (menuToggle)."
            [codeExample]="navbarCode"
          >
            <div class="rounded-box border border-base-300 overflow-hidden">
              <hk-navbar [menu]="topMenu" [shadow]="false">
                <span hk-navbar-start class="text-lg font-bold px-2">Acme</span>
                <button hk-navbar-end class="btn btn-ghost btn-sm btn-circle" aria-label="Notifications">🔔</button>
                <div hk-navbar-end class="avatar avatar-placeholder">
                  <div class="bg-primary text-primary-content w-8 rounded-full"><span class="text-xs">JD</span></div>
                </div>
              </hk-navbar>
            </div>
            <p class="text-sm opacity-60 mt-3">
              The centre menu collapses below <code>lg</code>; pair it with a drawer (see the Shell tab).
            </p>
          </app-doc-section>
        }

        <!-- Sidebar -->
        @if (activeTab() === 'sidebar') {
          <app-doc-section
            title="Sidebar"
            description="The aside panel: header/footer slots, an embedded vertical menu, and an optional collapse-to-rail toggle."
            [codeExample]="sidebarCode"
          >
            <div class="flex gap-2 mb-3">
              <button class="btn btn-sm btn-primary" (click)="railed.set(!railed())">{{ railed() ? 'Expand' : 'Collapse' }}</button>
            </div>
            <div class="h-[420px] rounded-box border border-base-300 overflow-hidden flex">
              <hk-sidebar [menu]="sideMenu" [collapsible]="true" [(collapsed)]="railed" (itemSelect)="lastSelected.set($event.label ?? '')">
                <div hk-sidebar-header class="p-4 flex items-center gap-3 border-b border-base-content/10">
                  <div class="avatar avatar-placeholder">
                    <div class="bg-primary text-primary-content w-9 rounded-full"><span class="text-sm">JD</span></div>
                  </div>
                  @if (!railed()) {
                    <div class="min-w-0">
                      <div class="font-semibold text-sm truncate">Jane Doe</div>
                      <div class="text-xs opacity-60 truncate">Admin</div>
                    </div>
                  }
                </div>
              </hk-sidebar>
              <div class="flex-1 p-6 bg-base-200/40">
                <p class="text-sm opacity-70">Content area.</p>
                @if (lastSelected()) {
                  <p class="text-sm mt-2">
                    Selected: <strong>{{ lastSelected() }}</strong>
                  </p>
                }
              </div>
            </div>
          </app-doc-section>
        }

        <!-- App shell -->
        @if (activeTab() === 'shell') {
          <app-doc-section
            title="App Shell"
            description="The full drawer layout: navbar + sidebar + content. Permanent sidebar from lg up, overlay below (toggle the browser width). The hamburger and overlay share one drawerOpen signal."
            [codeExample]="shellCode"
          >
            <div class="h-[560px] rounded-box border border-base-300 overflow-auto">
              <hk-app-shell [navbar]="{ shadow: false }" [sidebar]="{ collapsible: true, menu: sideMenu }">
                <span hk-brand class="text-lg font-bold px-2">Acme</span>
                <button hk-navbar-end class="btn btn-ghost btn-sm btn-circle" aria-label="Settings">⚙️</button>
                <div hk-sidebar-header class="p-4 border-b border-base-content/10">
                  <div class="font-serif text-base">Acme&nbsp;Admin</div>
                  <div class="text-xs opacity-50">v1.0.0</div>
                </div>
                <div class="p-6">
                  <h3 class="text-lg font-semibold mb-2">Dashboard</h3>
                  <p class="text-sm opacity-70">
                    Resize the preview / window: below <code>lg</code> the sidebar overlays and the hamburger appears.
                  </p>
                </div>
                <footer hk-footer class="border-t border-base-content/10 px-6 py-3 text-xs opacity-50">© 2026 Acme</footer>
              </hk-app-shell>
            </div>
          </app-doc-section>
        }
      </div>
    </app-demo-page>
  `,
})
export class AppShellDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'navbar') as DemoTab);

  railed = signal(false);
  lastSelected = signal('');

  topMenu: MenuConfig = {
    orientation: 'horizontal',
    items: [
      { label: 'Home', routerLink: '/home', icon: 'house' },
      {
        label: 'Products',
        icon: 'package',
        children: [
          { label: 'Web', action: () => {} },
          { label: 'Mobile', action: () => {} },
        ],
      },
      { label: 'Pricing', routerLink: '/pricing', icon: 'chart-line' },
    ],
  };

  sideMenu: MenuConfig = {
    items: [
      { label: 'Dashboard', icon: 'house', action: (i) => this.lastSelected.set(i.label ?? '') },
      { label: 'Projects', icon: 'folder', action: (i) => this.lastSelected.set(i.label ?? '') },
      {
        label: 'Administration',
        icon: 'settings',
        children: [
          { label: 'Users', icon: 'users', action: (i) => this.lastSelected.set(i.label ?? '') },
          { label: 'Roles', icon: 'shield', action: (i) => this.lastSelected.set(i.label ?? '') },
        ],
      },
      { kind: 'divider' },
      { label: 'Sign out', icon: 'unplug', action: (i) => this.lastSelected.set(i.label ?? '') },
    ],
  };

  // ── Code samples ────────────────────────────────────────────────────────

  navbarCode = `<hk-navbar [menu]="topMenu">
  <span hk-navbar-start class="text-lg font-bold px-2">Acme</span>
  <button hk-navbar-end class="btn btn-ghost btn-circle">…</button>
</hk-navbar>

topMenu: MenuConfig = {
  orientation: 'horizontal',
  items: [
    { label: 'Home', routerLink: '/home', icon: 'house' },
    { label: 'Products', icon: 'package', children: [
      { label: 'Web', routerLink: '/web' },
      { label: 'Mobile', routerLink: '/mobile' },
    ]},
  ],
};`;

  sidebarCode = `<hk-sidebar [menu]="sideMenu" [collapsible]="true" [(collapsed)]="railed">
  <div hk-sidebar-header class="p-4">…user card…</div>
  <button hk-sidebar-footer class="btn btn-ghost m-2">Sign out</button>
</hk-sidebar>`;

  shellCode = `<hk-app-shell
  [navbar]="{ sticky: true }"
  [sidebar]="{ collapsible: true, menu: sideMenu }"
>
  <span hk-brand class="text-lg font-bold px-2">Acme</span>
  <button hk-navbar-end class="btn btn-ghost btn-circle">⚙️</button>
  <div hk-sidebar-header class="p-4">…</div>

  <router-outlet />            <!-- default slot = page content -->

  <footer hk-footer class="px-6 py-3">© 2026 Acme</footer>
</hk-app-shell>

// drawerOpen + collapsed are two-way models you can bind / drive.`;
}
