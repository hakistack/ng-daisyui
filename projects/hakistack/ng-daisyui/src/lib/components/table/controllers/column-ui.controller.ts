import { moveItemInArray } from '@angular/cdk/drag-drop';
import { computed, Signal, signal } from '@angular/core';

import type {
  ColumnDefinition,
  ColumnReorderEvent,
  ColumnResizeEvent,
  ColumnVisibilityConfig,
  ColumnVisibilityLabels,
} from '../table.types';

export interface ColumnUiControllerDeps<T> {
  /** Column defs after `createTable`/`columns` resolution. Drives visible-field lists and min/max width clamping. */
  readonly columnDefs: Signal<readonly ColumnDefinition<T>[]>;
  /** Live displayed column-name list — the source of truth for reorder ops (it knows the special-column ordering). */
  readonly displayedColumns: Signal<readonly string[]>;
  /** Visibility config block from `fieldConfig.columnVisibility`. */
  readonly visibilityConfig: Signal<ColumnVisibilityConfig | undefined>;
  /** Resize-enable flag. */
  readonly enableResizing: Signal<boolean>;
  /** Reorder-enable flag. */
  readonly enableReorder: Signal<boolean>;
  /** Sticky-columns config block from `fieldConfig.stickyColumns`. */
  readonly stickyConfig: Signal<{ stickySelection?: boolean; stickyActions?: boolean } | undefined>;
  /** Whether the table currently has a selection column. */
  readonly hasSelection: Signal<boolean>;
  /** Whether the table currently has any actions column. */
  readonly hasActions: Signal<boolean>;
  /** True when running in a browser context with usable localStorage. */
  readonly canUseStorage: boolean;
  /** Emission — caller wires to `columnReorder` output. */
  readonly onColumnReorder?: (event: ColumnReorderEvent) => void;
  /** Emission — caller wires to `columnResize` output. */
  readonly onColumnResize?: (event: ColumnResizeEvent) => void;
}

/**
 * Owns column-level UI state: visibility (with persistence), reorder
 * (column drag), resize (live width edits + min/max clamping), and the
 * sticky-column derivations. Single controller because the four concerns
 * are tightly coupled by the same `columnDefs` source of truth and the
 * same template surface (column header).
 *
 * Visibility persists via `localStorage` when `visibilityConfig.storageKey`
 * is set; reorder and resize are session-only (consumers can opt-in to
 * persistence by listening to the emissions).
 */
export class ColumnUiController<T> {
  // ─── State ────────────────────────────────────────────────────────────────

  /** Field-name → explicit boolean. Missing entries default to visible. */
  readonly visibilityState = signal<Map<string, boolean>>(new Map());
  /** Field-name → live width in px (after the user has dragged a resizer). */
  readonly widths = signal<Map<string, number>>(new Map());
  /** True only while a resize gesture is in progress (drives `[class.resizing]` on the host). */
  readonly isResizing = signal(false);
  /** Field-name reordering override; `null` falls back to the natural `columnDefs` order. */
  readonly orderOverride = signal<string[] | null>(null);
  /** Native HTML5 drag state for column reordering. */
  readonly draggedField = signal<string | null>(null);
  readonly dragOverField = signal<string | null>(null);

  // ─── Derived: visibility ──────────────────────────────────────────────────
  readonly isVisibilityEnabled: Signal<boolean>;
  readonly alwaysVisible: Signal<Set<string>>;
  readonly visibilityLabels: Signal<ColumnVisibilityLabels>;

  // ─── Derived: sticky ──────────────────────────────────────────────────────
  readonly stickyStartColumns: Signal<Set<string>>;
  readonly stickyEndColumns: Signal<Set<string>>;
  /** True when `stickyColumns` is explicitly configured with at least one option. */
  readonly hasStickyColumns: Signal<boolean>;
  /** Effective sticky flag for the selection (checkbox) column. */
  readonly stickySelection: Signal<boolean>;
  /** Effective sticky flag for the actions column. */
  readonly stickyActions: Signal<boolean>;

  private resizeState: { field: string; startX: number; startWidth: number } | null = null;

