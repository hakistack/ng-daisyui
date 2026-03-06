import { ChangeDetectionStrategy, Component, computed, input, output, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { CursorPageChange, PageSizeChange, PaginationOptions } from './table.types';

@Component({
  selector: 'hk-table-pagination',
  imports: [CommonModule, LucideIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-base-content/10 flex justify-between gap-4 border-t p-4">
      <!-- Top section: Page size selector and info -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <!-- Page Size Selector -->
        @if (!hidePageSize() && showPageSizeOptions()) {
          <div class="flex items-center gap-2">
            <label for="page-size-select" class="text-sm font-medium whitespace-nowrap"> Items per page: </label>
            <select
              id="page-size-select"
              class="select select-sm w-auto min-w-16"
              [value]="pageSizeSignal()"
              (change)="onPageSizeChange(+$any($event.target).value)"
              [disabled]="disabled()"
              [attr.aria-label]="'Select number of items per page, currently ' + pageSizeSignal()"
            >
              @for (pageSize of pageSizeOptionsSignal(); track trackByPageSize($index, pageSize)) {
                <option [value]="pageSize" [selected]="pageSize === pageSizeSignal()">{{ pageSize }}</option>
              }
            </select>
          </div>
        }
      </div>

      <!-- Bottom section: Navigation controls -->
      <nav class="flex items-center justify-center sm:justify-end" [attr.aria-label]="'Table pagination navigation'">
        <!-- Pagination Info -->
        <div class="flex items-center gap-3">
          <div class="text-base-content/70 text-sm whitespace-nowrap">
            @if (modeSignal() === 'offset') {
              @if (totalItemsSignal() === 0) {
                <span>0 of 0</span>
              } @else {
                <span> {{ startIndexSignal() }}–{{ endIndexSignal() }} of {{ totalItemsSignal() }} </span>
              }
            } @else {
              <span>Cursor-based pagination</span>
            }
          </div>
        </div>

        <div class="divider divider-horizontal"></div>

        @if (modeSignal() === 'offset') {
          <!-- Offset Pagination - All buttons in join for connected styling -->
          <div class="join" role="group" [attr.aria-label]="'Page navigation'">
            <!-- First Page Button -->
            @if (showFirstLastButtons()) {
              <button
                type="button"
                class="join-item btn btn-sm"
                (click)="onFirstPage()"
                [disabled]="isFirstPageSignal() || disabled()"
                [attr.aria-label]="'Go to first page'"
                title="First page"
              >
                <hk-lucide-icon name="ChevronsLeft" aria-hidden="true"></hk-lucide-icon>
              </button>
            }

            <!-- Previous Page Button -->
            <button
              type="button"
              class="join-item btn btn-sm"
              (click)="onPreviousPage()"
              [disabled]="!hasPreviousPageSignal() || disabled()"
              [attr.aria-label]="'Go to previous page'"
              title="Previous page"
            >
              <hk-lucide-icon name="ChevronLeft" aria-hidden="true"></hk-lucide-icon>
            </button>

            <!-- Page Number Buttons -->
            @for (pageNum of visiblePagesSignal(); track trackByPage($index, pageNum)) {
              @if (pageNum === currentPageSignal()) {
                <!-- Current Page -->
                <button
                  type="button"
                  class="join-item btn btn-sm btn-active"
                  [attr.aria-label]="'Current page, page ' + pageNum"
                  [attr.aria-current]="'page'"
                >
                  {{ pageNum }}
                </button>
              } @else {
                <!-- Other Pages -->
                <button
                  type="button"
                  class="join-item btn btn-sm"
                  (click)="onGotoPage(pageNum)"
                  [disabled]="disabled()"
                  [attr.aria-label]="'Go to page ' + pageNum"
                >
                  {{ pageNum }}
                </button>
              }
            }

            <!-- Next Page Button -->
            <button
              type="button"
              class="join-item btn btn-sm"
              (click)="onNextPage()"
              [disabled]="!hasNextPageSignal() || disabled()"
              [attr.aria-label]="'Go to next page'"
              title="Next page"
            >
              <hk-lucide-icon name="ChevronRight" aria-hidden="true"></hk-lucide-icon>
            </button>

            <!-- Last Page Button -->
            @if (showFirstLastButtons()) {
              <button
                type="button"
                class="join-item btn btn-sm"
                (click)="onLastPage()"
                [disabled]="isLastPageSignal() || disabled()"
                [attr.aria-label]="'Go to last page'"
                title="Last page"
              >
                <hk-lucide-icon name="ChevronsRight" aria-hidden="true"></hk-lucide-icon>
              </button>
            }
          </div>
        } @else {
          <!-- Cursor Pagination -->
          <div class="join" role="group" [attr.aria-label]="'Cursor navigation'">
            <button
              type="button"
              class="join-item btn btn-sm"
              (click)="onPrevCursorPage()"
              [disabled]="!prevCursorSignal() || disabled()"
              [attr.aria-label]="'Go to previous page'"
              title="Previous page"
            >
              <hk-lucide-icon name="ChevronLeft" aria-hidden="true"></hk-lucide-icon>
              Previous
            </button>

            <button
              type="button"
              class="join-item btn btn-sm"
              (click)="onNextCursorPage()"
              [disabled]="!nextCursorSignal() || disabled()"
              [attr.aria-label]="'Go to next page'"
              title="Next page"
            >
              Next
              <hk-lucide-icon name="ChevronRight" aria-hidden="true"></hk-lucide-icon>
            </button>
          </div>
        }
      </nav>
    </footer>
  `,
})
export class TablePaginationComponent {
  // Inputs
  readonly paginationOptions = input<PaginationOptions | null>(null);
  readonly totalItems = input<number>(0);
  readonly showFirstLastButtons = input<boolean>(true);
  readonly hidePageSize = input<boolean>(false);
  readonly showPageSizeOptions = input<boolean>(true);
  readonly disabled = input<boolean>(false);
  readonly pageIndex = input<number>(0);
  readonly pageSize = input<number>(10);

  // Outputs
  readonly pageChange = output<PageSizeChange>();
  readonly cursorChange = output<CursorPageChange>();

  // Computed signals
  readonly modeSignal = computed(() => this.paginationOptions()?.mode ?? 'offset');
  readonly pageSizeSignal = computed(() => this.paginationOptions()?.pageSize ?? this.pageSize());
  readonly pageSizeOptionsSignal = computed(() => this.paginationOptions()?.pageSizeOptions ?? [5, 10, 25, 50, 100]);
  readonly nextCursorSignal = computed(() => this.paginationOptions()?.nextCursor ?? null);
  readonly prevCursorSignal = computed(() => this.paginationOptions()?.prevCursor ?? null);
  readonly totalItemsSignal = computed(() => this.paginationOptions()?.totalItems ?? this.totalItems());

  // Pagination calculations
  readonly totalPagesSignal = computed(() => Math.max(1, Math.ceil(this.totalItemsSignal() / this.pageSizeSignal())));
  readonly currentPageSignal = computed(() => this.pageIndex() + 1);
  readonly startIndexSignal = computed(() => this.pageIndex() * this.pageSizeSignal() + 1);
  readonly endIndexSignal = computed(() => Math.min((this.pageIndex() + 1) * this.pageSizeSignal(), this.totalItemsSignal()));

  // Navigation state
  readonly hasPreviousPageSignal = computed(() => {
    if (this.modeSignal() === 'cursor') {
      return !!this.prevCursorSignal() && !this.disabled();
    }
    return this.pageIndex() > 0 && !this.disabled();
  });

  readonly hasNextPageSignal = computed(() => {
    if (this.modeSignal() === 'cursor') {
      return !!this.nextCursorSignal() && !this.disabled();
    }
    return this.pageIndex() < this.totalPagesSignal() - 1 && !this.disabled();
  });

  readonly isFirstPageSignal = computed(() => this.pageIndex() === 0);
  readonly isLastPageSignal = computed(() => this.pageIndex() === this.totalPagesSignal() - 1);

  // Visible page range
  readonly visiblePagesSignal = computed(() => {
    const currentPage = this.currentPageSignal();
    const totalPages = this.totalPagesSignal();
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // Track by functions
  readonly trackByPage: TrackByFunction<number> = (_, page) => page;
  readonly trackByPageSize: TrackByFunction<number> = (_, size) => size;

  // Event handlers
  onFirstPage(): void {
    if (!this.isFirstPageSignal() && !this.disabled()) {
      this.pageChange.emit({ pageIndex: 0, pageSize: this.pageSizeSignal() });
    }
  }

  onPreviousPage(): void {
    if (this.hasPreviousPageSignal()) {
      this.pageChange.emit({ pageIndex: this.pageIndex() - 1, pageSize: this.pageSizeSignal() });
    }
  }

  onNextPage(): void {
    if (this.hasNextPageSignal()) {
      this.pageChange.emit({ pageIndex: this.pageIndex() + 1, pageSize: this.pageSizeSignal() });
    }
  }

  onLastPage(): void {
    if (!this.isLastPageSignal() && !this.disabled()) {
      this.pageChange.emit({ pageIndex: this.totalPagesSignal() - 1, pageSize: this.pageSizeSignal() });
    }
  }

  onGotoPage(pageNumber: number): void {
    const pageIndex = pageNumber - 1;
    if (pageIndex >= 0 && pageIndex < this.totalPagesSignal() && !this.disabled()) {
      this.pageChange.emit({ pageIndex, pageSize: this.pageSizeSignal() });
    }
  }

  onPageSizeChange(newPageSize: number): void {
    if (newPageSize > 0 && !this.disabled()) {
      const mode = this.modeSignal();

      if (mode === 'offset') {
        const currentStart = this.pageIndex() * this.pageSizeSignal();
        const newPageIndex = Math.floor(currentStart / newPageSize);
        this.pageChange.emit({ pageIndex: newPageIndex, pageSize: newPageSize });
      } else {
        this.pageChange.emit({ pageIndex: 0, pageSize: newPageSize });
      }
    }
  }

  onNextCursorPage(): void {
    const nextCursor = this.nextCursorSignal();
    if (nextCursor && !this.disabled()) {
      this.cursorChange.emit({ cursor: nextCursor, direction: 'next' });
    }
  }

  onPrevCursorPage(): void {
    const prevCursor = this.prevCursorSignal();
    if (prevCursor && !this.disabled()) {
      this.cursorChange.emit({ cursor: prevCursor, direction: 'prev' });
    }
  }
}
