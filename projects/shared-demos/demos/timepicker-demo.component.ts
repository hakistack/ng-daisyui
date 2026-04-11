import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { TimepickerComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { CodeBlockComponent } from '../shared/code-block.component';
import { DemoPageComponent } from '../shared/demo-page.component';

type TimepickerTab = 'basic' | 'options' | 'clockFace' | 'advanced';
type ApiSubTab = 'component' | 'configuration' | 'clock-face' | 'types';

@Component({
  selector: 'app-timepicker-demo',
  imports: [
    TimepickerComponent,
    ReactiveFormsModule,
    JsonPipe,
    DocSectionComponent,
    ApiTableComponent,
    CodeBlockComponent,
    DemoPageComponent,
  ],
  template: `
    <app-demo-page
      title="Timepicker"
      description="Clock-based time picker with hours, minutes, and seconds selection"
      icon="Clock"
      category="Inputs"
      importName="TimepickerComponent"
    >
      <div examples>
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'options'" (click)="activeTab.set('options')">Options</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'clockFace'" (click)="activeTab.set('clockFace')">
            Clock Face
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'advanced'" (click)="activeTab.set('advanced')">
            Advanced
          </button>
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="24h Format" description="Basic time picker in 24-hour format" [codeExample]="basic24hCode">
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="basic24hControl"
                  placeholder="Select time (24h)"
                  [showClearButton]="true"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ basic24hControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="12h Format (AM/PM)" description="Time picker with AM/PM toggle" [codeExample]="basic12hCode">
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="basic12hControl"
                  placeholder="Select time (12h)"
                  [use24Hour]="false"
                  [showClearButton]="true"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ basic12hControl.value | json }}</code>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'options') {
          <div class="space-y-6">
            <app-doc-section title="With Seconds" description="Include seconds in time selection" [codeExample]="secondsCode">
              <div class="max-w-sm">
                <hk-timepicker [formControl]="secondsControl" placeholder="HH:MM:SS" [showSeconds]="true" [showNowButton]="true" />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ secondsControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="5-Minute Step" description="Select minutes in 5-minute increments" [codeExample]="stepCode">
              <div class="max-w-sm">
                <hk-timepicker [formControl]="step5Control" placeholder="Select time" [minuteStep]="5" [showNowButton]="true" />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ step5Control.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="15-Minute Step" description="Select minutes in 15-minute increments" [codeExample]="step15Code">
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="step15Control"
                  placeholder="Select time"
                  [minuteStep]="15"
                  [use24Hour]="false"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ step15Control.value | json }}</code>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'clockFace') {
          <div class="space-y-6">
            <app-doc-section
              title="Clock Face (12h)"
              description="Material Design-style clock selector with AM/PM"
              [codeExample]="clockFace12hCode"
            >
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="clockFace12hControl"
                  placeholder="Select time (clock)"
                  [clockFace]="true"
                  [use24Hour]="false"
                  [showClearButton]="true"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ clockFace12hControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Clock Face (24h)"
              description="24-hour clock with inner/outer ring for all 24 hours"
              [codeExample]="clockFace24hCode"
            >
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="clockFace24hControl"
                  placeholder="Select time (24h clock)"
                  [clockFace]="true"
                  [use24Hour]="true"
                  [showClearButton]="true"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ clockFace24hControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Clock Face with Seconds"
              description="Clock face with seconds support"
              [codeExample]="clockFaceSecondsCode"
            >
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="clockFaceSecondsControl"
                  placeholder="HH:MM:SS (clock)"
                  [clockFace]="true"
                  [showSeconds]="true"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ clockFaceSecondsControl.value | json }}</code>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'advanced') {
          <div class="space-y-6">
            <app-doc-section
              title="Min/Max Constraints"
              description="Restrict selectable time range (09:00 - 17:00)"
              [codeExample]="constraintCode"
            >
              <div class="max-w-sm">
                <hk-timepicker
                  [formControl]="constrainedControl"
                  placeholder="Business hours only"
                  minTime="09:00"
                  maxTime="17:00"
                  [showNowButton]="true"
                />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ constrainedControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Pre-filled Value"
              description="Timepicker with an initial value set programmatically"
              [codeExample]="prefilledCode"
            >
              <div class="max-w-sm">
                <hk-timepicker [formControl]="prefilledControl" [use24Hour]="false" />
              </div>
              <div class="mt-4 text-sm">
                Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ prefilledControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="Disabled State" description="Timepicker in disabled state">
              <div class="max-w-sm">
                <hk-timepicker [formControl]="disabledControl" placeholder="Disabled" />
              </div>
            </app-doc-section>
          </div>
        }
      </div>

      <div api>
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'configuration'" (click)="apiTab.set('configuration')">
            Configuration
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'clock-face'" (click)="apiTab.set('clock-face')">
            Clock Face
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="hk-timepicker Inputs" [entries]="inputDocs" />
            <app-api-table title="Outputs" [entries]="outputDocs" />
            <app-api-table title="Methods" [entries]="methodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ControlValueAccessor</h3>
                <p class="text-sm text-base-content/70">
                  <code>hk-timepicker</code> implements <code>ControlValueAccessor</code> and <code>Validator</code>, so it works seamlessly
                  with Angular reactive forms and template-driven forms. Bind it with <code>[formControl]</code>,
                  <code>formControlName</code>, or <code>[(ngModel)]</code>.
                </p>
                <p class="text-sm text-base-content/70">
                  The value format is a <strong>string</strong>: <code>"HH:MM"</code> (e.g. <code>"14:30"</code>) or
                  <code>"HH:MM:SS"</code> (e.g. <code>"14:30:45"</code>) when <code>showSeconds</code> is enabled. The value is always in
                  24-hour format regardless of the <code>use24Hour</code> display setting. A <code>null</code> value represents no
                  selection.
                </p>
                <app-code-block [code]="cvaExampleCode" lang="typescript" />
              </div>
            </div>
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="Time Format" [entries]="timeFormatDocs" />
            <app-api-table title="Behavior" [entries]="behaviorDocs" />
            <app-api-table title="Constraints" [entries]="constraintsDocs" />
            <app-api-table title="Display" [entries]="displayDocs" />
            <app-api-table title="Form Integration" [entries]="formIntegrationDocs" />
          </div>
        }

        <!-- Clock Face sub-tab -->
        @if (apiTab() === 'clock-face') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">clockFace Input</h3>
                <app-api-table title="Clock Face Input" [entries]="clockFaceInputDocs" />
                <p class="text-sm text-base-content/70 mt-2">
                  When <code>[clockFace]="true"</code>, the timepicker replaces the default grid selector with a Material Design-style
                  analog clock face. Users select hours and minutes (and optionally seconds) by clicking or dragging on the circular dial.
                </p>
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">How the Clock Face Works</h3>
                <div class="space-y-3 text-sm text-base-content/70">
                  <p>
                    <strong>Hour Selection:</strong> In 12-hour mode, hours 1--12 are displayed on a single ring. In 24-hour mode, the clock
                    uses two concentric rings: the outer ring displays hours 1--12 and the inner ring displays hours 13--24 (with 0
                    representing midnight). This dual-ring layout allows all 24 hours to be accessible without scrolling.
                  </p>
                  <p>
                    <strong>Minute / Second Selection:</strong> After selecting an hour, the view automatically transitions to minute
                    selection. If <code>showSeconds</code> is enabled, selecting a minute advances to the seconds dial. Minutes and seconds
                    are displayed on a single ring with values 0--59 (labels shown at 5-unit intervals: 0, 5, 10, ..., 55).
                  </p>
                  <p>
                    <strong>Interaction:</strong> Users can click directly on a number or click and drag around the dial to scrub through
                    values. The selected hand rotates to follow the pointer during drag. On pointer release, the value snaps to the nearest
                    step and the view advances to the next unit.
                  </p>
                  <p>
                    <strong>AM/PM Toggle:</strong> In 12-hour mode, AM/PM buttons appear below the clock. Toggling AM/PM immediately updates
                    the stored 24-hour value without changing the displayed hour.
                  </p>
                </div>
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Usage Example</h3>
                <app-code-block [code]="clockFaceApiCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TimepickerEvent</h3>
                <p class="text-sm text-base-content/70">Emitted by the <code>(timeChange)</code> output whenever the time value changes.</p>
                <app-code-block [code]="timepickerEventType" lang="typescript" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TimepickerPosition</h3>
                <p class="text-sm text-base-content/70">Controls where the dropdown panel appears relative to the input field.</p>
                <app-code-block [code]="timepickerPositionType" lang="typescript" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TimepickerView</h3>
                <p class="text-sm text-base-content/70">
                  Represents which dial is currently active in the picker. Used with the <code>setView()</code> method.
                </p>
                <app-code-block [code]="timepickerViewType" lang="typescript" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ClockPosition</h3>
                <p class="text-sm text-base-content/70">
                  Internal type representing a single position on the clock face dial. Each position maps a numeric value to x/y coordinates
                  on the SVG circle and indicates whether it sits on the inner ring (24-hour mode).
                </p>
                <app-code-block [code]="clockPositionType" lang="typescript" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimepickerDemoComponent {
  readonly activeTab = signal<TimepickerTab>('basic');
  readonly apiTab = signal<ApiSubTab>('component');

  readonly basic24hControl = new FormControl<string | null>(null);
  readonly basic12hControl = new FormControl<string | null>(null);
  readonly secondsControl = new FormControl<string | null>(null);
  readonly step5Control = new FormControl<string | null>(null);
  readonly step15Control = new FormControl<string | null>(null);
  readonly clockFace12hControl = new FormControl<string | null>(null);
  readonly clockFace24hControl = new FormControl<string | null>(null);
  readonly clockFaceSecondsControl = new FormControl<string | null>(null);
  readonly constrainedControl = new FormControl<string | null>(null);
  readonly prefilledControl = new FormControl<string | null>('14:30');
  readonly disabledControl = new FormControl<string | null>({ value: '09:00', disabled: true });

  readonly basic24hCode = `<hk-timepicker
  [formControl]="timeControl"
  placeholder="Select time (24h)"
  [showClearButton]="true"
  [showNowButton]="true"
/>`;

  readonly basic12hCode = `<hk-timepicker
  [formControl]="timeControl"
  placeholder="Select time (12h)"
  [use24Hour]="false"
  [showClearButton]="true"
  [showNowButton]="true"
/>`;

  readonly secondsCode = `<hk-timepicker
  [formControl]="timeControl"
  placeholder="HH:MM:SS"
  [showSeconds]="true"
/>`;

  readonly stepCode = `<hk-timepicker
  [formControl]="timeControl"
  placeholder="Select time"
  [minuteStep]="5"
/>`;

  readonly step15Code = `<hk-timepicker
  [formControl]="timeControl"
  placeholder="Select time"
  [minuteStep]="15"
  [use24Hour]="false"
/>`;

  readonly constraintCode = `<hk-timepicker
  [formControl]="timeControl"
  placeholder="Business hours only"
  minTime="09:00"
  maxTime="17:00"
/>`;

  readonly clockFace12hCode = `<hk-timepicker
  [formControl]="timeControl"
  [clockFace]="true"
  [use24Hour]="false"
  placeholder="Select time (clock)"
/>`;

  readonly clockFace24hCode = `<hk-timepicker
  [formControl]="timeControl"
  [clockFace]="true"
  [use24Hour]="true"
  placeholder="Select time (24h clock)"
/>`;

  readonly clockFaceSecondsCode = `<hk-timepicker
  [formControl]="timeControl"
  [clockFace]="true"
  [showSeconds]="true"
/>`;

  readonly prefilledCode = `// In component class:
timeControl = new FormControl<string | null>('14:30');

// In template:
<hk-timepicker
  [formControl]="timeControl"
  [use24Hour]="false"
/>`;

  // --- API docs: Component sub-tab ---
  readonly inputDocs: ApiDocEntry[] = [
    { name: 'placeholder', type: 'string', default: "'Select Time'", description: 'Placeholder text shown when no time is selected' },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disable the timepicker input and prevent the dropdown from opening',
    },
    {
      name: 'use24Hour',
      type: 'boolean',
      default: 'true',
      description:
        'Use 24-hour format for display. When false, shows AM/PM toggle. The underlying value is always stored in 24-hour format',
    },
    {
      name: 'showSeconds',
      type: 'boolean',
      default: 'false',
      description: 'Include seconds in time selection. Changes the value format from "HH:MM" to "HH:MM:SS"',
    },
    {
      name: 'minuteStep',
      type: 'number',
      default: '1',
      description: 'Minute step interval for the minute selector (e.g. 5, 15, 30). Values are snapped to the nearest step',
    },
    {
      name: 'secondStep',
      type: 'number',
      default: '1',
      description: 'Second step interval for the second selector. Works identically to minuteStep but for seconds',
    },
    {
      name: 'closeOnSelect',
      type: 'boolean',
      default: 'true',
      description:
        'Automatically close the picker dropdown after a complete time selection (hour + minute, or hour + minute + second when showSeconds is enabled)',
    },
    {
      name: 'showClearButton',
      type: 'boolean',
      default: 'true',
      description: 'Show a clear button in the dropdown footer to reset the selection to null',
    },
    {
      name: 'showNowButton',
      type: 'boolean',
      default: 'true',
      description:
        'Show a "Now" button in the dropdown footer that sets the time to the current system time, snapped to configured step intervals',
    },
    {
      name: 'dropdownPosition',
      type: 'TimepickerPosition',
      default: "'bottom-left'",
      description: 'Position of the dropdown panel relative to the input field',
    },
    {
      name: 'minWidth',
      type: 'string',
      default: "'16rem'",
      description: 'CSS minimum width of the dropdown panel (e.g. "16rem", "250px")',
    },
    {
      name: 'required',
      type: 'boolean',
      default: 'false',
      description: 'Mark the field as required. Adds validation that emits a "required" error when the value is null',
    },
    {
      name: 'name',
      type: 'string',
      default: "''",
      description: 'Name attribute for the underlying input element. Also used to generate a unique input ID',
    },
    {
      name: 'formControlName',
      type: 'string',
      default: "''",
      description: 'FormControlName for reactive form binding inside a FormGroup. Alternative to [formControl]',
    },
    {
      name: 'minTime',
      type: 'string | undefined',
      default: 'undefined',
      description: 'Minimum selectable time in "HH:MM" or "HH:MM:SS" format. Hours outside the valid range are visually disabled',
    },
    {
      name: 'maxTime',
      type: 'string | undefined',
      default: 'undefined',
      description: 'Maximum selectable time in "HH:MM" or "HH:MM:SS" format. Hours outside the valid range are visually disabled',
    },
    {
      name: 'clockFace',
      type: 'boolean',
      default: 'false',
      description: 'Use a Material Design-style analog clock face instead of the default grid selector',
    },
  ];

  readonly outputDocs: ApiDocEntry[] = [
    {
      name: 'timeChange',
      type: 'TimepickerEvent',
      description:
        'Emitted when the time value changes. Provides the formatted string value along with individual hours, minutes, and seconds fields',
    },
    { name: 'pickerOpened', type: 'void', description: 'Emitted when the picker dropdown opens (either by click or programmatically)' },
    {
      name: 'pickerClosed',
      type: 'void',
      description: 'Emitted when the picker dropdown closes (by selection, click outside, Escape key, or programmatically)',
    },
  ];

  readonly methodDocs: ApiDocEntry[] = [
    { name: 'togglePicker()', type: 'void', description: 'Toggle the picker dropdown open or closed' },
    { name: 'openPicker()', type: 'void', description: 'Programmatically open the picker dropdown' },
    { name: 'closePicker()', type: 'void', description: 'Programmatically close the picker dropdown' },
    {
      name: 'selectNow()',
      type: 'void',
      description: 'Set the time to the current system time, snapped to configured minuteStep and secondStep intervals',
    },
    { name: 'clearSelection()', type: 'void', description: 'Clear the current time selection, setting the value to null' },
    {
      name: 'setView(view)',
      type: 'void',
      description: "Set the active picker view to 'hours', 'minutes', or 'seconds'. Useful for programmatic navigation between dials",
    },
    {
      name: 'selectHour(hour)',
      type: 'void',
      description: 'Programmatically select an hour value (0-23). Advances the view to minutes automatically',
    },
    {
      name: 'selectMinute(minute)',
      type: 'void',
      description:
        'Programmatically select a minute value (0-59). Advances to seconds view if showSeconds is enabled, otherwise finalizes selection',
    },
    { name: 'selectSecond(second)', type: 'void', description: 'Programmatically select a second value (0-59). Finalizes the selection' },
    {
      name: 'togglePeriod()',
      type: 'void',
      description: 'Toggle between AM and PM. Only applicable in 12-hour mode (use24Hour = false). Converts the stored hour accordingly',
    },
    {
      name: 'parseUserInput(text)',
      type: '{ hour: number; minute: number; second: number } | null',
      description:
        'Parse a user-typed string into a 24-hour time object. Supports many formats: colon-separated (14:30), AM/PM (2:30pm), shorthand (230p), bare digits (1430), and timestamps',
    },
    {
      name: 'markAsTouched()',
      type: 'void',
      description: 'Mark the control as touched for validation display. Called automatically on blur, but available for programmatic use',
    },
  ];

  // --- API docs: Configuration sub-tab ---
  readonly timeFormatDocs: ApiDocEntry[] = [
    {
      name: 'use24Hour',
      type: 'boolean',
      default: 'true',
      description:
        'Controls the display format. When true, hours 0-23 are shown. When false, hours 1-12 with AM/PM toggle are shown. The underlying value is always stored in 24-hour "HH:MM" or "HH:MM:SS" format regardless of this setting',
    },
    {
      name: 'showSeconds',
      type: 'boolean',
      default: 'false',
      description:
        'When enabled, adds a seconds dial to the picker and changes the value format from "HH:MM" to "HH:MM:SS". Applies to both grid and clock face modes',
    },
    {
      name: 'minuteStep',
      type: 'number',
      default: '1',
      description:
        'Step interval for the minute selector. For example, a value of 5 shows 0, 5, 10, 15, ..., 55. The "Now" button also snaps to this interval. Common values: 1, 5, 10, 15, 30',
    },
    {
      name: 'secondStep',
      type: 'number',
      default: '1',
      description: 'Step interval for the second selector. Works identically to minuteStep. Only relevant when showSeconds is true',
    },
  ];

  readonly behaviorDocs: ApiDocEntry[] = [
    {
      name: 'closeOnSelect',
      type: 'boolean',
      default: 'true',
      description:
        'When true, the dropdown automatically closes after a complete time selection. Set to false to keep the picker open for further adjustments',
    },
    {
      name: 'showClearButton',
      type: 'boolean',
      default: 'true',
      description:
        'Shows a clear (x) button in the dropdown footer. Clicking it resets the value to null and clears all selected hour/minute/second state',
    },
    {
      name: 'showNowButton',
      type: 'boolean',
      default: 'true',
      description:
        'Shows a "Now" button in the dropdown footer. Clicking it sets the time to the current system time, snapped to the nearest minuteStep and secondStep',
    },
  ];

  readonly constraintsDocs: ApiDocEntry[] = [
    {
      name: 'minTime',
      type: 'string | undefined',
      default: 'undefined',
      description:
        'Minimum selectable time in "HH:MM" or "HH:MM:SS" format (e.g. "09:00"). Hours before this time are visually disabled and cannot be selected. Validation emits a "minTime" error if the current value is below this threshold',
    },
    {
      name: 'maxTime',
      type: 'string | undefined',
      default: 'undefined',
      description:
        'Maximum selectable time in "HH:MM" or "HH:MM:SS" format (e.g. "17:00"). Hours after this time are visually disabled and cannot be selected. Validation emits a "maxTime" error if the current value exceeds this threshold',
    },
  ];

  readonly displayDocs: ApiDocEntry[] = [
    {
      name: 'placeholder',
      type: 'string',
      default: "'Select Time'",
      description: 'Placeholder text displayed in the input field when no time has been selected',
    },
    {
      name: 'dropdownPosition',
      type: 'TimepickerPosition',
      default: "'bottom-left'",
      description:
        'Controls where the dropdown panel appears relative to the input. Options: "bottom-left", "bottom-right", "top-left", "top-right"',
    },
    {
      name: 'minWidth',
      type: 'string',
      default: "'16rem'",
      description: 'CSS min-width applied to the dropdown panel. Accepts any valid CSS width value (e.g. "16rem", "250px", "100%")',
    },
  ];

  readonly formIntegrationDocs: ApiDocEntry[] = [
    {
      name: 'required',
      type: 'boolean',
      default: 'false',
      description:
        'Marks the field as required. When true and the value is null, a "required" validation error is emitted. Works with both reactive forms and template-driven forms',
    },
    {
      name: 'name',
      type: 'string',
      default: "''",
      description:
        'Sets the name attribute on the underlying input element. Also used to derive a unique ID for accessibility (label association)',
    },
    {
      name: 'formControlName',
      type: 'string',
      default: "''",
      description: 'Binds the timepicker to a FormControl inside a FormGroup by name. Alternative to passing [formControl] directly',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description:
        'Disables the timepicker input and prevents the dropdown from opening. Can also be set via FormControl.disable() when using reactive forms',
    },
  ];

  // --- API docs: Clock Face sub-tab ---
  readonly clockFaceInputDocs: ApiDocEntry[] = [
    {
      name: 'clockFace',
      type: 'boolean',
      default: 'false',
      description:
        'When set to true, replaces the default grid-based hour/minute/second selector with a Material Design-style analog clock face. The clock supports click and drag interaction for selecting values',
    },
  ];

  readonly clockFaceApiCode = `<!-- 12-hour clock face with AM/PM -->
<hk-timepicker
  [formControl]="timeControl"
  [clockFace]="true"
  [use24Hour]="false"
  [showClearButton]="true"
  [showNowButton]="true"
  placeholder="Select time"
/>

<!-- 24-hour clock face with inner/outer rings -->
<hk-timepicker
  [formControl]="timeControl"
  [clockFace]="true"
  [use24Hour]="true"
  placeholder="Select time (24h)"
/>

<!-- Clock face with seconds support -->
<hk-timepicker
  [formControl]="timeControl"
  [clockFace]="true"
  [showSeconds]="true"
  [minuteStep]="5"
  placeholder="HH:MM:SS"
/>`;

  readonly cvaExampleCode = `// Reactive form usage
timeControl = new FormControl<string | null>(null);

// With initial value
timeControl = new FormControl<string | null>('14:30');

// With seconds
timeControl = new FormControl<string | null>('14:30:00');

// Template
<hk-timepicker [formControl]="timeControl" />

// Inside a FormGroup
<form [formGroup]="myForm">
  <hk-timepicker formControlName="startTime" />
</form>

// Reading the value
console.log(this.timeControl.value); // "14:30" or "14:30:00" or null`;

  // --- Type definitions ---
  readonly timepickerEventType = `interface TimepickerEvent {
  value: string | null;   // Formatted time string ("HH:MM" or "HH:MM:SS") or null
  hours: number;          // Hour in 24-hour format (0-23)
  minutes: number;        // Minutes (0-59)
  seconds: number;        // Seconds (0-59), always 0 when showSeconds is false
}`;

  readonly timepickerPositionType = `type TimepickerPosition =
  | 'bottom-left'    // Below input, aligned to left edge (default)
  | 'bottom-right'   // Below input, aligned to right edge
  | 'top-left'       // Above input, aligned to left edge
  | 'top-right';     // Above input, aligned to right edge`;

  readonly timepickerViewType = `type TimepickerView =
  | 'hours'      // Hour selection dial
  | 'minutes'    // Minute selection dial
  | 'seconds';   // Second selection dial (only when showSeconds is true)`;

  readonly clockPositionType = `interface ClockPosition {
  readonly value: number;    // Numeric value this position represents (e.g. 0-23 for hours)
  readonly display: string;  // Label displayed on the clock face (e.g. "12", "00")
  readonly x: number;        // X coordinate on the SVG circle (percentage)
  readonly y: number;        // Y coordinate on the SVG circle (percentage)
  readonly inner: boolean;   // True if this position is on the inner ring (24h hours 13-24/0)
}`;
}
