import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { SelectComponent, SelectOption } from './select.component';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPTIONS: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

const DISABLED_OPTIONS: SelectOption[] = [
  { value: 'a', label: 'Enabled A' },
  { value: 'b', label: 'Disabled B', disabled: true },
  { value: 'c', label: 'Enabled C' },
];

const GROUPED_OPTIONS: SelectOption[] = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
];

function queryAll(fixture: ComponentFixture<unknown>, selector: string): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll(selector));
}

function query(fixture: ComponentFixture<unknown>, selector: string): HTMLElement | null {
  return fixture.nativeElement.querySelector(selector);
}

/** Open the dropdown by clicking the main input container. */
function openDropdown(fixture: ComponentFixture<SelectComponent>): void {
  const inputDiv = fixture.nativeElement.querySelector('.input') as HTMLElement;
  inputDiv.click();
  fixture.detectChanges();
}

/**
 * Simulate a keyboard event by calling the component handler directly.
 * Document listeners are added inside requestAnimationFrame, which does not
 * fire synchronously in tests, so we bypass that by invoking the handler.
 */
function pressKey(component: SelectComponent, key: string): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  component.onDocumentKeydown(event);
}

// ---------------------------------------------------------------------------
// Test-host for ControlValueAccessor / FormControl integration
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host',
  imports: [SelectComponent, ReactiveFormsModule],
  template: `
    <hk-select
      [options]="options()"
      [multiple]="multiple()"
      [formControl]="control"
    />
  `,
})
class TestHostComponent {
  readonly control = new FormControl<string | string[] | null>(null);
  readonly options = signal<SelectOption[]>(MOCK_OPTIONS);
  readonly multiple = signal(false);
}

// ---------------------------------------------------------------------------
// Global stubs for APIs not implemented in the test DOM environment
// ---------------------------------------------------------------------------

beforeAll(() => {
  // scrollIntoView is not implemented in Happy-DOM / JSDOM
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = function () {
      /* noop */
    };
  }
});

