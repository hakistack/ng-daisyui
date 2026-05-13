import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LucideCheck, LucideX } from '@lucide/angular';
import { DatepickerComponent } from '../datepicker/datepicker.component';
import { SelectComponent, SelectOption } from '../select/select.component';
import {
  ColumnDefinition,
  ColumnFilter,
  FilterConfig,
  FilterLabels,
  FilterOperator,
  FilterOperatorLabels,
  FilterType,
} from './table.types';

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

// ─── Filter-type strategy table ─────────────────────────────────────────
//
// Per-type behavior in one place: which operator is the default, whether
// the operator is forced (no picker), what operators appear in the picker,
// and type-specific operator label overrides (e.g. "On" instead of "Equals"
// for dates). Adding a new filter type means adding one entry here and one
// template branch — `onApply`, `onClear`, hydration, and operator-list
// methods stay untouched.

interface FilterStrategy {
  /** Default operator when no `defaultOperator` is set on the column. */
  readonly defaultOp: FilterOperator;
  /**
   * When set, this type has no operator picker — the operator is always
   * `forceOp` regardless of what's in `selectedOperator`. Used by select /
   * boolean / multiselect / range filters whose semantics are fixed by the
   * input widget itself.
   */
  readonly forceOp?: FilterOperator;
  /** Operators shown in the picker. Empty array hides the picker entirely. */
  readonly operators: readonly FilterOperator[];
  /** Type-specific operator label overrides (lower precedence than user labels). */
  readonly operatorOverrides?: Partial<Record<FilterOperator, string>>;
}

