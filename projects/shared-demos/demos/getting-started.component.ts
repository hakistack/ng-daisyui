import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { CodeBlockComponent } from '../shared/code-block.component';

/**
 * Demo landing page — the first thing visitors see when they hit `/`.
 *
 * Five sections in order:
 *   1. Hero (name, tagline, version, primary CTAs)
 *   2. At-a-glance stats
 *   3. What's new in the latest release
 *   4. Why ng-daisyui — 6 feature pillars
 *   5. Component catalog — every demo route, grouped by category
 *   6. Featured deep-dives
 *   7. Quick install (3 steps + CodeBlock)
 *   8. Architecture pillars (builder, theme bridge, autodocs)
 *   9. Footer CTA
 */
@Component({
  selector: 'app-getting-started',
  imports: [LucideDynamicIcon, CodeBlockComponent, RouterLink],
  template: `
    <div class="space-y-14 max-w-5xl">
      <!-- ── 1. Hero ────────────────────────────────────────────────── -->
      <section class="hero bg-base-200 rounded-box py-16 px-6 relative overflow-hidden">
        <!-- Decorative grid backdrop -->
        <div
          class="absolute inset-0 opacity-[0.04] pointer-events-none"
          style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px),
                                  linear-gradient(to bottom, currentColor 1px, transparent 1px);
                 background-size: 32px 32px;"
        ></div>

        <div class="hero-content flex-col text-center relative">
          <span class="badge badge-soft badge-primary badge-sm font-mono">v{{ version }}</span>
          <h1 class="text-4xl lg:text-6xl font-serif tracking-tight">
            <span class="text-base-content/40">@hakistack</span>/<span>ng-daisyui</span>
          </h1>
          <p class="text-base-content/60 text-base lg:text-lg leading-relaxed max-w-2xl">
            Production-ready Angular UI library — built on daisyUI v5 and Tailwind v4, designed around signals + OnPush, and free of
            framework-y third-party tooling.
          </p>
          <div class="flex flex-wrap justify-center gap-2 mt-3">
            <a routerLink="/forms" class="btn btn-primary btn-sm">
              <svg lucideIcon="play" [size]="14"></svg>
              Browse components
            </a>
            <a routerLink="/installation" class="btn btn-outline btn-sm">
              <svg lucideIcon="download" [size]="14"></svg>
              Install
            </a>
            <a routerLink="/key-patterns" class="btn btn-ghost btn-sm">
              <svg lucideIcon="lightbulb" [size]="14"></svg>
              Key patterns
            </a>
          </div>
        </div>
      </section>

      <!-- ── 2. Stats ──────────────────────────────────────────────── -->
      <section>
        <div class="stats stats-vertical sm:stats-horizontal shadow-sm w-full bg-base-100 border border-base-content/10">
          @for (s of stats; track s.title) {
            <div class="stat">
              <div class="stat-figure text-primary">
                <svg [lucideIcon]="s.icon" [size]="24"></svg>
              </div>
              <div class="stat-title text-xs">{{ s.title }}</div>
              <div class="stat-value text-2xl font-serif">{{ s.value }}</div>
              <div class="stat-desc text-xs">{{ s.desc }}</div>
            </div>
          }
        </div>
      </section>

      <!-- ── 3. What's new ─────────────────────────────────────────── -->
      <section>
        <header class="flex items-baseline justify-between mb-4">
          <h2 class="text-2xl font-serif">What's new</h2>
          <span class="badge badge-ghost badge-sm font-mono">v{{ version }}</span>
        </header>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (n of whatsNew; track n.title) {
            <a [routerLink]="n.link" class="card card-border bg-base-100 hover:bg-base-200 transition-colors">
              <div class="card-body p-5">
                <div class="flex items-center gap-3 mb-1">
                  <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <svg [lucideIcon]="n.icon" [size]="18"></svg>
                  </div>
                  <h3 class="card-title text-sm">{{ n.title }}</h3>
                </div>
                <p class="text-xs text-base-content/60 leading-relaxed">{{ n.description }}</p>
                <div class="mt-2 text-xs link link-hover text-primary inline-flex items-center gap-1">
                  See it
                  <svg lucideIcon="arrow-right" [size]="12"></svg>
                </div>
              </div>
            </a>
          }
        </div>
      </section>

      <!-- ── 4. Feature pillars ────────────────────────────────────── -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-serif mb-1">Why ng-daisyui</h2>
          <p class="text-sm text-base-content/50">Six things this library opts in to — and what it pointedly doesn't fight.</p>
        </header>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (feature of features; track feature.title) {
            <div class="card card-border bg-base-100">
              <div class="card-body p-5 gap-2">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <svg [lucideIcon]="feature.icon" [size]="18"></svg>
                  </div>
                  <h3 class="card-title text-sm">{{ feature.title }}</h3>
                </div>
                <p class="text-xs text-base-content/60 leading-relaxed">{{ feature.description }}</p>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- ── 5. Component catalog ──────────────────────────────────── -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-serif mb-1">Component catalog</h2>
          <p class="text-sm text-base-content/50">
            {{ totalComponents }} components across {{ componentGroups.length }} categories. Every component is standalone — import only
            what you need.
          </p>
        </header>
        <div class="space-y-6">
          @for (group of componentGroups; track group.title) {
            <div>
              <div class="flex items-baseline gap-3 mb-3">
                <h3 class="text-base font-semibold uppercase tracking-wider text-base-content/40 text-xs">{{ group.title }}</h3>
                <span class="text-xs text-base-content/30"
                  >{{ group.items.length }} component{{ group.items.length === 1 ? '' : 's' }}</span
                >
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (item of group.items; track item.label) {
                  <a
                    [routerLink]="item.path"
                    class="card card-border bg-base-100 hover:bg-base-200 hover:border-primary/30 transition-colors"
                  >
                    <div class="card-body p-4 gap-1">
                      <div class="flex items-center gap-3 mb-1">
                        <div class="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                          <svg [lucideIcon]="item.icon" [size]="15" class="text-base-content/60"></svg>
                        </div>
                        <span class="font-medium text-sm">{{ item.label }}</span>
                        @if (item.badge) {
                          <span
                            class="badge badge-xs"
                            [class.badge-primary]="item.badge === 'New'"
                            [class.badge-ghost]="item.badge !== 'New'"
                          >
                            {{ item.badge }}
                          </span>
                        }
                      </div>
                      <p class="text-xs text-base-content/55 leading-relaxed">{{ item.desc }}</p>
                    </div>
                  </a>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- ── 6. Featured deep-dives ────────────────────────────────── -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-serif mb-1">Featured deep-dives</h2>
          <p class="text-sm text-base-content/50">The richest demos — open these to see the library in real-world flows.</p>
        </header>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          @for (f of featured; track f.title) {
            <a [routerLink]="f.link" class="card bg-base-100 card-border hover:shadow-md transition-shadow group">
              <div class="card-body p-5">
                <div
                  class="aspect-video rounded-lg bg-base-200 mb-3 flex items-center justify-center text-base-content/30 group-hover:text-primary transition-colors"
                >
                  <svg [lucideIcon]="f.icon" [size]="48"></svg>
                </div>
                <h3 class="card-title text-base">{{ f.title }}</h3>
                <p class="text-xs text-base-content/60 leading-relaxed">{{ f.description }}</p>
                <div class="mt-2 text-xs link link-hover text-primary inline-flex items-center gap-1">
                  Open demo
                  <svg lucideIcon="arrow-right" [size]="12"></svg>
                </div>
              </div>
            </a>
          }
        </div>
      </section>

      <!-- ── 7. Quick install ──────────────────────────────────────── -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-serif mb-1">Quick install</h2>
          <p class="text-sm text-base-content/50">Three steps. No NgModules. No config.</p>
        </header>

        <ul class="steps w-full mb-6 hidden sm:flex">
          <li class="step step-primary" data-content="1">Install</li>
          <li class="step step-primary" data-content="2">Styles</li>
          <li class="step step-primary" data-content="3">Use</li>
          <li class="step step-success" data-content="✓">Done</li>
        </ul>

        <div class="space-y-3">
          <div class="card card-border bg-base-100">
            <div class="card-body p-5">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-primary badge-lg font-mono">1</span>
                <h3 class="card-title text-base">Install the package</h3>
              </div>
              <p class="text-sm text-base-content/55 mb-3">All runtime deps (icons, animations, TipTap, etc.) ship with the package.</p>
              <app-code-block [code]="installCmd" />
            </div>
          </div>

          <div class="card card-border bg-base-100">
            <div class="card-body p-5">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-primary badge-lg font-mono">2</span>
                <h3 class="card-title text-base">Wire your styles</h3>
              </div>
              <p class="text-sm text-base-content/55 mb-3">Tailwind v4 + daisyUI plugin + the lib's compiled CSS. One file, four lines.</p>
              <app-code-block [code]="stylesCode" />
            </div>
          </div>

          <div class="card card-border bg-base-100">
            <div class="card-body p-5">
              <div class="flex items-center gap-3 mb-1">
                <span class="badge badge-primary badge-lg font-mono">3</span>
                <h3 class="card-title text-base">Drop a component into your template</h3>
              </div>
              <p class="text-sm text-base-content/55 mb-3">Standalone, signal-native, OnPush — works with any Angular 21 app.</p>
              <app-code-block [code]="usageCode" />
            </div>
          </div>

          <div class="card bg-success/5 border border-success/30">
            <div class="card-body p-5">
              <div class="flex items-center gap-3">
                <span class="badge badge-success badge-lg">
                  <svg lucideIcon="check" [size]="14"></svg>
                </span>
                <div>
                  <h3 class="card-title text-base text-success mb-0">You're set.</h3>
                  <p class="text-sm text-success/70">
                    Browse the
                    <a routerLink="/forms" class="link">component catalog</a>
                    or read the
                    <a routerLink="/key-patterns" class="link">key patterns</a>
                    guide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── 8. Architecture pillars ───────────────────────────────── -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-serif mb-1">Under the hood</h2>
          <p class="text-sm text-base-content/50">Three pillars that show up in nearly every component.</p>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (p of pillars; track p.title) {
            <div class="card card-border bg-base-100">
              <div class="card-body p-5 gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <svg [lucideIcon]="p.icon" [size]="18"></svg>
                  </div>
                  <h3 class="card-title text-base">{{ p.title }}</h3>
                </div>
                <p class="text-xs text-base-content/60 leading-relaxed">{{ p.description }}</p>
                @if (p.snippet) {
                  <div class="bg-base-200 rounded-md p-3 font-mono text-[11px] text-base-content/70 overflow-x-auto">{{ p.snippet }}</div>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- ── 9. Footer CTA ─────────────────────────────────────────── -->
      <section class="card bg-neutral text-neutral-content">
        <div class="card-body items-center text-center p-8">
          <h2 class="card-title text-2xl font-serif">Built for the long tail</h2>
          <p class="text-sm opacity-70 max-w-xl">
            ng-daisyui leans on Angular's signal primitives and daisyUI's design tokens — not a wrapper layer that needs to be relearned. If
            a component doesn't fit, drop one level: it's just signals + standalone components.
          </p>
          <div class="card-actions mt-2">
            <a routerLink="/key-patterns" class="btn btn-primary btn-sm">
              <svg lucideIcon="lightbulb" [size]="14"></svg>
              Read key patterns
            </a>
            <a routerLink="/installation" class="btn btn-ghost btn-sm">
              <svg lucideIcon="download" [size]="14"></svg>
              Install
            </a>
          </div>
        </div>
      </section>

      <!-- Version footer -->
      <footer class="text-center text-xs text-base-content/40 pt-4 pb-8">
        @hakistack/ng-daisyui · v{{ version }} · last updated {{ updatedAt }}
      </footer>
    </div>
  `,
})
export class GettingStartedComponent {
  /** Library version — bump in sync with `projects/hakistack/ng-daisyui/package.json`. */
  readonly version = '0.1.92';
  readonly updatedAt = 'May 2026';

