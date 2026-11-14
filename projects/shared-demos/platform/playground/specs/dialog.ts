import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Dialog (service) ──────────────────────────────────────────────────────
// Keys are the options of `DialogService.open(component, options)`: `data`
// (handed to the component as DIALOG_DATA) plus the Angular CDK DialogConfig
// fields the service forwards.
export interface DialogPgState {
  [k: string]: string | number | boolean;
  data: string;
  width: string;
  maxWidth: string;
  disableClose: boolean;
  hasBackdrop: boolean;
  role: string;
  autoFocus: string;
  restoreFocus: boolean;
}
const DIALOG_DEFAULTS: DialogPgState = {
  data: 'Your trial ends in 3 days.',
  // DialogService.open() defaults: width '95vw', maxWidth '32rem'. The rest are CDK defaults.
  width: '95vw',
  maxWidth: '32rem',
  disableClose: false,
  hasBackdrop: true,
  role: 'dialog',
  autoFocus: 'first-tabbable',
  restoreFocus: true,
};

const str = (v: string): string => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function dialogCode(s: DialogPgState): string {
  const d = DIALOG_DEFAULTS;
  const opts: string[] = [`      data: { message: ${str(s.data)} },`];
  for (const key of ['width', 'maxWidth', 'role', 'autoFocus'] as const) if (s[key] !== d[key]) opts.push(`      ${key}: ${str(s[key])},`);
  for (const key of ['disableClose', 'hasBackdrop', 'restoreFocus'] as const) if (s[key] !== d[key]) opts.push(`      ${key}: ${s[key]},`);

  return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DialogService } from '@hakistack/ng-daisyui';

/** Any component can be the dialog content: it reads DIALOG_DATA and closes with a result. */
@Component({
  selector: 'app-upgrade-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">Upgrade your plan</h2>
        <p>{{ data.message }}</p>
        <div class="card-actions justify-end">
          <button type="button" class="btn btn-ghost" (click)="ref.close('later')">Not now</button>
          <button type="button" class="btn btn-primary" (click)="ref.close('upgrade')">Upgrade</button>
        </div>
      </div>
    </div>
  \`,
})
export class UpgradeDialogComponent {
  protected readonly data = inject<{ message: string }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
}

@Component({
  selector: 'app-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<button type="button" class="btn btn-primary" (click)="open()">Open dialog</button>\`,
})
export class ExampleComponent {
  private readonly dialog = inject(DialogService);

  open(): void {
    const ref = this.dialog.open(UpgradeDialogComponent, {
${opts.join('\n')}
    });
    // undefined when closed with Escape or a backdrop click.
    ref.closed.subscribe((result) => console.log('closed', result));
  }
}
`;
}

export const DIALOG_PLAYGROUND = definePlayground<DialogPgState>({
  symbol: 'DialogService',
  // `open(component, options)` takes the CDK's DialogConfig (+ data); validated against @angular/cdk/dialog.
  optionsSymbol: 'DialogConfig',
  optionsFrom: '@angular/cdk/dialog',
  defaults: DIALOG_DEFAULTS,
  controls: [
    {
      key: 'data',
      kind: 'text',
      label: l('Message (sent as data)', 'Mensaje (enviado como data)'),
      hint: l('Reaches the component through DIALOG_DATA.', 'Llega al componente a través de DIALOG_DATA.'),
    },
    { key: 'width', kind: 'text', label: l('Width (CSS)', 'Ancho (CSS)') },
    { key: 'maxWidth', kind: 'text', label: l('Maximum width (CSS)', 'Ancho máximo (CSS)') },
    { key: 'disableClose', kind: 'boolean', label: l('Ignore Escape and backdrop click', 'Ignorar Escape y clic fuera') },
    { key: 'hasBackdrop', kind: 'boolean', label: l('Backdrop', 'Fondo oscurecido') },
    { key: 'role', kind: 'select', label: l('ARIA role', 'Rol ARIA'), options: ['dialog', 'alertdialog'] },
    {
      key: 'autoFocus',
      kind: 'select',
      label: l('Focus on open', 'Foco al abrir'),
      options: ['first-tabbable', 'dialog', 'first-heading'],
    },
    { key: 'restoreFocus', kind: 'boolean', label: l('Return focus on close', 'Devolver el foco al cerrar') },
  ],
  code: dialogCode,
});
