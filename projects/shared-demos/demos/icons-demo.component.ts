import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import {
  LucideDynamicIcon,
  provideLucideIcons,
  LucideHeart,
  LucideStar,
  LucideHouse,
  LucideSettings,
  LucideUser,
  LucideMail,
  LucideCircle,
  LucidePlus,
  LucideMinus,
  LucideX,
  LucideCheck,
  LucidePencil,
  LucideTrash2,
  LucideCopy,
  LucideSave,
  LucideDownload,
  LucideUpload,
  LucideShare,
  LucideRefreshCw,
  LucideMenu,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
  LucideChevronDown,
  LucideArrowLeft,
  LucideArrowRight,
  LucideExternalLink,
  LucideSearch,
  LucideMessageSquare,
  LucidePhone,
  LucideVideo,
  LucideSend,
  LucideBell,
  LucideAtSign,
  LucideInbox,
  LucideCircleCheck,
  LucideCircleX,
  LucideCircleAlert,
  LucideTriangleAlert,
  LucideInfo,
  LucideCircleQuestionMark,
  LucideClock,
  LucideLoader,
  LucideImage,
  LucideCamera,
  LucideFilm,
  LucideMusic,
  LucidePlay,
  LucidePause,
  LucideVolume2,
  LucideMic,
  LucideUsers,
  LucideLock,
  LucideUnlock,
  LucideEye,
  LucideEyeOff,
  LucideCalendar,
  LucideFolder,
  LucideFile,
  LucideFileText,
  LucideCode,
  LucideTerminal,
  LucideDatabase,
  LucideGlobe,
  LucideMap,
  LucideSun,
  LucideMoon,
  LucideCloud,
  LucideZap,
  LucideGift,
  LucideShield,
  LucideAward,
  LucideFlag,
  LucideBookmark,
  LucideTag,
  LucideLink,
  LucidePaperclip,
  LucideSmile,
} from '@lucide/angular';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { DemoPageComponent } from '../shared/demo-page.component';
import { ApiDocEntry } from '../shared/api-table.types';

type IconsTab = 'basic' | 'categories' | 'playground';