  /** At-a-glance numbers for the stat strip. */
  readonly stats = [
    { icon: 'package', title: 'Components', value: '19', desc: 'Standalone, tree-shakable' },
    { icon: 'palette', title: 'Themes', value: '30+', desc: 'daisyUI built-ins + custom' },
    { icon: 'zap', title: 'Render', value: 'OnPush', desc: 'Signals end-to-end' },
    { icon: 'accessibility', title: 'A11y', value: 'WCAG AA', desc: 'AXE-clean by default' },
  ];

  /** Recent release highlights — keep in sync with the changelog as features land. */
  readonly whatsNew = [
    {
      icon: 'wand-sparkles',
      title: 'Slash commands in the editor',
      description:
        'Type / on a new paragraph to open a Notion-style command palette. Comes with built-in commands plus a typed builder API for custom items.',
      link: '/editor/slash',
    },
    {
      icon: 'book-open',
      title: 'Auto-extracted API docs',
      description:
        'Component inputs/outputs are pulled straight from the lib source via ts-morph. Drop <app-api-docs-for component="..."> in any demo and the table updates whenever the source does.',
      link: '/editor',
    },
    {
      icon: 'search',
      title: 'Command palette',
      description:
        'Type-safe createCommandPalette() with mode prefixes, hotkeys, and Fuse.js fuzzy search. Drop into any app for ⌘K-style command runners.',
      link: '/command-palette',
    },
  ];

