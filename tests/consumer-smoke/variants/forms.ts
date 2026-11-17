/**
 * Consumer smoke variant: hk-dynamic-form built with createForm() + field.* (text, email, select, date).
 * `npm run test:consumer:forms` swaps this file in for src/main.ts.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { createForm, DynamicFormComponent, field } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-root',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hk-dynamic-form [config]="form.config()" />
    <button class="btn btn-primary" (click)="form.submit()">Submit</button>
  `,
})
class AppComponent {
  readonly form = createForm({
    fields: [
      field.text('name', 'Name', { required: true, minLength: 2 }),
      field.email('email', 'Email'),
      field.select('role', 'Role', { choices: ['Admin', 'User'] }),
      field.date('start', 'Start date'),
    ],
    onSubmit: (data) => console.log(data),
  });
}

bootstrapApplication(AppComponent).catch((err: unknown) => console.error(err));
