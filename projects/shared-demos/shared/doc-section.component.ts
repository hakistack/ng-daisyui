import { Component, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { CodeBlockComponent } from './code-block.component';

@Component({
  selector: 'app-doc-section',
  imports: [CodeBlockComponent, LucideDynamicIcon],
  host: { class: 'block' },
  template: `
    <div class="card card-border card-bordered bg-base-200 overflow-hidden">
      <!-- Header: title + description on the left, code toggle on the right -->
      <div class="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div class="min-w-0">
          <h2 class="text-base font-serif leading-tight">{{ title() }}</h2>
          @if (description()) {
            <p class="text-xs text-base-content/50 mt-1 leading-relaxed">{{ description() }}</p>
          }
        </div>
        @if (codeExample()) {
          <button
            type="button"
            class="btn btn-ghost btn-xs gap-1.5 shrink-0 text-base-content/60 font-medium"
            [attr.aria-pressed]="showCode()"
            (click)="showCode.set(!showCode())"
          >
            <svg [lucideIcon]="showCode() ? 'chevron-up' : 'code'" [size]="13"></svg>
            {{ showCode() ? 'Hide code' : 'Show code' }}
          </button>
        }
      </div>

      <!-- Live demo surface -->
      <div class="px-4 sm:px-5 pb-4">
        <ng-content />
      </div>

      <!-- Inline code reveal -->
      @if (codeExample() && showCode()) {
        <div class="border-t border-base-content/8 bg-base-300/30 p-3 sm:p-4">
          <app-code-block [code]="codeExample()!" />
        </div>
      }
    </div>
  `,
})
export class DocSectionComponent {
  title = input.required<string>();
  description = input<string>('');
  codeExample = input<string>('');
  showCode = signal(false);
}
