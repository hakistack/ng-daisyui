export interface DateSelection {
  date: Date;
}

export interface DateRangeSelection {
  start: Date;
  end: Date;
}

export interface DatepickerEvent {
  type: 'date' | 'date-range';
  value: DateSelection | DateRangeSelection;
}

export interface DatepickerConfig {
  readonly dateFormat: Intl.DateTimeFormatOptions;
  readonly monthFormat: Intl.DateTimeFormatOptions;
  readonly yearBatchSize: number;
  readonly weekdayFormat: Intl.DateTimeFormatOptions;
  readonly closeOnSelect?: boolean;
  readonly showClearButton?: boolean;
  readonly showTodayButton?: boolean;
  readonly animationDuration?: number;
}

export type DatepickerPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'auto';

export interface DatepickerStyleConfig {
  readonly dropdownPosition?: DatepickerPosition;
  readonly minWidth?: string;
  readonly maxWidth?: string;
}

export type ViewMode = 'days' | 'months' | 'years';

export interface DayCell {
  date: Date | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isDisabled: boolean;
  id: string;
}

export interface WeekdayInfo {
  label: string;
  index: number;
  id: string;
}

export interface MonthInfo {
  index: number;
  label: string;
  isSelected: boolean;
  id: string;
}

export interface YearInfo {
  year: number;
  isSelected: boolean;
  id: string;
}
