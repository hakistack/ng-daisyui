import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Directive to define a custom footer row rendered inside `<tfoot>`.
 * The component auto-wraps your content in `<tr><td colspan="ALL">...</td></tr>`,
 * so you just provide the inner content with full CSS layout freedom.
 *
 * @example
 * ```html
 * <hk-table [config]="tableConfig" [data]="data">
 *   <ng-template hkFooter let-data let-columns="columns">
 *     <div class="flex justify-end gap-4">
 *       <span>Total: {{ calcTotal(data) }}</span>
 *       <span>Average: {{ calcAvg(data) }}</span>
 *     </div>
 *   </ng-template>
 * </hk-table>
 * ```
 */
@Directive({
  selector: 'ng-template[hkFooter]',
})
export class HkFooterDirective {
  /** Optional identifier for this footer row (useful when projecting multiple) */
  readonly hkFooter = input<string>('');
  readonly templateRef = inject(TemplateRef);
}
