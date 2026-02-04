import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe, DatePipe } from '@angular/common';
import { DatepickerComponent } from '@hakistack/ng-daisyui-v3';

@Component({
  selector: 'app-datepicker-demo',
  imports: [DatepickerComponent, ReactiveFormsModule, JsonPipe, DatePipe],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Datepicker</h1>
        <p class="text-base-content/70 mt-2">Date and date range picker with keyboard navigation</p>
      </div>

      <!-- Basic Datepicker -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Basic Datepicker</h2>
          <p class="text-sm text-base-content/60 mb-4">Simple single date selection</p>

          <div class="max-w-sm">
            <app-datepicker [formControl]="basicControl" placeholder="Select a date" [showClearButton]="true" [showTodayButton]="true" />
          </div>

          <div class="mt-4 text-sm">
            Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ basicControl.value | date : 'fullDate' }}</code>
          </div>
        </div>
      </div>

      <!-- Date Range -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Date Range Picker</h2>
          <p class="text-sm text-base-content/60 mb-4">Select a start and end date</p>

          <div class="max-w-md">
            <app-datepicker [formControl]="rangeControl" [range]="true" placeholder="Select date range" [showClearButton]="true" />
          </div>

          <div class="mt-4 text-sm">
            Selected Range: <code class="bg-base-200 px-2 py-1 rounded">{{ rangeControl.value | json }}</code>
          </div>
        </div>
      </div>

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
            <div>Min Date: <code class="bg-base-200 px-2 py-1 rounded">{{ minDate | date : 'mediumDate' }}</code></div>
            <div>Max Date: <code class="bg-base-200 px-2 py-1 rounded">{{ maxDate | date : 'mediumDate' }}</code></div>
          </div>
        </div>
      </div>

      <!-- Disabled Days -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Disabled Days of Week</h2>
          <p class="text-sm text-base-content/60 mb-4">Weekends disabled</p>

          <div class="max-w-sm">
            <app-datepicker [formControl]="weekdaysControl" placeholder="Select a weekday" [disabledDaysOfWeek]="[0, 6]" />
          </div>

          <div class="mt-4 text-sm text-base-content/60">Saturday (0) and Sunday (6) are disabled</div>
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
  `,
})
export class DatepickerDemoComponent {
  basicControl = new FormControl<Date | null>(null);
  rangeControl = new FormControl<{ start: Date; end: Date } | null>(null);
  constrainedControl = new FormControl<Date | null>(null);
  weekdaysControl = new FormControl<Date | null>(null);

  // Min/Max dates
  minDate = new Date();
  maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
}
