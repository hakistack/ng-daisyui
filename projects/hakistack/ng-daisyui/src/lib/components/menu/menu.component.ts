import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { LucideDynamicIcon } from '@lucide/angular';
import { collectGroupIds, findMenuItem, inferMenuItemKind, isLinkOnlyMenu, processMenuItems } from './menu.helpers';
import { MenuConfig, MenuExpandEvent, MenuItem, MenuItemKind, MenuOrientation, MenuSize } from './menu.types';

/**
 * `<hk-menu>` — a config-driven, recursive DaisyUI menu.
 *
 * Renders an arbitrary tree of {@link MenuItem}s vertically (sidebars) or
 * horizontally (navbars) from a single declarative config. Supports collapsible
 * submenus, accordion behaviour, router integration, icons/badges/shortcuts, a
 * generic visibility predicate, and an icon-only collapsed rail.
 *
 * Pass a {@link MenuConfig} via `[config]` (or build it with `createMenu()` for
 * imperative expand/collapse control), or the `items` shorthand for the common
 * case.
 *
 * @example
 * <hk-menu [config]="menu.config()" (itemSelect)="onSelect($event)" />
 */
// Literal class names: Tailwind only generates classes it finds as complete strings in the source
// (`menu-${size}` left menu-xs / menu-lg / menu-xl without CSS).
const MENU_SIZE_CLASSES: Readonly<Record<MenuSize, string>> = {
  xs: 'menu-xs',
  sm: 'menu-sm',
  md: 'menu-md',
  lg: 'menu-lg',
  xl: 'menu-xl',
};

/** True when `el` sits in the collapsed part of a `<details>` (its summary does not count). */
function insideClosedGroup(el: HTMLElement): boolean {
  const start = el.tagName === 'SUMMARY' ? el.parentElement?.parentElement : el.parentElement;
  for (let d = start?.closest('details'); d; d = d.parentElement?.closest('details')) {
    if (!d.open) return true;
  }
  return false;
}

@Component({
  selector: 'hk-menu',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, LucideDynamicIcon, CdkConnectedOverlay],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'hk-menu block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown)': 'onKeyDown($event)',
    '(focusin)': 'onFocusIn($event)',
  },
})
export class MenuComponent<T = unknown> {
  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Full menu configuration (preferred). */
  readonly config = input<MenuConfig<T> | null>(null);
  /** Shorthand for `config.items` when you don't need the other options. */
  readonly items = input<MenuItem<T>[] | null>(null);
  /** Overrides `config.orientation`. */
  readonly orientation = input<MenuOrientation | undefined>(undefined);
  /** Overrides `config.size`. */
  readonly size = input<MenuSize | undefined>(undefined);
  /** Icon-rail collapsed state (vertical only). Two-way bindable. */
  readonly collapsed = model<boolean | undefined>(undefined);
  /** Overrides `config.background` (e.g. `false` when embedded in a sidebar/navbar). */
  readonly background = input<boolean | string | undefined>(undefined);
  /** Overrides `config.rounded`. */
  readonly rounded = input<boolean | undefined>(undefined);

  /** Emitted when a leaf link/action item is activated (click or Enter). */
  readonly itemSelect = output<MenuItem<T>>();
  /** Emitted when a group is expanded/collapsed. */
  readonly expandedChange = output<MenuExpandEvent>();

  /** Per-group open state. Absent id falls back to the item's `expanded` flag. */
  private readonly toggles = signal<Map<string, boolean>>(new Map());

  /** Rail hover-flyout: the group whose children are shown, and its anchor element. */
  protected readonly flyoutGroup = signal<MenuItem<T> | null>(null);
  protected readonly flyoutOrigin = signal<HTMLElement | null>(null);
  private flyoutCloseTimer: ReturnType<typeof setTimeout> | null = null;