const STRATEGIES: Record<FilterType, FilterStrategy> = {
  text: {
    defaultOp: 'contains',
    operators: ['contains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  },
  number: {
    defaultOp: 'equals',
    operators: ['equals', 'notEquals', 'gt', 'lt', 'gte', 'lte', 'isEmpty', 'isNotEmpty'],
  },
  select: { defaultOp: 'equals', forceOp: 'equals', operators: [] },
  boolean: { defaultOp: 'equals', forceOp: 'equals', operators: [] },
  multiselect: { defaultOp: 'in', forceOp: 'in', operators: [] },
  date: {
    defaultOp: 'equals',
    operators: ['equals', 'gt', 'lt', 'gte', 'lte'],
    operatorOverrides: { equals: 'On', gt: 'After', lt: 'Before', gte: 'On or After', lte: 'On or Before' },
  },
  numberRange: { defaultOp: 'between', forceOp: 'between', operators: [] },
  dateRange: { defaultOp: 'between', forceOp: 'between', operators: [] },
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
          (click)="closeFilter.emit()"
          [attr.aria-label]="resolvedLabels().closeAriaLabel"
        >
          <svg lucideX [size]="14"></svg>
        </button>
      </div>

      <!-- Operator picker — hidden for types whose operator is forced (select / range / etc.) -->
      @if (operatorOptions().length > 0) {
        <hk-select
          [options]="operatorOptions()"
          [ngModel]="selectedOperator()"
          (ngModelChange)="selectedOperator.set($event)"
          [allowClear]="false"
          size="sm"
        />
      }

      <!-- Type-specific value editor -->
      @switch (filterConfig().type) {
        @case ('text') {
          @if (!isUnaryOperator()) {
            <input
              type="text"
              class="input input-sm"
              [ngModel]="textView()"
              (ngModelChange)="value.set($event)"
              [placeholder]="filterConfig().placeholder ?? resolvedLabels().textPlaceholder"
              (keydown.enter)="onApply()"
            />
          }
        }

        @case ('number') {
          @if (!isUnaryOperator()) {
            <input
              type="number"
              class="input input-sm"
              [ngModel]="numberView()"
              (ngModelChange)="value.set($event)"
              [placeholder]="filterConfig().placeholder ?? resolvedLabels().numberPlaceholder"
              (keydown.enter)="onApply()"
            />
          }
        }

        @case ('select') {
          <hk-select
            [options]="selectOptions()"
            [ngModel]="selectViewString()"
            (ngModelChange)="onSelectChange($event)"
            [placeholder]="resolvedLabels().selectPlaceholder"
            size="sm"
            [allowClear]="true"
            [enableSearch]="selectOptions().length > 6"
          />
        }

        @case ('boolean') {
          <hk-select
            [options]="booleanOptions()"
            [ngModel]="booleanViewString()"
            (ngModelChange)="onBooleanChange($event)"
            [placeholder]="resolvedLabels().selectPlaceholder"
            size="sm"
            [allowClear]="true"
          />
        }

        @case ('multiselect') {
          <hk-select
            [options]="selectOptions()"
            [multiple]="true"
            [ngModel]="multiSelectStrings()"
            (ngModelChange)="onMultiSelectChange($event)"
            [placeholder]="resolvedLabels().multiSelectPlaceholder"
            size="sm"
            [enableSearch]="selectOptions().length > 6"
            [showSelectAll]="true"
            [chipDisplay]="true"
            [maxChipsVisible]="2"
          />
        }

        @case ('date') {
          <hk-datepicker
            [ngModel]="dateView()"
            (ngModelChange)="value.set($event)"
            [placeholder]="resolvedLabels().datePlaceholder"
            [showClearButton]="true"
            [showTodayButton]="true"
          />
        }

        @case ('numberRange') {
          <div class="flex gap-2">
            <input
              type="number"
              class="input input-sm flex-1"
              [ngModel]="numberRangeMin()"
              (ngModelChange)="setNumberRangeMin($event)"
              [placeholder]="resolvedLabels().rangeMinPlaceholder"
              (keydown.enter)="onApply()"
            />
            <span class="self-center text-sm">{{ resolvedLabels().rangeSeparator }}</span>
            <input
              type="number"
              class="input input-sm flex-1"
              [ngModel]="numberRangeMax()"
              (ngModelChange)="setNumberRangeMax($event)"
              [placeholder]="resolvedLabels().rangeMaxPlaceholder"
              (keydown.enter)="onApply()"
            />
          </div>
        }

        @case ('dateRange') {
          <hk-datepicker
            [range]="true"
            [ngModel]="dateRangeView()"
            (ngModelChange)="onDateRangeChange($event)"
            [placeholder]="resolvedLabels().dateRangePlaceholder"
            [showClearButton]="true"
          />
        }
      }

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
export class TableFilterComponent<T extends object> {
  readonly column = input.required<ColumnDefinition<T>>();
  readonly filterConfig = input.required<ColumnFilter<T>>();
  readonly activeFilter = input<FilterConfig<T>>();
  /** Inherited filter labels (from `FieldConfig.filterLabels`). Per-column overrides via `ColumnFilter.labels` win. */
  readonly labels = input<FilterLabels>({});

  readonly apply = output<FilterApplyEvent>();
  /** User pressed Clear. Distinct from `apply` so the parent doesn't have to infer "value === null means remove". */
  readonly clear = output<void>();
  readonly closeFilter = output<void>();

  // ─── Form state ───────────────────────────────────────────────────────
  //
  // One value signal — the canonical form is whatever the current filter
  // type natively wants (string for text, number for number, Date for date,
  // { start, end } for dateRange, …). Wire-format coercion happens at the
  // apply / hydrate boundary, not inside template bindings.
  //
  // `linkedSignal` re-syncs when `activeFilter` or `filterConfig` change but
  // lets user input override the derived value until the next sync. This
  // replaces the one-shot `ngOnInit` hydration that used to ignore later
  // `activeFilter` changes.

  readonly value = linkedSignal<unknown>(() => this.hydrateValue(this.activeFilter(), this.filterConfig().type));

  readonly selectedOperator = linkedSignal<FilterOperator>(() => {
    const active = this.activeFilter();
    const config = this.filterConfig();
    const strategy = STRATEGIES[config.type];
    return active?.operator ?? config.defaultOperator ?? strategy.forceOp ?? strategy.defaultOp;
  });

  private hydrateValue(active: FilterConfig<T> | undefined, type: FilterType): unknown {
    if (!active || active.value == null) return null;
    if (type === 'date' && typeof active.value === 'string') {
      return parseLocalIsoDate(active.value);
    }
    if (type === 'dateRange' && Array.isArray(active.value) && active.value.length === 2) {
      const [s, e] = active.value as [unknown, unknown];
      const start = typeof s === 'string' && s ? parseLocalIsoDate(s) : null;
      const end = typeof e === 'string' && e ? parseLocalIsoDate(e) : null;
      return start || end ? { start, end } : null;
    }
    return active.value;
  }

  // ─── Resolved labels (defaults → field-level → column-level) ──────────

  readonly resolvedLabels = computed<ResolvedFilterLabels>(() => {
    const inherited: FilterLabels = this.labels() ?? {};
    const perColumn: FilterLabels = this.filterConfig().labels ?? {};
    const strategy = STRATEGIES[this.filterConfig().type];
    // Precedence: user labels > strategy overrides (e.g. date "On") > defaults.
    const operators = {
      ...DEFAULT_OPERATOR_LABELS,
      ...(strategy.operatorOverrides ?? {}),
      ...(inherited.operators ?? {}),
      ...(perColumn.operators ?? {}),
    };
    return { ...DEFAULT_LABELS, ...inherited, ...perColumn, operators };
  });

  // ─── Operator picker options (computed, memoized) ─────────────────────

  readonly operatorOptions = computed<SelectOption[]>(() => {
    const strategy = STRATEGIES[this.filterConfig().type];
    const labels = this.resolvedLabels().operators;
    const allowed = this.filterConfig().operators;
    const ops = allowed && allowed.length > 0 ? strategy.operators.filter((op) => allowed.includes(op)) : strategy.operators;
    return ops.map((op) => ({ value: op, label: labels[op] }));
  });

  /** True when the selected operator takes no value input (isEmpty / isNotEmpty). */
  readonly isUnaryOperator = computed(() => {
    const op = this.selectedOperator();
    return op === 'isEmpty' || op === 'isNotEmpty';
  });

  // ─── Template-binding views ───────────────────────────────────────────
  //
  // Memoized (not methods) so child CVA components don't get fresh refs per
  // CD tick and re-emit through `ngModelChange`, causing NG0103.

  readonly textView = computed<string>(() => {
    const v = this.value();
    return v == null ? '' : String(v);
  });

  readonly numberView = computed<number | null>(() => {
    const v = this.value();
    return typeof v === 'number' ? v : null;
  });

  readonly selectViewString = computed<string>(() => {
    const v = this.value();
    return v == null || v === '' ? '' : String(v);
  });

  readonly booleanViewString = computed<string>(() => {
    const v = this.value();
    if (v == null) return '';
    return v ? 'true' : 'false';
  });

  readonly multiSelectStrings = computed<string[]>(() => {
    const v = this.value();
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  });

  readonly dateView = computed<Date | null>(() => {
    const v = this.value();
    return v instanceof Date ? v : null;
  });

  readonly numberRangeMin = computed<number | null>(() => {
    const v = this.value() as readonly [number | null, number | null] | null;
    return v?.[0] ?? null;
  });

  readonly numberRangeMax = computed<number | null>(() => {
    const v = this.value() as readonly [number | null, number | null] | null;
    return v?.[1] ?? null;
  });

  /**
   * Date-range view. Emits `null` until *both* endpoints are set —
   * previously we substituted today's date for missing ends, which silently
   * created a half-open filter the user never asked for.
   */
  readonly dateRangeView = computed<{ start: Date; end: Date } | null>(() => {
    const v = this.value() as { start: Date | null; end: Date | null } | null;
    if (!v || !v.start || !v.end) return null;
    return { start: v.start, end: v.end };
  });

  readonly selectOptions = computed<SelectOption[]>(() => {
    const opts = this.filterConfig().options ?? [];
    return opts.map((o) => ({ value: String(o.value), label: o.label }));
  });

  readonly booleanOptions = computed<SelectOption[]>(() => [
    { value: 'true', label: this.resolvedLabels().booleanTrue },
    { value: 'false', label: this.resolvedLabels().booleanFalse },
  ]);

  // ─── Value setters (coerce hk-select string keys back to source types) ──

  onSelectChange(value: string | null): void {
    this.value.set(value ?? '');
  }

  onBooleanChange(value: string | null): void {
    if (!value) this.value.set(null);
    else this.value.set(value === 'true');
  }

  onMultiSelectChange(values: string[]): void {
    this.value.set(values ?? []);
  }

  onDateRangeChange(range: { start: Date; end: Date } | null): void {
    this.value.set(range);
  }

  setNumberRangeMin(n: number | null): void {
    const cur = this.value() as readonly [number | null, number | null] | null;
    this.value.set([n, cur?.[1] ?? null]);
  }

  setNumberRangeMax(n: number | null): void {
    const cur = this.value() as readonly [number | null, number | null] | null;
    this.value.set([cur?.[0] ?? null, n]);
  }

  // ─── Actions ──────────────────────────────────────────────────────────

  onApply(): void {
    const type = this.filterConfig().type;
    const strategy = STRATEGIES[type];
    const operator = strategy.forceOp ?? this.selectedOperator();
    const value = this.toWireValue(type, this.value());
    this.apply.emit({ value, operator });
    this.closeFilter.emit();
  }

  onClear(): void {
    this.value.set(null);
    const strategy = STRATEGIES[this.filterConfig().type];
    this.selectedOperator.set(this.filterConfig().defaultOperator ?? strategy.forceOp ?? strategy.defaultOp);
    this.clear.emit();
    this.closeFilter.emit();
  }

  /**
   * Convert the internal value into the wire format the parent expects.
   * The parent's `applyColumnFilter` treats `null` / `''` / arrays of empty
   * entries as "remove this filter" — so we don't suppress those here.
   */
  private toWireValue(type: FilterType, value: unknown): unknown {
    if (type === 'date' && value instanceof Date) {
      return formatLocalIsoDate(value);
    }
    if (type === 'dateRange' && value && typeof value === 'object' && 'start' in value) {
      const range = value as { start: Date | null; end: Date | null };
      return [range.start ? formatLocalIsoDate(range.start) : '', range.end ? formatLocalIsoDate(range.end) : ''];
    }
    if (type === 'select' && value === '') return null;
    return value;
  }
}

// ─── Date helpers (local-time, no UTC round-trip) ────────────────────────
//
// `toISOString().split('T')[0]` is the classic timezone trap: a date picked
// at 23:00 local in UTC-5 becomes the *next* day in ISO. We format and
// parse the wire string (YYYY-MM-DD) using local-time getters / constructor
// so what the user sees on the picker is what lands in the filter.

function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalIsoDate(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}
