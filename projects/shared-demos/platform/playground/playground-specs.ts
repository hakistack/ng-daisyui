import type { Localized } from '../catalog/catalog.types';
import { definePlayground } from './playground.types';
import type { PlaygroundSpec } from './playground.types';

const l = (en: string, es: string): Localized => ({ en, es });
const COLORS = ['', 'neutral', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'];
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];

// ── Input ─────────────────────────────────────────────────────────────────
export interface InputPgState {
  [k: string]: string | number | boolean;
  variant: string;
  size: string;
  color: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  prefixText: string;
  suffixText: string;
}
export const INPUT_PLAYGROUND = definePlayground<InputPgState>({
  symbol: 'InputComponent',
  selector: 'hk-input',
  defaults: { variant: 'text', size: 'md', color: '', placeholder: '', disabled: false, readonly: false, prefixText: '', suffixText: '' },
  inputs: ['variant', 'size', 'color', 'placeholder', 'disabled', 'readonly', 'prefixText', 'suffixText'],
  events: ['valueChange'],
  controls: [
    {
      key: 'variant',
      kind: 'select',
      label: l('Formatting behavior', 'Comportamiento de formato'),
      options: ['text', 'currency', 'phone', 'percentage', 'password'],
    },
    { key: 'size', kind: 'select', label: l('Size', 'Tamaño'), options: SIZES },
    { key: 'color', kind: 'select', label: l('Color (empty = none)', 'Color (vacío = ninguno)'), options: COLORS },
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'prefixText', kind: 'text', label: l('Text before', 'Texto antes') },
    { key: 'suffixText', kind: 'text', label: l('Text after', 'Texto después') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
    { key: 'readonly', kind: 'boolean', label: l('Read-only', 'Solo lectura') },
  ],
});

// ── Select ────────────────────────────────────────────────────────────────
export interface SelectPgState {
  [k: string]: string | number | boolean;
  placeholder: string;
  enableSearch: boolean;
  multiple: boolean;
  allowClear: boolean;
  disabled: boolean;
  size: string;
  color: string;
  maxChipsVisible: number;
}
export const SELECT_OPTIONS_SOURCE = `options: SelectOption<string>[] = [
  { label: 'Angular', value: 'angular' },
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: 'Solid', value: 'solid' },
];`;
export const SELECT_PLAYGROUND = definePlayground<SelectPgState>({
  symbol: 'SelectComponent',
  selector: 'hk-select',
  defaults: {
    placeholder: 'Select an option',
    enableSearch: false,
    multiple: false,
    allowClear: true,
    disabled: false,
    size: 'md',
    color: '',
    maxChipsVisible: 3,
  },
  inputs: ['placeholder', 'enableSearch', 'multiple', 'allowClear', 'disabled', 'size', 'color', 'maxChipsVisible'],
  events: ['selectionChange', 'searchChange', 'dropdownToggle'],
  extraTemplateAttrs: '[options]="options"',
  extraMembers: SELECT_OPTIONS_SOURCE,
  extraImports: ['SelectOption'],
  controls: [
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'enableSearch', kind: 'boolean', label: l('Search box', 'Caja de búsqueda') },
    { key: 'multiple', kind: 'boolean', label: l('Pick several', 'Elegir varios') },
    { key: 'maxChipsVisible', kind: 'number', label: l('Chips shown (multiple)', 'Chips visibles (múltiple)'), min: 1, max: 10, step: 1 },
    { key: 'allowClear', kind: 'boolean', label: l('Clear button', 'Botón para limpiar') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
    { key: 'size', kind: 'select', label: l('Size', 'Tamaño'), options: SIZES },
    { key: 'color', kind: 'select', label: l('Color (empty = none)', 'Color (vacío = ninguno)'), options: COLORS },
  ],
});

