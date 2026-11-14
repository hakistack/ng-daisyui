import { definePlayground } from '../playground.types';
import { l, serviceSnippet } from './shared';

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
