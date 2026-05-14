import { computed, Signal, signal } from '@angular/core';

import type { ColumnFilter, FilterChange, FilterConfig, FilterOperator } from '../table.types';
import type { ColumnSchema, FilterDef, TableHandle } from '../engine';
import { translateFilter } from '../engine';

export interface FilterControllerDeps<T> {
  /** Per-column filter definitions resolved from `FieldConfig.filters`. */
  readonly columnFiltersMap: Signal<ReadonlyMap<string, ColumnFilter<T>>>;
  /** Engine handle once the WASM module has loaded — `null` until then. */
  readonly engineHandle: Signal<TableHandle<T> | null>;
  /** Engine schema once inferred — `null` outside engine mode. */
  readonly engineSchema: Signal<readonly ColumnSchema<T>[] | null>;
  /** Reset to first page after every mutation (matches pre-refactor behavior). */
  readonly onResetToFirstPage: () => void;
  /** Side effect to close DOM popovers when mutations close the dropdown UI. */
  readonly onCloseDropdowns?: () => void;
  /** Emission — caller wires to `filterChange` output. */
  readonly onFilterChange?: (payload: FilterChange<T>) => void;
}

/**
 * Owns column-filter state, the dropdown open-state, and the per-row
 * predicate the upstream view pipeline uses. Plain class; instantiate with
 * `new FilterController(deps)`.
 *
 * The upstream `filteredViewSignal` stays on the component because it
 * composes tree-mode filtering and the page-slice boundary too. It reads
 * `state()` and calls `applyFilter` / `tryEngineFilterIndices` on this
 * controller.
 */
export class FilterController<T> {
  /** Active filter list. Replaced atomically; never mutated in place. */
  readonly state = signal<readonly FilterConfig<T>[]>([]);

  /** Which column's filter dropdown is open, if any. `null` = all closed. */
  readonly openField = signal<string | null>(null);

  readonly activeFilters: Signal<readonly FilterConfig<T>[]>;
  readonly hasActive: Signal<boolean>;
  readonly activeCount: Signal<number>;

  /**
   * Memoized engine wire translation. The `state` signal hands out a new
   * array reference only on real changes, so ref-equality on `(filters,
   * schema)` is the right cache key. Reused across re-runs of the upstream
   * view computed that don't actually touch the filter list (data ref
   * changes, search term changes, etc.). Invalidated when either ref moves.
   *
   * Kept private — only `tryEngineFilterIndices` reads/writes it.
   */
  private translateMemo: { filters: readonly FilterConfig<T>[]; schema: readonly ColumnSchema<T>[]; wire: FilterDef<T>[] } | null = null;

  constructor(private readonly deps: FilterControllerDeps<T>) {
    this.activeFilters = computed(() => this.state());
    this.hasActive = computed(() => this.state().length > 0);
    this.activeCount = computed(() => this.state().length);
  }

  // ─── Dropdown open-state ──────────────────────────────────────────────────

  toggleDropdown(field: string): void {
    const current = this.openField();
    this.openField.set(current === field ? null : field);
  }

  closeAllDropdowns(): void {
    this.openField.set(null);
    this.deps.onCloseDropdowns?.();
  }

  isOpen(field: string): boolean {
    return this.openField() === field;
  }

  // ─── Per-column queries ───────────────────────────────────────────────────

  getColumnFilter(field: string): ColumnFilter<T> | undefined {
    return this.deps.columnFiltersMap().get(field);
  }

  getActiveFilterForColumn(field: string): FilterConfig<T> | undefined {
    return this.state().find((f) => f.field === field);
  }

