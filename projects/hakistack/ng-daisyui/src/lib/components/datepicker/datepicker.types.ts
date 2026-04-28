/**
 * Represents a single date selection
 */
export interface DateSelection {
  /** The selected date */
  date: Date;
}

/**
 * Represents a date range selection with start and end dates
 */
export interface DateRangeSelection {
  /** Start date of the range */
  start: Date;
  /** End date of the range */
  end: Date;
}

/**
 * Event emitted when a date or date range is selected
 */
export interface DatepickerEvent {
  /** Whether this is a single date or date range selection */
  type: 'date' | 'date-range';
  /** The selected value (single date or range) */
  value: DateSelection | DateRangeSelection;
}

/**
 * Configuration for `<hk-datepicker>`. All format fields take
 * `Intl.DateTimeFormatOptions` — the same shape consumed by
 * `Intl.DateTimeFormat`. Locale is set on the component via the `locale` input;
 * format options describe **what** to render, locale describes **how**.
 *
 * For UI strings (button text, aria-labels), see `DatepickerLabels` — those
 * are separate because they're translatable strings, not format directives.
 *
 * @example US-style short date, two years per page
 * config = {
 *   dateFormat: { day: 'numeric', month: 'short', year: 'numeric' },   // "Jan 5, 2026"
 *   monthFormat: { month: 'long', year: 'numeric' },                    // "January 2026"
 *   weekdayFormat: { weekday: 'short' },                                // "Mon", "Tue", ...
 *   yearBatchSize: 12,
 *   showTodayButton: true,
 *   showClearButton: true,
 * };
 *
 * @example ISO-style + Spanish locale
 * // template:
 * // <hk-datepicker locale="es-ES" [config]="config" />
 * config = {
 *   dateFormat: { year: 'numeric', month: '2-digit', day: '2-digit' },  // "05/01/2026"
 *   monthFormat: { month: 'long', year: 'numeric' },                    // "enero de 2026"
 *   weekdayFormat: { weekday: 'narrow' },                               // "L", "M", "X", ...
 *   yearBatchSize: 16,
 * };
 *
 * @example Range picker (close-on-select must be false)
 * config = {
 *   dateFormat: { day: 'numeric', month: 'short', year: 'numeric' },
 *   monthFormat: { month: 'long', year: 'numeric' },
 *   weekdayFormat: { weekday: 'short' },
 *   yearBatchSize: 12,
 *   closeOnSelect: false,
 * };
 */
export interface DatepickerConfig {
  /** Format options for displaying dates (e.g., `{ day: 'numeric', month: 'short', year: 'numeric' }`) */
  readonly dateFormat: Intl.DateTimeFormatOptions;
  /** Format options for displaying month labels (e.g., `{ month: 'long', year: 'numeric' }`) */
  readonly monthFormat: Intl.DateTimeFormatOptions;
  /** Number of years shown per page in the year picker view */
  readonly yearBatchSize: number;
  /** Format options for weekday column headers (e.g., `{ weekday: 'short' }`) */
  readonly weekdayFormat: Intl.DateTimeFormatOptions;
  /** Close the dropdown after a date is selected (default: true for single, false for range) */
  readonly closeOnSelect?: boolean;
  /** Show a button to clear the current selection */
  readonly showClearButton?: boolean;
  /** Show a button to jump to today's date */
  readonly showTodayButton?: boolean;
  /** Duration of view transition animations in milliseconds */
  readonly animationDuration?: number;
}

/** Position of the datepicker dropdown relative to the input */
export type DatepickerPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'auto';

/**
 * Style configuration for the datepicker dropdown
 */
export interface DatepickerStyleConfig {
  /** Position of the dropdown relative to the trigger element */
  readonly dropdownPosition?: DatepickerPosition;
  /** Minimum width of the dropdown (CSS value) */
  readonly minWidth?: string;
  /** Maximum width of the dropdown (CSS value) */
  readonly maxWidth?: string;
}

/** Current view mode of the datepicker */
export type ViewMode = 'days' | 'months' | 'years';

/**
 * Represents a single day cell in the calendar grid
 */
