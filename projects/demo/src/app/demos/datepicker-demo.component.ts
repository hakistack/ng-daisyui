import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe, DatePipe } from '@angular/common';
import { DatepickerComponent } from '@hakistack/ng-daisyui';

type DatepickerTab = 'basic' | 'options' | 'advanced';

@Component({
  selector: 'app-datepicker-demo',
  imports: [DatepickerComponent, ReactiveFormsModule, JsonPipe, DatePipe],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Datepicker</h1>
        <p class="text-base-content/70 mt-2">Date and date range picker with keyboard navigation</p>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-box">
        <input
          type="radio"
          name="datepicker_tabs"
          role="tab"
          class="tab"
          aria-label="Basic"
          [checked]="activeTab() === 'basic'"
          (change)="activeTab.set('basic')"
        />
        <input
          type="radio"
          name="datepicker_tabs"
          role="tab"
          class="tab"
          aria-label="Options"
          [checked]="activeTab() === 'options'"
          (change)="activeTab.set('options')"
        />
        <input
          type="radio"
          name="datepicker_tabs"
          role="tab"
          class="tab"
          aria-label="Advanced"
          [checked]="activeTab() === 'advanced'"
          (change)="activeTab.set('advanced')"
        />
      </div>

      <!-- Basic Tab -->
      @if (activeTab() === 'basic') {
        <div class="space-y-6">
          <!-- Basic Datepicker -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Basic Datepicker</h2>
              <p class="text-sm text-base-content/60 mb-4">Simple single date selection</p>

              <div class="max-w-sm">
                <app-datepicker
                  [formControl]="basicControl"
                  placeholder="Select a date"
                  [showClearButton]="true"
                  [showTodayButton]="true"
                />
              </div>

              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ basicControl.value | date:'fullDate' }}</code>
              </div>
            </div>
          </div>

          <!-- Date Range -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Date Range Picker</h2>
              <p class="text-sm text-base-content/60 mb-4">Select a start and end date</p>

              <div class="max-w-md">
                <app-datepicker
                  [formControl]="rangeControl"
                  [range]="true"
                  placeholder="Select date range"
                  [showClearButton]="true"
                />
              </div>

              <div class="mt-4 text-sm">
                Selected Range: <code class="bg-base-200 px-2 py-1 rounded">{{ rangeControl.value | json }}</code>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Options Tab -->
      @if (activeTab() === 'options') {
        <div class="space-y-6">
          <!-- Min/Max Dates -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Min/Max Constraints</h2>
              <p class="text-sm text-base-content/60 mb-4">Restrict selectable date range</p>

              <div class="max-w-sm">
                <app-datepicker
                  [formControl]="constrainedControl"
                  placeholder="Select within range"
                  [minDate]="minDate"
                  [maxDate]="maxDate"
                  [showTodayButton]="true"
                />
              </div>

              <div class="mt-4 text-sm space-y-1">
                <div>Min Date: <code class="bg-base-200 px-2 py-1 rounded">{{ minDate | date:'mediumDate' }}</code></div>
                <div>Max Date: <code class="bg-base-200 px-2 py-1 rounded">{{ maxDate | date:'mediumDate' }}</code></div>
              </div>
            </div>
          </div>

          <!-- Disabled Days -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Disabled Days of Week</h2>
              <p class="text-sm text-base-content/60 mb-4">Weekends disabled</p>

              <div class="max-w-sm">
                <app-datepicker
                  [formControl]="weekdaysControl"
                  placeholder="Select a weekday"
                  [disabledDaysOfWeek]="[0, 6]"
                />
              </div>

              <div class="mt-4 text-sm text-base-content/60">
                Saturday (0) and Sunday (6) are disabled
              </div>
            </div>
          </div>

          <!-- Week Numbers -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Week Numbers</h2>
              <p class="text-sm text-base-content/60 mb-4">Show ISO week numbers</p>

              <div class="max-w-sm">
                <app-datepicker
                  [formControl]="weekNumbersControl"
                  placeholder="Select a date"
                  [showWeekNumbers]="true"
                  [firstDayOfWeek]="1"
                />
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Advanced Tab -->
      @if (activeTab() === 'advanced') {
        <div class="space-y-6">
          <!-- Custom Formatting -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Custom Formatting</h2>
              <p class="text-sm text-base-content/60 mb-4">Custom date display format</p>

              <div class="max-w-sm">
                <app-datepicker
                  [formControl]="customFormatControl"
                  placeholder="Select a date"
                  [customDateFormatter]="customFormatter"
                />
              </div>

              <div class="mt-4 text-sm text-base-content/60">
                Format: "Day, Month Date, Year"
              </div>
            </div>
          </div>

          <!-- Dropdown Positions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Dropdown Positions</h2>
              <p class="text-sm text-base-content/60 mb-4">Control where the calendar appears</p>

              <div class="grid grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label class="label"><span class="label-text">Bottom Left (default)</span></label>
                  <app-datepicker placeholder="Bottom Left" dropdownPosition="bottom-left" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Bottom Right</span></label>
                  <app-datepicker placeholder="Bottom Right" dropdownPosition="bottom-right" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Top Left</span></label>
                  <app-datepicker placeholder="Top Left" dropdownPosition="top-left" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Top Right</span></label>
                  <app-datepicker placeholder="Top Right" dropdownPosition="top-right" />
                </div>
              </div>
            </div>
          </div>

          <!-- Disabled State -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Disabled State</h2>
              <p class="text-sm text-base-content/60 mb-4">Non-interactive datepicker</p>

              <div class="max-w-sm">
                <app-datepicker [disabled]="true" placeholder="Disabled datepicker" />
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DatepickerDemoComponent {
  activeTab = signal<DatepickerTab>('basic');

  basicControl = new FormControl<Date | null>(null);
  rangeControl = new FormControl<{ start: Date; end: Date } | null>(null);
  constrainedControl = new FormControl<Date | null>(null);
  weekdaysControl = new FormControl<Date | null>(null);
  weekNumbersControl = new FormControl<Date | null>(null);
  customFormatControl = new FormControl<Date | null>(null);

  // Min/Max dates
  minDate = new Date();
  maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Custom formatter
  customFormatter = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
}
