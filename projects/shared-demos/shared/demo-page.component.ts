import { Component, input, signal } from '@angular/core';
import {
  LucideDynamicIcon,
  provideLucideIcons,
  LucideFileInput,
  LucideListOrdered,
  LucideTable,
  LucideListTree,
  LucideGitBranch,
  LucideNetwork,
  LucideScrollText,
  LucideTextCursorInput,
  LucideChevronDown,
  LucideCalendar,
  LucideClock,
  LucideFileText,
  LucidePanelTop,
  LucideBell,
  LucideMessageSquareWarning,
  LucidePanelTopOpen,
  LucideSmile,
  LucideSparkles,
  LucideRocket,
  LucideDownload,
  LucideLightbulb,
} from '@lucide/angular';
import { SHOW_IMPORT } from '../config';

@Component({
  selector: 'app-demo-page',
  imports: [LucideDynamicIcon],
  providers: [
    provideLucideIcons(
      LucideFileInput,
      LucideListOrdered,
      LucideTable,
      LucideListTree,
      LucideGitBranch,
      LucideNetwork,
      LucideScrollText,
      LucideTextCursorInput,
      LucideChevronDown,
      LucideCalendar,
      LucideClock,
      LucideFileText,
      LucidePanelTop,
      LucideBell,
      LucideMessageSquareWarning,
      LucidePanelTopOpen,
      LucideSmile,
      LucideSparkles,
      LucideRocket,
      LucideDownload,
      LucideLightbulb,
    ),
  ],
  template: `
    <div class="space-y-4">
      <!-- Hero header -->
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <svg [lucideIcon]="icon()" [size]="20"></svg>
        </div>
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h1 class="text-2xl lg:text-3xl font-serif tracking-tight">{{ title() }}</h1>
            <span class="badge badge-sm badge-ghost text-[9px] uppercase tracking-widest font-semibold">{{ category() }}</span>
          </div>
          <p class="text-base-content/45 text-sm max-w-2xl leading-relaxed">{{ description() }}</p>
          @if (showImport) {
            <code class="text-[11px] bg-base-200 px-2.5 py-1 rounded-md font-mono text-base-content/40 inline-block mt-2">
              import {{ '{' }} {{ importName() }} {{ '}' }} from '&#64;hakistack/ng-daisyui'
            </code>
          }
        </div>
      </div>

      <!-- Page tabs -->
      <div role="tablist" class="tabs tabs-border tabs-bordered">
        <button role="tab" class="tab tab-sm" [class.tab-active]="activeTab() === 'examples'" (click)="activeTab.set('examples')">
          Examples
        </button>
        <button role="tab" class="tab tab-sm" [class.tab-active]="activeTab() === 'api'" (click)="activeTab.set('api')">API</button>
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
