import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { InputComponent, InputColor, InputMaskDirective } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

type ExampleTab = 'basic' | 'variants' | 'styling' | 'forms' | 'mask';
type ApiTab = 'component' | 'configs' | 'types';

@Component({
  selector: 'app-input-demo',
  imports: [
    InputComponent,
    InputMaskDirective,
    ReactiveFormsModule,
    JsonPipe,
    DocSectionComponent,
    ApiTableComponent,
    CodeBlockComponent,
    DemoPageComponent,
  ],
  template: `
    <app-demo-page
      title="Input"
      description="Versatile text input with variant support for currency, phone, percentage, and password"
      icon="TextCursorInput"
      category="Inputs"
      importName="InputComponent"
    >
      <div examples>
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'variants'" (click)="activeTab.set('variants')">
            Variants
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'styling'" (click)="activeTab.set('styling')">Styling</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'forms'" (click)="activeTab.set('forms')">
            Reactive Forms
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'mask'" (click)="activeTab.set('mask')">Input Mask</button>
        </div>

        <!-- Basic Tab -->
        @if (activeTab() === 'basic') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section title="Default Input" description="Simple text input" [codeExample]="basicCode">
              <hk-input placeholder="Enter your name" (valueChange)="textValue.set($event)" />
              @if (textValue() !== null) {
                <div class="mt-3 text-sm">
                  Value: <code class="bg-base-200 px-2 py-1 rounded">{{ textValue() }}</code>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="With Prefix & Suffix" description="Add icons or text adornments" [codeExample]="adornmentCode">
              <div class="space-y-4">
                <hk-input placeholder="Search..." prefixIcon="Search" />
                <hk-input placeholder="Enter email" suffixIcon="Mail" />
                <hk-input placeholder="https://example.com" prefixText="URL" />
              </div>
            </app-doc-section>

            <app-doc-section title="Disabled & Readonly" description="Non-interactive states">
              <div class="space-y-4">
                <hk-input placeholder="Disabled input" [disabled]="true" />
                <hk-input placeholder="Readonly input" [readonly]="true" [formControl]="readonlyControl" />
              </div>
            </app-doc-section>
          </div>
        }

        <!-- Variants Tab -->
        @if (activeTab() === 'variants') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section
              title="Currency"
              description="Formats numbers as currency with thousand separators. Raw number is the form value."
              [codeExample]="currencyCode"
            >
              <hk-input
                variant="currency"
                placeholder="Enter amount"
                [formControl]="currencyControl"
                [currencyConfig]="{ locale: 'en-US', currency: 'USD', decimalPlaces: 2 }"
              />
              <div class="mt-3 text-sm">
                Form value: <code class="bg-base-200 px-2 py-1 rounded">{{ currencyControl.value | json }}</code>
                <span class="text-base-content/60 ml-2">(raw number, not formatted)</span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button class="btn btn-sm btn-ghost" (click)="currencyControl.setValue(1234.56)">Set $1,234.56</button>
                <button class="btn btn-sm btn-ghost" (click)="currencyControl.setValue(99999)">Set $99,999</button>
                <button class="btn btn-sm btn-ghost" (click)="currencyControl.reset()">Reset</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Currency (EUR)" description="Currency with Euro locale configuration" [codeExample]="currencyEurCode">
              <hk-input
                variant="currency"
                placeholder="Betrag eingeben"
                [formControl]="eurControl"
                [currencyConfig]="{ locale: 'de-DE', currency: 'EUR', decimalPlaces: 2 }"
              />
              <div class="mt-3 text-sm">
                Form value: <code class="bg-base-200 px-2 py-1 rounded">{{ eurControl.value | json }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="Phone" description="Formats phone numbers with masking. Stores digits only." [codeExample]="phoneCode">
              <hk-input variant="phone" placeholder="Enter phone number" [formControl]="phoneControl" />
              <div class="mt-3 text-sm">
                Form value: <code class="bg-base-200 px-2 py-1 rounded">{{ phoneControl.value | json }}</code>
                <span class="text-base-content/60 ml-2">(digits only)</span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button class="btn btn-sm btn-ghost" (click)="phoneControl.setValue('5551234567')">Set (555) 123-4567</button>
                <button class="btn btn-sm btn-ghost" (click)="phoneControl.reset()">Reset</button>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Percentage"
              description="Percentage input with % symbol. Clamps value between min and max."
              [codeExample]="percentageCode"
            >
              <hk-input
                variant="percentage"
                placeholder="Enter percentage"
                [formControl]="percentControl"
                [percentageConfig]="{ decimalPlaces: 1, min: 0, max: 100 }"
              />
              <div class="mt-3 text-sm">
                Form value: <code class="bg-base-200 px-2 py-1 rounded">{{ percentControl.value | json }}</code>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button class="btn btn-sm btn-ghost" (click)="percentControl.setValue(75)">Set 75%</button>
                <button class="btn btn-sm btn-ghost" (click)="percentControl.setValue(33.3)">Set 33.3%</button>
                <button class="btn btn-sm btn-ghost" (click)="percentControl.reset()">Reset</button>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Password"
              description="Password input with show/hide toggle"
              [codeExample]="passwordCode"
              class="lg:col-span-2"
            >
              <div class="w-full sm:max-w-sm">
                <hk-input variant="password" placeholder="Enter password" [formControl]="passwordControl" />
              </div>
              <div class="mt-3 text-sm">
                Form value: <code class="bg-base-200 px-2 py-1 rounded">{{ passwordControl.value | json }}</code>
              </div>
            </app-doc-section>
          </div>
        }

        <!-- Styling Tab -->
        @if (activeTab() === 'styling') {
          <div class="space-y-6">
            <app-doc-section title="Sizes" description="Different size variants matching DaisyUI">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label class="label"><span class="label-text">Extra Small</span></label>
                  <hk-input size="xs" placeholder="XS" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Small</span></label>
                  <hk-input size="sm" placeholder="SM" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Medium (default)</span></label>
                  <hk-input size="md" placeholder="MD" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Large</span></label>
                  <hk-input size="lg" placeholder="LG" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Extra Large</span></label>
                  <hk-input size="xl" placeholder="XL" />
                </div>
              </div>
            </app-doc-section>

            <app-doc-section title="Colors" description="Different color variants">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                @for (c of colors; track c) {
                  <div>
                    <label class="label"
                      ><span class="label-text capitalize">{{ c }}</span></label
                    >
                    <hk-input [color]="c" [placeholder]="c" />
                  </div>
                }
              </div>
            </app-doc-section>

            <app-doc-section title="Combined" description="Variants with sizes and colors">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label class="label"><span class="label-text">Small Currency (Primary)</span></label>
                  <hk-input variant="currency" size="sm" color="primary" placeholder="Amount" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Large Phone (Accent)</span></label>
                  <hk-input variant="phone" size="lg" color="accent" placeholder="Phone" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Password (Error)</span></label>
                  <hk-input variant="password" color="error" placeholder="Password" />
                </div>
              </div>
            </app-doc-section>
          </div>
        }

        <!-- Reactive Forms Tab -->
        @if (activeTab() === 'forms') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section
              title="FormControl Integration"
              description="Works with Angular Reactive Forms"
              [codeExample]="reactiveFormCode"
              class="lg:col-span-2"
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label class="label"><span class="label-text">Name</span></label>
                  <hk-input [formControl]="nameControl" placeholder="Full name" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Salary</span></label>
                  <hk-input variant="currency" [formControl]="salaryControl" placeholder="Annual salary" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Phone</span></label>
                  <hk-input variant="phone" [formControl]="demoPhoneControl" placeholder="Phone number" />
                </div>
              </div>
              <div class="mt-4 p-4 bg-base-200 rounded-lg">
                <h4 class="font-semibold text-sm mb-2">Form Values</h4>
                <pre class="text-xs">{{ formValues() | json }}</pre>
              </div>
            </app-doc-section>

            <app-doc-section title="Disabled via FormControl" description="Disable input through the form control API">
              <hk-input [formControl]="disabledControl" placeholder="Disabled via FormControl" />
              <div class="mt-3 flex gap-2">
                <button class="btn btn-sm btn-ghost" (click)="disabledControl.disable()">Disable</button>
                <button class="btn btn-sm btn-ghost" (click)="disabledControl.enable()">Enable</button>
              </div>
            </app-doc-section>

            <app-doc-section title="Programmatic Value Setting" description="Set values programmatically and see formatted output">
              <hk-input variant="currency" [formControl]="programmaticControl" placeholder="Set via buttons" />
              <div class="mt-3 text-sm">
                Raw value: <code class="bg-base-200 px-2 py-1 rounded">{{ programmaticControl.value | json }}</code>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button class="btn btn-sm btn-primary" (click)="programmaticControl.setValue(500)">$500</button>
                <button class="btn btn-sm btn-secondary" (click)="programmaticControl.setValue(1500.75)">$1,500.75</button>
                <button class="btn btn-sm btn-accent" (click)="programmaticControl.setValue(1000000)">$1,000,000</button>
                <button class="btn btn-sm btn-ghost" (click)="programmaticControl.reset()">Reset</button>
              </div>
            </app-doc-section>
          </div>
        }

        <!-- Input Mask Tab -->
        @if (activeTab() === 'mask') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section
              title="Phone Mask"
              description="Live formatting as you type with slot characters"
              [codeExample]="phoneMaskCode"
            >
              <input
                class="input input-bordered w-full"
                hkInputMask="(999) 999-9999"
                placeholder="(___) ___-____"
                (maskValueChange)="maskPhone.set($event)"
              />
              <div class="mt-3 text-sm">
                Value: <code class="bg-base-200 px-2 py-1 rounded">{{ maskPhone() }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="Date Mask" description="Date format with auto-inserted separators" [codeExample]="dateMaskCode">
              <input
                class="input input-bordered w-full"
                hkInputMask="99/99/9999"
                placeholder="MM/DD/YYYY"
                (maskValueChange)="maskDate.set($event)"
              />
              <div class="mt-3 text-sm">
                Value: <code class="bg-base-200 px-2 py-1 rounded">{{ maskDate() }}</code>
              </div>
            </app-doc-section>

            <app-doc-section
              title="SSN Mask (unmask)"
              description="With unmask=true, only raw digits are emitted"
              [codeExample]="ssnMaskCode"
            >
              <input
                class="input input-bordered w-full"
                hkInputMask="999-99-9999"
                [unmask]="true"
                placeholder="___-__-____"
                (maskValueChange)="maskSsn.set($event)"
              />
              <div class="mt-3 text-sm">
                Raw value: <code class="bg-base-200 px-2 py-1 rounded">{{ maskSsn() }}</code>
                <span class="text-base-content/60 ml-2">(digits only, no dashes)</span>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Serial Number (mixed)"
              description="Alpha (a), alphanumeric (*), and digit (9) mask characters"
              [codeExample]="serialMaskCode"
            >
              <input
                class="input input-bordered w-full"
                hkInputMask="a*-999-a999"
                placeholder="__-___-____"
                (maskValueChange)="maskSerial.set($event)"
              />
              <div class="mt-3 text-sm">
                Value: <code class="bg-base-200 px-2 py-1 rounded">{{ maskSerial() }}</code>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Optional Section"
              description="Characters after ? are optional — won't clear on blur if missing"
              [codeExample]="optionalMaskCode"
            >
              <input
                class="input input-bordered w-full"
                hkInputMask="(999) 999-9999? x99999"
                placeholder="(___) ___-____ x_____"
                (maskValueChange)="maskOptional.set($event)"
              />
              <div class="mt-3 text-sm">
                Value: <code class="bg-base-200 px-2 py-1 rounded">{{ maskOptional() }}</code>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Custom Slot Character"
              description="Use a space instead of underscore as the placeholder"
              [codeExample]="customSlotCode"
            >
              <input
                class="input input-bordered w-full"
                hkInputMask="99:99"
                slotChar=" "
                [autoClear]="false"
                placeholder="HH:MM"
                (maskValueChange)="maskCustom.set($event)"
              />
              <div class="mt-3 text-sm">
                Value: <code class="bg-base-200 px-2 py-1 rounded">{{ maskCustom() }}</code>
              </div>
            </app-doc-section>
          </div>
        }
      </div>

      <!-- API Section -->
      <div api>
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'configs'" (click)="apiTab.set('configs')">
            Variant Configs
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Inputs" [entries]="inputDocs" />
            <app-api-table title="Outputs" [entries]="outputDocs" />
          </div>
        }

        @if (apiTab() === 'configs') {
          <div class="space-y-6">
            <app-api-table title="CurrencyConfig" [entries]="currencyConfigDocs" />
            <app-api-table title="PhoneConfig" [entries]="phoneConfigDocs" />
            <app-api-table title="PercentageConfig" [entries]="percentageConfigDocs" />
            <app-api-table title="PasswordConfig" [entries]="passwordConfigDocs" />
          </div>
        }

        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Type Definitions</h3>
                <app-code-block [code]="typesCode" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class InputDemoComponent {
  activeTab = signal<ExampleTab>('basic');
  apiTab = signal<ApiTab>('component');

  colors: InputColor[] = ['neutral', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'];

  // ── Demo State ─────────────────────────────────────────────────────────

  textValue = signal<string | number | null>(null);
  readonlyControl = new FormControl('Read only value');
  currencyControl = new FormControl<number | null>(null);
  eurControl = new FormControl<number | null>(null);
  phoneControl = new FormControl<string | null>(null);
  percentControl = new FormControl<number | null>(null);
  passwordControl = new FormControl<string | null>(null);

  nameControl = new FormControl('');
  salaryControl = new FormControl<number | null>(null);
  demoPhoneControl = new FormControl<string | null>(null);
  disabledControl = new FormControl('Hello');
  programmaticControl = new FormControl<number | null>(null);

  // Mask demo state
  maskPhone = signal('');
  maskDate = signal('');
  maskSsn = signal('');
  maskSerial = signal('');
  maskOptional = signal('');
  maskCustom = signal('');

  formValues = signal<Record<string, unknown>>({});

  constructor() {
    // Keep formValues in sync
    const updateFormValues = () => {
      this.formValues.set({
        name: this.nameControl.value,
        salary: this.salaryControl.value,
        phone: this.demoPhoneControl.value,
      });
    };
    this.nameControl.valueChanges.subscribe(() => updateFormValues());
    this.salaryControl.valueChanges.subscribe(() => updateFormValues());
    this.demoPhoneControl.valueChanges.subscribe(() => updateFormValues());
  }

  // ── Code Examples ──────────────────────────────────────────────────────

  basicCode = `<hk-input placeholder="Enter your name" (valueChange)="onValueChange($event)" />`;

  adornmentCode = `<!-- Icon prefix -->
<hk-input placeholder="Search..." prefixIcon="Search" />

<!-- Icon suffix -->
<hk-input placeholder="Enter email" suffixIcon="Mail" />

<!-- Text prefix -->
<hk-input placeholder="https://example.com" prefixText="URL" />`;

  currencyCode = `<hk-input
  variant="currency"
  placeholder="Enter amount"
  [formControl]="amountControl"
  [currencyConfig]="{ locale: 'en-US', currency: 'USD', decimalPlaces: 2 }"
/>
// amountControl.value → 1234.56 (raw number)
// Display → $1,234.56 (formatted on blur)`;

  currencyEurCode = `<hk-input
  variant="currency"
  placeholder="Betrag eingeben"
  [formControl]="eurControl"
  [currencyConfig]="{ locale: 'de-DE', currency: 'EUR', decimalPlaces: 2 }"
/>`;

  phoneCode = `<hk-input
  variant="phone"
  placeholder="Enter phone number"
  [formControl]="phoneControl"
/>
// phoneControl.value → "5551234567" (digits only)
// Display → (555) 123-4567 (formatted on blur)`;

  percentageCode = `<hk-input
  variant="percentage"
  placeholder="Enter percentage"
  [formControl]="percentControl"
  [percentageConfig]="{ decimalPlaces: 1, min: 0, max: 100 }"
/>
// percentControl.value → 75 (clamped number)
// Display → 75.0% (formatted on blur)`;

  passwordCode = `<hk-input
  variant="password"
  placeholder="Enter password"
  [formControl]="passwordControl"
/>
// Includes show/hide toggle button`;

  reactiveFormCode = `import { FormControl } from '@angular/forms';
import { InputComponent } from '@hakistack/ng-daisyui';

// In your component
nameControl = new FormControl('');
salaryControl = new FormControl<number | null>(null);
phoneControl = new FormControl<string | null>(null);

// In template
<hk-input [formControl]="nameControl" placeholder="Full name" />
<hk-input variant="currency" [formControl]="salaryControl" placeholder="Annual salary" />
<hk-input variant="phone" [formControl]="phoneControl" placeholder="Phone number" />`;

  // ── Mask Code Examples ────────────────────────────────────────────────

  phoneMaskCode = `<input
  class="input input-bordered w-full"
  hkInputMask="(999) 999-9999"
  placeholder="(___) ___-____"
  (maskValueChange)="onValueChange($event)"
/>`;

  dateMaskCode = `<input
  class="input input-bordered w-full"
  hkInputMask="99/99/9999"
  placeholder="MM/DD/YYYY"
/>`;

  ssnMaskCode = `<!-- unmask=true emits raw digits only -->
<input
  class="input input-bordered w-full"
  hkInputMask="999-99-9999"
  [unmask]="true"
  (maskValueChange)="onValue($event)"
/>
// maskValueChange emits "123456789" not "123-45-6789"`;

  serialMaskCode = `<!-- Mask chars: a=alpha, *=alphanumeric, 9=digit -->
<input
  class="input input-bordered w-full"
  hkInputMask="a*-999-a999"
/>`;

  optionalMaskCode = `<!-- Everything after ? is optional -->
<input
  class="input input-bordered w-full"
  hkInputMask="(999) 999-9999? x99999"
/>`;

  customSlotCode = `<!-- Custom slot character (space instead of _) -->
<input
  class="input input-bordered w-full"
  hkInputMask="99:99"
  slotChar=" "
  [autoClear]="false"
/>`;

  typesCode = `type InputVariant = 'text' | 'currency' | 'phone' | 'percentage' | 'password';
type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type InputColor = 'neutral' | 'primary' | 'secondary' | 'accent'
               | 'info' | 'success' | 'warning' | 'error';

interface CurrencyConfig {
  locale?: string;        // default 'en-US'
  currency?: string;      // ISO 4217, default 'USD'
  decimalPlaces?: number; // default 2
  showSymbol?: boolean;   // default true
  allowNegative?: boolean; // default false
}

interface PhoneConfig {
  country?: string;       // ISO alpha-2, default 'US'
  format?: 'national' | 'international'; // default 'national'
}

interface PercentageConfig {
  decimalPlaces?: number; // default 0
  min?: number;           // default 0
  max?: number;           // default 100
  showSymbol?: boolean;   // default true
}

interface PasswordConfig {
  showToggle?: boolean;   // default true
}`;

  // ── API Documentation ──────────────────────────────────────────────────

  inputDocs: ApiDocEntry[] = [
    {
      name: 'variant',
      type: 'InputVariant',
      default: "'text'",
      description: 'Input variant that determines formatting behavior and input type.',
    },
    { name: 'size', type: 'InputSize', default: "'md'", description: 'DaisyUI size variant.' },
    { name: 'color', type: 'InputColor | null', default: 'null', description: 'DaisyUI color variant.' },
    { name: 'placeholder', type: 'string', default: "''", description: 'Placeholder text shown when empty.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the input.' },
    { name: 'readonly', type: 'boolean', default: 'false', description: 'Makes the input read-only.' },
    { name: 'prefixText', type: 'string', default: "''", description: 'Text shown as a prefix adornment (e.g., "URL").' },
    { name: 'suffixText', type: 'string', default: "''", description: 'Text shown as a suffix adornment.' },
    { name: 'prefixIcon', type: 'string', default: "''", description: 'Lucide icon name for prefix adornment.' },
    { name: 'suffixIcon', type: 'string', default: "''", description: 'Lucide icon name for suffix adornment.' },
    { name: 'currencyConfig', type: 'CurrencyConfig', default: '{}', description: 'Configuration for the currency variant.' },
    { name: 'phoneConfig', type: 'PhoneConfig', default: '{}', description: 'Configuration for the phone variant.' },
    { name: 'percentageConfig', type: 'PercentageConfig', default: '{}', description: 'Configuration for the percentage variant.' },
    { name: 'passwordConfig', type: 'PasswordConfig', default: '{}', description: 'Configuration for the password variant.' },
    { name: 'maxlength', type: 'number | null', default: 'null', description: 'Maximum character length.' },
    { name: 'minlength', type: 'number | null', default: 'null', description: 'Minimum character length.' },
    { name: 'autocomplete', type: 'string', default: "''", description: 'HTML autocomplete attribute.' },
    { name: 'name', type: 'string', default: "''", description: 'HTML name attribute.' },
    { name: 'ariaLabel', type: 'string', default: "''", description: 'Accessible label. Falls back to placeholder.' },
    { name: 'ariaDescribedBy', type: 'string', default: "''", description: 'ID of the element that describes this input.' },
    { name: 'ariaInvalid', type: 'boolean', default: 'false', description: 'Sets aria-invalid for error states.' },
  ];

  outputDocs: ApiDocEntry[] = [
    {
      name: 'valueChange',
      type: 'string | number | null',
      description: 'Emits the raw parsed value on each input event. For currency, emits a number; for phone, emits digits-only string.',
    },
  ];

  currencyConfigDocs: ApiDocEntry[] = [
    {
      name: 'locale',
      type: 'string',
      default: "'en-US'",
      description: 'Locale for Intl.NumberFormat (e.g., "de-DE" for Euro formatting).',
    },
    { name: 'currency', type: 'string', default: "'USD'", description: 'ISO 4217 currency code (e.g., "EUR", "GBP", "JPY").' },
    { name: 'decimalPlaces', type: 'number', default: '2', description: 'Number of decimal places in formatted output.' },
    { name: 'showSymbol', type: 'boolean', default: 'true', description: 'Whether to show the currency symbol as a prefix.' },
    { name: 'allowNegative', type: 'boolean', default: 'false', description: 'Whether negative values are allowed.' },
  ];

  phoneConfigDocs: ApiDocEntry[] = [
    { name: 'country', type: 'string', default: "'US'", description: 'ISO 3166-1 alpha-2 country code. Determines the formatting mask.' },
    { name: 'format', type: "'national' | 'international'", default: "'national'", description: 'Phone number display format.' },
  ];

  percentageConfigDocs: ApiDocEntry[] = [
    { name: 'decimalPlaces', type: 'number', default: '0', description: 'Number of decimal places.' },
    { name: 'min', type: 'number', default: '0', description: 'Minimum allowed value.' },
    { name: 'max', type: 'number', default: '100', description: 'Maximum allowed value.' },
    { name: 'showSymbol', type: 'boolean', default: 'true', description: 'Whether to show the % suffix.' },
  ];

  passwordConfigDocs: ApiDocEntry[] = [
    { name: 'showToggle', type: 'boolean', default: 'true', description: 'Whether to show the password visibility toggle button.' },
  ];
}
