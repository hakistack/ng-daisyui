import { ChangeDetectionStrategy, Component, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { ColumnDefinition, ColumnFilter, FilterConfig, FilterOperator } from './table.types';

export interface FilterApplyEvent {
  value: unknown;
  operator: FilterOperator;
}

@Component({
  selector: 'app-table-filter',
  imports: [FormsModule, LucideIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Filter {{ column().header }}</h3>
        <button type="button" class="btn btn-ghost btn-xs btn-circle" (click)="onCancel()" aria-label="Close filter">
          <app-lucide-icon name="X" [size]="14"></app-lucide-icon>
        </button>
      </div>

      <!-- Text Filter -->
      @if (filterConfig().type === 'text') {
        <div class="flex flex-col gap-2">
          <select class="select select-bordered select-sm" [(ngModel)]="selectedOperator">
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="notEquals">Not Equals</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
            <option value="isEmpty">Is Empty</option>
            <option value="isNotEmpty">Is Not Empty</option>
          </select>

          @if (selectedOperator() !== 'isEmpty' && selectedOperator() !== 'isNotEmpty') {
            <input
              type="text"
              class="input input-bordered input-sm"
              [(ngModel)]="textValue"
              [placeholder]="filterConfig().placeholder ?? 'Enter value...'"
              (keydown.enter)="onApply()"
            />
          }
        </div>
      }

      <!-- Number Filter -->
      @if (filterConfig().type === 'number') {
        <div class="flex flex-col gap-2">
          <select class="select select-bordered select-sm" [(ngModel)]="selectedOperator">
            <option value="equals">Equals</option>
            <option value="notEquals">Not Equals</option>
            <option value="gt">Greater Than</option>
            <option value="lt">Less Than</option>
            <option value="gte">Greater or Equal</option>
            <option value="lte">Less or Equal</option>
            <option value="isEmpty">Is Empty</option>
            <option value="isNotEmpty">Is Not Empty</option>
          </select>

          @if (selectedOperator() !== 'isEmpty' && selectedOperator() !== 'isNotEmpty') {
            <input
              type="number"
              class="input input-bordered input-sm"
              [(ngModel)]="numberValue"
              [placeholder]="filterConfig().placeholder ?? 'Enter number...'"
              (keydown.enter)="onApply()"
            />
          }
        </div>
      }

      <!-- Select Filter -->
      @if (filterConfig().type === 'select') {
        <div class="flex flex-col gap-2">
          <select class="select select-bordered select-sm" [(ngModel)]="selectValue">
            <option value="">-- Select --</option>
            @for (option of filterConfig().options ?? []; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
      }

      <!-- Boolean Filter -->
      @if (filterConfig().type === 'boolean') {
        <div class="flex flex-col gap-2">
          <select class="select select-bordered select-sm" [ngModel]="booleanValueString()" (ngModelChange)="onBooleanChange($event)">
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      }

      <!-- Multi-Select Filter -->
      @if (filterConfig().type === 'multiselect') {
        <div class="flex max-h-48 flex-col gap-2 overflow-y-auto">
          @for (option of filterConfig().options ?? []; track option.value) {
            <label class="label cursor-pointer justify-start gap-2 py-1">
              <input type="checkbox" class="checkbox checkbox-sm" [checked]="isOptionSelected(option.value)" (change)="toggleMultiSelectOption(option.value)" />
              <span class="label-text">{{ option.label }}</span>
            </label>
          }
        </div>
      }

      <!-- Date Filter -->
      @if (filterConfig().type === 'date') {
        <div class="flex flex-col gap-2">
          <select class="select select-bordered select-sm" [(ngModel)]="selectedOperator">
            <option value="equals">On</option>
            <option value="gt">After</option>
            <option value="lt">Before</option>
            <option value="gte">On or After</option>
            <option value="lte">On or Before</option>
          </select>

          <input type="date" class="input input-bordered input-sm" [(ngModel)]="dateValue" />
        </div>
      }

      <!-- Number Range Filter -->
      @if (filterConfig().type === 'numberRange') {
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input type="number" class="input input-bordered input-sm flex-1" [(ngModel)]="rangeMin" placeholder="Min" />
            <span class="self-center text-sm">to</span>
            <input type="number" class="input input-bordered input-sm flex-1" [(ngModel)]="rangeMax" placeholder="Max" />
          </div>
        </div>
      }

      <!-- Date Range Filter -->
      @if (filterConfig().type === 'dateRange') {
        <div class="flex flex-col gap-2">
          <input type="date" class="input input-bordered input-sm" [(ngModel)]="dateRangeStart" placeholder="From" />
          <input type="date" class="input input-bordered input-sm" [(ngModel)]="dateRangeEnd" placeholder="To" />
        </div>
      }

      <!-- Action Buttons -->
      <div class="mt-1 flex gap-2">
        <button type="button" class="btn btn-primary btn-sm flex-1" (click)="onApply()">
          <app-lucide-icon name="Check" [size]="14"></app-lucide-icon>
          Apply
        </button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="onClear()">
          Clear
        </button>
      </div>
    </div>
  `,
})
export class TableFilterComponent<T extends object> implements OnInit {
  column = input.required<ColumnDefinition<T>>();
  filterConfig = input.required<ColumnFilter<T>>();
  activeFilter = input<FilterConfig<T>>();

  readonly apply = output<FilterApplyEvent>();
  readonly closeFilter = output<void>();

  textValue = signal<string>('');
  numberValue = signal<number | null>(null);
  selectValue = signal<unknown>(null);
  booleanValue = signal<boolean | null>(null);
  multiSelectValue = signal<unknown[]>([]);
  dateValue = signal<string>('');
  rangeMin = signal<number | null>(null);
  rangeMax = signal<number | null>(null);
  dateRangeStart = signal<string>('');
  dateRangeEnd = signal<string>('');

  selectedOperator = signal<FilterOperator>('contains');

  booleanValueString(): string {
    const val = this.booleanValue();
    if (val === null) return '';
    return val ? 'true' : 'false';
  }

  onBooleanChange(value: string): void {
    if (value === '') {
      this.booleanValue.set(null);
    } else {
      this.booleanValue.set(value === 'true');
    }
  }

  ngOnInit(): void {
    const config = this.filterConfig();
    const active = this.activeFilter();

    const defaultOp = config.defaultOperator ?? this.getDefaultOperator();
    this.selectedOperator.set(defaultOp);

    if (active) {
      this.selectedOperator.set(active.operator);

      switch (config.type) {
        case 'text':
          this.textValue.set(String(active.value ?? ''));
          break;
        case 'number':
          this.numberValue.set(active.value as number);
          break;
        case 'select':
          this.selectValue.set(active.value);
          break;
        case 'boolean':
          this.booleanValue.set(active.value as boolean);
          break;
        case 'multiselect':
          this.multiSelectValue.set(Array.isArray(active.value) ? active.value : []);
          break;
        case 'date':
          this.dateValue.set(String(active.value ?? ''));
          break;
        case 'numberRange':
          if (Array.isArray(active.value) && active.value.length === 2) {
            this.rangeMin.set(active.value[0] as number);
            this.rangeMax.set(active.value[1] as number);
          }
          break;
        case 'dateRange':
          if (Array.isArray(active.value) && active.value.length === 2) {
            this.dateRangeStart.set(String(active.value[0]));
            this.dateRangeEnd.set(String(active.value[1]));
          }
          break;
      }
    }
  }

  isOptionSelected(value: unknown): boolean {
    return this.multiSelectValue().includes(value);
  }

  toggleMultiSelectOption(value: unknown): void {
    const current = this.multiSelectValue();
    const index = current.indexOf(value);

    if (index > -1) {
      this.multiSelectValue.set(current.filter(v => v !== value));
    } else {
      this.multiSelectValue.set([...current, value]);
    }
  }

  onApply(): void {
    const type = this.filterConfig().type;
    let value: unknown;
    let operator = this.selectedOperator();

    switch (type) {
      case 'text':
        value = this.textValue();
        break;
      case 'number':
        value = this.numberValue();
        break;
      case 'select':
        value = this.selectValue() === '' ? null : this.selectValue();
        operator = 'equals';
        break;
      case 'boolean':
        value = this.booleanValue();
        operator = 'equals';
        break;
      case 'multiselect':
        value = this.multiSelectValue();
        operator = 'in';
        break;
      case 'date':
        value = this.dateValue();
        break;
      case 'numberRange':
        value = [this.rangeMin(), this.rangeMax()];
        operator = 'between';
        break;
      case 'dateRange':
        value = [this.dateRangeStart(), this.dateRangeEnd()];
        operator = 'between';
        break;
      default:
        value = null;
    }

    this.apply.emit({ value, operator });
    this.closeDropdown();
  }

  onClear(): void {
    this.textValue.set('');
    this.numberValue.set(null);
    this.selectValue.set('');
    this.booleanValue.set(null);
    this.multiSelectValue.set([]);
    this.dateValue.set('');
    this.rangeMin.set(null);
    this.rangeMax.set(null);
    this.dateRangeStart.set('');
    this.dateRangeEnd.set('');
    this.selectedOperator.set(this.getDefaultOperator());

    this.apply.emit({ value: null, operator: this.selectedOperator() });
    this.closeDropdown();
  }

  onCancel(): void {
    this.closeFilter.emit();
    this.closeDropdown();
  }

  private closeDropdown(): void {
    this.closeFilter.emit();
  }

  private getDefaultOperator(): FilterOperator {
    switch (this.filterConfig().type) {
      case 'text':
        return 'contains';
      case 'number':
      case 'date':
      case 'select':
      case 'boolean':
        return 'equals';
      case 'multiselect':
        return 'in';
      case 'numberRange':
      case 'dateRange':
        return 'between';
      default:
        return 'equals';
    }
  }
}
