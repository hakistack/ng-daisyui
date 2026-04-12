import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideIconComponent } from '@hakistack/ng-daisyui';
import { CodeBlockComponent } from '../shared/code-block.component';

@Component({
  selector: 'app-getting-started',
  imports: [LucideIconComponent, CodeBlockComponent, RouterLink],
  template: `
    <div class="space-y-14 max-w-4xl">
      <!-- Hero -->
      <div class="hero bg-base-200 rounded-box py-12 px-6">
        <div class="hero-content flex-col text-center">
          <span class="badge badge-soft badge-primary badge-sm font-mono">v0.1.55</span>
          <h1 class="text-4xl lg:text-5xl font-serif tracking-tight">ng-daisyui</h1>
          <p class="text-base-content/50 text-sm leading-relaxed max-w-lg">
            Production-ready Angular components powered by DaisyUI and Tailwind CSS. Install once, import what you need -- zero config
            required.
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

      <!-- Features -->
      <div>
        <h2 class="text-xl font-serif mb-4">Why ng-daisyui?</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (feature of features; track feature.title) {
            <div class="card bg-base-100 card-border card-sm">
              <div class="card-body">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <hk-lucide-icon [name]="feature.icon" [size]="18" />
                  </div>
                  <h3 class="card-title text-sm">{{ feature.title }}</h3>
                </div>
                <p class="text-xs text-base-content/50 leading-relaxed">{{ feature.description }}</p>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Quick Start -->
      <div>
        <h2 class="text-xl font-serif mb-4">Quick Start</h2>

        <ul class="timeline timeline-vertical timeline-compact">
          <!-- Step 1 -->
          <li>
            <div class="timeline-middle">
              <span class="badge badge-primary badge-xs font-mono">1</span>
            </div>
            <div class="timeline-end timeline-box w-full">
              <h3 class="font-semibold text-sm mb-1">Install the package</h3>
              <p class="text-xs text-base-content/40 mb-3">One command. All dependencies included.</p>
              <app-code-block [code]="installCmd" />
            </div>
            <hr class="bg-primary" />
          </li>
          <!-- Step 2 -->
          <li>
            <hr class="bg-primary" />
            <div class="timeline-middle">
              <span class="badge badge-primary badge-xs font-mono">2</span>
            </div>
            <div class="timeline-end timeline-box w-full">
              <h3 class="font-semibold text-sm mb-1">Configure your styles</h3>
              <p class="text-xs text-base-content/40 mb-3">Add Tailwind + DaisyUI + library styles to your global CSS.</p>
              <app-code-block [code]="stylesCode" />
            </div>
            <hr class="bg-primary" />
          </li>
          <!-- Step 3 -->
          <li>
            <hr class="bg-primary" />
            <div class="timeline-middle">
              <span class="badge badge-primary badge-xs font-mono">3</span>
            </div>
            <div class="timeline-end timeline-box w-full">
              <h3 class="font-semibold text-sm mb-1">Use a component</h3>
              <p class="text-xs text-base-content/40 mb-3">Import standalone components directly -- no modules needed.</p>
              <app-code-block [code]="usageCode" />
            </div>
            <hr />
          </li>
          <!-- Done -->
          <li>
            <hr />
            <div class="timeline-middle">
              <span class="badge badge-success badge-xs">
                <hk-lucide-icon name="Check" [size]="10" />
              </span>
            </div>
            <div class="timeline-end timeline-box w-full bg-success/5 border-success/20">
              <h3 class="font-semibold text-sm text-success">You're all set!</h3>
              <p class="text-xs text-base-content/45">Explore the component demos from the sidebar.</p>
            </div>
          </li>
        </ul>
      </div>

      <div class="divider"></div>

      <!-- Component Overview -->
      <div>
        <h2 class="text-xl font-serif mb-1">Components</h2>
        <p class="text-sm text-base-content/40 mb-4">All standalone. Import only what you need.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (group of componentGroups; track group.title) {
            <ul class="list bg-base-100 rounded-box shadow-sm">
              <li class="p-4 pb-2 text-xs font-semibold uppercase tracking-wider opacity-40">{{ group.title }}</li>
              @for (item of group.items; track item.label) {
                <li class="list-row">
                  <div class="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                    <hk-lucide-icon [name]="item.icon" [size]="15" class="text-base-content/40" />
                  </div>
                  <div>
                    <a [routerLink]="item.path" class="link link-hover text-sm font-medium">{{ item.label }}</a>
                    <div class="text-xs text-base-content/40">{{ item.desc }}</div>
                  </div>
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
          <p class="text-sm opacity-70">Learn the design decisions behind ng-daisyui and how they help you write less code.</p>
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
export class GettingStartedComponent {
  stats = [
    { icon: 'Package', title: 'Components', value: '20+', desc: 'Standalone, tree-shakable' },
    { icon: 'Palette', title: 'Themes', value: '40+', desc: 'DaisyUI built-in + custom' },
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
      title: 'DaisyUI + Tailwind',
      description: 'Themeable components using DaisyUI v5 semantic classes on Tailwind CSS v4.',
    },
    {
      icon: 'Accessibility',
      title: 'Accessible',
      description: 'WCAG AA compliant with ARIA attributes, focus management, and keyboard navigation.',
    },
    {
      icon: 'Package',
      title: 'Zero Config',
      description: 'Install one package and go. All dependencies like icons and animations are included.',
    },
    {
      icon: 'Puzzle',
      title: 'Builder APIs',
      description: 'Type-safe builder functions like createForm(), createTable(), and createTree().',
    },
    {
      icon: 'Palette',
      title: 'Themeable',
      description: 'All DaisyUI themes plus custom themes like Kaizen and Obsidian with one attribute.',
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

  installCmd = `npm install @hakistack/ng-daisyui`;

  stylesCode = `/* styles.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: all;
}
@import "@hakistack/ng-daisyui";`;

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
