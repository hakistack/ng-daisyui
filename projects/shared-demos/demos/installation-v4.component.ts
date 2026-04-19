import { Component, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CodeBlockComponent } from '../shared/code-block.component';

type PkgManager = 'npm' | 'yarn' | 'pnpm';

@Component({
  selector: 'app-installation-v4',
  imports: [LucideAngularModule, CodeBlockComponent],
  template: `
    <div class="space-y-10 max-w-4xl">
      <!-- Hero -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <h1 class="text-3xl lg:text-4xl font-serif tracking-tight">Installation</h1>
          <span class="badge badge-outline badge-sm font-mono">DaisyUI 4 · Tailwind 3</span>
        </div>
        <p class="text-base-content/50 text-sm leading-relaxed max-w-2xl">
          Add ng-daisyui to an Angular project using the legacy Tailwind v3 + DaisyUI v4 toolchain.
        </p>
      </div>

      <!-- Prerequisites -->
      <div role="alert" class="alert alert-info">
        <lucide-icon name="Info" [size]="18" />
        <div>
          <h3 class="font-bold text-sm">Prerequisites</h3>
          <div class="text-xs">
            Requires <strong>Angular 19+</strong> with standalone components, <strong>Tailwind CSS 3.4+</strong> and
            <strong>DaisyUI 4.x</strong>.
          </div>
        </div>
      </div>

      <!-- Compact visual tracker (hidden on very small screens) -->
      <ul class="steps w-full overflow-x-auto hidden sm:flex">
        <li class="step step-primary" data-content="1">Install</li>
        <li class="step step-primary" data-content="2">Tailwind</li>
        <li class="step step-primary" data-content="3">PostCSS</li>
        <li class="step step-primary" data-content="4">Styles</li>
        <li class="step step-primary" data-content="5">Theme</li>
        <li class="step step-success" data-content="✓">Use</li>
      </ul>

      <!-- Step content cards -->
      <div class="space-y-3">
        <!-- Step 1: Install -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">1</span>
              <h2 class="card-title text-base">Install the library and peers</h2>
            </div>
            <p class="text-sm text-base-content/60 mb-3">Install ng-daisyui plus Tailwind 3 and DaisyUI 4 as dev dependencies.</p>

            <div role="tablist" class="tabs tabs-boxed w-fit mb-3">
              <button role="tab" class="tab tab-sm" [class.tab-active]="pkgManager() === 'npm'" (click)="pkgManager.set('npm')">npm</button>
              <button role="tab" class="tab tab-sm" [class.tab-active]="pkgManager() === 'yarn'" (click)="pkgManager.set('yarn')">
                yarn
              </button>
              <button role="tab" class="tab tab-sm" [class.tab-active]="pkgManager() === 'pnpm'" (click)="pkgManager.set('pnpm')">
                pnpm
              </button>
            </div>

            @switch (pkgManager()) {
              @case ('npm') {
                <app-code-block [code]="installNpm" />
              }
              @case ('yarn') {
                <app-code-block [code]="installYarn" />
              }
              @case ('pnpm') {
                <app-code-block [code]="installPnpm" />
              }
            }
          </div>
        </div>

        <!-- Step 2: Tailwind config -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">2</span>
              <h2 class="card-title text-base">Configure Tailwind with the preset</h2>
            </div>
            <p class="text-sm text-base-content/60 mb-3">
              ng-daisyui ships a Tailwind v3 preset that wires the DaisyUI v4 plugin and component styles.
            </p>
            <app-code-block [code]="tailwindConfigCode" />
          </div>
        </div>

        <!-- Step 3: PostCSS -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">3</span>
              <h2 class="card-title text-base">Add PostCSS</h2>
            </div>
            <p class="text-sm text-base-content/60 mb-3">
              Create <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">postcss.config.js</code> at the project root.
            </p>
            <app-code-block [code]="postcssCode" />
          </div>
        </div>

        <!-- Step 4: Styles -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">4</span>
              <h2 class="card-title text-base">Import global styles</h2>
            </div>
            <p class="text-sm text-base-content/60 mb-3">
              Use the classic <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">&#64;tailwind</code> directives and import the v4
              theme adapter.
            </p>
            <app-code-block [code]="stylesCode" />
          </div>
        </div>

        <!-- Step 5: Theme -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">5</span>
              <h2 class="card-title text-base">Set a theme</h2>
            </div>
            <p class="text-sm text-base-content/60 mb-3">
              Pick any DaisyUI 4 built-in theme and set it via the
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">data-theme</code> attribute.
            </p>
            <app-code-block [code]="themeCode" lang="angular-html" />

            <div class="mt-4">
              <p class="text-xs text-base-content/50 font-semibold uppercase tracking-wider mb-2">Define your own theme</p>
              <p class="text-sm text-base-content/60 mb-2">
                In v4, custom themes live inside <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">tailwind.config.js</code>.
              </p>
              <app-code-block [code]="customThemeCode" />
            </div>
          </div>
        </div>

        <!-- Step 6: Use -->
        <div class="card bg-success/5 border border-success/30">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-success badge-lg">
                <lucide-icon name="Check" [size]="14" />
              </span>
              <h2 class="card-title text-base text-success">Use a component</h2>
            </div>
            <p class="text-sm text-base-content/60 mb-3">
              Import standalone components into your component's <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">imports</code>
              array.
            </p>
            <app-code-block [code]="usageCode" />
          </div>
        </div>
      </div>

      <!-- Optional config -->
      <div class="space-y-3">
        <h2 class="text-xl font-serif">Optional Configuration</h2>

        <div class="space-y-2">
          <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
            <div class="collapse-title font-semibold text-sm">FormState Provider</div>
            <div class="collapse-content space-y-2">
              <p class="text-xs text-base-content/50">Configure global form behavior like debounce timing and auto-save intervals.</p>
              <app-code-block [code]="formStateCode" />
            </div>
          </div>

          <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
            <div class="collapse-title font-semibold text-sm">Theme adapter (provideHkTheme)</div>
            <div class="collapse-content space-y-2">
              <p class="text-xs text-base-content/50">
                Tell the library components to render for DaisyUI v4 so their internal class names match the v4 spec.
              </p>
              <app-code-block [code]="themeAdapterCode" />
            </div>
          </div>
        </div>
      </div>

      <!-- Troubleshooting -->
      <div class="space-y-3">
        <h2 class="text-xl font-serif">Troubleshooting</h2>

        <div class="space-y-2">
          @for (item of troubleshooting; track item.q) {
            <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
              <div class="collapse-title font-medium text-sm">{{ item.q }}</div>
              <div class="collapse-content text-xs text-base-content/60 leading-relaxed">
                <p>{{ item.a }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class InstallationV4Component {
  pkgManager = signal<PkgManager>('npm');

  troubleshooting = [
    {
      q: 'DaisyUI classes are missing',
      a: 'Confirm that your tailwind.config.js includes the ng-daisyui v4 preset and that your content globs reach both your app files and the library source or FESM bundle.',
    },
    {
      q: 'Soft / dash / tab-box classes do nothing',
      a: 'Those are DaisyUI v5 classes and do not exist in v4. Use btn-outline, badge-outline, tabs-boxed, and tab-active instead.',
    },
    {
      q: 'Library components render oddly',
      a: 'Make sure you call provideHkTheme("daisyui-v4") in app.config.ts so the library emits v4-compatible markup.',
    },
  ];

  installNpm = `npm install @hakistack/ng-daisyui
npm install -D tailwindcss@^3.4 postcss autoprefixer daisyui@^4.12`;
  installYarn = `yarn add @hakistack/ng-daisyui
yarn add -D tailwindcss@^3.4 postcss autoprefixer daisyui@^4.12`;
  installPnpm = `pnpm add @hakistack/ng-daisyui
pnpm add -D tailwindcss@^3.4 postcss autoprefixer daisyui@^4.12`;

  tailwindConfigCode = `// tailwind.config.js
const ngDaisyuiPreset = require('@hakistack/ng-daisyui/themes/daisyui-v4-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [ngDaisyuiPreset],
  content: [
    './src/**/*.{html,ts}',
    // Scan the library bundle so dynamic classes are not purged
    './node_modules/@hakistack/ng-daisyui/**/*.{mjs,js}',
  ],
  theme: { extend: {} },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark', 'corporate', 'dracula', 'night'],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
  },
};`;

  postcssCode = `// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;

  stylesCode = `/* src/styles.css */
/* Library theme adapter: v4 CSS-variable mappings + compat borders */
@import "@hakistack/ng-daisyui/themes/daisyui-v4.css";

@tailwind base;
@tailwind components;
@tailwind utilities;`;

  themeCode = `<!-- index.html -->
<html data-theme="dark">
  <body>
    <app-root></app-root>
  </body>
</html>`;

  customThemeCode = `// tailwind.config.js
module.exports = {
  // ...
  daisyui: {
    themes: [
      'light', 'dark',
      {
        'my-brand': {
          'primary':          '#4a6a8a',
          'primary-content':  '#f8fafb',
          'secondary':        '#3d5a75',
          'accent':           '#d4944a',
          'neutral':          '#6b6560',
          'base-100':         '#f7f5f2',
          'base-200':         '#f0ebe3',
          'base-300':         '#e3dcd0',
          'base-content':     '#5a5347',
          'info':             '#7eb8e8',
          'success':          '#9ed4a8',
          'warning':          '#d4944a',
          'error':            '#e87c6a',

          '--rounded-box':   '1rem',
          '--rounded-btn':   '0.5rem',
          '--rounded-badge': '0.5rem',
        },
      },
    ],
  },
};`;

  usageCode = `import { Component, inject } from '@angular/core';
import {
  DynamicFormComponent,
  ToastService,
  createForm,
  field,
} from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-my-page',
  imports: [DynamicFormComponent],
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <button class="btn btn-primary" (click)="form.submit()">Submit</button>
  \`,
})
export class MyPageComponent {
  private toast = inject(ToastService);

  form = createForm({
    fields: [
      field.text('name', 'Name', { required: true }),
      field.email('email', 'Email'),
    ],
    onSubmit: () => this.toast.success('Saved!'),
  });
}`;

  formStateCode = `// app.config.ts
import { provideFormState } from '@hakistack/ng-daisyui';

export const appConfig = {
  providers: [
    provideFormState({
      autoSaveDebounce: 500,
      showValidationOn: 'touched',
    }),
  ],
};`;

  themeAdapterCode = `// app.config.ts
import { provideHkTheme } from '@hakistack/ng-daisyui';

export const appConfig = {
  providers: [
    provideHkTheme('daisyui-v4'),
    // ...other providers
  ],
};`;
}
