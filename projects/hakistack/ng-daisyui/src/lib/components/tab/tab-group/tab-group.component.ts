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

  /** Whether keyboard navigation should wrap */
  wrap = input(true);

  readonly isVertical = computed(() => this.orientation() === 'vertical');

  /** Outer container — flex-row in vertical mode so tab list and panels sit side-by-side. */
  readonly containerClass = computed(() => (this.isVertical() ? 'flex flex-row gap-0' : ''));

  /** Tab list (role=tablist). Horizontal uses daisyUI tabs-lift; vertical stacks via flex-col. */
  readonly tabsStyleClass = computed(() =>
    this.isVertical() ? 'flex flex-col items-stretch min-w-fit' : `tabs ${this.theme.classes.tabsLift}`,
  );

  /** Per-tab button class. Vertical tabs lose the daisyUI `tab` lift visual. */
  readonly tabClass = computed(() =>
    this.isVertical() ? 'btn btn-ghost justify-start rounded-none border-l-2 border-transparent text-left whitespace-nowrap' : 'tab',
  );

  /** Active-tab class — switches by orientation since `tab-active` only styles the lift visual. */
  readonly activeTabClass = computed(() => (this.isVertical() ? 'bg-base-200 border-primary text-primary' : 'tab-active'));

  /** Panel container — border treatment differs by orientation. */
  readonly panelContainerClass = computed(() =>
    this.isVertical()
      ? 'bg-base-100 border-base-300 rounded-box flex-1 border border-l-0 rounded-l-none p-4'
      : 'bg-base-100 border-base-300 rounded-b-box border border-t-0 p-4',
  );

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
