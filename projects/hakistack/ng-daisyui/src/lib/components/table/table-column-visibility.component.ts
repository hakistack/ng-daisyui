import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { LucideColumns3, LucideLock, LucideEye, LucideEyeOff, LucideRotateCcw } from '@lucide/angular';
import { ColumnDefinition, ColumnVisibilityLabels } from './table.types';

const DEFAULT_LABELS: Required<ColumnVisibilityLabels> = {
  trigger: 'Columns',
  showAll: 'Show All',
  hideAll: 'Hide All',
  reset: 'Reset',
  showAllAriaLabel: 'Show all columns',
  hideAllAriaLabel: 'Hide optional columns',
  resetAriaLabel: 'Reset to default columns',
};

@Component({
  selector: 'hk-table-column-visibility',
  imports: [LucideColumns3, LucideLock, LucideEye, LucideEyeOff, LucideRotateCcw],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="dropdown dropdown-end">
      <summary class="btn btn-sm btn-ghost gap-2">
        <svg lucideColumns3 [size]="16"></svg>
        <span>{{ resolvedLabels().trigger }}</span>
        <span class="badge badge-sm badge-neutral">{{ visibleColumnsCount() }}/{{ columns().length }}</span>
      </summary>
      <div class="dropdown-content card card-sm bg-base-100 z-10 mt-2 w-72 shadow-xl">
        <div class="card-body gap-3 p-4">
          <!-- Column toggles -->
          <div class="flex flex-col gap-1">
            @for (column of columns(); track column.field) {
              @let isVisible = isColumnVisible(column.field);
              @let isAlwaysVisible = alwaysVisibleColumns().has(column.field);
              @let isLastVisible = visibleColumnsCount() === 1 && isVisible;
              @let isDisabled = isAlwaysVisible || isLastVisible;

              <label class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-base-200">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  [checked]="isVisible"
                  [disabled]="isDisabled"
                  (change)="onToggleColumn(column.field)"
                />
                <span class="flex-1 text-sm">{{ column.header }}</span>
                @if (isAlwaysVisible) {
                  <svg lucideLock [size]="12" class="opacity-50"></svg>
                }
              </label>
            }
          </div>

          <!-- Divider -->
          <div class="divider my-0"></div>

          <!-- Quick actions -->
          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="btn btn-ghost btn-xs gap-1"
              [disabled]="allColumnsVisible()"
              (click)="onShowAll()"
              [attr.aria-label]="resolvedLabels().showAllAriaLabel"
            >
              <svg lucideEye [size]="14"></svg>
              {{ resolvedLabels().showAll }}
            </button>

            <button
              type="button"
              class="btn btn-ghost btn-xs gap-1"
              [disabled]="onlyRequiredColumnsVisible()"
              (click)="onHideAll()"
              [attr.aria-label]="resolvedLabels().hideAllAriaLabel"
            >
              <svg lucideEyeOff [size]="14"></svg>
              {{ resolvedLabels().hideAll }}
            </button>

            <button
              type="button"
              class="btn btn-ghost btn-xs gap-1"
              (click)="onReset()"
              [attr.aria-label]="resolvedLabels().resetAriaLabel"
            >
              <svg lucideRotateCcw [size]="14"></svg>
              {{ resolvedLabels().reset }}
            </button>
          </div>
        </div>
      </div>
    </details>
  `,
})
export class TableColumnVisibilityComponent<T extends Record<string, unknown>> {
  readonly columns = input.required<ColumnDefinition<T>[]>();
  readonly visibilityState = input.required<Map<string, boolean>>();
  readonly alwaysVisibleColumns = input<Set<string>>(new Set());
  readonly labels = input<ColumnVisibilityLabels>({});

  // Outputs using new output() function
  readonly toggleColumn = output<string>();
  readonly showAll = output<void>();
  readonly hideAll = output<void>();
  readonly resetEmitter = output<void>();

  readonly resolvedLabels = computed<Required<ColumnVisibilityLabels>>(() => ({
    ...DEFAULT_LABELS,
    ...this.labels(),
  }));

  readonly visibleColumnsCount = computed(() => {
    return this.columns().filter((c) => this.isColumnVisible(c.field)).length;
  });

  readonly allColumnsVisible = computed(() => {
    return this.columns().every((c) => this.isColumnVisible(c.field));
  });

  readonly onlyRequiredColumnsVisible = computed(() => {
    const alwaysVisible = this.alwaysVisibleColumns();
    const visibleColumns = this.columns().filter((c) => this.isColumnVisible(c.field));

    // If no always-visible columns defined, check if only 1 column is visible
    if (alwaysVisible.size === 0) {
      return visibleColumns.length === 1;
    }

    return visibleColumns.every((c) => alwaysVisible.has(c.field));
  });

  isColumnVisible(field: string): boolean {
    const isVisible = this.visibilityState().get(field);
    return isVisible !== false;
  }

  onToggleColumn(field: string): void {
    this.toggleColumn.emit(field);
  }

  onShowAll(): void {
    this.showAll.emit();
  }

  onHideAll(): void {
    this.hideAll.emit();
  }

  onReset(): void {
    this.resetEmitter.emit();
  }
}
