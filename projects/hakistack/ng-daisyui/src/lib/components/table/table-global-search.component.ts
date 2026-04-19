import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { LucideAngularModule, Search, X } from 'lucide-angular';

@Component({
  selector: 'hk-table-global-search',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex-1">
      <label class="input w-full flex items-center gap-2">
        @if (showIcon()) {
          <lucide-icon [img]="searchIcon" class="h-[1em] opacity-50" aria-hidden="true"></lucide-icon>
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
          <button type="button" class="btn btn-ghost btn-sm btn-circle" (click)="onClear()" aria-label="Clear search">
            <lucide-icon [img]="xIcon" [size]="20" aria-hidden="true"></lucide-icon>
          </button>
        }
      </label>
    </div>
  `,
})
export class TableGlobalSearchComponent {
  readonly searchIcon = Search;
  readonly xIcon = X;

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
