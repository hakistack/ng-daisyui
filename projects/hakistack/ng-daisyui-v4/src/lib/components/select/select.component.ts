import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, viewChild, WritableSignal, forwardRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import Fuse, { IFuseOptions } from 'fuse.js';
import { generateUniqueId } from '../../utils/generate-uuid';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly id?: string;
  readonly disabled?: boolean;
}

/** Value type that can be either single or multiple selection */
export type SelectValue = string | string[] | SelectOption | SelectOption[] | null;

interface SelectComponentConfig {
  readonly defaultItemSize: number;
  readonly maxDropdownHeight: string;
  readonly searchDebounceMs: number;
  readonly virtualScrollThreshold: number;
  readonly highlightClassName: string;
}

type KeyboardEventHandler = Readonly<Record<string, (filteredList: SelectOption[], currentIndex: number) => void>>;

/** Available size variants matching daisyUI */
export type SelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Available color variants matching daisyUI */
export type SelectColor = 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'hk-select',
  imports: [ScrollingModule, ReactiveFormsModule, FormsModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor, OnDestroy {

  private readonly dropdownRoot = viewChild.required<ElementRef<HTMLElement>>('dropdownRoot');
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  private readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  // Bound event handlers for proper cleanup
  private boundDocumentClick = this.onDocumentClick.bind(this);
  private boundDocumentKeydown = this.onDocumentKeydown.bind(this);
  private documentListenersAttached = false;

  // Signal inputs
  readonly id = input<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly allowClear = input<boolean>(true);
  readonly virtualScroll = input<boolean>(false);
  readonly enableSearch = input<boolean>(false);
  readonly placeholder = input<string>('Select an option');
  readonly searchPlaceholder = input<string>('Search options...');
  readonly disabled = input<boolean>(false);
  readonly generateMockData = input<boolean>(false);
  readonly mockDataCount = input<number>(1000);

  // Multi-select inputs
  readonly multiple = input<boolean>(false);
  readonly maxSelectedItems = input<number | null>(null);
  readonly showSelectAll = input<boolean>(true);
  readonly chipDisplay = input<boolean>(true);
  readonly maxChipsVisible = input<number>(3);
  readonly selectAllLabel = input<string>('Select All');
  readonly clearAllLabel = input<string>('Clear All');

  // Size and color inputs (daisyUI variants)
  readonly size = input<SelectSize>('md');
  readonly color = input<SelectColor | null>(null);

  // Outputs
  readonly selectionChange = output<SelectOption | SelectOption[] | null>();
  readonly searchChange = output<string>();
  readonly dropdownToggle = output<boolean>();

  // Component configuration
  readonly config: SelectComponentConfig = {
    defaultItemSize: 36,
    maxDropdownHeight: '16rem',
    searchDebounceMs: 300,
    virtualScrollThreshold: 100,
    highlightClassName: 'bg-yellow-200 px-1 rounded',
  };

  // Reactive state
  readonly searchTerm: WritableSignal<string> = signal('');
  readonly selectedOption: WritableSignal<SelectOption | null> = signal(null);
  readonly selectedOptions: WritableSignal<SelectOption[]> = signal([]);
  readonly dropdownOpen: WritableSignal<boolean> = signal(false);
  readonly highlightedIndex: WritableSignal<number> = signal(-1);

  // Form Control Integration
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onTouched = (): void => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  private _onChange = (_value: string | string[] | null): void => {};
  private _disabled = false;

  // Computed properties
  readonly effectiveOptions = computed(() => {
    const opts = this.options();
    return opts.length > 0 ? opts : this.generateMockData() ? this.generateRandomOptions(this.mockDataCount()) : [];
  });

  readonly filteredOptions = computed(() => {
    if (!this.enableSearch()) {
      return this.effectiveOptions();
    }

    const term = this.searchTerm().trim();
    const opts = this.effectiveOptions();

    if (!term) return opts;
    if (!this.fuse) return this.fallbackFilter(opts, term);

    return this.fuse.search(term).map(result => result.item);
  });

  readonly displayValue = computed(() => {
    if (this.multiple()) {
      const selected = this.selectedOptions();
      if (selected.length === 0) return '';
      if (!this.chipDisplay()) {
        return selected.map(o => o.label).join(', ');
      }
      return ''; // Chips are displayed separately
    }
    return this.selectedOption()?.label ?? '';
  });

  readonly hasSelection = computed(() => {
    if (this.multiple()) {
      return this.selectedOptions().length > 0;
    }
    return this.selectedOption() !== null;
  });

  readonly hasSearchTerm = computed(() => this.searchTerm().trim().length > 0);
  readonly shouldUseVirtualScroll = computed(() => this.virtualScroll() && this.filteredOptions().length > this.config.virtualScrollThreshold);
  readonly highlightedOptionId = computed(() => {
    const index = this.highlightedIndex();
    return index >= 0 ? this.getOptionId(index) : null;
  });
  readonly isDisabled = computed(() => this.disabled() || this._disabled);

  // Multi-select computed properties
  readonly visibleChips = computed(() => {
    const selected = this.selectedOptions();
    const max = this.maxChipsVisible();
    return selected.slice(0, max);
  });

  readonly hiddenChipsCount = computed(() => {
    const selected = this.selectedOptions();
    const max = this.maxChipsVisible();
    return Math.max(0, selected.length - max);
  });

  readonly isAllSelected = computed(() => {
    const filtered = this.filteredOptions();
    const selected = this.selectedOptions();
    if (filtered.length === 0) return false;
    return filtered.every(opt => selected.some(s => s.value === opt.value));
  });

  readonly isMaxReached = computed(() => {
    const max = this.maxSelectedItems();
    if (max === null) return false;
    return this.selectedOptions().length >= max;
  });

  readonly selectionCount = computed(() => this.selectedOptions().length);

  // Computed CSS classes for daisyUI styling
  readonly inputClasses = computed(() => {
    const classes = ['input', 'input-bordered', 'w-full', 'flex', 'items-center'];

    // Size variant
    const sizeClass = `input-${this.size()}`;
    if (this.size() !== 'md') {
      classes.push(sizeClass);
    }

    // Color variant
    const colorVal = this.color();
    if (colorVal) {
      classes.push(`input-${colorVal}`);
    }

    return classes.join(' ');
  });

  readonly menuItemClasses = computed(() => {
    const size = this.size();
    // Adjust menu item height based on input size
    const heightMap: Record<SelectSize, string> = {
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
      xl: 'h-14',
    };
    return heightMap[size];
  });

  // Fuse search configuration
  private readonly fuseConfig: IFuseOptions<SelectOption> = {
    threshold: 0.3,
    ignoreLocation: true,
    isCaseSensitive: false,
    keys: ['label', 'value'],
    includeScore: true,
    minMatchCharLength: 1,
  };

  private _fuse?: Fuse<SelectOption>;
  private get fuse(): Fuse<SelectOption> | undefined {
    if (!this.enableSearch()) {
      return undefined;
    }

    if (!this._fuse && this.effectiveOptions().length > 0) {
      this._fuse = new Fuse(this.effectiveOptions(), this.fuseConfig);
    }
    return this._fuse;
  }

  // Keyboard event handlers map
  private readonly keyboardHandlers: KeyboardEventHandler = {
    ArrowDown: (filteredList, currentIndex) => this.handleArrowDown(filteredList, currentIndex),
    ArrowUp: (_, currentIndex) => this.handleArrowUp(currentIndex),
    Enter: (filteredList, currentIndex) => this.handleEnterKey(filteredList, currentIndex),
    ' ': (filteredList, currentIndex) => this.handleSpaceKey(filteredList, currentIndex),
    Escape: () => this.closeDropdown(),
    Home: filteredList => this.highlightFirst(filteredList),
    End: filteredList => this.highlightLast(filteredList),
  };

  constructor() {
    this.setupEffects();
  }

  ngOnDestroy(): void {
    this.removeDocumentListeners();
  }

  private setupEffects(): void {
    // Reset Fuse cache when options change or search is enabled/disabled
    effect(() => {
      this.effectiveOptions();
      this.enableSearch();
      this._fuse = undefined;
    });
  }

  // ControlValueAccessor Implementation
  writeValue(value: SelectValue): void {
    if (value === null || value === undefined) {
      if (this.multiple()) {
        this.selectedOptions.set([]);
      } else {
        this.selectedOption.set(null);
      }
      return;
    }

    if (this.multiple()) {
      // Handle array of values or SelectOption objects
      if (Array.isArray(value)) {
        const options = value.map(v => {
          if (typeof v === 'string') {
            return this.effectiveOptions().find(opt => opt.value === v);
          }
          return v as SelectOption;
        }).filter((o): o is SelectOption => o !== undefined);
        this.selectedOptions.set(options);
      }
    } else {
      // Handle both string values and SelectOption objects
      if (typeof value === 'string') {
        const option = this.effectiveOptions().find(opt => opt.value === value);
        this.selectedOption.set(option || null);
      } else if (!Array.isArray(value) && typeof value === 'object' && 'value' in value && 'label' in value) {
        this.selectedOption.set(value);
      }
    }
  }

  registerOnChange(fn: (value: string | string[] | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
  }

  // Public API
  toggleDropdown(): void {
    if (this.isDisabled()) return;

    const willOpen = !this.dropdownOpen();
    this.dropdownOpen.set(willOpen);
    this.dropdownToggle.emit(willOpen);

    if (willOpen) {
      this.handleDropdownOpen();
    } else {
      this._onTouched();
    }
  }

  selectOption(option: SelectOption): void {
    if (this.isDisabled()) return;
    if (option.disabled) return;

    if (this.multiple()) {
      this.toggleOptionSelection(option);
    } else {
      this.selectedOption.set(option);
      this.selectionChange.emit(option);
      this._onChange(option.value);
      this.closeDropdown();
    }
    this._onTouched();
  }

  toggleOptionSelection(option: SelectOption): void {
    const current = this.selectedOptions();
    const isSelected = current.some(o => o.value === option.value);

    if (isSelected) {
      // Remove from selection
      const newSelection = current.filter(o => o.value !== option.value);
      this.selectedOptions.set(newSelection);
      this.emitMultiSelectChange(newSelection);
    } else {
      // Check max limit
      if (this.isMaxReached()) return;
      // Add to selection
      const newSelection = [...current, option];
      this.selectedOptions.set(newSelection);
      this.emitMultiSelectChange(newSelection);
    }
  }

  selectAll(): void {
    if (this.isDisabled()) return;

    const filtered = this.filteredOptions().filter(o => !o.disabled);
    const max = this.maxSelectedItems();

    const newSelection = max !== null ? filtered.slice(0, max) : filtered;
    this.selectedOptions.set(newSelection);
    this.emitMultiSelectChange(newSelection);
    this._onTouched();
  }

  deselectAll(): void {
    if (this.isDisabled()) return;

    this.selectedOptions.set([]);
    this.emitMultiSelectChange([]);
    this._onTouched();
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }

  removeChip(option: SelectOption, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDisabled()) return;

    const current = this.selectedOptions();
    const newSelection = current.filter(o => o.value !== option.value);
    this.selectedOptions.set(newSelection);
    this.emitMultiSelectChange(newSelection);
    this._onTouched();
  }

  clearSelection(event: MouseEvent): void {
    if (this.isDisabled()) return;

    event.stopPropagation();
    if (this.multiple()) {
      this.selectedOptions.set([]);
      this.emitMultiSelectChange([]);
    } else {
      this.selectedOption.set(null);
      this.selectionChange.emit(null);
      this._onChange(null);
    }
    this._onTouched();
  }

  /** Emit changes for multi-select mode */
  private emitMultiSelectChange(selections: SelectOption[]): void {
    this.selectionChange.emit(selections.length > 0 ? selections : null);
    this._onChange(selections.map(o => o.value));
  }

  clearSearch(event: Event): void {
    if (!this.enableSearch()) return;

    event.stopPropagation();
    this.searchTerm.set('');
    this.searchChange.emit('');
    this.resetHighlight();
    this.scheduleViewportUpdate();
  }

  onSearchInput(event: Event): void {
    if (!this.enableSearch()) return;

    const inputValue = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputValue);
    this.searchChange.emit(inputValue);
    this.resetHighlight();
    this.scheduleViewportUpdate();
  }

  // Text highlighting
  highlightMatch(text: string, searchTerm: string): string {
    if (!this.enableSearch() || !searchTerm?.trim()) return text;

    const normalizedSearch = searchTerm.trim();
    const escapedSearch = this.escapeRegExp(normalizedSearch);
    const regex = new RegExp(`(${escapedSearch})`, 'gi');

    return text.replace(regex, `<mark class="${this.config.highlightClassName}">$1</mark>`);
  }

  // Utility methods
  trackByOption = (_: number, option: SelectOption): string => option.id || option.value;

  isSelected(option: SelectOption): boolean {
    if (this.multiple()) {
      return this.selectedOptions().some(o => o.value === option.value);
    }
    const selected = this.selectedOption();
    return selected?.value === option.value;
  }

  isOptionDisabled(option: SelectOption): boolean {
    if (option.disabled) return true;
    // In multi-select, disable unselected options if max is reached
    if (this.multiple() && this.isMaxReached() && !this.isSelected(option)) {
      return true;
    }
    return false;
  }

  isHighlighted(index: number): boolean {
    return this.highlightedIndex() === index;
  }

  getOptionId(index: number): string {
    return `option-${index}`;
  }

  // Event handlers
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen() || !this.dropdownRoot()?.nativeElement) return;

    const isClickOutside = !this.dropdownRoot().nativeElement.contains(event.target as Node);
    if (isClickOutside) {
      this.closeDropdown();
    }
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.dropdownOpen()) return;

    const handler = this.keyboardHandlers[event.key];
    if (handler) {
      event.preventDefault();
      const filteredList = this.filteredOptions();
      const currentIndex = this.highlightedIndex();
      handler(filteredList, currentIndex);
    }
  }

  // Private methods
  private addDocumentListeners(): void {
    if (this.documentListenersAttached) return;
    document.addEventListener('click', this.boundDocumentClick, { passive: true });
    document.addEventListener('keydown', this.boundDocumentKeydown);
    this.documentListenersAttached = true;
  }

  private removeDocumentListeners(): void {
    if (!this.documentListenersAttached) return;
    document.removeEventListener('click', this.boundDocumentClick);
    document.removeEventListener('keydown', this.boundDocumentKeydown);
    this.documentListenersAttached = false;
  }

  private generateRandomOptions(count: number): SelectOption[] {
    // Simple mock data generation without external dependencies
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Anna'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];

    return Array.from({ length: count }, (_, index) => {
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
      const suffix = Math.floor(index / 100) > 0 ? ` ${Math.floor(index / 100) + 1}` : '';

      return {
        value: generateUniqueId(),
        label: `${firstName} ${lastName}${suffix}`,
        id: generateUniqueId(),
      } as const;
    });
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private fallbackFilter(options: SelectOption[], searchTerm: string): SelectOption[] {
    const normalizedTerm = this.normalizeString(searchTerm);
    return options.filter(option => this.normalizeString(option.label).includes(normalizedTerm));
  }

  private normalizeString(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '').trim();
  }

  private handleDropdownOpen(): void {
    // Delay adding document listeners to avoid capturing the current click event
    requestAnimationFrame(() => {
      this.addDocumentListeners();
    });

    if (this.enableSearch()) {
      this.searchTerm.set('');
      this.searchChange.emit('');
    }

    this.setInitialHighlight();
    this.scheduleViewportUpdate(() => {
      // Scroll virtual viewport to top
      if (this.shouldUseVirtualScroll()) {
        this.viewport()?.scrollToIndex(0);
      }
      if (this.enableSearch()) {
        this.searchInput().nativeElement.focus();
      }
    });
  }

  private closeDropdown(): void {
    this.dropdownOpen.set(false);
    this.dropdownToggle.emit(false);
    this.resetHighlight();
    this.removeDocumentListeners();
  }

  private setInitialHighlight(): void {
    const currentSelection = this.selectedOption();
    if (!currentSelection) {
      this.highlightedIndex.set(-1);
      return;
    }

    const filteredList = this.filteredOptions();
    const selectionIndex = filteredList.findIndex(option => option.value === currentSelection.value);
    this.highlightedIndex.set(selectionIndex);
  }

  private resetHighlight(): void {
    this.highlightedIndex.set(-1);
  }

  private scheduleViewportUpdate(callback?: () => void): void {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      this.viewport()?.checkViewportSize();
      callback?.();
    });
  }

  private scrollToIndex(index: number): void {
    if (this.shouldUseVirtualScroll()) {
      this.viewport()?.scrollToIndex(index, 'smooth');
    } else {
      const optionElement = document.getElementById(this.getOptionId(index));
      optionElement?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }

  // Keyboard navigation handlers
  private handleArrowDown(filteredList: SelectOption[], currentIndex: number): void {
    const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, filteredList.length - 1);
    this.updateHighlightedIndex(nextIndex);
  }

  private handleArrowUp(currentIndex: number): void {
    if (currentIndex > 0) {
      this.updateHighlightedIndex(currentIndex - 1);
    }
  }

  private handleEnterKey(filteredList: SelectOption[], currentIndex: number): void {
    if (this.isValidIndex(currentIndex, filteredList)) {
      const option = filteredList[currentIndex];
      if (!this.isOptionDisabled(option)) {
        this.selectOption(option);
      }
    }
  }

  private handleSpaceKey(filteredList: SelectOption[], currentIndex: number): void {
    // In multi-select mode, space toggles selection without closing
    if (this.multiple() && this.isValidIndex(currentIndex, filteredList)) {
      const option = filteredList[currentIndex];
      if (!this.isOptionDisabled(option)) {
        this.toggleOptionSelection(option);
      }
    }
  }

  private highlightFirst(filteredList: SelectOption[]): void {
    if (filteredList.length > 0) {
      this.updateHighlightedIndex(0);
    }
  }

  private highlightLast(filteredList: SelectOption[]): void {
    if (filteredList.length > 0) {
      this.updateHighlightedIndex(filteredList.length - 1);
    }
  }

  private updateHighlightedIndex(index: number): void {
    this.highlightedIndex.set(index);
    this.scrollToIndex(index);
  }

  private isValidIndex(index: number, list: SelectOption[]): boolean {
    return index >= 0 && index < list.length;
  }
}
