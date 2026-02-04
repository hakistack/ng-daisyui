import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent, IconName } from '@hakistack/ng-daisyui-v3';

@Component({
  selector: 'app-icons-demo',
  imports: [LucideIconComponent, FormsModule],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Lucide Icons</h1>
        <p class="text-base-content/70 mt-2">Beautiful, consistent icons from Lucide</p>
      </div>

      <!-- Basic Usage -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Basic Usage</h2>
          <p class="text-sm text-base-content/60 mb-4">Simple icon rendering</p>

          <div class="flex items-center gap-6">
            <app-lucide-icon name="Heart" />
            <app-lucide-icon name="Star" />
            <app-lucide-icon name="House" />
            <app-lucide-icon name="Settings" />
            <app-lucide-icon name="User" />
            <app-lucide-icon name="Mail" />
          </div>

          <div class="mt-4 text-sm text-base-content/60">
            <code class="bg-base-200 px-2 py-1 rounded">&lt;app-lucide-icon name="Heart" /&gt;</code>
          </div>
        </div>
      </div>

      <!-- Sizes -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Sizes</h2>
          <p class="text-sm text-base-content/60 mb-4">Control icon size with the size input</p>

          <div class="flex items-end gap-6">
            <div class="text-center">
              <app-lucide-icon name="Star" [size]="16" />
              <div class="text-xs mt-2">16px</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Star" [size]="24" />
              <div class="text-xs mt-2">24px</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Star" [size]="32" />
              <div class="text-xs mt-2">32px</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Star" [size]="48" />
              <div class="text-xs mt-2">48px</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Star" [size]="64" />
              <div class="text-xs mt-2">64px</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Colors -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Colors</h2>
          <p class="text-sm text-base-content/60 mb-4">Use any CSS color value</p>

          <div class="flex items-center gap-6">
            <app-lucide-icon name="Heart" [size]="32" color="red" />
            <app-lucide-icon name="Heart" [size]="32" color="pink" />
            <app-lucide-icon name="Heart" [size]="32" color="#9333ea" />
            <app-lucide-icon name="Heart" [size]="32" class="text-primary" />
            <app-lucide-icon name="Heart" [size]="32" class="text-secondary" />
            <app-lucide-icon name="Heart" [size]="32" class="text-accent" />
          </div>

          <div class="mt-4 text-sm text-base-content/60">
            Use <code class="bg-base-200 px-1">color</code> prop or Tailwind text color classes
          </div>
        </div>
      </div>

      <!-- Stroke Width -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Stroke Width</h2>
          <p class="text-sm text-base-content/60 mb-4">Adjust line thickness</p>

          <div class="flex items-center gap-8">
            <div class="text-center">
              <app-lucide-icon name="Circle" [size]="32" [strokeWidth]="1" />
              <div class="text-xs mt-2">1</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Circle" [size]="32" [strokeWidth]="1.5" />
              <div class="text-xs mt-2">1.5</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Circle" [size]="32" [strokeWidth]="2" />
              <div class="text-xs mt-2">2 (default)</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Circle" [size]="32" [strokeWidth]="2.5" />
              <div class="text-xs mt-2">2.5</div>
            </div>
            <div class="text-center">
              <app-lucide-icon name="Circle" [size]="32" [strokeWidth]="3" />
              <div class="text-xs mt-2">3</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Icon Categories -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Common Icons by Category</h2>
          <p class="text-sm text-base-content/60 mb-4">Browse commonly used icons</p>

          <!-- Actions -->
          <h3 class="font-semibold mt-4 mb-2">Actions</h3>
          <div class="flex flex-wrap gap-4">
            @for (icon of actionIcons; track icon) {
              <div class="tooltip" [attr.data-tip]="icon">
                <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                  <app-lucide-icon [name]="icon" [size]="24" />
                </div>
              </div>
            }
          </div>

          <!-- Navigation -->
          <h3 class="font-semibold mt-6 mb-2">Navigation</h3>
          <div class="flex flex-wrap gap-4">
            @for (icon of navIcons; track icon) {
              <div class="tooltip" [attr.data-tip]="icon">
                <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                  <app-lucide-icon [name]="icon" [size]="24" />
                </div>
              </div>
            }
          </div>

          <!-- Status -->
          <h3 class="font-semibold mt-6 mb-2">Status</h3>
          <div class="flex flex-wrap gap-4">
            @for (icon of statusIcons; track icon) {
              <div class="tooltip" [attr.data-tip]="icon">
                <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                  <app-lucide-icon [name]="icon" [size]="24" />
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Interactive Playground -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Playground</h2>
          <p class="text-sm text-base-content/60 mb-4">Customize icon properties</p>

          <div class="grid md:grid-cols-2 gap-8">
            <!-- Controls -->
            <div class="space-y-4">
              <div class="form-control">
                <label class="label"><span class="label-text">Icon Name</span></label>
                <select class="select select-bordered" [(ngModel)]="playgroundIcon">
                  @for (icon of allIcons; track icon) {
                    <option [value]="icon">{{ icon }}</option>
                  }
                </select>
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text">Size: {{ playgroundSize }}px</span></label>
                <input type="range" class="range" min="16" max="96" [(ngModel)]="playgroundSize" />
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text">Stroke Width: {{ playgroundStroke }}</span></label>
                <input type="range" class="range" min="0.5" max="4" step="0.5" [(ngModel)]="playgroundStroke" />
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text">Color</span></label>
                <input type="color" class="w-full h-10 rounded cursor-pointer" [(ngModel)]="playgroundColor" />
              </div>
            </div>

            <!-- Preview -->
            <div class="flex items-center justify-center bg-base-200 rounded-xl p-8 min-h-50">
              <app-lucide-icon [name]="playgroundIcon" [size]="playgroundSize" [strokeWidth]="playgroundStroke" [color]="playgroundColor" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class IconsDemoComponent {
  playgroundIcon: IconName = 'Heart';
  playgroundSize = 48;
  playgroundStroke = 2;
  playgroundColor = '#3b82f6';

  actionIcons: IconName[] = ['Plus', 'Minus', 'X', 'Check', 'Pencil', 'Trash2', 'Copy', 'Save', 'Download', 'Upload', 'Share', 'RefreshCw'];
  navIcons: IconName[] = ['House', 'Menu', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronDown', 'ArrowLeft', 'ArrowRight', 'Search'];
  statusIcons: IconName[] = ['CircleCheck', 'CircleX', 'CircleAlert', 'TriangleAlert', 'Info', 'Clock', 'Loader'];

  allIcons: IconName[] = [
    ...this.actionIcons,
    ...this.navIcons,
    ...this.statusIcons,
    'Heart',
    'Star',
    'User',
    'Users',
    'Settings',
    'Lock',
    'Eye',
    'Calendar',
    'File',
    'Folder',
    'Globe',
    'Sun',
    'Moon',
  ].sort() as IconName[];
}
