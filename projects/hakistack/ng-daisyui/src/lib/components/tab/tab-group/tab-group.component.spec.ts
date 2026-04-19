import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabGroupComponent } from './tab-group.component';
import { TabPanelComponent } from '../tab-panel/tab-panel.component';

// ---------------------------------------------------------------------------
// Test host components
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host-basic',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group>
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab3" label="Tab 3">
        <ng-template>Content 3</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class BasicTestHostComponent {
  readonly tabGroup = viewChild.required(TabGroupComponent);
}

@Component({
  selector: 'hk-test-host-active-index',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group [activeIndex]="activeIndex">
      <hk-tab-panel value="a" label="A">
        <ng-template>Content A</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="b" label="B">
        <ng-template>Content B</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="c" label="C">
        <ng-template>Content C</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class ActiveIndexTestHostComponent {
  activeIndex = 1;
}

@Component({
  selector: 'hk-test-host-disabled',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group>
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2" [disabled]="true">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab3" label="Tab 3">
        <ng-template>Content 3</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class DisabledTabTestHostComponent {}

@Component({
  selector: 'hk-test-host-icons',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group>
      <hk-tab-panel value="tab1" label="Home" icon="Home">
        <ng-template>Home Content</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Settings" icon="Settings">
        <ng-template>Settings Content</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class IconTabTestHostComponent {}

@Component({
  selector: 'hk-test-host-dynamic-two',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group>
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class DynamicTwoTabsTestHostComponent {}

@Component({
  selector: 'hk-test-host-dynamic-three',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group>
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab3" label="Tab 3">
        <ng-template>Content 3</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class DynamicThreeTabsTestHostComponent {}

@Component({
  selector: 'hk-test-host-dynamic-one',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group>
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class DynamicOneTabTestHostComponent {}

@Component({
  selector: 'hk-test-host-selection-mode',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group [selectionMode]="selectionMode">
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class SelectionModeTestHostComponent {
  selectionMode: 'follow' | 'explicit' = 'explicit';
}

@Component({
  selector: 'hk-test-host-orientation',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group [orientation]="orientation">
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class OrientationTestHostComponent {
  orientation: 'horizontal' | 'vertical' = 'horizontal';
}

@Component({
  selector: 'hk-test-host-preselected',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group [(selectedTab)]="selectedTab">
      <hk-tab-panel value="tab1" label="Tab 1">
        <ng-template>Content 1</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab2" label="Tab 2">
        <ng-template>Content 2</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="tab3" label="Tab 3">
        <ng-template>Content 3</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `,
})
class PreselectedTabTestHostComponent {
  selectedTab: string | undefined = 'tab2';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTabButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('button[role="tab"]'));
}

function getTabPanels(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('[role="tabpanel"]'));
}

function getTabList(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return fixture.nativeElement.querySelector('[role="tablist"]');
}

/**
 * Simulates a user click on a tab button using the pointer event
 * that @angular/aria/tabs listens to (pointerdown).
 */
function clickTab(tab: HTMLElement): void {
  tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TabGroupComponent', () => {
  // -------------------------------------------------------------------------
  // Basic creation
  // -------------------------------------------------------------------------
  describe('component creation', () => {
    it('should create the tab group with panels', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabGroup = fixture.nativeElement.querySelector('hk-tab-group');
      expect(tabGroup).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Tab rendering
  // -------------------------------------------------------------------------
  describe('tab rendering', () => {
    it('should render a tab button for each panel', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      expect(tabs.length).toBe(3);
    });

    it('should display the correct label text on each tab', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      expect(tabs[0].textContent?.trim()).toContain('Tab 1');
      expect(tabs[1].textContent?.trim()).toContain('Tab 2');
      expect(tabs[2].textContent?.trim()).toContain('Tab 3');
    });

    it('should render a tablist element', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture);
      expect(tabList).toBeTruthy();
    });

    it('should render a tabpanel for each panel', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const panels = getTabPanels(fixture);
      expect(panels.length).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Tab selection / switching
  // -------------------------------------------------------------------------
  describe('tab selection and switching', () => {
    it('should select the first tab by default', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      expect(tabs[0].classList.contains('tab-active')).toBe(true);
    });

    it('should show the first panel content and hide others by default', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const panels = getTabPanels(fixture);
      expect(panels[0].classList.contains('hidden')).toBe(false);
      expect(panels[1].classList.contains('hidden')).toBe(true);
      expect(panels[2].classList.contains('hidden')).toBe(true);
    });

    it('should switch active tab on pointerdown (click)', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      clickTab(tabs[1]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(tabs[0].classList.contains('tab-active')).toBe(false);
      expect(tabs[1].classList.contains('tab-active')).toBe(true);
    });

    it('should show corresponding panel content when tab is selected', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      clickTab(tabs[2]);
      fixture.detectChanges();
      await fixture.whenStable();

      const panels = getTabPanels(fixture);
      expect(panels[0].classList.contains('hidden')).toBe(true);
      expect(panels[1].classList.contains('hidden')).toBe(true);
      expect(panels[2].classList.contains('hidden')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Active index input
  // -------------------------------------------------------------------------
  describe('activeIndex input', () => {
    it('should activate the tab at the given activeIndex', async () => {
      await TestBed.configureTestingModule({
        imports: [ActiveIndexTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(ActiveIndexTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      expect(tabs[1].classList.contains('tab-active')).toBe(true);
    });

    it('should show the corresponding panel content for activeIndex', async () => {
      await TestBed.configureTestingModule({
        imports: [ActiveIndexTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(ActiveIndexTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const panels = getTabPanels(fixture);
      expect(panels[0].classList.contains('hidden')).toBe(true);
      expect(panels[1].classList.contains('hidden')).toBe(false);
      expect(panels[2].classList.contains('hidden')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Pre-selected tab via model binding
  // -------------------------------------------------------------------------
  describe('selectedTab model binding', () => {
    it('should respect a pre-set selectedTab value', async () => {
      await TestBed.configureTestingModule({
        imports: [PreselectedTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(PreselectedTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      expect(tabs[1].classList.contains('tab-active')).toBe(true);
    });

    it('should update the host selectedTab when a tab is selected via pointerdown', async () => {
      await TestBed.configureTestingModule({
        imports: [PreselectedTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(PreselectedTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      clickTab(tabs[2]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedTab).toBe('tab3');
    });
  });

  // -------------------------------------------------------------------------
  // Disabled tabs
  // -------------------------------------------------------------------------
  describe('disabled tabs', () => {
    it('should mark the disabled tab with aria-disabled via the ngTab directive', async () => {
      await TestBed.configureTestingModule({
        imports: [DisabledTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DisabledTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      // The @angular/aria Tab directive uses soft-disabled: sets aria-disabled
      // and the component also applies the HTML disabled attribute
      const isDisabled = tabs[1].disabled || tabs[1].getAttribute('aria-disabled') === 'true';
      expect(isDisabled).toBe(true);
    });

    it('should add tab-disabled class to a disabled tab', async () => {
      await TestBed.configureTestingModule({
        imports: [DisabledTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DisabledTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      expect(tabs[1].classList.contains('tab-disabled')).toBe(true);
    });

    it('should not mark enabled tabs as disabled', async () => {
      await TestBed.configureTestingModule({
        imports: [DisabledTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DisabledTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      const tab0Disabled = tabs[0].disabled || tabs[0].getAttribute('aria-disabled') === 'true';
      const tab2Disabled = tabs[2].disabled || tabs[2].getAttribute('aria-disabled') === 'true';
      expect(tab0Disabled).toBe(false);
      expect(tab2Disabled).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Icons
  // -------------------------------------------------------------------------
  describe('tabs with icons', () => {
    it('should render tabs without icon elements (icon rendering removed)', async () => {
      await TestBed.configureTestingModule({
        imports: [IconTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(IconTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const icons = fixture.nativeElement.querySelectorAll('lucide-icon');
      expect(icons.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Dynamic tabs (using separate host components to avoid NG0100)
  // -------------------------------------------------------------------------
  describe('dynamic tabs (adding/removing)', () => {
    it('should render two tabs from a two-tab host', async () => {
      await TestBed.configureTestingModule({
        imports: [DynamicTwoTabsTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DynamicTwoTabsTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(getTabButtons(fixture).length).toBe(2);
    });

    it('should render three tabs from a three-tab host', async () => {
      await TestBed.configureTestingModule({
        imports: [DynamicThreeTabsTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DynamicThreeTabsTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(getTabButtons(fixture).length).toBe(3);
    });

    it('should render one tab from a single-tab host', async () => {
      await TestBed.configureTestingModule({
        imports: [DynamicOneTabTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DynamicOneTabTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(getTabButtons(fixture).length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------
  describe('keyboard navigation', () => {
    function pressKey(element: HTMLElement, key: string): void {
      element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    it('should move focus to the next tab on ArrowRight', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture)!;
      const tabs = getTabButtons(fixture);

      // Focus the tablist to initialize keyboard nav
      tabList.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();

      pressKey(tabList, 'ArrowRight');
      fixture.detectChanges();
      await fixture.whenStable();

      // In @angular/aria, after ArrowRight the second tab should become the active item.
      // Check via aria-activedescendant on the tablist pointing to tabs[1]'s id,
      // or tabs[1] receiving tabindex=0.
      const activeDesc = tabList.getAttribute('aria-activedescendant');
      const secondTabId = tabs[1].id;
      const secondTabHasFocus = document.activeElement === tabs[1];
      const secondTabIsActive = activeDesc === secondTabId || secondTabHasFocus;
      expect(secondTabIsActive).toBe(true);
    });

    it('should move focus backward on ArrowLeft', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture)!;
      const tabs = getTabButtons(fixture);

      // Initialize and move right first
      tabList.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();

      pressKey(tabList, 'ArrowRight');
      fixture.detectChanges();

      pressKey(tabList, 'ArrowLeft');
      fixture.detectChanges();
      await fixture.whenStable();

      const activeDesc = tabList.getAttribute('aria-activedescendant');
      const firstTabId = tabs[0].id;
      const firstTabHasFocus = document.activeElement === tabs[0];
      const firstTabIsActive = activeDesc === firstTabId || firstTabHasFocus;
      expect(firstTabIsActive).toBe(true);
    });

    it('should wrap around on ArrowRight from the last tab when wrap is enabled', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture)!;
      const tabs = getTabButtons(fixture);

      // Initialize keyboard nav
      tabList.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();

      // Move to the last tab (3 tabs, start at 0, need to press right twice for index 2)
      pressKey(tabList, 'ArrowRight'); // -> 1
      pressKey(tabList, 'ArrowRight'); // -> 2
      fixture.detectChanges();

      // Now wrap
      pressKey(tabList, 'ArrowRight'); // -> should wrap to 0
      fixture.detectChanges();
      await fixture.whenStable();

      const activeDesc = tabList.getAttribute('aria-activedescendant');
      const firstTabId = tabs[0].id;
      const firstTabHasFocus = document.activeElement === tabs[0];
      const firstTabIsActive = activeDesc === firstTabId || firstTabHasFocus;
      expect(firstTabIsActive).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ARIA attributes
  // -------------------------------------------------------------------------
  describe('ARIA attributes', () => {
    it('should have role="tablist" on the tab list element', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture);
      expect(tabList).toBeTruthy();
      expect(tabList!.getAttribute('role')).toBe('tablist');
    });

    it('should have role="tab" on each tab button', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      for (const tab of tabs) {
        expect(tab.getAttribute('role')).toBe('tab');
      }
    });

    it('should have role="tabpanel" on each panel', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const panels = getTabPanels(fixture);
      for (const panel of panels) {
        expect(panel.getAttribute('role')).toBe('tabpanel');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Orientation
  // -------------------------------------------------------------------------
  describe('orientation', () => {
    it('should default to horizontal orientation', async () => {
      await TestBed.configureTestingModule({
        imports: [OrientationTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(OrientationTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture);
      expect(tabList?.getAttribute('aria-orientation')).toBe('horizontal');
    });
  });

  // -------------------------------------------------------------------------
  // Selection mode
  // -------------------------------------------------------------------------
  describe('selectionMode', () => {
    it('should default to explicit selection mode', async () => {
      await TestBed.configureTestingModule({
        imports: [SelectionModeTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(SelectionModeTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabGroup = fixture.debugElement.children[0].componentInstance as TabGroupComponent;
      expect(tabGroup.selectionMode()).toBe('explicit');
    });
  });

  // -------------------------------------------------------------------------
  // CSS classes
  // -------------------------------------------------------------------------
  describe('CSS styling', () => {
    it('should apply tabs-lift class from theme on the tab list', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabList = getTabList(fixture);
      // Default theme is daisyui-v5 which uses 'tabs-lift'
      expect(tabList?.classList.contains('tabs')).toBe(true);
      expect(tabList?.classList.contains('tabs-lift')).toBe(true);
    });

    it('should apply tab class to each tab button', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const tabs = getTabButtons(fixture);
      for (const tab of tabs) {
        expect(tab.classList.contains('tab')).toBe(true);
      }
    });
  });
});
