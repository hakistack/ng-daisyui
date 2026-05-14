import { computed, effect, Injector, Signal, signal } from '@angular/core';

import type { CursorPageChange, PageSizeChange, PaginationOptions } from '../table.types';

export interface PaginationState {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
  readonly totalItems: number;
  readonly showFirstLastButtons: boolean;
  readonly disabled: boolean;
}

export interface PaginationControllerDeps {
  /** Effective options: static config merged with runtime overrides. */
  readonly paginationOptions: Signal<PaginationOptions | null>;
  /** Total row count — drives `totalPages` and clamp-to-range logic. */
  readonly totalItems: Signal<number>;
  /** Host inputs that flow into state so the pagination footer can react. */
  readonly showFirstLastButtons: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  /** Used by `effect()` calls so the controller works outside an injection context. */
  readonly injector: Injector;
  /** Emission — caller wires to `pageChange` output. */
  readonly onPageChange?: (event: PageSizeChange) => void;
  /** Emission — caller wires to `cursorChange` output. */
  readonly onCursorChange?: (event: CursorPageChange) => void;
}

/**
 * Owns pagination state (`pageIndex`, `pageSize`, etc.), the runtime
 * overrides bag pushed via `setPagination()`, the derived page-shape signals
 * (`totalPages`, `nextCursor`, `prevCursor`), and the two effects that sync
 * effective options → state.
 *
 * The host keeps the wider `data() → clampToData(totalItems) + prune selection`
 * orchestration effect because it spans multiple controllers; this controller
 * exposes `clampToData(totalItems)` for that effect to call.
 */
export class PaginationController {
  // ─── State ────────────────────────────────────────────────────────────────

