import { computed, Signal, signal } from '@angular/core';

import { flattenTreeData, generateRowKey, getRowChildren } from '../table.helpers';
import type { FlattenedRow, TreeTableConfig } from '../table.types';

export interface TreeControllerDeps<T> {
  /** Normalized tree config (or `undefined` outside tree mode). */
  readonly config: Signal<TreeTableConfig<T> | undefined>;
  /** Already-sorted data feeding the flatten step. Pass `sortedDataSignal`. */
  readonly sortedData: Signal<readonly T[]>;
  /** Roots of the dataset for `expandAllRows` / `expandToLevel`. Pass `originalDataSignal`. */
  readonly originalData: Signal<readonly T[]>;
  /** Emission — caller wires to `expansionChange` output. */
  readonly onExpansionChange?: (event: { row: T; expanded: boolean }) => void;
}

/**
 * Owns tree-table topology caches, expansion state, the flattened view used
 * by the page-slice boundary, and the animating-keys signal that drives the
 * row-entering transition.
 *
 * The `flattened` computed is the *only* thing that mutates the caches —
 * everything else reads them. Whenever `sortedData` or `expandedKeys`
 * changes, every cache is rebuilt in one pass, so accessors stay
 * O(1) lookups against fresh data.
 */
export class TreeController<T> {
  // ─── Expansion state ──────────────────────────────────────────────────────
  readonly expandedKeys = signal<Set<string>>(new Set());
  /** Keys currently transitioning in via CSS — cleared after the animation timeout. */
  readonly animatingKeys = signal<Set<string>>(new Set());

  // ─── Per-row topology caches (rebuilt by `flattened` computed) ────────────
  private readonly levelMap = new Map<T, number>();
  private readonly keyMap = new Map<T, string>();
  private readonly hasChildrenMap = new Map<T, boolean>();
  private readonly isLastChildMap = new Map<T, boolean>();
  private readonly ancestorFlagsMap = new Map<T, boolean[]>();
  private readonly parentKeyMap = new Map<string, string | null>();
  private readonly keyToDataMap = new Map<string, T>();

  // ─── Derived ──────────────────────────────────────────────────────────────
  readonly enabled: Signal<boolean>;
  readonly indentSize: Signal<number>;
  readonly childrenProperty: Signal<string>;
  readonly cascadeMode: Signal<'none' | 'downward' | 'upward' | 'both'>;
  readonly filterHierarchyMode: Signal<'none' | 'ancestors' | 'descendants' | 'both'>;
  readonly showIndentGuides: Signal<boolean>;

  /**
   * Flattened tree feeding the display pipeline. `null` outside tree mode so
   * the caller's `displayViewSignal` can fall through to the sorted view.
   *
   * Side-effect by design: this computed rebuilds the topology caches so
   * sync template accessors (`hasChildren`, `isRowExpanded`, etc.) stay O(1)
   * after every data / expansion change.
   */
  readonly flattened: Signal<FlattenedRow<T>[] | null>;

