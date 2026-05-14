import { computed, Signal, signal } from '@angular/core';

/**
 * Three-state sort: empty string means "unsorted" (the third position of the
 * three-way cycle, after Ascending and Descending).
 */
export type SortDirection = '' | 'Ascending' | 'Descending';

export interface SortState {
  readonly field: string;
  readonly direction: SortDirection;
}

export interface SortControllerDeps {
  /** Skip the sort cycle while a column resize is in progress. */
  readonly isResizing: Signal<boolean>;
  /** True for client-side offset paging — the only mode where sort resets the page. */
  readonly isOffsetMode: Signal<boolean>;
  /** Caller hook to reset to first page after sort in offset mode. */
  readonly onResetToFirstPage: () => void;
  /** Emissions — caller wires these to the component's outputs. */
  readonly onSortFieldChange?: (field: string) => void;
  readonly onSortDirectionChange?: (direction: SortDirection) => void;
  readonly onSortChange?: (state: SortState) => void;
}

/**
 * Owns the sort cycle (asc → desc → none) and the type-aware row comparator.
 * Stateful — keep one instance per table. Plain class; instantiate with
 * `new SortController(deps)` from a host component field.
 *
 * The upstream pipeline (`sortedViewSignal`, engine-routed sort) stays on the
 * host component because it composes filter / search / tree state too; it
 * reads `state` from this controller and calls `compareValues` for the JS
 * fallback path.
 */
export class SortController {
  readonly state = signal<SortState>({ field: '', direction: '' });

  readonly field: Signal<string>;
  readonly direction: Signal<SortDirection>;

  constructor(private readonly deps: SortControllerDeps) {
    this.field = computed(() => this.state().field);
    this.direction = computed(() => this.state().direction);
  }

  /**
   * Cycles the sort on `field`: Ascending → Descending → unsorted, restarting
   * at Ascending when a different field is requested. Resets the table to
   * page 1 in offset mode (cursor mode emits and lets the server decide).
   */
  sort(field: string): void {
    if (this.deps.isResizing()) return;

    const current = this.state();
    const direction = this.cycleDirection(field, current);
    const next: SortState = {
      field: direction ? field : '',
      direction,
    };

    this.state.set(next);
    this.emit(next);

    if (this.deps.isOffsetMode()) {
      this.deps.onResetToFirstPage();
    }
  }

  /**
   * Type-aware comparator. Public so the upstream sort pipeline can call it
   * from the JS fallback path.
   *
   * Handles strings (locale-aware, numeric-aware, case-insensitive), numbers
   * (incl. NaN guard), dates (timestamp diff), booleans (false < true), and
   * null/undefined (always pushed to the end regardless of direction).
   */
  compareValues(valueA: unknown, valueB: unknown, direction: 'Ascending' | 'Descending'): number {
    const multiplier = direction === 'Ascending' ? 1 : -1;

    // null/undefined always sink to the end regardless of direction
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    const typeA = typeof valueA;
    const typeB = typeof valueB;

    if (typeA !== typeB) {
      return String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
    }

    if (typeA === 'string') {
      return (
        (valueA as string).localeCompare(valueB as string, undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * multiplier
      );
    }

    if (typeA === 'number') {
      const diff = (valueA as number) - (valueB as number);
      if (isNaN(diff)) return 0;
      return diff * multiplier;
    }

    if (typeA === 'boolean') {
      return ((valueA as boolean) === (valueB as boolean) ? 0 : (valueA as boolean) ? 1 : -1) * multiplier;
    }

    if (valueA instanceof Date && valueB instanceof Date) {
      return (valueA.getTime() - valueB.getTime()) * multiplier;
    }

    return String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  }

  private cycleDirection(field: string, current: SortState): SortDirection {
    if (current.field !== field) return 'Ascending';
    switch (current.direction) {
      case 'Ascending':
        return 'Descending';
      case 'Descending':
        return '';
      default:
        return 'Ascending';
    }
  }

  private emit(state: SortState): void {
    this.deps.onSortFieldChange?.(state.field);
    this.deps.onSortDirectionChange?.(state.direction);
    this.deps.onSortChange?.(state);
  }
}
