import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { filter } from 'rxjs';
import { SHOW_OVERVIEW } from '@shared-demos/config';

const THEMES = [
  'light',
  'dark',
  'cupcake',
  'emerald',
  'corporate',
  'retro',
  'cyberpunk',
  'valentine',
  'garden',
  'forest',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'sirat',
  'hacienda',
] as const;

interface NavChild {
  id: string;
  label: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideDynamicIcon],
  template: `
    <div class="drawer lg:drawer-open min-h-screen bg-base-100">
      <input id="sidebar" type="checkbox" class="drawer-toggle" />

      <!-- ══ Main content ══ -->
      <div class="drawer-content flex flex-col">
        <!-- Desktop header -->
        <header
          class="glass-header sticky top-0 z-30 hidden lg:flex items-center justify-between px-12 h-14 border-b border-base-content/5"
        >
          <div class="flex items-center gap-2 text-sm text-base-content/40">
            <span>{{ currentSection() }}</span>
            @if (currentPageLabel()) {
              <span class="text-base-content/15">/</span>
              <span class="text-base-content/70 font-medium">{{ currentPageLabel() }}</span>
            }
          </div>

          <div class="flex items-center gap-2">
            <!-- Version switcher → v5 -->
            <a
              href="/"
              class="btn btn-ghost btn-sm gap-2 border border-base-content/8 font-normal text-xs h-8 min-h-0 normal-case"
              aria-label="Switch to DaisyUI 5 demo"
            >
              <span class="badge badge-primary badge-outline badge-sm font-mono">v5</span>
              <span>Switch to v5</span>
              <svg lucideIcon="arrow-right" [size]="12"></svg>
            </a>

            <!-- Theme dropdown with color swatch preview per theme -->
            <div class="dropdown dropdown-end">
              <div
                tabindex="0"
                role="button"
                class="btn btn-ghost btn-sm gap-2 border border-base-content/8 font-normal text-xs h-8 min-h-0 normal-case"
              >
                <span class="inline-flex -space-x-1">
                  <span class="w-2 h-2 rounded-full bg-primary ring-1 ring-base-100"></span>
                  <span class="w-2 h-2 rounded-full bg-secondary ring-1 ring-base-100"></span>
                  <span class="w-2 h-2 rounded-full bg-accent ring-1 ring-base-100"></span>
                </span>
                <span class="capitalize">{{ currentTheme() }}</span>
                <svg lucideIcon="chevrons-up-down" [size]="12"></svg>
              </div>
              <ul
                tabindex="0"
                class="dropdown-content menu menu-sm bg-base-300 rounded-box z-50 w-56 max-h-80 overflow-y-auto p-2 shadow-2xl mt-2 flex-nowrap"
              >
                @for (theme of themes; track theme) {
                  <li>
                    <button
                      type="button"
                      class="flex items-center gap-2 justify-start text-xs"
                      [class.active]="currentTheme() === theme"
                      (click)="setTheme(theme)"
                    >
                      <span [attr.data-theme]="theme" class="inline-flex -space-x-1 shrink-0">
                        <span class="w-3 h-3 rounded-full bg-primary ring-1 ring-base-100"></span>
                        <span class="w-3 h-3 rounded-full bg-secondary ring-1 ring-base-100"></span>
                        <span class="w-3 h-3 rounded-full bg-accent ring-1 ring-base-100"></span>
                      </span>
                      <span class="capitalize flex-1 truncate">{{ theme }}</span>
                      @if (currentTheme() === theme) {
                        <svg lucideIcon="check" [size]="12"></svg>
                      }
                    </button>
                  </li>
                }
              </ul>
            </div>
          </div>
        </header>

        <!-- Mobile header -->
        <header class="glass-header sticky top-0 z-30 flex lg:hidden items-center justify-between px-4 h-14 border-b border-base-content/5">
          <div class="flex items-center gap-3">
            <label for="sidebar" class="btn btn-ghost btn-sm btn-square">
              <svg lucideIcon="menu" [size]="20"></svg>
            </label>
            <span class="font-serif text-base">ng-daisyui</span>
            <span class="badge badge-outline badge-sm font-mono text-[10px]">v4</span>
          </div>
          <div class="flex items-center gap-1">
            <!-- Version switcher (compact) -->
            <a href="/" class="btn btn-ghost btn-sm btn-square" aria-label="Switch to DaisyUI 5 demo">
              <svg lucideIcon="arrow-right" [size]="16"></svg>
            </a>
            <!-- Theme dropdown with swatches -->
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-square">
                <svg lucideIcon="palette" [size]="16"></svg>
              </div>
              <ul
                tabindex="0"
                class="dropdown-content menu menu-sm bg-base-300 rounded-box z-50 w-56 max-h-80 overflow-y-auto p-2 shadow-2xl flex-nowrap"
              >
                @for (theme of themes; track theme) {
                  <li>
                    <button
                      type="button"
                      class="flex items-center gap-2 justify-start text-xs"
                      [class.active]="currentTheme() === theme"
                      (click)="setTheme(theme)"
                    >
                      <span [attr.data-theme]="theme" class="inline-flex -space-x-1 shrink-0">
                        <span class="w-3 h-3 rounded-full bg-primary ring-1 ring-base-100"></span>
                        <span class="w-3 h-3 rounded-full bg-secondary ring-1 ring-base-100"></span>
                        <span class="w-3 h-3 rounded-full bg-accent ring-1 ring-base-100"></span>
                      </span>
                      <span class="capitalize flex-1 truncate">{{ theme }}</span>
                    </button>
                  </li>
                }
              </ul>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 px-4 py-4 lg:px-8 lg:py-6">
          <div class="max-w-6xl mx-auto">
            <router-outlet />
          </div>
        </main>

        <!-- Footer -->
        <footer class="px-4 lg:px-8 py-4 border-t border-base-content/5">
          <div class="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-base-content/25 font-mono">
            <span>ng-daisyui &middot; Angular 21 &middot; DaisyUI 4 &middot; Tailwind 3</span>
            <span>OnPush &middot; Signals &middot; Standalone</span>
          </div>
        </footer>
      </div>

      <!-- ══ Sidebar ══ -->
      <div class="drawer-side z-40">
        <label for="sidebar" class="drawer-overlay"></label>
        <aside class="bg-base-100 w-72 min-h-full border-r border-base-content/5 flex flex-col">
          <!-- Brand -->
          <div class="px-5 pt-5 pb-4">
            <div class="flex items-center gap-3">
              <span
                class="w-9 h-9 rounded-lg bg-primary text-primary-content flex items-center justify-center text-sm font-black tracking-tight shrink-0 shadow-sm shadow-primary/20"
                >hk</span
              >
              <div class="min-w-0 flex-1">
                <div class="font-serif text-base leading-tight">ng-daisyui</div>
                <div class="text-[10px] text-base-content/40 font-mono tracking-wide flex items-center gap-1.5">
                  <span class="badge badge-outline badge-xs font-mono">v4</span>
                  <span>DaisyUI 4 · TW 3</span>
                </div>
              </div>
            </div>
          </div>

          <div class="h-px bg-base-content/5 mx-4"></div>

          <!-- Navigation -->
          <nav class="sidebar-menu flex-1 overflow-y-auto sidebar-scroll px-3 py-3">
            <ul class="menu gap-0.5">
              @for (section of navSections; track section.title) {
                <li class="menu-title mt-5 first:mt-1">
                  <span>{{ section.title }}</span>
                </li>
                @for (item of section.items; track item.path) {
                  <li>
                    @if (item.children?.length) {
                      <details [open]="currentPath() === item.path">
                        <summary>
                          <svg [lucideIcon]="item.icon" [size]="15"></svg>
                          {{ item.label }}
                        </summary>
                        <ul>
                          @for (child of item.children; track child.id) {
                            <li>
                              <a [routerLink]="item.path + '/' + child.id" routerLinkActive="active">
                                {{ child.label }}
                              </a>
                            </li>
                          }
                        </ul>
                      </details>
                    } @else {
                      <a [routerLink]="item.path" routerLinkActive="active">
                        <svg [lucideIcon]="item.icon" [size]="15"></svg>
                        {{ item.label }}
                      </a>
                    }
                  </li>
                }
              }
            </ul>
          </nav>

          <!-- Sidebar footer -->
          <div class="px-5 py-3 border-t border-base-content/5">
            <div class="text-[10px] text-base-content/25 font-mono">Built with DaisyUI 4 &middot; Tailwind 3</div>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class App implements OnInit {
  private router = inject(Router);
  readonly themes = THEMES;
  readonly currentTheme = signal<string>('dark');
  readonly currentPath = signal('');

  /** DaisyUI v4 themes that read as visually dark — used for system-pref fallback. */
  private readonly DARK_THEMES = new Set([
    'dark',
    'synthwave',
    'halloween',
    'forest',
    'black',
    'luxury',
    'dracula',
    'business',
    'night',
    'coffee',
    'dim',
    'sunset',
    'hacienda',
  ]);

  readonly currentPageLabel = computed(() => {
    const path = this.currentPath();
    for (const section of this.navSections) {
      const item = section.items.find((i) => i.path === path);
      if (item) return item.label;
    }
    return '';
  });

  readonly currentSection = computed(() => {
    const path = this.currentPath();
    for (const section of this.navSections) {
      if (section.items.some((i) => i.path === path)) return section.title;
    }
    return '';
  });

  readonly navSections: NavSection[] = [
    ...(SHOW_OVERVIEW
      ? [
          {
            title: 'Overview',
            items: [
              { path: '/getting-started', label: 'Getting Started', icon: 'rocket' },
              { path: '/installation', label: 'Installation', icon: 'download' },
              { path: '/key-patterns', label: 'Key Patterns', icon: 'lightbulb' },
            ],
          },
        ]
      : []),
    {
      title: 'Forms',
      items: [
        {
          path: '/forms',
          label: 'Dynamic Forms',
          icon: 'file-input',
          children: [
            { id: 'layouts', label: 'Layouts' },
            { id: 'fields', label: 'Field Types' },
            { id: 'conditional', label: 'Conditional Logic' },
            { id: 'dependent', label: 'Dependent Fields' },
            { id: 'autosave', label: 'Auto-Save' },
          ],
        },
        {
          path: '/wizard',
          label: 'Form Wizard',
          icon: 'list-ordered',
          children: [
            { id: 'linear', label: 'Linear Wizard' },
            { id: 'nonlinear', label: 'Non-linear Wizard' },
          ],
        },
      ],
    },
    {
      title: 'Data Display',
      items: [
        {
          path: '/table',
          label: 'Table',
          icon: 'table',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'full', label: 'Full Featured' },
            { id: 'filtering', label: 'Filtering' },
            { id: 'selectableRow', label: 'Selectable Row' },
            { id: 'actionsPosition', label: 'Actions Position' },
            { id: 'sticky', label: 'Sticky' },
            { id: 'resizable', label: 'Resizable' },
            { id: 'virtualScroll', label: 'Virtual Scroll' },
            { id: 'editable', label: 'Editable' },
            { id: 'footer', label: 'Footer' },
            { id: 'expandable', label: 'Expandable' },
            { id: 'grouped', label: 'Grouped' },
            { id: 'reorderable', label: 'Reorderable' },
            { id: 'keyboard', label: 'Keyboard' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'masterDetail', label: 'Master-Detail' },
            { id: 'nestedMasterDetail', label: 'Nested Master-Detail' },
            { id: 'cellTemplate', label: 'Cell Template' },
          ],
        },
        {
          path: '/tree-table',
          label: 'Tree Table',
          icon: 'list-tree',
          children: [
            { id: 'treenode', label: 'TreeNode Data' },
            { id: 'custom', label: 'Custom Children' },
            { id: 'features', label: 'Full Features' },
            { id: 'cascade', label: 'Cascade Selection' },
            { id: 'filtering', label: 'Hierarchy Filtering' },
            { id: 'large', label: 'Large Dataset' },
          ],
        },
        {
          path: '/tree',
          label: 'Tree',
          icon: 'git-branch',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'selection', label: 'Single Selection' },
            { id: 'checkbox', label: 'Checkbox' },
            { id: 'dragdrop', label: 'Drag & Drop' },
            { id: 'lazy', label: 'Lazy Loading' },
            { id: 'filter', label: 'Filter' },
          ],
        },
        {
          path: '/org-chart',
          label: 'Organization Chart',
          icon: 'network',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'selection', label: 'Selection' },
            { id: 'templates', label: 'Templates' },
            { id: 'colors', label: 'Colors' },
          ],
        },
        {
          path: '/virtual-scroller',
          label: 'Virtual Scroller',
          icon: 'scroll-text',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'horizontal', label: 'Horizontal' },
            { id: 'grid', label: 'Grid' },
            { id: 'lazy', label: 'Lazy Loading' },
          ],
        },
      ],
    },
    {
      title: 'Inputs',
      items: [
        {
          path: '/input',
          label: 'Input',
          icon: 'text-cursor-input',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'variants', label: 'Variants' },
            { id: 'styling', label: 'Styling' },
            { id: 'forms', label: 'Reactive Forms' },
            { id: 'mask', label: 'Input Mask' },
          ],
        },
        {
          path: '/select',
          label: 'Select',
          icon: 'chevron-down',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'variants', label: 'Variants' },
            { id: 'features', label: 'Features' },
            { id: 'grouped', label: 'Grouped' },
            { id: 'multiselect', label: 'Multiselect' },
          ],
        },
        {
          path: '/datepicker',
          label: 'Datepicker',
          icon: 'calendar',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'datetime', label: 'Date + Time' },
            { id: 'options', label: 'Options' },
            { id: 'advanced', label: 'Advanced' },
          ],
        },
        {
          path: '/timepicker',
          label: 'Timepicker',
          icon: 'clock',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'options', label: 'Options' },
            { id: 'clockFace', label: 'Clock Face' },
            { id: 'advanced', label: 'Advanced' },
          ],
        },
        {
          path: '/editor',
          label: 'Editor',
          icon: 'file-text',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'toolbars', label: 'Toolbars' },
            { id: 'forms', label: 'Reactive Forms' },
            { id: 'dynamic', label: 'Dynamic Form' },
          ],
        },
      ],
    },
    {
      title: 'Navigation',
      items: [
        {
          path: '/tabs',
          label: 'Tabs',
          icon: 'panel-top',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'features', label: 'Features' },
            { id: 'vertical', label: 'Vertical' },
          ],
        },
      ],
    },
    {
      title: 'Feedback',
      items: [
        {
          path: '/toast',
          label: 'Toast Notifications',
          icon: 'bell',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'features', label: 'Features' },
            { id: 'styles', label: 'Styles' },
            { id: 'advanced', label: 'Advanced' },
          ],
        },
        {
          path: '/alert',
          label: 'Alert Dialogs',
          icon: 'message-square-warning',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'confirm', label: 'Confirmations' },
            { id: 'loading', label: 'Loading' },
            { id: 'advanced', label: 'Advanced' },
          ],
        },
        {
          path: '/dialog',
          label: 'Dialog Service',
          icon: 'panel-top-open',
          children: [
            { id: 'basic', label: 'Basic' },
            { id: 'forms', label: 'Forms' },
            { id: 'options', label: 'Options' },
          ],
        },
      ],
    },
    {
      title: 'Charts',
      items: [
        {
          path: '/dashboard',
          label: 'Live Dashboard',
          icon: 'chart-line',
        },
      ],
    },
    {
      title: 'Utilities',
      items: [
        {
          path: '/motion',
          label: 'Motion Directives',
          icon: 'sparkles',
          children: [
            { id: 'animate', label: 'Animate' },
            { id: 'hover', label: 'Hover' },
            { id: 'presets', label: 'Presets' },
          ],
        },
      ],
    },
  ];

  ngOnInit(): void {
    const saved = localStorage.getItem('hk-demo-v4-theme');
    if (saved) {
      this.setTheme(saved);
    } else {
      // Respect `prefers-color-scheme` on first visit instead of defaulting to dark.
      const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }

    this.currentPath.set('/' + this.router.url.split('/').filter(Boolean)[0]);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentPath.set('/' + e.urlAfterRedirects.split('/').filter(Boolean)[0]);
    });
  }

  setTheme(theme: string): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hk-demo-v4-theme', theme);
  }
}
