import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { SelectComponent, SelectOption } from '../select/select.component';
import { DatepickerComponent } from '../datepicker/datepicker.component';
import { ColumnDefinition, ColumnFilter, FilterConfig, FilterOperator } from './table.types';

export interface FilterApplyEvent {
  value: unknown;
  operator: FilterOperator;
}

@Component({
  selector: 'hk-table-filter',
  imports: [FormsModule, LucideIconComponent, SelectComponent, DatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Filter {{ column().header }}</h3>
        <button type="button" class="btn btn-ghost btn-xs btn-circle" (click)="onCancel()" aria-label="Close filter">
          <hk-lucide-icon name="X" [size]="14"></hk-lucide-icon>
        </button>
      </div>

      <!-- Text Filter -->
      @if (filterConfig().type === 'text') {
        <div class="flex flex-col gap-2">
          <select class="select select-sm" [(ngModel)]="selectedOperator">
            @for (op of getTextOperators(); track op.value) {
              <option [value]="op.value">{{ op.label }}</option>
            }
          </select>

          @if (selectedOperator() !== 'isEmpty' && selectedOperator() !== 'isNotEmpty') {
            <input
              type="text"
              class="input input-sm"
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
          <select class="select select-sm" [(ngModel)]="selectedOperator">
            @for (op of getNumberOperators(); track op.value) {
              <option [value]="op.value">{{ op.label }}</option>
            }
          </select>

          @if (selectedOperator() !== 'isEmpty' && selectedOperator() !== 'isNotEmpty') {
            <input
              type="number"
              class="input input-sm"
              [(ngModel)]="numberValue"
              [placeholder]="filterConfig().placeholder ?? 'Enter number...'"
              (keydown.enter)="onApply()"
            />
          }
        </div>
      }

      <!-- Select Filter -->
      @if (filterConfig().type === 'select') {
        <hk-select
          [options]="selectOptionsSignal()"
          [ngModel]="selectValueString()"
          (ngModelChange)="onSelectChange($event)"
          placeholder="-- Select --"
          size="sm"
          [allowClear]="true"
          [enableSearch]="selectOptionsSignal().length > 6"
        />
      }

      <!-- Boolean Filter -->
      @if (filterConfig().type === 'boolean') {
        <hk-select
          [options]="booleanOptions"
          [ngModel]="booleanValueString()"
          (ngModelChange)="onBooleanChange($event)"
          placeholder="-- Select --"
          size="sm"
          [allowClear]="true"
        />
      }

      <!-- Multi-Select Filter -->
      @if (filterConfig().type === 'multiselect') {
        <hk-select
          [options]="selectOptionsSignal()"
          [multiple]="true"
          [ngModel]="multiSelectStrings()"
          (ngModelChange)="onMultiSelectChange($event)"
          placeholder="Select values..."
          size="sm"
          [enableSearch]="selectOptionsSignal().length > 6"
          [showSelectAll]="true"
          [chipDisplay]="true"
          [maxChipsVisible]="2"
        />
      }

      <!-- Date Filter -->
      @if (filterConfig().type === 'date') {
        <div class="flex flex-col gap-2">
          <select class="select select-sm" [(ngModel)]="selectedOperator">
            @for (op of getDateOperators(); track op.value) {
              <option [value]="op.value">{{ op.label }}</option>
            }
          </select>

          <hk-datepicker
            [ngModel]="dateValueAsDate()"
            (ngModelChange)="onDateChange($event)"
            placeholder="Select date"
            [showClearButton]="true"
            [showTodayButton]="true"
          />
        </div>
      }

      <!-- Number Range Filter -->
      @if (filterConfig().type === 'numberRange') {
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input type="number" class="input input-sm flex-1" [(ngModel)]="rangeMin" placeholder="Min" />
            <span class="self-center text-sm">to</span>
            <input type="number" class="input input-sm flex-1" [(ngModel)]="rangeMax" placeholder="Max" />
          </div>
        </div>
      }

      <!-- Date Range Filter -->
      @if (filterConfig().type === 'dateRange') {
        <hk-datepicker
          [range]="true"
          [ngModel]="dateRangeAsObject()"
          (ngModelChange)="onDateRangeChange($event)"
          placeholder="Select date range"
          [showClearButton]="true"
        />
      }

      <!-- Action Buttons -->
      <div class="mt-1 flex gap-2">
        <button type="button" class="btn btn-primary btn-sm flex-1" (click)="onApply()">
          <hk-lucide-icon name="Check" [size]="14"></hk-lucide-icon>
          Apply
        </button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="onClear()">Clear</button>
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

  readonly booleanOptions: SelectOption[] = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  /** Convert filter config options to SelectOption[] for hk-select */
  readonly selectOptionsSignal = computed<SelectOption[]>(() => {
    const opts = this.filterConfig().options ?? [];
    return opts.map((o) => ({ value: String(o.value), label: o.label }));
  });

  /** String representation of the current select value for hk-select */
  selectValueString(): string {
    const val = this.selectValue();
    return val == null || val === '' ? '' : String(val);
  }

  booleanValueString(): string {
    const val = this.booleanValue();
    if (val === null) return '';
    return val ? 'true' : 'false';
  }

  /** String[] of multiselect values for hk-select multiple */
  multiSelectStrings(): string[] {
    return this.multiSelectValue().map((v) => String(v));
  }

  /** Convert date string to Date for hk-datepicker */
  dateValueAsDate(): Date | null {
    const v = this.dateValue();
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Convert dateRange strings to object for hk-datepicker range */
  dateRangeAsObject(): { start: Date; end: Date } | null {
    const s = this.dateRangeStart();
    const e = this.dateRangeEnd();
    if (!s && !e) return null;
    const start = s ? new Date(s) : new Date();
    const end = e ? new Date(e) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    return { start, end };
  }

  /** Handle hk-select single selection change */
  onSelectChange(value: string | null): void {
    this.selectValue.set(value ?? '');
  }

  onBooleanChange(value: string | null): void {
    if (!value || value === '') {
      this.booleanValue.set(null);
    } else {
      this.booleanValue.set(value === 'true');
    }
  }

  /** Handle hk-select multi-selection change */
  onMultiSelectChange(values: string[]): void {
    this.multiSelectValue.set(values ?? []);
  }

  /** Handle hk-datepicker single date change */
  onDateChange(date: Date | null): void {
    if (date) {
      this.dateValue.set(date.toISOString().split('T')[0]);
    } else {
      this.dateValue.set('');
    }
  }

  /** Handle hk-datepicker range change */
  onDateRangeChange(range: { start: Date; end: Date } | null): void {
    if (range) {
      this.dateRangeStart.set(range.start.toISOString().split('T')[0]);
      this.dateRangeEnd.set(range.end.toISOString().split('T')[0]);
    } else {
      this.dateRangeStart.set('');
      this.dateRangeEnd.set('');
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

  getTextOperators(): { value: FilterOperator; label: string }[] {
    const all: { value: FilterOperator; label: string }[] = [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'notEquals', label: 'Not Equals' },
      { value: 'startsWith', label: 'Starts With' },
      { value: 'endsWith', label: 'Ends With' },
      { value: 'isEmpty', label: 'Is Empty' },
      { value: 'isNotEmpty', label: 'Is Not Empty' },
    ];
    return this.filterAllowedOperators(all);
  }

  getNumberOperators(): { value: FilterOperator; label: string }[] {
    const all: { value: FilterOperator; label: string }[] = [
      { value: 'equals', label: 'Equals' },
      { value: 'notEquals', label: 'Not Equals' },
      { value: 'gt', label: 'Greater Than' },
      { value: 'lt', label: 'Less Than' },
      { value: 'gte', label: 'Greater or Equal' },
      { value: 'lte', label: 'Less or Equal' },
      { value: 'isEmpty', label: 'Is Empty' },
      { value: 'isNotEmpty', label: 'Is Not Empty' },
    ];
    return this.filterAllowedOperators(all);
  }

  getDateOperators(): { value: FilterOperator; label: string }[] {
    const all: { value: FilterOperator; label: string }[] = [
      { value: 'equals', label: 'On' },
      { value: 'gt', label: 'After' },
      { value: 'lt', label: 'Before' },
      { value: 'gte', label: 'On or After' },
      { value: 'lte', label: 'On or Before' },
    ];
    return this.filterAllowedOperators(all);
  }

  private filterAllowedOperators(operators: { value: FilterOperator; label: string }[]): { value: FilterOperator; label: string }[] {
    const allowed = this.filterConfig().operators;
    if (!allowed || allowed.length === 0) {
      return operators;
    }
    return operators.filter((op) => allowed.includes(op.value));
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