  hasFilterForColumn(field: string): boolean {
    return this.deps.columnFiltersMap().has(field);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  applyColumnFilter(field: string, value: unknown, operator: FilterOperator): void {
    const filterConfig = this.deps.columnFiltersMap().get(field);
    if (!filterConfig) return;

    // Replace any existing filter on this field.
    const next = this.state().filter((f) => f.field !== field);

    // Treat empty arrays AND arrays of only empty/null entries (e.g. `['', '']`
    // from an untouched date-range UI) as empty so clearing a range input
    // actually clears the filter instead of leaving an active filter with NaN
    // bounds that excludes every row.
    const isEmpty =
      value == null || value === '' || (Array.isArray(value) && (value.length === 0 || value.every((v) => v == null || v === '')));

    if (!isEmpty) {
      next.push({
        field: field as Extract<keyof T, string>,
        value,
        operator,
        type: filterConfig.type,
      });
    }

    this.state.set(next);
    this.closeAllDropdowns();
    this.deps.onResetToFirstPage();
    this.deps.onFilterChange?.({ field, value, operator, filters: [...this.state()] });
  }

  removeFilter(field: string): void {
    const next = this.state().filter((f) => f.field !== field);
    this.state.set(next);
    this.deps.onResetToFirstPage();
    this.deps.onFilterChange?.({ field, value: null, operator: 'equals', filters: [...this.state()] });
  }

  clearAll(): void {
    this.state.set([]);
    this.closeAllDropdowns();
    this.deps.onResetToFirstPage();
    this.deps.onFilterChange?.({ field: '', value: null, operator: 'equals', filters: [] });
  }

  // ─── Engine + predicate (called from the upstream view pipeline) ─────────

  /**
   * Engine-backed filter. Returns indices into the original dataset, or
   * `null` for the JS fallback. Re-runs of the upstream view computed that
   * don't touch the filter list hit the memo and skip re-translation.
   *
   * We accept the engine result only if every active filter translates
   * without ambiguity; a single untranslatable filter forces JS for the
   * whole list (rather than producing wrong results from a partial
   * application).
   */
  tryEngineFilterIndices(): Uint32Array | null {
    const handle = this.deps.engineHandle();
    const schema = this.deps.engineSchema();
    if (!handle || !schema) return null;

    const filters = this.state();
    const memo = this.translateMemo;
    let wire: FilterDef<T>[];
    if (memo && memo.filters === filters && memo.schema === schema) {
      wire = memo.wire;
    } else {
      const built: FilterDef<T>[] = [];
      for (const f of filters) {
        const translated = translateFilter<T>(f, schema);
        if (!translated) {
          this.translateMemo = null;
          return null;
        }
        built.push(translated);
      }
      this.translateMemo = { filters, schema, wire: built };
      wire = built;
    }

    return handle.filter(wire);
  }

  /**
   * Apply a single filter to a row. The upstream view's predicate folds this
   * across the active filter list. Handles operator-specific null semantics:
   * "not" operators match null rows (null is not equal to / does not contain
   * / is not in anything); other operators filter nulls out.
   */
  applyFilter(row: T, filter: FilterConfig<T>): boolean {
    const value = row[filter.field];
    const filterValue = filter.value;

    if (filter.operator === 'isEmpty') {
      return value == null || value === '';
    }
    if (filter.operator === 'isNotEmpty') {
      return value != null && value !== '';
    }

    if (value == null) {
      return filter.operator === 'notEquals' || filter.operator === 'notContains' || filter.operator === 'notIn';
    }

    switch (filter.operator) {
      case 'equals':
        return value === filterValue;
      case 'notEquals':
        return value !== filterValue;
      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'notContains':
        return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'gt':
        return Number(value) > Number(filterValue);
      case 'lt':
        return Number(value) < Number(filterValue);
      case 'gte':
        return Number(value) >= Number(filterValue);
      case 'lte':
        return Number(value) <= Number(filterValue);
      case 'in':
        return Array.isArray(filterValue) ? filterValue.includes(value) : false;
      case 'notIn':
        // Aligned with `in` — malformed (non-array) filter value fails closed.
        return Array.isArray(filterValue) ? !filterValue.includes(value) : false;
      case 'between': {
        if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
        const [a, b] = filterValue as [unknown, unknown];

        // Date range: parse both sides via Date so ISO strings compare correctly.
        // (Number('2025-01-15') is NaN, so a number-only path silently
        // excludes every row whenever a date range is applied.)
        if (filter.type === 'dateRange') {
          const t = new Date(value as string | number | Date).getTime();
          if (isNaN(t)) return false;
          const lo = a != null && a !== '' ? new Date(a as string | number | Date).getTime() : -Infinity;
          const hi = b != null && b !== '' ? new Date(b as string | number | Date).getTime() : Infinity;
          return t >= lo && t <= hi;
        }

        // Numeric range. Partial ranges are allowed: missing low bound →
        // -Infinity; missing high bound → +Infinity.
        const n = Number(value);
        if (isNaN(n)) return false;
        const lo = a != null && a !== '' ? Number(a) : -Infinity;
        const hi = b != null && b !== '' ? Number(b) : Infinity;
        return n >= lo && n <= hi;
      }
      default:
        return true;
    }
  }
}
