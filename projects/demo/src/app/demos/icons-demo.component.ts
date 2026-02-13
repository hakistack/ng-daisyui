import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent, IconName } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type IconsTab = 'basic' | 'categories' | 'playground';

@Component({
  selector: 'app-icons-demo',
  imports: [LucideIconComponent, FormsModule, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Lucide Icons</h1>
        <p class="text-base-content/70 mt-2">Beautiful, consistent icons from Lucide</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} LucideIconComponent {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-border">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box">
          <input type="radio" name="icons_tabs" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="icons_tabs" role="tab" class="tab" aria-label="Categories"
            [checked]="activeTab() === 'categories'" (change)="activeTab.set('categories')" />
          <input type="radio" name="icons_tabs" role="tab" class="tab" aria-label="Playground"
            [checked]="activeTab() === 'playground'" (change)="activeTab.set('playground')" />
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Basic Usage" description="Simple icon rendering" [codeExample]="basicCode">
              <div class="flex items-center gap-6">
                <hk-lucide-icon name="Heart" />
                <hk-lucide-icon name="Star" />
                <hk-lucide-icon name="House" />
                <hk-lucide-icon name="Settings" />
                <hk-lucide-icon name="User" />
                <hk-lucide-icon name="Mail" />
              </div>
            </app-doc-section>

            <app-doc-section title="Sizes" description="Control icon size with the size input" [codeExample]="sizeCode">
              <div class="flex items-end gap-6">
                <div class="text-center">
                  <hk-lucide-icon name="Star" [size]="16" />
                  <div class="text-xs mt-2">16px</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Star" [size]="20" />
                  <div class="text-xs mt-2">20px</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Star" [size]="24" />
                  <div class="text-xs mt-2">24px</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Star" [size]="32" />
                  <div class="text-xs mt-2">32px</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Star" [size]="48" />
                  <div class="text-xs mt-2">48px</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Star" [size]="64" />
                  <div class="text-xs mt-2">64px</div>
                </div>
              </div>
            </app-doc-section>

            <app-doc-section title="Colors" description="Use any CSS color value" [codeExample]="colorCode">
              <div class="flex items-center gap-6">
                <hk-lucide-icon name="Heart" [size]="32" color="red" />
                <hk-lucide-icon name="Heart" [size]="32" color="pink" />
                <hk-lucide-icon name="Heart" [size]="32" color="#9333ea" />
                <hk-lucide-icon name="Heart" [size]="32" color="oklch(0.7 0.25 330)" />
                <hk-lucide-icon name="Heart" [size]="32" class="text-primary" />
                <hk-lucide-icon name="Heart" [size]="32" class="text-secondary" />
                <hk-lucide-icon name="Heart" [size]="32" class="text-accent" />
              </div>
              <div class="mt-4 text-sm text-base-content/60">
                Use <code class="bg-base-200 px-1">color</code> prop or Tailwind text color classes
              </div>
            </app-doc-section>

            <app-doc-section title="Stroke Width" description="Adjust line thickness" [codeExample]="strokeCode">
              <div class="flex items-center gap-8">
                <div class="text-center">
                  <hk-lucide-icon name="Circle" [size]="32" [strokeWidth]="1" />
                  <div class="text-xs mt-2">1</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Circle" [size]="32" [strokeWidth]="1.5" />
                  <div class="text-xs mt-2">1.5</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Circle" [size]="32" [strokeWidth]="2" />
                  <div class="text-xs mt-2">2 (default)</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Circle" [size]="32" [strokeWidth]="2.5" />
                  <div class="text-xs mt-2">2.5</div>
                </div>
                <div class="text-center">
                  <hk-lucide-icon name="Circle" [size]="32" [strokeWidth]="3" />
                  <div class="text-xs mt-2">3</div>
                </div>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'categories') {
          <app-doc-section title="Common Icons by Category" description="Browse commonly used icons">
            <h3 class="font-semibold mt-4 mb-2">Actions</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of actionIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <hk-lucide-icon [name]="icon" [size]="24" />
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Navigation</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of navIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <hk-lucide-icon [name]="icon" [size]="24" />
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Communication</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of commIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <hk-lucide-icon [name]="icon" [size]="24" />
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Status</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of statusIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <hk-lucide-icon [name]="icon" [size]="24" />
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Media</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of mediaIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <hk-lucide-icon [name]="icon" [size]="24" />
                  </div>
                </div>
              }
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'playground') {
          <app-doc-section title="Playground" description="Customize icon properties">
            <div class="grid md:grid-cols-2 gap-8">
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

              <div class="flex items-center justify-center bg-base-200 rounded-xl p-8 min-h-50">
                <hk-lucide-icon
                  [name]="playgroundIcon"
                  [size]="playgroundSize"
                  [strokeWidth]="playgroundStroke"
                  [color]="playgroundColor"
                />
              </div>
            </div>

            <div class="mt-4 p-4 bg-base-200 rounded-lg">
              <code class="text-sm">
                &lt;hk-lucide-icon name="{{ playgroundIcon }}" [size]="{{ playgroundSize }}" [strokeWidth]="{{
                  playgroundStroke
                }}" color="{{ playgroundColor }}" /&gt;
              </code>
            </div>
          </app-doc-section>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="LucideIcon Inputs" [entries]="inputDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Usage</h3>
            <app-code-block [code]="usageCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class IconsDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<IconsTab>('basic');

  // Playground state
  playgroundIcon: IconName = 'Heart';
  playgroundSize = 48;
  playgroundStroke = 2;
  playgroundColor = '#3b82f6';

  // Icon categories (using new Lucide naming convention)
  actionIcons: IconName[] = ['Plus', 'Minus', 'X', 'Check', 'Pencil', 'Trash2', 'Copy', 'Save', 'Download', 'Upload', 'Share', 'RefreshCw'];
  navIcons: IconName[] = ['House', 'Menu', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronDown', 'ArrowLeft', 'ArrowRight', 'ExternalLink', 'Search'];
  commIcons: IconName[] = ['Mail', 'MessageSquare', 'Phone', 'Video', 'Send', 'Bell', 'AtSign', 'Inbox'];
  statusIcons: IconName[] = ['CircleCheck', 'CircleX', 'CircleAlert', 'TriangleAlert', 'Info', 'CircleQuestionMark', 'Clock', 'Loader'];
  mediaIcons: IconName[] = ['Image', 'Camera', 'Film', 'Music', 'Play', 'Pause', 'Volume2', 'Mic'];

  allIcons: IconName[] = [
    ...this.actionIcons,
    ...this.navIcons,
    ...this.commIcons,
    ...this.statusIcons,
    ...this.mediaIcons,
    'Heart',
    'Star',
    'User',
    'Users',
    'Settings',
    'Lock',
    'Unlock',
    'Eye',
    'EyeOff',
    'Calendar',
    'Folder',
    'File',
    'FileText',
    'Code',
    'Terminal',
    'Database',
    'Globe',
    'Map',
    'Sun',
    'Moon',
    'Cloud',
    'Zap',
    'Gift',
    'Shield',
    'Award',
    'Flag',
    'Bookmark',
    'Tag',
    'Link',
    'Paperclip',
  ].sort() as IconName[];

  // --- Code examples ---
  basicCode = `// TypeScript
import { LucideIconComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [LucideIconComponent],
})

// Template
<hk-lucide-icon name="Heart" />
<hk-lucide-icon name="Star" />
<hk-lucide-icon name="House" />`;

  sizeCode = `// Template
<hk-lucide-icon name="Star" [size]="16" />
<hk-lucide-icon name="Star" [size]="24" />
<hk-lucide-icon name="Star" [size]="32" />
<hk-lucide-icon name="Star" [size]="48" />`;

  colorCode = `// TypeScript
import { LucideIconComponent } from '@hakistack/ng-daisyui';

// Template
<!-- Using color prop -->
<hk-lucide-icon name="Heart" color="red" />
<hk-lucide-icon name="Heart" color="#9333ea" />
<hk-lucide-icon name="Heart" color="oklch(0.7 0.25 330)" />

<!-- Using Tailwind classes -->
<hk-lucide-icon name="Heart" class="text-primary" />
<hk-lucide-icon name="Heart" class="text-secondary" />`;

  strokeCode = `// Template
<hk-lucide-icon name="Circle" [strokeWidth]="1" />
<hk-lucide-icon name="Circle" [strokeWidth]="1.5" />
<hk-lucide-icon name="Circle" [strokeWidth]="2" />    <!-- default -->
<hk-lucide-icon name="Circle" [strokeWidth]="2.5" />
<hk-lucide-icon name="Circle" [strokeWidth]="3" />`;

  usageCode = `import { LucideIconComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [LucideIconComponent],
  template: \`
    <hk-lucide-icon
      name="Heart"        <!-- Icon name (required) -->
      [size]="24"          <!-- Size in pixels (default: 24) -->
      [strokeWidth]="2"    <!-- Stroke width (default: 2) -->
      color="red"          <!-- CSS color value -->
    />
  \`,
})`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    { name: 'name', type: 'IconName', description: 'Lucide icon name (required). See lucide.dev/icons for the full list.' },
    { name: 'size', type: 'number', default: '24', description: 'Icon size in pixels' },
    { name: 'strokeWidth', type: 'number', default: '2', description: 'Stroke line width' },
    { name: 'color', type: 'string', default: "'currentColor'", description: 'CSS color value. Alternatively use Tailwind text-* classes.' },
  ];
}
