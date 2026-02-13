import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, effect, forwardRef, inject, input, OnDestroy, output, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, ValidationErrors, Validator, AbstractControl } from '@angular/forms';
import { generateUniqueId } from '../../utils/generate-uuid';
import { DatepickerConfig, DatepickerEvent, DatepickerPosition, DayCell, MonthInfo, ViewMode, WeekdayInfo, YearInfo } from './datepicker.types';
import { DatepickerUtilsService } from './datepicker-utils.service';

@Component({
  selector: 'hk-datepicker',
  imports: [CommonModule],
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    DatepickerUtilsService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatepickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DatepickerComponent),
      multi: true,
    },
  ],
})
export class DatepickerComponent implements ControlValueAccessor, Validator, OnDestroy {
  private readonly dpRoot = viewChild.required<ElementRef<HTMLElement>>('dpRoot');

  private readonly dateUtils = inject(DatepickerUtilsService);
  private readonly cellIdCache = new Map<string, string>();

  // Bound event handlers for proper cleanup
  private boundDocumentClick = this.onClickOutside.bind(this);
  private boundDocumentKeydown = this.onDocumentKeydown.bind(this);
  private documentListenersAttached = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  private onChange = (_value: Date | { start: Date; end: Date } | null) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched = () => {};
  private isFormDisabled = false;

  private readonly defaultConfig: DatepickerConfig = {
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    monthFormat: { month: 'short' },
    yearBatchSize: 24,
    weekdayFormat: { weekday: 'narrow' },
    closeOnSelect: true,
    showClearButton: true,
    showTodayButton: false,
  };

  // Selection mode
  readonly range = input<boolean>(false);

  // Display configuration
  readonly placeholder = input<string>('Select Date');
  readonly disabled = input<boolean>(false);
  readonly locale = input<string>('en-US');

  // Date constraints
  readonly minDate = input<Date | undefined>();
  readonly maxDate = input<Date | undefined>();
  readonly disabledDates = input<Date[]>([]);
  readonly disabledDaysOfWeek = input<number[]>([]); // 0 = Sunday, 6 = Saturday

  // Calendar configuration
  readonly showWeekNumbers = input<boolean>(false);
  readonly firstDayOfWeek = input<number>(0); // 0 = Sunday, 1 = Monday

  // Behavior configuration
  readonly closeOnSelect = input<boolean>(this.defaultConfig.closeOnSelect!);
  readonly showClearButton = input<boolean>(this.defaultConfig.showClearButton!);
  readonly showTodayButton = input<boolean>(this.defaultConfig.showTodayButton!);

  // Styling configuration
  readonly dropdownPosition = input<DatepickerPosition>('bottom-left');
  readonly minWidth = input<string>('20rem');

  // Form integration
  readonly required = input<boolean>(false);
  readonly name = input<string>('');
  readonly formControlName = input<string>('');

  // Custom formatters
  readonly customDateFormatter = input<((date: Date) => string) | undefined>();
  readonly customRangeFormatter = input<((start: Date, end: Date) => string) | undefined>();

  readonly selectionChange = output<DatepickerEvent>();
  readonly dateSelected = output<Date>();
  readonly rangeSelected = output<{ start: Date; end: Date }>();
  readonly pickerOpened = output<void>();
  readonly pickerClosed = output<void>();
  readonly viewChanged = output<ViewMode>();

  readonly isOpen = signal(false);
  readonly currentView = signal<ViewMode>('days');
  readonly currentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly selectedDate = signal<Date | null>(null);
  readonly rangeStart = signal<Date | null>(null);
  readonly rangeEnd = signal<Date | null>(null);
  readonly yearWindowStart = signal(this.getYearWindowStart());
  readonly hoveredDate = signal<Date | null>(null);

  // Form state signals
  readonly isTouched = signal(false);
  readonly validationErrors = computed(() => this.validateInternal());
  readonly isInvalid = computed(() => !!this.validationErrors());

  // Unique instance ID for this component
  private readonly instanceId = generateUniqueId();

  readonly isDisabled = computed(() => this.disabled() || this.isFormDisabled);

