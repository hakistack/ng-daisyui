import { computed, Signal, signal } from '@angular/core';

import { encodeGroupPath, groupData } from '../table.helpers';
import type { GroupConfig, ResolvedGroupAggregates, RowGroup, StringKey } from '../table.types';
import { translateGroupFields, type ColumnSchema, type GroupKey, type GroupNode as EngineGroupNode, type TableHandle } from '../engine';
import { type AggregateFunction, computeAggregate } from '../table-aggregates';

/** Maps an engine wire `GroupKey` to the JS `groupValue` shape. */
function engineKeyToValue(key: GroupKey): unknown {
  switch (key.kind) {
    case 'null':
      return null;
    case 'text':
    case 'number':
    case 'bool':
      return key.value;
    case 'date':
      return key.value; // ms-epoch — reachable only if translateGroupFields is later relaxed for dates
  }
}

export interface GroupControllerDeps<T> {
  readonly config: Signal<GroupConfig<T> | undefined>;
  readonly resolvedGroupAggregates: Signal<ResolvedGroupAggregates<T> | undefined>;
  readonly hasGroupFooterRows: Signal<boolean>;
  /** Already filter/sort/search-narrowed rows (drives the JS path). */
  readonly displayData: Signal<readonly T[]>;
  /**
   * Engine-side row indices for the visible page, or `'unmappable'` (tree
   * mode / synthetic rows). `null` means "all rows in the dataset" — engine
   * sees the original ingest.
   */
  readonly displayIndices: Signal<Uint32Array | null | 'unmappable'>;
  /** Untouched dataset — engine indices reference this. */
  readonly originalData: Signal<readonly T[]>;
  readonly engineHandle: Signal<TableHandle<T> | null>;
  readonly engineSchema: Signal<readonly ColumnSchema<T>[] | null>;
  /** Emission — caller wires to `groupExpandChange` output. */
  readonly onGroupExpand?: (event: { groupValue: unknown; path: readonly unknown[]; expanded: boolean }) => void;
}

/**
 * Owns row-grouping state and the engine-routed groupBy pipeline. Mirrors
 * the controller pattern used by Filter / Sort / Selection — plain class,
 * `state` signals as field initializers, derived computeds in constructor.
 *
 * The expansion state uses a path-keyed `Set<string>` (via `encodeGroupPath`)
 * with a `null` sentinel for "never interacted; defer to
 * `config.initiallyExpanded`". Storing expanded *paths* (not collapsed ones)
 * means newly-introduced groups inherit the configured default cleanly when
 * the data changes.
 */
export class GroupController<T> {
  /** Path-keyed expansion state. `null` = uninitialized; defer to `initiallyExpanded`. */
  readonly expandedPaths = signal<Set<string> | null>(null);

  readonly isGrouped: Signal<boolean>;
  readonly depth: Signal<number>;
  readonly hasCaptionAggregates: Signal<boolean>;

  /**
   * Full grouped tree. Engine-routed when every groupBy field is engine-safe
   * AND `displayIndices` is mappable; JS fallback otherwise.
   */
  readonly groupedData: Signal<RowGroup<T>[]>;

  /**
   * Flat per-row stream the template renders sequentially. Walks the tree
   * emitting `group-header`, optional data rows, then `group-footer` entries.
   */
  readonly groupedDisplay: Signal<
    Array<
      | { type: 'group-header'; group: RowGroup<T>; depth: number }
      | { type: 'group-footer'; group: RowGroup<T>; depth: number; footerRowIndex?: number }
      | { type: 'data'; row: T; depth: number }
    >
  >;

