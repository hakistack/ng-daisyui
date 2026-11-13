import { computed, Signal, signal } from '@angular/core';

/**
 * Per-row checkbox cascade mode for tree tables.
 * `none`     – ticking a row has no effect on parents/children.
 * `downward` – ticking a row ticks all descendants.
 * `upward`   – ticking a row auto-ticks its parent when every sibling is ticked.
 * `both`     – downward and upward.
 */
export type CheckboxCascadeMode = 'none' | 'downward' | 'upward' | 'both';

/**
 * Dependencies the selection controller needs from its host (the table
 * component). Everything is signal-based so the controller stays reactive
 * without owning the source of truth for configuration / page data / tree
 * topology.
 *
 * Tree-aware deps (`getChildren`, `getParent`, `hasChildren`) are queried
 * lazily; when tree mode is disabled they can return null / false / undefined
 * and `cascadeMode` should be `'none'` so they're never called.
 */
export interface SelectionControllerDeps<T> {
  /** Rows visible on the current page. Drives `toggleSelectAll` / `isAllSelected`. */
  readonly currentData: Signal<readonly T[]>;
  /** Whether checkbox selection is enabled at all. */
  readonly hasSelection: Signal<boolean>;
  /** Maximum number of rows that can be checkbox-selected at once. `null` = unlimited. */
  readonly selectionLimit: Signal<number | null>;
  /** Per-row predicate. Defaults to `() => true` on the consumer side when not configured. */
  readonly isRowSelectable: Signal<(row: T) => boolean>;
  /** Click-to-highlight UX mode. `false` disables row-click highlighting. */
  readonly selectableRowsMode: Signal<false | 'single' | 'multi'>;
  /** Tree cascade mode. `'none'` outside tree mode. */
  readonly cascadeMode: Signal<CheckboxCascadeMode>;
  /** True when tree table is active. Gates the cascade calls. */
  readonly isTreeTable: Signal<boolean>;
  /** Tree property name where children live (e.g. `'children'`). */
  readonly childrenProperty: Signal<string>;
  /** Tree children getter. Return `null`/`undefined`/`[]` when there are none. */
  readonly getChildren: (row: T, childrenProperty: string) => readonly T[] | null | undefined;
  /** Tree parent getter for upward cascade. Return `null` at root or outside tree mode. */
  readonly getParent: (row: T) => T | null;
  /** Whether a row has children (cached lookup on the host). */
  readonly hasChildren: (row: T) => boolean;
  /** Emitted after `toggleRow` / `toggleSelectAll` / `clearSelection`. Not emitted from `pruneToData` (matches pre-refactor behavior). */
  readonly onSelectionChange?: (selected: readonly T[]) => void;
  /** Emitted after `toggleActiveRow`. */
  readonly onActiveRowChange?: (row: T | null) => void;
  /** Emitted after `toggleActiveRow` in `'multi'` mode. */
  readonly onActiveRowsChange?: (rows: readonly T[]) => void;
}

/**
 * Owns checkbox-selection state, the click-to-highlight active-row state,
 * and the per-row / per-page predicates that gate both. Pure class — no
 * Angular DI required, instantiate with `new SelectionController(deps)` from
 * a host component field.
 *
 * Derived computeds are wired in the constructor (not as field initializers)
 * because TypeScript's strict class fields semantics evaluate field
 * initializers before parameter properties are assigned, so `this.deps`
 * would be `undefined` at that point. State signals (no deps reference) stay
 * as field initializers.
 */
export class SelectionController<T> {
  // ─── State ────────────────────────────────────────────────────────────────
  readonly selected = signal(new Set<T>());
  readonly activeRow = signal<T | null>(null);
  readonly activeRows = signal<Set<T>>(new Set());

  // ─── Derived (assigned in constructor) ────────────────────────────────────
  readonly selectedArray: Signal<T[]>;
  /** True when every selectable row on the current page is in the selected set. */
  readonly isAllSelected: Signal<boolean>;
  /** True when `selected.size >= selectionLimit`. */
  readonly isSelectionLimitReached: Signal<boolean>;
  /** Whether to render the header "select all" checkbox at all (hidden when `selectionLimit === 1`). */
  readonly showSelectAllCheckbox: Signal<boolean>;
  /** True when click-to-highlight is configured. */
  readonly selectableRowsActive: Signal<boolean>;

  constructor(private readonly deps: SelectionControllerDeps<T>) {
    this.selectedArray = computed(() => [...this.selected()]);

    this.isSelectionLimitReached = computed(() => {
      const limit = deps.selectionLimit();
      return limit !== null && this.selected().size >= limit;
    });

    this.showSelectAllCheckbox = computed(() => deps.selectionLimit() === null);

    this.selectableRowsActive = computed(() => deps.selectableRowsMode() !== false);

    this.isAllSelected = computed(() => {
      const data = deps.currentData();
      const set = this.selected();
      const canSelect = deps.isRowSelectable();
      // Only count rows the predicate allows. A page of all-unselectable rows
      // reports `false` so the header checkbox doesn't render as "checked".
      const selectable = data.filter(canSelect);
      return selectable.length > 0 && selectable.every((row) => set.has(row));
    });
  }

  // ─── Predicates ───────────────────────────────────────────────────────────

  isSelected(row: T): boolean {
    return this.selected().has(row);
  }

  /** True when this row's checkbox should render disabled (predicate or limit). */
  isRowSelectDisabled(row: T): boolean {
    if (!this.deps.isRowSelectable()(row)) return true;
    return this.isSelectionLimitReached() && !this.isSelected(row);
  }

