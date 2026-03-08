import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { TimepickerComponent } from './timepicker.component';

// Test host only for ControlValueAccessor tests
@Component({
  imports: [TimepickerComponent, ReactiveFormsModule],
  template: `<hk-timepicker [formControl]="control" [use24Hour]="use24Hour" [showSeconds]="showSeconds"
    [minuteStep]="minuteStep" [required]="required" [minTime]="minTime" [maxTime]="maxTime" />`,
})
class TestHostComponent {
  control = new FormControl<string | null>(null);
  use24Hour = true;
  showSeconds = false;
  minuteStep = 1;
  required = false;
  minTime?: string;
  maxTime?: string;
}

describe('TimepickerComponent', () => {

  // =========================================================================
  // Direct component tests (no host needed)
  // =========================================================================

  describe('Core logic', () => {
    let fixture: ComponentFixture<TimepickerComponent>;
    let component: TimepickerComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TimepickerComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TimepickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    // -----------------------------------------------------------------------
    // Display
    // -----------------------------------------------------------------------

    describe('Display', () => {
      it('should display 24h format', () => {
        component.writeValue('14:30');
        expect(component.displayValue()).toBe('14:30');
      });

      it('should display 12h format with PM', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        component.writeValue('14:30');
        expect(component.displayValue()).toBe('02:30 PM');
      });

      it('should display 12h format with AM', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        component.writeValue('09:15');
        expect(component.displayValue()).toBe('09:15 AM');
      });

      it('should display midnight as 12:00 AM in 12h', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        component.writeValue('00:00');
        expect(component.displayValue()).toBe('12:00 AM');
      });

      it('should display noon as 12:00 PM in 12h', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        component.writeValue('12:00');
        expect(component.displayValue()).toBe('12:00 PM');
      });

      it('should display with seconds when enabled', () => {
        fixture.componentRef.setInput('showSeconds', true);
        fixture.detectChanges();
        component.writeValue('14:30:45');
        expect(component.displayValue()).toBe('14:30:45');
      });

      it('should display -- for unset values in header', () => {
        expect(component.displayHour()).toBe('--');
        expect(component.displayMinute()).toBe('--');
        expect(component.displaySecond()).toBe('--');
      });
    });

    // -----------------------------------------------------------------------
    // parseUserInput (the bulletproof parser)
    // -----------------------------------------------------------------------

    describe('parseUserInput', () => {
      describe('colon-separated formats', () => {
        it('should parse "14:30"', () => {
          expect(component.parseUserInput('14:30')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "09:05"', () => {
          expect(component.parseUserInput('09:05')).toEqual({ hour: 9, minute: 5, second: 0 });
        });

        it('should parse "0:00"', () => {
          expect(component.parseUserInput('0:00')).toEqual({ hour: 0, minute: 0, second: 0 });
        });

        it('should parse "23:59"', () => {
          expect(component.parseUserInput('23:59')).toEqual({ hour: 23, minute: 59, second: 0 });
        });

        it('should parse "14:30:45" with seconds', () => {
          expect(component.parseUserInput('14:30:45')).toEqual({ hour: 14, minute: 30, second: 45 });
        });

        it('should parse dot-separated "14.30"', () => {
          expect(component.parseUserInput('14.30')).toEqual({ hour: 14, minute: 30, second: 0 });
        });
      });

      describe('AM/PM formats', () => {
        it('should parse "2:30 PM"', () => {
          expect(component.parseUserInput('2:30 PM')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "2:30 AM"', () => {
          expect(component.parseUserInput('2:30 AM')).toEqual({ hour: 2, minute: 30, second: 0 });
        });

        it('should parse "12:00 PM" as noon', () => {
          expect(component.parseUserInput('12:00 PM')).toEqual({ hour: 12, minute: 0, second: 0 });
        });

        it('should parse "12:00 AM" as midnight', () => {
          expect(component.parseUserInput('12:00 AM')).toEqual({ hour: 0, minute: 0, second: 0 });
        });

        it('should parse lowercase "2:30 pm"', () => {
          expect(component.parseUserInput('2:30 pm')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "2:30pm" without space', () => {
          expect(component.parseUserInput('2:30pm')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "2:30PM" uppercase no space', () => {
          expect(component.parseUserInput('2:30PM')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "2:30 p.m."', () => {
          expect(component.parseUserInput('2:30 p.m.')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "2:30 a.m."', () => {
          expect(component.parseUserInput('2:30 a.m.')).toEqual({ hour: 2, minute: 30, second: 0 });
        });
      });

      describe('shorthand AM/PM', () => {
        it('should parse "2p" as 2:00 PM', () => {
          expect(component.parseUserInput('2p')).toEqual({ hour: 14, minute: 0, second: 0 });
        });

        it('should parse "2a" as 2:00 AM', () => {
          expect(component.parseUserInput('2a')).toEqual({ hour: 2, minute: 0, second: 0 });
        });

        it('should parse "12p" as 12:00 PM (noon)', () => {
          expect(component.parseUserInput('12p')).toEqual({ hour: 12, minute: 0, second: 0 });
        });

        it('should parse "12a" as 12:00 AM (midnight)', () => {
          expect(component.parseUserInput('12a')).toEqual({ hour: 0, minute: 0, second: 0 });
        });

        it('should parse "230p" as 2:30 PM', () => {
          expect(component.parseUserInput('230p')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should parse "1130a" as 11:30 AM', () => {
          expect(component.parseUserInput('1130a')).toEqual({ hour: 11, minute: 30, second: 0 });
        });
      });

      describe('bare digit formats', () => {
        it('should parse "1" as 1:00', () => {
          expect(component.parseUserInput('1')).toEqual({ hour: 1, minute: 0, second: 0 });
        });

        it('should parse "9" as 9:00', () => {
          expect(component.parseUserInput('9')).toEqual({ hour: 9, minute: 0, second: 0 });
        });

        it('should parse "13" as 13:00', () => {
          expect(component.parseUserInput('13')).toEqual({ hour: 13, minute: 0, second: 0 });
        });

        it('should parse "0" as 00:00', () => {
          expect(component.parseUserInput('0')).toEqual({ hour: 0, minute: 0, second: 0 });
        });

        it('should parse "23" as 23:00', () => {
          expect(component.parseUserInput('23')).toEqual({ hour: 23, minute: 0, second: 0 });
        });

        it('should parse "130" as 1:30', () => {
          expect(component.parseUserInput('130')).toEqual({ hour: 1, minute: 30, second: 0 });
        });

        it('should parse "930" as 9:30', () => {
          expect(component.parseUserInput('930')).toEqual({ hour: 9, minute: 30, second: 0 });
        });

        it('should parse "1300" as 13:00', () => {
          expect(component.parseUserInput('1300')).toEqual({ hour: 13, minute: 0, second: 0 });
        });

        it('should parse "0930" as 09:30', () => {
          expect(component.parseUserInput('0930')).toEqual({ hour: 9, minute: 30, second: 0 });
        });

        it('should parse "2359" as 23:59', () => {
          expect(component.parseUserInput('2359')).toEqual({ hour: 23, minute: 59, second: 0 });
        });

        it('should parse "133045" as 13:30:45', () => {
          expect(component.parseUserInput('133045')).toEqual({ hour: 13, minute: 30, second: 45 });
        });

        it('should parse "093015" as 09:30:15', () => {
          expect(component.parseUserInput('093015')).toEqual({ hour: 9, minute: 30, second: 15 });
        });
      });

      describe('JS millisecond timestamps', () => {
        it('should parse a Date.now()-style timestamp', () => {
          const date = new Date(2024, 0, 15, 14, 30, 0);
          const result = component.parseUserInput(date.getTime().toString());
          expect(result).toBeTruthy();
          expect(result!.hour).toBe(14);
          expect(result!.minute).toBe(30);
          expect(result!.second).toBe(0);
        });

        it('should parse timestamp for midnight', () => {
          const date = new Date(2024, 0, 15, 0, 0, 0);
          const result = component.parseUserInput(date.getTime().toString());
          expect(result).toBeTruthy();
          expect(result!.hour).toBe(0);
          expect(result!.minute).toBe(0);
        });

        it('should parse timestamp for 23:59', () => {
          const date = new Date(2024, 0, 15, 23, 59, 30);
          const result = component.parseUserInput(date.getTime().toString());
          expect(result).toBeTruthy();
          expect(result!.hour).toBe(23);
          expect(result!.minute).toBe(59);
          expect(result!.second).toBe(30);
        });
      });

      describe('seconds since midnight (5+ digits)', () => {
        it('should parse 43200 as 12:00:00', () => {
          expect(component.parseUserInput('43200')).toEqual({ hour: 12, minute: 0, second: 0 });
        });

        it('should parse 82800 as 23:00:00', () => {
          expect(component.parseUserInput('82800')).toEqual({ hour: 23, minute: 0, second: 0 });
        });

        it('should parse 86400 as 23:59:59 (clamped)', () => {
          expect(component.parseUserInput('86400')).toEqual({ hour: 23, minute: 59, second: 59 });
        });

        it('should parse 45296 as 12:34:56', () => {
          expect(component.parseUserInput('45296')).toEqual({ hour: 12, minute: 34, second: 56 });
        });

        it('should prefer compact time over seconds-since-midnight for 3-4 digit numbers', () => {
          // "3600" → 4 digits → treated as compact HH:MM (36:00 invalid → falls through)
          // "5400" → 4 digits → treated as compact HH:MM (54:00 invalid → falls through)
          // These are ambiguous, so compact time wins for 3-4 digits
          expect(component.parseUserInput('1300')).toEqual({ hour: 13, minute: 0, second: 0 });
        });
      });

      describe('minute step snapping', () => {
        it('should snap minutes to 5-minute step', () => {
          fixture.componentRef.setInput('minuteStep', 5);
          fixture.detectChanges();

          expect(component.parseUserInput('14:32')).toEqual({ hour: 14, minute: 30, second: 0 });
          expect(component.parseUserInput('14:33')).toEqual({ hour: 14, minute: 35, second: 0 });
          expect(component.parseUserInput('14:37')).toEqual({ hour: 14, minute: 35, second: 0 });
          expect(component.parseUserInput('14:38')).toEqual({ hour: 14, minute: 40, second: 0 });
        });

        it('should snap minutes to 15-minute step', () => {
          fixture.componentRef.setInput('minuteStep', 15);
          fixture.detectChanges();

          expect(component.parseUserInput('14:07')).toEqual({ hour: 14, minute: 0, second: 0 });
          expect(component.parseUserInput('14:08')).toEqual({ hour: 14, minute: 15, second: 0 });
          expect(component.parseUserInput('14:22')).toEqual({ hour: 14, minute: 15, second: 0 });
          expect(component.parseUserInput('14:53')).toEqual({ hour: 14, minute: 45, second: 0 });
        });

        it('should not snap past 59 (clamp to last valid step)', () => {
          fixture.componentRef.setInput('minuteStep', 15);
          fixture.detectChanges();

          expect(component.parseUserInput('14:59')).toEqual({ hour: 14, minute: 45, second: 0 });
        });
      });

      describe('invalid inputs', () => {
        it('should return null for empty string', () => {
          expect(component.parseUserInput('')).toBeNull();
        });

        it('should return null for random text', () => {
          expect(component.parseUserInput('hello')).toBeNull();
        });

        it('should return null for hour > 23 in 24h mode', () => {
          expect(component.parseUserInput('25:00')).toBeNull();
        });

        it('should return null for minute > 59', () => {
          expect(component.parseUserInput('14:60')).toBeNull();
        });

        it('should return null for negative values', () => {
          expect(component.parseUserInput('-1:30')).toBeNull();
        });

        it('should return null for hour > 12 with AM/PM', () => {
          expect(component.parseUserInput('13:00 AM')).toBeNull();
        });

        it('should return null for hour 0 with AM/PM', () => {
          expect(component.parseUserInput('0:00 AM')).toBeNull();
        });
      });

      describe('whitespace tolerance', () => {
        it('should handle leading/trailing spaces', () => {
          expect(component.parseUserInput('  14:30  ')).toEqual({ hour: 14, minute: 30, second: 0 });
        });

        it('should handle extra spaces around AM/PM', () => {
          expect(component.parseUserInput('2:30  PM')).toEqual({ hour: 14, minute: 30, second: 0 });
        });
      });
    });

    // -----------------------------------------------------------------------
    // Picker Operations
    // -----------------------------------------------------------------------

    describe('Picker Operations', () => {
      it('should open picker', () => {
        component.openPicker();
        expect(component.isOpen()).toBe(true);
      });

      it('should close picker', () => {
        component.openPicker();
        component.closePicker();
        expect(component.isOpen()).toBe(false);
      });

      it('should toggle picker', () => {
        component.togglePicker();
        expect(component.isOpen()).toBe(true);
        component.togglePicker();
        expect(component.isOpen()).toBe(false);
      });

      it('should reset view to hours when opening', () => {
        component.currentView.set('minutes');
        component.openPicker();
        expect(component.currentView()).toBe('hours');
      });

      it('should not open when disabled', () => {
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();
        component.openPicker();
        expect(component.isOpen()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Selection Flow
    // -----------------------------------------------------------------------

    describe('Selection Flow', () => {
      it('should advance to minutes after selecting hour', () => {
        component.openPicker();
        component.selectHour(14);
        expect(component.currentView()).toBe('minutes');
      });

      it('should advance to seconds after minute when showSeconds', () => {
        fixture.componentRef.setInput('showSeconds', true);
        fixture.detectChanges();
        component.openPicker();
        component.selectHour(14);
        component.selectMinute(30);
        expect(component.currentView()).toBe('seconds');
        expect(component.isOpen()).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // 12-hour Mode
    // -----------------------------------------------------------------------

    describe('12-hour Mode', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
      });

      it('should convert 12h AM selection to 24h internally', () => {
        component.period.set('AM');
        component.selectHour(9);
        expect(component.selectedHour()).toBe(9);
      });

      it('should convert 12h PM selection to 24h internally', () => {
        component.period.set('PM');
        component.selectHour(2);
        expect(component.selectedHour()).toBe(14);
      });

      it('should handle 12 AM as midnight (0)', () => {
        component.period.set('AM');
        component.selectHour(12);
        expect(component.selectedHour()).toBe(0);
      });

      it('should handle 12 PM as noon (12)', () => {
        component.period.set('PM');
        component.selectHour(12);
        expect(component.selectedHour()).toBe(12);
      });

      it('should toggle period and update hour', () => {
        component.writeValue('14:30');
        expect(component.period()).toBe('PM');
        component.togglePeriod();
        expect(component.period()).toBe('AM');
        expect(component.selectedHour()).toBe(2);
      });
    });

    // -----------------------------------------------------------------------
    // Select Now
    // -----------------------------------------------------------------------

    describe('selectNow', () => {
      it('should set current time', () => {
        component.selectNow();
        expect(component.selectedHour()).not.toBeNull();
        expect(component.selectedMinute()).not.toBeNull();
      });

      it('should snap minutes to step when selecting now', () => {
        fixture.componentRef.setInput('minuteStep', 15);
        fixture.detectChanges();
        component.selectNow();
        const minute = component.selectedMinute()!;
        expect(minute % 15).toBe(0);
      });
    });

    // -----------------------------------------------------------------------
    // Clear Selection
    // -----------------------------------------------------------------------

    describe('Clear Selection', () => {
      it('should clear all values', () => {
        component.writeValue('14:30');
        component.clearSelection();
        expect(component.selectedHour()).toBeNull();
        expect(component.selectedMinute()).toBeNull();
        expect(component.selectedSecond()).toBeNull();
        expect(component.period()).toBe('AM');
      });

      it('should not clear when disabled via setDisabledState', () => {
        component.writeValue('14:30');
        component.setDisabledState(true);
        component.clearSelection();
        expect(component.selectedHour()).toBe(14);
      });
    });

    // -----------------------------------------------------------------------
    // Hour/Minute Options
    // -----------------------------------------------------------------------

    describe('Hour Options', () => {
      it('should provide 24 hours in 24h mode', () => {
        expect(component.hourOptions().length).toBe(24);
        expect(component.hourOptions()[0]).toBe(0);
        expect(component.hourOptions()[23]).toBe(23);
      });

      it('should provide 12 hours in 12h mode', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        expect(component.hourOptions().length).toBe(12);
        expect(component.hourOptions()[0]).toBe(12);
        expect(component.hourOptions()[1]).toBe(1);
      });
    });

    describe('Step options', () => {
      it('should generate minute options with step 5', () => {
        fixture.componentRef.setInput('minuteStep', 5);
        fixture.detectChanges();
        expect(component.minuteOptions()).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
      });

      it('should generate minute options with step 15', () => {
        fixture.componentRef.setInput('minuteStep', 15);
        fixture.detectChanges();
        expect(component.minuteOptions()).toEqual([0, 15, 30, 45]);
      });

      it('should generate second options with step 10', () => {
        fixture.componentRef.setInput('secondStep', 10);
        fixture.detectChanges();
        expect(component.secondOptions()).toEqual([0, 10, 20, 30, 40, 50]);
      });
    });

    // -----------------------------------------------------------------------
    // Disabled state checks
    // -----------------------------------------------------------------------

    describe('Disabled state checks', () => {
      it('should disable hours before minTime', () => {
        fixture.componentRef.setInput('minTime', '09:00');
        fixture.detectChanges();
        expect(component.isHourDisabled(8)).toBe(true);
        expect(component.isHourDisabled(9)).toBe(false);
      });

      it('should disable hours after maxTime', () => {
        fixture.componentRef.setInput('maxTime', '17:00');
        fixture.detectChanges();
        expect(component.isHourDisabled(18)).toBe(true);
        expect(component.isHourDisabled(17)).toBe(false);
      });

      it('should disable minutes before minTime for selected hour', () => {
        fixture.componentRef.setInput('minTime', '09:30');
        fixture.detectChanges();
        component.selectedHour.set(9);
        expect(component.isMinuteDisabled(29)).toBe(true);
        expect(component.isMinuteDisabled(30)).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Clock Face
    // -----------------------------------------------------------------------

    describe('Clock Face', () => {
      it('should generate 12 hour positions for 12h mode', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        expect(component.clockHourPositions().length).toBe(12);
      });

      it('should generate 24 hour positions for 24h mode', () => {
        expect(component.clockHourPositions().length).toBe(24);
      });

      it('should generate 12 minute positions', () => {
        expect(component.clockMinutePositions().length).toBe(12);
      });

      it('should calculate clock hand angle for hour', () => {
        component.selectedHour.set(3);
        component.currentView.set('hours');
        expect(component.clockHandAngle()).toBe(90);
      });

      it('should calculate clock hand angle for minute', () => {
        component.selectedMinute.set(15);
        component.currentView.set('minutes');
        expect(component.clockHandAngle()).toBe(90);
      });

      it('should detect inner ring for 24h hours > 12', () => {
        component.selectedHour.set(15);
        component.currentView.set('hours');
        expect(component.clockHandIsInner()).toBe(true);
      });

      it('should detect outer ring for 24h hours 1-12', () => {
        component.selectedHour.set(3);
        component.currentView.set('hours');
        expect(component.clockHandIsInner()).toBe(false);
      });

      it('should detect inner ring for hour 0 (midnight)', () => {
        component.selectedHour.set(0);
        component.currentView.set('hours');
        expect(component.clockHandIsInner()).toBe(true);
      });

      it('should show clock hand only when value is selected', () => {
        component.currentView.set('hours');
        expect(component.showClockHand()).toBe(false);
        component.selectedHour.set(3);
        expect(component.showClockHand()).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Input hint (live preview)
    // -----------------------------------------------------------------------

    describe('Input hint', () => {
      it('should show hint as user types valid input', () => {
        component.onInputFocus();
        const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputEl.value = '14';
        inputEl.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(component.inputHint()).toBe('14:00');
      });

      it('should show 12h hint in 12h mode', () => {
        fixture.componentRef.setInput('use24Hour', false);
        fixture.detectChanges();
        component.onInputFocus();
        const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputEl.value = '2:30pm';
        inputEl.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(component.inputHint()).toBe('02:30 PM');
      });

      it('should clear hint for invalid input', () => {
        component.onInputFocus();
        const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputEl.value = 'abc';
        inputEl.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(component.inputHint()).toBe('');
      });

      it('should clear hint on blur', () => {
        component.onInputFocus();
        const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputEl.value = '14:30';
        inputEl.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(component.inputHint()).toBe('14:30');

        inputEl.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        expect(component.inputHint()).toBe('');
      });
    });
  });

  // =========================================================================
  // ControlValueAccessor tests (requires test host with FormControl)
  // =========================================================================

  describe('ControlValueAccessor', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;
    let host: TestHostComponent;
    let timepicker: TimepickerComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      hostFixture = TestBed.createComponent(TestHostComponent);
      host = hostFixture.componentInstance;
      hostFixture.detectChanges();
      timepicker = hostFixture.debugElement.children[0].componentInstance;
    });

    it('should write a value from formControl', () => {
      host.control.setValue('14:30');
      expect(timepicker.selectedHour()).toBe(14);
      expect(timepicker.selectedMinute()).toBe(30);
      expect(timepicker.displayValue()).toBe('14:30');
    });

    it('should write null and clear state', () => {
      host.control.setValue('14:30');
      host.control.setValue(null);
      expect(timepicker.selectedHour()).toBeNull();
      expect(timepicker.displayValue()).toBe('');
    });

    it('should propagate selection changes back to formControl', () => {
      timepicker.selectHour(14);
      timepicker.selectMinute(30);
      expect(host.control.value).toBe('14:30');
    });

    it('should propagate null on clear', () => {
      host.control.setValue('14:30');
      timepicker.clearSelection();
      expect(host.control.value).toBeNull();
    });

    it('should close after selecting minute and emit value', () => {
      timepicker.openPicker();
      timepicker.selectHour(14);
      timepicker.selectMinute(30);
      expect(timepicker.isOpen()).toBe(false);
      expect(host.control.value).toBe('14:30');
    });

    it('should close after selecting second when showSeconds', async () => {
      // Need a fresh host with showSeconds=true from the start
      const f = TestBed.createComponent(TestHostComponent);
      const h = f.componentInstance;
      h.showSeconds = true;
      f.detectChanges();
      const tp: TimepickerComponent = f.debugElement.children[0].componentInstance;

      tp.openPicker();
      tp.selectHour(14);
      tp.selectMinute(30);
      tp.selectSecond(45);
      expect(tp.isOpen()).toBe(false);
      expect(h.control.value).toBe('14:30:45');
    });

    it('should not open when form control is disabled', () => {
      host.control.disable();
      timepicker.openPicker();
      expect(timepicker.isOpen()).toBe(false);
    });

    it('should not clear when form control is disabled', () => {
      host.control.setValue('14:30');
      host.control.disable();
      timepicker.clearSelection();
      expect(timepicker.selectedHour()).toBe(14);
    });
  });

  // =========================================================================
  // Validation (requires test host with FormControl)
  // =========================================================================

  describe('Validation', () => {
    async function createHost(overrides: Partial<TestHostComponent> = {}) {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      const f = TestBed.createComponent(TestHostComponent);
      const h = f.componentInstance;
      Object.assign(h, overrides);
      f.detectChanges();
      return { fixture: f, host: h };
    }

    it('should validate required when empty', async () => {
      const { host } = await createHost({ required: true });
      expect(host.control.hasError('required')).toBe(true);
    });

    it('should pass required when value set', async () => {
      const { host } = await createHost({ required: true });
      host.control.setValue('14:30');
      expect(host.control.hasError('required')).toBe(false);
    });

    it('should validate minTime', async () => {
      const { host } = await createHost({ minTime: '09:00' });
      host.control.setValue('08:30');
      expect(host.control.hasError('minTime')).toBe(true);

      host.control.setValue('09:30');
      expect(host.control.hasError('minTime')).toBe(false);
    });

    it('should validate maxTime', async () => {
      const { host } = await createHost({ maxTime: '17:00' });
      host.control.setValue('17:30');
      expect(host.control.hasError('maxTime')).toBe(true);

      host.control.setValue('16:30');
      expect(host.control.hasError('maxTime')).toBe(false);
    });
  });
});