// ===========================================================================
// Tests
// ===========================================================================

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // Component creation
  // -------------------------------------------------------------------------

  describe('creation', () => {
    it('should create the component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have default input values', () => {
      fixture.detectChanges();

      expect(component.placeholder()).toBe('Select an option');
      expect(component.searchPlaceholder()).toBe('Search options...');
      expect(component.allowClear()).toBe(true);
      expect(component.disabled()).toBe(false);
      expect(component.multiple()).toBe(false);
      expect(component.enableSearch()).toBe(false);
      expect(component.virtualScroll()).toBe(false);
      expect(component.size()).toBe('md');
      expect(component.color()).toBeNull();
      expect(component.options()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Placeholder display
  // -------------------------------------------------------------------------

  describe('placeholder', () => {
    it('should render the default placeholder when no selection', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();

      const input = query(fixture, 'input[type="text"]') as HTMLInputElement;
      expect(input.placeholder).toBe('Select an option');
    });

    it('should render a custom placeholder', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('placeholder', 'Pick a fruit');
      fixture.detectChanges();

      const input = query(fixture, 'input[type="text"]') as HTMLInputElement;
      expect(input.placeholder).toBe('Pick a fruit');
    });
  });

  // -------------------------------------------------------------------------
  // Options rendering and single select
  // -------------------------------------------------------------------------

  describe('options rendering & single select', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('should render options in the dropdown list', () => {
      openDropdown(fixture);
      const items = queryAll(fixture, '[role="option"]');
      expect(items.length).toBe(MOCK_OPTIONS.length);
    });

    it('should display option labels', () => {
      openDropdown(fixture);
      const buttons = queryAll(fixture, '[role="option"] button');
      const labels = buttons.map(b => b.textContent?.trim());
      expect(labels).toEqual(MOCK_OPTIONS.map(o => o.label));
    });

    it('should select an option on click and close dropdown', () => {
      openDropdown(fixture);
      const buttons = queryAll(fixture, '[role="option"] button');
      buttons[1].click();
      fixture.detectChanges();

      expect(component.selectedOption()?.value).toBe('banana');
      expect(component.dropdownOpen()).toBe(false);

      const input = query(fixture, 'input[type="text"]') as HTMLInputElement;
      expect(input.value).toBe('Banana');
    });

    it('should emit selectionChange on selection', () => {
      const spy = vi.fn();
      component.selectionChange.subscribe(spy);

      openDropdown(fixture);
      const buttons = queryAll(fixture, '[role="option"] button');
      buttons[0].click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(MOCK_OPTIONS[0]);
    });

    it('should mark the selected option with aria-selected', () => {
      component.selectOption(MOCK_OPTIONS[2]);
      fixture.detectChanges();

      openDropdown(fixture);
      const items = queryAll(fixture, '[role="option"]');
      const selectedItem = items[2];
      expect(selectedItem.getAttribute('aria-selected')).toBe('true');

      const unselectedItem = items[0];
      expect(unselectedItem.getAttribute('aria-selected')).toBe('false');
    });

    it('should not select a disabled option', () => {
      fixture.componentRef.setInput('options', DISABLED_OPTIONS);
      fixture.detectChanges();

      openDropdown(fixture);
      const buttons = queryAll(fixture, '[role="option"] button');

      // The disabled option button should be disabled
      expect(buttons[1].hasAttribute('disabled')).toBe(true);

      // Attempt to select via component method
      component.selectOption(DISABLED_OPTIONS[1]);
      fixture.detectChanges();
      expect(component.selectedOption()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Dropdown toggle
  // -------------------------------------------------------------------------

  describe('dropdown toggle', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('should open the dropdown on click', () => {
      expect(component.dropdownOpen()).toBe(false);
      openDropdown(fixture);
      expect(component.dropdownOpen()).toBe(true);
    });

    it('should close the dropdown when an option is selected', () => {
      openDropdown(fixture);
      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should emit dropdownToggle when opened and closed', () => {
      const spy = vi.fn();
      component.dropdownToggle.subscribe(spy);

      openDropdown(fixture);
      expect(spy).toHaveBeenCalledWith(true);

      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();
      expect(spy).toHaveBeenCalledWith(false);
    });

    it('should not open when disabled via input', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      openDropdown(fixture);
      expect(component.dropdownOpen()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Clear functionality
  // -------------------------------------------------------------------------

  describe('clear selection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('allowClear', true);
      fixture.detectChanges();
    });

    it('should show clear button when an option is selected', () => {
      expect(query(fixture, '[aria-label="Clear selection"]')).toBeNull();

      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      expect(query(fixture, '[aria-label="Clear selection"]')).not.toBeNull();
    });

    it('should clear selection when clear button is clicked', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      const clearBtn = query(fixture, '[aria-label="Clear selection"]') as HTMLButtonElement;
      clearBtn.click();
      fixture.detectChanges();

      expect(component.selectedOption()).toBeNull();
      expect(component.hasSelection()).toBe(false);
    });

    it('should emit null on clear', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      const spy = vi.fn();
      component.selectionChange.subscribe(spy);

      const clearBtn = query(fixture, '[aria-label="Clear selection"]') as HTMLButtonElement;
      clearBtn.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(null);
    });

    it('should not show clear button when allowClear is false', () => {
      fixture.componentRef.setInput('allowClear', false);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      expect(query(fixture, '[aria-label="Clear selection"]')).toBeNull();
    });

    it('should not clear when disabled via input', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      // Call clearSelection directly with a mock event
      const event = new MouseEvent('click');
      component.clearSelection(event);
      fixture.detectChanges();

      expect(component.selectedOption()?.value).toBe('apple');
    });
  });

  // -------------------------------------------------------------------------
  // Disabled state (via input signal)
  // -------------------------------------------------------------------------

  describe('disabled state', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
    });

    it('should have disabled input', () => {
      const input = query(fixture, 'input[type="text"]') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('should not toggle dropdown', () => {
      component.toggleDropdown();
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should not select options', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      expect(component.selectedOption()).toBeNull();
    });

    it('should reflect isDisabled computed', () => {
      expect(component.isDisabled()).toBe(true);
    });

    it('should not clear selection', () => {
      // Set disabled to false first so we can select, then re-enable
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const event = new MouseEvent('click');
      component.clearSelection(event);
      expect(component.selectedOption()?.value).toBe('apple');
    });

    it('should not select all in multi-select mode', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.selectAll();
      expect(component.selectedOptions().length).toBe(0);
    });

    it('should not deselect all in multi-select mode', () => {
      // Enable, select, then disable
      fixture.componentRef.setInput('disabled', false);
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      component.deselectAll();
      expect(component.selectedOptions().length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Search / filtering
  // -------------------------------------------------------------------------

  describe('search / filtering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('enableSearch', true);
      fixture.detectChanges();
    });

    it('should show search input when enableSearch is true', () => {
      openDropdown(fixture);
      const searchInputs = queryAll(fixture, 'input.grow[type="text"]');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('should filter options based on search term', () => {
      openDropdown(fixture);

      component.searchTerm.set('ban');
      fixture.detectChanges();

      const filtered = component.filteredOptions();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(o => o.label.toLowerCase().includes('ban'))).toBe(true);
    });

    it('should emit searchChange when search term changes', () => {
      const spy = vi.fn();
      component.searchChange.subscribe(spy);

      openDropdown(fixture);

      const fakeEvent = { target: { value: 'cher' } } as unknown as Event;
      component.onSearchInput(fakeEvent);
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith('cher');
      expect(component.searchTerm()).toBe('cher');
    });

    it('should show "No options found" when search yields no results', () => {
      openDropdown(fixture);

      component.searchTerm.set('zzzzz_no_match');
      fixture.detectChanges();

      const noResults = query(fixture, '.dropdown-container .text-center');
      expect(noResults).not.toBeNull();
      expect(noResults?.textContent).toContain('No options found');
    });

    it('should clear search on clearSearch', () => {
      openDropdown(fixture);
      component.searchTerm.set('test');
      fixture.detectChanges();

      const event = new Event('click');
      component.clearSearch(event);
      fixture.detectChanges();

      expect(component.searchTerm()).toBe('');
    });

    it('should return all options when search term is empty', () => {
      openDropdown(fixture);
      component.searchTerm.set('');
      fixture.detectChanges();

      expect(component.filteredOptions().length).toBe(MOCK_OPTIONS.length);
    });

    it('should not filter when enableSearch is false', () => {
      fixture.componentRef.setInput('enableSearch', false);
      fixture.detectChanges();

      component.searchTerm.set('banana');
      fixture.detectChanges();

      expect(component.filteredOptions().length).toBe(MOCK_OPTIONS.length);
    });

    it('should not process search input when enableSearch is false', () => {
      fixture.componentRef.setInput('enableSearch', false);
      fixture.detectChanges();

      const fakeEvent = { target: { value: 'test' } } as unknown as Event;
      component.onSearchInput(fakeEvent);
      expect(component.searchTerm()).toBe('');
    });

    it('should not clear search when enableSearch is false', () => {
      component.searchTerm.set('something');
      fixture.componentRef.setInput('enableSearch', false);
      fixture.detectChanges();

      const event = new Event('click');
      component.clearSearch(event);
      // searchTerm stays unchanged since clearSearch early-returns
      expect(component.searchTerm()).toBe('something');
    });

    it('should reset highlight when search changes', () => {
      openDropdown(fixture);
      component.highlightedIndex.set(2);

      const fakeEvent = { target: { value: 'ap' } } as unknown as Event;
      component.onSearchInput(fakeEvent);

      expect(component.highlightedIndex()).toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // Text highlighting
  // -------------------------------------------------------------------------

  describe('highlightMatch', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('enableSearch', true);
      fixture.detectChanges();
    });

    it('should wrap matching text in a <mark> tag', () => {
      const result = component.highlightMatch('Banana', 'ban');
      expect(result).toContain('<mark');
      expect(result).toContain('Ban');
    });

    it('should return original text when no search term', () => {
      const result = component.highlightMatch('Banana', '');
      expect(result).toBe('Banana');
    });

    it('should return original text when search is disabled', () => {
      fixture.componentRef.setInput('enableSearch', false);
      fixture.detectChanges();

      const result = component.highlightMatch('Banana', 'ban');
      expect(result).toBe('Banana');
    });

    it('should handle special regex characters in search term', () => {
      const result = component.highlightMatch('Price: $10.00', '$10');
      expect(result).toContain('<mark');
    });

    it('should be case-insensitive', () => {
      const result = component.highlightMatch('Banana', 'BAN');
      expect(result).toContain('<mark');
      expect(result).toContain('Ban');
    });

    it('should handle whitespace-only search term', () => {
      const result = component.highlightMatch('Banana', '   ');
      expect(result).toBe('Banana');
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
      openDropdown(fixture);
    });

    it('should highlight first option on ArrowDown from no highlight', () => {
      expect(component.highlightedIndex()).toBe(-1);
      pressKey(component, 'ArrowDown');
      expect(component.highlightedIndex()).toBe(0);
    });

    it('should move highlight down on ArrowDown', () => {
      pressKey(component, 'ArrowDown'); // 0
      pressKey(component, 'ArrowDown'); // 1
      expect(component.highlightedIndex()).toBe(1);
    });

    it('should move highlight up on ArrowUp', () => {
      pressKey(component, 'ArrowDown'); // 0
      pressKey(component, 'ArrowDown'); // 1
      pressKey(component, 'ArrowDown'); // 2
      pressKey(component, 'ArrowUp'); // 1
      expect(component.highlightedIndex()).toBe(1);
    });

    it('should not go below 0 on ArrowUp', () => {
      pressKey(component, 'ArrowDown'); // 0
      pressKey(component, 'ArrowUp'); // still 0 (cannot go below 0)
      expect(component.highlightedIndex()).toBe(0);
    });

    it('should not exceed last index on ArrowDown', () => {
      for (let i = 0; i < MOCK_OPTIONS.length + 5; i++) {
        pressKey(component, 'ArrowDown');
      }
      expect(component.highlightedIndex()).toBe(MOCK_OPTIONS.length - 1);
    });

    it('should select highlighted option on Enter', () => {
      pressKey(component, 'ArrowDown'); // 0
      pressKey(component, 'ArrowDown'); // 1
      pressKey(component, 'Enter');
      expect(component.selectedOption()?.value).toBe('banana');
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should close dropdown on Escape', () => {
      expect(component.dropdownOpen()).toBe(true);
      pressKey(component, 'Escape');
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should jump to first option on Home', () => {
      pressKey(component, 'ArrowDown');
      pressKey(component, 'ArrowDown');
      pressKey(component, 'ArrowDown');
      pressKey(component, 'Home');
      expect(component.highlightedIndex()).toBe(0);
    });

    it('should jump to last option on End', () => {
      pressKey(component, 'End');
      expect(component.highlightedIndex()).toBe(MOCK_OPTIONS.length - 1);
    });

    it('should not select on Enter when no item is highlighted', () => {
      expect(component.highlightedIndex()).toBe(-1);
      pressKey(component, 'Enter');
      expect(component.selectedOption()).toBeNull();
    });

    it('should not handle keyboard when dropdown is closed', () => {
      // Close it first
      pressKey(component, 'Escape');
      expect(component.dropdownOpen()).toBe(false);

      // Now ArrowDown should do nothing since onDocumentKeydown checks dropdownOpen
      pressKey(component, 'ArrowDown');
      expect(component.highlightedIndex()).toBe(-1);
    });

    it('should not select a disabled option on Enter', () => {
      fixture.componentRef.setInput('options', DISABLED_OPTIONS);
      fixture.detectChanges();

      // Navigate to index 1 (disabled)
      pressKey(component, 'ArrowDown'); // 0
      pressKey(component, 'ArrowDown'); // 1
      pressKey(component, 'Enter');

      expect(component.selectedOption()).toBeNull();
    });

    it('should reset highlight index on dropdown close via Escape', () => {
      pressKey(component, 'ArrowDown');
      pressKey(component, 'ArrowDown');
      expect(component.highlightedIndex()).toBe(1);

      pressKey(component, 'Escape');
      expect(component.highlightedIndex()).toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // Multi-select
  // -------------------------------------------------------------------------

  describe('multi-select', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();
    });

    it('should allow selecting multiple options', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[2]);
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(2);
      expect(component.selectedOptions().map(o => o.value)).toEqual(['apple', 'cherry']);
    });

    it('should toggle option off when clicked again', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[0]); // toggle off
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(0);
    });

    it('should not close dropdown after selection in multi-select mode', () => {
      openDropdown(fixture);
      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      expect(component.dropdownOpen()).toBe(true);
    });

    it('should show checkboxes in multi-select mode', () => {
      openDropdown(fixture);
      const checkboxes = queryAll(fixture, '[role="option"] input[type="checkbox"]');
      expect(checkboxes.length).toBe(MOCK_OPTIONS.length);
    });

    it('should display chips for selected options', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      fixture.detectChanges();

      const chips = queryAll(fixture, '.badge-primary');
      expect(chips.length).toBe(2);
    });

    it('should remove chip on chip close click', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      fixture.detectChanges();

      const removeButtons = queryAll(fixture, '.badge-primary button');
      expect(removeButtons.length).toBe(2);

      removeButtons[0].click();
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(1);
      expect(component.selectedOptions()[0].value).toBe('banana');
    });

    it('should show hidden chips count badge when exceeding maxChipsVisible', () => {
      fixture.componentRef.setInput('maxChipsVisible', 2);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      component.selectOption(MOCK_OPTIONS[2]);
      component.selectOption(MOCK_OPTIONS[3]);
      fixture.detectChanges();

      const hiddenBadge = query(fixture, '.badge-neutral');
      expect(hiddenBadge).not.toBeNull();
      expect(hiddenBadge?.textContent?.trim()).toBe('+2');
    });

    it('should respect maxSelectedItems limit', () => {
      fixture.componentRef.setInput('maxSelectedItems', 2);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      component.selectOption(MOCK_OPTIONS[2]); // should be ignored
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(2);
      expect(component.isMaxReached()).toBe(true);
    });

    it('should show comma-separated labels when chipDisplay is false', () => {
      fixture.componentRef.setInput('chipDisplay', false);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      fixture.detectChanges();

      expect(component.displayValue()).toBe('Apple, Banana');
    });

    it('should show selection count badge when chipDisplay is false', () => {
      fixture.componentRef.setInput('chipDisplay', false);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      fixture.detectChanges();

      const countBadge = query(fixture, '.badge-primary.badge-sm');
      expect(countBadge).not.toBeNull();
      expect(countBadge?.textContent?.trim()).toBe('2');
    });

    it('should emit selectionChange with array for multi-select', () => {
      const spy = vi.fn();
      component.selectionChange.subscribe(spy);

      component.selectOption(MOCK_OPTIONS[0]);
      expect(spy).toHaveBeenCalledWith([MOCK_OPTIONS[0]]);
    });

    it('should emit null selectionChange when last item is deselected', () => {
      component.selectOption(MOCK_OPTIONS[0]);

      const spy = vi.fn();
      component.selectionChange.subscribe(spy);

      component.selectOption(MOCK_OPTIONS[0]); // toggle off
      expect(spy).toHaveBeenCalledWith(null);
    });

    it('should not remove chip when disabled', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      fixture.detectChanges();

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const event = new MouseEvent('click');
      component.removeChip(MOCK_OPTIONS[0], event);
      expect(component.selectedOptions().length).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Select all / deselect all
  // -------------------------------------------------------------------------

  describe('select all / deselect all', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('multiple', true);
      fixture.componentRef.setInput('showSelectAll', true);
      fixture.detectChanges();
    });

    it('should select all options via selectAll()', () => {
      component.selectAll();
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(MOCK_OPTIONS.length);
      expect(component.isAllSelected()).toBe(true);
    });

    it('should deselect all via deselectAll()', () => {
      component.selectAll();
      component.deselectAll();
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(0);
    });

    it('should toggle between select all and deselect all', () => {
      component.toggleSelectAll();
      fixture.detectChanges();
      expect(component.isAllSelected()).toBe(true);

      component.toggleSelectAll();
      fixture.detectChanges();
      expect(component.selectedOptions().length).toBe(0);
    });

    it('should respect maxSelectedItems in selectAll', () => {
      fixture.componentRef.setInput('maxSelectedItems', 3);
      fixture.detectChanges();

      component.selectAll();
      fixture.detectChanges();

      expect(component.selectedOptions().length).toBe(3);
    });

    it('should skip disabled options in selectAll', () => {
      fixture.componentRef.setInput('options', DISABLED_OPTIONS);
      fixture.detectChanges();

      component.selectAll();
      fixture.detectChanges();

      const selectedValues = component.selectedOptions().map(o => o.value);
      expect(selectedValues).not.toContain('b');
      expect(selectedValues).toEqual(['a', 'c']);
    });

    it('should show select all button in dropdown when multiple and showSelectAll', () => {
      openDropdown(fixture);
      const selectAllBtn = query(fixture, '.btn-ghost');
      expect(selectAllBtn).not.toBeNull();
      expect(selectAllBtn?.textContent).toContain('Select All');
    });

    it('should not show select all button when showSelectAll is false', () => {
      fixture.componentRef.setInput('showSelectAll', false);
      fixture.detectChanges();

      openDropdown(fixture);
      const selectAllBtn = query(fixture, '.btn-ghost');
      expect(selectAllBtn).toBeNull();
    });

    it('should show Clear All label when all are selected', () => {
      component.selectAll();
      fixture.detectChanges();

      openDropdown(fixture);
      const selectAllBtn = query(fixture, '.btn-ghost');
      expect(selectAllBtn?.textContent).toContain('Clear All');
    });

    it('should show selected count in dropdown', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      fixture.detectChanges();

      openDropdown(fixture);
      const countText = query(fixture, '.text-xs');
      expect(countText?.textContent).toContain('2 selected');
    });

    it('isAllSelected should return false when no options', () => {
      fixture.componentRef.setInput('options', []);
      fixture.detectChanges();

      expect(component.isAllSelected()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Multi-select keyboard: Space toggles without closing
  // -------------------------------------------------------------------------

  describe('multi-select keyboard', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();
      openDropdown(fixture);
    });

    it('should toggle selection on Space in multi-select', () => {
      pressKey(component, 'ArrowDown'); // highlight index 0
      pressKey(component, ' '); // space - toggle
      expect(component.selectedOptions().length).toBe(1);
      expect(component.selectedOptions()[0].value).toBe('apple');

      pressKey(component, ' '); // toggle off
      expect(component.selectedOptions().length).toBe(0);
    });

    it('should keep dropdown open after Space toggle', () => {
      pressKey(component, 'ArrowDown');
      pressKey(component, ' ');
      expect(component.dropdownOpen()).toBe(true);
    });

    it('should not toggle on Space when no item is highlighted', () => {
      expect(component.highlightedIndex()).toBe(-1);
      pressKey(component, ' ');
      expect(component.selectedOptions().length).toBe(0);
    });

    it('should not toggle disabled option on Space', () => {
      fixture.componentRef.setInput('options', DISABLED_OPTIONS);
      fixture.detectChanges();

      pressKey(component, 'ArrowDown'); // 0
      pressKey(component, 'ArrowDown'); // 1 (disabled)
      pressKey(component, ' ');
      expect(component.selectedOptions().length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Grouped options
  // -------------------------------------------------------------------------

  describe('grouped options', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', GROUPED_OPTIONS);
      fixture.detectChanges();
    });

    it('should detect groups from options', () => {
      expect(component.hasGroups()).toBe(true);
    });

    it('should create grouped option structure', () => {
      const groups = component.groupedOptions();
      expect(groups.length).toBe(2);
      expect(groups[0].label).toBe('Fruits');
      expect(groups[0].options.length).toBe(2);
      expect(groups[1].label).toBe('Vegetables');
      expect(groups[1].options.length).toBe(2);
    });

    it('should render group headers in the dropdown', () => {
      openDropdown(fixture);
      const groupHeaders = queryAll(fixture, '.menu-title');
      expect(groupHeaders.length).toBe(2);
      expect(groupHeaders[0].textContent?.trim()).toBe('Fruits');
      expect(groupHeaders[1].textContent?.trim()).toBe('Vegetables');
    });

    it('should return empty groupedOptions when no groups', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();

      expect(component.hasGroups()).toBe(false);
      expect(component.groupedOptions()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Size and color variants
  // -------------------------------------------------------------------------

  describe('size and color CSS classes', () => {
    it('should not add size class for default md', () => {
      fixture.detectChanges();
      expect(component.inputClasses()).not.toContain('input-md');
    });

    it('should add size class for non-default sizes', () => {
      fixture.componentRef.setInput('size', 'lg');
      fixture.detectChanges();
      expect(component.inputClasses()).toContain('input-lg');
    });

    it('should add xs size class', () => {
      fixture.componentRef.setInput('size', 'xs');
      fixture.detectChanges();
      expect(component.inputClasses()).toContain('input-xs');
    });

    it('should add xl size class', () => {
      fixture.componentRef.setInput('size', 'xl');
      fixture.detectChanges();
      expect(component.inputClasses()).toContain('input-xl');
    });

    it('should add color class when color is set', () => {
      fixture.componentRef.setInput('color', 'primary');
      fixture.detectChanges();
      expect(component.inputClasses()).toContain('input-primary');
    });

    it('should add error color class', () => {
      fixture.componentRef.setInput('color', 'error');
      fixture.detectChanges();
      expect(component.inputClasses()).toContain('input-error');
    });

    it('should not add color class when color is null', () => {
      fixture.detectChanges();
      expect(component.inputClasses()).not.toContain('input-null');
      expect(component.inputClasses()).not.toContain('input-undefined');
    });

    it('should always include base classes', () => {
      fixture.detectChanges();
      const classes = component.inputClasses();
      expect(classes).toContain('input');
      expect(classes).toContain('w-full');
      expect(classes).toContain('flex');
      expect(classes).toContain('items-center');
    });

    it('should map size to menu item height class', () => {
      fixture.componentRef.setInput('size', 'xs');
      fixture.detectChanges();
      expect(component.menuItemClasses()).toBe('h-6');

      fixture.componentRef.setInput('size', 'sm');
      fixture.detectChanges();
      expect(component.menuItemClasses()).toBe('h-8');

      fixture.componentRef.setInput('size', 'md');
      fixture.detectChanges();
      expect(component.menuItemClasses()).toBe('h-10');

      fixture.componentRef.setInput('size', 'lg');
      fixture.detectChanges();
      expect(component.menuItemClasses()).toBe('h-12');

      fixture.componentRef.setInput('size', 'xl');
      fixture.detectChanges();
      expect(component.menuItemClasses()).toBe('h-14');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA / Accessibility
  // -------------------------------------------------------------------------

  describe('accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('should have role="combobox" on the input', () => {
      const input = query(fixture, 'input[type="text"]');
      expect(input?.getAttribute('role')).toBe('combobox');
    });

    it('should have aria-haspopup="listbox"', () => {
      const input = query(fixture, 'input[type="text"]');
      expect(input?.getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('should set aria-expanded based on dropdown state', () => {
      const input = query(fixture, 'input[type="text"]') as HTMLElement;
      expect(input.getAttribute('aria-expanded')).toBe('false');

      openDropdown(fixture);

      const inputAfter = query(fixture, 'input[type="text"]') as HTMLElement;
      expect(inputAfter.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have role="listbox" on the options list', () => {
      openDropdown(fixture);
      const listbox = query(fixture, '#options-list');
      expect(listbox?.getAttribute('role')).toBe('listbox');
    });

    it('should have role="option" on each option', () => {
      openDropdown(fixture);
      const options = queryAll(fixture, '[role="option"]');
      expect(options.length).toBe(MOCK_OPTIONS.length);
    });

    it('should set aria-multiselectable when in multi-select mode', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      openDropdown(fixture);
      const listbox = query(fixture, '#options-list');
      expect(listbox?.getAttribute('aria-multiselectable')).toBe('true');
    });

    it('should not set aria-multiselectable for single select', () => {
      openDropdown(fixture);
      const listbox = query(fixture, '#options-list');
      expect(listbox?.getAttribute('aria-multiselectable')).toBe('false');
    });

    it('should set aria-activedescendant to highlighted option id', () => {
      openDropdown(fixture);
      pressKey(component, 'ArrowDown');
      fixture.detectChanges();

      const input = query(fixture, 'input[type="text"]') as HTMLElement;
      expect(input.getAttribute('aria-activedescendant')).toBe('option-0');
    });

    it('should clear aria-activedescendant when no item is highlighted', () => {
      openDropdown(fixture);
      fixture.detectChanges();

      const input = query(fixture, 'input[type="text"]') as HTMLElement;
      // highlightedIndex is -1, so highlightedOptionId returns null
      expect(input.getAttribute('aria-activedescendant')).toBeNull();
    });

    it('should set aria-disabled on disabled options', () => {
      fixture.componentRef.setInput('options', DISABLED_OPTIONS);
      fixture.detectChanges();

      openDropdown(fixture);
      const options = queryAll(fixture, '[role="option"]');
      expect(options[1].getAttribute('aria-disabled')).toBe('true');
      expect(options[0].getAttribute('aria-disabled')).toBe('false');
    });

    it('should have aria-controls pointing to options-list', () => {
      const input = query(fixture, 'input[type="text"]');
      expect(input?.getAttribute('aria-controls')).toBe('options-list');
    });

    it('should have aria-label on clear button', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      const clearBtn = query(fixture, '[aria-label="Clear selection"]');
      expect(clearBtn).not.toBeNull();
    });

    it('should have aria-label on chip remove buttons', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      fixture.detectChanges();

      const removeBtn = query(fixture, `[aria-label="Remove ${MOCK_OPTIONS[0].label}"]`);
      expect(removeBtn).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty options gracefully', () => {
      fixture.componentRef.setInput('options', []);
      fixture.detectChanges();

      openDropdown(fixture);

      expect(component.filteredOptions().length).toBe(0);
      const noOpts = query(fixture, '.dropdown-container .text-center');
      expect(noOpts?.textContent).toContain('No options available');
    });

    it('should handle writeValue with null', () => {
      fixture.detectChanges();

      component.writeValue(null);
      expect(component.selectedOption()).toBeNull();
    });

    it('should handle writeValue with undefined', () => {
      fixture.detectChanges();

      component.writeValue(undefined as unknown as null);
      expect(component.selectedOption()).toBeNull();
    });

    it('should handle writeValue with a string that does not match any option', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();

      component.writeValue('nonexistent');
      expect(component.selectedOption()).toBeNull();
    });

    it('should handle writeValue with a SelectOption object directly', () => {
      fixture.detectChanges();

      component.writeValue({ value: 'custom', label: 'Custom Label' });
      expect(component.selectedOption()?.label).toBe('Custom Label');
    });

    it('should handle writeValue with a matching string', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();

      component.writeValue('cherry');
      expect(component.selectedOption()?.label).toBe('Cherry');
    });

    it('should handle writeValue for multi-select with string array', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.writeValue(['apple', 'cherry']);
      expect(component.selectedOptions().length).toBe(2);
      expect(component.selectedOptions().map(o => o.value)).toEqual(['apple', 'cherry']);
    });

    it('should handle writeValue for multi-select with SelectOption array', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.writeValue([MOCK_OPTIONS[0], MOCK_OPTIONS[1]]);
      expect(component.selectedOptions().length).toBe(2);
    });

    it('should handle writeValue(null) for multi-select', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.writeValue(null);

      expect(component.selectedOptions().length).toBe(0);
    });

    it('should handle writeValue with string array containing non-matching values', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.writeValue(['apple', 'nonexistent', 'cherry']);
      // Only matching options should be selected
      expect(component.selectedOptions().length).toBe(2);
      expect(component.selectedOptions().map(o => o.value)).toEqual(['apple', 'cherry']);
    });

    it('should handle options with id property for trackBy', () => {
      const optionsWithId: SelectOption[] = [
        { value: 'a', label: 'A', id: 'id-1' },
        { value: 'b', label: 'B', id: 'id-2' },
      ];
      fixture.componentRef.setInput('options', optionsWithId);
      fixture.detectChanges();

      expect(component.trackByOption(0, optionsWithId[0])).toBe('id-1');
      expect(component.trackByOption(1, optionsWithId[1])).toBe('id-2');
    });

    it('should use value for trackBy when no id is present', () => {
      fixture.detectChanges();
      expect(component.trackByOption(0, MOCK_OPTIONS[0])).toBe('apple');
    });

    it('should clean up document listeners on destroy', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();

      // We must manually add listeners (since rAF does not fire in tests)
      // so we verify ngOnDestroy removes them by spying on removeEventListener
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      // Manually trigger what handleDropdownOpen does after rAF
      (component as unknown as { addDocumentListeners: () => void }).addDocumentListeners();

      fixture.destroy();

      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it('should handle toggling dropdown open and closed multiple times', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();

      component.toggleDropdown();
      expect(component.dropdownOpen()).toBe(true);

      component.toggleDropdown();
      expect(component.dropdownOpen()).toBe(false);

      component.toggleDropdown();
      expect(component.dropdownOpen()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ControlValueAccessor (direct component)
  // -------------------------------------------------------------------------

  describe('ControlValueAccessor (direct)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('should register onChange callback', () => {
      const fn = vi.fn();
      component.registerOnChange(fn);

      component.selectOption(MOCK_OPTIONS[0]);
      expect(fn).toHaveBeenCalledWith('apple');
    });

    it('should register onTouched callback', () => {
      const fn = vi.fn();
      component.registerOnTouched(fn);

      component.selectOption(MOCK_OPTIONS[0]);
      expect(fn).toHaveBeenCalled();
    });

    it('should call onTouched when dropdown is closed', () => {
      const fn = vi.fn();
      component.registerOnTouched(fn);

      // Open then close (toggleDropdown when open calls onTouched)
      component.toggleDropdown(); // open
      fn.mockClear();

      component.toggleDropdown(); // close
      expect(fn).toHaveBeenCalled();
    });

    it('should propagate string[] for multi-select onChange', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      const fn = vi.fn();
      component.registerOnChange(fn);

      component.selectOption(MOCK_OPTIONS[0]);
      expect(fn).toHaveBeenCalledWith(['apple']);

      component.selectOption(MOCK_OPTIONS[2]);
      expect(fn).toHaveBeenCalledWith(['apple', 'cherry']);
    });

    it('should propagate null on single-select clear', () => {
      const fn = vi.fn();
      component.registerOnChange(fn);

      component.selectOption(MOCK_OPTIONS[0]);
      fn.mockClear();

      const event = new MouseEvent('click');
      component.clearSelection(event);
      expect(fn).toHaveBeenCalledWith(null);
    });

    it('should propagate empty array on multi-select clear', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      const fn = vi.fn();
      component.registerOnChange(fn);

      component.selectOption(MOCK_OPTIONS[0]);
      fn.mockClear();

      const event = new MouseEvent('click');
      component.clearSelection(event);
      expect(fn).toHaveBeenCalledWith([]);
    });
  });

  // -------------------------------------------------------------------------
  // isSelected / isOptionDisabled helpers
  // -------------------------------------------------------------------------

  describe('helper methods', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('isSelected returns true for single-select match', () => {
      component.selectOption(MOCK_OPTIONS[1]);
      expect(component.isSelected(MOCK_OPTIONS[1])).toBe(true);
      expect(component.isSelected(MOCK_OPTIONS[0])).toBe(false);
    });

    it('isSelected returns true for multi-select match', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[2]);

      expect(component.isSelected(MOCK_OPTIONS[0])).toBe(true);
      expect(component.isSelected(MOCK_OPTIONS[2])).toBe(true);
      expect(component.isSelected(MOCK_OPTIONS[1])).toBe(false);
    });

    it('isSelected returns false when nothing selected (single)', () => {
      expect(component.isSelected(MOCK_OPTIONS[0])).toBe(false);
    });

    it('isOptionDisabled returns true for disabled options', () => {
      fixture.componentRef.setInput('options', DISABLED_OPTIONS);
      fixture.detectChanges();

      expect(component.isOptionDisabled(DISABLED_OPTIONS[1])).toBe(true);
      expect(component.isOptionDisabled(DISABLED_OPTIONS[0])).toBe(false);
    });

    it('isOptionDisabled returns true for unselected options when max is reached', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.componentRef.setInput('maxSelectedItems', 1);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);

      expect(component.isOptionDisabled(MOCK_OPTIONS[1])).toBe(true); // unselected, max reached
      expect(component.isOptionDisabled(MOCK_OPTIONS[0])).toBe(false); // selected, not disabled
    });

    it('isOptionDisabled returns false when max is null', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.componentRef.setInput('maxSelectedItems', null);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      expect(component.isOptionDisabled(MOCK_OPTIONS[1])).toBe(false);
    });

    it('isHighlighted returns correct value', () => {
      expect(component.isHighlighted(0)).toBe(false);
      component.highlightedIndex.set(0);
      expect(component.isHighlighted(0)).toBe(true);
      expect(component.isHighlighted(1)).toBe(false);
    });

    it('getOptionId returns correct format', () => {
      expect(component.getOptionId(0)).toBe('option-0');
      expect(component.getOptionId(5)).toBe('option-5');
    });

    it('getFlatIndex returns correct index from filteredOptions', () => {
      expect(component.getFlatIndex(MOCK_OPTIONS[2])).toBe(2);
    });

    it('getOptionClasses includes height class', () => {
      fixture.detectChanges();
      const classes = component.getOptionClasses(0);
      expect(classes).toContain('h-10'); // md default
    });

    it('getOptionClasses includes active class when highlighted', () => {
      component.highlightedIndex.set(1);
      const classes = component.getOptionClasses(1);
      expect(classes).toContain(component.menuActiveClass);
    });

    it('getOptionClasses does not include active class when not highlighted', () => {
      component.highlightedIndex.set(1);
      const classes = component.getOptionClasses(0);
      expect(classes).not.toContain(component.menuActiveClass);
    });
  });

  // -------------------------------------------------------------------------
  // Computed properties
  // -------------------------------------------------------------------------

  describe('computed properties', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('hasSelection should be false initially', () => {
      expect(component.hasSelection()).toBe(false);
    });

    it('hasSelection should be true after selection', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      expect(component.hasSelection()).toBe(true);
    });

    it('hasSelection should work for multi-select', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      expect(component.hasSelection()).toBe(false);

      component.selectOption(MOCK_OPTIONS[0]);
      expect(component.hasSelection()).toBe(true);
    });

    it('displayValue should return empty string when nothing selected', () => {
      expect(component.displayValue()).toBe('');
    });

    it('displayValue should return label of selected option', () => {
      component.selectOption(MOCK_OPTIONS[0]);
      expect(component.displayValue()).toBe('Apple');
    });

    it('displayValue should return empty string for chip display in multi-select', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.componentRef.setInput('chipDisplay', true);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      expect(component.displayValue()).toBe('');
    });

    it('visibleChips should respect maxChipsVisible', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.componentRef.setInput('maxChipsVisible', 2);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      component.selectOption(MOCK_OPTIONS[2]);

      expect(component.visibleChips().length).toBe(2);
      expect(component.hiddenChipsCount()).toBe(1);
    });

    it('hiddenChipsCount should be 0 when within limit', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.componentRef.setInput('maxChipsVisible', 5);
      fixture.detectChanges();

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);

      expect(component.hiddenChipsCount()).toBe(0);
    });

    it('selectionCount should reflect number of selected items', () => {
      fixture.componentRef.setInput('multiple', true);
      fixture.detectChanges();

      expect(component.selectionCount()).toBe(0);

      component.selectOption(MOCK_OPTIONS[0]);
      component.selectOption(MOCK_OPTIONS[1]);
      expect(component.selectionCount()).toBe(2);
    });

    it('shouldUseVirtualScroll returns false when under threshold', () => {
      fixture.componentRef.setInput('virtualScroll', true);
      fixture.detectChanges();

      // MOCK_OPTIONS has 5 items, threshold is 100
      expect(component.shouldUseVirtualScroll()).toBe(false);
    });

    it('shouldUseVirtualScroll returns false when virtualScroll is off', () => {
      fixture.componentRef.setInput('virtualScroll', false);
      fixture.detectChanges();

      expect(component.shouldUseVirtualScroll()).toBe(false);
    });

    it('hasSearchTerm should reflect search state', () => {
      fixture.componentRef.setInput('enableSearch', true);
      fixture.detectChanges();

      expect(component.hasSearchTerm()).toBe(false);

      component.searchTerm.set('test');
      expect(component.hasSearchTerm()).toBe(true);
    });

    it('hasSearchTerm should be false for whitespace-only', () => {
      component.searchTerm.set('   ');
      expect(component.hasSearchTerm()).toBe(false);
    });

    it('highlightedOptionId returns null when nothing highlighted', () => {
      expect(component.highlightedOptionId()).toBeNull();
    });

    it('highlightedOptionId returns id when highlighted', () => {
      component.highlightedIndex.set(3);
      expect(component.highlightedOptionId()).toBe('option-3');
    });

    it('effectiveOptions returns provided options', () => {
      expect(component.effectiveOptions()).toEqual(MOCK_OPTIONS);
    });

    it('effectiveOptions returns empty array when no options and no mock data', () => {
      fixture.componentRef.setInput('options', []);
      fixture.detectChanges();

      expect(component.effectiveOptions()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Mock data generation
  // -------------------------------------------------------------------------

  describe('mock data generation', () => {
    it('should generate mock data when enabled and no options provided', () => {
      fixture.componentRef.setInput('generateMockData', true);
      fixture.componentRef.setInput('mockDataCount', 50);
      fixture.detectChanges();

      expect(component.effectiveOptions().length).toBe(50);
    });

    it('should prefer provided options over mock data', () => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.componentRef.setInput('generateMockData', true);
      fixture.detectChanges();

      expect(component.effectiveOptions().length).toBe(MOCK_OPTIONS.length);
    });

    it('should not generate mock data when disabled', () => {
      fixture.componentRef.setInput('generateMockData', false);
      fixture.detectChanges();

      expect(component.effectiveOptions().length).toBe(0);
    });

    it('should generate options with labels and values', () => {
      fixture.componentRef.setInput('generateMockData', true);
      fixture.componentRef.setInput('mockDataCount', 5);
      fixture.detectChanges();

      const opts = component.effectiveOptions();
      for (const opt of opts) {
        expect(opt.label).toBeTruthy();
        expect(opt.value).toBeTruthy();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Document click outside (close dropdown)
  // -------------------------------------------------------------------------

  describe('document click outside', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('options', MOCK_OPTIONS);
      fixture.detectChanges();
    });

    it('should close dropdown on outside click via handler', () => {
      openDropdown(fixture);
      expect(component.dropdownOpen()).toBe(true);

      // Simulate a click outside the dropdown root
      const outsideEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(outsideEvent, 'target', { value: document.body });
      component.onDocumentClick(outsideEvent);

      expect(component.dropdownOpen()).toBe(false);
    });

    it('should not close dropdown on click inside', () => {
      openDropdown(fixture);
      expect(component.dropdownOpen()).toBe(true);

      // Simulate a click inside the dropdown root
      const dropdownEl = fixture.nativeElement.querySelector('.relative') as HTMLElement;
      const insideEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(insideEvent, 'target', { value: dropdownEl });
      component.onDocumentClick(insideEvent);

      expect(component.dropdownOpen()).toBe(true);
    });

    it('should not process click when dropdown is closed', () => {
      expect(component.dropdownOpen()).toBe(false);

      // This should be a no-op
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: document.body });
      component.onDocumentClick(event);

      expect(component.dropdownOpen()).toBe(false);
    });
  });
});

