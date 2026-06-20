import {
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
import { collectGroupIds, findMenuItem, inferMenuItemKind, processMenuItems } from './menu.helpers';
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

  /** Effective collapsed state (input overrides config). */
  readonly isRail = computed(() => {
    const collapsed = this.collapsed() ?? this.resolvedConfig().collapsed ?? false;
    return collapsed && this.resolvedConfig().orientation === 'vertical';
  });

  /** Classes for the root `<ul class="menu">`. */
  readonly menuClass = computed(() => {
    const cfg = this.resolvedConfig();
    const bg = cfg.background;
    const classes = [`menu-${cfg.size}`];
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
   * Keyboard navigation. Native focus/activation (Tab, Enter, Space) is handled
   * by the underlying `<a>`/`<button>`/`<summary>` elements; this adds roving
   * arrow-key movement, Home/End, and Escape/Left to close an open submenu.
   */
  onKeyDown(event: KeyboardEvent): void {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape'];
    if (!keys.includes(event.key)) return;

    const items = this.focusableItems();
    const active = document.activeElement as HTMLElement | null;
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
      case 'ArrowRight': {
        const summary = active?.closest('summary');
        const details = summary?.parentElement as HTMLDetailsElement | undefined;
        if (summary && details && !details.open) {
          event.preventDefault();
          details.open = true;
        }
        break;
      }
      case 'ArrowLeft':
      case 'Escape': {
        if (event.key === 'Escape' && this.flyoutGroup()) {
          event.preventDefault();
          this.closeFlyout();
          break;
        }
        const details = active?.closest('details') as HTMLDetailsElement | null;
        if (details?.open) {
          event.preventDefault();
          details.open = false;
          details.querySelector<HTMLElement>('summary')?.focus();
        }
        break;
      }
    }
  }

  /** Visible, enabled menuitems in DOM order (items inside closed groups are skipped). */
  private focusableItems(): HTMLElement[] {
    const all = this.hostRef.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]');
    return Array.from(all).filter(
      (el) => el.getAttribute('aria-disabled') !== 'true' && !(el as HTMLButtonElement).disabled && el.offsetParent !== null,
    );
  }

  private focusAt(items: HTMLElement[], i: number): void {
    if (!items.length) return;
    items[(i + items.length) % items.length].focus();
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
