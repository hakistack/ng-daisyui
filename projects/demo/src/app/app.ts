import { Component, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui';

const THEMES = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
  'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
  'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
  'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
  'night', 'coffee', 'winter', 'dim', 'nord', 'sunset', 'caramellatte',
  'abyss', 'silk',
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
        <div class="navbar bg-base-100 lg:hidden sticky top-0 z-30 shadow-sm">
          <div class="flex-1 flex items-center gap-2">
            <label for="sidebar" class="btn btn-ghost btn-square">
              <hk-lucide-icon name="Menu" [size]="24" />
            </label>
            <span class="text-xl font-bold">ng-daisyui</span>
          </div>
          <div class="flex-none">
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-1">
                <hk-lucide-icon name="Palette" [size]="16" />
                <span class="hidden sm:inline">Theme</span>
              </div>
              <ul tabindex="0" class="dropdown-content bg-base-300 rounded-box z-50 w-52 max-h-80 overflow-y-auto p-2 shadow-2xl">
                @for (theme of themes; track theme) {
                  <li>
                    <input
                      type="radio"
                      name="theme-mobile"
                      class="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start"
                      [attr.aria-label]="theme"
                      [value]="theme"
                      [checked]="currentTheme() === theme"
                      (change)="setTheme(theme)" />
                  </li>
                }
              </ul>
            </div>
          </div>
        </div>

        <!-- Page content -->
        <main class="p-4 lg:p-8">
          <router-outlet />
        </main>
      </div>

      <!-- Sidebar -->
      <div class="drawer-side z-40">
        <label for="sidebar" class="drawer-overlay"></label>
        <aside class="bg-base-100 w-72 min-h-full border-r border-base-300 flex flex-col">
          <!-- Logo -->
          <div class="p-4 border-b border-base-300">
            <h1 class="text-2xl font-bold text-primary">ng-daisyui</h1>
            <p class="text-sm text-base-content/60">Component Library Demo</p>
          </div>

          <!-- Navigation -->
          <ul class="menu p-4 gap-1 flex-1 overflow-y-auto">
            <li class="menu-title">Forms</li>
            <li>
              <a routerLink="/forms" routerLinkActive="active">
                <hk-lucide-icon name="FileInput" [size]="18" />
                Dynamic Forms
              </a>
            </li>
            <li>
              <a routerLink="/wizard" routerLinkActive="active">
                <hk-lucide-icon name="ListOrdered" [size]="18" />
                Form Wizard
              </a>
            </li>

            <li class="menu-title mt-4">Data Display</li>
            <li>
              <a routerLink="/table" routerLinkActive="active">
                <hk-lucide-icon name="Table" [size]="18" />
                Table
              </a>
            </li>
            <li>
              <a routerLink="/tree-table" routerLinkActive="active">
                <hk-lucide-icon name="ListTree" [size]="18" />
                Tree Table
              </a>
            </li>
            <li>
              <a routerLink="/tree" routerLinkActive="active">
                <hk-lucide-icon name="GitBranch" [size]="18" />
                Tree
              </a>
            </li>
            <li>
              <a routerLink="/org-chart" routerLinkActive="active">
                <hk-lucide-icon name="Network" [size]="18" />
                Organization Chart
              </a>
            </li>

            <li class="menu-title mt-4">Inputs</li>
            <li>
              <a routerLink="/select" routerLinkActive="active">
                <hk-lucide-icon name="ChevronDown" [size]="18" />
                Select
              </a>
            </li>
            <li>
              <a routerLink="/datepicker" routerLinkActive="active">
                <hk-lucide-icon name="Calendar" [size]="18" />
                Datepicker
              </a>
            </li>

            <li class="menu-title mt-4">Navigation</li>
            <li>
              <a routerLink="/tabs" routerLinkActive="active">
                <hk-lucide-icon name="PanelTop" [size]="18" />
                Tabs
              </a>
            </li>

            <li class="menu-title mt-4">Feedback</li>
            <li>
              <a routerLink="/toast" routerLinkActive="active">
                <hk-lucide-icon name="Bell" [size]="18" />
                Toast Notifications
              </a>
            </li>
            <li>
              <a routerLink="/alert" routerLinkActive="active">
                <hk-lucide-icon name="MessageSquareWarning" [size]="18" />
                Alert Dialogs
              </a>
            </li>
            <li>
              <a routerLink="/dialog" routerLinkActive="active">
                <hk-lucide-icon name="PanelTopOpen" [size]="18" />
                Dialog Service
              </a>
            </li>

            <li class="menu-title mt-4">Utilities</li>
            <li>
              <a routerLink="/icons" routerLinkActive="active">
                <hk-lucide-icon name="Smile" [size]="18" />
                Icons
              </a>
            </li>
            <li>
              <a routerLink="/motion" routerLinkActive="active">
                <hk-lucide-icon name="Sparkles" [size]="18" />
                Motion Directives
              </a>
            </li>
          </ul>

          <!-- Theme Picker -->
          <div class="p-4 border-t border-base-300">
            <label class="text-xs font-semibold text-base-content/60 mb-2 flex items-center gap-1.5">
              <hk-lucide-icon name="Palette" [size]="14" />
              Theme
            </label>
            <div class="dropdown dropdown-top w-full">
              <div tabindex="0" role="button" class="btn btn-sm btn-block btn-ghost justify-between border border-base-300">
                <span class="capitalize">{{ currentTheme() }}</span>
                <hk-lucide-icon name="ChevronsUpDown" [size]="14" />
              </div>
              <ul tabindex="0" class="dropdown-content bg-base-300 rounded-box z-50 w-full max-h-64 overflow-y-auto p-2 shadow-2xl mb-2">
                @for (theme of themes; track theme) {
                  <li>
                    <input
                      type="radio"
                      name="theme-sidebar"
                      class="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start capitalize"
                      [attr.aria-label]="theme"
                      [value]="theme"
                      [checked]="currentTheme() === theme"
                      (change)="setTheme(theme)" />
                  </li>
                }
              </ul>
            </div>
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
