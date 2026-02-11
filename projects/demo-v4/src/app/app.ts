import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui-v4';

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
          <label for="sidebar" class="btn btn-ghost btn-square">
            <app-lucide-icon name="Menu" [size]="24" />
          </label>
          <span class="text-xl font-bold">ng-daisyui-v4</span>
        </div>

        <!-- Page content -->
        <main class="p-4 lg:p-8">
          <router-outlet />
        </main>
      </div>

      <!-- Sidebar -->
      <div class="drawer-side z-40">
        <label for="sidebar" class="drawer-overlay"></label>
        <aside class="bg-base-100 w-72 min-h-full border-r border-base-300">
          <!-- Logo -->
          <div class="p-4 border-b border-base-300">
            <h1 class="text-2xl font-bold text-primary">ng-daisyui-v4</h1>
            <p class="text-sm text-base-content/60">DaisyUI v4 + Tailwind v3</p>
          </div>

          <!-- Theme Selector -->
          <div class="p-4 border-b border-base-300">
            <label class="label">
              <span class="label-text">Theme</span>
            </label>
            <select class="select select-bordered select-sm w-full" (change)="changeTheme($event)">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option values="sirat">Sirat</option>
              <option value="cupcake">Cupcake</option>
              <option value="bumblebee">Bumblebee</option>
              <option value="emerald">Emerald</option>
              <option value="corporate">Corporate</option>
              <option value="synthwave">Synthwave</option>
              <option value="retro">Retro</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="valentine">Valentine</option>
              <option value="halloween">Halloween</option>
              <option value="garden">Garden</option>
              <option value="forest">Forest</option>
              <option value="aqua">Aqua</option>
              <option value="lofi">Lofi</option>
              <option value="pastel">Pastel</option>
              <option value="fantasy">Fantasy</option>
              <option value="dracula">Dracula</option>
              <option value="autumn">Autumn</option>
              <option value="business">Business</option>
              <option value="lemonade">Lemonade</option>
              <option value="night">Night</option>
              <option value="coffee">Coffee</option>
              <option value="winter">Winter</option>
              <option value="dim">Dim</option>
              <option value="nord">Nord</option>
              <option value="sunset">Sunset</option>
            </select>
          </div>

          <!-- Navigation -->
          <ul class="menu p-4 gap-1">
            <li class="menu-title">Forms</li>
            <li>
              <a routerLink="/forms" routerLinkActive="active">
                <app-lucide-icon name="FileInput" [size]="18" />
                Dynamic Forms
              </a>
            </li>
            <li>
              <a routerLink="/wizard" routerLinkActive="active">
                <app-lucide-icon name="ListOrdered" [size]="18" />
                Form Wizard
              </a>
            </li>

            <li class="menu-title mt-4">Data Display</li>
            <li>
              <a routerLink="/table" routerLinkActive="active">
                <app-lucide-icon name="Table" [size]="18" />
                Table
              </a>
            </li>
            <li>
              <a routerLink="/tree-table" routerLinkActive="active">
                <app-lucide-icon name="ListTree" [size]="18" />
                Tree Table
              </a>
            </li>
            <li>
              <a routerLink="/tree" routerLinkActive="active">
                <app-lucide-icon name="GitBranch" [size]="18" />
                Tree
              </a>
            </li>
            <li>
              <a routerLink="/org-chart" routerLinkActive="active">
                <app-lucide-icon name="Network" [size]="18" />
                Organization Chart
              </a>
            </li>

            <li class="menu-title mt-4">Inputs</li>
            <li>
              <a routerLink="/select" routerLinkActive="active">
                <app-lucide-icon name="ChevronDown" [size]="18" />
                Select
              </a>
            </li>
            <li>
              <a routerLink="/datepicker" routerLinkActive="active">
                <app-lucide-icon name="Calendar" [size]="18" />
                Datepicker
              </a>
            </li>

            <li class="menu-title mt-4">Navigation</li>
            <li>
              <a routerLink="/tabs" routerLinkActive="active">
                <app-lucide-icon name="PanelTop" [size]="18" />
                Tabs
              </a>
            </li>

            <li class="menu-title mt-4">Feedback</li>
            <li>
              <a routerLink="/toast" routerLinkActive="active">
                <app-lucide-icon name="Bell" [size]="18" />
                Toast Notifications
              </a>
            </li>
            <li>
              <a routerLink="/alert" routerLinkActive="active">
                <app-lucide-icon name="MessageSquareWarning" [size]="18" />
                Alert Dialogs
              </a>
            </li>
            <li>
              <a routerLink="/dialog" routerLinkActive="active">
                <app-lucide-icon name="PanelTopOpen" [size]="18" />
                Dialog Service
              </a>
            </li>

            <li class="menu-title mt-4">Utilities</li>
            <li>
              <a routerLink="/icons" routerLinkActive="active">
                <app-lucide-icon name="Smile" [size]="18" />
                Icons
              </a>
            </li>
            <li>
              <a routerLink="/motion" routerLinkActive="active">
                <app-lucide-icon name="Sparkles" [size]="18" />
                Motion Directives
              </a>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  `,
})
export class App {
  changeTheme(event: Event) {
    const theme = (event.target as HTMLSelectElement).value;
    document.documentElement.setAttribute('data-theme', theme);
  }
}