@Component({
  selector: 'app-icons-demo',
  imports: [LucideDynamicIcon, FormsModule, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  providers: [
    provideLucideIcons(
      LucideHeart,
      LucideStar,
      LucideHouse,
      LucideSettings,
      LucideUser,
      LucideMail,
      LucideCircle,
      LucidePlus,
      LucideMinus,
      LucideX,
      LucideCheck,
      LucidePencil,
      LucideTrash2,
      LucideCopy,
      LucideSave,
      LucideDownload,
      LucideUpload,
      LucideShare,
      LucideRefreshCw,
      LucideMenu,
      LucideChevronLeft,
      LucideChevronRight,
      LucideChevronUp,
      LucideChevronDown,
      LucideArrowLeft,
      LucideArrowRight,
      LucideExternalLink,
      LucideSearch,
      LucideMessageSquare,
      LucidePhone,
      LucideVideo,
      LucideSend,
      LucideBell,
      LucideAtSign,
      LucideInbox,
      LucideCircleCheck,
      LucideCircleX,
      LucideCircleAlert,
      LucideTriangleAlert,
      LucideInfo,
      LucideCircleQuestionMark,
      LucideClock,
      LucideLoader,
      LucideImage,
      LucideCamera,
      LucideFilm,
      LucideMusic,
      LucidePlay,
      LucidePause,
      LucideVolume2,
      LucideMic,
      LucideUsers,
      LucideLock,
      LucideUnlock,
      LucideEye,
      LucideEyeOff,
      LucideCalendar,
      LucideFolder,
      LucideFile,
      LucideFileText,
      LucideCode,
      LucideTerminal,
      LucideDatabase,
      LucideGlobe,
      LucideMap,
      LucideSun,
      LucideMoon,
      LucideCloud,
      LucideZap,
      LucideGift,
      LucideShield,
      LucideAward,
      LucideFlag,
      LucideBookmark,
      LucideTag,
      LucideLink,
      LucidePaperclip,
      LucideSmile,
    ),
  ],
  template: `
    <app-demo-page
      title="Icons"
      description="1000+ Lucide icons with configurable size, color, and stroke width"
      icon="smile"
      category="Utilities"
      importName="LucideDynamicIcon"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Basic Usage" description="Simple icon rendering" [codeExample]="basicCode">
              <div class="flex items-center gap-6">
                <svg lucideIcon="heart"></svg>
                <svg lucideIcon="star"></svg>
                <svg lucideIcon="house"></svg>
                <svg lucideIcon="settings"></svg>
                <svg lucideIcon="user"></svg>
                <svg lucideIcon="mail"></svg>
              </div>
            </app-doc-section>

            <app-doc-section title="Sizes" description="Control icon size with the size input" [codeExample]="sizeCode">
              <div class="flex items-end gap-6">
                <div class="text-center">
                  <svg lucideIcon="star" [size]="16"></svg>
                  <div class="text-xs mt-2">16px</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="star" [size]="20"></svg>
                  <div class="text-xs mt-2">20px</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="star" [size]="24"></svg>
                  <div class="text-xs mt-2">24px</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="star" [size]="32"></svg>
                  <div class="text-xs mt-2">32px</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="star" [size]="48"></svg>
                  <div class="text-xs mt-2">48px</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="star" [size]="64"></svg>
                  <div class="text-xs mt-2">64px</div>
                </div>
              </div>
            </app-doc-section>

            <app-doc-section title="Colors" description="Use any CSS color value" [codeExample]="colorCode">
              <div class="flex items-center gap-6">
                <svg lucideIcon="heart" [size]="32" color="red"></svg>
                <svg lucideIcon="heart" [size]="32" color="pink"></svg>
                <svg lucideIcon="heart" [size]="32" color="#9333ea"></svg>
                <svg lucideIcon="heart" [size]="32" color="oklch(0.7 0.25 330)"></svg>
                <svg lucideIcon="heart" [size]="32" class="text-primary"></svg>
                <svg lucideIcon="heart" [size]="32" class="text-secondary"></svg>
                <svg lucideIcon="heart" [size]="32" class="text-accent"></svg>
              </div>
              <div class="mt-4 text-sm text-base-content/60">
                Use <code class="bg-base-200 px-1">color</code> prop or Tailwind text color classes
              </div>
            </app-doc-section>

            <app-doc-section title="Stroke Width" description="Adjust line thickness" [codeExample]="strokeCode">
              <div class="flex items-center gap-8">
                <div class="text-center">
                  <svg lucideIcon="circle" [size]="32" [strokeWidth]="1"></svg>
                  <div class="text-xs mt-2">1</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="circle" [size]="32" [strokeWidth]="1.5"></svg>
                  <div class="text-xs mt-2">1.5</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="circle" [size]="32" [strokeWidth]="2"></svg>
                  <div class="text-xs mt-2">2 (default)</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="circle" [size]="32" [strokeWidth]="2.5"></svg>
                  <div class="text-xs mt-2">2.5</div>
                </div>
                <div class="text-center">
                  <svg lucideIcon="circle" [size]="32" [strokeWidth]="3"></svg>
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
                    <svg [lucideIcon]="icon" [size]="24"></svg>
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Navigation</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of navIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <svg [lucideIcon]="icon" [size]="24"></svg>
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Communication</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of commIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <svg [lucideIcon]="icon" [size]="24"></svg>
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Status</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of statusIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <svg [lucideIcon]="icon" [size]="24"></svg>
                  </div>
                </div>
              }
            </div>

            <h3 class="font-semibold mt-6 mb-2">Media</h3>
            <div class="flex flex-wrap gap-4">
              @for (icon of mediaIcons; track icon) {
                <div class="tooltip" [attr.data-tip]="icon">
                  <div class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <svg [lucideIcon]="icon" [size]="24"></svg>
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
                  <label class="label"
                    ><span class="label-text">Size: {{ playgroundSize }}px</span></label
                  >
                  <input type="range" class="range" min="16" max="96" [(ngModel)]="playgroundSize" />
                </div>

                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Stroke Width: {{ playgroundStroke }}</span></label
                  >
                  <input type="range" class="range" min="0.5" max="4" step="0.5" [(ngModel)]="playgroundStroke" />
                </div>

                <div class="form-control">
                  <label class="label"><span class="label-text">Color</span></label>
                  <input type="color" class="w-full h-10 rounded cursor-pointer" [(ngModel)]="playgroundColor" />
                </div>
              </div>

              <div class="flex items-center justify-center bg-base-200 rounded-xl p-8 min-h-[12.5rem]">
                <svg [lucideIcon]="playgroundIcon" [size]="playgroundSize" [strokeWidth]="playgroundStroke" [color]="playgroundColor"></svg>
              </div>
            </div>

            <div class="mt-4 p-4 bg-base-200 rounded-lg">
              <code class="text-sm">
                &lt;svg [lucideIcon]="'{{ playgroundIcon }}'" [size]="{{ playgroundSize }}" [strokeWidth]="{{ playgroundStroke }}" color="{{
                  playgroundColor
                }}"&gt;&lt;/svg&gt;
              </code>
            </div>
          </app-doc-section>
        }
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'usage'" (click)="apiTab.set('usage')">Usage</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="LucideIcon Inputs" [entries]="inputDocs" />
            <app-api-table title="LucideIcon Outputs" [entries]="outputDocs" />
          </div>
        }

        <!-- Usage sub-tab -->
        @if (apiTab() === 'usage') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Basic Setup</h3>
                <p class="text-sm text-base-content/70">
                  Import per-icon directives like <code>LucideHeart</code> from <code>&#64;lucide/angular</code>, or use
                  <code>LucideDynamicIcon</code> for dynamic name binding. Dynamic names are kebab-case (e.g., <code>arrow-right</code>,
                  <code>circle-check</code>).
                </p>
                <app-code-block [code]="usageCode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Color Strategies</h3>
                <p class="text-sm text-base-content/70">
                  You can set icon color using the <code>color</code> input prop (accepts any CSS color value), or by applying Tailwind text
                  color utility classes directly on the host element. The component defaults to <code>currentColor</code>.
                </p>
                <app-code-block [code]="colorStrategyCode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Pre-resolved Icon Data</h3>
                <p class="text-sm text-base-content/70">
                  Pass pre-resolved icon data directly via <code>[lucideIcon]</code>. It accepts a per-icon class (e.g.,
                  <code>LucideHeart</code>), a raw <code>LucideIconData</code> object, or a kebab-case string name.
                </p>
                <app-code-block [code]="iconDataCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Icon names</h3>
                <p class="text-sm text-base-content/70">
                  String icon names passed to <code>[lucideIcon]</code> are kebab-case (e.g. <code>heart</code>, <code>arrow-right</code>).
                  Browse <a href="https://lucide.dev/icons" target="_blank" class="link link-primary">lucide.dev/icons</a> for the full icon
                  list.
                </p>
                <app-code-block [code]="typeIconName" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">LucideIconData</h3>
                <p class="text-sm text-base-content/70">
                  The raw icon data object from the <code>&#64;lucide/angular</code> library. When passed via <code>[lucideIcon]</code>, the
                  directive renders this directly without looking up the icon by name.
                </p>
                <app-code-block [code]="typeLucideIconData" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class IconsDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as IconsTab);

  apiTab = signal<'component' | 'usage' | 'types'>('component');

  // Playground state
  playgroundIcon = 'heart';
  playgroundSize = 48;
  playgroundStroke = 2;
  playgroundColor = '#3b82f6';

  // Icon categories (kebab-case for @lucide/angular string lookup)
  actionIcons: string[] = ['plus', 'minus', 'x', 'check', 'pencil', 'trash-2', 'copy', 'save', 'download', 'upload', 'share', 'refresh-cw'];
  navIcons: string[] = [
    'house',
    'menu',
    'chevron-left',
    'chevron-right',
    'chevron-up',
    'chevron-down',
    'arrow-left',
    'arrow-right',
    'external-link',
    'search',
  ];
  commIcons: string[] = ['mail', 'message-square', 'phone', 'video', 'send', 'bell', 'at-sign', 'inbox'];
  statusIcons: string[] = ['circle-check', 'circle-x', 'circle-alert', 'triangle-alert', 'info', 'circle-question-mark', 'clock', 'loader'];
  mediaIcons: string[] = ['image', 'camera', 'film', 'music', 'play', 'pause', 'volume-2', 'mic'];

  allIcons: string[] = [
    ...this.actionIcons,
    ...this.navIcons,
    ...this.commIcons,
    ...this.statusIcons,
    ...this.mediaIcons,
    'heart',
    'star',
    'user',
    'users',
    'settings',
    'lock',
    'unlock',
    'eye',
    'eye-off',
    'calendar',
    'folder',
    'file',
    'file-text',
    'code',
    'terminal',
    'database',
    'globe',
    'map',
    'sun',
    'moon',
    'cloud',
    'zap',
    'gift',
    'shield',
    'award',
    'flag',
    'bookmark',
    'tag',
    'link',
    'paperclip',
  ].sort() as string[];

  // --- Code examples ---
  basicCode = `// TypeScript (per-icon directive — no registration required)
import { LucideHeart, LucideStar, LucideHouse } from '@lucide/angular';

@Component({
  imports: [LucideHeart, LucideStar, LucideHouse],
})

// Template
<svg lucideHeart></svg>
<svg lucideStar></svg>
<svg lucideHouse></svg>`;

  sizeCode = `// Template (per-icon directive with size input)
<svg lucideStar [size]="16"></svg>
<svg lucideStar [size]="24"></svg>
<svg lucideStar [size]="32"></svg>
<svg lucideStar [size]="48"></svg>`;

  colorCode = `// TypeScript
import { LucideHeart } from '@lucide/angular';

// Template
<!-- Using color prop -->
<svg lucideHeart color="red"></svg>
<svg lucideHeart color="#9333ea"></svg>
<svg lucideHeart color="oklch(0.7 0.25 330)"></svg>

<!-- Using Tailwind classes -->
<svg lucideHeart class="text-primary"></svg>
<svg lucideHeart class="text-secondary"></svg>`;

  strokeCode = `// Template
<svg lucideCircle [strokeWidth]="1"></svg>
<svg lucideCircle [strokeWidth]="1.5"></svg>
<svg lucideCircle [strokeWidth]="2"></svg>    <!-- default -->
<svg lucideCircle [strokeWidth]="2.5"></svg>
<svg lucideCircle [strokeWidth]="3"></svg>`;

  usageCode = `// Two ways to use @lucide/angular:

// 1. Per-icon directive (tree-shakable, zero runtime cost)
import { LucideHeart } from '@lucide/angular';

@Component({
  imports: [LucideHeart],
  template: \`
    <svg lucideHeart
      [size]="24"          <!-- Size in pixels (default: 24) -->
      [strokeWidth]="2"    <!-- Stroke width (default: 2) -->
      color="red">         <!-- CSS color value -->
    </svg>
  \`,
})

// 2. Dynamic directive (pass an icon by name string or data object)
import { LucideDynamicIcon, provideLucideIcons, LucideHeart } from '@lucide/angular';

@Component({
  imports: [LucideDynamicIcon],
  providers: [provideLucideIcons(LucideHeart)],
  template: \`
    <!-- Static kebab-case name -->
    <svg lucideIcon="heart" [size]="24"></svg>

    <!-- Dynamic binding -->
    <svg [lucideIcon]="iconName()" [size]="24"></svg>
  \`,
})`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    {
      name: 'lucideIcon',
      type: 'LucideIcon | LucideIconData | string',
      description:
        'Icon to render. Accepts a per-icon class (e.g. LucideHeart), a raw LucideIconData object, or a kebab-case string name (requires provideLucideIcons).',
    },
    { name: 'size', type: 'number', default: '24', description: 'Icon size in pixels (width and height)' },
    {
      name: 'color',
      type: 'string',
      default: "'currentColor'",
      description: 'CSS color value for the icon stroke. Alternatively use Tailwind text-* utility classes on the host element.',
    },
    { name: 'strokeWidth', type: 'number', default: '2', description: 'Stroke line width of the icon paths' },
    {
      name: 'absoluteStrokeWidth',
      type: 'boolean',
      default: 'false',
      description: 'When true, the stroke width remains constant regardless of icon size (not scaled proportionally)',
    },
    { name: 'class', type: 'string', default: "''", description: 'Additional CSS class(es) applied to the underlying SVG element' },
  ];

  outputDocs: ApiDocEntry[] = [
    {
      name: '-',
      type: '-',
      description: 'This directive does not emit any outputs. It is a pure display directive that renders an SVG icon.',
    },
  ];

  colorStrategyCode = `<!-- Using the color input prop -->
<svg lucideHeart color="red"></svg>
<svg lucideHeart color="#9333ea"></svg>
<svg lucideHeart color="oklch(0.7 0.25 330)"></svg>

<!-- Using Tailwind utility classes on the host -->
<svg lucideHeart class="text-primary"></svg>
<svg lucideHeart class="text-error"></svg>`;

  iconDataCode = `import { LucideDynamicIcon, type LucideIconData } from '@lucide/angular';

// Pass pre-resolved data to bypass registry lookup
const myIcon: LucideIconData = /* loaded dynamically */;

<svg [lucideIcon]="myIcon" [size]="24"></svg>`;

  typeIconName = `// String icon names for the dynamic directive are kebab-case,
// e.g. 'heart', 'arrow-right', 'circle-check'.
// They must be registered via provideLucideIcons(...) in the component's providers.`;

  typeLucideIconData = `// Re-exported from @lucide/angular
// Represents the raw SVG path data for an icon
export type LucideIconData = /* @lucide/angular internal type */;`;
}
