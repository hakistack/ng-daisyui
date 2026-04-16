import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { SelectComponent, SelectOption } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

type ExampleTab = 'basic' | 'variants' | 'features' | 'grouped' | 'multiselect';
type ApiSubTab = 'component' | 'configuration' | 'multi-select' | 'keyboard-a11y' | 'types';

@Component({
  selector: 'app-select-demo',
  imports: [SelectComponent, ReactiveFormsModule, JsonPipe, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Select"
      description="Enhanced dropdown with search, virtual scrolling, and multiselect support"
      icon="ChevronDown"
      category="Inputs"
      importName="SelectComponent"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section title="Basic Select" description="Simple dropdown selection" [codeExample]="basicCode">
              <hk-select [options]="basicOptions" placeholder="Select a fruit" (selectionChange)="onBasicSelect($event)" />
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

            <app-doc-section
              title="Reactive Forms Integration"
              description="Works with Angular FormControl"
              [codeExample]="reactiveCode"
              class="lg:col-span-2"
            >
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
                <div>
                  Form Value: <code class="bg-base-200 px-2 py-1 rounded">{{ formControl.value | json }}</code>
                </div>
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
                    <label class="label"
                      ><span class="label-text capitalize">{{ c }}</span></label
                    >
                    <hk-select [options]="basicOptions" [color]="c" [placeholder]="c" />
                  </div>
                }
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'features') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section
              title="Virtual Scrolling"
              description="Efficient rendering for large lists (1000+ items)"
              [codeExample]="virtualCode"
            >
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

        @if (activeTab() === 'grouped') {
          <div class="grid gap-6 lg:grid-cols-2">
            <app-doc-section
              title="Grouped Options"
              description="Options organized under group headers using the group property"
              [codeExample]="groupedCode"
            >
              <hk-select
                [options]="groupedOptions"
                [enableSearch]="true"
                placeholder="Select a vehicle"
                (selectionChange)="onGroupedSelect($event)"
              />
              @if (groupedSelection()) {
                <div class="mt-4 text-sm">
                  Selected: <span class="font-semibold">{{ groupedSelection()!.label }}</span>
                  <span class="text-base-content/60 ml-1">({{ groupedSelection()!.group }})</span>
                </div>
              }
            </app-doc-section>

            <app-doc-section
              title="Grouped Multiselect"
              description="Group headers with multi-select mode"
              [codeExample]="groupedMultiCode"
            >
              <hk-select
                [options]="groupedOptions"
                [multiple]="true"
                [enableSearch]="true"
                placeholder="Select vehicles"
                (selectionChange)="onGroupedMultiSelect($event)"
              />
              @if (groupedMultiSelection().length > 0) {
                <div class="mt-4 text-sm">
                  Selected {{ groupedMultiSelection().length }}: <span class="font-semibold">{{ getLabels(groupedMultiSelection()) }}</span>
                </div>
              }
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
                <div class="mt-4 text-sm">Selected {{ countryMultiSelection().length }} countries</div>
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
                  Selected {{ limitedMultiSelection().length }}/3:
                  <span class="font-semibold">{{ getLabels(limitedMultiSelection()) }}</span>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Disabled Options" description="Some options can be disabled">
              <hk-select [options]="optionsWithDisabled" [multiple]="true" [enableSearch]="true" placeholder="Select items" />
            </app-doc-section>

            <app-doc-section
              title="Reactive Forms Integration"
              description="Works with Angular FormControl (array values)"
              class="lg:col-span-2"
            >
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
                <div>
                  Form Value: <code class="bg-base-200 px-2 py-1 rounded">{{ multiFormControl.value | json }}</code>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button class="btn btn-sm btn-ghost" (click)="multiFormControl.setValue(['apple', 'banana'])">Set Apple & Banana</button>
                  <button class="btn btn-sm btn-ghost" (click)="multiFormControl.reset()">Reset</button>
                </div>
              </div>
            </app-doc-section>
          </div>
        }
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'configuration'" (click)="apiTab.set('configuration')">
            Configuration
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'multi-select'" (click)="apiTab.set('multi-select')">
            Multi-Select
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'keyboard-a11y'" (click)="apiTab.set('keyboard-a11y')">
            Keyboard & A11y
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Inputs" [entries]="inputDocs" />
            <app-api-table title="Outputs" [entries]="outputDocs" />
            <app-api-table title="Public Methods" [entries]="methodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ControlValueAccessor</h3>
                <p class="text-sm text-base-content/70">
                  The select component implements <code class="text-primary">ControlValueAccessor</code>, so it integrates with Angular
                  Reactive Forms and Template-driven Forms. Use <code class="text-primary">[formControl]</code>,
                  <code class="text-primary">formControlName</code>, or <code class="text-primary">[(ngModel)]</code> to bind the value. In
                  single-select mode the form value is a <code>string</code>. In multi-select mode the form value is a
                  <code>string[]</code>.
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="Display Options" [entries]="configDisplayDocs" />
            <app-api-table title="Behavior" [entries]="configBehaviorDocs" />
            <app-api-table title="Data" [entries]="configDataDocs" />
            <app-api-table title="Form Integration" [entries]="configFormDocs" />
          </div>
        }

        <!-- Multi-Select sub-tab -->
        @if (apiTab() === 'multi-select') {
          <div class="space-y-6">
            <app-api-table title="Multi-Select Inputs" [entries]="multiSelectInputDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Chip Display</h3>
                <p class="text-sm text-base-content/70">
                  When <code class="text-primary">chipDisplay</code> is <code>true</code> (default), selected items appear as removable
                  badge chips inside the select trigger. Each chip shows the option label and an <code>x</code> button to deselect. The
                  <code class="text-primary">maxChipsVisible</code> input controls how many chips are shown before a
                  <code>+N</code> overflow counter appears. When <code class="text-primary">chipDisplay</code> is <code>false</code>,
                  selected items are displayed as a comma-separated text list instead.
                </p>
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Select All / Clear All</h3>
                <p class="text-sm text-base-content/70">
                  When <code class="text-primary">showSelectAll</code> is <code>true</code> (default), a toggle link appears at the top of
                  the dropdown. It reads the <code class="text-primary">selectAllLabel</code> text when not all options are selected, and
                  switches to <code class="text-primary">clearAllLabel</code> when every option is selected. Calling
                  <code>selectAll()</code> respects the <code class="text-primary">maxSelectedItems</code> limit, selecting only up to the
                  allowed maximum. Calling <code>deselectAll()</code> clears all selections and emits <code>selectionChange</code> with
                  <code>null</code>.
                </p>
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Multi-Select Code Example</h3>
                <app-code-block [code]="multiSelectApiCode" />
              </div>
            </div>
          </div>
        }

        <!-- Keyboard & A11y sub-tab -->
        @if (apiTab() === 'keyboard-a11y') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Keyboard Shortcuts</h3>
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><kbd class="kbd kbd-sm">ArrowDown</kbd></td>
                        <td class="text-sm">Move highlight to the next option</td>
                      </tr>
                      <tr>
                        <td><kbd class="kbd kbd-sm">ArrowUp</kbd></td>
                        <td class="text-sm">Move highlight to the previous option</td>
                      </tr>
                      <tr>
                        <td><kbd class="kbd kbd-sm">Enter</kbd></td>
                        <td class="text-sm">Select the highlighted option</td>
                      </tr>
                      <tr>
                        <td><kbd class="kbd kbd-sm">Space</kbd></td>
                        <td class="text-sm">Toggle the highlighted option (multi-select mode only)</td>
                      </tr>
                      <tr>
                        <td><kbd class="kbd kbd-sm">Escape</kbd></td>
                        <td class="text-sm">Close the dropdown</td>
                      </tr>
                      <tr>
                        <td><kbd class="kbd kbd-sm">Home</kbd></td>
                        <td class="text-sm">Jump to the first option</td>
                      </tr>
                      <tr>
                        <td><kbd class="kbd kbd-sm">End</kbd></td>
                        <td class="text-sm">Jump to the last option</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ARIA Attributes</h3>
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th>Element</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code class="text-xs">role="combobox"</code></td>
                        <td class="text-sm">Trigger button</td>
                        <td class="text-sm">Identifies the select trigger as a combobox widget</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">aria-expanded</code></td>
                        <td class="text-sm">Trigger button</td>
                        <td class="text-sm">Reflects whether the dropdown is open or closed</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">aria-haspopup="listbox"</code></td>
                        <td class="text-sm">Trigger button</td>
                        <td class="text-sm">Indicates the trigger controls a listbox popup</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">aria-activedescendant</code></td>
                        <td class="text-sm">Trigger button</td>
                        <td class="text-sm">Points to the id of the currently highlighted option</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">role="listbox"</code></td>
                        <td class="text-sm">Options list</td>
                        <td class="text-sm">Identifies the dropdown list as a listbox</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">aria-multiselectable</code></td>
                        <td class="text-sm">Options list</td>
                        <td class="text-sm">Set to true when multiple mode is enabled</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">role="option"</code></td>
                        <td class="text-sm">Each option</td>
                        <td class="text-sm">Identifies each item as a selectable option</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">aria-selected</code></td>
                        <td class="text-sm">Each option</td>
                        <td class="text-sm">Indicates whether the option is currently selected</td>
                      </tr>
                      <tr>
                        <td><code class="text-xs">aria-disabled</code></td>
                        <td class="text-sm">Each option</td>
                        <td class="text-sm">Indicates whether the option is disabled</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Focus Management</h3>
                <p class="text-sm text-base-content/70">
                  When the dropdown opens, focus moves to the search input (if <code class="text-primary">enableSearch</code>
                  is true) or remains on the trigger element. Arrow keys navigate the highlight through options without moving focus. When
                  an option is selected in single-select mode the dropdown closes and focus returns to the trigger. In multi-select mode the
                  dropdown stays open so users can continue selecting. Pressing
                  <kbd class="kbd kbd-xs">Escape</kbd> always closes the dropdown and returns focus to the trigger. Clicking outside the
                  component also closes the dropdown.
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">SelectOption</h3>
                <app-code-block [code]="typeSelectOption" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">SelectOptionGroup</h3>
                <app-code-block [code]="typeSelectOptionGroup" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">SelectValue</h3>
                <app-code-block [code]="typeSelectValue" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">SelectSize</h3>
                <app-code-block [code]="typeSelectSize" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">SelectColor</h3>
                <app-code-block [code]="typeSelectColor" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class SelectDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as ExampleTab);
  apiTab = signal<ApiSubTab>('component');

  basicSelection = signal<SelectOption | null>(null);
  countrySelection = signal<SelectOption | null>(null);
  largeSelection = signal<SelectOption | null>(null);

  groupedSelection = signal<SelectOption | null>(null);
  groupedMultiSelection = signal<SelectOption[]>([]);
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

  groupedOptions: SelectOption[] = [
    { value: 'sedan', label: 'Sedan', group: 'Cars' },
    { value: 'suv', label: 'SUV', group: 'Cars' },
    { value: 'coupe', label: 'Coupe', group: 'Cars' },
    { value: 'hatchback', label: 'Hatchback', group: 'Cars' },
    { value: 'sportbike', label: 'Sport Bike', group: 'Motorcycles' },
    { value: 'cruiser', label: 'Cruiser', group: 'Motorcycles' },
    { value: 'scooter', label: 'Scooter', group: 'Motorcycles' },
    { value: 'pickup', label: 'Pickup', group: 'Trucks' },
    { value: 'semi', label: 'Semi Truck', group: 'Trucks' },
    { value: 'van', label: 'Van', group: 'Trucks' },
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

  onGroupedSelect(option: SelectOption | SelectOption[] | null) {
    this.groupedSelection.set(Array.isArray(option) ? null : option);
  }

  onGroupedMultiSelect(options: SelectOption | SelectOption[] | null) {
    this.groupedMultiSelection.set(Array.isArray(options) ? options : []);
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
    return options.map((o) => o.label).join(', ');
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

  groupedCode = `// TypeScript
options: SelectOption[] = [
  { value: 'sedan', label: 'Sedan', group: 'Cars' },
  { value: 'suv', label: 'SUV', group: 'Cars' },
  { value: 'coupe', label: 'Coupe', group: 'Cars' },
  { value: 'sportbike', label: 'Sport Bike', group: 'Motorcycles' },
  { value: 'cruiser', label: 'Cruiser', group: 'Motorcycles' },
  { value: 'pickup', label: 'Pickup', group: 'Trucks' },
];

// Template
<hk-select
  [options]="options"
  [enableSearch]="true"
  placeholder="Select a vehicle"
/>`;

  groupedMultiCode = `// Grouped options work with multi-select too
<hk-select
  [options]="groupedOptions"
  [multiple]="true"
  [enableSearch]="true"
  placeholder="Select vehicles"
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

  // --- API docs: Component sub-tab ---
  inputDocs: ApiDocEntry[] = [
    {
      name: 'id',
      type: 'string',
      default: "''",
      description: 'Custom HTML id attribute for the select element. Auto-generated if not provided.',
    },
    {
      name: 'options',
      type: 'SelectOption[]',
      default: '[]',
      description:
        'Array of selectable options. Each option must have a value and label. Optionally include disabled, id, or group properties.',
    },
    {
      name: 'placeholder',
      type: 'string',
      default: "'Select an option'",
      description: 'Placeholder text shown in the trigger when no option is selected.',
    },
    {
      name: 'enableSearch',
      type: 'boolean',
      default: 'false',
      description: 'When true, displays a search input inside the dropdown that filters options using fuzzy matching (powered by Fuse.js).',
    },
    {
      name: 'searchPlaceholder',
      type: 'string',
      default: "'Search options...'",
      description: 'Placeholder text shown inside the search input when enableSearch is true.',
    },
    {
      name: 'allowClear',
      type: 'boolean',
      default: 'true',
      description: 'When true, shows a clear (x) button that resets the selection to null. Appears only when a value is selected.',
    },
    {
      name: 'virtualScroll',
      type: 'boolean',
      default: 'false',
      description:
        'Enables CDK virtual scrolling for efficiently rendering large option lists. Options are rendered on demand as the user scrolls. Activates when the list exceeds 100 items.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'When true, prevents all user interaction with the select. Also controlled via ControlValueAccessor setDisabledState.',
    },
    {
      name: 'multiple',
      type: 'boolean',
      default: 'false',
      description:
        'Enables multi-select mode. Users can select multiple options displayed as chips. The form value becomes a string[] instead of a string.',
    },
    {
      name: 'maxSelectedItems',
      type: 'number | null',
      default: 'null',
      description:
        'Maximum number of items that can be selected in multi-select mode. When the limit is reached, remaining unselected options become disabled. Set to null for unlimited.',
    },
    {
      name: 'showSelectAll',
      type: 'boolean',
      default: 'true',
      description: 'When true, shows a "Select All / Clear All" toggle at the top of the dropdown in multi-select mode.',
    },
    {
      name: 'chipDisplay',
      type: 'boolean',
      default: 'true',
      description:
        'When true, selected items appear as removable chip badges inside the trigger (multi-select mode). When false, selected items are shown as a comma-separated text list.',
    },
    {
      name: 'maxChipsVisible',
      type: 'number',
      default: '3',
      description: 'Maximum number of chip badges visible in the trigger. Additional selections are shown as a "+N" overflow counter.',
    },
    {
      name: 'selectAllLabel',
      type: 'string',
      default: "'Select All'",
      description: 'Custom label for the "Select All" action shown in the dropdown header when showSelectAll is true.',
    },
    {
      name: 'clearAllLabel',
      type: 'string',
      default: "'Clear All'",
      description:
        'Custom label for the "Clear All" action shown in the dropdown header when all options are selected and showSelectAll is true.',
    },
    {
      name: 'size',
      type: 'SelectSize',
      default: "'md'",
      description: 'Controls the size of the select trigger and menu items. Maps to daisyUI size classes: xs, sm, md, lg, or xl.',
    },
    {
      name: 'color',
      type: 'SelectColor | null',
      default: 'null',
      description:
        'Applies a daisyUI color variant to the select trigger border. Options: neutral, primary, secondary, accent, info, success, warning, or error.',
    },
  ];

  outputDocs: ApiDocEntry[] = [
    {
      name: 'selectionChange',
      type: 'SelectOption | SelectOption[] | null',
      description:
        'Emits the selected option(s) whenever the selection changes. Emits a single SelectOption in single-select mode, a SelectOption[] in multi-select mode, or null when the selection is cleared.',
    },
    {
      name: 'searchChange',
      type: 'string',
      description:
        'Emits the current search string each time the user types in the search input. Useful for implementing server-side filtering or analytics.',
    },
    {
      name: 'dropdownToggle',
      type: 'boolean',
      description: 'Emits true when the dropdown opens and false when it closes. Useful for coordinating UI state with other components.',
    },
  ];

  methodDocs: ApiDocEntry[] = [
    {
      name: 'toggleDropdown()',
      type: 'void',
      description: 'Opens the dropdown if closed, or closes it if open. No-op when the component is disabled. Emits dropdownToggle.',
    },
    {
      name: 'selectOption(option)',
      type: 'void',
      description:
        'Programmatically selects the given option. In single-select mode, closes the dropdown and emits the value. In multi-select mode, toggles the option on or off. No-op when disabled or when the option itself is disabled.',
    },
    {
      name: 'toggleOptionSelection(option)',
      type: 'void',
      description:
        'Toggles a single option on or off in multi-select mode. Adds the option if not selected, removes it if already selected. Respects maxSelectedItems limit.',
    },
    {
      name: 'selectAll()',
      type: 'void',
      description:
        'Selects all non-disabled options in multi-select mode. Respects maxSelectedItems limit by selecting only up to the maximum allowed count.',
    },
    {
      name: 'deselectAll()',
      type: 'void',
      description:
        'Clears all selections in multi-select mode. Emits selectionChange with null and updates the form value to an empty array.',
    },
    {
      name: 'toggleSelectAll()',
      type: 'void',
      description:
        'Convenience method that calls selectAll() when not all options are selected, or deselectAll() when all are already selected.',
    },
    {
      name: 'removeChip(option, event)',
      type: 'void',
      description:
        'Removes a specific option from the multi-select selection, typically triggered by clicking the x button on a chip badge. Stops event propagation to prevent toggling the dropdown.',
    },
    {
      name: 'clearSelection(event)',
      type: 'void',
      description:
        'Clears the entire selection. In single-select mode, sets the value to null. In multi-select mode, empties the array. Stops event propagation to prevent toggling the dropdown.',
    },
    {
      name: 'clearSearch(event)',
      type: 'void',
      description:
        'Resets the search input to an empty string, restoring the full unfiltered options list. Emits searchChange with an empty string.',
    },
    {
      name: 'onSearchInput(event)',
      type: 'void',
      description:
        'Handles search input events. Updates the internal search term, emits searchChange, and resets the keyboard highlight index. Called automatically from the template.',
    },
    {
      name: 'highlightMatch(text, searchTerm)',
      type: 'string',
      description:
        'Returns an HTML string with matching portions of text wrapped in <mark> tags for visual highlighting. Used internally to highlight search matches in the dropdown.',
    },
    {
      name: 'isSelected(option)',
      type: 'boolean',
      description: 'Returns true if the given option is currently selected. Works in both single-select and multi-select modes.',
    },
    {
      name: 'isOptionDisabled(option)',
      type: 'boolean',
      description:
        'Returns true if the option is disabled, either via its own disabled property or because maxSelectedItems has been reached and the option is not currently selected.',
    },
  ];

  // --- API docs: Configuration sub-tab ---
  configDisplayDocs: ApiDocEntry[] = [
    {
      name: 'placeholder',
      type: 'string',
      default: "'Select an option'",
      description: 'Placeholder text shown in the trigger when no option is selected.',
    },
    {
      name: 'size',
      type: 'SelectSize',
      default: "'md'",
      description: 'Controls the size of the select trigger and menu items. Maps to daisyUI size classes: xs, sm, md, lg, or xl.',
    },
    {
      name: 'color',
      type: 'SelectColor | null',
      default: 'null',
      description:
        'Applies a daisyUI color variant to the select trigger border. Options: neutral, primary, secondary, accent, info, success, warning, or error.',
    },
    {
      name: 'enableSearch',
      type: 'boolean',
      default: 'false',
      description: 'When true, displays a search input inside the dropdown that filters options using fuzzy matching (powered by Fuse.js).',
    },
    {
      name: 'searchPlaceholder',
      type: 'string',
      default: "'Search options...'",
      description: 'Placeholder text shown inside the search input when enableSearch is true.',
    },
  ];

  configBehaviorDocs: ApiDocEntry[] = [
    {
      name: 'allowClear',
      type: 'boolean',
      default: 'true',
      description: 'When true, shows a clear (x) button that resets the selection to null. Appears only when a value is selected.',
    },
    {
      name: 'virtualScroll',
      type: 'boolean',
      default: 'false',
      description:
        'Enables CDK virtual scrolling for efficiently rendering large option lists. Options are rendered on demand as the user scrolls. Activates when the list exceeds 100 items.',
    },
  ];

  configDataDocs: ApiDocEntry[] = [
    {
      name: 'options',
      type: 'SelectOption[]',
      default: '[]',
      description:
        'Array of selectable options. Each option must have a value and label. Optionally include disabled, id, or group properties. Options with a group property are rendered under group headers automatically.',
    },
  ];

  configFormDocs: ApiDocEntry[] = [
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'When true, prevents all user interaction with the select. Also controlled via ControlValueAccessor setDisabledState.',
    },
    {
      name: 'id',
      type: 'string',
      default: "''",
      description:
        'Custom HTML id attribute for the select element. Auto-generated if not provided. Useful for associating with external labels.',
    },
  ];

  // --- API docs: Multi-Select sub-tab ---
  multiSelectInputDocs: ApiDocEntry[] = [
    {
      name: 'multiple',
      type: 'boolean',
      default: 'false',
      description:
        'Enables multi-select mode. Users can select multiple options displayed as chips. The form value becomes a string[] instead of a string.',
    },
    {
      name: 'maxSelectedItems',
      type: 'number | null',
      default: 'null',
      description:
        'Maximum number of items that can be selected in multi-select mode. When the limit is reached, remaining unselected options become disabled. Set to null for unlimited.',
    },
    {
      name: 'showSelectAll',
      type: 'boolean',
      default: 'true',
      description: 'When true, shows a "Select All / Clear All" toggle link at the top of the dropdown in multi-select mode.',
    },
    {
      name: 'selectAllLabel',
      type: 'string',
      default: "'Select All'",
      description: 'Custom label for the "Select All" action shown in the dropdown header when showSelectAll is true.',
    },
    {
      name: 'clearAllLabel',
      type: 'string',
      default: "'Clear All'",
      description:
        'Custom label for the "Clear All" action shown in the dropdown header when all options are selected and showSelectAll is true.',
    },
    {
      name: 'chipDisplay',
      type: 'boolean',
      default: 'true',
      description:
        'When true, selected items appear as removable chip badges inside the trigger. When false, selected items are shown as a comma-separated text list.',
    },
    {
      name: 'maxChipsVisible',
      type: 'number',
      default: '3',
      description: 'Maximum number of chip badges visible in the trigger. Additional selections are shown as a "+N" overflow counter.',
    },
  ];

  multiSelectApiCode = `// TypeScript
formControl = new FormControl<string[] | null>(null);

options: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

// Template
<hk-select
  [formControl]="formControl"
  [options]="options"
  [multiple]="true"
  [enableSearch]="true"
  [maxSelectedItems]="3"
  [chipDisplay]="true"
  [maxChipsVisible]="2"
  [showSelectAll]="true"
  selectAllLabel="Check All"
  clearAllLabel="Uncheck All"
  placeholder="Pick up to 3 fruits"
  (selectionChange)="onMultiSelect($event)"
/>`;

  // --- API docs: Types sub-tab ---
  typeSelectOption = `interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly id?: string;
  readonly disabled?: boolean;
  readonly group?: string;
}`;

  typeSelectOptionGroup = `interface SelectOptionGroup {
  readonly label: string;
  readonly options: SelectOption[];
}`;

  typeSelectValue = `/** Value type that can be either single or multiple selection */
type SelectValue = string | string[] | SelectOption | SelectOption[] | null;`;

  typeSelectSize = `/** Available size variants matching daisyUI */
type SelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';`;

  typeSelectColor = `/** Available color variants matching daisyUI */
type SelectColor = 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';`;
}
