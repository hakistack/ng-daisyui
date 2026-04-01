import { Component, input, signal } from '@angular/core';
import { CodeBlockComponent } from './code-block.component';

@Component({
  selector: 'app-doc-section',
  imports: [CodeBlockComponent],
  template: `
    <div class="card card-border bg-base-100 border-l-2 border-l-primary/20">
      <div class="card-body gap-2">
        <h2 class="card-title text-lg">{{ title() }}</h2>
        @if (description()) {
          <p class="text-sm text-base-content/50">{{ description() }}</p>
        }
        <div class="mt-1">
          <ng-content />
        </div>
        @if (codeExample()) {
          <div class="collapse collapse-arrow bg-base-200/60 rounded-lg mt-2">
            <input type="checkbox" [checked]="showCode()" (change)="showCode.set(!showCode())" />
            <div class="collapse-title text-xs font-medium flex items-center gap-1.5 min-h-0 py-2">
              <svg class="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {{ showCode() ? 'Hide Code' : 'Show Code' }}
            </div>
            <div class="collapse-content">
              <app-code-block [code]="codeExample()!" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class DocSectionComponent {
  title = input.required<string>();
  description = input<string>('');
  codeExample = input<string>('');
  showCode = signal(false);
}
