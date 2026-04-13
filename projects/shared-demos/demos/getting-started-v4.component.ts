import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui';
import { CodeBlockComponent } from '../shared/code-block.component';

@Component({
  selector: 'app-getting-started-v4',
  imports: [LucideIconComponent, CodeBlockComponent, RouterLink],
  template: `
    <div class="space-y-10 max-w-4xl">
      <!-- Hero -->
      <div class="hero bg-base-200 rounded-box py-12 px-6">
        <div class="hero-content flex-col text-center">
          <span class="badge badge-primary badge-outline badge-sm font-mono">DaisyUI 4 · Tailwind 3</span>
          <h1 class="text-4xl lg:text-5xl font-serif tracking-tight">ng-daisyui</h1>
          <p class="text-base-content/60 text-sm leading-relaxed max-w-lg">
            Production-ready Angular components running on the legacy DaisyUI v4 + Tailwind v3 toolchain. Same library as v5 -- just
            rendered with v4 class names.
          </p>
          <div class="flex gap-2 mt-2">
            <a routerLink="/installation" class="btn btn-primary btn-sm">
              <hk-lucide-icon name="Download" [size]="14" />
              Install
            </a>
            <a routerLink="/forms" class="btn btn-ghost btn-sm">
              <hk-lucide-icon name="Play" [size]="14" />
              View Demos
            </a>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats stats-vertical sm:stats-horizontal shadow w-full">
        @for (s of stats; track s.title) {
          <div class="stat">
            <div class="stat-figure text-primary">
              <hk-lucide-icon [name]="s.icon" [size]="24" />
            </div>
            <div class="stat-title text-xs">{{ s.title }}</div>
            <div class="stat-value text-2xl">{{ s.value }}</div>
            <div class="stat-desc text-xs">{{ s.desc }}</div>
          </div>
        }
      </div>

      <!-- v5 upgrade CTA -->
      <div role="alert" class="alert alert-warning">
        <hk-lucide-icon name="Lightbulb" [size]="18" />
        <div>
          <h3 class="font-bold text-sm">On a new project?</h3>
          <div class="text-xs">
            Prefer the <strong>v5</strong> demo -- it runs on Tailwind v4 and DaisyUI v5 (soft/dash styles, &#64;plugin syntax, zero
            tailwind.config.js).
          </div>
        </div>
        <a href="/" class="btn btn-sm btn-ghost">
          Open v5
          <hk-lucide-icon name="ArrowRight" [size]="14" />
        </a>
      </div>

      <!-- Features -->
      <div>
        <h2 class="text-xl font-serif mb-4">Why ng-daisyui?</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (feature of features; track feature.title) {
            <div class="card bg-base-100 border border-base-300">
              <div class="card-body p-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <hk-lucide-icon [name]="feature.icon" [size]="18" />
                  </div>
                  <h3 class="card-title text-sm">{{ feature.title }}</h3>
                </div>
                <p class="text-xs text-base-content/60 leading-relaxed">{{ feature.description }}</p>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Quick Start -->
      <div>
        <h2 class="text-xl font-serif mb-4">Quick Start</h2>

        <!-- Compact visual tracker -->
        <ul class="steps w-full mb-6 hidden sm:flex">
          <li class="step step-primary" data-content="1">Install</li>
          <li class="step step-primary" data-content="2">Tailwind</li>
          <li class="step step-primary" data-content="3">Styles</li>
          <li class="step step-success" data-content="✓">Use</li>
        </ul>

        <!-- Step content cards -->
        <div class="space-y-3">
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-primary badge-lg font-mono">1</span>
                <h3 class="card-title text-base">Install the library and peers</h3>
              </div>
              <p class="text-sm text-base-content/60 mb-3">Tailwind 3 and DaisyUI 4 stay in devDependencies.</p>
              <app-code-block [code]="installCmd" />
            </div>
          </div>

          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-primary badge-lg font-mono">2</span>
                <h3 class="card-title text-base">Wire up Tailwind with the v4 preset</h3>
              </div>
              <p class="text-sm text-base-content/60 mb-3">The preset enables DaisyUI and the library's component styles.</p>
              <app-code-block [code]="tailwindConfigCode" />
            </div>
          </div>

          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-primary badge-lg font-mono">3</span>
                <h3 class="card-title text-base">Global styles</h3>
              </div>
              <p class="text-sm text-base-content/60 mb-3">Classic &#64;tailwind directives plus the library theme adapter.</p>
              <app-code-block [code]="stylesCode" />
            </div>
          </div>

          <div class="card bg-success/5 border border-success/30">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-success badge-lg">
                  <hk-lucide-icon name="Check" [size]="14" />
                </span>
                <h3 class="card-title text-base text-success">Import and go</h3>
              </div>
              <p class="text-sm text-base-content/60 mb-3">Standalone components are just imports -- no modules required.</p>
              <app-code-block [code]="usageCode" />
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Component Overview -->
      <div>
        <h2 class="text-xl font-serif mb-1">Components</h2>
        <p class="text-sm text-base-content/50 mb-4">All standalone. Import only what you need.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (group of componentGroups; track group.title) {
            <ul class="menu bg-base-100 rounded-box shadow-sm p-2">
              <li class="menu-title text-xs font-semibold uppercase tracking-wider opacity-50">{{ group.title }}</li>
              @for (item of group.items; track item.label) {
                <li>
                  <a [routerLink]="item.path" class="flex items-start gap-3">
                    <span class="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0 mt-0.5">
                      <hk-lucide-icon [name]="item.icon" [size]="15" class="text-base-content/50" />
                    </span>
                    <span class="flex-1 min-w-0">
                      <span class="block text-sm font-medium">{{ item.label }}</span>
                      <span class="block text-xs text-base-content/50 whitespace-normal">{{ item.desc }}</span>
                    </span>
                  </a>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <!-- Key Patterns CTA -->
      <div class="card bg-neutral text-neutral-content">
        <div class="card-body items-center text-center">
          <h2 class="card-title">Why builders? Why no buttons in forms?</h2>
          <p class="text-sm opacity-70">The library's design decisions apply identically to v4 and v5 consumers.</p>
          <div class="card-actions">
            <a routerLink="/key-patterns" class="btn btn-primary btn-sm">
              <hk-lucide-icon name="Lightbulb" [size]="14" />
              Read Key Patterns
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GettingStartedV4Component {
  stats = [
    { icon: 'Package', title: 'Components', value: '20+', desc: 'Standalone, tree-shakable' },
    { icon: 'Palette', title: 'Themes', value: '32+', desc: 'DaisyUI 4 built-ins + customs' },
    { icon: 'Zap', title: 'Performance', value: 'OnPush', desc: 'Signals throughout' },
  ];

  features = [
    {
      icon: 'Zap',
      title: 'Signals & OnPush',
      description: 'Built with Angular signals and OnPush change detection for optimal performance.',
    },
    {
      icon: 'Paintbrush',
      title: 'DaisyUI 4 + Tailwind 3',
      description: 'Themeable components using DaisyUI v4 semantic classes on Tailwind v3 with the classic JIT engine.',
    },
    {
      icon: 'Accessibility',
      title: 'Accessible',
      description: 'WCAG AA compliant with ARIA attributes, focus management, and keyboard navigation.',
    },
    {
      icon: 'Package',
      title: 'Drop-in',
      description: 'Install one package, add the preset, set a data-theme. Peers like DaisyUI stay in your config.',
    },
    {
      icon: 'Puzzle',
      title: 'Builder APIs',
      description: 'Type-safe builder functions like createForm(), createTable(), and createTree() -- same as v5.',
    },
    {
      icon: 'Palette',
      title: 'Theme-config',
      description: 'Custom themes live in tailwind.config.js under daisyui.themes -- the v4 way.',
    },
  ];

  componentGroups = [
    {
      title: 'Forms & Input',
      items: [
        { path: '/forms', label: 'Dynamic Forms', icon: 'FileInput', desc: 'Builder-driven form generation' },
        { path: '/wizard', label: 'Form Wizard', icon: 'ListOrdered', desc: 'Multi-step form flows' },
        { path: '/select', label: 'Select', icon: 'ChevronDown', desc: 'Searchable dropdown with virtual scroll' },
        { path: '/datepicker', label: 'Datepicker', icon: 'Calendar', desc: 'Date and range picker' },
        { path: '/editor', label: 'Rich Text Editor', icon: 'FileText', desc: 'Quill-based rich text editing' },
      ],
    },
    {
      title: 'Data & Feedback',
      items: [
        { path: '/table', label: 'Table', icon: 'Table', desc: 'Sort, filter, paginate, CDK DataSource' },
        { path: '/tree', label: 'Tree', icon: 'GitBranch', desc: 'Hierarchical data with drag-and-drop' },
        { path: '/toast', label: 'Toast', icon: 'Bell', desc: 'Stacking notification system' },
        { path: '/alert', label: 'Alert Dialogs', icon: 'MessageSquareWarning', desc: 'Confirm, prompt, and alert' },
        { path: '/dialog', label: 'Dialog Service', icon: 'PanelTopOpen', desc: 'Programmatic modal dialogs' },
      ],
    },
  ];

  installCmd = `npm install @hakistack/ng-daisyui
npm install -D tailwindcss@^3.4 postcss autoprefixer daisyui@^4.12`;

  tailwindConfigCode = `// tailwind.config.js
const ngDaisyuiPreset = require('@hakistack/ng-daisyui/themes/daisyui-v4-preset');

module.exports = {
  presets: [ngDaisyuiPreset],
  content: [
    './src/**/*.{html,ts}',
    './node_modules/@hakistack/ng-daisyui/**/*.{mjs,js}',
  ],
  plugins: [require('daisyui')],
  daisyui: { themes: ['light', 'dark'] },
};`;

  stylesCode = `/* src/styles.css */
@import "@hakistack/ng-daisyui/themes/daisyui-v4.css";

@tailwind base;
@tailwind components;
@tailwind utilities;`;

  usageCode = `import { Component } from '@angular/core';
import { DynamicFormComponent, createForm, field } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [DynamicFormComponent],
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <button class="btn btn-primary mt-4" (click)="form.submit()">Submit</button>
  \`,
})
export class ExampleComponent {
  form = createForm({
    fields: [
      field.text('name', 'Full Name', { required: true }),
      field.email('email', 'Email Address'),
    ],
    onSubmit: (data) => console.log(data),
  });
}`;
}
