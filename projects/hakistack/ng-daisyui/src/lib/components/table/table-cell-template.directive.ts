import { Directive, input, TemplateRef, inject } from '@angular/core';

/**
 * Directive to define a custom cell template for a specific column.
 *
 * @example
 * ```html
 * <hk-table [config]="tableConfig" [data]="data">
 *   <ng-template hkCellTemplate="email" let-row let-column="column">
 *     <a [href]="'mailto:' + row.email" class="link link-primary">{{ row.email }}</a>
 *   </ng-template>
 *
 *   <ng-template hkCellTemplate="status" let-row>
 *     <span class="badge" [class.badge-success]="row.status === 'active'">{{ row.status }}</span>
 *   </ng-template>
 * </hk-table>
 * ```
 */
@Directive({
  selector: 'ng-template[hkCellTemplate]',
})
export class HkCellTemplateDirective {
  /** The column field name this template applies to */
  readonly hkCellTemplate = input.required<string>();
  readonly templateRef = inject(TemplateRef);
}
