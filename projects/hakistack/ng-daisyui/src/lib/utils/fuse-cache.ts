import Fuse, { IFuseOptions } from 'fuse.js';

/**
 * Cached Fuse.js search wrapper. Builds the index lazily and rebuilds only
 * when the **data reference** OR the **searchable keys** change — both are
 * real cache-invalidation triggers in this codebase:
 *
 * - Data ref changes when the consumer passes a new array (table re-fetch,
 *   select options reload, etc.).
 * - Keys change when searchable fields change (table column visibility
 *   toggle, `excludeFields` config update). The previous table impl only
 *   tracked data — so toggling a column visibly broke search until the
 *   next data refresh.
 *
 * `includeScore` is intentionally NOT enabled by default. None of the
 * lib's call sites read `result.score`; computing it is wasted work. If
 * a consumer needs scores, they should call Fuse directly rather than
 * use this cache.
 */
export interface FuseCache<T> {
  /**
   * Search the data with the given query. Builds / reuses the cached Fuse
   * instance based on data-ref + key-fingerprint identity.
   */
  search(query: string, data: readonly T[], keys: readonly string[]): T[];
  /** Drop the cached instance (frees memory when the consumer stops searching). */
  reset(): void;
}

const DEFAULT_BASE_OPTIONS = {
  threshold: 0.3,
  ignoreLocation: true,
  isCaseSensitive: false,
  minMatchCharLength: 1,
} as const;

/**
 * Create a `FuseCache<T>` with optional per-instance defaults.
 *
 * @param baseOptions Fuse options to merge with the lib defaults (`threshold: 0.3`,
 *   `ignoreLocation: true`, `isCaseSensitive: false`, `minMatchCharLength: 1`).
 *   `keys` is passed per-call to `search()` since it's the most common cache
 *   invalidation trigger and needs to be tracked, so it's omitted here.
 *
 * @example Internal usage in select.component.ts
 * private readonly fuseCache = createFuseCache<SelectOption>();
 *
 * readonly filteredOptions = computed(() => {
 *   const opts = this.effectiveOptions();
 *   const term = this.searchTerm();
 *   if (!term) return opts;
 *   return this.fuseCache.search(term, opts, ['label', 'value']);
 * });
 */
export function createFuseCache<T>(baseOptions?: Omit<IFuseOptions<T>, 'keys'>): FuseCache<T> {
  let instance: Fuse<T> | undefined;
  let cachedData: readonly T[] | null = null;
  let cachedKeysFingerprint = '';

  const mergedOptions: Omit<IFuseOptions<T>, 'keys'> = {
    ...DEFAULT_BASE_OPTIONS,
    ...baseOptions,
  };

  return {
    search(query: string, data: readonly T[], keys: readonly string[]): T[] {
      if (!query || data.length === 0) return [];

      const keysFingerprint = keys.join('|');
      if (!instance || cachedData !== data || cachedKeysFingerprint !== keysFingerprint) {
        // No spread copy of `data` — Fuse doesn't mutate the list, so passing
        // the original ref saves an O(n) allocation on every rebuild.
        instance = new Fuse(data as T[], { ...mergedOptions, keys: keys as string[] });
        cachedData = data;
        cachedKeysFingerprint = keysFingerprint;
      }

      return instance.search(query).map((result) => result.item);
    },

    reset(): void {
      instance = undefined;
      cachedData = null;
      cachedKeysFingerprint = '';
    },
  };
}