  /** Why-this-lib pillars. */
  readonly features = [
    {
      icon: 'zap',
      title: 'Signal-native',
      description: 'Angular 21 signals + OnPush + standalone everywhere. No NgModules, no Zone.js requirement.',
    },
    {
      icon: 'paintbrush',
      title: 'daisyUI v5 + Tailwind v4',
      description: 'Components compose with daisyUI primitives (alert, card, badge, btn). Theme by toggling data-theme on <html>.',
    },
    {
      icon: 'puzzle',
      title: 'Builder + controller',
      description:
        'createForm(), createTable(), createPdfViewer() and friends return typed config + imperative handles. No template-only configuration.',
    },
    {
      icon: 'accessibility',
      title: 'Accessible by default',
      description: 'ARIA roles, focus management, keyboard nav, screen-reader announcements. Full WCAG AA compliance is the floor.',
    },
    {
      icon: 'leaf',
      title: 'Light deps',
      description: 'No CKEditor, no Syncfusion, no Storybook. Lightweight focused utilities only — the lib stays under 250 kB gzipped.',
    },
    {
      icon: 'shield-check',
      title: 'Theme-bridged for v4 + v5',
      description: 'HK_THEME injection token swaps daisyUI v4 ↔ v5 class-name maps so the same components render correctly under either.',
    },
  ];

