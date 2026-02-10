import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DatepickerUtilsService {
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
  }

  isDateInRange(date: Date, start: Date, end: Date): boolean {
    const dateTime = this.getStartOfDay(date).getTime();
    const startTime = this.getStartOfDay(start).getTime();
    const endTime = this.getStartOfDay(end).getTime();
    return dateTime >= startTime && dateTime <= endTime;
  }

  getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  getEndOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  addMonths(date: Date, months: number): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  }

  isBefore(date1: Date, date2: Date): boolean {
    return this.getStartOfDay(date1) < this.getStartOfDay(date2);
  }

  isAfter(date1: Date, date2: Date): boolean {
    return this.getStartOfDay(date1) > this.getStartOfDay(date2);
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  /** @param firstDayOfWeek 0 = Sunday, 1 = Monday, etc. */
  getAdjustedWeekday(date: Date, firstDayOfWeek: number): number {
    const day = date.getDay();
    return (day - firstDayOfWeek + 7) % 7;
  }

  getISOWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  formatDateRange(start: Date, end: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
    const formatter = new Intl.DateTimeFormat(locale, options);
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  isValidDate(date: unknown): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  getYearWindowStart(currentYear: number, batchSize: number): number {
    return currentYear - (currentYear % batchSize);
  }

  /** Returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2 */
  compareDates(date1: Date, date2: Date): number {
    const time1 = this.getStartOfDay(date1).getTime();
    const time2 = this.getStartOfDay(date2).getTime();
    return time1 < time2 ? -1 : time1 > time2 ? 1 : 0;
  }
}
