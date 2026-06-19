import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  forwardRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, ValidationErrors, Validator, AbstractControl } from '@angular/forms';
import { ConnectedPosition, Overlay, OverlayModule } from '@angular/cdk/overlay';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { generateUniqueId } from '../../utils/generate-uuid';
import {
  DatepickerConfig,
  DatepickerEvent,
  DatepickerLabels,
  DatepickerPosition,
  DayCell,
  MonthInfo,
  ViewMode,
  WeekdayInfo,
  YearInfo,
} from './datepicker.types';
import { DatepickerUtilsService } from './datepicker-utils.service';

@Component({
  selector: 'hk-datepicker',
  imports: [CommonModule, OverlayModule, LucideCalendar, LucideChevronLeft, LucideChevronRight, LucideX],
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
  private readonly dpInput = viewChild<ElementRef<HTMLInputElement>>('dpInput');
  /** The calendar dialog, teleported into the CDK overlay layer. */
  private readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');

  private readonly dateUtils = inject(DatepickerUtilsService);
  private readonly overlay = inject(Overlay);
  private readonly cellIdCache = new Map<string, string>();

  /** Keep the calendar pinned to the field as the page scrolls. */
  readonly scrollStrategy = this.overlay.scrollStrategies.reposition();

  // Bound event handler for proper cleanup (global keyboard navigation).
  private boundDocumentKeydown = this.onDocumentKeydown.bind(this);
  private documentListenersAttached = false;

  private onChange = (_value: Date | { start: Date; end: Date } | null) => {};

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
  /** Show time selection panel alongside the calendar */
  readonly showTime = input<boolean>(false);
  /** Use 24-hour format for time display (default: false = 12-hour with AM/PM) */
  readonly use24Hour = input<boolean>(false);
  /** Minute step interval (default: 1) */
  readonly minuteStep = input<number>(1);

  // Display configuration
  readonly placeholder = input<string>('Select Date');
  readonly disabled = input<boolean>(false);
  readonly locale = input<string>('en-US');
  /** Text overrides for every visible string in the dropdown. See `DatepickerLabels`. */
  readonly labels = input<DatepickerLabels>({});

  /** Merged labels with defaults — use `resolvedLabels().x` in the template. */
  readonly resolvedLabels = computed<Required<DatepickerLabels>>(() => ({
    placeholder: 'Select Date',
    selectMonth: 'Select Month',
    selectYear: 'Select Year',
    backToCalendar: 'Back to Calendar',
    backToMonths: 'Back to Months',
    timeLabel: 'Time',
    hourLabel: 'Hr',
    minuteLabel: 'Min',
    amLabel: 'AM',
    pmLabel: 'PM',
    todayLabel: 'Today',
    clearLabel: 'Clear',
    selectEndDateHint: 'Select end date',
    closeLabel: 'Close',
    requiredError: 'This field is required.',
    minError: 'Date must be after',
    maxError: 'Date must be before',
    selectYearAriaLabel: 'Select year',
    previousMonthAriaLabel: 'Previous month',
    nextMonthAriaLabel: 'Next month',
    previousYearsAriaLabel: 'Previous years',
    nextYearsAriaLabel: 'Next years',
    backToCalendarAriaLabel: 'Back to calendar',
    backToMonthsAriaLabel: 'Back to months',
    ...this.labels(),
  }));

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
  /** Date that currently holds keyboard focus inside the day grid (roving tabindex). */
  readonly focusedDate = signal<Date | null>(null);

  // Time signals
  readonly selectedHour = signal<number>(12);
  readonly selectedMinute = signal<number>(0);
  readonly selectedPeriod = signal<'AM' | 'PM'>('AM');

  readonly hourOptions = computed(() => {
    if (this.use24Hour()) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    return Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
  });

  readonly minuteOptions = computed(() => {
    const step = this.minuteStep() || 5;
    return Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
  });

  readonly displayHour = computed(() => {
    const h = this.selectedHour();
    if (this.use24Hour()) return h;
    return h === 0 ? 12 : h > 12 ? h - 12 : h;
  });

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
    const date = this.selectedDate();
    if (!date) return null;
    if (!this.showTime()) return date;

    // Combine date + time
    const combined = new Date(date);
    combined.setHours(this.selectedHour(), this.selectedMinute(), 0, 0);
    return combined;
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
      if (customFormatter) return customFormatter(date);

      if (this.showTime()) {
        return this.formatDateTime(date);
      }
      return this.formatDate(date);
    }

    const start = this.rangeStart();
    const end = this.rangeEnd();

    if (!start) return '';
    if (!end) return this.formatDate(start);

    return customRangeFormatter
      ? customRangeFormatter(start, end)
      : this.dateUtils.formatDateRange(start, end, this.locale(), this.defaultConfig.dateFormat);
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
    const baseClasses = 'input w-full pr-20';
    const classes = [baseClasses];

    if (this.isDisabled()) {
      classes.push('input-disabled');
    }

    if (this.isTouched() && this.isInvalid()) {
      classes.push('input-error');
    }

    return classes.join(' ');
  });

  /**
   * Visual classes for the calendar panel. Positioning is owned by the CDK
   * overlay now (see {@link overlayPositions}), so this is just the look.
   */
  readonly dropdownClasses = 'datepicker-dropdown bg-base-100 border-base-300 rounded-lg border p-4 shadow-lg';

  /**
   * Connected-overlay positions derived from `dropdownPosition`: the requested
   * corner is the preferred placement, and CDK auto-flips to the opposite edge
   * when there isn't room (so the calendar never opens off-screen).
   */
  readonly overlayPositions = computed<ConnectedPosition[]>(() => {
    const below: ConnectedPosition = { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 };
    const above: ConnectedPosition = { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 };
    const belowEnd: ConnectedPosition = { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 };
    const aboveEnd: ConnectedPosition = { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 };

    switch (this.dropdownPosition()) {
      case 'bottom-right':
        return [belowEnd, aboveEnd];
      case 'top-left':
        return [above, below];
      case 'top-right':
        return [aboveEnd, belowEnd];
      default: // 'bottom-left' | 'auto'
        return [below, above];
    }
  });

  constructor() {
    this.setupEffects();
  }

  ngOnDestroy(): void {
    this.removeDocumentListeners();
  }

  private addDocumentListeners(): void {
    if (this.documentListenersAttached) return;
    // Outside-click is handled by the overlay's (overlayOutsideClick); only the
    // global keydown (Escape / Tab trap / grid navigation) is wired here.
    document.addEventListener('keydown', this.boundDocumentKeydown);
    this.documentListenersAttached = true;
  }

  private removeDocumentListeners(): void {
    if (!this.documentListenersAttached) return;
    document.removeEventListener('keydown', this.boundDocumentKeydown);
    this.documentListenersAttached = false;
  }

  private onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePicker();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
      return;
    }

    // Grid navigation only applies while a day cell holds focus.
    const onDayCell = this.currentView() === 'days' && !!(event.target as HTMLElement | null)?.closest?.('.dp-day');
    if (!onDayCell) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.moveFocusBy(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveFocusBy(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocusBy(-7);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocusBy(7);
        break;
      case 'Home':
        event.preventDefault();
        this.moveFocusToWeekEdge('start');
        break;
      case 'End':
        event.preventDefault();
        this.moveFocusToWeekEdge('end');
        break;
      case 'PageUp':
        event.preventDefault();
        this.moveFocusByMonths(event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        event.preventDefault();
        this.moveFocusByMonths(event.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar': {
        event.preventDefault();
        const focused = this.focusedDate();
        if (focused) this.selectDate(focused);
        break;
      }
    }
  }

  // ── Keyboard focus navigation (roving tabindex) ─────────────────────────

  private moveFocusBy(days: number): void {
    const base = this.focusedDate() ?? new Date();
    this.setFocusedDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days));
  }

  private moveFocusByMonths(months: number): void {
    const base = this.focusedDate() ?? new Date();
    this.setFocusedDate(this.dateUtils.addMonths(base, months));
  }

  private moveFocusToWeekEdge(edge: 'start' | 'end'): void {
    const base = this.focusedDate() ?? new Date();
    const offset = this.dateUtils.getAdjustedWeekday(base, this.firstDayOfWeek());
    const delta = edge === 'start' ? -offset : 6 - offset;
    this.setFocusedDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta));
  }

  private setFocusedDate(date: Date): void {
    const normalized = this.dateUtils.getStartOfDay(date);
    this.focusedDate.set(normalized);

    const month = this.currentMonth();
    if (normalized.getMonth() !== month.getMonth() || normalized.getFullYear() !== month.getFullYear()) {
      this.currentMonth.set(this.dateUtils.getStartOfMonth(normalized));
    }

    this.focusCellForDate(normalized);
  }

  /** Moves DOM focus to the day button matching `date` once the view has rendered. */
  private focusCellForDate(date: Date): void {
    const ts = this.dateUtils.getStartOfDay(date).getTime();
    requestAnimationFrame(() => {
      // The calendar is teleported into the overlay layer, so query the panel.
      const root = this.dialogPanel()?.nativeElement;
      const cell = root?.querySelector<HTMLButtonElement>(`button.dp-day[data-ts="${ts}"]`);
      cell?.focus();
    });
  }

  private returnFocusToInput(): void {
    this.dpInput()?.nativeElement.focus();
  }

  /** Keeps Tab focus cycling within the open dialog (aria-modal contract). */
  private trapFocus(event: KeyboardEvent): void {
    const dialog = this.dialogPanel()?.nativeElement;
    if (!dialog) return;

    const selector = 'a[href], button, input, select, textarea, [tabindex]';
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
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
      if (this.showTime()) {
        this.selectedHour.set(value.getHours());
        this.selectedMinute.set(value.getMinutes());
        if (!this.use24Hour()) {
          this.selectedPeriod.set(value.getHours() >= 12 ? 'PM' : 'AM');
        }
      }
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

    if (this.isOpen()) {
      this.closePicker();
    } else {
      this.openPicker();
    }
  }

  closePicker(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.pickerClosed.emit();
      this.removeDocumentListeners();
      this.markAsTouched();
      this.returnFocusToInput();
    }
  }

  openPicker(): void {
    if (this.isDisabled() || this.isOpen()) return;

    this.isOpen.set(true);
    this.pickerOpened.emit();
    this.addDocumentListeners();
    this.updateView('days');

    // Seed keyboard focus on the active date and move DOM focus into the grid
    // so the dialog (aria-modal) actually receives focus on open.
    const base = (this.range() ? this.rangeStart() : this.selectedDate()) ?? new Date();
    this.currentMonth.set(this.dateUtils.getStartOfMonth(base));
    this.focusedDate.set(this.dateUtils.getStartOfDay(base));
    this.focusCellForDate(base);
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
    if (this.showTime()) {
      this.selectedHour.set(12);
      this.selectedMinute.set(0);
      this.selectedPeriod.set('AM');
    }
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
      classes.push('hover:bg-primary', 'hover:text-primary-content', 'hover:border-primary');
    }

    return classes.join(' ');
  }

  /** Class map shared by the month- and year-grid buttons. */
  gridButtonClasses(isSelected: boolean): Record<string, boolean> {
    return {
      'btn-primary': isSelected,
      'btn-ghost hover:bg-primary hover:text-primary-content hover:border-primary': !isSelected,
    };
  }

  // ── Time selection methods ──────────────────────────────────────────────

  selectHour(hour: number): void {
    if (this.use24Hour()) {
      this.selectedHour.set(hour);
    } else {
      // Convert 12-hour display to 24-hour internal
      const period = this.selectedPeriod();
      if (period === 'AM') {
        this.selectedHour.set(hour === 12 ? 0 : hour);
      } else {
        this.selectedHour.set(hour === 12 ? 12 : hour + 12);
      }
    }
    this.emitTimeChange();
  }

  selectMinute(minute: number): void {
    this.selectedMinute.set(minute);
    this.emitTimeChange();
  }

  togglePeriod(): void {
    const current = this.selectedPeriod();
    const newPeriod = current === 'AM' ? 'PM' : 'AM';
    this.selectedPeriod.set(newPeriod);

    // Adjust hour for the new period
    const h = this.selectedHour();
    if (newPeriod === 'PM' && h < 12) {
      this.selectedHour.set(h + 12);
    } else if (newPeriod === 'AM' && h >= 12) {
      this.selectedHour.set(h - 12);
    }
    this.emitTimeChange();
  }

  isHourSelected(hour: number): boolean {
    if (this.use24Hour()) return this.selectedHour() === hour;
    const h = this.selectedHour();
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return displayH === hour;
  }

  isMinuteSelected(minute: number): boolean {
    return this.selectedMinute() === minute;
  }

  private emitTimeChange(): void {
    if (this.selectedDate()) {
      this.onChange(this.currentValue());
    }
  }

  private formatDateTime(date: Date): string {
    const datePart = this.formatDate(date);
    const h = this.selectedHour();
    const m = this.selectedMinute();

    if (this.use24Hour()) {
      return `${datePart}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const period = this.selectedPeriod();
    return `${datePart}, ${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  private handleSingleDateSelection(date: Date): void {
    this.selectedDate.set(date);
    this.onChange(this.currentValue());
    this.dateSelected.emit(date);
    this.selectionChange.emit({
      type: 'date',
      value: { date },
    });

    // Don't auto-close in showTime mode — user needs to also pick time
    if (this.closeOnSelect() && !this.showTime()) {
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
    const focused = this.focusedDate();
    const isFocused = focused ? this.dateUtils.isSameDay(date, focused) : false;

    return {
      date,
      isCurrentMonth,
      isToday,
      isSelected: isSelected || isRangeStart || isRangeEnd,
      isFocused,
      isInRange,
      isRangeStart,
      isRangeEnd,
      isDisabled: this.isDateDisabled(date),
      id: stableId,
    };
  }

  /** Full, localized accessible label for a day cell (e.g. "Monday, January 5, 2026"). */
  dayAriaLabel(date: Date | null): string | null {
    if (!date) return null;
    return date.toLocaleDateString(this.locale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
    if (disabledDates.some((d) => this.dateUtils.isSameDay(d, date))) {
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

  /**
   * Close when a click lands outside both the field and the calendar panel.
   * CDK only fires this for clicks outside the overlay pane, so calendar clicks
   * are safe; we additionally ignore clicks on the field so `togglePicker()`
   * owns that case (no close-then-reopen double-fire).
   */
  onOverlayOutsideClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const root = this.dpRoot().nativeElement;
    // composedPath reflects the DOM at dispatch time, so it still includes
    // buttons that change detection removed (e.g. month/year view swap).
    const path = event.composedPath?.() ?? [];
    if (path.includes(root) || root.contains(event.target as Node)) return;
    this.closePicker();
  }

  onEscapeKey(): void {
    this.closePicker();
  }
}