  /** Flyout opens to the right; flips to the left when there's no room. */
  protected readonly flyoutPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
  ];

  /** Merged config with defaults applied. */
  readonly resolvedConfig = computed<
    Required<Pick<MenuConfig<T>, 'items' | 'orientation' | 'size' | 'accordion' | 'closeOnOutsideClick' | 'submenuMode' | 'rounded'>> &
      MenuConfig<T>
  >(() => {
    const c = this.config() ?? ({} as MenuConfig<T>);
    const orientation = this.orientation() ?? c.orientation ?? 'vertical';
    const horizontal = orientation === 'horizontal';
    return {
      ...c,
      items: this.items() ?? c.items ?? [],
      orientation,
      size: this.size() ?? c.size ?? 'md',
      accordion: c.accordion ?? horizontal,
      closeOnOutsideClick: c.closeOnOutsideClick ?? horizontal,
      submenuMode: c.submenuMode ?? 'inline',
      rounded: this.rounded() ?? c.rounded ?? true,
      background: this.background() ?? c.background ?? true,
    };
  });

  /** Visible, id-assigned, pruned tree ready to render. */
  readonly processedItems = computed(() => processMenuItems(this.resolvedConfig().items));

  /** Navigation semantics (list of links) vs. an ARIA menu — see `MenuConfig.semantics`. */
  readonly isNavigation = computed(() => {
    const semantics = this.resolvedConfig().semantics ?? 'auto';
    return semantics === 'auto' ? isLinkOnlyMenu(this.processedItems()) : semantics === 'navigation';
  });
  /** `role` of interactive items and their `<li>`s (none in navigation semantics). */
  protected readonly itemRole = computed(() => (this.isNavigation() ? null : 'menuitem'));
  protected readonly noneRole = computed(() => (this.isNavigation() ? null : 'none'));

  /** The item holding the single Tab stop in menu semantics (roving tabindex). */
  private rovingItem: HTMLElement | null = null;

  /** Effective collapsed state (input overrides config). */
  readonly isRail = computed(() => {
    const collapsed = this.collapsed() ?? this.resolvedConfig().collapsed ?? false;
    return collapsed && this.resolvedConfig().orientation === 'vertical';
  });

  /** Classes for the root `<ul class="menu">`. */
  readonly menuClass = computed(() => {
    const cfg = this.resolvedConfig();
    const bg = cfg.background;
    const classes = [MENU_SIZE_CLASSES[cfg.size ?? 'md']];
    if (cfg.orientation === 'horizontal') classes.push('menu-horizontal');
    // Vertical menus fill their container so rows stretch full width (not ragged),
    // and in the rail so icons center instead of hugging the left edge.
    else classes.push('w-full');
    if (this.isRail()) classes.push('hk-menu-rail');
    if (cfg.rounded) classes.push('rounded-box');
    if (bg === true) classes.push('bg-base-200');
    else if (typeof bg === 'string') classes.push(bg);
    return classes.join(' ');
  });

  constructor() {
    // Bridge the createMenu() controller's imperative calls to this instance.
    effect((onCleanup) => {
      const api = this.resolvedConfig()._internal;
      if (!api) return;
      const unbind = api.bind({
        expand: (id) => this.setOpen(id, true),
        collapse: (id) => this.setOpen(id, false),
        toggle: (id) => this.toggleById(id),
        expandAll: () => this.expandAll(),
        collapseAll: () => this.collapseAll(),
      });
      onCleanup(unbind);
    });

    this.destroyRef.onDestroy(() => this.cancelFlyoutClose());

    // Menu semantics: exactly one menuitem is in the Tab order (APG roving tabindex). Re-applied after
    // every render that can add or reveal items (tree, open groups, rail, semantics).
    afterRenderEffect(() => {
      this.processedItems();
      this.toggles();
      this.isRail();
      this.applyRovingTabindex(this.isNavigation());
    });
  }

  /** Resolve the rendered kind of an item. */
  kindOf(item: MenuItem<T>): MenuItemKind {
    return inferMenuItemKind(item);
  }

  /** Whether a group is currently expanded. */
  isOpen(item: MenuItem<T>): boolean {
    const explicit = item.id ? this.toggles().get(item.id) : undefined;
    return explicit ?? !!item.expanded;
  }

  /** Classes applied to a submenu `<ul>` (horizontal dropdowns get a surface). */
  submenuClass(depth: number): string {
    return this.resolvedConfig().orientation === 'horizontal' && depth === 0 ? 'bg-base-100 rounded-box shadow-lg z-[1]' : '';
  }

  /** Sync open state when a `<details>` toggles, applying accordion behaviour. */
  onToggle(item: MenuItem<T>, open: boolean, siblings: MenuItem<T>[]): void {
    if (!item.id) return;
    if (this.isOpen(item) === open) return;
    this.toggles.update((prev) => {
      const next = new Map(prev);
      if (open && this.resolvedConfig().accordion) {
        for (const sib of siblings) {
          if (sib.id && sib.id !== item.id) next.set(sib.id, false);
        }
      }
      next.set(item.id!, open);
      return next;
    });
    this.expandedChange.emit({ id: item.id, expanded: open });
  }

  /** Activate a leaf item (link or action). Disabled items are ignored. */
  select(item: MenuItem<T>, event?: Event): void {
    if (item.disabled) {
      event?.preventDefault();
      return;
    }
    item.action?.(item);
    this.itemSelect.emit(item);
    this.closeFlyout();
  }

  // ── Rail hover-flyout ─────────────────────────────────────────────────────

  /** Open the flyout for a collapsed group (rail only) anchored to its trigger. */
  onGroupEnter(item: MenuItem<T>, event: Event): void {
    if (!this.isRail() || !item.children?.length) return;
    this.cancelFlyoutClose();
    const trigger = (event.currentTarget as HTMLElement)?.closest('li') as HTMLElement | null;
    this.flyoutOrigin.set(trigger ?? (event.currentTarget as HTMLElement));
    this.flyoutGroup.set(item);
  }

  /** Keep the flyout open while the pointer is over the panel. */
  onFlyoutEnter(): void {
    this.cancelFlyoutClose();
  }

  /** Close shortly after the pointer leaves the trigger or panel (bridges the gap). */
  onGroupLeave(): void {
    this.cancelFlyoutClose();
    this.flyoutCloseTimer = setTimeout(() => this.closeFlyout(), 120);
  }

  private cancelFlyoutClose(): void {
    if (this.flyoutCloseTimer) {
      clearTimeout(this.flyoutCloseTimer);
      this.flyoutCloseTimer = null;
    }
  }

  private closeFlyout(): void {
    this.cancelFlyoutClose();
    this.flyoutGroup.set(null);
    this.flyoutOrigin.set(null);
  }

  /**
   * Keyboard navigation (WAI-ARIA APG). Native activation (Enter, Space) comes from the underlying
   * `<a>` / `<button>` / `<summary>`.
   *
   * - Navigation semantics: Tab moves between links; only Escape is handled (closes the open group).
   * - Vertical menu: ↑ ↓ Home End move through the visible items, → opens a group and enters it,
   *   ← / Escape close the current group.
   * - Horizontal menubar: ← → Home End move between top-level items; ↓ (↑) opens a group on its first
   *   (last) item; inside a submenu ↑ ↓ move, Escape returns to the parent, ← → go to the neighbouring
   *   top-level item.
   */
  onKeyDown(event: KeyboardEvent): void {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape'];
    if (!keys.includes(event.key)) return;

    const active = document.activeElement as HTMLElement | null;
    if (event.key === 'Escape') {
      this.closeCurrent(event, active);
      return;
    }
    if (this.isNavigation()) return;

    if (this.resolvedConfig().orientation === 'horizontal') this.menubarKey(event, active);
    else this.verticalKey(event, active);
  }

  private verticalKey(event: KeyboardEvent, active: HTMLElement | null): void {
    const items = this.focusableItems();
    const idx = active ? items.indexOf(active) : -1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusAt(items, idx + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusAt(items, idx - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusAt(items, 0);
        break;
      case 'End':
        event.preventDefault();
        this.focusAt(items, items.length - 1);
        break;
      case 'ArrowRight':
        if (active?.tagName === 'SUMMARY') {
          event.preventDefault();
          this.openAndEnter(active, 'first');
        }
        break;
      case 'ArrowLeft':
        this.closeCurrent(event, active);
        break;
    }
  }

  private menubarKey(event: KeyboardEvent, active: HTMLElement | null): void {
    const top = this.topLevelItems();
    const topIdx = active ? top.indexOf(active) : -1;
    if (topIdx !== -1) {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          this.focusAt(top, topIdx + 1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.focusAt(top, topIdx - 1);
          break;
        case 'Home':
          event.preventDefault();
          this.focusAt(top, 0);
          break;
        case 'End':
          event.preventDefault();
          this.focusAt(top, top.length - 1);
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          if (active?.tagName === 'SUMMARY') {
            event.preventDefault();
            this.openAndEnter(active, event.key === 'ArrowDown' ? 'first' : 'last');
          }
          break;
      }
      return;
    }

    // Inside a submenu of the menubar.
    const submenu = active?.closest('ul[role="menu"]') as HTMLElement | null;
    if (!active || !submenu) return;
    const siblings = this.itemsIn(submenu);
    const idx = siblings.indexOf(active);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusAt(siblings, idx + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusAt(siblings, idx - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusAt(siblings, 0);
        break;
      case 'End':
        event.preventDefault();
        this.focusAt(siblings, siblings.length - 1);
        break;
      case 'ArrowRight':
        if (active.tagName === 'SUMMARY') {
          event.preventDefault();
          this.openAndEnter(active, 'first');
          break;
        }
        this.moveToNeighbourTop(event, active, top, 1);
        break;
      case 'ArrowLeft': {
        const parentDetails = active.closest('details');
        const nested = parentDetails?.parentElement?.closest('ul[role="menu"]');
        if (nested) this.closeCurrent(event, active);
        else this.moveToNeighbourTop(event, active, top, -1);
        break;
      }
    }
  }

  /** Close the group that contains `active` (or the open rail flyout) and focus its trigger. */
  private closeCurrent(event: KeyboardEvent, active: HTMLElement | null): void {
    if (event.key === 'Escape' && this.flyoutGroup()) {
      event.preventDefault();
      this.closeFlyout();
      return;
    }
    // On a summary of an open group, ← / Escape close that group; inside a group, its parent.
    const own = active?.tagName === 'SUMMARY' ? (active.parentElement as HTMLDetailsElement) : null;
    const details = own?.open ? own : (active?.closest('details[open]') as HTMLDetailsElement | null);
    if (details?.open) {
      event.preventDefault();
      details.open = false;
      details.querySelector<HTMLElement>(':scope > summary')?.focus();
    }
  }

  private openAndEnter(summary: HTMLElement, which: 'first' | 'last'): void {
    const details = summary.parentElement as HTMLDetailsElement;
    details.open = true;
    // The children render on open; focus once they are visible.
    queueMicrotask(() => {
      const submenu = details.querySelector<HTMLElement>(':scope > ul');
      const items = submenu ? this.itemsIn(submenu) : [];
      this.focusAt(items, which === 'first' ? 0 : items.length - 1);
    });
  }

  private moveToNeighbourTop(event: KeyboardEvent, active: HTMLElement, top: HTMLElement[], step: 1 | -1): void {
    const owner = top.find((t) => t.parentElement?.contains(active));
    if (!owner) return;
    event.preventDefault();
    const details = owner.parentElement as HTMLDetailsElement | null;
    if (details?.tagName === 'DETAILS') details.open = false;
    this.focusAt(top, top.indexOf(owner) + step);
  }

  /** Visible, enabled menuitems in DOM order (items inside closed groups are skipped). */
  private focusableItems(): HTMLElement[] {
    return this.visibleItems(this.hostRef.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }

  /** Top-level menuitems of the root menu / menubar. */
  private topLevelItems(): HTMLElement[] {
    const root = this.hostRef.nativeElement.querySelector<HTMLElement>(':scope > ul.menu');
    return root ? this.itemsIn(root) : [];
  }

  /** Menuitems that belong directly to `list` (not to a nested submenu). */
  private itemsIn(list: HTMLElement): HTMLElement[] {
    const own = Array.from(list.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
      (el) => el.closest('ul[role="menu"], ul[role="menubar"]') === list,
    );
    return this.visibleItems(own);
  }

  /** Enabled items that are not inside a closed group (a group's own summary stays reachable). */
  private visibleItems(items: Iterable<HTMLElement>): HTMLElement[] {
    return Array.from(items).filter(
      (el) => el.getAttribute('aria-disabled') !== 'true' && !(el as HTMLButtonElement).disabled && !insideClosedGroup(el),
    );
  }

  private focusAt(items: HTMLElement[], i: number): void {
    if (!items.length) return;
    items[(i + items.length) % items.length].focus();
  }

  /** Track the item that should keep the Tab stop. */
  onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (this.isNavigation() || target.getAttribute('role') !== 'menuitem') return;
    this.rovingItem = target;
    this.applyRovingTabindex(false);
  }

  private applyRovingTabindex(navigation: boolean): void {
    const all = Array.from(this.hostRef.nativeElement.querySelectorAll<HTMLElement>('a, button, summary'));
    if (navigation) {
      for (const el of all)
        if (el.dataset['hkRoving'] !== undefined) {
          el.removeAttribute('tabindex');
          delete el.dataset['hkRoving'];
        }
      return;
    }
    const items = all.filter((el) => el.getAttribute('role') === 'menuitem');
    const reachable = this.focusableItems();
    if (!this.rovingItem || !reachable.includes(this.rovingItem)) {
      this.rovingItem = (this.resolvedConfig().orientation === 'horizontal' ? this.topLevelItems()[0] : reachable[0]) ?? null;
    }
    for (const el of items) {
      el.setAttribute('tabindex', el === this.rovingItem ? '0' : '-1');
      el.dataset['hkRoving'] = '';
    }
  }

  /** Close all open submenus when clicking outside (horizontal/dropdown menus). */
  onDocumentClick(event: MouseEvent): void {
    if (!this.resolvedConfig().closeOnOutsideClick) return;
    const target = event.target;
    if (target instanceof Node && !this.hostRef.nativeElement.contains(target)) {
      this.collapseAll();
    }
  }

  // ── Imperative API (used by the createMenu controller bridge) ─────────────

  private setOpen(id: string, open: boolean): void {
    this.toggles.update((prev) => new Map(prev).set(id, open));
  }

  private toggleById(id: string): void {
    const found = findMenuItem(this.processedItems(), id);
    if (found) this.setOpen(id, !this.isOpen(found));
  }

  private expandAll(): void {
    const next = new Map<string, boolean>();
    for (const id of collectGroupIds(this.processedItems())) next.set(id, true);
    this.toggles.set(next);
  }

  private collapseAll(): void {
    const next = new Map<string, boolean>();
    for (const id of collectGroupIds(this.processedItems())) next.set(id, false);
    this.toggles.set(next);
  }
}
