import { definePlayground } from '../playground.types';
import { l } from './shared';

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
