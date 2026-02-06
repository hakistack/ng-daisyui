import { Component, input, signal } from '@angular/core';
import { CodeBlockComponent } from './code-block.component';

@Component({
  selector: 'app-doc-section',
  imports: [CodeBlockComponent],
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body gap-3">
        <h2 class="card-title">{{ title() }}</h2>
        @if (description()) {
          <p class="text-sm text-base-content/60">{{ description() }}</p>
        }
        <ng-content />
        @if (codeExample()) {
          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" [checked]="showCode()" (change)="showCode.set(!showCode())" />
            <div class="collapse-title font-medium text-sm">{{ showCode() ? 'Hide Code' : 'Show Code' }}</div>
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