  /** Full component catalog grouped by sidebar category. Drives the catalog grid. */
  readonly componentGroups = [
    {
      title: 'Forms & Wizards',
      items: [
        {
          path: '/forms',
          label: 'Dynamic Forms',
          icon: 'file-input',
          desc: 'createForm() builder, conditional logic, auto-save, dependent fields.',
        },
        {
          path: '/wizard',
          label: 'Form Wizard',
          icon: 'list-ordered',
          desc: 'Linear and non-linear multi-step forms with stepper integration.',
        },
      ],
    },
    {
      title: 'Data Display',
      items: [
        {
          path: '/table',
          label: 'Table',
          icon: 'table',
          desc: 'Sort, filter, paginate, group, master-detail, virtual scroll, inline edit.',
        },
        {
          path: '/tree-table',
          label: 'Tree Table',
          icon: 'list-tree',
          desc: 'TreeNode hierarchy with cascade selection and large-dataset support.',
        },
        { path: '/tree', label: 'Tree', icon: 'git-branch', desc: 'Selection modes, drag-drop, lazy loading, fuzzy filter.' },
        {
          path: '/virtual-scroller',
          label: 'Virtual Scroller',
          icon: 'scroll-text',
          desc: 'Vertical, horizontal, grid, lazy-load — for huge lists.',
        },
        {
          path: '/pdf-viewer',
          label: 'PDF Viewer',
          icon: 'file-text',
          desc: 'PDFium (WASM) viewer with controller API and preview layout.',
        },
      ],
    },
    {
      title: 'Inputs',
      items: [
        {
          path: '/input',
          label: 'Input',
          icon: 'text-cursor-input',
          desc: 'Text, currency, phone, percentage, password — variant-driven.',
        },
        { path: '/select', label: 'Select', icon: 'chevron-down', desc: 'Single / multi, searchable, virtual-scrolled, grouped options.' },
        { path: '/datepicker', label: 'Datepicker', icon: 'calendar', desc: 'Single, range, with time, min/max, custom formatters.' },
        { path: '/timepicker', label: 'Timepicker', icon: 'clock', desc: 'Clock-face picker, 12h / 24h, configurable steps.' },
        {
          path: '/editor',
          label: 'Editor',
          icon: 'pencil',
          desc: 'TipTap-backed rich text with toolbars, slash commands, image upload.',
          badge: 'Updated',
        },
      ],
    },
    {
      title: 'Navigation',
      items: [
        { path: '/tabs', label: 'Tabs', icon: 'panel-top', desc: 'Horizontal / vertical, lift / box / border variants, lazy panels.' },
        {
          path: '/command-palette',
          label: 'Command Palette',
          icon: 'search',
          desc: '⌘K palette with mode prefixes, hotkeys, fuzzy filter.',
          badge: 'New',
        },
      ],
    },
    {
      title: 'Feedback',
      items: [
        { path: '/toast', label: 'Toast', icon: 'bell', desc: 'Stacking transient notifications, six positions, auto-dismiss.' },
        {
          path: '/notification',
          label: 'Notification',
          icon: 'message-square',
          desc: 'Persistent overlay events with avatars + actions, three layouts.',
          badge: 'New',
        },
        {
          path: '/alert',
          label: 'Alert Dialogs',
          icon: 'message-square-warning',
          desc: 'AlertService.confirm / prompt / loading / countdown.',
        },
        {
          path: '/dialog',
          label: 'Dialog Service',
          icon: 'panel-top-open',
          desc: 'Programmatic modal dialogs with portal-projected components.',
        },
      ],
    },
    {
      title: 'Utilities',
      items: [
        {
          path: '/motion',
          label: 'Motion Directives',
          icon: 'sparkles',
          desc: 'motion-animate / motion-hover / motion-press — Framer Motion bridges.',
        },
      ],
    },
  ];