  /** True when disabled specifically because of the limit (gates the limit tooltip). */
  isRowSelectDisabledByLimit(row: T): boolean {
    return this.isSelectionLimitReached() && !this.isSelected(row) && this.deps.isRowSelectable()(row);
  }

  /** True when the header "select all" should render disabled. */
  isSelectAllDisabled(): boolean {
    const data = this.deps.currentData();
    const canSelect = this.deps.isRowSelectable();
    if (!data.some(canSelect)) return true;
    if (this.deps.selectionLimit() === null) return false;
    if (this.isAllSelected()) return false; // would deselect — always allowed
    return this.isSelectionLimitReached();
  }

  /** True when a tree row's checkbox should render in the indeterminate state. */
  isIndeterminate(row: T): boolean {
    const cascade = this.deps.cascadeMode();
    if (cascade === 'none') return false;
    if (!this.deps.hasChildren(row)) return false;

    const children = this.deps.getChildren(row, this.deps.childrenProperty());
    if (!children || children.length === 0) return false;

    const set = this.selected();
    let someSelected = false;
    let allSelected = true;
    for (const child of children) {
      if (set.has(child)) someSelected = true;
      else allSelected = false;
    }
    return someSelected && !allSelected;
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  toggleRow(row: T, checked: boolean): void {
    // Belt-and-suspenders against programmatic callers / keyboard focus that
    // bypass the `[disabled]` HTML attribute on the checkbox.
    if (checked && !this.deps.isRowSelectable()(row)) return;
    if (checked && this.isSelectionLimitReached() && !this.isSelected(row)) return;

    const cascade = this.deps.cascadeMode();
    const isTree = this.deps.isTreeTable();

    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(row);
      else next.delete(row);

      if (cascade !== 'none' && isTree) {
        const childrenProp = this.deps.childrenProperty();
        if (cascade === 'downward' || cascade === 'both') {
          this.cascadeDown(row, checked, next, childrenProp);
        }
        if (cascade === 'upward' || cascade === 'both') {
          this.cascadeUp(row, next, childrenProp);
        }
      }

      return next;
    });

    this.emitSelection();
  }

  toggleSelectAll(checked: boolean): void {
    const data = this.deps.currentData();
    const limit = this.deps.selectionLimit();
    const canSelect = this.deps.isRowSelectable();

    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) {
        // Cap additions at remaining capacity; skip predicate-rejected rows.
        for (const row of data) {
          if (!canSelect(row)) continue;
          if (limit !== null && next.size >= limit && !next.has(row)) break;
          next.add(row);
        }
      } else {
        // Deselection ignores the predicate — a previously-selected row whose
        // predicate now returns false must still be removable.
        for (const row of data) next.delete(row);
      }
      return next;
    });

    this.emitSelection();
  }

  clearSelection(): void {
    this.selected.set(new Set());
    this.deps.onSelectionChange?.([]);
  }

  /**
   * Drop any selected row not present in `data`. Returns `true` when the
   * selection set changed. Does not emit `onSelectionChange` — matches the
   * pre-refactor behavior where data-driven pruning was silent.
   */
  pruneToData(data: readonly T[] | null | undefined): boolean {
    if (!data || data.length === 0) {
      if (this.selected().size === 0) return false;
      this.selected.set(new Set());
      return true;
    }
    const current = this.selected();
    if (current.size === 0) return false;
    const liveRows = new Set<T>(data);
    let dropped = false;
    const next = new Set<T>();
    for (const row of current) {
      if (liveRows.has(row)) next.add(row);
      else dropped = true;
    }
    if (dropped) this.selected.set(next);
    return dropped;
  }

  /**
   * Apply the click-to-highlight rule for `selectableRowsMode`. No-op when
   * the mode is `false`. Emits via `onActiveRowChange` / `onActiveRowsChange`.
   */
  toggleActiveRow(row: T): void {
    const mode = this.deps.selectableRowsMode();
    if (mode === 'single') {
      const current = this.activeRow();
      this.activeRow.set(current === row ? null : row);
      this.deps.onActiveRowChange?.(this.activeRow());
      return;
    }
    if (mode === 'multi') {
      this.activeRows.update((set) => {
        const next = new Set(set);
        if (next.has(row)) next.delete(row);
        else next.add(row);
        return next;
      });
      // Preserves pre-refactor asymmetry: multi mode emits the *clicked* row
      // on `onActiveRowChange`, plus the full set on `onActiveRowsChange`.
      this.deps.onActiveRowChange?.(row);
      this.deps.onActiveRowsChange?.([...this.activeRows()]);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private cascadeDown(row: T, checked: boolean, set: Set<T>, childrenProp: string): void {
    const children = this.deps.getChildren(row, childrenProp);
    if (!children) return;
    for (const child of children) {
      if (checked) set.add(child);
      else set.delete(child);
      this.cascadeDown(child, checked, set, childrenProp);
    }
  }

  private cascadeUp(row: T, set: Set<T>, childrenProp: string): void {
    const parent = this.deps.getParent(row);
    if (!parent) return;
    const siblings = this.deps.getChildren(parent, childrenProp);
    if (!siblings) return;
    const allSiblingsSelected = siblings.every((s) => set.has(s));
    if (allSiblingsSelected) set.add(parent);
    else set.delete(parent);
    this.cascadeUp(parent, set, childrenProp);
  }

  private emitSelection(): void {
    this.deps.onSelectionChange?.([...this.selected()]);
  }
}