  readonly inputId = computed(() => {
    const name = this.name() || this.formControlName();
    return name ? `datepicker-${name}-${this.instanceId}` : `datepicker-${this.instanceId}`;
  });

  readonly currentValue = computed(() => {
    if (this.range()) {
      const start = this.rangeStart();
      const end = this.rangeEnd();
      return start && end ? { start, end } : null;
    }
    return this.selectedDate();
  });

  readonly weekdays = computed((): WeekdayInfo[] => {
    const firstDay = this.firstDayOfWeek();
    const locale = this.locale();
    const formatter = new Intl.DateTimeFormat(locale, this.defaultConfig.weekdayFormat);

    return Array.from({ length: 7 }, (_, i) => {
      const adjustedDay = (firstDay + i) % 7;
      const date = new Date(2023, 0, adjustedDay + 1);
      return {
        label: formatter.format(date),
        index: adjustedDay,
        id: `weekday-${adjustedDay}`,
      };
    });
  });

  readonly displayValue = computed(() => {
    const customFormatter = this.customDateFormatter();
    const customRangeFormatter = this.customRangeFormatter();

    if (!this.range()) {
      const date = this.selectedDate();
      if (!date) return '';
      return customFormatter ? customFormatter(date) : this.formatDate(date);
    }

    const start = this.rangeStart();
    const end = this.rangeEnd();

    if (!start) return '';
    if (!end) return this.formatDate(start);

    return customRangeFormatter ? customRangeFormatter(start, end) : this.dateUtils.formatDateRange(start, end, this.locale(), this.defaultConfig.dateFormat);
  });

