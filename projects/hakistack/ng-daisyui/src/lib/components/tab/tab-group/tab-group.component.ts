import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  isDevMode,
  model,
  AfterContentInit,
} from '@angular/core';
import { LUCIDE_ICONS, LucideDynamicIcon, type LucideIconData } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { TabPanelComponent } from '../tab-panel/tab-panel.component';
import { HK_THEME } from '../../../theme/theme.config';

/** `CreditCard` → `credit-card` (the key format `provideLucideIcons` registers). */
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

@Component({
  selector: 'hk-tab-group',
  imports: [CommonModule, LucideDynamicIcon, Tabs, TabList, Tab, TabPanel, TabContent],
  templateUrl: './tab-group.component.html',
  styleUrl: './tab-group.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabGroupComponent implements AfterContentInit {
  private readonly theme = inject(HK_THEME);
  /**
   * Name → icon registry filled by `provideLucideIcons(...)`. Looked up here (rather than handing the
   * name to `[lucideIcon]`, which throws for unknown names) so an unregistered icon can't break the page.
   */
  private readonly lucideIcons = inject(LUCIDE_ICONS, { optional: true }) ?? {};
  private readonly warnedIcons = new Set<string>();
  readonly panels = contentChildren(TabPanelComponent);

  /** The index of the initially active tab */
  activeIndex = input(0);

  /** Selection mode: 'follow' activates on focus, 'explicit' requires click/enter */
  selectionMode = input<'follow' | 'explicit'>('explicit');

  /** Orientation of the tab list */
  orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Visual variant of the tab list (horizontal mode only):
   * - `'lift'` (default) — tabs attach to a content panel below, with the active tab "lifted" visually.
   * - `'box'` — pill/box-style tabs, panel sits in a bordered card below.
   * - `'border'` — minimal underline-style tabs with a panel below.
   *
   * In **vertical** mode, the variant is ignored — vertical renders as a
   * unified card with a sidebar tab list and a content panel area. The
   * daisyUI tab variants (lift / box / border) are all horizontal-by-design
   * and don't translate cleanly to a side-by-side layout, so the vertical
   * mode uses its own sidebar pattern.
   */
  variant = input<'lift' | 'box' | 'border'>('lift');

  /** Whether keyboard navigation should wrap */
  wrap = input(true);

  readonly isVertical = computed(() => this.orientation() === 'vertical');

  /** Icon data for a panel's `icon` input, or `null` when unset / not registered. */
  tabIcon(panel: TabPanelComponent): LucideIconData | null {
    const icon = panel.icon();
    if (!icon) return null;
    if (typeof icon !== 'string') return icon;
    const resolved = this.lucideIcons[icon] ?? this.lucideIcons[toKebabCase(icon)] ?? null;
    if (!resolved && isDevMode() && !this.warnedIcons.has(icon)) {
      this.warnedIcons.add(icon);
      console.warn(`[hk-tab-group] Icon '${icon}' is not registered. Add it with provideLucideIcons(...).`);
    }
    return resolved;
  }

  /**
   * Outer container.
   * - Vertical: a single `card card-border` wrapping both the tab sidebar and
   *   the panel content area, so they read as one unified component (tab list
   *   on the left with a right-border separator, panel content on the right).
   * - Horizontal: bare wrapper; tab list and panel are styled independently.
   */
  readonly containerClass = computed(() =>
    this.isVertical() ? `card ${this.theme.classes.cardBorder} bg-base-100 flex flex-row overflow-hidden` : '',
  );

  /**
   * Tab list (role=tablist).
   * - Vertical: column sidebar with a right border separator inside the outer card.
   * - Horizontal: daisyUI tabs container with the chosen variant style.
   */
  readonly tabsStyleClass = computed(() => {
    if (this.isVertical()) {
      return 'flex flex-col gap-1 p-2 border-r border-base-300 min-w-fit';
    }
    return `tabs ${this.variantClass()}`;
  });

  private readonly variantClass = computed(() => {
    switch (this.variant()) {
      case 'box':
        return this.theme.classes.tabsBox;
      case 'border':
        return this.theme.classes.tabsBorder;
      case 'lift':
      default:
        return this.theme.classes.tabsLift;
    }
  });

  /**
   * Per-tab button base class.
   * - Vertical: `btn btn-ghost btn-sm` for sidebar-style buttons.
   * - Horizontal: daisyUI's `tab` class (works with all three variants).
   */
  readonly tabClass = computed(() => (this.isVertical() ? 'btn btn-ghost btn-sm justify-start text-left whitespace-nowrap' : 'tab'));

  /**
   * Active-tab class.
   * - Vertical: `btn-active` (daisyUI button active state).
   * - Horizontal: `tab-active` (daisyUI tab active state).
   */
  readonly activeTabClass = computed(() => (this.isVertical() ? 'btn-active' : 'tab-active'));

  /**
   * Panel content area.
   * - Vertical: takes remaining width inside the outer card with internal padding.
   * - Horizontal: standalone card with theme-bridged border, treatment varies by variant.
   */
  readonly panelContainerClass = computed(() => {
    if (this.isVertical()) {
      return 'flex-1 p-4';
    }
    const cardBase = `card ${this.theme.classes.cardBorder} bg-base-100`;
    // Horizontal lift: panel attaches to bottom of lifted tabs (flat top, no top border).
    if (this.variant() === 'lift') {
      return `${cardBase} rounded-t-none border-t-0 p-4`;
    }
    // Horizontal box / border: card with a small gap above the tabs.
    return `${cardBase} mt-2 p-4`;
  });

  /** Compose tab button classes for a given panel — base + active + disabled state. */
  tabButtonClass(panel: TabPanelComponent): string {
    const base = this.tabClass();
    const isActive = this.selectedTab() === panel.value();
    const active = isActive ? ` ${this.activeTabClass()}` : '';
    const disabled = panel.disabled() ? (this.isVertical() ? ' btn-disabled' : ' tab-disabled') : '';
    // daisyUI dims inactive tabs to ~50 % base-content (below 4.5:1 on light themes); keep them at the
    // library's muted-text minimum. Disabled tabs are exempt from contrast and keep daisyUI's look.
    const muted = !isActive && !panel.disabled() && !this.isVertical() ? ' text-base-content/70 hover:text-base-content' : '';
    return `${base}${active}${disabled}${muted}`;
  }

  /** The currently selected tab value */
  selectedTab = model<string | undefined>(undefined);

  ngAfterContentInit(): void {
    // Set initial selected tab based on activeIndex if selectedTab is not set
    if (this.selectedTab() === undefined) {
      const panelsArray = this.panels();
      if (panelsArray.length > 0) {
        const initialIndex = Math.min(this.activeIndex(), panelsArray.length - 1);
        this.selectedTab.set(panelsArray[initialIndex].value());
      }
    }
  }
}
