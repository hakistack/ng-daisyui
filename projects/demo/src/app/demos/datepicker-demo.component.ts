import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe, DatePipe } from '@angular/common';
import { DatepickerComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type DatepickerTab = 'basic' | 'datetime' | 'options' | 'advanced';
type ApiSubTab = 'component' | 'configuration' | 'time-mode' | 'types';

@Component({
  selector: 'app-datepicker-demo',
  imports: [DatepickerComponent, ReactiveFormsModule, JsonPipe, DatePipe, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
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
      <div role="tablist" class="tabs tabs-border">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box">
          <input type="radio" name="datepicker_tabs" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="datepicker_tabs" role="tab" class="tab" aria-label="Date + Time"
            [checked]="activeTab() === 'datetime'" (change)="activeTab.set('datetime')" />
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

        @if (activeTab() === 'datetime') {
          <div class="space-y-6">
            <app-doc-section title="Date + Time Picker" description="Select both date and time in a single dropdown" [codeExample]="datetimeCode">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="datetimeControl"
                  placeholder="Select date and time"
                  [showTime]="true"
                  [showClearButton]="true"
                  [showTodayButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ datetimeControl.value | date:'medium' }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="24-Hour Format" description="Date + time in 24-hour format" [codeExample]="datetime24hCode">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="datetime24hControl"
                  placeholder="Select date and time (24h)"
                  [showTime]="true"
                  [use24Hour]="true"
                  [showClearButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ datetime24hControl.value | date:'medium' }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="15-Minute Steps" description="Date + time with 15-minute intervals" [codeExample]="datetimeStepCode">
              <div class="max-w-sm">
                <hk-datepicker
                  [formControl]="datetimeStepControl"
                  placeholder="Select appointment"
                  [showTime]="true"
                  [minuteStep]="15"
                  [showClearButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ datetimeStepControl.value | date:'medium' }}</code>
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
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box">
          <input type="radio" name="api_tabs" role="tab" class="tab" aria-label="Component"
            [checked]="apiTab() === 'component'" (change)="apiTab.set('component')" />
          <input type="radio" name="api_tabs" role="tab" class="tab" aria-label="Configuration"
            [checked]="apiTab() === 'configuration'" (change)="apiTab.set('configuration')" />
          <input type="radio" name="api_tabs" role="tab" class="tab" aria-label="Time Mode"
            [checked]="apiTab() === 'time-mode'" (change)="apiTab.set('time-mode')" />
          <input type="radio" name="api_tabs" role="tab" class="tab" aria-label="Types"
            [checked]="apiTab() === 'types'" (change)="apiTab.set('types')" />
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Inputs" [entries]="inputDocs" />
            <app-api-table title="Outputs" [entries]="outputDocs" />
            <app-api-table title="Methods" [entries]="methodDocs" />

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ControlValueAccessor</h3>
                <p class="text-sm text-base-content/70">
                  The datepicker implements <code>ControlValueAccessor</code> and <code>Validator</code>, so it works seamlessly with Angular reactive forms. The value format depends on the mode:
                </p>
                <ul class="list-disc list-inside text-sm text-base-content/70 space-y-1 ml-2">
                  <li><strong>Single date mode</strong> (default): Value is a <code>Date</code> object, or <code>null</code> when cleared.</li>
                  <li><strong>Range mode</strong> (<code>[range]="true"</code>): Value is <code>{{ '{' }} start: Date; end: Date {{ '}' }}</code>, or <code>null</code> when cleared. The start date is always the earlier date regardless of selection order.</li>
                  <li><strong>Date + time mode</strong> (<code>[showTime]="true"</code>): Value is a <code>Date</code> with hours and minutes set according to the time panel selection. Seconds and milliseconds are zeroed out.</li>
                </ul>
                <app-code-block [code]="cvaExampleCode" />
              </div>
            </div>
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="Date Constraints" [entries]="dateConstraintDocs" />
            <app-api-table title="Calendar Configuration" [entries]="calendarConfigDocs" />
            <app-api-table title="Behavior Configuration" [entries]="behaviorConfigDocs" />
            <app-api-table title="Display Configuration" [entries]="displayConfigDocs" />
            <app-api-table title="Custom Formatters" [entries]="customFormatterDocs" />
            <app-api-table title="Form Integration" [entries]="formIntegrationDocs" />
          </div>
        }

        <!-- Time Mode sub-tab -->
        @if (apiTab() === 'time-mode') {
          <div class="space-y-6">
            <app-api-table title="Time Inputs" [entries]="timeInputDocs" />
            <app-api-table title="Time Methods" [entries]="timeMethodDocs" />

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">How It Works</h3>
                <p class="text-sm text-base-content/70">
                  When <code>[showTime]="true"</code> is set, a time selection panel appears alongside the calendar. The user first picks a date, then adjusts the hour and minute. The final value is a single <code>Date</code> object with both the date and time components set.
                </p>
                <app-code-block [code]="timeModeExampleCode" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Behavior Notes</h3>
                <ul class="list-disc list-inside text-sm text-base-content/70 space-y-2 ml-2">
                  <li><strong>No auto-close</strong>: When <code>showTime</code> is enabled, the picker does not auto-close after date selection regardless of the <code>closeOnSelect</code> setting. This ensures the user has time to adjust the hour and minute before the dropdown closes.</li>
                  <li><strong>Default minuteStep</strong>: The default <code>minuteStep</code> is <code>1</code>, meaning every minute is selectable. For appointment-style UIs, consider setting it to <code>5</code>, <code>10</code>, <code>15</code>, or <code>30</code> to reduce scrolling in the minute list.</li>
                  <li><strong>Date + time combination</strong>: The component internally maintains separate signals for the selected date, hour, minute, and AM/PM period. When the form value is read, these are combined into a single <code>Date</code> via <code>setHours(hour, minute, 0, 0)</code>. Seconds and milliseconds are always zero.</li>
                  <li><strong>12-hour vs 24-hour</strong>: By default, the time panel shows a 12-hour clock with an AM/PM toggle. Setting <code>[use24Hour]="true"</code> switches to a 24-hour display (0-23) and hides the period toggle.</li>
                  <li><strong>writeValue support</strong>: When a <code>Date</code> with time is written to the control (e.g., via <code>patchValue</code>), the component extracts the hours and minutes from the provided date and updates the time panel accordingly.</li>
                </ul>
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DatepickerEvent</h3>
                <app-code-block [code]="typeDatepickerEvent" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DatepickerPosition</h3>
                <app-code-block [code]="typeDatepickerPosition" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ViewMode</h3>
                <app-code-block [code]="typeViewMode" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DayCell</h3>
                <app-code-block [code]="typeDayCell" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">WeekdayInfo</h3>
                <app-code-block [code]="typeWeekdayInfo" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">MonthInfo</h3>
                <app-code-block [code]="typeMonthInfo" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">YearInfo</h3>
                <app-code-block [code]="typeYearInfo" />
              </div>
            </div>

            <div class="card card-border bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">DatepickerConfig</h3>
                <app-code-block [code]="typeDatepickerConfig" />
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class DatepickerDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<DatepickerTab>('basic');
  apiTab = signal<ApiSubTab>('component');

  basicControl = new FormControl<Date | null>(null);
  rangeControl = new FormControl<{ start: Date; end: Date } | null>(null);
  constrainedControl = new FormControl<Date | null>(null);
  weekdaysControl = new FormControl<Date | null>(null);
  weekNumbersControl = new FormControl<Date | null>(null);
  customFormatControl = new FormControl<Date | null>(null);
  datetimeControl = new FormControl<Date | null>(null);
  datetime24hControl = new FormControl<Date | null>(null);
  datetimeStepControl = new FormControl<Date | null>(null);

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

  datetimeCode = `<hk-datepicker
  [formControl]="datetimeControl"
  placeholder="Select date and time"
  [showTime]="true"
  [showClearButton]="true"
  [showTodayButton]="true"
/>`;

  datetime24hCode = `<hk-datepicker
  [formControl]="datetimeControl"
  placeholder="Select date and time (24h)"
  [showTime]="true"
  [use24Hour]="true"
/>`;

  datetimeStepCode = `<hk-datepicker
  [formControl]="datetimeControl"
  placeholder="Select appointment"
  [showTime]="true"
  [minuteStep]="15"
/>`;

  cvaExampleCode = `// Single date mode
dateControl = new FormControl<Date | null>(null);

// Range mode
rangeControl = new FormControl<{ start: Date; end: Date } | null>(null);

// Date + time mode
datetimeControl = new FormControl<Date | null>(null);

// Template examples
<hk-datepicker [formControl]="dateControl" />
<hk-datepicker [formControl]="rangeControl" [range]="true" />
<hk-datepicker [formControl]="datetimeControl" [showTime]="true" />

// Reading values
const date: Date = this.dateControl.value;
const range: { start: Date; end: Date } = this.rangeControl.value;
const datetime: Date = this.datetimeControl.value; // Date with hours & minutes set`;

  timeModeExampleCode = `// TypeScript
datetimeControl = new FormControl<Date | null>(null);

// Template — enable time selection with showTime
<hk-datepicker
  [formControl]="datetimeControl"
  placeholder="Select date and time"
  [showTime]="true"
  [use24Hour]="false"
  [minuteStep]="5"
  [showClearButton]="true"
/>

// The resulting value is a Date with hours and minutes:
// e.g., 2026-03-26T14:30:00.000Z`;

  // --- API docs: Component sub-tab ---
  inputDocs: ApiDocEntry[] = [
    { name: 'range', type: 'boolean', default: 'false', description: 'Enable date range selection mode. When true, the user picks a start and end date, and the form value becomes { start: Date; end: Date } instead of a single Date. Clicking the same date as the start resets the range.' },
    { name: 'showTime', type: 'boolean', default: 'false', description: 'Show a time selection panel alongside the calendar. Allows the user to pick both a date and a time. The picker stays open after date selection so the user can also set the time. The form value is a Date with hours and minutes set.' },
    { name: 'use24Hour', type: 'boolean', default: 'false', description: 'Use 24-hour format for the time display instead of the default 12-hour AM/PM format. When enabled, the hour options range from 0 to 23 and the AM/PM toggle is hidden. Only applies when showTime is true.' },
    { name: 'minuteStep', type: 'number', default: '1', description: 'Minute step interval for time selection. Controls the granularity of available minute options (e.g., 15 shows :00, :15, :30, :45). Only applies when showTime is true.' },
    { name: 'placeholder', type: 'string', default: "'Select Date'", description: 'Placeholder text displayed in the input when no date is selected. Appears as grayed-out text inside the trigger input field.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the datepicker. Prevents opening the picker and any user interaction. Also respects the disabled state set via reactive forms through setDisabledState.' },
    { name: 'locale', type: 'string', default: "'en-US'", description: 'BCP 47 locale string used for formatting dates, month labels, and weekday headers via Intl.DateTimeFormat. Affects all text rendering in the calendar. Examples: "en-US", "de-DE", "ja-JP".' },
    { name: 'minDate', type: 'Date | undefined', default: 'undefined', description: 'Minimum selectable date. Dates before this are visually disabled and cannot be selected. Also used for form validation, producing a "min" validation error if violated.' },
    { name: 'maxDate', type: 'Date | undefined', default: 'undefined', description: 'Maximum selectable date. Dates after this are visually disabled and cannot be selected. Also used for form validation, producing a "max" validation error if violated.' },
    { name: 'disabledDates', type: 'Date[]', default: '[]', description: 'Array of specific dates to disable. These dates are grayed out and cannot be selected, regardless of the min/max range. Comparison is day-level only (time is ignored).' },
    { name: 'disabledDaysOfWeek', type: 'number[]', default: '[]', description: 'Array of day-of-week indices to disable. 0 = Sunday, 1 = Monday, ..., 6 = Saturday. For example, [0, 6] disables all weekends across every month.' },
    { name: 'showWeekNumbers', type: 'boolean', default: 'false', description: 'Show ISO week numbers in an additional column on the left side of the calendar grid. Useful for business contexts where week numbers are commonly referenced.' },
    { name: 'firstDayOfWeek', type: 'number', default: '0', description: 'First day of the week displayed in the calendar. 0 = Sunday, 1 = Monday, etc. Affects both the weekday header order and the calendar grid layout.' },
    { name: 'closeOnSelect', type: 'boolean', default: 'true', description: 'Automatically close the picker dropdown after a date is selected. In range mode, the picker closes after both start and end dates are chosen. Ignored when showTime is true, since the picker stays open for time selection.' },
    { name: 'showClearButton', type: 'boolean', default: 'true', description: 'Show a clear (X) button inside the input that resets the selection to null when clicked. The button only appears when there is an active selection.' },
    { name: 'showTodayButton', type: 'boolean', default: 'false', description: 'Show a "Today" shortcut button in the calendar footer. Clicking it selects and navigates to the current date. The button is disabled if today falls outside the min/max range or on a disabled day of week.' },
    { name: 'dropdownPosition', type: 'DatepickerPosition', default: "'bottom-left'", description: "Position of the calendar dropdown relative to the input. Options: 'bottom-left', 'bottom-right', 'top-left', 'top-right'. Controls which corner of the input the dropdown anchors to." },
    { name: 'minWidth', type: 'string', default: "'20rem'", description: 'Minimum width of the calendar dropdown as a CSS value. Useful for ensuring the calendar fits its content, especially when showWeekNumbers adds an extra column.' },
    { name: 'required', type: 'boolean', default: 'false', description: 'Mark the datepicker as required for form validation. When true and no date is selected, a "required" validation error is produced. Works with both reactive forms and standalone usage.' },
    { name: 'name', type: 'string', default: "''", description: 'Name attribute for the datepicker input, used for form submission and generating the unique input ID. Also used as part of the ARIA labeling.' },
    { name: 'formControlName', type: 'string', default: "''", description: 'Alternative to [formControl]. Links the datepicker to a FormGroup control by name. Also used to generate the input ID when no name input is provided.' },
    { name: 'customDateFormatter', type: '(date: Date) => string', default: 'undefined', description: 'Custom function to format the selected date for display in the input field. Receives the selected Date and should return a display string. Overrides the default locale-based formatting.' },
    { name: 'customRangeFormatter', type: '(start: Date, end: Date) => string', default: 'undefined', description: 'Custom function to format the selected date range for display in the input field. Receives the start and end Date objects. Only used when range mode is enabled.' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'selectionChange', type: 'DatepickerEvent', description: 'Emitted whenever the date selection changes (single date or range). The event payload includes a type field ("date" or "date-range") and a value field containing the selected date(s). This is the most general-purpose output for responding to any selection change.' },
    { name: 'dateSelected', type: 'Date', description: 'Emitted when a single date is selected in non-range mode. Fires immediately on click, before closeOnSelect takes effect. Useful for responding to date picks without subscribing to the form control.' },
    { name: 'rangeSelected', type: '{ start: Date; end: Date }', description: 'Emitted when a complete date range is selected (both start and end dates chosen). Only fires in range mode after the second date click completes the range. The start date is always the earlier of the two selected dates.' },
    { name: 'pickerOpened', type: 'void', description: 'Emitted when the calendar dropdown opens, whether by clicking the input or calling openPicker()/togglePicker() programmatically. Useful for tracking dropdown state or pausing external interactions.' },
    { name: 'pickerClosed', type: 'void', description: 'Emitted when the calendar dropdown closes, whether by selecting a date, clicking outside, pressing Escape, or calling closePicker()/togglePicker() programmatically. The control is marked as touched when this fires.' },
    { name: 'viewChanged', type: 'ViewMode', description: "Emitted when the calendar view mode changes between 'days', 'months', and 'years'. Fires when the user navigates between the day grid, month picker, and year picker views, or when setView() is called programmatically." },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'togglePicker()', type: 'void', description: 'Toggle the calendar dropdown open or closed. Does nothing if the datepicker is disabled. When opening, resets the view to the day grid and navigates to the currently selected date\'s month.' },
    { name: 'openPicker()', type: 'void', description: 'Open the calendar dropdown programmatically. Does nothing if already open or if the datepicker is disabled. Emits pickerOpened and attaches document listeners for click-outside and Escape key handling.' },
    { name: 'closePicker()', type: 'void', description: 'Close the calendar dropdown programmatically. Marks the control as touched (which may trigger validation display) and emits pickerClosed. Removes document listeners.' },
    { name: 'selectToday()', type: 'void', description: "Select today's date programmatically. Does nothing if today is disabled (outside min/max range, on a disabled day of week, or in the disabledDates array). Delegates to selectDate internally." },
    { name: 'selectDate(date)', type: 'void', description: 'Select a specific date programmatically. In single mode, sets the date and optionally closes the picker. In range mode, starts or completes the range depending on the current state. Does nothing if the date is disabled or the component is disabled.' },
    { name: 'clearSelection()', type: 'void', description: 'Clear the current selection, resetting the value to null. Also resets time selection (hour to 12, minute to 0, period to AM) when showTime is enabled. Marks the control as touched.' },
    { name: 'setView(mode)', type: 'void', description: "Change the calendar view mode. Accepts 'days', 'months', or 'years'. Emits the viewChanged output. Use this to programmatically switch between the day grid, month picker, and year picker." },
    { name: 'goToDayView()', type: 'void', description: "Switch the calendar to the day grid view. Convenience shortcut for setView('days')." },
    { name: 'goToMonthView()', type: 'void', description: "Switch the calendar to the month picker view. Convenience shortcut for setView('months')." },
    { name: 'goToYearView()', type: 'void', description: "Switch the calendar to the year picker view. Convenience shortcut for setView('years')." },
    { name: 'navigateMonth(direction)', type: 'void', description: "Navigate the calendar forward or backward by one month. Accepts 'prev' or 'next'. Updates the calendar grid to show the new month's days." },
    { name: 'navigateYears(direction)', type: 'void', description: "Navigate the year picker view forward or backward by one batch (24 years). Accepts 'prev' or 'next'. Only affects the year picker view." },
    { name: 'selectYear(year)', type: 'void', description: 'Select a year in the year picker view. Sets the calendar to that year while keeping the current month, then automatically switches to the month picker view so the user can refine their selection.' },
    { name: 'selectMonth(monthIndex)', type: 'void', description: 'Select a month in the month picker view. Accepts a zero-based month index (0 = January, 11 = December). Sets the calendar to that month and automatically switches to the day grid view.' },
    { name: 'markAsTouched()', type: 'void', description: 'Manually mark the control as touched. Triggers the onTouched callback for reactive form integration and may cause validation errors to display. Called automatically when the picker closes.' },
    { name: 'isDateDisabled(date)', type: 'boolean', description: 'Check whether a specific date is disabled. Returns true if the date falls outside the min/max range, matches a disabled day of week, or is in the disabledDates array. Useful for custom UI logic.' },
  ];

  // --- API docs: Configuration sub-tab ---
  dateConstraintDocs: ApiDocEntry[] = [
    { name: 'minDate', type: 'Date | undefined', default: 'undefined', description: 'Minimum selectable date. All dates before this boundary are visually grayed out and cannot be clicked. When used with reactive forms, selecting a date before minDate produces a validation error with the key "min" containing { actual, min }.' },
    { name: 'maxDate', type: 'Date | undefined', default: 'undefined', description: 'Maximum selectable date. All dates after this boundary are visually grayed out and cannot be clicked. When used with reactive forms, selecting a date after maxDate produces a validation error with the key "max" containing { actual, max }.' },
    { name: 'disabledDates', type: 'Date[]', default: '[]', description: 'Array of specific dates to disable. These dates appear grayed out and cannot be selected, even if they fall within the min/max range. Date comparison is day-level only, so the time portion of each Date object is ignored.' },
    { name: 'disabledDaysOfWeek', type: 'number[]', default: '[]', description: 'Array of day-of-week indices to disable across all months. 0 = Sunday, 1 = Monday, ..., 6 = Saturday. For example, [0, 6] disables all Saturdays and Sundays. These days are grayed out and non-interactive in the calendar grid.' },
  ];

  calendarConfigDocs: ApiDocEntry[] = [
    { name: 'showWeekNumbers', type: 'boolean', default: 'false', description: 'Show ISO week numbers in an additional column on the left side of the calendar grid. The week number is calculated using the ISO 8601 standard, where week 1 is the week containing the first Thursday of the year.' },
    { name: 'firstDayOfWeek', type: 'number', default: '0', description: 'First day of the week displayed in the calendar header and grid. 0 = Sunday (US convention), 1 = Monday (ISO/European convention), etc. Affects both the weekday column headers and how day cells are laid out in each row.' },
  ];

  behaviorConfigDocs: ApiDocEntry[] = [
    { name: 'closeOnSelect', type: 'boolean', default: 'true', description: 'Automatically close the picker dropdown after a date is selected. In range mode, the picker closes after both the start and end dates are chosen. This setting is ignored when showTime is true, because the picker must stay open for the user to adjust the time.' },
    { name: 'showClearButton', type: 'boolean', default: 'true', description: 'Show a clear (X) icon button inside the input field. Clicking it resets the selection to null and marks the control as touched. The button only renders when there is a current selection.' },
    { name: 'showTodayButton', type: 'boolean', default: 'false', description: 'Show a "Today" shortcut button in the calendar footer. Clicking it selects today\'s date and navigates the calendar to the current month. The button is automatically disabled if today is outside the min/max range or falls on a disabled day of week.' },
  ];

  displayConfigDocs: ApiDocEntry[] = [
    { name: 'placeholder', type: 'string', default: "'Select Date'", description: 'Placeholder text shown in the input field when no date is selected. Displayed as muted text to prompt the user to open the picker.' },
    { name: 'locale', type: 'string', default: "'en-US'", description: 'BCP 47 locale tag that controls how dates, month names, and weekday abbreviations are formatted. Passed to Intl.DateTimeFormat internally. Changing this affects all text rendering in the calendar header, grid, and input display.' },
    { name: 'dropdownPosition', type: 'DatepickerPosition', default: "'bottom-left'", description: "Controls where the calendar dropdown appears relative to the input trigger. Options are 'bottom-left', 'bottom-right', 'top-left', and 'top-right'. Choose 'top-*' when the input is near the bottom of the viewport to prevent the calendar from being clipped." },
    { name: 'minWidth', type: 'string', default: "'20rem'", description: 'Minimum CSS width for the calendar dropdown container. Accepts any valid CSS width value (e.g., "20rem", "320px"). Increase this when using showWeekNumbers or showTime, which add extra columns to the calendar.' },
  ];

  customFormatterDocs: ApiDocEntry[] = [
    { name: 'customDateFormatter', type: '(date: Date) => string', default: 'undefined', description: 'Custom function to format the selected date for display in the input field. Receives the selected Date and should return a formatted string. When provided, this completely overrides the default locale-based Intl.DateTimeFormat rendering.' },
    { name: 'customRangeFormatter', type: '(start: Date, end: Date) => string', default: 'undefined', description: 'Custom function to format the selected date range for display in the input field. Receives two Date objects (start and end) and should return a formatted string. Only used when range mode is enabled. Falls back to the default "start - end" format if not provided.' },
  ];

  formIntegrationDocs: ApiDocEntry[] = [
    { name: 'required', type: 'boolean', default: 'false', description: 'Mark the datepicker as required for form validation. When true and no date is selected, the Validator interface produces a "required" validation error. Works with both reactive forms (FormControl/FormGroup) and standalone usage.' },
    { name: 'name', type: 'string', default: "''", description: 'Name attribute applied to the datepicker input element. Used for native form submission and as part of the generated unique input ID (datepicker-{name}-{instanceId}). Also contributes to ARIA labeling.' },
    { name: 'formControlName', type: 'string', default: "''", description: 'Alternative to [formControl] binding. Links the datepicker to a control within a parent FormGroup by name. Used to generate the input ID when no name input is provided. Cannot be used simultaneously with [formControl].' },
  ];

  // --- API docs: Time Mode sub-tab ---
  timeInputDocs: ApiDocEntry[] = [
    { name: 'showTime', type: 'boolean', default: 'false', description: 'Enable time selection alongside the calendar. When true, the calendar dropdown includes a time panel with hour and minute selectors. The form value becomes a Date with both date and time components. The picker will not auto-close after date selection, giving the user time to set the hours and minutes.' },
    { name: 'use24Hour', type: 'boolean', default: 'false', description: 'Switch the time panel to 24-hour format. When false (default), hours display as 1-12 with an AM/PM toggle button. When true, hours display as 0-23 and the AM/PM toggle is hidden. Only takes effect when showTime is true.' },
    { name: 'minuteStep', type: 'number', default: '1', description: 'Controls the granularity of the minute selector. A step of 1 shows all 60 minutes, a step of 5 shows :00, :05, :10, ..., :55, and a step of 15 shows :00, :15, :30, :45. The computed minute options are generated as Array.from({ length: ceil(60/step) }). Only takes effect when showTime is true.' },
  ];

  timeMethodDocs: ApiDocEntry[] = [
    { name: 'selectHour(hour)', type: 'void', description: 'Set the selected hour programmatically. In 12-hour mode, pass the display hour (1-12) and the component converts it to 24-hour internal representation using the current AM/PM period. In 24-hour mode, pass the hour directly (0-23). Emits a value change if a date is already selected.' },
    { name: 'selectMinute(minute)', type: 'void', description: 'Set the selected minute programmatically. Pass a minute value (typically a multiple of minuteStep, but any 0-59 value is accepted). Emits a value change if a date is already selected.' },
    { name: 'togglePeriod()', type: 'void', description: 'Toggle between AM and PM in 12-hour mode. Adjusts the internal 24-hour value accordingly (adds or subtracts 12). Has no effect in 24-hour mode. Emits a value change if a date is already selected.' },
  ];

  // --- API docs: Types sub-tab ---
  typeDatepickerEvent = `interface DatepickerEvent {
  /** Whether this is a single date or date range selection */
  type: 'date' | 'date-range';
  /** The selected value — DateSelection for 'date', DateRangeSelection for 'date-range' */
  value: DateSelection | DateRangeSelection;
}

interface DateSelection {
  date: Date;
}

interface DateRangeSelection {
  start: Date;
  end: Date;
}`;

  typeDatepickerPosition = `type DatepickerPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right'
  | 'auto';`;

  typeViewMode = `type ViewMode = 'days' | 'months' | 'years';`;

  typeDayCell = `interface DayCell {
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
  /** Whether this date is disabled (outside min/max or explicitly disabled) */
  isDisabled: boolean;
  /** Unique identifier for the cell element */
  id: string;
}`;

  typeWeekdayInfo = `interface WeekdayInfo {
  /** Display label for the weekday (e.g., "M", "Tu") */
  label: string;
  /** Day-of-week index (0 = Sunday, 6 = Saturday) */
  index: number;
  /** Unique identifier for the header element */
  id: string;
}`;

  typeMonthInfo = `interface MonthInfo {
  /** Month index (0 = January, 11 = December) */
  index: number;
  /** Display label for the month (e.g., "Jan", "February") */
  label: string;
  /** Whether this month contains the currently selected date */
  isSelected: boolean;
  /** Unique identifier for the month element */
  id: string;
}`;

  typeYearInfo = `interface YearInfo {
  /** The year number (e.g., 2026) */
  year: number;
  /** Whether this year contains the currently selected date */
  isSelected: boolean;
  /** Unique identifier for the year element */
  id: string;
}`;

  typeDatepickerConfig = `interface DatepickerConfig {
  /** Format options for displaying dates */
  readonly dateFormat: Intl.DateTimeFormatOptions;
  /** Format options for displaying month labels */
  readonly monthFormat: Intl.DateTimeFormatOptions;
  /** Number of years shown per page in the year picker view */
  readonly yearBatchSize: number;
  /** Format options for weekday column headers */
  readonly weekdayFormat: Intl.DateTimeFormatOptions;
  /** Close the dropdown after a date is selected */
  readonly closeOnSelect?: boolean;
  /** Show a button to clear the current selection */
  readonly showClearButton?: boolean;
  /** Show a button to jump to today's date */
  readonly showTodayButton?: boolean;
  /** Duration of view transition animations in milliseconds */
  readonly animationDuration?: number;
}`;
}