  readonly monthLabel = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.locale(), this.defaultConfig.monthFormat);
    return formatter.format(this.currentMonth());
  });

  readonly yearLabel = computed(() => this.currentMonth().getFullYear().toString());

  readonly calendarWeeks = computed(() => {
    return this.buildCalendarWeeks();
  });

  readonly months = computed((): MonthInfo[] => {
    const formatter = new Intl.DateTimeFormat(this.locale(), this.defaultConfig.monthFormat);
    return Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: formatter.format(new Date(2023, i, 1)),
      isSelected: i === this.currentMonth().getMonth(),
      id: `month-${i}`,
    }));
  });

  readonly years = computed((): YearInfo[] => {
    const startYear = this.yearWindowStart().getFullYear();
    const currentYear = this.currentMonth().getFullYear();

    return Array.from({ length: this.defaultConfig.yearBatchSize }, (_, i) => ({
      year: startYear + i,
      isSelected: startYear + i === currentYear,
      id: `year-${startYear + i}`,
    }));
  });

  readonly yearsRange = computed(() => {
    const years = this.years();
    return `${years[0].year} – ${years[years.length - 1].year}`;
  });

  readonly hasSelection = computed(() => {
    return this.range() ? Boolean(this.rangeStart()) : Boolean(this.selectedDate());
  });

  readonly isTodayDisabled = computed(() => {
    return this.isDateDisabled(new Date());
  });

  readonly inputClasses = computed(() => {
    const baseClasses = 'input input-bordered w-full pr-20';
    const classes = [baseClasses];

    if (this.isDisabled()) {
      classes.push('input-disabled');
    }

    if (this.isTouched() && this.isInvalid()) {
      classes.push('input-error');
    }

    return classes.join(' ');
  });

  readonly dropdownClasses = computed(() => {
    const position = this.dropdownPosition();
    const baseClasses = 'datepicker-dropdown bg-base-100 border-base-300 absolute z-50 mt-1 rounded-lg border p-4 shadow-lg';
    const classes = [baseClasses];

    // Position classes
    switch (position) {
      case 'bottom-right':
        classes.push('right-0');
        break;
      case 'top-left':
        classes.push('bottom-full left-0 mb-1 mt-0');
        break;
      case 'top-right':
        classes.push('bottom-full right-0 mb-1 mt-0');
        break;
      default:
        classes.push('left-0');
    }

    return classes.join(' ');
  });

  constructor() {
    this.setupEffects();
  }

  ngOnDestroy(): void {
    this.removeDocumentListeners();
  }

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

  private onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        this.onEscapeKey();
        break;
      case 'Enter':
        if (!this.isOpen()) {
          event.preventDefault();
          this.openPicker();
        }
        break;
      case 'ArrowDown':
        if (!this.isOpen()) {
          event.preventDefault();
          this.openPicker();
        }
        break;
    }
  }

  private setupEffects(): void {
    // Clear cache when month changes
    effect(() => {
      this.currentMonth();
      this.clearCellIdCache();
    });
  }

  writeValue(value: Date | { start: Date; end: Date } | null): void {
    if (!value) {
      this.clearSelection();
      return;
    }

    if (this.range() && typeof value === 'object' && 'start' in value && 'end' in value) {
      this.rangeStart.set(value.start);
      this.rangeEnd.set(value.end);
    } else if (!this.range() && value instanceof Date) {
      this.selectedDate.set(value);
    }
  }

  registerOnChange(fn: (value: Date | { start: Date; end: Date } | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isFormDisabled = isDisabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control ? control.value : this.currentValue();
    return this.performValidation(value);
  }

  private validateInternal(): ValidationErrors | null {
    return this.performValidation(this.currentValue());
  }

  private performValidation(value: Date | { start: Date; end: Date } | null): ValidationErrors | null {
    const errors: ValidationErrors = {};

    // Required validation
    if (this.required() && !value) {
      errors['required'] = true;
    }

    // Min date validation
    const minDate = this.minDate();
    if (minDate && value) {
      if (this.range() && typeof value === 'object' && 'start' in value) {
        if (this.dateUtils.isBefore(value.start, minDate)) {
          errors['min'] = { actual: value.start, min: minDate };
        }
      } else if (value instanceof Date && this.dateUtils.isBefore(value, minDate)) {
        errors['min'] = { actual: value, min: minDate };
      }
    }

    // Max date validation
    const maxDate = this.maxDate();
    if (maxDate && value) {
      if (this.range() && typeof value === 'object' && 'end' in value) {
        if (this.dateUtils.isAfter(value.end, maxDate)) {
          errors['max'] = { actual: value.end, max: maxDate };
        }
      } else if (value instanceof Date && this.dateUtils.isAfter(value, maxDate)) {
        errors['max'] = { actual: value, max: maxDate };
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  togglePicker(): void {
    if (this.isDisabled()) return;

    const willOpen = !this.isOpen();
    this.isOpen.set(willOpen);

    if (willOpen) {
      this.pickerOpened.emit();
      this.addDocumentListeners();
      this.updateView('days');
      const date = this.selectedDate() || this.rangeStart();
      if (date) {
        this.currentMonth.set(this.dateUtils.getStartOfMonth(date));
      }
    } else {
      this.pickerClosed.emit();
      this.removeDocumentListeners();
      this.markAsTouched();
    }
  }

  closePicker(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.pickerClosed.emit();
      this.removeDocumentListeners();
      this.markAsTouched();
    }
  }

  openPicker(): void {
    if (!this.isDisabled() && !this.isOpen()) {
      this.isOpen.set(true);
      this.pickerOpened.emit();
      this.addDocumentListeners();
      this.updateView('days');
    }
  }

  markAsTouched(): void {
    if (!this.isTouched()) {
      this.isTouched.set(true);
      this.onTouched();
    }
  }

  setView(mode: ViewMode): void {
    this.updateView(mode);
  }

  private updateView(mode: ViewMode): void {
    this.currentView.set(mode);
    this.viewChanged.emit(mode);
  }

  goToYearView(): void {
    this.updateView('years');
  }

  goToMonthView(): void {
    this.updateView('months');
  }

  goToDayView(): void {
    this.updateView('days');
  }

  navigateMonth(direction: 'prev' | 'next'): void {
    const current = this.currentMonth();
    const offset = direction === 'prev' ? -1 : 1;
    this.currentMonth.set(this.dateUtils.addMonths(current, offset));
  }

  navigateYears(direction: 'prev' | 'next'): void {
    const current = this.yearWindowStart().getFullYear();
    const offset = direction === 'prev' ? -this.defaultConfig.yearBatchSize : this.defaultConfig.yearBatchSize;
    this.yearWindowStart.set(new Date(current + offset, 0, 1));
  }

  selectYear(year: number): void {
    const currentMonth = this.currentMonth().getMonth();
    this.currentMonth.set(new Date(year, currentMonth, 1));
    this.updateView('months');
  }

  selectMonth(monthIndex: number): void {
    const currentYear = this.currentMonth().getFullYear();
    this.currentMonth.set(new Date(currentYear, monthIndex, 1));
    this.updateView('days');
  }

  selectToday(): void {
    const today = new Date();
    if (!this.isDateDisabled(today)) {
      this.selectDate(today);
    }
  }

  selectDate(date: Date): void {
    if (this.isDisabled() || this.isDateDisabled(date)) return;

    if (!this.range()) {
      this.handleSingleDateSelection(date);
    } else {
      this.handleRangeSelection(date);
    }
  }

  clearSelection(): void {
    if (this.isDisabled()) return;

    this.selectedDate.set(null);
    this.rangeStart.set(null);
    this.rangeEnd.set(null);
    this.hoveredDate.set(null);
    this.onChange(null);
    this.markAsTouched();
  }

  onDateHover(date: Date | null): void {
    if (this.range() && this.rangeStart() && !this.rangeEnd()) {
      this.hoveredDate.set(date);
    }
  }

  getDayClasses(cell: DayCell): string {
    const classes = ['btn', 'btn-xs', 'btn-circle'];

    if (cell.isRangeStart || cell.isRangeEnd) {
      classes.push('btn-primary');
    } else if (cell.isInRange) {
      classes.push('btn-secondary');
    } else if (cell.isToday && !cell.isSelected) {
      classes.push('btn-outline');
    } else if (!cell.isSelected) {
      classes.push('btn-ghost');
    }

    if (cell.isDisabled) {
      classes.push('btn-disabled', 'cursor-not-allowed');
    }

    if (!cell.isCurrentMonth) {
      classes.push('opacity-50');
    }

    if (!cell.isDisabled && !cell.isSelected && !cell.isRangeStart && !cell.isRangeEnd) {
      classes.push('hover:btn-primary');
    }

    return classes.join(' ');
  }

  private handleSingleDateSelection(date: Date): void {
    this.selectedDate.set(date);
    this.onChange(this.currentValue());
    this.dateSelected.emit(date);
    this.selectionChange.emit({
      type: 'date',
      value: { date },
    });

    if (this.closeOnSelect()) {
      this.closePicker();
    } else {
      this.markAsTouched();
    }
  }

  private handleRangeSelection(date: Date): void {
    const start = this.rangeStart();
    const end = this.rangeEnd();

    if (!start || end) {
      // Start new range or reset if already complete
      this.rangeStart.set(date);
      this.rangeEnd.set(null);
      this.hoveredDate.set(null);
      this.onChange(this.currentValue());
    } else {
      // Complete the range
      if (this.dateUtils.isSameDay(date, start)) {
        // Clicking same date - reset
        this.rangeStart.set(null);
        this.rangeEnd.set(null);
        this.onChange(this.currentValue());
      } else {
        // Complete range - always put earlier date as start
        const comparison = this.dateUtils.compareDates(date, start);
        const earlierDate = comparison < 0 ? date : start;
        const laterDate = comparison < 0 ? start : date;

        this.rangeStart.set(earlierDate);
        this.rangeEnd.set(laterDate);
        this.hoveredDate.set(null);
        this.onChange(this.currentValue());

        this.rangeSelected.emit({ start: earlierDate, end: laterDate });
        this.selectionChange.emit({
          type: 'date-range',
          value: { start: earlierDate, end: laterDate },
        });

        if (this.closeOnSelect()) {
          this.closePicker();
        } else {
          this.markAsTouched();
        }
      }
    }
  }

  private buildCalendarWeeks() {
    const currentMonth = this.currentMonth();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = this.dateUtils.getDaysInMonth(currentMonth);
    const firstWeekday = this.dateUtils.getAdjustedWeekday(firstDayOfMonth, this.firstDayOfWeek());

    const cells: DayCell[] = [];

    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      const cellIndex = firstWeekday - 1 - i;
      cells.push(this.createDayCell(date, false, cellIndex));
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const cellIndex = firstWeekday + day - 1;
      cells.push(this.createDayCell(date, true, cellIndex));
    }

    // Next month's leading days
    const remainingCells = 42 - cells.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      const cellIndex = cells.length;
      cells.push(this.createDayCell(date, false, cellIndex));
    }

    // Group into weeks with stable IDs
    return Array.from({ length: 6 }, (_, weekIndex) => ({
      cells: cells.slice(weekIndex * 7, (weekIndex + 1) * 7),
      id: `week-${year}-${month}-${weekIndex}`,
      weekNumber: this.showWeekNumbers() ? this.dateUtils.getISOWeekNumber(cells[weekIndex * 7].date!) : undefined,
    }));
  }

  private createDayCell(date: Date, isCurrentMonth: boolean, cellIndex: number): DayCell {
    const isToday = this.dateUtils.isToday(date);

    const selected = this.selectedDate();
    const rangeStart = this.rangeStart();
    const rangeEnd = this.rangeEnd();
    const hovered = this.hoveredDate();

    // For single date selection
    const isSelected = !this.range() && selected ? this.dateUtils.isSameDay(date, selected) : false;

    // For range selection
    const isRangeStart = this.range() && rangeStart ? this.dateUtils.isSameDay(date, rangeStart) : false;
    const isRangeEnd = this.range() && rangeEnd ? this.dateUtils.isSameDay(date, rangeEnd) : false;

    let isInRange = false;
    if (this.range() && rangeStart) {
      if (rangeEnd) {
        isInRange = this.dateUtils.isDateInRange(date, rangeStart, rangeEnd);
      } else if (hovered) {
        const comparison = this.dateUtils.compareDates(rangeStart, hovered);
        const startDate = comparison < 0 ? rangeStart : hovered;
        const endDate = comparison < 0 ? hovered : rangeStart;
        isInRange = this.dateUtils.isDateInRange(date, startDate, endDate);
      }
    }

    const stableId = this.getStableCellId(date, cellIndex);

    return {
      date,
      isCurrentMonth,
      isToday,
      isSelected: isSelected || isRangeStart || isRangeEnd,
      isInRange,
      isRangeStart,
      isRangeEnd,
      isDisabled: this.isDateDisabled(date),
      id: stableId,
    };
  }

  isDateDisabled(date: Date): boolean {
    const minDate = this.minDate();
    const maxDate = this.maxDate();

    if (minDate && this.dateUtils.isBefore(date, minDate)) return true;
    if (maxDate && this.dateUtils.isAfter(date, maxDate)) return true;

    // Check disabled days of week
    const disabledDays = this.disabledDaysOfWeek();
    if (disabledDays.length > 0 && disabledDays.includes(date.getDay())) {
      return true;
    }

    // Check specific disabled dates
    const disabledDates = this.disabledDates();
    if (disabledDates.some(d => this.dateUtils.isSameDay(d, date))) {
      return true;
    }

    return false;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), this.defaultConfig.dateFormat).format(date);
  }

  private clearCellIdCache(): void {
    this.cellIdCache.clear();
  }

  private getStableCellId(date: Date, cellIndex: number): string {
    const currentMonth = this.currentMonth();
    const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${cellIndex}`;

    if (!this.cellIdCache.has(key)) {
      this.cellIdCache.set(key, `cell-${key}-${generateUniqueId()}`);
    }

    return this.cellIdCache.get(key)!;
  }

  private getYearWindowStart(): Date {
    const currentYear = new Date().getFullYear();
    const startYear = this.dateUtils.getYearWindowStart(currentYear, this.defaultConfig.yearBatchSize);
    return new Date(startYear, 0, 1);
  }

  onClickOutside(event: Event): void {
    if (!this.dpRoot().nativeElement.contains(event.target as Node)) {
      this.closePicker();
    }
  }

  onEscapeKey(): void {
    this.closePicker();
  }
}
