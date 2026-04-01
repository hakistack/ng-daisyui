import { Component, input, signal } from '@angular/core';
import { LucideIconComponent, IconName } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-demo-page',
  imports: [LucideIconComponent],
  template: `
    <div class="space-y-6">
      <!-- Hero header -->
      <div class="pb-2">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
            <hk-lucide-icon [name]="icon()" [size]="24" strokeColor="oklch(var(--color-primary))" />
          </div>
          <div>
            <div class="badge badge-sm badge-ghost mb-2 text-[10px] uppercase tracking-widest font-semibold">{{ category() }}</div>
            <h1 class="text-3xl lg:text-4xl font-bold tracking-tight">{{ title() }}</h1>
            <p class="text-base-content/50 mt-1.5 text-sm lg:text-base max-w-2xl leading-relaxed">{{ description() }}</p>
            <div class="mt-3">
              <code class="text-xs bg-base-200 px-3 py-1.5 rounded-lg font-mono text-base-content/50 inline-block">
                import {{ '{' }} {{ importName() }} {{ '}' }} from '&#64;hakistack/ng-daisyui'
              </code>
            </div>
          </div>
        </div>
      </div>

      <!-- Page tabs -->
      <div role="tablist" class="tabs tabs-border">
        <button role="tab" class="tab" [class.tab-active]="activeTab() === 'examples'" (click)="activeTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="activeTab() === 'api'" (click)="activeTab.set('api')">API</button>
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
  icon = input.required<IconName>();
  category = input.required<string>();
  importName = input.required<string>();

  activeTab = signal<'examples' | 'api'>('examples');
}
