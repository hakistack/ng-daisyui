import { definePlayground } from '../playground.types';
import { l } from './shared';

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