  constructor(private readonly deps: GroupControllerDeps<T>) {
    this.isGrouped = computed(() => {
      const cfg = deps.config();
      if (!cfg?.groupBy) return false;
      return Array.isArray(cfg.groupBy) ? cfg.groupBy.length > 0 : true;
    });

    this.depth = computed(() => {
      const cfg = deps.config();
      if (!cfg?.groupBy) return 0;
      return Array.isArray(cfg.groupBy) ? cfg.groupBy.length : 1;
    });

    this.hasCaptionAggregates = computed(() => !!deps.config()?.captionAggregates);

    this.groupedData = computed<RowGroup<T>[]>(() => {
      const config = deps.config();
      if (!this.isGrouped()) return [];

      const data = deps.displayData();
      const expanded = this.expandedPaths();
      const resolved = deps.resolvedGroupAggregates();
      const initiallyExpanded = config?.initiallyExpanded ?? true;

      const tree =
        this.tryEngineGroup(config!, initiallyExpanded, resolved) ??
        groupData<T>(
          data,
          config!.groupBy,
          config!.aggregates as Partial<Record<StringKey<T>, AggregateFunction>>,
          config!.groupSortFn,
          config!.groupHeaderLabel,
          initiallyExpanded,
          resolved,
        );

      // Apply expansion state recursively. `null` ⇒ first paint, use the
      // configured default; otherwise, a path is expanded iff in the Set.
      const applyExpansion = (nodes: RowGroup<T>[]) => {
        for (const node of nodes) {
          node.expanded = expanded === null ? initiallyExpanded : expanded.has(encodeGroupPath(node.path));
          if (node.children.length > 0) applyExpansion(node.children);
        }
      };
      applyExpansion(tree);

      return tree;
    });

    this.groupedDisplay = computed(() => {
      const groups = this.groupedData();
      if (groups.length === 0) return [];

      const config = deps.config();
      const showGroupFooter = config?.showGroupFooter ?? false;
      const hasFooterRows = deps.hasGroupFooterRows();

      type DisplayRow =
        | { type: 'group-header'; group: RowGroup<T>; depth: number }
        | { type: 'group-footer'; group: RowGroup<T>; depth: number; footerRowIndex?: number }
        | { type: 'data'; row: T; depth: number };

      const result: DisplayRow[] = [];

      const emitFooters = (group: RowGroup<T>, depth: number) => {
        if (hasFooterRows && group.resolvedGroupFooterRows) {
          for (let i = 0; i < group.resolvedGroupFooterRows.length; i++) {
            result.push({ type: 'group-footer', group, depth, footerRowIndex: i });
          }
        } else if (showGroupFooter) {
          result.push({ type: 'group-footer', group, depth });
        }
      };

      const walk = (nodes: readonly RowGroup<T>[]) => {
        for (const node of nodes) {
          result.push({ type: 'group-header', group: node, depth: node.depth });
          if (!node.expanded) continue;

          if (node.children.length > 0) {
            walk(node.children);
            emitFooters(node, node.depth);
          } else {
            for (const row of node.rows) {
              result.push({ type: 'data', row, depth: node.depth });
            }
            emitFooters(node, node.depth);
          }
        }
      };

      walk(groups);
      return result;
    });
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Toggle the expansion state of a single group, addressed by its full path.
   * Path-based because two groups can share the same leaf value across
   * different parent chains (e.g. "US → CA" vs. "MX → CA").
   */
  toggle(path: readonly unknown[]): void {
    const node = this.findByPath(path);
    if (!node) return;

    const wasExpanded = node.expanded;
    const key = encodeGroupPath(path);

    this.expandedPaths.update((set) => {
      // Lazy-initialize on first interaction: snapshot the current effective
      // expanded set so subsequent toggles produce a delta rather than
      // wiping everything.
      let next: Set<string>;
      if (set === null) {
        next = new Set();
        const collect = (nodes: readonly RowGroup<T>[]) => {
          for (const n of nodes) {
            if (n.expanded) next.add(encodeGroupPath(n.path));
            if (n.children.length > 0) collect(n.children);
          }
        };
        collect(this.groupedData());
      } else {
        next = new Set(set);
      }

      if (wasExpanded) next.delete(key);
      else next.add(key);
      return next;
    });

    this.deps.onGroupExpand?.({ groupValue: node.groupValue, path, expanded: !wasExpanded });
  }

  expandAll(): void {
    const all = new Set<string>();
    const visit = (nodes: readonly RowGroup<T>[]) => {
      for (const n of nodes) {
        all.add(encodeGroupPath(n.path));
        if (n.children.length > 0) visit(n.children);
      }
    };
    visit(this.groupedData());
    this.expandedPaths.set(all);
  }

  collapseAll(): void {
    this.expandedPaths.set(new Set());
  }

  // ─── Per-group accessors ──────────────────────────────────────────────────

  getAggregateValue(group: RowGroup<T>, field: string): string {
    const val = group.aggregates[field];
    return val != null ? String(Math.round(val * 100) / 100) : '';
  }

  getCaptionValue(group: RowGroup<T>, field: string): string {
    const fn = group.resolvedCaptionCells?.[field as StringKey<T>];
    if (!fn) return '';
    return fn(group.rows);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private findByPath(path: readonly unknown[]): RowGroup<T> | undefined {
    let nodes: readonly RowGroup<T>[] = this.groupedData();
    let found: RowGroup<T> | undefined;
    for (const key of path) {
      found = nodes.find((n) => n.groupValue === key);
      if (!found) return undefined;
      nodes = found.children;
    }
    return found;
  }

  /**
   * Engine-backed group. Returns the RowGroup<T> tree on success or `null`
   * for JS fallback. Falls back when any groupBy field isn't engine-safe
   * (date columns, missing schema), the display indices are unmappable
   * (tree mode), or the handle isn't ready.
   */
  private tryEngineGroup(
    config: GroupConfig<T>,
    initiallyExpanded: boolean,
    resolvedGroupAggregates: ResolvedGroupAggregates<T> | undefined,
  ): RowGroup<T>[] | null {
    const handle = this.deps.engineHandle();
    const schema = this.deps.engineSchema();
    if (!handle || !schema) return null;

    const fields: readonly (keyof T & string)[] = Array.isArray(config.groupBy)
      ? (config.groupBy as readonly (keyof T & string)[])
      : [config.groupBy as keyof T & string];
    const safeFields = translateGroupFields<T>(fields, schema);
    if (!safeFields) return null;

    const indices = this.deps.displayIndices();
    if (indices === 'unmappable') return null;

    const original = this.deps.originalData();
    const engineNodes = handle.group(safeFields, indices);

    const out = this.engineNodesToRowGroups(engineNodes, original, [], config, initiallyExpanded, resolvedGroupAggregates);

    // Optional `groupSortFn` is applied here too — kernel produces first-seen
    // order; user-provided sort runs at every level.
    if (config.groupSortFn) {
      const sort = config.groupSortFn;
      const sortRecursive = (nodes: RowGroup<T>[]) => {
        nodes.sort((a, b) => sort(a.groupValue, b.groupValue));
        for (const n of nodes) {
          if (n.children.length > 0) sortRecursive(n.children);
        }
      };
      sortRecursive(out);
    }

    return out;
  }

  private engineNodesToRowGroups(
    nodes: readonly EngineGroupNode[],
    original: readonly T[],
    parentPath: readonly unknown[],
    config: GroupConfig<T>,
    initiallyExpanded: boolean,
    resolvedGroupAggregates: ResolvedGroupAggregates<T> | undefined,
  ): RowGroup<T>[] {
    const out = new Array<RowGroup<T>>(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const groupValue = engineKeyToValue(node.key);
      const path = [...parentPath, groupValue];
      const rows = Array.from(node.indices, (idx) => original[idx]);

      const groupLabel = config.groupHeaderLabel ? config.groupHeaderLabel(groupValue, rows) : String(groupValue ?? 'Unknown');

      const aggregates: Record<string, number> = {};
      if (config.aggregates) {
        for (const [field, fn] of Object.entries(config.aggregates)) {
          if (fn) {
            aggregates[field] = computeAggregate(rows, field as Extract<keyof T, string>, fn as AggregateFunction);
          }
        }
      }

      const group: RowGroup<T> = {
        groupValue,
        groupLabel,
        path,
        depth: node.depth,
        rows,
        children: this.engineNodesToRowGroups(node.children, original, path, config, initiallyExpanded, resolvedGroupAggregates),
        aggregates,
        expanded: initiallyExpanded,
      };

      if (resolvedGroupAggregates?.resolvedCaptionCells) {
        group.resolvedCaptionCells = resolvedGroupAggregates.resolvedCaptionCells;
      }
      if (resolvedGroupAggregates?.resolvedGroupFooterRows) {
        group.resolvedGroupFooterRows = resolvedGroupAggregates.resolvedGroupFooterRows;
      }

      out[i] = group;
    }
    return out;
  }
}
