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
 * / `createPdfViewer`):
 * - `[config]` — pass `controller.config()` from a `createCommandPalette({...})`
 *   call. All items, groups, modes, hotkey, and callbacks live there.
 * - Imperative actions (`open`, `close`, `toggle`, `setQuery`, `clear`)
 *   live on the controller — no `@ViewChild` needed.
 *
 * @example
 * // class:
 * palette = createCommandPalette({
 *   items: [
 *     { id: 'p1', label: 'Website Redesign', group: 'projects', onSelect: () => goto('/p1') },
 *     { id: 'u1', label: 'Leslie Alexander', avatar: '/leslie.jpg', group: 'users', onSelect: () => goto('/u1') },
 *   ],
 *   groups: [{ id: 'projects', label: 'Projects' }, { id: 'users', label: 'Users' }],
 *   modes: [
 *     { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Projects' },
 *     { prefix: '>', filterGroups: ['users'], indicatorLabel: 'Users' },
 *     { prefix: '?', layout: 'help', helpText: 'Use # for projects, > for users.' },
 *   ],
 * });
 *
 * // template:
 * // <hk-command-palette [config]="palette.config()" />
 * // <button (click)="palette.open()">Open</button>
 *
 * // anywhere:
 * // this.palette.open();
 * // this.palette.setQuery('#design');
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

  // ── Refs ─────────────────────────────────────────────────────────────────

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  // ── State ────────────────────────────────────────────────────────────────

  /** Local writable mirror of the controller's state signal — kept in sync via the internal bridge. */
  private readonly localState = signal<CommandPaletteState>({
    open: false,
    query: '',
    mode: null,
    selectedIndex: -1,
    filtered: [],
  });

  readonly state = this.localState.asReadonly();

  /** Labels with consumer overrides applied; falls back to English defaults. */
  readonly labels = computed<ResolvedCommandPaletteLabels>(() => ({
    ...DEFAULT_COMMAND_PALETTE_LABELS,
    ...this.userLabels,
  }));

  // ── Derived render data ──────────────────────────────────────────────────

  /**
   * Items grouped for rendering. Each item carries its `flatIndex` (position
   * in `state().filtered`) so the template can mark the active row via
   * `selectedIndex` without nested loops.
   */
  readonly groupedResults = computed<readonly RenderedGroup[]>(() => {
    const filtered = this.state().filtered;
    if (filtered.length === 0) return [];

    const groupDefs = this.config().groups ?? [];
    const groupLabel = new Map<string, string>();
    for (const g of groupDefs) groupLabel.set(g.id, g.label);

    const buckets = new Map<string, { item: CommandPaletteItem; flatIndex: number }[]>();
    filtered.forEach((item, flatIndex) => {
      const id = item.group ?? IMPLICIT_GROUP_ID;
      const bucket = buckets.get(id) ?? [];
      bucket.push({ item, flatIndex });
      buckets.set(id, bucket);
    });

    // Preserve declared group order; append the implicit group last.
    const result: RenderedGroup[] = [];
    for (const g of groupDefs) {
      const items = buckets.get(g.id);
      if (items?.length) result.push({ id: g.id, label: g.label, items });
    }
    const implicitItems = buckets.get(IMPLICIT_GROUP_ID);
    if (implicitItems?.length) result.push({ id: IMPLICIT_GROUP_ID, label: '', items: implicitItems });
    return result;
  });

  /** True when the help panel should render instead of the result list. */
  readonly showHelp = computed(() => this.state().mode?.layout === 'help');

  /** True when neither help nor results render — empty state. */
  readonly showEmpty = computed(() => !this.showHelp() && this.state().filtered.length === 0 && this.state().query.length > 0);

  // ── Internals ────────────────────────────────────────────────────────────

  private readonly fuseCache = createFuseCache<CommandPaletteItem>();
  private unbindController: (() => void) | null = null;

  constructor() {
    // Sync our local state up to the controller's writable signal so
    // consumers reading `palette.state()` get the live values.
    effect(() => {
      const cfg = this.config();
      const state = this.localState();
      cfg._internal?.state.set(state);
    });

    // Recompute filtered + mode whenever query or config changes.
    effect(() => {
      const cfg = this.config();
      const query = this.localState().query;
      untracked(() => this.recomputeFiltered(cfg, query));
    });
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
        this.setSelectedIndex(this.state().filtered.length - 1);
        break;
      case 'Enter':
        event.preventDefault();
        this.invokeItem(this.state().selectedIndex);
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  invokeItem(flatIndex: number): void {
    const item = this.state().filtered[flatIndex];
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
    const max = this.state().filtered.length - 1;
    const clamped = Math.max(-1, Math.min(max, index));
    this.localState.update((s) => ({ ...s, selectedIndex: clamped }));
  }

  // ── Controller-side actions (also called via the internal bridge) ────────

  open(): void {
    if (this.localState().open) return;
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
    this.localState.update((s) => ({ ...s, open: true }));
    this.config().onOpen?.();
    // Focus the search input on next frame so the dialog has time to render.
    queueMicrotask(() => this.searchInputRef()?.nativeElement.focus());
  }

  close(): void {
    if (!this.localState().open) return;
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.localState.update((s) => ({ ...s, open: false }));
    this.config().onClose?.();
  }

  toggle(): void {
    this.localState().open ? this.close() : this.open();
  }

  setQuery(query: string): void {
    if (query === this.localState().query) return;
    this.localState.update((s) => ({ ...s, query }));
  }

  clear(): void {
    this.setQuery('');
  }

  /** Fires when the native `<dialog>` closes (Esc key, backdrop click, etc.). */
  onDialogClose(): void {
    if (this.localState().open) {
      this.localState.update((s) => ({ ...s, open: false }));
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

        // Always intercept when the palette is already focused (user could
        // be in our own search input and presses Mod+K to close).
        const ownTarget = this.host.nativeElement.contains(event.target as Node);

        // Otherwise skip if the user is typing in some other field — don't
        // hijack typing.
        if (!ownTarget && isInTextEntry(event.target)) return;

        event.preventDefault();
        this.toggle();
      });
  }

  private recomputeFiltered(cfg: CommandPaletteConfig, rawQuery: string): void {
    const items = cfg.items;
    const modes = cfg.modes ?? [];

    // Resolve mode by prefix.
    let mode: CommandPaletteMode | null = null;
    let strippedQuery = rawQuery;
    for (const m of modes) {
      if (rawQuery.startsWith(m.prefix)) {
        mode = m;
        strippedQuery = rawQuery.slice(m.prefix.length).trimStart();
        break;
      }
    }

    // Help mode always renders the help panel — no filter work needed.
    if (mode?.layout === 'help') {
      this.localState.update((s) => ({ ...s, mode, filtered: [], selectedIndex: -1 }));
      cfg.onQueryChange?.(rawQuery, mode);
      return;
    }

    // Restrict by mode's group whitelist.
    const groupScoped = mode?.filterGroups ? items.filter((it) => it.group && mode.filterGroups!.includes(it.group)) : items;

    let filtered: readonly CommandPaletteItem[];

    if (!strippedQuery.trim()) {
      // Empty query: with a prefix, show everything in scope; without, show nothing.
      filtered = mode ? groupScoped : [];
    } else {
      filtered = this.runFilter(strippedQuery.trim(), groupScoped, mode, cfg.filter ?? 'fuzzy');
    }

    // Reset selection — first non-disabled item, or -1.
    const firstSelectable = filtered.findIndex((it) => !it.disabled);
    this.localState.update((s) => ({
      ...s,
      mode,
      filtered,
      selectedIndex: firstSelectable,
    }));
    cfg.onQueryChange?.(rawQuery, mode);
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
    // Fuzzy via the shared FuseCache helper. Keys cover the searchable surface;
    // the cache invalidates automatically when items ref or keys change.
    return this.fuseCache.search(query, items, ['label', 'description', 'keywords']);
  }

  private moveSelection(delta: number): void {
    const filtered = this.state().filtered;
    if (filtered.length === 0) return;

    let next = this.state().selectedIndex;
    // Skip disabled items in either direction.
    for (let attempts = 0; attempts < filtered.length; attempts++) {
      next = (next + delta + filtered.length) % filtered.length;
      if (!filtered[next].disabled) break;
    }
    this.setSelectedIndex(next);
  }

  /** Theme-bridged class for the modal-box card — public so the template can read it. */
  readonly panelClass = computed(
    () => `modal-box w-full max-w-2xl p-0 max-h-[80vh] overflow-hidden flex flex-col ${this.theme.classes.cardBorder}`,
  );
}