export interface DayCell {
  /** The date for this cell, or null for empty padding cells */
  date: Date | null;
  /** Whether this date belongs to the currently displayed month */
  isCurrentMonth: boolean;
  /** Whether this date is today */
  isToday: boolean;
  /** Whether this date is currently selected */
  isSelected: boolean;
  /** Whether this date falls within the selected range */
  isInRange: boolean;
  /** Whether this date is the start of the selected range */
  isRangeStart: boolean;
  /** Whether this date is the end of the selected range */
  isRangeEnd: boolean;
  /** Whether this date is disabled (outside min/max bounds or explicitly disabled) */
  isDisabled: boolean;
  /** Unique identifier for the cell element */
  id: string;
}

/**
 * Represents a weekday column header in the calendar
 */
export interface WeekdayInfo {
  /** Display label for the weekday (e.g., "Mon", "Tu") */
  label: string;
  /** Day-of-week index (0 = Sunday, 6 = Saturday) */
  index: number;
  /** Unique identifier for the header element */
  id: string;
}

/**
 * Represents a month option in the month picker view
 */
export interface MonthInfo {
  /** Month index (0 = January, 11 = December) */
  index: number;
  /** Display label for the month (e.g., "January") */
  label: string;
  /** Whether this month contains the currently selected date */
  isSelected: boolean;
  /** Unique identifier for the month element */
  id: string;
}

/**
 * Represents a year option in the year picker view
 */
export interface YearInfo {
  /** The year number */
  year: number;
  /** Whether this year contains the currently selected date */
  isSelected: boolean;
  /** Unique identifier for the year element */
  id: string;
}

/**
 * Text overrides for `hk-datepicker`. Any field undefined falls back to the
 * English default. Month/weekday names are not here — they're generated from
 * `Intl.DateTimeFormat` via the component's `locale` input.
 */
export interface DatepickerLabels {
  /** Input placeholder (only used when the component's `placeholder` input is unset). Default: "Select Date" */
  placeholder?: string;
  /** Header text in the month picker view. Default: "Select Month" */
  selectMonth?: string;
  /** Header text in the year picker view. Default: "Select Year" */
  selectYear?: string;
  /** "Back to calendar" button in month picker. Default: "Back to Calendar" */
  backToCalendar?: string;
  /** "Back to months" button in year picker. Default: "Back to Months" */
  backToMonths?: string;
  /** Heading above the time panel. Default: "Time" */
  timeLabel?: string;
  /** "Hours" column label. Default: "Hr" */
  hourLabel?: string;
  /** "Minutes" column label. Default: "Min" */
  minuteLabel?: string;
  /** AM period button. Default: "AM" */
  amLabel?: string;
  /** PM period button. Default: "PM" */
  pmLabel?: string;
  /** Footer "Today" button. Default: "Today" */
  todayLabel?: string;
  /** Footer "Clear" button. Default: "Clear" */
  clearLabel?: string;
  /** Hint shown in range mode when waiting for the end date. Default: "Select end date" */
  selectEndDateHint?: string;
  /** Footer "Close" button. Default: "Close" */
  closeLabel?: string;
  /** Validation error for required fields. Default: "This field is required." */
  requiredError?: string;
  /** Prefix for the min-date validation error (the formatted min date is appended). Default: "Date must be after" */
  minError?: string;
  /** Prefix for the max-date validation error (the formatted max date is appended). Default: "Date must be before" */
  maxError?: string;
  /** aria-label for the "select year" header button. Default: "Select year" */
  selectYearAriaLabel?: string;
  /** aria-label for the "previous month" navigation. Default: "Previous month" */
  previousMonthAriaLabel?: string;
  /** aria-label for the "next month" navigation. Default: "Next month" */
  nextMonthAriaLabel?: string;
  /** aria-label for the "previous years" navigation. Default: "Previous years" */
  previousYearsAriaLabel?: string;
  /** aria-label for the "next years" navigation. Default: "Next years" */
  nextYearsAriaLabel?: string;
  /** aria-label for the "back to calendar" button. Default: "Back to calendar" */
  backToCalendarAriaLabel?: string;
  /** aria-label for the "back to months" button. Default: "Back to months" */
  backToMonthsAriaLabel?: string;
}
