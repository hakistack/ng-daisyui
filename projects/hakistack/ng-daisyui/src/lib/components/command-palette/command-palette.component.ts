import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { HK_THEME } from '../../theme/theme.config';
import { FuzzyEngineService, FuzzyHandle } from '../../services';
import { createFuseCache } from '../../utils/fuse-cache';
import { DEFAULT_COMMAND_PALETTE_LABELS, HK_COMMAND_PALETTE_LABELS, ResolvedCommandPaletteLabels } from './command-palette.labels';
import {
  CommandPaletteConfig,
  CommandPaletteFilter,
  CommandPaletteItem,
  CommandPaletteMode,
  CommandPaletteState,
} from './command-palette.types';
import { isInTextEntry, matchesHotkey, parseHotkey, substringFilter } from './command-palette.utils';

interface RenderedGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly { item: CommandPaletteItem; flatIndex: number }[];
}

const IMPLICIT_GROUP_ID = '__default';

/**
 * Modal command palette — a search-driven launcher with grouped results,
 * mode prefixes, and a global hotkey. Native to the lib (no
 * `@tailwindplus/elements` runtime, no commercial license).
 *
 * Configuration is **builder-only** (matching `createForm` / `createTable`
 * / `createPdfViewer`). Pass `controller.config()` from a
 * `createCommandPalette({...})` call to `[config]`. Imperative actions
 * (`open` / `close` / `toggle` / `setQuery` / `clear`) live on the
 * controller — no `@ViewChild` needed.
 *
 * @example
 * palette = createCommandPalette({
 *   items: [
 *     { id: 'p1', label: 'Website', group: 'projects', onSelect: () => goto('/p1') },
 *   ],
 *   groups: [{ id: 'projects', label: 'Projects' }],
 *   modes: [{ prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Projects' }],
 * });
 * // <hk-command-palette [config]="palette.config()" />
 * // this.palette.open();
 */
