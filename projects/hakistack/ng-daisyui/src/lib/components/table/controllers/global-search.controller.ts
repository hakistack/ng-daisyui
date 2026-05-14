import { computed, effect, Injector, Signal, signal } from '@angular/core';
import { IFuseOptions } from 'fuse.js';

import { createFuseCache, FuseCache } from '../../../utils/fuse-cache';
import { filterTreeData } from '../table.helpers';
import type { ColumnDefinition, GlobalSearchChange, GlobalSearchConfig, GlobalSearchMode } from '../table.types';
import type { ColumnKind, TableHandle } from '../engine';

/**
 * Lazy view shape shared with the rest of the data pipeline. Re-declared
 * here as a structural alias so the controller doesn't have to import a
 * host-internal type.
 */
export interface IndexedView<T> {
  readonly source: readonly T[];
  readonly indices: Uint32Array | null;
  readonly length: number;
}

export interface GlobalSearchControllerDeps<T> {
  /** Global search config (or `undefined` when the consumer didn't configure it). */
  readonly config: Signal<GlobalSearchConfig<T> | undefined>;
  /** Upstream view (post-column-filter, pre-search). */
  readonly filteredView: Signal<IndexedView<T>>;
  /** Pagination mode — search is bypassed in cursor mode (server-driven). */
  readonly mode: Signal<'offset' | 'cursor'>;
  /** Tree-mode predicate plumbing. */
  readonly isTreeTable: Signal<boolean>;
  readonly filterHierarchyMode: Signal<'none' | 'ancestors' | 'descendants' | 'both'>;
  readonly childrenProperty: Signal<string>;
  /** Column defs — used to derive the searchable field list. */
  readonly columns: Signal<readonly ColumnDefinition<T>[] | undefined>;
  /** Engine handle + schema kind map for engine-routed search. */
  readonly engineHandle: Signal<TableHandle<T> | null>;
  readonly engineSchemaKindMap: Signal<ReadonlyMap<string, ColumnKind> | null>;
  /** Owned by the host so the controller can register its debounce effect. */
  readonly injector: Injector;
  /** Emission — caller wires to `globalSearchChange` output. */
  readonly onSearchChange?: (event: GlobalSearchChange) => void;
  /** Called whenever the debounced term changes — host resets pagination. */
  readonly onTermChanged?: () => void;
}

/**
 * Owns the global-search text state, the debounced term, the debounce
 * effect, the Fuse cache for fuzzy mode, and the searched-view computed
 * that feeds the rest of the pipeline.
 *
 * Engine path narrows engine search results against the upstream view's
 * index set; tree / fuzzy / custom paths produce a derived array wrapped
 * as `viewOf(arr, null)`. Mode `'cursor'` short-circuits the whole thing
 * — server-side consumers receive `globalSearchChange` emissions instead.
 */
export class GlobalSearchController<T> {
  // ─── State ────────────────────────────────────────────────────────────────
  readonly term = signal<string>('');
  readonly debouncedTerm = signal<string>('');

  // ─── Derived ──────────────────────────────────────────────────────────────
  readonly enabled: Signal<boolean>;
  readonly searchMode: Signal<GlobalSearchMode>;
  readonly placeholder: Signal<string>;
  readonly clearAriaLabel: Signal<string>;
  readonly hasTerm: Signal<boolean>;
  /** Post-search view. Sits between `filteredView` and the sort/group stages. */
  readonly searchedView: Signal<IndexedView<T>>;

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private fuseCache: FuseCache<T> = createFuseCache<T>();
  /** Last consumer `fuseOptions` reference — used to detect overrides without thrashing the cache. */
  private fuseOptionsRef: IFuseOptions<T> | undefined;

