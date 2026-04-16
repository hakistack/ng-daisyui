import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, ValidationErrors, Validator, AbstractControl } from '@angular/forms';
import { generateUniqueId } from '../../utils/generate-uuid';
import { ClockPosition, TimepickerEvent, TimepickerPosition, TimepickerView } from './timepicker.types';

@Component({
  selector: 'hk-timepicker',
  imports: [CommonModule],
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimepickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => TimepickerComponent),
      multi: true,
    },
  ],
})
export class TimepickerComponent implements ControlValueAccessor, Validator, OnDestroy {
  private readonly tpRoot = viewChild.required<ElementRef<HTMLElement>>('tpRoot');
  private readonly timeInputRef = viewChild<ElementRef<HTMLInputElement>>('timeInput');

  private boundDocumentClick = this.onClickOutside.bind(this);
  private boundDocumentKeydown = this.onDocumentKeydown.bind(this);
  private documentListenersAttached = false;
  private isEditing = false;

  constructor() {
    effect(() => {
      const value = this.displayValue();
      const inputEl = this.timeInputRef()?.nativeElement;
      if (inputEl && !this.isEditing) {
        inputEl.value = value;
      }
    });
  }

  private onChange = (_value: string | null) => {};

  private onTouched = () => {};
  private readonly isFormDisabled = signal(false);

  // --- Inputs ---
  readonly placeholder = input<string>('Select Time');
  readonly disabled = input<boolean>(false);
  readonly use24Hour = input<boolean>(true);
  readonly showSeconds = input<boolean>(false);
  readonly minuteStep = input<number>(1);
  readonly secondStep = input<number>(1);
  readonly closeOnSelect = input<boolean>(true);
  readonly showClearButton = input<boolean>(true);
  readonly showNowButton = input<boolean>(true);
  readonly dropdownPosition = input<TimepickerPosition>('bottom-left');
  readonly minWidth = input<string>('16rem');
  readonly required = input<boolean>(false);
  readonly name = input<string>('');
  readonly formControlName = input<string>('');
  readonly minTime = input<string | undefined>();
  readonly maxTime = input<string | undefined>();
  readonly clockFace = input<boolean>(false);

  // --- Outputs ---
  readonly timeChange = output<TimepickerEvent>();
  readonly pickerOpened = output<void>();
  readonly pickerClosed = output<void>();

  // --- State ---
  readonly isOpen = signal(false);
  readonly currentView = signal<TimepickerView>('hours');
  readonly selectedHour = signal<number | null>(null);
  readonly selectedMinute = signal<number | null>(null);
  readonly selectedSecond = signal<number | null>(null);
  readonly period = signal<'AM' | 'PM'>('AM');

  readonly isTouched = signal(false);
  readonly validationErrors = computed(() => this.validateInternal());
  readonly isInvalid = computed(() => !!this.validationErrors());

  private readonly instanceId = generateUniqueId();

  readonly isDisabled = computed(() => this.disabled() || this.isFormDisabled());

  readonly inputId = computed(() => {
    const name = this.name() || this.formControlName();
    return name ? `timepicker-${name}-${this.instanceId}` : `timepicker-${this.instanceId}`;
  });

  readonly hasSelection = computed(() => {
    return this.selectedHour() !== null && this.selectedMinute() !== null;
  });

