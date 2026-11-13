import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { LucideArrowDown, LucideArrowUp, LucideCheck, LucideEyeOff, LucideX } from '@lucide/angular';

import type { FilterOperator } from '../../grid-core/grid.types';
import type { ResolvedDataGridLabels } from './datagrid.labels';
import { DATAGRID_OPERATORS } from './datagrid.state';
import type { DataGridController, DataGridFilter, ResolvedDataGridColumn } from './datagrid.types';

type ValueInput = 'none' | 'single' | 'pair' | 'list' | 'boolean';

/**
 * Per-column options panel for `<hk-datagrid>` (sort, filter, hide, column chooser).
 * Rendered by the grid inside a CDK connected overlay; everything it changes goes
 * through the controller, so the panel holds only the unsaved filter draft.
 *
 * @internal Not exported from the public API.
 */
@Component({
  selector: 'hk-datagrid-column-menu',
  imports: [A11yModule, LucideArrowUp, LucideArrowDown, LucideX, LucideCheck, LucideEyeOff],
  templateUrl: './datagrid-column-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridColumnMenuComponent<T> {
  readonly column = input.required<ResolvedDataGridColumn<T>>();
  readonly controller = input.required<DataGridController<T>>();
  readonly labels = input.required<ResolvedDataGridLabels>();
  /** Emitted when the panel should close; `true` when focus should return to the grid. */
  readonly closed = output<boolean>();

  private static nextId = 0;
  readonly id = `hk-dg-menu-${DataGridColumnMenuComponent.nextId++}`;

  readonly sortDirection = computed(
    () =>
      this.controller()
        .state()
        .sort.find((s) => s.field === this.column().field)?.direction ?? null,
  );
  readonly currentFilter = computed<DataGridFilter | undefined>(() =>
    this.controller()
      .state()
      .filters.find((f) => f.field === this.column().field),
  );
  readonly operators = computed(() => DATAGRID_OPERATORS[this.column().type]);
  readonly inputType = computed(() => (this.column().type === 'number' ? 'number' : this.column().type === 'date' ? 'date' : 'text'));
  /** All columns in display order, for the column chooser. */
  readonly allColumns = computed(() => {
    const byField = new Map(this.controller().columns.map((c) => [c.field, c]));
    return this.controller()
      .state()
      .columns.map((c) => ({ field: c.field, visible: c.visible, header: byField.get(c.field)?.header ?? c.field }));
  });
  readonly visibleCount = computed(() => this.allColumns().filter((c) => c.visible).length);

  // Draft filter: starts from the active filter on this column, resets if it changes elsewhere.
  readonly operator = linkedSignal<FilterOperator>(() => this.currentFilter()?.operator ?? this.operators()[0]);
  readonly value1 = linkedSignal(() => draftValues(this.currentFilter())[0]);
  readonly value2 = linkedSignal(() => draftValues(this.currentFilter())[1]);
  readonly error = signal<string | null>(null);

  readonly valueInput = computed<ValueInput>(() => {
    const op = this.operator();
    if (op === 'isEmpty' || op === 'isNotEmpty') return 'none';
    if (op === 'between') return 'pair';
    if (op === 'in' || op === 'notIn') return 'list';
    return this.column().type === 'boolean' ? 'boolean' : 'single';
  });

  sort(direction: 'asc' | 'desc' | null): void {
    const field = this.column().field;
    const others = this.controller()
      .state()
      .sort.filter((s) => s.field !== field);
    // Menu sorting keeps the other sort keys and makes this column the primary one.
    this.controller().setState({ sort: direction ? [{ field, direction }, ...others] : others });
    this.closed.emit(true);
  }

  onOperatorChange(value: string): void {
    this.operator.set(value as FilterOperator);
    this.error.set(null);
  }

  applyFilter(event: Event): void {
    event.preventDefault();
    const operator = this.operator();
    const kind = this.valueInput();
    const v1 = this.value1().trim();
    const v2 = this.value2().trim();

    let value: unknown;
    if (kind === 'pair') {
      if (!v1 && !v2) return this.error.set(this.labels().valueRequired);
      value = [v1 || null, v2 || null];
    } else if (kind === 'list') {
      value = v1
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if ((value as string[]).length === 0) return this.error.set(this.labels().valueRequired);
    } else if (kind !== 'none') {
      if (!v1) return this.error.set(this.labels().valueRequired);
      value = v1;
    }

    const issues = this.controller().setFilter(this.column().field, kind === 'none' ? { operator } : { operator, value });
    if (issues.length) {
      this.error.set(issues[0].message);
      return;
    }
    this.error.set(null);
    this.closed.emit(true);
  }

  clearFilter(): void {
    this.controller().setFilter(this.column().field, null);
    this.error.set(null);
    this.closed.emit(true);
  }

  hide(): void {
    this.controller().setColumnVisible(this.column().field, false);
    this.closed.emit(true);
  }

  toggleColumn(field: string, visible: boolean): void {
    this.controller().setColumnVisible(field, visible);
  }

  operatorLabel(op: FilterOperator): string {
    return this.labels().operators[op];
  }
}

/** Text-box contents for an existing filter value. */
function draftValues(filter: DataGridFilter | undefined): [string, string] {
  const value = filter?.value;
  if (value == null) return ['', ''];
  if (Array.isArray(value)) {
    if (filter!.operator === 'between') return [value[0] == null ? '' : String(value[0]), value[1] == null ? '' : String(value[1])];
    return [value.join(', '), ''];
  }
  return [String(value), ''];
}