  /** Featured demos — pick the richest flows for the hero cards. */
  readonly featured = [
    {
      icon: 'table',
      title: 'Full-featured Table',
      description:
        'Filtering, pagination (offset + cursor), grouping, master-detail, virtual scroll, inline edit, drag-reorder — all in one demo.',
      link: '/table/full',
    },
    {
      icon: 'list-ordered',
      title: 'Form Wizard',
      description:
        'Multi-step form with conditional logic, dependent fields, step validation, and auto-save persistence — driven by createForm().',
      link: '/wizard/linear',
    },
    {
      icon: 'wand-sparkles',
      title: 'Editor with slash commands',
      description:
        'TipTap-backed rich text editor with Notion-style slash menu — built-in commands plus a typed createSlashCommands() API.',
      link: '/editor/slash',
    },
  ];

  /** Architecture deep-dives — short blurbs with code-snippet teasers. */
  readonly pillars = [
    {
      icon: 'wrench',
      title: 'Builder + controller',
      description:
        'Every complex component pairs a typed builder with a controller that exposes config() + imperative methods. Same pattern across forms, tables, palettes, viewers.',
      snippet: `createForm({\n  fields: { name: { type: 'text' }, ... },\n  onSubmit: (data) => save(data),\n})`,
    },
    {
      icon: 'palette',
      title: 'Theme bridge',
      description:
        'HK_THEME injection token maps daisyUI v4 vs v5 class names. Components like <hk-tab-group> render the right class set automatically.',
      snippet: `provideHkTheme('daisyui-v5')\n// or 'daisyui-v4' for legacy apps`,
    },
    {
      icon: 'book-open',
      title: 'Auto-extracted API docs',
      description:
        'A ts-morph script walks every @Component, captures inputs/outputs/JSDoc, emits a typed JSON. The demo app renders it via <app-api-docs-for>.',
      snippet: `<app-api-docs-for component="EditorComponent" />`,
    },
  ];

  get totalComponents(): number {
    return this.componentGroups.reduce((n, g) => n + g.items.length, 0);
  }

  // ── Code snippets for the install steps ──────────────────────────────

  installCmd = `npm install @hakistack/ng-daisyui`;

  stylesCode = `/* styles.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: all;
}
@import "@hakistack/ng-daisyui";`;

  usageCode = `import { Component } from '@angular/core';
import { DynamicFormComponent, createForm } from '@hakistack/ng-daisyui';

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
    fields: {
      name: { type: 'text', label: 'Full name', validation: { required: true } },
      email: { type: 'email', label: 'Email address' },
    },
    onSubmit: (data) => console.log(data.name, data.email), // typed
  });
}`;
}