// ── Datepicker ────────────────────────────────────────────────────────────
export interface DatepickerPgState {
  [k: string]: string | number | boolean;
  range: boolean;
  showTime: boolean;
  use24Hour: boolean;
  placeholder: string;
  disabled: boolean;
  locale: string;
  showWeekNumbers: boolean;
  firstDayOfWeek: number;
  closeOnSelect: boolean;
  showClearButton: boolean;
  showTodayButton: boolean;
  dropdownPosition: string;
}
export const DATEPICKER_PLAYGROUND = definePlayground<DatepickerPgState>({
  symbol: 'DatepickerComponent',
  selector: 'hk-datepicker',
  defaults: {
    range: false,
    showTime: false,
    use24Hour: false,
    placeholder: 'Select Date',
    disabled: false,
    locale: 'en-US',
    showWeekNumbers: false,
    firstDayOfWeek: 0,
    closeOnSelect: true,
    showClearButton: true,
    showTodayButton: false,
    dropdownPosition: 'bottom-left',
  },
  inputs: [
    'range',
    'showTime',
    'use24Hour',
    'placeholder',
    'disabled',
    'locale',
    'showWeekNumbers',
    'firstDayOfWeek',
    'closeOnSelect',
    'showClearButton',
    'showTodayButton',
    'dropdownPosition',
  ],
  events: ['selectionChange', 'pickerOpened', 'pickerClosed'],
  controls: [
    { key: 'range', kind: 'boolean', label: l('Date range', 'Rango de fechas') },
    { key: 'showTime', kind: 'boolean', label: l('Pick a time too', 'Elegir también la hora') },
    { key: 'use24Hour', kind: 'boolean', label: l('24-hour clock', 'Reloj de 24 horas') },
    { key: 'locale', kind: 'select', label: l('Locale', 'Idioma/región'), options: ['en-US', 'es-PR', 'es-ES', 'de-DE', 'ja-JP'] },
    { key: 'firstDayOfWeek', kind: 'number', label: l('First day (0 = Sunday)', 'Primer día (0 = domingo)'), min: 0, max: 6, step: 1 },
    { key: 'showWeekNumbers', kind: 'boolean', label: l('Week numbers', 'Números de semana') },
    { key: 'showTodayButton', kind: 'boolean', label: l('Today button', 'Botón Hoy') },
    { key: 'showClearButton', kind: 'boolean', label: l('Clear button', 'Botón para limpiar') },
    { key: 'closeOnSelect', kind: 'boolean', label: l('Close after picking', 'Cerrar al elegir') },
    {
      key: 'dropdownPosition',
      kind: 'select',
      label: l('Popup position', 'Posición del popup'),
      options: ['bottom-left', 'bottom-right', 'top-left', 'top-right', 'auto'],
    },
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
  ],
});

// ── Timepicker ────────────────────────────────────────────────────────────
export interface TimepickerPgState {
  [k: string]: string | number | boolean;
  use24Hour: boolean;
  showSeconds: boolean;
  clockFace: boolean;
  minuteStep: number;
  placeholder: string;
  disabled: boolean;
  closeOnSelect: boolean;
  showClearButton: boolean;
  showNowButton: boolean;
  dropdownPosition: string;
}
export const TIMEPICKER_PLAYGROUND = definePlayground<TimepickerPgState>({
  symbol: 'TimepickerComponent',
  selector: 'hk-timepicker',
  defaults: {
    use24Hour: true,
    showSeconds: false,
    clockFace: false,
    minuteStep: 1,
    placeholder: 'Select Time',
    disabled: false,
    closeOnSelect: true,
    showClearButton: true,
    showNowButton: true,
    dropdownPosition: 'bottom-left',
  },
  inputs: [
    'use24Hour',
    'showSeconds',
    'clockFace',
    'minuteStep',
    'placeholder',
    'disabled',
    'closeOnSelect',
    'showClearButton',
    'showNowButton',
    'dropdownPosition',
  ],
  events: ['timeChange', 'pickerOpened', 'pickerClosed'],
  controls: [
    { key: 'use24Hour', kind: 'boolean', label: l('24-hour clock', 'Reloj de 24 horas') },
    { key: 'showSeconds', kind: 'boolean', label: l('Seconds', 'Segundos') },
    { key: 'clockFace', kind: 'boolean', label: l('Clock face', 'Esfera de reloj') },
    { key: 'minuteStep', kind: 'number', label: l('Minute step', 'Intervalo de minutos'), min: 1, max: 30, step: 1 },
    { key: 'showNowButton', kind: 'boolean', label: l('Now button', 'Botón Ahora') },
    { key: 'showClearButton', kind: 'boolean', label: l('Clear button', 'Botón para limpiar') },
    { key: 'closeOnSelect', kind: 'boolean', label: l('Close after picking', 'Cerrar al elegir') },
    {
      key: 'dropdownPosition',
      kind: 'select',
      label: l('Popup position', 'Posición del popup'),
      options: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
    },
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
  ],
});

