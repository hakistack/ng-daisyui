import { Component, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { SHOW_IMPORT } from '../config';

@Component({
  selector: 'app-demo-page',
  imports: [LucideDynamicIcon],
  template: `
    <div class="space-y-6">
      <!-- ══ Editorial page header ══ -->
      <header class="flex items-start gap-4 sm:gap-5">
        <!-- Icon medallion -->
        <div
          class="shrink-0 mt-0.5 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/15 text-primary flex items-center justify-center shadow-sm shadow-primary/10"
        >
          <svg [lucideIcon]="icon()" [size]="22"></svg>
        </div>

        <div class="min-w-0 flex-1">
          <!-- Eyebrow: short rule + category -->
          <div class="flex items-center gap-2 mb-2">
            <span class="h-px w-5 bg-primary/50"></span>
            <span class="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">{{ category() }}</span>
          </div>

          <h1 class="text-3xl lg:text-[2.5rem] font-serif tracking-tight leading-[1.05]">{{ title() }}</h1>

          <p class="text-base-content/55 text-sm sm:text-[15px] max-w-2xl leading-relaxed mt-3">{{ description() }}</p>

          @if (showImport) {
            <code
              class="text-[11px] bg-base-200 border border-base-content/8 px-2.5 py-1 rounded-md font-mono text-base-content/45 inline-block mt-3"
            >
              import {{ '{' }} {{ importName() }} {{ '}' }} from '&#64;hakistack/ng-daisyui'
            </code>
          }
        </div>
      </header>

      <!-- ══ Section tabs ══ -->
      <div role="tablist" class="tabs tabs-border tabs-bordered border-b border-base-content/10">
        <button
          role="tab"
          class="tab gap-1.5 font-medium"
          [class.tab-active]="activeTab() === 'examples'"
          (click)="activeTab.set('examples')"
        >
          <svg lucideIcon="layout-grid" [size]="14"></svg>
          Examples
        </button>
        <button role="tab" class="tab gap-1.5 font-medium" [class.tab-active]="activeTab() === 'api'" (click)="activeTab.set('api')">
          <svg lucideIcon="code" [size]="14"></svg>
          API
        </button>
      </div>

      <!-- Projected content -->
      @if (activeTab() === 'examples') {
        <ng-content select="[examples]" />
      }
      @if (activeTab() === 'api') {
        <ng-content select="[api]" />
      }
    </div>
  `,
})
export class DemoPageComponent {
  title = input.required<string>();
  description = input.required<string>();
  icon = input.required<string>();
  category = input.required<string>();
  importName = input.required<string>();

  readonly showImport = SHOW_IMPORT;
  activeTab = signal<'examples' | 'api'>('examples');
}
