import { Injectable } from '@angular/core';

/**
 * Utility service for date operations in the datepicker component.
 * Provides pure, reusable date manipulation functions.
 */
@Injectable({ providedIn: 'root' })
export class DatepickerUtilsService {
  /**
   * Checks if two dates represent the same calendar day
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
  }

  /**
   * Checks if a date falls within a range (inclusive)
   */
  isDateInRange(date: Date, start: Date, end: Date): boolean {
    const dateTime = this.getStartOfDay(date).getTime();
    const startTime = this.getStartOfDay(start).getTime();
    const endTime = this.getStartOfDay(end).getTime();
    return dateTime >= startTime && dateTime <= endTime;
  }

  /**
   * Returns a new Date set to the start of the day (00:00:00.000)
   */
  getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Returns a new Date set to the end of the day (23:59:59.999)
   */
  getEndOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  /**
   * Returns the start of the month for a given date
   */
  getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Returns the end of the month for a given date
   */
  getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Gets the number of days in a month
   */
  getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Adds months to a date
   */
  addMonths(date: Date, months: number): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  }

  /**
   * Adds years to a date
   */
  addYears(date: Date, years: number): Date {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
  }

  /**
   * Checks if a date is before another date (day precision)
   */
  isBefore(date1: Date, date2: Date): boolean {
    return this.getStartOfDay(date1) < this.getStartOfDay(date2);
  }

  /**
   * Checks if a date is after another date (day precision)
   */
  isAfter(date1: Date, date2: Date): boolean {
    return this.getStartOfDay(date1) > this.getStartOfDay(date2);
  }

  /**
   * Checks if a date is today
   */
  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  /**
   * Checks if a date is in the past
   */
  isPast(date: Date): boolean {
    return this.isBefore(date, new Date());
  }

  /**
   * Checks if a date is in the future
   */
  isFuture(date: Date): boolean {
    return this.isAfter(date, new Date());
  }

  /**
   * Gets the adjusted weekday based on first day of week setting
   * @param date The date to get weekday for
   * @param firstDayOfWeek 0 = Sunday, 1 = Monday, etc.
   */
  getAdjustedWeekday(date: Date, firstDayOfWeek: number): number {
    const day = date.getDay();
    return (day - firstDayOfWeek + 7) % 7;
  }

  /**
   * Clones a date object
   */
  cloneDate(date: Date): Date {
    return new Date(date.getTime());
  }

  /**
   * Gets the ISO week number for a date
   */
  getISOWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Formats a date range as a string
   */
  formatDateRange(start: Date, end: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
    const formatter = new Intl.DateTimeFormat(locale, options);
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  /**
   * Parses a date string and returns a Date object or null
   */
  parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Validates if a date is valid
   */
  isValidDate(date: unknown): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Gets the year window start for year view batching
   */
  getYearWindowStart(currentYear: number, batchSize: number): number {
    return currentYear - (currentYear % batchSize);
  }

  /**
   * Compares two dates by day precision
   * Returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
   */
  compareDates(date1: Date, date2: Date): number {
    const time1 = this.getStartOfDay(date1).getTime();
    const time2 = this.getStartOfDay(date2).getTime();
    return time1 < time2 ? -1 : time1 > time2 ? 1 : 0;
  }
}
