/**
 * Consumer smoke app: imports a handful of BASIC components from the package root,
 * exactly like a typical consumer. It must build without any optional peer
 * (no tiptap-only usage, no docx-preview, dompurify, postal-mime, ...).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { InputComponent, SelectComponent, ToastComponent, ToastService, provideDynamicFormLabels } from '@hakistack/ng-daisyui';
// Type-only public API checks: these must stay importable from the package root.
import type { DataGridState, FormController, HkTableApi, TableConfig } from '@hakistack/ng-daisyui';

type _PublicTypes = [DataGridState, FormController, HkTableApi<{ id: number }>, TableConfig<{ id: number }>];

@Component({
  selector: 'app-root',
  imports: [InputComponent, SelectComponent, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="p-4">
      <hk-input placeholder="Name" ariaLabel="Name" size="sm" color="primary" />
      <hk-select [options]="options" />
      <button class="btn btn-primary" (click)="toast.success('Saved')">Save</button>
      <hk-toast />
    </main>
  `,
})
class AppComponent {
  readonly toast = inject(ToastService);
  readonly options = [
    { label: 'One', value: '1' },
    { label: 'Two', value: '2' },
  ];
}

bootstrapApplication(AppComponent, {
  // provideDynamicFormLabels is a VALUE export (regression: it used to be exported as a type only).
  providers: [provideDynamicFormLabels({ nextButton: 'Next' })],
}).catch((err: unknown) => console.error(err));