  /** Canonical UI state. */
  readonly state = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100],
    totalItems: 0,
    showFirstLastButtons: true,
    disabled: false,
  });

  /**
   * Runtime overrides pushed via `setPagination()`. Merged on top of the
   * static `fieldConfig.pagination` to produce `paginationOptions`.
   */
  readonly dynamicOverrides = signal<Partial<PaginationOptions> | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────

  readonly pageIndex: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly pageSizeOptions: Signal<readonly number[]>;
  readonly mode: Signal<'offset' | 'cursor'>;
  readonly nextCursor: Signal<string | number | null>;
  readonly prevCursor: Signal<string | number | null>;
  readonly totalPages: Signal<number>;

  /**
   * Last `paginationOptions.pageSize` we synced into state. Used to detect
   * actual config changes vs. re-runs that just toggle `disabled` —
   * preventing the options effect from stomping the user's interactive
   * page-size choice.
   */
  private lastSeenOptionsPageSize: number | undefined;

  constructor(private readonly deps: PaginationControllerDeps) {
    this.pageIndex = computed(() => this.state().pageIndex);
    this.pageSize = computed(() => this.state().pageSize);
    this.pageSizeOptions = computed(() => deps.paginationOptions()?.pageSizeOptions ?? [5, 10, 25, 50, 100]);
    this.mode = computed(() => deps.paginationOptions()?.mode ?? 'offset');
    this.nextCursor = computed(() => deps.paginationOptions()?.nextCursor ?? null);
    this.prevCursor = computed(() => deps.paginationOptions()?.prevCursor ?? null);
    this.totalPages = computed(() => Math.max(1, Math.ceil(deps.totalItems() / this.pageSize())));

    this.registerEffects();
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  firstPage(): void {
    if (this.pageIndex() > 0 && !this.deps.disabled()) {
      this.update({ pageIndex: 0, pageSize: this.pageSize() });
    }
  }

  previousPage(): void {
    if (this.pageIndex() > 0 && !this.deps.disabled()) {
      this.update({ pageIndex: this.pageIndex() - 1, pageSize: this.pageSize() });
    }
  }

  nextPage(): void {
    const last = this.totalPages() - 1;
    if (this.pageIndex() < last && !this.deps.disabled()) {
      this.update({ pageIndex: this.pageIndex() + 1, pageSize: this.pageSize() });
    }
  }

  lastPage(): void {
    const last = this.totalPages() - 1;
    if (this.pageIndex() < last && !this.deps.disabled()) {
      this.update({ pageIndex: last, pageSize: this.pageSize() });
    }
  }

  gotoPage(pageNumber: number): void {
    const pageIndex = pageNumber - 1; // Convert to 0-based
    if (pageIndex >= 0 && pageIndex < this.totalPages() && !this.deps.disabled()) {
      this.update({ pageIndex, pageSize: this.pageSize() });
    }
  }

  /**
   * Merge `opts` into the runtime override bag. Server-driven flows use this
   * to push `totalItems` / `nextCursor` / `prevCursor` after each fetch; the
   * static `createTable({ pagination: {...} })` config is the floor and these
   * overrides are the live delta on top.
   */
  setPagination(opts: Partial<PaginationOptions>): void {
    this.dynamicOverrides.update((curr) => ({ ...(curr ?? {}), ...opts }));
  }

  /** Handler wired to `(pageChange)` on the pagination footer component. */
  handlePageChange(event: PageSizeChange): void {
    this.state.update((s) => ({ ...s, pageIndex: event.pageIndex, pageSize: event.pageSize }));
    this.deps.onPageChange?.(event);
  }

  /** Handler wired to `(cursorChange)` on the pagination footer component. */
  handleCursorChange(event: CursorPageChange): void {
    this.deps.onCursorChange?.(event);
  }

  /**
   * Clamp the current `pageIndex` into the valid range for the given
   * `totalItems`. Called by the host's data-ref effect — resets to 0 was
   * removed deliberately: any inline derived data array (`users().slice(...)`)
   * mints a fresh ref every CD tick, and resetting on every ref change made
   * "next page" feel broken. Clamping only intervenes when the user's
   * current page is genuinely out of range (e.g. row count just dropped).
   */
  clampToData(totalItems: number): void {
    const pageSize = this.state().pageSize || 10;
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1);
    this.state.update((s) => ({
      ...s,
      pageIndex: Math.min(s.pageIndex, maxPageIndex),
      totalItems,
    }));
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private update(options: { pageIndex: number; pageSize: number }): void {
    this.state.update((s) => ({ ...s, pageIndex: options.pageIndex, pageSize: options.pageSize }));
    this.deps.onPageChange?.(options);
  }

  /**
   * Two disjoint effects sync external inputs into `state`. Each owns exactly
   * one trigger; cross-signal reads are `untracked()` so an update to one
   * input never fires the other effect.
   *
   * The third pagination effect (data-ref → clamp + prune selection) stays
   * on the host because it crosses controllers — see `clampToData`.
   */
  private registerEffects(): void {
    const { injector } = this.deps;

    // Trigger: paginationOptions / showFirstLastButtons / disabled change.
    //
    // Only sync `pageSize` from options when the *consumer-declared* page
    // size actually changed between two reads; re-renders that just toggle
    // `disabled` or `showFirstLastButtons` preserve the user's live
    // dropdown choice (e.g. "100 per page").
    effect(
      () => {
        const options = this.deps.paginationOptions();
        const showFirstLast = this.deps.showFirstLastButtons();
        const disabled = this.deps.disabled();
        if (!options) return;
        const optionsPageSize = options.pageSize ?? 10;
        const seen = this.lastSeenOptionsPageSize;
        const optionsPageSizeChanged = seen === undefined || seen !== optionsPageSize;
        this.lastSeenOptionsPageSize = optionsPageSize;
        this.state.update((s) => ({
          ...s,
          pageSize: optionsPageSizeChanged ? optionsPageSize : s.pageSize,
          showFirstLastButtons: showFirstLast,
          disabled,
        }));
      },
      { injector },
    );

    // Trigger: totalItems changes independently (server-side pagination).
    effect(
      () => {
        const totalItems = this.deps.totalItems();
        this.state.update((s) => ({ ...s, totalItems }));
      },
      { injector },
    );
  }
}
