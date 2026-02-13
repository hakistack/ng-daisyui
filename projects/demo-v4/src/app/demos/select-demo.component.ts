import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { SelectComponent, SelectOption } from '@hakistack/ng-daisyui-v4';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { ApiDocEntry } from '../shared/api-table.types';

@Component({
  selector: 'app-select-demo',
  imports: [SelectComponent, ReactiveFormsModule, JsonPipe, DocSectionComponent, ApiTableComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Select Component</h1>
        <p class="text-base-content/70 mt-2">Enhanced dropdown with search, virtual scrolling, and multiselect support</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} SelectComponent {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
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
          <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Basic" [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Variants" [checked]="activeTab() === 'variants'" (change)="activeTab.set('variants')" />
          <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Features" [checked]="activeTab() === 'features'" (change)="activeTab.set('features')" />
          <input type="radio" name="select_tabs" role="tab" class="tab" aria-label="Multiselect" [checked]="activeTab() === 'multiselect'" (change)="activeTab.set('multiselect')" />
        </div>

        @if (activeTab() === 'basic') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section title="Basic Select" description="Simple dropdown selection" [codeExample]="basicCode">
              <hk-select
                [options]="basicOptions"
                placeholder="Select a fruit"
                (selectionChange)="onBasicSelect($event)"
              />
              @if (basicSelection()) {
                <div class="mt-4 text-sm">
                  Selected: <span class="font-semibold">{{ basicSelection()?.label }}</span>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Searchable Select" description="Filter options by typing" [codeExample]="searchableCode">
              <hk-select
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
            </app-doc-section>

            <app-doc-section title="Reactive Forms Integration" description="Works with Angular FormControl" [codeExample]="reactiveCode" class="lg:col-span-2">
              <div class="w-full sm:max-w-sm">
                <hk-select
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
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'variants') {
          <div class="space-y-6">
            <app-doc-section title="Sizes" description="Different size variants">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="label"><span class="label-text">Extra Small</span></label>
                  <hk-select [options]="basicOptions" size="xs" placeholder="XS" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Small</span></label>
                  <hk-select [options]="basicOptions" size="sm" placeholder="SM" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Medium (default)</span></label>
                  <hk-select [options]="basicOptions" size="md" placeholder="MD" />
                </div>
                <div>
                  <label class="label"><span class="label-text">Large</span></label>
                  <hk-select [options]="basicOptions" size="lg" placeholder="LG" />
                </div>
              </div>
            </app-doc-section>

            <app-doc-section title="Colors" description="Different color variants">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                @for (c of colors; track c) {
                  <div>
                    <label class="label"><span class="label-text capitalize">{{ c }}</span></label>
                    <hk-select [options]="basicOptions" [color]="c" [placeholder]="c" />
                  </div>
                }
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'features') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section title="Virtual Scrolling" description="Efficient rendering for large lists (1000+ items)" [codeExample]="virtualCode">
              <hk-select
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
            </app-doc-section>

            <app-doc-section title="Disabled State" description="Non-interactive select">
              <hk-select [options]="basicOptions" [disabled]="true" placeholder="Disabled select" />
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'multiselect') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section title="Basic Multiselect" description="Select multiple options with chip display" [codeExample]="multiCode">
              <hk-select
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
            </app-doc-section>

            <app-doc-section title="Without Chips" description="Shows comma-separated values with count badge">
              <hk-select
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
            </app-doc-section>

            <app-doc-section title="Max Selection Limit" description="Limit selections to maximum 3 items">
              <hk-select
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
            </app-doc-section>

            <app-doc-section title="Disabled Options" description="Some options can be disabled">
              <hk-select
                [options]="optionsWithDisabled"
                [multiple]="true"
                [enableSearch]="true"
                placeholder="Select items"
              />
            </app-doc-section>

            <app-doc-section title="Reactive Forms Integration" description="Works with Angular FormControl (array values)" class="lg:col-span-2">
              <div class="w-full sm:max-w-md">
                <hk-select
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
export class SelectDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<'basic' | 'variants' | 'features' | 'multiselect'>('basic');

  basicSelection = signal<SelectOption | null>(null);
  countrySelection = signal<SelectOption | null>(null);
  largeSelection = signal<SelectOption | null>(null);

  multiSelection = signal<SelectOption[]>([]);
  countryMultiSelection = signal<SelectOption[]>([]);
  limitedMultiSelection = signal<SelectOption[]>([]);

  formControl = new FormControl<string | null>(null);
  multiFormControl = new FormControl<string[] | null>(null);

  colors = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error', 'neutral'] as const;

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

  // --- Code examples ---
  basicCode = `// TypeScript
options: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

// Template
<hk-select
  [options]="options"
  placeholder="Select a fruit"
  (selectionChange)="onSelect($event)"
/>`;

  searchableCode = `// TypeScript
countryOptions: SelectOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  // ...more options
];

// Template
<hk-select
  [options]="countryOptions"
  [enableSearch]="true"
  [allowClear]="true"
  placeholder="Select a country"
  searchPlaceholder="Search countries..."
/>`;

  reactiveCode = `// TypeScript
formControl = new FormControl<string | null>(null);
options: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

// Template
<hk-select
  [formControl]="formControl"
  [options]="options"
  [enableSearch]="true"
  [allowClear]="true"
/>`;

  virtualCode = `// TypeScript
largeOptions: SelectOption[] = Array.from(
  { length: 1000 },
  (_, i) => ({ value: \`item-\${i + 1}\`, label: \`Item \${i + 1}\` })
);

// Template
<hk-select
  [options]="largeOptions"
  [enableSearch]="true"
  [virtualScroll]="true"
  placeholder="Select from 1000 items"
/>`;

  multiCode = `// TypeScript
options: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

// Template
<hk-select
  [options]="options"
  [multiple]="true"
  [enableSearch]="true"
  placeholder="Select fruits"
  (selectionChange)="onMultiSelect($event)"
/>`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    { name: 'options', type: 'SelectOption[]', default: '[]', description: 'Array of options to display' },
    { name: 'placeholder', type: 'string', default: "'Select an option'", description: 'Placeholder text when nothing is selected' },
    { name: 'enableSearch', type: 'boolean', default: 'false', description: 'Enable search/filter input' },
    { name: 'searchPlaceholder', type: 'string', default: "'Search options...'", description: 'Placeholder for search input' },
    { name: 'multiple', type: 'boolean', default: 'false', description: 'Enable multi-select mode' },
    { name: 'maxSelectedItems', type: 'number | null', default: 'null', description: 'Maximum number of selectable items (multi-select)' },
    { name: 'chipDisplay', type: 'boolean', default: 'true', description: 'Show selected items as chips (multi-select)' },
    { name: 'maxChipsVisible', type: 'number', default: '3', description: 'Max chips visible before overflow counter' },
    { name: 'allowClear', type: 'boolean', default: 'true', description: 'Show clear button' },
    { name: 'virtualScroll', type: 'boolean', default: 'false', description: 'Enable virtual scrolling for large lists' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the select' },
    { name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'", default: "'md'", description: 'Size variant' },
    { name: 'color', type: 'SelectColor | null', default: 'null', description: 'Color variant (primary, secondary, etc.)' },
    { name: 'showSelectAll', type: 'boolean', default: 'true', description: 'Show select all button (multi-select)' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'selectionChange', type: 'SelectOption | SelectOption[] | null', description: 'Emitted when selection changes' },
    { name: 'searchChange', type: 'string', description: 'Emitted when search term changes' },
    { name: 'dropdownToggle', type: 'boolean', description: 'Emitted when dropdown opens or closes' },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'toggleDropdown()', type: 'void', description: 'Toggle dropdown open/close' },
    { name: 'selectOption(option)', type: 'void', description: 'Programmatically select an option' },
    { name: 'selectAll()', type: 'void', description: 'Select all options (multi-select)' },
    { name: 'deselectAll()', type: 'void', description: 'Deselect all options (multi-select)' },
    { name: 'clearSelection(event)', type: 'void', description: 'Clear current selection' },
    { name: 'clearSearch(event)', type: 'void', description: 'Clear search input' },
  ];
}
