import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, ViewChild, WritableSignal, forwardRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import Fuse, { IFuseOptions } from 'fuse.js';
import { generateUniqueId } from '../../utils/generate-uuid';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly id?: string;
}

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
  selector: 'app-select',
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

  @ViewChild('dropdownRoot') private readonly dropdownRoot!: ElementRef<HTMLElement>;
  @ViewChild('searchInput') private readonly searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('viewport') private readonly viewport?: CdkVirtualScrollViewport;

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

  // Size and color inputs (daisyUI variants)
  readonly size = input<SelectSize>('md');
  readonly color = input<SelectColor | null>(null);

  // Outputs
  readonly selectionChange = output<SelectOption | null>();
  readonly searchChange = output<string>();
  readonly dropdownToggle = output<boolean>();

  // Component configuration
  readonly config: SelectComponentConfig = {
    defaultItemSize: 40,
    maxDropdownHeight: '16rem',
    searchDebounceMs: 300,
    virtualScrollThreshold: 100,
    highlightClassName: 'bg-yellow-200 px-1 rounded',
  };

  // Reactive state
  readonly searchTerm: WritableSignal<string> = signal('');
  readonly selectedOption: WritableSignal<SelectOption | null> = signal(null);
  readonly dropdownOpen: WritableSignal<boolean> = signal(false);
  readonly highlightedIndex: WritableSignal<number> = signal(-1);

  // Form Control Integration
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onTouched = (): void => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  private _onChange = (_value: SelectOption | string | null): void => {};
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

  readonly displayValue = computed(() => this.selectedOption()?.label ?? '');
  readonly hasSelection = computed(() => this.selectedOption() !== null);
  readonly hasSearchTerm = computed(() => this.searchTerm().trim().length > 0);
  readonly shouldUseVirtualScroll = computed(() => this.virtualScroll() && this.filteredOptions().length > this.config.virtualScrollThreshold);
  readonly highlightedOptionId = computed(() => {
    const index = this.highlightedIndex();
    return index >= 0 ? this.getOptionId(index) : null;
  });
  readonly isDisabled = computed(() => this.disabled() || this._disabled);

  // Computed CSS classes for daisyUI styling
  readonly inputClasses = computed(() => {
    const classes = ['input', 'input-bordered', 'w-full'];

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
      this.effectiveOptions(); // Track options changes
      this.enableSearch(); // Track search enabled state
      this._fuse = undefined;
    });

    // Emit selection changes and notify form control
    effect(() => {
      const selection = this.selectedOption();
      this.selectionChange.emit(selection);

      // Notify form control of changes
      if (selection) {
        this._onChange(selection.value);
      } else {
        this._onChange(null);
      }
    });

    // Emit search changes with debounce (only when search is enabled)
    effect(() => {
      if (this.enableSearch()) {
        const term = this.searchTerm();
        this.searchChange.emit(term);
      }
    });

    // Emit dropdown state changes
    effect(() => {
      const isOpen = this.dropdownOpen();
      this.dropdownToggle.emit(isOpen);
    });
  }

  // ControlValueAccessor Implementation
  writeValue(value: string | SelectOption | null): void {
    if (value === null || value === undefined) {
      this.selectedOption.set(null);
      return;
    }

    // Handle both string values and SelectOption objects
    if (typeof value === 'string') {
      const option = this.effectiveOptions().find(opt => opt.value === value);
      this.selectedOption.set(option || null);
    } else if (typeof value === 'object' && 'value' in value && 'label' in value) {
      this.selectedOption.set(value);
    }
  }

  registerOnChange(fn: (value: SelectOption | string | null) => void): void {
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

    if (willOpen) {
      this.handleDropdownOpen();
    } else {
      this._onTouched(); // Mark as touched when closing dropdown
    }
  }

  selectOption(option: SelectOption): void {
    if (this.isDisabled()) return;

    this.selectedOption.set(option);
    this.closeDropdown();
    this._onTouched(); // Mark as touched when selecting
  }

  clearSelection(event: MouseEvent): void {
    if (this.isDisabled()) return;

    event.stopPropagation();
    this.selectedOption.set(null);
    this._onTouched(); // Mark as touched when clearing
  }

  clearSearch(event: Event): void {
    if (!this.enableSearch()) return;

    event.stopPropagation();
    this.searchTerm.set('');
    this.resetHighlight();
    this.scheduleViewportUpdate();
  }

  onSearchInput(event: Event): void {
    if (!this.enableSearch()) return;

    const inputValue = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputValue);
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
    const selected = this.selectedOption();
    return selected?.value === option.value;
  }

  isHighlighted(index: number): boolean {
    return this.highlightedIndex() === index;
  }

  getOptionId(index: number): string {
    return `option-${index}`;
  }

  // Event handlers
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen() || !this.dropdownRoot?.nativeElement) return;

    const isClickOutside = !this.dropdownRoot.nativeElement.contains(event.target as Node);
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
    // Add document listeners only when dropdown opens
    this.addDocumentListeners();

    if (this.enableSearch()) {
      this.searchTerm.set('');
    }

    this.setInitialHighlight();
    this.scheduleViewportUpdate(() => {
      if (this.enableSearch()) {
        this.searchInput?.nativeElement?.focus();
      }
    });
  }

  private closeDropdown(): void {
    this.dropdownOpen.set(false);
    this.resetHighlight();
    // Remove document listeners when dropdown closes
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
      this.viewport?.checkViewportSize();
      callback?.();
    });
  }

  private scrollToIndex(index: number): void {
    if (this.shouldUseVirtualScroll()) {
      this.viewport?.scrollToIndex(index, 'smooth');
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
      this.selectOption(filteredList[currentIndex]);
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
