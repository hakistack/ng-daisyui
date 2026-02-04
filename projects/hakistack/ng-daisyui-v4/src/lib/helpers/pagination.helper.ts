import { signal, computed, Signal, WritableSignal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { CursorPage } from '../models/paged-response';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SortDirection = 'Ascending' | 'Descending';

/**
 * Configuration for cursor-based pagination
 */
export interface CursorPaginationConfig {
  /** Current cursor for fetching data (null for first page) */
  cursor: string | null;
  /** Number of items per page */
  pageSize: number;
  /** Available page size options */
  pageSizeOptions: number[];
  /** Field to sort by */
  sortField: string;
  /** Sort direction */
  sortDirection: SortDirection;
  /** Next page cursor (from API response) */
  nextCursor: string | null;
  /** Previous page cursor (from API response) */
  prevCursor: string | null;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Whether there's a previous page */
  hasPreviousPage: boolean;
  /** Loading state */
  loading: boolean;
}

/**
 * Configuration for offset-based pagination
 */
export interface OffsetPaginationConfig {
  /** Current page (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Available page size options */
  pageSizeOptions: number[];
  /** Total number of items */
  totalItems: number;
  /** Field to sort by */
  sortField: string;
  /** Sort direction */
  sortDirection: SortDirection;
  /** Loading state */
  loading: boolean;
}

/**
 * Options for creating cursor pagination
 */
export interface CursorPaginationOptions {
  pageSize?: number;
  pageSizeOptions?: number[];
  sortField?: string;
  sortDirection?: SortDirection;
}

/**
 * Options for creating offset pagination
 */
export interface OffsetPaginationOptions {
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  totalItems?: number;
  sortField?: string;
  sortDirection?: SortDirection;
}

/**
 * Pagination state manager with reactive signals
 */
export interface CursorPaginationState {
  /** Main config signal */
  config: WritableSignal<CursorPaginationConfig>;
  /** Computed: can navigate to next page */
  canGoNext: Signal<boolean>;
  /** Computed: can navigate to previous page */
  canGoPrev: Signal<boolean>;
  /** Computed: is currently loading */
  isLoading: Signal<boolean>;
  /** Update config from API response */
  updateFromResponse: <T>(response: CursorPage<T>) => void;
  /** Go to next page */
  goNext: () => string | null;
  /** Go to previous page */
  goPrev: () => string | null;
  /** Change page size (resets to first page) */
  changePageSize: (size: number) => void;
  /** Change sort field and direction */
  changeSort: (field: string, direction: SortDirection) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get HTTP params for API call */
  getHttpParams: () => HttpParams;
}

/**
 * Pagination state manager for offset-based pagination
 */
export interface OffsetPaginationState {
  /** Main config signal */
  config: WritableSignal<OffsetPaginationConfig>;
  /** Computed: can navigate to next page */
  canGoNext: Signal<boolean>;
  /** Computed: can navigate to previous page */
  canGoPrev: Signal<boolean>;
  /** Computed: is currently loading */
  isLoading: Signal<boolean>;
  /** Computed: total pages */
  totalPages: Signal<number>;
  /** Computed: current offset for API call */
  offset: Signal<number>;
  /** Update total items from API response */
  updateTotalItems: (total: number) => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  goNext: () => void;
  /** Go to previous page */
  goPrev: () => void;
  /** Go to first page */
  goFirst: () => void;
  /** Go to last page */
  goLast: () => void;
  /** Change page size (resets to first page) */
  changePageSize: (size: number) => void;
  /** Change sort field and direction */
  changeSort: (field: string, direction: SortDirection) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get HTTP params for API call */
  getHttpParams: () => HttpParams;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_DIRECTION: SortDirection = 'Descending';

// ============================================================================
// CURSOR PAGINATION
// ============================================================================

/**
 * Creates a cursor-based pagination state manager
 *
 * @example
 * ```typescript
 * // In component
 * pagination = createCursorPagination({ sortField: 'userName' });
 *
 * ngOnInit() {
 *   this.loadData();
 * }
 *
 * loadData() {
 *   this.pagination.setLoading(true);
 *   this.service.getData(this.pagination.getHttpParams())
 *     .subscribe(response => {
 *       this.pagination.updateFromResponse(response);
 *       this.data.set(response.items);
 *     });
 * }
 *
 * onNextPage() {
 *   this.pagination.goNext();
 *   this.loadData();
 * }
 * ```
 */
export function createCursorPagination(options: CursorPaginationOptions = {}): CursorPaginationState {
  const initialConfig: CursorPaginationConfig = {
    cursor: null,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    pageSizeOptions: options.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS,
    sortField: options.sortField ?? DEFAULT_SORT_FIELD,
    sortDirection: options.sortDirection ?? DEFAULT_SORT_DIRECTION,
    nextCursor: null,
    prevCursor: null,
    hasNextPage: false,
    hasPreviousPage: false,
    loading: false,
  };

  const config = signal<CursorPaginationConfig>(initialConfig);

  const canGoNext = computed(() => config().hasNextPage && !config().loading);
  const canGoPrev = computed(() => config().hasPreviousPage && !config().loading);
  const isLoading = computed(() => config().loading);

  return {
    config,
    canGoNext,
    canGoPrev,
    isLoading,

    updateFromResponse<T>(response: CursorPage<T>): void {
      config.update(c => ({
        ...c,
        nextCursor: response.nextCursor,
        prevCursor: response.previousCursor,
        hasNextPage: response.hasNextPage,
        hasPreviousPage: response.hasPreviousPage,
        loading: false,
      }));
    },

    goNext(): string | null {
      const nextCursor = config().nextCursor;
      if (nextCursor) {
        config.update(c => ({ ...c, cursor: nextCursor }));
      }
      return nextCursor;
    },

    goPrev(): string | null {
      const prevCursor = config().prevCursor;
      if (prevCursor) {
        config.update(c => ({ ...c, cursor: prevCursor }));
      }
      return prevCursor;
    },

    changePageSize(size: number): void {
      config.update(c => ({
        ...c,
        pageSize: size,
        cursor: null, // Reset to first page
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
      }));
    },

    changeSort(field: string, direction: SortDirection): void {
      config.update(c => ({
        ...c,
        sortField: field,
        sortDirection: direction,
        cursor: null, // Reset to first page
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
      }));
    },

    setLoading(loading: boolean): void {
      config.update(c => ({ ...c, loading }));
    },

    reset(): void {
      config.set(initialConfig);
    },

    getHttpParams(): HttpParams {
      const c = config();
      let params = new HttpParams();

      if (c.cursor) {
        params = params.set('cursor', c.cursor);
      }
      params = params.set('pageSize', c.pageSize.toString());
      params = params.set('sortField', c.sortField);
      params = params.set('sortDirection', c.sortDirection);

      return params;
    },
  };
}

// ============================================================================
// OFFSET PAGINATION
// ============================================================================

/**
 * Creates an offset-based pagination state manager
 *
 * @example
 * ```typescript
 * // In component
 * pagination = createOffsetPagination({ totalItems: 100 });
 *
 * ngOnInit() {
 *   this.loadData();
 * }
 *
 * loadData() {
 *   this.pagination.setLoading(true);
 *   this.service.getData(this.pagination.getHttpParams())
 *     .subscribe(response => {
 *       this.pagination.updateTotalItems(response.totalCount);
 *       this.data.set(response.data);
 *     });
 * }
 *
 * onPageChange(page: number) {
 *   this.pagination.goToPage(page);
 *   this.loadData();
 * }
 * ```
 */
export function createOffsetPagination(options: OffsetPaginationOptions = {}): OffsetPaginationState {
  const initialConfig: OffsetPaginationConfig = {
    page: options.page ?? 1,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    pageSizeOptions: options.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS,
    totalItems: options.totalItems ?? 0,
    sortField: options.sortField ?? DEFAULT_SORT_FIELD,
    sortDirection: options.sortDirection ?? DEFAULT_SORT_DIRECTION,
    loading: false,
  };

  const config = signal<OffsetPaginationConfig>(initialConfig);

  const totalPages = computed(() => Math.ceil(config().totalItems / config().pageSize) || 1);
  const offset = computed(() => (config().page - 1) * config().pageSize);
  const canGoNext = computed(() => config().page < totalPages() && !config().loading);
  const canGoPrev = computed(() => config().page > 1 && !config().loading);
  const isLoading = computed(() => config().loading);

  return {
    config,
    canGoNext,
    canGoPrev,
    isLoading,
    totalPages,
    offset,

    updateTotalItems(total: number): void {
      config.update(c => ({ ...c, totalItems: total, loading: false }));
    },

    goToPage(page: number): void {
      const maxPage = totalPages();
      const validPage = Math.max(1, Math.min(page, maxPage));
      config.update(c => ({ ...c, page: validPage }));
    },

    goNext(): void {
      if (canGoNext()) {
        config.update(c => ({ ...c, page: c.page + 1 }));
      }
    },

    goPrev(): void {
      if (canGoPrev()) {
        config.update(c => ({ ...c, page: c.page - 1 }));
      }
    },

    goFirst(): void {
      config.update(c => ({ ...c, page: 1 }));
    },

    goLast(): void {
      config.update(c => ({ ...c, page: totalPages() }));
    },

    changePageSize(size: number): void {
      config.update(c => ({
        ...c,
        pageSize: size,
        page: 1, // Reset to first page
      }));
    },

    changeSort(field: string, direction: SortDirection): void {
      config.update(c => ({
        ...c,
        sortField: field,
        sortDirection: direction,
        page: 1, // Reset to first page
      }));
    },

    setLoading(loading: boolean): void {
      config.update(c => ({ ...c, loading }));
    },

    reset(): void {
      config.set(initialConfig);
    },

    getHttpParams(): HttpParams {
      const c = config();
      let params = new HttpParams();

      params = params.set('limit', c.pageSize.toString());
      params = params.set('offset', offset().toString());
      params = params.set('sortField', c.sortField);
      params = params.set('sortDirection', c.sortDirection);

      return params;
    },
  };
}

// ============================================================================
// CONVERSION HELPERS (for table component compatibility)
// ============================================================================

import { PaginationOptions } from '../components';

/**
 * Converts cursor pagination config to table PaginationOptions
 */
export function toTablePaginationOptions(state: CursorPaginationState): PaginationOptions {
  const c = state.config();
  return {
    mode: 'cursor',
    nextCursor: c.nextCursor,
    prevCursor: c.prevCursor,
    pageSize: c.pageSize,
    pageSizeOptions: c.pageSizeOptions,
    showSizeChanger: true,
  };
}

/**
 * Converts offset pagination config to table PaginationOptions
 */
export function toOffsetTablePaginationOptions(state: OffsetPaginationState): PaginationOptions {
  const c = state.config();
  return {
    mode: 'offset',
    pageSize: c.pageSize,
    pageSizeOptions: c.pageSizeOptions,
    totalItems: c.totalItems,
    showSizeChanger: true,
    showTotal: true,
    showQuickJumper: true,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates HTTP params for cursor pagination (standalone function)
 * For use when you don't need the full state manager
 */
export function getCursorHttpParams(
  cursor: string | null,
  pageSize: number,
  sortField: string,
  sortDirection: SortDirection,
): HttpParams {
  let params = new HttpParams();

  if (cursor) {
    params = params.set('cursor', cursor);
  }
  params = params.set('pageSize', pageSize.toString());
  params = params.set('sortField', sortField);
  params = params.set('sortDirection', sortDirection);

  return params;
}

/**
 * Creates HTTP params for offset pagination (standalone function)
 * For use when you don't need the full state manager
 */
export function getOffsetHttpParams(
  limit: number,
  offset: number,
  sortField: string,
  sortDirection: SortDirection,
): HttpParams {
  let params = new HttpParams();

  params = params.set('limit', limit.toString());
  params = params.set('offset', offset.toString());
  params = params.set('sortField', sortField);
  params = params.set('sortDirection', sortDirection);

  return params;
}
