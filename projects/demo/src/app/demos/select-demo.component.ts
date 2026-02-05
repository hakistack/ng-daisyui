import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { SelectComponent, SelectOption } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-select-demo',
  imports: [SelectComponent, ReactiveFormsModule, JsonPipe],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold">Select Component</h1>
        <p class="text-base-content/70 mt-2">Enhanced dropdown with search, virtual scrolling, and multiselect support</p>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-box">
        <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Basic" [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
        <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Variants" [checked]="activeTab() === 'variants'" (change)="activeTab.set('variants')" />
        <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Features" [checked]="activeTab() === 'features'" (change)="activeTab.set('features')" />
        <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Multiselect" [checked]="activeTab() === 'multiselect'" (change)="activeTab.set('multiselect')" />
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Basic Tab -->
        @if (activeTab() === 'basic') {
          <div class="grid gap-6 lg:grid-cols-2">
            <!-- Basic Select -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Basic Select</h2>
                <p class="text-sm text-base-content/60 mb-4">Simple dropdown selection</p>
                <app-select
                  [options]="basicOptions"
                  placeholder="Select a fruit"
                  (selectionChange)="onBasicSelect($event)"
                />
                @if (basicSelection()) {
                  <div class="mt-4 text-sm">
                    Selected: <span class="font-semibold">{{ basicSelection()?.label }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Searchable Select -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Searchable Select</h2>
                <p class="text-sm text-base-content/60 mb-4">Filter options by typing</p>
                <app-select
                  [options]="countryOptions"
                  [enableSearch]="true"
                  placeholder="Select a country"
                  searchPlaceholder="Search countries..."
                  [allowClear]="true"
                  (selectionChange)="onCountrySelect($event)"
                />
                @if (countrySelection()) {
                  <div class="mt-4 text-sm">
                    Selected: <span class="font-semibold">{{ countrySelection()?.label }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Reactive Forms -->
            <div class="card bg-base-100 shadow-xl lg:col-span-2">
              <div class="card-body">
                <h2 class="card-title">Reactive Forms Integration</h2>
                <p class="text-sm text-base-content/60 mb-4">Works with Angular FormControl</p>
                <div class="w-full sm:max-w-sm">
                  <app-select
                    [formControl]="formControl"
                    [options]="basicOptions"
                    [enableSearch]="true"
                    [allowClear]="true"
                    placeholder="Select with FormControl"
                  />
                </div>
                <div class="mt-4 text-sm">
                  <div>Form Value: <code class="bg-base-200 px-2 py-1 rounded">{{ formControl.value | json }}</code></div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-ghost" (click)="formControl.setValue('banana')">Set to Banana</button>
                    <button class="btn btn-sm btn-ghost" (click)="formControl.reset()">Reset</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Variants Tab -->
        @if (activeTab() === 'variants') {
          <div class="space-y-6">
            <!-- Sizes -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Sizes</h2>
                <p class="text-sm text-base-content/60 mb-4">Different size variants</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label class="label"><span class="label-text">Extra Small</span></label>
                    <app-select [options]="basicOptions" size="xs" placeholder="XS" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Small</span></label>
                    <app-select [options]="basicOptions" size="sm" placeholder="SM" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Medium (default)</span></label>
                    <app-select [options]="basicOptions" size="md" placeholder="MD" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Large</span></label>
                    <app-select [options]="basicOptions" size="lg" placeholder="LG" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Colors -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Colors</h2>
                <p class="text-sm text-base-content/60 mb-4">Different color variants</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label class="label"><span class="label-text">Primary</span></label>
                    <app-select [options]="basicOptions" color="primary" placeholder="Primary" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Secondary</span></label>
                    <app-select [options]="basicOptions" color="secondary" placeholder="Secondary" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Accent</span></label>
                    <app-select [options]="basicOptions" color="accent" placeholder="Accent" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Info</span></label>
                    <app-select [options]="basicOptions" color="info" placeholder="Info" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Success</span></label>
                    <app-select [options]="basicOptions" color="success" placeholder="Success" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Warning</span></label>
                    <app-select [options]="basicOptions" color="warning" placeholder="Warning" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Error</span></label>
                    <app-select [options]="basicOptions" color="error" placeholder="Error" />
                  </div>
                  <div>
                    <label class="label"><span class="label-text">Neutral</span></label>
                    <app-select [options]="basicOptions" color="neutral" placeholder="Neutral" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Features Tab -->
        @if (activeTab() === 'features') {
          <div class="grid gap-6 lg:grid-cols-2">
            <!-- Virtual Scroll -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Virtual Scrolling</h2>
                <p class="text-sm text-base-content/60 mb-4">Efficient rendering for large lists (1000+ items)</p>
                <app-select
                  [options]="largeOptions"
                  [enableSearch]="true"
                  [virtualScroll]="true"
                  placeholder="Select from 1000 items"
                  (selectionChange)="onLargeSelect($event)"
                />
                @if (largeSelection()) {
                  <div class="mt-4 text-sm">
                    Selected: <span class="font-semibold">{{ largeSelection()?.label }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Disabled State -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Disabled State</h2>
                <p class="text-sm text-base-content/60 mb-4">Non-interactive select</p>
                <app-select [options]="basicOptions" [disabled]="true" placeholder="Disabled select" />
              </div>
            </div>
          </div>
        }

        <!-- Multiselect Tab -->
        @if (activeTab() === 'multiselect') {
          <div class="grid gap-6 lg:grid-cols-2">
            <!-- Basic Multiselect -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Basic Multiselect</h2>
                <p class="text-sm text-base-content/60 mb-4">Select multiple options with chip display</p>
                <app-select
                  [options]="basicOptions"
                  [multiple]="true"
                  [enableSearch]="true"
                  placeholder="Select fruits"
                  (selectionChange)="onMultiSelect($event)"
                />
                @if (multiSelection().length > 0) {
                  <div class="mt-4 text-sm">
                    Selected: <span class="font-semibold">{{ getLabels(multiSelection()) }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Multiselect Without Chips -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Without Chips</h2>
                <p class="text-sm text-base-content/60 mb-4">Shows comma-separated values with count badge</p>
                <app-select
                  [options]="countryOptions"
                  [multiple]="true"
                  [chipDisplay]="false"
                  [enableSearch]="true"
                  placeholder="Select countries"
                  (selectionChange)="onCountryMultiSelect($event)"
                />
                @if (countryMultiSelection().length > 0) {
                  <div class="mt-4 text-sm">
                    Selected {{ countryMultiSelection().length }} countries
                  </div>
                }
              </div>
            </div>

            <!-- Multiselect with Max Limit -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Max Selection Limit</h2>
                <p class="text-sm text-base-content/60 mb-4">Limit selections to maximum 3 items</p>
                <app-select
                  [options]="basicOptions"
                  [multiple]="true"
                  [maxSelectedItems]="3"
                  [enableSearch]="true"
                  placeholder="Select up to 3 fruits"
                  (selectionChange)="onLimitedMultiSelect($event)"
                />
                @if (limitedMultiSelection().length > 0) {
                  <div class="mt-4 text-sm">
                    Selected {{ limitedMultiSelection().length }}/3: <span class="font-semibold">{{ getLabels(limitedMultiSelection()) }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Multiselect with Disabled Options -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title">Disabled Options</h2>
                <p class="text-sm text-base-content/60 mb-4">Some options can be disabled</p>
                <app-select
                  [options]="optionsWithDisabled"
                  [multiple]="true"
                  [enableSearch]="true"
                  placeholder="Select items"
                />
              </div>
            </div>

            <!-- Multiselect with Reactive Forms -->
            <div class="card bg-base-100 shadow-xl lg:col-span-2">
              <div class="card-body">
                <h2 class="card-title">Reactive Forms Integration</h2>
                <p class="text-sm text-base-content/60 mb-4">Works with Angular FormControl (array values)</p>
                <div class="w-full sm:max-w-md">
                  <app-select
                    [formControl]="multiFormControl"
                    [options]="basicOptions"
                    [multiple]="true"
                    [enableSearch]="true"
                    [allowClear]="true"
                    placeholder="Select with FormControl"
                  />
                </div>
                <div class="mt-4 text-sm">
                  <div>Form Value: <code class="bg-base-200 px-2 py-1 rounded">{{ multiFormControl.value | json }}</code></div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-ghost" (click)="multiFormControl.setValue(['apple', 'banana'])">Set Apple & Banana</button>
                    <button class="btn btn-sm btn-ghost" (click)="multiFormControl.reset()">Reset</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class SelectDemoComponent {
  activeTab = signal<'basic' | 'variants' | 'features' | 'multiselect'>('basic');

  basicSelection = signal<SelectOption | null>(null);
  countrySelection = signal<SelectOption | null>(null);
  largeSelection = signal<SelectOption | null>(null);

  multiSelection = signal<SelectOption[]>([]);
  countryMultiSelection = signal<SelectOption[]>([]);
  limitedMultiSelection = signal<SelectOption[]>([]);

  formControl = new FormControl<string | null>(null);
  multiFormControl = new FormControl<string[] | null>(null);

  basicOptions: SelectOption[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'date', label: 'Date' },
    { value: 'elderberry', label: 'Elderberry' },
  ];

  countryOptions: SelectOption[] = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'es', label: 'Spain' },
    { value: 'it', label: 'Italy' },
    { value: 'jp', label: 'Japan' },
    { value: 'cn', label: 'China' },
    { value: 'kr', label: 'South Korea' },
    { value: 'au', label: 'Australia' },
    { value: 'br', label: 'Brazil' },
    { value: 'mx', label: 'Mexico' },
    { value: 'in', label: 'India' },
    { value: 'ru', label: 'Russia' },
  ];

  largeOptions: SelectOption[] = Array.from({ length: 1000 }, (_, i) => ({
    value: `item-${i + 1}`,
    label: `Item ${i + 1} - ${this.randomName()}`,
  }));

  optionsWithDisabled: SelectOption[] = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2 (disabled)', disabled: true },
    { value: 'opt3', label: 'Option 3' },
    { value: 'opt4', label: 'Option 4 (disabled)', disabled: true },
    { value: 'opt5', label: 'Option 5' },
  ];

  private randomName(): string {
    const adjectives = ['Amazing', 'Brilliant', 'Creative', 'Dynamic', 'Elegant'];
    const nouns = ['Product', 'Service', 'Solution', 'Package', 'Bundle'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  onBasicSelect(option: SelectOption | SelectOption[] | null) {
    this.basicSelection.set(Array.isArray(option) ? null : option);
  }

  onCountrySelect(option: SelectOption | SelectOption[] | null) {
    this.countrySelection.set(Array.isArray(option) ? null : option);
  }

  onLargeSelect(option: SelectOption | SelectOption[] | null) {
    this.largeSelection.set(Array.isArray(option) ? null : option);
  }

  onMultiSelect(options: SelectOption | SelectOption[] | null) {
    this.multiSelection.set(Array.isArray(options) ? options : []);
  }

  onCountryMultiSelect(options: SelectOption | SelectOption[] | null) {
    this.countryMultiSelection.set(Array.isArray(options) ? options : []);
  }

  onLimitedMultiSelect(options: SelectOption | SelectOption[] | null) {
    this.limitedMultiSelection.set(Array.isArray(options) ? options : []);
  }

  getLabels(options: SelectOption[]): string {
    return options.map(o => o.label).join(', ');
  }
}
