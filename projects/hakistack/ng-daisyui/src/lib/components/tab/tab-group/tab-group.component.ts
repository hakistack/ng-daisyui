import { ChangeDetectionStrategy, Component, computed, contentChildren, inject, input, model, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { TabPanelComponent } from '../tab-panel/tab-panel.component';
import { HK_THEME } from '../../../theme/theme.config';

@Component({
  selector: 'hk-tab-group',
  imports: [CommonModule, Tabs, TabList, Tab, TabPanel, TabContent],
  templateUrl: './tab-group.component.html',
  styleUrl: './tab-group.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabGroupComponent implements AfterContentInit {
  private readonly theme = inject(HK_THEME);
  readonly panels = contentChildren(TabPanelComponent);

  /** The index of the initially active tab */
  activeIndex = input(0);

  /** Selection mode: 'follow' activates on focus, 'explicit' requires click/enter */
  selectionMode = input<'follow' | 'explicit'>('explicit');

  /** Orientation of the tab list */
  orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Visual variant of the tab list (horizontal mode):
   * - `'lift'` (default) — tabs attach to a content panel below, with the active tab "lifted" visually.
   * - `'box'` — pill/box-style tabs, panel sits in a bordered card below.
   * - `'border'` — minimal underline-style tabs with a panel below.
   *
   * In **vertical** mode, the variant is ignored — vertical tabs always use
   * the `tabs-box` style (the only daisyUI variant that translates cleanly
   * to a stacked layout). `lift` is horizontal-only by design; `border`
   * doesn't have a clean vertical analog.
   */
  variant = input<'lift' | 'box' | 'border'>('lift');

  /** Whether keyboard navigation should wrap */
  wrap = input(true);

  readonly isVertical = computed(() => this.orientation() === 'vertical');

  /** Outer container — flex-row in vertical mode so tab list and panels sit side-by-side. */
  readonly containerClass = computed(() => (this.isVertical() ? 'flex flex-row gap-3' : ''));

  /** Tab list (role=tablist). Vertical always uses tabs-box; horizontal uses the chosen variant. */
  readonly tabsStyleClass = computed(() => {
    if (this.isVertical()) {
      return `tabs ${this.theme.classes.tabsBox} flex-col items-stretch min-w-fit h-fit`;
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

  /** Per-tab button class. Both orientations use daisyUI's `tab` styling. */
  readonly tabClass = computed(() => (this.isVertical() ? 'tab justify-start text-left whitespace-nowrap' : 'tab'));

  /** Active-tab class — daisyUI's `tab-active` works in both orientations with the box variant. */
  readonly activeTabClass = computed(() => 'tab-active');

  /**
   * Panel container — uses daisyUI's `card` + theme-bridged `cardBorder` so
   * v4 / v5 class-name renames are handled by `HK_THEME`. Border / corner
   * treatment is adjusted per orientation and variant on top of the card
   * primitive (e.g. lift removes the top border so the panel attaches to
   * the lifted tabs).
   */
  readonly panelContainerClass = computed(() => {
    const cardBase = `card ${this.theme.classes.cardBorder} bg-base-100`;
    if (this.isVertical()) {
      // Vertical: card panel beside the box-styled tab list.
      return `${cardBase} flex-1 p-4`;
    }
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
    const active = this.selectedTab() === panel.value() ? ` ${this.activeTabClass()}` : '';
    const disabled = panel.disabled() ? ' tab-disabled' : '';
    return `${base}${active}${disabled}`;
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