@Component({
  selector: 'hk-command-palette',
  imports: [CommonModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class CommandPaletteComponent implements OnInit {
  private readonly theme = inject(HK_THEME);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly userLabels = inject(HK_COMMAND_PALETTE_LABELS, { optional: true });

  /** Configuration object — pass `controller.config()` from a `createCommandPalette({...})` call. */
  readonly config = input.required<CommandPaletteConfig>();

  // ── View refs ────────────────────────────────────────────────────────────

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  // ── Primitive state — separate signals so derived state can use computeds
  //    without triggering itself. The previous design wrapped a single
  //    `localState` signal whose every update ran a recompute effect that
  //    also wrote back — classic infinite loop. ────────────────────────────

  private readonly openSignal = signal<boolean>(false);
  private readonly querySignal = signal<string>('');
  private readonly selectedIndexSignal = signal<number>(-1);

  // ── Derived state (computed — no self-triggering) ────────────────────────

  /** Active mode resolved by query prefix; first-match-wins. */
  private readonly modeSignal = computed<CommandPaletteMode | null>(() => {
    const cfg = this.config();
    const query = this.querySignal();
    for (const m of cfg.modes ?? []) {
      if (query.startsWith(m.prefix)) return m;
    }
    return null;
  });

  /** Query with mode prefix stripped, ready for the filter strategy. */
  private readonly strippedQuerySignal = computed<string>(() => {
    const mode = this.modeSignal();
    const raw = this.querySignal();
    return mode ? raw.slice(mode.prefix.length).trimStart() : raw;
  });

  /**
   * Items eligible for filtering — restricted by the active mode's
   * `filterGroups` whitelist when set.
   */
  private readonly scopedItemsSignal = computed<readonly CommandPaletteItem[]>(() => {
    const cfg = this.config();
    const mode = this.modeSignal();
    if (mode?.filterGroups) {
      return cfg.items.filter((it) => it.group && mode.filterGroups!.includes(it.group));
    }
    return cfg.items;
  });

  /**
   * Cached `Set<CommandPaletteItem>` of mode-scoped items, or `null` when no
   * narrowing is active (scoped === all). Used by the engine-routed filter
   * path to test membership in O(1) without rebuilding the Set per keystroke.
   */
  private readonly scopedItemsSetSignal = computed<ReadonlySet<CommandPaletteItem> | null>(() => {
    const items = this.scopedItemsSignal();
    const all = this.config().items;
    return items === all ? null : new Set(items);
  });

  /** Filter result. Computed from scoped items + stripped query + filter strategy. */
  private readonly filteredSignal = computed<readonly CommandPaletteItem[]>(() => {
    const mode = this.modeSignal();

    // Help mode renders the help panel — no filter work needed.
    if (mode?.layout === 'help') return [];

    const items = this.scopedItemsSignal();
    const stripped = this.strippedQuerySignal().trim();

    if (!stripped) {
      // Empty query: with a prefix, show everything in scope; without, show nothing.
      return mode ? items : [];
    }

    return this.runFilter(stripped, items, mode, this.config().filter ?? 'fuzzy');
  });

  /** Public-facing combined state — what the controller exposes via `state()`. */
  readonly state = computed<CommandPaletteState>(() => ({
    open: this.openSignal(),
    query: this.querySignal(),
    mode: this.modeSignal(),
    selectedIndex: this.selectedIndexSignal(),
    filtered: this.filteredSignal(),
  }));

  // ── Render-derived data ──────────────────────────────────────────────────

  /** Labels with consumer overrides applied; falls back to English defaults. */
  readonly labels = computed<ResolvedCommandPaletteLabels>(() => ({
    ...DEFAULT_COMMAND_PALETTE_LABELS,
    ...this.userLabels,
  }));

  /** Items grouped for rendering. Each item carries its `flatIndex` for keyboard nav. */
  readonly groupedResults = computed<readonly RenderedGroup[]>(() => {
    const filtered = this.filteredSignal();
    if (filtered.length === 0) return [];

    const groupDefs = this.config().groups ?? [];
    const buckets = new Map<string, { item: CommandPaletteItem; flatIndex: number }[]>();
    filtered.forEach((item, flatIndex) => {
      const id = item.group ?? IMPLICIT_GROUP_ID;
      const bucket = buckets.get(id) ?? [];
      bucket.push({ item, flatIndex });
      buckets.set(id, bucket);
    });

    const result: RenderedGroup[] = [];
    for (const g of groupDefs) {
      const items = buckets.get(g.id);
      if (items?.length) result.push({ id: g.id, label: g.label, items });
    }
    const implicitItems = buckets.get(IMPLICIT_GROUP_ID);
    if (implicitItems?.length) result.push({ id: IMPLICIT_GROUP_ID, label: '', items: implicitItems });
    return result;
  });

  readonly showHelp = computed(() => this.modeSignal()?.layout === 'help');
  readonly showEmpty = computed(() => !this.showHelp() && this.filteredSignal().length === 0 && this.querySignal().length > 0);

  /** Theme-bridged class for the modal-box card. */
  readonly panelClass = computed(
    () => `modal-box w-full max-w-2xl p-0 max-h-[80vh] overflow-hidden flex flex-col ${this.theme.classes.cardBorder}`,
  );

  // ── Internals ────────────────────────────────────────────────────────────

  private readonly fuseCache = createFuseCache<CommandPaletteItem>();
  private readonly engineService = inject(FuzzyEngineService);
  /**
   * Lazily-built handle covering the *full* `cfg.items` list. Mode whitelisting
   * happens after engine search via Set lookup, so we don't have to rebuild
   * the handle when the user switches modes.
   */
  private readonly engineHandleSignal = signal<FuzzyHandle | null>(null);
  private unbindController: (() => void) | null = null;

  constructor() {
    // Bridge: copy the public `state()` signal up to the controller's writable
    // bridge signal whenever it changes. Single direction — controller never
    // writes back through this path, so no loop. The component reads only
    // primitive signals + own computeds; nothing here tracks `_internal.state`.
    effect(() => {
      const cfg = this.config();
      const state = this.state();
      cfg._internal?.state.set(state);
    });

    this.setupFuzzyEngineLifecycle();
  }

  /**
   * Build a fuzzy handle whenever the items list reference changes. The
   * handle replaces Fuse.js for the per-keystroke ranking work; the
   * existing `fuseCache` stays as the JS fallback for handle-not-ready
   * (e.g., SSR, vitest+jsdom, or first paint before WASM has loaded).
   */
  private setupFuzzyEngineLifecycle(): void {
    effect((onCleanup) => {
      const items = this.config().items;
      if (items.length === 0) {
        this.disposeEngineHandle();
        return;
      }

      // Concatenate label + description + keywords per item. The engine
      // matches across the joined string; mode-scoped post-filtering still
      // narrows the results to the active mode's whitelist.
      const haystacks = items.map((it) => buildHaystack(it));

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
        this.disposeEngineHandle();
      });

      this.engineService
        .createIndex(haystacks)
        .then((handle) => {
          if (cancelled) {
            handle.dispose();
            return;
          }
          this.disposeEngineHandle();
          this.engineHandleSignal.set(handle);
        })
        .catch(() => {
          // WASM failed to load — service has logged. Stay on Fuse.js.
          this.disposeEngineHandle();
        });
    });
  }

  private disposeEngineHandle(): void {
    const old = this.engineHandleSignal();
    if (old) {
      old.dispose();
      this.engineHandleSignal.set(null);
    }
  }

  ngOnInit(): void {
    this.bindControllerHandlers();

    if (!isPlatformBrowser(this.platformId)) return;
    this.registerHotkeyListener();
  }

  // ── Public template handlers ─────────────────────────────────────────────

  onQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.setQuery(value);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveSelection(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveSelection(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.setSelectedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.setSelectedIndex(this.filteredSignal().length - 1);
        break;
      case 'Enter':
        event.preventDefault();
        this.invokeItem(this.selectedIndexSignal());
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  invokeItem(flatIndex: number): void {
    const item = this.filteredSignal()[flatIndex];
    if (!item || item.disabled) return;

    const cfg = this.config();
    const ctx = cfg.context;
    if (item.onSelect) {
      item.onSelect(ctx);
    } else {
      cfg.onSelect?.(item, ctx);
    }

    if (cfg.closeOnSelect !== false) {
      this.close();
    }
  }

  setSelectedIndex(index: number): void {
    const max = this.filteredSignal().length - 1;
    this.selectedIndexSignal.set(Math.max(-1, Math.min(max, index)));
  }

  // ── Controller-side actions ──────────────────────────────────────────────

  open(): void {
    if (this.openSignal()) return;
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
    this.openSignal.set(true);
    this.config().onOpen?.();
    queueMicrotask(() => this.searchInputRef()?.nativeElement.focus());
  }

  close(): void {
    if (!this.openSignal()) return;
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.openSignal.set(false);
    this.config().onClose?.();
  }

  toggle(): void {
    this.openSignal() ? this.close() : this.open();
  }

  setQuery(query: string): void {
    if (query === this.querySignal()) return;
    this.querySignal.set(query);

    // Reset selection to the first non-disabled item after the filter recomputes.
    // `untracked` since this is a write context; we just need to read the
    // (now-stale-but-fine) filteredSignal value lazily via Angular's signal
    // equality model — computeds re-evaluate on read.
    untracked(() => {
      const filtered = this.filteredSignal();
      const firstSelectable = filtered.findIndex((it) => !it.disabled);
      this.selectedIndexSignal.set(firstSelectable);
      this.config().onQueryChange?.(query, this.modeSignal());
    });
  }

  clear(): void {
    this.setQuery('');
  }

  /** Fires when the native `<dialog>` closes (Esc, backdrop click, etc.). */
  onDialogClose(): void {
    if (this.openSignal()) {
      this.openSignal.set(false);
      this.config().onClose?.();
    }
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private bindControllerHandlers(): void {
    const internal = this.config()._internal;
    if (!internal) return;

    this.unbindController = internal.bind({
      open: () => this.open(),
      close: () => this.close(),
      toggle: () => this.toggle(),
      setQuery: (q) => this.setQuery(q),
      clear: () => this.clear(),
    });

    this.destroyRef.onDestroy(() => {
      this.unbindController?.();
      this.unbindController = null;
    });
  }

  private registerHotkeyListener(): void {
    const cfg = this.config();
    const hotkey = cfg.hotkey ?? 'Mod+K';
    if (hotkey === false) return;

    const parsed = parseHotkey(hotkey);
    if (!parsed.key) return;

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!matchesHotkey(event, parsed)) return;

        const ownTarget = this.host.nativeElement.contains(event.target as Node);
        if (!ownTarget && isInTextEntry(event.target)) return;

        event.preventDefault();
        this.toggle();
      });
  }

  private runFilter(
    query: string,
    items: readonly CommandPaletteItem[],
    mode: CommandPaletteMode | null,
    strategy: CommandPaletteFilter,
  ): readonly CommandPaletteItem[] {
    if (typeof strategy === 'function') {
      return strategy(query, items, mode);
    }
    if (strategy === 'substring') {
      return substringFilter(query, items);
    }

    // Engine path. The handle indexes the *full* items list; mode-scoped
    // narrowing happens here via Set lookup, preserving the engine's
    // ranking inside whatever subset the active mode allows. The Set is
    // cached on `scopedItemsSetSignal` (rebuilt only when mode changes).
    const handle = this.engineHandleSignal();
    if (handle) {
      const allItems = this.config().items;
      const allowed = this.scopedItemsSetSignal();
      const matches = handle.search(query);
      const out: CommandPaletteItem[] = [];
      for (const m of matches) {
        const item = allItems[m.index];
        if (allowed === null || allowed.has(item)) out.push(item);
      }
      return out;
    }

    return this.fuseCache.search(query, items, ['label', 'description', 'keywords']);
  }

  private moveSelection(delta: number): void {
    const filtered = this.filteredSignal();
    if (filtered.length === 0) return;

    let next = this.selectedIndexSignal();
    for (let attempts = 0; attempts < filtered.length; attempts++) {
      next = (next + delta + filtered.length) % filtered.length;
      if (!filtered[next].disabled) break;
    }
    this.setSelectedIndex(next);
  }
}

/**
 * Combine the searchable fields of a palette item into a single haystack the
 * fuzzy engine can index. Newline separators discourage cross-field matching
 * without preventing it entirely (`nucleo-matcher` skips whitespace cheaply).
 */
function buildHaystack(item: CommandPaletteItem): string {
  const parts: string[] = [item.label];
  if (item.description) parts.push(item.description);
  if (item.keywords?.length) parts.push(item.keywords.join(' '));
  return parts.join('\n');
}