  constructor(private readonly deps: ColumnUiControllerDeps<T>) {
    this.isVisibilityEnabled = computed(() => deps.visibilityConfig()?.enabled ?? false);
    this.alwaysVisible = computed(() => new Set(deps.visibilityConfig()?.alwaysVisible ?? []));
    this.visibilityLabels = computed(() => deps.visibilityConfig()?.labels ?? {});

    this.stickyStartColumns = computed(() => {
      const set = new Set<string>();
      for (const col of deps.columnDefs()) {
        if (col.sticky === 'start') set.add(col.field as string);
      }
      return set;
    });
    this.stickyEndColumns = computed(() => {
      const set = new Set<string>();
      for (const col of deps.columnDefs()) {
        if (col.sticky === 'end') set.add(col.field as string);
      }
      return set;
    });

    this.hasStickyColumns = computed(() => {
      const config = deps.stickyConfig();
      return config != null && (config.stickySelection != null || config.stickyActions != null);
    });

    this.stickySelection = computed(() => {
      if (!this.hasStickyColumns()) return false;
      return deps.hasSelection() && deps.stickyConfig()?.stickySelection !== false;
    });

    this.stickyActions = computed(() => {
      if (!this.hasStickyColumns()) return false;
      return deps.hasActions() && deps.stickyConfig()?.stickyActions !== false;
    });
  }

  // ─── Visibility ───────────────────────────────────────────────────────────

  isColumnVisible(field: string): boolean {
    return this.visibilityState().get(field) !== false; // visible by default when unset
  }

  toggleVisibility(field: string): void {
    const currentlyVisible = this.isColumnVisible(field);

    // Always-visible columns can never be hidden.
    if (this.alwaysVisible().has(field) && currentlyVisible) return;

    // Keep at least one column visible.
    const all = this.deps.columnDefs().map((c) => c.field as string);
    const visibleCount = all.filter((f) => this.isColumnVisible(f)).length;
    if (visibleCount === 1 && currentlyVisible) return;

    this.visibilityState.update((state) => {
      const next = new Map(state);
      next.set(field, !currentlyVisible);
      return next;
    });
    this.saveToStorage();
  }

  showAll(): void {
    const all = this.deps.columnDefs().map((c) => c.field as string);
    this.visibilityState.update((state) => {
      const next = new Map(state);
      all.forEach((field) => next.set(field, true));
      return next;
    });
    this.saveToStorage();
  }

  hideAll(): void {
    const all = this.deps.columnDefs().map((c) => c.field as string);
    const alwaysVisible = this.alwaysVisible();

    // Keep at least one column visible — prefer the first non-always-visible
    // column (because always-visible ones are kept anyway), otherwise fall
    // back to the first column.
    const firstColumn = all.find((f) => !alwaysVisible.has(f)) ?? all[0];

    this.visibilityState.update((state) => {
      const next = new Map(state);
      for (const field of all) {
        next.set(field, alwaysVisible.has(field) || field === firstColumn);
      }
      return next;
    });
    this.saveToStorage();
  }

  /**
   * Reset to `defaultVisible` if configured; otherwise show all. Always
   * persists, even when the underlying call is `showAll()`.
   */
  reset(): void {
    const config = this.deps.visibilityConfig();
    const defaultVisible = config?.defaultVisible;
    if (defaultVisible && defaultVisible.length > 0) {
      const all = this.deps.columnDefs().map((c) => c.field as string);
      this.visibilityState.update((state) => {
        const next = new Map(state);
        for (const field of all) {
          next.set(field, defaultVisible.includes(field));
        }
        return next;
      });
    } else {
      this.showAll();
    }
    this.saveToStorage();
  }

  /**
   * Run the documented initialization sequence: load from storage when
   * configured, otherwise seed from `defaultVisible`. Idempotent — call
   * from a host effect that watches `visibilityConfig`.
   */
  applyInitialVisibility(): void {
    const config = this.deps.visibilityConfig();
    if (!config?.enabled) return;

    this.loadFromStorage();

    // Untouched after the load? Seed from `defaultVisible` so first paint
    // matches consumer intent.
    if (this.visibilityState().size === 0 && config.defaultVisible && config.defaultVisible.length > 0) {
      const all = this.deps.columnDefs().map((c) => c.field as string);
      this.visibilityState.update((state) => {
        const next = new Map(state);
        for (const field of all) {
          next.set(field, config.defaultVisible!.includes(field));
        }
        return next;
      });
    }
  }

