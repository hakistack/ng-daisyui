import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui';
import { filter } from 'rxjs';

const THEMES = [
  'kaizen',
  'kaizen-light',
  'obsidian',
  'obsidian-light',
  'reportforge',
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
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
  'caramellatte',
  'abyss',
  'silk',
] as const;

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent],
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
            <span class="text-base-content/50">{{ currentSection() }}</span>
            @if (currentPageLabel()) {
              <span class="text-base-content/15">/</span>
              <span class="text-base-content/70 font-medium">{{ currentPageLabel() }}</span>
            }
          </div>
          <div class="flex items-center gap-2">
            <!-- Version switcher → v4 -->
            <a
              href="/v4/"
              class="btn btn-ghost btn-sm gap-2 border border-base-content/8 font-normal text-xs h-8 min-h-0 normal-case"
              aria-label="Switch to DaisyUI 4 demo"
            >
              <span class="badge badge-soft badge-primary badge-sm font-mono">v4</span>
              <span>Switch to v4</span>
              <hk-lucide-icon name="ArrowRight" [size]="12" />
            </a>

            <div class="dropdown dropdown-end">
              <div
                tabindex="0"
                role="button"
                class="btn btn-ghost btn-sm gap-2 border border-base-content/8 font-normal text-xs h-8 min-h-0"
              >
                <hk-lucide-icon name="Palette" [size]="13" />
                <span class="capitalize">{{ currentTheme() }}</span>
                <hk-lucide-icon name="ChevronsUpDown" [size]="12" />
              </div>
              <ul tabindex="0" class="dropdown-content bg-base-300 rounded-box z-50 w-52 max-h-72 overflow-y-auto p-2 shadow-2xl mt-2">
                @for (theme of themes; track theme) {
                  <li>
                    <input
                      type="radio"
                      name="theme-desktop"
                      class="theme-controller w-full btn btn-xs btn-block btn-ghost justify-start capitalize"
                      [attr.aria-label]="theme"
                      [value]="theme"
                      [checked]="currentTheme() === theme"
                      (change)="setTheme(theme)"
                    />
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
              <hk-lucide-icon name="Menu" [size]="20" />
            </label>
            <span class="font-serif text-base">ng-daisyui</span>
            <span class="badge badge-soft badge-primary badge-sm font-mono text-[10px]">v5</span>
          </div>
          <div class="flex items-center gap-1">
            <!-- Version switcher (compact) → v4 -->
            <a href="/v4/" class="btn btn-ghost btn-sm btn-square" aria-label="Switch to DaisyUI 4 demo">
              <hk-lucide-icon name="ArrowRight" [size]="16" />
            </a>
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-square">
                <hk-lucide-icon name="Palette" [size]="16" />
              </div>
              <ul tabindex="0" class="dropdown-content bg-base-300 rounded-box z-50 w-52 max-h-80 overflow-y-auto p-2 shadow-2xl">
                @for (theme of themes; track theme) {
                  <li>
                    <input
                      type="radio"
                      name="theme-mobile"
                      class="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start capitalize"
                      [attr.aria-label]="theme"
                      [value]="theme"
                      [checked]="currentTheme() === theme"
                      (change)="setTheme(theme)"
                    />
                  </li>
                }
              </ul>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 px-4 py-6 lg:px-12 lg:py-10">
          <div class="max-w-7xl mx-auto">
            <router-outlet />
          </div>
        </main>

        <!-- Footer -->
        <footer class="px-4 lg:px-12 py-4 border-t border-base-content/5">
          <div class="max-w-7xl mx-auto flex items-center justify-between text-[11px] text-base-content/25 font-mono">
            <span>ng-daisyui &middot; Angular 21 &middot; DaisyUI 5</span>
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
              <div class="min-w-0">
                <div class="font-serif text-base leading-tight">ng-daisyui</div>
                <div class="text-[10px] text-base-content/30 font-mono tracking-wide">hakistack &middot; v0.1.54</div>
              </div>
            </div>
          </div>

          <div class="h-px bg-base-content/5 mx-4"></div>

          <!-- Navigation -->
          <nav class="sidebar-menu flex-1 overflow-y-auto sidebar-scroll px-3 py-3">
            <ul class="menu gap-0.5">
              @for (section of navSections; track section.title) {
                <li class="menu-title mt-5 mb-1 first:mt-1">
                  {{ section.title }}
                </li>
                @for (item of section.items; track item.path) {
                  <li>
                    <a [routerLink]="item.path" routerLinkActive="active">
                      <hk-lucide-icon [name]="item.icon" [size]="15" />
                      {{ item.label }}
                    </a>
                  </li>
                }
              }
            </ul>
          </nav>

          <!-- Sidebar footer -->
          <div class="px-5 py-3 border-t border-base-content/5">
            <div class="text-[10px] text-base-content/20 font-mono">Built with DaisyUI 5 &middot; Tailwind 4</div>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class App implements OnInit {
  private router = inject(Router);
  readonly themes = THEMES;
  readonly currentTheme = signal('kaizen');
  readonly currentPath = signal('');

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
    {
      title: 'Overview',
      items: [
        { path: '/getting-started', label: 'Getting Started', icon: 'Rocket' },
        { path: '/installation', label: 'Installation', icon: 'Download' },
        { path: '/key-patterns', label: 'Key Patterns', icon: 'Lightbulb' },
      ],
    },
    {
      title: 'Forms',
      items: [
        { path: '/forms', label: 'Dynamic Forms', icon: 'FileInput' },
        { path: '/wizard', label: 'Form Wizard', icon: 'ListOrdered' },
      ],
    },
    {
      title: 'Data Display',
      items: [
        { path: '/table', label: 'Table', icon: 'Table' },
        { path: '/tree-table', label: 'Tree Table', icon: 'ListTree' },
        { path: '/tree', label: 'Tree', icon: 'GitBranch' },
        { path: '/org-chart', label: 'Organization Chart', icon: 'Network' },
        { path: '/virtual-scroller', label: 'Virtual Scroller', icon: 'ScrollText' },
      ],
    },
    {
      title: 'Inputs',
      items: [
        { path: '/input', label: 'Input', icon: 'TextCursorInput' },
        { path: '/select', label: 'Select', icon: 'ChevronDown' },
        { path: '/datepicker', label: 'Datepicker', icon: 'Calendar' },
        { path: '/timepicker', label: 'Timepicker', icon: 'Clock' },
        { path: '/editor', label: 'Editor', icon: 'FileText' },
      ],
    },
    {
      title: 'Navigation',
      items: [{ path: '/tabs', label: 'Tabs', icon: 'PanelTop' }],
    },
    {
      title: 'Feedback',
      items: [
        { path: '/toast', label: 'Toast Notifications', icon: 'Bell' },
        { path: '/alert', label: 'Alert Dialogs', icon: 'MessageSquareWarning' },
        { path: '/dialog', label: 'Dialog Service', icon: 'PanelTopOpen' },
      ],
    },
    {
      title: 'Utilities',
      items: [
        { path: '/icons', label: 'Icons', icon: 'Smile' },
        { path: '/motion', label: 'Motion Directives', icon: 'Sparkles' },
      ],
    },
  ];

  ngOnInit(): void {
    const saved = localStorage.getItem('hk-demo-theme');
    if (saved) {
      this.setTheme(saved);
    }

    this.currentPath.set(this.router.url);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentPath.set('/' + e.urlAfterRedirects.split('/').filter(Boolean)[0]);
    });
  }

  setTheme(theme: string): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hk-demo-theme', theme);
  }
}