// ===========================================================================
// FormControl integration via test host
// ===========================================================================

describe('SelectComponent (FormControl integration)', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    host = hostFixture.componentInstance;
  });

  it('should reflect FormControl initial value', () => {
    host.control.setValue('banana');
    hostFixture.detectChanges();

    const input = hostFixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('Banana');
  });

  it('should update FormControl when an option is selected', () => {
    hostFixture.detectChanges();

    // Open dropdown
    const inputDiv = hostFixture.nativeElement.querySelector('.input') as HTMLElement;
    inputDiv.click();
    hostFixture.detectChanges();

    // Click first option
    const buttons = Array.from(hostFixture.nativeElement.querySelectorAll('[role="option"] button')) as HTMLElement[];
    buttons[0].click();
    hostFixture.detectChanges();

    expect(host.control.value).toBe('apple');
  });

  it('should disable component when FormControl is disabled', () => {
    host.control.disable();
    hostFixture.detectChanges();

    const selectComponent = hostFixture.debugElement.children[0].componentInstance as SelectComponent;
    expect(selectComponent.isDisabled()).toBe(true);
  });

  it('should propagate multi-select values to FormControl', () => {
    host.multiple.set(true);
    hostFixture.detectChanges();

    const selectComponent = hostFixture.debugElement.children[0].componentInstance as SelectComponent;
    selectComponent.selectOption(MOCK_OPTIONS[0]);
    selectComponent.selectOption(MOCK_OPTIONS[2]);
    hostFixture.detectChanges();

    expect(host.control.value).toEqual(['apple', 'cherry']);
  });

  it('should clear FormControl value on clearSelection', () => {
    host.control.setValue('apple');
    hostFixture.detectChanges();

    const selectComponent = hostFixture.debugElement.children[0].componentInstance as SelectComponent;
    const event = new MouseEvent('click');
    selectComponent.clearSelection(event);
    hostFixture.detectChanges();

    expect(host.control.value).toBeNull();
  });

  it('should set multi-select values from FormControl', () => {
    host.multiple.set(true);
    host.control.setValue(['apple', 'cherry']);
    hostFixture.detectChanges();

    const selectComponent = hostFixture.debugElement.children[0].componentInstance as SelectComponent;
    expect(selectComponent.selectedOptions().length).toBe(2);
    expect(selectComponent.selectedOptions().map(o => o.value)).toEqual(['apple', 'cherry']);
  });

  it('should update display when FormControl value changes', () => {
    hostFixture.detectChanges();

    host.control.setValue('cherry');
    hostFixture.detectChanges();

    const input = hostFixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('Cherry');
  });

  it('should handle FormControl reset', () => {
    host.control.setValue('apple');
    hostFixture.detectChanges();

    host.control.reset();
    hostFixture.detectChanges();

    const selectComponent = hostFixture.debugElement.children[0].componentInstance as SelectComponent;
    expect(selectComponent.selectedOption()).toBeNull();
  });

  it('should not open dropdown when FormControl is disabled', () => {
    host.control.disable();
    hostFixture.detectChanges();

    const selectComponent = hostFixture.debugElement.children[0].componentInstance as SelectComponent;
    selectComponent.toggleDropdown();
    expect(selectComponent.dropdownOpen()).toBe(false);
  });
});
