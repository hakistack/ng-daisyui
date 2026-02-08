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
 * Configuration options for the datepicker component
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
