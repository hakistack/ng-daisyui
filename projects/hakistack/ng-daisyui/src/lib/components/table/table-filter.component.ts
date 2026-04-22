import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LucideX, LucideCheck } from '@lucide/angular';
import { SelectComponent, SelectOption } from '../select/select.component';
import { DatepickerComponent } from '../datepicker/datepicker.component';
import { ColumnDefinition, ColumnFilter, FilterConfig, FilterLabels, FilterOperator, FilterOperatorLabels } from './table.types';

export interface FilterApplyEvent {
  value: unknown;
  operator: FilterOperator;
}

type ResolvedFilterLabels = {
  title: (columnHeader: string) => string;
  closeAriaLabel: string;
  textPlaceholder: string;
  numberPlaceholder: string;
  selectPlaceholder: string;
  multiSelectPlaceholder: string;
  datePlaceholder: string;
  dateRangePlaceholder: string;
  rangeMinPlaceholder: string;
  rangeMaxPlaceholder: string;
  rangeSeparator: string;
  apply: string;
  clear: string;
  booleanTrue: string;
  booleanFalse: string;
  operators: Required<FilterOperatorLabels>;
};

const DEFAULT_OPERATOR_LABELS: Required<FilterOperatorLabels> = {
  equals: 'Equals',
  notEquals: 'Not Equals',
  contains: 'Contains',
  notContains: 'Does Not Contain',
  startsWith: 'Starts With',
  endsWith: 'Ends With',
  gt: 'Greater Than',
  lt: 'Less Than',
  gte: 'Greater or Equal',
  lte: 'Less or Equal',
  between: 'Between',
  in: 'In',
  notIn: 'Not In',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
};

const DATE_OPERATOR_OVERRIDES: Partial<Record<FilterOperator, string>> = {
  equals: 'On',
  gt: 'After',
  lt: 'Before',
  gte: 'On or After',
  lte: 'On or Before',
};

const DEFAULT_LABELS: ResolvedFilterLabels = {
  title: (header) => `Filter ${header}`,
  closeAriaLabel: 'Close filter',
  textPlaceholder: 'Enter value...',
  numberPlaceholder: 'Enter number...',
  selectPlaceholder: '-- Select --',
  multiSelectPlaceholder: 'Select values...',
  datePlaceholder: 'Select date',
  dateRangePlaceholder: 'Select date range',
  rangeMinPlaceholder: 'Min',
  rangeMaxPlaceholder: 'Max',
  rangeSeparator: 'to',
  apply: 'Apply',
  clear: 'Clear',
  booleanTrue: 'Yes',
  booleanFalse: 'No',
  operators: DEFAULT_OPERATOR_LABELS,
};

@Component({
  selector: 'hk-table-filter',
  imports: [FormsModule, LucideX, LucideCheck, SelectComponent, DatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">{{ resolvedLabels().title(column().header) }}</h3>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          (click)="onCancel()"
          [attr.aria-label]="resolvedLabels().closeAriaLabel"
        >
          <svg lucideX [size]="14"></svg>
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
              [placeholder]="filterConfig().placeholder ?? resolvedLabels().textPlaceholder"
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
              [placeholder]="filterConfig().placeholder ?? resolvedLabels().numberPlaceholder"
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
          [placeholder]="resolvedLabels().selectPlaceholder"
          size="sm"
          [allowClear]="true"
          [enableSearch]="selectOptionsSignal().length > 6"
        />
      }

      <!-- Boolean Filter -->
      @if (filterConfig().type === 'boolean') {
        <hk-select
          [options]="booleanOptionsSignal()"
          [ngModel]="booleanValueString()"
          (ngModelChange)="onBooleanChange($event)"
          [placeholder]="resolvedLabels().selectPlaceholder"
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
          [placeholder]="resolvedLabels().multiSelectPlaceholder"
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
            [placeholder]="resolvedLabels().datePlaceholder"
            [showClearButton]="true"
            [showTodayButton]="true"
          />
        </div>
      }

      <!-- Number Range Filter -->
      @if (filterConfig().type === 'numberRange') {
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input
              type="number"
              class="input input-sm flex-1"
              [(ngModel)]="rangeMin"
              [placeholder]="resolvedLabels().rangeMinPlaceholder"
            />
            <span class="self-center text-sm">{{ resolvedLabels().rangeSeparator }}</span>
            <input
              type="number"
              class="input input-sm flex-1"
              [(ngModel)]="rangeMax"
              [placeholder]="resolvedLabels().rangeMaxPlaceholder"
            />
          </div>
        </div>
      }

      <!-- Date Range Filter -->
      @if (filterConfig().type === 'dateRange') {
        <hk-datepicker
          [range]="true"
          [ngModel]="dateRangeAsObject()"
          (ngModelChange)="onDateRangeChange($event)"
          [placeholder]="resolvedLabels().dateRangePlaceholder"
          [showClearButton]="true"
        />
      }

      <!-- Action Buttons -->
      <div class="mt-1 flex gap-2">
        <button type="button" class="btn btn-primary btn-sm flex-1" (click)="onApply()">
          <svg lucideCheck [size]="14"></svg>
          {{ resolvedLabels().apply }}
        </button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="onClear()">{{ resolvedLabels().clear }}</button>
      </div>
    </div>
  `,
})
export class TableFilterComponent<T extends object> implements OnInit {
  column = input.required<ColumnDefinition<T>>();
  filterConfig = input.required<ColumnFilter<T>>();
  activeFilter = input<FilterConfig<T>>();
  /** Inherited filter labels (from `FieldConfig.filterLabels`). Per-column overrides via `ColumnFilter.labels` win. */
  labels = input<FilterLabels>({});

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

  readonly resolvedLabels = computed<ResolvedFilterLabels>(() => {
    const inherited: FilterLabels = this.labels() ?? {};
    const perColumn: FilterLabels = this.filterConfig().labels ?? {};
    const operators = { ...DEFAULT_OPERATOR_LABELS, ...(inherited.operators ?? {}), ...(perColumn.operators ?? {}) };
    return { ...DEFAULT_LABELS, ...inherited, ...perColumn, operators };
  });

  readonly booleanOptionsSignal = computed<SelectOption[]>(() => [
    { value: 'true', label: this.resolvedLabels().booleanTrue },
    { value: 'false', label: this.resolvedLabels().booleanFalse },
  ]);

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
    const labels = this.resolvedLabels().operators;
    const ops: FilterOperator[] = ['contains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'];
    return this.filterAllowedOperators(ops.map((value) => ({ value, label: labels[value] })));
  }

  getNumberOperators(): { value: FilterOperator; label: string }[] {
    const labels = this.resolvedLabels().operators;
    const ops: FilterOperator[] = ['equals', 'notEquals', 'gt', 'lt', 'gte', 'lte', 'isEmpty', 'isNotEmpty'];
    return this.filterAllowedOperators(ops.map((value) => ({ value, label: labels[value] })));
  }

  getDateOperators(): { value: FilterOperator; label: string }[] {
    const labels = this.resolvedLabels().operators;
    const ops: FilterOperator[] = ['equals', 'gt', 'lt', 'gte', 'lte'];
    // Override generic labels with date-specific variants (e.g. "On", "After") unless user customized operators.
    const userOperators = this.filterConfig().labels?.operators ?? this.labels()?.operators ?? {};
    return this.filterAllowedOperators(
      ops.map((value) => ({
        value,
        label: userOperators[value] ?? DATE_OPERATOR_OVERRIDES[value] ?? labels[value],
      })),
    );
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
