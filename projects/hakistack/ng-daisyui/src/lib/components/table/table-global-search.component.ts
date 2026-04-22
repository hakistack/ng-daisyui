import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { LucideSearch, LucideX } from '@lucide/angular';

@Component({
  selector: 'hk-table-global-search',
  imports: [LucideSearch, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex-1">
      <label class="input w-full flex items-center gap-2">
        @if (showIcon()) {
          <svg lucideSearch class="h-[1em] opacity-50"></svg>
        }

        <input
          type="text"
          class="grow"
          [value]="searchTerm()"
          (input)="onSearchChange($any($event.target).value)"
          [placeholder]="placeholder()"
          [attr.aria-label]="placeholder()"
        />

        @if (showClearButton() && hasSearchTerm()) {
          <button type="button" class="btn btn-ghost btn-sm btn-circle" (click)="onClear()" [attr.aria-label]="clearAriaLabel()">
            <svg lucideX [size]="20"></svg>
          </button>
        }
      </label>
    </div>
  `,
})
export class TableGlobalSearchComponent {
  readonly searchTerm = input<string>('');
  readonly placeholder = input<string>('Search all columns...');
  readonly showIcon = input<boolean>(true);
  readonly showClearButton = input<boolean>(true);
  readonly hasSearchTerm = input<boolean>(false);
  readonly clearAriaLabel = input<string>('Clear search');

  readonly searchChange = output<string>();
  readonly clear = output<void>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onClear(): void {
    this.clear.emit();
  }
}
