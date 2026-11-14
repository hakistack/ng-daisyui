import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DynamicFormComponent, FieldWidth, FormController, createForm, field } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { FORMS_PLAYGROUND, FORMS_ROLE_CHOICES, FormsPgState } from '../specs/forms';
import type { PlaygroundState } from '../playground.types';

type Log = (name: string, payload: unknown) => void;

@Component({
  selector: 'app-forms-playground',
  imports: [PlaygroundComponent, DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let form = formFor(raw, log);
        <hk-dynamic-form [config]="form.config()" [disabled]="raw.disabled === true" />
        <div class="mt-4 flex gap-2">
          <button type="button" class="btn btn-primary btn-sm" (click)="form.submit()">Submit</button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="form.reset()">Reset</button>
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class FormsPlaygroundComponent {
  protected readonly spec = FORMS_PLAYGROUND;
  private cached: { key: string; form: FormController } | null = null;

  /**
   * Builds the form with the real `createForm()` from the playground state.
   * Memoized per state so change detection reuses the same controller.
   */
  protected formFor(raw: PlaygroundState, log: Log): FormController {
    const key = JSON.stringify(raw);
    if (this.cached?.key === key) return this.cached.form;
    const s = raw as FormsPgState;
    const nameLayout = { width: s['fields.width'] as FieldWidth, colSpan: s['fields.colSpan'] };
    const form = createForm({
      title: s.title || undefined,
      layout: s.layout as 'vertical' | 'horizontal' | 'grid',
      gap: s.gap as 'sm' | 'md' | 'lg',
      gridColumns: s.gridColumns,
      labelWidth: s.labelWidth as 'sm' | 'md' | 'lg' | 'xl',
      fields: [
        field.text('firstName', 'First name', { required: true, ...nameLayout }),
        field.text('lastName', 'Last name', nameLayout),
        field.email('email', 'Email', { required: true }),
        field.select('role', 'Role', { choices: FORMS_ROLE_CHOICES }),
      ],
      onSubmit: (data) => log('onSubmit', { values: data.values, valid: data.valid, errors: data.errors }),
      onReset: () => log('onReset', null),
    });
    this.cached = { key, form };
    return form;
  }
}
