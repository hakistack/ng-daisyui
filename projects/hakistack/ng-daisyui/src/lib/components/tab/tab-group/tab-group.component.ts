import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  model,
  AfterContentInit,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { TabPanelComponent } from '../tab-panel/tab-panel.component';
import { LucideIconComponent } from '../../lucide-icon/lucide-icon.component';
import { HK_THEME } from '../../../theme/theme.config';

@Component({
  selector: 'hk-tab-group',
  imports: [NgTemplateOutlet, LucideIconComponent, Tabs, TabList, Tab, TabPanel, TabContent],
  templateUrl: './tab-group.component.html',
  styleUrl: './tab-group.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabGroupComponent implements AfterContentInit {
  private readonly theme = inject(HK_THEME);
  readonly panels = contentChildren(TabPanelComponent);

  readonly tabsStyleClass = computed(() => `tabs ${this.theme.classes.tabsLift}`);

  /** The index of the initially active tab */
  activeIndex = input(0);

  /** Selection mode: 'follow' activates on focus, 'explicit' requires click/enter */
  selectionMode = input<'follow' | 'explicit'>('explicit');

  /** Orientation of the tab list */
  orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Whether keyboard navigation should wrap */
  wrap = input(true);

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
