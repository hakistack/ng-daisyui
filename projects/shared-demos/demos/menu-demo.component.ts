import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { MenuComponent, MenuItem, createMenu } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { DemoPageComponent } from '../shared/demo-page.component';

type DemoTab = 'basic' | 'horizontal' | 'nested' | 'rich' | 'collapsed' | 'rbac';

@Component({
  selector: 'app-menu-demo',
  imports: [MenuComponent, DocSectionComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Menu"
      description="Config-driven, recursive DaisyUI menu — vertical sidebars or horizontal navbars from a single declarative model"
      icon="menu"
      category="Navigation"
      importName="MenuComponent, createMenu, item"
    >
      <div examples class="space-y-6">
        <!-- Basic vertical -->
        @if (activeTab() === 'basic') {
          <app-doc-section
            title="Basic Vertical Menu"
            description="Links, a section title, and an action item, built with the item.* factory."
            [codeExample]="basicCode"
          >
            <div class="max-w-xs">
              <hk-menu [config]="basicMenu.config()" (itemSelect)="lastSelected.set($event.label ?? '')" />
            </div>
            @if (lastSelected()) {
              <p class="text-sm opacity-70 mt-3">
                Selected: <strong>{{ lastSelected() }}</strong>
              </p>
            }
          </app-doc-section>
        }

        <!-- Horizontal -->
        @if (activeTab() === 'horizontal') {
          <app-doc-section
            title="Horizontal Menu (navbar)"
            description="Same model with orientation: 'horizontal'. Submenus open as dropdowns; opening one closes its siblings (accordion)."
            [codeExample]="horizontalCode"
          >
            <div class="rounded-box bg-base-100 p-2">
              <hk-menu [config]="horizontalMenu.config()" />
            </div>
          </app-doc-section>
        }

        <!-- Nested / accordion -->
        @if (activeTab() === 'nested') {
          <app-doc-section
            title="Nested Groups & Accordion"
            description="Collapsible groups via native <details>. Use the controller to expand/collapse programmatically."
            [codeExample]="nestedCode"
          >
            <div class="flex gap-2 mb-3">
              <button class="btn btn-sm btn-outline" (click)="nestedMenu.expandAll()">Expand all</button>
              <button class="btn btn-sm btn-outline" (click)="nestedMenu.collapseAll()">Collapse all</button>
            </div>
            <div class="max-w-xs">
              <hk-menu [config]="nestedMenu.config()" />
            </div>
          </app-doc-section>
        }

        <!-- Rich items -->
        @if (activeTab() === 'rich') {
          <app-doc-section
            title="Icons, Badges & Shortcuts"
            description="Each item supports a Lucide icon, a trailing badge, and a keyboard-shortcut hint."
            [codeExample]="richCode"
          >
            <div class="max-w-xs">
              <hk-menu [config]="richMenu.config()" />
            </div>
          </app-doc-section>
        }

        <!-- Collapsed rail -->
        @if (activeTab() === 'collapsed') {
          <app-doc-section
            title="Collapsed Icon Rail"
            description="Set collapsed to hide labels and show an icon-only rail with tooltips — ideal for a togglable sidebar."
            [codeExample]="collapsedCode"
          >
            <div class="flex gap-2 mb-3">
              <button class="btn btn-sm btn-primary" (click)="railCollapsed.set(!railCollapsed())">
                {{ railCollapsed() ? 'Expand' : 'Collapse' }}
              </button>
            </div>
            <div class="w-fit rounded-box bg-base-100 p-1">
              <hk-menu [config]="richMenu.config()" [collapsed]="railCollapsed()" />
            </div>
          </app-doc-section>
        }

        <!-- RBAC / visibility -->
        @if (activeTab() === 'rbac') {
          <app-doc-section
            title="Visibility Gating (RBAC)"
            description="The generic visible predicate hides items (and prunes now-empty groups). The library stays auth-agnostic — wire your own permission check."
            [codeExample]="rbacCode"
          >
            <div class="flex gap-2 mb-3">
              <button class="btn btn-sm" [class]="{ 'btn-primary': isAdmin() }" (click)="isAdmin.set(!isAdmin())">
                {{ isAdmin() ? 'Admin' : 'Standard user' }}
              </button>
            </div>
            <div class="max-w-xs">
              <hk-menu [items]="rbacItems()" />
            </div>
          </app-doc-section>
        }
      </div>
    </app-demo-page>
  `,
})
export class MenuDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as DemoTab);

  lastSelected = signal('');
  railCollapsed = signal(false);
  isAdmin = signal(false);

  /**
   * Demo-only click handler. Real apps put `routerLink: '/path'` on each item;
   * this sandbox has no such routes, so we use an `action` that just updates the
   * "Selected" readout — keeping navigation inside the docs SPA.
   */
  private pick = (i: MenuItem) => this.lastSelected.set(i.label ?? '');

  basicMenu = createMenu({
    ariaLabel: 'Basic menu',
    items: [
      { kind: 'title', label: 'Workspace' },
      { label: 'Dashboard', icon: 'house', action: this.pick },
      { label: 'Projects', icon: 'folder', action: this.pick },
      { label: 'Reports', icon: 'chart-line', action: this.pick },
      { kind: 'divider' },
      { label: 'Sign out', icon: 'unplug', action: this.pick },
    ],
  });

  horizontalMenu = createMenu({
    orientation: 'horizontal',
    items: [
      { label: 'Home', icon: 'house', action: this.pick },
      {
        label: 'Products',
        icon: 'package',
        children: [
          { label: 'Web', action: this.pick },
          { label: 'Mobile', action: this.pick },
          { label: 'API', action: this.pick },
        ],
      },
      {
        label: 'Company',
        icon: 'building-2',
        children: [
          { label: 'About', action: this.pick },
          { label: 'Careers', action: this.pick },
        ],
      },
      { label: 'Contact', icon: 'mail', action: this.pick },
    ],
  });

  nestedMenu = createMenu({
    ariaLabel: 'Nested menu',
    items: [
      { label: 'Overview', icon: 'layout-grid', action: this.pick },
      {
        label: 'Administration',
        icon: 'settings',
        expanded: true,
        children: [
          { label: 'Users', icon: 'users', action: this.pick },
          { label: 'Roles', icon: 'shield', action: this.pick },
          {
            label: 'System',
            icon: 'server',
            children: [
              { label: 'Audits', action: this.pick },
              { label: 'Logs', action: this.pick },
            ],
          },
        ],
      },
    ],
  });

  richMenu = createMenu({
    ariaLabel: 'Rich menu',
    items: [
      { label: 'Inbox', icon: 'inbox', badge: 12, badgeClass: 'badge-primary badge-sm', action: this.pick },
      { label: 'Drafts', icon: 'file-text', action: this.pick },
      { label: 'Search', icon: 'search', shortcut: '⌘K', action: this.pick },
      { label: 'Settings', icon: 'settings', shortcut: '⌘,', action: this.pick },
      { kind: 'divider' },
      { label: 'Archived', icon: 'archive', disabled: true, action: this.pick },
    ],
  });

  rbacItems = computed<MenuItem[]>(() => {
    const admin = this.isAdmin();
    return [
      { label: 'Home', icon: 'house', action: this.pick },
      {
        label: 'Admin area',
        icon: 'shield',
        visible: () => admin,
        children: [
          { label: 'Users', icon: 'users', action: this.pick },
          { label: 'Settings', icon: 'settings', action: this.pick },
        ],
      },
      { label: 'Profile', icon: 'user', action: this.pick },
    ];
  });

  // ── Code samples ──────────────────────────────────────────────────────────

  basicCode = `menu = createMenu({
  items: [
    { kind: 'title', label: 'Workspace' },
    { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
    { label: 'Projects', routerLink: '/projects', icon: 'folder' },
    { kind: 'divider' },
    { label: 'Sign out', icon: 'unplug', action: () => auth.logout() },
  ],
});

// <hk-menu [config]="menu.config()" (itemSelect)="onSelect($event)" />`;

  horizontalCode = `menu = createMenu({
  orientation: 'horizontal',
  items: [
    { label: 'Home', routerLink: '/home', icon: 'house' },
    {
      label: 'Products',
      icon: 'package',
      children: [
        { label: 'Web', routerLink: '/products/web' },
        { label: 'Mobile', routerLink: '/products/mobile' },
      ],
    },
  ],
});`;

  nestedCode = `menu = createMenu({
  items: [
    {
      label: 'Administration',
      icon: 'settings',
      expanded: true,
      children: [
        { label: 'Users', routerLink: '/admin/users', icon: 'users' },
        {
          label: 'System',
          icon: 'server',
          children: [
            { label: 'Audits', routerLink: '/admin/audits' },
            { label: 'Logs', routerLink: '/admin/logs' },
          ],
        },
      ],
    },
  ],
});

// menu.expandAll(); menu.collapseAll();`;

  richCode = `// Items are plain objects — kind is inferred from the fields.
{ label: 'Inbox', routerLink: '/inbox', icon: 'inbox',
  badge: 12, badgeClass: 'badge-primary badge-sm' }
{ label: 'Search', routerLink: '/search', icon: 'search', shortcut: '⌘K' }
{ label: 'Archived', routerLink: '/archived', icon: 'archive', disabled: true }`;

  collapsedCode = `<hk-menu [config]="menu.config()" [collapsed]="collapsed()" />

// or imperatively: menu.setCollapsed(true);`;

  rbacCode = `{
  label: 'Admin area',
  visible: () => auth.hasRole('admin'),   // hidden + pruned when false
  children: [
    { label: 'Users', routerLink: '/admin/users' },
    { label: 'Settings', routerLink: '/admin/settings' },
  ],
}`;
}