  readonly currentValue = computed((): string | null => {
    const hour = this.selectedHour();
    const minute = this.selectedMinute();
    if (hour === null || minute === null) return null;

    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');

    if (this.showSeconds()) {
      const second = this.selectedSecond() ?? 0;
      const s = second.toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    return `${h}:${m}`;
  });

  readonly displayValue = computed((): string => {
    const hour = this.selectedHour();
    const minute = this.selectedMinute();
    if (hour === null || minute === null) return '';

    if (this.use24Hour()) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      if (this.showSeconds()) {
        const s = (this.selectedSecond() ?? 0).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
      return `${h}:${m}`;
    }

    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const h = displayHour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    const p = this.period();

    if (this.showSeconds()) {
      const s = (this.selectedSecond() ?? 0).toString().padStart(2, '0');
      return `${h}:${m}:${s} ${p}`;
    }
    return `${h}:${m} ${p}`;
  });

  readonly displayHour = computed((): string => {
    const hour = this.selectedHour();
    if (hour === null) return '--';
    if (this.use24Hour()) return hour.toString().padStart(2, '0');
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return displayHour.toString().padStart(2, '0');
  });

  readonly displayMinute = computed((): string => {
    const minute = this.selectedMinute();
    return minute !== null ? minute.toString().padStart(2, '0') : '--';
  });

  readonly displaySecond = computed((): string => {
    const second = this.selectedSecond();
    return second !== null ? second.toString().padStart(2, '0') : '--';
  });

  readonly hourOptions = computed((): number[] => {
    if (this.use24Hour()) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  });

  readonly minuteOptions = computed((): number[] => {
    const step = Math.max(1, this.minuteStep());
    const options: number[] = [];
    for (let i = 0; i < 60; i += step) {
      options.push(i);
    }
    return options;
  });

  readonly secondOptions = computed((): number[] => {
    const step = Math.max(1, this.secondStep());
    const options: number[] = [];
    for (let i = 0; i < 60; i += step) {
      options.push(i);
    }
    return options;
  });

  readonly minuteGridCols = computed((): string => {
    const count = this.minuteOptions().length;
    if (count <= 4) return 'grid-cols-4';
    if (count <= 12) return 'grid-cols-4';
    return 'grid-cols-6';
  });

  readonly secondGridCols = computed((): string => {
    const count = this.secondOptions().length;
    if (count <= 4) return 'grid-cols-4';
    if (count <= 12) return 'grid-cols-4';
    return 'grid-cols-6';
  });

  readonly inputClasses = computed(() => {
    const classes = ['input w-full pr-20 font-mono'];
    if (this.isDisabled()) classes.push('input-disabled');
    if (this.isTouched() && this.isInvalid()) classes.push('input-error');
    return classes.join(' ');
  });

  // --- Clock Face ---

  private readonly DIAL_CENTER = 128;
  private readonly OUTER_RADIUS = 100;
  private readonly INNER_RADIUS = 64;

  readonly clockHourPositions = computed((): ClockPosition[] => {
    const center = this.DIAL_CENTER;
    const outer = this.OUTER_RADIUS;
    const inner = this.INNER_RADIUS;

    if (this.use24Hour()) {
      const outerRing = Array.from({ length: 12 }, (_, i) => {
        const hour = i === 0 ? 12 : i;
        const angleRad = ((i * 30 - 90) * Math.PI) / 180;
        return {
          value: hour,
          display: hour.toString(),
          x: center + outer * Math.cos(angleRad),
          y: center + outer * Math.sin(angleRad),
          inner: false,
        };
      });
      const innerRing = Array.from({ length: 12 }, (_, i) => {
        const hour = i === 0 ? 0 : i + 12;
        const angleRad = ((i * 30 - 90) * Math.PI) / 180;
        return {
          value: hour,
          display: hour.toString().padStart(2, '0'),
          x: center + inner * Math.cos(angleRad),
          y: center + inner * Math.sin(angleRad),
          inner: true,
        };
      });
      return [...outerRing, ...innerRing];
    }

    return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour, i) => {
      const angleRad = ((i * 30 - 90) * Math.PI) / 180;
      return {
        value: hour,
        display: hour.toString(),
        x: center + outer * Math.cos(angleRad),
        y: center + outer * Math.sin(angleRad),
        inner: false,
      };
    });
  });

  readonly clockMinutePositions = computed((): ClockPosition[] => {
    const center = this.DIAL_CENTER;
    const radius = this.OUTER_RADIUS;
    return Array.from({ length: 12 }, (_, i) => {
      const minute = i * 5;
      const angleRad = ((minute * 6 - 90) * Math.PI) / 180;
      return {
        value: minute,
        display: minute.toString().padStart(2, '0'),
        x: center + radius * Math.cos(angleRad),
        y: center + radius * Math.sin(angleRad),
        inner: false,
      };
    });
  });

  readonly clockSecondPositions = computed((): ClockPosition[] => {
    const center = this.DIAL_CENTER;
    const radius = this.OUTER_RADIUS;
    return Array.from({ length: 12 }, (_, i) => {
      const second = i * 5;
      const angleRad = ((second * 6 - 90) * Math.PI) / 180;
      return {
        value: second,
        display: second.toString().padStart(2, '0'),
        x: center + radius * Math.cos(angleRad),
        y: center + radius * Math.sin(angleRad),
        inner: false,
      };
    });
  });

  readonly clockPositions = computed((): ClockPosition[] => {
    switch (this.currentView()) {
      case 'hours':
        return this.clockHourPositions();
      case 'minutes':
        return this.clockMinutePositions();
      case 'seconds':
        return this.clockSecondPositions();
    }
  });

  readonly clockHandAngle = computed((): number => {
    const view = this.currentView();
    if (view === 'hours') {
      const hour = this.selectedHour();
      if (hour === null) return 0;
      return (hour % 12) * 30;
    }
    const value = view === 'minutes' ? this.selectedMinute() : this.selectedSecond();
    if (value === null) return 0;
    return value * 6;
  });

  readonly clockHandIsInner = computed((): boolean => {
    if (!this.use24Hour() || this.currentView() !== 'hours') return false;
    const hour = this.selectedHour();
    if (hour === null) return false;
    return hour === 0 || hour > 12;
  });

  readonly handRadius = computed((): number => {
    return this.clockHandIsInner() ? this.INNER_RADIUS : this.OUTER_RADIUS;
  });

  readonly showClockHand = computed((): boolean => {
    const view = this.currentView();
    if (view === 'hours') return this.selectedHour() !== null;
    if (view === 'minutes') return this.selectedMinute() !== null;
    return this.selectedSecond() !== null;
  });

  readonly dropdownClasses = computed(() => {
    const position = this.dropdownPosition();
    const classes = ['bg-base-100 border-base-300 absolute z-50 mt-1 rounded-lg border p-4 shadow-lg'];

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

  ngOnDestroy(): void {
    this.removeDocumentListeners();
  }

  // --- ControlValueAccessor ---

  writeValue(value: string | null): void {
    if (!value) {
      this.selectedHour.set(null);
      this.selectedMinute.set(null);
      this.selectedSecond.set(null);
      this.period.set('AM');
      return;
    }
    this.parseTimeString(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isFormDisabled.set(isDisabled);
  }

  // --- Validator ---

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control ? control.value : this.currentValue();
    return this.performValidation(value);
  }

  private validateInternal(): ValidationErrors | null {
    return this.performValidation(this.currentValue());
  }

  private performValidation(value: string | null): ValidationErrors | null {
    const errors: ValidationErrors = {};

    if (this.required() && !value) {
      errors['required'] = true;
    }

    if (value) {
      const minTime = this.minTime();
      if (minTime && value < minTime) {
        errors['minTime'] = { actual: value, min: minTime };
      }
      const maxTime = this.maxTime();
      if (maxTime && value > maxTime) {
        errors['maxTime'] = { actual: value, max: maxTime };
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  // --- Picker Operations ---

  togglePicker(): void {
    if (this.isDisabled()) return;
    const willOpen = !this.isOpen();
    this.isOpen.set(willOpen);

    if (willOpen) {
      this.pickerOpened.emit();
      this.addDocumentListeners();
      this.currentView.set('hours');
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
      this.currentView.set('hours');
    }
  }

  markAsTouched(): void {
    if (!this.isTouched()) {
      this.isTouched.set(true);
      this.onTouched();
    }
  }

  // --- Editable Input ---

  readonly inputHint = signal<string>('');

  onInputFocus(): void {
    this.isEditing = true;
  }

  onInputChange(): void {
    const inputEl = this.timeInputRef()?.nativeElement;
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) {
      this.inputHint.set('');
      return;
    }
    const parsed = this.parseUserInput(text);
    if (parsed) {
      this.inputHint.set(this.formatParsedPreview(parsed));
    } else {
      this.inputHint.set('');
    }
  }

  onInputBlur(): void {
    this.isEditing = false;
    this.inputHint.set('');
    const inputEl = this.timeInputRef()?.nativeElement;
    if (inputEl) {
      const text = inputEl.value.trim();
      if (text) {
        this.applyTypedInput(text);
      } else {
        this.clearSelection();
      }
      inputEl.value = this.displayValue();
    }
    this.markAsTouched();
  }

  onInputEnter(event: Event): void {
    event.preventDefault();
    const inputEl = this.timeInputRef()?.nativeElement;
    if (inputEl) {
      this.isEditing = false;
      this.inputHint.set('');
      const text = inputEl.value.trim();
      if (text) {
        this.applyTypedInput(text);
      }
      inputEl.value = this.displayValue();
      inputEl.blur();
    }
  }

  onInputEscape(): void {
    this.isEditing = false;
    this.inputHint.set('');
    const inputEl = this.timeInputRef()?.nativeElement;
    if (inputEl) {
      inputEl.value = this.displayValue();
      inputEl.blur();
    }
    this.closePicker();
  }

  private applyTypedInput(text: string): void {
    const parsed = this.parseUserInput(text);
    if (parsed) {
      this.selectedHour.set(parsed.hour);
      this.selectedMinute.set(parsed.minute);
      if (this.showSeconds()) {
        this.selectedSecond.set(parsed.second);
      }
      if (!this.use24Hour()) {
        this.period.set(parsed.hour >= 12 ? 'PM' : 'AM');
      }
      this.emitIfComplete();
    }
  }

  private formatParsedPreview(parsed: { hour: number; minute: number; second: number }): string {
    if (this.use24Hour()) {
      const h = parsed.hour.toString().padStart(2, '0');
      const m = parsed.minute.toString().padStart(2, '0');
      if (this.showSeconds()) {
        const s = parsed.second.toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
      return `${h}:${m}`;
    }
    const p = parsed.hour >= 12 ? 'PM' : 'AM';
    const displayH = parsed.hour === 0 ? 12 : parsed.hour > 12 ? parsed.hour - 12 : parsed.hour;
    const h = displayH.toString().padStart(2, '0');
    const m = parsed.minute.toString().padStart(2, '0');
    if (this.showSeconds()) {
      const s = parsed.second.toString().padStart(2, '0');
      return `${h}:${m}:${s} ${p}`;
    }
    return `${h}:${m} ${p}`;
  }

  /** Parses user typed input into 24h time. Handles many formats:
   *  - Colon/dot separated: "14:30", "2.30", "14:30:00"
   *  - AM/PM: "2:30 PM", "2:30pm", "2:30 p.m."
   *  - Shorthand: "2p", "2a", "230p", "1430"
   *  - Bare digits: "1" → 1:00, "13" → 13:00, "130" → 1:30, "0930" → 09:30
   *  - JS millisecond timestamps (> 86400000): extracts time-of-day
   *  - Seconds since midnight (86400 > n >= 60 and no separator): converts to h:m:s
   */
  parseUserInput(text: string): { hour: number; minute: number; second: number } | null {
    const normalized = text.trim();
    if (!normalized) return null;

    // --- JS millisecond timestamp or seconds-since-midnight ---
    const numericOnly = /^\d+$/.test(normalized);
    if (numericOnly) {
      const num = parseInt(normalized, 10);
      const len = normalized.length;

      // JS millisecond timestamp (e.g. Date.now() — typically 13 digits)
      if (num > 86_400_000) {
        const date = new Date(num);
        if (!isNaN(date.getTime())) {
          return this.snapToSteps(date.getHours(), date.getMinutes(), date.getSeconds());
        }
        return null;
      }

      // Seconds since midnight: only for 5+ digit numbers (to avoid ambiguity
      // with 3-4 digit compact times like "130" → 1:30, "1300" → 13:00)
      if (len >= 5 && num >= 60 && num <= 86_400) {
        const totalSeconds = Math.min(num, 86_399);
        const h = Math.floor(totalSeconds / 3600) % 24;
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return this.snapToSteps(h, m, s);
      }
    }

    // --- Detect and strip AM/PM ---
    const upper = normalized.toUpperCase();
    const amPmMatch = upper.match(/(A\.?M\.?|P\.?M\.?|A|P)\s*$/);
    let hasPeriod: 'AM' | 'PM' | null = null;
    let cleaned = normalized;

    if (amPmMatch) {
      const token = amPmMatch[1];
      hasPeriod = token.startsWith('A') ? 'AM' : 'PM';
      cleaned = normalized.slice(0, -amPmMatch[0].length).trim();
    } else if (/\s*(AM|PM|A\.M\.?|P\.M\.?)/i.test(upper)) {
      const match = upper.match(/(AM|PM|A\.M\.?|P\.M\.?)/i);
      if (match) {
        hasPeriod = match[1].startsWith('A') || match[1].startsWith('a') ? 'AM' : 'PM';
        cleaned = normalized.replace(/\s*(AM|PM|A\.M\.?|P\.M\.?)\s*/gi, '').trim();
      }
    }

    // --- Try colon/dot separated format ---
    if (/[:.]/.test(cleaned)) {
      const parts = cleaned.split(/[:.]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        const second = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
        if (!isNaN(hour) && !isNaN(minute) && !isNaN(second)) {
          return this.resolveAndSnap(hour, minute, second, hasPeriod);
        }
      }
    }

    // --- Bare digits: "1", "13", "130", "1300", "93000" ---
    const digitsOnly = cleaned.replace(/\s/g, '');
    if (/^\d{1,6}$/.test(digitsOnly)) {
      const len = digitsOnly.length;

      if (len <= 2) {
        // "1" → 1:00, "13" → 13:00
        const h = parseInt(digitsOnly, 10);
        return this.resolveAndSnap(h, 0, 0, hasPeriod);
      }

      if (len === 3) {
        // "130" → 1:30, "930" → 9:30
        const h = parseInt(digitsOnly.slice(0, 1), 10);
        const m = parseInt(digitsOnly.slice(1, 3), 10);
        return this.resolveAndSnap(h, m, 0, hasPeriod);
      }

      if (len === 4) {
        // "1300" → 13:00, "0930" → 09:30
        const h = parseInt(digitsOnly.slice(0, 2), 10);
        const m = parseInt(digitsOnly.slice(2, 4), 10);
        return this.resolveAndSnap(h, m, 0, hasPeriod);
      }

      if (len === 5) {
        // "13000" → 1:30:00
        const h = parseInt(digitsOnly.slice(0, 1), 10);
        const m = parseInt(digitsOnly.slice(1, 3), 10);
        const s = parseInt(digitsOnly.slice(3, 5), 10);
        return this.resolveAndSnap(h, m, s, hasPeriod);
      }

      if (len === 6) {
        // "133000" → 13:30:00, "093045" → 09:30:45
        const h = parseInt(digitsOnly.slice(0, 2), 10);
        const m = parseInt(digitsOnly.slice(2, 4), 10);
        const s = parseInt(digitsOnly.slice(4, 6), 10);
        return this.resolveAndSnap(h, m, s, hasPeriod);
      }
    }

    return null;
  }

  private resolveAndSnap(
    hour: number,
    minute: number,
    second: number,
    period: 'AM' | 'PM' | null,
  ): { hour: number; minute: number; second: number } | null {
    if (isNaN(hour) || isNaN(minute) || isNaN(second)) return null;
    if (minute < 0 || minute > 59 || second < 0 || second > 59) return null;

    let hour24 = hour;

    if (period) {
      if (hour < 1 || hour > 12) return null;
      hour24 = period === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
    } else {
      if (hour < 0 || hour > 23) return null;
    }

    return this.snapToSteps(hour24, minute, second);
  }

  private snapToSteps(hour: number, minute: number, second: number): { hour: number; minute: number; second: number } {
    const mStep = Math.max(1, this.minuteStep());
    let snappedMinute = Math.round(minute / mStep) * mStep;
    if (snappedMinute >= 60) snappedMinute = 60 - mStep;

    const sStep = Math.max(1, this.secondStep());
    let snappedSecond = Math.round(second / sStep) * sStep;
    if (snappedSecond >= 60) snappedSecond = 60 - sStep;

    return { hour, minute: snappedMinute, second: snappedSecond };
  }

  setView(view: TimepickerView): void {
    this.currentView.set(view);
  }

  // --- Selection ---

  selectHour(hour: number): void {
    if (this.isDisabled()) return;

    if (!this.use24Hour()) {
      const p = this.period();
      if (p === 'AM') {
        this.selectedHour.set(hour === 12 ? 0 : hour);
      } else {
        this.selectedHour.set(hour === 12 ? 12 : hour + 12);
      }
    } else {
      this.selectedHour.set(hour);
    }

    this.currentView.set('minutes');
    this.emitIfComplete();
  }

  selectMinute(minute: number): void {
    if (this.isDisabled()) return;
    this.selectedMinute.set(minute);

    if (this.showSeconds()) {
      this.currentView.set('seconds');
    } else {
      this.emitIfComplete();
      if (this.closeOnSelect() && this.hasSelection()) {
        this.closePicker();
      }
    }
  }

  selectSecond(second: number): void {
    if (this.isDisabled()) return;
    this.selectedSecond.set(second);
    this.emitIfComplete();

    if (this.closeOnSelect() && this.hasSelection()) {
      this.closePicker();
    }
  }

  togglePeriod(): void {
    if (this.isDisabled()) return;
    const newPeriod = this.period() === 'AM' ? 'PM' : 'AM';
    this.period.set(newPeriod);

    const hour = this.selectedHour();
    if (hour !== null) {
      if (newPeriod === 'AM' && hour >= 12) {
        this.selectedHour.set(hour - 12);
      } else if (newPeriod === 'PM' && hour < 12) {
        this.selectedHour.set(hour + 12);
      }
      this.emitIfComplete();
    }
  }

  selectNow(): void {
    const now = new Date();
    this.selectedHour.set(now.getHours());

    const mStep = Math.max(1, this.minuteStep());
    this.selectedMinute.set(Math.floor(now.getMinutes() / mStep) * mStep);

    if (this.showSeconds()) {
      const sStep = Math.max(1, this.secondStep());
      this.selectedSecond.set(Math.floor(now.getSeconds() / sStep) * sStep);
    }

    if (!this.use24Hour()) {
      this.period.set(now.getHours() >= 12 ? 'PM' : 'AM');
    }

    this.emitIfComplete();
  }

  clearSelection(): void {
    if (this.isDisabled()) return;
    this.selectedHour.set(null);
    this.selectedMinute.set(null);
    this.selectedSecond.set(null);
    this.period.set('AM');
    this.onChange(null);

    const inputEl = this.timeInputRef()?.nativeElement;
    if (inputEl) {
      inputEl.value = '';
    }

    this.markAsTouched();
  }

  // --- State Checks ---

  isHourSelected(gridHour: number): boolean {
    const selected24 = this.selectedHour();
    if (selected24 === null) return false;

    if (this.use24Hour()) return selected24 === gridHour;

    const display12 = selected24 === 0 ? 12 : selected24 > 12 ? selected24 - 12 : selected24;
    return display12 === gridHour;
  }

  isMinuteSelected(minute: number): boolean {
    return this.selectedMinute() === minute;
  }

  isSecondSelected(second: number): boolean {
    return this.selectedSecond() === second;
  }

  isHourDisabled(gridHour: number): boolean {
    const minTime = this.minTime();
    const maxTime = this.maxTime();
    if (!minTime && !maxTime) return false;

    let hour24: number;
    if (!this.use24Hour()) {
      const p = this.period();
      hour24 = p === 'AM' ? (gridHour === 12 ? 0 : gridHour) : gridHour === 12 ? 12 : gridHour + 12;
    } else {
      hour24 = gridHour;
    }

    if (minTime) {
      const minHour = parseInt(minTime.split(':')[0], 10);
      if (hour24 < minHour) return true;
    }
    if (maxTime) {
      const maxHour = parseInt(maxTime.split(':')[0], 10);
      if (hour24 > maxHour) return true;
    }

    return false;
  }

  isMinuteDisabled(minute: number): boolean {
    const hour = this.selectedHour();
    if (hour === null) return false;

    const minTime = this.minTime();
    const maxTime = this.maxTime();
    if (!minTime && !maxTime) return false;

    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    const time = `${h}:${m}`;

    if (minTime && time < minTime.substring(0, 5)) return true;
    if (maxTime && time > maxTime.substring(0, 5)) return true;

    return false;
  }

  isSecondDisabled(second: number): boolean {
    const hour = this.selectedHour();
    const minute = this.selectedMinute();
    if (hour === null || minute === null) return false;

    const minTime = this.minTime();
    const maxTime = this.maxTime();
    if (!minTime && !maxTime) return false;

    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    const s = second.toString().padStart(2, '0');
    const time = `${h}:${m}:${s}`;

    if (minTime && time < minTime) return true;
    if (maxTime && time > maxTime) return true;

    return false;
  }

  formatNumber(value: number): string {
    return value.toString().padStart(2, '0');
  }

  // --- Clock Face ---

  isClockValueSelected(value: number): boolean {
    switch (this.currentView()) {
      case 'hours':
        return this.isHourSelected(value);
      case 'minutes':
        return this.isMinuteSelected(value);
      case 'seconds':
        return this.isSecondSelected(value);
    }
  }

  getClockNumberClasses(pos: ClockPosition): string {
    const base = 'absolute z-10 flex items-center justify-center rounded-full font-medium transition-colors';
    const size = pos.inner ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
    const selected = this.isClockValueSelected(pos.value);
    const selectedClass = selected ? 'text-primary-content font-bold' : 'hover:bg-base-300';
    return `${base} ${size} ${selectedClass}`;
  }

  getClockNumberOffset(pos: ClockPosition): number {
    return pos.inner ? 14 : 18;
  }

  onClockNumberClick(pos: ClockPosition): void {
    switch (this.currentView()) {
      case 'hours':
        if (this.use24Hour()) {
          this.selectHour(pos.value);
        } else {
          this.selectHour(pos.value);
        }
        break;
      case 'minutes':
        this.selectMinute(pos.value);
        break;
      case 'seconds':
        this.selectSecond(pos.value);
        break;
    }
  }

  onClockDialClick(event: Event): void {
    if (!(event instanceof MouseEvent)) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;

    const distance = Math.sqrt(x * x + y * y);
    if (distance > centerX || distance < 20) return;

    let angle = (Math.atan2(x, -y) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    const view = this.currentView();

    if (view === 'hours') {
      const hourIndex = Math.round(angle / 30) % 12;

      if (this.use24Hour()) {
        const threshold = centerX * 0.65;
        if (distance < threshold) {
          this.selectHour(hourIndex === 0 ? 0 : hourIndex + 12);
        } else {
          this.selectHour(hourIndex === 0 ? 12 : hourIndex);
        }
      } else {
        this.selectHour(hourIndex === 0 ? 12 : hourIndex);
      }
    } else if (view === 'minutes') {
      const step = Math.max(1, this.minuteStep());
      const rawMinute = Math.round(angle / 6) % 60;
      const minute = Math.round(rawMinute / step) * step;
      this.selectMinute(minute >= 60 ? 0 : minute);
    } else {
      const step = Math.max(1, this.secondStep());
      const rawSecond = Math.round(angle / 6) % 60;
      const second = Math.round(rawSecond / step) * step;
      this.selectSecond(second >= 60 ? 0 : second);
    }
  }

  // --- Private ---

  private emitIfComplete(): void {
    const value = this.currentValue();
    this.onChange(value);

    if (value) {
      this.timeChange.emit({
        value,
        hours: this.selectedHour()!,
        minutes: this.selectedMinute()!,
        seconds: this.selectedSecond() ?? 0,
      });
    }
  }

  private parseTimeString(value: string): void {
    const parts = value.split(':');
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      const second = parts.length >= 3 ? parseInt(parts[2], 10) : 0;

      if (!isNaN(hour) && !isNaN(minute)) {
        this.selectedHour.set(hour);
        this.selectedMinute.set(minute);
        if (this.showSeconds()) {
          this.selectedSecond.set(second);
        }
        if (!this.use24Hour()) {
          this.period.set(hour >= 12 ? 'PM' : 'AM');
        }
      }
    }
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

  onClickOutside(event: Event): void {
    if (!this.tpRoot().nativeElement.contains(event.target as Node)) {
      this.closePicker();
    }
  }

  private onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    if (event.key === 'Escape') {
      this.closePicker();
    }
  }
}