  constructor(private readonly deps: GlobalSearchControllerDeps<T>) {
    this.enabled = computed(() => deps.config()?.enabled ?? false);
    this.searchMode = computed(() => deps.config()?.mode ?? 'contains');
    this.placeholder = computed(() => deps.config()?.placeholder ?? 'Search all columns...');
    this.clearAriaLabel = computed(() => deps.config()?.labels?.clearAriaLabel ?? 'Clear search');
    this.hasTerm = computed(() => this.debouncedTerm().length > 0);

    this.searchedView = computed<IndexedView<T>>(() => {
      const view = deps.filteredView();
      const searchTerm = this.debouncedTerm();
      const config = deps.config();
      const mode = deps.mode();

      if (mode === 'cursor' || !config?.enabled || !searchTerm) return view;
      return this.runSearch(view, searchTerm, config);
    });

    this.registerEffects();
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  setTerm(value: string): void {
    this.term.set(value);
  }

  /**
   * Clear both `term` and `debouncedTerm` synchronously, fire one cursor-mode
   * emission when applicable, and reset pagination. No-op when the term is
   * already empty — prevents a phantom emit / `firstPage` when the user
   * clicks "clear" with an already-empty input.
   */
  clear(): void {
    if (this.term() === '' && this.debouncedTerm() === '') return;

    this.term.set('');
    this.debouncedTerm.set('');

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (this.deps.mode() === 'cursor' && this.deps.config()?.enabled) {
      this.deps.onSearchChange?.({ searchTerm: '', mode: this.searchMode() });
    }

    this.deps.onTermChanged?.();
  }

  /** Cancel the pending debounce timer. Call from `ngOnDestroy`. */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  // ─── Private: view pipeline ───────────────────────────────────────────────

  private runSearch(view: IndexedView<T>, searchTerm: string, config: GlobalSearchConfig<T>): IndexedView<T> {
    const searchMode = config.mode ?? 'contains';

    // Build the search predicate used by JS / fuzzy / tree fallbacks.
    let searchPredicate: (row: T) => boolean;

    if (config.customSearch) {
      searchPredicate = (row: T) => config.customSearch!(row, searchTerm);
    } else if (searchMode === 'fuzzy') {
      // Fuzzy doesn't combine well with the indices pipeline. Materialize
      // the upstream view, run the JS fuzzy search, wrap the result.
      const data = this.materialize(view);
      return this.viewOf(this.performFuzzySearch(data, searchTerm, config), null);
    } else {
      const caseSensitive = config.caseSensitive ?? false;
      const excludeFields = new Set(config.excludeFields ?? []);
      const fields =
        this.deps
          .columns()
          ?.map((c) => c.field)
          .filter((f) => !excludeFields.has(f)) ?? [];
      const normalizedSearch = caseSensitive ? searchTerm : searchTerm.toLowerCase();

      searchPredicate = (row: T) =>
        fields.some((field) => {
          const value = row[field as keyof T];
          if (value == null) return false;
          const stringValue = String(value);
          const normalizedValue = caseSensitive ? stringValue : stringValue.toLowerCase();
          switch (searchMode) {
            case 'contains':
              return normalizedValue.includes(normalizedSearch);
            case 'startsWith':
              return normalizedValue.startsWith(normalizedSearch);
            case 'exact':
              return normalizedValue === normalizedSearch;
            default:
              return false;
          }
        });
    }

    // Tree mode: hierarchy-aware search. Materialize upstream first; tree
    // helpers expect concrete arrays. Ancestor auto-expand happens on the
    // host (cycle avoidance — the effect can't write inside this computed).
    if (this.deps.isTreeTable()) {
      const hierarchyMode = this.deps.filterHierarchyMode();
      const childrenProp = this.deps.childrenProperty();
      const data = this.materialize(view);
      return this.viewOf(filterTreeData(data as T[], searchPredicate, childrenProp, hierarchyMode), null);
    }

    // Engine path: indices ∩ filter-indices, no row materialization.
    const engineIndices = this.tryEngineSearchIndices(view, searchTerm, config);
    if (engineIndices) return this.viewOf(view.source, engineIndices);

    // JS fallback: walk the view, push surviving indices.
    return this.viewOf(view.source, this.filterViewByPredicate(view, searchPredicate));
  }

  /**
   * Engine-backed global search returning indices into the original dataset.
   * Intersects the engine's match set with the post-column-filter index set.
   * Returns `null` when the engine can't service this config.
   */
  private tryEngineSearchIndices(view: IndexedView<T>, searchTerm: string, config: GlobalSearchConfig<T>): Uint32Array | null {
    const handle = this.deps.engineHandle();
    const kindMap = this.deps.engineSchemaKindMap();
    if (!handle || !kindMap) return null;

    const mode = (config.mode ?? 'contains') as 'contains' | 'startsWith' | 'exact';
    if (mode !== 'contains' && mode !== 'startsWith' && mode !== 'exact') return null;

    const excludeFields = new Set(config.excludeFields ?? []);
    const fields =
      this.deps
        .columns()
        ?.map((c) => c.field)
        .filter((f) => !excludeFields.has(f)) ?? [];

    const engineFields = fields.filter((f) => kindMap.get(f as string) === 'text') as (keyof T & string)[];

    const matchedIdx = handle.search({
      term: searchTerm,
      mode,
      fields: engineFields,
      caseSensitive: config.caseSensitive ?? false,
    });

    // Intersect with upstream view's index set. When the view has no indices
    // (`null`), every row is in scope and the intersection is a no-op.
    if (view.indices === null) return matchedIdx;

    const visibleSet = new Set<number>();
    for (let i = 0; i < view.indices.length; i++) visibleSet.add(view.indices[i]);

    const out = new Uint32Array(matchedIdx.length);
    let n = 0;
    for (let i = 0; i < matchedIdx.length; i++) {
      const idx = matchedIdx[i];
      if (visibleSet.has(idx)) out[n++] = idx;
    }
    return n === out.length ? out : out.slice(0, n);
  }

  /**
   * Fuzzy search via the shared FuseCache helper. The cache auto-invalidates
   * on data-ref OR keys change — so toggling column visibility or
   * `excludeFields` correctly rebuilds the index.
   */
  private performFuzzySearch(data: readonly T[], searchTerm: string, config: GlobalSearchConfig<T>): readonly T[] {
    const excludeFields = new Set(config.excludeFields ?? []);
    const fields =
      this.deps
        .columns()
        ?.map((c) => c.field)
        .filter((f) => !excludeFields.has(f)) ?? [];

    if (fields.length === 0) return [];

    const searchableKeys = fields.map((f) => String(f));

    // Recreate the cache only when the consumer's `fuseOptions` reference
    // changes — not on every keystroke.
    const consumerOptions = config.fuseOptions;
    if (consumerOptions !== this.fuseOptionsRef) {
      this.fuseOptionsRef = consumerOptions;
      this.fuseCache = createFuseCache<T>(consumerOptions ? this.extractFuseOverrides(consumerOptions) : undefined);
    }

    return this.fuseCache.search(searchTerm, data, searchableKeys);
  }

  /** Whitelist Fuse options that are safe to override per-instance. */
  private extractFuseOverrides(opts: IFuseOptions<T>): Omit<IFuseOptions<T>, 'keys'> {
    return {
      threshold: opts.threshold,
      ignoreLocation: opts.ignoreLocation,
      minMatchCharLength: opts.minMatchCharLength,
      includeScore: opts.includeScore,
      isCaseSensitive: opts.isCaseSensitive,
    };
  }

  /** Walk a view, return the indices array for rows that pass `predicate`. */
  private filterViewByPredicate(view: IndexedView<T>, predicate: (row: T) => boolean): Uint32Array {
    const buf: number[] = [];
    if (!view.indices) {
      for (let i = 0; i < view.source.length; i++) {
        if (predicate(view.source[i])) buf.push(i);
      }
    } else {
      for (let i = 0; i < view.indices.length; i++) {
        const idx = view.indices[i];
        if (predicate(view.source[idx])) buf.push(idx);
      }
    }
    return Uint32Array.from(buf);
  }

  // ─── Private: view helpers (kept local to avoid host-internal imports) ────

  private viewOf(source: readonly T[], indices: Uint32Array | null): IndexedView<T> {
    return { source, indices, length: indices?.length ?? source.length };
  }

  private materialize(view: IndexedView<T>): readonly T[] {
    if (!view.indices) return view.source;
    const out = new Array<T>(view.indices.length);
    for (let i = 0; i < view.indices.length; i++) out[i] = view.source[view.indices[i]];
    return out;
  }

  // ─── Private: debounce effect ─────────────────────────────────────────────

  /**
   * Debounce the live `term` into `debouncedTerm`. The effect runs once on
   * creation with the initial empty term, so emitting unconditionally
   * produced a phantom `globalSearchChange` event on first paint —
   * server-side cursor consumers that load data both in `ngOnInit` and in
   * `(globalSearchChange)` made two identical first-load HTTP calls. The
   * emit and the `onTermChanged` callback both gate on the term actually
   * changing.
   */
  private registerEffects(): void {
    effect(
      () => {
        const value = this.term();
        const config = this.deps.config();
        const debounceTime = config?.debounceTime ?? 300;
        const previousTerm = this.debouncedTerm();

        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
          const changed = value !== previousTerm;
          this.debouncedTerm.set(value);

          if (changed && this.deps.mode() === 'cursor' && config?.enabled) {
            this.deps.onSearchChange?.({ searchTerm: value, mode: config.mode ?? 'contains' });
          }

          if (changed) {
            this.deps.onTermChanged?.();
          }
        }, debounceTime);
      },
      { injector: this.deps.injector },
    );
  }
}
