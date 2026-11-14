import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Dynamic form (createForm builder) ─────────────────────────────────────
export interface FormsPgState {
  [k: string]: string | number | boolean;
  title: string;
  layout: string;
  gap: string;
  gridColumns: number;
  labelWidth: string;
  'fields.width': string;
  'fields.colSpan': number;
  disabled: boolean;
}
const FORMS_DEFAULTS: FormsPgState = {
  title: '',
  // Library defaults: vertical layout, gap 'lg', 2 grid columns, label width 'md'.
  layout: 'vertical',
  gap: 'lg',
  gridColumns: 2,
  labelWidth: 'md',
  // Field-level options, applied to the First name / Last name fields.
  'fields.width': 'full',
  'fields.colSpan': 1,
  disabled: false,
};

/** Sample role choices — shared by the live preview and the generated code. */
export const FORMS_ROLE_CHOICES = ['Admin', 'Editor', 'Viewer'];

const str = (v: string): string => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function formsCode(s: FormsPgState): string {
  const d = FORMS_DEFAULTS;
  const config: string[] = [];
  if (s.title) config.push(`    title: ${str(s.title)},`);
  if (s.layout !== d.layout) config.push(`    layout: '${s.layout}',`);
  if (s.gap !== d.gap) config.push(`    gap: '${s.gap}',`);
  if (s.layout === 'grid' && s.gridColumns !== d.gridColumns) config.push(`    gridColumns: ${s.gridColumns},`);
  if (s.layout === 'horizontal' && s.labelWidth !== d.labelWidth) config.push(`    labelWidth: '${s.labelWidth}',`);

  // Field-level layout: `colSpan` is read in grid layout, `width` in the other two.
  const fieldLayout =
    s.layout === 'grid'
      ? `, colSpan: ${s['fields.colSpan']}`
      : s['fields.width'] !== d['fields.width']
        ? `, width: '${s['fields.width']}'`
        : '';
  const lastNameOpts = fieldLayout ? `, { ${fieldLayout.slice(2)} }` : '';
  const choices = FORMS_ROLE_CHOICES.map((c) => `'${c}'`).join(', ');
  const disabled = s.disabled !== d.disabled ? ` [disabled]="${s.disabled}"` : '';

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DynamicFormComponent, createForm, field } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-dynamic-form [config]="form.config()"${disabled} />
    <!-- Forms have no built-in buttons: drive them through the controller. -->
    <div class="mt-4 flex gap-2">
      <button type="button" class="btn btn-primary" (click)="form.submit()">Submit</button>
      <button type="button" class="btn btn-ghost" (click)="form.reset()">Reset</button>
    </div>
  \`,
})
export class ExampleComponent {
  readonly form = createForm({
${config.length ? config.join('\n') + '\n' : ''}    fields: [
      field.text('firstName', 'First name', { required: true${fieldLayout} }),
      field.text('lastName', 'Last name'${lastNameOpts}),
      field.email('email', 'Email', { required: true }),
      field.select('role', 'Role', { choices: [${choices}] }),
    ],
    onSubmit: (data) => console.log('onSubmit', data.values, data.valid),
    onReset: () => console.log('onReset'),
  });
}
`;
}

export const FORMS_PLAYGROUND = definePlayground<FormsPgState>({
  layout: 'wide',
  symbol: 'DynamicFormComponent',
  optionsSymbol: 'FormConfig',
  defaults: FORMS_DEFAULTS,
  // `disabled` is an input of <hk-dynamic-form>; every other key is a FormConfig member path.
  inputs: ['disabled'],
  events: ['formSubmit', 'formReset'],
  controls: [
    { key: 'title', kind: 'text', label: l('Title (empty = none)', 'Título (vacío = ninguno)') },
    { key: 'layout', kind: 'select', label: l('Layout', 'Diseño'), options: ['vertical', 'horizontal', 'grid'] },
    { key: 'gap', kind: 'select', label: l('Gap between fields', 'Espacio entre campos'), options: ['sm', 'md', 'lg'] },
    { key: 'gridColumns', kind: 'number', label: l('Columns (grid)', 'Columnas (grid)'), min: 1, max: 4, step: 1 },
    {
      key: 'labelWidth',
      kind: 'select',
      label: l('Label width (horizontal)', 'Ancho de etiqueta (horizontal)'),
      options: ['sm', 'md', 'lg', 'xl'],
    },
    {
      key: 'fields.width',
      kind: 'select',
      label: l('Name fields: width (vertical / horizontal)', 'Campos de nombre: ancho (vertical / horizontal)'),
      options: ['full', '1/2', '1/3', '1/4', '2/3', '3/4', 'auto'],
    },
    {
      key: 'fields.colSpan',
      kind: 'number',
      label: l('Name fields: columns spanned (grid)', 'Campos de nombre: columnas que ocupan (grid)'),
      min: 1,
      max: 4,
      step: 1,
    },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
  ],
  code: formsCode,
});