// ── Toast (service) ───────────────────────────────────────────────────────
export interface ToastPgState {
  [k: string]: string | number | boolean;
  severity: string;
  summary: string;
  detail: string;
  life: number;
  sticky: boolean;
  soft: boolean;
  progressBar: boolean;
  pauseOnHover: boolean;
}
const TOAST_DEFAULTS: ToastPgState = {
  severity: 'success',
  summary: 'Saved',
  detail: 'Your changes are stored.',
  // Matches DEFAULT_TOAST_CONFIG (defaultLife / progressBar / pauseOnHover).
  life: 5000,
  sticky: false,
  soft: false,
  progressBar: true,
  pauseOnHover: true,
};
export const TOAST_PLAYGROUND = definePlayground<ToastPgState>({
  symbol: 'ToastService',
  optionsSymbol: 'ToastOptions',
  defaults: TOAST_DEFAULTS,
  controls: [
    { key: 'severity', kind: 'select', label: l('Kind', 'Tipo'), options: ['success', 'info', 'warning', 'error'] },
    { key: 'summary', kind: 'text', label: l('Title', 'Título') },
    { key: 'detail', kind: 'text', label: l('Message', 'Mensaje') },
    { key: 'life', kind: 'number', label: l('Visible for (ms)', 'Visible durante (ms)'), min: 500, max: 20000, step: 500 },
    { key: 'sticky', kind: 'boolean', label: l('Stay until closed', 'Permanecer hasta cerrar') },
    { key: 'soft', kind: 'boolean', label: l('Soft colors', 'Colores suaves') },
    { key: 'progressBar', kind: 'boolean', label: l('Progress bar', 'Barra de progreso') },
    { key: 'pauseOnHover', kind: 'boolean', label: l('Pause on hover', 'Pausar al pasar el mouse') },
  ],
  code: (s) => serviceSnippet('ToastService', 'toast', 'show', s, TOAST_DEFAULTS, ['severity', 'summary', 'detail']),
});

// ── Alert (service) ───────────────────────────────────────────────────────
export interface AlertPgState {
  [k: string]: string | number | boolean;
  title: string;
  text: string;
  icon: string;
  confirmButtonText: string;
  showCancelButton: boolean;
  cancelButtonText: string;
  allowOutsideClick: boolean;
  size: string;
}
const ALERT_DEFAULTS: AlertPgState = {
  title: 'Delete project?',
  text: 'This cannot be undone.',
  icon: 'warning',
  confirmButtonText: 'Delete',
  showCancelButton: true,
  cancelButtonText: 'Cancel',
  allowOutsideClick: true,
  size: 'md',
};
export const ALERT_PLAYGROUND = definePlayground<AlertPgState>({
  symbol: 'AlertService',
  optionsSymbol: 'AlertOptions',
  defaults: ALERT_DEFAULTS,
  controls: [
    { key: 'title', kind: 'text', label: l('Title', 'Título') },
    { key: 'text', kind: 'text', label: l('Message', 'Mensaje') },
    { key: 'icon', kind: 'select', label: l('Icon', 'Icono'), options: ['success', 'error', 'warning', 'info', 'question'] },
    { key: 'confirmButtonText', kind: 'text', label: l('Confirm label', 'Texto de confirmar') },
    { key: 'showCancelButton', kind: 'boolean', label: l('Cancel button', 'Botón cancelar') },
    { key: 'cancelButtonText', kind: 'text', label: l('Cancel label', 'Texto de cancelar') },
    { key: 'allowOutsideClick', kind: 'boolean', label: l('Close on backdrop click', 'Cerrar al hacer clic fuera') },
    { key: 'size', kind: 'select', label: l('Size', 'Tamaño'), options: ['sm', 'md', 'lg', 'xl', '2xl', '4xl', 'full'] },
  ],
  code: (s) => serviceSnippet('AlertService', 'alert', 'show', s, ALERT_DEFAULTS, Object.keys(ALERT_DEFAULTS), true),
});

/**
 * Service snippet: one button that calls `service.method({...})`.
 * `always` keys are written even when equal to the playground default
 * (the playground's sample text is not a library default).
 */
function serviceSnippet(
  service: string,
  field: string,
  method: string,
  state: Record<string, string | number | boolean>,
  defaults: Record<string, string | number | boolean>,
  always: readonly string[],
  awaitResult = false,
): string {
  const entries = Object.keys(state)
    .filter((k) => always.includes(k) || state[k] !== defaults[k])
    .map(
      (k) =>
        `      ${k}: ${typeof state[k] === 'string' ? `'${String(state[k]).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : state[k]},`,
    );
  const call = `this.${field}.${method}({\n${entries.join('\n')}\n    })`;
  const body = awaitResult ? `const result = await ${call};\n    console.log(result);` : `${call};`;
  return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ${service} } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<button type="button" class="btn btn-primary" (click)="open()">Open</button>\`,
})
export class ExampleComponent {
  private readonly ${field} = inject(${service});

  ${awaitResult ? 'async ' : ''}open(): ${awaitResult ? 'Promise<void>' : 'void'} {
    ${body}
  }
}
`;
}

/** Every playground spec, keyed by docs page id (used by the definition checks). */
export const PLAYGROUND_SPECS: Record<string, PlaygroundSpec> = {
  input: INPUT_PLAYGROUND,
  select: SELECT_PLAYGROUND,
  datepicker: DATEPICKER_PLAYGROUND,
  timepicker: TIMEPICKER_PLAYGROUND,
  toast: TOAST_PLAYGROUND,
  alert: ALERT_PLAYGROUND,
};
