import { Directive, inject, input, TemplateRef } from '@angular/core';

import type { DataGridCellContext } from './datagrid.types';

/**
 * Custom cell content for one column of `<hk-datagrid>`.
 *
 * @example
 * <hk-datagrid [controller]="grid">
 *   <ng-template hkDataGridCell="status" let-value let-row="row">
 *     <span class="badge badge-sm">{{ value }}</span>
 *   </ng-template>
 * </hk-datagrid>
 */
@Directive({
  selector: 'ng-template[hkDataGridCell]',
})
export class HkDataGridCellDirective<T = unknown> {
  /** Column `field` this template renders. */
  readonly field = input.required<string>({ alias: 'hkDataGridCell' });
  readonly template = inject<TemplateRef<DataGridCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: HkDataGridCellDirective<T>, ctx: unknown): ctx is DataGridCellContext<T> {
    return true;
  }
}
