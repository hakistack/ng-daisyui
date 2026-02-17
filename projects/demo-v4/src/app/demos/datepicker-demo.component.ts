import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe, DatePipe } from '@angular/common';
import { DatepickerComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { ApiDocEntry } from '../shared/api-table.types';

type DatepickerTab = 'basic' | 'options' | 'advanced';

@Component({
  selector: 'app-datepicker-demo',
  imports: [DatepickerComponent, ReactiveFormsModule, JsonPipe, DatePipe, DocSectionComponent, ApiTableComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Datepicker</h1>
        <p class="text-base-content/70 mt-2">Date and date range picker with keyboard navigation</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} DatepickerComponent {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-bordered">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-boxed">
          <input type="radio" name="datepicker_tabs" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="datepicker_tabs" role="tab" class="tab" aria-label="Options"
            [checked]="activeTab() === 'options'" (change)="activeTab.set('options')" />
          <input type="radio" name="datepicker_tabs" role="tab" class="tab" aria-label="Advanced"
            [checked]="activeTab() === 'advanced'" (change)="activeTab.set('advanced')" />
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Basic Datepicker" description="Simple single date selection" [codeExample]="basicCode">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="basicControl"
                  placeholder="Select a date"
                  [showClearButton]="true"
                  [showTodayButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ basicControl.value | date:'fullDate' }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="Date Range Picker" description="Select a start and end date" [codeExample]="rangeCode">
              <div class="max-w-md">
                <hk-datepicker
                  [formControl]="rangeControl"
                  [range]="true"
                  placeholder="Select date range"
                  [showClearButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected Range: <code class="bg-base-200 px-2 py-1 rounded">{{ rangeControl.value | json }}</code>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'options') {
          <div class="space-y-6">
            <app-doc-section title="Min/Max Constraints" description="Restrict selectable date range">
              <div class="max-w-sm">
                <hk-datepicker
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
            </app-doc-section>

            <app-doc-section title="Disabled Days of Week" description="Weekends disabled">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="weekdaysControl"
                  placeholder="Select a weekday"
                  [disabledDaysOfWeek]="[0, 6]"
                />
              </div>
              <div class="mt-4 text-sm text-base-content/60">
                Saturday (0) and Sunday (6) are disabled
              </div>
            </app-doc-section>

            <app-doc-section title="Week Numbers" description="Show ISO week numbers">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="weekNumbersControl"
                  placeholder="Select a date"
                  [showWeekNumbers]="true"
                  [firstDayOfWeek]="1"
                />
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'advanced') {
          <div class="space-y-6">
            <app-doc-section title="Custom Formatting" description="Custom date display format" [codeExample]="customFormatCode">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="customFormatControl"
                  placeholder="Select a date"
                  [customDateFormatter]="customFormatter"
                />
              </div>
              <div class="mt-4 text-sm text-base-content/60">
                Format: "Day, Month Date, Year"
              </div>
            </app-doc-section>

            <app-doc-section title="Dropdown Positions" description="Control where the calendar appears">
              <div class="grid grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label class="label"><span class="label-text">Bottom Left (default)</span></label>
                  <hk-datepicker placeholder="Bottom Left" dropdownPosition="bottom-left" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Bottom Right</span></label>
                  <hk-datepicker placeholder="Bottom Right" dropdownPosition="bottom-right" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Top Left</span></label>
                  <hk-datepicker placeholder="Top Left" dropdownPosition="top-left" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Top Right</span></label>
                  <hk-datepicker placeholder="Top Right" dropdownPosition="top-right" />
                </div>
              </div>
            </app-doc-section>

            <app-doc-section title="Disabled State" description="Non-interactive datepicker">
              <div class="max-w-sm">
                <hk-datepicker [disabled]="true" placeholder="Disabled datepicker" />
              </div>
            </app-doc-section>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Inputs" [entries]="inputDocs" />
          <app-api-table title="Outputs" [entries]="outputDocs" />
          <app-api-table title="Methods" [entries]="methodDocs" />
        </div>
      }
    </div>
  `,
})
export class DatepickerDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<DatepickerTab>('basic');

  basicControl = new FormControl<Date | null>(null);
  rangeControl = new FormControl<{ start: Date; end: Date } | null>(null);
  constrainedControl = new FormControl<Date | null>(null);
  weekdaysControl = new FormControl<Date | null>(null);
  weekNumbersControl = new FormControl<Date | null>(null);
  customFormatControl = new FormControl<Date | null>(null);

  minDate = new Date();
  maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  customFormatter = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // --- Code examples ---
  basicCode = `// TypeScript
dateControl = new FormControl<Date | null>(null);

// Template
<hk-datepicker
  [formControl]="dateControl"
  placeholder="Select a date"
  [showClearButton]="true"
  [showTodayButton]="true"
/>`;

  rangeCode = `// TypeScript
rangeControl = new FormControl<{ start: Date; end: Date } | null>(null);

// Template
<hk-datepicker
  [formControl]="rangeControl"
  [range]="true"
  placeholder="Select date range"
  [showClearButton]="true"
/>`;

  customFormatCode = `// TypeScript
customFormatControl = new FormControl<Date | null>(null);
customFormatter = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric',
  });
};

// Template
<hk-datepicker
  [formControl]="customFormatControl"
  [customDateFormatter]="customFormatter"
  placeholder="Select a date"
/>`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    { name: 'range', type: 'boolean', default: 'false', description: 'Enable date range selection' },
    { name: 'placeholder', type: 'string', default: "'Select Date'", description: 'Placeholder text' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the datepicker' },
    { name: 'locale', type: 'string', default: "'en-US'", description: 'Locale for date formatting' },
    { name: 'minDate', type: 'Date', default: '-', description: 'Minimum selectable date' },
    { name: 'maxDate', type: 'Date', default: '-', description: 'Maximum selectable date' },
    { name: 'disabledDates', type: 'Date[]', default: '[]', description: 'Specific dates to disable' },
    { name: 'disabledDaysOfWeek', type: 'number[]', default: '[]', description: 'Days of week to disable (0=Sun, 6=Sat)' },
    { name: 'showWeekNumbers', type: 'boolean', default: 'false', description: 'Show ISO week numbers' },
    { name: 'firstDayOfWeek', type: 'number', default: '0', description: 'First day of week (0=Sun)' },
    { name: 'closeOnSelect', type: 'boolean', default: 'true', description: 'Close picker after selection' },
    { name: 'showClearButton', type: 'boolean', default: 'true', description: 'Show clear button' },
    { name: 'showTodayButton', type: 'boolean', default: 'false', description: 'Show today shortcut button' },
    { name: 'dropdownPosition', type: 'DatepickerPosition', default: "'bottom-left'", description: 'Dropdown position relative to input' },
    { name: 'customDateFormatter', type: '(date: Date) => string', default: '-', description: 'Custom date display formatter' },
    { name: 'customRangeFormatter', type: '(start: Date, end: Date) => string', default: '-', description: 'Custom range display formatter' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'selectionChange', type: 'DatepickerEvent', description: 'Emitted when date selection changes' },
    { name: 'dateSelected', type: 'Date', description: 'Emitted when a single date is selected' },
    { name: 'rangeSelected', type: '{ start: Date; end: Date }', description: 'Emitted when a date range is selected' },
    { name: 'pickerOpened', type: 'void', description: 'Emitted when the picker opens' },
    { name: 'pickerClosed', type: 'void', description: 'Emitted when the picker closes' },
    { name: 'viewChanged', type: 'ViewMode', description: 'Emitted when view mode changes (days/months/years)' },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'togglePicker()', type: 'void', description: 'Toggle picker open/close' },
    { name: 'openPicker()', type: 'void', description: 'Open the picker' },
    { name: 'closePicker()', type: 'void', description: 'Close the picker' },
    { name: 'selectToday()', type: 'void', description: 'Select today\'s date' },
    { name: 'clearSelection()', type: 'void', description: 'Clear current selection' },
    { name: 'setView(mode)', type: 'void', description: 'Set view mode (days, months, years)' },
    { name: 'navigateMonth(direction)', type: 'void', description: 'Navigate to previous/next month' },
  ];
}
