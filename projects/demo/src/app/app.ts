import { Component, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui';

const THEMES = [
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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent],
  template: `
    <div class="drawer lg:drawer-open min-h-screen bg-base-200">
      <input id="sidebar" type="checkbox" class="drawer-toggle" />

      <!-- Main content -->
      <div class="drawer-content">
        <!-- Navbar for mobile -->
        <div class="navbar bg-base-100/90 backdrop-blur-lg lg:hidden sticky top-0 z-30 border-b border-base-content/5">
          <div class="flex-1 flex items-center gap-2">
            <label for="sidebar" class="btn btn-ghost btn-sm btn-square">
              <hk-lucide-icon name="Menu" [size]="20" />
            </label>
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-md bg-primary text-primary-content flex items-center justify-center text-xs font-black">hk</span>
              <span class="font-semibold text-sm">ng-daisyui</span>
            </div>
          </div>
          <div class="flex-none">
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
        </div>

        <!-- Page content -->
        <main class="px-4 py-6 lg:px-12 lg:py-10">
          <div class="max-w-6xl mx-auto">
            <router-outlet />
          </div>
        </main>
      </div>

      <!-- Sidebar -->
      <div class="drawer-side z-40">
        <label for="sidebar" class="drawer-overlay"></label>
        <aside class="bg-base-100 w-72 min-h-full border-r border-base-content/5 flex flex-col">
          <!-- Branded header -->
          <div class="px-5 pt-5 pb-4">
            <div class="flex items-center gap-3">
              <span
                class="w-9 h-9 rounded-lg bg-primary text-primary-content flex items-center justify-center text-sm font-black tracking-tight shrink-0"
                >hk</span
              >
              <div class="min-w-0">
                <div class="font-bold text-sm leading-tight">ng-daisyui</div>
                <div class="text-[10px] text-base-content/40 font-mono">v0.1.52 &middot; Angular 21</div>
              </div>
            </div>

            <!-- Theme picker (compact) -->
            <div class="dropdown dropdown-bottom w-full mt-3">
              <div
                tabindex="0"
                role="button"
                class="btn btn-xs btn-block btn-ghost justify-between border border-base-content/8 h-8 text-xs font-normal"
              >
                <span class="flex items-center gap-1.5">
                  <hk-lucide-icon name="Palette" [size]="12" />
                  <span class="capitalize">{{ currentTheme() }}</span>
                </span>
                <hk-lucide-icon name="ChevronsUpDown" [size]="12" />
              </div>
              <ul tabindex="0" class="dropdown-content bg-base-300 rounded-box z-50 w-full max-h-64 overflow-y-auto p-2 shadow-2xl mt-1">
                @for (theme of themes; track theme) {
                  <li>
                    <input
                      type="radio"
                      name="theme-sidebar"
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

          <div class="h-px bg-base-content/5 mx-4"></div>

          <!-- Navigation -->
          <nav class="sidebar-menu flex-1 overflow-y-auto sidebar-scroll px-3 py-3">
            <ul class="menu gap-0.5">
              <li class="menu-title mt-1">Forms</li>
              <li>
                <a routerLink="/forms" routerLinkActive="active">
                  <hk-lucide-icon name="FileInput" [size]="16" />
                  Dynamic Forms
                </a>
              </li>
              <li>
                <a routerLink="/wizard" routerLinkActive="active">
                  <hk-lucide-icon name="ListOrdered" [size]="16" />
                  Form Wizard
                </a>
              </li>

              <li class="menu-title mt-4">Data Display</li>
              <li>
                <a routerLink="/table" routerLinkActive="active">
                  <hk-lucide-icon name="Table" [size]="16" />
                  Table
                </a>
              </li>
              <li>
                <a routerLink="/tree-table" routerLinkActive="active">
                  <hk-lucide-icon name="ListTree" [size]="16" />
                  Tree Table
                </a>
              </li>
              <li>
                <a routerLink="/tree" routerLinkActive="active">
                  <hk-lucide-icon name="GitBranch" [size]="16" />
                  Tree
                </a>
              </li>
              <li>
                <a routerLink="/org-chart" routerLinkActive="active">
                  <hk-lucide-icon name="Network" [size]="16" />
                  Organization Chart
                </a>
              </li>

              <li>
                <a routerLink="/virtual-scroller" routerLinkActive="active">
                  <hk-lucide-icon name="ScrollText" [size]="16" />
                  Virtual Scroller
                </a>
              </li>

              <li class="menu-title mt-4">Inputs</li>
              <li>
                <a routerLink="/input" routerLinkActive="active">
                  <hk-lucide-icon name="TextCursorInput" [size]="16" />
                  Input
                </a>
              </li>
              <li>
                <a routerLink="/select" routerLinkActive="active">
                  <hk-lucide-icon name="ChevronDown" [size]="16" />
                  Select
                </a>
              </li>
              <li>
                <a routerLink="/datepicker" routerLinkActive="active">
                  <hk-lucide-icon name="Calendar" [size]="16" />
                  Datepicker
                </a>
              </li>
              <li>
                <a routerLink="/timepicker" routerLinkActive="active">
                  <hk-lucide-icon name="Clock" [size]="16" />
                  Timepicker
                </a>
              </li>

              <li class="menu-title mt-4">Navigation</li>
              <li>
                <a routerLink="/tabs" routerLinkActive="active">
                  <hk-lucide-icon name="PanelTop" [size]="16" />
                  Tabs
                </a>
              </li>

              <li class="menu-title mt-4">Feedback</li>
              <li>
                <a routerLink="/toast" routerLinkActive="active">
                  <hk-lucide-icon name="Bell" [size]="16" />
                  Toast Notifications
                </a>
              </li>
              <li>
                <a routerLink="/alert" routerLinkActive="active">
                  <hk-lucide-icon name="MessageSquareWarning" [size]="16" />
                  Alert Dialogs
                </a>
              </li>
              <li>
                <a routerLink="/dialog" routerLinkActive="active">
                  <hk-lucide-icon name="PanelTopOpen" [size]="16" />
                  Dialog Service
                </a>
              </li>

              <li class="menu-title mt-4">Utilities</li>
              <li>
                <a routerLink="/icons" routerLinkActive="active">
                  <hk-lucide-icon name="Smile" [size]="16" />
                  Icons
                </a>
              </li>
              <li>
                <a routerLink="/motion" routerLinkActive="active">
                  <hk-lucide-icon name="Sparkles" [size]="16" />
                  Motion Directives
                </a>
              </li>
            </ul>
          </nav>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-base-content/5">
            <div class="text-[10px] text-base-content/30 flex items-center gap-1">Built with DaisyUI 5 &middot; Tailwind 4</div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styleUrl: '../styles.css',
})
export class App implements OnInit {
  readonly themes = THEMES;
  readonly currentTheme = signal('dark');

  ngOnInit(): void {
    const saved = localStorage.getItem('hk-demo-theme');
    if (saved) {
      this.setTheme(saved);
    }
  }

  setTheme(theme: string): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hk-demo-theme', theme);
  }
}
