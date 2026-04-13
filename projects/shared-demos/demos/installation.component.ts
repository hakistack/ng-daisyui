import { Component, signal } from '@angular/core';
import { LucideIconComponent } from '@hakistack/ng-daisyui';
import { CodeBlockComponent } from '../shared/code-block.component';

type PkgManager = 'npm' | 'yarn' | 'pnpm';

@Component({
  selector: 'app-installation',
  imports: [LucideIconComponent, CodeBlockComponent],
  template: `
    <div class="space-y-10 max-w-4xl">
      <!-- Hero -->
      <div class="space-y-2">
        <h1 class="text-3xl lg:text-4xl font-serif tracking-tight">Installation</h1>
        <p class="text-base-content/50 text-sm leading-relaxed max-w-2xl">Add ng-daisyui to your Angular project in a few steps.</p>
      </div>

      <!-- Prerequisites -->
      <div role="alert" class="alert alert-info alert-soft">
        <hk-lucide-icon name="Info" [size]="18" />
        <div>
          <h3 class="font-bold text-sm">Prerequisites</h3>
          <div class="text-xs">Requires <strong>Angular 19+</strong> with standalone components. Works best with Angular 21.</div>
        </div>
      </div>

      <!-- Compact visual tracker -->
      <ul class="steps w-full hidden sm:flex">
        <li class="step step-primary" data-content="1">Install</li>
        <li class="step step-primary" data-content="2">Styles</li>
        <li class="step step-primary" data-content="3">Theme</li>
        <li class="step step-success" data-content="✓">Use</li>
      </ul>

      <!-- Step content cards -->
      <div class="space-y-3">
        <!-- Step 1: Install -->
        <div class="card bg-base-100 card-border">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">1</span>
              <h2 class="card-title text-base">Install the package</h2>
            </div>
            <p class="text-sm text-base-content/50 mb-3">
              All dependencies (Tailwind CSS, DaisyUI, icons, animations) are included automatically.
            </p>

            <div role="tablist" class="tabs tabs-box tabs-sm w-fit mb-3">
              <button role="tab" class="tab" [class.tab-active]="pkgManager() === 'npm'" (click)="pkgManager.set('npm')">npm</button>
              <button role="tab" class="tab" [class.tab-active]="pkgManager() === 'yarn'" (click)="pkgManager.set('yarn')">yarn</button>
              <button role="tab" class="tab" [class.tab-active]="pkgManager() === 'pnpm'" (click)="pkgManager.set('pnpm')">pnpm</button>
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

        <!-- Step 2: Styles -->
        <div class="card bg-base-100 card-border">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">2</span>
              <h2 class="card-title text-base">Configure styles</h2>
            </div>
            <p class="text-sm text-base-content/50 mb-3">Update your global stylesheet. With Tailwind v4, configuration lives in CSS.</p>
            <app-code-block [code]="stylesCode" />
          </div>
        </div>

        <!-- Step 3: Theme -->
        <div class="card bg-base-100 card-border">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-primary badge-lg font-mono">3</span>
              <h2 class="card-title text-base">Set a theme</h2>
            </div>
            <p class="text-sm text-base-content/50 mb-3">
              Add a <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">data-theme</code> attribute to your root element.
            </p>
            <app-code-block [code]="themeCode" lang="angular-html" />

            <div class="mt-4">
              <p class="text-xs text-base-content/40 font-semibold uppercase tracking-wider mb-2">Custom themes included</p>
              <div class="flex flex-wrap gap-2">
                @for (theme of customThemes; track theme.name) {
                  <span class="badge badge-soft badge-sm gap-1.5">
                    <span class="w-2 h-2 rounded-full" [style.background]="theme.color"></span>
                    {{ theme.name }}
                  </span>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Use -->
        <div class="card bg-success/5 border border-success/30">
          <div class="card-body">
            <div class="flex items-center gap-3 mb-1">
              <span class="badge badge-success badge-lg">
                <hk-lucide-icon name="Check" [size]="14" />
              </span>
              <h2 class="card-title text-base text-success">Use a component</h2>
            </div>
            <p class="text-sm text-base-content/50 mb-3">
              Import standalone components directly into your component's
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">imports</code> array.
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
            <div class="collapse-title font-semibold text-sm">Custom Pipes for Tables</div>
            <div class="collapse-content space-y-2">
              <p class="text-xs text-base-content/50">
                Register custom pipe functions that can be referenced by name in table column definitions.
              </p>
              <app-code-block [code]="customPipesCode" />
            </div>
          </div>

          <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
            <div class="collapse-title font-semibold text-sm">Custom DaisyUI Theme</div>
            <div class="collapse-content space-y-2">
              <p class="text-xs text-base-content/50">Create your own theme by defining CSS variables with the DaisyUI theme plugin.</p>
              <app-code-block [code]="customThemeCode" />
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
export class InstallationComponent {
  pkgManager = signal<PkgManager>('npm');

  customThemes = [
    { name: 'Kaizen', color: '#E85D3A' },
    { name: 'Kaizen Light', color: '#D4532F' },
    { name: 'Obsidian', color: '#5b8def' },
    { name: 'Obsidian Light', color: '#5b8def' },
  ];

  troubleshooting = [
    {
      q: 'Components render without styles',
      a: 'Make sure you imported both Tailwind CSS and DaisyUI in your styles.css. Also verify you added the @source directive pointing to the library files, or the @hakistack/ng-daisyui/styles.css import.',
    },
    {
      q: 'Icons are not showing',
      a: 'The library includes lucide-angular as a dependency. Make sure your build is resolving it correctly. Try deleting node_modules and reinstalling.',
    },
    {
      q: 'Theme not applying',
      a: 'Verify that data-theme is set on your <html> or root element. For custom themes (kaizen, obsidian), make sure you imported the corresponding CSS file.',
    },
  ];

  installNpm = `npm install @hakistack/ng-daisyui`;
  installYarn = `yarn add @hakistack/ng-daisyui`;
  installPnpm = `pnpm add @hakistack/ng-daisyui`;

  stylesCode = `/* src/styles.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: all;
}

/* Library styles */
@import "@hakistack/ng-daisyui";

/* Optional: Custom themes */
@import "@hakistack/ng-daisyui/themes/kaizen";
@import "@hakistack/ng-daisyui/themes/kaizen-light";
@import "@hakistack/ng-daisyui/themes/obsidian";
@import "@hakistack/ng-daisyui/themes/obsidian-light";`;

  themeCode = `<!-- index.html -->
<html data-theme="kaizen">
  <body>
    <app-root></app-root>
  </body>
</html>`;

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
    onSubmit: (data) => this.toast.success('Saved!'),
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

  customPipesCode = `// app.config.ts
import { CUSTOM_PIPES } from '@hakistack/ng-daisyui';

export const appConfig = {
  providers: [
    {
      provide: CUSTOM_PIPES,
      useValue: {
        usd: (value: number) => \`$\${value.toFixed(2)}\`,
        initials: (value: string) => value.split(' ').map(w => w[0]).join(''),
      },
    },
  ],
};`;

  customThemeCode = `/* Add to your styles.css */
@plugin "daisyui/theme" {
  name: "my-brand";
  default: false;
  color-scheme: light;

  --color-base-100: oklch(97% 0.005 250);
  --color-base-200: oklch(99% 0.002 250);
  --color-base-300: oklch(93% 0.008 250);
  --color-base-content: oklch(20% 0.015 250);

  --color-primary: oklch(55% 0.25 250);
  --color-primary-content: oklch(100% 0 0);

  /* ... all other required color variables */

  --radius-selector: 1rem;
  --radius-field: 0.5rem;
  --radius-box: 0.75rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}`;
}
