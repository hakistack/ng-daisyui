import { Component, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui';

const THEMES = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
  'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
  'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
  'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
  'night', 'coffee', 'winter', 'dim', 'nord', 'sunset',
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
            <span class="text-xl font-bold">ng-daisyui (v4 theme)</span>
          </div>
          <div class="flex-none">
            <select
              class="select select-bordered select-sm w-36"
              [value]="currentTheme()"
              (change)="setTheme($any($event.target).value)">
              @for (theme of themes; track theme) {
                <option [value]="theme" [selected]="currentTheme() === theme" class="capitalize">{{ theme }}</option>
              }
            </select>
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
            <h1 class="text-2xl font-bold text-primary">ng-daisyui (v4 theme)</h1>
            <p class="text-sm text-base-content/60">DaisyUI v4 + Tailwind v3</p>
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
            <select
              class="select select-bordered select-sm w-full capitalize"
              [value]="currentTheme()"
              (change)="setTheme($any($event.target).value)">
              @for (theme of themes; track theme) {
                <option [value]="theme" [selected]="currentTheme() === theme" class="capitalize">{{ theme }}</option>
              }
            </select>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class App implements OnInit {
  readonly themes = THEMES;
  readonly currentTheme = signal('dark');

  ngOnInit(): void {
    const saved = localStorage.getItem('hk-demo-v4-theme');
    if (saved) {
      this.setTheme(saved);
    }
  }

  setTheme(theme: string): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hk-demo-v4-theme', theme);
  }
}