  // ─── Sticky / width queries ───────────────────────────────────────────────

  isStickyStart(field: string): boolean {
    if (field === 'select') return this.stickySelection();
    if (field === 'actions_start') return this.stickyActions();
    return this.stickyStartColumns().has(field);
  }

  isStickyEnd(field: string): boolean {
    if (field === 'actions_end') return this.stickyActions();
    return this.stickyEndColumns().has(field);
  }

  getColumnWidth(field: string): number | null {
    return this.widths().get(field) ?? null;
  }

  // ─── Resize handlers ──────────────────────────────────────────────────────

  onResizeStart(field: string, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.target as HTMLElement).closest('th');
    if (!th) return;

    this.isResizing.set(true);
    this.resizeState = { field, startX: event.clientX, startWidth: th.offsetWidth };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onResizeMove(event: PointerEvent): void {
    if (!this.resizeState) return;

    const { field, startX, startWidth } = this.resizeState;
    const diff = event.clientX - startX;
    let newWidth = Math.max(startWidth + diff, 50); // hard floor: 50px

    // Honor explicit per-column min/max from the column definition.
    const col = this.deps.columnDefs().find((c) => c.field === field);
    if (col?.minWidth) newWidth = Math.max(newWidth, col.minWidth);
    if (col?.maxWidth) newWidth = Math.min(newWidth, col.maxWidth);

    this.widths.update((m) => {
      const next = new Map(m);
      next.set(field, newWidth);
      return next;
    });
  }

  onResizeEnd(): void {
    if (!this.resizeState) return;
    const { field, startWidth } = this.resizeState;
    const newWidth = this.widths().get(field) ?? startWidth;

    this.deps.onColumnResize?.({ field, width: newWidth, previousWidth: startWidth });
    this.resizeState = null;
    this.isResizing.set(false);
  }

  // ─── Reorder handlers ─────────────────────────────────────────────────────

  onDragStart(field: string, event: DragEvent): void {
    if (!this.deps.enableReorder()) return;
    this.draggedField.set(field);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', field);
    }
  }

  onDragOver(field: string, event: DragEvent): void {
    if (!this.deps.enableReorder() || !this.draggedField()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverField.set(field);
  }

  onDragLeave(): void {
    this.dragOverField.set(null);
  }

  onDrop(field: string, event: DragEvent): void {
    event.preventDefault();
    const fromField = this.draggedField();
    this.draggedField.set(null);
    this.dragOverField.set(null);

    if (!fromField || fromField === field) return;

    // The displayed-columns list interleaves utility columns (select, actions,
    // drag handle, expand) — strip those out before reordering, then keep
    // them in their original positions on the host's side.
    const specialCols = new Set(['select', '__detail_expand', '__drag_handle', 'actions_start', 'actions_end']);
    const dataCols = [...this.deps.displayedColumns()].filter((c) => !specialCols.has(c));

    const fromIdx = dataCols.indexOf(fromField);
    const toIdx = dataCols.indexOf(field);
    if (fromIdx === -1 || toIdx === -1) return;

    moveItemInArray(dataCols, fromIdx, toIdx);
    this.orderOverride.set(dataCols);

    this.deps.onColumnReorder?.({
      previousIndex: fromIdx,
      currentIndex: toIdx,
      columns: dataCols,
    });
  }

  onDragEnd(): void {
    this.draggedField.set(null);
    this.dragOverField.set(null);
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private saveToStorage(): void {
    const storageKey = this.deps.visibilityConfig()?.storageKey;
    if (!storageKey || !this.deps.canUseStorage) return;

    const obj: Record<string, boolean> = {};
    this.visibilityState().forEach((visible, field) => {
      obj[field] = visible;
    });

    // Defer the write so we don't block the main thread inside a state-write.
    queueMicrotask(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(obj));
      } catch {}
    });
  }

  private loadFromStorage(): void {
    const storageKey = this.deps.visibilityConfig()?.storageKey;
    if (!storageKey || !this.deps.canUseStorage) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const obj: Record<string, boolean> = JSON.parse(stored);
      this.visibilityState.update((state) => {
        const next = new Map(state);
        Object.entries(obj).forEach(([field, visible]) => {
          next.set(field, visible);
        });
        return next;
      });
    } catch {}
  }
}