  private animationTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: TreeControllerDeps<T>) {
    this.enabled = computed(() => deps.config()?.enabled ?? false);
    this.indentSize = computed(() => deps.config()?.indentSize ?? 24);
    this.childrenProperty = computed(() => deps.config()?.childrenProperty ?? 'children');
    this.cascadeMode = computed(() => deps.config()?.checkboxCascade ?? 'none');
    // FilterHierarchyMode is loosely typed in TreeTableConfig; cast back to the
    // documented values so the controller's contract stays narrow.
    this.filterHierarchyMode = computed(
      () => (deps.config()?.filterHierarchyMode ?? 'ancestors') as 'none' | 'ancestors' | 'descendants' | 'both',
    );
    this.showIndentGuides = computed(() => deps.config()?.showIndentGuides ?? true);

    this.flattened = computed<FlattenedRow<T>[] | null>(() => {
      const data = this.deps.sortedData();
      if (!this.enabled()) return null;

      const config = this.deps.config();
      const expanded = this.expandedKeys();
      const childrenProp = config?.childrenProperty ?? 'children';
      const customGetKey = config?.getRowKey;

      this.clearCaches();

      const flat = flattenTreeData(data, expanded, (row, index) => generateRowKey(row, customGetKey, index), childrenProp);

      for (const item of flat) {
        this.levelMap.set(item.data, item.level);
        this.keyMap.set(item.data, item.key);
        this.hasChildrenMap.set(item.data, item.hasChildren);
        this.isLastChildMap.set(item.data, item.isLastChild);
        this.ancestorFlagsMap.set(item.data, item.ancestorLastFlags);
        this.parentKeyMap.set(item.key, item.parentKey);
        this.keyToDataMap.set(item.key, item.data);
      }

      return flat;
    });
  }

  // ─── Per-row accessors (O(1) cache lookups; cache filled by `flattened`) ─

  hasChildren(row: T): boolean {
    return this.hasChildrenMap.get(row) ?? false;
  }

  getLevel(row: T): number {
    return this.levelMap.get(row) ?? 0;
  }

  getIndentPadding(row: T): number {
    // 8px base padding + level-based indent.
    return 8 + this.getLevel(row) * this.indentSize();
  }

  getAncestorFlags(row: T): boolean[] {
    return this.ancestorFlagsMap.get(row) ?? [];
  }

  isLastChild(row: T): boolean {
    return this.isLastChildMap.get(row) ?? false;
  }

  isExpanded(row: T): boolean {
    const key = this.keyMap.get(row);
    if (!key) return false;
    return this.expandedKeys().has(key);
  }

  isAnimating(row: T): boolean {
    const key = this.keyMap.get(row);
    if (!key) return false;
    return this.animatingKeys().has(key);
  }

  /** Used by SelectionController for upward cascade. Returns `null` outside tree mode or at root. */
  getParent(row: T): T | null {
    const key = this.keyMap.get(row);
    if (!key) return null;
    const parentKey = this.parentKeyMap.get(key);
    if (!parentKey) return null;
    return this.keyToDataMap.get(parentKey) ?? null;
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  toggleRow(row: T, event?: MouseEvent): void {
    if (event) event.stopPropagation();

    const key = this.keyMap.get(row);
    if (!key) return;

    const isCurrentlyExpanded = this.expandedKeys().has(key);

    // Collect child keys for the CSS row-entering animation when expanding.
    if (!isCurrentlyExpanded) {
      const childrenProp = this.childrenProperty();
      const children = getRowChildren(row, childrenProp);
      if (children && children.length > 0) {
        const customGetKey = this.deps.config()?.getRowKey;
        const childKeys = new Set<string>();
        children.forEach((child, idx) => {
          childKeys.add(generateRowKey(child, customGetKey, idx));
        });
        this.animatingKeys.set(childKeys);
        // 250ms matches the CSS transition duration. Clearing previous timer
        // prevents a stale clear from wiping a fresh batch of animating keys.
        if (this.animationTimer) clearTimeout(this.animationTimer);
        this.animationTimer = setTimeout(() => {
          this.animatingKeys.set(new Set());
          this.animationTimer = undefined;
        }, 250);
      }
    }

    this.expandedKeys.update((keys) => {
      const next = new Set(keys);
      if (isCurrentlyExpanded) next.delete(key);
      else next.add(key);
      return next;
    });

    this.deps.onExpansionChange?.({ row, expanded: !isCurrentlyExpanded });
  }

  expandAll(): void {
    const all = new Set<string>();
    this.collectAllRowKeys(this.deps.originalData(), all);
    this.expandedKeys.set(all);
  }

  collapseAll(): void {
    this.expandedKeys.set(new Set());
  }

  expandToLevel(level: number): void {
    const keys = new Set<string>();
    this.collectKeysToLevel(this.deps.originalData(), keys, 0, level);
    this.expandedKeys.set(keys);
  }

  collapseToLevel(level: number): void {
    const keys = new Set<string>();
    this.collectKeysToLevel(this.deps.originalData(), keys, 0, level);
    this.expandedKeys.set(keys);
  }

  /**
   * Merge `extraKeys` into the current expanded set. Returns `true` when the
   * set actually grew. Used by the table component's "auto-expand ancestors
   * of matching nodes" effect during search / filter; deduplicated here so
   * the effect can stay focused on deciding *whether* to expand.
   */
  mergeExpanded(extraKeys: Iterable<string>): boolean {
    const current = this.expandedKeys();
    const merged = new Set([...current, ...extraKeys]);
    if (merged.size === current.size) return false;
    this.expandedKeys.set(merged);
    return true;
  }

  /**
   * Set the initial expanded set from the documented precedence:
   *   `expandAll` > `initialExpandLevel` > `initialExpandedKeys`.
   *
   * Some paths defer to `setTimeout(0)` so data has a chance to land first;
   * we preserve that timing here. Callers wire this into an `effect()` that
   * watches the config signal.
   */
  applyInitialExpansion(): void {
    const config = this.deps.config();
    if (!config?.enabled) return;
    if (config.expandAll) {
      setTimeout(() => this.expandAll(), 0);
    } else if (config.initialExpandLevel != null && config.initialExpandLevel > 0) {
      setTimeout(() => this.expandToLevel(config.initialExpandLevel!), 0);
    } else if (config.initialExpandedKeys && config.initialExpandedKeys.length > 0) {
      this.expandedKeys.set(new Set(config.initialExpandedKeys));
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private clearCaches(): void {
    this.levelMap.clear();
    this.keyMap.clear();
    this.hasChildrenMap.clear();
    this.isLastChildMap.clear();
    this.ancestorFlagsMap.clear();
    this.parentKeyMap.clear();
    this.keyToDataMap.clear();
  }

  private collectKeysToLevel(data: readonly T[], keys: Set<string>, currentLevel: number, targetLevel: number): void {
    if (currentLevel >= targetLevel) return;
    const config = this.deps.config();
    const childrenProp = config?.childrenProperty ?? 'children';
    const customGetKey = config?.getRowKey;

    data.forEach((row, index) => {
      const key = generateRowKey(row, customGetKey, index);
      const children = getRowChildren(row, childrenProp);
      if (children && children.length > 0) {
        keys.add(key);
        this.collectKeysToLevel(children, keys, currentLevel + 1, targetLevel);
      }
    });
  }

  private collectAllRowKeys(data: readonly T[], keys: Set<string>, startIndex = 0): void {
    const config = this.deps.config();
    const childrenProp = config?.childrenProperty ?? 'children';
    const customGetKey = config?.getRowKey;

    data.forEach((row, index) => {
      const key = generateRowKey(row, customGetKey, startIndex + index);
      const children = getRowChildren(row, childrenProp);
      if (children && children.length > 0) {
        keys.add(key);
        this.collectAllRowKeys(children, keys, 0);
      }
    });
  }
}
