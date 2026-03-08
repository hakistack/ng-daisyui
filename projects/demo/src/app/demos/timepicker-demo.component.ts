import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { TimepickerComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';

type TimepickerTab = 'basic' | 'options' | 'clockFace' | 'advanced';

@Component({
  selector: 'app-timepicker-demo',
  imports: [TimepickerComponent, ReactiveFormsModule, JsonPipe, DocSectionComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Timepicker</h1>
        <p class="text-base-content/70 mt-2">Time picker with hour/minute/second selection and 12h/24h support</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} TimepickerComponent {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Variant Tabs -->
      <div role="tablist" class="tabs tabs-box">
        <input type="radio" name="timepicker_tabs" role="tab" class="tab" aria-label="Basic"
          [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
        <input type="radio" name="timepicker_tabs" role="tab" class="tab" aria-label="Options"
          [checked]="activeTab() === 'options'" (change)="activeTab.set('options')" />
        <input type="radio" name="timepicker_tabs" role="tab" class="tab" aria-label="Clock Face"
          [checked]="activeTab() === 'clockFace'" (change)="activeTab.set('clockFace')" />
        <input type="radio" name="timepicker_tabs" role="tab" class="tab" aria-label="Advanced"
          [checked]="activeTab() === 'advanced'" (change)="activeTab.set('advanced')" />
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
              <hk-timepicker
                [formControl]="secondsControl"
                placeholder="HH:MM:SS"
                [showSeconds]="true"
                [showNowButton]="true"
              />
            </div>
            <div class="mt-4 text-sm">
              Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ secondsControl.value | json }}</code>
            </div>
          </app-doc-section>

          <app-doc-section title="5-Minute Step" description="Select minutes in 5-minute increments" [codeExample]="stepCode">
            <div class="max-w-sm">
              <hk-timepicker
                [formControl]="step5Control"
                placeholder="Select time"
                [minuteStep]="5"
                [showNowButton]="true"
              />
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
          <app-doc-section title="Clock Face (12h)" description="Material Design-style clock selector with AM/PM" [codeExample]="clockFace12hCode">
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

          <app-doc-section title="Clock Face (24h)" description="24-hour clock with inner/outer ring for all 24 hours" [codeExample]="clockFace24hCode">
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

          <app-doc-section title="Clock Face with Seconds" description="Clock face with seconds support" [codeExample]="clockFaceSecondsCode">
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
          <app-doc-section title="Min/Max Constraints" description="Restrict selectable time range (09:00 - 17:00)" [codeExample]="constraintCode">
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

          <app-doc-section title="Pre-filled Value" description="Timepicker with an initial value set programmatically" [codeExample]="prefilledCode">
            <div class="max-w-sm">
              <hk-timepicker
                [formControl]="prefilledControl"
                [use24Hour]="false"
              />
            </div>
            <div class="mt-4 text-sm">
              Selected: <code class="bg-base-200 px-2 py-1 rounded">{{ prefilledControl.value | json }}</code>
            </div>
          </app-doc-section>

          <app-doc-section title="Disabled State" description="Timepicker in disabled state">
            <div class="max-w-sm">
              <hk-timepicker
                [formControl]="disabledControl"
                placeholder="Disabled"
              />
            </div>
          </app-doc-section>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimepickerDemoComponent {
  readonly activeTab = signal<TimepickerTab>('basic');

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
}
