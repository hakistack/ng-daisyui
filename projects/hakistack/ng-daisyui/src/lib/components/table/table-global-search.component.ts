import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-table-global-search',
  imports: [LucideIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex-1">
      <label class="input input-bordered w-full">
        @if (showIcon()) {
          <app-lucide-icon name="Search" class="h-[1em] opacity-50" aria-hidden="true"></app-lucide-icon>
        }

        <input
          type="text"
          [value]="searchTerm()"
          (input)="onSearchChange($any($event.target).value)"
          [placeholder]="placeholder()"
          [attr.aria-label]="placeholder()"
        />

        @if (showClearButton() && hasSearchTerm()) {
          <button type="button" class="btn btn-ghost btn-sm btn-circle" (click)="onClear()" aria-label="Clear search">
            <app-lucide-icon name="X" [size]="20" aria-hidden="true"></app-lucide-icon>
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

  readonly searchChange = output<string>();
  readonly clear = output<void>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onClear(): void {
    this.clear.emit();
  }
}
